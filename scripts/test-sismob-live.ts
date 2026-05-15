
import { listObrasSismob } from "../src/modules/sismob-cidadao/sismob-cidadao.service";

async function testSismob() {
  console.log("Testing SISMOB query for Inajá, PE...");
  try {
    const result = await listObrasSismob({
      uf: "PE",
      municipio: "Inajá",
      page: 1,
      page_size: 20
    });
    
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testSismob();
