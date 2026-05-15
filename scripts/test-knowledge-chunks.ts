import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const result: any = await prisma.$queryRawUnsafe('SELECT count(*) FROM knowledge_chunks;');
    const count = result[0]?.count?.toString() ?? '0';
    console.log(`\n✅ Sucesso! A tabela 'knowledge_chunks' foi encontrada.`);
    console.log(`📊 Total de registros na tabela: ${count}`);

    // Mostrar os primeiros registros, se houver
    if (parseInt(count) > 0) {
      const amostra: any = await prisma.$queryRawUnsafe('SELECT id, entity_type, entity_id, chunk_text FROM knowledge_chunks LIMIT 3;');
      console.log('\n🔍 Amostra dos dados:');
      console.table(amostra);
    }
  } catch (error: any) {
    console.error('\n❌ Erro ao consultar a tabela "knowledge_chunks".');
    console.error(error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
