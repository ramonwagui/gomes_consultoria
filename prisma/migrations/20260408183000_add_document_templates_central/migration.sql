-- CreateEnum
CREATE TYPE "DocumentTemplateStatus" AS ENUM ('RASCUNHO', 'ATIVO', 'ARQUIVADO');

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL,
    "status" "DocumentTemplateStatus" NOT NULL DEFAULT 'RASCUNHO',
    "conteudo" TEXT NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "updatedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedTemplateDocument" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "conveneteId" INTEGER NOT NULL,
    "instrumentId" INTEGER,
    "titulo" TEXT NOT NULL,
    "renderedContent" TEXT NOT NULL,
    "placeholdersJson" JSONB NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedTemplateDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplate_codigo_key" ON "DocumentTemplate"("codigo");

-- CreateIndex
CREATE INDEX "DocumentTemplate_status_nome_idx" ON "DocumentTemplate"("status", "nome");

-- CreateIndex
CREATE INDEX "DocumentTemplate_tipo_status_idx" ON "DocumentTemplate"("tipo", "status");

-- CreateIndex
CREATE INDEX "GeneratedTemplateDocument_templateId_createdAt_idx" ON "GeneratedTemplateDocument"("templateId", "createdAt");

-- CreateIndex
CREATE INDEX "GeneratedTemplateDocument_conveneteId_createdAt_idx" ON "GeneratedTemplateDocument"("conveneteId", "createdAt");

-- CreateIndex
CREATE INDEX "GeneratedTemplateDocument_instrumentId_idx" ON "GeneratedTemplateDocument"("instrumentId");

-- CreateIndex
CREATE INDEX "GeneratedTemplateDocument_createdByUserId_createdAt_idx" ON "GeneratedTemplateDocument"("createdByUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedTemplateDocument" ADD CONSTRAINT "GeneratedTemplateDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedTemplateDocument" ADD CONSTRAINT "GeneratedTemplateDocument_conveneteId_fkey" FOREIGN KEY ("conveneteId") REFERENCES "Convenete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedTemplateDocument" ADD CONSTRAINT "GeneratedTemplateDocument_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedTemplateDocument" ADD CONSTRAINT "GeneratedTemplateDocument_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
