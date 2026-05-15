import { listarTransferenciasDiscricionarias } from "../src/modules/transferencias-discricionarias/transferencias-discricionarias.service";

async function main() {
  console.log("--- TEST: Filtered search Vitória + Em execução + 90 dias (NO YEAR) ---");
  const result = await listarTransferenciasDiscricionarias({
    cnpj: "11.049.855/0001-23",
    situacao_convenio: "Em execução",
    vigencia_a_vencer_dias: 90,
    page: 1,
    page_size: 20
  });
  
  console.log("Total found:", result.itens.length);
  result.itens.forEach(item => {
    console.log(`  ${item.nr_convenio} - ${item.nr_proposta} - ${item.situacao_convenio} - ${item.dia_fim_vigencia}`);
  });
}

main().catch(console.error);
