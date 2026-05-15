import { UserRole } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { responderPerguntaAssistente } from "../modules/assistente/assistente.service";

const ensureTestUser = async () => {
  const existing = await prisma.user.findFirst({ select: { id: true } });
  if (existing) {
    return existing.id;
  }

  const created = await prisma.user.create({
    data: {
      nome: "Assistente QA",
      email: "assistente-qa@gestconv360.local",
      passwordHash: "dev-only",
      role: UserRole.ADMIN
    },
    select: { id: true }
  });

  return created.id;
};

const assertCondition = (condition: boolean, label: string) => {
  if (!condition) {
    throw new Error(`Falhou: ${label}`);
  }
  console.log(`OK: ${label}`);
};

const main = async () => {
  const userId = await ensureTestUser();

  const q1 = await responderPerguntaAssistente(
    { pergunta: "Quantos convenios a cidade de Agrestia tem hoje?", historico: [] },
    { userId }
  );
  assertCondition(Boolean(q1.session_id), "sessao criada na primeira pergunta");

  const q2 = await responderPerguntaAssistente(
    {
      pergunta: "E quantos estao em execucao?",
      session_id: q1.session_id,
      historico: []
    },
    { userId }
  );
  assertCondition(q2.contexto_usado === true, "follow-up usa contexto da conversa");

  const q3 = await responderPerguntaAssistente(
    {
      pergunta: "Quais tickets estao atrasados e sem responsavel?",
      session_id: q1.session_id,
      historico: []
    },
    { userId }
  );
  assertCondition(Array.isArray(q3.fontes_consultadas) && q3.fontes_consultadas.length > 0, "resposta inclui fontes internas");

  const q4 = await responderPerguntaAssistente(
    {
      pergunta: "Qual a situacao da proposta da ambulancia de Exu?",
      session_id: q1.session_id,
      historico: []
    },
    { userId }
  );
  assertCondition(
    q4.intencao === "busca_conhecimento" || q4.intencao === "nao_entendida" || q4.intencao === "percentual_obra",
    "pergunta aberta processada sem quebrar fluxo"
  );

  const q5 = await responderPerguntaAssistente(
    {
      pergunta: "Qual o valor da proposta XYZ-NAO-EXISTE?",
      session_id: q1.session_id,
      historico: []
    },
    { userId }
  );
  assertCondition(
    /nao encontrei|sem evidencias|nao entendi/i.test(q5.resposta),
    "sem alucinacao para registro inexistente"
  );

  console.log("\nSuite de aceitacao do Assistente 360 concluida com sucesso.");
};

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
