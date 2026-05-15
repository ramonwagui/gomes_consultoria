ALTER TABLE "DocumentoArea"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "purgedAt" TIMESTAMP(3);

UPDATE "DocumentoArea"
SET "deletedAt" = COALESCE("deletedAt", "updatedAt", NOW())
WHERE "status" = 'EXCLUIDO' AND "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "DocumentoArea_status_deletedAt_purgedAt_idx"
ON "DocumentoArea"("status", "deletedAt", "purgedAt");
