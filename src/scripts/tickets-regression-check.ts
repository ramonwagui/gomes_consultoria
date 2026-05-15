import { UserRole } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { createTicketSchema, updateTicketSchema } from "../modules/tickets/tickets.schema";
import { createTicket, getTicketById, updateTicket } from "../modules/tickets/tickets.service";
import { hasValidResolutionReason, toDateOnly } from "../modules/tickets/tickets.validation";

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const run = async () => {
  const now = Date.now();
  const creatorEmail = `regression.creator.${now}@gestconv.local`;
  const assigneeEmail = `regression.assignee.${now}@gestconv.local`;
  let ticketId: number | null = null;

  try {
    const creator = await prisma.user.create({
      data: {
        nome: "Regression Creator",
        email: creatorEmail,
        passwordHash: "not-used",
        role: UserRole.ADMIN
      }
    });

    const assignee = await prisma.user.create({
      data: {
        nome: "Regression Assignee",
        email: assigneeEmail,
        passwordHash: "not-used",
        role: UserRole.GESTOR
      }
    });

    const invalidCreateDate = createTicketSchema.safeParse({
      titulo: "Ticket de teste",
      prazo_alvo: "31/03/2026"
    });
    assert(!invalidCreateDate.success, "createTicketSchema deveria rejeitar data invalida");

    const invalidUpdateDate = updateTicketSchema.safeParse({ prazo_alvo: "2026-99-99" });
    assert(!invalidUpdateDate.success, "updateTicketSchema deveria rejeitar data invalida");

    assert(!hasValidResolutionReason("curto"), "motivo curto deve ser invalido");
    assert(hasValidResolutionReason("Motivo com tamanho minimo"), "motivo valido deve ser aceito");

    const created = await createTicket(
      {
        titulo: "Regressao: limpar campos opcionais",
        descricao: "Ticket para validar limpeza de campos",
        status: "ABERTO",
        prioridade: "MEDIA",
        prazo_alvo: "2026-03-31",
        responsavel_user_id: assignee.id
      },
      {
        createdByUserId: creator.id
      }
    );

    ticketId = created.id;

    const beforeClear = await getTicketById(created.id);
    assert(beforeClear !== null, "ticket criado deve existir");
    assert(toDateOnly(beforeClear?.prazoAlvo ?? null) === "2026-03-31", "prazo inicial deve preservar data sem deslocamento");
    assert(beforeClear?.responsavelUserId === assignee.id, "responsavel inicial deve estar preenchido");

    await updateTicket(created.id, {
      prazo_alvo: null,
      responsavel_user_id: null,
      instrumento_informado: null,
      descricao: null
    });

    const afterClear = await getTicketById(created.id);
    assert(afterClear !== null, "ticket atualizado deve existir");
    assert(afterClear?.prazoAlvo === null, "prazo_alvo deve ser limpo para null");
    assert(afterClear?.responsavelUserId === null, "responsavel_user_id deve ser limpo para null");
    assert(afterClear?.instrumentoInformado === null, "instrumento_informado deve ser limpo para null");
    assert(afterClear?.descricao === null, "descricao deve ser limpa para null");

    console.log("OK: regressao de tickets validada com sucesso.");
  } finally {
    if (ticketId !== null) {
      await prisma.ticketComment.deleteMany({ where: { ticketId } });
      await prisma.ticket.deleteMany({ where: { id: ticketId } });
    }

    await prisma.user.deleteMany({ where: { email: { in: [creatorEmail, assigneeEmail] } } });
  }
};

run()
  .catch((error) => {
    console.error("FALHA na regressao de tickets:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
