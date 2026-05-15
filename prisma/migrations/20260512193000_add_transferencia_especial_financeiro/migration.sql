CREATE TABLE "TransferenciaEspecialFinanceiro" (
    "id" SERIAL NOT NULL,
    "instrumentId" INTEGER NOT NULL,
    "pagoDetectado" BOOLEAN NOT NULL DEFAULT false,
    "dataPrimeiroPagamento" TIMESTAMP(3),
    "dataUltimoPagamento" TIMESTAMP(3),
    "valorPagoDetectado" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "quantidadeEmpenhos" INTEGER NOT NULL DEFAULT 0,
    "quantidadeDocumentosHabeis" INTEGER NOT NULL DEFAULT 0,
    "quantidadeOrdensPagamento" INTEGER NOT NULL DEFAULT 0,
    "documentoHabilPrincipal" TEXT,
    "ordemPagamentoPrincipal" TEXT,
    "ordemBancariaPrincipal" TEXT,
    "situacaoPagamento" TEXT,
    "dataUltimaConsulta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payloadResumo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferenciaEspecialFinanceiro_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TransferenciaEspecialFinanceiro_instrumentId_key" ON "TransferenciaEspecialFinanceiro"("instrumentId");
CREATE INDEX "TransferenciaEspecialFinanceiro_pagoDetectado_idx" ON "TransferenciaEspecialFinanceiro"("pagoDetectado");
CREATE INDEX "TransferenciaEspecialFinanceiro_dataUltimoPagamento_idx" ON "TransferenciaEspecialFinanceiro"("dataUltimoPagamento");

ALTER TABLE "TransferenciaEspecialFinanceiro"
ADD CONSTRAINT "TransferenciaEspecialFinanceiro_instrumentId_fkey"
FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
