
import { buildTransparenciaReportFromScraping } from "../src/modules/relatorios/transparencia-report.service";

async function inspectTransparencia() {
  try {
    const result = await buildTransparenciaReportFromScraping({
      cnpj: "10106219000123"
    } as any);
    
    console.log("CONVENIOS:");
    result.convenios.forEach((c: any) => {
        console.log(`- ID: ${c.id}, Num: ${c.numero_convenio}, Orgao: ${c.orgao}, Objeto: ${c.objeto?.slice(0, 50)}...`);
    });
  } catch (e) {
    console.error(e);
  }
}
inspectTransparencia();
