import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { SolicitacaoCaixaTipo } from "@prisma/client";

export const registrarEmailRecebido = async (
  instrumentId: number,
  fromEmail: string,
  subject: string | null,
  ticketId?: number
) => {
  return prisma.instrumentSolicitacaoCaixa.create({
    data: {
      instrumentId,
      ticketId: ticketId ?? null,
      tipo: SolicitacaoCaixaTipo.EMAIL_RECEBIDO,
      descricao: `E-mail recebido de ${fromEmail}`,
      origemEmail: fromEmail,
      assuntoEmail: subject
    }
  });
};

export const registrarComentario = async (
  ticketId: number,
  preview: string
) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { instrumentId: true }
  });

  if (!ticket?.instrumentId) {
    return null;
  }

  const truncated = preview.length > 150 ? `${preview.slice(0, 150)}...` : preview;

  return prisma.instrumentSolicitacaoCaixa.create({
    data: {
      instrumentId: ticket.instrumentId,
      ticketId,
      tipo: SolicitacaoCaixaTipo.COMENTARIO_TICKET,
      descricao: `Novo comentário: ${truncated}`
    }
  });
};

export const registrarRespostaEnviada = async (ticketId: number) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { instrumentId: true }
  });

  if (!ticket?.instrumentId) {
    return null;
  }

  return prisma.instrumentSolicitacaoCaixa.create({
    data: {
      instrumentId: ticket.instrumentId,
      ticketId,
      tipo: SolicitacaoCaixaTipo.RESPOTA_ENVIADA,
      descricao: "Resposta enviada ao solicitante"
    }
  });
};

export const registrarAssociacaoManual = async (
  instrumentId: number,
  ticketId: number,
  instrumentoDescricao: string
) => {
  return prisma.instrumentSolicitacaoCaixa.create({
    data: {
      instrumentId,
      ticketId,
      tipo: SolicitacaoCaixaTipo.ASSOCIAÇÃO_MANUAL,
      descricao: `Ticket associado ao instrumento "${instrumentoDescricao}" manualmente`
    }
  });
};

export const listarSolicitacoesCaixa = async (
  instrumentId: number,
  options?: {
    tipo?: SolicitacaoCaixaTipo;
    limit?: number;
    offset?: number;
  }
) => {
  const where: Prisma.InstrumentSolicitacaoCaixaWhereInput = { instrumentId };
  if (options?.tipo) {
    where.tipo = options.tipo;
  }

  const itens = await prisma.instrumentSolicitacaoCaixa.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 20,
    skip: options?.offset ?? 0
  });

  const ticketIds = itens.filter(i => i.ticketId).map(i => i.ticketId!);
  const ticketsMap = new Map<number, { id: number; codigo: string; titulo: string }>();
  
  if (ticketIds.length > 0) {
    const tickets = await prisma.ticket.findMany({
      where: { id: { in: ticketIds } },
      select: { id: true, codigo: true, titulo: true }
    });
    tickets.forEach(t => ticketsMap.set(t.id, t));
  }

  const total = await prisma.instrumentSolicitacaoCaixa.count({ where });

  return { 
    itens: itens.map(item => ({
      ...item,
      ticket: item.ticketId ? ticketsMap.get(item.ticketId) ?? null : null
    })), 
    total 
  };
};

export const buscarInstrumentosParaSelect = async (q: string) => {
  const instrumentos = await prisma.instrumentProposal.findMany({
    where: {
      ativo: true,
      OR: [
        { proposta: { contains: q } },
        { instrumento: { contains: q } },
        { objeto: { contains: q } }
      ]
    },
    select: {
      id: true,
      proposta: true,
      instrumento: true,
      objeto: true
    },
    orderBy: [{ proposta: "desc" }],
    take: 20
  });

  return instrumentos.map((inst) => ({
    id: inst.id,
    label: inst.proposta || inst.instrumento || `Instrumento #${inst.id}`,
    proposta: inst.proposta,
    instrumento: inst.instrumento,
    objeto: inst.objeto
  }));
};