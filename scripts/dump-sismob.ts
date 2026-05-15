
import { chromium } from "playwright";
import * as fs from "fs";

async function dumpHtml() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto("https://sismobcidadao.saude.gov.br/", { waitUntil: "networkidle" });
    const content = await page.content();
    fs.writeFileSync("sismob_page.html", content);
    console.log("HTML dumped to sismob_page.html");
  } finally {
    await browser.close();
  }
}
dumpHtml();
