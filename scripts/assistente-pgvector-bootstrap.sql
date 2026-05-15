CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_field TEXT NOT NULL,
  chunk_hash TEXT NOT NULL DEFAULT '',
  chunk_text TEXT NOT NULL,
  metadata_json JSONB,
  embedding VECTOR(1536),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE knowledge_chunks
  ADD COLUMN IF NOT EXISTS chunk_hash TEXT;

UPDATE knowledge_chunks
SET chunk_hash = md5(chunk_text)
WHERE chunk_hash IS NULL OR chunk_hash = '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'knowledge_chunks_entity_type_entity_id_source_table_source__key'
      AND conrelid = 'knowledge_chunks'::regclass
  ) THEN
    ALTER TABLE knowledge_chunks DROP CONSTRAINT knowledge_chunks_entity_type_entity_id_source_table_source__key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_chunks_unique_identity
  ON knowledge_chunks(entity_type, entity_id, source_table, source_field, chunk_hash);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_entity ON knowledge_chunks(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_updated_at ON knowledge_chunks(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_fts ON knowledge_chunks USING GIN (to_tsvector('portuguese', chunk_text));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_knowledge_chunks_embedding_hnsw'
  ) THEN
    EXECUTE 'CREATE INDEX idx_knowledge_chunks_embedding_hnsw ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)';
  END IF;
END $$;
