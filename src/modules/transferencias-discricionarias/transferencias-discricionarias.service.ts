import { Prisma, UserRole } from "@prisma/client";
import { unzipSync } from "fflate";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { reimportarInstrumentosTodosProponentesAtendidos } from "../convenetes/convenetes.service";
import { monitorarAlteracoesFinanceirasTransferenciasDiscricionarias } from "./transferencias-discricionarias-changes-notify.service";
import { sincronizarObrasTransferegov } from "./obras.service";
import {
  TransferenciaDiscricionariaDesembolsoProponenteQueryInput,
  TransferenciaDiscricionariaDesembolsoQueryInput,
  TransferenciaDiscricionariaQueryInput
} from "./transferencias-discricionarias.schema";

type TransferenciaDiscricionariaItem = {
  id: number;
  nr_proposta: string | null;
  nr_convenio: string | null;
  uf: string | null;
  cnpj: string | null;
  nome_proponente: string | null;
  natureza_juridica: string | null;
  situacao_proposta: string | null;
  situacao_convenio: string | null;
  situacao_contratacao: string | null;
  objeto: string | null;
  ano_referencia: number | null;
  dia_assin_conv: string | null;
  dia_inic_vigencia: string | null;
  dia_fim_vigencia: string | null;
  dt_aprovacao_proposta: string | null;
  dt_conclusao_prestacao_contas: string | null;
  valor_global_conv: number | null;
  valor_desembolsado_conv: number | null;
  valor_pagamentos: number | null;
  valor_tributos: number | null;
  total_gasto: number | null;
  quantidade_convenios: number | null;
  qtd_tas_convenio: number | null;
  qtd_dias_prorroga: number | null;
  valor_contrapartida_financeira: number | null;
  valor_contrapartida_depositada: number | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  concedente: string | null;
  dias_para_vencimento: number | null;
  link_acesso_livre: string | null;
  fonte_arquivo: string;
};

type TransferenciaDiscricionariaListResponse = {
  itens: TransferenciaDiscricionariaItem[];
  paginacao: {
    pagina: number;
    tamanho_pagina: number;
    total: number;
    total_paginas: number;
    tem_proxima: boolean;
    tem_anterior: boolean;
  };
  sincronizacao: {
    data_carga_fonte: string | null;
    atualizado_em: string | null;
    status: string;
    detalhe: string | null;
    total_registros: number;
    fase_atual: string | null;
    progresso_percentual: number | null;
    heartbeat_em: string | null;
    mode: SyncMode | null;
  };
};

type TransferenciaDiscricionariaDesembolsoItem = {
  id: number;
  id_desembolso: number | null;
  nr_convenio: string | null;
  data_desembolso: string | null;
  dt_ult_desembolso: string | null;
  ano_desembolso: number | null;
  mes_desembolso: number | null;
  qtd_dias_sem_desembolso: number | null;
  nr_siafi: string | null;
  ug_emitente_dh: string | null;
  observacao_dh: string | null;
  vl_desembolsado: number | null;
  fonte_arquivo: string;
};

type TransferenciaDiscricionariaDesembolsoListResponse = {
  itens: TransferenciaDiscricionariaDesembolsoItem[];
  paginacao: {
    pagina: number;
    tamanho_pagina: number;
    total: number;
    total_paginas: number;
    tem_proxima: boolean;
    tem_anterior: boolean;
  };
  resumo: {
    nr_convenio: string;
    total_desembolsos: number;
    valor_total_desembolsado: number;
  };
  sincronizacao: {
    data_carga_fonte: string | null;
    atualizado_em: string | null;
    status: string;
    detalhe: string | null;
    total_registros: number;
    fase_atual: string | null;
    progresso_percentual: number | null;
    heartbeat_em: string | null;
    mode: SyncMode | null;
  };
};

type TransferenciaDiscricionariaDesembolsoProponenteItem = {
  id: number;
  id_desembolso: number | null;
  cnpj_proponente: string | null;
  nome_proponente: string | null;
  nr_convenio: string | null;
  objeto: string | null;
  valor_contrapartida_financeira: number | null;
  uf: string | null;
  municipio: string | null;
  data_desembolso: string | null;
  dt_ult_desembolso: string | null;
  ano_desembolso: number | null;
  mes_desembolso: number | null;
  qtd_dias_sem_desembolso: number | null;
  nr_siafi: string | null;
  ug_emitente_dh: string | null;
  observacao_dh: string | null;
  vl_desembolsado: number | null;
  fonte_arquivo: string;
};

type TransferenciaDiscricionariaDesembolsoProponenteListResponse = {
  itens: TransferenciaDiscricionariaDesembolsoProponenteItem[];
  paginacao: {
    pagina: number;
    tamanho_pagina: number;
    total: number;
    total_paginas: number;
    tem_proxima: boolean;
    tem_anterior: boolean;
  };
  resumo: {
    cnpj: string | null;
    nome_proponente: string | null;
    total_desembolsos: number;
    total_convenios: number;
    valor_total_desembolsado: number;
  };
  sincronizacao: {
    data_carga_fonte: string | null;
    atualizado_em: string | null;
    status: string;
    detalhe: string | null;
    total_registros: number;
    fase_atual: string | null;
    progresso_percentual: number | null;
    heartbeat_em: string | null;
    mode: SyncMode | null;
  };
};

type SyncState = {
  data_carga_fonte: string | null;
  atualizado_em: string | null;
  status: string;
  detalhe: string | null;
  total_registros: number;
  fase_atual?: string | null;
  progresso_percentual?: number | null;
  heartbeat_em?: string | null;
  mode?: SyncMode | null;
  cancel_requested?: boolean;
  run_id?: string | null;
  published_run_id?: string | null;
};

type SyncResult = {
  skipped: boolean;
  data_carga_fonte: string;
  arquivos_processados: string[];
  total_registros: number;
  status: "ok" | "partial" | "rejected";
  detalhe: string | null;
  mode: "full" | "light";
};

type SyncMode = "full" | "light";

type SyncOptions = {
  force?: boolean;
  mode?: SyncMode;
};
type CurrentUser = { id: number; role: UserRole };
const isDemoUser = (user?: CurrentUser | null) => user?.role === UserRole.DEMONSTRACAO;

const SYNC_RUNNING_STALE_MS = 45 * 60 * 1000;

class SyncCancelledError extends Error {
  constructor() {
    super("Sincronizacao interrompida manualmente.");
    this.name = "SyncCancelledError";
  }
}

const clampProgress = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
};

type NormalizedImportRow = {
  chave_unica: string;
  fonte_arquivo: string;
  data_carga_fonte: string;
  tipo_ente: "estado" | "municipio";
  id_proposta: number | null;
  nr_proposta: string | null;
  nr_convenio: string | null;
  nr_convenio_norm: string | null;
  uf: string | null;
  municipio: string | null;
  cod_ibge: string | null;
  cnpj: string | null;
  nome_proponente: string | null;
  natureza_juridica: string | null;
  situacao_proposta: string | null;
  situacao_convenio: string | null;
  situacao_contratacao: string | null;
  objeto: string | null;
  link_acesso_livre: string | null;
  ano_referencia: number | null;
  dia_assin_conv: string | null;
  dia_inic_vigencia: string | null;
  dia_fim_vigencia: string | null;
  dt_aprovacao_proposta: string | null;
  dt_conclusao_prestacao_contas: string | null;
  valor_global_conv: number | null;
  valor_desembolsado_conv: number | null;
  valor_pagamentos: number | null;
  valor_tributos: number | null;
  total_gasto: number | null;
  quantidade_convenios: number | null;
  qtd_tas_convenio: number | null;
  qtd_dias_prorroga: number | null;
  valor_contrapartida_financeira: number | null;
  valor_contrapartida_depositada: number | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  concedente_orgao_sup: string | null;
  concedente_orgao: string | null;
  atualizado_em: string;
};

type NormalizedDesembolsoImportRow = {
  chave_unica: string;
  fonte_arquivo: string;
  data_carga_fonte: string;
  id_desembolso: number | null;
  nr_convenio: string | null;
  nr_convenio_norm: string | null;
  dt_ult_desembolso: string | null;
  qtd_dias_sem_desembolso: number | null;
  data_desembolso: string | null;
  ano_desembolso: number | null;
  mes_desembolso: number | null;
  nr_siafi: string | null;
  ug_emitente_dh: string | null;
  observacao_dh: string | null;
  vl_desembolsado: number | null;
  atualizado_em: string;
};

type NormalizedPropostaImportRow = {
  chave_unica: string;
  id_proposta: number | null;
  nr_proposta: string | null;
  nr_proposta_norm: string | null;
  uf: string | null;
  municipio: string | null;
  cnpj: string | null;
  nome_proponente: string | null;
  natureza_juridica: string | null;
  situacao_proposta: string | null;
  objeto: string | null;
  dia_inic_vigencia: string | null;
  dia_fim_vigencia: string | null;
  valor_contrapartida_financeira: number | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  concedente_orgao_sup: string | null;
  concedente_orgao: string | null;
};

type RawCountRow = { total: number | bigint | string | null };

type RawListRow = {
  id: number | bigint | string;
  nr_proposta: string | null;
  nr_convenio: string | null;
  uf: string | null;
  cnpj: string | null;
  nome_proponente: string | null;
  natureza_juridica: string | null;
  situacao_proposta: string | null;
  situacao_convenio: string | null;
  situacao_contratacao: string | null;
  objeto: string | null;
  ano_referencia: number | bigint | string | null;
  dia_assin_conv: string | null;
  dia_inic_vigencia: string | null;
  dia_fim_vigencia: string | null;
  dt_aprovacao_proposta: string | null;
  dt_conclusao_prestacao_contas: string | null;
  valor_global_conv: number | string | null;
  valor_desembolsado_conv: number | string | null;
  valor_pagamentos: number | string | null;
  valor_tributos: number | string | null;
  total_gasto: number | string | null;
  quantidade_convenios: number | bigint | string | null;
  qtd_tas_convenio: number | bigint | string | null;
  qtd_dias_prorroga: number | bigint | string | null;
  valor_contrapartida_financeira: number | string | null;
  valor_contrapartida_depositada: number | string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  concedente: string | null;
  dias_para_vencimento: number | bigint | string | null;
  link_acesso_livre: string | null;
  fonte_arquivo: string;
};

type RawDesembolsoListRow = {
  id: number | bigint | string;
  id_desembolso: number | bigint | string | null;
  nr_convenio: string | null;
  dt_ult_desembolso: string | null;
  qtd_dias_sem_desembolso: number | bigint | string | null;
  data_desembolso: string | null;
  ano_desembolso: number | bigint | string | null;
  mes_desembolso: number | bigint | string | null;
  nr_siafi: string | null;
  ug_emitente_dh: string | null;
  observacao_dh: string | null;
  vl_desembolsado: number | string | null;
  fonte_arquivo: string;
};

type RawDesembolsoProponenteListRow = {
  id: number | bigint | string;
  id_desembolso: number | bigint | string | null;
  cnpj_proponente: string | null;
  nome_proponente: string | null;
  nr_convenio: string | null;
  objeto: string | null;
  valor_contrapartida_financeira: number | string | null;
  uf: string | null;
  municipio: string | null;
  dt_ult_desembolso: string | null;
  qtd_dias_sem_desembolso: number | bigint | string | null;
  data_desembolso: string | null;
  ano_desembolso: number | bigint | string | null;
  mes_desembolso: number | bigint | string | null;
  nr_siafi: string | null;
  ug_emitente_dh: string | null;
  observacao_dh: string | null;
  vl_desembolsado: number | string | null;
  fonte_arquivo: string;
};

type RawDistinctTextRow = { value: string | null };

type RawProponenteSugestaoRow = {
  cnpj: string | null;
  nome_proponente: string | null;
  total: number | bigint | string;
};

type SyncRunStatus = "running" | "ok" | "partial" | "error" | "rejected";

type StageQualityMetrics = {
  total: number;
  objeto_preenchido: number;
  banco_preenchido: number;
  agencia_preenchida: number;
  conta_preenchida: number;
  total_anterior: number;
  objeto_anterior: number;
  banco_anterior: number;
  agencia_anterior: number;
  conta_anterior: number;
};

type StageValidationResult = {
  ok: boolean;
  reasons: string[];
  metrics: StageQualityMetrics;
};

const TABLE_MAIN = "transferencias_discricionarias";
const TABLE_STAGE = "transferencias_discricionarias_stage";
const TABLE_SYNC = "transferencias_discricionarias_sync";
const TABLE_SYNC_RUNS = "transferencias_discricionarias_sync_runs";
const TABLE_MAIN_SNAPSHOT = "transferencias_discricionarias_snapshot";
const TABLE_DESEMBOLSO_SNAPSHOT = "transferencias_discricionarias_desembolsos_snapshot";
const TABLE_CONTRAPARTIDA_STAGE = "transferencias_discricionarias_contrapartida_stage";
const TABLE_INGRESSO_CONTRAPARTIDA_STAGE = "transferencias_discricionarias_ingresso_contrapartida_stage";
const TABLE_PROPOSTA_STAGE = "transferencias_discricionarias_proposta_stage";
const TABLE_DESEMBOLSO = "transferencias_discricionarias_desembolsos";
const TABLE_DESEMBOLSO_STAGE = "transferencias_discricionarias_desembolsos_stage";
const DESEMBOLSO_FILE = "siconv_desembolso.csv.zip";
const PROPOSTA_FILE = "siconv_proposta.csv.zip";
const INGRESSO_CONTRAPARTIDA_FILE = "siconv_ingresso_contrapartida.csv.zip";
const INSERT_BATCH_SIZE = 300;
const VIGENCIA_FIM_NORMALIZED_SQL =
  "NULLIF(regexp_replace(TRIM(dia_fim_vigencia), '[ T].*$', ''), '')";

const VIGENCIA_FIM_DATE_SQL =
  "CASE " +
  `WHEN ${VIGENCIA_FIM_NORMALIZED_SQL} ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN to_date(${VIGENCIA_FIM_NORMALIZED_SQL}, 'DD/MM/YYYY') ` +
  `WHEN ${VIGENCIA_FIM_NORMALIZED_SQL} ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}$' THEN to_date(${VIGENCIA_FIM_NORMALIZED_SQL}, 'DD-MM-YYYY') ` +
  `WHEN ${VIGENCIA_FIM_NORMALIZED_SQL} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN to_date(${VIGENCIA_FIM_NORMALIZED_SQL}, 'YYYY-MM-DD') ` +
  "ELSE NULL END";

let tablesReadyPromise: Promise<void> | null = null;

const toNullableText = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimAndCompact = (input: string) => input.trim().replace(/\s+/g, " ");
  const maybeFixMojibake = (input: string) => {
    if (!/[ÃÂ]/.test(input)) {
      return input;
    }

    try {
      const repaired = Buffer.from(input, "latin1").toString("utf8");
      if (repaired.includes("\uFFFD")) {
        return input;
      }
      return repaired;
    } catch {
      return input;
    }
  };

  const compact = trimAndCompact(maybeFixMojibake(value));
  return compact === "" ? null : compact;
};

const toNullableInt = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.trunc(parsed);
};

const toNullableFloat = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNullableDigits = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  const digits = value.replace(/\D/g, "");
  return digits === "" ? null : digits;
};

const normalizeConvenioCode = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[./\-\s]/g, "").trim();
  return normalized === "" ? null : normalized;
};

const extractYearFromDateBr = (value: string | null) => {
  if (!value) {
    return null;
  }
  const match = value.match(/\b\d{2}\/\d{2}\/(\d{4})\b/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  return Number.isInteger(year) ? year : null;
};

const parseDateBrToIso = (value: string | null) => {
  if (!value) {
    return null;
  }
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return null;
  }
  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
};

const normalizeCsvHeaderLine = (line: string) => line.replace(/^(?:\uFEFF|ï»¿)/, "");

const extractYearFromProposta = (value: string | null) => {
  if (!value) {
    return null;
  }
  const match = value.match(/\b(20\d{2})\b/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  return Number.isInteger(year) ? year : null;
};

const toInt = (value: number | bigint | string | null | undefined) => {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
};

const toNullableNumber = (value: number | bigint | string | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const escapeLikeValue = (value: string) => value.replace(/[\\%_]/g, "\\$&");

export const splitCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ";" && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
};

const resolveTipoEnte = (fileName: string): "estado" | "municipio" => {
  const lower = fileName.toLowerCase();
  return lower.includes("municip") ? "municipio" : "estado";
};

const normalizeBaseUrl = () => {
  const base = env.transferenciasDiscricionariasSourceBaseUrl.trim();
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

const getSourceFiles = () => {
  const raw = env.transferenciasDiscricionariasSourceFiles;
  const files = raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "")
    .filter((item) => item.toLowerCase() !== DESEMBOLSO_FILE)
    .filter((item) => item.toLowerCase() !== PROPOSTA_FILE);
  if (files.length > 0) {
    return files;
  }
  return ["siconv_prop_inst_indicadores_estados.csv.zip"];
};

const fetchWithTimeout = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/plain,application/zip,application/octet-stream;q=0.9,*/*;q=0.8"
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
};

const downloadTextWithRetry = async (url: string) => {
  const timeoutMs = Math.max(5000, env.transferenciasDiscricionariasRequestTimeoutMs);
  const retries = Math.max(1, env.transferenciasDiscricionariasDownloadRetries);

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, timeoutMs);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return (await response.text()).trim();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  throw new Error(`Falha ao baixar ${url}: ${lastError instanceof Error ? lastError.message : "erro desconhecido"}`);
};

export const downloadCsvBytesFromZipWithRetry = async (fileName: string) => {
  const timeoutMs = Math.max(10 * 60 * 1000, env.transferenciasDiscricionariasRequestTimeoutMs);
  const retries = Math.max(1, env.transferenciasDiscricionariasDownloadRetries);
  const url = `${normalizeBaseUrl()}/${fileName}`;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, timeoutMs);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const rawBuffer = new Uint8Array(await response.arrayBuffer());
      const unzipped = unzipSync(rawBuffer);
      const csvEntry = Object.keys(unzipped).find((entry) => entry.toLowerCase().endsWith(".csv"));
      if (!csvEntry) {
        throw new Error("Arquivo ZIP sem entrada CSV");
      }

      return unzipped[csvEntry];
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw new Error(`Falha ao baixar ${fileName}: ${lastError instanceof Error ? lastError.message : "erro desconhecido"}`);
};

export const downloadCsvTextFromZipWithRetry = async (fileName: string, encoding: "utf-8" | "latin1" = "utf-8") => {
  const csvBytes = await downloadCsvBytesFromZipWithRetry(fileName);
  return new TextDecoder(encoding).decode(csvBytes);
};

export const processCsvBytesByLine = async (
  csvBytes: Uint8Array,
  encoding: "utf-8" | "latin1",
  onLine: (line: string, lineIndex: number) => Promise<void> | void
) => {
  const decoder = new TextDecoder(encoding);
  const chunkSize = 1024 * 1024;
  let pending = "";
  let lineIndex = 0;

  for (let start = 0; start < csvBytes.length; start += chunkSize) {
    const end = Math.min(csvBytes.length, start + chunkSize);
    const chunkText = decoder.decode(csvBytes.subarray(start, end), { stream: end < csvBytes.length });
    pending += chunkText;

    let newlineIndex = pending.indexOf("\n");
    while (newlineIndex >= 0) {
      let line = pending.slice(0, newlineIndex);
      if (line.endsWith("\r")) {
        line = line.slice(0, -1);
      }

      await onLine(line, lineIndex);
      lineIndex += 1;

      pending = pending.slice(newlineIndex + 1);
      newlineIndex = pending.indexOf("\n");
    }
  }

  if (pending.length > 0) {
    await onLine(pending, lineIndex);
  }
};

export const detectCsvEncoding = (csvBytes: Uint8Array): "utf-8" | "latin1" => {
  if (csvBytes.length >= 3 && csvBytes[0] === 0xef && csvBytes[1] === 0xbb && csvBytes[2] === 0xbf) {
    return "utf-8";
  }

  const sample = csvBytes.subarray(0, Math.min(csvBytes.length, 512 * 1024));
  const utf8 = new TextDecoder("utf-8").decode(sample);
  return utf8.includes("\uFFFD") ? "latin1" : "utf-8";
};

const ensureTables = async () => {
  if (!tablesReadyPromise) {
    tablesReadyPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${TABLE_MAIN} (
          id SERIAL PRIMARY KEY,
          chave_unica TEXT NOT NULL UNIQUE,
          fonte_arquivo TEXT NOT NULL,
          data_carga_fonte TEXT NOT NULL,
          tipo_ente TEXT NOT NULL,
          id_proposta INTEGER,
          nr_proposta TEXT,
          nr_convenio TEXT,
          nr_convenio_norm TEXT,
          uf TEXT,
          municipio TEXT,
          cod_ibge TEXT,
          cnpj TEXT,
          nome_proponente TEXT,
          natureza_juridica TEXT,
          situacao_proposta TEXT,
          situacao_convenio TEXT,
          situacao_contratacao TEXT,
          objeto TEXT,
          link_acesso_livre TEXT,
          ano_referencia INTEGER,
          dia_assin_conv TEXT,
          dia_inic_vigencia TEXT,
          dia_fim_vigencia TEXT,
          dt_aprovacao_proposta TEXT,
          dt_conclusao_prestacao_contas TEXT,
          valor_global_conv REAL,
          valor_desembolsado_conv REAL,
          valor_pagamentos REAL,
          valor_tributos REAL,
          total_gasto REAL,
          quantidade_convenios INTEGER,
          qtd_tas_convenio INTEGER,
          qtd_dias_prorroga INTEGER,
          valor_contrapartida_financeira REAL,
          valor_contrapartida_depositada REAL,
          banco TEXT,
          agencia TEXT,
          conta TEXT,
          concedente_orgao_sup TEXT,
          concedente_orgao TEXT,
          atualizado_em TEXT NOT NULL
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${TABLE_STAGE} (
          chave_unica TEXT NOT NULL UNIQUE,
          fonte_arquivo TEXT NOT NULL,
          data_carga_fonte TEXT NOT NULL,
          tipo_ente TEXT NOT NULL,
          id_proposta INTEGER,
          nr_proposta TEXT,
          nr_convenio TEXT,
          nr_convenio_norm TEXT,
          uf TEXT,
          municipio TEXT,
          cod_ibge TEXT,
          cnpj TEXT,
          nome_proponente TEXT,
          natureza_juridica TEXT,
          situacao_proposta TEXT,
          situacao_convenio TEXT,
          situacao_contratacao TEXT,
          objeto TEXT,
          link_acesso_livre TEXT,
          ano_referencia INTEGER,
          dia_assin_conv TEXT,
          dia_inic_vigencia TEXT,
          dia_fim_vigencia TEXT,
          dt_aprovacao_proposta TEXT,
          dt_conclusao_prestacao_contas TEXT,
          valor_global_conv REAL,
          valor_desembolsado_conv REAL,
          valor_pagamentos REAL,
          valor_tributos REAL,
          total_gasto REAL,
          quantidade_convenios INTEGER,
          qtd_tas_convenio INTEGER,
          qtd_dias_prorroga INTEGER,
          valor_contrapartida_financeira REAL,
          valor_contrapartida_depositada REAL,
          banco TEXT,
          agencia TEXT,
          conta TEXT,
          concedente_orgao_sup TEXT,
          concedente_orgao TEXT,
          atualizado_em TEXT NOT NULL
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${TABLE_CONTRAPARTIDA_STAGE} (
          nr_convenio TEXT NOT NULL PRIMARY KEY,
          valor_contrapartida_financeira REAL,
          dia_limite_prest_contas TEXT
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${TABLE_INGRESSO_CONTRAPARTIDA_STAGE} (
          nr_convenio TEXT NOT NULL PRIMARY KEY,
          valor_contrapartida_depositada REAL
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${TABLE_PROPOSTA_STAGE} (
          chave_unica TEXT NOT NULL PRIMARY KEY,
          id_proposta INTEGER,
          nr_proposta TEXT,
          nr_proposta_norm TEXT,
          uf TEXT,
          municipio TEXT,
          cnpj TEXT,
          nome_proponente TEXT,
          natureza_juridica TEXT,
          situacao_proposta TEXT,
          objeto TEXT,
          dia_inic_vigencia TEXT,
          dia_fim_vigencia TEXT,
          valor_contrapartida_financeira REAL,
          banco TEXT,
          agencia TEXT,
          conta TEXT,
          concedente_orgao_sup TEXT,
          concedente_orgao TEXT
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${TABLE_DESEMBOLSO} (
          id SERIAL PRIMARY KEY,
          chave_unica TEXT NOT NULL UNIQUE,
          fonte_arquivo TEXT NOT NULL,
          data_carga_fonte TEXT NOT NULL,
          id_desembolso INTEGER,
          nr_convenio TEXT,
          nr_convenio_norm TEXT,
          dt_ult_desembolso TEXT,
          qtd_dias_sem_desembolso INTEGER,
          data_desembolso TEXT,
          ano_desembolso INTEGER,
          mes_desembolso INTEGER,
          nr_siafi TEXT,
          ug_emitente_dh TEXT,
          observacao_dh TEXT,
          vl_desembolsado REAL,
          atualizado_em TEXT NOT NULL
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${TABLE_DESEMBOLSO_STAGE} (
          chave_unica TEXT NOT NULL UNIQUE,
          fonte_arquivo TEXT NOT NULL,
          data_carga_fonte TEXT NOT NULL,
          id_desembolso INTEGER,
          nr_convenio TEXT,
          nr_convenio_norm TEXT,
          dt_ult_desembolso TEXT,
          qtd_dias_sem_desembolso INTEGER,
          data_desembolso TEXT,
          ano_desembolso INTEGER,
          mes_desembolso INTEGER,
          nr_siafi TEXT,
          ug_emitente_dh TEXT,
          observacao_dh TEXT,
          vl_desembolsado REAL,
          atualizado_em TEXT NOT NULL
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${TABLE_SYNC} (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          data_carga_fonte TEXT,
          atualizado_em TEXT NOT NULL,
          status TEXT NOT NULL,
          detalhe TEXT,
          total_registros INTEGER NOT NULL DEFAULT 0
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${TABLE_SYNC_RUNS} (
          run_id TEXT PRIMARY KEY,
          status TEXT NOT NULL,
          started_at TEXT NOT NULL,
          finished_at TEXT,
          data_carga_fonte TEXT,
          mode TEXT,
          detail TEXT,
          published INTEGER NOT NULL DEFAULT 0,
          metrics_json TEXT,
          arquivos_processados TEXT,
          warnings TEXT
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${TABLE_MAIN_SNAPSHOT} (
          snapshot_id TEXT NOT NULL,
          snapshot_created_at TEXT NOT NULL,
          id INTEGER,
          chave_unica TEXT,
          fonte_arquivo TEXT,
          data_carga_fonte TEXT,
          tipo_ente TEXT,
          id_proposta INTEGER,
          nr_proposta TEXT,
          nr_convenio TEXT,
          nr_convenio_norm TEXT,
          uf TEXT,
          municipio TEXT,
          cod_ibge TEXT,
          cnpj TEXT,
          nome_proponente TEXT,
          natureza_juridica TEXT,
          situacao_proposta TEXT,
          situacao_convenio TEXT,
          situacao_contratacao TEXT,
          objeto TEXT,
          link_acesso_livre TEXT,
          ano_referencia INTEGER,
          dia_assin_conv TEXT,
          dia_inic_vigencia TEXT,
          dia_fim_vigencia TEXT,
          dt_aprovacao_proposta TEXT,
          dt_conclusao_prestacao_contas TEXT,
          valor_global_conv REAL,
          valor_desembolsado_conv REAL,
          valor_pagamentos REAL,
          valor_tributos REAL,
          total_gasto REAL,
          quantidade_convenios INTEGER,
          qtd_tas_convenio INTEGER,
          qtd_dias_prorroga INTEGER,
          valor_contrapartida_financeira REAL,
          valor_contrapartida_depositada REAL,
          banco TEXT,
          agencia TEXT,
          conta TEXT,
          concedente_orgao_sup TEXT,
          concedente_orgao TEXT,
          atualizado_em TEXT
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${TABLE_DESEMBOLSO_SNAPSHOT} (
          snapshot_id TEXT NOT NULL,
          snapshot_created_at TEXT NOT NULL,
          id INTEGER,
          chave_unica TEXT,
          fonte_arquivo TEXT,
          data_carga_fonte TEXT,
          id_desembolso INTEGER,
          nr_convenio TEXT,
          nr_convenio_norm TEXT,
          dt_ult_desembolso TEXT,
          qtd_dias_sem_desembolso INTEGER,
          data_desembolso TEXT,
          ano_desembolso INTEGER,
          mes_desembolso INTEGER,
          nr_siafi TEXT,
          ug_emitente_dh TEXT,
          observacao_dh TEXT,
          vl_desembolsado REAL,
          atualizado_em TEXT
        );
      `);

      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_uf ON ${TABLE_MAIN} (uf);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_ano ON ${TABLE_MAIN} (ano_referencia);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_cnpj ON ${TABLE_MAIN} (cnpj);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_nr_convenio ON ${TABLE_MAIN} (nr_convenio);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_nr_proposta ON ${TABLE_MAIN} (nr_proposta);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_sit_prop ON ${TABLE_MAIN} (situacao_proposta);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_sit_conv ON ${TABLE_MAIN} (situacao_convenio);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_tipo_ente ON ${TABLE_MAIN} (tipo_ente);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_desembolso_conv ON ${TABLE_DESEMBOLSO} (nr_convenio);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_desembolso_data ON ${TABLE_DESEMBOLSO} (data_desembolso);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_desembolso_ano_mes ON ${TABLE_DESEMBOLSO} (ano_desembolso, mes_desembolso);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_prop_stage_id ON ${TABLE_PROPOSTA_STAGE} (id_proposta);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_prop_stage_nr_norm ON ${TABLE_PROPOSTA_STAGE} (nr_proposta_norm);`);

      const ensureOptionalColumn = async (tableName: string, columnName: string, sqlType: string) => {
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${sqlType}`);
        } catch {
          // coluna ja existente
        }
      };

      await ensureOptionalColumn(TABLE_MAIN, "objeto", "TEXT");
      await ensureOptionalColumn(TABLE_MAIN, "valor_contrapartida_financeira", "REAL");
      await ensureOptionalColumn(TABLE_MAIN, "valor_contrapartida_depositada", "REAL");
      await ensureOptionalColumn(TABLE_MAIN, "dia_inic_vigencia", "TEXT");
      await ensureOptionalColumn(TABLE_MAIN, "dia_fim_vigencia", "TEXT");
      await ensureOptionalColumn(TABLE_MAIN, "nr_convenio_norm", "TEXT");
      await ensureOptionalColumn(TABLE_STAGE, "objeto", "TEXT");
      await ensureOptionalColumn(TABLE_STAGE, "valor_contrapartida_financeira", "REAL");
      await ensureOptionalColumn(TABLE_STAGE, "valor_contrapartida_depositada", "REAL");
      await ensureOptionalColumn(TABLE_STAGE, "dia_inic_vigencia", "TEXT");
      await ensureOptionalColumn(TABLE_STAGE, "dia_fim_vigencia", "TEXT");
      await ensureOptionalColumn(TABLE_STAGE, "nr_convenio_norm", "TEXT");
      await ensureOptionalColumn(TABLE_MAIN, "concedente_orgao_sup", "TEXT");
      await ensureOptionalColumn(TABLE_MAIN, "concedente_orgao", "TEXT");
      await ensureOptionalColumn(TABLE_STAGE, "concedente_orgao_sup", "TEXT");
      await ensureOptionalColumn(TABLE_STAGE, "concedente_orgao", "TEXT");
      await ensureOptionalColumn(TABLE_MAIN, "banco", "TEXT");
      await ensureOptionalColumn(TABLE_MAIN, "agencia", "TEXT");
      await ensureOptionalColumn(TABLE_MAIN, "conta", "TEXT");
      await ensureOptionalColumn(TABLE_STAGE, "banco", "TEXT");
      await ensureOptionalColumn(TABLE_STAGE, "agencia", "TEXT");
      await ensureOptionalColumn(TABLE_STAGE, "conta", "TEXT");
      await ensureOptionalColumn(TABLE_PROPOSTA_STAGE, "uf", "TEXT");
      await ensureOptionalColumn(TABLE_PROPOSTA_STAGE, "municipio", "TEXT");
      await ensureOptionalColumn(TABLE_PROPOSTA_STAGE, "cnpj", "TEXT");
      await ensureOptionalColumn(TABLE_PROPOSTA_STAGE, "nome_proponente", "TEXT");
      await ensureOptionalColumn(TABLE_PROPOSTA_STAGE, "natureza_juridica", "TEXT");
      await ensureOptionalColumn(TABLE_PROPOSTA_STAGE, "situacao_proposta", "TEXT");
      await ensureOptionalColumn(TABLE_PROPOSTA_STAGE, "banco", "TEXT");
      await ensureOptionalColumn(TABLE_PROPOSTA_STAGE, "agencia", "TEXT");
      await ensureOptionalColumn(TABLE_PROPOSTA_STAGE, "conta", "TEXT");
      await ensureOptionalColumn(TABLE_PROPOSTA_STAGE, "concedente_orgao_sup", "TEXT");
      await ensureOptionalColumn(TABLE_PROPOSTA_STAGE, "concedente_orgao", "TEXT");
      await ensureOptionalColumn(TABLE_DESEMBOLSO, "nr_convenio_norm", "TEXT");
      await ensureOptionalColumn(TABLE_DESEMBOLSO_STAGE, "nr_convenio_norm", "TEXT");
      await ensureOptionalColumn(TABLE_CONTRAPARTIDA_STAGE, "dia_limite_prest_contas", "TEXT");
      await ensureOptionalColumn(TABLE_SYNC, "fase_atual", "TEXT");
      await ensureOptionalColumn(TABLE_SYNC, "progresso_percentual", "INTEGER");
      await ensureOptionalColumn(TABLE_SYNC, "heartbeat_em", "TEXT");
      await ensureOptionalColumn(TABLE_SYNC, "mode", "TEXT");
      await ensureOptionalColumn(TABLE_SYNC, "cancel_requested", "INTEGER DEFAULT 0");
      await ensureOptionalColumn(TABLE_SYNC, "run_id", "TEXT");
      await ensureOptionalColumn(TABLE_SYNC, "published_run_id", "TEXT");
      await ensureOptionalColumn(TABLE_STAGE, "sync_run_id", "TEXT");
      await ensureOptionalColumn(TABLE_DESEMBOLSO_STAGE, "sync_run_id", "TEXT");
      await ensureOptionalColumn(TABLE_PROPOSTA_STAGE, "sync_run_id", "TEXT");

      await prisma.$executeRawUnsafe(`
        UPDATE ${TABLE_MAIN}
        SET nr_convenio_norm = REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(nr_convenio, ''), '.', ''), '/', ''), '-', ''), ' ', '')
        WHERE nr_convenio IS NOT NULL
          AND TRIM(nr_convenio) <> ''
          AND (nr_convenio_norm IS NULL OR TRIM(nr_convenio_norm) = '')
      `);

      await prisma.$executeRawUnsafe(`
        UPDATE ${TABLE_DESEMBOLSO}
        SET nr_convenio_norm = REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(nr_convenio, ''), '.', ''), '/', ''), '-', ''), ' ', '')
        WHERE nr_convenio IS NOT NULL
          AND TRIM(nr_convenio) <> ''
          AND (nr_convenio_norm IS NULL OR TRIM(nr_convenio_norm) = '')
      `);

      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_nr_convenio_norm ON ${TABLE_MAIN} (nr_convenio_norm);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_desembolso_conv_norm ON ${TABLE_DESEMBOLSO} (nr_convenio_norm);`);

      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO ${Prisma.raw(TABLE_SYNC)} (
            id,
            data_carga_fonte,
            atualizado_em,
            status,
            detalhe,
            total_registros,
            fase_atual,
            progresso_percentual,
            heartbeat_em,
            mode,
            cancel_requested
          )
          VALUES (1, NULL, ${new Date(0).toISOString()}, ${"pending"}, NULL, 0, NULL, 0, NULL, NULL, 0)
          ON CONFLICT(id) DO NOTHING
        `
      );
    })();
  }

  await tablesReadyPromise;
};

export const ensureTransferenciasDiscricionariasStorage = async () => {
  await ensureTables();
};

const readSyncState = async (): Promise<SyncState> => {
  await ensureTables();
  const rows = await prisma.$queryRaw<
    Array<{
      data_carga_fonte: string | null;
      atualizado_em: string | null;
      status: string;
      detalhe: string | null;
      total_registros: number | bigint | string;
      fase_atual: string | null;
      progresso_percentual: number | bigint | string | null;
      heartbeat_em: string | null;
      mode: string | null;
      cancel_requested: number | bigint | string | null;
      run_id: string | null;
      published_run_id: string | null;
    }>
  >(
    Prisma.sql`SELECT data_carga_fonte, atualizado_em, status, detalhe, total_registros, fase_atual, progresso_percentual, heartbeat_em, mode, cancel_requested, run_id, published_run_id FROM ${Prisma.raw(TABLE_SYNC)} WHERE id = 1`
  );

  const row = rows[0];
  if (!row) {
    return {
      data_carga_fonte: null,
      atualizado_em: null,
      status: "pending",
      detalhe: null,
      total_registros: 0,
      fase_atual: null,
      progresso_percentual: 0,
      heartbeat_em: null,
      mode: null,
      cancel_requested: false,
      run_id: null,
      published_run_id: null
    };
  }

  return {
    data_carga_fonte: row.data_carga_fonte,
    atualizado_em: row.atualizado_em,
    status: row.status,
    detalhe: row.detalhe,
    total_registros: toInt(row.total_registros),
    fase_atual: row.fase_atual,
    progresso_percentual: row.progresso_percentual == null ? null : toInt(row.progresso_percentual),
    heartbeat_em: row.heartbeat_em,
    mode: row.mode === "full" || row.mode === "light" ? row.mode : null,
    cancel_requested: toInt(row.cancel_requested ?? 0) > 0,
    run_id: row.run_id,
    published_run_id: row.published_run_id
  };
};

const writeSyncState = async (state: SyncState) => {
  await ensureTables();
  const nowIso = new Date().toISOString();
  const heartbeat = state.heartbeat_em ?? (state.status === "running" ? nowIso : null);
  const progress = clampProgress(state.progresso_percentual);
  const cancelRequested = state.cancel_requested ? 1 : 0;
  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO ${Prisma.raw(TABLE_SYNC)} (
        id,
        data_carga_fonte,
        atualizado_em,
        status,
        detalhe,
        total_registros,
        fase_atual,
        progresso_percentual,
        heartbeat_em,
        mode,
        cancel_requested,
        run_id,
        published_run_id
      )
      VALUES (
        1,
        ${state.data_carga_fonte},
        ${state.atualizado_em ?? nowIso},
        ${state.status},
        ${state.detalhe},
        ${state.total_registros},
        ${state.fase_atual},
        ${progress},
        ${heartbeat},
        ${state.mode},
        ${cancelRequested},
        ${state.run_id ?? null},
        ${state.published_run_id ?? null}
      )
      ON CONFLICT(id) DO UPDATE SET
        data_carga_fonte = excluded.data_carga_fonte,
        atualizado_em = excluded.atualizado_em,
        status = excluded.status,
        detalhe = excluded.detalhe,
        total_registros = excluded.total_registros,
        fase_atual = excluded.fase_atual,
        progresso_percentual = excluded.progresso_percentual,
        heartbeat_em = excluded.heartbeat_em,
        mode = excluded.mode,
        cancel_requested = excluded.cancel_requested,
        run_id = excluded.run_id,
        published_run_id = excluded.published_run_id
    `
  );
};

const assertSyncNotCancelled = async () => {
  const state = await readSyncState();
  if (state.cancel_requested) {
    throw new SyncCancelledError();
  }
};

const isSyncRunningStale = (state: SyncState, nowMs = Date.now()) => {
  if (state.status !== "running" || !state.atualizado_em) {
    return false;
  }

  const lastHeartbeat = state.heartbeat_em ?? state.atualizado_em;
  const updatedAtMs = Date.parse(lastHeartbeat);
  if (!Number.isFinite(updatedAtMs)) {
    return false;
  }

  return nowMs - updatedAtMs > SYNC_RUNNING_STALE_MS;
};

const resolveSyncOptions = (input: boolean | SyncOptions | undefined): Required<SyncOptions> => {
  if (typeof input === "boolean") {
    return {
      force: input,
      mode: "full"
    };
  }

  return {
    force: input?.force ?? false,
    mode: input?.mode ?? "full"
  };
};

const createSyncRunId = () => `td-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const POST_PROCESS_STEP_TIMEOUT_MS = 10 * 60 * 1000;

const withTimeout = async <T>(task: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Timeout ao executar etapa: ${label} (${timeoutMs} ms)`));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

const updateSyncRun = async (
  runId: string,
  patch: {
    status?: SyncRunStatus;
    finished_at?: string | null;
    data_carga_fonte?: string | null;
    mode?: SyncMode | null;
    detail?: string | null;
    published?: boolean;
    metrics?: StageQualityMetrics | null;
    arquivos_processados?: string[] | null;
    warnings?: string[] | null;
  }
) => {
  await prisma.$executeRaw`
    UPDATE transferencias_discricionarias_sync_runs
    SET
      status = COALESCE(${patch.status ?? null}, status),
      finished_at = COALESCE(${patch.finished_at ?? null}, finished_at),
      data_carga_fonte = COALESCE(${patch.data_carga_fonte ?? null}, data_carga_fonte),
      mode = COALESCE(${patch.mode ?? null}, mode),
      detail = COALESCE(${patch.detail ?? null}, detail),
      published = COALESCE(${patch.published === undefined ? null : patch.published ? 1 : 0}, published),
      metrics_json = COALESCE(${patch.metrics ? JSON.stringify(patch.metrics) : null}, metrics_json),
      arquivos_processados = COALESCE(${patch.arquivos_processados ? JSON.stringify(patch.arquivos_processados) : null}, arquivos_processados),
      warnings = COALESCE(${patch.warnings ? JSON.stringify(patch.warnings) : null}, warnings)
    WHERE run_id = ${runId}
  `;
};

const createSyncRun = async (runId: string, dataCargaFonte: string, mode: SyncMode) => {
  await prisma.$executeRaw`
    INSERT INTO transferencias_discricionarias_sync_runs (
      run_id,
      status,
      started_at,
      data_carga_fonte,
      mode,
      detail,
      published
    )
    VALUES (${runId}, 'running', ${new Date().toISOString()}, ${dataCargaFonte}, ${mode}, 'Sincronizacao em andamento.', 0)
    ON CONFLICT (run_id) DO NOTHING
  `;
};

const getStageQualityMetrics = async (): Promise<StageQualityMetrics> => {
  const [stageRows, mainRows] = await Promise.all([
    prisma.$queryRaw<Array<{
      total: number | bigint | string;
      objeto_preenchido: number | bigint | string;
      banco_preenchido: number | bigint | string;
      agencia_preenchida: number | bigint | string;
      conta_preenchida: number | bigint | string;
    }>>`
      SELECT
        COUNT(*) AS total,
        COUNT(NULLIF(TRIM(objeto), '')) AS objeto_preenchido,
        COUNT(NULLIF(TRIM(banco), '')) AS banco_preenchido,
        COUNT(NULLIF(TRIM(agencia), '')) AS agencia_preenchida,
        COUNT(NULLIF(TRIM(conta), '')) AS conta_preenchida
      FROM transferencias_discricionarias_stage
    `,
    prisma.$queryRaw<Array<{
      total: number | bigint | string;
      objeto_preenchido: number | bigint | string;
      banco_preenchido: number | bigint | string;
      agencia_preenchida: number | bigint | string;
      conta_preenchida: number | bigint | string;
    }>>`
      SELECT
        COUNT(*) AS total,
        COUNT(NULLIF(TRIM(objeto), '')) AS objeto_preenchido,
        COUNT(NULLIF(TRIM(banco), '')) AS banco_preenchido,
        COUNT(NULLIF(TRIM(agencia), '')) AS agencia_preenchida,
        COUNT(NULLIF(TRIM(conta), '')) AS conta_preenchida
      FROM transferencias_discricionarias
    `
  ]);

  const stage = stageRows[0];
  const main = mainRows[0];
  return {
    total: toInt(stage?.total ?? 0),
    objeto_preenchido: toInt(stage?.objeto_preenchido ?? 0),
    banco_preenchido: toInt(stage?.banco_preenchido ?? 0),
    agencia_preenchida: toInt(stage?.agencia_preenchida ?? 0),
    conta_preenchida: toInt(stage?.conta_preenchida ?? 0),
    total_anterior: toInt(main?.total ?? 0),
    objeto_anterior: toInt(main?.objeto_preenchido ?? 0),
    banco_anterior: toInt(main?.banco_preenchido ?? 0),
    agencia_anterior: toInt(main?.agencia_preenchida ?? 0),
    conta_anterior: toInt(main?.conta_preenchida ?? 0)
  };
};

const pct = (value: number, total: number) => (total <= 0 ? 0 : value / total);

const validateStageBeforePublish = async (
  warnings: string[],
  sourceFiles: string[],
  mode: "full" | "light"
): Promise<StageValidationResult> => {
  const metrics = await getStageQualityMetrics();
  const reasons: string[] = [];
  const lowerWarnings = warnings.map((warning) => warning.toLowerCase());
  const criticalFiles = [...sourceFiles, PROPOSTA_FILE].map((file) => file.toLowerCase());
  const failedCriticalFiles = criticalFiles.filter((file) =>
    lowerWarnings.some((warning) => warning.includes(file))
  );

  if (failedCriticalFiles.length > 0) {
    reasons.push(`Arquivo critico falhou: ${Array.from(new Set(failedCriticalFiles)).join(", ")}.`);
  }

  if (metrics.total === 0) {
    reasons.push("A carga nova nao possui registros.");
  }

  const minTotalRatio = Number.isFinite(env.transferenciasDiscricionariasMinTotalRatio)
    ? Math.min(1, Math.max(0, env.transferenciasDiscricionariasMinTotalRatio))
    : 0.6;
  if (
    mode === "full" &&
    metrics.total_anterior > 0 &&
    metrics.total < Math.floor(metrics.total_anterior * minTotalRatio)
  ) {
    reasons.push(
      `Total da carga nova (${metrics.total}) abaixo de ${(minTotalRatio * 100).toFixed(0)}% da carga anterior (${metrics.total_anterior}).`
    );
  }

  if (metrics.total > 0 && pct(metrics.objeto_preenchido, metrics.total) < 0.9) {
    reasons.push(`Objeto preenchido em menos de 90% da carga nova (${metrics.objeto_preenchido}/${metrics.total}).`);
  }

  if (metrics.total_anterior > 0 && metrics.banco_anterior > 0) {
    const bancoRateAtual = pct(metrics.banco_preenchido, metrics.total);
    const bancoRateAnterior = pct(metrics.banco_anterior, metrics.total_anterior);
    if (bancoRateAtual < bancoRateAnterior * 0.9) {
      reasons.push(
        `Banco preenchido caiu abaixo de 90% da taxa anterior (${metrics.banco_preenchido}/${metrics.total} vs ${metrics.banco_anterior}/${metrics.total_anterior}).`
      );
    }
  }

  if (metrics.total_anterior > 0 && metrics.agencia_anterior > 0) {
    const agenciaRateAtual = pct(metrics.agencia_preenchida, metrics.total);
    const agenciaRateAnterior = pct(metrics.agencia_anterior, metrics.total_anterior);
    if (agenciaRateAtual < agenciaRateAnterior * 0.9) {
      reasons.push(
        `Agencia preenchida caiu abaixo de 90% da taxa anterior (${metrics.agencia_preenchida}/${metrics.total} vs ${metrics.agencia_anterior}/${metrics.total_anterior}).`
      );
    }
  }

  return {
    ok: reasons.length === 0,
    reasons,
    metrics
  };
};

const pruneOldSnapshots = async () => {
  await prisma.$executeRawUnsafe(`
    DELETE FROM ${TABLE_MAIN_SNAPSHOT}
    WHERE snapshot_id NOT IN (
      SELECT snapshot_id
      FROM ${TABLE_MAIN_SNAPSHOT}
      GROUP BY snapshot_id, snapshot_created_at
      ORDER BY snapshot_created_at DESC
      LIMIT 2
    )
  `);

  await prisma.$executeRawUnsafe(`
    DELETE FROM ${TABLE_DESEMBOLSO_SNAPSHOT}
    WHERE snapshot_id NOT IN (
      SELECT snapshot_id
      FROM ${TABLE_DESEMBOLSO_SNAPSHOT}
      GROUP BY snapshot_id, snapshot_created_at
      ORDER BY snapshot_created_at DESC
      LIMIT 2
    )
  `);
};

const snapshotCurrentPublishedData = async (runId: string, createdAt: string) => {
  const currentCountRows = await prisma.$queryRaw<RawCountRow[]>`
    SELECT COUNT(*) AS total FROM transferencias_discricionarias
  `;
  if (toInt(currentCountRows[0]?.total ?? 0) === 0) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO ${TABLE_MAIN_SNAPSHOT} (
      snapshot_id,
      snapshot_created_at,
      id,
      chave_unica,
      fonte_arquivo,
      data_carga_fonte,
      tipo_ente,
      id_proposta,
      nr_proposta,
      nr_convenio,
      nr_convenio_norm,
      uf,
      municipio,
      cod_ibge,
      cnpj,
      nome_proponente,
      natureza_juridica,
      situacao_proposta,
      situacao_convenio,
      situacao_contratacao,
      objeto,
      link_acesso_livre,
      ano_referencia,
      dia_assin_conv,
      dia_inic_vigencia,
      dia_fim_vigencia,
      dt_aprovacao_proposta,
      dt_conclusao_prestacao_contas,
      valor_global_conv,
      valor_desembolsado_conv,
      valor_pagamentos,
      valor_tributos,
      total_gasto,
      quantidade_convenios,
      qtd_tas_convenio,
      qtd_dias_prorroga,
      valor_contrapartida_financeira,
      valor_contrapartida_depositada,
      banco,
      agencia,
      conta,
      concedente_orgao_sup,
      concedente_orgao,
      atualizado_em
    )
    SELECT
      '${runId.replace(/'/g, "''")}',
      '${createdAt.replace(/'/g, "''")}',
      id,
      chave_unica,
      fonte_arquivo,
      data_carga_fonte,
      tipo_ente,
      id_proposta,
      nr_proposta,
      nr_convenio,
      nr_convenio_norm,
      uf,
      municipio,
      cod_ibge,
      cnpj,
      nome_proponente,
      natureza_juridica,
      situacao_proposta,
      situacao_convenio,
      situacao_contratacao,
      objeto,
      link_acesso_livre,
      ano_referencia,
      dia_assin_conv,
      dia_inic_vigencia,
      dia_fim_vigencia,
      dt_aprovacao_proposta,
      dt_conclusao_prestacao_contas,
      valor_global_conv,
      valor_desembolsado_conv,
      valor_pagamentos,
      valor_tributos,
      total_gasto,
      quantidade_convenios,
      qtd_tas_convenio,
      qtd_dias_prorroga,
      valor_contrapartida_financeira,
      valor_contrapartida_depositada,
      banco,
      agencia,
      conta,
      concedente_orgao_sup,
      concedente_orgao,
      atualizado_em
    FROM ${TABLE_MAIN}
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO ${TABLE_DESEMBOLSO_SNAPSHOT} (
      snapshot_id,
      snapshot_created_at,
      id,
      chave_unica,
      fonte_arquivo,
      data_carga_fonte,
      id_desembolso,
      nr_convenio,
      nr_convenio_norm,
      dt_ult_desembolso,
      qtd_dias_sem_desembolso,
      data_desembolso,
      ano_desembolso,
      mes_desembolso,
      nr_siafi,
      ug_emitente_dh,
      observacao_dh,
      vl_desembolsado,
      atualizado_em
    )
    SELECT
      '${runId.replace(/'/g, "''")}',
      '${createdAt.replace(/'/g, "''")}',
      id,
      chave_unica,
      fonte_arquivo,
      data_carga_fonte,
      id_desembolso,
      nr_convenio,
      nr_convenio_norm,
      dt_ult_desembolso,
      qtd_dias_sem_desembolso,
      data_desembolso,
      ano_desembolso,
      mes_desembolso,
      nr_siafi,
      ug_emitente_dh,
      observacao_dh,
      vl_desembolsado,
      atualizado_em
    FROM ${TABLE_DESEMBOLSO}
  `);

  await pruneOldSnapshots();
};

const toInsertSqlRow = (row: NormalizedImportRow) => Prisma.sql`(
  ${row.chave_unica},
  ${row.fonte_arquivo},
  ${row.data_carga_fonte},
  ${row.tipo_ente},
  ${row.id_proposta},
  ${row.nr_proposta},
  ${row.nr_convenio},
  ${row.nr_convenio_norm},
  ${row.uf},
  ${row.municipio},
  ${row.cod_ibge},
  ${row.cnpj},
  ${row.nome_proponente},
  ${row.natureza_juridica},
  ${row.situacao_proposta},
  ${row.situacao_convenio},
  ${row.situacao_contratacao},
  ${row.objeto},
  ${row.link_acesso_livre},
  ${row.ano_referencia},
  ${row.dia_assin_conv},
  ${row.dia_inic_vigencia},
  ${row.dia_fim_vigencia},
  ${row.dt_aprovacao_proposta},
  ${row.dt_conclusao_prestacao_contas},
  ${row.valor_global_conv},
  ${row.valor_desembolsado_conv},
  ${row.valor_pagamentos},
  ${row.valor_tributos},
  ${row.total_gasto},
  ${row.quantidade_convenios},
  ${row.qtd_tas_convenio},
  ${row.qtd_dias_prorroga},
  ${row.valor_contrapartida_financeira},
  ${row.valor_contrapartida_depositada},
  ${row.banco},
  ${row.agencia},
  ${row.conta},
  ${row.concedente_orgao_sup},
  ${row.concedente_orgao},
  ${row.atualizado_em}
)`;

const insertStageBatch = async (rows: NormalizedImportRow[]) => {
  if (rows.length === 0) {
    return;
  }

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO ${Prisma.raw(TABLE_STAGE)} (
        chave_unica,
        fonte_arquivo,
        data_carga_fonte,
        tipo_ente,
        id_proposta,
        nr_proposta,
        nr_convenio,
        nr_convenio_norm,
        uf,
        municipio,
        cod_ibge,
        cnpj,
        nome_proponente,
        natureza_juridica,
        situacao_proposta,
        situacao_convenio,
        situacao_contratacao,
        objeto,
        link_acesso_livre,
        ano_referencia,
        dia_assin_conv,
        dia_inic_vigencia,
        dia_fim_vigencia,
        dt_aprovacao_proposta,
        dt_conclusao_prestacao_contas,
        valor_global_conv,
        valor_desembolsado_conv,
        valor_pagamentos,
        valor_tributos,
        total_gasto,
        quantidade_convenios,
        qtd_tas_convenio,
        qtd_dias_prorroga,
        valor_contrapartida_financeira,
        valor_contrapartida_depositada,
        banco,
        agencia,
        conta,
        concedente_orgao_sup,
        concedente_orgao,
        atualizado_em
      )
      VALUES ${Prisma.join(rows.map((row) => toInsertSqlRow(row)))}
    `
  );
};

const toInsertDesembolsoSqlRow = (row: NormalizedDesembolsoImportRow) => Prisma.sql`(
  ${row.chave_unica},
  ${row.fonte_arquivo},
  ${row.data_carga_fonte},
  ${row.id_desembolso},
  ${row.nr_convenio},
  ${row.nr_convenio_norm},
  ${row.dt_ult_desembolso},
  ${row.qtd_dias_sem_desembolso},
  ${row.data_desembolso},
  ${row.ano_desembolso},
  ${row.mes_desembolso},
  ${row.nr_siafi},
  ${row.ug_emitente_dh},
  ${row.observacao_dh},
  ${row.vl_desembolsado},
  ${row.atualizado_em}
)`;

const insertDesembolsoStageBatch = async (rows: NormalizedDesembolsoImportRow[]) => {
  if (rows.length === 0) {
    return;
  }

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO ${Prisma.raw(TABLE_DESEMBOLSO_STAGE)} (
        chave_unica,
        fonte_arquivo,
        data_carga_fonte,
        id_desembolso,
        nr_convenio,
        nr_convenio_norm,
        dt_ult_desembolso,
        qtd_dias_sem_desembolso,
        data_desembolso,
        ano_desembolso,
        mes_desembolso,
        nr_siafi,
        ug_emitente_dh,
        observacao_dh,
        vl_desembolsado,
        atualizado_em
      )
      VALUES ${Prisma.join(rows.map((row) => toInsertDesembolsoSqlRow(row)))}
    `
  );
};

type ConvenioEnriquecimentoRow = {
  nr_convenio: string;
  valor_contrapartida_financeira: number | null;
  dia_limite_prest_contas: string | null;
};

const toInsertContrapartidaSqlRow = (row: ConvenioEnriquecimentoRow) =>
  Prisma.sql`(${row.nr_convenio}, ${row.valor_contrapartida_financeira}, ${row.dia_limite_prest_contas})`;

const insertContrapartidaStageBatch = async (rows: ConvenioEnriquecimentoRow[]) => {
  if (rows.length === 0) {
    return;
  }

  const values = rows.map(row => {
    const v1 = row.nr_convenio ? `'${row.nr_convenio.replace(/'/g, "''")}'` : 'NULL';
    const v2 = row.valor_contrapartida_financeira !== null ? row.valor_contrapartida_financeira : 'NULL';
    const v3 = row.dia_limite_prest_contas ? `'${row.dia_limite_prest_contas.replace(/'/g, "''")}'` : 'NULL';
    return `(${v1}, ${v2}, ${v3})`;
  }).join(', ');

  await prisma.$executeRawUnsafe(`
    INSERT INTO ${TABLE_CONTRAPARTIDA_STAGE} (
      nr_convenio,
      valor_contrapartida_financeira,
      dia_limite_prest_contas
    )
    VALUES ${values}
    ON CONFLICT (nr_convenio) DO UPDATE SET
      valor_contrapartida_financeira = EXCLUDED.valor_contrapartida_financeira,
      dia_limite_prest_contas = EXCLUDED.dia_limite_prest_contas
  `);
};

const enriquecerContrapartidaFinanceiraNaStage = async (conveniosValidos: Set<string>) => {
  const convenioFile = "siconv_convenio.csv.zip";
  const csvText = await downloadCsvTextFromZipWithRetry(convenioFile, "latin1");

  await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_CONTRAPARTIDA_STAGE}`);

  const lines = csvText.split(/\r?\n/);
  const headerLine = normalizeCsvHeaderLine(lines[0] ?? "");
  const headerCells = splitCsvLine(headerLine);
  const headerIndexMap = new Map(headerCells.map((column, index) => [column.trim(), index]));

  const getCell = (column: string, cells: string[]) => {
    const index = headerIndexMap.get(column);
    if (index === undefined) {
      return null;
    }
    return cells[index] ?? "";
  };

  let batch: ConvenioEnriquecimentoRow[] = [];

  const flushBatch = async () => {
    if (batch.length === 0) {
      return;
    }
    await insertContrapartidaStageBatch(batch);
    batch = [];
  };

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (!line || line.trim() === "") {
      continue;
    }

    const cells = splitCsvLine(line);
    const nrConvenio = toNullableDigits(getCell("NR_CONVENIO", cells));
    
    if (conveniosValidos.size > 0 && nrConvenio && !conveniosValidos.has(nrConvenio)) {
      continue;
    }
    const valorContrapartida = toNullableFloat(getCell("VL_CONTRAPARTIDA_CONV", cells));
    const diaLimitePrestContas = toNullableText(getCell("DIA_LIMITE_PREST_CONTAS", cells));

    if (!nrConvenio || (valorContrapartida === null && diaLimitePrestContas === null)) {
      continue;
    }

    batch.push({
      nr_convenio: nrConvenio,
      valor_contrapartida_financeira: valorContrapartida,
      dia_limite_prest_contas: diaLimitePrestContas
    });

    if (batch.length >= INSERT_BATCH_SIZE) {
      await flushBatch();
    }
  }

  if (batch.length > 0) {
    await flushBatch();
  }

  await prisma.$executeRawUnsafe(`
    UPDATE ${TABLE_STAGE}
    SET
      valor_contrapartida_financeira = cs.valor_contrapartida_financeira,
      dt_conclusao_prestacao_contas = COALESCE(${TABLE_STAGE}.dt_conclusao_prestacao_contas, cs.dia_limite_prest_contas)
    FROM ${TABLE_CONTRAPARTIDA_STAGE} cs
    WHERE cs.nr_convenio = REPLACE(REPLACE(REPLACE(REPLACE(${TABLE_STAGE}.nr_convenio, '.', ''), '/', ''), '-', ''), ' ', '')
  `);

  await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_CONTRAPARTIDA_STAGE}`);
};

type IngressoContrapartidaRow = {
  nr_convenio: string;
  valor_contrapartida_depositada: number;
};

const insertIngressoContrapartidaStageBatch = async (rows: IngressoContrapartidaRow[]) => {
  if (rows.length === 0) {
    return;
  }

  const aggregatedRows = Array.from(
    rows.reduce((acc, row) => {
      acc.set(row.nr_convenio, (acc.get(row.nr_convenio) ?? 0) + row.valor_contrapartida_depositada);
      return acc;
    }, new Map<string, number>())
  ).map(([nr_convenio, valor_contrapartida_depositada]) => ({
    nr_convenio,
    valor_contrapartida_depositada
  }));

  const values = aggregatedRows.map((row) => {
    const convenio = row.nr_convenio ? `'${row.nr_convenio.replace(/'/g, "''")}'` : "NULL";
    return `(${convenio}, ${row.valor_contrapartida_depositada})`;
  }).join(", ");

  await prisma.$executeRawUnsafe(`
    INSERT INTO ${TABLE_INGRESSO_CONTRAPARTIDA_STAGE} (
      nr_convenio,
      valor_contrapartida_depositada
    )
    VALUES ${values}
    ON CONFLICT (nr_convenio) DO UPDATE SET
      valor_contrapartida_depositada =
        COALESCE(${TABLE_INGRESSO_CONTRAPARTIDA_STAGE}.valor_contrapartida_depositada, 0)
        + COALESCE(EXCLUDED.valor_contrapartida_depositada, 0)
  `);
};

const enriquecerIngressoContrapartidaNaStage = async (conveniosValidos: Set<string>) => {
  const csvText = await downloadCsvTextFromZipWithRetry(INGRESSO_CONTRAPARTIDA_FILE, "latin1");

  await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_INGRESSO_CONTRAPARTIDA_STAGE}`);

  const lines = csvText.split(/\r?\n/);
  const headerLine = normalizeCsvHeaderLine(lines[0] ?? "");
  const headerCells = splitCsvLine(headerLine);
  const headerIndexMap = new Map(headerCells.map((column, index) => [column.trim(), index]));

  const getCell = (column: string, cells: string[]) => {
    const index = headerIndexMap.get(column);
    if (index === undefined) {
      return null;
    }
    return cells[index] ?? "";
  };

  let batch: IngressoContrapartidaRow[] = [];

  const flushBatch = async () => {
    if (batch.length === 0) {
      return;
    }
    await insertIngressoContrapartidaStageBatch(batch);
    batch = [];
  };

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (!line || line.trim() === "") {
      continue;
    }

    const cells = splitCsvLine(line);
    const nrConvenio = toNullableDigits(getCell("NR_CONVENIO", cells));
    if (!nrConvenio || (conveniosValidos.size > 0 && !conveniosValidos.has(nrConvenio))) {
      continue;
    }

    const valorIngresso = toNullableFloat(getCell("VL_INGRESSO_CONTRAPARTIDA", cells));
    if (valorIngresso === null) {
      continue;
    }

    batch.push({
      nr_convenio: nrConvenio,
      valor_contrapartida_depositada: valorIngresso
    });

    if (batch.length >= INSERT_BATCH_SIZE) {
      await flushBatch();
    }
  }

  if (batch.length > 0) {
    await flushBatch();
  }

  await prisma.$executeRawUnsafe(`
    UPDATE ${TABLE_STAGE}
    SET valor_contrapartida_depositada = ics.valor_contrapartida_depositada
    FROM ${TABLE_INGRESSO_CONTRAPARTIDA_STAGE} ics
    WHERE ics.nr_convenio = REPLACE(REPLACE(REPLACE(REPLACE(${TABLE_STAGE}.nr_convenio, '.', ''), '/', ''), '-', ''), ' ', '')
  `);

  await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_INGRESSO_CONTRAPARTIDA_STAGE}`);
};

const toInsertPropostaSqlRow = (row: NormalizedPropostaImportRow) => Prisma.sql`(
  ${row.chave_unica},
  ${row.id_proposta},
  ${row.nr_proposta},
  ${row.nr_proposta_norm},
  ${row.objeto},
  ${row.dia_inic_vigencia},
  ${row.dia_fim_vigencia},
  ${row.valor_contrapartida_financeira}
)`;

const insertPropostaStageBatch = async (rows: NormalizedPropostaImportRow[]) => {
  if (rows.length === 0) {
    return;
  }

  const values = rows.map(row => {
    const v1 = row.chave_unica ? `'${row.chave_unica.replace(/'/g, "''")}'` : 'NULL';
    const v2 = row.id_proposta !== null ? row.id_proposta : 'NULL';
    const v3 = row.nr_proposta ? `'${row.nr_proposta.replace(/'/g, "''")}'` : 'NULL';
    const v4 = row.nr_proposta_norm ? `'${row.nr_proposta_norm.replace(/'/g, "''")}'` : 'NULL';
    const v5 = row.uf ? `'${row.uf.replace(/'/g, "''")}'` : 'NULL';
    const v6 = row.municipio ? `'${row.municipio.replace(/'/g, "''")}'` : 'NULL';
    const v7 = row.cnpj ? `'${row.cnpj.replace(/'/g, "''")}'` : 'NULL';
    const v8 = row.nome_proponente ? `'${row.nome_proponente.replace(/'/g, "''")}'` : 'NULL';
    const v9 = row.natureza_juridica ? `'${row.natureza_juridica.replace(/'/g, "''")}'` : 'NULL';
    const v10 = row.situacao_proposta ? `'${row.situacao_proposta.replace(/'/g, "''")}'` : 'NULL';
    const v11 = row.objeto ? `'${row.objeto.replace(/'/g, "''")}'` : 'NULL';
    const v12 = row.dia_inic_vigencia ? `'${row.dia_inic_vigencia.replace(/'/g, "''")}'` : 'NULL';
    const v13 = row.dia_fim_vigencia ? `'${row.dia_fim_vigencia.replace(/'/g, "''")}'` : 'NULL';
    const v14 = row.valor_contrapartida_financeira !== null ? row.valor_contrapartida_financeira : 'NULL';
    const v15 = row.banco ? `'${row.banco.replace(/'/g, "''")}'` : 'NULL';
    const v16 = row.agencia ? `'${row.agencia.replace(/'/g, "''")}'` : 'NULL';
    const v17 = row.conta ? `'${row.conta.replace(/'/g, "''")}'` : 'NULL';
    const v18 = row.concedente_orgao_sup ? `'${row.concedente_orgao_sup.replace(/'/g, "''")}'` : 'NULL';
    const v19 = row.concedente_orgao ? `'${row.concedente_orgao.replace(/'/g, "''")}'` : 'NULL';
    return `(${v1}, ${v2}, ${v3}, ${v4}, ${v5}, ${v6}, ${v7}, ${v8}, ${v9}, ${v10}, ${v11}, ${v12}, ${v13}, ${v14}, ${v15}, ${v16}, ${v17}, ${v18}, ${v19})`;
  }).join(', ');

  await prisma.$executeRawUnsafe(`
    INSERT INTO ${TABLE_PROPOSTA_STAGE} (
      chave_unica,
      id_proposta,
      nr_proposta,
      nr_proposta_norm,
      uf,
      municipio,
      cnpj,
      nome_proponente,
      natureza_juridica,
      situacao_proposta,
      objeto,
      dia_inic_vigencia,
      dia_fim_vigencia,
      valor_contrapartida_financeira,
      banco,
      agencia,
      conta,
      concedente_orgao_sup,
      concedente_orgao
    )
    VALUES ${values}
    ON CONFLICT (chave_unica) DO UPDATE SET
      id_proposta = EXCLUDED.id_proposta,
      nr_proposta = EXCLUDED.nr_proposta,
      nr_proposta_norm = EXCLUDED.nr_proposta_norm,
      uf = EXCLUDED.uf,
      municipio = EXCLUDED.municipio,
      cnpj = EXCLUDED.cnpj,
      nome_proponente = EXCLUDED.nome_proponente,
      natureza_juridica = EXCLUDED.natureza_juridica,
      situacao_proposta = EXCLUDED.situacao_proposta,
      objeto = EXCLUDED.objeto,
      dia_inic_vigencia = EXCLUDED.dia_inic_vigencia,
      dia_fim_vigencia = EXCLUDED.dia_fim_vigencia,
      valor_contrapartida_financeira = EXCLUDED.valor_contrapartida_financeira,
      banco = EXCLUDED.banco,
      agencia = EXCLUDED.agencia,
      conta = EXCLUDED.conta,
      concedente_orgao_sup = EXCLUDED.concedente_orgao_sup,
      concedente_orgao = EXCLUDED.concedente_orgao
  `);
};

const resolveTipoEnteByNatureza = (naturezaJuridica: string | null | undefined): "estado" | "municipio" => {
  const source = (naturezaJuridica ?? "").toLowerCase();
  if (source.includes("estad")) {
    return "estado";
  }
  return "municipio";
};

type PropostaStageLightRow = {
  id_proposta: number;
  nr_proposta: string | null;
  uf: string | null;
  municipio: string | null;
  cnpj: string | null;
  nome_proponente: string | null;
  natureza_juridica: string | null;
  situacao_proposta: string | null;
  objeto: string | null;
  dia_inic_vigencia: string | null;
  dia_fim_vigencia: string | null;
  valor_contrapartida_financeira: number | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  concedente_orgao_sup: string | null;
  concedente_orgao: string | null;
};

const complementarStageComConveniosAusentes = async (dataCargaFonte: string) => {
  const propostas = await prisma.$queryRaw<PropostaStageLightRow[]>(Prisma.sql`
    SELECT
      id_proposta,
      nr_proposta,
      uf,
      municipio,
      cnpj,
      nome_proponente,
      natureza_juridica,
      situacao_proposta,
      objeto,
      dia_inic_vigencia,
      dia_fim_vigencia,
      valor_contrapartida_financeira,
      banco,
      agencia,
      conta,
      concedente_orgao_sup,
      concedente_orgao
    FROM ${Prisma.raw(TABLE_PROPOSTA_STAGE)}
    WHERE id_proposta IS NOT NULL
      AND cnpj IS NOT NULL
      AND TRIM(cnpj) <> ''
  `);

  if (propostas.length === 0) {
    return 0;
  }

  const propostaById = new Map<number, PropostaStageLightRow>();
  for (const proposta of propostas) {
    propostaById.set(proposta.id_proposta, proposta);
  }

  const existingPairs = await prisma.$queryRaw<Array<{ pair_key: string }>>(Prisma.sql`
    SELECT DISTINCT (COALESCE(id_proposta::text, '') || '|' || COALESCE(nr_convenio_norm, '')) AS pair_key
    FROM ${Prisma.raw(TABLE_STAGE)}
  `);
  const existingPairKeys = new Set(existingPairs.map((item) => item.pair_key));

  const csvBytes = await downloadCsvBytesFromZipWithRetry("siconv_convenio.csv.zip");
  const encoding = detectCsvEncoding(csvBytes);

  let headerIndexMap: Map<string, number> | null = null;
  let batch: NormalizedImportRow[] = [];
  let inserted = 0;

  const getCell = (column: string, cells: string[]) => {
    const index = headerIndexMap?.get(column);
    if (index === undefined) {
      return null;
    }
    return cells[index] ?? "";
  };

  const flushBatch = async () => {
    if (batch.length === 0) {
      return;
    }
    await insertStageBatch(batch);
    inserted += batch.length;
    batch = [];
  };

  await processCsvBytesByLine(csvBytes, encoding, async (line, lineIndex) => {
    if (lineIndex === 0) {
      const headerLine = normalizeCsvHeaderLine(line ?? "");
      const headerCells = splitCsvLine(headerLine);
      headerIndexMap = new Map(headerCells.map((column, index) => [column.trim(), index]));
      return;
    }

    if (!headerIndexMap || !line || line.trim() === "") {
      return;
    }

    const cells = splitCsvLine(line);
    const idProposta = toNullableInt(getCell("ID_PROPOSTA", cells));
    if (idProposta === null) {
      return;
    }

    const proposta = propostaById.get(idProposta);
    if (!proposta) {
      return;
    }

    const nrConvenio = toNullableText(getCell("NR_CONVENIO", cells));
    const nrConvenioNorm = normalizeConvenioCode(nrConvenio);
    if (!nrConvenioNorm) {
      return;
    }

    const pairKey = `${idProposta}|${nrConvenioNorm}`;
    if (existingPairKeys.has(pairKey)) {
      return;
    }

    const diaAssinConv = toNullableText(getCell("DIA_ASSIN_CONV", cells));
    const diaInicVigencia = toNullableText(getCell("DIA_INIC_VIGENC_CONV", cells)) ?? proposta.dia_inic_vigencia;
    const diaFimVigencia = toNullableText(getCell("DIA_FIM_VIGENC_CONV", cells)) ?? proposta.dia_fim_vigencia;

    const anoReferencia =
      extractYearFromDateBr(diaAssinConv) ??
      extractYearFromDateBr(diaInicVigencia) ??
      extractYearFromDateBr(diaFimVigencia) ??
      extractYearFromProposta(proposta.nr_proposta);

    const chaveUnica = `fallback:id:${idProposta}|conv:${nrConvenioNorm}`;

    batch.push({
      chave_unica: chaveUnica,
      fonte_arquivo: "siconv_convenio.csv.zip",
      data_carga_fonte: dataCargaFonte,
      tipo_ente: resolveTipoEnteByNatureza(proposta.natureza_juridica),
      id_proposta: idProposta,
      nr_proposta: proposta.nr_proposta,
      nr_convenio: nrConvenio,
      nr_convenio_norm: nrConvenioNorm,
      uf: proposta.uf,
      municipio: proposta.municipio,
      cod_ibge: null,
      cnpj: proposta.cnpj,
      nome_proponente: proposta.nome_proponente,
      natureza_juridica: proposta.natureza_juridica,
      situacao_proposta: proposta.situacao_proposta,
      situacao_convenio: toNullableText(getCell("SIT_CONVENIO", cells)),
      situacao_contratacao: toNullableText(getCell("SITUACAO_CONTRATACAO", cells)),
      objeto: proposta.objeto,
      link_acesso_livre: `https://discricionarias.transferegov.sistema.gov.br/voluntarias/ConsultarProposta/ResultadoDaConsultaDePropostaDetalharProposta.do?idProposta=${idProposta}&Usr=guest&Pwd=guest`,
      ano_referencia: anoReferencia,
      dia_assin_conv: diaAssinConv,
      dia_inic_vigencia: diaInicVigencia,
      dia_fim_vigencia: diaFimVigencia,
      dt_aprovacao_proposta: null,
      dt_conclusao_prestacao_contas: toNullableText(getCell("DIA_LIMITE_PREST_CONTAS", cells)),
      valor_global_conv: toNullableFloat(getCell("VL_GLOBAL_CONV", cells)),
      valor_desembolsado_conv: toNullableFloat(getCell("VL_DESEMBOLSADO_CONV", cells)),
      valor_pagamentos: null,
      valor_tributos: null,
      total_gasto: null,
      quantidade_convenios: toNullableInt(getCell("QTDE_CONVENIOS", cells)),
      qtd_tas_convenio: toNullableInt(getCell("QTD_TA", cells)),
      qtd_dias_prorroga: toNullableInt(getCell("QTD_PRORROGA", cells)),
      valor_contrapartida_financeira:
        toNullableFloat(getCell("VL_CONTRAPARTIDA_CONV", cells)) ?? proposta.valor_contrapartida_financeira,
      valor_contrapartida_depositada: null,
      banco: proposta.banco,
      agencia: proposta.agencia,
      conta: proposta.conta,
      concedente_orgao_sup: proposta.concedente_orgao_sup,
      concedente_orgao: proposta.concedente_orgao,
      atualizado_em: new Date().toISOString()
    });

    existingPairKeys.add(pairKey);

    if (batch.length >= INSERT_BATCH_SIZE) {
      await flushBatch();
    }
  });

  if (batch.length > 0) {
    await flushBatch();
  }

  return inserted;
};

const enriquecerDadosPropostaNaStage = async (
  propostasValidas: Set<string>,
  cnpjsValidos: Set<string>,
  dataCargaFonte: string
) => {
  const csvBytes = await downloadCsvBytesFromZipWithRetry(PROPOSTA_FILE);
  const encoding = detectCsvEncoding(csvBytes);

  await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_PROPOSTA_STAGE}`);

  let totalInserted = 0;
  let batch: NormalizedPropostaImportRow[] = [];
  let headerIndexMap: Map<string, number> | null = null;

  const getCell = (column: string, cells: string[]) => {
    const index = headerIndexMap?.get(column);
    if (index === undefined) {
      return null;
    }
    return cells[index] ?? "";
  };

  const flushBatch = async () => {
    if (batch.length === 0) {
      return;
    }
    await insertPropostaStageBatch(batch);
    totalInserted += batch.length;
    batch = [];
  };

  await processCsvBytesByLine(csvBytes, encoding, async (line, lineIndex) => {
    if (lineIndex === 0) {
      const headerLine = normalizeCsvHeaderLine(line ?? "");
      const headerCells = splitCsvLine(headerLine);
      headerIndexMap = new Map(headerCells.map((column, index) => [column.trim(), index]));
      return;
    }

    if (!headerIndexMap || !line || line.trim() === "") {
      return;
    }

    const cells = splitCsvLine(line);
    const nrPropostaNorm = toNullableDigits(getCell("NR_PROPOSTA", cells));
    const cnpj = toNullableDigits(getCell("IDENTIF_PROPONENTE", cells));
    const trackedByCnpj = cnpj ? cnpjsValidos.has(cnpj) : false;
    const trackedByProposta = nrPropostaNorm ? propostasValidas.has(nrPropostaNorm) : false;

    if (cnpjsValidos.size > 0) {
      if (!trackedByCnpj && !trackedByProposta) {
        return;
      }
    } else if (propostasValidas.size > 0 && !trackedByProposta) {
      return;
    }

    const idProposta = toNullableInt(getCell("ID_PROPOSTA", cells));
    const nrProposta = toNullableText(getCell("NR_PROPOSTA", cells));
    const uf = toNullableText(getCell("UF_PROPONENTE", cells));
    const municipio = toNullableText(getCell("MUNIC_PROPONENTE", cells));
    const objeto = toNullableText(getCell("OBJETO_PROPOSTA", cells));
    const diaInicVigencia = toNullableText(getCell("DIA_INIC_VIGENCIA_PROPOSTA", cells));
    const diaFimVigencia = toNullableText(getCell("DIA_FIM_VIGENCIA_PROPOSTA", cells));
    const valorContrapartida = toNullableFloat(getCell("VL_CONTRAPARTIDA_PROP", cells));
    const nomeProponente = toNullableText(getCell("NM_PROPONENTE", cells));
    const naturezaJuridica = toNullableText(getCell("NATUREZA_JURIDICA", cells));
    const situacaoProposta = toNullableText(getCell("SIT_PROPOSTA", cells));
    const concedenteOrgaoSup = toNullableText(getCell("DESC_ORGAO_SUP", cells));
    const concedenteOrgao = toNullableText(getCell("DESC_ORGAO", cells));
    const banco = toNullableText(getCell("NM_BANCO", cells));
    const agencia = toNullableText(getCell("CD_AGENCIA", cells));
    const conta = toNullableText(getCell("CD_CONTA", cells));

    if (idProposta === null && nrPropostaNorm === null && nrProposta === null) {
      return;
    }

    if (objeto === null && diaInicVigencia === null && diaFimVigencia === null && valorContrapartida === null) {
      return;
    }

    const keyBase =
      idProposta !== null
        ? `id:${idProposta}`
        : `nr:${nrPropostaNorm ?? nrProposta ?? "sem_nr"}|linha:${lineIndex + 1}`;

    batch.push({
      chave_unica: `proposta:${keyBase}`,
      id_proposta: idProposta,
      nr_proposta: nrProposta,
      nr_proposta_norm: nrPropostaNorm,
      uf,
      municipio,
      cnpj,
      nome_proponente: nomeProponente,
      natureza_juridica: naturezaJuridica,
      situacao_proposta: situacaoProposta,
      objeto,
      dia_inic_vigencia: diaInicVigencia,
      dia_fim_vigencia: diaFimVigencia,
      valor_contrapartida_financeira: valorContrapartida,
      banco,
      agencia,
      conta,
      concedente_orgao_sup: concedenteOrgaoSup,
      concedente_orgao: concedenteOrgao
    });

    if (batch.length >= INSERT_BATCH_SIZE) {
      await flushBatch();
    }
  });

  if (batch.length > 0) {
    await flushBatch();
  }

  const nrPropostaStageNormExpr =
    `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${TABLE_STAGE}.nr_proposta, ''), '.', ''), '/', ''), '-', ''), ' ', ''), ',', '')`;

  await prisma.$executeRawUnsafe(`
    UPDATE ${TABLE_STAGE}
    SET
      objeto = COALESCE(ps.objeto, ${TABLE_STAGE}.objeto),
      dia_inic_vigencia = COALESCE(ps.dia_inic_vigencia, ${TABLE_STAGE}.dia_inic_vigencia),
      dia_fim_vigencia = COALESCE(ps.dia_fim_vigencia, ${TABLE_STAGE}.dia_fim_vigencia),
      valor_contrapartida_financeira = COALESCE(ps.valor_contrapartida_financeira, ${TABLE_STAGE}.valor_contrapartida_financeira),
      banco = COALESCE(ps.banco, ${TABLE_STAGE}.banco),
      agencia = COALESCE(ps.agencia, ${TABLE_STAGE}.agencia),
      conta = COALESCE(ps.conta, ${TABLE_STAGE}.conta),
      concedente_orgao_sup = COALESCE(ps.concedente_orgao_sup, ${TABLE_STAGE}.concedente_orgao_sup),
      concedente_orgao = COALESCE(ps.concedente_orgao, ${TABLE_STAGE}.concedente_orgao)
    FROM ${TABLE_PROPOSTA_STAGE} ps
    WHERE (ps.id_proposta IS NOT NULL AND ps.id_proposta = ${TABLE_STAGE}.id_proposta)
       OR (ps.nr_proposta_norm IS NOT NULL AND ps.nr_proposta_norm = ${nrPropostaStageNormExpr})
  `);

  const insertedFallback = cnpjsValidos.size > 0 ? await complementarStageComConveniosAusentes(dataCargaFonte) : 0;
  await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_PROPOSTA_STAGE}`);
  return totalInserted + insertedFallback;
};

const processCsvIntoStage = async (
  csvText: string,
  fileName: string,
  dataCargaFonte: string,
  cnpjsValidos: Set<string>,
  conveniosValidos: Set<string>,
  propostasValidas: Set<string>
) => {
  const tipoEnte = resolveTipoEnte(fileName);
  const lines = csvText.split(/\r?\n/);
  const headerLine = normalizeCsvHeaderLine(lines[0] ?? "");
  const headerCells = splitCsvLine(headerLine);
  const headerIndexMap = new Map(headerCells.map((column, index) => [column.trim(), index]));

  let totalInserted = 0;
  let batch: NormalizedImportRow[] = [];

  const flushBatch = async () => {
    if (batch.length === 0) {
      return;
    }
    await insertStageBatch(batch);
    totalInserted += batch.length;
    batch = [];
  };

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (line.trim() === "") {
      continue;
    }

    const getCell = (column: string, cells: string[]) => {
      const index = headerIndexMap.get(column);
      if (index === undefined) {
        return null;
      }
      return cells[index] ?? "";
    };

    const cells = splitCsvLine(line);
    const cnpj = toNullableDigits(getCell("CD_IDENTIF_PROPONENTE", cells));

    if (cnpj && cnpjsValidos.size > 0 && !cnpjsValidos.has(cnpj)) {
      continue;
    }

    const lineNumber = lineIndex + 1;
    const idProposta = toNullableInt(getCell("ID_PROPOSTA", cells));
    const nrProposta = toNullableText(getCell("NR_PROPOSTA", cells));
    const nrPropostaNorm = toNullableDigits(nrProposta);
    if (nrPropostaNorm) {
      propostasValidas.add(nrPropostaNorm);
    }

    const nrConvenio = toNullableText(getCell("NR_CONVENIO", cells));
    const nrConvenioNorm = normalizeConvenioCode(nrConvenio);

    if (nrConvenioNorm) {
      conveniosValidos.add(nrConvenioNorm);
    }

    const diaAssinConv = toNullableText(getCell("DIA_ASSIN_CONV", cells));
    const dtAprovacaoProposta = toNullableText(getCell("DT_APROVACAO_PROPOSTA", cells));

    const anoReferencia =
      extractYearFromDateBr(diaAssinConv) ??
      extractYearFromDateBr(dtAprovacaoProposta) ??
      extractYearFromProposta(nrProposta);

    const baseKey =
      idProposta !== null
        ? `id:${idProposta}`
        : `nr:${nrProposta ?? "sem_proposta"}|conv:${nrConvenio ?? "sem_convenio"}|linha:${lineNumber}`;

    batch.push({
      chave_unica: `${tipoEnte}:${baseKey}`,
      fonte_arquivo: fileName,
      data_carga_fonte: dataCargaFonte,
      tipo_ente: tipoEnte,
      id_proposta: idProposta,
      nr_proposta: nrProposta,
      nr_convenio: nrConvenio,
      nr_convenio_norm: normalizeConvenioCode(nrConvenio),
      uf: toNullableText(getCell("UF_PROPONENTE", cells))?.toUpperCase() ?? null,
      municipio: toNullableText(getCell("MUNIC_PROPONENTE", cells)),
      cod_ibge: toNullableDigits(getCell("COD_MUNIC_IBGE", cells)),
      cnpj,
      nome_proponente: toNullableText(getCell("NM_PROPONENTE", cells)),
      natureza_juridica: toNullableText(getCell("NATUREZA_JURIDICA", cells)),
      situacao_proposta: toNullableText(getCell("SIT_PROPOSTA", cells)),
      situacao_convenio: toNullableText(getCell("SIT_CONVENIO", cells)),
      situacao_contratacao: toNullableText(getCell("SITUACAO_CONTRATACAO", cells)),
      objeto: toNullableText(getCell("OBJETO", cells)) ?? toNullableText(getCell("CUMPRIMENTO_OBJETO", cells)),
      link_acesso_livre: toNullableText(getCell("LINK_ACESSO_LIVRE", cells)),
      ano_referencia: anoReferencia,
      dia_assin_conv: diaAssinConv,
      dia_inic_vigencia: toNullableText(getCell("DIA_INIC_VIGENC_CONV", cells)),
      dia_fim_vigencia: toNullableText(getCell("DIA_FIM_VIGENC_CONV", cells)),
      dt_aprovacao_proposta: dtAprovacaoProposta,
      dt_conclusao_prestacao_contas: toNullableText(getCell("DT_CONCLUSAO_PRESTACAO_CONTAS", cells)),
      valor_global_conv: toNullableFloat(getCell("VL_GLOBAL_CONV", cells)),
      valor_desembolsado_conv: toNullableFloat(getCell("VL_DESEMBOLSADO_CONV", cells)),
      valor_pagamentos: toNullableFloat(getCell("VL_PAGAMENTOS", cells)),
      valor_tributos: toNullableFloat(getCell("VL_TRIBUTOS", cells)),
      total_gasto: toNullableFloat(getCell("TOTAL_GASTO", cells)),
      quantidade_convenios: toNullableInt(getCell("QTDE_CONVENIOS", cells)),
      qtd_tas_convenio: toNullableInt(getCell("QTD_TAS_CONVENIO", cells)),
      qtd_dias_prorroga: toNullableInt(getCell("QTD_DIAS_PRORROGA", cells)),
      valor_contrapartida_financeira: null,
      valor_contrapartida_depositada: null,
      banco: null,
      agencia: null,
      conta: null,
      concedente_orgao_sup: null,
      concedente_orgao: null,
      atualizado_em: new Date().toISOString()
    });

    if (batch.length >= INSERT_BATCH_SIZE) {
      await flushBatch();
    }
  }

  if (batch.length > 0) {
    await insertStageBatch(batch);
    totalInserted += batch.length;
  }

  return totalInserted;
};

const processCsvDesembolsoIntoStage = async (csvText: string, fileName: string, dataCargaFonte: string, conveniosValidos: Set<string>) => {
  const lines = csvText.split(/\r?\n/);
  const headerLine = normalizeCsvHeaderLine(lines[0] ?? "");
  const headerCells = splitCsvLine(headerLine);
  const headerIndexMap = new Map(headerCells.map((column, index) => [column.trim(), index]));

  const getCell = (column: string, cells: string[]) => {
    const index = headerIndexMap.get(column);
    if (index === undefined) {
      return null;
    }
    return cells[index] ?? "";
  };

  let totalInserted = 0;
  let batch: NormalizedDesembolsoImportRow[] = [];

  const flushBatch = async () => {
    if (batch.length === 0) {
      return;
    }
    await insertDesembolsoStageBatch(batch);
    totalInserted += batch.length;
    batch = [];
  };

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (!line || line.trim() === "") {
      continue;
    }

    const cells = splitCsvLine(line);
    const nrConvenio = toNullableText(getCell("NR_CONVENIO", cells));
    const nrConvenioNorm = normalizeConvenioCode(nrConvenio);

    if (conveniosValidos.size > 0 && nrConvenioNorm && !conveniosValidos.has(nrConvenioNorm)) {
      continue;
    }

    const lineNumber = lineIndex + 1;
    const idDesembolso = toNullableInt(getCell("ID_DESEMBOLSO", cells));

    const baseKey =
      idDesembolso !== null
        ? `id:${idDesembolso}`
        : `conv:${nrConvenio ?? "sem_convenio"}|linha:${lineNumber}`;

    batch.push({
      chave_unica: `desembolso:${baseKey}`,
      fonte_arquivo: fileName,
      data_carga_fonte: dataCargaFonte,
      id_desembolso: idDesembolso,
      nr_convenio: nrConvenio,
      nr_convenio_norm: normalizeConvenioCode(nrConvenio),
      dt_ult_desembolso: toNullableText(getCell("DT_ULT_DESEMBOLSO", cells)),
      qtd_dias_sem_desembolso: toNullableInt(getCell("QTD_DIAS_SEM_DESEMBOLSO", cells)),
      data_desembolso: toNullableText(getCell("DATA_DESEMBOLSO", cells)),
      ano_desembolso: toNullableInt(getCell("ANO_DESEMBOLSO", cells)),
      mes_desembolso: toNullableInt(getCell("MES_DESEMBOLSO", cells)),
      nr_siafi: toNullableText(getCell("NR_SIAFI", cells)),
      ug_emitente_dh: toNullableText(getCell("UG_EMITENTE_DH", cells)),
      observacao_dh: toNullableText(getCell("OBSERVACAO_DH", cells)),
      vl_desembolsado: toNullableFloat(getCell("VL_DESEMBOLSADO", cells)),
      atualizado_em: new Date().toISOString()
    });

    if (batch.length >= INSERT_BATCH_SIZE) {
      await flushBatch();
    }
  }

  if (batch.length > 0) {
    await flushBatch();
  }

  return totalInserted;
};

const mapRawListItem = (item: RawListRow): TransferenciaDiscricionariaItem => ({
  id: toInt(item.id),
  nr_proposta: item.nr_proposta,
  nr_convenio: item.nr_convenio,
  uf: item.uf,
  cnpj: item.cnpj,
  nome_proponente: item.nome_proponente,
  natureza_juridica: item.natureza_juridica,
  situacao_proposta: item.situacao_proposta,
  situacao_convenio: item.situacao_convenio,
  situacao_contratacao: item.situacao_contratacao,
  objeto: item.objeto,
  ano_referencia: item.ano_referencia === null ? null : toInt(item.ano_referencia),
  dia_assin_conv: item.dia_assin_conv,
  dia_inic_vigencia: item.dia_inic_vigencia,
  dia_fim_vigencia: item.dia_fim_vigencia,
  dt_aprovacao_proposta: item.dt_aprovacao_proposta,
  dt_conclusao_prestacao_contas: item.dt_conclusao_prestacao_contas,
  valor_global_conv: toNullableNumber(item.valor_global_conv),
  valor_desembolsado_conv: toNullableNumber(item.valor_desembolsado_conv),
  valor_pagamentos: toNullableNumber(item.valor_pagamentos),
  valor_tributos: toNullableNumber(item.valor_tributos),
  total_gasto: toNullableNumber(item.total_gasto),
  quantidade_convenios: item.quantidade_convenios === null ? null : toInt(item.quantidade_convenios),
  qtd_tas_convenio: item.qtd_tas_convenio === null ? null : toInt(item.qtd_tas_convenio),
  qtd_dias_prorroga: item.qtd_dias_prorroga === null ? null : toInt(item.qtd_dias_prorroga),
  valor_contrapartida_financeira: toNullableNumber(item.valor_contrapartida_financeira),
  valor_contrapartida_depositada: toNullableNumber(item.valor_contrapartida_depositada),
  banco: item.banco,
  agencia: item.agencia,
  conta: item.conta,
  concedente: item.concedente,
  dias_para_vencimento: item.dias_para_vencimento === null ? null : toInt(item.dias_para_vencimento),
  link_acesso_livre: item.link_acesso_livre,
  fonte_arquivo: item.fonte_arquivo
});

const mapRawDesembolsoListItem = (item: RawDesembolsoListRow): TransferenciaDiscricionariaDesembolsoItem => ({
  id: toInt(item.id),
  id_desembolso: item.id_desembolso === null ? null : toInt(item.id_desembolso),
  nr_convenio: item.nr_convenio,
  data_desembolso: parseDateBrToIso(item.data_desembolso),
  dt_ult_desembolso: parseDateBrToIso(item.dt_ult_desembolso),
  ano_desembolso: item.ano_desembolso === null ? null : toInt(item.ano_desembolso),
  mes_desembolso: item.mes_desembolso === null ? null : toInt(item.mes_desembolso),
  qtd_dias_sem_desembolso: item.qtd_dias_sem_desembolso === null ? null : toInt(item.qtd_dias_sem_desembolso),
  nr_siafi: item.nr_siafi,
  ug_emitente_dh: item.ug_emitente_dh,
  observacao_dh: item.observacao_dh,
  vl_desembolsado: toNullableNumber(item.vl_desembolsado),
  fonte_arquivo: item.fonte_arquivo
});

const mapRawDesembolsoProponenteListItem = (
  item: RawDesembolsoProponenteListRow
): TransferenciaDiscricionariaDesembolsoProponenteItem => ({
  id: toInt(item.id),
  id_desembolso: item.id_desembolso === null ? null : toInt(item.id_desembolso),
  cnpj_proponente: item.cnpj_proponente,
  nome_proponente: item.nome_proponente,
  nr_convenio: item.nr_convenio,
  objeto: item.objeto,
  valor_contrapartida_financeira: toNullableNumber(item.valor_contrapartida_financeira),
  uf: item.uf,
  municipio: item.municipio,
  data_desembolso: parseDateBrToIso(item.data_desembolso),
  dt_ult_desembolso: parseDateBrToIso(item.dt_ult_desembolso),
  ano_desembolso: item.ano_desembolso === null ? null : toInt(item.ano_desembolso),
  mes_desembolso: item.mes_desembolso === null ? null : toInt(item.mes_desembolso),
  qtd_dias_sem_desembolso: item.qtd_dias_sem_desembolso === null ? null : toInt(item.qtd_dias_sem_desembolso),
  nr_siafi: item.nr_siafi,
  ug_emitente_dh: item.ug_emitente_dh,
  observacao_dh: item.observacao_dh,
  vl_desembolsado: toNullableNumber(item.vl_desembolsado),
  fonte_arquivo: item.fonte_arquivo
});

const loadDistinctTextValues = async (
  columnName: "uf" | "situacao_proposta" | "situacao_convenio",
  cnpjsPermitidos?: Set<string>
) => {
  await ensureTables();
  
  let whereClause = Prisma.sql`WHERE ${Prisma.raw(columnName)} IS NOT NULL AND TRIM(${Prisma.raw(columnName)}) <> ''`;
  
  if (cnpjsPermitidos && cnpjsPermitidos.size > 0) {
    const cnpjList = [...cnpjsPermitidos].map((c) => Prisma.sql`${c}`);
    whereClause = Prisma.sql`${whereClause} AND cnpj IN (${Prisma.join(cnpjList, ",")})`;
  }
  
  const rows = await prisma.$queryRaw<RawDistinctTextRow[]>(Prisma.sql`
    SELECT DISTINCT ${Prisma.raw(columnName)} AS value
    FROM ${Prisma.raw(TABLE_MAIN)}
    ${whereClause}
    ORDER BY ${Prisma.raw(columnName)} ASC
  `);
  return rows.map((row) => row.value?.trim()).filter((value): value is string => Boolean(value));
};

const loadDistinctConcedentes = async (cnpjsPermitidos?: Set<string>) => {
  await ensureTables();

  let whereClause = Prisma.sql`WHERE COALESCE(NULLIF(TRIM(concedente_orgao_sup), ''), NULLIF(TRIM(concedente_orgao), '')) IS NOT NULL`;

  if (cnpjsPermitidos && cnpjsPermitidos.size > 0) {
    const cnpjList = [...cnpjsPermitidos].map((c) => Prisma.sql`${c}`);
    whereClause = Prisma.sql`${whereClause} AND cnpj IN (${Prisma.join(cnpjList, ",")})`;
  }

  const rows = await prisma.$queryRaw<RawDistinctTextRow[]>(Prisma.sql`
    SELECT DISTINCT COALESCE(NULLIF(TRIM(concedente_orgao_sup), ''), NULLIF(TRIM(concedente_orgao), '')) AS value
    FROM ${Prisma.raw(TABLE_MAIN)}
    ${whereClause}
    ORDER BY 1 ASC
  `);
  return rows.map((row) => row.value?.trim()).filter((value): value is string => Boolean(value));
};

export const listarFiltrosTransferenciasDiscricionarias = async (user?: CurrentUser) => {
  // Se for usuário demo, filtrar apenas pelos CNPJs do ambiente demo
  let cnpjsDoAmbiente: Set<string> | undefined;
  if (isDemoUser(user)) {
    const convenetes = await prisma.convenete.findMany({
      where: { demoOwnerUserId: user!.id },
      select: { cnpj: true }
    });
    cnpjsDoAmbiente = new Set(convenetes.map((c) => c.cnpj.replace(/\D/g, "")).filter((cnpj) => cnpj.length > 0));
  }

  const [ufs, situacoesProposta, situacoesConvenio, concedentes] = await Promise.all([
    loadDistinctTextValues("uf", cnpjsDoAmbiente),
    loadDistinctTextValues("situacao_proposta", cnpjsDoAmbiente),
    loadDistinctTextValues("situacao_convenio", cnpjsDoAmbiente),
    loadDistinctConcedentes(cnpjsDoAmbiente)
  ]);

  return {
    ufs,
    situacoes_proposta: situacoesProposta,
    situacoes_convenio: situacoesConvenio,
    concedentes
  };
};

export const listarTransferenciasDiscricionarias = async (
  query: TransferenciaDiscricionariaQueryInput,
  user?: CurrentUser
): Promise<TransferenciaDiscricionariaListResponse> => {
  await ensureTables();

  // Se for usuário demo, filtrar apenas pelos CNPJs do ambiente demo
  let cnpjsDoAmbiente: Set<string> | undefined;
  if (isDemoUser(user)) {
    const convenetes = await prisma.convenete.findMany({
      where: { demoOwnerUserId: user!.id },
      select: { cnpj: true }
    });
    cnpjsDoAmbiente = new Set(convenetes.map((c) => c.cnpj.replace(/\D/g, "")).filter((cnpj) => cnpj.length > 0));
  }

  const conditions: Prisma.Sql[] = [];
  const vigenciaFimDateExpr = Prisma.raw(VIGENCIA_FIM_DATE_SQL);


  if (query.uf) {
    conditions.push(Prisma.sql`uf = ${query.uf}`);
  }
  if (query.ano !== undefined) {
    conditions.push(Prisma.sql`ano_referencia = ${query.ano}`);
  }
  if (query.tipo_ente) {
    conditions.push(Prisma.sql`tipo_ente = ${query.tipo_ente}`);
  }
  if (query.cnpj) {
    const cnpjDigits = query.cnpj.replace(/\D/g, "");
    conditions.push(Prisma.sql`REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ${cnpjDigits}`);
  }

  // Filtrar por CNPJs do ambiente demo
  if (cnpjsDoAmbiente && cnpjsDoAmbiente.size > 0) {
    const cnpjList = [...cnpjsDoAmbiente].map((c) => Prisma.sql`${c}`);
    conditions.push(Prisma.sql`cnpj IN (${Prisma.join(cnpjList, ",")})`);
  }

  const likeFilter = (columnName: string, value?: string) => {
    if (value) {
      const normalized = `%${escapeLikeValue(value.toLowerCase().trim().replace(/\s+/g, ' '))}%`;
      conditions.push(Prisma.sql`unaccent(LOWER(regexp_replace(${Prisma.raw(columnName)}, '\\s+', ' ', 'g'))) LIKE unaccent(${normalized}) ESCAPE '\\'`);
    }
  };

  const likeOrDigitsFilter = (columnName: string, value: string | undefined) => {
    if (!value) {
      return;
    }

    const normalized = `%${escapeLikeValue(value.toLowerCase())}%`;
    const digits = value.replace(/\D/g, "");
    if (digits.length === 0) {
      conditions.push(Prisma.sql`LOWER(${Prisma.raw(columnName)}) LIKE ${normalized} ESCAPE '\\'`);
      return;
    }

    const digitsLike = `%${digits}%`;
    const columnDigits = Prisma.sql`REPLACE(REPLACE(REPLACE(REPLACE(${Prisma.raw(columnName)}, '.', ''), '/', ''), '-', ''), ' ', '')`;
    conditions.push(
      Prisma.sql`(LOWER(${Prisma.raw(columnName)}) LIKE ${normalized} ESCAPE '\\' OR ${columnDigits} LIKE ${digitsLike})`
    );
  };

  likeFilter("nome_proponente", query.nome_proponente);
  likeFilter("COALESCE(concedente_orgao_sup, concedente_orgao)", query.concedente);
  likeFilter("municipio", query.municipio);
  likeFilter("situacao_proposta", query.situacao_proposta);
  likeFilter("situacao_convenio", query.situacao_convenio);
  likeOrDigitsFilter("nr_convenio", query.nr_convenio);
  likeOrDigitsFilter("nr_proposta", query.nr_proposta);

  if (query.vigencia_a_vencer_dias !== undefined) {
    conditions.push(Prisma.sql`${vigenciaFimDateExpr} IS NOT NULL`);
    conditions.push(Prisma.sql`${vigenciaFimDateExpr} >= CURRENT_DATE`);
    conditions.push(Prisma.sql`${vigenciaFimDateExpr} <= CURRENT_DATE + CAST(${query.vigencia_a_vencer_dias} AS INTEGER)`);
  }

  const whereClause = conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;

  const orderByClause =
    query.vigencia_a_vencer_dias !== undefined
      ? Prisma.sql`ORDER BY COALESCE(CAST((${vigenciaFimDateExpr} - CURRENT_DATE) AS INTEGER), 999999) ASC, id DESC`
      : Prisma.sql`ORDER BY COALESCE(ano_referencia, 0) DESC, id DESC`;

  const page = query.page;
  const pageSize = query.page_size;
  const offset = (page - 1) * pageSize;

  const countRows = await prisma.$queryRaw<RawCountRow[]>(
    Prisma.sql`SELECT COUNT(*) AS total FROM ${Prisma.raw(TABLE_MAIN)} ${whereClause}`
  );
  const total = toInt(countRows[0]?.total ?? 0);
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));

  const rows = await prisma.$queryRaw<RawListRow[]>(Prisma.sql`
    SELECT
      id,
      nr_proposta,
      nr_convenio,
      uf,
      cnpj,
      nome_proponente,
      natureza_juridica,
      situacao_proposta,
      situacao_convenio,
      situacao_contratacao,
      objeto,
      ano_referencia,
      dia_assin_conv,
      dia_inic_vigencia,
      dia_fim_vigencia,
      dt_aprovacao_proposta,
      dt_conclusao_prestacao_contas,
      valor_global_conv,
      valor_desembolsado_conv,
      valor_pagamentos,
      valor_tributos,
      total_gasto,
      quantidade_convenios,
      qtd_tas_convenio,
      qtd_dias_prorroga,
      valor_contrapartida_financeira,
      valor_contrapartida_depositada,
      banco,
      agencia,
      conta,
      COALESCE(NULLIF(TRIM(concedente_orgao_sup), ''), NULLIF(TRIM(concedente_orgao), '')) AS concedente,
      CAST((${vigenciaFimDateExpr} - CURRENT_DATE) AS INTEGER) AS dias_para_vencimento,
      link_acesso_livre,
      fonte_arquivo
    FROM ${Prisma.raw(TABLE_MAIN)}
    ${whereClause}
    ${orderByClause}
    LIMIT ${pageSize}
    OFFSET ${offset}
  `);

  const syncState = await readSyncState();

  return {
    itens: rows.map(mapRawListItem),
    paginacao: {
      pagina: page,
      tamanho_pagina: pageSize,
      total,
      total_paginas: totalPaginas,
      tem_proxima: page < totalPaginas,
      tem_anterior: page > 1
    },
    sincronizacao: {
      data_carga_fonte: syncState.data_carga_fonte,
      atualizado_em: syncState.atualizado_em,
      status: syncState.status,
      detalhe: syncState.detalhe,
      total_registros: syncState.total_registros,
      fase_atual: syncState.fase_atual ?? null,
      progresso_percentual: syncState.progresso_percentual ?? null,
      heartbeat_em: syncState.heartbeat_em ?? null,
      mode: syncState.mode ?? null
    }
  };
};

export const listarDesembolsosTransferenciasDiscricionarias = async (
  query: TransferenciaDiscricionariaDesembolsoQueryInput
): Promise<TransferenciaDiscricionariaDesembolsoListResponse> => {
  await ensureTables();

  const conditions: Prisma.Sql[] = [];
  const nrConvenioNorm = normalizeConvenioCode(query.nr_convenio);
  if (nrConvenioNorm) {
    conditions.push(Prisma.sql`nr_convenio_norm LIKE ${`%${nrConvenioNorm}%`}`);
  } else {
    const normalized = `%${escapeLikeValue(query.nr_convenio.toLowerCase())}%`;
    conditions.push(Prisma.sql`LOWER(nr_convenio) LIKE ${normalized} ESCAPE '\\'`);
  }

  if (query.ano !== undefined) {
    conditions.push(Prisma.sql`ano_desembolso = ${query.ano}`);
  }
  if (query.mes !== undefined) {
    conditions.push(Prisma.sql`mes_desembolso = ${query.mes}`);
  }

  const whereClause = conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;

  const page = query.page;
  const pageSize = query.page_size;
  const offset = (page - 1) * pageSize;

  const [countRows, rows, resumoRows, syncState] = await Promise.all([
    prisma.$queryRaw<RawCountRow[]>(Prisma.sql`SELECT COUNT(*) AS total FROM ${Prisma.raw(TABLE_DESEMBOLSO)} ${whereClause}`),
    prisma.$queryRaw<RawDesembolsoListRow[]>(Prisma.sql`
      SELECT
        id,
        id_desembolso,
        nr_convenio,
        dt_ult_desembolso,
        qtd_dias_sem_desembolso,
        data_desembolso,
        ano_desembolso,
        mes_desembolso,
        nr_siafi,
        ug_emitente_dh,
        observacao_dh,
        vl_desembolsado,
        fonte_arquivo
      FROM ${Prisma.raw(TABLE_DESEMBOLSO)}
      ${whereClause}
      ORDER BY COALESCE(ano_desembolso, 0) DESC, COALESCE(mes_desembolso, 0) DESC, id DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `),
    prisma.$queryRaw<Array<{ total_desembolsos: number | bigint | string; valor_total_desembolsado: number | string | null }>>(Prisma.sql`
      SELECT COUNT(*) AS total_desembolsos, COALESCE(SUM(vl_desembolsado), 0) AS valor_total_desembolsado
      FROM ${Prisma.raw(TABLE_DESEMBOLSO)}
      ${whereClause}
    `),
    readSyncState()
  ]);

  const total = toInt(countRows[0]?.total ?? 0);
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const resumo = resumoRows[0] ?? { total_desembolsos: 0, valor_total_desembolsado: 0 };

  return {
    itens: rows.map(mapRawDesembolsoListItem),
    paginacao: {
      pagina: page,
      tamanho_pagina: pageSize,
      total,
      total_paginas: totalPaginas,
      tem_proxima: page < totalPaginas,
      tem_anterior: page > 1
    },
    resumo: {
      nr_convenio: query.nr_convenio,
      total_desembolsos: toInt(resumo.total_desembolsos),
      valor_total_desembolsado: toNullableNumber(resumo.valor_total_desembolsado) ?? 0
    },
    sincronizacao: {
      data_carga_fonte: syncState.data_carga_fonte,
      atualizado_em: syncState.atualizado_em,
      status: syncState.status,
      detalhe: syncState.detalhe,
      total_registros: syncState.total_registros,
      fase_atual: syncState.fase_atual ?? null,
      progresso_percentual: syncState.progresso_percentual ?? null,
      heartbeat_em: syncState.heartbeat_em ?? null,
      mode: syncState.mode ?? null
    }
  };
};

export const listarDesembolsosPorProponenteTransferenciasDiscricionarias = async (
  query: TransferenciaDiscricionariaDesembolsoProponenteQueryInput
): Promise<TransferenciaDiscricionariaDesembolsoProponenteListResponse> => {
  await ensureTables();

  const conditions: Prisma.Sql[] = [];

  if (query.cnpj) {
    const cnpjDigits = query.cnpj.replace(/\D/g, "").trim();
    if (cnpjDigits.length > 0) {
      conditions.push(Prisma.sql`p.cnpj LIKE ${`%${cnpjDigits}%`}`);
    }
  }

  if (query.nome_proponente) {
    const nomeLike = `%${escapeLikeValue(query.nome_proponente.toLowerCase())}%`;
    conditions.push(Prisma.sql`LOWER(p.nome_proponente) LIKE ${nomeLike} ESCAPE '\\'`);
  }

  if (query.ano !== undefined) {
    conditions.push(Prisma.sql`d.ano_desembolso = ${query.ano}`);
  }

  if (query.mes !== undefined) {
    conditions.push(Prisma.sql`d.mes_desembolso = ${query.mes}`);
  }

  const whereClause = conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;

  const fromClause = Prisma.sql`
    FROM ${Prisma.raw(TABLE_DESEMBOLSO)} d
    INNER JOIN (
      SELECT
        nr_convenio_norm,
        MAX(cnpj) AS cnpj,
        MAX(nome_proponente) AS nome_proponente,
        MAX(objeto) AS objeto,
        MAX(valor_contrapartida_financeira) AS valor_contrapartida_financeira,
        MAX(uf) AS uf,
        MAX(municipio) AS municipio
      FROM ${Prisma.raw(TABLE_MAIN)}
      WHERE nr_convenio_norm IS NOT NULL AND TRIM(nr_convenio_norm) <> ''
      GROUP BY nr_convenio_norm
    ) p ON p.nr_convenio_norm = d.nr_convenio_norm
  `;

  const page = query.page;
  const pageSize = query.page_size;
  const offset = (page - 1) * pageSize;

  const [countRows, rows, resumoRows, syncState] = await Promise.all([
    prisma.$queryRaw<RawCountRow[]>(Prisma.sql`SELECT COUNT(*) AS total ${fromClause} ${whereClause}`),
    prisma.$queryRaw<RawDesembolsoProponenteListRow[]>(Prisma.sql`
      SELECT
        d.id,
        d.id_desembolso,
        p.cnpj AS cnpj_proponente,
        p.nome_proponente,
        d.nr_convenio,
        p.objeto,
        p.valor_contrapartida_financeira,
        p.uf,
        p.municipio,
        d.dt_ult_desembolso,
        d.qtd_dias_sem_desembolso,
        d.data_desembolso,
        d.ano_desembolso,
        d.mes_desembolso,
        d.nr_siafi,
        d.ug_emitente_dh,
        d.observacao_dh,
        d.vl_desembolsado,
        d.fonte_arquivo
      ${fromClause}
      ${whereClause}
      ORDER BY COALESCE(d.ano_desembolso, 0) DESC, COALESCE(d.mes_desembolso, 0) DESC, d.id DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `),
    prisma.$queryRaw<
      Array<{
        cnpj: string | null;
        nome_proponente: string | null;
        total_desembolsos: number | bigint | string;
        total_convenios: number | bigint | string;
        valor_total_desembolsado: number | string | null;
      }>
    >(Prisma.sql`
      SELECT
        MAX(p.cnpj) AS cnpj,
        MAX(p.nome_proponente) AS nome_proponente,
        COUNT(*) AS total_desembolsos,
        COUNT(DISTINCT d.nr_convenio) AS total_convenios,
        COALESCE(SUM(d.vl_desembolsado), 0) AS valor_total_desembolsado
      ${fromClause}
      ${whereClause}
    `),
    readSyncState()
  ]);

  const total = toInt(countRows[0]?.total ?? 0);
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const resumo = resumoRows[0] ?? {
    cnpj: null,
    nome_proponente: null,
    total_desembolsos: 0,
    total_convenios: 0,
    valor_total_desembolsado: 0
  };

  return {
    itens: rows.map(mapRawDesembolsoProponenteListItem),
    paginacao: {
      pagina: page,
      tamanho_pagina: pageSize,
      total,
      total_paginas: totalPaginas,
      tem_proxima: page < totalPaginas,
      tem_anterior: page > 1
    },
    resumo: {
      cnpj: resumo.cnpj,
      nome_proponente: resumo.nome_proponente,
      total_desembolsos: toInt(resumo.total_desembolsos),
      total_convenios: toInt(resumo.total_convenios),
      valor_total_desembolsado: toNullableNumber(resumo.valor_total_desembolsado) ?? 0
    },
    sincronizacao: {
      data_carga_fonte: syncState.data_carga_fonte,
      atualizado_em: syncState.atualizado_em,
      status: syncState.status,
      detalhe: syncState.detalhe,
      total_registros: syncState.total_registros,
      fase_atual: syncState.fase_atual ?? null,
      progresso_percentual: syncState.progresso_percentual ?? null,
      heartbeat_em: syncState.heartbeat_em ?? null,
      mode: syncState.mode ?? null
    }
  };
};

export const listarSugestoesProponentePorCnpj = async (cnpj: string, limit = 10, user?: CurrentUser) => {
  await ensureTables();

  // Se for usuário demo, filtrar apenas pelos CNPJs do ambiente demo
  let cnpjsDoAmbiente: Set<string> | undefined;
  if (isDemoUser(user)) {
    const convenetes = await prisma.convenete.findMany({
      where: { demoOwnerUserId: user!.id },
      select: { cnpj: true }
    });
    cnpjsDoAmbiente = new Set(convenetes.map((c) => c.cnpj.replace(/\D/g, "")).filter((cnpj) => cnpj.length > 0));
  }

  const cnpjDigits = cnpj.replace(/\D/g, "").trim();
  if (cnpjDigits.length < 4) {
    return [] as Array<{ cnpj: string; nome_proponente: string }>;
  }

  const like = `${escapeLikeValue(cnpjDigits)}%`;
  
  let whereClause = Prisma.sql`cnpj IS NOT NULL AND nome_proponente IS NOT NULL AND cnpj LIKE ${like} ESCAPE '\\'`;
  
  if (cnpjsDoAmbiente && cnpjsDoAmbiente.size > 0) {
    const cnpjList = [...cnpjsDoAmbiente].map((c) => Prisma.sql`${c}`);
    whereClause = Prisma.sql`${whereClause} AND cnpj IN (${Prisma.join(cnpjList, ",")})`;
  }
  
  const rows = await prisma.$queryRaw<RawProponenteSugestaoRow[]>(Prisma.sql`
    SELECT cnpj, nome_proponente, COUNT(*) AS total
    FROM ${Prisma.raw(TABLE_MAIN)}
    WHERE ${whereClause}
    GROUP BY cnpj, nome_proponente
    ORDER BY total DESC, cnpj ASC, nome_proponente ASC
    LIMIT ${Math.max(1, Math.min(limit, 20))}
  `);

  return rows
    .map((row) => ({
      cnpj: row.cnpj?.trim() ?? "",
      nome_proponente: row.nome_proponente?.trim() ?? ""
    }))
    .filter((row) => row.cnpj !== "" && row.nome_proponente !== "");
};

export const sincronizarTransferenciasDiscricionarias = async (
  optionsInput: boolean | SyncOptions = false,
  user?: CurrentUser
): Promise<SyncResult> => {
  const options = resolveSyncOptions(optionsInput);
  const force = options.force;
  const mode = options.mode;

  await ensureTables();

  const nowIso = new Date().toISOString();
  const previousSync = await readSyncState();

  if (previousSync.status === "running") {
    if (isSyncRunningStale(previousSync)) {
      await writeSyncState({
        data_carga_fonte: previousSync.data_carga_fonte,
        atualizado_em: nowIso,
        status: "error",
        detalhe: "Execucao anterior travada por muito tempo e foi finalizada automaticamente.",
        total_registros: previousSync.total_registros,
        fase_atual: "Execucao interrompida por inatividade",
        heartbeat_em: nowIso,
        mode: previousSync.mode ?? mode,
        cancel_requested: false
      });
    } else {
      return {
        skipped: true,
        data_carga_fonte: previousSync.data_carga_fonte ?? "",
        arquivos_processados: [],
        total_registros: previousSync.total_registros,
        status: "partial",
        detalhe: "Sincronizacao ja esta em andamento. Aguarde a conclusao ou atualize o status.",
        mode
      };
    }
  }

  const dataCargaUrl = `${normalizeBaseUrl()}/data_carga_siconv.txt`;
  const dataCargaFonte = await downloadTextWithRetry(dataCargaUrl);
  const runId = createSyncRunId();

  // Busca proponentes e verifica se algum deles não tem nenhum registro na base de transferências
  const convenetes = await prisma.convenete.findMany({
    where: isDemoUser(user) ? { demoOwnerUserId: user!.id } : user ? { demoOwnerUserId: null } : undefined,
    select: { cnpj: true }
  });
  const cnpjsValidos = new Set(
    convenetes.map((c) => c.cnpj.replace(/\D/g, "")).filter((cnpj) => cnpj.length > 0)
  );

  // Verifica se temos registros para todos os CNPJs atuais
  let temNovosProponentesSemDados = false;
  if (cnpjsValidos.size > 0) {
    const cnpjsComDados = await prisma.$queryRaw<Array<{ cnpj: string }>>`
      SELECT DISTINCT cnpj FROM transferencias_discricionarias
    `;
    const setCnpjsComDados = new Set(cnpjsComDados.map(r => r.cnpj.replace(/\D/g, "")));
    for (const cnpj of cnpjsValidos) {
      if (!setCnpjsComDados.has(cnpj)) {
        temNovosProponentesSemDados = true;
        break;
      }
    }
  }

  if (!force && !temNovosProponentesSemDados && previousSync.data_carga_fonte === dataCargaFonte && previousSync.status === "ok") {
    return {
      skipped: true,
      data_carga_fonte: dataCargaFonte,
      arquivos_processados: [],
      total_registros: previousSync.total_registros,
      status: "ok",
      detalhe: "Sem atualizacao na fonte e todos os proponentes ja estao sincronizados.",
      mode
    };
  }

  await createSyncRun(runId, dataCargaFonte, mode);
  let publishedRunId = previousSync.published_run_id ?? null;

  await writeSyncState({
    data_carga_fonte: dataCargaFonte,
    atualizado_em: nowIso,
    status: "running",
    detalhe: "Sincronizacao em andamento.",
    total_registros: previousSync.total_registros,
    fase_atual: "Preparando sincronizacao",
    progresso_percentual: 3,
    heartbeat_em: nowIso,
    mode,
    cancel_requested: false,
    run_id: runId,
    published_run_id: publishedRunId
  });

  const assertCurrentRunCanWrite = async () => {
    const state = await readSyncState();
    if (state.cancel_requested || (state.run_id === runId && ["error", "rejected"].includes(state.status))) {
      throw new SyncCancelledError();
    }
    if (state.run_id && state.run_id !== runId && state.status === "running") {
      throw new SyncCancelledError();
    }
  };

  const updateSyncProgress = async (faseAtual: string, progressoPercentual: number) => {
    await assertCurrentRunCanWrite();
    await writeSyncState({
      data_carga_fonte: dataCargaFonte,
      atualizado_em: new Date().toISOString(),
      status: "running",
      detalhe: "Sincronizacao em andamento.",
      total_registros: previousSync.total_registros,
      fase_atual: faseAtual,
      progresso_percentual: progressoPercentual,
      heartbeat_em: new Date().toISOString(),
      mode,
      cancel_requested: false,
      run_id: runId,
      published_run_id: publishedRunId
    });
  };

  const runWithSyncHeartbeat = async <T>(
    faseAtual: string,
    progressoPercentual: number,
    task: () => Promise<T>,
    heartbeatIntervalMs = 15000
  ): Promise<T> => {
    let stopped = false;

    const writeHeartbeat = async () => {
      if (stopped) {
        return;
      }
      await assertCurrentRunCanWrite();
      await writeSyncState({
        data_carga_fonte: dataCargaFonte,
        atualizado_em: new Date().toISOString(),
        status: "running",
        detalhe: "Sincronizacao em andamento.",
        total_registros: previousSync.total_registros,
        fase_atual: faseAtual,
        progresso_percentual: progressoPercentual,
        heartbeat_em: new Date().toISOString(),
        mode,
        cancel_requested: false,
        run_id: runId,
        published_run_id: publishedRunId
      });
    };

    await writeHeartbeat();
    const timer = setInterval(() => {
      void writeHeartbeat();
    }, heartbeatIntervalMs);

    try {
      return await task();
    } finally {
      stopped = true;
      clearInterval(timer);
    }
  };

  const sourceFiles = getSourceFiles();
  const warnings: string[] = [];
  const arquivosProcessados: string[] = [];

  const conveniosValidos = new Set<string>();
  const propostasValidas = new Set<string>();

  try {
    await assertSyncNotCancelled();
    await updateSyncProgress("Limpando area de preparacao", 8);
    await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_STAGE}`);
    await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_PROPOSTA_STAGE}`);
    await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_DESEMBOLSO_STAGE}`);

    let totalRegistros = 0;
    let totalRegistrosProposta = 0;
    let totalRegistrosDesembolso = 0;

    for (let index = 0; index < sourceFiles.length; index++) {
      const sourceFile = sourceFiles[index];
      await assertSyncNotCancelled();
      try {
        const csvText = await downloadCsvTextFromZipWithRetry(sourceFile);
        const inserted = await processCsvIntoStage(csvText, sourceFile, dataCargaFonte, cnpjsValidos, conveniosValidos, propostasValidas);
        if (inserted > 0) {
          arquivosProcessados.push(sourceFile);
          totalRegistros += inserted;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "erro desconhecido";
        warnings.push(`${sourceFile}: ${message}`);
      }

      const progress = 12 + Math.round(((index + 1) / Math.max(1, sourceFiles.length)) * 48);
      await updateSyncProgress(`Processando ${sourceFile}`, progress);
    }

    await updateSyncProgress("Enriquecendo contrapartida", 64);
    await assertSyncNotCancelled();
    try {
      await enriquecerContrapartidaFinanceiraNaStage(conveniosValidos);
      arquivosProcessados.push("siconv_convenio.csv.zip");
    } catch (error) {
      const message = error instanceof Error ? error.message : "erro desconhecido";
      warnings.push(`[NEW ${new Date().toISOString()}] siconv_convenio.csv.zip: ${message}`);
    }

    await updateSyncProgress("Enriquecendo ingresso da contrapartida", 68);
    await assertSyncNotCancelled();
    try {
      await enriquecerIngressoContrapartidaNaStage(conveniosValidos);
      arquivosProcessados.push(INGRESSO_CONTRAPARTIDA_FILE);
    } catch (error) {
      const message = error instanceof Error ? error.message : "erro desconhecido";
      warnings.push(`${INGRESSO_CONTRAPARTIDA_FILE}: ${message}`);
    }

    await updateSyncProgress("Enriquecendo dados de proposta", 72);
    await assertSyncNotCancelled();
    try {
      const inserted = await enriquecerDadosPropostaNaStage(propostasValidas, cnpjsValidos, dataCargaFonte);
      arquivosProcessados.push(PROPOSTA_FILE);
      totalRegistrosProposta = inserted;
    } catch (error) {
      const message = error instanceof Error ? error.message : "erro desconhecido";
      warnings.push(`${PROPOSTA_FILE}: ${message}`);
    }

    await updateSyncProgress("Importando desembolsos", 80);
    await assertSyncNotCancelled();
    try {
      const csvText = await downloadCsvTextFromZipWithRetry(DESEMBOLSO_FILE, "latin1");
      const inserted = await processCsvDesembolsoIntoStage(csvText, DESEMBOLSO_FILE, dataCargaFonte, conveniosValidos);
      if (inserted > 0) {
        arquivosProcessados.push(DESEMBOLSO_FILE);
        totalRegistrosDesembolso = inserted;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "erro desconhecido";
      warnings.push(`${DESEMBOLSO_FILE}: ${message}`);
    }

    if (totalRegistros === 0) {
      throw new Error("Nenhum arquivo foi processado com sucesso.");
    }

    const totalRegistrosGerais = totalRegistros + totalRegistrosProposta + totalRegistrosDesembolso;

    await updateSyncProgress("Aplicando base consolidada", 88);
    await assertSyncNotCancelled();
    await prisma.$executeRawUnsafe(`UPDATE ${TABLE_STAGE} SET sync_run_id = '${runId.replace(/'/g, "''")}'`);
    await prisma.$executeRawUnsafe(`UPDATE ${TABLE_DESEMBOLSO_STAGE} SET sync_run_id = '${runId.replace(/'/g, "''")}'`);
    await prisma.$executeRawUnsafe(`
      UPDATE ${TABLE_STAGE}
      SET
        objeto = COALESCE(${TABLE_STAGE}.objeto, atual.objeto),
        banco = COALESCE(${TABLE_STAGE}.banco, atual.banco),
        agencia = COALESCE(${TABLE_STAGE}.agencia, atual.agencia),
        conta = COALESCE(${TABLE_STAGE}.conta, atual.conta)
      FROM ${TABLE_MAIN} atual
      WHERE (
        ${TABLE_STAGE}.id_proposta IS NOT NULL
        AND atual.id_proposta = ${TABLE_STAGE}.id_proposta
      )
      OR (
        ${TABLE_STAGE}.nr_proposta IS NOT NULL
        AND atual.nr_proposta IS NOT NULL
        AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(atual.nr_proposta, '.', ''), '/', ''), '-', ''), ' ', ''), ',', '') =
            REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${TABLE_STAGE}.nr_proposta, '.', ''), '/', ''), '-', ''), ' ', ''), ',', '')
      )
    `);

    const validation = await validateStageBeforePublish(warnings, sourceFiles, mode);
    if (!validation.ok) {
      const detalhe = `Carga rejeitada. Base anterior preservada. Motivos: ${validation.reasons.join(" | ")}`;
      await updateSyncRun(runId, {
        status: "rejected",
        finished_at: new Date().toISOString(),
        data_carga_fonte: dataCargaFonte,
        mode,
        detail: detalhe,
        published: false,
        metrics: validation.metrics,
        arquivos_processados: arquivosProcessados,
        warnings
      });
      await writeSyncState({
        data_carga_fonte: previousSync.data_carga_fonte ?? dataCargaFonte,
        atualizado_em: new Date().toISOString(),
        status: "rejected",
        detalhe,
        total_registros: previousSync.total_registros,
        fase_atual: "Carga rejeitada - base anterior preservada",
        progresso_percentual: 100,
        heartbeat_em: new Date().toISOString(),
        mode,
        cancel_requested: false,
        run_id: runId,
        published_run_id: publishedRunId
      });
      await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_STAGE}`);
      await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_PROPOSTA_STAGE}`);
      await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_DESEMBOLSO_STAGE}`);
      return {
        skipped: false,
        data_carga_fonte: dataCargaFonte,
        arquivos_processados: arquivosProcessados,
        total_registros: previousSync.total_registros,
        status: "rejected",
        detalhe,
        mode
      };
    }

    await snapshotCurrentPublishedData(`${runId}-before-publish`, new Date().toISOString());

    await prisma.$transaction([
      prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_MAIN}`),
      prisma.$executeRawUnsafe(`
        INSERT INTO ${TABLE_MAIN} (
          chave_unica,
          fonte_arquivo,
          data_carga_fonte,
          tipo_ente,
          id_proposta,
          nr_proposta,
          nr_convenio,
          nr_convenio_norm,
          uf,
          municipio,
          cod_ibge,
          cnpj,
          nome_proponente,
          natureza_juridica,
          situacao_proposta,
          situacao_convenio,
          situacao_contratacao,
          objeto,
          link_acesso_livre,
          ano_referencia,
          dia_assin_conv,
          dia_inic_vigencia,
          dia_fim_vigencia,
          dt_aprovacao_proposta,
          dt_conclusao_prestacao_contas,
          valor_global_conv,
          valor_desembolsado_conv,
          valor_pagamentos,
          valor_tributos,
          total_gasto,
          quantidade_convenios,
          qtd_tas_convenio,
          qtd_dias_prorroga,
          valor_contrapartida_financeira,
          valor_contrapartida_depositada,
          banco,
          agencia,
          conta,
          concedente_orgao_sup,
          concedente_orgao,
          atualizado_em
        )
        SELECT
          chave_unica,
          fonte_arquivo,
          data_carga_fonte,
          tipo_ente,
          id_proposta,
          nr_proposta,
          nr_convenio,
          nr_convenio_norm,
          uf,
          municipio,
          cod_ibge,
          cnpj,
          nome_proponente,
          natureza_juridica,
          situacao_proposta,
          situacao_convenio,
          situacao_contratacao,
          objeto,
          link_acesso_livre,
          ano_referencia,
          dia_assin_conv,
          dia_inic_vigencia,
          dia_fim_vigencia,
          dt_aprovacao_proposta,
          dt_conclusao_prestacao_contas,
          valor_global_conv,
          valor_desembolsado_conv,
          valor_pagamentos,
          valor_tributos,
          total_gasto,
          quantidade_convenios,
          qtd_tas_convenio,
          qtd_dias_prorroga,
          valor_contrapartida_financeira,
          valor_contrapartida_depositada,
          banco,
          agencia,
          conta,
          concedente_orgao_sup,
          concedente_orgao,
          atualizado_em
        FROM ${TABLE_STAGE}
      `),
      prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_STAGE}`),
      prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_PROPOSTA_STAGE}`),
      prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_DESEMBOLSO}`),
      prisma.$executeRawUnsafe(`
        INSERT INTO ${TABLE_DESEMBOLSO} (
          chave_unica,
          fonte_arquivo,
          data_carga_fonte,
          id_desembolso,
          nr_convenio,
          nr_convenio_norm,
          dt_ult_desembolso,
          qtd_dias_sem_desembolso,
          data_desembolso,
          ano_desembolso,
          mes_desembolso,
          nr_siafi,
          ug_emitente_dh,
          observacao_dh,
          vl_desembolsado,
          atualizado_em
        )
        SELECT
          chave_unica,
          fonte_arquivo,
          data_carga_fonte,
          id_desembolso,
          nr_convenio,
          nr_convenio_norm,
          dt_ult_desembolso,
          qtd_dias_sem_desembolso,
          data_desembolso,
          ano_desembolso,
          mes_desembolso,
          nr_siafi,
          ug_emitente_dh,
          observacao_dh,
          vl_desembolsado,
          atualizado_em
        FROM ${TABLE_DESEMBOLSO_STAGE}
      `),
      prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_DESEMBOLSO_STAGE}`)
    ]);
    publishedRunId = runId;

    const status: "ok" | "partial" = warnings.length > 0 ? "partial" : "ok";
    const detalhe = warnings.length > 0 ? warnings.join(" | ") : null;
    await updateSyncRun(runId, {
      status,
      data_carga_fonte: dataCargaFonte,
      mode,
      detail: detalhe,
      published: true,
      metrics: validation.metrics,
      arquivos_processados: arquivosProcessados,
      warnings
    });

    await updateSyncProgress("Finalizando sincronizacao", mode === "full" ? 94 : 99);
    await writeSyncState({
      data_carga_fonte: dataCargaFonte,
      atualizado_em: new Date().toISOString(),
      status,
      detalhe,
      total_registros: totalRegistrosGerais,
      fase_atual: mode === "full" ? "Executando pos-processamento completo" : "Sincronizacao concluida",
      progresso_percentual: mode === "full" ? 95 : 100,
      heartbeat_em: new Date().toISOString(),
      mode,
      cancel_requested: false,
      run_id: runId,
      published_run_id: runId
    });

    if (mode === "full") {
      // Promocao automatica: apos sincronizar a base de consulta,
      // atualiza os instrumentos oficiais para todos os proponentes.
      await updateSyncProgress("Promovendo instrumentos oficiais", 97);
      await assertSyncNotCancelled();
      try {
        await runWithSyncHeartbeat("Promovendo instrumentos oficiais", 97, async () =>
          withTimeout(
            reimportarInstrumentosTodosProponentesAtendidos(user),
            POST_PROCESS_STEP_TIMEOUT_MS,
            "Promovendo instrumentos oficiais"
          )
        );
      } catch (promoError) {
        console.error("Erro na promocao automatica de instrumentos:", promoError);
      }

      // Sincronizacao de obras e medicoes
      await updateSyncProgress("Sincronizando obras e medicoes", 99);
      await assertSyncNotCancelled();
      try {
        await runWithSyncHeartbeat("Sincronizando obras e medicoes", 99, async () =>
          sincronizarObrasTransferegov()
        );
      } catch (obrasError) {
        console.error("Erro na sincronizacao de obras:", obrasError);
      }

      await writeSyncState({
        data_carga_fonte: dataCargaFonte,
        atualizado_em: new Date().toISOString(),
        status,
        detalhe,
        total_registros: totalRegistrosGerais,
        fase_atual: "Sincronizacao concluida",
        progresso_percentual: 100,
        heartbeat_em: new Date().toISOString(),
        mode,
        cancel_requested: false,
        run_id: runId,
        published_run_id: runId
      });
    }

    await updateSyncRun(runId, {
      status,
      finished_at: new Date().toISOString(),
      data_carga_fonte: dataCargaFonte,
      mode,
      detail: detalhe,
      published: true,
      metrics: validation.metrics,
      arquivos_processados: arquivosProcessados,
      warnings
    });

    try {
      const notifyMode = mode === "full" ? "sync_full" : "sync";
      const notifyResult = await monitorarAlteracoesFinanceirasTransferenciasDiscricionarias(notifyMode);
      // eslint-disable-next-line no-console
      console.log("[transferencias-discricionarias] monitor de alteracoes financeiras", notifyResult);
    } catch (notifyError) {
      // eslint-disable-next-line no-console
      console.error("[transferencias-discricionarias] falha ao monitorar alteracoes financeiras", notifyError);
    }

    return {
      skipped: false,
      data_carga_fonte: dataCargaFonte,
      arquivos_processados: arquivosProcessados,
      total_registros: totalRegistrosGerais,
      status,
      detalhe,
      mode
    };
  } catch (error) {
    await writeSyncState({
      data_carga_fonte: dataCargaFonte,
      atualizado_em: new Date().toISOString(),
      status: "error",
      detalhe:
        error instanceof SyncCancelledError
          ? "Sincronizacao interrompida manualmente."
          : error instanceof Error
            ? error.message
            : "Falha desconhecida na sincronizacao.",
      total_registros: previousSync.total_registros,
      fase_atual: error instanceof SyncCancelledError ? "Sincronizacao interrompida" : "Erro na sincronizacao",
      heartbeat_em: new Date().toISOString(),
      mode,
      cancel_requested: false,
      run_id: runId,
      published_run_id: publishedRunId
    });
    await updateSyncRun(runId, {
      status: "error",
      finished_at: new Date().toISOString(),
      data_carga_fonte: dataCargaFonte,
      mode,
      detail:
        error instanceof SyncCancelledError
          ? "Sincronizacao interrompida manualmente. Base anterior preservada."
          : error instanceof Error
            ? `${error.message}. Base anterior preservada.`
            : "Falha desconhecida na sincronizacao. Base anterior preservada.",
      published: false,
      arquivos_processados: arquivosProcessados,
      warnings
    });
    throw error;
  }
};

export const obterStatusSincronizacaoTransferenciasDiscricionarias = async () => {
  const state = await readSyncState();
  if (!isSyncRunningStale(state)) {
    return state;
  }

  const healedState: SyncState = {
    ...state,
    status: "error",
    detalhe: "Execucao anterior travada por muito tempo e finalizada automaticamente.",
    atualizado_em: new Date().toISOString(),
    fase_atual: "Execucao interrompida por inatividade",
    heartbeat_em: new Date().toISOString(),
    cancel_requested: false
  };
  await writeSyncState(healedState);
  return healedState;
};

export const complementarConveniosAusentesTransferenciasDiscricionarias = async (user?: CurrentUser) => {
  await ensureTables();

  const state = await readSyncState();
  if (state.status === "running" && !isSyncRunningStale(state)) {
    throw new Error("Sincronizacao em andamento. Aguarde finalizar para complementar convenios ausentes.");
  }

  const dataCargaFonte = await downloadTextWithRetry(`${normalizeBaseUrl()}/data_carga_siconv.txt`);
  const convenetes = await prisma.convenete.findMany({
    where: isDemoUser(user) ? { demoOwnerUserId: user!.id } : user ? { demoOwnerUserId: null } : undefined,
    select: { id: true, cnpj: true }
  });
  const cnpjsValidos = new Set(
    convenetes.map((item) => item.cnpj.replace(/\D/g, "")).filter((cnpj) => cnpj.length > 0)
  );

  await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_STAGE}`);
  await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_PROPOSTA_STAGE}`);

  const totalStage = await enriquecerDadosPropostaNaStage(new Set<string>(), cnpjsValidos, dataCargaFonte);
  await enriquecerIngressoContrapartidaNaStage(new Set<string>());

  await prisma.$executeRawUnsafe(`
    INSERT INTO ${TABLE_MAIN} (
      chave_unica,
      fonte_arquivo,
      data_carga_fonte,
      tipo_ente,
      id_proposta,
      nr_proposta,
      nr_convenio,
      nr_convenio_norm,
      uf,
      municipio,
      cod_ibge,
      cnpj,
      nome_proponente,
      natureza_juridica,
      situacao_proposta,
      situacao_convenio,
      situacao_contratacao,
      objeto,
      link_acesso_livre,
      ano_referencia,
      dia_assin_conv,
      dia_inic_vigencia,
      dia_fim_vigencia,
      dt_aprovacao_proposta,
      dt_conclusao_prestacao_contas,
      valor_global_conv,
      valor_desembolsado_conv,
      valor_pagamentos,
      valor_tributos,
      total_gasto,
      quantidade_convenios,
      qtd_tas_convenio,
      qtd_dias_prorroga,
      valor_contrapartida_financeira,
      valor_contrapartida_depositada,
      banco,
      agencia,
      conta,
      concedente_orgao_sup,
      concedente_orgao,
      atualizado_em
    )
    SELECT
      chave_unica,
      fonte_arquivo,
      data_carga_fonte,
      tipo_ente,
      id_proposta,
      nr_proposta,
      nr_convenio,
      nr_convenio_norm,
      uf,
      municipio,
      cod_ibge,
      cnpj,
      nome_proponente,
      natureza_juridica,
      situacao_proposta,
      situacao_convenio,
      situacao_contratacao,
      objeto,
      link_acesso_livre,
      ano_referencia,
      dia_assin_conv,
      dia_inic_vigencia,
      dia_fim_vigencia,
      dt_aprovacao_proposta,
      dt_conclusao_prestacao_contas,
      valor_global_conv,
      valor_desembolsado_conv,
      valor_pagamentos,
      valor_tributos,
      total_gasto,
      quantidade_convenios,
      qtd_tas_convenio,
      qtd_dias_prorroga,
      valor_contrapartida_financeira,
      valor_contrapartida_depositada,
      banco,
      agencia,
      conta,
      concedente_orgao_sup,
      concedente_orgao,
      atualizado_em
    FROM ${TABLE_STAGE}
    ON CONFLICT (chave_unica) DO UPDATE SET
      fonte_arquivo = EXCLUDED.fonte_arquivo,
      data_carga_fonte = EXCLUDED.data_carga_fonte,
      tipo_ente = EXCLUDED.tipo_ente,
      id_proposta = EXCLUDED.id_proposta,
      nr_proposta = EXCLUDED.nr_proposta,
      nr_convenio = EXCLUDED.nr_convenio,
      nr_convenio_norm = EXCLUDED.nr_convenio_norm,
      uf = EXCLUDED.uf,
      municipio = EXCLUDED.municipio,
      cod_ibge = EXCLUDED.cod_ibge,
      cnpj = EXCLUDED.cnpj,
      nome_proponente = EXCLUDED.nome_proponente,
      natureza_juridica = EXCLUDED.natureza_juridica,
      situacao_proposta = EXCLUDED.situacao_proposta,
      situacao_convenio = EXCLUDED.situacao_convenio,
      situacao_contratacao = EXCLUDED.situacao_contratacao,
      objeto = EXCLUDED.objeto,
      link_acesso_livre = EXCLUDED.link_acesso_livre,
      ano_referencia = EXCLUDED.ano_referencia,
      dia_assin_conv = EXCLUDED.dia_assin_conv,
      dia_inic_vigencia = EXCLUDED.dia_inic_vigencia,
      dia_fim_vigencia = EXCLUDED.dia_fim_vigencia,
      dt_aprovacao_proposta = EXCLUDED.dt_aprovacao_proposta,
      dt_conclusao_prestacao_contas = EXCLUDED.dt_conclusao_prestacao_contas,
      valor_global_conv = EXCLUDED.valor_global_conv,
      valor_desembolsado_conv = EXCLUDED.valor_desembolsado_conv,
      valor_pagamentos = EXCLUDED.valor_pagamentos,
      valor_tributos = EXCLUDED.valor_tributos,
      total_gasto = EXCLUDED.total_gasto,
      quantidade_convenios = EXCLUDED.quantidade_convenios,
      qtd_tas_convenio = EXCLUDED.qtd_tas_convenio,
      qtd_dias_prorroga = EXCLUDED.qtd_dias_prorroga,
      valor_contrapartida_financeira = EXCLUDED.valor_contrapartida_financeira,
      valor_contrapartida_depositada = EXCLUDED.valor_contrapartida_depositada,
      banco = EXCLUDED.banco,
      agencia = EXCLUDED.agencia,
      conta = EXCLUDED.conta,
      concedente_orgao_sup = EXCLUDED.concedente_orgao_sup,
      concedente_orgao = EXCLUDED.concedente_orgao,
      atualizado_em = EXCLUDED.atualizado_em
  `);

  await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_STAGE}`);
  await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_PROPOSTA_STAGE}`);

  const importacao = await reimportarInstrumentosTodosProponentesAtendidos(user);

  return {
    data_carga_fonte: dataCargaFonte,
    cnpjs_monitorados: cnpjsValidos.size,
    registros_processados_stage: totalStage,
    importacao
  };
};

export const cancelarSincronizacaoTransferenciasDiscricionarias = async () => {
  const state = await readSyncState();
  if (state.status !== "running") {
    return {
      cancelled: false,
      message: "Nao ha sincronizacao em andamento para interromper.",
      state
    };
  }

  const updated: SyncState = {
    ...state,
    detalhe: "Solicitacao de interrupcao recebida. Encerrando sincronizacao...",
    fase_atual: "Interrupcao solicitada",
    atualizado_em: new Date().toISOString(),
    heartbeat_em: new Date().toISOString(),
    cancel_requested: true
  };
  await writeSyncState(updated);

  return {
    cancelled: true,
    message: "Interrupcao solicitada com sucesso.",
    state: updated
  };
};
