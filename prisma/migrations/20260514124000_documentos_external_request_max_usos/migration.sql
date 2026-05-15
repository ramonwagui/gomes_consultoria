ALTER TABLE "DocumentoExternalRequest"
ADD COLUMN "maxUsos" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "usosAtuais" INTEGER NOT NULL DEFAULT 0;

UPDATE "DocumentoExternalRequest"
SET "usosAtuais" = 1
WHERE "submittedAt" IS NOT NULL
  AND "usosAtuais" = 0;

UPDATE "DocumentoExternalRequest"
SET "maxUsos" = 999
WHERE "allowResend" = true
  AND "maxUsos" = 1;

ALTER TABLE "DocumentoExternalRequest"
ADD CONSTRAINT "DocumentoExternalRequest_maxUsos_check" CHECK ("maxUsos" >= 1),
ADD CONSTRAINT "DocumentoExternalRequest_usosAtuais_check" CHECK ("usosAtuais" >= 0);

CREATE INDEX "DocumentoExternalRequest_usosAtuais_idx" ON "DocumentoExternalRequest"("usosAtuais");
