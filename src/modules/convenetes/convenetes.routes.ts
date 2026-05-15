import { Prisma, UserRole } from "@prisma/client";
import { promises as fs } from "fs";
import { NextFunction, Request, Response, Router } from "express";
import { prisma } from "../../lib/prisma";
import multer from "multer";
import path from "path";
import {
  createConveneteLogoObjectKey,
  createConveneteTimbreObjectKey,
  deleteConveneteLogoObject,
  deleteConveneteTimbreObject,
  getConveneteLogoObjectBuffer,
  getConveneteTimbreObjectBuffer,
  putConveneteLogoObject,
  putConveneteTimbreObject
} from "../../lib/storage/r2-storage";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import {
  createConveneteFromProponenteSchema,
  createConveneteSchema,
  proponenteSugestaoQuerySchema,
  updateConveneteSchema
} from "./convenetes.schema";
import {
  createConveneteFromProponente,
  createConvenete,
  clearConveneteLogo,
  deleteConvenete,
  getReimportAllProgress,
  getConveneteById,
  iniciarReimportacaoTodosProponentesAtendidos,
  listProponenteSugestoesFromTransferencias,
  listConvenetes,
  reimportarInstrumentosDoProponenteAtendido,
  reimportarInstrumentosTodosProponentesAtendidos,
  updateConveneteLogo,
  updateConvenete
} from "./convenetes.service";

const router = Router();
const allowedLogoMimes = new Set(["image/png", "image/jpeg"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedLogoMimes.has(file.mimetype)) {
      cb(new Error("Formato de imagem invalido. Use PNG ou JPG."));
      return;
    }
    cb(null, true);
  }
});

const uploadProponenteLogoMiddleware = (req: Request, res: Response, next: NextFunction) => {
  upload.single("logo")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(422).json({ message: "Imagem excede o limite de 5 MB." });
      return;
    }

    res.status(422).json({ message: error.message || "Falha ao processar upload da imagem." });
  });
};

const isLegacyLocalLogoPath = (logoPath: string) => {
  if (path.isAbsolute(logoPath)) {
    return true;
  }

  const normalized = logoPath.replace(/\\/g, "/");
  return (
    normalized.startsWith("./uploads/") ||
    normalized.startsWith("uploads/") ||
    normalized.includes("/uploads/") ||
    normalized.includes("proponentes-logos")
  );
};

const isLocalStorageLogoPath = (logoPath: string) => {
  return logoPath.startsWith("proponentes/logos/") || logoPath.startsWith("documents/");
};

const mapConveneteResponse = (item: any) => ({
  id: item.id,
  nome: item.nome,
  cnpj: item.cnpj,
  endereco: item.endereco || "",
  numero: item.numero || null,
  complemento: item.complemento || null,
  bairro: item.bairro || "",
  cep: item.cep || null,
  uf: item.uf || "",
  cidade: item.cidade || "",
  tel: item.tel || null,
  email: item.email || null,
  logo_url: item.logoPath ? `/api/v1/proponentes/logo/${item.id}?v=${item.updatedAt.getTime()}` : null,
  timbre_url: item.timbrePath ? `/api/v1/proponentes/timbre/${item.id}?v=${item.updatedAt.getTime()}` : null,
  created_at: item.createdAt.toISOString(),
  updated_at: item.updatedAt.toISOString()
});

router.get("/logo/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const convenete = await getConveneteById(id);
  if (!convenete || !convenete.logoPath) {
    return res.status(404).json({ message: "Logo do proponente nao encontrado." });
  }

  try {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    if (convenete.logoMimeType) {
      res.type(convenete.logoMimeType);
    }

    if (isLegacyLocalLogoPath(convenete.logoPath)) {
      await fs.access(convenete.logoPath);
      return res.sendFile(convenete.logoPath, (error) => {
        if (!error || res.headersSent) {
          return;
        }

        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          res.status(404).json({ message: "Logo do proponente nao encontrado." });
          return;
        }

        res.status(500).json({ message: "Erro interno ao carregar logo do proponente." });
      });
    }

    const buffer = await getConveneteLogoObjectBuffer(convenete.logoPath);
    if (!buffer) {
      return res.status(404).json({ message: "Logo do proponente nao encontrado." });
    }
    return res.send(buffer);
  } catch {
    return res.status(404).json({ message: "Logo do proponente nao encontrado." });
  }
});

router.use(authenticate);

router.get(
  ["/proponentes/sugestoes", "/sugestoes"],
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = proponenteSugestaoQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const itens = await listProponenteSugestoesFromTransferencias(parsed.data);
      return res.json({ itens });
    } catch {
      return res.status(500).json({ message: "Erro interno ao listar sugestoes de proponentes." });
    }
  }
);

router.post(["/proponentes", "/from-base"], authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  const parsed = createConveneteFromProponenteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const result = await createConveneteFromProponente(parsed.data, req.user ?? undefined);
    return res.status(201).json({
      ...mapConveneteResponse(result.proponente),
      importacao: result.importacao
    });
  } catch {
    return res.status(500).json({ message: "Erro interno ao cadastrar proponente." });
  }
});

router.get("/", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), async (req, res) => {
  try {
    const items = await listConvenetes(req.user ?? undefined);
    return res.json(items.map(mapConveneteResponse));
  } catch {
    return res.status(500).json({ message: "Erro interno ao listar proponentes." });
  }
});

router.post("/", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  const parsed = createConveneteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const created = await createConvenete(parsed.data, req.user ?? undefined);
    return res.status(201).json(mapConveneteResponse(created));
  } catch (error) {
    if (error instanceof Error && error.message === "CONVENETE_CNPJ_ALREADY_EXISTS") {
      return res.status(409).json({ message: "CNPJ ja cadastrado." });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "CNPJ ja cadastrado." });
    }
    return res.status(500).json({ message: "Erro interno ao criar proponente." });
  }
});

router.put("/:id", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const parsed = updateConveneteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const existing = await getConveneteById(id, req.user ?? undefined);
    if (!existing) {
      return res.status(404).json({ message: "Proponente nao encontrado." });
    }

    const updated = await updateConvenete(id, parsed.data);
    return res.json(mapConveneteResponse(updated));
  } catch (error) {
    if (error instanceof Error && error.message === "CONVENETE_CNPJ_ALREADY_EXISTS") {
      return res.status(409).json({ message: "CNPJ ja cadastrado." });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "CNPJ ja cadastrado." });
    }
    return res.status(500).json({ message: "Erro interno ao atualizar proponente." });
  }
});

router.post("/:id/logo", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), uploadProponenteLogoMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const file = req.file;
  if (!file) {
    return res.status(422).json({ message: "Selecione uma imagem para o proponente." });
  }

  const existing = await getConveneteById(id, req.user ?? undefined);
  if (!existing) {
    return res.status(404).json({ message: "Proponente nao encontrado." });
  }

  const logoObjectKey = createConveneteLogoObjectKey(existing.id, file.mimetype);

  try {
    await putConveneteLogoObject({
      key: logoObjectKey,
      buffer: file.buffer,
      contentType: file.mimetype
    });

    const updated = await updateConveneteLogo(existing.id, {
      logoPath: logoObjectKey,
      logoMimeType: file.mimetype
    });

    if (existing.logoPath && existing.logoPath !== logoObjectKey) {
      if (isLegacyLocalLogoPath(existing.logoPath)) {
        await fs.unlink(existing.logoPath).catch(() => undefined);
      } else {
        await deleteConveneteLogoObject(existing.logoPath).catch(() => undefined);
      }
    }

    return res.json(mapConveneteResponse(updated));
  } catch {
    await deleteConveneteLogoObject(logoObjectKey).catch(() => undefined);
    return res.status(500).json({ message: "Erro interno ao atualizar logo do proponente." });
  }
});

router.delete("/:id/logo", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const existing = await getConveneteById(id, req.user ?? undefined);
  if (!existing) {
    return res.status(404).json({ message: "Proponente nao encontrado." });
  }

  if (!existing.logoPath) {
    return res.status(204).end();
  }

  await clearConveneteLogo(existing.id);
  if (isLegacyLocalLogoPath(existing.logoPath)) {
    await fs.unlink(existing.logoPath).catch(() => undefined);
  } else {
    await deleteConveneteLogoObject(existing.logoPath).catch(() => undefined);
  }
  return res.status(204).end();
});

const uploadTimbreMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype === "application/msword"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos DOCX são permitidos."));
    }
  }
}).single("timbre");

router.post("/:id/timbre", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), uploadTimbreMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const file = req.file;
  if (!file) {
    return res.status(422).json({ message: "Selecione um arquivo DOCX para o timbre." });
  }

  const existing = await getConveneteById(id, req.user ?? undefined);
  if (!existing) {
    return res.status(404).json({ message: "Proponente nao encontrado." });
  }

  const timbreObjectKey = createConveneteTimbreObjectKey(existing.id, file.mimetype);

  try {
    await putConveneteTimbreObject({
      key: timbreObjectKey,
      buffer: file.buffer,
      contentType: file.mimetype
    });

    const updated = await prisma.convenete.update({
      where: { id },
      data: {
        timbrePath: timbreObjectKey,
        timbreMimeType: file.mimetype
      }
    });

    if (existing.timbrePath && existing.timbrePath !== timbreObjectKey) {
      await deleteConveneteTimbreObject(existing.timbrePath).catch(() => undefined);
    }

    return res.json({
      id: updated.id,
      timbrePath: updated.timbrePath,
      timbreMimeType: updated.timbreMimeType
    });
  } catch (error) {
    await deleteConveneteTimbreObject(timbreObjectKey).catch(() => undefined);
    return res.status(500).json({ message: "Erro interno ao atualizar timbre do proponente." });
  }
});

router.get("/timbre/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const convenete = await prisma.convenete.findUnique({
    where: { id },
    select: { timbrePath: true, timbreMimeType: true }
  });

  if (!convenete || !convenete.timbrePath) {
    return res.status(404).json({ message: "Timbre nao encontrado." });
  }

  try {
    const buffer = await getConveneteTimbreObjectBuffer(convenete.timbrePath);
    if (convenete.timbreMimeType) {
      res.type(convenete.timbreMimeType);
    } else {
      res.type("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    }
    return res.end(buffer);
  } catch {
    return res.status(500).json({ message: "Erro interno ao carregar timbre." });
  }
});

router.delete("/:id/timbre", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const existing = await getConveneteById(id, req.user ?? undefined);
  if (!existing) {
    return res.status(404).json({ message: "Proponente nao encontrado." });
  }

  if (!existing.timbrePath) {
    return res.status(204).end();
  }

  await prisma.convenete.update({
    where: { id },
    data: { timbrePath: null, timbreMimeType: null }
  });

  await deleteConveneteTimbreObject(existing.timbrePath).catch(() => undefined);
  return res.status(204).end();
});

router.post("/:id(\\d+)/reimportar-instrumentos", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  try {
    const existing = await getConveneteById(id, req.user ?? undefined);
    if (!existing) {
      return res.status(404).json({ message: "Proponente nao encontrado." });
    }

    const result = await reimportarInstrumentosDoProponenteAtendido(id, req.user ?? undefined);
    if (!result) {
      return res.status(404).json({ message: "Proponente nao encontrado." });
    }

    return res.json(result);
  } catch {
    return res.status(500).json({ message: "Erro interno ao reimportar instrumentos do proponente." });
  }
});

router.post("/reimportar-instrumentos-todos", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  try {
    const result = iniciarReimportacaoTodosProponentesAtendidos(req.user ?? undefined);
    return res.status(202).json(result);
  } catch {
    return res.status(500).json({ message: "Erro interno ao reimportar instrumentos de todos os proponentes." });
  }
});

router.get("/reimportar-instrumentos-todos/status", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  try {
    const result = getReimportAllProgress(req.user ?? undefined);
    return res.json(result);
  } catch {
    return res.status(500).json({ message: "Erro interno ao consultar status da sincronizacao de proponentes." });
  }
});

router.delete("/:id", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  try {
    const existing = await getConveneteById(id, req.user ?? undefined);
    if (!existing) {
      return res.status(404).json({ message: "Proponente nao encontrado." });
    }

    const deleted = await deleteConvenete(id, req.user ?? undefined);
    if (!deleted) {
      return res.status(404).json({ message: "Proponente nao encontrado." });
    }
    if (existing.logoPath) {
      if (isLegacyLocalLogoPath(existing.logoPath)) {
        await fs.unlink(existing.logoPath).catch(() => undefined);
      } else {
        await deleteConveneteLogoObject(existing.logoPath).catch(() => undefined);
      }
    }
    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: "Erro interno ao remover proponente." });
  }
});

export { router as convenetesRouter };

