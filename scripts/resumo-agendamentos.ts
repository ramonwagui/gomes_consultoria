import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  
  const ticketsSummary = await prisma.ticket.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const pendingTickets = await prisma.ticket.findMany({
    where: {
      status: { in: ['ABERTO', 'EM_ANDAMENTO'] },
      prazoAlvo: { not: null },
    },
    orderBy: { prazoAlvo: 'asc' },
    take: 10,
  });

  const instrumentsExpiring = await prisma.instrumentProposal.findMany({
    where: {
      ativo: true,
      status: { in: ['EM_EXECUCAO', 'ASSINADO'] },
      vigenciaFim: { lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) }, // Próximos 30 dias
    },
    orderBy: { vigenciaFim: 'asc' },
    take: 10,
  });

  console.log('--- RESUMO DE TICKETS ---');
  ticketsSummary.forEach(s => console.log(`${s.status}: ${s._count.id}`));
  
  console.log('\n--- PRÓXIMOS PRAZOS DE TICKETS ---');
  pendingTickets.forEach(t => console.log(`${t.codigo} | ${t.titulo} | Prazo: ${t.prazoAlvo?.toLocaleDateString()}`));

  console.log('\n--- CONVÊNIOS VENCENDO (Próximos 30 dias) ---');
  instrumentsExpiring.forEach(i => console.log(`${i.instrumento} | Fim Vigência: ${i.vigenciaFim.toLocaleDateString()}`));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
