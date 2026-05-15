import { sincronizarDadosMedicao } from "../src/modules/transferegov/medicao.service";

async function main() {
  const propostaId = "1947083";
  const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJNRUQiLCJpc3MiOiJzaWNvbnZpZHAiLCJjcGYiOiIwMDc0NTUyNjQzOCIsImlkUHJvcG9zdGEiOjE5NDcwODMsIm5vbWUiOiJOQUlDSEUgTUFSSU8gTUFDRURPIENIQVZFUyIsImlkIjoxMzEyNjYsImV4cCI6MTc3NTY4NTc1OSwiaWF0IjoxNzc1NjgzOTU5fQ.cyNym7FW_R1tfzsKoFrFM7130xb3K2YU2i4SkyoGYyraMXK_IG9U-96BbpaHaQDYdy331fiHd9NBfgSo03I6SYnXIFgjp9U28_AoT5nAyc4FHQsJsZFK9RF8rel7ysgJfxfxtER8sApBoZ68_vnmOeTx9t6EifG8dGtXBBj1NP8Dmp9iKz1O7aPExZVXveeqg5VfA4Y7wf8aVr-fTbnQr19TAooEN-Cf_zAv1x_Az9T83nHaLjxsgSsq6Hdu8wsfKuKBb1doEgRDNHb9xg4pW5e60hXg8Uy_OoDAjwQSi0ClRT7zWkjGBu4YPbiNI2nXIza9e31qUw98sTot7k8nrw";
  
  console.log(`🚀 Iniciando teste de sincronização para a proposta ${propostaId} com Token JWT...`);
  
  try {
    const resultado = await sincronizarDadosMedicao(propostaId, token);
    console.log("🏁 Teste concluído com sucesso!");
    console.log("Resultado no banco de dados:", {
        id: resultado.id,
        proposta: resultado.proposta,
        percentual: resultado.percentualFisicoMedicao,
        status: resultado.statusMedicao
    });
  } catch (error) {
    console.error("💥 Falha no teste:", error);
    process.exit(1);
  }
}

main();
