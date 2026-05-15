// This wrapper uses ts-node's ESM loader to run the TypeScript script directly
// Run with: node --import ts-node/register/esm scripts/run-sync-wrapper.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

(async () => {
  try {
    // Dynamically require the TS file via ts-node hook
    const { sincronizarTransferenciasDiscricionarias } = require('../src/modules/transferencias-discricionarias/transferencias-discricionarias.service.ts');
    
    console.log('⏳ Iniciando o download e sincronizacao de dados (isso pode levar de 2 a 5 minutos)...');
    
    const interval = setInterval(() => {
      process.stdout.write('.');
    }, 10000);

    try {
      const result = await sincronizarTransferenciasDiscricionarias(true);
      clearInterval(interval);
      console.log(`\n\n✅ Sucesso! A sincronizacao terminou e ${result.total_registros} registros foram salvos no banco de dados Neon.`);
    } catch (err) {
      clearInterval(interval);
      console.error(`\n\n❌ Erro durante a sincronizacao:\n${err.message}`);
    } finally {
      process.exit(0);
    }
  } catch (err) {
    console.error('Erro ao importar módulo:', err.message);
    process.exit(1);
  }
})();
