import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);
  
  const user = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      nome: "Admin",
      email: "admin@test.com",
      passwordHash,
      role: "ADMIN"
    }
  });
  console.log("User:", user.id, user.email);

  const existingInst = await prisma.instrumentProposal.findFirst({
    where: { proposta: "951608", demoOwnerUserId: null }
  });

  const inst = existingInst
    ? await prisma.instrumentProposal.update({
        where: { id: existingInst.id },
        data: {}
      })
    : await prisma.instrumentProposal.create({
        data: {
          proposta: "951608",
          instrumento: "951608/2023",
          objeto: "CONVENIO DE TESTE - GESTCONV360",
          valorRepasse: 150000,
          valorContrapartida: 15000,
          dataCadastro: new Date("2023-01-15"),
          vigenciaInicio: new Date("2023-03-01"),
          vigenciaFim: new Date("2025-02-28"),
          concedente: "Caixa Economica Federal",
          status: "EM_EXECUCAO",
          fluxoTipo: "OBRA",
          ativo: true
        }
      });
  console.log("Instrumento ID:", inst.id, "- Proposta:", inst.proposta);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
