CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE "DocumentoAreaOrigem" AS ENUM ('INTERNO', 'EXTERNO');
CREATE TYPE "DocumentoAreaStatus" AS ENUM ('ATIVO', 'EXCLUIDO');
CREATE TYPE "DocumentoSearchStatus" AS ENUM ('PENDENTE', 'PROCESSANDO', 'INDEXADO', 'ERRO');
CREATE TYPE "DocumentoAuditAction" AS ENUM ('UPLOAD', 'DOWNLOAD', 'EXCLUSAO', 'RENOMEACAO', 'ALTERACAO', 'ENVIO_EXTERNO');
CREATE TYPE "DocumentoExternalRequestStatus" AS ENUM ('ATIVO', 'EXPIRADO', 'ENVIO_REALIZADO', 'DESATIVADO');

CREATE TABLE "DocumentoArea" (
  "id" SERIAL PRIMARY KEY,
  "nomeOriginal" TEXT NOT NULL,
  "nomeAtual" TEXT NOT NULL,
  "arquivoPath" TEXT NOT NULL,
  "mimeType" TEXT,
  "tamanho" BIGINT NOT NULL,
  "origem" "DocumentoAreaOrigem" NOT NULL DEFAULT 'INTERNO',
  "status" "DocumentoAreaStatus" NOT NULL DEFAULT 'ATIVO',
  "instrumentId" INTEGER,
  "conveneteId" INTEGER,
  "uploadedByUserId" INTEGER,
  "uploadedByEmail" TEXT NOT NULL,
  "externalRequestId" INTEGER,
  "externalSubmissionId" INTEGER,
  "externalSenderNome" TEXT,
  "externalSenderCpf" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "DocumentoArea_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DocumentoArea_conveneteId_fkey" FOREIGN KEY ("conveneteId") REFERENCES "Convenete"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DocumentoArea_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "DocumentoSearchIndex" (
  "id" SERIAL PRIMARY KEY,
  "documentoId" INTEGER NOT NULL UNIQUE,
  "textoExtraido" TEXT,
  "status" "DocumentoSearchStatus" NOT NULL DEFAULT 'PENDENTE',
  "erro" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "searchVector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce("textoExtraido", '')), 'A')
  ) STORED,
  CONSTRAINT "DocumentoSearchIndex_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "DocumentoArea"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "DocumentoAuditLog" (
  "id" SERIAL PRIMARY KEY,
  "documentoId" INTEGER,
  "userId" INTEGER,
  "userEmail" TEXT NOT NULL,
  "userNome" TEXT,
  "action" "DocumentoAuditAction" NOT NULL,
  "arquivoNome" TEXT NOT NULL,
  "ip" TEXT,
  "detalhes" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "DocumentoAuditLog_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "DocumentoArea"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DocumentoAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "DocumentoExternalRequest" (
  "id" SERIAL PRIMARY KEY,
  "token" TEXT NOT NULL UNIQUE,
  "titulo" TEXT NOT NULL,
  "descricao" TEXT,
  "status" "DocumentoExternalRequestStatus" NOT NULL DEFAULT 'ATIVO',
  "expiraEm" TIMESTAMPTZ,
  "allowResend" BOOLEAN NOT NULL DEFAULT false,
  "createdByUserId" INTEGER NOT NULL,
  "createdByEmail" TEXT NOT NULL,
  "deactivatedAt" TIMESTAMPTZ,
  "submittedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "DocumentoExternalRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "DocumentoExternalSubmission" (
  "id" SERIAL PRIMARY KEY,
  "externalRequestId" INTEGER NOT NULL,
  "nomeCompleto" TEXT NOT NULL,
  "cpf" TEXT NOT NULL,
  "ip" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "DocumentoExternalSubmission_externalRequestId_fkey" FOREIGN KEY ("externalRequestId") REFERENCES "DocumentoExternalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "DocumentoExternalAccessLog" (
  "id" SERIAL PRIMARY KEY,
  "externalRequestId" INTEGER,
  "token" TEXT NOT NULL,
  "nomeCompleto" TEXT,
  "cpf" TEXT,
  "ip" TEXT,
  "evento" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "DocumentoExternalAccessLog_externalRequestId_fkey" FOREIGN KEY ("externalRequestId") REFERENCES "DocumentoExternalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE "DocumentoArea"
  ADD CONSTRAINT "DocumentoArea_externalRequestId_fkey" FOREIGN KEY ("externalRequestId") REFERENCES "DocumentoExternalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "DocumentoArea_externalSubmissionId_fkey" FOREIGN KEY ("externalSubmissionId") REFERENCES "DocumentoExternalSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "DocumentoArea_status_createdAt_idx" ON "DocumentoArea"("status", "createdAt");
CREATE INDEX "DocumentoArea_instrumentId_createdAt_idx" ON "DocumentoArea"("instrumentId", "createdAt");
CREATE INDEX "DocumentoArea_conveneteId_createdAt_idx" ON "DocumentoArea"("conveneteId", "createdAt");
CREATE INDEX "DocumentoArea_uploadedByUserId_createdAt_idx" ON "DocumentoArea"("uploadedByUserId", "createdAt");
CREATE INDEX "DocumentoArea_externalRequestId_idx" ON "DocumentoArea"("externalRequestId");
CREATE INDEX "DocumentoSearchIndex_searchVector_idx" ON "DocumentoSearchIndex" USING GIN ("searchVector");
CREATE INDEX "DocumentoArea_nomeAtual_trgm_idx" ON "DocumentoArea" USING GIN ("nomeAtual" gin_trgm_ops);
CREATE INDEX "DocumentoAuditLog_documentoId_createdAt_idx" ON "DocumentoAuditLog"("documentoId", "createdAt");
CREATE INDEX "DocumentoAuditLog_userId_createdAt_idx" ON "DocumentoAuditLog"("userId", "createdAt");
CREATE INDEX "DocumentoAuditLog_action_createdAt_idx" ON "DocumentoAuditLog"("action", "createdAt");
CREATE INDEX "DocumentoAuditLog_createdAt_idx" ON "DocumentoAuditLog"("createdAt");
CREATE INDEX "DocumentoExternalRequest_status_createdAt_idx" ON "DocumentoExternalRequest"("status", "createdAt");
CREATE INDEX "DocumentoExternalRequest_expiraEm_idx" ON "DocumentoExternalRequest"("expiraEm");
CREATE INDEX "DocumentoExternalSubmission_externalRequestId_createdAt_idx" ON "DocumentoExternalSubmission"("externalRequestId", "createdAt");
CREATE INDEX "DocumentoExternalSubmission_cpf_idx" ON "DocumentoExternalSubmission"("cpf");
CREATE INDEX "DocumentoExternalAccessLog_externalRequestId_createdAt_idx" ON "DocumentoExternalAccessLog"("externalRequestId", "createdAt");
CREATE INDEX "DocumentoExternalAccessLog_token_createdAt_idx" ON "DocumentoExternalAccessLog"("token", "createdAt");

CREATE OR REPLACE FUNCTION prevent_documento_audit_log_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'DocumentoAuditLog is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DocumentoAuditLog_prevent_update"
BEFORE UPDATE ON "DocumentoAuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_documento_audit_log_mutation();

CREATE TRIGGER "DocumentoAuditLog_prevent_delete"
BEFORE DELETE ON "DocumentoAuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_documento_audit_log_mutation();
