import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const mainCount = await prisma.$queryRawUnsafe('SELECT count(*) FROM transferencias_discricionarias');
    const stageCount = await prisma.$queryRawUnsafe('SELECT count(*) FROM transferencias_discricionarias_stage');
    const syncStatus = await prisma.$queryRawUnsafe('SELECT * FROM transferencias_discricionarias_sync');
    
    console.log('Main Table:', mainCount);
    console.log('Stage Table:', stageCount);
    console.log('Sync Status:', syncStatus);
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
