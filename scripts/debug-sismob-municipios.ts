
import fetch from "node-fetch";

async function listMunicipios() {
  const uf = "PE";
  const url = `https://sismobcidadao.saude.gov.br/sismob-cidadao-server/api/municipio/uf/${uf}`;
  
  console.log(`Fetching municipios for ${uf}...`);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      }
    });

    if (!response.ok) {
        console.error("Failed:", response.status, response.statusText);
        return;
    }

    const data = await response.json() as any[];
    console.log(`Found ${data.length} municipios.`);
    
    const inaja = data.filter(m => m.nome.toLowerCase().includes("inaja"));
    console.log("Matches for 'inaja':", JSON.stringify(inaja, null, 2));

    if (inaja.length === 0) {
        console.log("Sample municipios:", JSON.stringify(data.slice(0, 5), null, 2));
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

listMunicipios();
