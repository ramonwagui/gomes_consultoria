import { Prisma } from "@prisma/client";
import { google } from "googleapis";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { buildGmailSendFailureMessage } from "../email/gmail-health.service";

const TABLE_MONITOR = "transferencias_especiais_monitor_financeiro";
const TABLE_CHANGES_NOTIFY = "transferencias_especiais_financeiro_notificacoes";
const MAX_DETAILS = 120;

type NotifyMode = "sync" | "manual";

type FinancialSnapshotChange = {
  instrument_id: number;
  codigo_plano_acao: string;
  nome_beneficiario: string | null;
  uf: string | null;
  parlamentar: string | null;
  pago_anterior: boolean | null;
  pago_atual: boolean;
  valor_anterior: number | null;
  valor_atual: number;
  data_ultimo_pagamento_anterior: string | null;
  data_ultimo_pagamento_atual: string | null;
  qtd_empenhos_anterior: number | null;
  qtd_empenhos_atual: number;
  qtd_documentos_habeis_anterior: number | null;
  qtd_documentos_habeis_atual: number;
  qtd_ordens_pagamento_anterior: number | null;
  qtd_ordens_pagamento_atual: number;
  documento_habil_anterior: string | null;
  documento_habil_atual: string | null;
  ordem_pagamento_anterior: string | null;
  ordem_pagamento_atual: string | null;
  ordem_bancaria_anterior: string | null;
  ordem_bancaria_atual: string | null;
  situacao_pagamento_anterior: string | null;
  situacao_pagamento_atual: string | null;
};

type ChangeEvent = {
  eventType: string;
  signature: string;
};

type FinancialNotifyResult = {
  modo: NotifyMode;
  total_monitorados: number;
  total_alteracoes: number;
  notificacao_enviada: boolean;
  mensagem: string;
};

let monitorTablesEnsured = false;

const toInt = (value: number | bigint | string | null | undefined) => {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
};

const normalizeNumberSignature = (value: number | null | undefined) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
};

const normalizeDateSignature = (value: string | Date | null | undefined) => {
  if (!value) {
    return "null";
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
};

const escapeHtml = (value: string | number | boolean | null | undefined) => {
  const source = String(value ?? "-");
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

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("pt-BR");
};

const formatBool = (value: boolean | null | undefined) => {
  return value ? "Sim" : "Nao";
};

const encodeBase64Url = (input: string) => {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const listNotificationRecipients = () => {
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

  await prisma.$executeRaw(Prisma.sql`
    CREATE TABLE IF NOT EXISTS ${Prisma.raw(TABLE_MONITOR)} (
      instrument_id INTEGER PRIMARY KEY,
      codigo_plano_acao TEXT NOT NULL,
      nome_beneficiario TEXT,
      uf TEXT,
      parlamentar TEXT,
      pago_detectado BOOLEAN NOT NULL DEFAULT false,
      data_primeiro_pagamento TEXT,
      data_ultimo_pagamento TEXT,
      valor_pago_detectado NUMERIC(18, 2) NOT NULL DEFAULT 0,
      quantidade_empenhos INTEGER NOT NULL DEFAULT 0,
      quantidade_documentos_habeis INTEGER NOT NULL DEFAULT 0,
      quantidade_ordens_pagamento INTEGER NOT NULL DEFAULT 0,
      documento_habil_principal TEXT,
      ordem_pagamento_principal TEXT,
      ordem_bancaria_principal TEXT,
      situacao_pagamento TEXT,
      atualizado_em TEXT NOT NULL
    )
  `);

  await prisma.$executeRaw(Prisma.sql`
    CREATE TABLE IF NOT EXISTS ${Prisma.raw(TABLE_CHANGES_NOTIFY)} (
      id SERIAL PRIMARY KEY,
      event_type TEXT NOT NULL,
      event_signature TEXT NOT NULL,
      enviado_em TEXT NOT NULL,
      mode TEXT NOT NULL
    )
  `);

  await prisma.$executeRaw(
    Prisma.sql`CREATE INDEX IF NOT EXISTS idx_te_fin_monitor_codigo ON ${Prisma.raw(TABLE_MONITOR)} (codigo_plano_acao)`
  );
  await prisma.$executeRaw(
    Prisma.sql`CREATE INDEX IF NOT EXISTS idx_te_fin_notify_signature ON ${Prisma.raw(TABLE_CHANGES_NOTIFY)} (event_signature)`
  );

  monitorTablesEnsured = true;
};

const countRows = async (tableName: string) => {
  const rows = await prisma.$queryRaw<Array<{ total: number | bigint | string }>>(
    Prisma.sql`SELECT COUNT(*) AS total FROM ${Prisma.raw(tableName)}`
  );

  return toInt(rows[0]?.total ?? 0);
};

const countCurrentFinancialRows = async () => {
  const rows = await prisma.$queryRaw<Array<{ total: number | bigint | string }>>(Prisma.sql`
    SELECT COUNT(*) AS total
    FROM "TransferenciaEspecialFinanceiro" f
    INNER JOIN "InstrumentProposal" i ON i.id = f."instrumentId"
    WHERE i.ativo = true
      AND i.concedente ILIKE '%transferegov%'
  `);

  return toInt(rows[0]?.total ?? 0);
};

const refreshBaselineSnapshot = async () => {
  const nowIso = new Date().toISOString();

  await prisma.$transaction([
    prisma.$executeRaw(Prisma.sql`TRUNCATE TABLE ${Prisma.raw(TABLE_MONITOR)}`),
    prisma.$executeRaw(Prisma.sql`
      INSERT INTO ${Prisma.raw(TABLE_MONITOR)} (
        instrument_id,
        codigo_plano_acao,
        nome_beneficiario,
        uf,
        parlamentar,
        pago_detectado,
        data_primeiro_pagamento,
        data_ultimo_pagamento,
        valor_pago_detectado,
        quantidade_empenhos,
        quantidade_documentos_habeis,
        quantidade_ordens_pagamento,
        documento_habil_principal,
        ordem_pagamento_principal,
        ordem_bancaria_principal,
        situacao_pagamento,
        atualizado_em
      )
      SELECT
        i.id,
        i.proposta,
        c.nome,
        c.uf,
        i.responsavel,
        f."pagoDetectado",
        f."dataPrimeiroPagamento"::TEXT,
        f."dataUltimoPagamento"::TEXT,
        COALESCE(f."valorPagoDetectado", 0),
        COALESCE(f."quantidadeEmpenhos", 0),
        COALESCE(f."quantidadeDocumentosHabeis", 0),
        COALESCE(f."quantidadeOrdensPagamento", 0),
        f."documentoHabilPrincipal",
        f."ordemPagamentoPrincipal",
        f."ordemBancariaPrincipal",
        f."situacaoPagamento",
        ${nowIso}
      FROM "TransferenciaEspecialFinanceiro" f
      INNER JOIN "InstrumentProposal" i ON i.id = f."instrumentId"
      LEFT JOIN "Convenete" c ON c.id = i."conveneteId"
      WHERE i.ativo = true
        AND i.concedente ILIKE '%transferegov%'
    `)
  ]);
};

const loadChanges = async () => {
  return prisma.$queryRaw<FinancialSnapshotChange[]>(Prisma.sql`
    SELECT
      i.id AS instrument_id,
      i.proposta AS codigo_plano_acao,
      c.nome AS nome_beneficiario,
      c.uf,
      i.responsavel AS parlamentar,
      m.pago_detectado AS pago_anterior,
      f."pagoDetectado" AS pago_atual,
      m.valor_pago_detectado::FLOAT AS valor_anterior,
      COALESCE(f."valorPagoDetectado", 0)::FLOAT AS valor_atual,
      m.data_ultimo_pagamento AS data_ultimo_pagamento_anterior,
      f."dataUltimoPagamento"::TEXT AS data_ultimo_pagamento_atual,
      m.quantidade_empenhos AS qtd_empenhos_anterior,
      COALESCE(f."quantidadeEmpenhos", 0) AS qtd_empenhos_atual,
      m.quantidade_documentos_habeis AS qtd_documentos_habeis_anterior,
      COALESCE(f."quantidadeDocumentosHabeis", 0) AS qtd_documentos_habeis_atual,
      m.quantidade_ordens_pagamento AS qtd_ordens_pagamento_anterior,
      COALESCE(f."quantidadeOrdensPagamento", 0) AS qtd_ordens_pagamento_atual,
      m.documento_habil_principal AS documento_habil_anterior,
      f."documentoHabilPrincipal" AS documento_habil_atual,
      m.ordem_pagamento_principal AS ordem_pagamento_anterior,
      f."ordemPagamentoPrincipal" AS ordem_pagamento_atual,
      m.ordem_bancaria_principal AS ordem_bancaria_anterior,
      f."ordemBancariaPrincipal" AS ordem_bancaria_atual,
      m.situacao_pagamento AS situacao_pagamento_anterior,
      f."situacaoPagamento" AS situacao_pagamento_atual
    FROM "TransferenciaEspecialFinanceiro" f
    INNER JOIN "InstrumentProposal" i ON i.id = f."instrumentId"
    LEFT JOIN "Convenete" c ON c.id = i."conveneteId"
    LEFT JOIN ${Prisma.raw(TABLE_MONITOR)} m ON m.instrument_id = i.id
    WHERE i.ativo = true
      AND i.concedente ILIKE '%transferegov%'
      AND (
        m.instrument_id IS NULL
        OR COALESCE(m.pago_detectado, false) <> COALESCE(f."pagoDetectado", false)
        OR COALESCE(m.valor_pago_detectado, 0) <> COALESCE(f."valorPagoDetectado", 0)
        OR COALESCE(m.data_ultimo_pagamento, '') <> COALESCE(f."dataUltimoPagamento"::TEXT, '')
        OR COALESCE(m.quantidade_empenhos, 0) <> COALESCE(f."quantidadeEmpenhos", 0)
        OR COALESCE(m.quantidade_documentos_habeis, 0) <> COALESCE(f."quantidadeDocumentosHabeis", 0)
        OR COALESCE(m.quantidade_ordens_pagamento, 0) <> COALESCE(f."quantidadeOrdensPagamento", 0)
        OR COALESCE(m.documento_habil_principal, '') <> COALESCE(f."documentoHabilPrincipal", '')
        OR COALESCE(m.ordem_pagamento_principal, '') <> COALESCE(f."ordemPagamentoPrincipal", '')
        OR COALESCE(m.ordem_bancaria_principal, '') <> COALESCE(f."ordemBancariaPrincipal", '')
        OR COALESCE(m.situacao_pagamento, '') <> COALESCE(f."situacaoPagamento", '')
      )
    ORDER BY f."updatedAt" DESC, i.id ASC
  `);
};

const buildEvent = (change: FinancialSnapshotChange): ChangeEvent => {
  return {
    eventType: "alteracao_financeira_transferencia_especial",
    signature: [
      "tefin",
      change.instrument_id,
      change.pago_anterior ? "1" : "0",
      change.pago_atual ? "1" : "0",
      normalizeNumberSignature(change.valor_anterior),
      normalizeNumberSignature(change.valor_atual),
      normalizeDateSignature(change.data_ultimo_pagamento_anterior),
      normalizeDateSignature(change.data_ultimo_pagamento_atual),
      change.qtd_empenhos_anterior ?? 0,
      change.qtd_empenhos_atual,
      change.qtd_documentos_habeis_anterior ?? 0,
      change.qtd_documentos_habeis_atual,
      change.qtd_ordens_pagamento_anterior ?? 0,
      change.qtd_ordens_pagamento_atual,
      change.documento_habil_anterior ?? "",
      change.documento_habil_atual ?? "",
      change.ordem_pagamento_anterior ?? "",
      change.ordem_pagamento_atual ?? "",
      change.ordem_bancaria_anterior ?? "",
      change.ordem_bancaria_atual ?? "",
      change.situacao_pagamento_anterior ?? "",
      change.situacao_pagamento_atual ?? ""
    ].join(":")
  };
};

const removeAlreadyNotifiedChanges = async (changes: FinancialSnapshotChange[]) => {
  if (changes.length === 0) {
    return { pendingChanges: [], pendingEvents: [] };
  }

  const changeEvents = changes.map((change) => ({ change, event: buildEvent(change) }));
  const signatures = Array.from(new Set(changeEvents.map((item) => item.event.signature)));
  const existing = await prisma.$queryRaw<Array<{ event_signature: string }>>(Prisma.sql`
    SELECT event_signature
    FROM ${Prisma.raw(TABLE_CHANGES_NOTIFY)}
    WHERE event_signature IN (${Prisma.join(signatures.map((item) => Prisma.sql`${item}`))})
  `);
  const alreadySent = new Set(existing.map((item) => item.event_signature));
  const pending = changeEvents.filter((item) => !alreadySent.has(item.event.signature));

  return {
    pendingChanges: pending.map((item) => item.change),
    pendingEvents: pending.map((item) => item.event)
  };
};

const persistNotifications = async (events: ChangeEvent[], mode: NotifyMode) => {
  if (events.length === 0) {
    return;
  }

  const nowIso = new Date().toISOString();
  for (const event of events) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO ${Prisma.raw(TABLE_CHANGES_NOTIFY)} (
        event_type,
        event_signature,
        enviado_em,
        mode
      )
      VALUES (
        ${event.eventType},
        ${event.signature},
        ${nowIso},
        ${mode}
      )
    `);
  }
};

const buildRows = (changes: FinancialSnapshotChange[]) => {
  if (changes.length === 0) {
    return `<tr><td colspan="15">Nenhuma alteracao detalhada para exibir.</td></tr>`;
  }

  return changes.slice(0, MAX_DETAILS).map((item) => {
    return `<tr>
      <td>${escapeHtml(item.codigo_plano_acao)}</td>
      <td>${escapeHtml(item.nome_beneficiario)}</td>
      <td>${escapeHtml(item.uf)}</td>
      <td>${escapeHtml(item.parlamentar)}</td>
      <td>${escapeHtml(formatBool(item.pago_anterior))}</td>
      <td><strong>${escapeHtml(formatBool(item.pago_atual))}</strong></td>
      <td>${escapeHtml(formatMoney(item.valor_anterior))}</td>
      <td><strong>${escapeHtml(formatMoney(item.valor_atual))}</strong></td>
      <td>${escapeHtml(formatDate(item.data_ultimo_pagamento_anterior))}</td>
      <td><strong>${escapeHtml(formatDate(item.data_ultimo_pagamento_atual))}</strong></td>
      <td>${escapeHtml(item.qtd_documentos_habeis_anterior ?? 0)} -> <strong>${escapeHtml(item.qtd_documentos_habeis_atual)}</strong></td>
      <td>${escapeHtml(item.qtd_ordens_pagamento_anterior ?? 0)} -> <strong>${escapeHtml(item.qtd_ordens_pagamento_atual)}</strong></td>
      <td>${escapeHtml(item.documento_habil_atual)}</td>
      <td>${escapeHtml(item.ordem_pagamento_atual)}</td>
      <td>${escapeHtml(item.ordem_bancaria_atual)}</td>
    </tr>`;
  }).join("");
};

const sendNotificationEmail = async (changes: FinancialSnapshotChange[], mode: NotifyMode) => {
  const recipients = listNotificationRecipients();
  if (recipients.length === 0) {
    return;
  }

  const auth = new google.auth.OAuth2(env.gmailClientId, env.gmailClientSecret);
  auth.setCredentials({ refresh_token: env.gmailRefreshToken });
  const gmail = google.gmail({ version: "v1", auth });

  const now = new Date().toLocaleString("pt-BR");
  const subject = `[GestConv360] Alteracoes financeiras em Transferencias Especiais (${changes.length})`;
  const html = `<!doctype html><html><body style="font-family:Segoe UI,Arial,sans-serif;color:#102a43;padding:16px;">
    <h2>Alteracoes financeiras - Transferencias Especiais</h2>
    <p>Foram detectadas <strong>${changes.length}</strong> alteracoes financeiras em ${now}.</p>
    <p>Origem: <strong>${mode === "manual" ? "manual" : "monitoramento automatico"}</strong></p>
    <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-size:12px;">
      <thead>
        <tr>
          <th>Plano de acao</th>
          <th>Beneficiario</th>
          <th>UF</th>
          <th>Parlamentar</th>
          <th>Pago antes</th>
          <th>Pago agora</th>
          <th>Valor anterior</th>
          <th>Valor atual</th>
          <th>Ultimo pagamento antes</th>
          <th>Ultimo pagamento atual</th>
          <th>Docs habeis</th>
          <th>Ordens pagamento</th>
          <th>Doc habil atual</th>
          <th>OP atual</th>
          <th>OB atual</th>
        </tr>
      </thead>
      <tbody>${buildRows(changes)}</tbody>
    </table>
    <p style="margin-top:12px;">Mensagem automatica do GestConv360.</p>
  </body></html>`;

  const textLines = [
    "Alteracoes financeiras - Transferencias Especiais",
    `Origem: ${mode === "manual" ? "manual" : "monitoramento automatico"}`,
    `Total: ${changes.length}`,
    `Referencia: ${now}`,
    ""
  ];
  for (const item of changes.slice(0, MAX_DETAILS)) {
    textLines.push(
      `- ${item.codigo_plano_acao} | ${item.nome_beneficiario ?? "-"}-${item.uf ?? "-"} | pago ${formatBool(item.pago_anterior)} -> ${formatBool(item.pago_atual)} | ${formatMoney(item.valor_anterior)} -> ${formatMoney(item.valor_atual)} | OB ${item.ordem_bancaria_atual ?? "-"}`
    );
  }

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
      buildGmailSendFailureMessage("Falha no disparo de notificacao financeira de transferencias especiais", error)
    );
  }
};

export const monitorarAlteracoesFinanceirasTransferenciasEspeciais = async (
  mode: NotifyMode = "sync"
): Promise<FinancialNotifyResult> => {
  await ensureMonitorTables();

  const [monitorCount, currentCount] = await Promise.all([
    countRows(TABLE_MONITOR),
    countCurrentFinancialRows()
  ]);

  if (monitorCount === 0) {
    await refreshBaselineSnapshot();
    return {
      modo: mode,
      total_monitorados: currentCount,
      total_alteracoes: 0,
      notificacao_enviada: false,
      mensagem: "Baseline financeiro de transferencias especiais inicializado. Notificacao sera enviada a partir da proxima alteracao."
    };
  }

  const changes = await loadChanges();
  const { pendingChanges, pendingEvents } = await removeAlreadyNotifiedChanges(changes);

  if (pendingChanges.length === 0) {
    await refreshBaselineSnapshot();
    return {
      modo: mode,
      total_monitorados: currentCount,
      total_alteracoes: 0,
      notificacao_enviada: false,
      mensagem: "Nenhuma alteracao financeira nova detectada em transferencias especiais."
    };
  }

  if (!env.transferenciasEspeciaisNotifyEnabled) {
    await refreshBaselineSnapshot();
    return {
      modo: mode,
      total_monitorados: currentCount,
      total_alteracoes: pendingChanges.length,
      notificacao_enviada: false,
      mensagem: "Alteracoes financeiras detectadas, mas notificacao por email esta desativada."
    };
  }

  if (!isNotifierConfigured()) {
    await refreshBaselineSnapshot();
    return {
      modo: mode,
      total_monitorados: currentCount,
      total_alteracoes: pendingChanges.length,
      notificacao_enviada: false,
      mensagem: "Alteracoes financeiras detectadas, mas configuracao de envio de email esta incompleta."
    };
  }

  await sendNotificationEmail(pendingChanges, mode);
  await persistNotifications(pendingEvents, mode);
  await refreshBaselineSnapshot();

  return {
    modo: mode,
    total_monitorados: currentCount,
    total_alteracoes: pendingChanges.length,
    notificacao_enviada: true,
    mensagem: `Notificacao financeira enviada com sucesso (${pendingChanges.length} alteracoes).`
  };
};
