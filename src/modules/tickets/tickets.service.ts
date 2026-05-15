import { Prisma, TicketSource, TicketStatus, UserRole } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { registrarAssociacaoManual, registrarComentario } from "../solicitacao-caixa/solicitacao-caixa.service";
import {
  AddTicketCommentInput,
  CreateTicketInput,
  TicketListQueryInput,
  UpdateTicketInput
} from "./tickets.schema";

type CurrentUser = { id: number; role: UserRole };
const isDemoUser = (user?: CurrentUser | null) => user?.role === UserRole.DEMONSTRACAO;

const buildTicketCode = () => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TCK-${year}-${random}`;
};

const createTicketCode = async (tx: Prisma.TransactionClient) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const codigo = buildTicketCode();
    const exists = await tx.ticket.findUnique({ where: { codigo }, select: { id: true } });
    if (!exists) {
      return codigo;
    }
  }
  throw new Error("TICKET_CODE_GENERATION_FAILED");
};

const parseDateOnlyToUtc = (value: string) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseOptionalDate = (value?: string | null) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return parseDateOnlyToUtc(value);
};

const isResolvedStatus = (status: TicketStatus) => status === TicketStatus.RESOLVIDO;

const touchTicketUpdatedAt = async (ticketId: number) => {
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { updatedAt: new Date() },
    select: { id: true }
  });
};

export const listAssignableUsers = async (user?: CurrentUser) => {
  if (isDemoUser(user)) {
    return prisma.user.findMany({
      where: { id: user!.id },
      orderBy: [{ nome: "asc" }, { email: "asc" }],
      select: { id: true, nome: true, email: true, role: true }
    });
  }

  return prisma.user.findMany({
    orderBy: [{ nome: "asc" }, { email: "asc" }],
    select: {
      id: true,
      nome: true,
      email: true,
      role: true
    }
  });
};

export const listTickets = async (query: TicketListQueryInput, user?: CurrentUser) => {
  const where: Prisma.TicketWhereInput = {};

  if (isDemoUser(user)) {
    where.demoOwnerUserId = user!.id;
  } else if (user) {
    where.demoOwnerUserId = null;
  }

  if (query.status) {
    where.status = query.status;
  }
  if (query.prioridade) {
    where.prioridade = query.prioridade;
  }
  if (query.origem) {
    where.origem = query.origem;
  }
  if (query.instrument_id !== undefined) {
    where.instrumentId = query.instrument_id;
  }
  if (query.responsavel_user_id !== undefined) {
    where.responsavelUserId = query.responsavel_user_id;
  }
  if (query.q) {
    where.OR = [
      { codigo: { contains: query.q } },
      { titulo: { contains: query.q } },
      { descricao: { contains: query.q } },
      { instrumentoInformado: { contains: query.q } },
      { instrument: { instrumento: { contains: query.q } } },
      { instrument: { proposta: { contains: query.q } } }
    ];
  }

  if (query.somente_atrasados) {
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    const andConditions = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [
      ...andConditions,
      {
        status: {
          in: [TicketStatus.ABERTO, TicketStatus.EM_ANDAMENTO]
        }
      },
      {
        prazoAlvo: {
          not: null,
          lt: todayUtc
        }
      }
    ];
  }

  return prisma.ticket.findMany({
    where,
    include: {
      instrument: {
        select: {
          id: true,
          proposta: true,
          instrumento: true,
          objeto: true,
          status: true
        }
      },
      responsavelUser: {
        select: {
          id: true,
          nome: true,
          email: true,
          role: true
        }
      },
      createdByUser: {
        select: {
          id: true,
          nome: true,
          email: true,
          role: true
        }
      },
      checklistItems: {
        select: {
          id: true,
          descricao: true,
          concluido: true,
          concluidoEm: true,
          ordem: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: [{ ordem: "asc" }, { id: "asc" }]
      }
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }]
  });
};

export const getTicketById = async (id: number, user?: CurrentUser) => {
  return prisma.ticket.findFirst({
    where: {
      id,
      ...(isDemoUser(user) ? { demoOwnerUserId: user!.id } : user ? { demoOwnerUserId: null } : {})
    },
    include: {
      instrument: {
        select: {
          id: true,
          proposta: true,
          instrumento: true,
          objeto: true,
          status: true
        }
      },
      responsavelUser: {
        select: {
          id: true,
          nome: true,
          email: true,
          role: true
        }
      },
      createdByUser: {
        select: {
          id: true,
          nome: true,
          email: true,
          role: true
        }
      },
      comments: {
        include: {
          user: {
            select: {
              id: true,
              nome: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }]
      },
      checklistItems: {
        select: {
          id: true,
          descricao: true,
          concluido: true,
          concluidoEm: true,
          ordem: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: [{ ordem: "asc" }, { id: "asc" }]
      }
    }
  });
};

export const addTicketChecklistItems = async (ticketId: number, items: string[]) => {
  const normalized = items
    .map((item) => item.trim())
    .filter((item) => item.length >= 3)
    .slice(0, 20);

  if (normalized.length === 0) {
    return [];
  }

  await prisma.ticketChecklistItem.createMany({
    data: normalized.map((descricao, index) => ({
      ticketId,
      descricao,
      ordem: index
    }))
  });

  await touchTicketUpdatedAt(ticketId);

  return prisma.ticketChecklistItem.findMany({
    where: { ticketId },
    orderBy: [{ ordem: "asc" }, { id: "asc" }]
  });
};

export const toggleTicketChecklistItem = async (ticketId: number, itemId: number, concluido: boolean) => {
  const existing = await prisma.ticketChecklistItem.findFirst({
    where: {
      id: itemId,
      ticketId
    },
    select: { id: true }
  });

  if (!existing) {
    throw new Error("TICKET_CHECKLIST_ITEM_NOT_FOUND");
  }

  const updated = await prisma.ticketChecklistItem.update({
    where: { id: itemId },
    data: {
      concluido,
      concluidoEm: concluido ? new Date() : null
    }
  });

  await touchTicketUpdatedAt(ticketId);

  return updated;
};

export const createTicket = async (
  input: CreateTicketInput,
  payload: {
    createdByUserId: number;
    source?: TicketSource;
  },
  user?: CurrentUser
) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const codigo = await createTicketCode(tx);

        return tx.ticket.create({
          data: {
            codigo,
            titulo: input.titulo,
            descricao: input.descricao,
            status: input.status ?? TicketStatus.ABERTO,
            prioridade: input.prioridade,
            origem: payload.source ?? TicketSource.MANUAL,
            prazoAlvo: parseOptionalDate(input.prazo_alvo),
            resolvidoEm: isResolvedStatus(input.status ?? TicketStatus.ABERTO) ? new Date() : null,
            motivoResolucao: isResolvedStatus(input.status ?? TicketStatus.ABERTO) ? input.motivo_resolucao ?? null : null,
            instrumentId: input.instrument_id,
            instrumentoInformado: input.instrumento_informado,
            instrumentoEncontrado: Boolean(input.instrument_id),
            responsavelUserId: input.responsavel_user_id,
            createdByUserId: payload.createdByUserId,
            demoOwnerUserId: isDemoUser(user) ? user!.id : null
          }
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        continue;
      }
      throw error;
    }
  }

  throw new Error("TICKET_CODE_CONFLICT_RETRY_FAILED");
};

export const updateTicket = async (id: number, input: UpdateTicketInput) => {
  const existing = await prisma.ticket.findUnique({
    where: { id },
    select: {
      status: true
    }
  });

  if (!existing) {
    throw new Error("TICKET_NOT_FOUND");
  }

  const nextStatus = input.status ?? existing.status;
  const isResolvingNow = nextStatus === TicketStatus.RESOLVIDO;
  const data: Prisma.TicketUncheckedUpdateInput = {
    titulo: input.titulo,
    status: input.status,
    prioridade: input.prioridade
  };

  if (Object.prototype.hasOwnProperty.call(input, "descricao")) {
    data.descricao = input.descricao ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "prazo_alvo")) {
    data.prazoAlvo = parseOptionalDate(input.prazo_alvo) ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "instrument_id")) {
    data.instrumentId = input.instrument_id ?? null;
    data.instrumentoEncontrado = Boolean(input.instrument_id);
  }
  if (Object.prototype.hasOwnProperty.call(input, "instrumento_informado")) {
    data.instrumentoInformado = input.instrumento_informado ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "responsavel_user_id")) {
    data.responsavelUserId = input.responsavel_user_id ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(input, "status")) {
    data.resolvidoEm = isResolvingNow ? new Date() : null;
    data.motivoResolucao = isResolvingNow ? (input.motivo_resolucao ?? null) : null;
  } else if (Object.prototype.hasOwnProperty.call(input, "motivo_resolucao")) {
    data.motivoResolucao = input.motivo_resolucao ?? null;
  }

  return prisma.ticket.update({
    where: { id },
    data
  });
};

export const addTicketComment = async (
  id: number,
  input: AddTicketCommentInput,
  payload: {
    userId: number;
  }
) => {
  const comment = await prisma.ticketComment.create({
    data: {
      ticketId: id,
      userId: payload.userId,
      mensagem: input.mensagem
    }
  });

  if (payload.userId) {
    await registrarComentario(id, input.mensagem);
  }

  await touchTicketUpdatedAt(id);

  return comment;
};

export const associateTicketToInstrument = async (ticketId: number, instrumentId: number) => {
  const instrument = await prisma.instrumentProposal.findUnique({
    where: { id: instrumentId },
    select: { proposta: true, instrumento: true }
  });

  if (!instrument) {
    throw new Error("INSTRUMENT_NOT_FOUND");
  }

  const instrumentoDescricao = instrument.proposta || instrument.instrumento || `Instrumento #${instrumentId}`;

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      instrumentId,
      instrumentoEncontrado: true
    }
  });

  const solicitacao = await registrarAssociacaoManual(instrumentId, ticketId, instrumentoDescricao);

  return { solicitacao };
};

export const dissociateTicketFromInstrument = async (ticketId: number) => {
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      instrumentId: null,
      instrumentoEncontrado: false
    }
  });

  return { success: true };
};
