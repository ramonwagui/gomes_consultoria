import { request as httpsRequest } from "https";
import { URLSearchParams } from "url";
import * as cheerio from "cheerio";

import { env } from "../../config/env";
import { SimecTermosListQueryInput, SimecTermosMunicipiosQueryInput } from "./simec-termos.schema";

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

type SimecTermoModo = "PAR3" | "PAR4";
type SimecEnteTipo = "ESTADUAL" | "MUNICIPAL" | null;

type SimecTermoItem = {
  codigo: string | null;
  iniciativa: string | null;
  etapa: string | null;
  total: number | null;
};

type SimecTermoEmpenho = {
  iniciativa: string | null;
  numero: string | null;
  valor: number | null;
};

type SimecTermoDetalhe = {
  dotid: number;
  modo: SimecTermoModo;
  termo_numero: string;
  exercicio: number | null;
  processo: string | null;
  ente_tipo: SimecEnteTipo;
  secretaria_nome: string | null;
  municipio_nome: string | null;
  uf: string | null;
  cnpj: string | null;
  endereco: string | null;
  secretario_nome: string | null;
  secretario_cpf: string | null;
  total_geral: number | null;
  mes_inicial: string | null;
  mes_final: string | null;
  data_assinatura: string | null;
  detalhe_url: string;
  campos: Record<string, string>;
  itens: SimecTermoItem[];
  empenhos: SimecTermoEmpenho[];
};

const cache = new Map<string, CacheEntry>();

const timeoutMs = Number.isFinite(env.simecTermosTimeoutMs) ? Math.max(2000, env.simecTermosTimeoutMs) : 20000;
const cacheTtlMs = Number.isFinite(env.simecTermosCacheTtlMs) ? Math.max(0, env.simecTermosCacheTtlMs) : 600000;
const recentStartDotid = 50000;
const maxRecentScanAttempts = 4000;
const antiBotPauseMs = 4000;
const max302Retries = 2;
const redirectBlockErrorCode = "SIMEC_REDIRECT_BLOCK";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getBaseUrl = () => {
  const base = env.simecTermosBaseUrl.trim();
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

const repairMojibakeUtf8 = (value: string) => {
  if (!/[ÃÂ�\u0080-\u009F]/.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(Array.from(value).map((char) => char.charCodeAt(0) & 0xff));
    const repaired = new TextDecoder("utf-8").decode(bytes);
    return repaired.includes("\uFFFD") ? value : repaired;
  } catch {
    return value;
  }
};

const decodeHtml = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&ndash;/gi, "-")
    .replace(/&mdash;/gi, "-")
    .replace(/&ccedil;/gi, "ç")
    .replace(/&Ccedil;/gi, "Ç")
    .replace(/&atilde;/gi, "ã")
    .replace(/&Atilde;/gi, "Ã")
    .replace(/&otilde;/gi, "õ")
    .replace(/&Otilde;/gi, "Õ")
    .replace(/&aacute;/gi, "á")
    .replace(/&Aacute;/gi, "Á")
    .replace(/&eacute;/gi, "é")
    .replace(/&Eacute;/gi, "É")
    .replace(/&iacute;/gi, "í")
    .replace(/&Iacute;/gi, "Í")
    .replace(/&oacute;/gi, "ó")
    .replace(/&Oacute;/gi, "Ó")
    .replace(/&uacute;/gi, "ú")
    .replace(/&Uacute;/gi, "Ú")
    .replace(/&ecirc;/gi, "ê")
    .replace(/&Ecirc;/gi, "Ê")
    .replace(/&ocirc;/gi, "ô")
    .replace(/&Ocirc;/gi, "Ô")
    .replace(/&agrave;/gi, "à")
    .replace(/&Agrave;/gi, "À")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

const normalizeText = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const repaired = repairMojibakeUtf8(decodeHtml(value))
    .replace(/Ã§/g, "ç")
    .replace(/Ã‡/g, "Ç")
    .replace(/Ã£/g, "ã")
    .replace(/Ãƒ/g, "Ã")
    .replace(/Ãµ/g, "õ")
    .replace(/Ã•/g, "Õ")
    .replace(/Ã¡/g, "á")
    .replace(/Ã/g, "Á")
    .replace(/Ã©/g, "é")
    .replace(/Ã‰/g, "É")
    .replace(/Ã­/g, "í")
    .replace(/Ã/g, "Í")
    .replace(/Ã³/g, "ó")
    .replace(/Ã“/g, "Ó")
    .replace(/Ãº/g, "ú")
    .replace(/Ãš/g, "Ú")
    .replace(/Ãª/g, "ê")
    .replace(/ÃŠ/g, "Ê")
    .replace(/Ã´/g, "ô")
    .replace(/Ã”/g, "Ô")
    .replace(/Ã /g, "à")
    .replace(/Ã€/g, "À");
  return repaired.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null;
};

const normalizeSearchKey = (value: string | null | undefined) =>
  (normalizeText(value) ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const parseCurrencyPtBr = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseOptions = (html: string) =>
  [...html.matchAll(/<option\s+value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/gi)]
    .map((match) => ({
      value: decodeHtml(match[1]).trim(),
      label: normalizeText(match[2]) ?? ""
    }))
    .filter((item) => item.value !== "");

const parseSelectOptions = (html: string, selectName: string) => {
  const regex = new RegExp(`<select[^>]+name="${selectName}"[\\s\\S]*?<\\/select>`, "i");
  const match = html.match(regex);
  return parseOptions(match?.[0] ?? "");
};

const readLatin1 = async (method: "GET" | "POST", path = "", body?: string, attempt = 0): Promise<string> => {
  const base = getBaseUrl();
  const url = path
    ? /^https?:\/\//i.test(path)
      ? new URL(path)
      : new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`)
    : new URL(base);
  const cacheKey = `${method}:${url.toString()}:${body ?? ""}`;

  if (cacheTtlMs > 0) {
    const hit = cache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.value as string;
    }
  }

  const html = await new Promise<string>((resolve, reject) => {
    const req = httpsRequest(
      url,
      {
        method,
        rejectUnauthorized: !env.simecTermosInsecureTls,
        timeout: timeoutMs,
        headers: {
          "User-Agent": "gestconv360/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          ...(method === "POST"
            ? {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(body ?? "", "utf8")
              }
            : {})
        }
      },
      (res) => {
        if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode)) {
          const location = String(res.headers.location ?? "").trim();
          res.resume();

          if (location && /login\.php/i.test(location) && attempt < max302Retries) {
            void sleep(antiBotPauseMs)
              .then(() => readLatin1(method, path, body, attempt + 1))
              .then(resolve)
              .catch(reject);
            return;
          }

          if (location && attempt < max302Retries) {
            const redirectedPath = new URL(location, url).toString();
            void readLatin1("GET", redirectedPath, undefined, attempt + 1)
              .then(resolve)
              .catch(reject);
            return;
          }

          reject(new Error(redirectBlockErrorCode));
          return;
        }

        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Falha ao acessar SIMEC Termos (${res.statusCode ?? 0})`));
          res.resume();
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("latin1")));
      }
    );

    req.on("timeout", () => req.destroy(new Error("Tempo limite ao consultar SIMEC Termos.")));
    req.on("error", reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });

  if (cacheTtlMs > 0) {
    cache.set(cacheKey, {
      value: html,
      expiresAt: Date.now() + cacheTtlMs
    });
  }

  return html;
};

const postForm = (payload: Record<string, string>) => {
  const params = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => params.set(key, value));
  return readLatin1("POST", "", params.toString());
};

const getPage = () => readLatin1("GET");

const detectEnteTipo = (fields: Record<string, string>): SimecEnteTipo => {
  const keys = Object.keys(fields).map((key) => normalizeSearchKey(key));
  if (keys.some((key) => key.includes("estado") || key.includes("secretaria de educacao"))) {
    return "ESTADUAL";
  }
  if (keys.some((key) => key.includes("municipio") || key.includes("prefeitura"))) {
    return "MUNICIPAL";
  }
  return null;
};

const pickField = (fields: Record<string, string>, predicate: (normalizedKey: string) => boolean) => {
  for (const [key, value] of Object.entries(fields)) {
    if (predicate(normalizeSearchKey(key))) {
      return value;
    }
  }
  return null;
};

const parseDateExtensoToIso = (value: string | null) => {
  if (!value) {
    return null;
  }

  const months: Record<string, number> = {
    janeiro: 1,
    fevereiro: 2,
    marco: 3,
    março: 3,
    abril: 4,
    maio: 5,
    junho: 6,
    julho: 7,
    agosto: 8,
    setembro: 9,
    outubro: 10,
    novembro: 11,
    dezembro: 12
  };

  const normalized = normalizeSearchKey(value);
  const match = normalized.match(/(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})/i);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = months[match[2]];
  const year = Number(match[3]);
  if (!month || !Number.isFinite(day) || !Number.isFinite(year)) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const extractIndexedFields = (html: string) => {
  const fields: Record<string, string> = {};
  const $ = cheerio.load(html, { decodeEntities: false });

  $("td").each((_index, cell) => {
    const heading = $(cell).find("b, strong").first();
    const key = normalizeText(heading.text());
    if (!key || !/^\d+\s*-\s*/.test(key)) {
      return;
    }

    const innerHtml = $(cell).html() ?? "";
    const valueFromBreak = innerHtml.split(/<br\s*\/?>/i).slice(1).join(" ");
    const value = normalizeText(valueFromBreak) ?? normalizeText($(cell).text().replace(heading.text(), ""));
    if (value) {
      fields[key] = value;
    }
  });

  return fields;
};

const extractSection = (html: string, startMarker: string, endMarker: string) => {
  const startIndex = html.indexOf(startMarker);
  if (startIndex < 0) {
    return "";
  }

  const endIndex = html.indexOf(endMarker, startIndex);
  return endIndex >= 0 ? html.slice(startIndex, endIndex) : html.slice(startIndex);
};

const parseItens = (html: string): SimecTermoItem[] => {
  const section = extractSection(html, "<B>ITENS</B>", "<B>EMPENHOS</B>");
  if (!section) {
    return [];
  }

  const items: SimecTermoItem[] = [];
  const rowRegex =
    /<TR>\s*<TD>([\s\S]*?)<\/TD>\s*<TD>([\s\S]*?)<\/TD>\s*<TD>([\s\S]*?)<\/TD>\s*<TD[^>]*>([\s\S]*?)<\/TD>\s*<\/TR>/gi;

  for (const match of section.matchAll(rowRegex)) {
    const codigo = normalizeText(match[1]);
    const iniciativa = normalizeText(match[2]);
    const etapa = normalizeText(match[3]);
    const totalRaw = normalizeText(match[4]);
    if (!codigo || normalizeSearchKey(codigo).includes("codigo") || normalizeSearchKey(codigo).includes("total geral")) {
      continue;
    }
    items.push({
      codigo,
      iniciativa,
      etapa,
      total: parseCurrencyPtBr(totalRaw)
    });
  }

  return items;
};

const parseEmpenhos = (html: string): SimecTermoEmpenho[] => {
  const section = extractSection(html, "<B>EMPENHOS</B>", "<B>11");
  if (!section) {
    return [];
  }

  const items: SimecTermoEmpenho[] = [];
  const rowRegex = /<TR[\s\S]*?>\s*<TD[^>]*>([\s\S]*?)<\/TD>\s*<TD[^>]*>([\s\S]*?)<\/TD>\s*<TD[^>]*>([\s\S]*?)<\/TD>\s*<\/TR>/gi;

  for (const match of section.matchAll(rowRegex)) {
    const iniciativa = normalizeText(match[1]);
    const numero = normalizeText(match[2]);
    const valorRaw = normalizeText(match[3]);
    const iniciativaKey = normalizeSearchKey(iniciativa);
    if (!iniciativa || iniciativaKey.includes("iniciativa") || iniciativaKey.includes("total empenho")) {
      continue;
    }
    items.push({
      iniciativa,
      numero,
      valor: parseCurrencyPtBr(valorRaw)
    });
  }

  return items;
};

const parseTermHtml = (dotid: number, modo: SimecTermoModo, html: string): SimecTermoDetalhe | null => {
  const fullText = normalizeText(cheerio.load(html, { decodeEntities: false }).root().text()) ?? "";
  const termoMatch = fullText.match(/TERMO DE COMPROMISSO(?:\s+[A-ZÀ-ÚÇÃÕ\- ]+)?\s+N[ºO°]?\s*([0-9-]+)/i);
  if (!termoMatch) {
    return null;
  }

  const termoNumero = termoMatch[1].trim();
  const fields = extractIndexedFields(html);
  const totalGeral = parseCurrencyPtBr(normalizeText(html.match(/TOTAL GERAL<\/B><\/TD>\s*<TD[^>]*><B>([\s\S]*?)<\/B>/i)?.[1] ?? ""));
  const mesInicial = normalizeText(html.match(/M[^<]{0,5}S INICIAL:<\/B><BR>([\s\S]*?)<\/TD>/i)?.[1] ?? "");
  const mesFinal = normalizeText(html.match(/M[^<]{0,5}S FINAL:<\/B><BR>([\s\S]*?)<\/TD>/i)?.[1] ?? "");
  const assinaturaTexto = normalizeText(html.match(/Bras[íi]lia\/DF,\s*([\s\S]*?)\./i)?.[1] ?? "");
  const dataAssinatura = parseDateExtensoToIso(assinaturaTexto);
  const exercicioField = pickField(fields, (key) => key.includes("exercicio"));
  const exercicio = exercicioField ? Number(exercicioField.replace(/[^\d]/g, "")) || null : null;
  const enteTipo = detectEnteTipo(fields);
  const secretariaNome =
    pickField(fields, (key) => key.includes("nome da secretaria de educacao")) ??
    pickField(fields, (key) => key.includes("nome da prefeitura")) ??
    pickField(fields, (key) => key.includes("nome do estado"));
  const municipioNome =
    pickField(fields, (key) => key.includes("nome do municipio")) ??
    pickField(fields, (key) => key.endsWith("municipio"));
  const uf = pickField(fields, (key) => key.endsWith("uf"));
  const processo = pickField(fields, (key) => key.includes("processo"));
  const cnpj = pickField(fields, (key) => key.includes("cnpj"));
  const endereco = pickField(fields, (key) => key.includes("endereco"));
  const secretarioNome = pickField(fields, (key) => key.endsWith("nome"));
  const secretarioCpf = pickField(fields, (key) => key.includes("cpf"));
  const itens = parseItens(html);
  const empenhos = parseEmpenhos(html);

  return {
    dotid,
    modo,
    termo_numero: termoNumero,
    exercicio: Number.isFinite(exercicio) ? exercicio : null,
    processo,
    ente_tipo: enteTipo,
    secretaria_nome: secretariaNome,
    municipio_nome: municipioNome,
    uf,
    cnpj,
    endereco,
    secretario_nome: secretarioNome,
    secretario_cpf: secretarioCpf,
    total_geral: totalGeral,
    mes_inicial: mesInicial,
    mes_final: mesFinal,
    data_assinatura: dataAssinatura,
    detalhe_url: getBaseUrl(),
    campos: fields,
    itens,
    empenhos
  };
};

const fetchTermoByDotid = async (dotid: number) => {
  const attempts: Array<{ requisicao: string; modo: SimecTermoModo }> = [
    { requisicao: "visualizarTermoPar3", modo: "PAR3" },
    { requisicao: "visualizarTermoPar4", modo: "PAR4" }
  ];

  for (const attempt of attempts) {
    const html = await postForm({
      requisicao: attempt.requisicao,
      dotid: String(dotid)
    });
    const parsed = parseTermHtml(dotid, attempt.modo, html);
    if (parsed) {
      return parsed;
    }
  }

  return null;
};

const matchesQuery = (item: SimecTermoDetalhe, query: SimecTermosListQueryInput) => {
  if (query.ano && item.exercicio !== query.ano) {
    return false;
  }

  if (query.secretaria) {
    const expected = query.secretaria === "E" ? "ESTADUAL" : "MUNICIPAL";
    if (item.ente_tipo !== expected) {
      return false;
    }
  }

  if (query.uf && normalizeSearchKey(item.uf) !== normalizeSearchKey(query.uf)) {
    return false;
  }

  if (query.q) {
    const haystack = normalizeSearchKey(
      [
        item.termo_numero,
        item.processo,
        item.secretaria_nome,
        item.municipio_nome,
        item.cnpj,
        item.secretario_nome
      ]
        .filter(Boolean)
        .join(" ")
    );
    if (!haystack.includes(normalizeSearchKey(query.q))) {
      return false;
    }
  }

  return true;
};

export const listarUfsSimecTermos = async () => {
  const html = await getPage();
  return parseSelectOptions(html, "estuf").map((item) => ({
    uf: item.value,
    sigla: item.value,
    nome: item.label
  }));
};

export const listarTiposObjetoSimecTermos = async () => {
  const html = await getPage();
  return parseSelectOptions(html, "intoid").map((item) => ({
    codigo: item.value,
    descricao: item.label
  }));
};

export const listarMunicipiosSimecTermos = async (query: SimecTermosMunicipiosQueryInput) => {
  const html = await postForm({
    requisicao: "carregarmunicipio",
    estuf: query.uf
  });

  return parseOptions(html).map((item) => ({
    codigo: item.value,
    uf: query.uf,
    nome: item.label
  }));
};

export const listarTermosSimec = async (query: SimecTermosListQueryInput) => {
  const hasExplicitRange = query.dotid_inicio !== undefined || query.dotid_fim !== undefined;

  if (!hasExplicitRange) {
    const startCursor = query.cursor ?? recentStartDotid;
    const itens: Array<Omit<SimecTermoDetalhe, "campos" | "itens" | "empenhos"> & { itens_quantidade: number; empenhos_quantidade: number }> = [];
    let scanned = 0;
    let current = startCursor;

    while (current > 0 && itens.length < query.limite && scanned < maxRecentScanAttempts) {
      let termo = null;
      try {
        termo = await fetchTermoByDotid(current);
      } catch (error) {
        if (error instanceof Error && error.message.includes(redirectBlockErrorCode)) {
          break;
        }
        throw error;
      }
      scanned += 1;
      if (termo && matchesQuery(termo, query)) {
        itens.push({
          dotid: termo.dotid,
          modo: termo.modo,
          termo_numero: termo.termo_numero,
          exercicio: termo.exercicio,
          processo: termo.processo,
          ente_tipo: termo.ente_tipo,
          secretaria_nome: termo.secretaria_nome,
          municipio_nome: termo.municipio_nome,
          uf: termo.uf,
          cnpj: termo.cnpj,
          endereco: termo.endereco,
          secretario_nome: termo.secretario_nome,
          secretario_cpf: termo.secretario_cpf,
          total_geral: termo.total_geral,
          mes_inicial: termo.mes_inicial,
          mes_final: termo.mes_final,
          data_assinatura: termo.data_assinatura,
          detalhe_url: termo.detalhe_url,
          itens_quantidade: termo.itens.length,
          empenhos_quantidade: termo.empenhos.length
        });
      }
      current -= 1;
    }

    return {
      filtros: {
        dotid_inicio: null,
        dotid_fim: null,
        cursor: startCursor,
        limite: query.limite,
        ano: query.ano ?? null,
        secretaria: query.secretaria ?? null,
        uf: query.uf ?? null,
        q: query.q ?? null
      },
      resumo: {
        dotids_consultados: scanned,
        termos_encontrados: itens.length,
        modo: "recentes" as const,
        proximo_cursor: current > 0 ? current : null
      },
      itens
    };
  }

  const inicioBase = query.dotid_inicio ?? 1;
  const fimBase = query.dotid_fim ?? inicioBase + query.limite - 1;
  const inicio = Math.min(inicioBase, fimBase);
  const fim = Math.max(inicioBase, fimBase);
  const itens: Array<Omit<SimecTermoDetalhe, "campos" | "itens" | "empenhos"> & { itens_quantidade: number; empenhos_quantidade: number }> = [];

  for (let dotid = inicio; dotid <= fim; dotid += 1) {
    let termo = null;
    try {
      termo = await fetchTermoByDotid(dotid);
    } catch (error) {
      if (error instanceof Error && error.message.includes(redirectBlockErrorCode)) {
        break;
      }
      throw error;
    }
    if (!termo || !matchesQuery(termo, query)) {
      continue;
    }

    itens.push({
      dotid: termo.dotid,
      modo: termo.modo,
      termo_numero: termo.termo_numero,
      exercicio: termo.exercicio,
      processo: termo.processo,
      ente_tipo: termo.ente_tipo,
      secretaria_nome: termo.secretaria_nome,
      municipio_nome: termo.municipio_nome,
      uf: termo.uf,
      cnpj: termo.cnpj,
      endereco: termo.endereco,
      secretario_nome: termo.secretario_nome,
      secretario_cpf: termo.secretario_cpf,
      total_geral: termo.total_geral,
      mes_inicial: termo.mes_inicial,
      mes_final: termo.mes_final,
      data_assinatura: termo.data_assinatura,
      detalhe_url: termo.detalhe_url,
      itens_quantidade: termo.itens.length,
      empenhos_quantidade: termo.empenhos.length
    });
  }

    return {
      filtros: {
        dotid_inicio: inicio,
        dotid_fim: fim,
        cursor: null,
        secretaria: query.secretaria ?? null,
        uf: query.uf ?? null,
        q: query.q ?? null,
        ano: query.ano ?? null,
        limite: fim - inicio + 1
      },
      resumo: {
        dotids_consultados: fim - inicio + 1,
        termos_encontrados: itens.length,
        modo: "faixa" as const,
        proximo_cursor: null
      },
      itens
    };
};

export const obterTermoSimec = async (dotid: number) => {
  const termo = await fetchTermoByDotid(dotid);
  if (!termo) {
    throw new Error("Termo SIMEC nao encontrado para o dotid informado.");
  }
  return termo;
};
