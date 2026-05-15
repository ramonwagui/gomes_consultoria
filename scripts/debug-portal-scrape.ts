import { chromium } from "playwright";

async function testBankData() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ 
    locale: "pt-BR", 
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  });

  const planoId = 86297;
  console.log(`=== Testando dados bancários para plano ${planoId} ===\n`);
  
  await page.goto(`https://especiais.transferegov.sistema.gov.br/transferencia-especial/plano-acao/detalhe/${planoId}/dados-basicos`, { 
    waitUntil: "networkidle", 
    timeout: 30000 
  });
  await page.waitForTimeout(3000);

  const data = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll("label"));
    const inputs = Array.from(document.querySelectorAll("input"));
    const selects = Array.from(document.querySelectorAll("select"));

    const allInputs = inputs.map((i, idx) => ({
      idx,
      id: i.id,
      name: i.getAttribute("name"),
      value: i.value,
      placeholder: i.getAttribute("placeholder"),
      className: i.className,
      type: i.type,
      ariaLabel: i.getAttribute("aria-label"),
      dataTestId: i.getAttribute("data-testid")
    }));

    const bankInputCandidates = inputs
      .filter((i) => /banco/i.test(i.id) || /banco/i.test(i.getAttribute("name") || "") || /caixa|banco/i.test(i.value || ""))
      .map((i) => ({ id: i.id, name: i.getAttribute("name"), value: i.value, placeholder: i.getAttribute("placeholder") }));

    const agencyInputCandidates = inputs
      .filter((i) => /agencia|agência/i.test(i.id) || /agencia|agência/i.test(i.getAttribute("name") || ""))
      .map((i) => ({ id: i.id, name: i.getAttribute("name"), value: i.value, placeholder: i.getAttribute("placeholder") }));

    const accountInputCandidates = inputs
      .filter((i) => /conta/i.test(i.id) || /conta/i.test(i.getAttribute("name") || ""))
      .map((i) => ({ id: i.id, name: i.getAttribute("name"), value: i.value, placeholder: i.getAttribute("placeholder") }));

    const labelDump = labels
      .filter((l) => /Banco|Agência|Conta/.test(l.textContent || ""))
      .map((l) => {
        const parent = l.parentElement;
        const siblingInput = parent?.querySelector("input,select");
        return {
          label: (l.textContent || "").trim(),
          parentClass: parent?.className || null,
          siblingValue: siblingInput instanceof HTMLInputElement || siblingInput instanceof HTMLSelectElement
            ? siblingInput.value
            : null,
          siblingPlaceholder: siblingInput instanceof HTMLInputElement
            ? siblingInput.placeholder
            : null,
          parentText: (parent?.textContent || "").trim().slice(0, 220)
        };
      });

    return {
      bankInputCandidates,
      agencyInputCandidates,
      accountInputCandidates,
      labelDump,
      allInputs,
      inputCount: inputs.length,
      selectCount: selects.length
    };
  });
  
  console.log("=== RESULTADO DEBUG ===");
  console.log(JSON.stringify(data, null, 2));
  
  await browser.close();
}

testBankData().catch(console.error);
