
import { chromium } from "playwright";

async function scrapeSismobDebug() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto("https://sismobcidadao.saude.gov.br/", { waitUntil: "networkidle" });
    
    // Tirar um print dos inputs pra ver o que tem
    const inputs = await page.$$eval("input, select, button", (elements) => {
        return elements.map(el => ({
            tag: el.tagName,
            name: el.getAttribute("name"),
            placeholder: el.getAttribute("placeholder"),
            text: (el as any).innerText,
            class: el.getAttribute("class")
        }));
    });
    console.log("Interactive elements:", JSON.stringify(inputs, null, 2));

  } finally {
    await browser.close();
  }
}
scrapeSismobDebug();
