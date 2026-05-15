import 'dotenv/config';
import { sincronizarTransferenciasDiscricionarias } from '../src/modules/transferencias-discricionarias/transferencias-discricionarias.service';

async function run() {
  console.log('⏳ Iniciando o download e sincronizacao de dados (isso pode levar de 2 a 5 minutos)...');
  
  // Imprime um ponto a cada 10 segundos para manter a conexao ativa e dar feedback visual
  const interval = setInterval(() => {
    process.stdout.write('.');
  }, 10000);

  try {
    const result = await sincronizarTransferenciasDiscricionarias(true);
    clearInterval(interval);
    console.log(`\n\n✅ Sucesso! A sincronizacao terminou e ${result.total_registros} registros foram salvos no banco de dados Neon.`);
  } catch (err: any) {
    clearInterval(interval);
    console.error(`\n\n❌ Erro durante a sincronizacao:\n${err.message}`);
  } finally {
    process.exit(0);
  }
}

run();
