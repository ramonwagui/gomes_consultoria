import { env } from "../../config/env";

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

export type EmendaPortalItem = {
  codigoEmenda?: string;
  ano?: number;
  tipoEmenda?: string;
  autor?: string;
  nomeAutor?: string;
  numeroEmenda?: string;
  localidadeDoGasto?: string;
  funcao?: string;
  subfuncao?: string;
  valorEmpenhado?: string;
  valorLiquidado?: string;
  valorPago?: string;
};

export type DocumentoRelacionadoEmendaPortalItem = {
  id?: number;
  data?: string;
  fase?: string;
  codigoDocumento?: string;
  codigoDocumentoResumido?: string;
  especieTipo?: string;
  tipoEmenda?: string;
};

export type DespesaDocumentoPortalItem = {
  data?: string;
  documento?: string;
  documentoResumido?: string;
  observacao?: string;
  fase?: string;
  especie?: string;
  numeroProcesso?: string;
  orgao?: string;
  ug?: string;
  nomeFavorecido?: string;
  codigoFavorecido?: string;
  ufFavorecido?: string;
  valor?: string;
};

export type ConvenioPortalItem = {
  id?: number;
  situacao?: string;
  numeroProcesso?: string;
  dimConvenio?: {
    codigo?: string;
    objeto?: string;
    numero?: string;
  };
  convenente?: {
    nome?: string;
    razaoSocialReceita?: string;
    cnpjFormatado?: string;
    cpfFormatado?: string;
  };
  municipioConvenente?: {
    codigoIBGE?: string;
    nomeIBGE?: string;
    uf?: string;
  };
  orgao?: {
    nome?: string;
    codigoSIAFI?: string;
    sigla?: string;
  };
  unidadeGestora?: {
    codigo?: string;
    nome?: string;
  };
  tipoInstrumento?: {
    descricao?: string;
  };
  valor?: number;
  valorLiberado?: number;
  valorContrapartida?: number;
  // Campos de vigencia retornados pelo endpoint /convenios
  dataInicioVigencia?: string;
  dataFimVigencia?: string;
};

export type LicitacaoPortalItem = {
  id?: number;
  situacaoCompra?: string;
  modalidadeLicitacao?: string;
  instrumentoLegal?: string;
  valor?: number;
  licitacao?: {
    numero?: string;
    numeroProcesso?: string;
    objeto?: string;
  };
};

export type ContratoPortalItem = {
  id?: number;
  numero?: string;
  objeto?: string;
  numeroProcesso?: string;
  situacaoContrato?: string;
  modalidadeCompra?: string;
  valorInicialCompra?: number;
  valorFinalCompra?: number;
};

const cache = new Map<string, CacheEntry>();

const normalizeBaseUrl = () => {
  const base = env.portalTransparenciaBaseUrl.trim();
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

const getTimeoutMs = () => {
  if (!Number.isFinite(env.portalTransparenciaTimeoutMs)) {
    return 20000;
  }
  return Math.max(3000, env.portalTransparenciaTimeoutMs);
};

const getCacheTtlMs = () => {
  if (!Number.isFinite(env.portalTransparenciaCacheTtlMs)) {
    return 600000;
  }
  return Math.max(0, env.portalTransparenciaCacheTtlMs);
};

const cleanupCache = () => {
  if (cache.size < 400) {
    return;
  }
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
};

const fetchPortalJson = async <T>(path: string, params: Record<string, string | number | undefined>) => {
  const apiKey = env.portalTransparenciaApiKey.trim();
  if (apiKey === "") {
    throw new Error("PORTAL_TRANSPARENCIA_API_KEY nao configurada.");
  }

  const url = new URL(`${normalizeBaseUrl()}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue;
    }
    url.searchParams.set(key, String(value));
  }

  const cacheKey = url.toString();
  const now = Date.now();
  const ttlMs = getCacheTtlMs();
  if (ttlMs > 0) {
    const hit = cache.get(cacheKey);
    if (hit && hit.expiresAt > now) {
      return hit.value as T;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs());

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "chave-api-dados": apiKey
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Falha Portal Transparencia (${response.status}). ${detail || ""}`.trim());
  }

  const payload = (await response.json()) as T;
  if (ttlMs > 0) {
    cleanupCache();
    cache.set(cacheKey, {
      expiresAt: Date.now() + ttlMs,
      value: payload
    });
  }

  return payload;
};

const normalizeEmendaNumber = (value: string) => value.replace(/\D/g, "");

export const hasPortalTransparenciaApiKey = () => env.portalTransparenciaApiKey.trim() !== "";

export const listarEmendasPortal = async (params: {
  pagina: number;
  ano?: number;
  numeroEmenda?: string;
  codigoEmenda?: string;
  nomeAutor?: string;
}) => {
  const numeroEmendaDigits = params.numeroEmenda ? normalizeEmendaNumber(params.numeroEmenda) : undefined;
  return fetchPortalJson<EmendaPortalItem[]>("/api-de-dados/emendas", {
    pagina: params.pagina,
    ano: params.ano,
    numeroEmenda: numeroEmendaDigits,
    codigoEmenda: params.codigoEmenda,
    nomeAutor: params.nomeAutor
  });
};

export const listarDocumentosEmendaPortal = async (codigoEmenda: string, pagina = 1) => {
  return fetchPortalJson<DocumentoRelacionadoEmendaPortalItem[]>(`/api-de-dados/emendas/documentos/${codigoEmenda}`, {
    pagina
  });
};

export const obterDespesaDocumentoPortal = async (codigoDocumento: string) => {
  return fetchPortalJson<DespesaDocumentoPortalItem>(`/api-de-dados/despesas/documentos/${codigoDocumento}`, {});
};

export const listarConveniosPorProcessoPortal = async (numeroProcesso: string) => {
  return fetchPortalJson<ConvenioPortalItem[]>("/api-de-dados/convenios/numero-processo", {
    numeroProcesso
  });
};

export const listarConveniosPorNumeroPortal = async (numeroConvenio: string, pagina = 1) => {
  const numero = numeroConvenio.trim();
  if (!numero) {
    return [] as ConvenioPortalItem[];
  }

  const attempts: Array<Record<string, string | number>> = [
    { numeroConvenio: numero, pagina },
    { codigoConvenio: numero, pagina },
    { convenio: numero, pagina }
  ];

  for (const params of attempts) {
    try {
      const payload = await fetchPortalJson<ConvenioPortalItem[] | ConvenioPortalItem>("/api-de-dados/convenios", params);
      if (Array.isArray(payload)) {
        if (payload.length > 0) {
          return payload;
        }
      } else if (payload) {
        return [payload];
      }
    } catch {
      // tenta proximo formato de query param
    }
  }

  return [] as ConvenioPortalItem[];
};

export const listarLicitacoesPorProcessoPortal = async (processo: string) => {
  const payload = await fetchPortalJson<LicitacaoPortalItem | LicitacaoPortalItem[]>("/api-de-dados/licitacoes/por-processo", {
    processo
  });
  return Array.isArray(payload) ? payload : payload ? [payload] : [];
};

export const listarContratosPorProcessoPortal = async (processo: string, pagina = 1) => {
  return fetchPortalJson<ContratoPortalItem[]>("/api-de-dados/contratos/processo", {
    processo,
    pagina
  });
};

/**
 * Busca convênios pelo CNPJ do convenente (ente beneficiado).
 * Habilita o fluxo: CNPJ → Convênios → Processo → Emendas.
 */
export const listarConveniosPorCnpj = async (cnpj: string, pagina = 1, convenenteNome?: string | null) => {
  const digits = cnpj.replace(/\D/g, "");
  if (!digits) {
    return [] as ConvenioPortalItem[];
  }

  const formatted = digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  const name = (convenenteNome ?? "").trim();
  const nameUpper = name.toUpperCase();
  const attempts: Array<Record<string, string | number>> = [
    ...(name
      ? [
          { convenente: `${formatted} - ${name}`, pagina },
          { convenente: `${formatted} - ${nameUpper}`, pagina },
          { convenente: `${digits} - ${name}`, pagina },
          { convenente: `${digits} - ${nameUpper}`, pagina },
          { convenente: name, pagina },
          { convenente: nameUpper, pagina }
        ]
      : []),
    { convenente: digits, pagina },
    { convenente: formatted, pagina },
    { cnpjConvenente: digits, pagina },
    { cpfCnpjConvenente: digits, pagina },
    { convenenteOuContratado: digits, pagina },
    { cnpj: digits, pagina }
  ];

  for (const params of attempts) {
    try {
      const payload = await fetchPortalJson<ConvenioPortalItem[] | ConvenioPortalItem>("/api-de-dados/convenios", params);
      if (Array.isArray(payload)) {
        if (payload.length > 0) {
          return payload;
        }
      } else if (payload) {
        return [payload];
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("400") ||
          error.message.includes("filtros em convênios") ||
          error.message.includes("filtros em convenios"))
      ) {
        continue;
      }
      throw error;
    }
  }

  return [] as ConvenioPortalItem[];
};

export const listarConvenioPorIdPortal = async (id: string | number) => {
  const value = String(id).trim();
  if (!value) {
    return [] as ConvenioPortalItem[];
  }
  const payload = await fetchPortalJson<ConvenioPortalItem | ConvenioPortalItem[]>("/api-de-dados/convenios/id", {
    id: value
  });
  return Array.isArray(payload) ? payload : payload ? [payload] : [];
};

/**
 * Busca emendas pelo número de processo administrativo.
 * Complementa o fluxo reverso: processo do convênio → emendas parlamentares vinculadas.
 */
export const listarEmendasPorProcesso = async (processo: string, pagina = 1) => {
  return fetchPortalJson<EmendaPortalItem[]>("/api-de-dados/emendas", {
    processo,
    pagina
  });
};
