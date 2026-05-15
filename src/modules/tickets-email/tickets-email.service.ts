import { TicketPriority, TicketSource, TicketStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { gmail_v1, google } from "googleapis";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { checkGmailDeliveryHealth } from "../email/gmail-health.service";
import { addTicketChecklistItems, createTicket } from "../tickets/tickets.service";
import {
  formatTicketDescriptionWithAI,
  getChecklistFromSummary,
  generateTicketSummary,
  identifyInstrumentWithAI,
  identifySenderNameWithAI
} from "./ai-ticket.service";
import { registrarEmailRecebido } from "../solicitacao-caixa/solicitacao-caixa.service";

type IngestionRunResult = {
  processed: number;
  created: number;
  ignored: number;
  errors: number;
  skippedAlreadyIngested: number;
};

type IngestionRunOptions = {
  reprocessProcessed?: boolean;
  maxMessages?: number;
};

const MAX_MESSAGES_PER_RUN = 20;

const IN_PROGRESS_FROM_EMAIL = "processing@tickets-email.local";
const IN_PROGRESS_ERROR_MARKER = "PROCESSAMENTO_EM_ANDAMENTO";

const upsertIngestionRecord = async (
  gmailMessageId: string,
  data: {
    gmailThreadId?: string | null;
    fromEmail: string;
    subject?: string;
    receivedAt?: Date | null;
    statusProcessamento: "CRIADO" | "IGNORADO" | "ERRO";
    erro?: string | null;
    payloadRaw?: string | null;
    ticketId?: number | null;
  }
) => {
  await prisma.ticketEmailIngestion.upsert({
    where: { gmailMessageId },
    create: {
      gmailMessageId,
      gmailThreadId: data.gmailThreadId ?? null,
      fromEmail: data.fromEmail,
      subject: data.subject ?? null,
      receivedAt: data.receivedAt ?? null,
      statusProcessamento: data.statusProcessamento,
      erro: data.erro ?? null,
      payloadRaw: data.payloadRaw ?? null,
      ticketId: data.ticketId ?? null
    },
    update: {
      gmailThreadId: data.gmailThreadId ?? null,
      fromEmail: data.fromEmail,
      subject: data.subject ?? null,
      receivedAt: data.receivedAt ?? null,
      statusProcessamento: data.statusProcessamento,
      erro: data.erro ?? null,
      payloadRaw: data.payloadRaw ?? null,
      ticketId: data.ticketId ?? null
    }
  });
};

const tryClaimIngestionRecord = async (gmailMessageId: string) => {
  try {
    await prisma.ticketEmailIngestion.create({
      data: {
        gmailMessageId,
        fromEmail: IN_PROGRESS_FROM_EMAIL,
        statusProcessamento: "ERRO",
        erro: IN_PROGRESS_ERROR_MARKER
      }
    });
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return false;
    }
    throw error;
  }
};

const getAllowedDomains = () =>
  env.gmailTicketAllowedDomains
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);

const isGmailConfigured = () =>
  env.gmailClientId && env.gmailClientSecret && env.gmailRefreshToken && env.gmailUserEmail;

const buildGmailClient = () => {
  const auth = new google.auth.OAuth2(env.gmailClientId, env.gmailClientSecret);
  auth.setCredentials({
    refresh_token: env.gmailRefreshToken
  });
  return google.gmail({ version: "v1", auth });
};

const parseEmailAddress = (raw: string | null | undefined) => {
  if (!raw) {
    return "";
  }
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
};

const parseSenderNameFromFromHeader = (raw: string | null | undefined) => {
  if (!raw) {
    return null;
  }

  const beforeAngle = raw.includes("<") ? raw.split("<")[0] : raw;
  const cleaned = beforeAngle.replace(/^"+|"+$/g, "").trim();
  if (cleaned === "" || cleaned.includes("@")) {
    return null;
  }

  return cleaned.slice(0, 120);
};

const isLikelyPersonName = (value: string | null | undefined) => {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  if (trimmed.length < 3 || trimmed.length > 120) {
    return false;
  }
  if (trimmed.includes("@")) {
    return false;
  }

  const letters = trimmed.match(/[A-Za-zÀ-ÿ]/g)?.length ?? 0;
  const digits = trimmed.match(/\d/g)?.length ?? 0;
  return letters >= 3 && digits <= 6;
};

const toTitleCase = (value: string) => {
  return value
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
};

const inferSenderNameFromEmailAddress = (fromEmail: string) => {
  const localPart = fromEmail.split("@")[0] ?? "";
  const normalized = localPart.replace(/[._-]+/g, " ").trim();
  if (!isLikelyPersonName(normalized)) {
    return "Remetente Externo";
  }
  return toTitleCase(normalized);
};

const extractSenderNameFromBody = (body: string) => {
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return null;
  }

  const tail = lines.slice(-25);

  for (let index = tail.length - 1; index >= 0; index -= 1) {
    const line = tail[index];
    const headerMatch = line.match(/^(?:remetente|de|from)\s*:\s*(.+)$/i);
    if (headerMatch && isLikelyPersonName(headerMatch[1])) {
      return headerMatch[1].trim().slice(0, 120);
    }
  }

  for (let index = 0; index < tail.length; index += 1) {
    if (/^(?:atenciosamente|att\.?|cordialmente|obrigad[oa]|abracos|abraços)[,:\-\s]*$/i.test(tail[index])) {
      const candidate = tail[index + 1];
      if (isLikelyPersonName(candidate)) {
        return candidate.trim().slice(0, 120);
      }
    }
  }

  for (let index = tail.length - 1; index >= Math.max(0, tail.length - 6); index -= 1) {
    const candidate = tail[index];
    if (candidate && isLikelyPersonName(candidate)) {
      return candidate.trim().slice(0, 120);
    }
  }

  return null;
};

const resolveSenderDisplayName = async (fromHeader: string | null, fromEmail: string, bodyText: string) => {
  const fromHeaderName = parseSenderNameFromFromHeader(fromHeader);
  if (isLikelyPersonName(fromHeaderName)) {
    return fromHeaderName as string;
  }

  const fromBody = extractSenderNameFromBody(bodyText);
  if (isLikelyPersonName(fromBody)) {
    return fromBody as string;
  }

  const fromAi = await identifySenderNameWithAI(fromEmail, bodyText);
  if (isLikelyPersonName(fromAi)) {
    return fromAi as string;
  }

  return inferSenderNameFromEmailAddress(fromEmail);
};

const resolveCreatorUserIdForSender = async (fromEmail: string, senderName: string, fallbackUserId: number) => {
  if (!fromEmail.includes("@")) {
    return fallbackUserId;
  }

  const normalizedEmail = fromEmail.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, nome: true }
  });

  if (existing) {
    if (senderName && senderName !== existing.nome && existing.nome === inferSenderNameFromEmailAddress(normalizedEmail)) {
      await prisma.user.update({ where: { id: existing.id }, data: { nome: senderName } });
    }
    return existing.id;
  }

  const passwordHash = await bcrypt.hash(`${randomUUID()}-${Date.now()}`, 10);

  try {
    const created = await prisma.user.create({
      data: {
        nome: senderName,
        email: normalizedEmail,
        passwordHash,
        role: "CONSULTA"
      },
      select: { id: true }
    });
    return created.id;
  } catch {
    const raceResolved = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
    return raceResolved?.id ?? fallbackUserId;
  }
};

const getHeader = (message: gmail_v1.Schema$Message, headerName: string) => {
  return (
    message.payload?.headers?.find((item) => item.name?.toLowerCase() === headerName.toLowerCase())?.value ?? null
  );
};

const decodeBase64Url = (value: string) => {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
};

const extractTextFromParts = (parts: gmail_v1.Schema$MessagePart[] | undefined): string => {
  if (!parts || parts.length === 0) {
    return "";
  }

  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
    const nested = extractTextFromParts(part.parts);
    if (nested.trim()) {
      return nested;
    }
  }
  return "";
};

const extractTextBody = (message: gmail_v1.Schema$Message) => {
  if (message.payload?.mimeType === "text/plain" && message.payload.body?.data) {
    return decodeBase64Url(message.payload.body.data);
  }
  const fromParts = extractTextFromParts(message.payload?.parts);
  if (fromParts.trim()) {
    return fromParts;
  }
  return message.snippet ?? "";
};

const inferPriority = (subject: string, body: string): TicketPriority => {
  const content = `${subject} ${body}`.toLowerCase();
  if (content.includes("critico") || content.includes("urgente") || content.includes("parado")) {
    return "CRITICA";
  }
  if (content.includes("alta prioridade") || content.includes("alto impacto")) {
    return "ALTA";
  }
  if (content.includes("baixa prioridade")) {
    return "BAIXA";
  }
  return "MEDIA";
};

const extractInstrumentHint = (subject: string, body: string) => {
  const source = `${subject}\n${body}`;

  const patterns = [
    /proposta\s*[:#-]?\s*([A-Za-z0-9./-]+)/i,
    /instrumento\s*[:#-]?\s*([A-Za-z0-9./-]+)/i,
    /n[\u00BAo\u00B0.]\s*(?:proposta|instrumento)\s*[:#-]?\s*([A-Za-z0-9./-]+)/i,
    /(?:proposta|instrumento)\s+n[\u00BAo\u00B0.]\s*[:#-]?\s*([A-Za-z0-9./-]+)/i,
    /\b(\d{4,}\/20\d{2})\b/i,
    /\b(P\d{4,})\b/i,
    /\b(INST[-.]?\d{4,})\b/i
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
};

const buildHintCandidates = (hint: string) => {
  const raw = hint.trim();
  const candidates = new Set<string>();
  if (raw.length === 0) {
    return [] as string[];
  }

  candidates.add(raw);

  const compact = raw.replace(/\s+/g, "");
  if (compact.length > 0) {
    candidates.add(compact);
  }

  // Caso comum em assuntos da CAIXA: "975787/2025".
  // O instrumento pode estar salvo apenas como "975787".
  const slashParts = compact.split("/");
  if (slashParts.length >= 2 && slashParts[0].length >= 4) {
    candidates.add(slashParts[0]);
  }

  const dashParts = compact.split("-");
  if (dashParts.length >= 2 && dashParts[0].length >= 4) {
    candidates.add(dashParts[0]);
  }

  const digitsOnly = compact.replace(/\D/g, "");
  if (digitsOnly.length >= 5) {
    candidates.add(digitsOnly);
  }

  return Array.from(candidates).filter((item) => item.length > 0);
};

const resolveSystemUserId = async () => {
  const preferred = env.gmailTicketSystemUserEmail.trim().toLowerCase();
  if (preferred) {
    const byEmail = await prisma.user.findUnique({ where: { email: preferred }, select: { id: true } });
    if (byEmail) {
      return byEmail.id;
    }
  }

  const fallback = await prisma.user.findFirst({
    where: {
      role: "ADMIN"
    },
    orderBy: [{ id: "asc" }],
    select: { id: true }
  });

  if (!fallback) {
    throw new Error("TICKET_EMAIL_SYSTEM_USER_NOT_FOUND");
  }

  return fallback.id;
};

const findInstrumentIdByHint = async (hint: string | null) => {
  if (!hint) {
    return null;
  }

  const candidates = buildHintCandidates(hint);
  if (candidates.length === 0) {
    return null;
  }

  const exact = await prisma.instrumentProposal.findFirst({
    where: {
      OR: candidates.flatMap((candidate) => [{ proposta: candidate }, { instrumento: candidate }])
    },
    select: { id: true }
  });
  if (exact) {
    return exact.id;
  }

  const partial = await prisma.instrumentProposal.findFirst({
    where: {
      OR: candidates.flatMap((candidate) => [
        { proposta: { contains: candidate } },
        { instrumento: { contains: candidate } }
      ])
    },
    select: { id: true }
  });

  return partial?.id ?? null;
};

const findInstrumentIdByAI = async (subject: string, body: string) => {
  const aiHint = await identifyInstrumentWithAI(subject, body);
  if (!aiHint) {
    return null;
  }

  if (aiHint.proposta) {
    const byProposta = await findInstrumentIdByHint(aiHint.proposta);
    if (byProposta) {
      return byProposta;
    }
  }

  if (aiHint.instrumento) {
    const byInstrumento = await findInstrumentIdByHint(aiHint.instrumento);
    if (byInstrumento) {
      return byInstrumento;
    }
  }

  return null;
};

const isAllowedSender = (fromEmail: string) => {
  const domains = getAllowedDomains();
  if (domains.length === 0) {
    return true;
  }
  const domain = fromEmail.split("@")[1] ?? "";
  return domains.includes(domain.toLowerCase());
};

const makeTicketDescription = (
  senderDisplayName: string,
  fromEmail: string,
  subject: string,
  body: string,
  receivedAt: Date | null
) => {
  const lines = [
    "Origem: EMAIL",
    `Remetente: ${senderDisplayName} <${fromEmail}>`,
    `Assunto: ${subject || "(sem assunto)"}`,
    `Recebido em: ${receivedAt ? receivedAt.toISOString() : "desconhecido"}`,
    "",
    body.trim()
  ];
  return lines.join("\n").slice(0, 4000);
};

const processMessage = async (
  gmail: gmail_v1.Gmail,
  messageId: string,
  systemUserId: number,
  options?: IngestionRunOptions
): Promise<"created" | "ignored" | "error" | "skipped"> => {
  const allowReprocess = options?.reprocessProcessed === true;

  if (!allowReprocess) {
    const claimed = await tryClaimIngestionRecord(messageId);
    if (!claimed) {
      return "skipped";
    }
  }

  try {
    const full = await gmail.users.messages.get({
      userId: env.gmailUserEmail,
      id: messageId,
      format: "full"
    });

    const fromEmail = parseEmailAddress(getHeader(full.data, "From"));
    const fromHeader = getHeader(full.data, "From");
    const subject = getHeader(full.data, "Subject") ?? "";
    const receivedAt = full.data.internalDate ? new Date(Number(full.data.internalDate)) : null;
    const bodyText = extractTextBody(full.data);
    const senderDisplayName = await resolveSenderDisplayName(fromHeader, fromEmail, bodyText);
    const createdByUserId = await resolveCreatorUserIdForSender(fromEmail, senderDisplayName, systemUserId);
    const payloadRaw = JSON.stringify({
      snippet: full.data.snippet,
      headers: full.data.payload?.headers
    });

    if (!isAllowedSender(fromEmail)) {
      await upsertIngestionRecord(messageId, {
        gmailThreadId: full.data.threadId ?? null,
        fromEmail,
        subject,
        receivedAt,
        statusProcessamento: "IGNORADO",
        erro: "Remetente fora da allowlist de dominios.",
        payloadRaw
      });
      return "ignored";
    }

    const regexHint = extractInstrumentHint(subject, bodyText);
    let instrumentId = await findInstrumentIdByHint(regexHint);

    if (!instrumentId) {
      instrumentId = await findInstrumentIdByAI(subject, bodyText);
    }

    let descricao = makeTicketDescription(senderDisplayName, fromEmail, subject, bodyText, receivedAt);
    let checklistItems: string[] = [];
    if (env.aiTicketSummaryEnabled) {
      const summary = await generateTicketSummary(subject, bodyText, fromEmail);
      if (summary) {
        descricao = formatTicketDescriptionWithAI(summary, fromEmail, subject, receivedAt);
        checklistItems = getChecklistFromSummary(summary);
        if (!instrumentId && summary.instrumento_identificado) {
          const bySummary = await findInstrumentIdByHint(summary.instrumento_identificado);
          if (bySummary) {
            instrumentId = bySummary;
          }
        }
      }
    }

    const created = await createTicket(
      {
        titulo: subject.trim() || "Ticket aberto por email",
        descricao,
        status: TicketStatus.ABERTO,
        prioridade: inferPriority(subject, bodyText),
        instrument_id: instrumentId ?? undefined,
        instrumento_informado: instrumentId ? undefined : regexHint ?? undefined
      },
      {
        createdByUserId,
        source: TicketSource.EMAIL
      }
    );

    if (checklistItems.length > 0) {
      await addTicketChecklistItems(created.id, checklistItems);
    }

    if (instrumentId) {
      await registrarEmailRecebido(instrumentId, fromEmail, subject, created.id);
    }

    await upsertIngestionRecord(messageId, {
      gmailThreadId: full.data.threadId ?? null,
      fromEmail,
      subject,
      receivedAt,
      statusProcessamento: "CRIADO",
      payloadRaw,
      ticketId: created.id
    });

    return "created";
  } catch (error) {
    await upsertIngestionRecord(messageId, {
      fromEmail: "desconhecido",
      statusProcessamento: "ERRO",
      erro: error instanceof Error ? error.message.slice(0, 500) : "Erro desconhecido"
    });
    return "error";
  }
};

export const runGmailTicketIngestion = async (options?: IngestionRunOptions): Promise<IngestionRunResult> => {
  if (!env.gmailTicketIngestionEnabled) {
    return { processed: 0, created: 0, ignored: 0, errors: 0, skippedAlreadyIngested: 0 };
  }
  if (!isGmailConfigured()) {
    throw new Error("GMAIL_TICKET_CONFIG_MISSING");
  }

  const systemUserId = await resolveSystemUserId();
  const gmail = buildGmailClient();
  const listed = await gmail.users.messages.list({
    userId: env.gmailUserEmail,
    q: env.gmailTicketQuery,
    maxResults:
      options?.maxMessages && Number.isFinite(options.maxMessages)
        ? Math.max(1, Math.min(100, options.maxMessages))
        : MAX_MESSAGES_PER_RUN
  });

  const messages = listed.data.messages ?? [];
  const result: IngestionRunResult = {
    processed: messages.length,
    created: 0,
    ignored: 0,
    errors: 0,
    skippedAlreadyIngested: 0
  };

  for (const item of messages) {
    if (!item.id) {
      continue;
    }
    const status = await processMessage(gmail, item.id, systemUserId, options);
    if (status === "created") {
      result.created += 1;
    } else if (status === "ignored") {
      result.ignored += 1;
    } else if (status === "error") {
      result.errors += 1;
    } else {
      result.skippedAlreadyIngested += 1;
    }
  }

  return result;
};

export const getEmailIngestionOverview = async () => {
  const latest = await prisma.ticketEmailIngestion.findMany({
    take: 20,
    orderBy: [{ createdAt: "desc" }],
    include: {
      ticket: {
        select: {
          id: true,
          codigo: true,
          status: true
        }
      }
    }
  });

  const totals = await prisma.ticketEmailIngestion.groupBy({
    by: ["statusProcessamento"],
    _count: {
      _all: true
    }
  });

  const gmailDeliveryHealth = await checkGmailDeliveryHealth();

  return {
    enabled: env.gmailTicketIngestionEnabled,
    configured: Boolean(isGmailConfigured()),
    gmailDeliveryHealth,
    query: env.gmailTicketQuery,
    allowedDomains: getAllowedDomains(),
    totals,
    latest
  };
};
