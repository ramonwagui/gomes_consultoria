import { Prisma } from "@prisma/client";
import { google } from "googleapis";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { buildGmailSendFailureMessage } from "../email/gmail-health.service";
import { ensureTransferenciasDiscricionariasStorage } from "./transferencias-discricionarias.service";

const TABLE_MAIN = "transferencias_discricionarias";
const TABLE_NOTIFY = "transferencias_discricionarias_vigencia_notificacoes";

const VIGENCIA_FIM_NORMALIZED_SQL =
  "NULLIF(regexp_replace(TRIM(dia_fim_vigencia), '[ T].*$', ''), '')";

const VIGENCIA_FIM_DATE_SQL =
  "CASE " +
  `WHEN ${VIGENCIA_FIM_NORMALIZED_SQL} ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' AND to_char(to_date(${VIGENCIA_FIM_NORMALIZED_SQL}, 'DD/MM/YYYY'), 'DD/MM/YYYY') = ${VIGENCIA_FIM_NORMALIZED_SQL} THEN to_date(${VIGENCIA_FIM_NORMALIZED_SQL}, 'DD/MM/YYYY') ` +
  `WHEN ${VIGENCIA_FIM_NORMALIZED_SQL} ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}$' AND to_char(to_date(${VIGENCIA_FIM_NORMALIZED_SQL}, 'DD-MM-YYYY'), 'DD-MM-YYYY') = ${VIGENCIA_FIM_NORMALIZED_SQL} THEN to_date(${VIGENCIA_FIM_NORMALIZED_SQL}, 'DD-MM-YYYY') ` +
  `WHEN ${VIGENCIA_FIM_NORMALIZED_SQL} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND to_char(to_date(${VIGENCIA_FIM_NORMALIZED_SQL}, 'YYYY-MM-DD'), 'YYYY-MM-DD') = ${VIGENCIA_FIM_NORMALIZED_SQL} THEN to_date(${VIGENCIA_FIM_NORMALIZED_SQL}, 'YYYY-MM-DD') ` +
  "ELSE NULL END";

type NotifyMode = "manual" | "auto";

type NotifyCandidate = {
  item_chave: string;
  nr_convenio: string | null;
  nr_proposta: string | null;
  cnpj: string | null;
  nome_proponente: string | null;
  uf: string | null;
  dia_fim_vigencia_iso: string;
  dias_para_vencimento: number;
};

type NotifyResult = {
  modo: NotifyMode;
  dias_monitorados: number[];
  monitorados: number;
  elegiveis: number;
  enviados: number;
  suprimidos_ja_notificados: number;
  notificacao_enviada: boolean;
  mensagem: string;
};

let notifyTableEnsured = false;

const ensureNotifyTable = async () => {
  if (notifyTableEnsured) {
    return;
  }

  await ensureTransferenciasDiscricionariasStorage();

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NOTIFY} (
      id SERIAL PRIMARY KEY,
      item_chave TEXT NOT NULL,
      dias_janela INTEGER NOT NULL,
      dia_fim_vigencia TEXT,
      nr_convenio TEXT,
      nr_proposta TEXT,
      cnpj TEXT,
      nome_proponente TEXT,
      uf TEXT,
      destinatarios TEXT NOT NULL,
      enviado_em TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'auto'
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_td_notify_unique_key ON ${TABLE_NOTIFY} (item_chave, dias_janela, mode)`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_td_notify_enviado_em ON ${TABLE_NOTIFY} (enviado_em)`
  );

  notifyTableEnsured = true;
};

const parseNotifyDays = (raw: string) => {
  const valid = new Set<number>();

  for (const piece of raw.split(",")) {
    const parsed = Number(piece.trim());
    if ([30, 60, 90].includes(parsed)) {
      valid.add(parsed);
    }
  }

  return Array.from(valid).sort((a, b) => b - a);
};

const getNotifyDays = () => {
  const parsed = parseNotifyDays(env.transferenciasDiscricionariasNotifyDays);
  return parsed.length > 0 ? parsed : [90, 60, 30];
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

const escapeHtml = (value: string | null | undefined) => {
  const source = value ?? "";
  return source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const encodeBase64Url = (input: string) => {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const listNotifyCandidates = async (days: number[], mode: NotifyMode) => {
  if (days.length === 0) {
    return [] as NotifyCandidate[];
  }

  const dayValues = Prisma.join(days.map((item) => Prisma.sql`${item}`));
  const vigenciaFimDateExpr = Prisma.raw(VIGENCIA_FIM_DATE_SQL);
  const maxDays = Math.max(...days);
  const dayFilterClause =
    mode === "auto"
      ? Prisma.sql`dias_para_vencimento IN (${dayValues})`
      : Prisma.sql`dias_para_vencimento >= 0 AND dias_para_vencimento <= ${maxDays}`;

  return prisma.$queryRaw<NotifyCandidate[]>(Prisma.sql`
    WITH ranked AS (
      SELECT
        COALESCE(NULLIF(nr_convenio_norm, ''), NULLIF(nr_convenio, ''), NULLIF(nr_proposta, ''), chave_unica) AS item_chave,
        nr_convenio,
        nr_proposta,
        cnpj,
        nome_proponente,
        uf,
        to_char(${vigenciaFimDateExpr}, 'YYYY-MM-DD') AS dia_fim_vigencia_iso,
        CAST((${vigenciaFimDateExpr} - CURRENT_DATE) AS INTEGER) AS dias_para_vencimento,
        ROW_NUMBER() OVER (
          PARTITION BY COALESCE(NULLIF(nr_convenio_norm, ''), NULLIF(nr_convenio, ''), NULLIF(nr_proposta, ''), chave_unica)
          ORDER BY id DESC
        ) AS row_rank
      FROM ${Prisma.raw(TABLE_MAIN)}
      WHERE ${vigenciaFimDateExpr} IS NOT NULL
        AND nr_convenio IS NOT NULL
        AND TRIM(nr_convenio) <> ''
        AND situacao_convenio IS NOT NULL
        AND TRIM(situacao_convenio) <> ''
        AND situacao_convenio ILIKE 'Em execu%'
    )
    SELECT
      item_chave,
      nr_convenio,
      nr_proposta,
      cnpj,
      nome_proponente,
      uf,
      dia_fim_vigencia_iso,
      dias_para_vencimento
    FROM ranked
    WHERE row_rank = 1
      AND ${dayFilterClause}
    ORDER BY dias_para_vencimento ASC, dia_fim_vigencia_iso ASC, item_chave ASC
  `);
};

const filterAutoUnsentCandidates = async (candidates: NotifyCandidate[]) => {
  if (candidates.length === 0) {
    return {
      pending: [] as NotifyCandidate[],
      skipped: 0
    };
  }

  const keys = Array.from(new Set(candidates.map((item) => item.item_chave)));
  const days = Array.from(new Set(candidates.map((item) => item.dias_para_vencimento)));

  const existing = await prisma.$queryRaw<Array<{ item_chave: string; dias_janela: number | bigint | string }>>(Prisma.sql`
    SELECT item_chave, dias_janela
    FROM ${Prisma.raw(TABLE_NOTIFY)}
    WHERE mode = ${"auto"}
      AND item_chave IN (${Prisma.join(keys.map((item) => Prisma.sql`${item}`))})
      AND dias_janela IN (${Prisma.join(days.map((item) => Prisma.sql`${item}`))})
  `);

  const sentSet = new Set(existing.map((item) => `${item.item_chave}:${Number(item.dias_janela)}`));
  const pending = candidates.filter((item) => !sentSet.has(`${item.item_chave}:${item.dias_para_vencimento}`));

  return {
    pending,
    skipped: candidates.length - pending.length
  };
};

const persistAutoNotifications = async (items: NotifyCandidate[], recipients: string[]) => {
  if (items.length === 0) {
    return;
  }

  const nowIso = new Date().toISOString();
  const recipientsText = recipients.join(", ");

  for (const item of items) {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO ${Prisma.raw(TABLE_NOTIFY)} (
          item_chave,
          dias_janela,
          dia_fim_vigencia,
          nr_convenio,
          nr_proposta,
          cnpj,
          nome_proponente,
          uf,
          destinatarios,
          enviado_em,
          mode
        )
        VALUES (
          ${item.item_chave},
          ${item.dias_para_vencimento},
          ${item.dia_fim_vigencia_iso},
          ${item.nr_convenio},
          ${item.nr_proposta},
          ${item.cnpj},
          ${item.nome_proponente},
          ${item.uf},
          ${recipientsText},
          ${nowIso},
          ${"auto"}
        )
        ON CONFLICT (item_chave, dias_janela, mode) DO NOTHING
      `
    );
  }
};

const sendNotificationEmail = async (items: NotifyCandidate[], mode: NotifyMode) => {
  const recipients = listNotificationRecipients();
  if (recipients.length === 0 || items.length === 0) {
    return recipients;
  }

  const auth = new google.auth.OAuth2(env.gmailClientId, env.gmailClientSecret);
  auth.setCredentials({ refresh_token: env.gmailRefreshToken });
  const gmail = google.gmail({ version: "v1", auth });

  const nowLabel = new Date().toLocaleString("pt-BR");
  const subject = `[GestConv360] Alerta de vigencia a vencer (${items.length})`;
  const rows = items
    .map((item) => {
      return `<tr>
        <td>${item.dias_para_vencimento}</td>
        <td>${escapeHtml(item.dia_fim_vigencia_iso)}</td>
        <td>${escapeHtml(item.nr_convenio ?? "-")}</td>
        <td>${escapeHtml(item.nr_proposta ?? "-")}</td>
        <td>${escapeHtml(item.nome_proponente ?? "-")}</td>
        <td>${escapeHtml(item.uf ?? "-")}</td>
        <td>${escapeHtml(item.cnpj ?? "-")}</td>
      </tr>`;
    })
    .join("");

  const html = `<!doctype html><html><body style="font-family:Segoe UI,Arial,sans-serif;color:#102a43;padding:16px;">
    <h2>Alertas de vigencia - Transferencias Discricionarias</h2>
    <p>Foram encontrados <strong>${items.length}</strong> convenios/propostas com vencimento em 90, 60 ou 30 dias.</p>
    <p>Disparo: <strong>${mode === "manual" ? "manual" : "automatico"}</strong> | Referencia: ${nowLabel}</p>
    <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-size:12px;">
      <thead>
        <tr>
          <th>Dias p/ vencer</th>
          <th>Fim vigencia</th>
          <th>Nr convenio</th>
          <th>Nr proposta</th>
          <th>Proponente</th>
          <th>UF</th>
          <th>CNPJ</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:12px;">Mensagem automatica do GestConv360.</p>
  </body></html>`;

  const textLines = [
    "Alertas de vigencia - Transferencias Discricionarias",
    `Disparo: ${mode === "manual" ? "manual" : "automatico"}`,
    `Detectados ${items.length} registros em ${nowLabel}`,
    ""
  ];

  for (const item of items) {
    textLines.push(
      `- ${item.dias_para_vencimento}d | fim ${item.dia_fim_vigencia_iso} | convenio ${item.nr_convenio ?? "-"} | proposta ${item.nr_proposta ?? "-"} | ${item.nome_proponente ?? "-"}`
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
    throw new Error(buildGmailSendFailureMessage("Falha no disparo de alerta de vigencia", error));
  }

  return recipients;
};

export const dispararNotificacoesVigenciaTransferenciasDiscricionarias = async (
  mode: NotifyMode = "manual"
): Promise<NotifyResult> => {
  await ensureNotifyTable();

  const monitorDays = getNotifyDays();
  const monitorados = await prisma.$queryRaw<Array<{ total: number | bigint | string }>>(
    Prisma.sql`SELECT COUNT(*) AS total FROM ${Prisma.raw(TABLE_MAIN)}`
  );
  const monitoradosTotal = Number(monitorados[0]?.total ?? 0);

  const candidates = await listNotifyCandidates(monitorDays, mode);
  const eligibleBeforeMode = candidates.length;

  if (mode === "auto" && !env.transferenciasDiscricionariasNotifyEnabled) {
    return {
      modo: mode,
      dias_monitorados: monitorDays,
      monitorados: monitoradosTotal,
      elegiveis: eligibleBeforeMode,
      enviados: 0,
      suprimidos_ja_notificados: 0,
      notificacao_enviada: false,
      mensagem: "Alerta de vigencia desativado por configuracao."
    };
  }

  if (!isNotifierConfigured()) {
    return {
      modo: mode,
      dias_monitorados: monitorDays,
      monitorados: monitoradosTotal,
      elegiveis: eligibleBeforeMode,
      enviados: 0,
      suprimidos_ja_notificados: 0,
      notificacao_enviada: false,
      mensagem: "Configuracao de envio de email incompleta para notificacoes de vigencia."
    };
  }

  const autoFiltered =
    mode === "auto"
      ? await filterAutoUnsentCandidates(candidates)
      : { pending: candidates, skipped: 0 };

  if (autoFiltered.pending.length === 0) {
    return {
      modo: mode,
      dias_monitorados: monitorDays,
      monitorados: monitoradosTotal,
      elegiveis: eligibleBeforeMode,
      enviados: 0,
      suprimidos_ja_notificados: autoFiltered.skipped,
      notificacao_enviada: false,
      mensagem:
        mode === "auto"
          ? "Nenhum novo alerta para envio automatico (90/60/30 ja notificados)."
          : "Nenhum convenio/proposta elegivel para alerta de vigencia (90/60/30 dias)."
    };
  }

  const recipients = await sendNotificationEmail(autoFiltered.pending, mode);

  if (mode === "auto") {
    await persistAutoNotifications(autoFiltered.pending, recipients);
  }

  return {
    modo: mode,
    dias_monitorados: monitorDays,
    monitorados: monitoradosTotal,
    elegiveis: eligibleBeforeMode,
    enviados: autoFiltered.pending.length,
    suprimidos_ja_notificados: autoFiltered.skipped,
    notificacao_enviada: autoFiltered.pending.length > 0,
    mensagem:
      mode === "manual"
        ? `Disparo manual concluido: ${autoFiltered.pending.length} alerta(s) enviado(s).`
        : `Disparo automatico concluido: ${autoFiltered.pending.length} alerta(s) enviado(s).`
  };
};
