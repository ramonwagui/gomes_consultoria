
import fetch from "node-fetch";

async function testSimpleSismob() {
  const url = "https://sismob.saude.gov.br/sismob-cidadao-server/api/obras?uf=PE&municipio=INAJA";
  console.log(`Testing GET: ${url}`);
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
        console.log("Data sample:", JSON.stringify(data, null, 2));
    } else {
        const text = await res.text();
        console.log("Error text:", text.slice(0, 200));
    }
  } catch (e) {
    console.error(e);
  }
}
testSimpleSismob();
