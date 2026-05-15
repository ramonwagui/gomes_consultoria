import { Prisma } from "@prisma/client";
import { google } from "googleapis";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { buildGmailSendFailureMessage } from "../email/gmail-health.service";

const TABLE_MAIN = "transferencias_discricionarias";
const TABLE_DESEMBOLSO = "transferencias_discricionarias_desembolsos";
const TABLE_MONITOR_MAIN = "transferencias_discricionarias_monitor_pagamentos";
const TABLE_MONITOR_DESEMBOLSO = "transferencias_discricionarias_monitor_desembolsos";
const TABLE_CHANGES_NOTIFY = "transferencias_discricionarias_changes_notificacoes";

const MAX_DETAILS_PER_SECTION = 120;
const WINDOW_HOURS = 24;

type NotifyMode = "sync" | "manual" | "sync_full";

type MonetaryMainChange = {
  item_chave: string;
  nr_convenio: string | null;
  nr_proposta: string | null;
  nome_proponente: string | null;
  objeto: string | null;
  uf: string | null;
  valor_anterior: number | null;
  valor_atual: number | null;
  delta_valor: number | null;
  atualizado_em_atual: string | null;
};

type NewDesembolsoChange = {
  chave_unica: string;
  id_desembolso: number | null;
  nr_convenio: string | null;
  data_desembolso: string | null;
  vl_desembolsado: number | null;
  nome_proponente: string | null;
  objeto: string | null;
  atualizado_em: string | null;
};

type UpdatedDesembolsoChange = {
  chave_unica: string;
  id_desembolso: number | null;
  nr_convenio: string | null;
  data_anterior: string | null;
  data_atual: string | null;
  valor_anterior: number | null;
  valor_atual: number | null;
  nome_proponente: string | null;
  objeto: string | null;
  atualizado_em: string | null;
};

type ChangesSummary = {
  pagamentosAlteradosTotal: number;
  valorDesembolsadoAlteradoTotal: number;
  novosDesembolsosTotal: number;
  desembolsosAtualizadosTotal: number;
  pagamentosAlterados: MonetaryMainChange[];
  valorDesembolsadoAlterado: MonetaryMainChange[];
  novosDesembolsos: NewDesembolsoChange[];
  desembolsosAtualizados: UpdatedDesembolsoChange[];
};

type ChangesNotifyResult = {
  modo: NotifyMode;
  total_alteracoes: number;
  pagamentos_alterados: number;
  valor_desembolsado_alterado: number;
  novos_desembolsos: number;
  desembolsos_atualizados: number;
  notificacao_enviada: boolean;
  mensagem: string;
};

type ChangesBuckets = {
  pagamentosAlterados: MonetaryMainChange[];
  valorDesembolsadoAlterado: MonetaryMainChange[];
  novosDesembolsos: NewDesembolsoChange[];
  desembolsosAtualizados: UpdatedDesembolsoChange[];
};

type ChangeEvent = {
  eventType: string;
  signature: string;
  referenceDateIso: string;
};

let monitorTablesEnsured = false;

const toInt = (value: number | bigint | string | null | undefined) => {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
};

const escapeHtml = (value: string | null | undefined) => {
  const source = value ?? "";
  return source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const formatMoney = (value: number | null | undefined) => {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const encodeBase64Url = (input: string) => {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const parseDateBrOrIso = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]);
    const year = Number(brMatch[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const isoDateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnly) {
    const year = Number(isoDateOnly[1]);
    const month = Number(isoDateOnly[2]);
    const day = Number(isoDateOnly[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolveReferenceDate = (dataDesembolso: string | null | undefined, atualizadoEm: string | null | undefined) => {
  return parseDateBrOrIso(dataDesembolso) ?? parseDateBrOrIso(atualizadoEm);
};

const getWindowCutoff = () => {
  const now = new Date();
  return new Date(now.getTime() - WINDOW_HOURS * 60 * 60 * 1000);
};

const isWithinWindow = (referenceDate: Date | null, cutoff: Date) => {
  return Boolean(referenceDate && referenceDate.getTime() >= cutoff.getTime());
};

const shouldApplyWindow = (mode: NotifyMode) => mode !== "sync_full";

const resolveModeLabel = (mode: NotifyMode) => {
  if (mode === "manual") {
    return "manual";
  }
  if (mode === "sync_full") {
    return "apos sincronizacao full";
  }
  return "apos sincronizacao";
};

const normalizeNumberSignature = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) {
    return "0";
  }
  return value.toFixed(2);
};

const listNotificationRecipients = () => {
  const discricionarias = env.transferenciasDiscricionariasNotifyEmails
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (discricionarias.length > 0) {
    return discricionarias;
  }

  return env.transferenciasEspeciaisNotifyEmails
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const isNotifierConfigured = () => {
  const recipients = listNotificationRecipients();
  if (recipients.length === 0) {
    return false;
  }

  return Boolean(env.gmailClientId && env.gmailClientSecret && env.gmailRefreshToken && env.gmailUserEmail);
};

const ensureMonitorTables = async () => {
  if (monitorTablesEnsured) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${TABLE_MONITOR_MAIN} (
      item_chave TEXT PRIMARY KEY,
      nr_convenio TEXT,
      nr_proposta TEXT,
      nome_proponente TEXT,
      uf TEXT,
      valor_pagamentos REAL,
      valor_desembolsado_conv REAL,
      atualizado_em TEXT NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${TABLE_MONITOR_DESEMBOLSO} (
      chave_unica TEXT PRIMARY KEY,
      id_desembolso INTEGER,
      nr_convenio TEXT,
      data_desembolso TEXT,
      vl_desembolsado REAL,
      atualizado_em TEXT NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${TABLE_CHANGES_NOTIFY} (
      id SERIAL PRIMARY KEY,
      event_type TEXT NOT NULL,
      event_signature TEXT NOT NULL,
      reference_date TEXT,
      enviado_em TEXT NOT NULL,
      mode TEXT NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_td_monitor_main_nr_convenio ON ${TABLE_MONITOR_MAIN} (nr_convenio)`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_td_monitor_desembolso_convenio ON ${TABLE_MONITOR_DESEMBOLSO} (nr_convenio)`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_td_changes_notify_signature ON ${TABLE_CHANGES_NOTIFY} (event_signature)`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_td_changes_notify_sent_at ON ${TABLE_CHANGES_NOTIFY} (enviado_em)`
  );

  monitorTablesEnsured = true;
};

const countTableRows = async (tableName: string) => {
  const rows = await prisma.$queryRaw<Array<{ total: number | bigint | string }>>(
    Prisma.sql`SELECT COUNT(*) AS total FROM ${Prisma.raw(tableName)}`
  );

  return toInt(rows[0]?.total ?? 0);
};

const refreshBaselineSnapshot = async () => {
  const nowIso = new Date().toISOString();

  await prisma.$transaction([
    prisma.$executeRaw(Prisma.sql`TRUNCATE TABLE ${Prisma.raw(TABLE_MONITOR_MAIN)}`),
    prisma.$executeRaw(Prisma.sql`
      INSERT INTO ${Prisma.raw(TABLE_MONITOR_MAIN)} (
        item_chave,
        nr_convenio,
        nr_proposta,
        nome_proponente,
        uf,
        valor_pagamentos,
        valor_desembolsado_conv,
        atualizado_em
      )
      SELECT
        chave_unica AS item_chave,
        nr_convenio,
        nr_proposta,
        nome_proponente,
        uf,
        COALESCE(valor_pagamentos, 0),
        COALESCE(valor_desembolsado_conv, 0),
        ${nowIso}
      FROM ${Prisma.raw(TABLE_MAIN)}
    `),
    prisma.$executeRaw(Prisma.sql`TRUNCATE TABLE ${Prisma.raw(TABLE_MONITOR_DESEMBOLSO)}`),
    prisma.$executeRaw(Prisma.sql`
      INSERT INTO ${Prisma.raw(TABLE_MONITOR_DESEMBOLSO)} (
        chave_unica,
        id_desembolso,
        nr_convenio,
        data_desembolso,
        vl_desembolsado,
        atualizado_em
      )
      SELECT
        chave_unica,
        id_desembolso,
        nr_convenio,
        data_desembolso,
        COALESCE(vl_desembolsado, 0),
        ${nowIso}
      FROM ${Prisma.raw(TABLE_DESEMBOLSO)}
    `)
  ]);
};

const loadChangesBuckets = async (): Promise<ChangesBuckets> => {
  const [pagamentosAlterados, valorDesembolsadoAlterado, novosDesembolsos, desembolsosAtualizados] = await Promise.all([
    prisma.$queryRaw<MonetaryMainChange[]>(Prisma.sql`
      SELECT
        c.chave_unica AS item_chave,
        c.nr_convenio,
        c.nr_proposta,
        c.nome_proponente,
        c.objeto,
        c.uf,
        m.valor_pagamentos AS valor_anterior,
        c.valor_pagamentos AS valor_atual,
        COALESCE(c.valor_pagamentos, 0) - COALESCE(m.valor_pagamentos, 0) AS delta_valor,
        c.atualizado_em AS atualizado_em_atual
      FROM ${Prisma.raw(TABLE_MAIN)} c
      INNER JOIN ${Prisma.raw(TABLE_MONITOR_MAIN)} m ON m.item_chave = c.chave_unica
      WHERE COALESCE(c.valor_pagamentos, 0) <> COALESCE(m.valor_pagamentos, 0)
      ORDER BY ABS(COALESCE(c.valor_pagamentos, 0) - COALESCE(m.valor_pagamentos, 0)) DESC, c.chave_unica ASC
    `),
    prisma.$queryRaw<MonetaryMainChange[]>(Prisma.sql`
      SELECT
        c.chave_unica AS item_chave,
        c.nr_convenio,
        c.nr_proposta,
        c.nome_proponente,
        c.objeto,
        c.uf,
        m.valor_desembolsado_conv AS valor_anterior,
        c.valor_desembolsado_conv AS valor_atual,
        COALESCE(c.valor_desembolsado_conv, 0) - COALESCE(m.valor_desembolsado_conv, 0) AS delta_valor,
        c.atualizado_em AS atualizado_em_atual
      FROM ${Prisma.raw(TABLE_MAIN)} c
      INNER JOIN ${Prisma.raw(TABLE_MONITOR_MAIN)} m ON m.item_chave = c.chave_unica
      WHERE COALESCE(c.valor_desembolsado_conv, 0) <> COALESCE(m.valor_desembolsado_conv, 0)
      ORDER BY ABS(COALESCE(c.valor_desembolsado_conv, 0) - COALESCE(m.valor_desembolsado_conv, 0)) DESC, c.chave_unica ASC
    `),
    prisma.$queryRaw<NewDesembolsoChange[]>(Prisma.sql`
      SELECT
        c.chave_unica,
        c.id_desembolso,
        c.nr_convenio,
        c.data_desembolso,
        c.vl_desembolsado,
        md.nome_proponente,
        md.objeto,
        c.atualizado_em
      FROM ${Prisma.raw(TABLE_DESEMBOLSO)} c
      LEFT JOIN ${Prisma.raw(TABLE_MONITOR_DESEMBOLSO)} m ON m.chave_unica = c.chave_unica
      LEFT JOIN LATERAL (
        SELECT m2.nome_proponente, m2.objeto
        FROM ${Prisma.raw(TABLE_MAIN)} m2
        WHERE
          (m2.nr_convenio_norm IS NOT NULL AND m2.nr_convenio_norm = c.nr_convenio_norm)
          OR (m2.nr_convenio IS NOT NULL AND m2.nr_convenio = c.nr_convenio)
        ORDER BY m2.atualizado_em DESC NULLS LAST, m2.id DESC
        LIMIT 1
      ) md ON TRUE
      WHERE m.chave_unica IS NULL
      ORDER BY c.id_desembolso DESC NULLS LAST, c.chave_unica ASC
    `),
    prisma.$queryRaw<UpdatedDesembolsoChange[]>(Prisma.sql`
      SELECT
        c.chave_unica,
        c.id_desembolso,
        c.nr_convenio,
        m.data_desembolso AS data_anterior,
        c.data_desembolso AS data_atual,
        m.vl_desembolsado AS valor_anterior,
        c.vl_desembolsado AS valor_atual,
        md.nome_proponente,
        md.objeto,
        c.atualizado_em
      FROM ${Prisma.raw(TABLE_DESEMBOLSO)} c
      INNER JOIN ${Prisma.raw(TABLE_MONITOR_DESEMBOLSO)} m ON m.chave_unica = c.chave_unica
      LEFT JOIN LATERAL (
        SELECT m2.nome_proponente, m2.objeto
        FROM ${Prisma.raw(TABLE_MAIN)} m2
        WHERE
          (m2.nr_convenio_norm IS NOT NULL AND m2.nr_convenio_norm = c.nr_convenio_norm)
          OR (m2.nr_convenio IS NOT NULL AND m2.nr_convenio = c.nr_convenio)
        ORDER BY m2.atualizado_em DESC NULLS LAST, m2.id DESC
        LIMIT 1
      ) md ON TRUE
      WHERE COALESCE(c.data_desembolso, '') <> COALESCE(m.data_desembolso, '')
         OR COALESCE(c.vl_desembolsado, 0) <> COALESCE(m.vl_desembolsado, 0)
         OR COALESCE(c.nr_convenio, '') <> COALESCE(m.nr_convenio, '')
      ORDER BY c.id_desembolso DESC NULLS LAST, c.chave_unica ASC
    `)
  ]);

  return {
    pagamentosAlterados,
    valorDesembolsadoAlterado,
    novosDesembolsos,
    desembolsosAtualizados
  };
};

const collectEventsWithinWindow = (buckets: ChangesBuckets, mode: NotifyMode) => {
  const applyWindow = shouldApplyWindow(mode);
  const cutoff = getWindowCutoff();

  const pagamentosEvents: Array<{ item: MonetaryMainChange; event: ChangeEvent }> = [];
  const desembolsadoEvents: Array<{ item: MonetaryMainChange; event: ChangeEvent }> = [];
  const novosEvents: Array<{ item: NewDesembolsoChange; event: ChangeEvent }> = [];
  const atualizadosEvents: Array<{ item: UpdatedDesembolsoChange; event: ChangeEvent }> = [];

  for (const item of buckets.pagamentosAlterados) {
    const referenceDate = resolveReferenceDate(null, item.atualizado_em_atual);
    if (applyWindow && !isWithinWindow(referenceDate, cutoff)) {
      continue;
    }

    pagamentosEvents.push({
      item,
      event: {
        eventType: "pagamentos_alterados",
        signature: `pag:${item.item_chave}:${normalizeNumberSignature(item.valor_anterior)}:${normalizeNumberSignature(item.valor_atual)}`,
        referenceDateIso: referenceDate!.toISOString()
      }
    });
  }

  for (const item of buckets.valorDesembolsadoAlterado) {
    const referenceDate = resolveReferenceDate(null, item.atualizado_em_atual);
    if (applyWindow && !isWithinWindow(referenceDate, cutoff)) {
      continue;
    }

    desembolsadoEvents.push({
      item,
      event: {
        eventType: "valor_desembolsado_alterado",
        signature: `vdc:${item.item_chave}:${normalizeNumberSignature(item.valor_anterior)}:${normalizeNumberSignature(item.valor_atual)}`,
        referenceDateIso: referenceDate!.toISOString()
      }
    });
  }

  for (const item of buckets.novosDesembolsos) {
    const referenceDate = applyWindow
      ? resolveReferenceDate(item.data_desembolso, item.atualizado_em)
      : resolveReferenceDate(item.atualizado_em, item.data_desembolso);
    if (applyWindow && !isWithinWindow(referenceDate, cutoff)) {
      continue;
    }

    novosEvents.push({
      item,
      event: {
        eventType: "novos_desembolsos",
        signature: `new:${item.chave_unica}:${item.id_desembolso ?? "null"}:${item.data_desembolso ?? "null"}:${normalizeNumberSignature(item.vl_desembolsado)}`,
        referenceDateIso: referenceDate!.toISOString()
      }
    });
  }

  for (const item of buckets.desembolsosAtualizados) {
    const referenceDate = applyWindow
      ? resolveReferenceDate(item.data_atual, item.atualizado_em)
      : resolveReferenceDate(item.atualizado_em, item.data_atual);
    if (applyWindow && !isWithinWindow(referenceDate, cutoff)) {
      continue;
    }

    atualizadosEvents.push({
      item,
      event: {
        eventType: "desembolsos_atualizados",
        signature: `upd:${item.chave_unica}:${item.id_desembolso ?? "null"}:${item.data_anterior ?? "null"}:${item.data_atual ?? "null"}:${normalizeNumberSignature(item.valor_anterior)}:${normalizeNumberSignature(item.valor_atual)}`,
        referenceDateIso: referenceDate!.toISOString()
      }
    });
  }

  return {
    pagamentosEvents,
    desembolsadoEvents,
    novosEvents,
    atualizadosEvents
  };
};

const removeAlreadyNotifiedEvents = async (events: ChangeEvent[], mode: NotifyMode) => {
  if (events.length === 0) {
    return new Set<string>();
  }

  const signatures = Array.from(new Set(events.map((item) => item.signature)));

  const existing = shouldApplyWindow(mode)
    ? await prisma.$queryRaw<Array<{ event_signature: string }>>(Prisma.sql`
        SELECT event_signature
        FROM ${Prisma.raw(TABLE_CHANGES_NOTIFY)}
        WHERE event_signature IN (${Prisma.join(signatures.map((item) => Prisma.sql`${item}`))})
          AND (enviado_em)::timestamptz >= NOW() - INTERVAL '${WINDOW_HOURS} hours'
      `)
    : await prisma.$queryRaw<Array<{ event_signature: string }>>(Prisma.sql`
        SELECT event_signature
        FROM ${Prisma.raw(TABLE_CHANGES_NOTIFY)}
        WHERE event_signature IN (${Prisma.join(signatures.map((item) => Prisma.sql`${item}`))})
      `);

  return new Set(existing.map((item) => item.event_signature));
};

const buildSummaryFromEvents = (
  eventsWindow: ReturnType<typeof collectEventsWithinWindow>,
  alreadySentSignatures: Set<string>
): { summary: ChangesSummary; eventsToPersist: ChangeEvent[] } => {
  const pagamentosPending = eventsWindow.pagamentosEvents.filter((item) => !alreadySentSignatures.has(item.event.signature));
  const desembolsadoPending = eventsWindow.desembolsadoEvents.filter((item) => !alreadySentSignatures.has(item.event.signature));
  const novosPending = eventsWindow.novosEvents.filter((item) => !alreadySentSignatures.has(item.event.signature));
  const atualizadosPending = eventsWindow.atualizadosEvents.filter((item) => !alreadySentSignatures.has(item.event.signature));

  const summary: ChangesSummary = {
    pagamentosAlteradosTotal: pagamentosPending.length,
    valorDesembolsadoAlteradoTotal: desembolsadoPending.length,
    novosDesembolsosTotal: novosPending.length,
    desembolsosAtualizadosTotal: atualizadosPending.length,
    pagamentosAlterados: pagamentosPending.slice(0, MAX_DETAILS_PER_SECTION).map((item) => item.item),
    valorDesembolsadoAlterado: desembolsadoPending.slice(0, MAX_DETAILS_PER_SECTION).map((item) => item.item),
    novosDesembolsos: novosPending.slice(0, MAX_DETAILS_PER_SECTION).map((item) => item.item),
    desembolsosAtualizados: atualizadosPending.slice(0, MAX_DETAILS_PER_SECTION).map((item) => item.item)
  };

  const eventsToPersist = [
    ...pagamentosPending.map((item) => item.event),
    ...desembolsadoPending.map((item) => item.event),
    ...novosPending.map((item) => item.event),
    ...atualizadosPending.map((item) => item.event)
  ];

  return { summary, eventsToPersist };
};

const persistChangesNotifications = async (events: ChangeEvent[], mode: NotifyMode) => {
  if (events.length === 0) {
    return;
  }

  const sentAtIso = new Date().toISOString();
  for (const event of events) {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO ${Prisma.raw(TABLE_CHANGES_NOTIFY)} (
          event_type,
          event_signature,
          reference_date,
          enviado_em,
          mode
        )
        VALUES (
          ${event.eventType},
          ${event.signature},
          ${event.referenceDateIso},
          ${sentAtIso},
          ${mode}
        )
      `
    );
  }
};

const buildTableRows = (rows: string[], colCount: number) => {
  if (rows.length === 0) {
    return `<tr><td colspan="${colCount}">Nenhum item detalhado para exibir.</td></tr>`;
  }
  return rows.join("");
};

const sendChangesNotificationEmail = async (summary: ChangesSummary, mode: NotifyMode) => {
  const recipients = listNotificationRecipients();
  if (recipients.length === 0) {
    return;
  }

  const auth = new google.auth.OAuth2(env.gmailClientId, env.gmailClientSecret);
  auth.setCredentials({ refresh_token: env.gmailRefreshToken });
  const gmail = google.gmail({ version: "v1", auth });

  const totalAlteracoes =
    summary.pagamentosAlteradosTotal +
    summary.valorDesembolsadoAlteradoTotal +
    summary.novosDesembolsosTotal +
    summary.desembolsosAtualizadosTotal;
  const modeLabel = resolveModeLabel(mode);
  const eligibilityLabel = shouldApplyWindow(mode)
    ? `ultimas ${WINDOW_HOURS} horas`
    : "alteracoes detectadas no sync full";

  const now = new Date().toLocaleString("pt-BR");
  const subject = `[GestConv360] Alteracoes financeiras discricionarias (${totalAlteracoes})`;

  const pagamentosRows = summary.pagamentosAlterados.map((item) => {
    return `<tr>
      <td>${escapeHtml(item.nr_convenio ?? "-")}</td>
      <td>${escapeHtml(item.nr_proposta ?? "-")}</td>
      <td>${escapeHtml(item.nome_proponente ?? "-")}</td>
      <td>${escapeHtml(item.objeto ?? "-")}</td>
      <td>${escapeHtml(item.uf ?? "-")}</td>
      <td>${formatMoney(item.valor_anterior)}</td>
      <td>${formatMoney(item.valor_atual)}</td>
      <td>${formatMoney(item.delta_valor)}</td>
      <td>${escapeHtml(item.item_chave)}</td>
    </tr>`;
  });

  const valorDesembolsadoRows = summary.valorDesembolsadoAlterado.map((item) => {
    return `<tr>
      <td>${escapeHtml(item.nr_convenio ?? "-")}</td>
      <td>${escapeHtml(item.nr_proposta ?? "-")}</td>
      <td>${escapeHtml(item.nome_proponente ?? "-")}</td>
      <td>${escapeHtml(item.objeto ?? "-")}</td>
      <td>${escapeHtml(item.uf ?? "-")}</td>
      <td>${formatMoney(item.valor_anterior)}</td>
      <td>${formatMoney(item.valor_atual)}</td>
      <td>${formatMoney(item.delta_valor)}</td>
      <td>${escapeHtml(item.item_chave)}</td>
    </tr>`;
  });

  const novosDesembolsosRows = summary.novosDesembolsos.map((item) => {
    return `<tr>
      <td>${item.id_desembolso ?? "-"}</td>
      <td>${escapeHtml(item.nr_convenio ?? "-")}</td>
      <td>${escapeHtml(item.nome_proponente ?? "-")}</td>
      <td>${escapeHtml(item.objeto ?? "-")}</td>
      <td>${escapeHtml(item.data_desembolso ?? "-")}</td>
      <td>${formatMoney(item.vl_desembolsado)}</td>
      <td>${escapeHtml(item.chave_unica)}</td>
    </tr>`;
  });

  const desembolsosAtualizadosRows = summary.desembolsosAtualizados.map((item) => {
    return `<tr>
      <td>${item.id_desembolso ?? "-"}</td>
      <td>${escapeHtml(item.nr_convenio ?? "-")}</td>
      <td>${escapeHtml(item.nome_proponente ?? "-")}</td>
      <td>${escapeHtml(item.objeto ?? "-")}</td>
      <td>${escapeHtml(item.data_anterior ?? "-")}</td>
      <td>${escapeHtml(item.data_atual ?? "-")}</td>
      <td>${formatMoney(item.valor_anterior)}</td>
      <td>${formatMoney(item.valor_atual)}</td>
      <td>${escapeHtml(item.chave_unica)}</td>
    </tr>`;
  });

  const html = `<!doctype html><html><body style="font-family:Segoe UI,Arial,sans-serif;color:#102a43;padding:16px;">
    <h2>Alteracoes em transferencias discricionarias</h2>
    <p>Foram detectadas <strong>${totalAlteracoes}</strong> alteracoes financeiras elegiveis (${eligibilityLabel}).</p>
    <p>Origem: <strong>${modeLabel}</strong> | Referencia: ${now}</p>
    <ul>
      <li>Pagamentos alterados: <strong>${summary.pagamentosAlteradosTotal}</strong></li>
      <li>Valor desembolsado (convenio) alterado: <strong>${summary.valorDesembolsadoAlteradoTotal}</strong></li>
      <li>Novos desembolsos: <strong>${summary.novosDesembolsosTotal}</strong></li>
      <li>Desembolsos atualizados: <strong>${summary.desembolsosAtualizadosTotal}</strong></li>
    </ul>

    <h3>Pagamentos alterados (top ${MAX_DETAILS_PER_SECTION})</h3>
    <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-size:12px;">
      <thead><tr><th>Convenio</th><th>Proposta</th><th>Proponente</th><th>Objeto</th><th>UF</th><th>Anterior</th><th>Atual</th><th>Delta</th><th>Chave</th></tr></thead>
      <tbody>${buildTableRows(pagamentosRows, 9)}</tbody>
    </table>

    <h3>Desembolsado por convenio alterado (top ${MAX_DETAILS_PER_SECTION})</h3>
    <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-size:12px;">
      <thead><tr><th>Convenio</th><th>Proposta</th><th>Proponente</th><th>Objeto</th><th>UF</th><th>Anterior</th><th>Atual</th><th>Delta</th><th>Chave</th></tr></thead>
      <tbody>${buildTableRows(valorDesembolsadoRows, 9)}</tbody>
    </table>

    <h3>Novos desembolsos (top ${MAX_DETAILS_PER_SECTION})</h3>
    <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-size:12px;">
      <thead><tr><th>ID desembolso</th><th>Convenio</th><th>Proponente</th><th>Objeto</th><th>Data</th><th>Valor</th><th>Chave</th></tr></thead>
      <tbody>${buildTableRows(novosDesembolsosRows, 7)}</tbody>
    </table>

    <h3>Desembolsos atualizados (top ${MAX_DETAILS_PER_SECTION})</h3>
    <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-size:12px;">
      <thead><tr><th>ID desembolso</th><th>Convenio</th><th>Proponente</th><th>Objeto</th><th>Data anterior</th><th>Data atual</th><th>Valor anterior</th><th>Valor atual</th><th>Chave</th></tr></thead>
      <tbody>${buildTableRows(desembolsosAtualizadosRows, 9)}</tbody>
    </table>

    <p style="margin-top:12px;">Mensagem automatica do GestConv360.</p>
  </body></html>`;

  const textLines = [
    "Alteracoes em transferencias discricionarias",
    `Origem: ${modeLabel}`,
    `Total elegivel (${eligibilityLabel}): ${totalAlteracoes}`,
    `Pagamentos alterados: ${summary.pagamentosAlteradosTotal}`,
    `Desembolsado por convenio alterado: ${summary.valorDesembolsadoAlteradoTotal}`,
    `Novos desembolsos: ${summary.novosDesembolsosTotal}`,
    `Desembolsos atualizados: ${summary.desembolsosAtualizadosTotal}`,
    `Referencia: ${now}`
  ];

  const mime = [
    `From: GestConv360 <${env.gmailUserEmail}>`,
    `To: ${recipients.join(", ")}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
    "",
    `<!-- ${textLines.join("\n")} -->`
  ].join("\n");

  try {
    await gmail.users.messages.send({
      userId: env.gmailUserEmail,
      requestBody: {
        raw: encodeBase64Url(mime)
      }
    });
  } catch (error) {
    throw new Error(
      buildGmailSendFailureMessage("Falha no disparo de notificacao de alteracoes financeiras", error)
    );
  }
};

export const monitorarAlteracoesFinanceirasTransferenciasDiscricionarias = async (
  mode: NotifyMode = "sync"
): Promise<ChangesNotifyResult> => {
  await ensureMonitorTables();

  const [monitorMainCount, monitorDesembolsoCount] = await Promise.all([
    countTableRows(TABLE_MONITOR_MAIN),
    countTableRows(TABLE_MONITOR_DESEMBOLSO)
  ]);

  if (monitorMainCount === 0 && monitorDesembolsoCount === 0) {
    await refreshBaselineSnapshot();
    return {
      modo: mode,
      total_alteracoes: 0,
      pagamentos_alterados: 0,
      valor_desembolsado_alterado: 0,
      novos_desembolsos: 0,
      desembolsos_atualizados: 0,
      notificacao_enviada: false,
      mensagem: "Baseline de monitoramento inicializada. Notificacao sera enviada a partir da proxima alteracao."
    };
  }

  const buckets = await loadChangesBuckets();
  const eventsWindow = collectEventsWithinWindow(buckets, mode);
  const allWindowEvents = [
    ...eventsWindow.pagamentosEvents.map((item) => item.event),
    ...eventsWindow.desembolsadoEvents.map((item) => item.event),
    ...eventsWindow.novosEvents.map((item) => item.event),
    ...eventsWindow.atualizadosEvents.map((item) => item.event)
  ];

  const alreadySentSignatures = await removeAlreadyNotifiedEvents(allWindowEvents, mode);
  const { summary, eventsToPersist } = buildSummaryFromEvents(eventsWindow, alreadySentSignatures);

  const totalAlteracoes =
    summary.pagamentosAlteradosTotal +
    summary.valorDesembolsadoAlteradoTotal +
    summary.novosDesembolsosTotal +
    summary.desembolsosAtualizadosTotal;

  if (totalAlteracoes === 0) {
    await refreshBaselineSnapshot();
    return {
      modo: mode,
      total_alteracoes: 0,
      pagamentos_alterados: 0,
      valor_desembolsado_alterado: 0,
      novos_desembolsos: 0,
      desembolsos_atualizados: 0,
      notificacao_enviada: false,
      mensagem: shouldApplyWindow(mode)
        ? `Nenhuma alteracao financeira elegivel nas ultimas ${WINDOW_HOURS} horas (ou ja notificada).`
        : "Nenhuma alteracao financeira elegivel no delta do sync full (ou ja notificada)."
    };
  }

  if (!env.transferenciasDiscricionariasNotifyEnabled) {
    await refreshBaselineSnapshot();
    return {
      modo: mode,
      total_alteracoes: totalAlteracoes,
      pagamentos_alterados: summary.pagamentosAlteradosTotal,
      valor_desembolsado_alterado: summary.valorDesembolsadoAlteradoTotal,
      novos_desembolsos: summary.novosDesembolsosTotal,
      desembolsos_atualizados: summary.desembolsosAtualizadosTotal,
      notificacao_enviada: false,
      mensagem: "Alteracoes detectadas, mas notificacao por email esta desativada."
    };
  }

  if (!isNotifierConfigured()) {
    await refreshBaselineSnapshot();
    return {
      modo: mode,
      total_alteracoes: totalAlteracoes,
      pagamentos_alterados: summary.pagamentosAlteradosTotal,
      valor_desembolsado_alterado: summary.valorDesembolsadoAlteradoTotal,
      novos_desembolsos: summary.novosDesembolsosTotal,
      desembolsos_atualizados: summary.desembolsosAtualizadosTotal,
      notificacao_enviada: false,
      mensagem: "Alteracoes detectadas, mas configuracao de envio de email esta incompleta."
    };
  }

  await sendChangesNotificationEmail(summary, mode);
  await persistChangesNotifications(eventsToPersist, mode);
  await refreshBaselineSnapshot();

  return {
    modo: mode,
    total_alteracoes: totalAlteracoes,
    pagamentos_alterados: summary.pagamentosAlteradosTotal,
    valor_desembolsado_alterado: summary.valorDesembolsadoAlteradoTotal,
    novos_desembolsos: summary.novosDesembolsosTotal,
    desembolsos_atualizados: summary.desembolsosAtualizadosTotal,
    notificacao_enviada: true,
    mensagem: `Notificacao enviada com sucesso (${totalAlteracoes} alteracoes elegiveis).`
  };
};
