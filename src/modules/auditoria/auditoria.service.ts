import { AuditAction, Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { ListAuditQueryInput } from "./auditoria.schema";

export type AuditSnapshot = Record<string, Prisma.JsonValue | null>;

type CreateAuditLogInput = {
  instrumentId: number;
  userId?: number;
  userEmail: string;
  action: AuditAction;
  beforeData?: AuditSnapshot;
  afterData?: AuditSnapshot;
  changedFields?: string[];
};

export const createAuditLog = async (input: CreateAuditLogInput) => {
  return prisma.auditLog.create({
    data: {
      instrumentId: input.instrumentId,
      userId: input.userId,
      userEmail: input.userEmail,
      action: input.action,
      changedFields: input.changedFields,
      beforeData: input.beforeData,
      afterData: input.afterData
    }
  });
};

export const listAuditLogs = async (query: ListAuditQueryInput) => {
  return prisma.auditLog.findMany({
    where: {
      instrumentId: query.instrumento_id,
      action: query.acao
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limite
  });
};

export const diffChangedFields = (
  beforeData: AuditSnapshot | undefined,
  afterData: AuditSnapshot | undefined
): string[] => {
  if (!beforeData || !afterData) {
    return [];
  }

  const keys = new Set([...Object.keys(beforeData), ...Object.keys(afterData)]);
  return [...keys].filter((key) => JSON.stringify(beforeData[key]) !== JSON.stringify(afterData[key]));
};

type InstrumentAuditCandidate = {
  proposta?: string | null;
  instrumento?: string | null;
  objeto?: string | null;
  valorRepasse?: Prisma.Decimal | number | null;
  valorContrapartida?: Prisma.Decimal | number | null;
  concedente?: string | null;
  fluxoTipo?: string | null;
  status?: string | null;
  responsavel?: string | null;
  observacoes?: string | null;
  percentualFisicoMedicao?: Prisma.Decimal | number | null;
  percentualFinanceiroMedicao?: Prisma.Decimal | number | null;
  statusMedicao?: string | null;
  dataUltimaAtualizacaoMedicao?: Date | string | null;
  ativo?: boolean | null;
  conveneteId?: number | null;
};

const toNumberOrNull = (value: Prisma.Decimal | number | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toIsoOrNull = (value: Date | string | null | undefined) => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
};

export const snapshotInstrumentForAudit = (item: InstrumentAuditCandidate | null | undefined): AuditSnapshot => {
  if (!item) {
    return {};
  }

  return {
    proposta: item.proposta ?? null,
    instrumento: item.instrumento ?? null,
    objeto: item.objeto ?? null,
    valor_repasse: toNumberOrNull(item.valorRepasse),
    valor_contrapartida: toNumberOrNull(item.valorContrapartida),
    concedente: item.concedente ?? null,
    fluxo_tipo: item.fluxoTipo ?? null,
    status: item.status ?? null,
    responsavel: item.responsavel ?? null,
    observacoes: item.observacoes ?? null,
    percentual_fisico_medicao: toNumberOrNull(item.percentualFisicoMedicao),
    percentual_financeiro_medicao: toNumberOrNull(item.percentualFinanceiroMedicao),
    status_medicao: item.statusMedicao ?? null,
    data_ultima_atualizacao_medicao: toIsoOrNull(item.dataUltimaAtualizacaoMedicao),
    ativo: item.ativo ?? null,
    convenete_id: item.conveneteId ?? null
  };
};

type CreateSystemInstrumentUpdateAuditInput = {
  instrumentId: number;
  source: string;
  beforeData: AuditSnapshot;
  afterData: AuditSnapshot;
};

export const createSystemInstrumentUpdateAuditLog = async (input: CreateSystemInstrumentUpdateAuditInput) => {
  const changedFields = diffChangedFields(input.beforeData, input.afterData);
  if (changedFields.length === 0) {
    return null;
  }

  return createAuditLog({
    instrumentId: input.instrumentId,
    userEmail: `SYSTEM_SYNC:${input.source}`,
    action: AuditAction.UPDATE,
    beforeData: input.beforeData,
    afterData: input.afterData,
    changedFields
  });
};
