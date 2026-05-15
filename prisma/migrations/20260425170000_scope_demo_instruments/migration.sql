ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DEMONSTRACAO';

ALTER TABLE "Convenete"
ADD COLUMN IF NOT EXISTS "demoOwnerUserId" INTEGER;

ALTER TABLE "InstrumentProposal"
ADD COLUMN IF NOT EXISTS "demoOwnerUserId" INTEGER;

ALTER TABLE "Ticket"
ADD COLUMN IF NOT EXISTS "demoOwnerUserId" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Convenete_demoOwnerUserId_fkey'
  ) THEN
    ALTER TABLE "Convenete"
    ADD CONSTRAINT "Convenete_demoOwnerUserId_fkey"
    FOREIGN KEY ("demoOwnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'InstrumentProposal_demoOwnerUserId_fkey'
  ) THEN
    ALTER TABLE "InstrumentProposal"
    ADD CONSTRAINT "InstrumentProposal_demoOwnerUserId_fkey"
    FOREIGN KEY ("demoOwnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Ticket_demoOwnerUserId_fkey'
  ) THEN
    ALTER TABLE "Ticket"
    ADD CONSTRAINT "Ticket_demoOwnerUserId_fkey"
    FOREIGN KEY ("demoOwnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Allow demo workspaces to keep their own copies of instruments/proposals
-- without colliding with the real workspace.
DROP INDEX IF EXISTS "InstrumentProposal_proposta_key";
DROP INDEX IF EXISTS "InstrumentProposal_instrumento_key";

CREATE INDEX IF NOT EXISTS "Convenete_demoOwnerUserId_idx" ON "Convenete"("demoOwnerUserId");
CREATE INDEX IF NOT EXISTS "InstrumentProposal_demoOwnerUserId_idx" ON "InstrumentProposal"("demoOwnerUserId");
CREATE INDEX IF NOT EXISTS "Ticket_demoOwnerUserId_idx" ON "Ticket"("demoOwnerUserId");
CREATE INDEX IF NOT EXISTS "InstrumentProposal_proposta_idx" ON "InstrumentProposal"("proposta");
CREATE INDEX IF NOT EXISTS "InstrumentProposal_instrumento_idx" ON "InstrumentProposal"("instrumento");
