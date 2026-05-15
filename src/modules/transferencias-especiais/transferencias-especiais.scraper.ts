import { InstrumentStatus } from "@prisma/client";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import {
  createSystemInstrumentUpdateAuditLog,
  snapshotInstrumentForAudit
} from "../auditoria/auditoria.service";
import {
  isPlaywrightUnavailableError,
  type PlanoAcaoEspecialPortalItem,
  type PlanoAcaoDetalhesPortalItem,
  withTransferenciasEspeciaisPortalSession
} from "./transferencias-especiais.portal-scraper";
import {
  consolidarPagamentoTransferenciaEspecial,
  type DocumentoHabilEspecialFinanceiroItem,
  type EmpenhoEspecialFinanceiroItem,
  type OrdemPagamentoEspecialFinanceiroItem,
  type TransferenciaEspecialFinanceiroResumo
} from "./transferencias-especiais-financeiro";

type SyncProgressPayload = {
  fase_atual: string;
  progresso_percentual: number;
};

type SyncProgressHandler = (payload: SyncProgressPayload) => void | Promise<void>;

/**
 * Mapeia a situação vinda do portal Transferegov para o enum InstrumentStatus do sistema.
 */
function mapSituacaoToStatus(situacao: string): InstrumentStatus {
  const s = situacao.toLowerCase();
  if (s.includes('concluí') || s.includes('finalizado') || s.includes('encerrado')) {
    return InstrumentStatus.CONCLUIDO;
  }
  if (s.includes('prestação') && s.includes('contas')) {
    return InstrumentStatus.PRESTACAO_PENDENTE;
  }
  if (s.includes('execução') || s.includes('vigente') || s.includes('ciente')) {
    return InstrumentStatus.EM_EXECUCAO;
  }
  if (s.includes('assinado')) {
    return InstrumentStatus.ASSINADO;
  }
  if (s.includes('vencido') || s.includes('expirado')) {
    return InstrumentStatus.VENCIDO;
  }
  return InstrumentStatus.EM_ELABORACAO;
}

/**
 * Remove formatação de moeda e converte para número.
 * Ex: "R$ 1.234,56" -> 1234.56
 */
function parseMoeda(valorStr: string): number {
  if (!valorStr) return 0;
  const clean = valorStr.replace(/[R$\s.]/g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

type PlanoAcaoEspecialApiItem = {
  id_plano_acao: number;
  codigo_plano_acao: string;
  ano_plano_acao: number;
  situacao_plano_acao: string;
  cnpj_beneficiario_plano_acao: string;
  nome_beneficiario_plano_acao: string;
  uf_beneficiario_plano_acao: string;
  nome_parlamentar_emenda_plano_acao: string | null;
  codigo_emenda_parlamentar_formatado_plano_acao: string | null;
  valor_custeio_plano_acao: number | null;
  valor_investimento_plano_acao: number | null;
} & Record<string, unknown>;

type PlanoTrabalhoEspecialApiItem = {
  id_plano_acao: number | null;
  id_plano_trabalho: number | null;
  situacao_plano_trabalho: string | null;
};

type ResumoFinanceiroByPlanoId = Map<number, TransferenciaEspecialFinanceiroResumo>;

const TRANSFEREGOV_CONCEDENTE = "Transferência Especial (Transferegov)";

const SITUACAO_PREFIX = "SITUACAO_API:";
const SITUACAO_PORTAL_PREFIX = "SITUACAO_PORTAL:";
const STATUS_SOURCE_PREFIX = "STATUS_SYNC_SOURCE:";
const STATUS_COMPARE_PREFIX = "STATUS_SYNC_COMPARE:";

type StatusComparison = "match" | "divergent" | "portal_only" | "api_only" | "unavailable";

function buildObservacoesWithSituacao(existingObservacoes: string | null | undefined, situacao: string) {
  const cleanedSituacao = situacao.trim();
  if (!cleanedSituacao) {
    return existingObservacoes ?? null;
  }

  const previous = (existingObservacoes ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith(SITUACAO_PREFIX));

  return [`${SITUACAO_PREFIX}${cleanedSituacao}`, ...previous].join("\n");
}

function buildObservacoesWithStatusSources(
  existingObservacoes: string | null | undefined,
  payload: {
    situacaoPortal: string | null;
    situacaoApi: string | null;
    source: "portal_qlik_screen" | "api_oficial";
    comparison: StatusComparison;
  }
) {
  const previous = (existingObservacoes ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith(SITUACAO_PREFIX) &&
        !line.startsWith(SITUACAO_PORTAL_PREFIX) &&
        !line.startsWith(STATUS_SOURCE_PREFIX) &&
        !line.startsWith(STATUS_COMPARE_PREFIX)
    );

  return [
    payload.situacaoPortal ? `${SITUACAO_PORTAL_PREFIX}${payload.situacaoPortal}` : null,
    payload.situacaoApi ? `${SITUACAO_PREFIX}${payload.situacaoApi}` : null,
    `${STATUS_SOURCE_PREFIX}${payload.source}`,
    `${STATUS_COMPARE_PREFIX}${payload.comparison}`,
    ...previous
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

const normalizeBaseUrl = () => {
  const base = env.transferenciasEspeciaisBaseUrl.trim();
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

const getTimeoutMs = () => {
  if (!Number.isFinite(env.transferenciasEspeciaisTimeoutMs)) {
    return 15000;
  }
  return Math.max(2000, env.transferenciasEspeciaisTimeoutMs);
};

function readStringValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value).trim();
  return text;
}

function pickSituacaoFromPlano(plano: PlanoAcaoEspecialApiItem): string {
  const preferredKeys = [
    "descricao_situacao_plano_trabalho",
    "situacao_plano_trabalho_descricao",
    "situacao_plano_trabalho_desc",
    "ds_situacao_plano_trabalho",
    "situacao_plano_trabalho",
    "descricao_situacao_plano_acao",
    "situacao_plano_acao_descricao",
    "situacao_plano_acao_desc",
    "ds_situacao_plano_acao",
    "situacao_plano_acao",
    "status_plano_trabalho",
    "status_plano_acao"
  ];

  for (const key of preferredKeys) {
    const value = readStringValue(plano[key]);
    if (value) {
      return value;
    }
  }

  // Fallback heuristico para novos nomes de coluna vindos da API
  const entries = Object.entries(plano);
  for (const [key, rawValue] of entries) {
    const normalizedKey = key.toLowerCase();
    if (!normalizedKey.includes("situacao")) {
      continue;
    }
    if (!(normalizedKey.includes("plano") || normalizedKey.includes("trabalho"))) {
      continue;
    }
    const value = readStringValue(rawValue);
    if (value) {
      return value;
    }
  }

  return "";
}

function pickPortalSituacao(plano: PlanoAcaoEspecialPortalItem) {
  return plano.situacao_plano_trabalho ?? plano.situacao_plano_acao ?? "";
}

function compareStatus(portalStatus: string | null, apiStatus: string | null): StatusComparison {
  const portal = readStringValue(portalStatus);
  const api = readStringValue(apiStatus);
  if (portal && api) {
    return portal.localeCompare(api, "pt-BR", { sensitivity: "base" }) === 0 ? "match" : "divergent";
  }
  if (portal) {
    return "portal_only";
  }
  if (api) {
    return "api_only";
  }
  return "unavailable";
}

async function fetchPlanosAcaoByCnpj(cnpjDigits: string) {
  const allItems: PlanoAcaoEspecialApiItem[] = [];
  const limit = 500;
  let offset = 0;

  while (true) {
    const url = new URL(`${normalizeBaseUrl()}/plano_acao_especial`);
    // Busca todos os campos para capturar corretamente a situacao exibida no portal
    // (algumas instancias trazem a situacao amigavel em coluna diferente de situacao_plano_acao).
    url.searchParams.set("select", "*");
    url.searchParams.set("cnpj_beneficiario_plano_acao", `eq.${cnpjDigits}`);
    url.searchParams.set("order", "ano_plano_acao.desc,id_plano_acao.desc");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs());

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Falha ao consultar API oficial (${response.status}). ${detail || ""}`.trim());
    }

    const pageItems = (await response.json()) as PlanoAcaoEspecialApiItem[];
    if (!Array.isArray(pageItems) || pageItems.length === 0) {
      break;
    }

    allItems.push(...pageItems);
    if (pageItems.length < limit) {
      break;
    }

    offset += limit;
  }

  return allItems;
}

async function fetchPlanoTrabalhoSituacoesByPlanoIds(planoIds: number[]) {
  const result = new Map<number, string>();
  if (planoIds.length === 0) {
    return result;
  }

  const uniqueIds = Array.from(new Set(planoIds.filter((id) => Number.isFinite(id) && id > 0)));
  const chunkSize = 100;

  for (let index = 0; index < uniqueIds.length; index += chunkSize) {
    const chunk = uniqueIds.slice(index, index + chunkSize);
    const url = new URL(`${normalizeBaseUrl()}/plano_trabalho_especial`);
    url.searchParams.set("select", "id_plano_acao,id_plano_trabalho,situacao_plano_trabalho");
    url.searchParams.set("id_plano_acao", `in.(${chunk.join(",")})`);
    url.searchParams.set("order", "id_plano_acao.asc,id_plano_trabalho.desc");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs());

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Falha ao consultar plano_trabalho_especial (${response.status}). ${detail || ""}`.trim());
    }

    const rows = (await response.json()) as PlanoTrabalhoEspecialApiItem[];
    if (!Array.isArray(rows)) {
      continue;
    }

    for (const row of rows) {
      const idPlanoAcao = Number(row.id_plano_acao);
      if (!Number.isFinite(idPlanoAcao) || idPlanoAcao <= 0 || result.has(idPlanoAcao)) {
        continue;
      }
      const situacao = readStringValue(row.situacao_plano_trabalho);
      if (situacao) {
        result.set(idPlanoAcao, situacao);
      }
    }
  }

  return result;
}

async function fetchApiRows<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T[]> {
  const url = new URL(`${normalizeBaseUrl()}/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs());

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Falha ao consultar ${endpoint} (${response.status}). ${detail || ""}`.trim());
  }

  const rows = (await response.json()) as T[];
  return Array.isArray(rows) ? rows : [];
}

async function fetchResumoFinanceiroByPlanoIds(planoIds: number[]): Promise<ResumoFinanceiroByPlanoId> {
  const result = new Map<number, TransferenciaEspecialFinanceiroResumo>();
  const uniquePlanoIds = Array.from(new Set(planoIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniquePlanoIds.length === 0) {
    return result;
  }

  const chunkSize = 100;
  const empenhos: EmpenhoEspecialFinanceiroItem[] = [];

  for (let index = 0; index < uniquePlanoIds.length; index += chunkSize) {
    const chunk = uniquePlanoIds.slice(index, index + chunkSize);
    const rows = await fetchApiRows<EmpenhoEspecialFinanceiroItem>("empenho_especial", {
      select: "id_empenho,id_plano_acao,numero_empenho,valor_empenho",
      id_plano_acao: `in.(${chunk.join(",")})`,
      limit: "10000"
    });
    empenhos.push(...rows);
  }

  const empenhoIds = Array.from(
    new Set(
      empenhos
        .map((item) => Number(item.id_empenho))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
  );
  const documentosHabeis: DocumentoHabilEspecialFinanceiroItem[] = [];

  for (let index = 0; index < empenhoIds.length; index += chunkSize) {
    const chunk = empenhoIds.slice(index, index + chunkSize);
    const rows = await fetchApiRows<DocumentoHabilEspecialFinanceiroItem>("documento_habil_especial", {
      select:
        "id_dh,id_empenho,numero_documento_habil,data_emissao_dh,valor_dh,descricao_situacao_dh",
      id_empenho: `in.(${chunk.join(",")})`,
      limit: "10000"
    });
    documentosHabeis.push(...rows);
  }

  const documentoIds = Array.from(
    new Set(
      documentosHabeis
        .map((item) => Number(item.id_dh))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
  );
  const ordensPagamento: OrdemPagamentoEspecialFinanceiroItem[] = [];

  for (let index = 0; index < documentoIds.length; index += chunkSize) {
    const chunk = documentoIds.slice(index, index + chunkSize);
    const rows = await fetchApiRows<OrdemPagamentoEspecialFinanceiroItem>(
      "ordem_pagamento_ordem_bancaria_especial",
      {
        select:
          "id_op_ob,id_dh,data_emissao_op,numero_ordem_pagamento,descricao_situacao_op,data_situacao_op,data_emissao_ob,numero_ordem_bancaria",
        id_dh: `in.(${chunk.join(",")})`,
        limit: "10000"
      }
    );
    ordensPagamento.push(...rows);
  }

  const empenhosByPlanoId = new Map<number, EmpenhoEspecialFinanceiroItem[]>();
  for (const empenho of empenhos) {
    const idPlanoAcao = Number(empenho.id_plano_acao);
    if (!Number.isFinite(idPlanoAcao)) {
      continue;
    }
    const current = empenhosByPlanoId.get(idPlanoAcao) ?? [];
    current.push(empenho);
    empenhosByPlanoId.set(idPlanoAcao, current);
  }

  const documentosByEmpenhoId = new Map<number, DocumentoHabilEspecialFinanceiroItem[]>();
  for (const documento of documentosHabeis) {
    const idEmpenho = Number(documento.id_empenho);
    if (!Number.isFinite(idEmpenho)) {
      continue;
    }
    const current = documentosByEmpenhoId.get(idEmpenho) ?? [];
    current.push(documento);
    documentosByEmpenhoId.set(idEmpenho, current);
  }

  const ordensByDocumentoId = new Map<number, OrdemPagamentoEspecialFinanceiroItem[]>();
  for (const ordem of ordensPagamento) {
    const idDh = Number(ordem.id_dh);
    if (!Number.isFinite(idDh)) {
      continue;
    }
    const current = ordensByDocumentoId.get(idDh) ?? [];
    current.push(ordem);
    ordensByDocumentoId.set(idDh, current);
  }

  const dataConsulta = new Date();
  for (const idPlanoAcao of uniquePlanoIds) {
    const empenhosPlano = empenhosByPlanoId.get(idPlanoAcao) ?? [];
    const documentosPlano = empenhosPlano.flatMap((empenho) =>
      documentosByEmpenhoId.get(Number(empenho.id_empenho)) ?? []
    );
    const ordensPlano = documentosPlano.flatMap((documento) =>
      ordensByDocumentoId.get(Number(documento.id_dh)) ?? []
    );
    result.set(
      idPlanoAcao,
      consolidarPagamentoTransferenciaEspecial(empenhosPlano, documentosPlano, ordensPlano, dataConsulta)
    );
  }

  return result;
}

async function persistirResumoFinanceiroTransferenciaEspecial(
  instrumentId: number,
  resumo: TransferenciaEspecialFinanceiroResumo | undefined
) {
  if (!resumo) {
    return;
  }

  await prisma.transferenciaEspecialFinanceiro.upsert({
    where: { instrumentId },
    create: {
      instrumentId,
      pagoDetectado: resumo.pagoDetectado,
      dataPrimeiroPagamento: resumo.dataPrimeiroPagamento,
      dataUltimoPagamento: resumo.dataUltimoPagamento,
      valorPagoDetectado: resumo.valorPagoDetectado,
      quantidadeEmpenhos: resumo.quantidadeEmpenhos,
      quantidadeDocumentosHabeis: resumo.quantidadeDocumentosHabeis,
      quantidadeOrdensPagamento: resumo.quantidadeOrdensPagamento,
      documentoHabilPrincipal: resumo.documentoHabilPrincipal,
      ordemPagamentoPrincipal: resumo.ordemPagamentoPrincipal,
      ordemBancariaPrincipal: resumo.ordemBancariaPrincipal,
      situacaoPagamento: resumo.situacaoPagamento,
      dataUltimaConsulta: resumo.dataUltimaConsulta,
      payloadResumo: resumo.payloadResumo
    },
    update: {
      pagoDetectado: resumo.pagoDetectado,
      dataPrimeiroPagamento: resumo.dataPrimeiroPagamento,
      dataUltimoPagamento: resumo.dataUltimoPagamento,
      valorPagoDetectado: resumo.valorPagoDetectado,
      quantidadeEmpenhos: resumo.quantidadeEmpenhos,
      quantidadeDocumentosHabeis: resumo.quantidadeDocumentosHabeis,
      quantidadeOrdensPagamento: resumo.quantidadeOrdensPagamento,
      documentoHabilPrincipal: resumo.documentoHabilPrincipal,
      ordemPagamentoPrincipal: resumo.ordemPagamentoPrincipal,
      ordemBancariaPrincipal: resumo.ordemBancariaPrincipal,
      situacaoPagamento: resumo.situacaoPagamento,
      dataUltimaConsulta: resumo.dataUltimaConsulta,
      payloadResumo: resumo.payloadResumo
    }
  });
}

async function fetchPlanoAcaoDetalhesByPortal(
  portalSession: { fetchPlanoAcaoDetalhes: (id: number) => Promise<PlanoAcaoDetalhesPortalItem> },
  planoIds: number[]
): Promise<Map<number, PlanoAcaoDetalhesPortalItem>> {
  const result = new Map<number, PlanoAcaoDetalhesPortalItem>();
  if (planoIds.length === 0) {
    return result;
  }

  const uniqueIds = Array.from(new Set(planoIds.filter((id) => Number.isFinite(id) && id > 0)));
  
  console.log(`  Buscando detalhes de ${uniqueIds.length} planos via portal...`);
  
  for (const id of uniqueIds) {
    try {
      const detalhes = await portalSession.fetchPlanoAcaoDetalhes(id);
      result.set(id, detalhes);
    } catch (error) {
      console.error(`  Erro ao buscar detalhes do plano ${id}:`, error instanceof Error ? error.message : String(error));
    }
  }

  return result;
}

function normalizePlanoCode(codigoPlano: string) {
  const trimmed = codigoPlano.trim();
  const match = trimmed.match(/^0903(\d{4})-(?:(?:\d+)-)?(\d+)$/);
  if (!match) {
    return trimmed;
  }
  const ano = match[1];
  const numero = match[2].padStart(6, "0");
  return `0903${ano}-${numero}`;
}

function toLegacyPlanoCode(codigoPlanoPadrao: string) {
  const match = codigoPlanoPadrao.match(/^0903(\d{4})-(\d{6})$/);
  if (!match) {
    return null;
  }
  const ano = match[1];
  const numero = parseInt(match[2], 10).toString();
  return `${numero}/${ano}`;
}

function normalizeEmendaParlamentar(value: string) {
  return value.trim().toLocaleUpperCase("pt-BR");
}

function toSafeDateFromYear(year: number | null | undefined) {
  const fallbackYear = new Date().getFullYear();
  const safeYear = Number.isFinite(year) && year && year >= 2000 && year <= 2100 ? year : fallbackYear;
  return new Date(`${safeYear}-01-01T00:00:00Z`);
}

type ConveneteSyncItem = {
  id: number;
  cnpj: string;
  nome: string;
  uf: string;
};

async function sincronizarConvenetes(
  convenetes: ConveneteSyncItem[],
  onProgress?: SyncProgressHandler
) {
  console.log(`Encontrados ${convenetes.length} convenentes para processar.`);
  await onProgress?.({
    fase_atual: "Consultando API oficial e portal Transferegov por convenente",
    progresso_percentual: 5
  });

  let totalAtualizados = 0;
  let totalCriados = 0;
  let totalErros = 0;

  await withTransferenciasEspeciaisPortalSession(async (portalSession) => {
    for (let index = 0; index < convenetes.length; index++) {
      const convenete = convenetes[index];
      const cnpjDigits = convenete.cnpj.replace(/\D/g, "");
      if (cnpjDigits.length !== 14) {
        continue;
      }

      const progress = convenetes.length > 0 ? 8 + Math.round(((index + 1) / convenetes.length) * 88) : 96;
      await onProgress?.({
        fase_atual: `Consultando ${convenete.nome} | API oficial + portal Transferegov`,
        progresso_percentual: progress
      });
      console.log(`\nProcessando CNPJ: ${convenete.cnpj} (${convenete.nome})...`);

      try {
        const planos = await fetchPlanosAcaoByCnpj(cnpjDigits);
        const situacoesPlanoTrabalhoById = await fetchPlanoTrabalhoSituacoesByPlanoIds(
          planos.map((item) => Number(item.id_plano_acao))
        );
        const detalhesById = await fetchPlanoAcaoDetalhesByPortal(
          portalSession,
          planos.map((item) => Number(item.id_plano_acao))
        );
        const financeiroById = await fetchResumoFinanceiroByPlanoIds(
          planos.map((item) => Number(item.id_plano_acao))
        );
        console.log(`  API oficial retornou ${planos.length} planos para o CNPJ.`);
        console.log(`  Detalhes extraidos de ${detalhesById.size} planos via portal Transferegov.`);
        console.log(`  Resumos financeiros processados de ${financeiroById.size} planos via API oficial.`);

        const codigosProcessados = new Set<string>();
        for (const plano of planos) {
        const codigoPlano = String(plano.codigo_plano_acao ?? "").trim();
        if (!codigoPlano || codigosProcessados.has(codigoPlano)) {
          continue;
        }
        codigosProcessados.add(codigoPlano);

        const codigoNormalizado = normalizePlanoCode(codigoPlano);
        const codigoLegacy = toLegacyPlanoCode(codigoNormalizado);
        const emendaFormatada = (plano.codigo_emenda_parlamentar_formatado_plano_acao ?? "").trim();
        const parlamentar = (plano.nome_parlamentar_emenda_plano_acao ?? "").trim();
        const emendaParlamentar = emendaFormatada || parlamentar;
        const emendaParlamentarNormalizada = emendaParlamentar ? normalizeEmendaParlamentar(emendaParlamentar) : "";
        const idPlanoAcao = Number(plano.id_plano_acao);
        const situacaoPlanoTrabalho = Number.isFinite(idPlanoAcao)
          ? situacoesPlanoTrabalhoById.get(idPlanoAcao) ?? ""
          : "";
        const situacaoApi = situacaoPlanoTrabalho || pickSituacaoFromPlano(plano);
        const situacao = situacaoApi;
        const source = "api_oficial";
        const comparison = compareStatus(null, situacaoApi || null);
        const valorCusteio = Number(plano.valor_custeio_plano_acao ?? 0);
        const valorInvestimento = Number(plano.valor_investimento_plano_acao ?? 0);
        const valorTotal = Number.isFinite(valorCusteio + valorInvestimento)
          ? valorCusteio + valorInvestimento
          : parseMoeda(String(plano.valor_investimento_plano_acao ?? "0"));

        const detalhes = detalhesById.get(idPlanoAcao);
        const resumoFinanceiro = financeiroById.get(idPlanoAcao);

        const existing = await prisma.instrumentProposal.findFirst({
          where: {
            OR: [
              { proposta: codigoNormalizado },
              { instrumento: codigoNormalizado },
              { proposta: codigoPlano },
              { instrumento: codigoPlano },
              ...(codigoLegacy ? [{ proposta: codigoLegacy }, { instrumento: codigoLegacy }] : [])
            ]
          }
        });

        if (existing) {
          const shouldNormalizeProposta = existing.proposta !== codigoNormalizado;
          const shouldNormalizeInstrumento = existing.instrumento !== codigoNormalizado;

          const updated = await prisma.instrumentProposal.update({
            where: { id: existing.id },
            data: {
              ...(shouldNormalizeProposta ? { proposta: codigoNormalizado } : {}),
              ...(shouldNormalizeInstrumento ? { instrumento: codigoNormalizado } : {}),
              status: mapSituacaoToStatus(situacao),
observacoes: buildObservacoesWithStatusSources(existing.observacoes, {
                situacaoPortal: null,
                situacaoApi: situacaoApi || null,
                source,
                comparison
              }),
              valorRepasse: valorTotal,
              responsavel:emendaFormatada ? normalizeEmendaParlamentar(emendaFormatada) : null,
              concedente: TRANSFEREGOV_CONCEDENTE,
              conveneteId: existing.conveneteId ?? convenete.id,
              finalidade: detalhes?.finalidade ?? existing.finalidade,
              detalhamentoObjeto: detalhes?.detalhamento_objeto ?? existing.detalhamentoObjeto,
              banco: detalhes?.banco ?? (/^\d{3}\s*-\s*.+/.test(existing.banco ?? "") ? existing.banco : null),
              agencia: detalhes?.agencia ?? (/^\d{3,6}-\d{1,2}$/.test(existing.agencia ?? "") ? existing.agencia : null),
              conta: detalhes?.conta ?? (/^\d{5,}-\d{1,2}$/.test(existing.conta ?? "") ? existing.conta : null),
              saldoContaCorrente: detalhes?.saldo_conta_corrente ?? existing.saldoContaCorrente
            },
            select: {
              id: true,
              proposta: true,
              instrumento: true,
              objeto: true,
              valorRepasse: true,
              valorContrapartida: true,
              concedente: true,
              fluxoTipo: true,
              status: true,
              responsavel: true,
              observacoes: true,
              percentualFisicoMedicao: true,
              percentualFinanceiroMedicao: true,
              statusMedicao: true,
              dataUltimaAtualizacaoMedicao: true,
              ativo: true,
              conveneteId: true
            }
          });
          await createSystemInstrumentUpdateAuditLog({
            instrumentId: existing.id,
            source: "SYNC_TRANSFERENCIAS_ESPECIAIS",
            beforeData: snapshotInstrumentForAudit(existing),
            afterData: snapshotInstrumentForAudit(updated)
          });
          await persistirResumoFinanceiroTransferenciaEspecial(existing.id, resumoFinanceiro);
          totalAtualizados += 1;
          continue;
        }

        const created = await prisma.instrumentProposal.create({
        data: {
          proposta: codigoNormalizado,
            instrumento: codigoNormalizado,
            objeto: `Transferência Especial - ${emendaParlamentarNormalizada || convenete.nome}`,
            valorRepasse: valorTotal,
            valorContrapartida: 0,
            dataCadastro: toSafeDateFromYear(plano.ano_plano_acao),
            vigenciaInicio: new Date(),
            vigenciaFim: new Date(),
            concedente: TRANSFEREGOV_CONCEDENTE,
            status: mapSituacaoToStatus(situacao),
observacoes: buildObservacoesWithStatusSources(null, {
              situacaoPortal: null,
              situacaoApi: situacaoApi || null,
              source,
              comparison
            }),
            responsavel:emendaFormatada ? normalizeEmendaParlamentar(emendaFormatada) : null,
            conveneteId: convenete.id,
            ativo: true,
            finalidade: detalhes?.finalidade ?? null,
            detalhamentoObjeto: detalhes?.detalhamento_objeto ?? null,
            banco: detalhes?.banco ?? null,
            agencia: detalhes?.agencia ?? null,
            conta: detalhes?.conta ?? null,
            saldoContaCorrente: detalhes?.saldo_conta_corrente ?? null
          }
        });
        await persistirResumoFinanceiroTransferenciaEspecial(created.id, resumoFinanceiro);
        totalCriados += 1;
      }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Erro ao processar CNPJ ${convenete.cnpj}: ${message}`);
        console.error(`Detalhe: ${message}`);
        totalErros++;
      }
    }
  });

  return {
    totalAtualizados,
    totalCriados,
    totalErros
  };
}

async function sincronizarConvenetesApiOnly(
  convenetes: ConveneteSyncItem[],
  onProgress?: SyncProgressHandler
) {
  console.log(`Encontrados ${convenetes.length} convenentes para processar em modo fallback API-only.`);
  await onProgress?.({
    fase_atual: "Painel publico indisponivel; sincronizando somente com API oficial",
    progresso_percentual: 5
  });

  let totalAtualizados = 0;
  let totalCriados = 0;
  let totalErros = 0;

  for (let index = 0; index < convenetes.length; index++) {
    const convenete = convenetes[index];
    const cnpjDigits = convenete.cnpj.replace(/\D/g, "");
    if (cnpjDigits.length !== 14) {
      continue;
    }

    const progress = convenetes.length > 0 ? 8 + Math.round(((index + 1) / convenetes.length) * 88) : 96;
    await onProgress?.({
      fase_atual: `Consultando ${convenete.nome} | modo fallback: API oficial`,
      progresso_percentual: progress
    });
    console.log(`\nProcessando CNPJ: ${convenete.cnpj} (${convenete.nome}) em modo API-only...`);

    try {
      const planos = await fetchPlanosAcaoByCnpj(cnpjDigits);
      const situacoesPlanoTrabalhoById = await fetchPlanoTrabalhoSituacoesByPlanoIds(
        planos.map((item) => Number(item.id_plano_acao))
      );
      const detalhesById = new Map<number, PlanoAcaoDetalhesPortalItem>();
      const financeiroById = await fetchResumoFinanceiroByPlanoIds(
        planos.map((item) => Number(item.id_plano_acao))
      );
      console.log(`  API oficial retornou ${planos.length} planos para o CNPJ.`);
      console.log(`  Resumos financeiros processados de ${financeiroById.size} planos via API oficial.`);

      const codigosProcessados = new Set<string>();
      for (const plano of planos) {
        const codigoPlano = String(plano.codigo_plano_acao ?? "").trim();
        if (!codigoPlano || codigosProcessados.has(codigoPlano)) {
          continue;
        }
        codigosProcessados.add(codigoPlano);

        const codigoNormalizado = normalizePlanoCode(codigoPlano);
        const codigoLegacy = toLegacyPlanoCode(codigoNormalizado);
        const emendaFormatada = (plano.codigo_emenda_parlamentar_formatado_plano_acao ?? "").trim();
        const parlamentar = (plano.nome_parlamentar_emenda_plano_acao ?? "").trim();
        const emendaParlamentar = emendaFormatada || parlamentar;
        const emendaParlamentarNormalizada = emendaParlamentar ? normalizeEmendaParlamentar(emendaParlamentar) : "";
        const idPlanoAcao = Number(plano.id_plano_acao);
        const situacaoPlanoTrabalho = Number.isFinite(idPlanoAcao)
          ? situacoesPlanoTrabalhoById.get(idPlanoAcao) ?? ""
          : "";
        const situacaoApi = situacaoPlanoTrabalho || pickSituacaoFromPlano(plano);
        const valorCusteio = Number(plano.valor_custeio_plano_acao ?? 0);
        const valorInvestimento = Number(plano.valor_investimento_plano_acao ?? 0);
        const valorTotal = Number.isFinite(valorCusteio + valorInvestimento)
          ? valorCusteio + valorInvestimento
          : parseMoeda(String(plano.valor_investimento_plano_acao ?? "0"));

        const detalhes = detalhesById.get(idPlanoAcao);
        const resumoFinanceiro = financeiroById.get(idPlanoAcao);

        const existing = await prisma.instrumentProposal.findFirst({
          where: {
            OR: [
              { proposta: codigoNormalizado },
              { instrumento: codigoNormalizado },
              { proposta: codigoPlano },
              { instrumento: codigoPlano },
              ...(codigoLegacy ? [{ proposta: codigoLegacy }, { instrumento: codigoLegacy }] : [])
            ]
          }
        });

        if (existing) {
          const shouldNormalizeProposta = existing.proposta !== codigoNormalizado;
          const shouldNormalizeInstrumento = existing.instrumento !== codigoNormalizado;

          const updated = await prisma.instrumentProposal.update({
            where: { id: existing.id },
            data: {
              ...(shouldNormalizeProposta ? { proposta: codigoNormalizado } : {}),
              ...(shouldNormalizeInstrumento ? { instrumento: codigoNormalizado } : {}),
              status: mapSituacaoToStatus(situacaoApi),
              observacoes: buildObservacoesWithStatusSources(existing.observacoes, {
                situacaoPortal: null,
                situacaoApi: situacaoApi || null,
                source: "api_oficial",
                comparison: "api_only"
              }),
              valorRepasse: valorTotal,
              responsavel: emendaParlamentarNormalizada || null,
concedente: TRANSFEREGOV_CONCEDENTE,
              conveneteId: existing.conveneteId ?? convenete.id,
              finalidade: detalhes?.finalidade ?? existing.finalidade,
              detalhamentoObjeto: detalhes?.detalhamento_objeto ?? existing.detalhamentoObjeto,
              banco: detalhes?.banco ?? (/^\d{3}\s*-\s*.+/.test(existing.banco ?? "") ? existing.banco : null),
              agencia: detalhes?.agencia ?? (/^\d{3,6}-\d{1,2}$/.test(existing.agencia ?? "") ? existing.agencia : null),
              conta: detalhes?.conta ?? (/^\d{5,}-\d{1,2}$/.test(existing.conta ?? "") ? existing.conta : null),
              saldoContaCorrente: detalhes?.saldo_conta_corrente ?? existing.saldoContaCorrente
            },
            select: {
              id: true,
              proposta: true,
              instrumento: true,
              objeto: true,
              valorRepasse: true,
              valorContrapartida: true,
              concedente: true,
              fluxoTipo: true,
              status: true,
              responsavel: true,
              observacoes: true,
              percentualFisicoMedicao: true,
              percentualFinanceiroMedicao: true,
              statusMedicao: true,
              dataUltimaAtualizacaoMedicao: true,
              ativo: true,
              conveneteId: true
            }
          });
          await createSystemInstrumentUpdateAuditLog({
            instrumentId: existing.id,
            source: "SYNC_TRANSFERENCIAS_ESPECIAIS_API_ONLY",
            beforeData: snapshotInstrumentForAudit(existing),
            afterData: snapshotInstrumentForAudit(updated)
          });
          await persistirResumoFinanceiroTransferenciaEspecial(existing.id, resumoFinanceiro);
          totalAtualizados += 1;
          continue;
        }

        const created = await prisma.instrumentProposal.create({
          data: {
            proposta: codigoNormalizado,
            instrumento: codigoNormalizado,
            objeto: `Transferência Especial - ${emendaParlamentarNormalizada || convenete.nome}`,
            valorRepasse: valorTotal,
            valorContrapartida: 0,
            dataCadastro: toSafeDateFromYear(plano.ano_plano_acao),
            vigenciaInicio: new Date(),
            vigenciaFim: new Date(),
            concedente: TRANSFEREGOV_CONCEDENTE,
            status: mapSituacaoToStatus(situacaoApi),
            observacoes: buildObservacoesWithStatusSources(null, {
              situacaoPortal: null,
              situacaoApi: situacaoApi || null,
              source: "api_oficial",
              comparison: "api_only"
            }),
            responsavel:emendaFormatada ? normalizeEmendaParlamentar(emendaFormatada) : null,
            conveneteId: convenete.id,
            ativo: true,
            finalidade: detalhes?.finalidade ?? null,
            detalhamentoObjeto: detalhes?.detalhamento_objeto ?? null,
            banco: detalhes?.banco ?? null,
            agencia: detalhes?.agencia ?? null,
            conta: detalhes?.conta ?? null,
            saldoContaCorrente: detalhes?.saldo_conta_corrente ?? null
          }
        });
        await persistirResumoFinanceiroTransferenciaEspecial(created.id, resumoFinanceiro);
        totalCriados += 1;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Erro ao processar CNPJ ${convenete.cnpj}: ${message}`);
      console.error(`Detalhe: ${message}`);
      totalErros++;
    }
  }

  return {
    totalAtualizados,
    totalCriados,
    totalErros
  };
}

export async function sincronizarTransferenciasEspeciaisRealtime(onProgress?: SyncProgressHandler) {
  console.log("Iniciando sincronizacao de Transferencias Especiais via painel publico + API oficial...");

  try {
    console.log("Sincronizacao iniciada sem limpeza destrutiva previa.");
    console.log("Modo: painel publico como fonte prioritaria de status, API oficial como fallback e auditoria.");

    const convenetes = await prisma.convenete.findMany({
      select: { id: true, cnpj: true, nome: true, uf: true }
    });
    const result = await sincronizarConvenetes(convenetes, onProgress);

    console.log("\nSincronizacao concluida.");
    console.log(`Total de registros atualizados: ${result.totalAtualizados}`);
    console.log(`Total de registros criados: ${result.totalCriados}`);
    console.log(`Total de falhas (CNPJs): ${result.totalErros}`);
    console.log(`SYNC_SUMMARY:${JSON.stringify({
      strategy: "portal_prioritario_api_auditoria",
      totalAtualizados: result.totalAtualizados,
      totalCriados: result.totalCriados,
      totalErros: result.totalErros
    })}`);
    await onProgress?.({
      fase_atual: "Sincronizacao concluida",
      progresso_percentual: 100
    });

  } catch (err) {
    if (isPlaywrightUnavailableError(err)) {
      console.warn("Playwright/browser indisponivel. Aplicando fallback para API oficial.");
      const convenetes = await prisma.convenete.findMany({
        select: { id: true, cnpj: true, nome: true, uf: true }
      });
      const result = await sincronizarConvenetesApiOnly(convenetes, onProgress);
      console.log("\nSincronizacao concluida em modo fallback API-only.");
      console.log(`Total de registros atualizados: ${result.totalAtualizados}`);
      console.log(`Total de registros criados: ${result.totalCriados}`);
      console.log(`Total de falhas (CNPJs): ${result.totalErros}`);
      console.log(
        `SYNC_SUMMARY:${JSON.stringify({
          strategy: "api_only_fallback_playwright_unavailable",
          totalAtualizados: result.totalAtualizados,
          totalCriados: result.totalCriados,
          totalErros: result.totalErros
        })}`
      );
      await onProgress?.({
        fase_atual: "Sincronizacao concluida em modo fallback API oficial",
        progresso_percentual: 100
      });
      return;
    }
    console.error("Erro critico na sincronizacao via painel publico + API oficial:", err);
    await onProgress?.({
      fase_atual: "Erro na sincronizacao",
      progresso_percentual: 100
    });
    throw err;
  }
}

export async function sincronizarTransferenciasEspeciaisRealtimePorCnpj(
  cnpj: string,
  onProgress?: SyncProgressHandler
) {
  const cnpjDigits = cnpj.replace(/\D/g, "");
  if (cnpjDigits.length !== 14) {
    throw new Error("CNPJ invalido para sincronizacao de transferencias especiais.");
  }

  const convenete = await prisma.convenete.findFirst({
    where: { cnpj: cnpjDigits, demoOwnerUserId: null },
    select: { id: true, cnpj: true, nome: true, uf: true }
  });

  if (!convenete) {
    throw new Error(`Convenete com CNPJ ${cnpjDigits} nao encontrado na base local.`);
  }

  console.log(`Iniciando sincronizacao por CNPJ ${cnpjDigits} (${convenete.nome}) via API oficial...`);
  let result;
  try {
    result = await sincronizarConvenetes([convenete], onProgress);
  } catch (err) {
    if (!isPlaywrightUnavailableError(err)) {
      throw err;
    }
    console.warn(`Playwright/browser indisponivel para o CNPJ ${cnpjDigits}. Aplicando fallback para API oficial.`);
    result = await sincronizarConvenetesApiOnly([convenete], onProgress);
  }

  console.log("\nSincronizacao por CNPJ concluida.");
  console.log(`Total de registros atualizados: ${result.totalAtualizados}`);
  console.log(`Total de registros criados: ${result.totalCriados}`);
  console.log(`Total de falhas (CNPJs): ${result.totalErros}`);
}
