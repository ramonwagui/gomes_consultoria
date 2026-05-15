import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { Router } from "express";
import multer from "multer";
import path from "path";

import {
  checklistExternalLinkTokenParamSchema,
  checklistExternalUploadBodySchema
} from "./instrumentos.schema";
import {
  getActiveChecklistExternalLinkByToken,
  getChecklistExternalLinkByToken,
  saveChecklistExternalFilesByToken
} from "./instrumentos.service";

const publicRouter = Router();

const externalUploadRootPath = path.resolve(process.cwd(), "uploads", "instrumentos", "checklist-external");
const brandLogoFilePaths = [
  path.resolve(process.cwd(), "logo NC Convênios final.png"),
  path.resolve(process.cwd(), "logo NC Convenios final.png")
];
const allowedUploadMimes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg"
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedUploadMimes.has(file.mimetype)) {
      cb(new Error("Formato de arquivo nao permitido. Use PDF, DOC, DOCX, JPG ou PNG."));
      return;
    }
    cb(null, true);
  }
});

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDateTime = (value: Date) => {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(value);
};

const formatFileSize = (size?: number | null) => {
  if (!size || size <= 0) {
    return "-";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  const kb = size / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
};

const renderPublicChecklistPage = (payload: {
  token: string;
  itemName: string;
  stageName: string;
  instrument: {
    proposta: string;
    instrumento: string;
    concedente: string;
  };
  expiraEm: Date;
  flashStatus?: "ok" | "error";
  flashMessage?: string;
  files: Array<{
    id: number;
    nomeRemetente: string;
    arquivoNomeOriginal: string;
    arquivoTamanho: number | null;
    createdAt: Date;
  }>;
}) => {
  const filesHtml =
    payload.files.length === 0
      ? "<p class='hint'>Nenhum arquivo recebido ate agora.</p>"
      : `<ul class='files'>${payload.files
          .map(
            (file) =>
              `<li><span class='name'>${escapeHtml(file.arquivoNomeOriginal)}</span><span class='meta'>${escapeHtml(
                file.nomeRemetente
              )} - ${formatFileSize(file.arquivoTamanho)} - ${formatDateTime(file.createdAt)}</span></li>`
          )
          .join("")}</ul>`;

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Envio de Documentos - Gestconv360</title>
    <style>
      :root {
        --bg: #f3f7fb;
        --card: #ffffff;
        --line: #d6e2ee;
        --ink: #183247;
        --muted: #58728a;
        --brand: #1b5a83;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: radial-gradient(circle at top right, #dfedf8, var(--bg)); color: var(--ink); font: 15px/1.4 "Segoe UI", sans-serif; }
      .page { max-width: 820px; margin: 20px auto; padding: 0 14px 20px; }
      .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px; box-shadow: 0 10px 28px rgba(14, 43, 70, 0.08); }
      .brand-logo { width: 100%; max-width: 260px; height: auto; display: block; margin: 0 auto 12px; }
      h1 { margin: 0 0 8px; font-size: 22px; }
      p { margin: 0; }
      .hint { color: var(--muted); }
      .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-top: 10px; }
      .meta-cell { border: 1px solid var(--line); border-radius: 10px; padding: 9px; background: #f8fbfe; }
      .meta-cell strong { display: block; font-size: 11px; letter-spacing: 0.03em; text-transform: uppercase; color: #486278; margin-bottom: 4px; }
      .form-card { margin-top: 12px; }
      form { display: grid; gap: 10px; }
      label { display: grid; gap: 5px; font-weight: 600; }
      input[type="text"], input[type="file"] { width: 100%; border: 1px solid #c3d5e6; border-radius: 10px; min-height: 42px; padding: 10px 12px; font: inherit; }
      button { border: 0; border-radius: 10px; background: var(--brand); color: #fff; padding: 11px 14px; font-weight: 600; cursor: pointer; }
      .status { min-height: 22px; color: var(--brand); font-weight: 600; margin-top: 2px; }
      .status.error { color: #9f2f2f; }
      .files-card { margin-top: 12px; }
      .files { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
      .files li { border: 1px solid var(--line); border-radius: 9px; padding: 8px 10px; display: grid; gap: 1px; }
      .files .name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .files .meta { color: var(--muted); font-size: 12px; }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="card">
        <img class="brand-logo" src="/api/v1/public/brand-logo" alt="NC Convenios" />
        <h1>Solicitacao de documento</h1>
        <p class="hint">Preencha seu nome e envie os arquivos solicitados. Apos o envio, este link sera encerrado automaticamente.</p>
        <div class="meta-grid">
          <div class="meta-cell"><strong>Documento</strong>${escapeHtml(payload.itemName)}</div>
          <div class="meta-cell"><strong>Etapa</strong>${escapeHtml(payload.stageName)}</div>
          <div class="meta-cell"><strong>Proposta / Instrumento</strong>${escapeHtml(payload.instrument.proposta)} / ${escapeHtml(
    payload.instrument.instrumento
  )}</div>
          <div class="meta-cell"><strong>Concedente</strong>${escapeHtml(payload.instrument.concedente)}</div>
          <div class="meta-cell"><strong>Valido ate</strong>${escapeHtml(formatDateTime(payload.expiraEm))}</div>
        </div>
      </section>

      <section class="card form-card">
        <form method="post" action="/api/v1/public/checklist-links/${payload.token}/upload" enctype="multipart/form-data">
          <label>
            Seu nome
            <input id="nomeRemetente" name="nome_remetente" type="text" minlength="2" maxlength="120" required />
          </label>
          <label>
            Arquivos (PDF, DOC, DOCX, JPG, PNG)
            <input id="arquivos" name="arquivos" type="file" multiple required />
          </label>
          <button type="submit">Enviar arquivos</button>
          ${
            payload.flashMessage
              ? `<p class="status ${payload.flashStatus === "error" ? "error" : ""}">${escapeHtml(payload.flashMessage)}</p>`
              : ""
          }
        </form>
      </section>

      <section class="card files-card">
        <p style="margin-bottom:8px;"><strong>Arquivos ja recebidos</strong></p>
        ${filesHtml}
      </section>
    </main>

  </body>
</html>`;
};

const renderUnavailablePage = (payload: {
  title: string;
  message: string;
  contactEmail?: string;
  instrumentHint?: string;
}) => `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Link indisponivel - Gestconv360</title>
    <style>
      :root { --bg: #f5f9fc; --card: #fff; --line: #d5e2ee; --ink: #153149; --muted: #5a7287; --warn: #9f2f2f; }
      * { box-sizing: border-box; }
      body { margin: 0; background: linear-gradient(160deg, #e8f2fa 0%, var(--bg) 60%); color: var(--ink); font: 15px/1.45 "Segoe UI", sans-serif; }
      main { max-width: 760px; margin: 28px auto; padding: 0 14px; }
      .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 10px 28px rgba(17, 50, 77, 0.08); padding: 16px; }
      .brand-logo { width: 100%; max-width: 220px; height: auto; display: block; margin: 0 auto 12px; }
      h1 { margin: 0 0 8px; font-size: 22px; color: var(--warn); }
      p { margin: 0 0 10px; }
      .muted { color: var(--muted); }
      .help { border: 1px solid var(--line); border-radius: 10px; background: #f8fbfe; padding: 10px; }
      .help strong { display: block; margin-bottom: 4px; }
    </style>
  </head>
  <body>
    <main>
      <section class="card">
        <img class="brand-logo" src="/api/v1/public/brand-logo" alt="NC Convenios" />
        <h1>${escapeHtml(payload.title)}</h1>
        <p>${escapeHtml(payload.message)}</p>
        ${payload.instrumentHint ? `<p class="muted">Referencia: ${escapeHtml(payload.instrumentHint)}</p>` : ""}
        <div class="help">
          <strong>Precisa reenviar documentos?</strong>
          <p class="muted">Entre em contato com a pessoa que gerou este link para solicitar um novo link ativo.${
            payload.contactEmail ? ` Contato: ${escapeHtml(payload.contactEmail)}.` : ""
          }</p>
        </div>
      </section>
    </main>
  </body>
</html>`;

const renderThankYouPage = (payload: {
  message: string;
  instrumentHint?: string;
}) => `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Obrigado pelo envio - Gestconv360</title>
    <style>
      :root { --bg: #f2f8f4; --card: #fff; --line: #d5e7da; --ink: #173a2b; --muted: #537365; --ok: #2a7a52; }
      * { box-sizing: border-box; }
      body { margin: 0; background: linear-gradient(160deg, #e4f4ea 0%, var(--bg) 60%); color: var(--ink); font: 15px/1.45 "Segoe UI", sans-serif; }
      main { max-width: 760px; margin: 28px auto; padding: 0 14px; }
      .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 10px 28px rgba(20, 77, 52, 0.1); padding: 16px; }
      .brand-logo { width: 100%; max-width: 220px; height: auto; display: block; margin: 0 auto 12px; }
      h1 { margin: 0 0 8px; font-size: 22px; color: var(--ok); }
      p { margin: 0 0 10px; }
      .muted { color: var(--muted); }
    </style>
  </head>
  <body>
    <main>
      <section class="card">
        <img class="brand-logo" src="/api/v1/public/brand-logo" alt="NC Convenios" />
        <h1>Documentacao recebida com sucesso</h1>
        <p>${escapeHtml(payload.message)}</p>
        ${payload.instrumentHint ? `<p class="muted">Referencia: ${escapeHtml(payload.instrumentHint)}</p>` : ""}
      </section>
    </main>
  </body>
</html>`;

publicRouter.get("/brand-logo", async (_req, res) => {
  for (const brandLogoFilePath of brandLogoFilePaths) {
    try {
      await fs.access(brandLogoFilePath);
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.sendFile(brandLogoFilePath);
    } catch {
      // Try the next known filename variant.
    }
  }

  return res.status(404).json({ message: "Logomarca nao encontrada." });
});

publicRouter.get("/checklist-links/:token", async (req, res) => {
  const parsedToken = checklistExternalLinkTokenParamSchema.safeParse(req.params);
  if (!parsedToken.success) {
    return res.status(400).json({ message: "Link invalido." });
  }

  const link = await getActiveChecklistExternalLinkByToken(parsedToken.data.token);
  if (!link) {
    const anyLink = await getChecklistExternalLinkByToken(parsedToken.data.token);
    if (!anyLink) {
      return res.status(404).type("html").send(
        renderUnavailablePage({
          title: "Link nao encontrado",
          message: "Este link nao existe ou foi removido.",
          contactEmail: undefined
        })
      );
    }

    if (req.query.status === "ok") {
      const successMessage =
        typeof req.query.message === "string" && req.query.message.trim().length > 0
          ? req.query.message
          : "A NC Convenios Agradece pela sua colaboracao e confirma o recebimento da documentacao enviada.";

      return res.status(200).type("html").send(
        renderThankYouPage({
          message: successMessage,
          instrumentHint: `${anyLink.checklistItem.instrument.proposta} / ${anyLink.checklistItem.instrument.instrumento}`
        })
      );
    }

    const isExpired = anyLink.expiraEm.getTime() < Date.now();
    return res.status(410).type("html").send(
      renderUnavailablePage({
        title: isExpired ? "Link expirado" : "Link desativado",
        message: isExpired
          ? "O prazo deste link terminou e ele nao pode mais receber anexos."
          : "Este link foi desativado e nao pode mais receber anexos.",
        contactEmail: anyLink.createdByEmail,
        instrumentHint: `${anyLink.checklistItem.instrument.proposta} / ${anyLink.checklistItem.instrument.instrumento}`
      })
    );
  }

  if (req.query.format === "json") {
    return res.json({
      token: link.token,
      expira_em: link.expiraEm.toISOString(),
      item: {
        id: link.checklistItem.id,
        nome_documento: link.checklistItem.nomeDocumento,
        etapa: link.checklistItem.etapa
      },
      instrumento: {
        id: link.checklistItem.instrument.id,
        proposta: link.checklistItem.instrument.proposta,
        instrumento: link.checklistItem.instrument.instrumento,
        concedente: link.checklistItem.instrument.concedente
      },
      arquivos_recebidos: link.files.map((file: any) => ({
        id: file.id,
        nome_remetente: file.nomeRemetente,
        nome_original: file.arquivoNomeOriginal,
        tamanho: file.arquivoTamanho,
        created_at: file.createdAt.toISOString()
      }))
    });
  }

  const html = renderPublicChecklistPage({
    token: link.token,
    itemName: link.checklistItem.nomeDocumento,
    stageName: link.checklistItem.etapa,
    instrument: {
      proposta: link.checklistItem.instrument.proposta,
      instrumento: link.checklistItem.instrument.instrumento,
      concedente: link.checklistItem.instrument.concedente
    },
    expiraEm: link.expiraEm,
    flashStatus: req.query.status === "error" ? "error" : req.query.status === "ok" ? "ok" : undefined,
    flashMessage: typeof req.query.message === "string" ? req.query.message : undefined,
    files: link.files
  });

  return res.type("html").send(html);
});

publicRouter.post("/checklist-links/:token/upload", upload.array("arquivos", 10), async (req, res) => {
  const parsedToken = checklistExternalLinkTokenParamSchema.safeParse(req.params);
  if (!parsedToken.success) {
    return res.status(400).json({ message: "Link invalido." });
  }

  const parsedBody = checklistExternalUploadBodySchema.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    return res.redirect(
      303,
      `/api/v1/public/checklist-links/${parsedToken.data.token}?status=error&message=${encodeURIComponent(
        "Preencha seu nome corretamente."
      )}`
    );
  }

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    return res.redirect(
      303,
      `/api/v1/public/checklist-links/${parsedToken.data.token}?status=error&message=${encodeURIComponent(
        "Envie pelo menos um arquivo."
      )}`
    );
  }

  const existingLink = await getActiveChecklistExternalLinkByToken(parsedToken.data.token);
  if (!existingLink) {
    return res.redirect(
      303,
      `/api/v1/public/checklist-links/${parsedToken.data.token}?status=error&message=${encodeURIComponent(
        "Link nao encontrado ou expirado."
      )}`
    );
  }

  await fs.mkdir(externalUploadRootPath, { recursive: true });

  const stagedFiles: Array<{
    arquivoPath: string;
    arquivoNomeOriginal: string;
    arquivoMimeType?: string;
    arquivoTamanho?: number;
  }> = [];

  try {
    for (const file of files) {
      const extension = path.extname(file.originalname).toLowerCase();
      const safeName = `${existingLink.checklistItemId}-${Date.now()}-${randomUUID()}${extension}`;
      const destination = path.join(externalUploadRootPath, safeName);
      await fs.writeFile(destination, file.buffer);
      stagedFiles.push({
        arquivoPath: destination,
        arquivoNomeOriginal: file.originalname,
        arquivoMimeType: file.mimetype,
        arquivoTamanho: file.size
      });
    }

    const updated = await saveChecklistExternalFilesByToken(parsedToken.data.token, {
      nomeRemetente: parsedBody.data.nome_remetente.trim(),
      files: stagedFiles
    });

    const message = `A NC Convenios Agradece pela sua colaboracao e confirma o recebimento da documentacao enviada. Total de arquivos recebidos neste envio: ${stagedFiles.length}.`;
    return res.redirect(
      303,
      `/api/v1/public/checklist-links/${parsedToken.data.token}?status=ok&message=${encodeURIComponent(message)}`
    );
  } catch (error) {
    await Promise.all(stagedFiles.map((file) => fs.unlink(file.arquivoPath).catch(() => undefined)));

    if (error instanceof Error && error.message === "CHECKLIST_EXTERNAL_LINK_NOT_FOUND") {
      return res.redirect(
        303,
        `/api/v1/public/checklist-links/${parsedToken.data.token}?status=error&message=${encodeURIComponent(
          "Link nao encontrado ou expirado."
        )}`
      );
    }

    return res.redirect(
      303,
      `/api/v1/public/checklist-links/${parsedToken.data.token}?status=error&message=${encodeURIComponent(
        "Erro interno ao processar envio de arquivos."
      )}`
    );
  }
});

export { publicRouter as instrumentosPublicRouter };
