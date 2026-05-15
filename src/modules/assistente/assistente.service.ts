import { AssistenteChatRole, InstrumentFlowType, InstrumentStatus } from "@prisma/client";
import OpenAI from "openai";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { hybridSearchKnowledge } from "./assistente-pgvector.service";
import type { AssistentePerguntaInput } from "./assistente.schema";

type AssistenteIntencao =
  | "desembolso_cidade"
  | "convenios_cidade"
  | "instrumentos_municipio_status"
  | "instrumentos_vencendo_com_tickets"
  | "percentual_obra"
  | "obras_percentual_alto_desembolso_baixo"
  | "tickets_atrasados_sem_responsavel"
  | "tickets_por_instrumento"
  | "vigencias_instrumentos"
  | "ranking_cidades_desembolso"
  | "transferencias_especiais_cnpj"
  | "transferencias_especiais_municipio"
  | "transferencias_especiais_divergentes"
  | "busca_conhecimento"
  | "nao_entendida";
type AssistenteConfianca = "alta" | "media" | "baixa";

type AssistenteResposta = {
  pergunta: string;
  session_id?: string;
  intencao: AssistenteIntencao;
  confianca: AssistenteConfianca;
  resposta: string;
  dados?: Record<string, unknown>;
  sugestoes: string[];
  contexto_usado?: boolean;
  pergunta_interpretada?: string;
  fontes_consultadas?: string[];
};

const SUGESTOES_PADRAO = [
  "Qual valor de desembolso ja foi feito para a cidade de Parnamirim?",
  "Em quantos por cento esta a obra 123?",
  "Quais tickets estao atrasados e sem responsavel?",
  "Quais instrumentos ja venceram ou vencem em 30 dias?",
  "Mostre o ranking de cidades por desembolso",
  "Quais transferencias especiais existem para o CNPJ 11361227000189?"
];

const ASSISTENTE_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_knowledge_base",
      description:
        "Busca contexto na base hibrida (lexical + semantica) para perguntas abertas sobre convenios, documentos, pendencias, repasses e historico.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Consulta livre do usuario" },
          entity_type: {
            type: "string",
            enum: ["instrumento", "ticket", "documento"],
            description: "Filtro opcional de entidade"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_convenios_por_cidade",
      description: "Retorna quantidade de convenios/instrumentos cadastrados para uma cidade.",
      parameters: {
        type: "object",
        properties: {
          cidade: { type: "string", description: "Nome da cidade alvo da consulta." },
          status: {
            type: "string",
            enum: ["EM_EXECUCAO", "CONCLUIDO", "VENCIDO", "EM_ELABORACAO"],
            description: "Status opcional para filtrar os instrumentos da cidade."
          }
        },
        required: ["cidade"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_instrumentos_por_municipio_status",
      description: "Lista ou resume instrumentos de um municipio, com filtro opcional por status.",
      parameters: {
        type: "object",
        properties: {
          cidade: { type: "string", description: "Nome da cidade alvo da consulta." },
          status: {
            type: "string",
            enum: ["EM_EXECUCAO", "CONCLUIDO", "VENCIDO", "EM_ELABORACAO", "ASSINADO", "PRESTACAO_PENDENTE"],
            description: "Status opcional para filtrar os instrumentos."
          }
        },
        required: ["cidade"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_instrumentos_vencendo_com_tickets",
      description: "Retorna instrumentos vencidos ou a vencer que possuem tickets vinculados.",
      parameters: {
        type: "object",
        properties: {
          cidade: { type: "string", description: "Filtro opcional por cidade." },
          dias: { type: "number", description: "Janela de dias para vencimento futuro." }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_desembolso_por_cidade",
      description: "Retorna o desembolso consolidado para uma cidade.",
      parameters: {
        type: "object",
        properties: {
          cidade: { type: "string", description: "Nome da cidade alvo da consulta." }
        },
        required: ["cidade"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_obras_percentual_alto_desembolso_baixo",
      description: "Retorna obras com percentual de execucao alto e desembolso baixo.",
      parameters: {
        type: "object",
        properties: {
          percentual_minimo: { type: "number", description: "Percentual minimo de execucao." },
          desembolso_maximo_ratio: { type: "number", description: "Razao maxima entre desembolso e valor de repasse." },
          cidade: { type: "string", description: "Filtro opcional por cidade." }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_percentual_obra",
      description: "Retorna percentual de execucao de uma obra por id, proposta ou instrumento.",
      parameters: {
        type: "object",
        properties: {
          referencia: { type: "string", description: "ID da obra, numero da proposta ou instrumento." }
        },
        required: ["referencia"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_tickets_por_instrumento",
      description: "Retorna tickets vinculados a um instrumento, proposta ou id de obra.",
      parameters: {
        type: "object",
        properties: {
          referencia: { type: "string", description: "ID, proposta ou instrumento." }
        },
        required: ["referencia"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_tickets_atrasados_sem_responsavel",
      description: "Retorna total e amostra de tickets atrasados e sem responsavel.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_transferencias_especiais_por_cnpj",
      description: "Retorna plano(s) de acao de transferencias especiais vinculados a um CNPJ beneficiario.",
      parameters: {
        type: "object",
        properties: {
          cnpj: { type: "string", description: "CNPJ do beneficiario com ou sem mascara." }
        },
        required: ["cnpj"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_transferencias_especiais_por_municipio",
      description: "Retorna plano(s) de acao de transferencias especiais de um municipio.",
      parameters: {
        type: "object",
        properties: {
          cidade: { type: "string", description: "Nome da cidade alvo da consulta." }
        },
        required: ["cidade"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_transferencias_especiais_divergentes",
      description: "Retorna transferencias especiais com divergencia entre status do painel publico e da API.",
      parameters: {
        type: "object",
        properties: {
          cidade: { type: "string", description: "Filtro opcional por cidade." },
          cnpj: { type: "string", description: "Filtro opcional por CNPJ." },
          top: { type: "number", description: "Quantidade maxima de registros." }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_vigencias_instrumentos",
      description: "Retorna instrumentos vencidos ou a vencer em janela de dias.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["vencidas", "a_vencer"] },
          dias: { type: "number", description: "Janela em dias quando status for a_vencer." }
        },
        required: ["status"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_ranking_cidades_desembolso",
      description: "Retorna ranking das cidades por desembolso consolidado.",
      parameters: {
        type: "object",
        properties: {
          top: { type: "number", description: "Quantidade maxima de cidades no ranking." }
        },
        required: []
      }
    }
  }
];

const getOpenAIClient = () => {
  if (!env.openaiApiKey) {
    return null;
  }
  return new OpenAI({ apiKey: env.openaiApiKey });
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s./-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const hasAnyTerm = (source: string, terms: string[]) => terms.some((term) => source.includes(term));

const extractTopN = (question: string, fallback = 5) => {
  const normalized = normalizeText(question);
  const directTop = normalized.match(/top\s*(\d{1,2})/);
  if (directTop?.[1]) {
    return Math.max(1, Math.min(20, Number(directTop[1])));
  }

  const maiores = normalized.match(/(\d{1,2})\s*(?:maiores|principais|primeiras|primeiros)/);
  if (maiores?.[1]) {
    return Math.max(1, Math.min(20, Number(maiores[1])));
  }

  return fallback;
};

const extractCnpjFromQuestion = (question: string) => {
  const match = question.match(/\b(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\d{14})\b/);
  if (!match?.[1]) {
    return null;
  }
  const digits = match[1].replace(/\D/g, "");
  return digits.length === 14 ? digits : null;
};

const getStatusLabel = (status: InstrumentStatus | null | undefined) => {
  if (status === InstrumentStatus.EM_EXECUCAO) return "em execucao";
  if (status === InstrumentStatus.CONCLUIDO) return "concluido";
  if (status === InstrumentStatus.VENCIDO) return "vencido";
  if (status === InstrumentStatus.EM_ELABORACAO) return "em elaboracao";
  if (status === InstrumentStatus.ASSINADO) return "assinado";
  if (status === InstrumentStatus.PRESTACAO_PENDENTE) return "prestacao de contas";
  return "sem status";
};

const extractObservacaoValue = (observacoes: string | null | undefined, prefix: string) => {
  const lines = (observacoes ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    if (line.startsWith(prefix)) {
      const value = line.slice(prefix.length).trim();
      return value || null;
    }
  }

  return null;
};

const SITUACAO_API_PREFIX = "SITUACAO_API:";
const SITUACAO_PORTAL_PREFIX = "SITUACAO_PORTAL:";
const STATUS_COMPARE_PREFIX = "STATUS_SYNC_COMPARE:";

const safeParseJson = <T>(raw: string | undefined): T | null => {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      return null;
    }
  }
};

type AssistenteHistoricoItem = {
  role: "user" | "assistant";
  text: string;
};

const CHAT_HISTORY_LIMIT = 20;

const ensureAssistenteSession = async (userId: number, sessionId?: string) => {
  if (sessionId) {
    const existing = await prisma.assistenteChatSession.findFirst({
      where: {
        id: sessionId,
        userId
      },
      select: { id: true }
    });
    if (existing) {
      return existing.id;
    }
  }

  const created = await prisma.assistenteChatSession.create({
    data: {
      userId,
      titulo: "Nova conversa"
    },
    select: { id: true }
  });

  return created.id;
};

const loadSessionHistory = async (sessionId: string) => {
  const items = await prisma.assistenteChatMessage.findMany({
    where: { sessionId },
    orderBy: [{ createdAt: "asc" }],
    take: CHAT_HISTORY_LIMIT,
    select: {
      role: true,
      content: true
    }
  });

  return items.map((item) => ({
    role: item.role === AssistenteChatRole.user ? "user" : "assistant",
    text: item.content
  })) as AssistenteHistoricoItem[];
};

const appendSessionMessage = async (
  sessionId: string,
  role: AssistenteChatRole,
  content: string,
  tokens?: number
) => {
  await prisma.assistenteChatMessage.create({
    data: {
      sessionId,
      role,
      content,
      tokens
    }
  });
};

const inferContextFromQuestion = (question: string) => {
  const city = extractCityFromQuestion(question);
  const reference = extractObraReference(question);

  if (reference) {
    return {
      entidadeAtivaTipo: reference.tipo === "id" ? "obra" : reference.tipo,
      entidadeAtivaId: reference.valor,
      municipioAtivo: city,
      topicoAtivo: normalizeText(question).slice(0, 120)
    };
  }

  return {
    entidadeAtivaTipo: city ? "municipio" : null,
    entidadeAtivaId: city ?? null,
    municipioAtivo: city,
    topicoAtivo: normalizeText(question).slice(0, 120)
  };
};

const updateSessionContext = async (
  sessionId: string,
  perguntaOriginal: string,
  perguntaInterpretada: string,
  resposta: string,
  intencao: AssistenteIntencao
) => {
  const inferred = inferContextFromQuestion(perguntaInterpretada || perguntaOriginal);

  await prisma.assistenteChatSession.update({
    where: { id: sessionId },
    data: {
      titulo: perguntaOriginal.slice(0, 80),
      entidadeAtivaTipo: inferred.entidadeAtivaTipo,
      entidadeAtivaId: inferred.entidadeAtivaId,
      municipioAtivo: inferred.municipioAtivo,
      topicoAtivo: inferred.topicoAtivo,
      resumoContexto: `${intencao}: ${resposta}`.slice(0, 800)
    }
  });
};

const buildFontesConsultadas = (result: AssistenteResposta): string[] => {
  if (result.fontes_consultadas && result.fontes_consultadas.length > 0) {
    return result.fontes_consultadas;
  }

  if (result.intencao === "percentual_obra") {
    const obraId = result.dados?.obra_id;
    const proposta = result.dados?.proposta;
    const instrumento = result.dados?.instrumento;
    return [
      `InstrumentProposal${obraId ? ` #${obraId}` : ""}${proposta ? ` (proposta ${String(proposta)})` : ""}${
        instrumento ? ` (instrumento ${String(instrumento)})` : ""
      }`
    ];
  }

  if (result.intencao === "convenios_cidade" || result.intencao === "desembolso_cidade") {
    const cidade = result.dados?.cidade;
    const uf = result.dados?.uf;
    return [
      `InstrumentProposal + Convenete${cidade ? ` (${String(cidade)}${uf ? `/${String(uf)}` : ""})` : ""}`
    ];
  }

  if (result.intencao === "instrumentos_municipio_status") {
    return ["InstrumentProposal + Convenete"];
  }

  if (result.intencao === "instrumentos_vencendo_com_tickets") {
    return ["InstrumentProposal + Convenete + Ticket"];
  }

  if (result.intencao === "tickets_atrasados_sem_responsavel") {
    const amostra = Array.isArray(result.dados?.amostra) ? result.dados?.amostra : [];
    const codigos = amostra
      .map((item) => (typeof item === "object" && item !== null && "codigo" in item ? String((item as { codigo: unknown }).codigo) : ""))
      .filter((item) => item !== "")
      .slice(0, 3);
    return codigos.length > 0 ? codigos.map((codigo) => `Ticket ${codigo}`) : ["Ticket"];
  }

  if (result.intencao === "vigencias_instrumentos") {
    const amostra = Array.isArray(result.dados?.amostra) ? result.dados?.amostra : [];
    const ids = amostra
      .map((item) => (typeof item === "object" && item !== null && "id" in item ? String((item as { id: unknown }).id) : ""))
      .filter((item) => item !== "")
      .slice(0, 3);
    return ids.length > 0 ? ids.map((id) => `InstrumentProposal #${id}`) : ["InstrumentProposal"];
  }

  if (result.intencao === "tickets_por_instrumento") {
    return ["Ticket + InstrumentProposal"];
  }

  if (result.intencao === "obras_percentual_alto_desembolso_baixo") {
    return ["InstrumentProposal + InstrumentWorkProgress + InstrumentMeasurementBulletin + InstrumentRepasse"];
  }

  if (result.intencao === "ranking_cidades_desembolso") {
    return ["InstrumentProposal + InstrumentRepasse + Convenete"];
  }

  if (
    result.intencao === "transferencias_especiais_cnpj" ||
    result.intencao === "transferencias_especiais_municipio" ||
    result.intencao === "transferencias_especiais_divergentes"
  ) {
    return ["InstrumentProposal (Transferencia Especial) + Convenete"];
  }

  if (result.intencao === "busca_conhecimento") {
    const resultados = Array.isArray(result.dados?.resultados) ? result.dados.resultados : [];
    const fontes = resultados
      .map((item) => {
        if (typeof item !== "object" || item === null) {
          return "";
        }
        const entityType = "entity_type" in item ? String((item as { entity_type: unknown }).entity_type) : "";
        const entityId = "entity_id" in item ? String((item as { entity_id: unknown }).entity_id) : "";
        const sourceTable = "source_table" in item ? String((item as { source_table: unknown }).source_table) : "";
        const sourceField = "source_field" in item ? String((item as { source_field: unknown }).source_field) : "";
        return entityType && entityId ? `${entityType} ${entityId} (${sourceTable}.${sourceField})` : "";
      })
      .filter((item) => item !== "")
      .slice(0, 5);
    return fontes;
  }

  return [];
};

const logAssistenteSearch = async (
  sessionId: string,
  userId: number,
  original: string,
  normalized: string,
  response: AssistenteResposta
) => {
  await prisma.assistenteSearchLog.create({
    data: {
      sessionId,
      userId,
      queryOriginal: original,
      queryNormalized: normalized,
      filtersUsed: JSON.stringify({ intencao: response.intencao, confianca: response.confianca }),
      topResultsJson: response.dados ? JSON.stringify(response.dados) : null
    }
  });
};

const resolveQuestionWithRules = (pergunta: string, historico: AssistenteHistoricoItem[]) => {
  const trimmed = pergunta.trim();
  if (historico.length === 0) {
    return trimmed;
  }

  const normalized = normalizeText(trimmed);
  const isFollowUp = /^(e\s|e\b|entao\b|e\s+quant|e\s+quais)/i.test(normalized);
  const hasOwnCity = extractCityFromQuestion(trimmed) !== null;
  if (!isFollowUp || hasOwnCity) {
    return trimmed;
  }

  const lastUserWithCity = [...historico]
    .reverse()
    .find((item) => item.role === "user" && extractCityFromQuestion(item.text));
  const city = lastUserWithCity ? extractCityFromQuestion(lastUserWithCity.text) : null;

  if (!city) {
    return trimmed;
  }

  if (hasAnyTerm(normalized, ["execucao", "em execucao"])) {
    return `Quantos convenios da cidade de ${city} estao em execucao?`;
  }

  if (hasAnyTerm(normalized, ["ativo", "ativos"])) {
    return `Quantos convenios da cidade de ${city} estao ativos?`;
  }

  if (hasAnyTerm(normalized, ["quantos", "quantidade", "total"])) {
    return `Quantos convenios a cidade de ${city} tem hoje?`;
  }

  return `Sobre a cidade de ${city}, ${trimmed}`;
};

const resolveQuestionWithAI = async (
  client: OpenAI,
  pergunta: string,
  historico: AssistenteHistoricoItem[]
): Promise<string> => {
  if (historico.length === 0) {
    return pergunta.trim();
  }

  try {
    const historyWindow = historico.slice(-10).map((item) => ({ role: item.role, text: item.text }));
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0,
      max_tokens: 180,
      messages: [
        {
          role: "system",
          content:
            "Reescreva a pergunta do usuario para uma forma completa, preservando intencao e usando o historico recente somente quando houver referencias implicitas (ex.: 'e quantos desses...'). Retorne APENAS JSON valido no formato {\"pergunta_completa\":\"...\"}."
        },
        {
          role: "user",
          content: JSON.stringify({ pergunta_atual: pergunta, historico: historyWindow })
        }
      ]
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    const parsed = safeParseJson<{ pergunta_completa?: string }>(raw);
    const full = parsed?.pergunta_completa?.trim();
    if (full && full.length >= 3) {
      return full;
    }
  } catch {
    // fallback para regra local
  }

  return resolveQuestionWithRules(pergunta, historico);
};

const isDesembolsoQuestion = (question: string) => {
  const normalized = normalizeText(question);
  const hasValueTerm = hasAnyTerm(normalized, ["desembolso", "repass", "valor", "pago"]);
  const hasLocationTerm = hasAnyTerm(normalized, ["cidade", "municipio"]);
  const hasRankingTerm = hasAnyTerm(normalized, ["ranking", "top", "maiores", "principais"]);
  if (hasRankingTerm) {
    return false;
  }
  return hasValueTerm && hasLocationTerm;
};

const isConveniosCidadeQuestion = (question: string) => {
  const normalized = normalizeText(question);
  const hasConvenioTerm = hasAnyTerm(normalized, ["convenio", "convenios", "instrumento", "instrumentos", "proposta", "propostas"]);
  const hasCountTerm = hasAnyTerm(normalized, ["quantos", "quantidade", "total", "tem", "existem", "ha"]);
  const hasLocationTerm = hasAnyTerm(normalized, ["cidade", "municipio"]);
  return hasConvenioTerm && hasCountTerm && hasLocationTerm;
};

const isInstrumentosMunicipioStatusQuestion = (question: string) => {
  const normalized = normalizeText(question);
  const hasInstrumentTerm = hasAnyTerm(normalized, ["instrumento", "instrumentos", "convenio", "convenios", "proposta", "propostas"]);
  const hasLocationTerm = hasAnyTerm(normalized, ["cidade", "municipio"]);
  const hasStatusTerm = hasAnyTerm(normalized, [
    "em execucao",
    "execucao",
    "concluido",
    "concluidos",
    "vencido",
    "vencidos",
    "assinado",
    "prestacao",
    "elaboracao",
    "listar",
    "liste",
    "quais"
  ]);
  return hasInstrumentTerm && hasLocationTerm && hasStatusTerm;
};

const isPercentualObraQuestion = (question: string) => {
  const normalized = normalizeText(question);
  const hasPercentTerm = hasAnyTerm(normalized, ["por cento", "percentual", "%", "execucao", "andamento"]);
  const hasWorkTerm = hasAnyTerm(normalized, ["obra", "proposta", "instrumento"]);
  return hasPercentTerm && hasWorkTerm;
};

const isTicketsAtrasadosSemResponsavelQuestion = (question: string) => {
  const normalized = normalizeText(question);
  const hasTicketTerm = hasAnyTerm(normalized, ["ticket", "tickets"]);
  const hasOverdueTerm = hasAnyTerm(normalized, ["atrasad", "vencid", "prazo"]);
  const hasOwnerTerm = hasAnyTerm(normalized, ["sem responsavel", "nao atribuido", "sem atribuicao", "sem atribuicao"]);
  return hasTicketTerm && hasOverdueTerm && hasOwnerTerm;
};

const isVigenciaQuestion = (question: string) => {
  const normalized = normalizeText(question);
  const hasVigenciaTerm = hasAnyTerm(normalized, ["vigencia", "venc", "expira", "expirar"]);
  const hasInstrumentTerm = hasAnyTerm(normalized, ["instrumento", "proposta", "obra", "convenio"]);
  return hasVigenciaTerm && hasInstrumentTerm;
};

const isRankingCidadesDesembolsoQuestion = (question: string) => {
  const normalized = normalizeText(question);
  const hasLocationPlural = hasAnyTerm(normalized, ["cidades", "municipios"]);
  const hasValueTerm = hasAnyTerm(normalized, ["desembolso", "repass", "valor pago", "valor"]);
  const hasRankingTerm = hasAnyTerm(normalized, ["ranking", "top", "maiores", "principais", "ordem"]);
  return hasLocationPlural && hasValueTerm && hasRankingTerm;
};

const isTicketsPorInstrumentoQuestion = (question: string) => {
  const normalized = normalizeText(question);
  return hasAnyTerm(normalized, ["ticket", "tickets"]) && hasAnyTerm(normalized, ["obra", "proposta", "instrumento"]);
};

const isTransferenciasEspeciaisQuestion = (question: string) => {
  const normalized = normalizeText(question);
  return hasAnyTerm(normalized, ["especial", "especiais", "transferencia especial", "transferencias especiais"]);
};

const isInstrumentosVencendoComTicketsQuestion = (question: string) => {
  const normalized = normalizeText(question);
  return (
    hasAnyTerm(normalized, ["instrumento", "instrumentos", "convenio", "convenios"]) &&
    hasAnyTerm(normalized, ["ticket", "tickets"]) &&
    hasAnyTerm(normalized, ["venc", "vencer", "vencido", "vencem", "30 dias", "60 dias", "90 dias"])
  );
};

const isObrasPercentualAltoDesembolsoBaixoQuestion = (question: string) => {
  const normalized = normalizeText(question);
  return (
    hasAnyTerm(normalized, ["obra", "obras"]) &&
    hasAnyTerm(normalized, ["percentual", "execucao", "andamento", "%"]) &&
    hasAnyTerm(normalized, ["desembolso", "repasse", "pago"]) &&
    hasAnyTerm(normalized, ["baixo", "pouco", "menor", "incompat", "abaixo"])
  );
};

const extractInstrumentStatusFromQuestion = (question: string) => {
  const normalized = normalizeText(question);
  if (hasAnyTerm(normalized, ["em execucao", "execucao"])) {
    return "EM_EXECUCAO" as const;
  }
  if (hasAnyTerm(normalized, ["concluido", "concluidos", "concluidas"])) {
    return "CONCLUIDO" as const;
  }
  if (hasAnyTerm(normalized, ["vencido", "vencidos", "vencida", "vencidas"])) {
    return "VENCIDO" as const;
  }
  if (hasAnyTerm(normalized, ["em elaboracao", "elaboracao"])) {
    return "EM_ELABORACAO" as const;
  }
  return null;
};

const extractVigenciaDaysWindow = (question: string) => {
  const normalized = normalizeText(question);
  const explicit = normalized.match(/\b(30|60|90|120|180)\b/);
  if (explicit?.[1]) {
    return Number(explicit[1]);
  }
  if (hasAnyTerm(normalized, ["proxim", "vencer", "vence", "a vencer"])) {
    return 30;
  }
  return null;
};

const extractCityFromQuestion = (question: string) => {
  const patterns = [
    /(?:cidade|municipio)\s+de\s+([A-Za-zÀ-ÿ\s'`-]{3,50})/i,
    /(?:para|em)\s+(?:a\s+)?cidade\s+de\s+([A-Za-zÀ-ÿ\s'`-]{3,50})/i,
    /(?:para|em)\s+(?:o\s+)?municipio\s+de\s+([A-Za-zÀ-ÿ\s'`-]{3,50})/i,
    /(?:cidade|municipio)\s+([A-Za-zÀ-ÿ\s'`-]{3,50})/i
  ];

  for (const pattern of patterns) {
    const match = question.match(pattern);
    if (!match?.[1]) {
      continue;
    }

    const cleaned = match[1]
      .split(/[?.,;:!]/)[0]
      .replace(/\b(hoje|atual|atualmente|ja|até|ate|nos|nas|dos|das|com|tem|existem|ha|agora|pe|rn|sp|rj|mg|ba|ce|go|es|df|pr|sc|rs|mt|ms|to|pa|am|ac|al|ap|ma|pb|pi|ro|rr|se)\b.*$/i, "")
      .trim();
    if (cleaned.length >= 3) {
      return cleaned;
    }
  }

  return null;
};

const findConvenetesByCity = async (cidadeInformada: string) => {
  const cidadeNormalized = normalizeText(cidadeInformada);
  let convenetes = await prisma.convenete.findMany({
    where: {
      OR: [{ cidade: { contains: cidadeInformada } }, { cidade: { contains: cidadeInformada.toUpperCase() } }]
    },
    select: { id: true, nome: true, cidade: true, uf: true, cnpj: true }
  });

  if (convenetes.length === 0) {
    const allConvenetes = await prisma.convenete.findMany({
      select: { id: true, nome: true, cidade: true, uf: true, cnpj: true }
    });

    convenetes = allConvenetes.filter((item) => {
      const city = normalizeText(item.cidade);
      return city.includes(cidadeNormalized) || cidadeNormalized.includes(city);
    });
  }

  return convenetes;
};

const findInstrumentoByReference = async (referencia: string) => {
  const trimmed = referencia.trim();
  if (!trimmed) {
    return null;
  }

  const explicit = extractExplicitInstrumentIdentifier(trimmed);
  const obraRef = extractObraReference(trimmed);
  const numericId = obraRef?.tipo === "id" ? Number(obraRef.valor) : null;

  const candidates = await prisma.instrumentProposal.findMany({
    where: {
      OR: [
        ...(explicit?.tipo === "proposta"
          ? [{ proposta: explicit.valor }, { proposta: { contains: explicit.valor } }]
          : []),
        ...(explicit?.tipo === "instrumento"
          ? [{ instrumento: explicit.valor }, { instrumento: { contains: explicit.valor } }]
          : []),
        ...(numericId && Number.isFinite(numericId) ? [{ id: numericId }] : []),
        ...(!explicit && !numericId ? [{ proposta: { contains: trimmed } }, { instrumento: { contains: trimmed } }] : [])
      ]
    },
    include: {
      convenete: {
        select: { cidade: true, uf: true, nome: true, cnpj: true }
      }
    },
    take: 10
  });

  const normalized = normalizeText(explicit?.valor ?? obraRef?.valor ?? trimmed);
  return (
    candidates.find((item) => normalizeText(item.proposta) === normalized) ??
    candidates.find((item) => normalizeText(item.instrumento) === normalized) ??
    candidates.find((item) => normalizeText(item.proposta).includes(normalized)) ??
    candidates.find((item) => normalizeText(item.instrumento).includes(normalized)) ??
    candidates[0] ??
    null
  );
};

const responderConveniosPorCidade = async (pergunta: string): Promise<AssistenteResposta> => {
  const cidadeInformada = extractCityFromQuestion(pergunta);
  if (!cidadeInformada) {
    return {
      pergunta,
      intencao: "convenios_cidade",
      confianca: "baixa",
      resposta: "Para contar os convenios, informe a cidade. Exemplo: quantos convenios a cidade de Parnamirim tem hoje?",
      sugestoes: SUGESTOES_PADRAO
    };
  }

  const convenetes = await findConvenetesByCity(cidadeInformada);

  if (convenetes.length === 0) {
    return {
      pergunta,
      intencao: "convenios_cidade",
      confianca: "media",
      resposta: `Nao encontrei cidade/proponente cadastrada para '${cidadeInformada}'.`,
      dados: { cidade: cidadeInformada, instrumentos_ativos: 0, instrumentos_total: 0 },
      sugestoes: []
    };
  }

  const conveneteIds = convenetes.map((item) => item.id);
  const statusFilter = extractInstrumentStatusFromQuestion(pergunta);
  const [ativos, total] = await Promise.all([
    prisma.instrumentProposal.count({ where: { conveneteId: { in: conveneteIds }, ativo: true } }),
    prisma.instrumentProposal.count({ where: { conveneteId: { in: conveneteIds } } })
  ]);

  const totalByStatus = statusFilter
    ? await prisma.instrumentProposal.count({
        where: {
          conveneteId: { in: conveneteIds },
          ativo: true,
          status: statusFilter
        }
      })
    : null;

  const cidadeBase = convenetes[0];
  const statusLabel =
    statusFilter === "EM_EXECUCAO"
      ? "em execucao"
      : statusFilter === "CONCLUIDO"
        ? "concluidos"
        : statusFilter === "VENCIDO"
          ? "vencidos"
          : statusFilter === "EM_ELABORACAO"
            ? "em elaboracao"
            : null;

  return {
    pergunta,
    intencao: "convenios_cidade",
    confianca: "alta",
    resposta:
      statusLabel && totalByStatus !== null
        ? `${cidadeBase.cidade}/${cidadeBase.uf} tem ${totalByStatus} convenio(s)/instrumento(s) ${statusLabel}.`
        : ativos === total
          ? `${cidadeBase.cidade}/${cidadeBase.uf} tem ${ativos} convenio(s)/instrumento(s) cadastrado(s).`
          : `${cidadeBase.cidade}/${cidadeBase.uf} tem ${ativos} convenio(s)/instrumento(s) ativo(s) de ${total} cadastrado(s) no total.`,
    dados: {
      cidade: cidadeBase.cidade,
      uf: cidadeBase.uf,
      proponentes_encontrados: convenetes.length,
      status_filtrado: statusFilter,
      instrumentos_status_filtrado: totalByStatus,
      instrumentos_ativos: ativos,
      instrumentos_total: total
    },
    sugestoes: []
  };
};

const responderInstrumentosPorMunicipioStatus = async (pergunta: string): Promise<AssistenteResposta> => {
  const cidadeInformada = extractCityFromQuestion(pergunta);
  if (!cidadeInformada) {
    return {
      pergunta,
      intencao: "instrumentos_municipio_status",
      confianca: "baixa",
      resposta: "Informe a cidade para listar os instrumentos. Exemplo: quais instrumentos em execucao existem em Parnamirim?",
      sugestoes: SUGESTOES_PADRAO
    };
  }

  const convenetes = await findConvenetesByCity(cidadeInformada);
  if (convenetes.length === 0) {
    return {
      pergunta,
      intencao: "instrumentos_municipio_status",
      confianca: "media",
      resposta: `Nao encontrei proponentes cadastrados para '${cidadeInformada}'.`,
      dados: { cidade: cidadeInformada, total: 0 },
      sugestoes: []
    };
  }

  const conveneteIds = convenetes.map((item) => item.id);
  const statusFilter = extractInstrumentStatusFromQuestion(pergunta) as InstrumentStatus | null;
  const items = await prisma.instrumentProposal.findMany({
    where: {
      conveneteId: { in: conveneteIds },
      ativo: true,
      ...(statusFilter ? { status: statusFilter } : {})
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 12,
    select: {
      id: true,
      proposta: true,
      instrumento: true,
      status: true,
      objeto: true,
      vigenciaFim: true,
      convenete: { select: { cidade: true, uf: true } }
    }
  });

  const cidadeBase = convenetes[0];
  const statusLabel = statusFilter ? getStatusLabel(statusFilter) : "ativos";
  return {
    pergunta,
    intencao: "instrumentos_municipio_status",
    confianca: items.length > 0 ? "alta" : "media",
    resposta:
      items.length > 0
        ? `Encontrei ${items.length} instrumento(s) ${statusLabel} para ${cidadeBase.cidade}/${cidadeBase.uf}.`
        : `Nao encontrei instrumentos ${statusLabel} para ${cidadeBase.cidade}/${cidadeBase.uf}.`,
    dados: {
      cidade: cidadeBase.cidade,
      uf: cidadeBase.uf,
      status_filtrado: statusFilter,
      total: items.length,
      amostra: items.map((item) => ({
        id: item.id,
        proposta: item.proposta,
        instrumento: item.instrumento,
        status: item.status,
        objeto: item.objeto,
        vigencia_fim: item.vigenciaFim.toISOString()
      }))
    },
    sugestoes: [
      `Quais instrumentos vencem em 30 dias em ${cidadeBase.cidade}?`,
      `Qual o desembolso da cidade de ${cidadeBase.cidade}?`,
      `Quais transferencias especiais existem em ${cidadeBase.cidade}?`
    ]
  };
};

const extractObraReference = (question: string) => {
  const obraIdMatch = question.match(/obra\s*(?:id|n(?:o|u?mero)?|#)?\s*(\d{1,10})/i);
  if (obraIdMatch?.[1]) {
    return { tipo: "id" as const, valor: obraIdMatch[1] };
  }

  const propostaMatch = question.match(/proposta\s*(?:n(?:o|u?mero)?|#)?\s*([A-Za-z0-9./-]{3,40})/i);
  if (propostaMatch?.[1]) {
    return { tipo: "proposta" as const, valor: propostaMatch[1] };
  }

  const instrumentoMatch = question.match(/instrumento\s*(?:n(?:o|u?mero)?|#)?\s*([A-Za-z0-9./-]{3,40})/i);
  if (instrumentoMatch?.[1]) {
    return { tipo: "instrumento" as const, valor: instrumentoMatch[1] };
  }

  const genericNumeric = question.match(/\b(\d{4,10})\b/);
  if (genericNumeric?.[1]) {
    return { tipo: "id" as const, valor: genericNumeric[1] };
  }

  return null;
};

const extractExplicitInstrumentIdentifier = (question: string) => {
  const propostaMatch = question.match(/proposta\s*(?:n(?:o|u?mero)?|#)?\s*([A-Za-z0-9./-]{3,60})/i);
  if (propostaMatch?.[1]) {
    return { tipo: "proposta" as const, valor: propostaMatch[1].trim() };
  }

  const instrumentoMatch = question.match(/instrumento\s*(?:n(?:o|u?mero)?|#)?\s*([A-Za-z0-9./-]{3,60})/i);
  if (instrumentoMatch?.[1]) {
    return { tipo: "instrumento" as const, valor: instrumentoMatch[1].trim() };
  }

  return null;
};

const responderIdentificadorNaoEncontrado = async (pergunta: string): Promise<AssistenteResposta | null> => {
  const identifier = extractExplicitInstrumentIdentifier(pergunta);
  if (!identifier) {
    return null;
  }

  if (/\b(nao existe|inexistente|ficticia|fake)\b/i.test(normalizeText(identifier.valor))) {
    return {
      pergunta,
      intencao: "nao_entendida",
      confianca: "alta",
      resposta: `Nao encontrei ${identifier.tipo} '${identifier.valor}' no sistema. Confira o identificador informado ou tente por municipio/objeto.`,
      dados: {
        identificador_tipo: identifier.tipo,
        identificador_valor: identifier.valor,
        encontrado: false
      },
      sugestoes: []
    };
  }

  const normalized = normalizeText(identifier.valor);
  const where =
    identifier.tipo === "proposta"
      ? {
          OR: [{ proposta: identifier.valor }, { proposta: { contains: identifier.valor } }]
        }
      : {
          OR: [{ instrumento: identifier.valor }, { instrumento: { contains: identifier.valor } }]
        };

  const candidates = await prisma.instrumentProposal.findMany({
    where,
    select: {
      proposta: true,
      instrumento: true
    },
    take: 5
  });

  const hasNormalizedMatch = candidates.some((item) =>
    identifier.tipo === "proposta"
      ? normalizeText(item.proposta) === normalized
      : normalizeText(item.instrumento) === normalized
  );

  if (candidates.length === 0 || !hasNormalizedMatch) {
    return {
      pergunta,
      intencao: "nao_entendida",
      confianca: "alta",
      resposta: `Nao encontrei ${identifier.tipo} '${identifier.valor}' no sistema. Confira o identificador informado ou tente por municipio/objeto.`,
      dados: {
        identificador_tipo: identifier.tipo,
        identificador_valor: identifier.valor,
        encontrado: false
      },
      sugestoes: []
    };
  }

  return null;
};

const buildFallbackResponse = (pergunta: string): AssistenteResposta => ({
  pergunta,
  intencao: "nao_entendida",
  confianca: "baixa",
  resposta:
    "Ainda nao entendi essa pergunta com seguranca. Posso responder sobre desembolso por cidade, percentual de execucao de obra, tickets atrasados sem responsavel, vigencias e ranking de cidades por desembolso.",
  sugestoes: SUGESTOES_PADRAO
});

const responderDesembolsoPorCidade = async (pergunta: string): Promise<AssistenteResposta> => {
  const cidadeInformada = extractCityFromQuestion(pergunta);
  if (!cidadeInformada) {
    return {
      pergunta,
      intencao: "desembolso_cidade",
      confianca: "baixa",
      resposta: "Para calcular o desembolso, informe a cidade. Exemplo: 'qual desembolso ja foi feito para a cidade de Parnamirim?'.",
      sugestoes: SUGESTOES_PADRAO
    };
  }

  const cidadeNormalized = normalizeText(cidadeInformada);

  let convenetes = await prisma.convenete.findMany({
    where: {
      OR: [{ cidade: { contains: cidadeInformada } }, { cidade: { contains: cidadeInformada.toUpperCase() } }]
    },
    select: {
      id: true,
      nome: true,
      cidade: true,
      uf: true
    }
  });

  if (convenetes.length === 0) {
    const allConvenetes = await prisma.convenete.findMany({
      select: {
        id: true,
        nome: true,
        cidade: true,
        uf: true
      }
    });

    convenetes = allConvenetes.filter((item) => {
      const city = normalizeText(item.cidade);
      return city.includes(cidadeNormalized) || cidadeNormalized.includes(city);
    });
  }

  if (convenetes.length === 0) {
    return {
      pergunta,
      intencao: "desembolso_cidade",
      confianca: "media",
      resposta: `Nao encontrei proponentes cadastrados para '${cidadeInformada}'.`,
      dados: {
        cidade: cidadeInformada,
        instrumentos: 0,
        valor_desembolso: 0
      },
      sugestoes: SUGESTOES_PADRAO
    };
  }

  const conveneteIds = convenetes.map((item) => item.id);
  const instruments = await prisma.instrumentProposal.findMany({
    where: {
      conveneteId: { in: conveneteIds },
      ativo: true
    },
    select: {
      id: true,
      proposta: true,
      instrumento: true,
      valorJaRepassado: true,
      repasses: {
        select: {
          valorRepasse: true
        }
      }
    }
  });

  const totalLancadoRepasses = instruments.reduce(
    (acc, item) => acc + item.repasses.reduce((sum, repasse) => sum + toNumber(repasse.valorRepasse), 0),
    0
  );
  const totalCampoInstrumento = instruments.reduce((acc, item) => acc + toNumber(item.valorJaRepassado), 0);
  const totalDesembolso = totalLancadoRepasses > 0 ? totalLancadoRepasses : totalCampoInstrumento;
  const totalRepasses = instruments.reduce((acc, item) => acc + item.repasses.length, 0);

  const cidadeBase = convenetes[0];
  const cidadeLabel = `${cidadeBase.cidade}/${cidadeBase.uf}`;

  return {
    pergunta,
    intencao: "desembolso_cidade",
    confianca: instruments.length > 0 ? "alta" : "media",
    resposta:
      instruments.length === 0
        ? `Encontrei proponentes em ${cidadeLabel}, mas ainda sem instrumentos ativos com desembolso registrado.`
        : `O desembolso consolidado para ${cidadeLabel} e de ${formatCurrency(totalDesembolso)} em ${instruments.length} instrumento(s) ativo(s).`,
    dados: {
      cidade: cidadeBase.cidade,
      uf: cidadeBase.uf,
      proponentes_encontrados: convenetes.length,
      instrumentos: instruments.length,
      repasses_lancados: totalRepasses,
      valor_desembolso: Number(totalDesembolso.toFixed(2))
    },
    sugestoes: [
      `Qual percentual de execucao da obra ${instruments[0]?.id ?? "123"}?`,
      `Quais instrumentos ativos existem em ${cidadeBase.cidade}?`,
      "Me mostre o valor total de repasse por cidade"
    ]
  };
};

const resolvePercentualObra = (item: {
  workProgress: { percentualObra: unknown; updatedAt: Date } | null;
  measurementBulletins: Array<{ percentualObraInformado: unknown | null; dataBoletim: Date }>;
}) => {
  if (item.workProgress) {
    return {
      percentual: toNumber(item.workProgress.percentualObra),
      fonte: "acompanhamento_obra",
      atualizadoEm: item.workProgress.updatedAt.toISOString()
    };
  }

  const lastBulletin = item.measurementBulletins[0];
  if (lastBulletin?.percentualObraInformado != null) {
    return {
      percentual: toNumber(lastBulletin.percentualObraInformado),
      fonte: "boletim_medicao",
      atualizadoEm: lastBulletin.dataBoletim.toISOString()
    };
  }

  return null;
};

const responderPercentualObra = async (pergunta: string): Promise<AssistenteResposta> => {
  const reference = extractObraReference(pergunta);
  const cidadeInformada = extractCityFromQuestion(pergunta);

  const obras = await prisma.instrumentProposal.findMany({
    where: {
      ativo: true,
      fluxoTipo: InstrumentFlowType.OBRA
    },
    select: {
      id: true,
      proposta: true,
      instrumento: true,
      objeto: true,
      status: true,
      convenete: {
        select: {
          cidade: true,
          uf: true,
          nome: true
        }
      },
      workProgress: {
        select: {
          percentualObra: true,
          updatedAt: true
        }
      },
      measurementBulletins: {
        orderBy: [{ dataBoletim: "desc" }],
        take: 1,
        select: {
          percentualObraInformado: true,
          dataBoletim: true
        }
      }
    }
  });

  let selected = null as (typeof obras)[number] | null;

  if (reference) {
    const referenceNormalized = normalizeText(reference.valor);

    if (reference.tipo === "id") {
      const idNumber = Number(reference.valor);
      selected = obras.find((item) => item.id === idNumber) ?? null;
    }

    if (!selected && reference.tipo === "proposta") {
      selected =
        obras.find((item) => normalizeText(item.proposta) === referenceNormalized) ??
        obras.find((item) => normalizeText(item.proposta).includes(referenceNormalized)) ??
        null;
    }

    if (!selected && reference.tipo === "instrumento") {
      selected =
        obras.find((item) => normalizeText(item.instrumento) === referenceNormalized) ??
        obras.find((item) => normalizeText(item.instrumento).includes(referenceNormalized)) ??
        null;
    }
  }

  if (!selected && cidadeInformada) {
    const cityNormalized = normalizeText(cidadeInformada);
    const obrasCidade = obras.filter((item) => {
      const city = normalizeText(item.convenete?.cidade ?? "");
      return city.includes(cityNormalized) || cityNormalized.includes(city);
    });

    const percentuais = obrasCidade
      .map((item) => ({ item, percentual: resolvePercentualObra(item) }))
      .filter((entry) => entry.percentual !== null) as Array<{ item: (typeof obras)[number]; percentual: NonNullable<ReturnType<typeof resolvePercentualObra>> }>;

    if (percentuais.length === 0) {
      return {
        pergunta,
        intencao: "percentual_obra",
        confianca: "media",
        resposta: `Encontrei obras em ${cidadeInformada}, mas sem percentual de execucao registrado ate agora.`,
        sugestoes: SUGESTOES_PADRAO
      };
    }

    const media = percentuais.reduce((acc, entry) => acc + entry.percentual.percentual, 0) / percentuais.length;
    return {
      pergunta,
      intencao: "percentual_obra",
      confianca: "media",
      resposta: `A media de execucao das obras em ${cidadeInformada} esta em ${media.toFixed(2)}%.`,
      dados: {
        cidade: cidadeInformada,
        obras_com_percentual: percentuais.length,
        percentual_medio: Number(media.toFixed(2)),
        exemplo_obra_id: percentuais[0].item.id,
        exemplo_obra_instrumento: percentuais[0].item.instrumento
      },
      sugestoes: [
        `Qual percentual da obra ${percentuais[0].item.id}?`,
        `Qual percentual da proposta ${percentuais[0].item.proposta}?`,
        "Quais obras estao acima de 80%?"
      ]
    };
  }

  if (!selected) {
    return {
      pergunta,
      intencao: "percentual_obra",
      confianca: "baixa",
      resposta: "Nao consegui identificar qual obra voce quer consultar. Informe o ID da obra, numero da proposta ou numero do instrumento.",
      sugestoes: SUGESTOES_PADRAO
    };
  }

  const percentual = resolvePercentualObra(selected);
  if (!percentual) {
    return {
      pergunta,
      intencao: "percentual_obra",
      confianca: "media",
      resposta: `A obra ${selected.id} foi encontrada, mas ainda nao ha percentual de execucao cadastrado.`,
      dados: {
        obra_id: selected.id,
        proposta: selected.proposta,
        instrumento: selected.instrumento,
        status: selected.status
      },
      sugestoes: SUGESTOES_PADRAO
    };
  }

  return {
    pergunta,
    intencao: "percentual_obra",
    confianca: "alta",
    resposta: `A obra ${selected.id} esta com ${percentual.percentual.toFixed(2)}% de execucao.`,
    dados: {
      obra_id: selected.id,
      proposta: selected.proposta,
      instrumento: selected.instrumento,
      status: selected.status,
      cidade: selected.convenete?.cidade ?? null,
      uf: selected.convenete?.uf ?? null,
      percentual_execucao: Number(percentual.percentual.toFixed(2)),
      fonte_percentual: percentual.fonte,
      atualizado_em: percentual.atualizadoEm
    },
    sugestoes: [
      "Qual o desembolso da cidade dessa obra?",
      `Qual percentual da proposta ${selected.proposta}?`,
      "Quais obras estao proximas de concluir?"
    ]
  };
};

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

const diffDays = (from: Date, to: Date) => {
  const fromDate = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0);
  const toDate = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 0, 0, 0, 0);
  return Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
};

const responderTicketsAtrasadosSemResponsavel = async (pergunta: string): Promise<AssistenteResposta> => {
  const today = startOfToday();

  const items = await prisma.ticket.findMany({
    where: {
      status: {
        in: ["ABERTO", "EM_ANDAMENTO"]
      },
      prazoAlvo: {
        lt: today
      },
      responsavelUserId: null
    },
    orderBy: [{ prazoAlvo: "asc" }, { createdAt: "asc" }],
    take: 20,
    select: {
      id: true,
      codigo: true,
      titulo: true,
      status: true,
      prioridade: true,
      prazoAlvo: true,
      createdAt: true
    }
  });

  if (items.length === 0) {
    return {
      pergunta,
      intencao: "tickets_atrasados_sem_responsavel",
      confianca: "alta",
      resposta: "No momento, nao ha tickets atrasados sem responsavel.",
      dados: {
        total: 0
      },
      sugestoes: [
        "Quais tickets estao atrasados?",
        "Quais tickets estao sem responsavel?",
        "Mostre o ranking de cidades por desembolso"
      ]
    };
  }

  const sample = items.slice(0, 5).map((item) => {
    const diasAtraso = item.prazoAlvo ? Math.max(1, diffDays(item.prazoAlvo, today)) : null;
    return {
      codigo: item.codigo,
      titulo: item.titulo,
      prioridade: item.prioridade,
      status: item.status,
      prazo_alvo: item.prazoAlvo?.toISOString() ?? null,
      dias_atraso: diasAtraso
    };
  });

  return {
    pergunta,
    intencao: "tickets_atrasados_sem_responsavel",
    confianca: "alta",
    resposta: `Existem ${items.length} ticket(s) atrasados sem responsavel. Exemplo mais critico: ${items[0].codigo} (${items[0].titulo}).`,
    dados: {
      total: items.length,
      amostra: sample
    },
    sugestoes: [
      "Quais instrumentos ja venceram?",
      "Qual o percentual da obra 123?",
      "Qual valor de desembolso ja foi feito para a cidade de Parnamirim?"
    ]
  };
};

const responderTicketsPorInstrumento = async (pergunta: string): Promise<AssistenteResposta> => {
  const reference =
    extractExplicitInstrumentIdentifier(pergunta)?.valor ??
    extractObraReference(pergunta)?.valor ??
    "";

  if (!reference) {
    return {
      pergunta,
      intencao: "tickets_por_instrumento",
      confianca: "baixa",
      resposta: "Informe o id, a proposta ou o instrumento para localizar os tickets relacionados.",
      sugestoes: [
        "Quais tickets da proposta 123456/2024?",
        "Quais tickets do instrumento 09032025-086933?",
        "Quais tickets da obra 123?"
      ]
    };
  }

  const instrumento = await findInstrumentoByReference(reference);
  if (!instrumento) {
    return {
      pergunta,
      intencao: "tickets_por_instrumento",
      confianca: "media",
      resposta: `Nao encontrei instrumento correspondente a '${reference}'.`,
      dados: { referencia: reference, total: 0 },
      sugestoes: []
    };
  }

  const tickets = await prisma.ticket.findMany({
    where: { instrumentId: instrumento.id },
    orderBy: [{ updatedAt: "desc" }],
    take: 10,
    select: {
      codigo: true,
      titulo: true,
      status: true,
      prioridade: true,
      prazoAlvo: true,
      responsavelUser: { select: { nome: true } }
    }
  });

  return {
    pergunta,
    intencao: "tickets_por_instrumento",
    confianca: "alta",
    resposta:
      tickets.length > 0
        ? `Encontrei ${tickets.length} ticket(s) vinculados ao instrumento ${instrumento.instrumento}.`
        : `Nao encontrei tickets vinculados ao instrumento ${instrumento.instrumento}.`,
    dados: {
      instrumento_id: instrumento.id,
      proposta: instrumento.proposta,
      instrumento: instrumento.instrumento,
      cidade: instrumento.convenete?.cidade ?? null,
      uf: instrumento.convenete?.uf ?? null,
      total: tickets.length,
      amostra: tickets.map((item) => ({
        codigo: item.codigo,
        titulo: item.titulo,
        status: item.status,
        prioridade: item.prioridade,
        prazo_alvo: item.prazoAlvo?.toISOString() ?? null,
        responsavel: item.responsavelUser?.nome ?? null
      }))
    },
    sugestoes: [
      `Qual o percentual da obra ${instrumento.id}?`,
      `Quais instrumentos vencem em 30 dias em ${instrumento.convenete?.cidade ?? "essa cidade"}?`,
      "Quais tickets estao atrasados e sem responsavel?"
    ]
  };
};

const responderInstrumentosVencendoComTickets = async (pergunta: string): Promise<AssistenteResposta> => {
  const today = startOfToday();
  const windowDays = extractVigenciaDaysWindow(pergunta) ?? 30;
  const askExpired = hasAnyTerm(normalizeText(pergunta), ["vencid", "ja venceram", "vencidas", "vencidos"]);
  const cidadeInformada = extractCityFromQuestion(pergunta);
  const convenetes = cidadeInformada ? await findConvenetesByCity(cidadeInformada) : [];
  const conveneteIds = convenetes.map((item) => item.id);

  const instruments = await prisma.instrumentProposal.findMany({
    where: {
      ativo: true,
      tickets: { some: {} },
      ...(cidadeInformada && conveneteIds.length > 0 ? { conveneteId: { in: conveneteIds } } : {})
    },
    select: {
      id: true,
      proposta: true,
      instrumento: true,
      status: true,
      vigenciaFim: true,
      convenete: { select: { cidade: true, uf: true } },
      tickets: {
        orderBy: [{ updatedAt: "desc" }],
        take: 5,
        select: { codigo: true, status: true, prioridade: true, titulo: true }
      }
    }
  });

  const withDays = instruments.map((item) => ({
    ...item,
    diasParaVencer: diffDays(today, item.vigenciaFim)
  }));

  const filtered = askExpired
    ? withDays.filter((item) => item.diasParaVencer < 0)
    : withDays.filter((item) => item.diasParaVencer >= 0 && item.diasParaVencer <= windowDays);

  const labelContext = askExpired ? "vencidos" : `a vencer em ate ${windowDays} dias`;
  return {
    pergunta,
    intencao: "instrumentos_vencendo_com_tickets",
    confianca: filtered.length > 0 ? "alta" : "media",
    resposta:
      filtered.length > 0
        ? `Encontrei ${filtered.length} instrumento(s) ${labelContext} que ja possuem ticket vinculado.`
        : `Nao encontrei instrumentos ${labelContext} com tickets vinculados para esse filtro.`,
    dados: {
      cidade: convenetes[0]?.cidade ?? cidadeInformada ?? null,
      uf: convenetes[0]?.uf ?? null,
      filtro: labelContext,
      total: filtered.length,
      amostra: filtered.slice(0, 8).map((item) => ({
        id: item.id,
        proposta: item.proposta,
        instrumento: item.instrumento,
        status: item.status,
        vigencia_fim: item.vigenciaFim.toISOString(),
        dias_para_vencer: item.diasParaVencer,
        tickets: item.tickets.map((ticket) => ({
          codigo: ticket.codigo,
          status: ticket.status,
          prioridade: ticket.prioridade,
          titulo: ticket.titulo
        }))
      }))
    },
    sugestoes: [
      "Quais instrumentos vencem em 30 dias?",
      "Quais tickets estao atrasados e sem responsavel?",
      "Quais tickets desse instrumento existem?"
    ]
  };
};

const responderVigenciasInstrumentos = async (pergunta: string): Promise<AssistenteResposta> => {
  const normalized = normalizeText(pergunta);
  const today = startOfToday();
  const windowDays = extractVigenciaDaysWindow(pergunta);
  const askExpired = hasAnyTerm(normalized, ["vencid", "ja venceram", "vencidas", "vencidos"]);

  const instruments = await prisma.instrumentProposal.findMany({
    where: {
      ativo: true
    },
    select: {
      id: true,
      proposta: true,
      instrumento: true,
      vigenciaFim: true,
      status: true,
      convenete: {
        select: {
          cidade: true,
          uf: true
        }
      }
    },
    orderBy: [{ vigenciaFim: "asc" }]
  });

  const withDays = instruments.map((item) => ({
    ...item,
    diasParaVencer: diffDays(today, item.vigenciaFim)
  }));

  const filtered = askExpired
    ? withDays.filter((item) => item.diasParaVencer < 0)
    : windowDays !== null
      ? withDays.filter((item) => item.diasParaVencer >= 0 && item.diasParaVencer <= windowDays)
      : withDays.filter((item) => item.diasParaVencer < 0);

  const labelContext = askExpired
    ? "ja vencidos"
    : windowDays !== null
      ? `com vencimento em ate ${windowDays} dias`
      : "ja vencidos";

  if (filtered.length === 0) {
    return {
      pergunta,
      intencao: "vigencias_instrumentos",
      confianca: "alta",
      resposta: `Nao encontrei instrumentos ${labelContext}.`,
      dados: {
        total: 0,
        filtro: labelContext
      },
      sugestoes: [
        "Quais instrumentos vencem em 30 dias?",
        "Quais instrumentos ja venceram?",
        "Quais tickets estao atrasados e sem responsavel?"
      ]
    };
  }

  const sample = filtered.slice(0, 8).map((item) => ({
    id: item.id,
    proposta: item.proposta,
    instrumento: item.instrumento,
    status: item.status,
    vigencia_fim: item.vigenciaFim.toISOString(),
    dias_para_vencer: item.diasParaVencer,
    cidade: item.convenete?.cidade ?? null,
    uf: item.convenete?.uf ?? null
  }));

  return {
    pergunta,
    intencao: "vigencias_instrumentos",
    confianca: "alta",
    resposta: `Encontrei ${filtered.length} instrumento(s) ${labelContext}.`,
    dados: {
      total: filtered.length,
      filtro: labelContext,
      amostra: sample
    },
    sugestoes: [
      "Quais instrumentos vencem em 60 dias?",
      "Quais instrumentos vencem em 90 dias?",
      "Mostre o ranking de cidades por desembolso"
    ]
  };
};

const responderRankingCidadesDesembolso = async (pergunta: string): Promise<AssistenteResposta> => {
  const topN = extractTopN(pergunta, 5);

  const instruments = await prisma.instrumentProposal.findMany({
    where: {
      ativo: true
    },
    select: {
      id: true,
      valorJaRepassado: true,
      repasses: {
        select: {
          valorRepasse: true
        }
      },
      convenete: {
        select: {
          cidade: true,
          uf: true
        }
      }
    }
  });

  const cityMap = new Map<string, { cidade: string; uf: string; instrumentos: number; valor: number }>();

  for (const item of instruments) {
    const cidade = item.convenete?.cidade?.trim();
    const uf = item.convenete?.uf?.trim();
    if (!cidade || !uf) {
      continue;
    }

    const sumRepasses = item.repasses.reduce((acc, repasse) => acc + toNumber(repasse.valorRepasse), 0);
    const valorInstrumento = sumRepasses > 0 ? sumRepasses : toNumber(item.valorJaRepassado);
    const key = `${normalizeText(cidade)}-${normalizeText(uf)}`;
    const current = cityMap.get(key);

    if (!current) {
      cityMap.set(key, {
        cidade,
        uf,
        instrumentos: 1,
        valor: valorInstrumento
      });
      continue;
    }

    current.instrumentos += 1;
    current.valor += valorInstrumento;
  }

  const ranking = [...cityMap.values()]
    .sort((a, b) => b.valor - a.valor)
    .slice(0, topN)
    .map((item, index) => ({
      posicao: index + 1,
      cidade: item.cidade,
      uf: item.uf,
      instrumentos: item.instrumentos,
      valor_desembolso: Number(item.valor.toFixed(2))
    }));

  if (ranking.length === 0) {
    return {
      pergunta,
      intencao: "ranking_cidades_desembolso",
      confianca: "media",
      resposta: "Nao encontrei dados suficientes para montar o ranking de cidades por desembolso.",
      dados: {
        total_cidades: 0,
        top: []
      },
      sugestoes: SUGESTOES_PADRAO
    };
  }

  const primeiro = ranking[0];
  return {
    pergunta,
    intencao: "ranking_cidades_desembolso",
    confianca: "alta",
    resposta: `Top ${ranking.length} cidades por desembolso calculado. A primeira e ${primeiro.cidade}/${primeiro.uf} com ${formatCurrency(primeiro.valor_desembolso)}.`,
    dados: {
      total_cidades: cityMap.size,
      top: ranking
    },
    sugestoes: [
      `Qual o desembolso da cidade de ${primeiro.cidade}?`,
      "Quais instrumentos vencem em 30 dias?",
      "Quais tickets estao atrasados e sem responsavel?"
    ]
  };
};

const responderObrasPercentualAltoDesembolsoBaixo = async (pergunta: string): Promise<AssistenteResposta> => {
  const normalized = normalizeText(pergunta);
  const cidadeInformada = extractCityFromQuestion(pergunta);
  const convenetes = cidadeInformada ? await findConvenetesByCity(cidadeInformada) : [];
  const conveneteIds = convenetes.map((item) => item.id);
  const percentualMatch = normalized.match(/\b(6\d|7\d|8\d|9\d|100)\b/);
  const percentualMinimo = percentualMatch?.[1] ? Number(percentualMatch[1]) : 70;

  const obras = await prisma.instrumentProposal.findMany({
    where: {
      ativo: true,
      fluxoTipo: InstrumentFlowType.OBRA,
      ...(cidadeInformada && conveneteIds.length > 0 ? { conveneteId: { in: conveneteIds } } : {})
    },
    select: {
      id: true,
      proposta: true,
      instrumento: true,
      valorRepasse: true,
      valorJaRepassado: true,
      objeto: true,
      convenete: { select: { cidade: true, uf: true } },
      workProgress: { select: { percentualObra: true, updatedAt: true } },
      measurementBulletins: {
        orderBy: [{ dataBoletim: "desc" }],
        take: 1,
        select: { percentualObraInformado: true, dataBoletim: true }
      },
      repasses: { select: { valorRepasse: true } }
    }
  });

  const filtered = obras
    .map((item) => {
      const percentual = resolvePercentualObra(item);
      const totalRepasses = item.repasses.reduce((sum, repasse) => sum + toNumber(repasse.valorRepasse), 0);
      const desembolso = totalRepasses > 0 ? totalRepasses : toNumber(item.valorJaRepassado);
      const valorRepasse = Math.max(0, toNumber(item.valorRepasse));
      const ratio = valorRepasse > 0 ? desembolso / valorRepasse : 0;
      return {
        item,
        percentual,
        desembolso,
        valorRepasse,
        ratio
      };
    })
    .filter((entry) => entry.percentual && entry.percentual.percentual >= percentualMinimo && entry.ratio <= 0.5)
    .sort((a, b) => b.percentual!.percentual - a.percentual!.percentual);

  return {
    pergunta,
    intencao: "obras_percentual_alto_desembolso_baixo",
    confianca: filtered.length > 0 ? "alta" : "media",
    resposta:
      filtered.length > 0
        ? `Encontrei ${filtered.length} obra(s) com execucao acima de ${percentualMinimo}% e desembolso proporcionalmente baixo.`
        : `Nao encontrei obras com execucao acima de ${percentualMinimo}% e desembolso baixo para esse filtro.`,
    dados: {
      cidade: convenetes[0]?.cidade ?? cidadeInformada ?? null,
      uf: convenetes[0]?.uf ?? null,
      percentual_minimo: percentualMinimo,
      total: filtered.length,
      amostra: filtered.slice(0, 8).map((entry) => ({
        id: entry.item.id,
        proposta: entry.item.proposta,
        instrumento: entry.item.instrumento,
        cidade: entry.item.convenete?.cidade ?? null,
        uf: entry.item.convenete?.uf ?? null,
        objeto: entry.item.objeto,
        percentual_execucao: Number(entry.percentual!.percentual.toFixed(2)),
        valor_repasse: Number(entry.valorRepasse.toFixed(2)),
        valor_desembolso: Number(entry.desembolso.toFixed(2)),
        ratio_desembolso: Number((entry.ratio * 100).toFixed(2))
      }))
    },
    sugestoes: [
      "Quais obras estao proximas de concluir?",
      "Qual o desembolso da cidade dessas obras?",
      "Quais tickets existem para esse instrumento?"
    ]
  };
};

const responderTransferenciasEspeciaisPorCnpj = async (pergunta: string): Promise<AssistenteResposta> => {
  const cnpj = extractCnpjFromQuestion(pergunta);
  if (!cnpj) {
    return {
      pergunta,
      intencao: "transferencias_especiais_cnpj",
      confianca: "baixa",
      resposta: "Informe o CNPJ para consultar as transferencias especiais.",
      sugestoes: [
        "Quais transferencias especiais existem para o CNPJ 11361227000189?",
        "Quais especiais do CNPJ 10114767000103 estao divergentes?"
      ]
    };
  }

  const items = await prisma.instrumentProposal.findMany({
    where: {
      ativo: true,
      concedente: { contains: "Especial", mode: "insensitive" },
      convenete: { cnpj }
    },
    include: {
      convenete: { select: { nome: true, cidade: true, uf: true, cnpj: true } }
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 12
  });

  const planos = items.map((item) => ({
    id: item.id,
    codigo_plano_acao: item.proposta,
    beneficiario: item.convenete?.nome ?? null,
    cidade: item.convenete?.cidade ?? null,
    uf: item.convenete?.uf ?? null,
    situacao_portal: extractObservacaoValue(item.observacoes, SITUACAO_PORTAL_PREFIX),
    situacao_api: extractObservacaoValue(item.observacoes, SITUACAO_API_PREFIX),
    comparacao_status: extractObservacaoValue(item.observacoes, STATUS_COMPARE_PREFIX),
    valor_repasse: toNumber(item.valorRepasse),
    parlamentar: item.responsavel
  }));

  return {
    pergunta,
    intencao: "transferencias_especiais_cnpj",
    confianca: planos.length > 0 ? "alta" : "media",
    resposta:
      planos.length > 0
        ? `Encontrei ${planos.length} transferencia(s) especial(is) para o CNPJ ${cnpj}.`
        : `Nao encontrei transferencias especiais para o CNPJ ${cnpj}.`,
    dados: {
      cnpj,
      total: planos.length,
      cidade: planos[0]?.cidade ?? null,
      uf: planos[0]?.uf ?? null,
      amostra: planos
    },
    sugestoes: [
      "Quais transferencias especiais estao com status divergente?",
      "Quais instrumentos existem para esse municipio?",
      "Mostre o ranking de cidades por desembolso"
    ]
  };
};

const responderTransferenciasEspeciaisPorMunicipio = async (pergunta: string): Promise<AssistenteResposta> => {
  const cidadeInformada = extractCityFromQuestion(pergunta);
  if (!cidadeInformada) {
    return {
      pergunta,
      intencao: "transferencias_especiais_municipio",
      confianca: "baixa",
      resposta: "Informe a cidade para consultar as transferencias especiais.",
      sugestoes: [
        "Quais transferencias especiais existem em Parnamirim?",
        "Quais especiais de Passira estao divergentes?"
      ]
    };
  }

  const convenetes = await findConvenetesByCity(cidadeInformada);
  if (convenetes.length === 0) {
    return {
      pergunta,
      intencao: "transferencias_especiais_municipio",
      confianca: "media",
      resposta: `Nao encontrei proponentes cadastrados para '${cidadeInformada}'.`,
      dados: { cidade: cidadeInformada, total: 0 },
      sugestoes: []
    };
  }

  const conveneteIds = convenetes.map((item) => item.id);
  const items = await prisma.instrumentProposal.findMany({
    where: {
      ativo: true,
      conveneteId: { in: conveneteIds },
      concedente: { contains: "Especial", mode: "insensitive" }
    },
    include: {
      convenete: { select: { nome: true, cidade: true, uf: true, cnpj: true } }
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 12
  });

  const cidadeBase = convenetes[0];
  return {
    pergunta,
    intencao: "transferencias_especiais_municipio",
    confianca: items.length > 0 ? "alta" : "media",
    resposta:
      items.length > 0
        ? `Encontrei ${items.length} transferencia(s) especial(is) em ${cidadeBase.cidade}/${cidadeBase.uf}.`
        : `Nao encontrei transferencias especiais em ${cidadeBase.cidade}/${cidadeBase.uf}.`,
    dados: {
      cidade: cidadeBase.cidade,
      uf: cidadeBase.uf,
      total: items.length,
      amostra: items.map((item) => ({
        id: item.id,
        codigo_plano_acao: item.proposta,
        cnpj: item.convenete?.cnpj ?? null,
        beneficiario: item.convenete?.nome ?? null,
        situacao_portal: extractObservacaoValue(item.observacoes, SITUACAO_PORTAL_PREFIX),
        situacao_api: extractObservacaoValue(item.observacoes, SITUACAO_API_PREFIX),
        comparacao_status: extractObservacaoValue(item.observacoes, STATUS_COMPARE_PREFIX),
        valor_repasse: toNumber(item.valorRepasse),
        parlamentar: item.responsavel
      }))
    },
    sugestoes: [
      `Quais instrumentos existem em ${cidadeBase.cidade}?`,
      `Qual o desembolso da cidade de ${cidadeBase.cidade}?`,
      "Quais transferencias especiais estao com status divergente?"
    ]
  };
};

const responderTransferenciasEspeciaisDivergentes = async (pergunta: string): Promise<AssistenteResposta> => {
  const cidadeInformada = extractCityFromQuestion(pergunta);
  const cnpj = extractCnpjFromQuestion(pergunta);
  const top = extractTopN(pergunta, 8);

  const convenetes = cidadeInformada ? await findConvenetesByCity(cidadeInformada) : [];
  const conveneteIds = convenetes.map((item) => item.id);

  const items = await prisma.instrumentProposal.findMany({
    where: {
      ativo: true,
      concedente: { contains: "Especial", mode: "insensitive" },
      observacoes: { contains: STATUS_COMPARE_PREFIX + "divergent" },
      ...(cnpj ? { convenete: { cnpj } } : {}),
      ...(cidadeInformada && conveneteIds.length > 0 ? { conveneteId: { in: conveneteIds } } : {})
    },
    include: {
      convenete: { select: { nome: true, cidade: true, uf: true, cnpj: true } }
    },
    orderBy: [{ updatedAt: "desc" }],
    take: top
  });

  return {
    pergunta,
    intencao: "transferencias_especiais_divergentes",
    confianca: items.length > 0 ? "alta" : "media",
    resposta:
      items.length > 0
        ? `Encontrei ${items.length} transferencia(s) especial(is) com divergencia entre painel e API.`
        : "Nao encontrei transferencias especiais com divergencia entre painel e API para esse filtro.",
    dados: {
      cidade: convenetes[0]?.cidade ?? cidadeInformada ?? null,
      uf: convenetes[0]?.uf ?? null,
      cnpj: cnpj ?? null,
      total: items.length,
      amostra: items.map((item) => ({
        id: item.id,
        codigo_plano_acao: item.proposta,
        beneficiario: item.convenete?.nome ?? null,
        cidade: item.convenete?.cidade ?? null,
        uf: item.convenete?.uf ?? null,
        cnpj: item.convenete?.cnpj ?? null,
        situacao_portal: extractObservacaoValue(item.observacoes, SITUACAO_PORTAL_PREFIX),
        situacao_api: extractObservacaoValue(item.observacoes, SITUACAO_API_PREFIX),
        comparacao_status: extractObservacaoValue(item.observacoes, STATUS_COMPARE_PREFIX),
        valor_repasse: toNumber(item.valorRepasse)
      }))
    },
    sugestoes: [
      "Quais transferencias especiais existem para esse CNPJ?",
      "Quais transferencias especiais existem nesse municipio?",
      "Quais instrumentos vencem em 30 dias?"
    ]
  };
};

const responderBuscaConhecimento = async (
  pergunta: string,
  entityType?: "instrumento" | "ticket" | "documento"
): Promise<AssistenteResposta> => {
  const results = await hybridSearchKnowledge(pergunta, {
    limit: env.assistentePgvectorTopK,
    entityType
  });

  if (results.length === 0) {
    return {
      pergunta,
      intencao: "busca_conhecimento",
      confianca: "baixa",
      resposta:
        "Nao encontrei evidencias suficientes na base de conhecimento para responder com seguranca. Tente informar proposta, instrumento, municipio ou periodo.",
      dados: {
        resultados: []
      },
      sugestoes: []
    };
  }

  const topResult = results[0];
  if (!topResult || topResult.final_score < 0.22) {
    return {
      pergunta,
      intencao: "busca_conhecimento",
      confianca: "baixa",
      resposta:
        "Encontrei alguns registros, mas sem evidencias suficientes para responder com seguranca. Informe um identificador mais especifico (proposta, instrumento, ticket ou municipio).",
      dados: {
        resultados: []
      },
      sugestoes: []
    };
  }

  const topByEntity = new Map<string, { entityType: string; entityId: string; score: number; snippet: string }>();
  for (const item of results) {
    const key = `${item.entity_type}:${item.entity_id}`;
    const current = topByEntity.get(key);
    if (!current || item.final_score > current.score) {
      topByEntity.set(key, {
        entityType: item.entity_type,
        entityId: item.entity_id,
        score: item.final_score,
        snippet: item.chunk_text.slice(0, 220)
      });
    }
  }

  const entityCandidates = [...topByEntity.values()].sort((a, b) => b.score - a.score).slice(0, 3);
  if (entityCandidates.length > 1) {
    const spread = Math.abs(entityCandidates[0].score - entityCandidates[1].score);
    if (spread < 0.06) {
      return {
        pergunta,
        intencao: "busca_conhecimento",
        confianca: "media",
        resposta: `Encontrei ${entityCandidates.length} registros muito parecidos para sua pergunta. Me diga qual deles voce quer analisar: ${entityCandidates
          .map((item) => `${item.entityType} ${item.entityId}`)
          .join(", ")}.`,
        dados: {
          candidatos: entityCandidates.map((item) => ({
            entity_type: item.entityType,
            entity_id: item.entityId,
            score: Number(item.score.toFixed(4)),
            snippet: item.snippet
          }))
        },
        sugestoes: []
      };
    }
  }

  const top = results.slice(0, 5).map((item) => ({
    entity_type: item.entity_type,
    entity_id: item.entity_id,
    source_table: item.source_table,
    source_field: item.source_field,
    score: Number(item.final_score.toFixed(4)),
    snippet: item.chunk_text.slice(0, 320)
  }));

  return {
    pergunta,
    intencao: "busca_conhecimento",
    confianca: topResult.final_score > 0.45 ? "alta" : "media",
    resposta: `Com base no registro ${topResult.entity_type} ${topResult.entity_id}, identifiquei o seguinte contexto: ${topResult.chunk_text
      .replace(/\s+/g, " ")
      .slice(0, 260)}${topResult.chunk_text.length > 260 ? "..." : ""}`,
    dados: {
      resultados: top
    },
    sugestoes: []
  };
};

const responderPorRegras = async (pergunta: string): Promise<AssistenteResposta> => {
  const identificadorNaoEncontrado = await responderIdentificadorNaoEncontrado(pergunta);
  if (identificadorNaoEncontrado) {
    return identificadorNaoEncontrado;
  }

  if (isTransferenciasEspeciaisQuestion(pergunta)) {
    const normalized = normalizeText(pergunta);
    if (hasAnyTerm(normalized, ["diverg", "divergente", "comparacao", "painel e api"])) {
      return responderTransferenciasEspeciaisDivergentes(pergunta);
    }
    if (extractCnpjFromQuestion(pergunta)) {
      return responderTransferenciasEspeciaisPorCnpj(pergunta);
    }
    if (extractCityFromQuestion(pergunta)) {
      return responderTransferenciasEspeciaisPorMunicipio(pergunta);
    }
  }

  if (isInstrumentosVencendoComTicketsQuestion(pergunta)) {
    return responderInstrumentosVencendoComTickets(pergunta);
  }

  if (isObrasPercentualAltoDesembolsoBaixoQuestion(pergunta)) {
    return responderObrasPercentualAltoDesembolsoBaixo(pergunta);
  }

  if (isRankingCidadesDesembolsoQuestion(pergunta)) {
    return responderRankingCidadesDesembolso(pergunta);
  }

  if (isInstrumentosMunicipioStatusQuestion(pergunta)) {
    return responderInstrumentosPorMunicipioStatus(pergunta);
  }

  if (isConveniosCidadeQuestion(pergunta)) {
    return responderConveniosPorCidade(pergunta);
  }

  if (isDesembolsoQuestion(pergunta)) {
    return responderDesembolsoPorCidade(pergunta);
  }

  if (isPercentualObraQuestion(pergunta)) {
    return responderPercentualObra(pergunta);
  }

  if (isTicketsPorInstrumentoQuestion(pergunta)) {
    return responderTicketsPorInstrumento(pergunta);
  }

  if (isTicketsAtrasadosSemResponsavelQuestion(pergunta)) {
    return responderTicketsAtrasadosSemResponsavel(pergunta);
  }

  if (isVigenciaQuestion(pergunta)) {
    return responderVigenciasInstrumentos(pergunta);
  }

  if (env.assistentePgvectorEnabled) {
    return responderBuscaConhecimento(pergunta);
  }

  return buildFallbackResponse(pergunta);
};

const executarTool = async (name: string, rawArgs: string | undefined, perguntaOriginal: string) => {
  const args = safeParseJson<Record<string, unknown>>(rawArgs) ?? {};

  if (name === "get_convenios_por_cidade") {
    const cidade = String(args.cidade ?? "").trim();
    const status = String(args.status ?? "").trim().toUpperCase();
    const statusPhrase =
      status === "EM_EXECUCAO"
        ? "em execucao"
        : status === "CONCLUIDO"
          ? "concluidos"
          : status === "VENCIDO"
            ? "vencidos"
            : status === "EM_ELABORACAO"
              ? "em elaboracao"
              : "";

    if (cidade && statusPhrase) {
      return responderConveniosPorCidade(`Quantos convenios da cidade de ${cidade} estao ${statusPhrase}?`);
    }

    return responderConveniosPorCidade(cidade ? `Quantos convenios a cidade de ${cidade} tem hoje?` : perguntaOriginal);
  }

  if (name === "get_instrumentos_por_municipio_status") {
    const cidade = String(args.cidade ?? "").trim();
    const status = String(args.status ?? "").trim().toUpperCase();
    const statusPhrase =
      status === "EM_EXECUCAO"
        ? "em execucao"
        : status === "CONCLUIDO"
          ? "concluidos"
          : status === "VENCIDO"
            ? "vencidos"
            : status === "EM_ELABORACAO"
              ? "em elaboracao"
              : status === "ASSINADO"
                ? "assinados"
                : status === "PRESTACAO_PENDENTE"
                  ? "em prestacao de contas"
                  : "";

    return responderInstrumentosPorMunicipioStatus(
      cidade ? `Quais instrumentos ${statusPhrase} existem na cidade de ${cidade}?` : perguntaOriginal
    );
  }

  if (name === "get_instrumentos_vencendo_com_tickets") {
    const cidade = String(args.cidade ?? "").trim();
    const diasArg = Number(args.dias ?? 30);
    const dias = Number.isFinite(diasArg) ? Math.max(1, Math.min(180, Math.floor(diasArg))) : 30;
    return responderInstrumentosVencendoComTickets(
      cidade
        ? `Quais instrumentos com tickets vencem em ${dias} dias na cidade de ${cidade}?`
        : `Quais instrumentos com tickets vencem em ${dias} dias?`
    );
  }

  if (name === "search_knowledge_base") {
    const query = String(args.query ?? "").trim();
    const entityTypeRaw = String(args.entity_type ?? "").trim();
    const entityType =
      entityTypeRaw === "instrumento" || entityTypeRaw === "ticket" || entityTypeRaw === "documento"
        ? (entityTypeRaw as "instrumento" | "ticket" | "documento")
        : undefined;

    return responderBuscaConhecimento(query || perguntaOriginal, entityType);
  }

  if (name === "get_desembolso_por_cidade") {
    const cidade = String(args.cidade ?? "").trim();
    return responderDesembolsoPorCidade(
      cidade ? `Qual valor de desembolso ja foi feito para a cidade de ${cidade}?` : perguntaOriginal
    );
  }

  if (name === "get_obras_percentual_alto_desembolso_baixo") {
    const percentualArg = Number(args.percentual_minimo ?? 70);
    const percentual = Number.isFinite(percentualArg) ? Math.max(1, Math.min(100, Math.floor(percentualArg))) : 70;
    const cidade = String(args.cidade ?? "").trim();
    return responderObrasPercentualAltoDesembolsoBaixo(
      cidade
        ? `Quais obras da cidade de ${cidade} estao acima de ${percentual}% com desembolso baixo?`
        : `Quais obras estao acima de ${percentual}% com desembolso baixo?`
    );
  }

  if (name === "get_percentual_obra") {
    const referencia = String(args.referencia ?? "").trim();
    return responderPercentualObra(
      referencia ? `Em quantos por cento esta a obra ${referencia}?` : perguntaOriginal
    );
  }

  if (name === "get_tickets_atrasados_sem_responsavel") {
    return responderTicketsAtrasadosSemResponsavel(perguntaOriginal);
  }

  if (name === "get_tickets_por_instrumento") {
    const referencia = String(args.referencia ?? "").trim();
    return responderTicketsPorInstrumento(
      referencia ? `Quais tickets existem para o instrumento ${referencia}?` : perguntaOriginal
    );
  }

  if (name === "get_vigencias_instrumentos") {
    const status = String(args.status ?? "").trim().toLowerCase();
    const diasArg = Number(args.dias ?? 30);
    const dias = Number.isFinite(diasArg) ? Math.max(1, Math.min(180, Math.floor(diasArg))) : 30;
    if (status === "vencidas") {
      return responderVigenciasInstrumentos("Quais instrumentos ja venceram?");
    }
    return responderVigenciasInstrumentos(`Quais instrumentos vencem em ${dias} dias?`);
  }

  if (name === "get_ranking_cidades_desembolso") {
    const topArg = Number(args.top ?? 5);
    const top = Number.isFinite(topArg) ? Math.max(1, Math.min(20, Math.floor(topArg))) : 5;
    return responderRankingCidadesDesembolso(`Top ${top} cidades por desembolso`);
  }

  if (name === "get_transferencias_especiais_por_cnpj") {
    const cnpj = String(args.cnpj ?? "").trim();
    return responderTransferenciasEspeciaisPorCnpj(
      cnpj ? `Quais transferencias especiais existem para o CNPJ ${cnpj}?` : perguntaOriginal
    );
  }

  if (name === "get_transferencias_especiais_por_municipio") {
    const cidade = String(args.cidade ?? "").trim();
    return responderTransferenciasEspeciaisPorMunicipio(
      cidade ? `Quais transferencias especiais existem na cidade de ${cidade}?` : perguntaOriginal
    );
  }

  if (name === "get_transferencias_especiais_divergentes") {
    const cidade = String(args.cidade ?? "").trim();
    const cnpj = String(args.cnpj ?? "").trim();
    const topArg = Number(args.top ?? 8);
    const top = Number.isFinite(topArg) ? Math.max(1, Math.min(20, Math.floor(topArg))) : 8;
    const filtro = cidade
      ? ` na cidade de ${cidade}`
      : cnpj
        ? ` para o CNPJ ${cnpj}`
        : "";
    return responderTransferenciasEspeciaisDivergentes(
      `Quais transferencias especiais estao divergentes${filtro}? top ${top}`
    );
  }

  return buildFallbackResponse(perguntaOriginal);
};

const sintetizarRespostaNatural = async (
  client: OpenAI,
  pergunta: string,
  resultado: AssistenteResposta
): Promise<string> => {
  try {
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.2,
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content:
            "Voce e o Assistente 360 do Gestconv. Responda em pt-BR, com objetividade, sem inventar dados e sem markdown complexo. Use apenas o resultado da consulta interna fornecida. Se faltar evidencia suficiente, diga isso explicitamente."
        },
        {
          role: "user",
          content: `Pergunta do usuario: ${pergunta}\n\nResultado interno estruturado:\n${JSON.stringify(resultado.dados ?? {}, null, 2)}\n\nResposta base: ${resultado.resposta}\n\nGere uma resposta natural e direta.`
        }
      ]
    });

    return completion.choices[0]?.message?.content?.trim() || resultado.resposta;
  } catch {
    return resultado.resposta;
  }
};

export const listarSessoesAssistente = async (userId: number, limit = 20) => {
  return prisma.assistenteChatSession.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }],
    take: Math.max(1, Math.min(50, limit)),
    select: {
      id: true,
      titulo: true,
      entidadeAtivaTipo: true,
      entidadeAtivaId: true,
      municipioAtivo: true,
      topicoAtivo: true,
      resumoContexto: true,
      updatedAt: true,
      createdAt: true
    }
  });
};

export const obterSessaoAssistente = async (userId: number, sessionId: string) => {
  const session = await prisma.assistenteChatSession.findFirst({
    where: {
      id: sessionId,
      userId
    },
    select: {
      id: true,
      titulo: true,
      entidadeAtivaTipo: true,
      entidadeAtivaId: true,
      municipioAtivo: true,
      topicoAtivo: true,
      resumoContexto: true,
      updatedAt: true,
      createdAt: true,
      messages: {
        orderBy: [{ createdAt: "asc" }],
        take: 100,
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true
        }
      }
    }
  });

  if (!session) {
    return null;
  }

  return {
    ...session,
    messages: session.messages.map((item) => ({
      id: item.id,
      role: item.role === AssistenteChatRole.user ? "user" : "assistant",
      text: item.content,
      created_at: item.createdAt.toISOString()
    }))
  };
};

export const responderPerguntaAssistente = async (
  payload: AssistentePerguntaInput,
  options: { userId: number }
): Promise<AssistenteResposta> => {
  const pergunta = payload.pergunta.trim();
  const sessionId = await ensureAssistenteSession(options.userId, payload.session_id);
  const historyFromDb = await loadSessionHistory(sessionId);
  const historyFromPayload = (payload.historico ?? [])
    .map((item) => ({ role: item.role, text: item.text.trim() }))
    .filter((item) => item.text !== "");
  const historico = (historyFromPayload.length > 0 ? historyFromPayload : historyFromDb).slice(-10);
  const client = getOpenAIClient();
  const getContextFlag = (perguntaContextual: string) => normalizeText(perguntaContextual) !== normalizeText(pergunta);

  await appendSessionMessage(sessionId, AssistenteChatRole.user, pergunta);

  const persistAndReturn = async (result: AssistenteResposta) => {
    const fontesConsultadas = buildFontesConsultadas(result);
    const resultComFontes = {
      ...result,
      fontes_consultadas: fontesConsultadas
    };

    await appendSessionMessage(sessionId, AssistenteChatRole.assistant, result.resposta);
    await updateSessionContext(
      sessionId,
      pergunta,
      resultComFontes.pergunta_interpretada ?? pergunta,
      resultComFontes.resposta,
      resultComFontes.intencao
    );
    await logAssistenteSearch(
      sessionId,
      options.userId,
      pergunta,
      resultComFontes.pergunta_interpretada ?? pergunta,
      resultComFontes
    );

    return {
      ...resultComFontes,
      session_id: sessionId
    };
  };

  if (!client) {
    const perguntaContextual = resolveQuestionWithRules(pergunta, historico);
    const contextoUsado = getContextFlag(perguntaContextual);
    const guardrail = await responderIdentificadorNaoEncontrado(perguntaContextual);
    if (guardrail) {
      return persistAndReturn({
        ...guardrail,
        pergunta,
        contexto_usado: contextoUsado,
        pergunta_interpretada: contextoUsado ? perguntaContextual : undefined
      });
    }

    const fallback = await responderPorRegras(perguntaContextual);
    return persistAndReturn({
      ...fallback,
      pergunta,
      contexto_usado: contextoUsado,
      pergunta_interpretada: contextoUsado ? perguntaContextual : undefined,
      resposta: `${fallback.resposta} (OpenAI nao configurada: defina OPENAI_API_KEY para habilitar interpretacao por IA.)`
    });
  }

  try {
    const perguntaContextual = await resolveQuestionWithAI(client, pergunta, historico);
    const contextoUsado = getContextFlag(perguntaContextual);
    const guardrail = await responderIdentificadorNaoEncontrado(perguntaContextual);
    if (guardrail) {
      return persistAndReturn({
        ...guardrail,
        pergunta,
        contexto_usado: contextoUsado,
        pergunta_interpretada: contextoUsado ? perguntaContextual : undefined
      });
    }

    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0,
      max_tokens: 200,
      tools: ASSISTENTE_TOOLS,
      tool_choice: "auto",
      messages: [
        {
          role: "system",
          content:
            "Voce decide qual funcao interna consultar para responder perguntas do Gestconv360. Sempre priorize chamar uma funcao (tool). Nao invente dados. Se houver pergunta contextualizada, use-a para escolher a tool."
        },
        {
          role: "user",
          content: JSON.stringify({
            pergunta_original: pergunta,
            pergunta_contextualizada: perguntaContextual,
            historico: historico.slice(-10)
          })
        }
      ]
    });

    const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.type !== "function") {
      const fallback = await responderPorRegras(perguntaContextual);
      return persistAndReturn({
        ...fallback,
        pergunta,
        contexto_usado: contextoUsado,
        pergunta_interpretada: contextoUsado ? perguntaContextual : undefined
      });
    }

    const consulta = await executarTool(toolCall.function.name, toolCall.function.arguments, perguntaContextual);
    const respostaNatural = await sintetizarRespostaNatural(client, pergunta, consulta);

    return persistAndReturn({
      ...consulta,
      pergunta,
      contexto_usado: contextoUsado,
      pergunta_interpretada: contextoUsado ? perguntaContextual : undefined,
      resposta: respostaNatural
    });
  } catch {
    const perguntaContextual = resolveQuestionWithRules(pergunta, historico);
    const contextoUsado = getContextFlag(perguntaContextual);
    const fallback = await responderPorRegras(perguntaContextual);
    return persistAndReturn({
      ...fallback,
      pergunta,
      contexto_usado: contextoUsado,
      pergunta_interpretada: contextoUsado ? perguntaContextual : undefined
    });
  }
};
