-- Remove legacy documents module objects.
DROP TABLE IF EXISTS "DocumentSignature" CASCADE;
DROP TABLE IF EXISTS "DocumentChunk" CASCADE;
DROP TABLE IF EXISTS "DocumentAiRequestPublicLink" CASCADE;
DROP TABLE IF EXISTS "DocumentAiRequest" CASCADE;
DROP TABLE IF EXISTS "Document" CASCADE;
DROP TABLE IF EXISTS "DigitalCertificate" CASCADE;

DROP TYPE IF EXISTS "CertificateStatus";
DROP TYPE IF EXISTS "DocumentStatus";
DROP TYPE IF EXISTS "DocumentIndexStatus";
DROP TYPE IF EXISTS "DocumentAiCategory";
DROP TYPE IF EXISTS "DocumentAiRiskLevel";
DROP TYPE IF EXISTS "DocumentAiRequestStatus";
DROP TYPE IF EXISTS "DocumentAiRequestPriority";
