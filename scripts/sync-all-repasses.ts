import { prisma } from '../src/lib/prisma';
import { syncInstrumentRepassesFromDesembolsos } from '../src/modules/instrumentos/instrumentos.service';

async function main() {
  try {
    const instruments = await prisma.instrumentProposal.findMany({
      where: { conveneteId: { not: null } },
      select: { id: true, instrumento: true }
    });

    console.log(`Iniciando sincronizacao de repasses para ${instruments.length} instrumentos...`);

    let totalCriados = 0;
    let totalProcessados = 0;

    for (const inst of instruments) {
      try {
        const result = await syncInstrumentRepassesFromDesembolsos(inst.id);
        totalCriados += result.criados;
        totalProcessados++;
        if (totalProcessados % 10 === 0) {
          console.log(`Processados ${totalProcessados}/${instruments.length}...`);
        }
      } catch (err: any) {
        console.error(`Erro no instrumento ${inst.id} (${inst.instrumento}):`, err.message);
      }
    }

    console.log('\n=== RESULTADO FINAL ===');
    console.log(`Instrumentos processados: ${totalProcessados}`);
    console.log(`Novos repasses criados: ${totalCriados}`);

    const somaTotal = await prisma.instrumentProposal.aggregate({
      _sum: { valorJaRepassado: true }
    });
    console.log(`Soma total ja repassada no dashboard: R$ ${Number(somaTotal._sum.valorJaRepassado || 0).toLocaleString('pt-BR')}`);

  } catch (error: any) {
    console.error('Erro fatal:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
