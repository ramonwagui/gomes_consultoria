import { Router } from "express";
import multer from "multer";

import { env } from "../../config/env";
import {
  documentoUploadLimits,
  getDocumentoExternalRequestByToken,
  receiveExternalDocumentos,
  registerExternalAccess
} from "./documentos.service";
import {
  externalTokenParamSchema,
  externalUploadBodySchema
} from "./documentos.schema";
import {
  allowedDocumentoMimes,
  isValidCpf,
  onlyCpfDigits,
  validateUploadedFileName
} from "./documentos.util";

export const documentosPublicRouter = Router();

const abuseWindowMs = 10 * 60 * 1000;
const accessLimit = 120;
const uploadLimit = 8;
const abuseBuckets = new Map<string, { count: number; resetAt: number }>();

const checkAbuseLimit = (key: string, limit: number) => {
  const now = Date.now();
  const current = abuseBuckets.get(key);
  if (!current || current.resetAt <= now) {
    abuseBuckets.set(key, { count: 1, resetAt: now + abuseWindowMs });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
};

const abuseKey = (req: any, scope: string) => `${scope}:${req.ip ?? "unknown"}:${req.params?.token ?? "no-token"}`;

const publicAccessLimiter = (req: any, res: any, next: any) => {
  if (checkAbuseLimit(abuseKey(req, "access"), accessLimit)) {
    return next();
  }
  return res.status(429).type("html").send(renderUnavailable("Muitas tentativas", "Aguarde alguns minutos antes de acessar este link novamente."));
};

const publicUploadLimiter = (req: any, res: any, next: any) => {
  if (checkAbuseLimit(abuseKey(req, "upload"), uploadLimit)) {
    return next();
  }
  return res.redirect(
    303,
    `/api/v1/public/documentos/${encodeURIComponent(req.params.token)}?status=error&message=${encodeURIComponent(
      "Muitas tentativas de envio. Aguarde alguns minutos e tente novamente."
    )}`
  );
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: documentoUploadLimits.maxFileSize,
    files: documentoUploadLimits.maxFiles
  },
  fileFilter: (_req, file, cb) => {
    if (!validateUploadedFileName(file.originalname)) {
      cb(new Error("Nome de arquivo invalido."));
      return;
    }
    if (!allowedDocumentoMimes.has(file.mimetype)) {
      cb(new Error("Formato de arquivo nao permitido. Use PDF, DOCX, XLSX, JPG ou PNG."));
      return;
    }
    cb(null, true);
  }
});

const uploadMany = (req: any, res: any, next: any) => {
  upload.array("arquivos", documentoUploadLimits.maxFiles)(req, res, (error) => {
    if (!error) {
      return next();
    }
    const message =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? `Arquivo excede o limite de ${env.documentosMaxFileSizeMb} MB.`
        : error instanceof multer.MulterError && error.code === "LIMIT_FILE_COUNT"
          ? `Envie no maximo ${documentoUploadLimits.maxFiles} arquivos por vez.`
          : error.message || "Falha ao receber arquivos.";
    return res.redirect(
      303,
      `/api/v1/public/documentos/${encodeURIComponent(req.params.token)}?status=error&message=${encodeURIComponent(
        message
      )}`
    );
  });
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderPage = (payload: {
  token: string;
  titulo: string;
  descricao?: string | null;
  expiraEm?: string | null;
  status?: "ok" | "error";
  message?: string | null;
}) => `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Envio de documentos - Gestconv360</title>
    <style>
      :root { --bg:#f4f8fb; --card:#fff; --line:#cddfec; --ink:#14334c; --muted:#60788c; --brand:#176b73; --danger:#9b2c2c; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: linear-gradient(155deg, #e6f2f8, var(--bg)); color: var(--ink); font: 15px/1.45 "Segoe UI", Arial, sans-serif; }
      main { max-width: 760px; margin: 24px auto; padding: 0 14px; display: grid; gap: 12px; }
      section { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; box-shadow: 0 12px 28px rgba(20, 52, 78, .08); }
      h1 { margin: 0 0 8px; font-size: 24px; }
      p { margin: 0 0 8px; color: var(--muted); }
      form { display: grid; gap: 10px; }
      label { display: grid; gap: 5px; font-weight: 650; }
      input, textarea { width: 100%; border: 1px solid #bad0df; border-radius: 8px; min-height: 42px; padding: 9px 11px; font: inherit; }
      button { border: 0; border-radius: 8px; min-height: 42px; padding: 10px 14px; background: var(--brand); color: white; font-weight: 700; cursor: pointer; }
      .status { color: var(--brand); font-weight: 700; }
      .status.error { color: var(--danger); }
      .meta { border: 1px solid var(--line); border-radius: 8px; padding: 9px 10px; background: #f8fbfd; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1>${escapeHtml(payload.titulo)}</h1>
        <p>${escapeHtml(payload.descricao || "Envie os documentos solicitados abaixo.")}</p>
        <div class="meta">Formatos aceitos: PDF, DOCX, XLSX, JPG e PNG. Limite: ${env.documentosMaxFileSizeMb} MB por arquivo.</div>
      </section>
      <section>
        <form method="post" action="/api/v1/public/documentos/${encodeURIComponent(payload.token)}/upload" enctype="multipart/form-data">
          <label>
            Nome completo
            <input name="nome_completo" type="text" minlength="3" maxlength="160" required />
          </label>
          <label>
            CPF
            <input name="cpf" type="text" inputmode="numeric" minlength="11" maxlength="18" required />
          </label>
          <label>
            Arquivos
            <input name="arquivos" type="file" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" multiple required />
          </label>
          <label style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;" aria-hidden="true">
            Site
            <input name="website" type="text" tabindex="-1" autocomplete="off" />
          </label>
          <button type="submit">Enviar documentos</button>
          ${payload.message ? `<p class="status ${payload.status === "error" ? "error" : ""}">${escapeHtml(payload.message)}</p>` : ""}
        </form>
      </section>
    </main>
  </body>
</html>`;

const renderUnavailable = (title: string, message: string) => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)} - Gestconv360</title>
<style>body{margin:0;background:#f6f9fb;color:#14334c;font:15px/1.45 "Segoe UI",Arial,sans-serif}main{max-width:720px;margin:30px auto;padding:0 14px}.card{background:#fff;border:1px solid #cddfec;border-radius:12px;padding:16px;box-shadow:0 12px 28px rgba(20,52,78,.08)}h1{margin:0 0 8px;color:#9b2c2c;font-size:24px}p{margin:0;color:#60788c}</style>
</head><body><main><section class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></section></main></body></html>`;

documentosPublicRouter.get("/:token", publicAccessLimiter, async (req, res) => {
  const parsed = externalTokenParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).type("html").send(renderUnavailable("Link invalido", "O link informado nao e valido."));
  }

  const request = await getDocumentoExternalRequestByToken(parsed.data.token);
  await registerExternalAccess({
    token: parsed.data.token,
    requestId: request?.id ?? null,
    ip: req.ip,
    evento: "ACESSO"
  });

  if (!request) {
    return res.status(404).type("html").send(renderUnavailable("Link nao encontrado", "Este link nao existe ou foi removido."));
  }

  if (req.query.status === "ok") {
    return res.type("html").send(renderUnavailable("Documentos recebidos", "Obrigado. O envio foi registrado com sucesso."));
  }

  if (request.status === "EXPIRADO") {
    return res.status(410).type("html").send(renderUnavailable("Link expirado", "O prazo deste link terminou."));
  }
  if (request.status === "DESATIVADO") {
    return res.status(410).type("html").send(renderUnavailable("Link desativado", "Este link foi desativado pelo solicitante."));
  }
  if (request.status === "ENVIO_REALIZADO") {
    return res.status(410).type("html").send(renderUnavailable("Envio ja realizado", "Este link ja recebeu documentos e nao aceita novo envio."));
  }

  return res.type("html").send(
    renderPage({
      token: parsed.data.token,
      titulo: request.titulo,
      descricao: request.descricao,
      expiraEm: request.expira_em,
      status: req.query.status === "error" ? "error" : undefined,
      message: typeof req.query.message === "string" ? req.query.message : null
    })
  );
});

documentosPublicRouter.post("/:token/upload", publicUploadLimiter, uploadMany, async (req, res) => {
  const parsedToken = externalTokenParamSchema.safeParse(req.params);
  if (!parsedToken.success) {
    return res.status(400).type("html").send(renderUnavailable("Link invalido", "O link informado nao e valido."));
  }

  const parsedBody = externalUploadBodySchema.safeParse(req.body ?? {});
  if (typeof req.body?.website === "string" && req.body.website.trim()) {
    await registerExternalAccess({
      token: parsedToken.data.token,
      nomeCompleto: req.body?.nome_completo,
      cpf: req.body?.cpf,
      ip: req.ip,
      evento: "HONEYPOT_BLOQUEADO"
    });
    return res.redirect(
      303,
      `/api/v1/public/documentos/${parsedToken.data.token}?status=error&message=${encodeURIComponent(
        "Nao foi possivel validar o envio. Tente novamente."
      )}`
    );
  }

  if (!parsedBody.success || !isValidCpf(parsedBody.success ? parsedBody.data.cpf : "")) {
    await registerExternalAccess({
      token: parsedToken.data.token,
      nomeCompleto: req.body?.nome_completo,
      cpf: req.body?.cpf,
      ip: req.ip,
      evento: "CPF_INVALIDO"
    });
    return res.redirect(
      303,
      `/api/v1/public/documentos/${parsedToken.data.token}?status=error&message=${encodeURIComponent(
        "Preencha nome completo e CPF valido."
      )}`
    );
  }

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    return res.redirect(
      303,
      `/api/v1/public/documentos/${parsedToken.data.token}?status=error&message=${encodeURIComponent(
        "Envie pelo menos um arquivo."
      )}`
    );
  }

  try {
    const request = await getDocumentoExternalRequestByToken(parsedToken.data.token);
    await registerExternalAccess({
      token: parsedToken.data.token,
      requestId: request?.id ?? null,
      nomeCompleto: parsedBody.data.nome_completo,
      cpf: onlyCpfDigits(parsedBody.data.cpf),
      ip: req.ip,
      evento: "ENVIO_TENTATIVA"
    });

    await receiveExternalDocumentos({
      token: parsedToken.data.token,
      nomeCompleto: parsedBody.data.nome_completo,
      cpf: parsedBody.data.cpf,
      files,
      ip: req.ip
    });

    await registerExternalAccess({
      token: parsedToken.data.token,
      requestId: request?.id ?? null,
      nomeCompleto: parsedBody.data.nome_completo,
      cpf: onlyCpfDigits(parsedBody.data.cpf),
      ip: req.ip,
      evento: "ENVIO_SUCESSO"
    });

    return res.redirect(303, `/api/v1/public/documentos/${parsedToken.data.token}?status=ok`);
  } catch (error) {
    const message =
      error instanceof Error && error.message === "EXPIRADO"
        ? "Este link expirou."
        : error instanceof Error && error.message === "DESATIVADO"
          ? "Este link foi desativado."
          : error instanceof Error && error.message === "ENVIO_REALIZADO"
            ? "Este link ja recebeu documentos."
            : error instanceof Error && error.message === "LINK_USAGE_EXHAUSTED"
              ? "Este link atingiu o limite maximo de envios."
            : error instanceof Error && error.message === "INVALID_FILE_SIGNATURE"
              ? "Arquivo invalido: assinatura binaria nao reconhecida."
              : error instanceof Error && (error.message === "EXTENSION_MISMATCH" || error.message === "MIME_MISMATCH")
                ? "Arquivo invalido: extensao/tipo nao correspondem ao conteudo real."
            : "Erro interno ao processar envio.";
    return res.redirect(
      303,
      `/api/v1/public/documentos/${parsedToken.data.token}?status=error&message=${encodeURIComponent(message)}`
    );
  }
});
