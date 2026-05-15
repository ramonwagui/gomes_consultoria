import { chromium, type Browser, type Page } from "playwright";

export type PlanoAcaoEspecialPortalItem = {
  ano_plano_acao: number | null;
  codigo_plano_acao: string;
  situacao_plano_acao: string | null;
  situacao_plano_trabalho: string | null;
  uf_beneficiario_plano_acao: string | null;
  nome_beneficiario_plano_acao: string | null;
  cnpj_beneficiario_plano_acao: string | null;
  nome_parlamentar_emenda_plano_acao: string | null;
  ano_emenda_parlamentar_plano_acao: number | null;
  numero_emenda_parlamentar_plano_acao: string | null;
  codigo_emenda_parlamentar_formatado_plano_acao: string | null;
  link_plano_acao: string | null;
  valor_custeio_plano_acao: number | null;
  valor_investimento_plano_acao: number | null;
  valor_total_plano_acao: number | null;
};

export type PlanoAcaoDetalhesPortalItem = {
  id_plano_acao: number;
  finalidade: string | null;
  detalhamento_objeto: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  saldo_conta_corrente: number | null;
};

type QlikCell = {
  qText?: string;
  qNum?: number;
};

type QlikRow = QlikCell[];

type PortalSession = {
  fetchPlanosByCnpj: (cnpjDigits: string) => Promise<PlanoAcaoEspecialPortalItem[]>;
  fetchPlanoAcaoDetalhes: (planoAcaoId: number) => Promise<PlanoAcaoDetalhesPortalItem>;
};

const ESPECIAIS_PANEL_URL = "https://dd-publico.serpro.gov.br/extensions/especiais/especiais.html";
const PLANO_ACAO_TABLE_OBJECT_ID = "Ptwq";
const TABLE_FETCH_PAGE_SIZE = 500;

export function isPlaywrightUnavailableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    /playwright/i.test(message) &&
    /(install|browser|executable|chromium|download)/i.test(message)
  );
}

function normalizeDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function toNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const text = value.trim();
  return text === "" || text === "-" ? null : text;
}

function toNullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function mapRowToPlanoAcaoItem(row: QlikRow, columnIndexByTitle: Map<string, number>) {
  const getCell = (title: string) => {
    const index = columnIndexByTitle.get(title);
    return index === undefined ? undefined : row[index];
  };
  const getText = (title: string) => toNullableText(getCell(title)?.qText);
  const getNumber = (title: string) => {
    const cell = getCell(title);
    if (typeof cell?.qNum === "number" && Number.isFinite(cell.qNum)) {
      return cell.qNum;
    }
    return toNullableNumber(cell?.qText);
  };

  return {
    ano_plano_acao: getNumber("Ano Plano Ação"),
    codigo_plano_acao: getText("Código Plano Ação") ?? "",
    link_plano_acao: getText("Link Plano Ação"),
    situacao_plano_acao: getText("Situação Plano Ação"),
    situacao_plano_trabalho: getText("Situação Plano Trabalho"),
    uf_beneficiario_plano_acao: getText("UF Beneficiário"),
    nome_beneficiario_plano_acao: getText("Nome Beneficiário"),
    cnpj_beneficiario_plano_acao: normalizeDigits(getText("CNPJ Beneficiário")),
    nome_parlamentar_emenda_plano_acao: getText("Nome Parlamentar Plano Ação"),
    ano_emenda_parlamentar_plano_acao: getNumber("Ano Emenda Parlamentar Plano Ação"),
    numero_emenda_parlamentar_plano_acao: getText("Número Emenda Parlamentar Plano Ação"),
    codigo_emenda_parlamentar_formatado_plano_acao: getText("Código Emenda Parlamentar Formatado Plano Ação"),
    valor_custeio_plano_acao: getNumber("Valor Custeio"),
    valor_investimento_plano_acao: getNumber("Valor Investimento"),
    valor_total_plano_acao: getNumber("Valor Total Plano de Ação")
  };
}

async function createPortalSession(page: Page): Promise<PortalSession> {
  await page.goto(ESPECIAIS_PANEL_URL, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(() => typeof (window as typeof window & { app?: unknown }).app !== "undefined", {
    timeout: 120000
  });

  return {
    fetchPlanosByCnpj: async (cnpjDigits: string) => {
      const payload = (await page.evaluate(
        async ({ normalizedCnpj, objectId, fetchPageSize }) => {
          const app = (window as typeof window & { app: any }).app;
          await app.clearAll();
          const selected = await app.field("CNPJ_BENEFICIARIO").selectMatch(normalizedCnpj, false);
          if (!selected) {
            return { titles: [] as string[], rows: [] as QlikRow[] };
          }

          const model = await app.getObject("gestconv-sync-especiais", objectId);
          const layout = await model.getLayout();
          const hyperCube = layout.qHyperCube ?? {};
          const dimensionTitles = (hyperCube.qDimensionInfo ?? []).map((item: { qFallbackTitle?: string }) => item.qFallbackTitle ?? "");
          const measureTitles = (hyperCube.qMeasureInfo ?? []).map((item: { qFallbackTitle?: string }) => item.qFallbackTitle ?? "");
          const titles = [...dimensionTitles, ...measureTitles];
          const qcx = Number(hyperCube.qSize?.qcx ?? titles.length ?? 0);
          const qcy = Number(hyperCube.qSize?.qcy ?? 0);
          const rows: QlikRow[] = [];

          for (let qTop = 0; qTop < qcy; qTop += fetchPageSize) {
            const pages = await model.getHyperCubeData("/qHyperCubeDef", [
              {
                qTop,
                qLeft: 0,
                qWidth: qcx,
                qHeight: Math.min(fetchPageSize, qcy - qTop)
              }
            ]);
            const matrix = pages?.[0]?.qMatrix ?? [];
            rows.push(...matrix);
          }

          return { titles, rows };
        },
        {
          normalizedCnpj: cnpjDigits,
          objectId: PLANO_ACAO_TABLE_OBJECT_ID,
          fetchPageSize: TABLE_FETCH_PAGE_SIZE
        }
      )) as { titles: string[]; rows: QlikRow[] };

      const titles = Array.isArray(payload.titles) ? payload.titles : [];
      const qRows = Array.isArray(payload.rows) ? payload.rows : [];
      const columnIndexByTitle = new Map<string, number>();
      titles.forEach((title: string, index: number) => columnIndexByTitle.set(title, index));

      return qRows
        .map((row: QlikRow) => mapRowToPlanoAcaoItem(row, columnIndexByTitle))
        .filter(
          (item: PlanoAcaoEspecialPortalItem) =>
            item.codigo_plano_acao && normalizeDigits(item.cnpj_beneficiario_plano_acao) === cnpjDigits
        );
    },
    fetchPlanoAcaoDetalhes: async (planoAcaoId: number) => {
      // 1. Buscar dados básicos (finalidade + dados bancários)
      const dadosBasicosUrl = `https://especiais.transferegov.sistema.gov.br/transferencia-especial/plano-acao/detalhe/${planoAcaoId}/dados-basicos`;
      await page.goto(dadosBasicosUrl, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(2000);
      
      const basicData = await page.evaluate(() => {
        const text = document.body.innerText;
        
        // Finalidades - procurar após "Ações" no bloco de Finalidades
        const finalidadeMatch = text.match(/Finalidades[\s\S]*?Ações[\s\n]*([^\n]+)/i);
        const finalidade = finalidadeMatch && finalidadeMatch[1] ? finalidadeMatch[1].trim() : null;
        
        // Dados bancários - buscar pelos valores dos inputs renderizados
        const inputValues = Array.from(document.querySelectorAll("input"))
          .map((input) => input.value?.trim() || "")
          .filter((value) => value.length > 0);

        let banco: string | null = null;
        let agencia: string | null = null;
        let conta: string | null = null;

        for (const value of inputValues) {
          if (!banco && /^\d{3}\s*-\s*.+/.test(value)) {
            banco = value;
            continue;
          }
          if (!agencia && /^\d{3,6}-\d{1,2}$/.test(value)) {
            agencia = value;
            continue;
          }
          if (!conta && /^\d{5,}-\d{1,2}$/.test(value)) {
            conta = value;
            continue;
          }
        }
        
        return { finalidade, banco, agencia, conta };
      });
      
      console.log(`  [Plano ${planoAcaoId}] Finalidade: ${basicData.finalidade || 'não encontrada'}`);
      console.log(`  [Plano ${planoAcaoId}] Banco: ${basicData.banco || 'não encontrado'}`);
      console.log(`  [Plano ${planoAcaoId}] Agência: ${basicData.agencia || 'não encontrada'}`);
      console.log(`  [Plano ${planoAcaoId}] Conta: ${basicData.conta || 'não encontrada'}`);
      
      // 2. Buscar plano-trabalho (detalhamento do objeto)
      const planoTrabalhoUrl = `https://especiais.transferegov.sistema.gov.br/transferencia-especial/plano-acao/detalhe/${planoAcaoId}/plano-trabalho`;
      await page.goto(planoTrabalhoUrl, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(2000);
      
      const planoTrabalhoData = await page.evaluate(() => {
        const text = document.body.innerText;
        let detalhamento_objeto = null;
        
        const idx = text.indexOf('Lista de Executores');
        if (idx >= 0) {
          const afterList = text.substring(idx);
          const lines = afterList.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\s*-\s*\w/)) {
              if (i + 1 < lines.length) {
                const detailLine = lines[i + 1].trim();
                if (detailLine && detailLine.length > 10 && !detailLine.startsWith('R$') && !detailLine.includes('Ações')) {
                  detalhamento_objeto = detailLine.substring(0, 500);
                  break;
                }
              }
            }
          }
        }
        
        return { detalhamento_objeto };
      });
      
      console.log(`  [Plano ${planoAcaoId}] Detalhamento do Objeto: ${planoTrabalhoData.detalhamento_objeto || 'não encontrado'}`);
      
// 3. Buscar extrato bancário (saldo)
      const extratoUrl = `https://especiais.transferegov.sistema.gov.br/transferencia-especial/plano-acao/detalhe/${planoAcaoId}/extrato-bancario`;
      await page.goto(extratoUrl, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(2000);
      
      const extratoData = await page.evaluate(() => {
        const text = document.body.innerText;

        const saldoPatterns = [
          /Saldo em conta corrente[^\n]*\n\s*R\$\s*([\-\d.,]+)/i,
          /Saldo em conta corrente[\s\S]{0,180}?R\$\s*([\-\d.,]+)/i,
          /Saldo em conta corrente\s*[:\-]?\s*R\$\s*([\-\d.,]+)/i
        ];

        let saldo: number | null = null;

        for (const pattern of saldoPatterns) {
          const saldoMatch = text.match(pattern);
          if (saldoMatch && saldoMatch[1]) {
            const clean = saldoMatch[1].replace(/\./g, "").replace(",", ".").trim();
            const num = parseFloat(clean);
            if (!Number.isNaN(num) && Number.isFinite(num)) {
              saldo = num;
              break;
            }
          }
        }

        return { saldo_conta_corrente: saldo };
      });
      
      console.log(`  [Plano ${planoAcaoId}] Saldo: ${extratoData.saldo_conta_corrente !== null ? extratoData.saldo_conta_corrente : 'não encontrado'}`);
      
      return {
        id_plano_acao: planoAcaoId,
        finalidade: basicData.finalidade,
        detalhamento_objeto: planoTrabalhoData.detalhamento_objeto,
        banco: basicData.banco,
        agencia: basicData.agencia,
        conta: basicData.conta,
        saldo_conta_corrente: extratoData.saldo_conta_corrente
      };
    }
  };
}

export async function withTransferenciasEspeciaisPortalSession<T>(
  callback: (session: PortalSession) => Promise<T>
): Promise<T> {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      locale: "pt-BR",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    });
    const session = await createPortalSession(page);
    return await callback(session);
  } finally {
    await browser?.close();
  }
}
