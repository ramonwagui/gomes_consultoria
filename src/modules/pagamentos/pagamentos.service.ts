import { PaymentRequestStatus, Prisma, UserRole } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { CreatePaymentRequestInput, PaymentRequestListQueryInput } from "./pagamentos.schema";

type CurrentUser = {
  id: number;
  role: UserRole;
};

type PaymentRequestWithRelations = Prisma.PaymentRequestGetPayload<{
  include: {
    instrument: true;
    convenete: true;
    requestedBy: true;
  };
}>;

const isManager = (user: CurrentUser) => user.role === UserRole.ADMIN || user.role === UserRole.GESTOR;

const decimalToNumber = (value: Prisma.Decimal | number | null | undefined) => {
  if (value === null || value === undefined) {
    return 0;
  }
  return Number(value);
};

const getPaymentTaxesTotal = (item: {
  inssValor: Prisma.Decimal | number | null;
  issValor: Prisma.Decimal | number | null;
  pisValor: Prisma.Decimal | number | null;
  cofinsValor: Prisma.Decimal | number | null;
  irValor: Prisma.Decimal | number | null;
}) =>
  decimalToNumber(item.inssValor) +
  decimalToNumber(item.issValor) +
  decimalToNumber(item.pisValor) +
  decimalToNumber(item.cofinsValor) +
  decimalToNumber(item.irValor);

const getPaymentNetValue = (item: {
  valorNota: Prisma.Decimal | number | null;
  inssValor: Prisma.Decimal | number | null;
  issValor: Prisma.Decimal | number | null;
  pisValor: Prisma.Decimal | number | null;
  cofinsValor: Prisma.Decimal | number | null;
  irValor: Prisma.Decimal | number | null;
}) => Math.max(0, decimalToNumber(item.valorNota) - getPaymentTaxesTotal(item));

const getAccessibleConveneteIds = async (user: CurrentUser) => {
  if (isManager(user)) {
    return null;
  }

  const permissions = await prisma.userConvenetePermission.findMany({
    where: { userId: user.id },
    select: { conveneteId: true }
  });

  return permissions.map((item) => item.conveneteId);
};

const assertInstrumentAccess = async (instrumentId: number, user: CurrentUser) => {
  const instrument = await prisma.instrumentProposal.findUnique({
    where: { id: instrumentId },
    include: { convenete: true }
  });

  if (!instrument) {
    throw new Error("Instrumento nao encontrado.");
  }

  if (!instrument.conveneteId) {
    throw new Error("Instrumento sem proponente vinculado.");
  }

  if (!isManager(user)) {
    const allowed = await prisma.userConvenetePermission.findUnique({
      where: {
        userId_conveneteId: {
          userId: user.id,
          conveneteId: instrument.conveneteId
        }
      }
    });

    if (!allowed) {
      throw new Error("Usuario sem permissao para solicitar pagamento neste proponente.");
    }
  }

  return instrument;
};

const mapPaymentRequest = (item: PaymentRequestWithRelations) => ({
  id: item.id,
  instrumento_id: item.instrumentId,
  instrumento: item.instrument.instrumento,
  proposta: item.instrument.proposta,
  objeto: item.instrument.objeto,
  proponente_id: item.conveneteId,
  proponente_nome: item.convenete.nome,
  proponente_cnpj: item.convenete.cnpj,
  solicitado_por_id: item.requestedById,
  solicitado_por_nome: item.requestedBy.nome,
  solicitado_por_email: item.requestedBy.email,
  valor_nota: decimalToNumber(item.valorNota),
  valor_liquido: getPaymentNetValue(item),
  valor_bm: decimalToNumber(item.valorBm),
  numero_bm: item.numeroBm,
  status: item.status,
  impostos: {
    inss: { valor: decimalToNumber(item.inssValor), aliquota: decimalToNumber(item.inssAliquota) },
    iss: { valor: decimalToNumber(item.issValor), aliquota: decimalToNumber(item.issAliquota) },
    pis: { valor: decimalToNumber(item.pisValor), aliquota: decimalToNumber(item.pisAliquota) },
    cofins: { valor: decimalToNumber(item.cofinsValor), aliquota: decimalToNumber(item.cofinsAliquota) },
    ir: { valor: decimalToNumber(item.irValor), aliquota: decimalToNumber(item.irAliquota) }
  },
  anexos: {
    nota_fiscal: item.notaFiscalPath && item.notaFiscalNomeOriginal
      ? {
          nome_original: item.notaFiscalNomeOriginal,
          mime_type: item.notaFiscalMimeType,
          download_path: `/api/v1/pagamentos/${item.id}/arquivos/nota_fiscal`
        }
      : null,
    empenho: item.empenhoPath && item.empenhoNomeOriginal
      ? {
          nome_original: item.empenhoNomeOriginal,
          mime_type: item.empenhoMimeType,
          download_path: `/api/v1/pagamentos/${item.id}/arquivos/empenho`
        }
      : null
  },
  observacoes: item.observacoes,
  created_at: item.createdAt.toISOString(),
  updated_at: item.updatedAt.toISOString()
});

export const listPaymentRequestInstruments = async (user: CurrentUser) => {
  const accessibleConveneteIds = await getAccessibleConveneteIds(user);
  if (accessibleConveneteIds && accessibleConveneteIds.length === 0) {
    return [];
  }

  const instruments = await prisma.instrumentProposal.findMany({
    where: {
      ativo: true,
      conveneteId: accessibleConveneteIds ? { in: accessibleConveneteIds } : undefined
    },
    include: {
      convenete: true,
      workProgress: {
        select: {
          percentualObra: true
        }
      },
      repasses: {
        select: {
          valorRepasse: true
        }
      },
      paymentRequests: {
        where: {
          status: PaymentRequestStatus.PAGO
        },
        select: {
          valorNota: true,
          inssValor: true,
          issValor: true,
          pisValor: true,
          cofinsValor: true,
          irValor: true
        }
      }
    },
    orderBy: [{ instrumento: "asc" }]
  });

  return instruments.map((item) => {
    const totalRepassadoPorLista = item.repasses.reduce((acc, repasse) => acc + decimalToNumber(repasse.valorRepasse), 0);
    const totalRepassadoInstrumento = decimalToNumber(item.valorJaRepassado);
    const totalRepassado = Math.max(totalRepassadoPorLista, totalRepassadoInstrumento);
    const totalPagoSistema = item.paymentRequests.reduce((acc, request) => acc + getPaymentNetValue(request), 0);
    const saldoDisponivel = Math.max(0, totalRepassado - totalPagoSistema);

    return {
      id: item.id,
      instrumento: item.instrumento,
      proposta: item.proposta,
      objeto: item.objeto,
      banco: item.banco,
      agencia: item.agencia,
      conta: item.conta,
      conta_bancaria: item.contaBancaria,
      empresa_vencedora: item.empresaVencedora,
      cnpj_vencedora: item.cnpjVencedora,
      percentual_obra:
        item.workProgress !== null
          ? decimalToNumber(item.workProgress.percentualObra)
          : item.percentualFisicoMedicao !== null
            ? decimalToNumber(item.percentualFisicoMedicao)
            : null,
      proponente_id: item.conveneteId,
      proponente_nome: item.convenete?.nome ?? null,
      status: item.status,
      total_repassado: totalRepassado,
      total_pago_sistema: totalPagoSistema,
      saldo: saldoDisponivel
    };
  });
};

export const getPaymentRequestInstrumentById = async (instrumentId: number, user: CurrentUser) => {
  const items = await listPaymentRequestInstruments(user);
  return items.find((item) => item.id === instrumentId) ?? null;
};

export const listPaymentRequests = async (query: PaymentRequestListQueryInput, user: CurrentUser) => {
  const accessibleConveneteIds = await getAccessibleConveneteIds(user);
  if (accessibleConveneteIds && accessibleConveneteIds.length === 0) {
    return [];
  }

  return prisma.paymentRequest.findMany({
    where: {
      status: query.status,
      conveneteId: query.proponente_id ?? (accessibleConveneteIds ? { in: accessibleConveneteIds } : undefined),
      instrumentId: query.instrumento_id
    },
    include: {
      instrument: true,
      convenete: true,
      requestedBy: true
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });
};

export const listMappedPaymentRequests = async (query: PaymentRequestListQueryInput, user: CurrentUser) => {
  const items = await listPaymentRequests(query, user);
  return items.map(mapPaymentRequest);
};

export const createPaymentRequest = async (input: CreatePaymentRequestInput, user: CurrentUser) => {
  const instrument = await assertInstrumentAccess(input.instrumento_id, user);
  const tax = input.impostos;

  const created = await prisma.paymentRequest.create({
    data: {
      instrumentId: instrument.id,
      conveneteId: instrument.conveneteId!,
      requestedById: user.id,
      valorNota: input.valor_nota,
      valorBm: input.valor_bm,
      numeroBm: input.numero_bm,
      inssValor: tax.inss?.selecionado ? tax.inss.valor ?? 0 : 0,
      inssAliquota: tax.inss?.selecionado ? tax.inss.aliquota ?? 0 : 0,
      issValor: tax.iss?.selecionado ? tax.iss.valor ?? 0 : 0,
      issAliquota: tax.iss?.selecionado ? tax.iss.aliquota ?? 0 : 0,
      pisValor: tax.pis?.selecionado ? tax.pis.valor ?? 0 : 0,
      pisAliquota: tax.pis?.selecionado ? tax.pis.aliquota ?? 0 : 0,
      cofinsValor: tax.cofins?.selecionado ? tax.cofins.valor ?? 0 : 0,
      cofinsAliquota: tax.cofins?.selecionado ? tax.cofins.aliquota ?? 0 : 0,
      irValor: tax.ir?.selecionado ? tax.ir.valor ?? 0 : 0,
      irAliquota: tax.ir?.selecionado ? tax.ir.aliquota ?? 0 : 0,
      observacoes: input.observacoes || null
    },
    include: {
      instrument: true,
      convenete: true,
      requestedBy: true
    }
  });

  return mapPaymentRequest(created);
};

export const createPaymentRequestWithFiles = async (
  input: CreatePaymentRequestInput,
  user: CurrentUser,
  files: {
    notaFiscal?: { path: string; originalName: string; mimeType: string };
    empenho?: { path: string; originalName: string; mimeType: string };
  }
) => {
  const instrument = await assertInstrumentAccess(input.instrumento_id, user);
  const tax = input.impostos;

  const created = await prisma.paymentRequest.create({
    data: {
      instrumentId: instrument.id,
      conveneteId: instrument.conveneteId!,
      requestedById: user.id,
      valorNota: input.valor_nota,
      valorBm: input.valor_bm,
      numeroBm: input.numero_bm,
      inssValor: tax.inss?.selecionado ? tax.inss.valor ?? 0 : 0,
      inssAliquota: tax.inss?.selecionado ? tax.inss.aliquota ?? 0 : 0,
      issValor: tax.iss?.selecionado ? tax.iss.valor ?? 0 : 0,
      issAliquota: tax.iss?.selecionado ? tax.iss.aliquota ?? 0 : 0,
      pisValor: tax.pis?.selecionado ? tax.pis.valor ?? 0 : 0,
      pisAliquota: tax.pis?.selecionado ? tax.pis.aliquota ?? 0 : 0,
      cofinsValor: tax.cofins?.selecionado ? tax.cofins.valor ?? 0 : 0,
      cofinsAliquota: tax.cofins?.selecionado ? tax.cofins.aliquota ?? 0 : 0,
      irValor: tax.ir?.selecionado ? tax.ir.valor ?? 0 : 0,
      irAliquota: tax.ir?.selecionado ? tax.ir.aliquota ?? 0 : 0,
      notaFiscalPath: files.notaFiscal?.path ?? null,
      notaFiscalNomeOriginal: files.notaFiscal?.originalName ?? null,
      notaFiscalMimeType: files.notaFiscal?.mimeType ?? null,
      empenhoPath: files.empenho?.path ?? null,
      empenhoNomeOriginal: files.empenho?.originalName ?? null,
      empenhoMimeType: files.empenho?.mimeType ?? null,
      observacoes: input.observacoes || null
    },
    include: {
      instrument: true,
      convenete: true,
      requestedBy: true
    }
  });

  return mapPaymentRequest(created);
};

export const getPaymentRequestFile = async (
  id: number,
  tipo: "nota_fiscal" | "empenho",
  user: CurrentUser
) => {
  const accessibleConveneteIds = await getAccessibleConveneteIds(user);
  const item = await prisma.paymentRequest.findFirst({
    where: {
      id,
      conveneteId: accessibleConveneteIds ? { in: accessibleConveneteIds } : undefined
    }
  });

  if (!item) {
    return null;
  }

  if (tipo === "nota_fiscal") {
    return item.notaFiscalPath && item.notaFiscalNomeOriginal
      ? { path: item.notaFiscalPath, originalName: item.notaFiscalNomeOriginal, mimeType: item.notaFiscalMimeType }
      : null;
  }

  return item.empenhoPath && item.empenhoNomeOriginal
    ? { path: item.empenhoPath, originalName: item.empenhoNomeOriginal, mimeType: item.empenhoMimeType }
    : null;
};

export const updatePaymentRequestStatus = async (id: number, status: PaymentRequestStatus) => {
  const updated = await prisma.paymentRequest.update({
    where: { id },
    data: { status },
    include: {
      instrument: true,
      convenete: true,
      requestedBy: true
    }
  });

  return mapPaymentRequest(updated);
};
