import { prisma } from "../src/lib/prisma";

async function run() {
  const counts = await prisma.instrumentProposal.groupBy({
    by: ['concedente'],
    _count: {
      id: true
    }
  });
  console.log('--- Contagem de Concedentes ---');
  counts.forEach(c => {
    console.log(`${c.concedente || '(null)'}: ${c._count.id}`);
  });

  const examples = await prisma.instrumentProposal.findMany({
    where: {
      concedente: { not: null }
    },
    take: 10,
    select: { id: true, proposta: true, concedente: true }
  });
  console.log('\n--- Exemplos (Concedentes) ---');
  examples.forEach(e => {
    console.log(`ID ${e.id} | Proposta ${e.proposta} | Concedente: ${e.concedente}`);
  });
}

run();
