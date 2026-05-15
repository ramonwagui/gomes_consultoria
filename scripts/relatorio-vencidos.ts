import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const startOfSearch = new Date('2026-04-09T00:00:00.000Z');
  const endOfSearch = new Date('2026-04-11T23:59:59.999Z');

  const vencidos = await prisma.instrumentProposal.findMany({
    where: {
      vigenciaFim: {
        gte: startOfSearch,
        lte: endOfSearch
      },
      ativo: true
    },
    orderBy: { vigenciaFim: 'desc' }
  });

  console.log('\n====================================================================================================');
  console.log('                 RELATÓRIO DE CONVÊNIOS VENCIDOS (09/04 a 11/04)');
  console.log('====================================================================================================\n');
  
  const header = `${'INSTRUMENTO'.padEnd(18)} | ${'STATUS'.padEnd(15)} | ${'VALOR REPASSE'.padEnd(15)} | ${'OBJETO'}`;
  console.log(header);
  console.log('-'.repeat(header.length + 40));

  vencidos.forEach(i => {
    const valor = Number(i.valorRepasse).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const statusStr = i.status.padEnd(15);
    const instrumentoStr = i.instrumento.padEnd(18);
    const valorStr = valor.padEnd(15);
    const objetoResumo = i.objeto.length > 40 ? i.objeto.substring(0, 37) + '...' : i.objeto.padEnd(40);
    
    console.log(`${instrumentoStr} | ${statusStr} | ${valorStr} | ${objetoResumo}`);
  });

  console.log('\n' + '-'.repeat(header.length + 40));
  console.log(`Total de instrumentos vencidos ontem: ${vencidos.length}`);
  console.log('====================================================================================================\n');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
