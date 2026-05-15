ALTER TABLE "DocumentTemplate"
ADD COLUMN "arquivoPath" TEXT,
ADD COLUMN "arquivoNomeOriginal" TEXT,
ADD COLUMN "arquivoMimeType" TEXT,
ADD COLUMN "placeholdersJson" JSONB;

CREATE TABLE "ResponsavelTecnico" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "crea" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResponsavelTecnico_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentoLog" (
    "id" SERIAL NOT NULL,
    "instrumentId" INTEGER NOT NULL,
    "templateId" INTEGER NOT NULL,
    "responsavelTecnicoId" INTEGER,
    "tipoDocumento" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "urlPdf" TEXT NOT NULL,
    "urlDocx" TEXT,
    "arquivoPdfPath" TEXT NOT NULL,
    "arquivoDocxPath" TEXT,
    "placeholdersJson" JSONB NOT NULL,
    "usuario" TEXT NOT NULL,
    "createdByUserId" INTEGER,
    "dataGeracao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResponsavelTecnico_cpf_key" ON "ResponsavelTecnico"("cpf");
CREATE INDEX "ResponsavelTecnico_nome_idx" ON "ResponsavelTecnico"("nome");
CREATE INDEX "ResponsavelTecnico_crea_idx" ON "ResponsavelTecnico"("crea");
CREATE INDEX "DocumentoLog_instrumentId_dataGeracao_idx" ON "DocumentoLog"("instrumentId", "dataGeracao");
CREATE INDEX "DocumentoLog_templateId_dataGeracao_idx" ON "DocumentoLog"("templateId", "dataGeracao");
CREATE INDEX "DocumentoLog_responsavelTecnicoId_idx" ON "DocumentoLog"("responsavelTecnicoId");
CREATE INDEX "DocumentoLog_createdByUserId_dataGeracao_idx" ON "DocumentoLog"("createdByUserId", "dataGeracao");

ALTER TABLE "DocumentoLog"
ADD CONSTRAINT "DocumentoLog_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentoLog"
ADD CONSTRAINT "DocumentoLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentoLog"
ADD CONSTRAINT "DocumentoLog_responsavelTecnicoId_fkey" FOREIGN KEY ("responsavelTecnicoId") REFERENCES "ResponsavelTecnico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DocumentoLog"
ADD CONSTRAINT "DocumentoLog_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
