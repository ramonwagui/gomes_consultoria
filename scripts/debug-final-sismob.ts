
import fetch from "node-fetch";

async function testFinalSismob() {
  const urls = [
    "https://sismobcidadao.saude.gov.br/api/ufs",
    "https://sismobcidadao.saude.gov.br/api/municipios?uf=PE",
    "https://sismobcidadao.saude.gov.br/api/obras?uf=PE&municipio=INAJA"
  ];
  
  for (const url of urls) {
    console.log(`\nTesting: ${url}`);
    try {
      const res = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json"
        }
      });
      console.log(`Status: ${res.status} ${res.statusText}`);
      if (res.ok) {
          const data = await res.json();
          console.log("Data sample:", JSON.stringify(Array.isArray(data) ? data.slice(0, 3) : data, null, 2));
      } else {
          const text = await res.text();
          console.log("Error text:", text.slice(0, 200));
      }
    } catch (e) {
      console.error("Fetch error:", e);
    }
  }
}

testFinalSismob();
