import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { unzipSync } from "fflate";
import path from "path";

import { env } from "../../config/env";

export const allowedDocumentoMimes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg"
]);

export const normalizeFileName = (name: string) => {
  const trimmed = (name || "").trim();
  if (trimmed.length === 0) {
    return "arquivo";
  }

  const looksLikeMojibake = /[ÃÂ]|\uFFFD/.test(trimmed);
  if (!looksLikeMojibake) {
    return trimmed;
  }

  try {
    const decoded = Buffer.from(trimmed, "latin1").toString("utf8").trim();
    return decoded && !decoded.includes("\uFFFD") ? decoded : trimmed;
  } catch {
    return trimmed;
  }
};

export const sanitizeDownloadName = (name: string) => {
  return normalizeFileName(name).replace(/[\\/:*?"<>|]/g, "_");
};

const allowedExtensionsByMime: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"]
};

const hasSignature = (buffer: Buffer, signature: number[]) =>
  buffer.length >= signature.length && signature.every((value, index) => buffer[index] === value);

const isZipBuffer = (buffer: Buffer) =>
  hasSignature(buffer, [0x50, 0x4b, 0x03, 0x04]) ||
  hasSignature(buffer, [0x50, 0x4b, 0x05, 0x06]) ||
  hasSignature(buffer, [0x50, 0x4b, 0x07, 0x08]);

const detectMimeByMagicBytes = (buffer: Buffer): string | null => {
  if (hasSignature(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return "application/pdf";
  }
  if (hasSignature(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (hasSignature(buffer, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  if (!isZipBuffer(buffer)) {
    return null;
  }

  try {
    const entries = unzipSync(new Uint8Array(buffer));
    const entryNames = Object.keys(entries);
    if (entryNames.includes("word/document.xml")) {
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }
    if (entryNames.includes("xl/workbook.xml")) {
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }
  } catch {
    return null;
  }

  return null;
};

export const validateUploadedFileName = (originalName: string) => {
  const normalized = normalizeFileName(originalName);
  if (!normalized || normalized.trim().length === 0) {
    return false;
  }
  if (normalized.includes("..")) {
    return false;
  }
  if (normalized.includes("/") || normalized.includes("\\")) {
    return false;
  }
  if (/[\u0000-\u001f]/.test(normalized)) {
    return false;
  }
  return true;
};

export const validateDocumentoFileIntegrity = (file: { originalname: string; mimetype: string; buffer: Buffer }) => {
  const detectedMime = detectMimeByMagicBytes(file.buffer);
  if (!detectedMime || !allowedDocumentoMimes.has(detectedMime)) {
    throw new Error("INVALID_FILE_SIGNATURE");
  }

  const normalizedName = normalizeFileName(file.originalname);
  const extension = path.extname(normalizedName).toLowerCase();
  const allowedExtensions = allowedExtensionsByMime[detectedMime] ?? [];

  if (!extension || !allowedExtensions.includes(extension)) {
    throw new Error("EXTENSION_MISMATCH");
  }

  if (file.mimetype && file.mimetype !== detectedMime) {
    throw new Error("MIME_MISMATCH");
  }

  return detectedMime;
};

const collapseText = (value: string) => value.replace(/\s+/g, " ").trim();

const isImageMime = (mimeType: string) => mimeType === "image/png" || mimeType === "image/jpeg";

type OcrSpaceResponse = {
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
  ErrorDetails?: string;
  ParsedResults?: Array<{
    ParsedText?: string;
    ErrorMessage?: string;
    ErrorDetails?: string;
  }>;
};

const getOcrErrorMessage = (payload: OcrSpaceResponse) => {
  const errorMessage = Array.isArray(payload.ErrorMessage)
    ? payload.ErrorMessage.filter(Boolean).join("; ")
    : payload.ErrorMessage;
  return errorMessage || payload.ErrorDetails || payload.ParsedResults?.find((item) => item.ErrorMessage)?.ErrorMessage || "Falha ao executar OCR.";
};

const extractTextWithOcrSpace = async (file: { buffer: Buffer; mimetype: string }) => {
  if (!env.aiDocumentOcrEnabled) {
    throw new Error("OCR desabilitado. Configure AI_DOCUMENT_OCR_ENABLED=true para indexar imagens ou PDFs escaneados.");
  }
  if (!env.ocrSpaceApiKey.trim()) {
    throw new Error("OCR sem chave configurada. Configure OCR_SPACE_API_KEY para indexar imagens ou PDFs escaneados.");
  }

  const form = new FormData();
  const bytes = new Uint8Array(file.buffer);
  const blob = new Blob([bytes], { type: file.mimetype });
  const extension = file.mimetype === "application/pdf" ? "pdf" : file.mimetype === "image/png" ? "png" : "jpg";
  form.append("file", blob, `documento.${extension}`);
  form.append("language", env.ocrSpaceLanguage || "por");
  form.append("isOverlayRequired", "false");
  form.append("scale", "true");
  form.append("OCREngine", "2");

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: {
      apikey: env.ocrSpaceApiKey
    },
    body: form
  });

  const payload = (await response.json().catch(() => ({}))) as OcrSpaceResponse;
  if (!response.ok || payload.IsErroredOnProcessing) {
    throw new Error(getOcrErrorMessage(payload));
  }

  const text = (payload.ParsedResults ?? []).map((item) => item.ParsedText ?? "").join("\n");
  return collapseText(text);
};

export const extractDocumentoText = async (file: { buffer: Buffer; mimetype: string }) => {
  if (file.mimetype === "application/pdf") {
    const pdfParseModule = await import("pdf-parse");
    if (typeof (pdfParseModule as any).PDFParse === "function") {
      const parser = new (pdfParseModule as any).PDFParse({ data: file.buffer });
      try {
        const parsed = await parser.getText();
        const text = collapseText(parsed.text ?? "");
        return text || extractTextWithOcrSpace(file);
      } finally {
        await parser.destroy().catch(() => undefined);
      }
    }
    const pdfParse = ((pdfParseModule as any).default ?? pdfParseModule) as (buffer: Buffer) => Promise<{ text?: string }>;
    const parsed = await pdfParse(file.buffer);
    const text = collapseText(parsed.text ?? "");
    return text || extractTextWithOcrSpace(file);
  }

  if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    return collapseText(parsed.value ?? "");
  }

  if (file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    const workbook = XLSX.read(file.buffer, { type: "buffer", cellDates: true });
    const parts: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        blankrows: false,
        raw: false
      }) as unknown[][];
      parts.push(sheetName);
      for (const row of rows as unknown[][]) {
        parts.push(row.filter((cell) => cell !== null && cell !== undefined).join(" "));
      }
    }
    return collapseText(parts.join(" "));
  }

  if (isImageMime(file.mimetype)) {
    return extractTextWithOcrSpace(file);
  }

  return "";
};

export const onlyCpfDigits = (value: string) => value.replace(/\D/g, "");

export const isValidCpf = (value: string) => {
  const cpf = onlyCpfDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const calcDigit = (base: string, factorStart: number) => {
    let total = 0;
    for (let i = 0; i < base.length; i += 1) {
      total += Number(base[i]) * (factorStart - i);
    }
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const first = calcDigit(cpf.slice(0, 9), 10);
  const second = calcDigit(cpf.slice(0, 10), 11);
  return first === Number(cpf[9]) && second === Number(cpf[10]);
};

export const buildSnippet = (text: string | null | undefined, term: string) => {
  const haystack = collapseText(text ?? "");
  if (!haystack) {
    return "";
  }
  const normalizedTerm = term.trim().toLowerCase();
  const index = haystack.toLowerCase().indexOf(normalizedTerm);
  if (index < 0) {
    return haystack.slice(0, 220);
  }
  const start = Math.max(0, index - 90);
  const end = Math.min(haystack.length, index + normalizedTerm.length + 130);
  return `${start > 0 ? "..." : ""}${haystack.slice(start, end)}${end < haystack.length ? "..." : ""}`;
};
