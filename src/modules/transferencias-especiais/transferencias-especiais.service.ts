import { prisma } from "../../lib/prisma";
import { InstrumentStatus, Prisma } from "@prisma/client";
import {
  PlanoAcaoEspecialQueryInput,
  SincronizarTransferenciasEspeciaisPorCnpjInput
} from "./transferencias-especiais.schema";
import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";

const SCRIPT_PATH = path.join(process.cwd(), "src", "scripts", "run-sync-especiais-realtime.ts");

let syncEspeciaisRunning = false;

// Função de normalização super agressiva para garantir match independente de acentos, espaços ou caracteres especiais
function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-zA-Z0-9]/g, "") // Remove tudo que não é letra ou número
    .toLowerCase()
    .trim();
}

type TransferenciasEspeciaisSyncStatus = {
  status: "idle" | "running" | "success" | "error";
  fase_atual: string;
  progresso_percentual: number;
  atualizado_em: string;
  initiated_at: string | null;
  finalized_em: string | null;
  detalhe: string | null;
  cancel_requested: boolean;
  estrategia_status: string;
  fonte_prioritaria: string;
  fonte_fallback: string | null;
  comparacao_habilitada: boolean;
  resumo_ultima_execucao: {
    total_atualizados: number;
    total_criados: number;
    total_erros: number;
  } | null;
};

let transferenciasEspeciaisSyncStatus: TransferenciasEspeciaisSyncStatus = {
  status: "idle",
  fase_atual: "Aguardando execucao",
  progresso_percentual: 0,
  atualizado_em: new Date().toISOString(),
  initiated_at: null,
  finalized_em: null,
  detalhe: null,
  cancel_requested: false,
  estrategia_status: "Painel publico de Especiais como fonte prioritaria; API oficial como fallback/auditoria.",
  fonte_prioritaria: "painel_publico_qlik",
  fonte_fallback: "api_oficial_transferegov",
  comparacao_habilitada: true,
  resumo_ultima_execucao: null
};

type PlanoAcaoEspecialListResponse = {
  itens: Array<{
    id_plano_acao: number;
    codigo_plano_acao: string;
    ano_plano_acao: number;
    modalidade_plano_acao: string;
    situacao_plano_acao: string;
    fonte_status: string;
    comparacao_status: string | null;
    cnpj_beneficiario_plano_acao: string;
    nome_beneficiario_plano_acao: string;
    uf_beneficiario_plano_acao: string;
    concedente: string;
    nome_parlamentar_emenda_plano_acao: string | null;
    valor_custeio_plano_acao: number;
    valor_investimento_plano_acao: number;
    id_programa: number;
    pagamento_status: string;
    pago_detectado: boolean;
    data_pagamento_detectado: string | null;
    valor_pago_detectado: number;
    documentos_habeis_quantidade: number;
    empenhos_quantidade: number;
    ordens_pagamento_quantidade: number;
    documento_habil_principal: string | null;
    ordem_pagamento_principal: string | null;
    ordem_bancaria_principal: string | null;
    situacao_pagamento: string | null;
    data_ultima_consulta_pagamento: string | null;
  }>;
  paginacao: {
    pagina: number;
    tamanho_pagina: number;
    total: number;
    total_paginas: number;
    tem_proxima: boolean;
    tem_anterior: boolean;
  };
  cache: {
    ttl_ms: number;
    em_cache: boolean;
    atualizado_em: string;
  };
};

function mapStatusToPortalString(status: InstrumentStatus): string {
  switch (status) {
    case InstrumentStatus.CONCLUIDO:
      return "Concluído";
    case InstrumentStatus.EM_EXECUCAO:
      return "Em Execução";
    case InstrumentStatus.ASSINADO:
      return "Assinado";
    case InstrumentStatus.PRESTACAO_PENDENTE:
      return "Prestação de Contas";
    case InstrumentStatus.VENCIDO:
      return "Vencido";
    default:
      return "Em Elaboração";
  }
}

const SITUACAO_PREFIX = "SITUACAO_API:";
const SITUACAO_PORTAL_PREFIX = "SITUACAO_PORTAL:";
const STATUS_SOURCE_PREFIX = "STATUS_SYNC_SOURCE:";
const STATUS_COMPARE_PREFIX = "STATUS_SYNC_COMPARE:";

function extractSituacaoOriginal(observacoes: string | null | undefined): string | null {
  const lines = (observacoes ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    if (line.startsWith(SITUACAO_PREFIX)) {
      const value = line.slice(SITUACAO_PREFIX.length).trim();
      return value || null;
    }
  }

  return null;
}

function extractObservacaoPrefixValue(
  observacoes: string | null | undefined,
  prefix: string
): string | null {
  const lines = (observacoes ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    if (line.startsWith(prefix)) {
      const value = line.slice(prefix.length).trim();
      return value || null;
    }
  }

  return null;
}

function extractAnoFromCodigoPlanoAcao(codigoPlanoAcao: string | null | undefined): number | null {
  const raw = (codigoPlanoAcao ?? "").trim();
  if (!raw) {
    return null;
  }

  // Regra principal: no padrão "09032025-086933", o ano é os 4 últimos
  // dígitos do primeiro bloco (antes do hífen): 09032025 -> 2025.
  const firstBlock = raw.split("-")[0] ?? "";
  const firstBlockDigits = firstBlock.replace(/\D/g, "");
  if (firstBlockDigits.length >= 4) {
    const yearFromFirstBlock = Number(firstBlockDigits.slice(-4));
    if (Number.isInteger(yearFromFirstBlock) && yearFromFirstBlock >= 2000 && yearFromFirstBlock <= 2100) {
      return yearFromFirstBlock;
    }
  }

  // Fallback: tenta o primeiro grupo de 8 dígitos encontrado.
  const firstEightDigitsGroup = raw.match(/\d{8}/)?.[0] ?? null;
  if (firstEightDigitsGroup) {
    const yearFromEightDigits = Number(firstEightDigitsGroup.slice(-4));
    if (Number.isInteger(yearFromEightDigits) && yearFromEightDigits >= 2000 && yearFromEightDigits <= 2100) {
      return yearFromEightDigits;
    }
  }

  // Fallback final: últimos 4 dígitos de todos os números do código.
  const allDigits = raw.replace(/\D/g, "");
  if (allDigits.length < 4) {
    return null;
  }
  const year = Number(allDigits.slice(-4));
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return null;
  }

  return year;
}

function extractIdPlanoAcaoFromCodigo(codigoPlanoAcao: string | null | undefined): number | null {
  const raw = (codigoPlanoAcao ?? "").trim();
  const afterHyphen = raw.match(/-(\d+)$/)?.[1] ?? null;
  if (!afterHyphen) {
    return null;
  }
  const id = Number(afterHyphen);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeSituacaoDisplay(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) {
    return null;
  }

  const normalizedCode = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "_");

  const knownMap: Record<string, string> = {
    AGUARDANDO_CONCLUSAO_PLANO_TRABALHO: "Em Complementação",
    AGUARDANDO_CONCLUSAO_DO_PLANO_DE_TRABALHO: "Em Complementação",
    EM_COMPLEMENTACAO: "Em Complementação",
    AGUARDANDO_ENVIO_PARA_ANALISE: "Em elaboração",
    ENVIADO_PARA_ANALISE: "Enviado para análise",
    CONCLUIDO_NT_TCU: "Legado ADPF 854 STF / NT - TCU"
  };

  if (knownMap[normalizedCode]) {
    return knownMap[normalizedCode];
  }

  if (normalizedCode.includes("LEGADO_ADPF_854")) {
    return "Legado ADPF 854 STF / NT - TCU";
  }

  if (/^[A-Z0-9_]+$/.test(normalizedCode)) {
    const friendly = normalizedCode
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    return friendly;
  }

  return raw;
}

export const listarPlanosAcaoEspeciais = async (
  query: PlanoAcaoEspecialQueryInput
): Promise<PlanoAcaoEspecialListResponse> => {
  const page = query.page;
  const pageSize = query.page_size;

  const where: Prisma.InstrumentProposalWhereInput = {
    ativo: true,
    concedente: { contains: "transferegov", mode: "insensitive" }
  };

  const conveneteWhere: Prisma.ConveneteWhereInput = {};
  let hasConveneteFilter = false;

  if (query.cnpj) {
    conveneteWhere.cnpj = query.cnpj.replace(/\D/g, "").trim();
    hasConveneteFilter = true;
  }
  if (query.uf) {
    conveneteWhere.uf = query.uf.trim().toUpperCase();
    hasConveneteFilter = true;
  }
  if (query.nome_beneficiario) {
    conveneteWhere.nome = { contains: query.nome_beneficiario.trim(), mode: "insensitive" };
    hasConveneteFilter = true;
  }

  if (hasConveneteFilter) {
    where.convenete = conveneteWhere;
  }

  if (query.codigo_plano_acao) {
    where.OR = [
      { proposta: { contains: query.codigo_plano_acao, mode: "insensitive" } },
      { instrumento: { contains: query.codigo_plano_acao, mode: "insensitive" } }
    ];
  }

  if (query.parlamentar) {
    where.responsavel = { contains: query.parlamentar, mode: "insensitive" };
  }

  const situacoesFiltroNormalizadas = (query.situacao ?? [])
    .map((item) => normalizeForSearch(String(item)))
    .filter((item) => item.length > 0);

  const allItems = await prisma.instrumentProposal.findMany({
    where,
    include: { convenete: true, transferenciaEspecialFinanceiro: true },
    orderBy: { updatedAt: "desc" }
  });

  const mappedItems = allItems.map((item) => {
    const situacaoPortal = extractObservacaoPrefixValue(item.observacoes, SITUACAO_PORTAL_PREFIX);
    const situacaoApi = extractSituacaoOriginal(item.observacoes);
    const source = extractObservacaoPrefixValue(item.observacoes, STATUS_SOURCE_PREFIX) ?? "api_oficial";
    const comparison = extractObservacaoPrefixValue(item.observacoes, STATUS_COMPARE_PREFIX);
    const financeiro = item.transferenciaEspecialFinanceiro;
    const pagoDetectado = financeiro?.pagoDetectado ?? false;
    const situacaoExibicao =
      normalizeSituacaoDisplay(situacaoPortal) ??
      normalizeSituacaoDisplay(situacaoApi) ??
      mapStatusToPortalString(item.status);
    const anoFromCodigo = extractAnoFromCodigoPlanoAcao(item.proposta);
    const anoPlanoAcao = anoFromCodigo ?? item.dataCadastro.getFullYear();
    return {
      id_plano_acao: extractIdPlanoAcaoFromCodigo(item.proposta) ?? item.id,
      codigo_plano_acao: item.proposta,
      ano_plano_acao: anoPlanoAcao,
      modalidade_plano_acao: "Transferência Especial",
      situacao_plano_acao: situacaoExibicao,
      fonte_status:
        source === "portal_qlik_screen"
          ? "Painel publico"
          : source === "api_oficial"
            ? "API oficial"
            : source,
      comparacao_status:
        comparison === "divergent"
          ? "Divergente entre painel e API"
          : comparison === "match"
            ? "Painel e API alinhados"
            : comparison === "portal_only"
              ? "Somente painel"
              : comparison === "api_only"
                ? "Somente API"
                : null,
      cnpj_beneficiario_plano_acao: item.convenete?.cnpj || "",
      nome_beneficiario_plano_acao: item.convenete?.nome || "",
      uf_beneficiario_plano_acao: item.convenete?.uf || "",
      concedente: item.concedente,
      nome_parlamentar_emenda_plano_acao: item.responsavel,
      valor_custeio_plano_acao: 0,
      valor_investimento_plano_acao: Number(item.valorRepasse),
      finalidade: item.finalidade,
      detalhamento_objeto: item.detalhamentoObjeto,
      banco: item.banco,
      agencia: item.agencia,
      conta: item.conta,
      saldo_conta_corrente: item.saldoContaCorrente ? Number(item.saldoContaCorrente) : null,
      pagamento_status: pagoDetectado ? "Pago / Em conta" : "Nao identificado",
      pago_detectado: pagoDetectado,
      data_pagamento_detectado: financeiro?.dataUltimoPagamento?.toISOString() ?? null,
      valor_pago_detectado: financeiro?.valorPagoDetectado ? Number(financeiro.valorPagoDetectado) : 0,
      documentos_habeis_quantidade: financeiro?.quantidadeDocumentosHabeis ?? 0,
      empenhos_quantidade: financeiro?.quantidadeEmpenhos ?? 0,
      ordens_pagamento_quantidade: financeiro?.quantidadeOrdensPagamento ?? 0,
      documento_habil_principal: financeiro?.documentoHabilPrincipal ?? null,
      ordem_pagamento_principal: financeiro?.ordemPagamentoPrincipal ?? null,
      ordem_bancaria_principal: financeiro?.ordemBancariaPrincipal ?? null,
      situacao_pagamento: financeiro?.situacaoPagamento ?? null,
      data_ultima_consulta_pagamento: financeiro?.dataUltimaConsulta?.toISOString() ?? null,
      id_programa: 0
    };
  });

  const anoFiltro = query.ano ? Number(query.ano) : null;
  const filteredItems = mappedItems.filter((item) => {
    // Filtro de Situação (OR)
    if (situacoesFiltroNormalizadas.length > 0) {
      const situacaoItemNormalizada = normalizeForSearch(item.situacao_plano_acao);
      const matchesAny = situacoesFiltroNormalizadas.some((filtro) =>
        situacaoItemNormalizada.includes(filtro) || filtro.includes(situacaoItemNormalizada)
      );
      if (!matchesAny) {
        return false;
      }
    }

    // Filtro de Ano
    if (anoFiltro !== null && Number.isFinite(anoFiltro) && item.ano_plano_acao !== anoFiltro) {
      return false;
    }

    if (query.pagamento === "pago" && !item.pago_detectado) {
      return false;
    }
    if (query.pagamento === "nao_pago" && item.pago_detectado) {
      return false;
    }

    return true;
  });

  const total = filteredItems.length;
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const paginaAjustada = Math.min(page, totalPaginas);
  const skip = (paginaAjustada - 1) * pageSize;
  const items = filteredItems.slice(skip, skip + pageSize);


  return {
    itens: items,
    paginacao: {
      pagina: paginaAjustada,
      tamanho_pagina: pageSize,
      total,
      total_paginas: totalPaginas,
      tem_proxima: paginaAjustada < totalPaginas,
      tem_anterior: paginaAjustada > 1
    },
    cache: {
      ttl_ms: 0,
      em_cache: false,
      atualizado_em: new Date().toISOString()
    }
  };
};

export const iniciarSincronizacaoTransferenciasEspeciaisRealtime = async (): Promise<{
  started: boolean;
  message: string;
}> => {
  return iniciarSincronizacaoTransferenciasEspeciaisRealtimeCore();
};

export const iniciarSincronizacaoTransferenciasEspeciaisRealtimePorCnpj = async (
  payload: SincronizarTransferenciasEspeciaisPorCnpjInput
): Promise<{ started: boolean; message: string; reason?: "convenete_not_found" | "already_running" | "script_not_found" }> => {
  return iniciarSincronizacaoTransferenciasEspeciaisRealtimeCore(payload.cnpj);
};

const iniciarSincronizacaoTransferenciasEspeciaisRealtimeCore = async (
  cnpj?: string
): Promise<{ started: boolean; message: string; reason?: "convenete_not_found" | "already_running" | "script_not_found" }> => {
  if (syncEspeciaisRunning) {
    return {
      started: false,
      message: "Sincronizacao de transferencias especiais ja esta em andamento.",
      reason: "already_running"
    };
  }

  if (!fs.existsSync(SCRIPT_PATH)) {
    return {
      started: false,
      message: `Script nao encontrado: ${SCRIPT_PATH}`,
      reason: "script_not_found"
    };
  }

  const cnpjDigits = cnpj ? cnpj.replace(/\D/g, "") : null;
  let conveneteNome: string | null = null;
  if (cnpjDigits) {
    const convenete = await prisma.convenete.findFirst({
      where: { cnpj: cnpjDigits, demoOwnerUserId: null },
      select: { nome: true }
    });
    if (!convenete) {
      return {
        started: false,
        message: `Convenete com CNPJ ${cnpjDigits} nao encontrado na base local.`,
        reason: "convenete_not_found"
      };
    }
    conveneteNome = convenete.nome;
  }

  syncEspeciaisRunning = true;
  const startedAt = new Date().toISOString();
  const escopo = cnpjDigits
    ? `Executando sincronizacao por CNPJ ${cnpjDigits} (${conveneteNome ?? "convenete"})`
    : "Executando script de sincronizacao";
  transferenciasEspeciaisSyncStatus = {
    status: "running",
    fase_atual: escopo,
    progresso_percentual: 1,
    atualizado_em: startedAt,
    initiated_at: startedAt,
    finalized_em: null,
    detalhe: cnpjDigits ? `Sincronizacao direcionada para o CNPJ ${cnpjDigits}.` : null,
    cancel_requested: false,
    estrategia_status: "Painel publico de Especiais como fonte prioritaria; API oficial como fallback/auditoria.",
    fonte_prioritaria: "painel_publico_qlik",
    fonte_fallback: "api_oficial_transferegov",
    comparacao_habilitada: true,
    resumo_ultima_execucao: null
  };

  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const npxCmd = isWin ? "npx.cmd" : "npx";
    
    // Em desenvolvimento, priorizamos TS para evitar execucao de dist desatualizado.
    // Em producao, priorizamos o script compilado.
    const distScriptPath = path.join(process.cwd(), "dist", "scripts", "run-sync-especiais-realtime.js");
    const tsScriptPath = path.join(process.cwd(), "src", "scripts", "run-sync-especiais-realtime.ts");
    const isProduction = (process.env.NODE_ENV ?? "").toLowerCase() === "production";
    
    let finalCmd = npxCmd;
    let finalArgs = ["tsx", tsScriptPath];

    if (isProduction && fs.existsSync(distScriptPath)) {
      console.log(`[Sync Especiais]: Usando script compilado em: ${distScriptPath}`);
      finalCmd = "node";
      finalArgs = [distScriptPath];
    } else if (fs.existsSync(tsScriptPath)) {
      console.log(`[Sync Especiais]: Usando script TypeScript em: ${tsScriptPath}`);
    } else if (fs.existsSync(distScriptPath)) {
      console.log(`[Sync Especiais]: Script TS nao encontrado; usando compilado em: ${distScriptPath}`);
      finalCmd = "node";
      finalArgs = [distScriptPath];
    } else {
      console.log(`[Sync Especiais]: Nenhum script de sincronizacao encontrado (ts/js).`);
    }

    if (cnpjDigits) {
      finalArgs.push("--cnpj", cnpjDigits);
    }

    const child = spawn(finalCmd, finalArgs, {
      shell: isWin,
      cwd: process.cwd(),
      env: { 
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || "production"
      }
    });

    let errorOutput = "";
    let standardOutput = "";
    if (child.stderr) {
      child.stderr.on("data", (data) => {
        errorOutput += data.toString();
        console.error(`[Sync Especiais Error]: ${data}`);
      });
    }
    if (child.stdout) {
      child.stdout.on("data", (data) => {
        standardOutput += data.toString();
      });
    }

    child.on("close", (code) => {
      syncEspeciaisRunning = false;
      const finalizedAt = new Date().toISOString();
      const summaryMatch = standardOutput.match(/SYNC_SUMMARY:(\{[\s\S]*?\})/);
      const summaryPayload = summaryMatch
        ? (() => {
            try {
              return JSON.parse(summaryMatch[1]) as {
                strategy?: string;
                totalAtualizados?: number;
                totalCriados?: number;
                totalErros?: number;
              };
            } catch {
              return null;
            }
          })()
        : null;
      if (code === 0) {
        transferenciasEspeciaisSyncStatus = {
          ...transferenciasEspeciaisSyncStatus,
          status: "success",
          fase_atual: "Sincronizacao concluida",
          progresso_percentual: 100,
          atualizado_em: finalizedAt,
          finalized_em: finalizedAt,
          detalhe:
            summaryPayload?.strategy === "api_only_fallback_playwright_unavailable"
              ? "Script executado com sucesso em modo fallback: API oficial, pois o Playwright/browser nao estava disponivel."
              : "Script executado com sucesso. Estrategia: painel publico prioritario + API para auditoria.",
          cancel_requested: false,
          fonte_prioritaria:
            summaryPayload?.strategy === "api_only_fallback_playwright_unavailable"
              ? "api_oficial_transferegov"
              : transferenciasEspeciaisSyncStatus.fonte_prioritaria,
          fonte_fallback:
            summaryPayload?.strategy === "api_only_fallback_playwright_unavailable"
              ? null
              : transferenciasEspeciaisSyncStatus.fonte_fallback,
          comparacao_habilitada:
            summaryPayload?.strategy === "api_only_fallback_playwright_unavailable"
              ? false
              : transferenciasEspeciaisSyncStatus.comparacao_habilitada,
          estrategia_status:
            summaryPayload?.strategy === "api_only_fallback_playwright_unavailable"
              ? "Fallback automatico: API oficial somente, porque o Playwright/browser nao estava disponivel no ambiente."
              : transferenciasEspeciaisSyncStatus.estrategia_status,
          resumo_ultima_execucao: summaryPayload
            ? {
                total_atualizados: Number(summaryPayload.totalAtualizados ?? 0),
                total_criados: Number(summaryPayload.totalCriados ?? 0),
                total_erros: Number(summaryPayload.totalErros ?? 0)
              }
            : transferenciasEspeciaisSyncStatus.resumo_ultima_execucao
        };
      } else {
        // Capturamos mais detalhes do erro para diagnosticar
        // Se houver muita coisa, pegamos os ultimos 1000 caracteres que costumam ter a stacktrace final
        const detailMsg = errorOutput.length > 1000 ? `...${errorOutput.slice(-997)}` : errorOutput;
        
        transferenciasEspeciaisSyncStatus = {
          ...transferenciasEspeciaisSyncStatus,
          status: "error",
          fase_atual: "Erro na execucao do script",
          progresso_percentual: 100,
          atualizado_em: finalizedAt,
          finalized_em: finalizedAt,
          detalhe: `Codigo ${code}: ${detailMsg.replace(/\n/g, " | ") || "Verifique os logs detalhados do servidor"}`,
          cancel_requested: false,
          resumo_ultima_execucao: summaryPayload
            ? {
                total_atualizados: Number(summaryPayload.totalAtualizados ?? 0),
                total_criados: Number(summaryPayload.totalCriados ?? 0),
                total_erros: Number(summaryPayload.totalErros ?? 0)
              }
            : transferenciasEspeciaisSyncStatus.resumo_ultima_execucao
        };
      }
    });

    child.on("error", (err) => {
      syncEspeciaisRunning = false;
      transferenciasEspeciaisSyncStatus = {
        ...transferenciasEspeciaisSyncStatus,
        status: "error",
        fase_atual: "Erro ao iniciar script",
        progresso_percentual: 100,
        atualizado_em: new Date().toISOString(),
        finalized_em: new Date().toISOString(),
        detalhe: err.message,
        cancel_requested: false
      };
    });

    resolve({
      started: true,
      message: cnpjDigits
        ? `Sincronizacao por CNPJ ${cnpjDigits} iniciada com sucesso. Acompanhe pelo status.`
        : "Sincronizacao iniciada com sucesso. Acompanhe pelo status."
    });
  });
};

export const obterStatusSincronizacaoTransferenciasEspeciaisRealtime = async () => {
  return transferenciasEspeciaisSyncStatus;
};

export const cancelarSincronizacaoTransferenciasEspeciaisRealtime = async () => {
  if (!syncEspeciaisRunning || transferenciasEspeciaisSyncStatus.status !== "running") {
    return {
      cancelled: false,
      message: "Nao ha sincronizacao de transferencias especiais em andamento."
    };
  }

  transferenciasEspeciaisSyncStatus = {
    ...transferenciasEspeciaisSyncStatus,
    cancel_requested: true,
    fase_atual: "Interrupcao solicitada",
    detalhe: "Solicitacao de interrupcao recebida. Encerrando...",
    atualizado_em: new Date().toISOString()
  };

  return {
    cancelled: true,
    message: "Interrupcao solicitada com sucesso."
  };
};
