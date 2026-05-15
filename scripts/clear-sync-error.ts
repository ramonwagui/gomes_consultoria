import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    const status = await (prisma as any).transferenciaDiscricionariaSync.findUnique({ where: { id: 1 } });
    if (status) {
      console.log('--- STATUS ATUAL NO BANCO ---');
      console.log('Status:', status.status);
      console.log('Detalhe:', status.detalhe);
      console.log('Atualizado em:', status.atualizado_em);
      
      if (status.status === 'error' || status.status === 'partial') {
        console.log('\nLimpando erro antigo do banco...');
        await (prisma as any).transferenciaDiscricionariaSync.update({
          where: { id: 1 },
          data: {
            status: 'pending',
            detalhe: 'Erro limpo manualmente apos correcao do codigo.'
          }
        });
        console.log('✅ Erro limpo. Atualize o seu navegador.');
      }
    } else {
      console.log('Nenhum registro de sincronizacao encontrado no banco.');
    }
  } catch (error) {
    // Se não houver mapeamento no Prisma Client ainda (pois é uma tabela manual)
    try {
      const rows: any[] = await prisma.$queryRawUnsafe('SELECT * FROM transferencias_discricionarias_sync WHERE id = 1');
      if (rows.length > 0) {
        const row = rows[0];
        console.log('--- STATUS ATUAL (VIA SQL) ---');
        console.log('Status:', row.status);
        console.log('Detalhe:', row.detalhe);
        
        if (row.status === 'error' || row.status === 'partial') {
          await prisma.$executeRawUnsafe("UPDATE transferencias_discricionarias_sync SET status = 'pending', detalhe = 'Erro limpo manualmente apos correcao' WHERE id = 1");
          console.log('✅ Erro limpo via SQL.');
        }
      }
    } catch (e: any) {
      console.error('Erro ao consultar via SQL:', e.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
