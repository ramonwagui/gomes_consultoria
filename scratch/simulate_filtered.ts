import { listarTransferenciasDiscricionarias } from "../src/modules/transferencias-discricionarias/transferencias-discricionarias.service";

async function main() {
  console.log("--- TEST: Filtered search Vitória + Em execução + 90 dias + 2024 ---");
  const result = await listarTransferenciasDiscricionarias({
    cnpj: "11.049.855/0001-23",
    situacao_convenio: "Em execução",
    vigencia_a_vencer_dias: 90,
    ano: 2024,
    page: 1,
    page_size: 20
  });
  
  console.log("Total found:", result.itens.length);
}

main().catch(console.error);
