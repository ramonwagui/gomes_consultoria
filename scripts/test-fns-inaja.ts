
import { listarConsultaFnsPropostas } from "../src/modules/consultafns-propostas/consultafns-propostas.service";

async function testFnsInaja() {
  console.log("Testing FNS Proposals for Inajá (PE)...");
  try {
    const result = await listarConsultaFnsPropostas({
      uf: "PE",
      muncod: "2607000",
      page: 1,
      count: 50
    } as any);
    
    console.log(`Total items found in FNS: ${result.paginacao.total}`);
    if (result.itens.length > 0) {
        result.itens.forEach((item: any) => {
            console.log(`- ${item.nuProposta}: ${item.noObjeto?.slice(0, 100)}... (${item.dsSituacao})`);
        });
    }
  } catch (error) {
    console.error("FNS Test failed:", error);
  }
}

testFnsInaja();
