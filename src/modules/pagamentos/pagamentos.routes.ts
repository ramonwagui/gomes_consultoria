import { UserRole } from "@prisma/client";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { Router } from "express";
import multer from "multer";
import path from "path";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import {
  createPaymentRequestWithFiles,
  getPaymentRequestFile,
  getPaymentRequestInstrumentById,
  listMappedPaymentRequests,
  listPaymentRequestInstruments,
  updatePaymentRequestStatus
} from "./pagamentos.service";
import {
  createPaymentRequestSchema,
  paymentRequestIdParamSchema,
  paymentRequestListQuerySchema,
  updatePaymentRequestStatusSchema
} from "./pagamentos.schema";

const router = Router();
const paymentUploadRootPath = path.resolve(process.cwd(), "uploads", "pagamentos");
const allowedPaymentFileMimes = new Set(["application/pdf", "image/png", "image/jpeg"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedPaymentFileMimes.has(file.mimetype)) {
      cb(new Error("Formato de arquivo invalido. Use PDF, PNG ou JPG."));
      return;
    }
    cb(null, true);
  }
});

const normalizeUploadedFileName = (fileName: string) => path.basename(fileName).replace(/[^\w.\-() ]+/g, "_");

const readJsonField = (value: unknown) => {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

router.use(authenticate);

router.get("/instrumentos", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO, UserRole.FINANCEIRO), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Usuario nao autenticado." });
  }

  const itens = await listPaymentRequestInstruments(req.user);
  return res.json({ itens });
});

router.get("/instrumentos/:id", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO, UserRole.FINANCEIRO), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Usuario nao autenticado." });
  }

  const parsed = paymentRequestIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const item = await getPaymentRequestInstrumentById(parsed.data.id, req.user);
  if (!item) {
    return res.status(404).json({ message: "Instrumento nao encontrado." });
  }

  return res.json(item);
});

router.get("/", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO, UserRole.FINANCEIRO), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Usuario nao autenticado." });
  }

  const parsed = paymentRequestListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(422).json({ message: "Filtros invalidos", issues: parsed.error.flatten() });
  }

  const itens = await listMappedPaymentRequests(parsed.data, req.user);
  return res.json({ itens });
});

router.post(
  "/",
  authorizeRoles(UserRole.ADMIN, UserRole.FINANCEIRO),
  upload.fields([
    { name: "nota_fiscal", maxCount: 1 },
    { name: "empenho", maxCount: 1 }
  ]),
  async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Usuario nao autenticado." });
  }

  const rawBody = {
    ...req.body,
    impostos: readJsonField(req.body.impostos)
  };
  const parsed = createPaymentRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return res.status(422).json({ message: "Payload invalido", issues: parsed.error.flatten() });
  }

  const files = req.files as Record<string, Express.Multer.File[] | undefined> | undefined;
  const notaFiscalFile = files?.nota_fiscal?.[0];
  const empenhoFile = files?.empenho?.[0];
  const stagedFiles: Array<{ path: string; originalName: string; mimeType: string; kind: "notaFiscal" | "empenho" }> = [];

  try {
    await fs.mkdir(paymentUploadRootPath, { recursive: true });
    for (const [kind, file] of [
      ["notaFiscal", notaFiscalFile],
      ["empenho", empenhoFile]
    ] as const) {
      if (!file) {
        continue;
      }

      const extension = path.extname(file.originalname) || (file.mimetype === "application/pdf" ? ".pdf" : ".jpg");
      const destination = path.join(paymentUploadRootPath, `${Date.now()}-${randomUUID()}${extension}`);
      await fs.writeFile(destination, file.buffer);
      stagedFiles.push({
        path: destination,
        originalName: normalizeUploadedFileName(file.originalname),
        mimeType: file.mimetype,
        kind
      });
    }

    const created = await createPaymentRequestWithFiles(parsed.data, req.user, {
      notaFiscal: stagedFiles.find((file) => file.kind === "notaFiscal"),
      empenho: stagedFiles.find((file) => file.kind === "empenho")
    });
    return res.status(201).json(created);
  } catch (error) {
    await Promise.all(stagedFiles.map((file) => fs.unlink(file.path).catch(() => undefined)));
    return res.status(422).json({ message: error instanceof Error ? error.message : "Falha ao solicitar pagamento." });
  }
});

router.get(
  "/:id/arquivos/:tipo",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO, UserRole.FINANCEIRO),
  async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuario nao autenticado." });
    }

    const idParam = paymentRequestIdParamSchema.safeParse(req.params);
    const tipo = req.params.tipo;
    if (!idParam.success || (tipo !== "nota_fiscal" && tipo !== "empenho")) {
      return res.status(400).json({ message: "Arquivo invalido." });
    }

    const file = await getPaymentRequestFile(idParam.data.id, tipo, req.user);
    if (!file) {
      return res.status(404).json({ message: "Arquivo nao encontrado." });
    }

    try {
      await fs.access(file.path);
      if (file.mimeType) {
        res.type(file.mimeType);
      }
      return res.download(file.path, normalizeUploadedFileName(file.originalName));
    } catch {
      return res.status(404).json({ message: "Arquivo nao encontrado." });
    }
  }
);

router.patch("/:id/status", authorizeRoles(UserRole.ADMIN), async (req, res) => {
  const idParam = paymentRequestIdParamSchema.safeParse(req.params);
  if (!idParam.success) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const parsed = updatePaymentRequestStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: "Payload invalido", issues: parsed.error.flatten() });
  }

  const updated = await updatePaymentRequestStatus(idParam.data.id, parsed.data.status);
  return res.json(updated);
});

export { router as pagamentosRouter };
