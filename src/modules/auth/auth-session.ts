import { randomBytes } from "crypto";
import { Response } from "express";

import { env } from "../../config/env";

export const ACCESS_COOKIE = "gc_access";
export const REFRESH_COOKIE = "gc_refresh";
export const CSRF_COOKIE = "gc_csrf";
export const CSRF_HEADER = "x-csrf-token";

const resolveSameSite = (): "lax" | "strict" | "none" => {
  const value = env.authCookieSameSite;
  if (value === "lax" || value === "strict" || value === "none") {
    return value;
  }
  return "none";
};

const baseCookieOptions = () => ({
  httpOnly: true,
  secure: env.authCookieSecure,
  sameSite: resolveSameSite() as "lax" | "strict" | "none",
  domain: env.authCookieDomain
});

export const generateCsrfToken = () => randomBytes(24).toString("hex");

export const setSessionCookies = (res: Response, payload: { accessToken: string; refreshToken: string; csrfToken: string }) => {
  res.cookie(ACCESS_COOKIE, payload.accessToken, {
    ...baseCookieOptions(),
    path: "/",
    maxAge: env.authAccessCookieMaxAgeMs
  });

  res.cookie(REFRESH_COOKIE, payload.refreshToken, {
    ...baseCookieOptions(),
    path: "/api/v1/auth",
    maxAge: env.authRefreshCookieMaxAgeMs
  });

  res.cookie(CSRF_COOKIE, payload.csrfToken, {
    httpOnly: false,
    secure: env.authCookieSecure,
    sameSite: resolveSameSite(),
    domain: env.authCookieDomain,
    path: "/",
    maxAge: env.authRefreshCookieMaxAgeMs
  });
};

export const clearSessionCookies = (res: Response) => {
  const common = {
    secure: env.authCookieSecure,
    sameSite: resolveSameSite() as "lax" | "strict" | "none",
    domain: env.authCookieDomain
  };

  res.clearCookie(ACCESS_COOKIE, { ...common, path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...common, path: "/api/v1/auth" });
  res.clearCookie(CSRF_COOKIE, { ...common, path: "/" });
};
