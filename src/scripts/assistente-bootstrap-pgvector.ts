import { bootstrapPgvectorSchema, closePgvectorPool } from "../modules/assistente/assistente-pgvector.service";

const main = async () => {
  await bootstrapPgvectorSchema();
  console.log("Schema pgvector do Assistente 360 inicializado com sucesso.");
};

main()
  .catch((error) => {
    console.error("Falha ao inicializar schema pgvector:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePgvectorPool();
  });
