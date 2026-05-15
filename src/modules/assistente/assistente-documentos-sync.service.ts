import { DocumentoAreaStatus, DocumentoSearchStatus } from "@prisma/client";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { type KnowledgeChunkInput, upsertKnowledgeChunks } from "./assistente-pgvector.service";

const chunkText = (value: string, maxSize = 500) => {
  const text = value.trim();
  if (!text) {
    return [] as string[];
  }
  const slices: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const end = Math.min(text.length, cursor + maxSize);
    slices.push(text.slice(cursor, end).trim());
    if (end === text.length) {
      break;
    }
    cursor = Math.max(0, end - 120);
  }
  return slices.filter((item) => item.length > 0);
};

const buildDocumentoChunksByIds = async (documentoIds: number[]): Promise<KnowledgeChunkInput[]> => {
  if (documentoIds.length === 0) {
    return [];
  }

  const items = await prisma.documentoArea.findMany({
    where: {
      id: { in: documentoIds },
      status: DocumentoAreaStatus.ATIVO
    },
    select: {
      id: true,
      nomeOriginal: true,
      nomeAtual: true,
      origem: true,
      mimeType: true,
      createdAt: true,
      instrumentId: true,
      conveneteId: true,
      instrument: { select: { proposta: true, instrumento: true } },
      convenete: { select: { nome: true, cidade: true, uf: true, cnpj: true } },
      searchIndex: { select: { status: true, textoExtraido: true } }
    }
  });

  const chunks: KnowledgeChunkInput[] = [];
  for (const item of items) {
    const extractedText = item.searchIndex?.textoExtraido?.trim() ?? "";
    const hasIndexedText = item.searchIndex?.status === DocumentoSearchStatus.INDEXADO && extractedText.length > 0;
    const content = hasIndexedText
      ? extractedText
      : [
          `Documento ${item.nomeAtual}.`,
          item.nomeOriginal !== item.nomeAtual ? `Nome original: ${item.nomeOriginal}.` : "",
          `Origem: ${item.origem}.`,
          `Data upload: ${item.createdAt.toISOString().slice(0, 10)}.`,
          item.instrument
            ? `Instrumento relacionado: ${item.instrument.instrumento}, proposta ${item.instrument.proposta}.`
            : "",
          item.convenete
            ? `Proponente relacionado: ${item.convenete.nome}, ${item.convenete.cidade ?? ""}/${item.convenete.uf ?? ""}, CNPJ ${item.convenete.cnpj ?? ""}.`
            : ""
        ]
          .filter(Boolean)
          .join(" ");

    for (const [index, chunk] of chunkText(content).entries()) {
      chunks.push({
        entityType: "documento",
        entityId: String(item.id),
        sourceTable: "DocumentoArea",
        sourceField: hasIndexedText ? `textoExtraido:${index}` : `resumo:${index}`,
        chunkText: chunk,
        metadata: {
          nome_atual: item.nomeAtual,
          nome_original: item.nomeOriginal,
          origem: item.origem,
          mime_type: item.mimeType ?? null,
          data_upload: item.createdAt.toISOString(),
          instrument_id: item.instrumentId,
          convenete_id: item.conveneteId,
          proposta: item.instrument?.proposta ?? null,
          instrumento: item.instrument?.instrumento ?? null,
          proponente_nome: item.convenete?.nome ?? null,
          cidade: item.convenete?.cidade ?? null,
          uf: item.convenete?.uf ?? null,
          cnpj: item.convenete?.cnpj ?? null,
          index_status: item.searchIndex?.status ?? null
        }
      });
    }
  }

  return chunks;
};

export const syncDocumentoKnowledgeByIds = async (documentoIds: number[]) => {
  const uniqueIds = [...new Set(documentoIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (uniqueIds.length === 0) {
    return { synced: 0, skipped: true as const, reason: "no_ids" as const };
  }
  if (!env.assistentePgvectorEnabled || !env.assistentePgvectorDatabaseUrl) {
    return { synced: 0, skipped: true as const, reason: "pgvector_disabled" as const };
  }

  const chunks = await buildDocumentoChunksByIds(uniqueIds);
  if (chunks.length === 0) {
    return { synced: 0, skipped: true as const, reason: "no_chunks" as const };
  }

  const result = await upsertKnowledgeChunks(chunks);
  return { synced: result.inserted, skipped: false as const };
};
