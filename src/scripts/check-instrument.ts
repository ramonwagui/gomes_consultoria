import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const inst = await prisma.instrumentProposal.findFirst({
    where: { OR: [{ proposta: "951608" }, { instrumento: "951608/2023" }] }
  });
  
  if (inst) {
    console.log("Instrumento encontrado:");
    console.log("ID:", inst.id);
    console.log("Proposta:", inst.proposta);
    console.log("Instrumento:", inst.instrumento);
    console.log("Objeto:", inst.objeto);
    console.log("Status:", inst.status);
  } else {
    console.log("Instrumento nao encontrado");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());