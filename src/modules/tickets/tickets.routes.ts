import { Prisma, UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import {
  addTicketCommentSchema,
  associateTicketInstrumentSchema,
  createTicketSchema,
  ticketChecklistItemIdParamSchema,
  ticketIdParamSchema,
  ticketListQuerySchema,
  toggleTicketChecklistItemSchema,
  updateTicketSchema
} from "./tickets.schema";
import {
  addTicketComment,
  addTicketChecklistItems,
  associateTicketToInstrument,
  createTicket,
  dissociateTicketFromInstrument,
  getTicketById,
  listAssignableUsers,
  listTickets,
  toggleTicketChecklistItem,
  updateTicket
} from "./tickets.service";
import { hasValidResolutionReason, toDateOnly } from "./tickets.validation";

export const ticketsRouter = Router();

ticketsRouter.use(authenticate);

const mapTicket = (item: Awaited<ReturnType<typeof getTicketById>>) => {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    codigo: item.codigo,
    titulo: item.titulo,
    descricao: item.descricao,
    status: item.status,
    prioridade: item.prioridade,
    origem: item.origem,
    instrumento_informado: item.instrumentoInformado,
    instrumento_encontrado: item.instrumentoEncontrado,
    prazo_alvo: toDateOnly(item.prazoAlvo),
    resolvido_em: item.resolvidoEm ? item.resolvidoEm.toISOString() : null,
    motivo_resolucao: item.motivoResolucao,
    instrumento: item.instrument
      ? {
          id: item.instrument.id,
          proposta: item.instrument.proposta,
          instrumento: item.instrument.instrumento,
          objeto: item.instrument.objeto,
          status: item.instrument.status
        }
      : null,
    responsavel: item.responsavelUser
      ? {
          id: item.responsavelUser.id,
          nome: item.responsavelUser.nome,
          email: item.responsavelUser.email,
          role: item.responsavelUser.role
        }
      : null,
    criado_por: {
      id: item.createdByUser.id,
      nome: item.createdByUser.nome,
      email: item.createdByUser.email,
      role: item.createdByUser.role
    },
    comentarios: item.comments.map((comment) => ({
      id: comment.id,
      mensagem: comment.mensagem,
      created_at: comment.createdAt.toISOString(),
      updated_at: comment.updatedAt.toISOString(),
      user: {
        id: comment.user.id,
        nome: comment.user.nome,
        email: comment.user.email,
        role: comment.user.role
      }
    })),
    checklist_itens: item.checklistItems.map((checkItem) => ({
      id: checkItem.id,
      descricao: checkItem.descricao,
      concluido: checkItem.concluido,
      concluido_em: checkItem.concluidoEm ? checkItem.concluidoEm.toISOString() : null,
      ordem: checkItem.ordem,
      created_at: checkItem.createdAt.toISOString(),
      updated_at: checkItem.updatedAt.toISOString()
    })),
    created_at: item.createdAt.toISOString(),
    updated_at: item.updatedAt.toISOString()
  };
};

const mapTicketListItem = (item: Awaited<ReturnType<typeof listTickets>>[number]) => ({
  id: item.id,
  codigo: item.codigo,
  titulo: item.titulo,
  descricao: item.descricao,
  status: item.status,
  prioridade: item.prioridade,
  origem: item.origem,
  instrumento_informado: item.instrumentoInformado,
  instrumento_encontrado: item.instrumentoEncontrado,
  prazo_alvo: toDateOnly(item.prazoAlvo),
  resolvido_em: item.resolvidoEm ? item.resolvidoEm.toISOString() : null,
  motivo_resolucao: item.motivoResolucao,
  instrumento: item.instrument
    ? {
        id: item.instrument.id,
        proposta: item.instrument.proposta,
        instrumento: item.instrument.instrumento,
        objeto: item.instrument.objeto,
        status: item.instrument.status
      }
    : null,
  responsavel: item.responsavelUser
    ? {
        id: item.responsavelUser.id,
        nome: item.responsavelUser.nome,
        email: item.responsavelUser.email,
        role: item.responsavelUser.role
      }
    : null,
  criado_por: {
    id: item.createdByUser.id,
    nome: item.createdByUser.nome,
    email: item.createdByUser.email,
    role: item.createdByUser.role
  },
  comentarios: [],
  checklist_itens: item.checklistItems.map((checkItem) => ({
    id: checkItem.id,
    descricao: checkItem.descricao,
    concluido: checkItem.concluido,
    concluido_em: checkItem.concluidoEm ? checkItem.concluidoEm.toISOString() : null,
    ordem: checkItem.ordem,
    created_at: checkItem.createdAt.toISOString(),
    updated_at: checkItem.updatedAt.toISOString()
  })),
  created_at: item.createdAt.toISOString(),
  updated_at: item.updatedAt.toISOString()
});

ticketsRouter.get("/", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), async (req, res) => {
  const parsed = ticketListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Filtros invalidos",
      issues: parsed.error.flatten()
    });
  }

  const items = await listTickets(parsed.data, req.user ?? undefined);
  return res.json(items.map(mapTicketListItem));
});

ticketsRouter.get(
  "/assignable-users",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (_req, res) => {
    const users = await listAssignableUsers(_req.user ?? undefined);
    return res.json({
      itens: users
    });
  }
);

ticketsRouter.get("/:id", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), async (req, res) => {
  const idParam = ticketIdParamSchema.safeParse(req.params);
  if (!idParam.success) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const ticket = await getTicketById(idParam.data.id, req.user ?? undefined);
  if (!ticket) {
    return res.status(404).json({ message: "Ticket nao encontrado." });
  }

  return res.json(mapTicket(ticket));
});

ticketsRouter.post("/", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Usuario nao autenticado." });
  }

  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  if (parsed.data.status === "RESOLVIDO" && !hasValidResolutionReason(parsed.data.motivo_resolucao)) {
    return res
      .status(422)
      .json({ message: "Motivo de resolucao e obrigatorio ao concluir o ticket (minimo 8 caracteres)." });
  }

  try {
    const created = await createTicket(parsed.data, { createdByUserId: req.user.id }, req.user);
    await addTicketChecklistItems(created.id, []);
    const full = await getTicketById(created.id, req.user);
    return res.status(201).json(mapTicket(full));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "Nao foi possivel gerar um codigo unico para o ticket. Tente novamente." });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return res.status(422).json({ message: "Instrumento ou responsavel informado nao encontrado." });
    }
    return res.status(500).json({ message: "Erro interno ao criar ticket." });
  }
});

ticketsRouter.put("/:id", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Usuario nao autenticado." });
  }

  const idParam = ticketIdParamSchema.safeParse(req.params);
  if (!idParam.success) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const parsed = updateTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const existing = await getTicketById(idParam.data.id, req.user ?? undefined);
    if (!existing) {
      return res.status(404).json({ message: "Ticket nao encontrado." });
    }

    const nextStatus = parsed.data.status ?? existing.status;
    const nextReason = Object.prototype.hasOwnProperty.call(parsed.data, "motivo_resolucao")
      ? parsed.data.motivo_resolucao
      : existing.motivoResolucao;

    const isReopeningTicket =
      existing.status === "RESOLVIDO" && (nextStatus === "ABERTO" || nextStatus === "EM_ANDAMENTO");
    if (isReopeningTicket && req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: "Somente ADMIN pode reabrir ticket resolvido." });
    }

    if (nextStatus === "RESOLVIDO" && !hasValidResolutionReason(nextReason)) {
      return res
        .status(422)
        .json({ message: "Motivo de resolucao e obrigatorio ao concluir o ticket (minimo 8 caracteres)." });
    }

    await updateTicket(idParam.data.id, parsed.data);
    const updated = await getTicketById(idParam.data.id);
    return res.json(mapTicket(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return res.status(422).json({ message: "Instrumento ou responsavel informado nao encontrado." });
    }
    return res.status(500).json({ message: "Erro interno ao atualizar ticket." });
  }
});

ticketsRouter.post("/:id/comments", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Usuario nao autenticado." });
  }

  const idParam = ticketIdParamSchema.safeParse(req.params);
  if (!idParam.success) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const parsed = addTicketCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  const existing = await getTicketById(idParam.data.id);
  if (!existing) {
    return res.status(404).json({ message: "Ticket nao encontrado." });
  }

  await addTicketComment(idParam.data.id, parsed.data, { userId: req.user.id });
  const updated = await getTicketById(idParam.data.id);
  return res.status(201).json(mapTicket(updated));
});

ticketsRouter.patch(
  "/:id/checklist/:itemId",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const idParam = ticketChecklistItemIdParamSchema.safeParse(req.params);
    if (!idParam.success) {
      return res.status(400).json({ message: "IDs invalidos." });
    }

    const parsed = toggleTicketChecklistItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ message: "Payload invalido", issues: parsed.error.flatten() });
    }

    const existing = await getTicketById(idParam.data.id);
    if (!existing) {
      return res.status(404).json({ message: "Ticket nao encontrado." });
    }

    try {
      await toggleTicketChecklistItem(idParam.data.id, idParam.data.itemId, parsed.data.concluido);
      const updated = await getTicketById(idParam.data.id);
      return res.json(mapTicket(updated));
    } catch (error) {
      if (error instanceof Error && error.message === "TICKET_CHECKLIST_ITEM_NOT_FOUND") {
        return res.status(404).json({ message: "Item de checklist nao encontrado para este ticket." });
      }
      return res.status(500).json({ message: "Erro interno ao atualizar checklist do ticket." });
    }
  }
);

ticketsRouter.patch(
  "/:id/instrumento",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const idParam = ticketIdParamSchema.safeParse(req.params);
    if (!idParam.success) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const parsed = associateTicketInstrumentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ message: "Payload invalido", issues: parsed.error.flatten() });
    }

    const existing = await getTicketById(idParam.data.id);
    if (!existing) {
      return res.status(404).json({ message: "Ticket nao encontrado." });
    }

    try {
      const result = await associateTicketToInstrument(idParam.data.id, parsed.data.instrument_id);
      const updated = await getTicketById(idParam.data.id);
      return res.json({ success: true, ticket: mapTicket(updated), solicitacaoCaixa: result.solicitacao });
    } catch (error) {
      if (error instanceof Error && error.message === "INSTRUMENT_NOT_FOUND") {
        return res.status(422).json({ message: "Instrumento nao encontrado." });
      }
      return res.status(500).json({ message: "Erro interno ao associar instrumento." });
    }
  }
);

ticketsRouter.delete(
  "/:id/instrumento",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const idParam = ticketIdParamSchema.safeParse(req.params);
    if (!idParam.success) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const existing = await getTicketById(idParam.data.id);
    if (!existing) {
      return res.status(404).json({ message: "Ticket nao encontrado." });
    }

    try {
      await dissociateTicketFromInstrument(idParam.data.id);
      const updated = await getTicketById(idParam.data.id);
      return res.json({ success: true, ticket: mapTicket(updated) });
    } catch {
      return res.status(500).json({ message: "Erro interno ao desassociar instrumento." });
    }
  }
);

