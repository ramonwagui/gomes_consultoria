import { google } from "googleapis";

import { env } from "../../config/env";

type GmailHealthReason =
  | "OK"
  | "GMAIL_CONFIG_MISSING"
  | "GMAIL_REFRESH_TOKEN_INVALID"
  | "GMAIL_AUTH_FAILED"
  | "GMAIL_API_ERROR";

export type GmailDeliveryHealthStatus = {
  configured: boolean;
  ok: boolean;
  checkedAt: string;
  reason: GmailHealthReason;
  message: string;
  details?: {
    httpStatus?: number;
    googleError?: string;
  };
};

const isGmailConfigured = () =>
  Boolean(env.gmailClientId && env.gmailClientSecret && env.gmailRefreshToken && env.gmailUserEmail);

const getErrorDetails = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return { httpStatus: undefined as number | undefined, googleError: undefined as string | undefined };
  }

  const maybe = error as {
    message?: string;
    response?: {
      status?: number;
      data?: {
        error?: string | { message?: string };
        error_description?: string;
      };
    };
    errors?: Array<{ reason?: string; message?: string }>;
  };

  const httpStatus = maybe.response?.status;
  const responseError = maybe.response?.data?.error;
  const responseErrorText =
    typeof responseError === "string" ? responseError : (responseError?.message ?? undefined);
  const googleError =
    responseErrorText ??
    maybe.response?.data?.error_description ??
    maybe.errors?.[0]?.reason ??
    maybe.errors?.[0]?.message ??
    maybe.message;

  return { httpStatus, googleError };
};

const classifyGmailError = (error: unknown): GmailDeliveryHealthStatus => {
  const { httpStatus, googleError } = getErrorDetails(error);
  const normalized = (googleError ?? "").toLowerCase();

  if (normalized.includes("invalid_grant") || normalized.includes("refresh token")) {
    return {
      configured: true,
      ok: false,
      checkedAt: new Date().toISOString(),
      reason: "GMAIL_REFRESH_TOKEN_INVALID",
      message: "Falha de autenticacao Gmail: refresh token invalido, expirado ou revogado.",
      details: { httpStatus, googleError }
    };
  }

  if (httpStatus === 401 || httpStatus === 403 || normalized.includes("unauthorized")) {
    return {
      configured: true,
      ok: false,
      checkedAt: new Date().toISOString(),
      reason: "GMAIL_AUTH_FAILED",
      message: "Falha de autenticacao Gmail: credenciais OAuth2 recusadas.",
      details: { httpStatus, googleError }
    };
  }

  return {
    configured: true,
    ok: false,
    checkedAt: new Date().toISOString(),
    reason: "GMAIL_API_ERROR",
    message: "Falha ao validar Gmail API para envio de emails.",
    details: { httpStatus, googleError }
  };
};

export const checkGmailDeliveryHealth = async (): Promise<GmailDeliveryHealthStatus> => {
  if (!isGmailConfigured()) {
    return {
      configured: false,
      ok: false,
      checkedAt: new Date().toISOString(),
      reason: "GMAIL_CONFIG_MISSING",
      message: "Configuracao Gmail incompleta (GMAIL_CLIENT_ID/SECRET, GMAIL_REFRESH_TOKEN, GMAIL_USER_EMAIL)."
    };
  }

  try {
    const auth = new google.auth.OAuth2(env.gmailClientId, env.gmailClientSecret);
    auth.setCredentials({ refresh_token: env.gmailRefreshToken });

    await auth.getAccessToken();

    const gmail = google.gmail({ version: "v1", auth });
    await gmail.users.getProfile({ userId: env.gmailUserEmail });

    return {
      configured: true,
      ok: true,
      checkedAt: new Date().toISOString(),
      reason: "OK",
      message: "Autenticacao Gmail valida para operacoes de envio."
    };
  } catch (error) {
    return classifyGmailError(error);
  }
};

export const buildGmailSendFailureMessage = (operationLabel: string, error: unknown) => {
  const classified = classifyGmailError(error);
  if (classified.reason === "GMAIL_REFRESH_TOKEN_INVALID") {
    return `${operationLabel}: refresh token do Gmail invalido/expirado/revogado. Atualize GMAIL_REFRESH_TOKEN.`;
  }
  if (classified.reason === "GMAIL_AUTH_FAILED") {
    return `${operationLabel}: autenticacao Gmail recusada. Verifique credenciais OAuth2 e permissoes da conta.`;
  }
  if (classified.reason === "GMAIL_API_ERROR") {
    return `${operationLabel}: falha na Gmail API (${classified.details?.googleError ?? "erro desconhecido"}).`;
  }
  return `${operationLabel}: falha ao enviar email.`;
};
