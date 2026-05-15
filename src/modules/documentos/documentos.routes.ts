import { DocumentoAreaStatus, UserRole } from "@prisma/client";
import { Router } from "express";
import multer from "multer";

import { env } from "../../config/env";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import {
  createExternalRequestSchema,
  documentoIdParamSchema,
  listDocumentoAuditQuerySchema,
  listDocumentosQuerySchema,
  searchDocumentosQuerySchema,
  updateExternalRequestSchema,
  updateDocumentoSchema
} from "./documentos.schema";
import {
  createDocumentoExternalRequest,
  createDocumentosFromFiles,
  deactivateDocumentoExternalRequest,
  documentoUploadLimits,
  getDocumentoForDownload,
  listDocumentoAuditLogs,
  listDocumentosByExternalRequest,
  listDocumentoExternalRequests,
  listDocumentos,
  prepareDocumentoExternalRequestResend,
  reindexDocumento,
  searchDocumentos,
  updateDocumentoExternalRequestExpiration,
  updateDocumento,
  deleteDocumentoLogically
} from "./documentos.service";
import { getDocumentosScanMonitor } from "./documentos-scan.scheduler";
import {
  allowedDocumentoMimes,
  sanitizeDownloadName,
  validateUploadedFileName
} from "./documentos.util";

export const documentosRouter = Router();

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
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: `Arquivo excede o limite de ${env.documentosMaxFileSizeMb} MB.`
      });
    }
    return res.status(422).json({ message: error.message || "Falha ao receber arquivos." });
  });
};

documentosRouter.use(authenticate);

documentosRouter.get(
  "/scan/monitor",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (_req, res) => {
    const monitor = await getDocumentosScanMonitor();
    return res.json(monitor);
  }
);

documentosRouter.get(
  "/",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = listDocumentosQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({ message: "Filtros invalidos", issues: parsed.error.flatten() });
    }
    const itens = await listDocumentos(parsed.data);
    return res.json({ itens });
  }
);

documentosRouter.get(
  "/search",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = searchDocumentosQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({ message: "Filtros invalidos", issues: parsed.error.flatten() });
    }
    const itens = await searchDocumentos(parsed.data);
    return res.json({ itens });
  }
);

documentosRouter.get(
  "/auditoria",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = listDocumentoAuditQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({ message: "Filtros invalidos", issues: parsed.error.flatten() });
    }
    const itens = await listDocumentoAuditLogs(parsed.data);
    return res.json({ itens });
  }
);

documentosRouter.post(
  "/upload",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  uploadMany,
  async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const bodyParsed = listDocumentosQuerySchema
      .pick({ instrumento_id: true, proponente_id: true })
      .safeParse(req.body ?? {});

    if (!bodyParsed.success) {
      return res.status(422).json({ message: "Vinculos invalidos", issues: bodyParsed.error.flatten() });
    }

    try {
      const itens = await createDocumentosFromFiles({
        files,
        user: req.user,
        instrumentId: bodyParsed.data.instrumento_id,
        conveneteId: bodyParsed.data.proponente_id,
        ip: req.ip
      });
      return res.status(201).json({ itens });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "NO_FILES") {
          return res.status(400).json({ message: "Nenhum arquivo enviado." });
        }
        if (error.message === "TOO_MANY_FILES") {
          return res.status(413).json({ message: `Lote excede o limite de ${env.documentosMaxFilesPerBatch} arquivos.` });
        }
        if (error.message === "BATCH_TOO_LARGE") {
          return res.status(413).json({ message: `Lote excede o limite total de ${env.documentosMaxBatchSizeMb} MB.` });
        }
        if (error.message === "INSTRUMENT_NOT_FOUND") {
          return res.status(404).json({ message: "Instrumento informado nao encontrado." });
        }
        if (error.message === "CONVENETE_NOT_FOUND") {
          return res.status(404).json({ message: "Proponente informado nao encontrado." });
        }
        if (error.message === "INVALID_FILE_SIGNATURE") {
          return res.status(422).json({ message: "Arquivo invalido: assinatura binaria nao reconhecida." });
        }
        if (error.message === "EXTENSION_MISMATCH" || error.message === "MIME_MISMATCH") {
          return res.status(422).json({ message: "Arquivo invalido: extensao/tipo nao correspondem ao conteudo real." });
        }
      }
      return res.status(500).json({ message: "Erro interno ao enviar documentos." });
    }
  }
);

documentosRouter.get(
  "/:id/download",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    try {
      const parsed = documentoIdParamSchema.safeParse(req.params);
      if (!parsed.success || !req.user) {
        return res.status(400).json({ message: "Documento invalido." });
      }

      const result = await getDocumentoForDownload(parsed.data.id, req.user, req.ip);
      if (!result) {
        return res.status(404).json({ message: "Documento nao encontrado." });
      }

      res.setHeader("Content-Type", result.mimeType ?? "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${sanitizeDownloadName(result.fileName)}"`);
      return res.send(result.buffer);
    } catch (error) {
      if (error instanceof Error && error.message === "DOCUMENT_SCAN_PENDING") {
        return res.status(409).json({ message: "Documento em quarentena: download liberado somente apos varredura antivirus." });
      }
      return res.status(500).json({ message: "Erro interno ao baixar documento." });
    }
  }
);

documentosRouter.patch(
  "/:id",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const params = documentoIdParamSchema.safeParse(req.params);
    if (!params.success || !req.user) {
      return res.status(400).json({ message: "Documento invalido." });
    }
    const parsed = updateDocumentoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ message: "Payload invalido", issues: parsed.error.flatten() });
    }
    try {
      const updated = await updateDocumento(params.data.id, parsed.data, req.user, req.ip);
      if (!updated) {
        return res.status(404).json({ message: "Documento nao encontrado." });
      }
      return res.json(updated);
    } catch (error) {
      if (error instanceof Error && error.message === "INSTRUMENT_NOT_FOUND") {
        return res.status(404).json({ message: "Instrumento informado nao encontrado." });
      }
      if (error instanceof Error && error.message === "CONVENETE_NOT_FOUND") {
        return res.status(404).json({ message: "Proponente informado nao encontrado." });
      }
      return res.status(500).json({ message: "Erro interno ao atualizar documento." });
    }
  }
);

documentosRouter.post(
  "/:id/reindex",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = documentoIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ message: "Documento invalido." });
    }

    try {
      const updated = await reindexDocumento(parsed.data.id);
      if (!updated) {
        return res.status(404).json({ message: "Documento nao encontrado." });
      }
      return res.json(updated);
    } catch (error) {
      if (error instanceof Error && error.message === "DOCUMENT_FILE_NOT_FOUND") {
        return res.status(404).json({ message: "Arquivo do documento nao encontrado no storage." });
      }
      return res.status(500).json({ message: error instanceof Error ? error.message : "Erro interno ao reindexar documento." });
    }
  }
);

documentosRouter.delete(
  "/:id",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = documentoIdParamSchema.safeParse(req.params);
    if (!parsed.success || !req.user) {
      return res.status(400).json({ message: "Documento invalido." });
    }
    const deleted = await deleteDocumentoLogically(parsed.data.id, req.user, req.ip);
    if (!deleted) {
      return res.status(404).json({ message: "Documento nao encontrado." });
    }
    return res.status(204).send();
  }
);

documentosRouter.get(
  "/external-requests",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const itens = await listDocumentoExternalRequests();
    const host = req.get("host") ?? "localhost";
    const baseUrl = `${req.protocol}://${host}`;
    return res.json({
      itens: itens.map((item) => ({
        ...item,
        link_publico: item.link_publico.startsWith("http") ? item.link_publico : `${baseUrl}${item.link_publico}`
      }))
    });
  }
);

documentosRouter.get(
  "/external-requests/:id/documentos",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = documentoIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ message: "Link invalido." });
    }

    const result = await listDocumentosByExternalRequest(parsed.data.id);
    if (!result) {
      return res.status(404).json({ message: "Link nao encontrado." });
    }
    return res.json(result);
  }
);

documentosRouter.patch(
  "/external-requests/:id",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const params = documentoIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ message: "Link invalido." });
    }
    const parsed = updateExternalRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ message: "Payload invalido", issues: parsed.error.flatten() });
    }
    try {
      const updated = await updateDocumentoExternalRequestExpiration(params.data.id, parsed.data);
      if (!updated) {
        return res.status(404).json({ message: "Link nao encontrado." });
      }
      const host = req.get("host") ?? "localhost";
      return res.json({
        ...updated,
        link_publico: updated.link_publico.startsWith("http") ? updated.link_publico : `${req.protocol}://${host}${updated.link_publico}`
      });
    } catch (error) {
      if (error instanceof Error && error.message === "EXPIRATION_REQUIRED") {
        return res.status(422).json({ message: "Informe data/hora de expiracao ou marque como permanente." });
      }
      if (error instanceof Error && error.message === "EXPIRATION_IN_PAST") {
        return res.status(422).json({ message: "A expiracao precisa estar no futuro." });
      }
      return res.status(500).json({ message: "Erro interno ao atualizar link externo." });
    }
  }
);

documentosRouter.post(
  "/external-requests/:id/resend",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = documentoIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ message: "Link invalido." });
    }
    try {
      const updated = await prepareDocumentoExternalRequestResend(parsed.data.id);
      if (!updated) {
        return res.status(404).json({ message: "Link nao encontrado." });
      }
      const host = req.get("host") ?? "localhost";
      return res.json({
        ...updated,
        link_publico: updated.link_publico.startsWith("http") ? updated.link_publico : `${req.protocol}://${host}${updated.link_publico}`
      });
    } catch (error) {
      if (error instanceof Error && error.message === "DESATIVADO") {
        return res.status(409).json({ message: "Link cancelado/desativado nao pode ser reenviado." });
      }
      if (error instanceof Error && error.message === "EXPIRADO") {
        return res.status(409).json({ message: "Atualize a expiracao antes de reenviar este link." });
      }
      return res.status(500).json({ message: "Erro interno ao preparar reenvio do link." });
    }
  }
);

documentosRouter.post(
  "/external-requests",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuario nao autenticado." });
    }
    const parsed = createExternalRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ message: "Payload invalido", issues: parsed.error.flatten() });
    }
    try {
      const created = await createDocumentoExternalRequest(parsed.data, req.user);
      const host = req.get("host") ?? "localhost";
      const publicPath = created.link_publico;
      return res.status(201).json({
        ...created,
        link_publico: `${req.protocol}://${host}${publicPath}`
      });
    } catch (error) {
      if (error instanceof Error && error.message === "EXPIRATION_REQUIRED") {
        return res.status(422).json({ message: "Informe data/hora de expiracao ou marque como permanente." });
      }
      if (error instanceof Error && error.message === "EXPIRATION_IN_PAST") {
        return res.status(422).json({ message: "A expiracao precisa estar no futuro." });
      }
      return res.status(500).json({ message: "Erro interno ao criar link externo." });
    }
  }
);

documentosRouter.delete(
  "/external-requests/:id",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = documentoIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ message: "Link invalido." });
    }
    const updated = await deactivateDocumentoExternalRequest(parsed.data.id);
    return res.json(updated);
  }
);

documentosRouter.get("/config/limits", (_req, res) => {
  return res.json({
    max_files_per_batch: documentoUploadLimits.maxFiles,
    max_file_size_mb: env.documentosMaxFileSizeMb,
    max_batch_size_mb: env.documentosMaxBatchSizeMb,
    status_default: DocumentoAreaStatus.ATIVO
  });
});
