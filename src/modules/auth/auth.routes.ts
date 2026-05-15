import { Router } from "express";

import { loginSchema } from "./auth.schema";
import { clearSessionCookies, CSRF_COOKIE, generateCsrfToken, REFRESH_COOKIE, setSessionCookies } from "./auth-session";
import { loginUser, logoutUserSession, refreshUserSession } from "./auth.service";

const router = Router();

router.post("/register", async (_req, res) => {
  return res.status(403).json({
    message: "Cadastro publico desabilitado. Solicite criacao de usuario ao administrador."
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const auth = await loginUser(parsed.data);
    if (!auth) {
      return res.status(401).json({ message: "Credenciais invalidas." });
    }

    const csrfToken = generateCsrfToken();
    setSessionCookies(res, {
      accessToken: auth.session.accessToken,
      refreshToken: auth.session.refreshToken,
      csrfToken
    });

    return res.json({ user: auth.user });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[auth/login] erro ao autenticar usuario", error);
    return res.status(500).json({ message: "Erro interno ao autenticar usuario." });
  }
});

router.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) {
    clearSessionCookies(res);
    return res.status(401).json({ message: "Sessao invalida ou expirada." });
  }

  try {
    const refreshed = await refreshUserSession(refreshToken);
    if (!refreshed) {
      clearSessionCookies(res);
      return res.status(401).json({ message: "Sessao invalida ou expirada." });
    }

    const csrfToken = req.cookies?.[CSRF_COOKIE] || generateCsrfToken();
    setSessionCookies(res, {
      accessToken: refreshed.session.accessToken,
      refreshToken: refreshed.session.refreshToken,
      csrfToken
    });
    return res.status(204).end();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[auth/refresh] erro ao atualizar sessao", error);
    clearSessionCookies(res);
    return res.status(500).json({ message: "Erro interno ao atualizar sessao." });
  }
});

router.post("/logout", async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  try {
    if (refreshToken) {
      await logoutUserSession(refreshToken);
    }
  } finally {
    clearSessionCookies(res);
  }
  return res.status(204).end();
});

export { router as authRouter };
