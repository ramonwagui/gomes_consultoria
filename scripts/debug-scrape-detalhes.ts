import { chromium, type Browser, type Page } from "playwright";

const ESPECIAIS_DETALHES_URL = "https://especiais.transferegov.sistema.gov.br/transferencia-especial/plano-acao/detalhe";

async function testScraping() {
  const planoAcaoId = process.argv[2] || "11615";
  const tab = process.argv[3] || 'dados-basicos';
  const url = `${ESPECIAIS_DETALHES_URL}/${planoAcaoId}/${tab}`;
  
  console.log(`Testing URL: ${url} (tab: ${tab})`);
  
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ 
      headless: true,
      channel: 'chrome'
    });
    const page = await browser.newPage({
      locale: "pt-BR",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    });
    
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    
    const result = await page.evaluate(() => {
      const allText = document.body.innerText;
      
      console.log("Looking for patterns...");
      console.log("Has 'Saldo em conta corrente':", allText.includes("Saldo em conta corrente"));
      console.log("Has 'R$':", allText.includes("R$"));
      
      const data = {
        finalidade: null as string | null,
        detalhamento_objeto: null as string | null,
        banco: null as string | null,
        agencia: null as string | null,
        conta: null as string | null,
        saldo_conta_corrente: null as number | null
      };
      
      const finalidadeMatch = allText.match(/Finalidades\s*Tipo\s*Ações\s*([^\n]+)/i);
      if (finalidadeMatch && finalidadeMatch[1]) {
        data.finalidade = finalidadeMatch[1].trim();
      }
      
      // Try multiple patterns for saldo
      const saldoPatterns = [
        /Saldo em conta corrente[^+]*\+\s*investimentos[^\$]*R\$\s*([\d.,]+)/i,
        /Saldo em conta corrente[^\$]*R\$\s*([\d.,]+)/i,
        /R\$\s*([\d.,]+)\s*$/
      ];
      
      for (const pattern of saldoPatterns) {
        const match = allText.match(pattern);
        if (match && match[1]) {
          const clean = match[1].replace(/\./g, '').replace(',', '.');
          const num = parseFloat(clean);
          if (!isNaN(num) && num > 0) {
            data.saldo_conta_corrente = num;
            console.log("Found saldo with pattern:", pattern.toString(), "value:", num);
            break;
          }
        }
      }
      
      console.log("Data:", JSON.stringify(data));
      return data;
    });
    
    console.log("\n=== RESULT ===");
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
  } finally {
    await browser?.close();
  }
}

testScraping();