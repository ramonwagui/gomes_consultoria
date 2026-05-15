import { request as httpsRequest } from "https";
import { URL } from "url";

import { env } from "../../config/env";
import { SimecMunicipiosQueryInput, SimecObrasQueryInput } from "./simec-obras.schema";

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

type SimecObraResumo = {
  obra_id: number;
  titulo: string;
  situacao: string | null;
  localizacao: string | null;
  esfera: string | null;
  tipo: string | null;
  vigencia_fim: string | null;
  valor_previsto: number | null;
  valor_pago_fnde: number | null;
  percentual_execucao: number | null;
  detalhe_url: string;
};

const cache = new Map<string, CacheEntry>();

const getBaseUrl = () => {
  const base = env.simecObrasBaseUrl.trim();
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

const timeoutMs = Number.isFinite(env.simecObrasTimeoutMs) ? Math.max(2000, env.simecObrasTimeoutMs) : 20000;
const cacheTtlMs = Number.isFinite(env.simecObrasCacheTtlMs) ? Math.max(0, env.simecObrasCacheTtlMs) : 600000;

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

const normalizeText = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }
  const repaired = repairMojibakeUtf8(value);
  return repaired.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null;
};

const decodeHtml = (value: string) => {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
};

const parseCurrencyPtBr = (value: string | null) => {
  if (!value) {
    return null;
  }
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parsePercentual = (value: string | null) => {
  if (!value) {
    return null;
  }
  const match = value.replace(/\./g, "").replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
};

const normalizeSearchKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const parseDateToIso = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const ptBr = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  const iso = value.match(/(\d{4})-(\d{2})-(\d{2})/);

  let day = 0;
  let month = 0;
  let year = 0;

  if (ptBr) {
    day = Number(ptBr[1]);
    month = Number(ptBr[2]);
    year = Number(ptBr[3]);
  } else if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else {
    return null;
  }

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const extractVigenciaFim = (card: string, fields: Record<string, string>) => {
  for (const [rawKey, rawValue] of Object.entries(fields)) {
    const key = normalizeSearchKey(rawKey);
    if (!key.includes("vigencia")) {
      continue;
    }
    if (!(key.includes("fim") || key.includes("final") || key.includes("termino") || key.includes("vencimento"))) {
      continue;
    }

    const parsed = parseDateToIso(rawValue);
    if (parsed) {
      return parsed;
    }
  }

  const cardText = normalizeSearchKey(decodeHtml(card).replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
  const rangeMatch = cardText.match(
    /vigencia[\s\S]{0,140}?(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})[\s\S]{0,20}?(?:a|ate|-)\s*(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/
  );
  if (rangeMatch) {
    const end = parseDateToIso(rangeMatch[2]);
    if (end) {
      return end;
    }
  }

  const keywordMatch = cardText.match(
    /(fim\s+da\s+vigencia|vigencia\s+final|termino\s+da\s+vigencia|vencimento)[\s:\-]{0,15}(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/
  );
  if (keywordMatch) {
    const parsed = parseDateToIso(keywordMatch[2]);
    if (parsed) {
      return parsed;
    }
  }

  const nearKeywordChunks = [...cardText.matchAll(/vigencia[\s\S]{0,260}/g)].map((match) => match[0]);
  for (const chunk of nearKeywordChunks) {
    const dateMatches = [...chunk.matchAll(/(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/g)].map((match) => match[1]);
    if (dateMatches.length > 0) {
      const parsed = parseDateToIso(dateMatches[dateMatches.length - 1]);
      if (parsed) {
        return parsed;
      }
    }
  }

  const fallback = parseDateToIso(card.match(/vig[êe]ncia[\s\S]{0,160}?(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/i)?.[1]);
  return fallback;
};

const extractVigenciaFimFromText = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const rangeMatch = value.match(
    /(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})[\s\S]{0,20}?(?:a|ate|-)\s*(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/i
  );
  if (rangeMatch) {
    const end = parseDateToIso(rangeMatch[2]);
    if (end) {
      return end;
    }
  }

  return parseDateToIso(value);
};

const extractVigenciaFimFromDetalhes = (detalhes: Record<string, string>) => {
  const rankedCandidates: Array<{ rank: number; value: string }> = [];

  for (const [rawKey, rawValue] of Object.entries(detalhes)) {
    const key = normalizeSearchKey(rawKey);
    const value = rawValue ?? "";

    const mentionsVigencia = key.includes("vigencia");
    const mentionsEnd =
      key.includes("fim") ||
      key.includes("final") ||
      key.includes("termino") ||
      key.includes("encerramento") ||
      key.includes("vencimento");

    if (mentionsVigencia && mentionsEnd) {
      rankedCandidates.push({ rank: 1, value });
      continue;
    }

    if (mentionsVigencia) {
      rankedCandidates.push({ rank: 2, value });
      continue;
    }

    if (mentionsEnd) {
      rankedCandidates.push({ rank: 3, value });
    }
  }

  rankedCandidates.sort((a, b) => a.rank - b.rank);
  for (const candidate of rankedCandidates) {
    const parsed = extractVigenciaFimFromText(candidate.value);
    if (parsed) {
      return parsed;
    }
  }

  return null;
};

const readHttpsLatin1 = async (url: string) => {
  return new Promise<string>((resolve, reject) => {
    const req = httpsRequest(
      url,
      {
        method: "GET",
        rejectUnauthorized: !env.simecObrasInsecureTls,
        timeout: timeoutMs,
        headers: {
          "User-Agent": "gestconv360/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      },
      (res) => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Falha ao acessar SIMEC (${res.statusCode ?? 0})`));
          res.resume();
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("latin1");
          resolve(body);
        });
      }
    );

    req.on("timeout", () => req.destroy(new Error("Tempo limite ao consultar SIMEC.")));
    req.on("error", reject);
    req.end();
  });
};

const fetchCachedHtml = async (path: string, params?: Record<string, string | undefined>) => {
  const url = new URL(`${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (!value) {
        continue;
      }
      url.searchParams.set(key, value);
    }
  }

  const cacheKey = url.toString();
  if (cacheTtlMs > 0) {
    const hit = cache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.value as string;
    }
  }

  const html = await readHttpsLatin1(cacheKey);
  if (cacheTtlMs > 0) {
    cache.set(cacheKey, {
      value: html,
      expiresAt: Date.now() + cacheTtlMs
    });
  }
  return html;
};

const parseOptions = (html: string) => {
  return [...html.matchAll(/<option\s+value="([^"]*)"[^>]*>([^<]*)<\/option>/gi)]
    .map((match) => ({
      value: decodeHtml(match[1]).trim(),
      label: normalizeText(decodeHtml(match[2])) ?? ""
    }))
    .filter((item) => item.value !== "");
};

const parseStrongLabelPairs = (htmlChunk: string) => {
  const map: Record<string, string> = {};
  const pairs = [...htmlChunk.matchAll(/<p>\s*<strong>\s*([\s\S]*?):\s*<\/strong>([\s\S]*?)<\/p>/gi)];
  for (const pair of pairs) {
    const key = normalizeText(decodeHtml(pair[1]))?.toLowerCase() ?? "";
    const value = normalizeText(decodeHtml(pair[2])) ?? "";
    if (key) {
      map[key] = value;
    }
  }
  return map;
};

const parseObraCards = (html: string): SimecObraResumo[] => {
  const cards = [...html.matchAll(/<div class="contact-box box_obra"[\s\S]*?<\/a>/gi)].map((m) => m[0]);

  return cards
    .map((card): SimecObraResumo | null => {
      const idMatch = card.match(/dadosobra\.php\?obra=(\d+)/i);
      const obraId = idMatch ? Number(idMatch[1]) : NaN;
      if (!Number.isFinite(obraId)) {
        return null;
      }

      const titulo = normalizeText(decodeHtml(card.match(/<h4><strong>([\s\S]*?)<\/strong><\/h4>/i)?.[1] ?? "")) ?? `Obra ${obraId}`;
      const situacao = normalizeText(decodeHtml(card.match(/<div class="m-t-xs font-bold[^"]*">([\s\S]*?)<\/div>/i)?.[1] ?? ""));
      const localizacao = normalizeText(decodeHtml(card.match(/fa-map-marker[\s\S]*?<\/i>\s*([\s\S]*?)<\/p>/i)?.[1] ?? ""));
      const fields = parseStrongLabelPairs(card);
      const esfera: string | null = fields["esfera"] ?? null;
      const tipo: string | null = fields["tipo"] ?? null;
      const vigenciaFim = extractVigenciaFim(card, fields);
      const valorPrevisto = parseCurrencyPtBr(fields["valor previsto"] ?? null);
      const valorPagoFnde = parseCurrencyPtBr(fields["valor pago pelo fnde"] ?? null);
      const percentualExecucao = parsePercentual(
        normalizeText(decodeHtml(card.match(/progress-bar[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? ""))
      );

      return {
        obra_id: obraId,
        titulo,
        situacao,
        localizacao,
        esfera,
        tipo,
        vigencia_fim: vigenciaFim,
        valor_previsto: valorPrevisto,
        valor_pago_fnde: valorPagoFnde,
        percentual_execucao: percentualExecucao,
        detalhe_url: `${getBaseUrl()}/dadosobra.php?obra=${obraId}`
      };
    })
    .filter((item): item is SimecObraResumo => item !== null);
};

const parseDefinitionList = (html: string) => {
  const map: Record<string, string> = {};
  const matches = [...html.matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/gi)];
  for (const match of matches) {
    const key = normalizeText(decodeHtml(match[1]))?.replace(/:$/, "") ?? "";
    const value = normalizeText(decodeHtml(match[2])) ?? "";
    if (key) {
      map[key] = value;
    }
  }
  return map;
};

export const listarUfsSimecObras = async () => {
  const html = await fetchCachedHtml("/lista.php");
  const selectMatch = html.match(/<select[^>]+name="estuf"[\s\S]*?<\/select>/i);
  const options = parseOptions(selectMatch?.[0] ?? html);

  return options.map((item) => {
    const [sigla, ...resto] = item.label.split(" - ");
    return {
      uf: item.value || sigla,
      sigla: (item.value || sigla).toUpperCase(),
      nome: normalizeText(resto.join(" - ")) ?? item.label
    };
  });
};

export const listarMunicipiosSimecObras = async (query: SimecMunicipiosQueryInput) => {
  const html = await fetchCachedHtml("/lista.php", {
    acao: "carregarMunicipios",
    estuf: query.uf
  });

  const options = parseOptions(html);
  return options.map((item) => {
    const text = item.label;
    const parts = text.split(" - ");
    return {
      codigo: item.value,
      uf: parts[0] ?? query.uf,
      nome: normalizeText(parts.slice(1).join(" - ")) ?? text
    };
  });
};

export const listarObrasSimec = async (query: SimecObrasQueryInput) => {
  const html = await fetchCachedHtml("/lista.php", {
    estuf: query.uf,
    muncod: query.muncod,
    esfera: query.esfera,
    tipologia: query.tipologia,
    obrid: query.obrid
  });

  const itensBase = parseObraCards(html);
  const itens = await Promise.all(
    itensBase.map(async (item) => {
      if (item.vigencia_fim) {
        return item;
      }

      try {
        const detalheHtml = await fetchCachedHtml("/dadosobra.php", {
          obra: String(item.obra_id)
        });
        const detalhes = parseDefinitionList(detalheHtml);
        const vigenciaFim =
          extractVigenciaFimFromDetalhes(detalhes) ?? extractVigenciaFim(detalheHtml, parseStrongLabelPairs(detalheHtml));

        if (!vigenciaFim) {
          return item;
        }

        return {
          ...item,
          vigencia_fim: vigenciaFim
        };
      } catch {
        return item;
      }
    })
  );

  return {
    filtros: query,
    total: itens.length,
    itens
  };
};

export const obterObraSimec = async (obraId: number) => {
  const html = await fetchCachedHtml("/dadosobra.php", {
    obra: String(obraId)
  });

  const detalhes = parseDefinitionList(html);
  const titulo = normalizeText(decodeHtml(html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? ""));

  return {
    obra_id: obraId,
    titulo,
    detalhe_url: `${getBaseUrl()}/dadosobra.php?obra=${obraId}`,
    detalhes
  };
};
