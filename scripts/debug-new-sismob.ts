
import fetch from "node-fetch";

async function debugNewSismob() {
  // Tentando descobrir os IDs reais via API nova
  const BASE_URL = "https://sismob.saude.gov.br/sismob-cidadao-api/api";
  
  console.log("1. Fetching UFs...");
  try {
    const resUfs = await fetch(`${BASE_URL}/ufs`);
    if (resUfs.ok) {
        const ufs = await resUfs.json() as any[];
        console.log("UFs found:", ufs.map(u => `${u.sigla}: ${u.id}`));
        
        const pe = ufs.find(u => u.sigla === "PE");
        if (pe) {
            console.log(`\n2. Fetching Municipios for PE (id: ${pe.id})...`);
            const resMun = await fetch(`${BASE_URL}/municipios?idUf=${pe.id}`);
            if (resMun.ok) {
                const muns = await resMun.json() as any[];
                console.log(`Found ${muns.length} municipios.`);
                const inaja = muns.find(m => m.nome.toLowerCase().includes("inaja"));
                console.log("Inaja data:", JSON.stringify(inaja, null, 2));
                
                if (inaja) {
                    console.log(`\n3. Fetching Obras for Inaja (id: ${inaja.id})...`);
                    const resObras = await fetch(`${BASE_URL}/obras/filtro`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            idUf: pe.id,
                            idMunicipio: inaja.id,
                            pagina: 1,
                            tamanhoPagina: 10
                        })
                    });
                    if (resObras.ok) {
                        const obras = await resObras.json();
                        console.log("Obras found:", JSON.stringify(obras, null, 2));
                    } else {
                        console.error("Failed to fetch obras:", resObras.status, resObras.statusText);
                    }
                }
            }
        }
    } else {
        console.error("Failed to fetch UFs:", resUfs.status, resUfs.statusText);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

debugNewSismob();
