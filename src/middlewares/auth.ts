import { UserRole } from "@prisma/client";
import { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { ZodSchema } from "zod";

import { env } from "../config/env";
import { ACCESS_COOKIE, CSRF_COOKIE, CSRF_HEADER } from "../modules/auth/auth-session";

type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

const isMutatingMethod = (method: string) => ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());

const parseBearerToken = (header: string | undefined) => {
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  return token || null;
};

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const cookieToken = req.cookies?.[ACCESS_COOKIE];
  const bearerToken = parseBearerToken(req.headers.authorization);
  const token = cookieToken || (env.authLegacyBearerEnabled ? bearerToken : null);

  if (!token) {
    return res.status(401).json({ message: "Token ausente ou invalido." });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = {
      id: Number(payload.sub),
      email: payload.email,
      role: payload.role
    };

    if (cookieToken && isMutatingMethod(req.method)) {
      const csrfCookie = req.cookies?.[CSRF_COOKIE];
      const csrfHeader = req.header(CSRF_HEADER) ?? req.header(CSRF_HEADER.toUpperCase());
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return res.status(403).json({ message: "CSRF token ausente ou invalido." });
      }
    }

    return next();
  } catch {
    if (env.authLegacyBearerEnabled && bearerToken && bearerToken !== token) {
      try {
        const fallbackPayload = jwt.verify(bearerToken, env.jwtSecret) as JwtPayload;
        req.user = {
          id: Number(fallbackPayload.sub),
          email: fallbackPayload.email,
          role: fallbackPayload.role
        };
        if (cookieToken && isMutatingMethod(req.method)) {
          const csrfCookie = req.cookies?.[CSRF_COOKIE];
          const csrfHeader = req.header(CSRF_HEADER) ?? req.header(CSRF_HEADER.toUpperCase());
          if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
            return res.status(403).json({ message: "CSRF token ausente ou invalido." });
          }
        }
        return next();
      } catch {
        return res.status(401).json({ message: "Token invalido ou expirado." });
      }
    }
    return res.status(401).json({ message: "Token invalido ou expirado." });
  }
};

export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuario nao autenticado." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Usuario sem permissao para esta operacao." });
    }

    return next();
  };
};

export const validateBody = (schema: ZodSchema): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      return res.status(400).json({
        message: error.errors?.[0]?.message || "Dados invalidos"
      });
    }
  };
};
