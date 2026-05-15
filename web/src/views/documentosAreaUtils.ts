import type { DocumentoExternalRequestItem } from "../types";

export const formatFileSize = (size: number) => {
  if (size < 1024) {
    return `${size} B`;
  }
  const kb = size / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const renderSnippetHtml = (value: string) => {
  return escapeHtml(value)
    .replace(/&lt;mark&gt;/g, "<mark>")
    .replace(/&lt;\/mark&gt;/g, "</mark>");
};

export const getDocumentoExternalStatusLabel = (status: string, link?: DocumentoExternalRequestItem) => {
  if (link) {
    if (link.status === "DESATIVADO") return "Cancelada";
    if (link.status === "EXPIRADO") return "Expirada";
    if (link.status === "ENVIO_REALIZADO") return "Recebida";
    if (link.usos_restantes <= 0) return "Limite atingido";
    if (link.documentos_recebidos > 0 && link.permitir_reenvio) return "Recebida parcialmente";
    if (link.envios === 0) return "Aguardando documentos";
    return "Aberta";
  }
  const labels: Record<string, string> = {
    ATIVO: "Ativo",
    EXCLUIDO: "Excluido",
    EXPIRADO: "Expirada",
    ENVIO_REALIZADO: "Recebida",
    DESATIVADO: "Cancelada"
  };
  return labels[status] ?? status;
};

export const toExternalPublicUrl = (value: string, apiBaseUrl: string, origin: string) => {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return new URL(`${apiBaseUrl}${value}`, origin).toString();
};

export const toDatetimeLocalValue = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};
