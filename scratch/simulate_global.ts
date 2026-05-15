import { listarTransferenciasDiscricionarias } from "../src/modules/transferencias-discricionarias/transferencias-discricionarias.service";

async function main() {
  console.log("--- TEST: Global search Em execução + 90 dias ---");
  const result = await listarTransferenciasDiscricionarias({
    situacao_convenio: "Em execução",
    vigencia_a_vencer_dias: 90,
    page: 1,
    page_size: 20
  });
  
  console.log("Total found:", result.itens.length);
  result.itens.forEach(item => {
    console.log(`  ${item.nr_convenio} - ${item.cnpj} - ${item.nome_proponente} - ${item.situacao_convenio} - ${item.dia_fim_vigencia}`);
  });
}

main().catch(console.error);
