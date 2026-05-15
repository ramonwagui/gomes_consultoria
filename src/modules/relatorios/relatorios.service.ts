import { Prisma, InstrumentStatus, SolicitacaoCaixaTipo, InstrumentFlowType } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import {
  AndamentoInstrumentosReportQueryInput,
  ObraReportQueryInput,
  RepasseReportQueryInput,
  TransparenciaReportQueryInput,
  SimecReportQueryInput
} from "./relatorios.schema";
import { buildTransparenciaReportFromScraping } from "./transparencia-report.service";
import { scrapeSimecTermos } from "./simec-scraper.service";

export const buildSimecReport = async (query: SimecReportQueryInput) => {
  return await scrapeSimecTermos(query.uf, query.municipio, query.ano, query.secretaria);
};

const toDate = (value?: string, endOfDay = false) => {
  if (!value) {
    return undefined;
  }
  return new Date(`${value}${endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z"}`);
};

const toMonthKey = (value: Date) => value.toISOString().slice(0, 7);

type InstrumentWithReportData = {
  id: number;
  proposta: string;
  instrumento: string;
  status: InstrumentStatus;
  valorRepasse: { toString(): string } | number;
  valorJaRepassado: { toString(): string } | number;
  dataPrestacaoContas: Date | null;
  concedente: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  orgaoExecutor: string | null;
  empresaVencedora: string | null;
  cnpjVencedora: string | null;
  repasses: Array<{
    id: number;
    dataRepasse: Date;
    valorRepasse: { toString(): string } | number;
  }>;
  workProgress: {
    percentualObra: { toString(): string } | number;
  } | null;
  percentualFisicoMedicao: { toString(): string } | number | null;
  percentualFinanceiroMedicao: { toString(): string } | number | null;
};

export const buildRepasseReport = async (query: RepasseReportQueryInput) => {
  const convenete = await prisma.convenete.findUnique({
    where: { id: query.convenete_id },
    select: {
      id: true,
      nome: true,
      cnpj: true
    }
  });

  if (!convenete) {
    return null;
  }

  const repasseWhere = {
    gte: toDate(query.data_de),
    lte: toDate(query.data_ate, true)
  };

  const instruments = (await prisma.instrumentProposal.findMany({
    where: {
      conveneteId: query.convenete_id,
      id: query.instrumento_id
    },
    select: {
      id: true,
      proposta: true,
      instrumento: true,
      status: true,
      valorRepasse: true,
      valorJaRepassado: true,
      dataPrestacaoContas: true,
      concedente: true,
      banco: true,
      agencia: true,
      conta: true,
      orgaoExecutor: true,
      empresaVencedora: true,
      cnpjVencedora: true,
      repasses: {
        where: {
          dataRepasse: repasseWhere
        },
        orderBy: [{ dataRepasse: "asc" }, { id: "asc" }],
        select: {
          id: true,
          dataRepasse: true,
          valorRepasse: true
        }
      },
      workProgress: {
        select: {
          percentualObra: true
        }
      },
      percentualFisicoMedicao: true,
      percentualFinanceiroMedicao: true
    },
    orderBy: [{ instrumento: "asc" }, { id: "asc" }]
  })) as InstrumentWithReportData[];

  const instrumentLookup = new Map(instruments.map((item) => [item.id, item]));

  const repasses = instruments
    .flatMap((item) =>
      item.repasses.map((repasse) => ({
        id: repasse.id,
        instrumento_id: item.id,
        proposta: item.proposta,
        instrumento: item.instrumento,
        data_repasse: repasse.dataRepasse.toISOString().slice(0, 10),
        valor_repasse: Number(repasse.valorRepasse)
      }))
    )
    .sort((a, b) => {
      if (a.data_repasse === b.data_repasse) {
        return a.id - b.id;
      }
      return a.data_repasse.localeCompare(b.data_repasse);
    });

  const repassesByMonth = new Map<string, number>();
  repasses.forEach((item) => {
    const key = toMonthKey(new Date(`${item.data_repasse}T00:00:00.000Z`));
    repassesByMonth.set(key, (repassesByMonth.get(key) ?? 0) + item.valor_repasse);
  });

  const repassesByInstrument = new Map<number, number>();
  repasses.forEach((item) => {
    repassesByInstrument.set(item.instrumento_id, (repassesByInstrument.get(item.instrumento_id) ?? 0) + item.valor_repasse);
  });

  const valorPactuado = instruments.reduce((acc, item) => acc + Number(item.valorRepasse), 0);
  const valorRepassadoHistorico = instruments.reduce((acc, item) => acc + Number(item.valorJaRepassado), 0);
  const valorRepassadoPeriodo = repasses.reduce((acc, item) => acc + item.valor_repasse, 0);
  const quantidadeRepasses = repasses.length;
  const ticketMedio = quantidadeRepasses > 0 ? valorRepassadoPeriodo / quantidadeRepasses : 0;
  const saldoPactuado = Math.max(0, valorPactuado - valorRepassadoHistorico);
  const percentualRepassado = valorPactuado > 0 ? Math.min(100, (valorRepassadoHistorico / valorPactuado) * 100) : 0;

  const porStatusMap = new Map<InstrumentStatus, number>();
  instruments.forEach((item) => {
    porStatusMap.set(item.status, (porStatusMap.get(item.status) ?? 0) + 1);
  });

  return {
    filtros: {
      convenete_id: convenete.id,
      proponente_id: convenete.id,
      convenete_nome: convenete.nome,
      proponente_nome: convenete.nome,
      convenete_cnpj: convenete.cnpj,
      proponente_cnpj: convenete.cnpj,
      instrumento_id: query.instrumento_id ?? null,
      data_de: query.data_de ?? null,
      data_ate: query.data_ate ?? null
    },
    kpis: {
      instrumentos: instruments.length,
      quantidade_repasses: quantidadeRepasses,
      valor_repassado_periodo: valorRepassadoPeriodo,
      ticket_medio_repasse: ticketMedio,
      valor_pactuado: valorPactuado,
      valor_ja_repassado: valorRepassadoHistorico,
      saldo_pactuado: saldoPactuado,
      percentual_repassado: percentualRepassado
    },
    series: {
      repasses_mensais: Array.from(repassesByMonth.entries()).map(([mes, valor]) => ({ mes, valor })),
      repasses_por_instrumento: instruments.map((item) => ({
        instrumento_id: item.id,
        instrumento: item.instrumento,
        proposta: item.proposta,
        valor: repassesByInstrument.get(item.id) ?? 0
      })),
      instrumentos_por_status: Array.from(porStatusMap.entries()).map(([status, quantidade]) => ({
        status,
        quantidade
      }))
    },
    instrumentos: instruments.map((item) => ({
      id: item.id,
      proposta: item.proposta,
      instrumento: item.instrumento,
      status: item.status,
      data_prestacao_contas: item.dataPrestacaoContas ? item.dataPrestacaoContas.toISOString().slice(0, 10) : null,
      orgao_concedente: item.concedente,
      banco: item.banco,
      agencia: item.agencia,
      conta: item.conta,
      empresa_vencedora: item.empresaVencedora ?? item.orgaoExecutor,
      valor_pactuado: Number(item.valorRepasse),
      valor_ja_repassado: Number(item.valorJaRepassado),
      valor_repassado_periodo: repassesByInstrument.get(item.id) ?? 0,
      saldo_pactuado: Math.max(0, Number(item.valorRepasse) - Number(item.valorJaRepassado)),
      percentual_obra:
        item.workProgress !== null
          ? Number(item.workProgress.percentualObra)
          : item.percentualFisicoMedicao !== null
            ? Number(item.percentualFisicoMedicao)
            : null
    })),
    repasses: repasses.map((item) => ({
      ...item,
      empresa_vencedora:
        instrumentLookup.get(item.instrumento_id)?.empresaVencedora ??
        instrumentLookup.get(item.instrumento_id)?.orgaoExecutor ??
        null
    }))
  };
};

type ObraInstrumentRow = {
  id: number;
  proposta: string;
  instrumento: string;
  objeto: string;
  status: InstrumentStatus;
  concedente: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  dataPrestacaoContas: Date | null;
  vigenciaFim: Date;
  valorRepasse: { toString(): string } | number;
  valorJaRepassado: { toString(): string } | number;
  percentualFisicoMedicao: { toString(): string } | number | null;
  percentualFinanceiroMedicao: { toString(): string } | number | null;
  statusMedicao: string | null;
  dataUltimaAtualizacaoMedicao: Date | null;
  convenete: { id: number; nome: string } | null;
  workProgress: { percentualObra: { toString(): string } | number } | null;
  measurementBulletins: Array<{
    dataBoletim: Date;
    valorMedicao: { toString(): string } | number;
    percentualObraInformado: { toString(): string } | number | null;
  }>;
  repasses: Array<{
    dataRepasse: Date;
    valorRepasse: { toString(): string } | number;
  }>;
};

const monthKey = (value: Date) => value.toISOString().slice(0, 7);

export const buildObraReport = async (query: ObraReportQueryInput) => {
  const boletimDateWhere = {
    gte: toDate(query.data_de),
    lte: toDate(query.data_ate, true)
  };

  const where: Prisma.InstrumentProposalWhereInput = {
    fluxoTipo: InstrumentFlowType.OBRA,
    ativo: query.ativo
  };

  if (query.convenete_id !== undefined) {
    where.conveneteId = query.convenete_id;
  }
  if (query.instrumento_id !== undefined) {
    where.id = query.instrumento_id;
  }
  if (query.concedente) {
    where.concedente = { contains: query.concedente, mode: "insensitive" };
  }
  if (query.status) {
    where.status = query.status;
  }

  const items = (await prisma.instrumentProposal.findMany({
    where,
    select: {
      id: true,
      proposta: true,
      instrumento: true,
      objeto: true,
      status: true,
      concedente: true,
      banco: true,
      agencia: true,
      conta: true,
      dataPrestacaoContas: true,
      vigenciaFim: true,
      valorRepasse: true,
      valorJaRepassado: true,
      percentualFisicoMedicao: true,
      percentualFinanceiroMedicao: true,
      statusMedicao: true,
      dataUltimaAtualizacaoMedicao: true,
      convenete: {
        select: {
          id: true,
          nome: true
        }
      },
      workProgress: {
        select: {
          percentualObra: true
        }
      },
      measurementBulletins: {
        where: {
          dataBoletim: boletimDateWhere
        },
        orderBy: [{ dataBoletim: "desc" }, { id: "desc" }],
        select: {
          dataBoletim: true,
          valorMedicao: true,
          percentualObraInformado: true
        }
      },
      repasses: {
        where: {
          dataRepasse: {
            gte: toDate(query.data_de),
            lte: toDate(query.data_ate, true)
          }
        },
        select: {
          dataRepasse: true,
          valorRepasse: true
        }
      }
    },
    orderBy: [{ vigenciaFim: "asc" }, { instrumento: "asc" }]
  })) as ObraInstrumentRow[];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const boletinsMensais = new Map<string, number>();
  const repassesMensais = new Map<string, number>();
  const statusMap = new Map<InstrumentStatus, number>();

  const instrumentos = items.map((item) => {
    const ultimoBoletim = item.measurementBulletins[0] ?? null;

    let percentualObra = 0;
    if (ultimoBoletim !== null && ultimoBoletim.percentualObraInformado !== null) {
      percentualObra = Number(ultimoBoletim.percentualObraInformado);
    } else if (item.percentualFisicoMedicao !== null) {
      percentualObra = Number(item.percentualFisicoMedicao);
    } else if (item.workProgress) {
      percentualObra = Number(item.workProgress.percentualObra);
    }

    const valorBoletins = item.measurementBulletins.reduce((acc, b) => acc + Number(b.valorMedicao), 0);
    const valorRepassesPeriodo = item.repasses.reduce((acc, r) => acc + Number(r.valorRepasse), 0);

    item.measurementBulletins.forEach((boletim) => {
      const key = monthKey(boletim.dataBoletim);
      boletinsMensais.set(key, (boletinsMensais.get(key) ?? 0) + Number(boletim.valorMedicao));
    });
    item.repasses.forEach((repasse) => {
      const key = monthKey(repasse.dataRepasse);
      repassesMensais.set(key, (repassesMensais.get(key) ?? 0) + Number(repasse.valorRepasse));
    });

    statusMap.set(item.status, (statusMap.get(item.status) ?? 0) + 1);

    const diasParaVigenciaFim = Math.floor((item.vigenciaFim.getTime() - today.getTime()) / 86400000);

    let risco: "BAIXO" | "MEDIO" | "ALTO" = "BAIXO";
    if ((diasParaVigenciaFim <= 60 && percentualObra < 70) || (ultimoBoletim === null && percentualObra < 50)) {
      risco = "ALTO";
    } else if (diasParaVigenciaFim <= 120 && percentualObra < 70) {
      risco = "MEDIO";
    }

    return {
      id: item.id,
      proposta: item.proposta,
      instrumento: item.instrumento,
      objeto: item.objeto,
      status: item.status,
      convenete_id: item.convenete?.id ?? null,
      proponente_id: item.convenete?.id ?? null,
      convenete_nome: item.convenete?.nome ?? null,
      proponente_nome: item.convenete?.nome ?? null,
      orgao_concedente: item.concedente,
      banco: item.banco,
      agencia: item.agencia,
      conta: item.conta,
      data_prestacao_contas: item.dataPrestacaoContas ? item.dataPrestacaoContas.toISOString().slice(0, 10) : null,
      vigencia_fim: item.vigenciaFim.toISOString().slice(0, 10),
      dias_para_vigencia_fim: diasParaVigenciaFim,
      percentual_obra: percentualObra,
      valor_pactuado: Number(item.valorRepasse),
      valor_ja_repassado: Number(item.valorJaRepassado),
      valor_boletins_periodo: valorBoletins,
      valor_repasses_periodo: valorRepassesPeriodo,
      ultimo_boletim_data: ultimoBoletim ? ultimoBoletim.dataBoletim.toISOString().slice(0, 10) : null,
      ultimo_boletim_valor: ultimoBoletim ? Number(ultimoBoletim.valorMedicao) : null,
      risco,
      percentual_fisico_medicao: item.percentualFisicoMedicao ? Number(item.percentualFisicoMedicao) : null,
      percentual_financeiro_medicao: item.percentualFinanceiroMedicao ? Number(item.percentualFinanceiroMedicao) : null,
      status_medicao: item.statusMedicao,
      data_ultima_atualizacao_medicao: item.dataUltimaAtualizacaoMedicao ? item.dataUltimaAtualizacaoMedicao.toISOString() : null
    };
  });

  const kpis = {
    obras_monitoradas: instrumentos.length,
    percentual_medio_obra:
      instrumentos.length > 0
        ? instrumentos.reduce((acc, item) => acc + item.percentual_obra, 0) / instrumentos.length
        : 0,
    valor_total_boletins_periodo: instrumentos.reduce((acc, item) => acc + item.valor_boletins_periodo, 0),
    valor_total_repasses_periodo: instrumentos.reduce((acc, item) => acc + item.valor_repasses_periodo, 0),
    obras_risco_alto: instrumentos.filter((item) => item.risco === "ALTO").length
  };

  return {
    filtros: {
      convenete_id: query.convenete_id ?? null,
      proponente_id: query.convenete_id ?? null,
      instrumento_id: query.instrumento_id ?? null,
      concedente: query.concedente ?? null,
      status: query.status ?? null,
      ativo: query.ativo,
      data_de: query.data_de ?? null,
      data_ate: query.data_ate ?? null
    },
    kpis,
    series: {
      boletins_mensais: Array.from(boletinsMensais.entries()).map(([mes, valor]) => ({ mes, valor })),
      repasses_mensais: Array.from(repassesMensais.entries()).map(([mes, valor]) => ({ mes, valor })),
      obras_por_status: Array.from(statusMap.entries()).map(([status, quantidade]) => ({ status, quantidade }))
    },
    instrumentos
  };
};

type StageSummaryItem = {
  etapa: string;
  concluida: boolean;
};

const SOLICITACAO_TIPO_LABEL: Record<SolicitacaoCaixaTipo, string> = {
  EMAIL_RECEBIDO: "Email recebido",
  COMENTARIO_TICKET: "Comentario no ticket",
  RESPOTA_ENVIADA: "Resposta enviada",
  ASSOCIAÇÃO_MANUAL: "Associacao manual"
};

const normalizeAuditChangedFields = (value: Prisma.JsonValue | null): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item)).filter((item) => item.trim() !== "");
};

const normalizeEmailBodyForPendingExtraction = (value: string) => {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized.startsWith("Origem:")) {
    return normalized;
  }

  const separatorIndex = normalized.indexOf("\n\n");
  if (separatorIndex === -1) {
    return normalized;
  }

  return normalized.slice(separatorIndex + 2).trim();
};

const sanitizePendingInstruction = (value: string) =>
  value
    .replace(/^[-•*]\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[;.,:\-–]+$/g, "")
    .trim();

const normalizePendingMatcherValue = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const isStopLineForPendingExtraction = (value: string) =>
  /^(?:estamos a disposicao|respeitosamente|atenciosamente|cordialmente|informacao confidencial|## informacao confidencial)/i.test(
    normalizePendingMatcherValue(value)
  );

const isSectionMarkerForPendingExtraction = (value: string) =>
  /(solicitac(?:ao|oes)|pendenc(?:ia|ias)|apontamento|prazos? para atendimento)/i.test(
    normalizePendingMatcherValue(value)
  );

const isPhaseLabelForPendingExtraction = (value: string) =>
  /^(?:ultimo desbloqueio|proxima vistoria|fase|apontamento)$/i.test(normalizePendingMatcherValue(value));

const isInstructionLine = (value: string) =>
  /^(?:[-•*]\s*)?(?:disponibilizar|anexar|efetuar|depositar|inserir|apresentar|verificar|substituir|providenciar|regularizar|encaminhar|enviar|classificar|deve ser|deve ser apresentado|apresentacao\b|titularidade da area)/i.test(
    normalizePendingMatcherValue(value)
  );

const shouldIgnorePendingInstruction = (value: string) =>
  /^(?:obs\.|o documento de titularidade pode ser enviado)/i.test(normalizePendingMatcherValue(value));

const extractPendingInstructionsFromEmail = (value: string | null): string[] => {
  if (!value) {
    return [];
  }

  const body = normalizeEmailBodyForPendingExtraction(value);
  if (body === "") {
    return [];
  }

  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const items: string[] = [];
  let inPendingSection = false;
  let previousWasPhaseLabel = false;

  lines.forEach((line) => {
    if (isStopLineForPendingExtraction(line)) {
      inPendingSection = false;
      previousWasPhaseLabel = false;
      return;
    }

    if (isSectionMarkerForPendingExtraction(line)) {
      inPendingSection = true;
      previousWasPhaseLabel = false;
      return;
    }

    if (isPhaseLabelForPendingExtraction(line)) {
      previousWasPhaseLabel = true;
      return;
    }

    const shouldCapture = line.startsWith("-") || line.startsWith("•") || (inPendingSection && isInstructionLine(line)) || (previousWasPhaseLabel && isInstructionLine(line));
    previousWasPhaseLabel = false;

    if (!shouldCapture) {
      return;
    }

    const cleaned = sanitizePendingInstruction(line);
    if (cleaned === "" || shouldIgnorePendingInstruction(cleaned)) {
      return;
    }

    items.push(cleaned);
  });

  return Array.from(new Set(items));
};

const STAGE_ORDER_BY_FLOW: Record<InstrumentFlowType, string[]> = {
  OBRA: [
    "PROPOSTA",
    "REQUISITOS_CELEBRACAO",
    "PROJETO_BASICO_TERMO_REFERENCIA",
    "PROCESSO_EXECUCAO_LICITACAO",
    "VERIFICACAO_PROCESSO_LICITATORIO",
    "INSTRUMENTOS_CONTRATUAIS",
    "ACOMPANHAMENTO_OBRA"
  ],
  AQUISICAO_EQUIPAMENTOS: [
    "PROPOSTA",
    "REQUISITOS_CELEBRACAO",
    "PROJETO_BASICO_TERMO_REFERENCIA",
    "PROCESSO_EXECUCAO_LICITACAO",
    "VERIFICACAO_PROCESSO_LICITATORIO",
    "INSTRUMENTOS_CONTRATUAIS",
    "ACOMPANHAMENTO_OBRA"
  ],
  EVENTOS: [
    "PROPOSTA",
    "REQUISITOS_CELEBRACAO",
    "PROJETO_BASICO_TERMO_REFERENCIA",
    "PROCESSO_EXECUCAO_LICITACAO",
    "VERIFICACAO_PROCESSO_LICITATORIO",
    "INSTRUMENTOS_CONTRATUAIS",
    "ACOMPANHAMENTO_OBRA"
  ]
};

const STAGE_LABELS_BY_FLOW: Record<InstrumentFlowType, Record<string, string>> = {
  OBRA: {
    PROPOSTA: "Proposta",
    REQUISITOS_CELEBRACAO: "Requisitos de Celebracao",
    PROJETO_BASICO_TERMO_REFERENCIA: "Projeto Basico / Termo de Referencia",
    PROCESSO_EXECUCAO_LICITACAO: "Processo de Execucao (Licitacao)",
    VERIFICACAO_PROCESSO_LICITATORIO: "Verificacao do Processo Licitatorio",
    INSTRUMENTOS_CONTRATUAIS: "Instrumentos Contratuais",
    ACOMPANHAMENTO_OBRA: "Acompanhamento de Obra"
  },
  AQUISICAO_EQUIPAMENTOS: {
    PROPOSTA: "Proposta",
    REQUISITOS_CELEBRACAO: "Requisitos de Celebracao",
    PROJETO_BASICO_TERMO_REFERENCIA: "Termo de Referencia e Projeto",
    PROCESSO_EXECUCAO_LICITACAO: "Processo de Aquisicao (Licitacao)",
    VERIFICACAO_PROCESSO_LICITATORIO: "Verificacao do Processo Licitatorio",
    INSTRUMENTOS_CONTRATUAIS: "Instrumentos Contratuais",
    ACOMPANHAMENTO_OBRA: "Acompanhamento de Entregas"
  },
  EVENTOS: {
    PROPOSTA: "Proposta",
    REQUISITOS_CELEBRACAO: "Requisitos de Celebracao",
    PROJETO_BASICO_TERMO_REFERENCIA: "Plano Basico do Evento",
    PROCESSO_EXECUCAO_LICITACAO: "Processo de Contratacao",
    VERIFICACAO_PROCESSO_LICITATORIO: "Verificacao do Processo",
    INSTRUMENTOS_CONTRATUAIS: "Instrumentos Contratuais",
    ACOMPANHAMENTO_OBRA: "Acompanhamento de Execucao"
  }
};

const computeCurrentStage = (
  flowType: InstrumentFlowType,
  checklistItems: Array<{ etapa: string; obrigatorio: boolean; status: string; concluido: boolean }>
) => {
  const stageOrder = STAGE_ORDER_BY_FLOW[flowType] ?? STAGE_ORDER_BY_FLOW.OBRA;
  const stageSummary: StageSummaryItem[] = stageOrder.map((etapa) => {
    const stageItems = checklistItems.filter((item) => item.etapa === etapa);
    const stageMandatory = stageItems.filter((item) => item.obrigatorio);
    const pendingMandatory = stageMandatory.filter((item) => !(item.concluido || item.status === "ACEITO"));

    return {
      etapa,
      concluida: stageMandatory.length > 0 && pendingMandatory.length === 0
    };
  });

  return stageSummary.find((item) => !item.concluida)?.etapa ?? null;
};

export const buildAndamentoInstrumentosReport = async (query: AndamentoInstrumentosReportQueryInput) => {
  const where: Prisma.InstrumentProposalWhereInput = {};
  if (query.instrumentos.length > 0) {
    where.instrumento = {
      in: query.instrumentos
    };
  }
  if (query.convenete_id !== undefined) {
    where.conveneteId = query.convenete_id;
  }
  if (query.status) {
    where.status = query.status;
  }

  const instrumentos = await prisma.instrumentProposal.findMany({
    where,
    select: {
      id: true,
      status: true,
      proposta: true,
      instrumento: true,
      objeto: true,
      fluxoTipo: true,
      checklistItems: {
        select: {
          etapa: true,
          obrigatorio: true,
          status: true,
          concluido: true
        }
      },
      stageFollowUps: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: {
          id: true,
          etapa: true,
          texto: true,
          createdAt: true,
          userEmail: true,
          user: {
            select: {
              id: true,
              nome: true,
              email: true
            }
          }
        }
      },
      solicitacoesCaixa: {
        where: {
          tipo: SolicitacaoCaixaTipo.EMAIL_RECEBIDO
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          ticketId: true,
          descricao: true,
          origemEmail: true,
          assuntoEmail: true,
          createdAt: true
        }
      }
    },
    orderBy: [{ instrumento: "asc" }, { id: "asc" }]
  });

  const instrumentIds = instrumentos.map((item) => item.id);

  const [allFollowUps, allSolicitacoesHistorico, allAuditLogs] = await Promise.all([
    prisma.instrumentStageFollowUp.findMany({
      where: {
        instrumentId: {
          in: instrumentIds
        }
      },
      include: {
        user: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        }
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    }),
    prisma.instrumentSolicitacaoCaixa.findMany({
      where: {
        instrumentId: {
          in: instrumentIds
        }
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    }),
    prisma.auditLog.findMany({
      where: {
        instrumentId: {
          in: instrumentIds
        }
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    })
  ]);

  const ticketIds = Array.from(
    new Set(
      [...instrumentos.flatMap((item) => item.solicitacoesCaixa), ...allSolicitacoesHistorico]
        .map((sol) => sol.ticketId)
        .filter((ticketId): ticketId is number => typeof ticketId === "number")
    )
  );

  const ticketsById = new Map<
    number,
    { id: number; codigo: string; titulo: string; descricao: string | null; pendencias: string[] }
  >();
  if (ticketIds.length > 0) {
    const tickets = await prisma.ticket.findMany({
      where: {
        id: {
          in: ticketIds
        }
      },
      select: {
        id: true,
        codigo: true,
        titulo: true,
        descricao: true,
        checklistItems: {
          orderBy: [{ ordem: "asc" }, { id: "asc" }],
          select: {
            descricao: true
          }
        }
      }
    });
    tickets.forEach((ticket) =>
      {
        const parsedPendencias = extractPendingInstructionsFromEmail(ticket.descricao);
        ticketsById.set(ticket.id, {
          id: ticket.id,
          codigo: ticket.codigo,
          titulo: ticket.titulo,
          descricao: ticket.descricao,
          pendencias:
            parsedPendencias.length > 0
              ? parsedPendencias
              : ticket.checklistItems.map((item) => item.descricao.trim()).filter((item) => item.length > 0)
        });
      }
    );
  }

  const followUpsByInstrument = new Map<number, typeof allFollowUps>();
  allFollowUps.forEach((item) => {
    const bucket = followUpsByInstrument.get(item.instrumentId) ?? [];
    bucket.push(item);
    followUpsByInstrument.set(item.instrumentId, bucket);
  });

  const solicitacoesByInstrument = new Map<number, typeof allSolicitacoesHistorico>();
  allSolicitacoesHistorico.forEach((item) => {
    const bucket = solicitacoesByInstrument.get(item.instrumentId) ?? [];
    bucket.push(item);
    solicitacoesByInstrument.set(item.instrumentId, bucket);
  });

  const auditLogsByInstrument = new Map<number, typeof allAuditLogs>();
  allAuditLogs.forEach((item) => {
    const bucket = auditLogsByInstrument.get(item.instrumentId) ?? [];
    bucket.push(item);
    auditLogsByInstrument.set(item.instrumentId, bucket);
  });

  const itens = instrumentos.map((item) => {
    const etapaAtual =
      computeCurrentStage(item.fluxoTipo, item.checklistItems) ??
      (item.status === "EM_EXECUCAO" ? "ACOMPANHAMENTO_OBRA" : null);
    const etapaAtualLabel = etapaAtual ? (STAGE_LABELS_BY_FLOW[item.fluxoTipo]?.[etapaAtual] ?? etapaAtual) : null;

    const followUpsDoInstrumento = followUpsByInstrument.get(item.id) ?? [];
    const ultimoAcompanhamentoObra =
      followUpsDoInstrumento.find((followUp) => followUp.etapa === "ACOMPANHAMENTO_OBRA") ?? null;
    const ultimoAcompanhamento = ultimoAcompanhamentoObra ?? item.stageFollowUps[0] ?? null;
    const etapaAcompanhamento = ultimoAcompanhamento?.etapa ?? null;
    const etapaAcompanhamentoLabel =
      etapaAcompanhamento !== null ? (STAGE_LABELS_BY_FLOW[item.fluxoTipo]?.[etapaAcompanhamento] ?? etapaAcompanhamento) : null;

    const historicoCompleto = [
      ...followUpsDoInstrumento.map((followUp) => ({
        tipo: "ACOMPANHAMENTO" as const,
        subtipo: followUp.etapa,
        subtipo_label: STAGE_LABELS_BY_FLOW[item.fluxoTipo]?.[followUp.etapa] ?? followUp.etapa,
        descricao: followUp.texto?.trim() || "Acompanhamento registrado.",
        usuario: {
          id: followUp.user?.id ?? null,
          nome: followUp.user?.nome ?? null,
          email: followUp.user?.email ?? followUp.userEmail
        },
        created_at: followUp.createdAt.toISOString()
      })),
      ...(solicitacoesByInstrument.get(item.id) ?? []).map((solicitacao) => ({
        tipo: "SOLICITACAO_CAIXA" as const,
        subtipo: solicitacao.tipo,
        subtipo_label: SOLICITACAO_TIPO_LABEL[solicitacao.tipo] ?? solicitacao.tipo,
        descricao: solicitacao.descricao,
        usuario: null,
        ticket:
          solicitacao.ticketId && ticketsById.get(solicitacao.ticketId)
            ? {
                id: ticketsById.get(solicitacao.ticketId)?.id ?? null,
                codigo: ticketsById.get(solicitacao.ticketId)?.codigo ?? null,
                titulo: ticketsById.get(solicitacao.ticketId)?.titulo ?? null
              }
            : null,
        origem_email: solicitacao.origemEmail ?? null,
        assunto_email: solicitacao.assuntoEmail ?? null,
        created_at: solicitacao.createdAt.toISOString()
      })),
      ...(auditLogsByInstrument.get(item.id) ?? []).map((log) => ({
        tipo: "AUDITORIA" as const,
        subtipo: log.action,
        subtipo_label: log.action,
        descricao:
          normalizeAuditChangedFields(log.changedFields).length > 0
            ? `Campos alterados: ${normalizeAuditChangedFields(log.changedFields).join(", ")}`
            : `Acao de auditoria: ${log.action}`,
        usuario: {
          id: log.userId ?? null,
          nome: null,
          email: log.userEmail
        },
        changed_fields: normalizeAuditChangedFields(log.changedFields),
        created_at: log.createdAt.toISOString()
      }))
    ].sort((a, b) => b.created_at.localeCompare(a.created_at));

    return {
      instrumento_id: item.id,
      proposta: item.proposta,
      instrumento: item.instrumento,
      objeto: item.objeto,
      status: item.status,
      fluxo_tipo: item.fluxoTipo,
      etapa_atual: etapaAtual,
      etapa_atual_label: etapaAtualLabel,
      solicitacoes_caixa_email: item.solicitacoesCaixa.map((sol) => ({
        id: sol.id,
        ticket_id: sol.ticketId ?? null,
        descricao: sol.descricao,
        origem_email: sol.origemEmail,
        assunto_email: sol.assuntoEmail,
        ticket: sol.ticketId ? ticketsById.get(sol.ticketId) ?? null : null,
        pendencias_email:
          sol.ticketId && ticketsById.get(sol.ticketId)?.pendencias
            ? (ticketsById.get(sol.ticketId)?.pendencias ?? [])
            : [],
        conteudo_email: sol.ticketId ? ticketsById.get(sol.ticketId)?.descricao ?? null : null,
        created_at: sol.createdAt.toISOString()
      })),
      acompanhamento: ultimoAcompanhamento
        ? {
            id: ultimoAcompanhamento.id,
            etapa: ultimoAcompanhamento.etapa,
            etapa_label: etapaAcompanhamentoLabel,
            texto: ultimoAcompanhamento.texto,
            created_at: ultimoAcompanhamento.createdAt.toISOString(),
            usuario: {
              id: ultimoAcompanhamento.user?.id ?? null,
              nome: ultimoAcompanhamento.user?.nome ?? null,
              email: ultimoAcompanhamento.user?.email ?? ultimoAcompanhamento.userEmail
            }
          }
        : null,
      historico_completo: historicoCompleto
    };
  });

  return {
    filtros: {
      convenete_id: query.convenete_id ?? null,
      status: query.status ?? null,
      instrumentos: query.instrumentos
    },
    resumo: {
      total: itens.length
    },
    itens
  };
};

export const buildTransparenciaReport = async (query: TransparenciaReportQueryInput) =>
  buildTransparenciaReportFromScraping(query);
