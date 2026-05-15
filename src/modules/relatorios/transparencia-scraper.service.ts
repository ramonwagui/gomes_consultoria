const PORTAL_BASE_URL = "https://portaldatransparencia.gov.br";

type EmendaScrapedItem = {
  codigo_emenda: string | null;
  numero_emenda: string | null;
  ano: number | null;
  tipo_emenda: string | null;
  autor: string | null;
  numero_processo: string | null;
  valor_empenhado: number;
  valor_liquidado: number;
  valor_pago: number;
  area_atuacao_funcao: string | null;
  subfuncao: string | null;
  programa: string | null;
  acao: string | null;
  plano_orcamentario_po: string | null;
};

type ConvenioScrapedItem = {
  id: number | null;
  numero_convenio: string | null;
  numero_processo: string | null;
  situacao: string | null;
  objeto: string | null;
  orgao: string | null;
  tipo_instrumento: string | null;
  convenente: string | null;
  cnpj_convenente: string | null;
  municipio: string | null;
  uf: string | null;
  valor_global: number | null;
  valor_liberado: number | null;
  data_inicio_vigencia: string | null;
  data_fim_vigencia: string | null;
  area_atuacao_funcao: string | null;
  subfuncao: string | null;
  programa: string | null;
  acao: string | null;
  plano_orcamentario_po: string | null;
};

export type DocumentoPagamentoEmpenhoScrapedItem = {
  empenho: string | null;
  subitem: string | null;
  valor_pago: number;
  valor_resto_inscrito: number;
  valor_resto_cancelado: number;
  valor_resto_pago: number;
};

export type DocumentoPagamentoScrapedItem = {
  convenio_id: number | null;
  convenio_numero: string | null;
  codigo_documento: string | null;
  numero_documento: string | null;
  data: string | null;
  descricao: string | null;
  fase: string | null;
  tipo_documento: string | null;
  valor_documento: number;
  observacao_documento: string | null;
  favorecido_cnpj: string | null;
  favorecido_nome: string | null;
  orgao_superior_codigo: string | null;
  orgao_superior_nome: string | null;
  orgao_vinculado_codigo: string | null;
  orgao_vinculado_nome: string | null;
  unidade_gestora_codigo: string | null;
  unidade_gestora_nome: string | null;
  gestao_codigo: string | null;
  gestao_nome: string | null;
  processo: string | null;
  empenhos: DocumentoPagamentoEmpenhoScrapedItem[];
};

export type ConvenioEmendasScrapedItem = {
  convenio: ConvenioScrapedItem;
  emendas: EmendaScrapedItem[];
  sk_convenio: string | null;
  origem: "id" | "numero";
};

const browserHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
};

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_full, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_full, code) => String.fromCharCode(Number(code)));

const stripTags = (value: string) => value.replace(/<[^>]+>/g, " ");

const cleanText = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const cleaned = decodeHtmlEntities(stripTags(value)).replace(/\s+/g, " ").trim();
  return cleaned === "" ? null : cleaned;
};

const sanitizeScrapedValue = (value: string | null) => {
  const text = cleanText(value);
  if (!text) {
    return null;
  }
  const normalized = text.replace(/\s+/g, " ").trim();
  if (/^cgu\.element\.display\(\);?$/i.test(normalized)) {
    return null;
  }
  if (/^(undefined|null|nan)$/i.test(normalized)) {
    return null;
  }
  if (/^\/\//.test(normalized)) {
    return null;
  }
  if (/\/\*\s*.*\s*\*\//.test(normalized)) {
    return null;
  }
  if (/(validar\s+o\s+formul[aá]rio|func[aã]o\s+para\s+validar)/i.test(normalized)) {
    return null;
  }
  if (/(document\.|window\.|function\s*\(|return\s+|var\s+|let\s+|const\s+)/i.test(normalized)) {
    return null;
  }
  if (/(forms?\.[a-z_]+\.[a-z_]+|\.validate\s*\(|\$\(|jQuery\(|onsubmit|addEventListener)/i.test(normalized)) {
    return null;
  }
  if (/[;{}]/.test(normalized)) {
    return null;
  }
  return normalized;
};

const normalizeLabel = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

const toIsoDate = (value: string | null) => {
  if (!value) {
    return null;
  }
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
};

const parsePtBrMoney = (value: unknown): number => {
  const text = cleanText(typeof value === "string" ? value : String(value ?? "")) ?? "";
  if (!text) {
    return 0;
  }
  const firstMoney = text.match(/-?\d{1,3}(?:\.\d{3})*,\d{2}/)?.[0] ?? text;
  const normalized = firstMoney.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const extractStrongValueMap = (html: string) => {
  const map = new Map<string, string>();
  const regex = /<strong[^>]*>([\s\S]*?)<\/strong>\s*<span[^>]*>([\s\S]*?)<\/span>/gi;
  let match: RegExpExecArray | null = regex.exec(html);
  while (match) {
    const label = cleanText(match[1]);
    const value = cleanText(match[2]);
    if (label && value) {
      const key = normalizeLabel(label);
      if (key !== "" && !map.has(key)) {
        map.set(key, value);
      }
    }
    match = regex.exec(html);
  }
  return map;
};

const getByLabel = (map: Map<string, string>, ...labels: string[]) => {
  for (const label of labels) {
    const normalized = normalizeLabel(label);
    if (map.has(normalized)) {
      return sanitizeScrapedValue(map.get(normalized) ?? null);
    }
    for (const [key, value] of map.entries()) {
      if (key.startsWith(normalized) || normalized.startsWith(key)) {
        return sanitizeScrapedValue(value);
      }
    }
  }
  return null;
};

const extractTextLines = (html: string) =>
  decodeHtmlEntities(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|td|tr|h1|h2|h3|h4|h5|h6|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line !== "");

const getByLabelFromTextLines = (html: string, ...labels: string[]) => {
  const lines = extractTextLines(html);
  for (const label of labels) {
    const normalizedLabel = normalizeLabel(label);
    for (let index = 0; index < lines.length; index += 1) {
      const currentNormalized = normalizeLabel(lines[index]);
      if (currentNormalized === normalizedLabel || currentNormalized.startsWith(normalizedLabel)) {
        const nextLine = lines[index + 1] ?? "";
        const nextNormalized = normalizeLabel(nextLine);
        if (nextLine && nextNormalized !== normalizedLabel) {
          const sanitized = sanitizeScrapedValue(nextLine);
          if (sanitized) {
            return sanitized;
          }
        }

        const fallbackLine = lines[index + 2] ?? "";
        const fallbackNormalized = normalizeLabel(fallbackLine);
        if (fallbackLine && fallbackNormalized !== normalizedLabel) {
          const sanitized = sanitizeScrapedValue(fallbackLine);
          if (sanitized) {
            return sanitized;
          }
        }
      }
    }
  }
  return null;
};

const getByStrongLabelWindow = (html: string, ...labels: string[]) => {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`<strong[^>]*>\\s*${escaped}\\s*<\\/strong>([\\s\\S]{0,600})`, "i");
    const match = regex.exec(html);
    if (!match?.[1]) {
      continue;
    }

    const sanitized = decodeHtmlEntities(match[1])
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<\/?(span|div|p|br|li|td|tr)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .split("\n")
      .map((line) => sanitizeScrapedValue(line))
      .filter((line): line is string => Boolean(line))
      .find((line) => !/^(cgu\.element\.display\(\);?)$/i.test(line));

    if (sanitized) {
      return sanitized;
    }
  }
  return null;
};

const extractOrcamentarioSection = (html: string) => {
  const match = /DETALHES\s+OR[ÇC]AMENT[ÁA]RIOS/i.exec(html);
  if (!match || match.index < 0) {
    return html;
  }
  const start = match.index;
  return html.slice(start, start + 12000);
};

const sanitizeProgramaValue = (value: string | null) => {
  const sanitized = sanitizeScrapedValue(value);
  if (!sanitized) {
    return null;
  }
  if (/ren[uú]ncias?\s+fiscais?/i.test(sanitized)) {
    return null;
  }
  // Programa orcamentario normalmente vem com codigo + descricao (ex.: "2035 - ...")
  if (!/^\d{3,5}\s*-\s*.+/i.test(sanitized)) {
    return null;
  }
  return sanitized;
};

const parseOrcamentarioDetails = (html: string) => {
  const section = extractOrcamentarioSection(html);
  const labels = extractStrongValueMap(section);
  const fromLabel = (...candidates: string[]) =>
    getByLabel(labels, ...candidates) ??
    getByLabelFromTextLines(section, ...candidates) ??
    getByStrongLabelWindow(section, ...candidates);

  return {
    area_atuacao_funcao: fromLabel("area de atuacao funcao", "funcao", "area de atuacao"),
    subfuncao: fromLabel("subfuncao"),
    programa: sanitizeProgramaValue(fromLabel("programa")),
    acao: fromLabel("acao", "acao orcamentaria"),
    plano_orcamentario_po: fromLabel("plano orcamentario po", "plano orcamentario", "plano orcamentario - po")
  };
};

type OrcamentarioDetails = ReturnType<typeof parseOrcamentarioDetails>;

const hasOrcamentarioDetails = (details: OrcamentarioDetails | null | undefined) =>
  Boolean(
    details?.area_atuacao_funcao ||
      details?.subfuncao ||
      details?.programa ||
      details?.acao ||
      details?.plano_orcamentario_po
  );

const toEmendaCodigoKey = (value: string) => value.replace(/\s+/g, "").toUpperCase();

const extractTransferegovConvenioLink = (html: string) => {
  const match =
    /href=['"]((?:https?:)?\/\/discricionarias\.transferegov\.sistema\.gov\.br\/voluntarias\/[^'"]+)['"]/i.exec(html) ??
    /href=['"]((?:https?:)?\/\/\S*transferegov\.sistema\.gov\.br\/voluntarias\/[^'"]+)['"]/i.exec(html);
  if (!match?.[1]) {
    return null;
  }
  const href = match[1].startsWith("//") ? `https:${match[1]}` : match[1];
  return cleanText(href);
};

const extractCnpjConvenente = (html: string) => {
  const match = /\/pessoa-juridica\/(\d{14})-/i.exec(html);
  return match?.[1] ?? null;
};

const extractSkConvenio = (html: string) => {
  const quoted = /data\.skConvenio\s*=\s*"(\d+)"/i.exec(html);
  if (quoted) {
    return quoted[1];
  }
  const plain = /data\.skConvenio\s*=\s*(\d+)/i.exec(html);
  return plain?.[1] ?? null;
};

const extractConvenioFromHtml = (html: string, identificador: string, origem: "id" | "numero"): ConvenioScrapedItem => {
  const labels = extractStrongValueMap(html);
  const orcamentario = parseOrcamentarioDetails(html);
  const estado = getByLabel(labels, "estado");
  const uf = estado?.match(/(?:^|\s-\s)([A-Z]{2})$/i)?.[1]?.toUpperCase() ?? null;
  const numeroInstrumentoRaw = getByLabel(labels, "numero do instrumento");
  const numeroInstrumento =
    numeroInstrumentoRaw?.match(/\d{4,}(?:\/\d{2,4})?/)?.[0] ??
    numeroInstrumentoRaw?.replace(/\(.*\)/g, "").trim() ??
    null;
  const numeroOriginal = getByLabel(labels, "numero original", "n original");
  const situacao = getByLabel(labels, "situacao");
  const acaoCorrigida =
    orcamentario.acao && situacao && normalizeLabel(orcamentario.acao) === normalizeLabel(situacao)
      ? null
      : orcamentario.acao;

  return {
    id:
      origem === "id" && /^\d+$/.test(identificador)
        ? Number(identificador)
        : /^\d+$/.test(numeroInstrumento ?? "")
          ? Number(numeroInstrumento)
          : null,
    numero_convenio: numeroInstrumento ?? numeroOriginal ?? identificador,
    numero_processo: getByLabel(labels, "numero do processo"),
    situacao,
    objeto: getByLabel(labels, "objeto"),
    orgao: getByLabel(labels, "orgao", "concedente"),
    tipo_instrumento: getByLabel(labels, "tipo de instrumento"),
    convenente: getByLabel(labels, "convenente"),
    cnpj_convenente: extractCnpjConvenente(html),
    municipio: getByLabel(labels, "municipio"),
    uf,
    valor_global: parsePtBrMoney(getByLabel(labels, "valor do convenio")),
    valor_liberado: parsePtBrMoney(getByLabel(labels, "valor liberado")),
    data_inicio_vigencia: toIsoDate(getByLabel(labels, "inicio da vigencia")),
    data_fim_vigencia: toIsoDate(getByLabel(labels, "fim da vigencia")),
    area_atuacao_funcao: orcamentario.area_atuacao_funcao,
    subfuncao: orcamentario.subfuncao,
    programa: orcamentario.programa,
    acao: acaoCorrigida,
    plano_orcamentario_po: orcamentario.plano_orcamentario_po
  };
};

const convenioNeedsOrcamentarioFallback = (convenio: ConvenioScrapedItem) =>
  !convenio.area_atuacao_funcao || !convenio.subfuncao || !convenio.programa || !convenio.acao || !convenio.plano_orcamentario_po;

const enrichConvenioOrcamentarioFromTransferegov = async (convenio: ConvenioScrapedItem, html: string) => {
  if (!convenioNeedsOrcamentarioFallback(convenio)) {
    return convenio;
  }

  const transferegovLink = extractTransferegovConvenioLink(html);
  if (!transferegovLink) {
    return convenio;
  }

  try {
    const transferegovHtml = await fetchPortalText(transferegovLink);
    const details = parseOrcamentarioDetails(transferegovHtml);
    const acaoCorrigida =
      details.acao && convenio.situacao && normalizeLabel(details.acao) === normalizeLabel(convenio.situacao)
        ? null
        : details.acao;

    return {
      ...convenio,
      area_atuacao_funcao: convenio.area_atuacao_funcao ?? details.area_atuacao_funcao,
      subfuncao: convenio.subfuncao ?? details.subfuncao,
      programa: convenio.programa ?? details.programa,
      acao: convenio.acao ?? acaoCorrigida,
      plano_orcamentario_po: convenio.plano_orcamentario_po ?? details.plano_orcamentario_po
    };
  } catch {
    return convenio;
  }
};

const fetchPortalText = async (url: string) => {
  const response = await fetch(url, {
    method: "GET",
    headers: browserHeaders
  });

  if (!response.ok) {
    throw new Error(`Falha ao acessar portal (${response.status})`);
  }

  return response.text();
};

const fetchPortalJson = async <T>(url: string) => {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      ...browserHeaders,
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest"
    }
  });
  if (!response.ok) {
    throw new Error(`Falha ao consultar endpoint do portal (${response.status})`);
  }
  const body = await response.text();
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error("Retorno invalido do portal (nao-JSON)");
  }
};

const EMENDAS_COLUNAS =
  "ano,tipoEmenda,autor,numeroEmenda,localidadeDoGasto,codigoEmenda,valorEmpenhado,valorLiquidado,valorPago";

const emendaOrcamentarioCache = new Map<string, OrcamentarioDetails | null>();

const fetchOrcamentarioByCodigoEmenda = async (codigoEmenda: string | null): Promise<OrcamentarioDetails | null> => {
  const codigo = cleanText(codigoEmenda ?? "");
  if (!codigo) {
    return null;
  }

  const key = toEmendaCodigoKey(codigo);
  if (emendaOrcamentarioCache.has(key)) {
    return emendaOrcamentarioCache.get(key) ?? null;
  }

  try {
    const url = `${PORTAL_BASE_URL}/emendas/detalhe?codigoEmenda=${encodeURIComponent(codigo)}`;
    const html = await fetchPortalText(url);
    if (/C[oó]digo do erro:\s*4\d{2}/i.test(html) || /Par[aâ]metro inv[aá]lido/i.test(html)) {
      emendaOrcamentarioCache.set(key, null);
      return null;
    }

    const details = parseOrcamentarioDetails(html);
    const parsed = hasOrcamentarioDetails(details) ? details : null;
    emendaOrcamentarioCache.set(key, parsed);
    return parsed;
  } catch {
    emendaOrcamentarioCache.set(key, null);
    return null;
  }
};

const fetchEmendasBySkConvenio = async (skConvenio: string) => {
  const itens: EmendaScrapedItem[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const url = new URL(`${PORTAL_BASE_URL}/emendas/consulta/resultado`);
    url.searchParams.set("paginacaoSimples", "true");
    url.searchParams.set("tamanhoPagina", "100");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("direcaoOrdenacao", "asc");
    url.searchParams.set("colunaOrdenacao", "autor");
    url.searchParams.set("colunasSelecionadas", EMENDAS_COLUNAS);
    url.searchParams.set("skConvenio", skConvenio);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        ...browserHeaders,
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest"
      }
    });

    if (!response.ok) {
      throw new Error(`Falha ao consultar emendas do convenio (${response.status})`);
    }

    const bodyText = await response.text();
    let payload: {
      recordsTotal?: number;
      data?: Array<{
        codigoEmenda?: string | number | null;
        numeroEmenda?: string | number | null;
        ano?: number | string | null;
        tipoEmenda?: string | null;
        autor?: string | null;
        valorEmpenhado?: string | number | null;
        valorLiquidado?: string | number | null;
        valorPago?: string | number | null;
      }>;
    } = {};

    try {
      payload = JSON.parse(bodyText) as typeof payload;
    } catch {
      throw new Error("Retorno invalido ao consultar emendas do convenio");
    }

    const pageData = Array.isArray(payload.data) ? payload.data : [];
    total = Number.isFinite(Number(payload.recordsTotal)) ? Number(payload.recordsTotal) : pageData.length;

    for (const row of pageData) {
      const anoRaw = typeof row.ano === "string" ? Number(row.ano) : row.ano;
      itens.push({
        codigo_emenda: cleanText(String(row.codigoEmenda ?? "")),
        numero_emenda: cleanText(String(row.numeroEmenda ?? "")),
        ano: typeof anoRaw === "number" && Number.isFinite(anoRaw) ? anoRaw : null,
        tipo_emenda: cleanText(row.tipoEmenda ?? null),
        autor: cleanText(row.autor ?? null),
        numero_processo: null,
        valor_empenhado: parsePtBrMoney(row.valorEmpenhado),
        valor_liquidado: parsePtBrMoney(row.valorLiquidado),
        valor_pago: parsePtBrMoney(row.valorPago),
        area_atuacao_funcao: null,
        subfuncao: null,
        programa: null,
        acao: null,
        plano_orcamentario_po: null
      });
    }

    if (pageData.length === 0) {
      break;
    }
    offset += pageData.length;
  }

  const detalhesPorCodigo = new Map<string, OrcamentarioDetails>();
  const codigos = Array.from(
    new Set(
      itens
        .map((item) => item.codigo_emenda)
        .filter((codigo): codigo is string => Boolean(codigo))
        .map((codigo) => cleanText(codigo) ?? "")
        .filter((codigo) => codigo !== "")
    )
  );

  for (const codigo of codigos) {
    const details = await fetchOrcamentarioByCodigoEmenda(codigo);
    if (details && hasOrcamentarioDetails(details)) {
      detalhesPorCodigo.set(toEmendaCodigoKey(codigo), details);
    }
  }

  return itens.map((item) => {
    const codigo = cleanText(item.codigo_emenda ?? "");
    const details = codigo ? detalhesPorCodigo.get(toEmendaCodigoKey(codigo)) : undefined;
    return {
      ...item,
      area_atuacao_funcao: item.area_atuacao_funcao ?? details?.area_atuacao_funcao ?? null,
      subfuncao: item.subfuncao ?? details?.subfuncao ?? null,
      programa: item.programa ?? details?.programa ?? null,
      acao: item.acao ?? details?.acao ?? null,
      plano_orcamentario_po: item.plano_orcamentario_po ?? details?.plano_orcamentario_po ?? null
    };
  });
};

export const scrapeConvenioComEmendas = async (
  identificador: string,
  origem: "id" | "numero"
): Promise<ConvenioEmendasScrapedItem> => {
  const trimmed = identificador.trim();
  if (!trimmed) {
    throw new Error("Identificador de convenio vazio");
  }

  const detailUrl = `${PORTAL_BASE_URL}/convenios/${encodeURIComponent(trimmed)}?ordenarPor=tipoEmenda&direcao=desc`;
  const html = await fetchPortalText(detailUrl);
  if (/C[oó]digo do erro:\s*4\d{2}/i.test(html) || /Par[aâ]metro inv[aá]lido/i.test(html)) {
    throw new Error(`Convenio ${trimmed} nao encontrado no portal`);
  }

  const convenioBase = extractConvenioFromHtml(html, trimmed, origem);
  const convenio = await enrichConvenioOrcamentarioFromTransferegov(convenioBase, html);
  const skConvenio = extractSkConvenio(html);
  if (!convenio.numero_convenio && !convenio.numero_processo && !convenio.objeto && !skConvenio) {
    throw new Error(`Convenio ${trimmed} nao encontrado no portal`);
  }
  const emendas = skConvenio ? await fetchEmendasBySkConvenio(skConvenio) : [];

  return {
    convenio,
    emendas: emendas.map((item) => ({
      ...item,
      numero_processo: convenio.numero_processo
    })),
    sk_convenio: skConvenio,
    origem
  };
};

type ValoresLiberadosRow = {
  data?: string;
  documento?: string;
  documentoResumido?: string;
  valor?: string;
  obExisteEmDespesas?: boolean;
};

type DocumentoRelacionadoRow = {
  data?: string;
  fase?: string;
  documento?: string;
  documentoResumido?: string;
  valor?: string;
};

const parseCodigoNomeSection = (html: string, label: string) => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<strong>\\s*${escaped}\\s*<\\/strong>[\\s\\S]*?<span[^>]*class=\"btwline\"[^>]*>([\\s\\S]*?)<\\/span>[\\s\\S]*?<span[^>]*>([\\s\\S]*?)<\\/span>`,
    "i"
  );
  const match = regex.exec(html);
  return {
    codigo: cleanText(match?.[1] ?? null),
    nome: cleanText(match?.[2] ?? null)
  };
};

const extractDocumentoPagamentoFields = (html: string) => {
  const labels = extractStrongValueMap(html);
  const orgaoSuperior = parseCodigoNomeSection(html, "Órgão Superior");
  const orgaoVinculado = parseCodigoNomeSection(html, "Órgão / Entidade Vinculada");
  const unidadeGestora = parseCodigoNomeSection(html, "Unidade Gestora");
  const gestao = parseCodigoNomeSection(html, "Gestão");

  const favCnpjMatch = /\/pessoa-juridica\/(\d{14})/i.exec(html);
  const processo = getByLabel(labels, "processo");
  const observacao = getByLabel(labels, "observacao do documento");

  const data = toIsoDate(getByLabel(labels, "data"));
  const codigoMatch = /data\.codigo\s*=\s*"([^"]+)"/i.exec(html);

  return {
    codigo_documento: cleanText(codigoMatch?.[1] ?? null),
    numero_documento: getByLabel(labels, "n do documento", "nº do documento", "numero do documento"),
    data,
    descricao: getByLabel(labels, "descricao"),
    fase: getByLabel(labels, "fase"),
    tipo_documento: getByLabel(labels, "tipo de documento"),
    valor_documento: parsePtBrMoney(getByLabel(labels, "valor do documento")),
    observacao_documento: observacao,
    favorecido_cnpj: favCnpjMatch?.[1] ?? null,
    favorecido_nome: getByLabel(labels, "nome"),
    orgao_superior_codigo: orgaoSuperior.codigo,
    orgao_superior_nome: orgaoSuperior.nome,
    orgao_vinculado_codigo: orgaoVinculado.codigo,
    orgao_vinculado_nome: orgaoVinculado.nome,
    unidade_gestora_codigo: unidadeGestora.codigo,
    unidade_gestora_nome: unidadeGestora.nome,
    gestao_codigo: gestao.codigo,
    gestao_nome: gestao.nome,
    processo: processo && processo.toUpperCase() === "N/A" ? null : processo
  };
};

const fetchEmpenhosImpactados = async (codigoDocumento: string, fase: string) => {
  const url = new URL(`${PORTAL_BASE_URL}/despesas/documento/pagamento/empenhos-impactados/resultado`);
  url.searchParams.set("paginacaoSimples", "true");
  url.searchParams.set("tamanhoPagina", "100");
  url.searchParams.set("offset", "0");
  url.searchParams.set("direcaoOrdenacao", "desc");
  url.searchParams.set("colunaOrdenacao", "empenhoResumido");
  url.searchParams.set(
    "colunasSelecionadas",
    "empenhoResumido,subitem,valorPago,valorRestoInscrito,valorRestoCancelado,valorRestoPago"
  );
  url.searchParams.set("codigo", codigoDocumento);
  url.searchParams.set("fase", fase);

  const payload = await fetchPortalJson<{ data?: Array<Record<string, unknown>> }>(url.toString());
  const rows = Array.isArray(payload.data) ? payload.data : [];
  return rows.map((row) => ({
    empenho: cleanText(row.empenhoResumido ?? row.empenho),
    subitem: cleanText(row.subitem),
    valor_pago: parsePtBrMoney(row.valorPago),
    valor_resto_inscrito: parsePtBrMoney(row.valorRestoInscrito),
    valor_resto_cancelado: parsePtBrMoney(row.valorRestoCancelado),
    valor_resto_pago: parsePtBrMoney(row.valorRestoPago)
  }));
};

const normalizeAscii = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const isPagamentoFase = (value: string | null | undefined) => normalizeAscii(value).includes("pagamento");

const fetchDocumentosRelacionados = async (codigo: string, fase: string) => {
  const itens: DocumentoRelacionadoRow[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const url = new URL(`${PORTAL_BASE_URL}/despesas/documento/documentos-relacionados/resultado`);
    url.searchParams.set("paginacaoSimples", "true");
    url.searchParams.set("tamanhoPagina", "100");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("direcaoOrdenacao", "desc");
    url.searchParams.set("colunaOrdenacao", "data");
    url.searchParams.set("colunasSelecionadas", "data,fase,documento,especieTipo,valor");
    url.searchParams.set("codigo", codigo);
    url.searchParams.set("fase", fase);

    const payload = await fetchPortalJson<{ recordsTotal?: number; data?: DocumentoRelacionadoRow[] }>(url.toString());
    const pageRows = Array.isArray(payload.data) ? payload.data : [];
    itens.push(...pageRows);

    total = Number.isFinite(Number(payload.recordsTotal)) ? Number(payload.recordsTotal) : pageRows.length;
    if (pageRows.length === 0) {
      break;
    }
    offset += pageRows.length;
  }

  return itens;
};

const scrapeDocumentoPagamentoDetalhe = async (
  codigoOuNumero: string,
  convenioId: number | null,
  convenioNumero: string | null
): Promise<DocumentoPagamentoScrapedItem | null> => {
  const full = codigoOuNumero.trim();
  if (!full) {
    return null;
  }

  const attempts = [full];
  const shortMatch = full.match(/(\d{4}[A-Z]{2}\d{6})$/i)?.[1];
  if (shortMatch && shortMatch !== full) {
    attempts.push(shortMatch);
  }

  let html: string | null = null;
  for (const attempt of attempts) {
    try {
      html = await fetchPortalText(`${PORTAL_BASE_URL}/despesas/documento/pagamento/${encodeURIComponent(attempt)}`);
      if (/Detalhamento do documento de Pagamento/i.test(html)) {
        break;
      }
      html = null;
    } catch {
      html = null;
    }
  }

  if (!html) {
    return null;
  }

  const base = extractDocumentoPagamentoFields(html);
  const codigo = base.codigo_documento ?? full;
  const fase = base.fase ?? "Pagamento";
  const empenhos = await fetchEmpenhosImpactados(codigo, fase);

  return {
    convenio_id: convenioId,
    convenio_numero: convenioNumero,
    ...base,
    codigo_documento: codigo,
    empenhos
  };
};

export const scrapeDocumentosPagamentoPorConvenio = async (
  convenioId: number | string,
  convenioNumero: string | null,
  maxDocumentos = 30
) => {
  const id = String(convenioId).trim();
  if (!/^\d+$/.test(id)) {
    return [];
  }

  const pageSize = Math.min(Math.max(maxDocumentos, 1), 100);
  const rows: ValoresLiberadosRow[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const url = new URL(`${PORTAL_BASE_URL}/convenios/${id}/valores-liberados/resultado`);
    url.searchParams.set("paginacaoSimples", "true");
    url.searchParams.set("tamanhoPagina", String(pageSize));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("direcaoOrdenacao", "desc");
    url.searchParams.set("colunaOrdenacao", "data");
    url.searchParams.set("colunasSelecionadas", "detalhar,data,documento,valor");

    const payload = await fetchPortalJson<{ recordsTotal?: number; data?: ValoresLiberadosRow[] }>(url.toString());
    const pageRows = Array.isArray(payload.data) ? payload.data : [];
    rows.push(...pageRows);

    total = Number.isFinite(Number(payload.recordsTotal)) ? Number(payload.recordsTotal) : pageRows.length;
    if (pageRows.length === 0) {
      break;
    }
    offset += pageRows.length;
  }

  const docs: DocumentoPagamentoScrapedItem[] = [];
  const seenCodigos = new Set<string>();
  const addDocFromCodigo = async (codigo: string, fallbackRow?: ValoresLiberadosRow) => {
    const codigoLimpo = cleanText(codigo) ?? "";
    if (!codigoLimpo || seenCodigos.has(codigoLimpo)) {
      return;
    }
    seenCodigos.add(codigoLimpo);

    const detalhe = await scrapeDocumentoPagamentoDetalhe(codigoLimpo, Number(id), convenioNumero);
    if (detalhe) {
      docs.push(detalhe);
      return;
    }

    docs.push({
      convenio_id: Number(id),
      convenio_numero: convenioNumero,
      codigo_documento: codigoLimpo,
      numero_documento: cleanText(fallbackRow?.documentoResumido ?? null) ?? codigoLimpo,
      data: toIsoDate(cleanText(fallbackRow?.data) ?? null),
      descricao: null,
      fase: "Pagamento",
      tipo_documento: null,
      valor_documento: parsePtBrMoney(fallbackRow?.valor),
      observacao_documento: null,
      favorecido_cnpj: null,
      favorecido_nome: null,
      orgao_superior_codigo: null,
      orgao_superior_nome: null,
      orgao_vinculado_codigo: null,
      orgao_vinculado_nome: null,
      unidade_gestora_codigo: null,
      unidade_gestora_nome: null,
      gestao_codigo: null,
      gestao_nome: null,
      processo: null,
      empenhos: []
    });
  };

  for (const row of rows) {
    const codigo = cleanText(row.documento ?? null);
    if (!codigo) {
      continue;
    }
    await addDocFromCodigo(codigo, row);
  }

  // Expansao: a partir dos empenhos dos documentos ja encontrados, busca todos os pagamentos relacionados.
  const documentosSeed = [...docs];
  for (const doc of documentosSeed) {
    const codigoDocumento = cleanText(doc.codigo_documento) ?? "";
    const prefixo = codigoDocumento.match(/^(\d{12})/)?.[1] ?? "";
    const empenhos = Array.isArray(doc.empenhos) ? doc.empenhos : [];

    for (const emp of empenhos) {
      const empenhoRaw = cleanText(emp.empenho) ?? "";
      if (!empenhoRaw) {
        continue;
      }
      const empenhoCurto = empenhoRaw.match(/(\d{4}[A-Z]{2}\d{6})$/i)?.[1] ?? "";
      const codigoEmpenho =
        /^\d{12}\d{4}[A-Z]{2}\d{6}$/i.test(empenhoRaw)
          ? empenhoRaw
          : prefixo && empenhoCurto
            ? `${prefixo}${empenhoCurto}`
            : "";
      if (!codigoEmpenho) {
        continue;
      }

      let relacionados: DocumentoRelacionadoRow[] = [];
      try {
        relacionados = await fetchDocumentosRelacionados(codigoEmpenho, "Empenho");
      } catch {
        continue;
      }
      for (const rel of relacionados) {
        if (!isPagamentoFase(rel.fase)) {
          continue;
        }
        const codigoPagamento = cleanText(rel.documento ?? null);
        if (!codigoPagamento) {
          continue;
        }
        await addDocFromCodigo(codigoPagamento);
      }
    }
  }
  return docs;
};
