
import fetch from "node-fetch";

async function testIbge() {
  const uf = "PE";
  const mun = "Inajá";
  console.log(`Searching IBGE for ${mun}-${uf}...`);
  try {
    const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
    const data = await res.json() as any[];
    const match = data.find(m => m.nome.toLowerCase() === mun.toLowerCase());
    console.log("IBGE Match:", JSON.stringify(match, null, 2));
  } catch (e) {
    console.error(e);
  }
}
testIbge();
