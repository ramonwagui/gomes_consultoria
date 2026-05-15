import {
  sincronizarTransferenciasEspeciaisRealtime,
  sincronizarTransferenciasEspeciaisRealtimePorCnpj
} from "../modules/transferencias-especiais/transferencias-especiais.scraper";

/**
 * Script para rodar a sincronizacao em tempo real via painel publico + API oficial.
 * Uso: npx tsx src/scripts/run-sync-especiais-realtime.ts
 */
async function run() {
  const args = process.argv.slice(2);
  const cnpjFlagIndex = args.findIndex((arg) => arg === "--cnpj");
  const cnpjFromPair = cnpjFlagIndex >= 0 ? args[cnpjFlagIndex + 1] : undefined;
  const cnpjFromInline = args.find((arg) => arg.startsWith("--cnpj="))?.split("=")[1];
  const cnpjRaw = cnpjFromPair ?? cnpjFromInline;
  const cnpj = cnpjRaw ? cnpjRaw.replace(/\D/g, "") : undefined;

  const startTime = new Date();
  const escopo = cnpj ? `CNPJ ${cnpj}` : "todos os convenentes";
  console.log(
    `[${startTime.toISOString()}] Iniciando processo de sincronizacao Realtime (painel publico prioritario + API oficial fallback/auditoria) para ${escopo}...`
  );

  try {
    if (cnpj) {
      await sincronizarTransferenciasEspeciaisRealtimePorCnpj(cnpj);
    } else {
      await sincronizarTransferenciasEspeciaisRealtime();
    }
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    console.log(`[${endTime.toISOString()}] Processo concluido com sucesso em ${duration}s.`);
    process.exit(0);
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] Erro critico na sincronizacao:`, err);
    process.exit(1);
  }
}

run();
