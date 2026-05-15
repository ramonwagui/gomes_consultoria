import { DocumentoAreaStatus, DocumentoSearchStatus, PrismaClient } from "@prisma/client";

import {
  bootstrapPgvectorSchema,
  closePgvectorPool,
  type KnowledgeChunkInput,
  upsertKnowledgeChunks
} from "../modules/assistente/assistente-pgvector.service";

const prisma = new PrismaClient();

const chunkText = (value: string, maxSize = 850) => {
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

const buildInstrumentChunks = async (): Promise<KnowledgeChunkInput[]> => {
  const items = await prisma.instrumentProposal.findMany({
    where: { ativo: true },
    select: {
      id: true,
      proposta: true,
      instrumento: true,
      objeto: true,
      status: true,
      vigenciaInicio: true,
      vigenciaFim: true,
      valorRepasse: true,
      valorContrapartida: true,
      valorJaRepassado: true,
      convenete: {
        select: {
          nome: true,
          cidade: true,
          uf: true
        }
      }
    }
  });

  const chunks: KnowledgeChunkInput[] = [];
  for (const item of items) {
    const summary = [
      `Proposta ${item.proposta}.`,
      `Instrumento ${item.instrumento}.`,
      `Objeto: ${item.objeto}.`,
      `Status: ${item.status}.`,
      `Vigencia: ${item.vigenciaInicio.toISOString().slice(0, 10)} ate ${item.vigenciaFim.toISOString().slice(0, 10)}.`,
      `Convenente: ${item.convenete?.nome ?? "Nao informado"}, ${item.convenete?.cidade ?? ""}/${item.convenete?.uf ?? ""}.`,
      `Valor repasse: ${item.valorRepasse.toString()}. Valor contrapartida: ${item.valorContrapartida.toString()}.`,
      `Valor ja repassado: ${item.valorJaRepassado.toString()}.`
    ].join(" ");

    for (const [index, chunk] of chunkText(summary).entries()) {
      chunks.push({
        entityType: "instrumento",
        entityId: String(item.id),
        sourceTable: "InstrumentProposal",
        sourceField: `summary:${index}`,
        chunkText: chunk,
        metadata: {
          proposta: item.proposta,
          instrumento: item.instrumento,
          status: item.status,
          cidade: item.convenete?.cidade ?? null,
          uf: item.convenete?.uf ?? null
        }
      });
    }
  }

  return chunks;
};

const buildTicketChunks = async (): Promise<KnowledgeChunkInput[]> => {
  const items = await prisma.ticket.findMany({
    select: {
      id: true,
      codigo: true,
      titulo: true,
      descricao: true,
      status: true,
      prioridade: true,
      prazoAlvo: true,
      instrument: {
        select: {
          id: true,
          proposta: true,
          instrumento: true,
          convenete: {
            select: {
              cidade: true,
              uf: true
            }
          }
        }
      }
    }
  });

  return items.map((item) => ({
    entityType: "ticket",
    entityId: String(item.id),
    sourceTable: "Ticket",
    sourceField: "summary",
    chunkText: [
      `Ticket ${item.codigo}: ${item.titulo}.`,
      item.descricao ? `Descricao: ${item.descricao}.` : "",
      `Status ${item.status} e prioridade ${item.prioridade}.`,
      item.prazoAlvo ? `Prazo alvo ${item.prazoAlvo.toISOString().slice(0, 10)}.` : "",
      item.instrument
        ? `Relacionado ao instrumento ${item.instrument.instrumento} proposta ${item.instrument.proposta} no municipio ${item.instrument.convenete?.cidade ?? ""}/${item.instrument.convenete?.uf ?? ""}.`
        : ""
    ]
      .filter(Boolean)
      .join(" "),
    metadata: {
      codigo: item.codigo,
      status: item.status,
      prioridade: item.prioridade
    }
  }));
};

const buildDocumentoChunks = async (): Promise<KnowledgeChunkInput[]> => {
  const items = await prisma.documentoArea.findMany({
    where: { status: DocumentoAreaStatus.ATIVO },
    select: {
      id: true,
      nomeOriginal: true,
      nomeAtual: true,
      origem: true,
      mimeType: true,
      createdAt: true,
      instrumentId: true,
      conveneteId: true,
      instrument: {
        select: {
          proposta: true,
          instrumento: true
        }
      },
      convenete: {
        select: {
          nome: true,
          cidade: true,
          uf: true,
          cnpj: true
        }
      },
      searchIndex: {
        select: {
          status: true,
          textoExtraido: true
        }
      }
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

    for (const [index, chunk] of chunkText(content, 500).entries()) {
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

const main = async () => {
  await bootstrapPgvectorSchema();

  const [instrumentChunks, ticketChunks, documentoChunks] = await Promise.all([
    buildInstrumentChunks(),
    buildTicketChunks(),
    buildDocumentoChunks()
  ]);

  const allChunks = [...instrumentChunks, ...ticketChunks, ...documentoChunks];
  if (allChunks.length === 0) {
    console.log("Nenhum chunk encontrado para sincronizacao.");
    return;
  }

  console.log(
    `Chunks preparados: instrumentos=${instrumentChunks.length}, tickets=${ticketChunks.length}, documentos=${documentoChunks.length}.`
  );

  const batchSize = 100;
  let inserted = 0;
  for (let cursor = 0; cursor < allChunks.length; cursor += batchSize) {
    const batch = allChunks.slice(cursor, cursor + batchSize);
    const result = await upsertKnowledgeChunks(batch);
    inserted += result.inserted;
    console.log(`Sincronizados ${Math.min(cursor + batch.length, allChunks.length)}/${allChunks.length} chunks...`);
  }

  console.log(`Sincronizacao concluida. Total de chunks enviados: ${inserted}.`);
};

main()
  .catch((error) => {
    console.error("Falha na sincronizacao pgvector:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await closePgvectorPool();
  });
