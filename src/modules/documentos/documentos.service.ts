import {
  DocumentoScanStatus,
  DocumentoAuditAction,
  DocumentoAreaOrigem,
  DocumentoAreaStatus,
  DocumentoExternalRequestStatus,
  DocumentoSearchStatus,
  Prisma
} from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { google } from "googleapis";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import {
  createAreaQuarantineObjectKey,
  deleteDocumentObject,
  getDocumentObjectBuffer,
  putDocumentObject
} from "../../lib/storage/r2-storage";
import {
  buildSnippet,
  extractDocumentoText,
  normalizeFileName,
  onlyCpfDigits,
  validateDocumentoFileIntegrity
} from "./documentos.util";
import { syncDocumentoKnowledgeByIds } from "../assistente/assistente-documentos-sync.service";
import { buildGmailSendFailureMessage } from "../email/gmail-health.service";
import {
  CreateExternalRequestInput,
  ListDocumentoAuditQueryInput,
  ListDocumentosQueryInput,
  SearchDocumentosQueryInput,
  UpdateExternalRequestInput,
  UpdateDocumentoInput
} from "./documentos.schema";

type AuthUser = {
  id: number;
  email: string;
  role?: string;
};

type UploadFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

const MB = 1024 * 1024;

export const documentoUploadLimits = {
  maxFiles: Math.max(1, env.documentosMaxFilesPerBatch),
  maxFileSize: Math.max(1, env.documentosMaxFileSizeMb) * MB,
  maxBatchSize: Math.max(1, env.documentosMaxBatchSizeMb) * MB
};

const selectDocumentoInclude = {
  uploadedByUser: { select: { id: true, nome: true, email: true } },
  instrument: { select: { id: true, proposta: true, instrumento: true } },
  convenete: { select: { id: true, nome: true, cnpj: true } },
  searchIndex: { select: { status: true, erro: true } },
  externalRequest: { select: { id: true, token: true, titulo: true, status: true } }
} satisfies Prisma.DocumentoAreaInclude;

const toIso = (value: Date | string | null | undefined) => (value ? new Date(value).toISOString() : null);

const mapDocumento = (doc: Prisma.DocumentoAreaGetPayload<{ include: typeof selectDocumentoInclude }>) => ({
  id: doc.id,
  nome_original: doc.nomeOriginal,
  nome_atual: doc.nomeAtual,
  mime_type: doc.mimeType,
  tamanho: Number(doc.tamanho),
  origem: doc.origem,
  status: doc.status,
  scan_status: doc.scanStatus,
  scan_provider: doc.scanProvider,
  scan_result: doc.scanResult,
  scanned_at: toIso(doc.scannedAt),
  instrumento: doc.instrument
    ? { id: doc.instrument.id, proposta: doc.instrument.proposta, instrumento: doc.instrument.instrumento }
    : null,
  proponente: doc.convenete ? { id: doc.convenete.id, nome: doc.convenete.nome, cnpj: doc.convenete.cnpj } : null,
  usuario: doc.uploadedByUser
    ? { id: doc.uploadedByUser.id, nome: doc.uploadedByUser.nome, email: doc.uploadedByUser.email }
    : { id: null, nome: null, email: doc.uploadedByEmail },
  remetente_externo:
    doc.externalSenderNome && doc.externalSenderCpf
      ? { nome: doc.externalSenderNome, cpf: doc.externalSenderCpf }
      : null,
  indexacao: doc.searchIndex ? { status: doc.searchIndex.status, erro: doc.searchIndex.erro } : null,
  solicitacao_externa: doc.externalRequest
    ? {
        id: doc.externalRequest.id,
        token: doc.externalRequest.token,
        titulo: doc.externalRequest.titulo,
        status: doc.externalRequest.status
      }
    : null,
  download_path: doc.status === DocumentoAreaStatus.ATIVO ? `/api/v1/documentos/${doc.id}/download` : null,
  created_at: doc.createdAt.toISOString(),
  updated_at: doc.updatedAt.toISOString()
});

export type DocumentoItem = ReturnType<typeof mapDocumento>;

const createDocumentoAuditLog = async (
  tx: Prisma.TransactionClient,
  input: {
    documentoId?: number | null;
    user?: AuthUser | null;
    userEmail?: string;
    userNome?: string | null;
    action: DocumentoAuditAction;
    arquivoNome: string;
    ip?: string | null;
    detalhes?: Prisma.InputJsonValue;
  }
) => {
  let userNome = input.userNome ?? null;
  if (!userNome && input.user?.id) {
    const user = await tx.user.findUnique({ where: { id: input.user.id }, select: { nome: true } });
    userNome = user?.nome ?? null;
  }

  return tx.documentoAuditLog.create({
    data: {
      documentoId: input.documentoId ?? null,
      userId: input.user?.id ?? null,
      userEmail: input.user?.email ?? input.userEmail ?? "sistema@local",
      userNome,
      action: input.action,
      arquivoNome: input.arquivoNome,
      ip: input.ip ?? null,
      detalhes: input.detalhes ?? Prisma.JsonNull
    }
  });
};

const indexDocumentoText = async (documentoId: number, file: UploadFile) => {
  await prisma.documentoSearchIndex.update({
    where: { documentoId },
    data: { status: DocumentoSearchStatus.PROCESSANDO, erro: null }
  });

  try {
    const text = await extractDocumentoText(file);
    await prisma.documentoSearchIndex.update({
      where: { documentoId },
      data: {
        textoExtraido: text,
        status: DocumentoSearchStatus.INDEXADO,
        erro: null
      }
    });
  } catch (error) {
    await prisma.documentoSearchIndex.update({
      where: { documentoId },
      data: {
        status: DocumentoSearchStatus.ERRO,
        erro: error instanceof Error ? error.message.slice(0, 500) : "Falha ao indexar documento."
      }
    });
  }
};

const assertOptionalRelationsExist = async (instrumentId?: number | null, conveneteId?: number | null) => {
  if (instrumentId) {
    const exists = await prisma.instrumentProposal.count({ where: { id: instrumentId } });
    if (!exists) {
      throw new Error("INSTRUMENT_NOT_FOUND");
    }
  }

  if (conveneteId) {
    const exists = await prisma.convenete.count({ where: { id: conveneteId } });
    if (!exists) {
      throw new Error("CONVENETE_NOT_FOUND");
    }
  }
};

export const createDocumentosFromFiles = async (input: {
  files: UploadFile[];
  user?: AuthUser | null;
  instrumentId?: number;
  conveneteId?: number;
  origem?: DocumentoAreaOrigem;
  externalRequestId?: number;
  externalSubmissionId?: number;
  externalSenderNome?: string;
  externalSenderCpf?: string;
  ip?: string | null;
}) => {
  if (input.files.length === 0) {
    throw new Error("NO_FILES");
  }
  if (input.files.length > documentoUploadLimits.maxFiles) {
    throw new Error("TOO_MANY_FILES");
  }

  const batchSize = input.files.reduce((total, file) => total + file.size, 0);
  if (batchSize > documentoUploadLimits.maxBatchSize) {
    throw new Error("BATCH_TOO_LARGE");
  }

  await assertOptionalRelationsExist(input.instrumentId, input.conveneteId);

  const stagedKeys: string[] = [];
  const created: DocumentoItem[] = [];
  const syncedDocumentoIds: number[] = [];

  try {
    for (const file of input.files) {
      const mimeType = validateDocumentoFileIntegrity(file);
      const hashSha256 = createHash("sha256").update(file.buffer).digest("hex");
      const nomeOriginal = normalizeFileName(file.originalname);
      const quarantineKey = createAreaQuarantineObjectKey(nomeOriginal);
      await putDocumentObject({ key: quarantineKey, buffer: file.buffer, contentType: mimeType });
      stagedKeys.push(quarantineKey);

      const doc = await prisma.$transaction(async (tx) => {
        const saved = await tx.documentoArea.create({
          data: {
            nomeOriginal,
            nomeAtual: nomeOriginal,
            arquivoPath: quarantineKey,
            mimeType,
            tamanho: BigInt(file.size),
            origem: input.origem ?? DocumentoAreaOrigem.INTERNO,
            instrumentId: input.instrumentId,
            conveneteId: input.conveneteId,
            uploadedByUserId: input.user?.id ?? null,
            uploadedByEmail: input.user?.email ?? input.externalSenderCpf ?? "envio-externo@local",
            externalRequestId: input.externalRequestId,
            externalSubmissionId: input.externalSubmissionId,
            externalSenderNome: input.externalSenderNome,
            externalSenderCpf: input.externalSenderCpf,
            scanStatus: DocumentoScanStatus.PENDENTE,
            scanProvider: "PENDENTE",
            scanResult: "Aguardando varredura antivirus",
            quarantinePath: quarantineKey,
            searchIndex: {
              create: {
                status: DocumentoSearchStatus.PENDENTE
              }
            }
          },
          include: selectDocumentoInclude
        });

        await createDocumentoAuditLog(tx, {
          documentoId: saved.id,
          user: input.user,
          userEmail: input.user?.email ?? input.externalSenderCpf ?? "envio-externo@local",
          userNome: input.externalSenderNome,
          action: input.origem === DocumentoAreaOrigem.EXTERNO ? DocumentoAuditAction.ENVIO_EXTERNO : DocumentoAuditAction.UPLOAD,
          arquivoNome: saved.nomeAtual,
          ip: input.ip,
          detalhes: {
            nome_original: saved.nomeOriginal,
            tamanho: Number(saved.tamanho),
            mime_type: saved.mimeType,
            hash_sha256: hashSha256,
            origem: saved.origem,
            scan_status: DocumentoScanStatus.PENDENTE,
            quarantine_path: quarantineKey,
            remetente_externo: input.externalSenderNome
              ? { nome: input.externalSenderNome, cpf: input.externalSenderCpf }
              : undefined
          }
        });

        await createDocumentoAuditLog(tx, {
          documentoId: saved.id,
          user: input.user,
          userEmail: input.user?.email ?? input.externalSenderCpf ?? "envio-externo@local",
          userNome: input.externalSenderNome,
          action: DocumentoAuditAction.SCAN_INICIADO,
          arquivoNome: saved.nomeAtual,
          ip: input.ip,
          detalhes: {
            provider: "PENDENTE",
            status: DocumentoScanStatus.PENDENTE,
            mensagem: "Documento recebido em quarentena aguardando varredura antivirus."
          }
        });

        return saved;
      });

      await indexDocumentoText(doc.id, file);
      const refreshed = await prisma.documentoArea.findUniqueOrThrow({
        where: { id: doc.id },
        include: selectDocumentoInclude
      });
      created.push(mapDocumento(refreshed));
      syncedDocumentoIds.push(doc.id);
    }
  } catch (error) {
    await Promise.all(stagedKeys.map((key) => deleteDocumentObject(key).catch(() => undefined)));
    throw error;
  }

  if (syncedDocumentoIds.length > 0) {
    try {
      await syncDocumentoKnowledgeByIds(syncedDocumentoIds);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        "[documentos] Falha ao sincronizar documentos no Assistente 360:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return created;
};

const parseDateStart = (value?: string) => {
  if (!value) {
    return undefined;
  }
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
};

const parseDateEnd = (value?: string) => {
  if (!value) {
    return undefined;
  }
  return new Date(`${value.slice(0, 10)}T23:59:59.999Z`);
};

export const listDocumentos = async (query: ListDocumentosQueryInput) => {
  const where: Prisma.DocumentoAreaWhereInput = {
    status: query.status ?? DocumentoAreaStatus.ATIVO,
    instrumentId: query.instrumento_id,
    conveneteId: query.proponente_id,
    uploadedByUserId: query.usuario_id,
    createdAt: {
      gte: parseDateStart(query.data_de),
      lte: parseDateEnd(query.data_ate)
    }
  };

  if (query.q) {
    where.OR = [
      { nomeAtual: { contains: query.q, mode: "insensitive" } },
      { nomeOriginal: { contains: query.q, mode: "insensitive" } }
    ];
  }

  const docs = await prisma.documentoArea.findMany({
    where,
    include: selectDocumentoInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limite
  });

  return docs.map(mapDocumento);
};

type SearchRow = {
  id: number;
  snippet: string | null;
};

export const searchDocumentos = async (query: SearchDocumentosQueryInput) => {
  const rows = (await prisma.$queryRaw(
    Prisma.sql`
      SELECT d.id,
        CASE
          WHEN s."textoExtraido" IS NULL OR s."textoExtraido" = '' THEN NULL
          ELSE ts_headline('portuguese', s."textoExtraido", plainto_tsquery('portuguese', ${query.q}), 'MaxWords=32, MinWords=8, StartSel=<mark>, StopSel=</mark>')
        END AS snippet
      FROM "DocumentoArea" d
      LEFT JOIN "DocumentoSearchIndex" s ON s."documentoId" = d.id
      WHERE d.status = 'ATIVO'
        AND (
          d."nomeAtual" ILIKE ${`%${query.q}%`}
          OR d."nomeOriginal" ILIKE ${`%${query.q}%`}
          OR s."searchVector" @@ plainto_tsquery('portuguese', ${query.q})
          OR s."textoExtraido" ILIKE ${`%${query.q}%`}
        )
      ORDER BY d."createdAt" DESC, d.id DESC
      LIMIT ${query.limite}
    `
  )) as SearchRow[];

  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  const docs = await prisma.documentoArea.findMany({
    where: { id: { in: ids } },
    include: {
      ...selectDocumentoInclude,
      searchIndex: { select: { status: true, erro: true, textoExtraido: true } }
    }
  });
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const docById = new Map(docs.map((doc) => [doc.id, doc]));

  return ids.flatMap((id) => {
    const doc = docById.get(id);
    if (!doc) {
      return [];
    }
    const row = rowById.get(id);
    const snippet = row?.snippet || buildSnippet(doc.searchIndex?.textoExtraido, query.q) || doc.nomeAtual;
    return [
      {
        ...mapDocumento(doc as Prisma.DocumentoAreaGetPayload<{ include: typeof selectDocumentoInclude }>),
        trecho: snippet,
        data_upload: doc.createdAt.toISOString()
      }
    ];
  });
};

export const getDocumentoForDownload = async (id: number, user: AuthUser, ip?: string | null) => {
  const doc = await prisma.documentoArea.findFirst({
    where: { id, status: DocumentoAreaStatus.ATIVO },
    include: selectDocumentoInclude
  });
  if (!doc) {
    return null;
  }

  if (doc.scanStatus !== DocumentoScanStatus.LIMPO) {
    throw new Error("DOCUMENT_SCAN_PENDING");
  }

  await prisma.$transaction(async (tx) => {
    await createDocumentoAuditLog(tx, {
      documentoId: doc.id,
      user,
      action: DocumentoAuditAction.DOWNLOAD,
      arquivoNome: doc.nomeAtual,
      ip,
      detalhes: { nome_original: doc.nomeOriginal }
    });
  });

  const buffer = await getDocumentObjectBuffer(doc.arquivoPath);
  return buffer ? { doc: mapDocumento(doc), buffer, mimeType: doc.mimeType, fileName: doc.nomeAtual } : null;
};

export const reindexDocumento = async (id: number) => {
  const doc = await prisma.documentoArea.findFirst({
    where: { id, status: DocumentoAreaStatus.ATIVO },
    include: selectDocumentoInclude
  });
  if (!doc) {
    return null;
  }

  const buffer = await getDocumentObjectBuffer(doc.arquivoPath);
  if (!buffer) {
    throw new Error("DOCUMENT_FILE_NOT_FOUND");
  }

  await indexDocumentoText(doc.id, {
    buffer,
    originalname: doc.nomeOriginal,
    mimetype: doc.mimeType ?? "application/octet-stream",
    size: Number(doc.tamanho)
  });

  try {
    await syncDocumentoKnowledgeByIds([doc.id]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      "[documentos] Falha ao sincronizar documento reindexado no Assistente 360:",
      error instanceof Error ? error.message : String(error)
    );
  }

  const refreshed = await prisma.documentoArea.findUniqueOrThrow({
    where: { id: doc.id },
    include: selectDocumentoInclude
  });
  return mapDocumento(refreshed);
};

export const updateDocumento = async (id: number, input: UpdateDocumentoInput, user: AuthUser, ip?: string | null) => {
  await assertOptionalRelationsExist(input.instrumento_id, input.proponente_id);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.documentoArea.findFirst({ where: { id, status: DocumentoAreaStatus.ATIVO } });
    if (!existing) {
      return null;
    }

    const data: Prisma.DocumentoAreaUpdateInput = {};
    const changed: string[] = [];
    if (input.nome_atual && input.nome_atual !== existing.nomeAtual) {
      data.nomeAtual = normalizeFileName(input.nome_atual);
      changed.push("nome_atual");
    }
    if (input.instrumento_id !== undefined && input.instrumento_id !== existing.instrumentId) {
      data.instrument = input.instrumento_id ? { connect: { id: input.instrumento_id } } : { disconnect: true };
      changed.push("instrumento_id");
    }
    if (input.proponente_id !== undefined && input.proponente_id !== existing.conveneteId) {
      data.convenete = input.proponente_id ? { connect: { id: input.proponente_id } } : { disconnect: true };
      changed.push("proponente_id");
    }

    if (changed.length === 0) {
      const unchanged = await tx.documentoArea.findUniqueOrThrow({ where: { id }, include: selectDocumentoInclude });
      return mapDocumento(unchanged);
    }

    const updated = await tx.documentoArea.update({
      where: { id },
      data,
      include: selectDocumentoInclude
    });

    await createDocumentoAuditLog(tx, {
      documentoId: id,
      user,
      action: changed.includes("nome_atual") && changed.length === 1 ? DocumentoAuditAction.RENOMEACAO : DocumentoAuditAction.ALTERACAO,
      arquivoNome: updated.nomeAtual,
      ip,
      detalhes: {
        campos_alterados: changed,
        antes: {
          nome_atual: existing.nomeAtual,
          instrumento_id: existing.instrumentId,
          proponente_id: existing.conveneteId
        },
        depois: {
          nome_atual: updated.nomeAtual,
          instrumento_id: updated.instrumentId,
          proponente_id: updated.conveneteId
        }
      }
    });

    return mapDocumento(updated);
  });
};

export const deleteDocumentoLogically = async (id: number, user: AuthUser, ip?: string | null) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.documentoArea.findFirst({ where: { id, status: DocumentoAreaStatus.ATIVO } });
    if (!existing) {
      return false;
    }

    await tx.documentoArea.update({
      where: { id },
      data: {
        status: DocumentoAreaStatus.EXCLUIDO,
        deletedAt: new Date(),
        purgedAt: null
      }
    });

    await createDocumentoAuditLog(tx, {
      documentoId: id,
      user,
      action: DocumentoAuditAction.EXCLUSAO,
      arquivoNome: existing.nomeAtual,
      ip,
      detalhes: { exclusao: "LOGICA" }
    });

    return true;
  });
};

export const listDocumentoAuditLogs = async (query: ListDocumentoAuditQueryInput) => {
  const where: Prisma.DocumentoAuditLogWhereInput = {
    documentoId: query.documento_id,
    userId: query.usuario_id,
    action: query.acao,
    arquivoNome: query.arquivo ? { contains: query.arquivo, mode: "insensitive" } : undefined,
    createdAt: {
      gte: parseDateStart(query.data_de),
      lte: parseDateEnd(query.data_ate)
    }
  };

  const rows = await prisma.documentoAuditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limite,
    include: {
      documento: { select: { id: true, nomeAtual: true, origem: true, externalSenderNome: true, externalSenderCpf: true } },
      user: { select: { id: true, nome: true, email: true } }
    }
  });

  return rows.map((row) => ({
    id: row.id,
    documento_id: row.documentoId,
    usuario: row.user
      ? { id: row.user.id, nome: row.user.nome, email: row.user.email }
      : { id: row.userId, nome: row.userNome, email: row.userEmail },
    acao: row.action,
    arquivo_nome: row.arquivoNome,
    ip: row.ip,
    detalhes: row.detalhes,
    documento: row.documento,
    created_at: row.createdAt.toISOString()
  }));
};

const currentExternalStatus = (request: {
  status: DocumentoExternalRequestStatus;
  expiraEm: Date | null;
  submittedAt: Date | null;
  allowResend: boolean;
  maxUsos: number;
  usosAtuais: number;
}) => {
  if (request.status === DocumentoExternalRequestStatus.DESATIVADO) {
    return DocumentoExternalRequestStatus.DESATIVADO;
  }
  if (request.expiraEm && request.expiraEm.getTime() < Date.now()) {
    return DocumentoExternalRequestStatus.EXPIRADO;
  }
  if (request.usosAtuais >= request.maxUsos) {
    return DocumentoExternalRequestStatus.ENVIO_REALIZADO;
  }
  if (request.submittedAt && !request.allowResend) {
    return DocumentoExternalRequestStatus.ENVIO_REALIZADO;
  }
  return DocumentoExternalRequestStatus.ATIVO;
};

const isGmailConfigured = () =>
  Boolean(env.gmailClientId && env.gmailClientSecret && env.gmailRefreshToken && env.gmailUserEmail);

const sendExternalUploadNotification = async (input: {
  toEmail: string;
  tituloSolicitacao: string;
  token: string;
  nomeRemetente: string;
  cpfRemetente: string;
  quantidadeArquivos: number;
  usosAtuais: number;
  maxUsos: number;
  ip?: string | null;
}) => {
  if (!isGmailConfigured()) {
    return;
  }

  const auth = new google.auth.OAuth2(env.gmailClientId, env.gmailClientSecret);
  auth.setCredentials({ refresh_token: env.gmailRefreshToken });
  const gmail = google.gmail({ version: "v1", auth });

  const subject = `[GestConv360] Novo envio de documentos: ${input.tituloSolicitacao}`;
  const bodyLines = [
    `Solicitacao: ${input.tituloSolicitacao}`,
    `Token: ${input.token}`,
    `Remetente: ${input.nomeRemetente}`,
    `CPF: ${input.cpfRemetente}`,
    `Arquivos recebidos: ${input.quantidadeArquivos}`,
    `Uso do link: ${input.usosAtuais}/${input.maxUsos}`,
    `IP de origem: ${input.ip ?? "nao informado"}`,
    `Momento: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
  ];

  const raw = [
    `From: GestConv360 <${env.gmailUserEmail}>`,
    `To: ${input.toEmail}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    bodyLines.join("\n")
  ]
    .join("\n")
    .trim();

  const encoded = Buffer.from(raw, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  await gmail.users.messages.send({
    userId: env.gmailUserEmail,
    requestBody: { raw: encoded }
  });
};

const externalRequestInclude = {
  createdByUser: true,
  documentos: {
    where: { status: DocumentoAreaStatus.ATIVO },
    select: { id: true }
  },
  _count: {
    select: {
      submissions: true
    }
  }
} satisfies Prisma.DocumentoExternalRequestInclude;

const mapExternalRequest = (item: Prisma.DocumentoExternalRequestGetPayload<{ include: typeof externalRequestInclude }>) => {
  const status = currentExternalStatus(item);
  return {
    id: item.id,
    token: item.token,
    titulo: item.titulo,
    descricao: item.descricao,
    status,
    expira_em: toIso(item.expiraEm),
    permanente: item.expiraEm === null,
    permitir_reenvio: item.allowResend,
    max_usos: item.maxUsos,
    usos_atuais: item.usosAtuais,
    usos_restantes: Math.max(item.maxUsos - item.usosAtuais, 0),
    link_publico: `/api/v1/public/documentos/${item.token}`,
    criado_por: { id: item.createdByUser.id, nome: item.createdByUser.nome, email: item.createdByUser.email },
    documentos_recebidos: item.documentos.length,
    envios: item._count.submissions,
    submitted_at: toIso(item.submittedAt),
    created_at: item.createdAt.toISOString(),
    updated_at: item.updatedAt.toISOString()
  };
};

export const createDocumentoExternalRequest = async (input: CreateExternalRequestInput, user: AuthUser) => {
  const expiraEm = input.permanente ? null : input.expira_em ? new Date(input.expira_em) : null;
  if (!input.permanente && !expiraEm) {
    throw new Error("EXPIRATION_REQUIRED");
  }
  if (expiraEm && expiraEm.getTime() <= Date.now()) {
    throw new Error("EXPIRATION_IN_PAST");
  }

  const maxUsosBase = input.max_usos ?? (input.permitir_reenvio ? 999 : 1);
  const maxUsos = Math.max(1, maxUsosBase);
  const allowResend = input.permitir_reenvio || maxUsos > 1;

  const created = await prisma.documentoExternalRequest.create({
    data: {
      token: randomBytes(32).toString("hex"),
      titulo: input.titulo,
      descricao: input.descricao?.trim() || null,
      expiraEm,
      allowResend,
      maxUsos,
      createdByUserId: user.id,
      createdByEmail: user.email
    },
    include: externalRequestInclude
  });

  return mapExternalRequest(created);
};

export const listDocumentoExternalRequests = async () => {
  const items = await prisma.documentoExternalRequest.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    include: externalRequestInclude
  });
  return items.map(mapExternalRequest);
};

export const listDocumentosByExternalRequest = async (externalRequestId: number) => {
  const request = await prisma.documentoExternalRequest.findUnique({
    where: { id: externalRequestId },
    select: { id: true, titulo: true, token: true }
  });
  if (!request) {
    return null;
  }

  const documentos = await prisma.documentoArea.findMany({
    where: { externalRequestId, status: DocumentoAreaStatus.ATIVO },
    include: selectDocumentoInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });

  return {
    solicitacao: request,
    itens: documentos.map(mapDocumento)
  };
};

const resolveExternalExpiration = (input: UpdateExternalRequestInput) => {
  const expiraEm = input.permanente ? null : input.expira_em ? new Date(input.expira_em) : null;
  if (!input.permanente && !expiraEm) {
    throw new Error("EXPIRATION_REQUIRED");
  }
  if (expiraEm && expiraEm.getTime() <= Date.now()) {
    throw new Error("EXPIRATION_IN_PAST");
  }
  return expiraEm;
};

export const updateDocumentoExternalRequestExpiration = async (id: number, input: UpdateExternalRequestInput) => {
  const expiraEm = resolveExternalExpiration(input);
  const existing = await prisma.documentoExternalRequest.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  const updated = await prisma.documentoExternalRequest.update({
    where: { id },
    data: {
      expiraEm,
      status: existing.status === DocumentoExternalRequestStatus.EXPIRADO ? DocumentoExternalRequestStatus.ATIVO : existing.status
    },
    include: externalRequestInclude
  });
  return mapExternalRequest(updated);
};

export const prepareDocumentoExternalRequestResend = async (id: number) => {
  const existing = await prisma.documentoExternalRequest.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }
  if (existing.status === DocumentoExternalRequestStatus.DESATIVADO) {
    throw new Error("DESATIVADO");
  }
  if (existing.expiraEm && existing.expiraEm.getTime() <= Date.now()) {
    throw new Error("EXPIRADO");
  }

  const updated = await prisma.documentoExternalRequest.update({
    where: { id },
    data: {
      allowResend: true,
      status: DocumentoExternalRequestStatus.ATIVO
    },
    include: externalRequestInclude
  });
  return mapExternalRequest(updated);
};

export const deactivateDocumentoExternalRequest = async (id: number) => {
  const updated = await prisma.documentoExternalRequest.update({
    where: { id },
    data: { status: DocumentoExternalRequestStatus.DESATIVADO, deactivatedAt: new Date() },
    include: externalRequestInclude
  });
  return mapExternalRequest(updated);
};

export const getDocumentoExternalRequestByToken = async (token: string) => {
  const item = await prisma.documentoExternalRequest.findUnique({
    where: { token },
    include: externalRequestInclude
  });
  return item ? mapExternalRequest(item) : null;
};

export const registerExternalAccess = async (input: {
  token: string;
  requestId?: number | null;
  nomeCompleto?: string | null;
  cpf?: string | null;
  ip?: string | null;
  evento: string;
}) => {
  await prisma.documentoExternalAccessLog.create({
    data: {
      token: input.token,
      externalRequestId: input.requestId ?? null,
      nomeCompleto: input.nomeCompleto ?? null,
      cpf: input.cpf ? onlyCpfDigits(input.cpf) : null,
      ip: input.ip ?? null,
      evento: input.evento
    }
  });
};

export const receiveExternalDocumentos = async (input: {
  token: string;
  nomeCompleto: string;
  cpf: string;
  files: UploadFile[];
  ip?: string | null;
}) => {
  const request = await prisma.documentoExternalRequest.findUnique({
    where: { token: input.token },
    include: { createdByUser: { select: { email: true } } }
  });
  if (!request) {
    throw new Error("REQUEST_NOT_FOUND");
  }

  const status = currentExternalStatus(request);
  if (status !== DocumentoExternalRequestStatus.ATIVO) {
    throw new Error(status);
  }

  const cpf = onlyCpfDigits(input.cpf);
  const submissionResult = await prisma.$transaction(async (tx) => {
    const created = await tx.documentoExternalSubmission.create({
      data: {
        externalRequestId: request.id,
        nomeCompleto: input.nomeCompleto,
        cpf,
        ip: input.ip ?? null
      }
    });

    const updatedCount = await tx.documentoExternalRequest.updateMany({
      where: {
        id: request.id,
        usosAtuais: request.usosAtuais,
        maxUsos: { gt: request.usosAtuais }
      },
      data: {
        usosAtuais: { increment: 1 },
        submittedAt: new Date(),
        status:
          request.usosAtuais + 1 >= request.maxUsos
            ? DocumentoExternalRequestStatus.ENVIO_REALIZADO
            : DocumentoExternalRequestStatus.ATIVO
      }
    });

    if (updatedCount.count === 0) {
      throw new Error("LINK_USAGE_EXHAUSTED");
    }

    const refreshed = await tx.documentoExternalRequest.findUniqueOrThrow({
      where: { id: request.id },
      select: {
        token: true,
        titulo: true,
        maxUsos: true,
        usosAtuais: true,
        createdByEmail: true
      }
    });

    await registerExternalAccess({
      token: request.token,
      requestId: request.id,
      nomeCompleto: input.nomeCompleto,
      cpf,
      ip: input.ip,
      evento: `USO_LINK_${refreshed.usosAtuais}_${refreshed.maxUsos}`
    });

    return { created, refreshed };
  });

  const submission = submissionResult.created;

  const docs = await createDocumentosFromFiles({
    files: input.files,
    origem: DocumentoAreaOrigem.EXTERNO,
    externalRequestId: request.id,
    externalSubmissionId: submission.id,
    externalSenderNome: input.nomeCompleto,
    externalSenderCpf: cpf,
    ip: input.ip
  });

  const notifyEmail = request.createdByUser?.email ?? request.createdByEmail;
  if (notifyEmail) {
    try {
      await sendExternalUploadNotification({
        toEmail: notifyEmail,
        tituloSolicitacao: submissionResult.refreshed.titulo,
        token: submissionResult.refreshed.token,
        nomeRemetente: input.nomeCompleto,
        cpfRemetente: cpf,
        quantidadeArquivos: docs.length,
        usosAtuais: submissionResult.refreshed.usosAtuais,
        maxUsos: submissionResult.refreshed.maxUsos,
        ip: input.ip
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        buildGmailSendFailureMessage("Falha ao notificar gestor sobre envio externo de documentos", error)
      );
    }
  }

  return { submission, docs };
};
