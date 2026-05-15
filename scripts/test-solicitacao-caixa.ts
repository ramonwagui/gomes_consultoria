import { prisma } from "../src/lib/prisma";

const testSolicitacaoCaixa = async () => {
  const instrumento = await prisma.instrumentProposal.findFirst({
    where: { instrumento: { contains: "951608" } }
  });

  if (!instrumento) {
    console.error("Instrumento não encontrado!");
    return;
  }

  console.log("Instrumento encontrado:", instrumento.id, instrumento.instrumento);

  const user = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!user) {
    console.error("Usuário admin não encontrado!");
    return;
  }

  const ticket = await prisma.ticket.create({
    data: {
      titulo: "TESTE - Email recebido da CAIXA",
      descricao: "Origem: EMAIL\nRemetente: teste@gmail.com\nAssunto: Duvida sobre instrumento 951608/2023\n\nCorpo do email de teste...",
      status: "ABERTO",
      prioridade: "MEDIA",
      instrumentId: instrumento.id,
      instrumentoEncontrado: true,
      origem: "EMAIL",
      codigo: "TEST-" + Date.now(),
      createdByUserId: user.id
    }
  });

  console.log("Ticket criado:", ticket.id);

  await prisma.instrumentSolicitacaoCaixa.create({
    data: {
      instrumentId: instrumento.id,
      ticketId: ticket.id,
      tipo: "EMAIL_RECEBIDO",
      descricao: "E-mail recebido de teste@gmail.com",
      origemEmail: "teste@gmail.com",
      assuntoEmail: "Duvida sobre instrumento 951608/2023"
    }
  });

  console.log("Solicitação Caixa registrada!");

  const solicitacoes = await prisma.instrumentSolicitacaoCaixa.findMany({
    where: {
      instrumentId: instrumento.id
    },
    orderBy: { createdAt: "desc" }
  });

  console.log("\nSolicitações do instrumento:");
  console.log(JSON.stringify(solicitacoes, null, 2));

  await prisma.$disconnect();
};

testSolicitacaoCaixa();