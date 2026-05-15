import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    const proponentes = await prisma.convenete.findMany({ select: { id: true, nome: true, cnpj: true } });
    console.log('Proponentes Cadastrados:', proponentes.length);
    
    const reportData = await prisma.$queryRawUnsafe('SELECT cnpj, COUNT(*) as total FROM transferencias_discricionarias GROUP BY cnpj');
    console.log('Dados no Relatorio (por CNPJ):', reportData);

    const instruments = await prisma.instrumentProposal.groupBy({
      by: ['conveneteId'],
      _count: { _all: true }
    });
    console.log('Instrumentos Oficiais (por Proponente ID):', instruments);

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
