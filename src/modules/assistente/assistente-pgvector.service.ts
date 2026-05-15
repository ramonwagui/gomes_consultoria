import fs from "fs/promises";
import path from "path";
import { createHash } from "crypto";

import OpenAI from "openai";
import { Pool } from "pg";

import { env } from "../../config/env";

export type KnowledgeChunkInput = {
  entityType: string;
  entityId: string;
  sourceTable: string;
  sourceField: string;
  chunkText: string;
  metadata?: Record<string, unknown>;
};

export type HybridSearchResult = {
  entity_type: string;
  entity_id: string;
  source_table: string;
  source_field: string;
  chunk_text: string;
  metadata_json: Record<string, unknown> | null;
  lexical_score: number;
  semantic_score: number;
  final_score: number;
};

let pool: Pool | null = null;

const getPool = () => {
  if (!env.assistentePgvectorDatabaseUrl) {
    return null;
  }
  if (!pool) {
    pool = new Pool({ connectionString: env.assistentePgvectorDatabaseUrl });
  }
  return pool;
};

export const closePgvectorPool = async () => {
  if (!pool) {
    return;
  }
  await pool.end();
  pool = null;
};

const toVectorLiteral = (values: number[]) => `[${values.map((item) => item.toFixed(8)).join(",")}]`;

const getEmbeddingClient = () => {
  if (!env.openaiApiKey) {
    return null;
  }
  return new OpenAI({ apiKey: env.openaiApiKey });
};

export const bootstrapPgvectorSchema = async () => {
  const activePool = getPool();
  if (!activePool) {
    throw new Error("ASSISTENTE_PGVECTOR_DATABASE_URL nao configurada.");
  }

  const sqlPath = path.resolve(process.cwd(), "scripts", "assistente-pgvector-bootstrap.sql");
  const sql = await fs.readFile(sqlPath, "utf8");
  await activePool.query(sql);
};

export const upsertKnowledgeChunks = async (chunks: KnowledgeChunkInput[]) => {
  const activePool = getPool();
  if (!activePool) {
    throw new Error("ASSISTENTE_PGVECTOR_DATABASE_URL nao configurada.");
  }
  if (chunks.length === 0) {
    return { inserted: 0 };
  }

  const embeddingClient = getEmbeddingClient();
  let embeddings: number[][] = [];
  if (embeddingClient && chunks.length > 0) {
    try {
      const response = await embeddingClient.embeddings.create({
        model: env.openaiEmbeddingModel,
        input: chunks.map((item) => item.chunkText)
      });
      embeddings = response.data.map((item) => item.embedding);
    } catch (error) {
      // Keep lexical indexing available when embedding quota/auth temporarily fails.
      // eslint-disable-next-line no-console
      console.warn(
        "[assistente-pgvector] embeddings indisponiveis para este lote; continuando sem vetor:",
        error instanceof Error ? error.message : String(error)
      );
      embeddings = [];
    }
  }

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const embedding = embeddings[index] ? toVectorLiteral(embeddings[index]) : null;
    const chunkHash = createHash("md5").update(chunk.chunkText).digest("hex");

    await activePool.query(
      `
        INSERT INTO knowledge_chunks (
          entity_type,
          entity_id,
          source_table,
          source_field,
          chunk_hash,
          chunk_text,
          metadata_json,
          embedding,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::vector, NOW())
        ON CONFLICT (entity_type, entity_id, source_table, source_field, chunk_hash)
        DO UPDATE SET
          chunk_text = EXCLUDED.chunk_text,
          metadata_json = EXCLUDED.metadata_json,
          embedding = EXCLUDED.embedding,
          updated_at = NOW()
      `,
      [
        chunk.entityType,
        chunk.entityId,
        chunk.sourceTable,
        chunk.sourceField,
        chunkHash,
        chunk.chunkText,
        JSON.stringify(chunk.metadata ?? {}),
        embedding
      ]
    );
  }

  return { inserted: chunks.length };
};

export const hybridSearchKnowledge = async (
  query: string,
  options?: {
    limit?: number;
    entityType?: string;
  }
): Promise<HybridSearchResult[]> => {
  const activePool = getPool();
  if (!activePool || !env.assistentePgvectorEnabled) {
    return [];
  }

  const embeddingClient = getEmbeddingClient();
  if (!embeddingClient) {
    return [];
  }

  const embeddingResponse = await embeddingClient.embeddings.create({
    model: env.openaiEmbeddingModel,
    input: query
  });
  const vector = embeddingResponse.data[0]?.embedding;
  if (!vector) {
    return [];
  }

  const vectorLiteral = toVectorLiteral(vector);
  const limit = Math.max(1, Math.min(30, options?.limit ?? env.assistentePgvectorTopK));

  const result = await activePool.query<HybridSearchResult>(
    `
      WITH ranked AS (
        SELECT
          entity_type,
          entity_id,
          source_table,
          source_field,
          chunk_text,
          metadata_json,
          ts_rank_cd(to_tsvector('portuguese', chunk_text), websearch_to_tsquery('portuguese', $1)) AS lexical_score,
          CASE
            WHEN embedding IS NULL THEN 0
            ELSE 1 - (embedding <=> $2::vector)
          END AS semantic_score
        FROM knowledge_chunks
        WHERE ($3::text IS NULL OR entity_type = $3::text)
      )
      SELECT
        entity_type,
        entity_id,
        source_table,
        source_field,
        chunk_text,
        metadata_json,
        lexical_score,
        semantic_score,
        (0.45 * lexical_score + 0.55 * semantic_score) AS final_score
      FROM ranked
      WHERE lexical_score > 0 OR semantic_score > 0.15
      ORDER BY final_score DESC
      LIMIT $4
    `,
    [query, vectorLiteral, options?.entityType ?? null, limit]
  );

  return result.rows;
};
