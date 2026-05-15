import { env } from "../../config/env";
import * as cheerio from "cheerio";

const fetchWithTimeout = async (input: string, init: RequestInit = {}) => {
  const controller = new AbortController();
  const configuredTimeoutMs = Number.isFinite(env.simecTermosTimeoutMs) ? env.simecTermosTimeoutMs : 60000;
  const timeoutMs = Math.max(45000, Math.min(configuredTimeoutMs, 90000));
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
};

export interface SimecTermo {
  numeroTermo: string;
  par?: string;
  objeto: string;
  municipio: string;
  uf: string;
  situacao: string;
  valor: string;
  ano: string;
  valorEmpenhado?: string;
  valorPago?: string;
  saldoBancario?: string;
  prestacaoContas?: string;
}

export interface SimecTermosResult {
  sucesso: boolean;
  mensagem: string;
  dados: SimecTermo[];
  html_bruto?: string;
}

export const scrapeSimecTermos = async (
  uf: string,
  municipio: string,
  ano?: number,
  secretariaParam?: string
): Promise<SimecTermosResult> => {
  const originalTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  if (env.simecTermosInsecureTls) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  try {
    console.log(
      `[simec-scraper] Iniciando extracao: UF=${uf} MUN=${municipio} ANO=${ano ?? "todos"} ESFERA=${secretariaParam ?? "auto"}`
    );

    const userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    console.log("[simec-scraper] 1. Solicitando sessao (GET)...");
    const getRes = await fetchWithTimeout("https://simec.mec.gov.br/", {
      method: "GET",
      headers: {
        "User-Agent": userAgent
      }
    });

    let cookiesStr = "";
    const setCookieHeader = getRes.headers.get("set-cookie");
    const headersWithSetCookie = getRes.headers as Headers & {
      getSetCookie?: () => string[];
    };

    if (typeof headersWithSetCookie.getSetCookie === "function") {
      cookiesStr = headersWithSetCookie
        .getSetCookie()
        .map((cookie) => cookie.split(";")[0].trim())
        .join("; ");
    } else if (setCookieHeader) {
      cookiesStr = setCookieHeader
        .split(",")
        .map((cookie) => cookie.split(";")[0].trim())
        .join("; ");
    }

    if (cookiesStr) {
      console.log(`[simec-scraper] Cookies obtidos: ${cookiesStr.split(";").length}`);
    } else {
      console.warn("[simec-scraper] Nenhum cookie recebido do SIMEC!");
    }

    const muncodLimpo = municipio.replace(/\D/g, "");
    const body = new URLSearchParams({
      estuf: uf,
      muncod: muncodLimpo,
      requisicao: "pesquisar"
    });

    const secretaria = secretariaParam || (muncodLimpo.length === 7 ? "M" : "E");
    body.append("secretaria", secretaria);

    if (ano) {
      body.append("ano", ano.toString());
    }

    console.log(
      `[simec-scraper] 2. Pesquisando termos (POST)... UF=${uf} MUN=${muncodLimpo} ESFERA=${secretaria}`
    );
    const postRes = await fetchWithTimeout(env.simecTermosBaseUrl, {
      method: "POST",
      headers: {
        "User-Agent": userAgent,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookiesStr,
        Referer: "https://simec.mec.gov.br/par/carregaTermos.php",
        Origin: "https://simec.mec.gov.br"
      },
      body: body.toString()
    });

    const htmlBruto = Buffer.from(await postRes.arrayBuffer()).toString("latin1");
    const lowerHtml = htmlBruto.toLowerCase();
    console.log(`[simec-scraper] Resposta: ${postRes.status} (${htmlBruto.length} bytes)`);

    if (lowerHtml.includes("acesso negado") || lowerHtml.includes("login") || postRes.status === 403) {
      console.warn("[simec-scraper] SESSAO: Acesso negado ou sessao expirada.");
      return {
        sucesso: false,
        mensagem: "A sessao no SIMEC expirou ou o acesso foi negado. Tente novamente em instantes.",
        dados: [],
        html_bruto: htmlBruto.substring(0, 5000)
      };
    }

    if (lowerHtml.includes("unauthorized")) {
      return {
        sucesso: false,
        mensagem: "SIMEC exigiu autenticacao ou sessao expirou",
        dados: [],
        html_bruto: htmlBruto.substring(0, 5000)
      };
    }

    const dados = parseHtmlTermos(htmlBruto, uf, muncodLimpo);
    console.log(`[simec-scraper] Extracao finalizada: ${dados.length} itens encontrados.`);

    if (dados.length === 0 && /g-recaptcha|recaptcha|captcha/i.test(htmlBruto)) {
      console.error("[simec-scraper] BLOQUEIO: Desafio Recaptcha detectado!");
      return {
        sucesso: false,
        mensagem:
          "O SIMEC exigiu validacao Recaptcha. A extracao automatizada foi bloqueada pelo portal.",
        dados: [],
        html_bruto: htmlBruto.substring(0, 5000)
      };
    }

    return {
      sucesso: true,
      mensagem:
        dados.length > 0
          ? `Extracao concluida: ${dados.length} termos encontrados.`
          : "Nenhum termo encontrado para os filtros selecionados.",
      dados,
      html_bruto: dados.length === 0 ? htmlBruto.substring(0, 3000) : undefined
    };
  } catch (error: any) {
    console.error("[simec-scraper] Erro critico:", error);
    if (error?.name === "AbortError" || String(error).includes("AbortError")) {
      return {
        sucesso: false,
        mensagem:
          "A consulta publica do SIMEC excedeu o tempo limite da aplicacao. O portal esta lento ou bloqueando a automacao desse fluxo.",
        dados: [],
        html_bruto: ""
      };
    }

    return {
      sucesso: false,
      mensagem: `Falha tecnica no robo SIMEC: ${error.message}`,
      dados: [],
      html_bruto: ""
    };
  } finally {
    if (originalTls === undefined) {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    } else {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTls;
    }
  }
};

const parseHtmlTermos = (html: string, uf: string, municipio: string): SimecTermo[] => {
  const resultados: SimecTermo[] = [];
  try {
    const $ = cheerio.load(html);

    const tables = $("table.tabela-listagem, table.table-striped").filter((_index, table) => {
      const text = normalizeText($(table).text());
      return text.includes("processo") && text.includes("documento");
    });

    if (!tables.length) {
      console.warn("[simec-scraper] Nenhuma tabela de listagem encontrada no HTML.");
      return [];
    }

    tables.each((_tableIndex, table) => {
      const par = extractParLabel($, table);
      const rows = $(table).find("tr").toArray();
      const headerRow = rows.find((row) => $(row).find("th, td").length > 1);
      if (!headerRow) {
        return;
      }

      const headers = $(headerRow)
        .find("th, td")
        .toArray()
        .map((cell) => normalizeText($(cell).text()));

      const findColumn = (...needles: string[]) =>
        headers.findIndex((header) => needles.every((needle) => header.includes(needle)));

      const processoIndex = findColumn("processo");
      const documentoIndex = findColumn("documento");
      const tipoDocumentoIndex = findColumn("tipo", "documento");
      const objetoIndex = findColumn("tipo", "objeto");
      const vigenciaIndex = findColumn("vigencia");
      const prestacaoIndex = findColumn("prestacao");
      const valorIndex = findColumn("valor", "termo");
      const valorEmpenhadoIndex = findColumn("valor", "empenhado");
      const valorPagoIndex = findColumn("valor", "pago");
      const pagamentoEfetivadoIndex = findColumn("pagamento", "efetivado");
      const saldoBancarioIndex = findColumn("saldo", "bancario");

      rows.slice(rows.indexOf(headerRow) + 1).forEach((row) => {
        const cells = $(row).find("td").toArray();
        if (cells.length < 2) {
          return;
        }

        const getCell = (index: number) => (index >= 0 && index < cells.length ? $(cells[index]).text().replace(/\s+/g, " ").trim() : "");
        const doc = getCell(documentoIndex);
        const processo = getCell(processoIndex);

        if (!doc || !processo || normalizeText(doc).includes("documento")) {
          return;
        }

        const tipoDocumento = getCell(tipoDocumentoIndex);
        const objeto = getCell(objetoIndex) || tipoDocumento || "-";
        const situacao = getCell(prestacaoIndex) || getCell(vigenciaIndex) || "-";
        const valor = getCell(valorIndex) || "-";
        const valorPago = getCell(valorPagoIndex) || getCell(pagamentoEfetivadoIndex) || "-";

        resultados.push({
          numeroTermo: doc,
          par,
          objeto,
          municipio,
          uf,
          situacao,
          valor,
          ano: extractYear(processo, doc),
          valorEmpenhado: getCell(valorEmpenhadoIndex) || "-",
          valorPago,
          saldoBancario: getCell(saldoBancarioIndex) || "-",
          prestacaoContas: getCell(prestacaoIndex) || "-"
        });
      });
    });
  } catch (err) {
    console.error("[simec-scraper] Erro ao fazer o parse do HTML:", err);
  }

  return resultados;
};

const extractParLabel = ($: any, table: any) => {
  const sectionTitle =
    $(table).closest(".ibox").find(".ibox-title h3").first().text().trim() ||
    $(table).prevAll("h3").first().text().trim();
  const normalized = sectionTitle.replace(/\s+/g, " ").trim();
  return normalized.replace(/^Documentos do\s+/i, "") || "-";
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const extractYear = (processo: string, doc: string): string => {
  const matchProcesso = processo.match(/\/(\d{4})-\d+/);
  if (matchProcesso) {
    return matchProcesso[1];
  }

  const matchDoc = doc.match(/^(\d{4})/);
  if (matchDoc) {
    const year = parseInt(matchDoc[1], 10);
    if (year >= 2000 && year <= 2100) {
      return matchDoc[1];
    }
  }

  return "-";
};
