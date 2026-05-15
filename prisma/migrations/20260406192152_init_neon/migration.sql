-- CreateEnum
CREATE TYPE "InstrumentStatus" AS ENUM ('EM_ELABORACAO', 'ASSINADO', 'EM_EXECUCAO', 'VENCIDO', 'PRESTACAO_PENDENTE', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'GESTOR', 'CONSULTA');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DEACTIVATE');

-- CreateEnum
CREATE TYPE "InstrumentWorkflowStage" AS ENUM ('PROPOSTA', 'REQUISITOS_CELEBRACAO', 'PROJETO_BASICO_TERMO_REFERENCIA', 'PROCESSO_EXECUCAO_LICITACAO', 'VERIFICACAO_PROCESSO_LICITATORIO', 'INSTRUMENTOS_CONTRATUAIS', 'ACOMPANHAMENTO_OBRA');

-- CreateEnum
CREATE TYPE "InstrumentFlowType" AS ENUM ('OBRA', 'AQUISICAO_EQUIPAMENTOS', 'EVENTOS');

-- CreateEnum
CREATE TYPE "ChecklistItemStatus" AS ENUM ('NAO_INICIADO', 'EM_ELABORACAO', 'CONCLUIDO', 'ACEITO');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TicketSource" AS ENUM ('MANUAL', 'EMAIL');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "TicketEmailIngestionStatus" AS ENUM ('CRIADO', 'IGNORADO', 'ERRO');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('ATIVO', 'EXPIRADO', 'REVOGADO');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDENTE', 'ASSINADO');

-- CreateEnum
CREATE TYPE "DocumentIndexStatus" AS ENUM ('PENDENTE', 'PROCESSANDO', 'INDEXADO', 'ERRO');

-- CreateEnum
CREATE TYPE "DocumentAiCategory" AS ENUM ('CONTRATO', 'OFICIO', 'RELATORIO', 'PRESTACAO_CONTAS', 'COMPROVANTE', 'OUTROS');

-- CreateEnum
CREATE TYPE "DocumentAiRiskLevel" AS ENUM ('BAIXO', 'MEDIO', 'ALTO', 'CRITICO');

-- CreateEnum
CREATE TYPE "DocumentAiRequestStatus" AS ENUM ('ABERTA', 'ATENDIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "DocumentAiRequestPriority" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "SolicitacaoCaixaTipo" AS ENUM ('EMAIL_RECEBIDO', 'COMENTARIO_TICKET', 'RESPOTA_ENVIADA', 'ASSOCIAÇÃO_MANUAL');

-- CreateEnum
CREATE TYPE "AssistenteChatRole" AS ENUM ('user', 'assistant');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CONSULTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "avatarMimeType" TEXT,
    "avatarPath" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentProposal" (
    "id" SERIAL NOT NULL,
    "proposta" TEXT NOT NULL,
    "instrumento" TEXT NOT NULL,
    "objeto" TEXT NOT NULL,
    "valorRepasse" DECIMAL(65,30) NOT NULL,
    "valorContrapartida" DECIMAL(65,30) NOT NULL,
    "dataCadastro" TIMESTAMP(3) NOT NULL,
    "dataAssinatura" TIMESTAMP(3),
    "vigenciaInicio" TIMESTAMP(3) NOT NULL,
    "vigenciaFim" TIMESTAMP(3) NOT NULL,
    "dataPrestacaoContas" TIMESTAMP(3),
    "dataDou" TIMESTAMP(3),
    "concedente" TEXT NOT NULL,
    "fluxoTipo" "InstrumentFlowType" NOT NULL DEFAULT 'OBRA',
    "status" "InstrumentStatus" NOT NULL DEFAULT 'EM_ELABORACAO',
    "responsavel" TEXT,
    "orgaoExecutor" TEXT,
    "empresaVencedora" TEXT,
    "cnpjVencedora" TEXT,
    "valorVencedor" DECIMAL(65,30),
    "observacoes" TEXT,
    "conveneteId" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "valorJaRepassado" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "dataRepasse1" TIMESTAMP(3),
    "dataRepasse2" TIMESTAMP(3),
    "contaBancaria" TEXT,
    "agencia" TEXT,
    "banco" TEXT,
    "conta" TEXT,

    CONSTRAINT "InstrumentProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'ABERTO',
    "prioridade" "TicketPriority" NOT NULL DEFAULT 'MEDIA',
    "origem" "TicketSource" NOT NULL DEFAULT 'MANUAL',
    "instrumentoInformado" TEXT,
    "instrumentoEncontrado" BOOLEAN NOT NULL DEFAULT true,
    "prazoAlvo" TIMESTAMP(3),
    "resolvidoEm" TIMESTAMP(3),
    "motivoResolucao" TEXT,
    "instrumentId" INTEGER,
    "responsavelUserId" INTEGER,
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketEmailIngestion" (
    "id" SERIAL NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "gmailThreadId" TEXT,
    "fromEmail" TEXT NOT NULL,
    "subject" TEXT,
    "receivedAt" TIMESTAMP(3),
    "statusProcessamento" "TicketEmailIngestionStatus" NOT NULL,
    "erro" TEXT,
    "payloadRaw" TEXT,
    "ticketId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketEmailIngestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketComment" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "mensagem" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentChecklistItem" (
    "id" SERIAL NOT NULL,
    "instrumentId" INTEGER NOT NULL,
    "etapa" "InstrumentWorkflowStage" NOT NULL DEFAULT 'PROPOSTA',
    "status" "ChecklistItemStatus" NOT NULL DEFAULT 'NAO_INICIADO',
    "nomeDocumento" TEXT NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "observacao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "arquivoPath" TEXT,
    "arquivoNomeOriginal" TEXT,
    "arquivoMimeType" TEXT,
    "arquivoTamanho" INTEGER,
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstrumentChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentRepasse" (
    "id" SERIAL NOT NULL,
    "instrumentId" INTEGER NOT NULL,
    "dataRepasse" TIMESTAMP(3) NOT NULL,
    "valorRepasse" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstrumentRepasse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentChecklistExternalLink" (
    "id" SERIAL NOT NULL,
    "checklistItemId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "createdByUserId" INTEGER,
    "createdByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstrumentChecklistExternalLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentChecklistExternalFile" (
    "id" SERIAL NOT NULL,
    "externalLinkId" INTEGER NOT NULL,
    "nomeRemetente" TEXT NOT NULL,
    "arquivoPath" TEXT NOT NULL,
    "arquivoNomeOriginal" TEXT NOT NULL,
    "arquivoMimeType" TEXT,
    "arquivoTamanho" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstrumentChecklistExternalFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentWorkProgress" (
    "id" SERIAL NOT NULL,
    "instrumentId" INTEGER NOT NULL,
    "percentualObra" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstrumentWorkProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentMeasurementBulletin" (
    "id" SERIAL NOT NULL,
    "instrumentId" INTEGER NOT NULL,
    "dataBoletim" TIMESTAMP(3) NOT NULL,
    "valorMedicao" DECIMAL(65,30) NOT NULL,
    "percentualObraInformado" DECIMAL(65,30),
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstrumentMeasurementBulletin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentStageFollowUp" (
    "id" SERIAL NOT NULL,
    "instrumentId" INTEGER NOT NULL,
    "etapa" "InstrumentWorkflowStage" NOT NULL,
    "texto" TEXT,
    "userId" INTEGER,
    "userEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstrumentStageFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentStageFollowUpFile" (
    "id" SERIAL NOT NULL,
    "followUpId" INTEGER NOT NULL,
    "arquivoPath" TEXT NOT NULL,
    "arquivoNomeOriginal" TEXT NOT NULL,
    "arquivoMimeType" TEXT,
    "arquivoTamanho" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstrumentStageFollowUpFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "instrumentId" INTEGER NOT NULL,
    "userId" INTEGER,
    "userEmail" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "changedFields" JSONB,
    "beforeData" JSONB,
    "afterData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Convenete" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "bairro" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "tel" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Convenete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalCertificate" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "titular" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "validade" TIMESTAMP(3) NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'ATIVO',
    "arquivoPath" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "arquivoPath" TEXT NOT NULL,
    "arquivoNome" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDENTE',
    "indexStatus" "DocumentIndexStatus" NOT NULL DEFAULT 'PENDENTE',
    "indexedAt" TIMESTAMP(3),
    "indexError" TEXT,
    "aiSummary" TEXT,
    "aiKeywords" TEXT,
    "aiCategory" "DocumentAiCategory",
    "aiRiskLevel" "DocumentAiRiskLevel",
    "aiClassificationConfidence" DOUBLE PRECISION,
    "aiInsights" TEXT,
    "createdByUserId" INTEGER NOT NULL,
    "aiRequestId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAiRequest" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prioridade" "DocumentAiRequestPriority" NOT NULL DEFAULT 'MEDIA',
    "status" "DocumentAiRequestStatus" NOT NULL DEFAULT 'ABERTA',
    "prazo" TIMESTAMP(3),
    "requestedByUserId" INTEGER NOT NULL,
    "fulfilledByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentAiRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAiRequestPublicLink" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "createdByUserId" INTEGER,
    "createdByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentAiRequestPublicLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embeddingVector" TEXT,
    "embeddingModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSignature" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "certificateId" INTEGER NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "signedByUserId" INTEGER NOT NULL,

    CONSTRAINT "DocumentSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentSolicitacaoCaixa" (
    "id" SERIAL NOT NULL,
    "instrumentId" INTEGER NOT NULL,
    "ticketId" INTEGER,
    "tipo" "SolicitacaoCaixaTipo" NOT NULL,
    "descricao" TEXT NOT NULL,
    "origemEmail" TEXT,
    "assuntoEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstrumentSolicitacaoCaixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketChecklistItem" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "concluidoEm" TIMESTAMP(3),
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistenteChatSession" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "titulo" TEXT,
    "entidadeAtivaTipo" TEXT,
    "entidadeAtivaId" TEXT,
    "municipioAtivo" TEXT,
    "topicoAtivo" TEXT,
    "resumoContexto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistenteChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistenteChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "AssistenteChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "tokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistenteChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistenteSearchLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "queryOriginal" TEXT NOT NULL,
    "queryNormalized" TEXT NOT NULL,
    "filtersUsed" TEXT,
    "topResultsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistenteSearchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "InstrumentProposal_proposta_key" ON "InstrumentProposal"("proposta");

-- CreateIndex
CREATE UNIQUE INDEX "InstrumentProposal_instrumento_key" ON "InstrumentProposal"("instrumento");

-- CreateIndex
CREATE INDEX "InstrumentProposal_concedente_idx" ON "InstrumentProposal"("concedente");

-- CreateIndex
CREATE INDEX "InstrumentProposal_status_idx" ON "InstrumentProposal"("status");

-- CreateIndex
CREATE INDEX "InstrumentProposal_ativo_idx" ON "InstrumentProposal"("ativo");

-- CreateIndex
CREATE INDEX "InstrumentProposal_vigenciaFim_idx" ON "InstrumentProposal"("vigenciaFim");

-- CreateIndex
CREATE INDEX "InstrumentProposal_conveneteId_idx" ON "InstrumentProposal"("conveneteId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_codigo_key" ON "Ticket"("codigo");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "Ticket_origem_idx" ON "Ticket"("origem");

-- CreateIndex
CREATE INDEX "Ticket_instrumentId_idx" ON "Ticket"("instrumentId");

-- CreateIndex
CREATE INDEX "Ticket_responsavelUserId_idx" ON "Ticket"("responsavelUserId");

-- CreateIndex
CREATE INDEX "Ticket_createdByUserId_idx" ON "Ticket"("createdByUserId");

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TicketEmailIngestion_gmailMessageId_key" ON "TicketEmailIngestion"("gmailMessageId");

-- CreateIndex
CREATE INDEX "TicketEmailIngestion_statusProcessamento_createdAt_idx" ON "TicketEmailIngestion"("statusProcessamento", "createdAt");

-- CreateIndex
CREATE INDEX "TicketEmailIngestion_fromEmail_createdAt_idx" ON "TicketEmailIngestion"("fromEmail", "createdAt");

-- CreateIndex
CREATE INDEX "TicketEmailIngestion_ticketId_idx" ON "TicketEmailIngestion"("ticketId");

-- CreateIndex
CREATE INDEX "TicketComment_ticketId_createdAt_idx" ON "TicketComment"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "TicketComment_userId_idx" ON "TicketComment"("userId");

-- CreateIndex
CREATE INDEX "InstrumentChecklistItem_instrumentId_ordem_idx" ON "InstrumentChecklistItem"("instrumentId", "ordem");

-- CreateIndex
CREATE INDEX "InstrumentChecklistItem_instrumentId_etapa_ordem_idx" ON "InstrumentChecklistItem"("instrumentId", "etapa", "ordem");

-- CreateIndex
CREATE INDEX "InstrumentRepasse_instrumentId_dataRepasse_idx" ON "InstrumentRepasse"("instrumentId", "dataRepasse");

-- CreateIndex
CREATE UNIQUE INDEX "InstrumentChecklistExternalLink_token_key" ON "InstrumentChecklistExternalLink"("token");

-- CreateIndex
CREATE INDEX "InstrumentChecklistExternalLink_checklistItemId_ativo_idx" ON "InstrumentChecklistExternalLink"("checklistItemId", "ativo");

-- CreateIndex
CREATE INDEX "InstrumentChecklistExternalLink_token_ativo_idx" ON "InstrumentChecklistExternalLink"("token", "ativo");

-- CreateIndex
CREATE INDEX "InstrumentChecklistExternalLink_expiraEm_idx" ON "InstrumentChecklistExternalLink"("expiraEm");

-- CreateIndex
CREATE INDEX "InstrumentChecklistExternalFile_externalLinkId_createdAt_idx" ON "InstrumentChecklistExternalFile"("externalLinkId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InstrumentWorkProgress_instrumentId_key" ON "InstrumentWorkProgress"("instrumentId");

-- CreateIndex
CREATE INDEX "InstrumentMeasurementBulletin_instrumentId_dataBoletim_idx" ON "InstrumentMeasurementBulletin"("instrumentId", "dataBoletim");

-- CreateIndex
CREATE INDEX "InstrumentStageFollowUp_instrumentId_etapa_createdAt_idx" ON "InstrumentStageFollowUp"("instrumentId", "etapa", "createdAt");

-- CreateIndex
CREATE INDEX "InstrumentStageFollowUpFile_followUpId_createdAt_idx" ON "InstrumentStageFollowUpFile"("followUpId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_instrumentId_idx" ON "AuditLog"("instrumentId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Convenete_cnpj_key" ON "Convenete"("cnpj");

-- CreateIndex
CREATE INDEX "Convenete_nome_idx" ON "Convenete"("nome");

-- CreateIndex
CREATE INDEX "Convenete_cidade_idx" ON "Convenete"("cidade");

-- CreateIndex
CREATE INDEX "DigitalCertificate_status_idx" ON "DigitalCertificate"("status");

-- CreateIndex
CREATE INDEX "DigitalCertificate_cpf_idx" ON "DigitalCertificate"("cpf");

-- CreateIndex
CREATE INDEX "Document_createdByUserId_idx" ON "Document"("createdByUserId");

-- CreateIndex
CREATE INDEX "Document_aiRequestId_idx" ON "Document"("aiRequestId");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "Document_indexStatus_idx" ON "Document"("indexStatus");

-- CreateIndex
CREATE INDEX "DocumentAiRequest_requestedByUserId_status_idx" ON "DocumentAiRequest"("requestedByUserId", "status");

-- CreateIndex
CREATE INDEX "DocumentAiRequest_status_prioridade_createdAt_idx" ON "DocumentAiRequest"("status", "prioridade", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentAiRequest_prazo_idx" ON "DocumentAiRequest"("prazo");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentAiRequestPublicLink_token_key" ON "DocumentAiRequestPublicLink"("token");

-- CreateIndex
CREATE INDEX "DocumentAiRequestPublicLink_requestId_ativo_idx" ON "DocumentAiRequestPublicLink"("requestId", "ativo");

-- CreateIndex
CREATE INDEX "DocumentAiRequestPublicLink_token_ativo_idx" ON "DocumentAiRequestPublicLink"("token", "ativo");

-- CreateIndex
CREATE INDEX "DocumentAiRequestPublicLink_expiraEm_idx" ON "DocumentAiRequestPublicLink"("expiraEm");

-- CreateIndex
CREATE INDEX "DocumentChunk_documentId_idx" ON "DocumentChunk"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentChunk_documentId_chunkIndex_key" ON "DocumentChunk"("documentId", "chunkIndex");

-- CreateIndex
CREATE INDEX "DocumentSignature_certificateId_idx" ON "DocumentSignature"("certificateId");

-- CreateIndex
CREATE INDEX "DocumentSignature_documentId_idx" ON "DocumentSignature"("documentId");

-- CreateIndex
CREATE INDEX "InstrumentSolicitacaoCaixa_ticketId_idx" ON "InstrumentSolicitacaoCaixa"("ticketId");

-- CreateIndex
CREATE INDEX "InstrumentSolicitacaoCaixa_instrumentId_createdAt_idx" ON "InstrumentSolicitacaoCaixa"("instrumentId", "createdAt");

-- CreateIndex
CREATE INDEX "TicketChecklistItem_ticketId_ordem_idx" ON "TicketChecklistItem"("ticketId", "ordem");

-- CreateIndex
CREATE INDEX "AssistenteChatSession_userId_updatedAt_idx" ON "AssistenteChatSession"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "AssistenteChatMessage_sessionId_createdAt_idx" ON "AssistenteChatMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "AssistenteSearchLog_sessionId_createdAt_idx" ON "AssistenteSearchLog"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "AssistenteSearchLog_userId_createdAt_idx" ON "AssistenteSearchLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "InstrumentProposal" ADD CONSTRAINT "InstrumentProposal_conveneteId_fkey" FOREIGN KEY ("conveneteId") REFERENCES "Convenete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_responsavelUserId_fkey" FOREIGN KEY ("responsavelUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEmailIngestion" ADD CONSTRAINT "TicketEmailIngestion_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentChecklistItem" ADD CONSTRAINT "InstrumentChecklistItem_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentRepasse" ADD CONSTRAINT "InstrumentRepasse_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentChecklistExternalLink" ADD CONSTRAINT "InstrumentChecklistExternalLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentChecklistExternalLink" ADD CONSTRAINT "InstrumentChecklistExternalLink_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "InstrumentChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentChecklistExternalFile" ADD CONSTRAINT "InstrumentChecklistExternalFile_externalLinkId_fkey" FOREIGN KEY ("externalLinkId") REFERENCES "InstrumentChecklistExternalLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentWorkProgress" ADD CONSTRAINT "InstrumentWorkProgress_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentMeasurementBulletin" ADD CONSTRAINT "InstrumentMeasurementBulletin_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentStageFollowUp" ADD CONSTRAINT "InstrumentStageFollowUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentStageFollowUp" ADD CONSTRAINT "InstrumentStageFollowUp_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentStageFollowUpFile" ADD CONSTRAINT "InstrumentStageFollowUpFile_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "InstrumentStageFollowUp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalCertificate" ADD CONSTRAINT "DigitalCertificate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_aiRequestId_fkey" FOREIGN KEY ("aiRequestId") REFERENCES "DocumentAiRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAiRequest" ADD CONSTRAINT "DocumentAiRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAiRequest" ADD CONSTRAINT "DocumentAiRequest_fulfilledByUserId_fkey" FOREIGN KEY ("fulfilledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAiRequestPublicLink" ADD CONSTRAINT "DocumentAiRequestPublicLink_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DocumentAiRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAiRequestPublicLink" ADD CONSTRAINT "DocumentAiRequestPublicLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignature" ADD CONSTRAINT "DocumentSignature_signedByUserId_fkey" FOREIGN KEY ("signedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignature" ADD CONSTRAINT "DocumentSignature_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "DigitalCertificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignature" ADD CONSTRAINT "DocumentSignature_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentSolicitacaoCaixa" ADD CONSTRAINT "InstrumentSolicitacaoCaixa_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketChecklistItem" ADD CONSTRAINT "TicketChecklistItem_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistenteChatSession" ADD CONSTRAINT "AssistenteChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistenteChatMessage" ADD CONSTRAINT "AssistenteChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssistenteChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistenteSearchLog" ADD CONSTRAINT "AssistenteSearchLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssistenteChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistenteSearchLog" ADD CONSTRAINT "AssistenteSearchLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
