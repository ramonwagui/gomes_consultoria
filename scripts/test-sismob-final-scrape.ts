
import { chromium } from "playwright";

async function scrapeSismobFinal(uf: string, municipio: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto("https://sismobcidadao.saude.gov.br/", { waitUntil: "networkidle" });
    console.log("Page loaded.");

    // O primeiro input geralmente é a UF (baseado na ordem visual)
    await page.click("text=UF"); // Clica no label ou perto
    await page.keyboard.type(uf);
    await page.keyboard.press("Enter");
    console.log("UF typed.");

    await page.waitForTimeout(1000);

    // O segundo input é o Município
    await page.click("text=Município");
    await page.keyboard.type(municipio);
    await page.waitForTimeout(1500); // Espera sugestões
    await page.keyboard.press("Enter");
    console.log("Municipio typed.");

    await page.click("button:has-text('PESQUISAR')");
    console.log("Search clicked.");

    // Aguarda resultados
    await page.waitForTimeout(3000);
    
    // Tenta pegar os dados da tabela que deve ter aparecido
    const data = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll("table tbody tr"));
        return rows.map(tr => Array.from(tr.querySelectorAll("td")).map(td => (td as HTMLElement).innerText.trim()));
    });

    console.log("Extracted:", JSON.stringify(data, null, 2));

  } finally {
    await browser.close();
  }
}

scrapeSismobFinal("PE", "Inajá");
