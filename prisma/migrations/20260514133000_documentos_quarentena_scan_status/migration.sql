DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentoScanStatus') THEN
    CREATE TYPE "DocumentoScanStatus" AS ENUM ('PENDENTE', 'PROCESSANDO', 'LIMPO', 'INFECTADO', 'ERRO_SCAN');
  END IF;
END $$;

ALTER TYPE "DocumentoAuditAction" ADD VALUE IF NOT EXISTS 'SCAN_INICIADO';
ALTER TYPE "DocumentoAuditAction" ADD VALUE IF NOT EXISTS 'SCAN_LIMPO';
ALTER TYPE "DocumentoAuditAction" ADD VALUE IF NOT EXISTS 'SCAN_INFECTADO';
ALTER TYPE "DocumentoAuditAction" ADD VALUE IF NOT EXISTS 'SCAN_ERRO';

ALTER TABLE "DocumentoArea"
ADD COLUMN IF NOT EXISTS "scanStatus" "DocumentoScanStatus" NOT NULL DEFAULT 'LIMPO',
ADD COLUMN IF NOT EXISTS "scanProvider" TEXT,
ADD COLUMN IF NOT EXISTS "scanResult" TEXT,
ADD COLUMN IF NOT EXISTS "scannedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "quarantinePath" TEXT;

UPDATE "DocumentoArea"
SET "scanStatus" = 'LIMPO',
    "scanProvider" = COALESCE("scanProvider", 'LEGADO'),
    "scanResult" = COALESCE("scanResult", 'Documento existente antes da quarentena'),
    "scannedAt" = COALESCE("scannedAt", NOW())
WHERE "scanStatus" IS NULL OR "scanProvider" IS NULL OR "scanResult" IS NULL OR "scannedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "DocumentoArea_scanStatus_createdAt_idx"
ON "DocumentoArea"("scanStatus", "createdAt");
