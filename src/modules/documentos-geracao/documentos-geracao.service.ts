import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import mammoth from "mammoth";
import { chromium } from "playwright";
import { putDocumentObject, getDocumentObjectBuffer } from "../../lib/storage/r2-storage";

function generateObjectKey(prefix: string, filename: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = filename.split(".").pop() || "bin";
  const name = filename.replace(/\.[^/.]+$/, "");
  const safeName = name.replace(/[^a-zA-Z0-9-_]/g, "_");
  return `${prefix}/${year}/${month}/${Date.now()}-${safeName}.${ext}`;
}

export { generateObjectKey };

export function extractPlaceholdersFromDocx(buffer: Buffer): string[] {
  try {
    const zip = new PizZip(buffer);
    const doc = new Docxtemplater(zip, { 
      paragraphLoop: true, 
      linebreaks: true,
      delimiters: { start: "[", end: "]" }
    });

    const text = doc.getFullText();
    const regex = /\[([A-Z_]+)\]/g;
    const placeholders = new Set<string>();

    let match;
    while ((match = regex.exec(text)) !== null) {
      placeholders.add(match[1]);
    }

    return Array.from(placeholders).sort();
  } catch (error) {
    console.error("[documentos-geracao] Error extracting placeholders:", error);
    return [];
  }
}

export async function mergeTimbreWithTemplate(
  templateBuffer: Buffer,
  timbreBuffer: Buffer | null
): Promise<Buffer> {
  if (!timbreBuffer) {
    return templateBuffer;
  }

  try {
    const templateZip = new PizZip(templateBuffer);
    const timbreZip = new PizZip(timbreBuffer);

    const timbreFiles = timbreZip.files;
    const headerFiles: string[] = [];
    const footerFiles: string[] = [];
    const relFiles: string[] = [];

    for (const [name, file] of Object.entries(timbreFiles)) {
      if (file.dir) continue;
      
      const lowerName = name.toLowerCase();
      if (lowerName.startsWith("word/header") && lowerName.endsWith(".xml")) {
        headerFiles.push(name);
      } else if (lowerName.startsWith("word/footer") && lowerName.endsWith(".xml")) {
        footerFiles.push(name);
      } else if (lowerName.startsWith("word/_rels/") && lowerName.endsWith(".xml")) {
        relFiles.push(name);
      }
    }

    for (const headerFile of headerFiles) {
      const content = timbreZip.file(headerFile)?.asText();
      if (content) {
        const newName = `word/timbre_${headerFile.replace("word/", "")}`;
        templateZip.file(newName, content);
      }
    }

    for (const footerFile of footerFiles) {
      const content = timbreZip.file(footerFile)?.asText();
      if (content) {
        const newName = `word/timbre_${footerFile.replace("word/", "")}`;
        templateZip.file(newName, content);
      }
    }

    for (const relFile of relFiles) {
      const content = timbreZip.file(relFile)?.asText();
      if (content) {
        const newName = `word/_rels/timbre_${relFile.replace("word/_rels/", "").replace(".xml", "")}.xml.rels`;
        templateZip.file(newName, content);
      }
    }

    console.log("[documentos-geracao] Merged timbre with template. Headers:", headerFiles.length, "Footers:", footerFiles.length);

    return templateZip.generate({
      type: "nodebuffer",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
  } catch (error) {
    console.error("[documentos-geracao] Error merging timbre:", error);
    return templateBuffer;
  }
}

export function generateDocument(
  docxBuffer: Buffer, 
  substitutions: Record<string, string>,
  timbreBuffer: Buffer | null = null
): Buffer {
  let bufferToUse = docxBuffer;
  
  if (timbreBuffer) {
    console.log("[documentos-geracao] Applying timbre to document...");
    bufferToUse = mergeTimbreWithTemplateSync(docxBuffer, timbreBuffer);
    console.log("[documentos-geracao] Timbre applied, generating final document");
  }
  
  const zip = new PizZip(bufferToUse);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "[", end: "]" }
  });

  doc.render(substitutions);

  return doc.getZip().generate({
    type: "nodebuffer",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
}

function mergeTimbreWithTemplateSync(templateBuffer: Buffer, timbreBuffer: Buffer): Buffer {
  try {
    const templateZip = new PizZip(templateBuffer);
    const timbreZip = new PizZip(timbreBuffer);

    const timbreFiles = timbreZip.files;
    let headerCount = 0;
    let footerCount = 0;
    const newHeaderFiles: string[] = [];
    const newFooterFiles: string[] = [];

    for (const [name, file] of Object.entries(timbreFiles)) {
      if (file.dir) continue;
      
      const lowerName = name.toLowerCase();
      if (lowerName.startsWith("word/header") && lowerName.endsWith(".xml")) {
        const content = file.asText();
        const fileName = name.replace("word/", "");
        const newName = `word/timbre_${fileName}`;
        templateZip.file(newName, content);
        newHeaderFiles.push(newName);
        headerCount++;
        console.log(`[documentos-geracao] Added header: ${newName}`);
      } else if (lowerName.startsWith("word/footer") && lowerName.endsWith(".xml")) {
        const content = file.asText();
        const fileName = name.replace("word/", "");
        const newName = `word/timbre_${fileName}`;
        templateZip.file(newName, content);
        newFooterFiles.push(newName);
        footerCount++;
        console.log(`[documentos-geracao] Added footer: ${newName}`);
      }
    }

    if (headerCount === 0 && footerCount === 0) {
      console.log("[documentos-geracao] No headers/footers found in timbre, returning template as-is");
      return templateBuffer;
    }

    console.log(`[documentos-geracao] Merge result: ${headerCount} headers, ${footerCount} footers added`);

    const docxContent = templateZip.generate({
      type: "nodebuffer",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });

    return docxContent;
  } catch (error) {
    console.error("[documentos-geracao] Error merging timbre sync:", error);
    return templateBuffer;
  }
}

export async function convertDocxToPdf(docxBuffer: Buffer, timbreImageUrl?: string): Promise<Buffer> {
  let browser = null;
  
  try {
    console.log("[documentos-geracao] Converting to PDF, docx size:", docxBuffer.length);
    
    console.log("[documentos-geracao] Launching browser...");
    browser = await chromium.launch({ headless: true });
    console.log("[documentos-geracao] Browser launched");
    
    const page = await browser.newPage();
    console.log("[documentos-geracao] Page created");
    
    const result = await mammoth.convertToHtml({ buffer: docxBuffer });
    const htmlContent = result.value;
    console.log("[documentos-geracao] HTML converted, length:", htmlContent.length);

    const headerHtml = timbreImageUrl 
      ? `<div style="text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #ccc;">
           <img src="${timbreImageUrl}" alt="Timbre" style="max-width: 300px; max-height: 100px;" />
         </div>`
      : "";

    const pdfHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; font-size: 12px; line-height: 1.6; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    h1, h2, h3 { margin-top: 20px; }
  </style>
</head>
<body>
${headerHtml}
${htmlContent}
</body>
</html>`;

    await page.setContent(pdfHtml, { waitUntil: "networkidle" });
    console.log("[documentos-geracao] Content set, generating PDF...");
    
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" }
    });
    console.log("[documentos-geracao] PDF generated, size:", pdfBuffer.length);
    
    await browser.close();
    console.log("[documentos-geracao] Browser closed, returning PDF");
    
    return Buffer.from(pdfBuffer);
  } catch (error: any) {
    console.error("[documentos-geracao] Error converting to PDF with Playwright:", error.message, error.stack);
    if (browser) await browser.close().catch(() => {});
    return docxBuffer;
  }
}