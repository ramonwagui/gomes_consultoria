import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "crypto";
import jwt from "jsonwebtoken";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { LoginInput, RegisterInput } from "./auth.schema";

type TokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  sid: string;
  typ: "access" | "refresh";
};

type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
};

type SessionUser = {
  id: number;
  nome: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
};

const REFRESH_TABLE = "auth_refresh_tokens";

let refreshTableReadyPromise: Promise<void> | null = null;

const ensureRefreshTable = async () => {
  if (refreshTableReadyPromise) {
    return refreshTableReadyPromise;
  }

  refreshTableReadyPromise = (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${REFRESH_TABLE} (
        id SERIAL PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        replaced_by_hash TEXT
      );
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user_session ON ${REFRESH_TABLE}(user_id, session_id);`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_expires ON ${REFRESH_TABLE}(expires_at);`
    );
  })();

  await refreshTableReadyPromise;
};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const mapUser = (user: {
  id: number;
  nome: string;
  email: string;
  role: UserRole;
  avatarPath: string | null;
  updatedAt: Date;
}): SessionUser => ({
  id: user.id,
  nome: user.nome,
  email: user.email,
  role: user.role,
  avatar_url: user.avatarPath ? `/api/v1/usuarios/avatar/${user.id}?v=${user.updatedAt.getTime()}` : null
});

const signAccessToken = (payload: Omit<TokenPayload, "typ">) =>
  jwt.sign({ ...payload, typ: "access" }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as string | number
  });

const signRefreshToken = (payload: Omit<TokenPayload, "typ">) =>
  jwt.sign({ ...payload, typ: "refresh" }, env.jwtSecret, {
    expiresIn: Math.max(1, Math.floor(env.authRefreshTokenTtlMs / 1000))
  });

const issueSessionTokens = async (
  user: { id: number; email: string; role: UserRole },
  sessionId: string = randomUUID()
) => {
  await ensureRefreshTable();
  const commonPayload = {
    sub: String(user.id),
    email: user.email,
    role: user.role,
    sid: sessionId
  };
  const accessToken = signAccessToken(commonPayload);
  const refreshToken = signRefreshToken(commonPayload);
  const refreshHash = hashToken(refreshToken);
  const refreshExpiry = new Date(Date.now() + env.authRefreshTokenTtlMs);

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO ${REFRESH_TABLE} (token_hash, user_id, session_id, expires_at)
      VALUES ($1, $2, $3, $4)
    `,
    refreshHash,
    user.id,
    sessionId,
    refreshExpiry
  );

  return { accessToken, refreshToken, sessionId };
};

const rotateRefreshToken = async (refreshToken: string): Promise<SessionTokens | null> => {
  await ensureRefreshTable();

  let payload: TokenPayload;
  try {
    payload = jwt.verify(refreshToken, env.jwtSecret) as TokenPayload;
  } catch {
    return null;
  }

  if (payload.typ !== "refresh" || typeof payload.sid !== "string" || !payload.sid || !payload.sub) {
    return null;
  }

  const tokenHash = hashToken(refreshToken);
  const rows = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
    `
      SELECT id
      FROM ${REFRESH_TABLE}
      WHERE token_hash = $1
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    `,
    tokenHash
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  const userId = Number(payload.sub);
  if (!Number.isFinite(userId)) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  if (!user) {
    return null;
  }

  const nextTokens = await issueSessionTokens(
    { id: user.id, email: user.email, role: user.role },
    payload.sid
  );
  const nextHash = hashToken(nextTokens.refreshToken);

  await prisma.$executeRawUnsafe(
    `
      UPDATE ${REFRESH_TABLE}
      SET revoked_at = NOW(),
          last_used_at = NOW(),
          replaced_by_hash = $1
      WHERE id = $2
    `,
    nextHash,
    row.id
  );

  return nextTokens;
};

const revokeRefreshToken = async (refreshToken: string) => {
  await ensureRefreshTable();
  const tokenHash = hashToken(refreshToken);
  await prisma.$executeRawUnsafe(
    `
      UPDATE ${REFRESH_TABLE}
      SET revoked_at = COALESCE(revoked_at, NOW()), last_used_at = NOW()
      WHERE token_hash = $1
    `,
    tokenHash
  );
};

export const registerUser = async (input: RegisterInput) => {
  const passwordHash = await bcrypt.hash(input.senha, 10);

  const user = await prisma.user.create({
    data: {
      nome: input.nome,
      email: input.email.toLowerCase().trim(),
      passwordHash,
      role: input.role
    }
  });

  const session = await issueSessionTokens({ id: user.id, email: user.email, role: user.role });

  return {
    user: mapUser(user),
    session
  };
};

export const loginUser = async (input: LoginInput) => {
  const email = input.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(input.senha, user.passwordHash);
  if (!passwordMatches) {
    return null;
  }

  const session = await issueSessionTokens({ id: user.id, email: user.email, role: user.role });

  return {
    user: mapUser(user),
    session
  };
};

export const refreshUserSession = async (refreshToken: string) => {
  const session = await rotateRefreshToken(refreshToken);
  if (!session) {
    return null;
  }
  return { session };
};

export const logoutUserSession = async (refreshToken: string) => {
  await revokeRefreshToken(refreshToken);
};
