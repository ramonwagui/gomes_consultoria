import OpenAI from "openai";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";

type TicketSummary = {
  resumo: string;
  checklist: string[];
  acao_sugerida: string;
  instrumento_identificado: string | null;
};

type InstrumentHint = {
  proposta: string | null;
  instrumento: string | null;
};

type SenderNameHint = {
  nome: string | null;
};

const getOpenAIClient = () => {
  if (!env.openaiApiKey || !env.aiTicketSummaryEnabled) {
    return null;
  }
  return new OpenAI({ apiKey: env.openaiApiKey });
};

const safeParseJson = <T>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      return null;
    }
  }
};

const buildSummaryPrompt = (subject: string, body: string, fromEmail: string) => {
  return `Voce analisa emails com solicitacoes e pendencias de convenios.

Retorne APENAS JSON valido neste formato:
{
  "resumo": "Resumo curto de 3 a 5 linhas",
  "checklist": ["Acao 1", "Acao 2"],
  "acao_sugerida": "Acao recomendada",
  "instrumento_identificado": "Numero de proposta ou instrumento, ou null"
}

Regras:
- Resumo com no maximo 240 caracteres.
- Checklist com frases curtas e acionaveis.
- Nao repita texto completo do email.
- Se nao houver numero de proposta/instrumento, use null.

Remetente: ${fromEmail}
Assunto: ${subject || "(sem assunto)"}
Corpo:
${body}`;
};

const buildInstrumentPrompt = (
  subject: string,
  body: string,
  instruments: Array<{ proposta: string; instrumento: string | null }>
) => {
  const instrumentList = instruments
    .map((item) => `- proposta=${item.proposta}; instrumento=${item.instrumento ?? ""}`)
    .join("\n");

  return `Voce identifica referencia de proposta/instrumento em email.

Retorne APENAS JSON valido no formato:
{
  "proposta": "string ou null",
  "instrumento": "string ou null"
}

Instrumentos disponiveis:
${instrumentList || "(vazio)"}

Assunto: ${subject}
Corpo:
${body}`;
};

const buildSenderNamePrompt = (fromEmail: string, body: string) => {
  return `Voce identifica o nome do remetente no corpo de um email.

Retorne APENAS JSON valido no formato:
{
  "nome": "string ou null"
}

Regras:
- Priorize assinatura no final do email.
- Se houver somente email, retorne null.
- Nao invente nome.

Email remetente: ${fromEmail}
Corpo:
${body}`;
};

export const generateTicketSummary = async (
  subject: string,
  body: string,
  fromEmail: string
): Promise<TicketSummary | null> => {
  const client = getOpenAIClient();
  if (!client) {
    return null;
  }

  try {
    const truncatedBody = body.length > 5000 ? `${body.slice(0, 5000)}\n\n[texto truncado]` : body;

    const response = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.2,
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: "Retorne somente JSON valido. Nao use markdown."
        },
        {
          role: "user",
          content: buildSummaryPrompt(subject, truncatedBody, fromEmail)
        }
      ]
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return null;
    }

    const parsed = safeParseJson<TicketSummary>(content);
    if (!parsed) {
      return null;
    }

    return {
      resumo: (parsed.resumo ?? "").trim(),
      checklist: Array.isArray(parsed.checklist)
        ? parsed.checklist.map((item) => String(item).trim()).filter((item) => item.length > 0)
        : [],
      acao_sugerida: (parsed.acao_sugerida ?? "").trim(),
      instrumento_identificado: parsed.instrumento_identificado ? String(parsed.instrumento_identificado).trim() : null
    };
  } catch {
    return null;
  }
};

export const identifyInstrumentWithAI = async (subject: string, body: string): Promise<InstrumentHint | null> => {
  const client = getOpenAIClient();
  if (!client) {
    return null;
  }

  try {
    const instruments = await prisma.instrumentProposal.findMany({
      where: { ativo: true },
      select: { proposta: true, instrumento: true },
      take: 80
    });

    if (instruments.length === 0) {
      return null;
    }

    const truncatedBody = body.length > 3500 ? `${body.slice(0, 3500)}\n\n[texto truncado]` : body;

    const response = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0,
      max_tokens: 250,
      messages: [
        {
          role: "system",
          content: "Retorne somente JSON valido. Nao use markdown."
        },
        {
          role: "user",
          content: buildInstrumentPrompt(subject, truncatedBody, instruments)
        }
      ]
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return null;
    }

    const parsed = safeParseJson<InstrumentHint>(content);
    if (!parsed) {
      return null;
    }

    return {
      proposta: parsed.proposta ? String(parsed.proposta).trim() : null,
      instrumento: parsed.instrumento ? String(parsed.instrumento).trim() : null
    };
  } catch {
    return null;
  }
};

export const identifySenderNameWithAI = async (fromEmail: string, body: string): Promise<string | null> => {
  const client = getOpenAIClient();
  if (!client) {
    return null;
  }

  try {
    const truncatedBody = body.length > 3500 ? `${body.slice(0, 3500)}\n\n[texto truncado]` : body;

    const response = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content: "Retorne somente JSON valido. Nao use markdown."
        },
        {
          role: "user",
          content: buildSenderNamePrompt(fromEmail, truncatedBody)
        }
      ]
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return null;
    }

    const parsed = safeParseJson<SenderNameHint>(content);
    if (!parsed || !parsed.nome) {
      return null;
    }

    const nome = parsed.nome.trim();
    return nome.length >= 3 ? nome.slice(0, 120) : null;
  } catch {
    return null;
  }
};

export const formatTicketDescriptionWithAI = (
  summary: TicketSummary,
  fromEmail: string,
  subject: string,
  receivedAt: Date | null
) => {
  const lines: string[] = [
    "Resumo IA:",
    summary.resumo || "Sem resumo.",
    "",
    "Checklist sugerido:"
  ];

  if (summary.checklist.length === 0) {
    lines.push("- Nenhuma acao objetiva identificada.");
  } else {
    for (const item of summary.checklist) {
      lines.push(`- ${item}`);
    }
  }

  lines.push("");
  lines.push("Acao sugerida:");
  lines.push(summary.acao_sugerida || "Sem acao sugerida.");
  lines.push("");
  lines.push("---");
  lines.push(`Origem: EMAIL`);
  lines.push(`Remetente: ${fromEmail}`);
  lines.push(`Assunto: ${subject || "(sem assunto)"}`);
  lines.push(`Recebido em: ${receivedAt ? receivedAt.toISOString() : "desconhecido"}`);

  return lines.join("\n").slice(0, 4000);
};

export const getChecklistFromSummary = (summary: TicketSummary) => {
  return summary.checklist.map((item) => item.trim()).filter((item) => item.length >= 3).slice(0, 20);
};
