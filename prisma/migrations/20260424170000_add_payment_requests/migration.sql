CREATE TYPE "PaymentRequestStatus" AS ENUM ('SOLICITADO', 'EM_ANALISE', 'APROVADO', 'REJEITADO', 'PAGO');

CREATE TABLE "UserConvenetePermission" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "conveneteId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserConvenetePermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentRequest" (
  "id" SERIAL NOT NULL,
  "instrumentId" INTEGER NOT NULL,
  "conveneteId" INTEGER NOT NULL,
  "requestedById" INTEGER NOT NULL,
  "valorNota" DECIMAL(65,30) NOT NULL,
  "valorBm" DECIMAL(65,30) NOT NULL,
  "numeroBm" TEXT NOT NULL,
  "status" "PaymentRequestStatus" NOT NULL DEFAULT 'SOLICITADO',
  "inssValor" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "inssAliquota" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "issValor" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "issAliquota" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "pisValor" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "pisAliquota" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "cofinsValor" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "cofinsAliquota" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "irValor" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "irAliquota" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "observacoes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserConvenetePermission_userId_conveneteId_key" ON "UserConvenetePermission"("userId", "conveneteId");
CREATE INDEX "UserConvenetePermission_userId_idx" ON "UserConvenetePermission"("userId");
CREATE INDEX "UserConvenetePermission_conveneteId_idx" ON "UserConvenetePermission"("conveneteId");
CREATE INDEX "PaymentRequest_instrumentId_createdAt_idx" ON "PaymentRequest"("instrumentId", "createdAt");
CREATE INDEX "PaymentRequest_conveneteId_createdAt_idx" ON "PaymentRequest"("conveneteId", "createdAt");
CREATE INDEX "PaymentRequest_requestedById_createdAt_idx" ON "PaymentRequest"("requestedById", "createdAt");
CREATE INDEX "PaymentRequest_status_createdAt_idx" ON "PaymentRequest"("status", "createdAt");

ALTER TABLE "UserConvenetePermission" ADD CONSTRAINT "UserConvenetePermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserConvenetePermission" ADD CONSTRAINT "UserConvenetePermission_conveneteId_fkey" FOREIGN KEY ("conveneteId") REFERENCES "Convenete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_conveneteId_fkey" FOREIGN KEY ("conveneteId") REFERENCES "Convenete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
