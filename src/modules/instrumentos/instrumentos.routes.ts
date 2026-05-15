import { AuditAction, Prisma, UserRole } from "@prisma/client";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { Request, Router } from "express";
import multer from "multer";
import path from "path";

import { authenticate, authorizeRoles } from "../../middlewares/auth";

import { mapInstrument } from "./instrumentos.mapper";
import {
  alertQuerySchema,
  checklistExternalFileIdParamSchema,
  checklistExternalLinkCreateSchema,
  checklistItemCreateSchema,
  checklistItemIdParamSchema,
  stageParamSchema,
  stageFollowUpCreateSchema,
  stageFollowUpUpdateSchema,
  stageFollowUpFileIdParamSchema,
  stageFollowUpIdParamSchema,
  measurementCreateSchema,
  measurementIdParamSchema,
  checklistItemUpdateSchema,
  createInstrumentSchema,
  listQuerySchema,
  workProgressUpdateSchema,
  updateInstrumentSchema
} from "./instrumentos.schema";
import {
  createAuditLog,
  diffChangedFields,
  type AuditSnapshot
} from "../auditoria/auditoria.service";
import {
  createMeasurementBulletin,
  createInstrument,
  createChecklistItem,
  createChecklistExternalLink,
  deactivateChecklistExternalLink,
  deleteChecklistItem,
  deleteMeasurementBulletin,
  getChecklistExternalFileById,
  getChecklistItemById,
  getChecklistSummary,
  deactivateInstrument,
  getDeadlineAlerts,
  getInstrumentById,
  getStageFollowUpFileById,
  getWorkProgress,
  listRepasses,
  syncInstrumentRepassesFromDesembolsos,
  listChecklistExternalFiles,
  listStageFollowUps,
  listChecklistItems,
  listInstruments,
  syncAllExistingWorkflowChecklists,
  createStageFollowUp,
  deleteStageFollowUp,
  getStageFollowUpById,
  clearChecklistItemUpload,
  updateStageFollowUp,
  updateChecklistItem,
  updateChecklistItemUpload,
  updateWorkProgress,
  updateInstrument
} from "./instrumentos.service";

const router = Router();

const normalizeProponenteAlias = <T extends Record<string, unknown>>(payload: T) => {
  const next = { ...payload } as Record<string, unknown>;
  const conveneteId = next.convenete_id;
  const proponenteId = next.proponente_id;

  if ((conveneteId === undefined || conveneteId === null || conveneteId === "") && proponenteId !== undefined) {
    next.convenete_id = proponenteId;
  }

  return next as T;
};

const uploadRootPath = path.resolve(process.cwd(), "uploads", "instrumentos");
const stageFollowUpUploadRootPath = path.join(uploadRootPath, "stage-followups");
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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedUploadMimes.has(file.mimetype)) {
      cb(new Error("Formato de arquivo nao permitido. Use PDF, DOC, DOCX, XLS, XLSX, CSV, JPG ou PNG."));
      return;
    }
    cb(null, true);
  }
});

router.use(authenticate);

const parseDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }
  return new Date(`${value}T00:00:00.000Z`);
};

const validateDateRules = (payload: {
  vigencia_inicio?: string | null;
  vigencia_fim?: string | null;
  data_assinatura?: string | null;
}) => {
  const vigenciaInicio = parseDate(payload.vigencia_inicio ?? null);
  const vigenciaFim = parseDate(payload.vigencia_fim ?? null);
  const dataAssinatura = parseDate(payload.data_assinatura ?? null);

  if (vigenciaInicio && vigenciaFim && vigenciaFim < vigenciaInicio) {
    return {
      ok: false,
      message: "vigencia_fim deve ser maior ou igual a vigencia_inicio"
    };
  }

  if (dataAssinatura) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dataAssinatura > today) {
      return {
        ok: false,
        message: "data_assinatura nao pode ser futura"
      };
    }
  }

  return { ok: true };
};

type InstrumentSnapshotLike = {
  proposta: string;
  instrumento: string;
  objeto: string;
  valorRepasse: { toString(): string } | number;
  valorContrapartida: { toString(): string } | number;
  dataCadastro: Date;
  dataAssinatura: Date | null;
  vigenciaInicio: Date;
  vigenciaFim: Date;
  dataPrestacaoContas: Date | null;
  dataDou: Date | null;
  concedente: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  fluxoTipo: string;
  conveneteId: number | null;
  status: string;
  responsavel: string | null;
  orgaoExecutor: string | null;
  empresaVencedora?: string | null;
  cnpjVencedora?: string | null;
  valorVencedor?: Prisma.Decimal | number | null;
  observacoes: string | null;
  ativo: boolean;
};

const snapshotInstrument = (item: InstrumentSnapshotLike | null): AuditSnapshot => {
  if (!item) {
    return {};
  }

  return {
    proposta: item.proposta,
    instrumento: item.instrumento,
    objeto: item.objeto,
    valor_repasse: Number(item.valorRepasse),
    valor_contrapartida: Number(item.valorContrapartida),
    data_cadastro: item.dataCadastro.toISOString().slice(0, 10),
    data_assinatura: item.dataAssinatura ? item.dataAssinatura.toISOString().slice(0, 10) : null,
    vigencia_inicio: item.vigenciaInicio.toISOString().slice(0, 10),
    vigencia_fim: item.vigenciaFim.toISOString().slice(0, 10),
    data_prestacao_contas: item.dataPrestacaoContas
      ? item.dataPrestacaoContas.toISOString().slice(0, 10)
      : null,
    data_dou: item.dataDou ? item.dataDou.toISOString().slice(0, 10) : null,
    concedente: item.concedente,
    banco: item.banco,
    agencia: item.agencia,
    conta: item.conta,
    fluxo_tipo: item.fluxoTipo,
    convenete_id: item.conveneteId,
    status: item.status,
    responsavel: item.responsavel,
    orgao_executor: item.orgaoExecutor,
    empresa_vencedora: item.empresaVencedora ?? null,
    cnpj_vencedora: item.cnpjVencedora ?? null,
    valor_vencedor: item.valorVencedor !== null ? Number(item.valorVencedor) : null,
    observacoes: item.observacoes,
    ativo: item.ativo
  };
};

const mapChecklistItem = (instrumentId: number, item: any) => {
  if (!item) {
    return null;
  }

  const activeExternalLink = (item.externalLinks ?? []).find((link: any) => link.ativo) ?? null;
  const externalFiles = (item.externalLinks ?? [])
    .flatMap((link: any) =>
      (link.files ?? []).map((file: any) => ({
        ...file,
        linkAtivo: link.ativo,
        linkExpiraEm: link.expiraEm,
        linkCreatedAt: link.createdAt
      }))
    )
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
        new Date(b.linkCreatedAt).getTime() - new Date(a.linkCreatedAt).getTime()
    );

  const statusLabel =
    item.etapa === "PROPOSTA"
      ? item.status === "ACEITO" || item.status === "CONCLUIDO"
        ? "Aprovado"
        : item.status === "EM_ELABORACAO"
          ? "Ajustar"
          : "Em analise"
      : item.status === "NAO_INICIADO"
        ? "Em analise"
        : item.status === "EM_ELABORACAO"
          ? "Em elaboracao"
          : item.status === "CONCLUIDO"
            ? "Concluido"
            : "Aceito";

  return {
    id: item.id,
    etapa: item.etapa,
    status: item.status,
    status_label: statusLabel,
    nome_documento: item.nomeDocumento,
    obrigatorio: item.obrigatorio,
    concluido: item.concluido,
    observacao: item.observacao,
    ordem: item.ordem,
    arquivo:
      item.arquivoPath && item.arquivoNomeOriginal
        ? {
            nome_original: normalizeUploadedFileName(item.arquivoNomeOriginal),
            mime_type: item.arquivoMimeType,
            tamanho: item.arquivoTamanho,
            uploaded_at: item.uploadedAt?.toISOString() ?? null,
            download_path: `/api/v1/instrumentos/${instrumentId}/checklist/${item.id}/download`
          }
        : null,
    solicitacao_externa: activeExternalLink
      ? {
          token: activeExternalLink.token,
          ativo: activeExternalLink.ativo,
          expira_em: activeExternalLink.expiraEm.toISOString(),
          link_publico: `/api/v1/public/checklist-links/${activeExternalLink.token}`,
          arquivos_recebidos: externalFiles.length
        }
      : null,
    anexos_externos: externalFiles.map((file: any) => ({
      id: file.id,
      nome_remetente: file.nomeRemetente,
      nome_original: normalizeUploadedFileName(file.arquivoNomeOriginal),
      mime_type: file.arquivoMimeType,
      tamanho: file.arquivoTamanho,
      created_at: file.createdAt.toISOString(),
      origem_link_ativo: Boolean(file.linkAtivo),
      origem_link_expira_em: file.linkExpiraEm ? new Date(file.linkExpiraEm).toISOString() : null,
      download_path: `/api/v1/instrumentos/${instrumentId}/checklist/${item.id}/external-files/${file.id}/download`
    })),
    created_at: item.createdAt.toISOString(),
    updated_at: item.updatedAt.toISOString()
  };
};

const buildAbsoluteUrl = (req: Request, pathValue: string) => {
  const host = req.get("host") ?? `localhost:${req.socket.localPort ?? 3000}`;
  return `${req.protocol}://${host}${pathValue}`;
};

const normalizeUploadedFileName = (name: string) => {
  const trimmed = (name || "").trim();
  if (trimmed.length === 0) {
    return "arquivo";
  }

  const looksLikeMojibake = /[ÃÂ]|\uFFFD/.test(trimmed);
  if (!looksLikeMojibake) {
    return trimmed;
  }

  try {
    const decoded = Buffer.from(trimmed, "latin1").toString("utf8").trim();
    if (!decoded || decoded.includes("\uFFFD")) {
      return trimmed;
    }
    return decoded;
  } catch {
    return trimmed;
  }
};

const mapStageFollowUp = (
  instrumentId: number,
  stage: string,
  item: Awaited<ReturnType<typeof createStageFollowUp>>
) => {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    etapa: item.etapa,
    texto: item.texto,
    user: {
      id: item.user?.id ?? item.userId ?? null,
      nome: item.user?.nome ?? null,
      email: item.user?.email ?? item.userEmail,
      avatar_url:
        item.user?.avatarPath && item.user?.updatedAt
          ? `/api/v1/usuarios/avatar/${item.user.id}?v=${item.user.updatedAt.getTime()}`
          : null
    },
    arquivos: item.files.map((file: any) => ({
      id: file.id,
      nome_original: normalizeUploadedFileName(file.arquivoNomeOriginal),
      mime_type: file.arquivoMimeType,
      tamanho: file.arquivoTamanho,
      created_at: file.createdAt.toISOString(),
      download_path: `/api/v1/instrumentos/${instrumentId}/stages/${stage}/follow-ups/${item.id}/files/${file.id}/download`
    })),
    created_at: item.createdAt.toISOString(),
    updated_at: item.updatedAt.toISOString()
  };
};

const isStageFollowUpAuthor = (
  followUp: { userId?: number | null; userEmail?: string | null },
  authUser: { id: number; email: string }
) => {
  if (followUp.userId !== null && followUp.userId !== undefined) {
    return followUp.userId === authUser.id;
  }

  const followUpEmail = (followUp.userEmail ?? "").trim().toLowerCase();
  return followUpEmail !== "" && followUpEmail === authUser.email.trim().toLowerCase();
};

router.post("/", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  const parsed = createInstrumentSchema.safeParse(normalizeProponenteAlias(req.body as Record<string, unknown>));
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  const dateRules = validateDateRules(parsed.data);
  if (!dateRules.ok) {
    return res.status(422).json({ message: dateRules.message });
  }

  try {
    const created = await createInstrument(parsed.data, req.user ?? undefined);
    if (req.user) {
      const afterData = snapshotInstrument(created);
      await createAuditLog({
        instrumentId: created.id,
        userId: req.user.id,
        userEmail: req.user.email,
        action: AuditAction.CREATE,
        afterData,
        changedFields: Object.keys(afterData)
      });
    }
    return res.status(201).json(mapInstrument(created));
  } catch (error) {
    if (error instanceof Error && error.message === "INSTRUMENT_PROPOSTA_ALREADY_EXISTS") {
      return res.status(409).json({ message: "Proposta ja cadastrada." });
    }
    if (error instanceof Error && error.message === "INSTRUMENT_CODIGO_ALREADY_EXISTS") {
      return res.status(409).json({ message: "Instrumento ja cadastrado." });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return res.status(409).json({ message: "Proposta ou instrumento ja cadastrados." });
      }
      if (error.code === "P2003") {
        return res.status(422).json({ message: "Proponente informado nao encontrado." });
      }
      if (error.code === "P2025") {
        return res.status(422).json({ message: "Proponente informado nao encontrado." });
      }
    }
    return res.status(500).json({ message: "Erro interno ao criar registro." });
  }
});

router.get("/", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), async (req, res) => {
  const parsed = listQuerySchema.safeParse(normalizeProponenteAlias(req.query as Record<string, unknown>));
  if (!parsed.success) {
    return res.status(422).json({
      message: "Filtros invalidos",
      issues: parsed.error.flatten()
    });
  }

  try {
    const items = await listInstruments(parsed.data, req.user ?? undefined);
    return res.json(items.map(mapInstrument));
  } catch (error) {
    if (parsed.data.sync_repasses_desembolsos) {
      try {
        const fallbackItems = await listInstruments({
          ...parsed.data,
          sync_repasses_desembolsos: false
        }, req.user ?? undefined);
        return res.json(fallbackItems.map(mapInstrument));
      } catch {
        // segue para erro 500 abaixo
      }
    }

    console.error("[instrumentos] falha ao listar com sync de desembolsos", error);
    return res.status(500).json({ message: "Erro interno ao listar instrumentos." });
  }
});

router.get(
  "/alerts/deadlines",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
  const parsed = alertQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Parametros invalidos",
      issues: parsed.error.flatten()
    });
  }

  try {
    const alerts = await getDeadlineAlerts(parsed.data.limite_dias, req.user ?? undefined);
    return res.json(alerts);
  } catch {
    return res.status(500).json({ message: "Erro interno ao listar alertas." });
  }
  }
);

router.get("/:id", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  try {
    const item = await getInstrumentById(id, req.user ?? undefined);
    if (!item) {
      return res.status(404).json({ message: "Registro nao encontrado." });
    }

    return res.json(mapInstrument(item));
  } catch {
    return res.status(500).json({ message: "Erro interno ao consultar registro." });
  }
});

router.get("/:id/repasses", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const existing = await getInstrumentById(id, req.user ?? undefined);
  if (!existing) {
    return res.status(404).json({ message: "Registro nao encontrado." });
  }

  await syncInstrumentRepassesFromDesembolsos(id);
  const repasses = await listRepasses(id);
  return res.json({
    itens: repasses.map((repasse: any) => ({
      id: repasse.id,
      data_repasse: repasse.dataRepasse.toISOString().slice(0, 10),
      valor_repasse: Number(repasse.valorRepasse),
      created_at: repasse.createdAt.toISOString(),
      updated_at: repasse.updatedAt.toISOString()
    }))
  });
});

router.post("/:id/repasses", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (_req, res) => {
  return res.status(410).json({
    message: "Cadastro manual de repasse desativado. A lista e sincronizada automaticamente pelos desembolsos."
  });
});

router.delete("/:id/repasses/:repasseId", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (_req, res) => {
  return res.status(410).json({
    message: "Remocao manual de repasse desativada. A lista e sincronizada automaticamente pelos desembolsos."
  });
});

router.get(
  "/:id/checklist",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const existing = await getInstrumentById(id, req.user ?? undefined);
    if (!existing) {
      return res.status(404).json({ message: "Registro nao encontrado." });
    }

    const [items, summary] = await Promise.all([listChecklistItems(id), getChecklistSummary(id)]);
    return res.json({
      resumo: summary,
      itens: items.map((item: Awaited<ReturnType<typeof getChecklistItemById>>) => mapChecklistItem(id, item))
    });
  }
);

router.post(
  "/:id/checklist/:itemId/external-link",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const itemParam = checklistItemIdParamSchema.safeParse(req.params);
    if (!itemParam.success) {
      return res.status(400).json({ message: "Item invalido." });
    }

    const parsedBody = checklistExternalLinkCreateSchema.safeParse(req.body ?? {});
    if (!parsedBody.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsedBody.error.flatten()
      });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Usuario nao autenticado." });
    }

    try {
      const created = await createChecklistExternalLink(id, itemParam.data.itemId, {
        token: randomUUID(),
        validadeDias: parsedBody.data.validade_dias,
        createdByUserId: req.user.id,
        createdByEmail: req.user.email
      });

      const publicPath = `/api/v1/public/checklist-links/${created.token}`;
      return res.status(201).json({
        token: created.token,
        ativo: created.ativo,
        expira_em: created.expiraEm.toISOString(),
        validade_dias: parsedBody.data.validade_dias,
        link_publico: buildAbsoluteUrl(req, publicPath)
      });
    } catch (error) {
      if (error instanceof Error && error.message === "CHECKLIST_ITEM_NOT_FOUND") {
        return res.status(404).json({ message: "Item de checklist nao encontrado." });
      }
      return res.status(500).json({ message: "Erro interno ao gerar link externo." });
    }
  }
);

router.delete(
  "/:id/checklist/:itemId/external-link",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const itemParam = checklistItemIdParamSchema.safeParse(req.params);
    if (!itemParam.success) {
      return res.status(400).json({ message: "Item invalido." });
    }

    try {
      const result = await deactivateChecklistExternalLink(id, itemParam.data.itemId);
      return res.json({
        message: result.desativados > 0 ? "Link externo desativado." : "Nenhum link externo ativo para desativar.",
        desativados: result.desativados
      });
    } catch (error) {
      if (error instanceof Error && error.message === "CHECKLIST_ITEM_NOT_FOUND") {
        return res.status(404).json({ message: "Item de checklist nao encontrado." });
      }
      return res.status(500).json({ message: "Erro interno ao desativar link externo." });
    }
  }
);

router.get(
  "/:id/checklist/:itemId/external-files",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const itemParam = checklistItemIdParamSchema.safeParse(req.params);
    if (!itemParam.success) {
      return res.status(400).json({ message: "Item invalido." });
    }

    const item = await getChecklistItemById(id, itemParam.data.itemId, req.user ?? undefined);
    if (!item) {
      return res.status(404).json({ message: "Item de checklist nao encontrado." });
    }

    const files = await listChecklistExternalFiles(id, itemParam.data.itemId);
    return res.json({
      itens: files.map((file: any) => ({
        id: file.id,
        nome_remetente: file.nomeRemetente,
        nome_original: normalizeUploadedFileName(file.arquivoNomeOriginal),
        mime_type: file.arquivoMimeType,
        tamanho: file.arquivoTamanho,
        created_at: file.createdAt.toISOString(),
        link_token: file.externalLink.token,
        link_ativo: file.externalLink.ativo,
        link_expira_em: file.externalLink.expiraEm.toISOString(),
        download_path: `/api/v1/instrumentos/${id}/checklist/${itemParam.data.itemId}/external-files/${file.id}/download`
      }))
    });
  }
);

router.get(
  "/:id/checklist/:itemId/external-files/:fileId/download",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const itemParam = checklistItemIdParamSchema.safeParse(req.params);
    if (!itemParam.success) {
      return res.status(400).json({ message: "Item invalido." });
    }

    const fileParam = checklistExternalFileIdParamSchema.safeParse(req.params);
    if (!fileParam.success) {
      return res.status(400).json({ message: "Arquivo invalido." });
    }

    const file = await getChecklistExternalFileById(id, itemParam.data.itemId, fileParam.data.fileId);
    if (!file) {
      return res.status(404).json({ message: "Arquivo nao encontrado." });
    }

    try {
      await fs.access(file.arquivoPath);
      return res.download(file.arquivoPath, normalizeUploadedFileName(file.arquivoNomeOriginal));
    } catch {
      return res.status(404).json({ message: "Arquivo nao encontrado." });
    }
  }
);

router.get(
  "/:id/stages/:stage/follow-ups",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const stageParam = stageParamSchema.safeParse(req.params);
    if (!stageParam.success) {
      return res.status(400).json({ message: "Etapa invalida." });
    }

    const existing = await getInstrumentById(id, req.user ?? undefined);
    if (!existing) {
      return res.status(404).json({ message: "Registro nao encontrado." });
    }

    const items = await listStageFollowUps(id, stageParam.data.stage);
    return res.json({
      itens: items
        .map((item: any) => mapStageFollowUp(id, stageParam.data.stage, item))
        .filter((item: any) => item !== null)
    });
  }
);

router.post(
  "/:id/stages/:stage/follow-ups",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  upload.array("arquivos", 10),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const stageParam = stageParamSchema.safeParse(req.params);
    if (!stageParam.success) {
      return res.status(400).json({ message: "Etapa invalida." });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Usuario nao autenticado." });
    }

    const existing = await getInstrumentById(id, req.user ?? undefined);
    if (!existing) {
      return res.status(404).json({ message: "Registro nao encontrado." });
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const parsedBody = stageFollowUpCreateSchema.safeParse({ texto: req.body?.texto });
    if (!parsedBody.success && files.length === 0) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsedBody.error.flatten()
      });
    }

    if ((req.body?.texto ?? "").toString().trim().length === 0 && files.length === 0) {
      return res.status(422).json({
        message: "Informe um texto ou envie ao menos um arquivo para registrar acompanhamento."
      });
    }

    await fs.mkdir(stageFollowUpUploadRootPath, { recursive: true });

    const stagedFiles: Array<{
      arquivoPath: string;
      arquivoNomeOriginal: string;
      arquivoMimeType?: string;
      arquivoTamanho?: number;
    }> = [];

    try {
      for (const file of files) {
        const extension = path.extname(file.originalname).toLowerCase();
        const safeName = `${id}-${stageParam.data.stage}-${Date.now()}-${randomUUID()}${extension}`;
        const destination = path.join(stageFollowUpUploadRootPath, safeName);
        await fs.writeFile(destination, file.buffer);
        stagedFiles.push({
          arquivoPath: destination,
          arquivoNomeOriginal: normalizeUploadedFileName(file.originalname),
          arquivoMimeType: file.mimetype,
          arquivoTamanho: file.size
        });
      }

      const created = await createStageFollowUp(id, stageParam.data.stage, {
        texto: req.body?.texto,
        userId: req.user.id,
        userEmail: req.user.email,
        files: stagedFiles
      });

      return res.status(201).json(mapStageFollowUp(id, stageParam.data.stage, created));
    } catch (error) {
      await Promise.all(stagedFiles.map((file) => fs.unlink(file.arquivoPath).catch(() => undefined)));

      if (error instanceof Error && error.message === "STAGE_FOLLOW_UP_EMPTY") {
        return res.status(422).json({
          message: "Informe um texto ou envie ao menos um arquivo para registrar acompanhamento."
        });
      }

      return res.status(500).json({ message: "Erro interno ao registrar acompanhamento da etapa." });
    }
  }
);

router.patch(
  "/:id/stages/:stage/follow-ups/:followUpId",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const stageParam = stageParamSchema.safeParse(req.params);
    if (!stageParam.success) {
      return res.status(400).json({ message: "Etapa invalida." });
    }

    const followUpIdParam = stageFollowUpIdParamSchema.safeParse(req.params);
    if (!followUpIdParam.success) {
      return res.status(400).json({ message: "Acompanhamento invalido." });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Usuario nao autenticado." });
    }

    const parsed = stageFollowUpUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    const existing = await getStageFollowUpById(id, stageParam.data.stage, followUpIdParam.data.followUpId);
    if (!existing) {
      return res.status(404).json({ message: "Acompanhamento nao encontrado." });
    }

    if (!isStageFollowUpAuthor(existing, req.user)) {
      return res.status(403).json({ message: "Voce so pode alterar acompanhamentos de sua autoria." });
    }

    try {
      const updated = await updateStageFollowUp(id, stageParam.data.stage, followUpIdParam.data.followUpId, parsed.data);
      return res.json(mapStageFollowUp(id, stageParam.data.stage, updated));
    } catch (error) {
      if (error instanceof Error && error.message === "STAGE_FOLLOW_UP_EMPTY") {
        return res.status(422).json({
          message: "Informe um texto valido para atualizar o acompanhamento."
        });
      }
      return res.status(500).json({ message: "Erro interno ao atualizar acompanhamento da etapa." });
    }
  }
);

router.delete(
  "/:id/stages/:stage/follow-ups/:followUpId",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const stageParam = stageParamSchema.safeParse(req.params);
    if (!stageParam.success) {
      return res.status(400).json({ message: "Etapa invalida." });
    }

    const followUpIdParam = stageFollowUpIdParamSchema.safeParse(req.params);
    if (!followUpIdParam.success) {
      return res.status(400).json({ message: "Acompanhamento invalido." });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Usuario nao autenticado." });
    }

    const existing = await getStageFollowUpById(id, stageParam.data.stage, followUpIdParam.data.followUpId);
    if (!existing) {
      return res.status(404).json({ message: "Acompanhamento nao encontrado." });
    }

    if (!isStageFollowUpAuthor(existing, req.user)) {
      return res.status(403).json({ message: "Voce so pode remover acompanhamentos de sua autoria." });
    }

    try {
      const deleted = await deleteStageFollowUp(id, stageParam.data.stage, followUpIdParam.data.followUpId);
      await Promise.all(deleted.filePaths.map((filePath) => fs.unlink(filePath).catch(() => undefined)));
      return res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === "STAGE_FOLLOW_UP_NOT_FOUND") {
        return res.status(404).json({ message: "Acompanhamento nao encontrado." });
      }
      return res.status(500).json({ message: "Erro interno ao remover acompanhamento da etapa." });
    }
  }
);

router.get(
  "/:id/stages/:stage/follow-ups/:followUpId/files/:fileId/download",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const stageParam = stageParamSchema.safeParse(req.params);
    if (!stageParam.success) {
      return res.status(400).json({ message: "Etapa invalida." });
    }

    const followUpIdParam = stageFollowUpIdParamSchema.safeParse(req.params);
    if (!followUpIdParam.success) {
      return res.status(400).json({ message: "Acompanhamento invalido." });
    }

    const fileIdParam = stageFollowUpFileIdParamSchema.safeParse(req.params);
    if (!fileIdParam.success) {
      return res.status(400).json({ message: "Arquivo invalido." });
    }

    const file = await getStageFollowUpFileById(
      id,
      stageParam.data.stage,
      followUpIdParam.data.followUpId,
      fileIdParam.data.fileId
    );
    if (!file) {
      return res.status(404).json({ message: "Arquivo nao encontrado." });
    }

    try {
      await fs.access(file.arquivoPath);
      return res.download(file.arquivoPath, normalizeUploadedFileName(file.arquivoNomeOriginal));
    } catch {
      return res.status(404).json({ message: "Arquivo nao encontrado." });
    }
  }
);

router.post("/:id/checklist", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const existing = await getInstrumentById(id, req.user ?? undefined);
  if (!existing) {
    return res.status(404).json({ message: "Registro nao encontrado." });
  }

  const parsed = checklistItemCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  const created = await createChecklistItem(id, parsed.data);
  return res.status(201).json(mapChecklistItem(id, created));
});

router.patch("/:id/checklist/:itemId", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const itemParam = checklistItemIdParamSchema.safeParse(req.params);
  if (!itemParam.success) {
    return res.status(400).json({ message: "Item invalido." });
  }

  const parsed = checklistItemUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const updated = await updateChecklistItem(id, itemParam.data.itemId, parsed.data);
    return res.json(mapChecklistItem(id, updated));
  } catch (error) {
    if (error instanceof Error && error.message === "CHECKLIST_ITEM_NOT_FOUND") {
      return res.status(404).json({ message: "Item de checklist nao encontrado." });
    }
    if (error instanceof Error && error.message === "CHECKLIST_STAGE_BLOCKED") {
      return res.status(422).json({
        message: "Etapa bloqueada. Conclua os itens obrigatorios das etapas anteriores para avancar."
      });
    }
    return res.status(500).json({ message: "Erro interno ao atualizar item do checklist." });
  }
});

router.delete("/:id/checklist/:itemId", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const itemParam = checklistItemIdParamSchema.safeParse(req.params);
  if (!itemParam.success) {
    return res.status(400).json({ message: "Item invalido." });
  }

  try {
    const existing = await getChecklistItemById(id, itemParam.data.itemId, req.user ?? undefined);
    if (!existing) {
      return res.status(404).json({ message: "Item de checklist nao encontrado." });
    }

    if (existing.arquivoPath) {
      await fs.unlink(existing.arquivoPath).catch(() => undefined);
    }

    await deleteChecklistItem(id, itemParam.data.itemId);
    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: "Erro interno ao remover item do checklist." });
  }
});

router.post(
  "/:id/checklist/:itemId/upload",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  upload.single("arquivo"),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const itemParam = checklistItemIdParamSchema.safeParse(req.params);
    if (!itemParam.success) {
      return res.status(400).json({ message: "Item invalido." });
    }

    if (!req.file) {
      return res.status(422).json({ message: "Arquivo nao enviado." });
    }

    const existing = await getChecklistItemById(id, itemParam.data.itemId, req.user ?? undefined);
    if (!existing) {
      return res.status(404).json({ message: "Item de checklist nao encontrado." });
    }

    await fs.mkdir(uploadRootPath, { recursive: true });
    const extension = path.extname(req.file.originalname).toLowerCase();
    const safeName = `${id}-${itemParam.data.itemId}-${Date.now()}-${randomUUID()}${extension}`;
    const destination = path.join(uploadRootPath, safeName);

    await fs.writeFile(destination, req.file.buffer);
    if (existing.arquivoPath) {
      await fs.unlink(existing.arquivoPath).catch(() => undefined);
    }

    const updated = await updateChecklistItemUpload(id, itemParam.data.itemId, {
      arquivoPath: destination,
      arquivoNomeOriginal: normalizeUploadedFileName(req.file.originalname),
      arquivoMimeType: req.file.mimetype,
      arquivoTamanho: req.file.size
    });

    return res.json(mapChecklistItem(id, updated));
  }
);

router.delete(
  "/:id/checklist/:itemId/upload",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const itemParam = checklistItemIdParamSchema.safeParse(req.params);
    if (!itemParam.success) {
      return res.status(400).json({ message: "Item invalido." });
    }

    const existing = await getChecklistItemById(id, itemParam.data.itemId, req.user ?? undefined);
    if (!existing) {
      return res.status(404).json({ message: "Item de checklist nao encontrado." });
    }

    if (existing.arquivoPath) {
      await fs.unlink(existing.arquivoPath).catch(() => undefined);
    }

    const updated = await clearChecklistItemUpload(id, itemParam.data.itemId);
    return res.json(mapChecklistItem(id, updated));
  }
);

router.get(
  "/:id/work-progress",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const existing = await getInstrumentById(id, req.user ?? undefined);
    if (!existing) {
      return res.status(404).json({ message: "Registro nao encontrado." });
    }

    const progress = await getWorkProgress(id);
    return res.json(progress);
  }
);

router.put("/:id/work-progress", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const existing = await getInstrumentById(id, req.user ?? undefined);
  if (!existing) {
    return res.status(404).json({ message: "Registro nao encontrado." });
  }

  const parsed = workProgressUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  const updated = await updateWorkProgress(id, parsed.data);
  return res.json(updated);
});

router.post("/:id/work-progress/sync-transferegov", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const instrument = await getInstrumentById(id, req.user ?? undefined);
  if (!instrument) {
    return res.status(404).json({ message: "Registro nao encontrado." });
  }

  try {
    const { sincronizarDadosMedicao } = await import("../transferegov/medicao.service");
    const updated = await sincronizarDadosMedicao(instrument.proposta);
    return res.json(updated);
  } catch (error: any) {
    console.error(`[instrumentos] erro ao sincronizar transferegov para ${id}:`, error);
    return res.status(500).json({ 
      message: "Falha ao sincronizar com Transferegov.",
      error: error.message 
    });
  }
});

router.post("/:id/work-progress/boletins", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const existing = await getInstrumentById(id, req.user ?? undefined);
  if (!existing) {
    return res.status(404).json({ message: "Registro nao encontrado." });
  }

  const parsed = measurementCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  const created = await createMeasurementBulletin(id, parsed.data);
  return res.status(201).json(created);
});

router.delete(
  "/:id/work-progress/boletins/:boletimId",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const parsed = measurementIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ message: "Boletim invalido." });
    }

    try {
      await deleteMeasurementBulletin(id, parsed.data.boletimId);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === "MEASUREMENT_NOT_FOUND") {
        return res.status(404).json({ message: "Boletim nao encontrado." });
      }
      return res.status(500).json({ message: "Erro interno ao remover boletim." });
    }
  }
);

router.get(
  "/:id/checklist/:itemId/download",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const itemParam = checklistItemIdParamSchema.safeParse(req.params);
    if (!itemParam.success) {
      return res.status(400).json({ message: "Item invalido." });
    }

    const item = await getChecklistItemById(id, itemParam.data.itemId, req.user ?? undefined);
    if (!item || !item.arquivoPath || !item.arquivoNomeOriginal) {
      return res.status(404).json({ message: "Arquivo nao encontrado." });
    }

    try {
      await fs.access(item.arquivoPath);
      return res.download(item.arquivoPath, normalizeUploadedFileName(item.arquivoNomeOriginal));
    } catch {
      return res.status(404).json({ message: "Arquivo nao encontrado." });
    }
  }
);

router.post(
  "/checklist/sync-existing",
  authorizeRoles(UserRole.ADMIN),
  async (_req, res) => {
    try {
      const result = await syncAllExistingWorkflowChecklists();
      return res.json({
        message: "Checklist sincronizado para instrumentos existentes.",
        ...result
      });
    } catch {
      return res.status(500).json({ message: "Erro interno ao sincronizar checklist existente." });
    }
  }
);

router.put("/:id", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const parsed = updateInstrumentSchema.safeParse(normalizeProponenteAlias(req.body as Record<string, unknown>));
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const existing = await getInstrumentById(id, req.user ?? undefined);
    if (!existing) {
      return res.status(404).json({ message: "Registro nao encontrado." });
    }

    const mergedDates = {
      vigencia_inicio: parsed.data.vigencia_inicio ?? existing.vigenciaInicio.toISOString().slice(0, 10),
      vigencia_fim: parsed.data.vigencia_fim ?? existing.vigenciaFim.toISOString().slice(0, 10),
      data_assinatura:
        parsed.data.data_assinatura ??
        (existing.dataAssinatura ? existing.dataAssinatura.toISOString().slice(0, 10) : null)
    };

    const dateRules = validateDateRules(mergedDates);
    if (!dateRules.ok) {
      return res.status(422).json({ message: dateRules.message });
    }

    const nextStatus = parsed.data.status ?? existing.status;
    const isEnteringExecution = nextStatus === "EM_EXECUCAO" && existing.status !== "EM_EXECUCAO";

    if (isEnteringExecution) {
      const checklistSummary = await getChecklistSummary(id);
      if (!checklistSummary.pode_iniciar_execucao) {
        return res.status(422).json({
          message:
            checklistSummary.obrigatorios === 0
              ? "Checklist de celebracao ainda nao foi configurado."
              : `Checklist pendente: ${checklistSummary.pendentes_obrigatorios.join(", ")}`
        });
      }
    }

    const beforeData = snapshotInstrument(existing);
    const updated = await updateInstrument(id, parsed.data);
    if (req.user) {
      const afterData = snapshotInstrument(updated);
      await createAuditLog({
        instrumentId: id,
        userId: req.user.id,
        userEmail: req.user.email,
        action: AuditAction.UPDATE,
        beforeData,
        afterData,
        changedFields: diffChangedFields(beforeData, afterData)
      });
    }
    return res.json(mapInstrument(updated));
  } catch (error) {
    if (error instanceof Error && error.message === "INSTRUMENT_PROPOSTA_ALREADY_EXISTS") {
      return res.status(409).json({ message: "Proposta ja cadastrada." });
    }
    if (error instanceof Error && error.message === "INSTRUMENT_CODIGO_ALREADY_EXISTS") {
      return res.status(409).json({ message: "Instrumento ja cadastrado." });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return res.status(409).json({ message: "Proposta ou instrumento ja cadastrados." });
      }
      if (error.code === "P2025") {
        return res.status(404).json({ message: "Registro nao encontrado." });
      }
      if (error.code === "P2003") {
        return res.status(422).json({ message: "Proponente informado nao encontrado." });
      }
    }
    return res.status(500).json({ message: "Erro interno ao atualizar registro." });
  }
});

router.delete("/:id", authorizeRoles(UserRole.ADMIN), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  try {
    const existing = await getInstrumentById(id, req.user ?? undefined);
    if (!existing) {
      return res.status(404).json({ message: "Registro nao encontrado." });
    }

    const beforeData = snapshotInstrument(existing);
    const updated = await deactivateInstrument(id);

    if (req.user) {
      const afterData = snapshotInstrument(updated);
      await createAuditLog({
        instrumentId: id,
        userId: req.user.id,
        userEmail: req.user.email,
        action: AuditAction.DEACTIVATE,
        beforeData,
        afterData,
        changedFields: diffChangedFields(beforeData, afterData)
      });
    }

    return res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({ message: "Registro nao encontrado." });
    }
    return res.status(500).json({ message: "Erro interno ao excluir registro." });
  }
});

export { router as instrumentosRouter };



