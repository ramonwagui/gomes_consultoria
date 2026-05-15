import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import {
  FnsEntidadesQueryInput,
  FnsMunicipiosQueryInput,
  FnsRepassesDetalheQueryInput,
  FnsRepassesQueryInput,
  FnsSaldosTiposContaQueryInput,
  FnsSyncBodyInput
} from "./fns-repasses.schema";

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

type SyncState = {
  status: "idle" | "running" | "ok" | "error";
  atualizado_em: string | null;
  detalhe: string | null;
  total_requisicoes: number;
  falhas: number;
};

const cache = new Map<string, CacheEntry>();

const syncState: SyncState = {
  status: "idle",
  atualizado_em: null,
  detalhe: null,
  total_requisicoes: 0,
  falhas: 0
};

const normalizeBaseUrl = () => {
  const base = env.fnsRepassesBaseUrl.trim();
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

const getTimeoutMs = () => {
  if (!Number.isFinite(env.fnsRepassesTimeoutMs)) {
    return 15000;
  }
  return Math.max(2000, env.fnsRepassesTimeoutMs);
};

const getCacheTtlMs = () => {
  if (!Number.isFinite(env.fnsRepassesCacheTtlMs)) {
    return 600000;
  }
  return Math.max(0, env.fnsRepassesCacheTtlMs);
};

const cleanupCache = () => {
  if (cache.size < 250) {
    return;
  }

  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
};

const sanitizeDigits = (value?: string) => {
  if (!value) {
    return undefined;
  }
  const digits = value.replace(/\D/g, "");
  return digits.length >= 11 ? digits : undefined;
};

const listarCnpjsProponentesAtendidos = async () => {
  const itens = await prisma.convenete.findMany({
    select: {
      cnpj: true
    }
  });

  const cnpjs = new Set<string>();
  for (const item of itens) {
    const digits = sanitizeDigits(item.cnpj);
    if (digits) {
      cnpjs.add(digits);
    }
  }
  return cnpjs;
};

const fetchJson = async <T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> => {
  const url = new URL(`${normalizeBaseUrl()}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  const cacheKey = url.toString();
  const now = Date.now();
  const ttlMs = getCacheTtlMs();
  if (ttlMs > 0) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value as T;
    }
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
    throw new Error(`Falha na API FNS (${response.status}). ${detail || ""}`.trim());
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

export const listarUfsFns = async () => {
  return fetchJson<Array<{ id: string; nome: string; nomeAcentuado: string; sigla: string }>>("/investsus/geral/uf");
};

export const listarMunicipiosFns = async (query: FnsMunicipiosQueryInput) => {
  const ufId = query.uf_id ?? 53;
  return fetchJson<Array<{ codigo: string; descricao: string }>>(`/investsus/geral/municipio/dominio/${ufId}`);
};

export const listarEntidadesFns = async (query: FnsEntidadesQueryInput) => {
  const allowedCnpjs = await listarCnpjsProponentesAtendidos();
  const entidades = await fetchJson<
    Array<{
      nome: string;
      cnpj: string;
      municipal: boolean;
      estadual: boolean;
      privada: boolean;
      brasilia: boolean;
    }>
  >("/investsus/geral/entidades", { coIbgeMunicipio: query.co_ibge_municipio });

  return entidades.filter((item) => {
    const cnpjDigits = sanitizeDigits(item.cnpj);
    return Boolean(cnpjDigits && allowedCnpjs.has(cnpjDigits));
  });
};

export const listarRepassesFns = async (query: FnsRepassesQueryInput) => {
  const allowedCnpjs = await listarCnpjsProponentesAtendidos();
  const doc = sanitizeDigits(query.cnpj ?? query.cpf_cnpj);
  if (!doc || !allowedCnpjs.has(doc)) {
    throw new Error("CNPJ nao pertence aos proponentes atendidos.");
  }
  return fetchJson<{
    quantidade: number;
    valor: number;
    itens: Array<{ codigoBloco: string; nomeBloco: string; valorRepassado: number }>;
  }>("/investsus/geral/repasses", {
    ano: query.ano,
    cnpj: doc
  });
};

export const listarRepassesDetalheFns = async (query: FnsRepassesDetalheQueryInput) => {
  const allowedCnpjs = await listarCnpjsProponentesAtendidos();
  const doc = sanitizeDigits(query.cnpj ?? query.cpf_cnpj);
  if (!doc || !allowedCnpjs.has(doc)) {
    throw new Error("CNPJ nao pertence aos proponentes atendidos.");
  }
  const codigoBloco = query.codigo_bloco?.trim() || query.codigoBloco?.trim();
  return fetchJson<{
    quantidade: number;
    valor: number;
    itens: Array<Record<string, unknown>>;
  }>("/investsus/geral/repasses/detalhe", {
    ano: query.ano,
    cnpj: doc,
    codigoBloco
  });
};

export const listarSaldosTiposContaFns = async (query: FnsSaldosTiposContaQueryInput) => {
  const allowedCnpjs = await listarCnpjsProponentesAtendidos();
  const doc = sanitizeDigits(query.cnpj ?? query.cpf_cnpj);
  if (!doc || !allowedCnpjs.has(doc)) {
    throw new Error("CNPJ nao pertence aos proponentes atendidos.");
  }
  return fetchJson<{
    quantidade: number;
    valor: number;
    itens: Array<{ idTipoConta: number; sigla: string; descricao: string; valorSaldo: number }>;
  }>("/investsus/geral/contas-bancarias/saldos/tipos-contas", {
    cpfCnpj: doc
  });
};

export const sincronizarCacheFns = async (payload: FnsSyncBodyInput) => {
  if (syncState.status === "running") {
    return {
      status: "running",
      message: "Sincronizacao ja em andamento."
    };
  }

  syncState.status = "running";
  syncState.atualizado_em = new Date().toISOString();
  syncState.detalhe = "Iniciando varredura de cache FNS.";
  syncState.total_requisicoes = 0;
  syncState.falhas = 0;

  const ano = payload.ano ?? new Date().getFullYear();
  const cnpjs = payload.cnpjs;
  const includeUfs = payload.incluir_ufs;
  const startedAt = Date.now();

  try {
    if (includeUfs) {
      await listarUfsFns();
      syncState.total_requisicoes += 1;
    }

    for (const cnpj of cnpjs) {
      try {
        await listarRepassesFns({ ano, cnpj });
        syncState.total_requisicoes += 1;
      } catch {
        syncState.falhas += 1;
      }

      try {
        await listarSaldosTiposContaFns({ cnpj });
        syncState.total_requisicoes += 1;
      } catch {
        syncState.falhas += 1;
      }
    }

    syncState.status = syncState.falhas > 0 ? "error" : "ok";
    syncState.atualizado_em = new Date().toISOString();
    syncState.detalhe = `Concluido em ${Date.now() - startedAt} ms.`;

    return {
      status: syncState.status,
      atualizado_em: syncState.atualizado_em,
      detalhe: syncState.detalhe,
      total_requisicoes: syncState.total_requisicoes,
      falhas: syncState.falhas
    };
  } catch (error) {
    syncState.status = "error";
    syncState.atualizado_em = new Date().toISOString();
    syncState.falhas += 1;
    syncState.detalhe = error instanceof Error ? error.message : "Falha ao sincronizar cache FNS.";
    throw error;
  }
};

export const obterStatusSyncFns = () => ({
  ...syncState,
  ttl_cache_ms: getCacheTtlMs(),
  entradas_cache: cache.size
});
