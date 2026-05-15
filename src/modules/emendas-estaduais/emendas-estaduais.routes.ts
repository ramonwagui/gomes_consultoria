import { UserRole } from "@prisma/client";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { Router } from "express";
import multer from "multer";
import path from "path";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import {
  createEmendaEstadualSchema,
  emendaEstadualDocumentoIdParamSchema,
  emendaEstadualIdParamSchema,
  listEmendasEstaduaisQuerySchema,
  updateEmendaEstadualSchema
} from "./emendas-estaduais.schema";
import {
  createEmendaEstadual,
  createEmendaDocumento,
  deleteEmendaEstadual,
  deleteEmendaDocumento,
  getEmendaDocumentoById,
  listEmendaDocumentos,
  listEmendaDocumentosAuditoria,
  listEmendasEstaduais,
  listMunicipiosAtendidos,
  updateEmendaDocumento,
  updateEmendaEstadual
} from "./emendas-estaduais.service";

export const emendasEstaduaisRouter = Router();
const uploadRootPath = path.resolve(process.cwd(), "uploads", "emendas-estaduais");
const allowedUploadMimes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
  "text/csv",
  "image/png",
  "image/jpeg"
]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedUploadMimes.has(file.mimetype)) {
      cb(new Error("Formato de arquivo nao permitido. Use PDF, DOC, DOCX, XLS, XLSX, CSV, JPG ou PNG."));
      return;
    }
    cb(null, true);
  }
});

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

emendasEstaduaisRouter.use(authenticate);

emendasEstaduaisRouter.get(
  "/municipios",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (_req, res) => {
    const items = await listMunicipiosAtendidos();
    return res.json({ itens: items });
  }
);

emendasEstaduaisRouter.get(
  "/",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = listEmendasEstaduaisQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Filtros invalidos",
        issues: parsed.error.flatten()
      });
    }

    const items = await listEmendasEstaduais(parsed.data);
    return res.json({ itens: items });
  }
);

emendasEstaduaisRouter.post(
  "/",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = createEmendaEstadualSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    const created = await createEmendaEstadual(parsed.data);
    return res.status(201).json(created);
  }
);

emendasEstaduaisRouter.put(
  "/:id",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const idParam = emendaEstadualIdParamSchema.safeParse(req.params);
    if (!idParam.success) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const parsed = updateEmendaEstadualSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    const updated = await updateEmendaEstadual(idParam.data.id, parsed.data);
    if (!updated) {
      return res.status(404).json({ message: "Emenda estadual nao encontrada." });
    }
    return res.json(updated);
  }
);

emendasEstaduaisRouter.delete(
  "/:id",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const idParam = emendaEstadualIdParamSchema.safeParse(req.params);
    if (!idParam.success) {
      return res.status(400).json({ message: "ID invalido." });
    }

    await deleteEmendaEstadual(idParam.data.id);
    return res.status(204).send();
  }
);

emendasEstaduaisRouter.get(
  "/:id/documentos",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = emendaEstadualIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ message: "ID invalido." });
    }
    const itens = await listEmendaDocumentos(parsed.data.id);
    return res.json({ itens });
  }
);

emendasEstaduaisRouter.get(
  "/:id/documentos/auditoria",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = emendaEstadualIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ message: "ID invalido." });
    }
    const itens = await listEmendaDocumentosAuditoria(parsed.data.id);
    return res.json({ itens });
  }
);

emendasEstaduaisRouter.post(
  "/:id/documentos",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  upload.array("arquivos", 20),
  async (req, res) => {
    const parsed = emendaEstadualIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ message: "ID invalido." });
    }
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      return res.status(400).json({ message: "Nenhum arquivo enviado." });
    }

    await fs.mkdir(uploadRootPath, { recursive: true });
    const createdItems: any[] = [];
    const stagedPaths: string[] = [];
    try {
      for (const file of files) {
        const safeName = `${Date.now()}-${randomUUID()}-${sanitizeFileName(file.originalname)}`;
        const destination = path.join(uploadRootPath, safeName);
        await fs.writeFile(destination, file.buffer);
        stagedPaths.push(destination);
        const created = await createEmendaDocumento({
          emendaId: parsed.data.id,
          arquivoNomeOriginal: file.originalname,
          arquivoPath: destination,
          mimeType: file.mimetype,
          tamanho: file.size,
          userId: req.user?.id,
          userEmail: req.user?.email ?? "sistema@local"
        });
        if (!created) {
          await fs.unlink(destination).catch(() => undefined);
          return res.status(404).json({ message: "Emenda estadual nao encontrada." });
        }
        createdItems.push(created);
      }
      return res.status(201).json({ itens: createdItems });
    } catch (error: any) {
      await Promise.all(stagedPaths.map((item) => fs.unlink(item).catch(() => undefined)));
      return res.status(500).json({ message: error?.message || "Falha ao enviar documentos." });
    }
  }
);

emendasEstaduaisRouter.put(
  "/:id/documentos/:documentoId",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  upload.single("arquivo"),
  async (req, res) => {
    const parsed = emendaEstadualDocumentoIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ message: "Parametros invalidos." });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Arquivo obrigatorio." });
    }

    await fs.mkdir(uploadRootPath, { recursive: true });
    const safeName = `${Date.now()}-${randomUUID()}-${sanitizeFileName(req.file.originalname)}`;
    const destination = path.join(uploadRootPath, safeName);
    await fs.writeFile(destination, req.file.buffer);

    try {
      const updated = await updateEmendaDocumento({
        emendaId: parsed.data.id,
        documentoId: parsed.data.documentoId,
        arquivoNomeOriginal: req.file.originalname,
        arquivoPath: destination,
        mimeType: req.file.mimetype,
        tamanho: req.file.size,
        userId: req.user?.id,
        userEmail: req.user?.email ?? "sistema@local"
      });
      if (!updated?.item) {
        await fs.unlink(destination).catch(() => undefined);
        return res.status(404).json({ message: "Documento nao encontrado." });
      }
      if (updated.previousPath && updated.previousPath !== destination) {
        await fs.unlink(updated.previousPath).catch(() => undefined);
      }
      return res.json(updated.item);
    } catch (error: any) {
      await fs.unlink(destination).catch(() => undefined);
      return res.status(500).json({ message: error?.message || "Falha ao substituir documento." });
    }
  }
);

emendasEstaduaisRouter.delete(
  "/:id/documentos/:documentoId",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = emendaEstadualDocumentoIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ message: "Parametros invalidos." });
    }
    const removed = await deleteEmendaDocumento({
      emendaId: parsed.data.id,
      documentoId: parsed.data.documentoId,
      userId: req.user?.id,
      userEmail: req.user?.email ?? "sistema@local"
    });
    if (!removed) {
      return res.status(404).json({ message: "Documento nao encontrado." });
    }
    await fs.unlink(removed.arquivoPath).catch(() => undefined);
    return res.status(204).send();
  }
);

emendasEstaduaisRouter.get(
  "/:id/documentos/:documentoId/download",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = emendaEstadualDocumentoIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ message: "Parametros invalidos." });
    }
    const item = await getEmendaDocumentoById(parsed.data.id, parsed.data.documentoId);
    if (!item) {
      return res.status(404).json({ message: "Documento nao encontrado." });
    }
    const filename = sanitizeFileName(item.arquivo_nome_original) || "documento";
    return res.download(item.arquivo_path, filename);
  }
);
