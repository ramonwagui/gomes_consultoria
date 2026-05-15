import "../config/env";

import { InstrumentFlowType, InstrumentStatus } from "@prisma/client";

import { prisma } from "../lib/prisma";

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

const convenetesBase = [
  {
    nome: "Prefeitura de Aurora",
    cnpj: "12345678000101",
    endereco: "Rua Central, 100",
    bairro: "Centro",
    cep: "70000000",
    uf: "DF",
    cidade: "Aurora",
    tel: "61990000001",
    email: "contato@aurora.gov.br"
  },
  {
    nome: "Prefeitura de Boa Vista do Norte",
    cnpj: "12345678000102",
    endereco: "Av. Principal, 450",
    bairro: "Planalto",
    cep: "69000000",
    uf: "AM",
    cidade: "Boa Vista do Norte",
    tel: "92990000002",
    email: "gabinete@boavistanorte.gov.br"
  },
  {
    nome: "Prefeitura de Campo Verde",
    cnpj: "12345678000103",
    endereco: "Praca da Matriz, 50",
    bairro: "Historico",
    cep: "78000000",
    uf: "MT",
    cidade: "Campo Verde",
    tel: "65990000003",
    email: "planejamento@campoverde.gov.br"
  }
];

const demoInstruments = [
  {
    proposta: "DEMO-2026-001",
    instrumento: "CV-2026-001",
    objeto: "Pavimentacao e drenagem da Avenida das Flores - Trecho 1",
    concedente: "Ministerio das Cidades",
    fluxoTipo: InstrumentFlowType.OBRA,
    status: InstrumentStatus.EM_EXECUCAO,
    valorRepasse: 1250000,
    valorContrapartida: 180000,
    dataCadastro: "2026-01-05",
    dataAssinatura: "2026-01-20",
    vigenciaInicio: "2026-02-01",
    vigenciaFim: "2027-01-31",
    dataPrestacaoContas: "2027-03-31",
    dataDou: "2026-01-28",
    responsavel: "Carlos Menezes",
    orgaoExecutor: "Secretaria Municipal de Infraestrutura",
    observacoes: "Trecho urbano com prioridade alta.",
    conveneteKey: 0,
    percentualObra: 38,
    repasses: [
      { data: "2026-02-10", valor: 320000 },
      { data: "2026-04-08", valor: 270000 },
      { data: "2026-06-12", valor: 150000 }
    ]
  },
  {
    proposta: "DEMO-2026-002",
    instrumento: "CV-2026-002",
    objeto: "Construcao de Unidade Basica de Saude no Bairro Novo Horizonte",
    concedente: "Ministerio da Saude",
    fluxoTipo: InstrumentFlowType.OBRA,
    status: InstrumentStatus.ASSINADO,
    valorRepasse: 980000,
    valorContrapartida: 120000,
    dataCadastro: "2026-01-12",
    dataAssinatura: "2026-02-02",
    vigenciaInicio: "2026-02-15",
    vigenciaFim: "2027-02-14",
    dataPrestacaoContas: "2027-04-15",
    dataDou: "2026-02-09",
    responsavel: "Luciana Prado",
    orgaoExecutor: "Secretaria Municipal de Saude",
    observacoes: "Projeto padrao UBS porte I.",
    conveneteKey: 0,
    percentualObra: 12,
    repasses: [{ data: "2026-03-01", valor: 220000 }]
  },
  {
    proposta: "DEMO-2026-003",
    instrumento: "CV-2026-003",
    objeto: "Aquisicao de 2 retroescavadeiras e 1 motoniveladora",
    concedente: "Ministerio da Integracao e do Desenvolvimento Regional",
    fluxoTipo: InstrumentFlowType.AQUISICAO_EQUIPAMENTOS,
    status: InstrumentStatus.EM_EXECUCAO,
    valorRepasse: 2100000,
    valorContrapartida: 350000,
    dataCadastro: "2026-01-18",
    dataAssinatura: "2026-02-11",
    vigenciaInicio: "2026-02-20",
    vigenciaFim: "2027-02-19",
    dataPrestacaoContas: "2027-05-10",
    dataDou: "2026-02-16",
    responsavel: "Marcos Vieira",
    orgaoExecutor: "Secretaria de Obras e Servicos",
    observacoes: "Entrega prevista para 4o trimestre.",
    conveneteKey: 1,
    percentualObra: 55,
    repasses: [
      { data: "2026-03-15", valor: 500000 },
      { data: "2026-05-20", valor: 400000 }
    ]
  },
  {
    proposta: "DEMO-2026-004",
    instrumento: "CV-2026-004",
    objeto: "Reforma e ampliacao da Escola Municipal Esperanca",
    concedente: "FNDE",
    fluxoTipo: InstrumentFlowType.OBRA,
    status: InstrumentStatus.EM_EXECUCAO,
    valorRepasse: 870000,
    valorContrapartida: 90000,
    dataCadastro: "2026-02-03",
    dataAssinatura: "2026-02-25",
    vigenciaInicio: "2026-03-01",
    vigenciaFim: "2026-12-31",
    dataPrestacaoContas: "2027-02-28",
    dataDou: "2026-03-02",
    responsavel: "Patricia Lima",
    orgaoExecutor: "Secretaria Municipal de Educacao",
    observacoes: "Execucao em 3 etapas.",
    conveneteKey: 1,
    percentualObra: 63,
    repasses: [
      { data: "2026-03-12", valor: 190000 },
      { data: "2026-04-26", valor: 210000 },
      { data: "2026-07-11", valor: 110000 }
    ]
  },
  {
    proposta: "DEMO-2026-005",
    instrumento: "CV-2026-005",
    objeto: "Festival Cultural das Aguas - Edicao 2026",
    concedente: "Ministerio da Cultura",
    fluxoTipo: InstrumentFlowType.EVENTOS,
    status: InstrumentStatus.EM_ELABORACAO,
    valorRepasse: 350000,
    valorContrapartida: 45000,
    dataCadastro: "2026-02-10",
    dataAssinatura: null,
    vigenciaInicio: "2026-04-01",
    vigenciaFim: "2026-11-30",
    dataPrestacaoContas: "2026-12-20",
    dataDou: null,
    responsavel: "Adriana Costa",
    orgaoExecutor: "Fundacao Municipal de Cultura",
    observacoes: "Aguardando ajustes no plano de divulgacao.",
    conveneteKey: 2,
    percentualObra: 0,
    repasses: []
  },
  {
    proposta: "DEMO-2026-006",
    instrumento: "CV-2026-006",
    objeto: "Implantacao de iluminacao publica em LED - Zona Rural",
    concedente: "Ministerio de Minas e Energia",
    fluxoTipo: InstrumentFlowType.OBRA,
    status: InstrumentStatus.EM_EXECUCAO,
    valorRepasse: 640000,
    valorContrapartida: 80000,
    dataCadastro: "2026-02-14",
    dataAssinatura: "2026-03-01",
    vigenciaInicio: "2026-03-15",
    vigenciaFim: "2027-03-14",
    dataPrestacaoContas: "2027-05-01",
    dataDou: "2026-03-03",
    responsavel: "Joao Moreira",
    orgaoExecutor: "Secretaria de Energia e Servicos Urbanos",
    observacoes: "Cobertura de 14 comunidades.",
    conveneteKey: 2,
    percentualObra: 44,
    repasses: [
      { data: "2026-03-20", valor: 160000 },
      { data: "2026-06-05", valor: 125000 }
    ]
  },
  {
    proposta: "DEMO-2026-007",
    instrumento: "CV-2026-007",
    objeto: "Aquisicao de equipamentos para telemedicina",
    concedente: "Ministerio da Saude",
    fluxoTipo: InstrumentFlowType.AQUISICAO_EQUIPAMENTOS,
    status: InstrumentStatus.ASSINADO,
    valorRepasse: 480000,
    valorContrapartida: 52000,
    dataCadastro: "2026-02-20",
    dataAssinatura: "2026-03-08",
    vigenciaInicio: "2026-03-15",
    vigenciaFim: "2027-01-15",
    dataPrestacaoContas: "2027-03-10",
    dataDou: "2026-03-10",
    responsavel: "Fernanda Alves",
    orgaoExecutor: "Secretaria Municipal de Saude",
    observacoes: "Integracao com 6 unidades basicas.",
    conveneteKey: 0,
    percentualObra: 18,
    repasses: [{ data: "2026-04-02", valor: 110000 }]
  },
  {
    proposta: "DEMO-2026-008",
    instrumento: "CV-2026-008",
    objeto: "Requalificacao de praca publica com area esportiva",
    concedente: "Ministerio do Esporte",
    fluxoTipo: InstrumentFlowType.OBRA,
    status: InstrumentStatus.CONCLUIDO,
    valorRepasse: 560000,
    valorContrapartida: 70000,
    dataCadastro: "2026-01-03",
    dataAssinatura: "2026-01-18",
    vigenciaInicio: "2026-01-25",
    vigenciaFim: "2026-10-31",
    dataPrestacaoContas: "2026-12-15",
    dataDou: "2026-01-22",
    responsavel: "Ricardo Nunes",
    orgaoExecutor: "Secretaria de Esporte e Lazer",
    observacoes: "Obra finalizada e entregue.",
    conveneteKey: 1,
    percentualObra: 100,
    repasses: [
      { data: "2026-02-02", valor: 150000 },
      { data: "2026-05-09", valor: 170000 },
      { data: "2026-08-14", valor: 140000 }
    ]
  },
  {
    proposta: "DEMO-2026-009",
    instrumento: "CV-2026-009",
    objeto: "Mostra Municipal de Inovacao e Empreendedorismo",
    concedente: "Ministerio do Empreendedorismo",
    fluxoTipo: InstrumentFlowType.EVENTOS,
    status: InstrumentStatus.PRESTACAO_PENDENTE,
    valorRepasse: 220000,
    valorContrapartida: 30000,
    dataCadastro: "2026-03-01",
    dataAssinatura: "2026-03-20",
    vigenciaInicio: "2026-04-01",
    vigenciaFim: "2026-09-30",
    dataPrestacaoContas: "2026-11-15",
    dataDou: "2026-03-23",
    responsavel: "Tatiane Souza",
    orgaoExecutor: "Secretaria de Desenvolvimento Economico",
    observacoes: "Evento realizado, aguardando consolidacao final.",
    conveneteKey: 2,
    percentualObra: 100,
    repasses: [
      { data: "2026-04-10", valor: 70000 },
      { data: "2026-06-25", valor: 60000 }
    ]
  },
  {
    proposta: "DEMO-2026-010",
    instrumento: "CV-2026-010",
    objeto: "Recuperacao de estradas vicinais - lote 3",
    concedente: "Ministerio da Agricultura",
    fluxoTipo: InstrumentFlowType.OBRA,
    status: InstrumentStatus.VENCIDO,
    valorRepasse: 930000,
    valorContrapartida: 140000,
    dataCadastro: "2025-11-10",
    dataAssinatura: "2025-12-01",
    vigenciaInicio: "2025-12-10",
    vigenciaFim: "2026-09-30",
    dataPrestacaoContas: "2026-11-30",
    dataDou: "2025-12-05",
    responsavel: "Helena Matos",
    orgaoExecutor: "Secretaria de Agricultura e Obras Rurais",
    observacoes: "Necessita aditivo para extensao de prazo.",
    conveneteKey: 0,
    percentualObra: 76,
    repasses: [
      { data: "2026-01-15", valor: 200000 },
      { data: "2026-04-18", valor: 180000 },
      { data: "2026-07-30", valor: 150000 }
    ]
  }
] as const;

export const seedDemoInstrumentos = async () => {
  const convenetes = await Promise.all(
    convenetesBase.map(async (item) => {
      const existing = await prisma.convenete.findFirst({
        where: { cnpj: item.cnpj, demoOwnerUserId: null }
      });

      if (existing) {
        return prisma.convenete.update({
          where: { id: existing.id },
          data: {
            nome: item.nome,
            endereco: item.endereco,
            bairro: item.bairro,
            cep: item.cep,
            uf: item.uf,
            cidade: item.cidade,
            tel: item.tel,
            email: item.email
          }
        });
      }

      return prisma.convenete.create({ data: item });
    })
  );

  const previousDemo = await prisma.instrumentProposal.findMany({
    where: { proposta: { startsWith: "DEMO-2026-" } },
    select: { id: true }
  });

  if (previousDemo.length > 0) {
    const ids = previousDemo.map((item) => item.id);
    await prisma.auditLog.deleteMany({ where: { instrumentId: { in: ids } } });
    await prisma.instrumentProposal.deleteMany({ where: { id: { in: ids } } });
  }

  for (const item of demoInstruments) {
    const repasses = item.repasses.map((repasse) => ({
      dataRepasse: toDate(repasse.data),
      valorRepasse: repasse.valor
    }));

    const totalRepasses = repasses.reduce((acc, repasse) => acc + repasse.valorRepasse, 0);

    await prisma.instrumentProposal.create({
      data: {
        proposta: item.proposta,
        instrumento: item.instrumento,
        objeto: item.objeto,
        valorRepasse: item.valorRepasse,
        valorContrapartida: item.valorContrapartida,
        valorJaRepassado: totalRepasses,
        dataRepasse1: repasses[0]?.dataRepasse,
        dataRepasse2: repasses[1]?.dataRepasse,
        dataCadastro: toDate(item.dataCadastro),
        dataAssinatura: item.dataAssinatura ? toDate(item.dataAssinatura) : null,
        vigenciaInicio: toDate(item.vigenciaInicio),
        vigenciaFim: toDate(item.vigenciaFim),
        dataPrestacaoContas: toDate(item.dataPrestacaoContas),
        dataDou: item.dataDou ? toDate(item.dataDou) : null,
        concedente: item.concedente,
        banco: "Banco do Brasil",
        agencia: String(1200 + item.conveneteKey),
        conta: `${item.instrumento.replace(/[^0-9]/g, "")}-0`,
        fluxoTipo: item.fluxoTipo,
        status: item.status,
        responsavel: item.responsavel,
        orgaoExecutor: item.orgaoExecutor,
        observacoes: item.observacoes,
        conveneteId: convenetes[item.conveneteKey].id,
        repasses: {
          create: repasses
        },
        workProgress: {
          create: {
            percentualObra: item.percentualObra
          }
        }
      }
    });
  }

  const total = await prisma.instrumentProposal.count({
    where: { proposta: { startsWith: "DEMO-2026-" } }
  });

  const totalRepasses = await prisma.instrumentRepasse.count({
    where: {
      instrument: {
        proposta: { startsWith: "DEMO-2026-" }
      }
    }
  });

  return {
    instrumentos: total,
    repasses: totalRepasses
  };
};

if (require.main === module) {
  seedDemoInstrumentos()
    .then((result) => {
      console.log(`Seed demo concluido com ${result.instrumentos} instrumentos e ${result.repasses} repasses.`);
    })
    .catch((error) => {
      console.error("Falha ao popular dados demo:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
