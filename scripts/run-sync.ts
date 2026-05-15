import { PrismaClient } from '@prisma/client';
import { sincronizarTransferenciasDiscricionarias } from '../src/modules/transferencias-discricionarias/transferencias-discricionarias.service';
import fs from 'fs';

async function run() {
  const logFile = 'sync-status.log';
  try {
    fs.writeFileSync(logFile, `Iniciando sincronizacao às ${new Date().toISOString()}...\n`);
    // Faz a sincronização e captura os "console.log" originais também
    const originalLog = console.log;
    console.log = (...args) => {
      fs.appendFileSync(logFile, args.join(' ') + '\n');
      originalLog(...args);
    };

    const result = await sincronizarTransferenciasDiscricionarias(true);
    fs.appendFileSync(logFile, `\n✅ Sincronizacao concluida com sucesso!\nForam processados ${result.total_registros} registros.`);
  } catch (err: any) {
    fs.appendFileSync(logFile, `\n❌ Erro na sincronizacao:\n${err.message}\n${err.stack}`);
  } finally {
    process.exit(0);
  }
}

run();
