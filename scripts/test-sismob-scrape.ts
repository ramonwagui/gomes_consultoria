
import { chromium } from "playwright";

async function scrapeSismob(uf: string, municipio: string) {
  console.log(`Starting scrape for ${uf} - ${municipio}...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  });
  const page = await context.newPage();

  try {
    await page.goto("https://sismobcidadao.saude.gov.br/", { waitUntil: "networkidle" });
    console.log("Page loaded.");

    // Selecionar UF
    await page.selectOption("select[name='uf']", uf);
    console.log("UF selected.");

    // Selecionar Município
    // O select de município pode levar um tempo para carregar após a UF ser selecionada
    await page.waitForTimeout(1000);
    await page.selectOption("select[name='municipio']", { label: municipio.toUpperCase() });
    console.log("Municipio selected.");

    // Clicar em Pesquisar
    await page.click("button:has-text('Pesquisar')");
    console.log("Search clicked.");

    // Esperar a tabela carregar
    await page.waitForSelector("table", { timeout: 10000 });
    console.log("Table loaded.");

    // Extrair dados
    const rows = await page.$$eval("table tbody tr", (trElements) => {
      return trElements.map(tr => {
        const cells = Array.from(tr.querySelectorAll("td")).map(td => td.innerText.trim());
        return cells;
      });
    });

    console.log("Data extracted:", JSON.stringify(rows, null, 2));

  } catch (error) {
    console.error("Scrape failed:", error);
  } finally {
    await browser.close();
  }
}

scrapeSismob("PE", "Inajá");
