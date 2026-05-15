-- AlterTable
ALTER TABLE "DocumentTemplate"
ADD COLUMN "currentVersion" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "DocumentTemplateVersion" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL,
    "status" "DocumentTemplateStatus" NOT NULL,
    "conteudo" TEXT NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplateVersion_templateId_version_key" ON "DocumentTemplateVersion"("templateId", "version");

-- CreateIndex
CREATE INDEX "DocumentTemplateVersion_templateId_createdAt_idx" ON "DocumentTemplateVersion"("templateId", "createdAt");

-- AddForeignKey
ALTER TABLE "DocumentTemplateVersion" ADD CONSTRAINT "DocumentTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplateVersion" ADD CONSTRAINT "DocumentTemplateVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill versions for existing templates
INSERT INTO "DocumentTemplateVersion" (
  "templateId",
  "version",
  "nome",
  "descricao",
  "tipo",
  "status",
  "conteudo",
  "createdByUserId",
  "createdAt"
)
SELECT
  dt."id",
  1,
  dt."nome",
  dt."descricao",
  dt."tipo",
  dt."status",
  dt."conteudo",
  dt."createdByUserId",
  dt."createdAt"
FROM "DocumentTemplate" dt
ON CONFLICT ("templateId", "version") DO NOTHING;
