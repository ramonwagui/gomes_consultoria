import { InstrumentFlowType, InstrumentStatus, Prisma, UserRole } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import {
  createSystemInstrumentUpdateAuditLog,
  snapshotInstrumentForAudit
} from "../auditoria/auditoria.service";
import { ensureInstrumentSupportData } from "../instrumentos/instrumentos.service";

import {
  CreateConveneteFromProponenteInput,
  CreateConveneteInput,
  ProponenteSugestaoQueryInput,
  UpdateConveneteInput
} from "./convenetes.schema";

const TABLE_TRANSFERENCIAS_DISCRICIONARIAS = "transferencias_discricionarias";
type CurrentUser = { id: number; role: UserRole };
const isDemoUser = (user?: CurrentUser | null) => user?.role === UserRole.DEMONSTRACAO;
type BatchImportStatus = "idle" | "running" | "completed" | "error";
type BatchImportProgressItem = {
  proponente_id: number;
  nome: string;
  importacao: {
    total_encontrado: number;
    criados: number;
    atualizados: number;
    ignorados: number;
    erros: number;
  };
};
type BatchImportProgressState = {
  status: BatchImportStatus;
  scope_key: string | null;
  total_proponentes: number;
  processados: number;
  progresso_percentual: number;
  proponente_atual: string | null;
  criados: number;
  atualizados: number;
  ignorados: number;
  erros: number;
  itens: BatchImportProgressItem[];
  message: string | null;
  started_at: string | null;
  finished_at: string | null;
};

const emptyBatchImportProgressState = (): BatchImportProgressState => ({
  status: "idle",
  scope_key: null,
  total_proponentes: 0,
  processados: 0,
  progresso_percentual: 0,
  proponente_atual: null,
  criados: 0,
  atualizados: 0,
  ignorados: 0,
  erros: 0,
  itens: [],
  message: null,
  started_at: null,
  finished_at: null
});

let batchImportProgressState: BatchImportProgressState = emptyBatchImportProgressState();

const resolveBatchScopeKey = (user?: CurrentUser) => (user ? `${user.role}:${user.id}` : "GLOBAL");

const setBatchImportProgressState = (next: Partial<BatchImportProgressState>) => {
  batchImportProgressState = {
    ...batchImportProgressState,
    ...next
  };
};

export const getReimportAllProgress = (user?: CurrentUser) => {
  const scopeKey = resolveBatchScopeKey(user);
  if (batchImportProgressState.scope_key !== scopeKey) {
    return emptyBatchImportProgressState();
  }
  return batchImportProgressState;
};

const escapeLikeValue = (value: string) => value.replace(/([\\%_])/g, "\\$1");

const isMissingTransferenciasTableError = (error: unknown) => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2010") {
    return false;
  }

  const metaMessage =
    typeof error.meta === "object" && error.meta && "message" in error.meta
      ? String((error.meta as { message?: unknown }).message ?? "")
      : "";

  const details = `${error.message} ${metaMessage}`.toLowerCase();
  return details.includes("no such table") && details.includes(TABLE_TRANSFERENCIAS_DISCRICIONARIAS);
};

const parseMaybeDate = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }

  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (brMatch) {
    return new Date(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}T00:00:00.000Z`);
  }

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    return new Date(`${trimmed}T00:00:00.000Z`);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toNonNegativeNumber = (value: number | string | null | undefined) => {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Math.max(0, num);
};

const normalizeCode = (value: string | null | undefined) => value?.trim() ?? "";

const mapStatusFromTransferencia = (
  situacaoProposta: string | null,
  situacaoConvenio: string | null,
  vigenciaFim: Date
): InstrumentStatus => {
  const source = `${situacaoConvenio ?? ""} ${situacaoProposta ?? ""}`.toLowerCase();

  if (source.includes("conclu") || source.includes("encerr")) {
    return InstrumentStatus.CONCLUIDO;
  }
  if (source.includes("prest") && source.includes("cont")) {
    return InstrumentStatus.PRESTACAO_PENDENTE;
  }
  if (source.includes("exec") || source.includes("vigent")) {
    return InstrumentStatus.EM_EXECUCAO;
  }
  if (vigenciaFim.getTime() < Date.now()) {
    return InstrumentStatus.VENCIDO;
  }
  if (source.includes("assin")) {
    return InstrumentStatus.ASSINADO;
  }

  return InstrumentStatus.EM_ELABORACAO;
};

type TransferenciaInstrumentoRow = {
  nr_proposta: string | null;
  nr_convenio: string | null;
  objeto: string | null;
  situacao_proposta: string | null;
  situacao_convenio: string | null;
  dia_assin_conv: string | null;
  dia_inic_vigencia: string | null;
  dia_fim_vigencia: string | null;
  dt_aprovacao_proposta: string | null;
  dt_conclusao_prestacao_contas: string | null;
  valor_global_conv: number | string | null;
  valor_contrapartida_financeira: number | string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  concedente_orgao_sup: string | null;
  concedente_orgao: string | null;
};

const sanitizeBankField = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }
  const upper = normalized.toUpperCase();
  if (
    upper.includes("AGENCIA VAZIA") ||
    upper.includes("CONTA VAZIA") ||
    upper.includes("NÃO INFORMADO") ||
    upper.includes("NAO INFORMADO")
  ) {
    return null;
  }
  return normalized;
};

const resolveConcedenteFromTransferencia = (row: TransferenciaInstrumentoRow) => {
  const primary = row.concedente_orgao_sup?.trim();
  if (primary) {
    return primary;
  }

  const fallback = row.concedente_orgao?.trim();
  if (fallback) {
    return fallback;
  }

  return "Transferegov";
};

const importarInstrumentosDoProponente = async (conveneteId: number, cnpjDigits: string, user?: CurrentUser) => {
  try {
    const rows = await prisma.$queryRaw<TransferenciaInstrumentoRow[]>(Prisma.sql`
      SELECT
        nr_proposta,
        nr_convenio,
        MAX(objeto) AS objeto,
        MAX(situacao_proposta) AS situacao_proposta,
        MAX(situacao_convenio) AS situacao_convenio,
        MAX(dia_assin_conv) AS dia_assin_conv,
        MAX(dia_inic_vigencia) AS dia_inic_vigencia,
        MAX(dia_fim_vigencia) AS dia_fim_vigencia,
        MAX(dt_aprovacao_proposta) AS dt_aprovacao_proposta,
        MAX(dt_conclusao_prestacao_contas) AS dt_conclusao_prestacao_contas,
        MAX(valor_global_conv) AS valor_global_conv,
        MAX(valor_contrapartida_financeira) AS valor_contrapartida_financeira,
        MAX(banco) AS banco,
        MAX(agencia) AS agencia,
        MAX(conta) AS conta,
        MAX(concedente_orgao_sup) AS concedente_orgao_sup,
        MAX(concedente_orgao) AS concedente_orgao
      FROM ${Prisma.raw(TABLE_TRANSFERENCIAS_DISCRICIONARIAS)}
      WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ${cnpjDigits}
        AND nr_proposta IS NOT NULL
        AND TRIM(nr_proposta) <> ''
      GROUP BY nr_proposta, nr_convenio
      ORDER BY nr_proposta DESC, nr_convenio DESC
    `);

    let criados = 0;
    let atualizados = 0;
    let ignorados = 0;
    let erros = 0;

    for (const row of rows) {
      const proposta = normalizeCode(row.nr_proposta);
      let instrumento = normalizeCode(row.nr_convenio);

      if (proposta === "") {
        ignorados += 1;
        continue;
      }

      // Se nao tem convenio, usa um prefixo para identificar como proposta na gestao
      if (instrumento === "" || instrumento === "0") {
        instrumento = `PROP ${proposta}`;
      }

      const vigenciaInicio = parseMaybeDate(row.dia_inic_vigencia) ?? parseMaybeDate(row.dia_assin_conv) ?? new Date();
      const vigenciaFim = parseMaybeDate(row.dia_fim_vigencia) ?? vigenciaInicio;
      const vigenciaFimSafe = vigenciaFim < vigenciaInicio ? vigenciaInicio : vigenciaFim;
      const dataCadastro = parseMaybeDate(row.dt_aprovacao_proposta) ?? parseMaybeDate(row.dia_assin_conv) ?? vigenciaInicio;
      const dataPrestacaoContas = parseMaybeDate(row.dt_conclusao_prestacao_contas);

      const dataPayload: Prisma.InstrumentProposalUncheckedCreateInput = {
        proposta,
        instrumento,
        objeto: (row.objeto?.trim() || `Instrumento importado automaticamente (${instrumento})`).slice(0, 500),
        valorRepasse: toNonNegativeNumber(row.valor_global_conv),
        valorContrapartida: toNonNegativeNumber(row.valor_contrapartida_financeira),
        dataCadastro,
        dataAssinatura: parseMaybeDate(row.dia_assin_conv),
        vigenciaInicio,
        vigenciaFim: vigenciaFimSafe,
        dataPrestacaoContas,
        dataDou: null,
        concedente: resolveConcedenteFromTransferencia(row),
        banco: sanitizeBankField(row.banco),
        agencia: sanitizeBankField(row.agencia),
        conta: sanitizeBankField(row.conta),
        conveneteId,
        fluxoTipo: InstrumentFlowType.OBRA,
        status: mapStatusFromTransferencia(row.situacao_proposta, row.situacao_convenio, vigenciaFimSafe),
        responsavel: null,
        orgaoExecutor: null,
        empresaVencedora: null,
        cnpjVencedora: null,
        valorVencedor: null,
        observacoes: "Importado automaticamente da base Transferegov ao marcar proponente como atendido.",
        demoOwnerUserId: isDemoUser(user) ? user!.id : null,
        ativo: true
      };

      try {
        const existing = await prisma.instrumentProposal.findFirst({
          where: {
            OR: [{ proposta }, { instrumento }],
            ...(isDemoUser(user) ? { demoOwnerUserId: user!.id } : { demoOwnerUserId: null })
          },
          select: { id: true, banco: true, agencia: true, conta: true }
        });

        if (existing) {
          const beforeSnapshot = snapshotInstrumentForAudit(
            await prisma.instrumentProposal.findUnique({
              where: { id: existing.id },
              select: {
                proposta: true,
                instrumento: true,
                objeto: true,
                valorRepasse: true,
                valorContrapartida: true,
                concedente: true,
                fluxoTipo: true,
                status: true,
                responsavel: true,
                observacoes: true,
                percentualFisicoMedicao: true,
                percentualFinanceiroMedicao: true,
                statusMedicao: true,
                dataUltimaAtualizacaoMedicao: true,
                ativo: true,
                conveneteId: true
              }
            })
          );

          const updated = await prisma.instrumentProposal.update({
            where: { id: existing.id },
            data: {
              objeto: dataPayload.objeto,
              valorRepasse: dataPayload.valorRepasse,
              valorContrapartida: dataPayload.valorContrapartida,
              dataAssinatura: dataPayload.dataAssinatura,
              vigenciaInicio: dataPayload.vigenciaInicio,
              vigenciaFim: dataPayload.vigenciaFim,
              dataPrestacaoContas: dataPayload.dataPrestacaoContas,
              dataDou: dataPayload.dataDou,
              concedente: dataPayload.concedente,
              banco: dataPayload.banco ?? existing.banco,
              agencia: dataPayload.agencia ?? existing.agencia,
              conta: dataPayload.conta ?? existing.conta,
              conveneteId: dataPayload.conveneteId,
              fluxoTipo: dataPayload.fluxoTipo,
              status: dataPayload.status,
              responsavel: dataPayload.responsavel,
              orgaoExecutor: dataPayload.orgaoExecutor,
              empresaVencedora: dataPayload.empresaVencedora,
              cnpjVencedora: dataPayload.cnpjVencedora,
              valorVencedor: dataPayload.valorVencedor,
              observacoes: dataPayload.observacoes,
              ativo: true
            },
            select: {
              id: true,
              proposta: true,
              instrumento: true,
              objeto: true,
              valorRepasse: true,
              valorContrapartida: true,
              concedente: true,
              fluxoTipo: true,
              status: true,
              responsavel: true,
              observacoes: true,
              percentualFisicoMedicao: true,
              percentualFinanceiroMedicao: true,
              statusMedicao: true,
              dataUltimaAtualizacaoMedicao: true,
              ativo: true,
              conveneteId: true
            }
          });
          await createSystemInstrumentUpdateAuditLog({
            instrumentId: existing.id,
            source: "REIMPORTACAO_PROPONENTE",
            beforeData: beforeSnapshot,
            afterData: snapshotInstrumentForAudit(updated)
          });
          await ensureInstrumentSupportData(existing.id);
          atualizados += 1;
        } else {
          const created = await prisma.instrumentProposal.create({ data: dataPayload });
          await ensureInstrumentSupportData(created.id);
          criados += 1;
        }
      } catch {
        erros += 1;
      }
    }

    return {
      total_encontrado: rows.length,
      criados,
      atualizados,
      ignorados,
      erros
    };
  } catch (error) {
    if (isMissingTransferenciasTableError(error)) {
      return {
        total_encontrado: 0,
        criados: 0,
        atualizados: 0,
        ignorados: 0,
        erros: 0
      };
    }
    throw error;
  }
};

export const reimportarInstrumentosDoProponenteAtendido = async (conveneteId: number, user?: CurrentUser) => {
  const proponente = await prisma.convenete.findFirst({
    where: {
      id: conveneteId,
      ...(isDemoUser(user) ? { demoOwnerUserId: user!.id } : user ? { demoOwnerUserId: null } : {})
    },
    select: { id: true, cnpj: true }
  });

  if (!proponente) {
    return null;
  }

  const cnpjDigits = proponente.cnpj.replace(/\D/g, "").trim();
  const importacao = await importarInstrumentosDoProponente(proponente.id, cnpjDigits, user);

  return {
    proponente_id: proponente.id,
    importacao
  };
};

export const reimportarInstrumentosTodosProponentesAtendidos = async (user?: CurrentUser) => {
  const proponentes = await prisma.convenete.findMany({
    where: isDemoUser(user) ? { demoOwnerUserId: user!.id } : user ? { demoOwnerUserId: null } : undefined,
    select: { id: true, nome: true, cnpj: true },
    orderBy: [{ nome: "asc" }, { id: "asc" }]
  });

  let criados = 0;
  let atualizados = 0;
  let ignorados = 0;
  let erros = 0;
  const startedAt = new Date().toISOString();
  const scopeKey = resolveBatchScopeKey(user);

  setBatchImportProgressState({
    status: "running",
    scope_key: scopeKey,
    total_proponentes: proponentes.length,
    processados: 0,
    progresso_percentual: 0,
    proponente_atual: null,
    criados: 0,
    atualizados: 0,
    ignorados: 0,
    erros: 0,
    itens: [],
    message: proponentes.length === 0 ? "Nenhum proponente atendido para sincronizar." : "Sincronizacao em andamento.",
    started_at: startedAt,
    finished_at: null
  });

  const itens: Array<{
    proponente_id: number;
    nome: string;
    importacao: {
      total_encontrado: number;
      criados: number;
      atualizados: number;
      ignorados: number;
      erros: number;
    };
  }> = [];

  for (const proponente of proponentes) {
    const cnpjDigits = proponente.cnpj.replace(/\D/g, "").trim();
    setBatchImportProgressState({
      proponente_atual: proponente.nome,
      message: `Importando instrumentos de ${proponente.nome}...`
    });
    const importacao = await importarInstrumentosDoProponente(proponente.id, cnpjDigits, user);
    criados += importacao.criados;
    atualizados += importacao.atualizados;
    ignorados += importacao.ignorados;
    erros += importacao.erros;

    itens.push({
      proponente_id: proponente.id,
      nome: proponente.nome,
      importacao
    });

    setBatchImportProgressState({
      processados: itens.length,
      progresso_percentual: proponentes.length === 0 ? 100 : Math.round((itens.length / proponentes.length) * 100),
      proponente_atual: proponente.nome,
      criados,
      atualizados,
      ignorados,
      erros,
      itens: [...itens],
      message: `Processados ${itens.length} de ${proponentes.length} proponente(s).`
    });
  }

  const result = {
    total_proponentes: proponentes.length,
    criados,
    atualizados,
    ignorados,
    erros,
    itens
  };

  setBatchImportProgressState({
    status: "completed",
    processados: proponentes.length,
    progresso_percentual: 100,
    proponente_atual: null,
    criados,
    atualizados,
    ignorados,
    erros,
    itens: [...itens],
    message: `Sincronizacao concluida (${proponentes.length} proponente(s)).`,
    finished_at: new Date().toISOString()
  });

  return result;
};

export const iniciarReimportacaoTodosProponentesAtendidos = (user?: CurrentUser) => {
  const scopeKey = resolveBatchScopeKey(user);
  const current = getReimportAllProgress(user);
  if (current.status === "running") {
    return current;
  }

  setBatchImportProgressState({
    ...emptyBatchImportProgressState(),
    status: "running",
    scope_key: scopeKey,
    message: "Preparando sincronizacao...",
    started_at: new Date().toISOString(),
    finished_at: null
  });

  void reimportarInstrumentosTodosProponentesAtendidos(user).catch((error) => {
    setBatchImportProgressState({
      status: "error",
      message: error instanceof Error ? error.message : "Falha ao sincronizar proponentes atendidos.",
      proponente_atual: null,
      finished_at: new Date().toISOString()
    });
  });

  return getReimportAllProgress(user);
};

export const createConvenete = async (input: CreateConveneteInput, user?: CurrentUser) => {
  const cnpjDigits = input.cnpj.replace(/\D/g, "").trim();
  const existing = await prisma.convenete.findFirst({
    where: isDemoUser(user) ? { cnpj: cnpjDigits, demoOwnerUserId: user!.id } : { cnpj: cnpjDigits, demoOwnerUserId: null },
    select: { id: true }
  });
  if (existing) {
    throw new Error("CONVENETE_CNPJ_ALREADY_EXISTS");
  }

  return prisma.convenete.create({
    data: {
      nome: input.nome,
      cnpj: cnpjDigits,
      endereco: input.endereco,
      bairro: input.bairro,
      cep: input.cep,
      uf: input.uf,
      cidade: input.cidade,
      tel: input.tel || "",
      email: input.email || "",
      demoOwnerUser: isDemoUser(user) ? { connect: { id: user!.id } } : undefined
    }
  });
};

export const listConvenetes = async (user?: CurrentUser) => {
  return prisma.convenete.findMany({
    where: isDemoUser(user) ? { demoOwnerUserId: user!.id } : { demoOwnerUserId: null },
    orderBy: [{ nome: "asc" }, { id: "asc" }]
  });
};

export const listProponenteSugestoesFromTransferencias = async (query: ProponenteSugestaoQueryInput) => {
  const term = query.q.trim();
  const digits = term.replace(/\D/g, "");

  console.log(`Buscando sugestões para: "${term}" (digitos: ${digits})`);

  if (digits.length === 14) {
    console.log(`CNPJ completo detectado, tentando Brasil API...`);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
        headers: { "User-Agent": "Gestconv360/1.0" }
      });
      console.log(`Brasil API status: ${response.status}`);
      if (response.ok) {
        const data: any = await response.json();
        console.log(`Brasil API retornou: ${data.razao_social}`);
        return [{
          cnpj: digits,
          nome_proponente: data.razao_social ?? "RAZAO SOCIAL NAO ENCONTRADA",
          uf: data.uf ?? null,
          cidade: data.municipio ?? null
        }];
      }
    } catch (err: any) {
      console.error(`Erro ao buscar na Brasil API: ${err.message}`);
    }
  }

  if (term.length < 2) {
    return [] as Array<{ cnpj: string; nome_proponente: string; uf: string | null; cidade: string | null }>;
  }

  const normalizedLike = `%${escapeLikeValue(term.toLowerCase())}%`;

  const filters: Prisma.Sql[] = [Prisma.sql`LOWER(nome_proponente) LIKE ${normalizedLike} ESCAPE '\\'`];
  if (digits.length >= 2) {
    filters.push(
      Prisma.sql`REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') LIKE ${`%${digits}%`}`
    );
  }

  const whereClause = Prisma.sql`
    WHERE cnpj IS NOT NULL
      AND TRIM(cnpj) <> ''
      AND nome_proponente IS NOT NULL
      AND TRIM(nome_proponente) <> ''
      AND (${Prisma.join(filters, " OR ")})
  `;

  try {
    const rows = await prisma.$queryRaw<
      Array<{
        cnpj: string | null;
        nome_proponente: string | null;
        uf: string | null;
        cidade: string | null;
        total: number | bigint | string;
      }>
    >(Prisma.sql`
      SELECT
        cnpj,
        nome_proponente,
        MAX(uf) AS uf,
        MAX(municipio) AS cidade,
        COUNT(*) AS total
      FROM ${Prisma.raw(TABLE_TRANSFERENCIAS_DISCRICIONARIAS)}
      ${whereClause}
      GROUP BY cnpj, nome_proponente
      ORDER BY total DESC, nome_proponente ASC, cnpj ASC
      LIMIT ${query.limit}
    `);

    return rows
      .map((row) => ({
        cnpj: row.cnpj?.replace(/\D/g, "").trim() ?? "",
        nome_proponente: row.nome_proponente?.trim() ?? "",
        uf: row.uf?.trim() ?? null,
        cidade: row.cidade?.trim() ?? null
      }))
      .filter((row) => row.cnpj !== "" && row.nome_proponente !== "");
  } catch (error) {
    if (isMissingTransferenciasTableError(error)) {
      return [] as Array<{ cnpj: string; nome_proponente: string; uf: string | null; cidade: string | null }>;
    }
    throw error;
  }
};

export const createConveneteFromProponente = async (input: CreateConveneteFromProponenteInput, user?: CurrentUser) => {
  const cnpjDigits = input.cnpj.replace(/\D/g, "").trim();
  const nomeProponente = input.nome_proponente.trim();
  const uf = input.uf?.trim().toUpperCase();
  const cidade = input.cidade?.trim();

  const updateData: Prisma.ConveneteUpdateInput = {
    nome: nomeProponente
  };

  if (uf && uf.length === 2) {
    updateData.uf = uf;
  }
  if (cidade && cidade.length > 0) {
    updateData.cidade = cidade;
  }

  let proponente = await prisma.convenete.findFirst({
    where: isDemoUser(user) ? { cnpj: cnpjDigits, demoOwnerUserId: user!.id } : { cnpj: cnpjDigits, demoOwnerUserId: null }
  });

  if (proponente) {
    proponente = await prisma.convenete.update({
      where: { id: proponente.id },
      data: updateData
    });
  } else {
    proponente = await prisma.convenete.create({
      data: {
        nome: nomeProponente,
        cnpj: cnpjDigits,
        endereco: "Origem Transferegov",
        bairro: "NAO INFORMADO",
        cep: "00000-000",
        uf: uf && uf.length === 2 ? uf : "NI",
        cidade: cidade && cidade.length > 0 ? cidade : "NAO INFORMADA",
        tel: "0000000000",
        email: `${cnpjDigits}@proponente.local`,
        demoOwnerUser: isDemoUser(user) ? { connect: { id: user!.id } } : undefined
      }
    });
  }

  const importacao = await importarInstrumentosDoProponente(proponente.id, cnpjDigits, user);

  return {
    proponente,
    importacao
  };
};

export const getConveneteById = async (id: number, user?: CurrentUser) => {
  return prisma.convenete.findFirst({
    where: {
      id,
      ...(isDemoUser(user) ? { demoOwnerUserId: user!.id } : user ? { demoOwnerUserId: null } : {})
    }
  });
};

export const updateConvenete = async (id: number, input: UpdateConveneteInput) => {
  const cnpjDigits = input.cnpj?.replace(/\D/g, "").trim();
  if (cnpjDigits) {
    const current = await prisma.convenete.findUnique({
      where: { id },
      select: { demoOwnerUserId: true }
    });
    const existing = await prisma.convenete.findFirst({
      where: {
        cnpj: cnpjDigits,
        id: { not: id },
        demoOwnerUserId: current?.demoOwnerUserId ?? null
      },
      select: { id: true }
    });
    if (existing) {
      throw new Error("CONVENETE_CNPJ_ALREADY_EXISTS");
    }
  }

  return prisma.convenete.update({
    where: { id },
    data: {
      nome: input.nome,
      cnpj: cnpjDigits ?? input.cnpj,
      endereco: input.endereco || "",
      numero: input.numero || undefined,
      complemento: input.complemento || undefined,
      bairro: input.bairro || "",
      cep: input.cep || undefined,
      uf: input.uf || "",
      cidade: input.cidade || "",
      tel: input.tel || undefined,
      email: input.email || undefined,
      gestorNome: input.gestorNome || undefined,
      gestorCpf: input.gestorCpf || undefined,
      gestorRg: input.gestorRg || undefined,
      gestorEndereco: input.gestorEndereco || undefined,
      gestorEmail: input.gestorEmail || undefined
    }
  });
};

export const updateConveneteLogo = async (
  id: number,
  payload: {
    logoPath: string;
    logoMimeType: string;
  }
) => {
  return prisma.convenete.update({
    where: { id },
    data: {
      logoPath: payload.logoPath,
      logoMimeType: payload.logoMimeType
    }
  });
};

export const clearConveneteLogo = async (id: number) => {
  return prisma.convenete.update({
    where: { id },
    data: {
      logoPath: null,
      logoMimeType: null
    }
  });
};

export const deleteConvenete = async (id: number, user?: CurrentUser) => {
  const existing = await prisma.convenete.findFirst({
    where: {
      id,
      ...(isDemoUser(user) ? { demoOwnerUserId: user!.id } : user ? { demoOwnerUserId: null } : {})
    },
    select: { id: true }
  });

  if (!existing) {
    return false;
  }

  const instrumentos = await prisma.instrumentProposal.findMany({
    where: { conveneteId: id },
    select: { id: true }
  });
  const instrumentIds = instrumentos.map((i) => i.id);

  await prisma.$transaction([
    prisma.ticket.deleteMany({
      where: { instrumentId: { in: instrumentIds } }
    }),
    prisma.auditLog.deleteMany({
      where: { instrumentId: { in: instrumentIds } }
    }),
    prisma.instrumentProposal.deleteMany({
      where: { conveneteId: id }
    }),
    prisma.paymentRequest.deleteMany({
      where: { conveneteId: id }
    }),
    prisma.convenete.delete({ where: { id } })
  ]);

  return true;
};
