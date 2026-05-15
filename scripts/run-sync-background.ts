import { PrismaClient } from '@prisma/client';
import { sincronizarTransferenciasDiscricionarias } from './src/modules/transferencias-discricionarias/transferencias-discricionarias.service';
import fs from 'fs';

async function run() {
  const logFile = 'sync.log';
  try {
    fs.writeFileSync(logFile, `Iniciando sincronizacao às ${new Date().toISOString()}...\n`);
    const result = await sincronizarTransferenciasDiscricionarias(true);
    fs.appendFileSync(logFile, `\nSincronizacao concluida com sucesso:\n${JSON.stringify(result, null, 2)}`);
  } catch (err: any) {
    fs.appendFileSync(logFile, `\nErro na sincronizacao:\n${err.message}\n${err.stack}`);
  } finally {
    process.exit(0);
  }
}

run();
