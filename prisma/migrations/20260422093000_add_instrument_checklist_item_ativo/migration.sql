ALTER TABLE "InstrumentChecklistItem"
ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "InstrumentChecklistItem_instrumentId_ativo_idx"
ON "InstrumentChecklistItem"("instrumentId", "ativo");
