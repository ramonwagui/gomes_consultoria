import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    locale: "pt-BR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  });

  const planoId = 11615;
  const url = `https://especiais.transferegov.sistema.gov.br/transferencia-especial/plano-acao/detalhe/${planoId}/extrato-bancario`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    const text = document.body.innerText;
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    const relevant = lines.filter(
      (line) =>
        /saldo|investimento|conta corrente|R\$|movimenta/i.test(line)
    );
    return { text, relevant };
  });

  console.log("=== LINHAS RELEVANTES ===");
  for (const line of result.relevant) {
    console.log(line);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
