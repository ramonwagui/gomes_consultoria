import { Prisma, UserRole } from "@prisma/client";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { Router } from "express";
import multer from "multer";
import path from "path";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { seedDemoInstrumentos } from "../../scripts/seed-demo-instrumentos";
import { createUserSchema, updateUserSchema, userIdParamSchema } from "./usuarios.schema";
import { clearUserAvatar, createUser, getUserById, listUsers, updateUser, updateUserAvatar } from "./usuarios.service";

const router = Router();

const avatarUploadRootPath = path.resolve(process.cwd(), "uploads", "avatars");
const allowedAvatarMimes = new Set(["image/png", "image/jpeg"]);

const resolveStoredAvatarPath = (avatarPath: string) => {
  const candidates = [
    path.isAbsolute(avatarPath) ? avatarPath : path.resolve(process.cwd(), avatarPath),
    path.resolve(avatarUploadRootPath, path.basename(avatarPath))
  ];

  return Array.from(new Set(candidates));
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedAvatarMimes.has(file.mimetype)) {
      cb(new Error("Formato de imagem invalido. Use PNG ou JPG."));
      return;
    }
    cb(null, true);
  }
});

const mapUser = (item: Awaited<ReturnType<typeof getUserById>>) => {
  if (!item) {
    return null;
  }

  const avatarUrl = item.avatarPath ? `/api/v1/usuarios/avatar/${item.id}?v=${item.updatedAt.getTime()}` : null;

  return {
    id: item.id,
    nome: item.nome,
    email: item.email,
    role: item.role,
    avatar_url: avatarUrl,
    proponentes: (item.convenetePermissions ?? []).map((permission) => ({
      id: permission.convenete.id,
      nome: permission.convenete.nome,
      cnpj: permission.convenete.cnpj,
      cidade: permission.convenete.cidade,
      uf: permission.convenete.uf
    })),
    created_at: item.createdAt.toISOString(),
    updated_at: item.updatedAt.toISOString()
  };
};

router.get("/avatar/:id", async (req, res) => {
  const idParam = userIdParamSchema.safeParse(req.params);
  if (!idParam.success) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const user = await getUserById(idParam.data.id);
  if (!user || !user.avatarPath) {
    return res.status(404).json({ message: "Avatar nao encontrado." });
  }

  for (const avatarPath of resolveStoredAvatarPath(user.avatarPath)) {
    try {
      await fs.access(avatarPath);
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cache-Control", "private, max-age=3600");
      if (user.avatarMimeType) {
        res.type(user.avatarMimeType);
      }
      return res.sendFile(avatarPath);
    } catch {
      // Try the next path candidate.
    }
  }

  return res.status(404).json({ message: "Avatar nao encontrado." });
});

router.use(authenticate);

router.get("/me", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Usuario nao autenticado." });
  }

  const me = await getUserById(req.user.id);
  if (!me) {
    return res.status(404).json({ message: "Usuario nao encontrado." });
  }

  return res.json(mapUser(me));
});

router.post("/me/avatar", upload.single("avatar"), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Usuario nao autenticado." });
  }

  const file = req.file;
  if (!file) {
    return res.status(422).json({ message: "Selecione uma imagem para avatar." });
  }

  const me = await getUserById(req.user.id);
  if (!me) {
    return res.status(404).json({ message: "Usuario nao encontrado." });
  }

  await fs.mkdir(avatarUploadRootPath, { recursive: true });

  const extension = file.mimetype === "image/png" ? ".png" : ".jpg";
  const fileName = `${req.user.id}-${Date.now()}-${randomUUID()}${extension}`;
  const destination = path.join(avatarUploadRootPath, fileName);
  const storedPath = path.relative(process.cwd(), destination);

  try {
    await fs.writeFile(destination, file.buffer);
    const updated = await updateUserAvatar(req.user.id, {
      avatarPath: storedPath,
      avatarMimeType: file.mimetype
    });

    if (me.avatarPath) {
      await Promise.all(resolveStoredAvatarPath(me.avatarPath).map((candidate) => fs.unlink(candidate).catch(() => undefined)));
    }

    return res.json(mapUser(updated));
  } catch {
    await fs.unlink(destination).catch(() => undefined);
    return res.status(500).json({ message: "Erro interno ao atualizar avatar." });
  }
});

router.delete("/me/avatar", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Usuario nao autenticado." });
  }

  const me = await getUserById(req.user.id);
  if (!me) {
    return res.status(404).json({ message: "Usuario nao encontrado." });
  }

  if (!me.avatarPath) {
    return res.status(204).end();
  }

  await clearUserAvatar(req.user.id);
  await Promise.all(resolveStoredAvatarPath(me.avatarPath).map((candidate) => fs.unlink(candidate).catch(() => undefined)));
  return res.status(204).end();
});

router.use(authorizeRoles(UserRole.ADMIN));

router.get("/", async (_req, res) => {
  try {
    const items = await listUsers();
    return res.json(items.map((item) => mapUser(item)));
  } catch {
    return res.status(500).json({ message: "Erro interno ao listar usuarios." });
  }
});

router.post("/", async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const created = await createUser(parsed.data);
    return res.status(201).json(mapUser(created));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "Email ja cadastrado." });
    }
    return res.status(500).json({ message: "Erro interno ao criar usuario." });
  }
});

router.post("/seed-demo", async (_req, res) => {
  try {
    const result = await seedDemoInstrumentos();
    return res.json({
      message: "Dados demo carregados com sucesso.",
      instrumentos: result.instrumentos,
      repasses: result.repasses
    });
  } catch {
    return res.status(500).json({ message: "Erro interno ao carregar dados demo." });
  }
});

router.put("/:id", async (req, res) => {
  const idParam = userIdParamSchema.safeParse(req.params);
  if (!idParam.success) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const existing = await getUserById(idParam.data.id);
    if (!existing) {
      return res.status(404).json({ message: "Usuario nao encontrado." });
    }

    const updated = await updateUser(idParam.data.id, parsed.data);
    return res.json(mapUser(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "Email ja cadastrado." });
    }
    return res.status(500).json({ message: "Erro interno ao atualizar usuario." });
  }
});

export { router as usuariosRouter };
