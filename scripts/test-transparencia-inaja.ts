
import { buildTransparenciaReportFromScraping } from "../src/modules/relatorios/transparencia-report.service";

async function testTransparenciaInaja() {
  console.log("Testing Transparencia Report for Inajá...");
  try {
    const result = await buildTransparenciaReportFromScraping({
      cnpj: "10106219000123"
    } as any);
    
    console.log("Result keys:", Object.keys(result));
    
    if (result.convenios) {
        console.log("- Convenios found:", result.convenios.length);
        if (result.convenios.length > 0) {
            const msConvenios = result.convenios.filter((c: any) => 
                (c.orgao ?? "").toLowerCase().includes("saude") || 
                (c.objeto ?? "").toLowerCase().includes("saude")
            );
            console.log("- Convenios related to Saude:", msConvenios.length);
            msConvenios.forEach((c: any) => {
                console.log(`  * ${c.numero_convenio}: ${c.objeto?.slice(0, 100)}... (${c.situacao})`);
            });
        }
    }

  } catch (error) {
    console.error("Test failed:", error);
  }
}

testTransparenciaInaja();
