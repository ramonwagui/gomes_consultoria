import { google } from "googleapis";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { buildGmailSendFailureMessage } from "../email/gmail-health.service";
import { listarPlanosAcaoEspeciais } from "./transferencias-especiais.service";

const TABLE_MONITOR = "transferencias_especiais_monitor";

type PlanoSituacaoSnapshot = {
  codigo_plano_acao: string;
  ano_plano_acao: number;
  situacao_plano_acao: string;
  nome_beneficiario_plano_acao: string;
  uf_beneficiario_plano_acao: string;
  nome_parlamentar_emenda_plano_acao: string | null;
};

type PendingChange = {
  codigo_plano_acao: string;
  ano_plano_acao: number;
  nome_beneficiario_plano_acao: string;
  uf_beneficiario_plano_acao: string;
  nome_parlamentar_emenda_plano_acao: string | null;
  situacao_anterior: string | null;
  situacao_atual: string;
};

let ensured = false;

const ensureMonitorTable = async () => {
  if (ensured) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${TABLE_MONITOR} (
      codigo_plano_acao TEXT PRIMARY KEY,
      ano_plano_acao INTEGER,
      nome_beneficiario_plano_acao TEXT,
      uf_beneficiario_plano_acao TEXT,
      nome_parlamentar_emenda_plano_acao TEXT,
      situacao_plano_acao TEXT NOT NULL,
      situacao_notificada TEXT,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL,
      notificado_em TEXT
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_te_monitor_atualizado_em ON ${TABLE_MONITOR} (atualizado_em)`
  );

  ensured = true;
};

const isNotifierConfigured = () => {
  const recipients = env.transferenciasEspeciaisNotifyEmails
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (recipients.length === 0) {
    return false;
  }

  return Boolean(env.gmailClientId && env.gmailClientSecret && env.gmailRefreshToken && env.gmailUserEmail);
};

const listNotificationRecipients = () => {
  return env.transferenciasEspeciaisNotifyEmails
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const loadFullSnapshot = async () => {
  const items: PlanoSituacaoSnapshot[] = [];
  let page = 1;
  const anoFiltro = Number.isFinite(env.transferenciasEspeciaisNotifyAno)
    ? env.transferenciasEspeciaisNotifyAno
    : new Date().getFullYear();

  while (true) {
    const response = await listarPlanosAcaoEspeciais({
      page,
      page_size: 100,
      ano: anoFiltro
    });
    for (const item of response.itens) {
      items.push({
        codigo_plano_acao: item.codigo_plano_acao,
        ano_plano_acao: item.ano_plano_acao,
        situacao_plano_acao: item.situacao_plano_acao,
        nome_beneficiario_plano_acao: item.nome_beneficiario_plano_acao,
        uf_beneficiario_plano_acao: item.uf_beneficiario_plano_acao,
        nome_parlamentar_emenda_plano_acao: item.nome_parlamentar_emenda_plano_acao
      });
    }

    if (!response.paginacao.tem_proxima) {
      break;
    }

    page += 1;
  }

  return items;
};

const upsertSnapshot = async (snapshot: PlanoSituacaoSnapshot[]) => {
  const nowIso = new Date().toISOString();

  for (const item of snapshot) {
    const existing = await prisma.$queryRawUnsafe<Array<{ situacao_plano_acao: string; situacao_notificada: string | null }>>(
      `SELECT situacao_plano_acao, situacao_notificada FROM ${TABLE_MONITOR} WHERE codigo_plano_acao = $1 LIMIT 1`,
      item.codigo_plano_acao
    );

    if (existing.length === 0) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO ${TABLE_MONITOR} (
            codigo_plano_acao,
            ano_plano_acao,
            nome_beneficiario_plano_acao,
            uf_beneficiario_plano_acao,
            nome_parlamentar_emenda_plano_acao,
            situacao_plano_acao,
            situacao_notificada,
            criado_em,
            atualizado_em,
            notificado_em
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        item.codigo_plano_acao,
        item.ano_plano_acao,
        item.nome_beneficiario_plano_acao,
        item.uf_beneficiario_plano_acao,
        item.nome_parlamentar_emenda_plano_acao,
        item.situacao_plano_acao,
        item.situacao_plano_acao,
        nowIso,
        nowIso,
        nowIso
      );
      continue;
    }

    if (existing[0].situacao_plano_acao === item.situacao_plano_acao) {
      await prisma.$executeRawUnsafe(
        `
          UPDATE ${TABLE_MONITOR}
          SET
            ano_plano_acao = $1,
            nome_beneficiario_plano_acao = $2,
            uf_beneficiario_plano_acao = $3,
            nome_parlamentar_emenda_plano_acao = $4,
            atualizado_em = $5
          WHERE codigo_plano_acao = $6
        `,
        item.ano_plano_acao,
        item.nome_beneficiario_plano_acao,
        item.uf_beneficiario_plano_acao,
        item.nome_parlamentar_emenda_plano_acao,
        nowIso,
        item.codigo_plano_acao
      );
      continue;
    }

    await prisma.$executeRawUnsafe(
      `
        UPDATE ${TABLE_MONITOR}
        SET
          ano_plano_acao = $1,
          nome_beneficiario_plano_acao = $2,
          uf_beneficiario_plano_acao = $3,
          nome_parlamentar_emenda_plano_acao = $4,
          situacao_plano_acao = $5,
          atualizado_em = $6
        WHERE codigo_plano_acao = $7
      `,
      item.ano_plano_acao,
      item.nome_beneficiario_plano_acao,
      item.uf_beneficiario_plano_acao,
      item.nome_parlamentar_emenda_plano_acao,
      item.situacao_plano_acao,
      nowIso,
      item.codigo_plano_acao
    );
  }
};

const listPendingChanges = async () => {
  return prisma.$queryRawUnsafe<PendingChange[]>(`
    SELECT
      codigo_plano_acao,
      COALESCE(ano_plano_acao, 0) AS ano_plano_acao,
      COALESCE(nome_beneficiario_plano_acao, '') AS nome_beneficiario_plano_acao,
      COALESCE(uf_beneficiario_plano_acao, '') AS uf_beneficiario_plano_acao,
      nome_parlamentar_emenda_plano_acao,
      situacao_notificada AS situacao_anterior,
      situacao_plano_acao AS situacao_atual
    FROM ${TABLE_MONITOR}
    WHERE COALESCE(situacao_notificada, '') <> COALESCE(situacao_plano_acao, '')
    ORDER BY atualizado_em DESC
    LIMIT 200
  `);
};

const markChangesAsNotified = async (changes: PendingChange[]) => {
  if (changes.length === 0) {
    return;
  }

  const nowIso = new Date().toISOString();
  for (const item of changes) {
    await prisma.$executeRawUnsafe(
      `
        UPDATE ${TABLE_MONITOR}
        SET situacao_notificada = situacao_plano_acao,
            notificado_em = $1
        WHERE codigo_plano_acao = $2
      `,
      nowIso,
      item.codigo_plano_acao
    );
  }
};

const encodeBase64Url = (input: string) => {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const sendNotificationEmail = async (changes: PendingChange[]) => {
  const recipients = listNotificationRecipients();
  if (recipients.length === 0) {
    return;
  }

  const auth = new google.auth.OAuth2(env.gmailClientId, env.gmailClientSecret);
  auth.setCredentials({ refresh_token: env.gmailRefreshToken });
  const gmail = google.gmail({ version: "v1", auth });

  const now = new Date().toLocaleString("pt-BR");
  const subject = `[GestConv360] Alteracao de situacao em Plano de Acao (${changes.length})`;
  const rows = changes
    .map((item) => {
      const parlamentar = item.nome_parlamentar_emenda_plano_acao ?? "-";
      const situacaoAnterior = item.situacao_anterior ?? "(nao informada)";
      return `<tr>
        <td>${item.codigo_plano_acao}</td>
        <td>${item.ano_plano_acao}</td>
        <td>${item.nome_beneficiario_plano_acao}</td>
        <td>${item.uf_beneficiario_plano_acao}</td>
        <td>${parlamentar}</td>
        <td>${situacaoAnterior}</td>
        <td><strong>${item.situacao_atual}</strong></td>
      </tr>`;
    })
    .join("");

  const html = `<!doctype html><html><body style="font-family:Segoe UI,Arial,sans-serif;color:#102a43;padding:16px;">
    <h2>Alteracao de situacao - Planos de Acao (Transferencias Especiais)</h2>
    <p>Foram detectadas <strong>${changes.length}</strong> alteracoes em ${now}.</p>
    <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-size:12px;">
      <thead>
        <tr>
          <th>Codigo</th>
          <th>Ano</th>
          <th>Beneficiario</th>
          <th>UF</th>
          <th>Parlamentar</th>
          <th>Situacao anterior</th>
          <th>Situacao atual</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:12px;">Mensagem automatica do GestConv360.</p>
  </body></html>`;

  const textLines = [
    "Alteracao de situacao - Planos de Acao (Transferencias Especiais)",
    `Detectadas ${changes.length} alteracoes em ${now}.`,
    ""
  ];
  for (const item of changes) {
    textLines.push(
      `- ${item.codigo_plano_acao} | ${item.nome_beneficiario_plano_acao}/${item.uf_beneficiario_plano_acao} | ${item.situacao_anterior ?? "(n/a)"} -> ${item.situacao_atual}`
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
    throw new Error(buildGmailSendFailureMessage("Falha no disparo de notificacao de transferencias especiais", error));
  }
};

export const monitorarMudancasSituacaoTransferenciasEspeciais = async () => {
  await ensureMonitorTable();

  const snapshot = await loadFullSnapshot();
  await upsertSnapshot(snapshot);
  const pendingChanges = await listPendingChanges();

  if (pendingChanges.length === 0) {
    return {
      monitorados: snapshot.length,
      alteracoes_detectadas: 0,
      notificadas: 0,
      notificacao_enviada: false,
      mensagem: "Nenhuma alteracao de situacao detectada."
    };
  }

  if (!env.transferenciasEspeciaisNotifyEnabled) {
    return {
      monitorados: snapshot.length,
      alteracoes_detectadas: pendingChanges.length,
      notificadas: 0,
      notificacao_enviada: false,
      mensagem: "Alteracoes detectadas, mas notificacao por email esta desativada."
    };
  }

  if (!isNotifierConfigured()) {
    return {
      monitorados: snapshot.length,
      alteracoes_detectadas: pendingChanges.length,
      notificadas: 0,
      notificacao_enviada: false,
      mensagem: "Alteracoes detectadas, mas configuracao de envio de email esta incompleta."
    };
  }

  await sendNotificationEmail(pendingChanges);
  await markChangesAsNotified(pendingChanges);

  return {
    monitorados: snapshot.length,
    alteracoes_detectadas: pendingChanges.length,
    notificadas: pendingChanges.length,
    notificacao_enviada: true,
    mensagem: "Notificacao enviada com sucesso."
  };
};
