import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    console.log('Limpando tabelas de stage...');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE transferencias_discricionarias_stage, transferencias_discricionarias_proposta_stage, transferencias_discricionarias_desembolsos_stage');
    console.log('✅ Tabelas de stage limpas com sucesso.');
    
    await prisma.$executeRawUnsafe("UPDATE transferencias_discricionarias_sync SET status = 'pending', detalhe = 'Tabelas limpas manualmente para liberar espaco' WHERE id = 1");
    console.log('✅ Status de sincronizacao resetado.');
  } catch (error) {
    console.error('❌ Erro ao limpar tabelas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
