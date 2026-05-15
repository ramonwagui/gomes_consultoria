import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe('SELECT cnpj FROM transferencias_discricionarias LIMIT 1');
    console.log('CNPJ Format:', rows);
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
