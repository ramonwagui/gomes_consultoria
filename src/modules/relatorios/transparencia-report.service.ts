import { prisma } from "../../lib/prisma";
import { TransparenciaReportQueryInput } from "./relatorios.schema";
import { scrapeConvenioComEmendas, scrapeDocumentosPagamentoPorConvenio } from "./transparencia-scraper.service";

type TransparenciaConvenioItem = {
  id: number | null;
  numero_convenio: string | null;
  numero_processo: string | null;
  situacao: string | null;
  objeto: string | null;
  orgao: string | null;
  tipo_instrumento: string | null;
  convenente: string | null;
  cnpj_convenente: string | null;
  municipio: string | null;
  uf: string | null;
  valor_global: number | null;
  valor_liberado: number | null;
  data_inicio_vigencia: string | null;
  data_fim_vigencia: string | null;
  area_atuacao_funcao: string | null;
  subfuncao: string | null;
  programa: string | null;
  acao: string | null;
  plano_orcamentario_po: string | null;
  emendas_vinculadas: number;
};

type TransparenciaEmendaItem = {
  codigo_emenda: string | null;
  numero_emenda: string | null;
  ano: number | null;
  tipo_emenda: string | null;
  autor: string | null;
  numero_processo: string | null;
  valor_empenhado: number;
  valor_liquidado: number;
  valor_pago: number;
  area_atuacao_funcao: string | null;
  subfuncao: string | null;
  programa: string | null;
  acao: string | null;
  plano_orcamentario_po: string | null;
  convenios_vinculados: string[];
};

type TransparenciaDocumentoPagamentoEmpenhoItem = {
  empenho: string | null;
  subitem: string | null;
  valor_pago: number;
  valor_resto_inscrito: number;
  valor_resto_cancelado: number;
  valor_resto_pago: number;
};

type TransparenciaDocumentoPagamentoItem = {
  convenio_id: number | null;
  convenio_numero: string | null;
  codigo_documento: string | null;
  numero_documento: string | null;
  data: string | null;
  descricao: string | null;
  fase: string | null;
  tipo_documento: string | null;
  valor_documento: number;
  observacao_documento: string | null;
  favorecido_cnpj: string | null;
  favorecido_nome: string | null;
  orgao_superior_codigo: string | null;
  orgao_superior_nome: string | null;
  orgao_vinculado_codigo: string | null;
  orgao_vinculado_nome: string | null;
  unidade_gestora_codigo: string | null;
  unidade_gestora_nome: string | null;
  gestao_codigo: string | null;
  gestao_nome: string | null;
  processo: string | null;
  empenhos: TransparenciaDocumentoPagamentoEmpenhoItem[];
};

type LocalCandidateRow = {
  nr_convenio: string | null;
  link_acesso_livre: string | null;
  nome_proponente: string | null;
};

const TRANSFERENCIAS_DISCRICIONARIAS_TABLE = "transferencias_discricionarias";

const normalizeTextOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text === "" ? null : text;
};

const normalizeDigits = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");

const sanitizeConvenioIdentifiers = (value: string | null | undefined) => {
  const raw = normalizeTextOrNull(value);
  if (!raw) {
    return [];
  }
  const set = new Set<string>();
  set.add(raw);

  const beforeSlash = raw.split("/")[0]?.trim() ?? "";
  if (/^\d{4,}$/.test(beforeSlash)) {
    set.add(beforeSlash);
  }

  const digits = raw.replace(/\D/g, "");
  if (/^\d{4,}$/.test(digits)) {
    set.add(digits);
  }

  return Array.from(set);
};

const isIgnorableNotFoundError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /(?:\b404\b|nao encontrado|n[aã]o encontrado|par[aâ]metro inv[aá]lido)/i.test(message);
};

const toConvenioKey = (item: TransparenciaConvenioItem) => {
  const id = item.id !== null ? String(item.id) : "";
  if (id !== "") {
    return `id:${id}`;
  }
  const numeroDigits = normalizeDigits(item.numero_convenio);
  if (numeroDigits !== "") {
    return `numero:${numeroDigits}`;
  }
  const numeroText = normalizeTextOrNull(item.numero_convenio);
  if (numeroText) {
    return `numero_txt:${numeroText.toLowerCase()}`;
  }
  const processoDigits = normalizeDigits(item.numero_processo);
  if (processoDigits !== "") {
    return `processo:${processoDigits}`;
  }
  const processoText = normalizeTextOrNull(item.numero_processo);
  if (processoText) {
    return `processo_txt:${processoText.toLowerCase()}`;
  }
  const fallback = [
    normalizeTextOrNull(item.convenente) ?? "",
    normalizeTextOrNull(item.objeto) ?? "",
    normalizeTextOrNull(item.situacao) ?? "",
    normalizeTextOrNull(item.municipio) ?? "",
    normalizeTextOrNull(item.uf) ?? ""
  ].join("|");
  return `fallback:${fallback}`;
};

const toConvenioReference = (item: TransparenciaConvenioItem) => {
  if (item.id !== null) {
    return `id:${item.id}`;
  }
  const numero = normalizeDigits(item.numero_convenio);
  if (numero) {
    return `num:${numero}`;
  }
  return item.numero_processo ?? "sem-convenio";
};

const mergeConvenio = (current: TransparenciaConvenioItem, incoming: TransparenciaConvenioItem): TransparenciaConvenioItem => ({
  id: incoming.id ?? current.id,
  numero_convenio: incoming.numero_convenio ?? current.numero_convenio,
  numero_processo: incoming.numero_processo ?? current.numero_processo,
  situacao: incoming.situacao ?? current.situacao,
  objeto: incoming.objeto ?? current.objeto,
  orgao: incoming.orgao ?? current.orgao,
  tipo_instrumento: incoming.tipo_instrumento ?? current.tipo_instrumento,
  convenente: incoming.convenente ?? current.convenente,
  cnpj_convenente: incoming.cnpj_convenente ?? current.cnpj_convenente,
  municipio: incoming.municipio ?? current.municipio,
  uf: incoming.uf ?? current.uf,
  valor_global: incoming.valor_global ?? current.valor_global,
  valor_liberado: incoming.valor_liberado ?? current.valor_liberado,
  data_inicio_vigencia: incoming.data_inicio_vigencia ?? current.data_inicio_vigencia,
  data_fim_vigencia: incoming.data_fim_vigencia ?? current.data_fim_vigencia,
  area_atuacao_funcao: incoming.area_atuacao_funcao ?? current.area_atuacao_funcao,
  subfuncao: incoming.subfuncao ?? current.subfuncao,
  programa: incoming.programa ?? current.programa,
  acao: incoming.acao ?? current.acao,
  plano_orcamentario_po: incoming.plano_orcamentario_po ?? current.plano_orcamentario_po,
  emendas_vinculadas: Math.max(current.emendas_vinculadas, incoming.emendas_vinculadas)
});

const loadLocalRows = async (cnpj: string, ano?: number) => {
  const baseLimit = 300;
  const byAno = ano
    ? await prisma.$queryRawUnsafe<LocalCandidateRow[]>(
        `
          SELECT DISTINCT nr_convenio, link_acesso_livre, nome_proponente
          FROM ${TRANSFERENCIAS_DISCRICIONARIAS_TABLE}
          WHERE REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(cnpj, ''), '.', ''), '/', ''), '-', ''), ' ', '') = $1
            AND ano_referencia = $2
          LIMIT ${baseLimit}
        `,
        cnpj,
        ano
      )
    : [];

  const allRows = await prisma.$queryRawUnsafe<LocalCandidateRow[]>(
    `
      SELECT DISTINCT nr_convenio, link_acesso_livre, nome_proponente
      FROM ${TRANSFERENCIAS_DISCRICIONARIAS_TABLE}
      WHERE REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(cnpj, ''), '.', ''), '/', ''), '-', ''), ' ', '') = $1
      LIMIT ${baseLimit}
    `,
    cnpj
  );

  const merged: LocalCandidateRow[] = [];
  const seen = new Set<string>();
  for (const row of [...byAno, ...allRows]) {
    const key = `${normalizeTextOrNull(row.nr_convenio) ?? ""}|${normalizeTextOrNull(row.link_acesso_livre) ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(row);
    }
  }
  return merged;
};

const getConvenenteNomeHint = async (cnpj: string, rows: LocalCandidateRow[]) => {
  const convenetes = await prisma.convenete.findMany({
    select: { nome: true, cnpj: true }
  });

  const fromCadastro =
    convenetes.find((item) => normalizeDigits(item.cnpj) === cnpj)?.nome?.trim() ?? "";
  if (fromCadastro) {
    return fromCadastro;
  }

  for (const row of rows) {
    const nome = normalizeTextOrNull(row.nome_proponente);
    if (nome) {
      return nome;
    }
  }

  return "";
};

export const buildTransparenciaReportFromScraping = async (query: TransparenciaReportQueryInput) => {
  const diagnostico = {
    convenente_nome_hint: "",
    convenios_api_cnpj: 0,
    convenios_fallback_local_numero: 0,
    convenios_fallback_local_id: 0,
    processos_extraidos: 0,
    emendas_total_bruto: 0,
    convenios_nao_encontrados: 0,
    scraping_tentativas: 0,
    scraping_sucessos: 0,
    fontes_usadas: [] as string[],
    warnings: [] as string[]
  };

  const localRows = await loadLocalRows(query.cnpj, query.ano);
  diagnostico.convenente_nome_hint = await getConvenenteNomeHint(query.cnpj, localRows);
  if (localRows.length > 0) {
    diagnostico.fontes_usadas.push("base_local_identificadores");
  }

  const idCandidates: string[] = [];
  const numeroCandidates: string[] = [];
  const seenIds = new Set<string>();
  const seenNumeros = new Set<string>();

  for (const row of localRows) {
    const idFromLink = /\/convenios\/(\d+)/.exec(row.link_acesso_livre ?? "")?.[1] ?? "";
    if (idFromLink && !seenIds.has(idFromLink)) {
      seenIds.add(idFromLink);
      idCandidates.push(idFromLink);
    }

    for (const candidate of sanitizeConvenioIdentifiers(row.nr_convenio)) {
      if (!seenNumeros.has(candidate)) {
        seenNumeros.add(candidate);
        numeroCandidates.push(candidate);
      }
    }
  }

  if (idCandidates.length === 0 && numeroCandidates.length === 0) {
    diagnostico.warnings.push("Nenhum convenio identificado na base local para o CNPJ informado.");
  }

  const convenioBuckets = new Map<string, TransparenciaConvenioItem>();
  const emendaBuckets = new Map<string, TransparenciaEmendaItem>();
  const documentosPagamento: TransparenciaDocumentoPagamentoItem[] = [];
  const documentosPagamentoSeen = new Set<string>();
  const emendaKeysByConvenio = new Map<string, Set<string>>();
  const emendasPorProcesso = new Map<string, Set<string>>();
  const emendasDiretasPorConvenio = new Map<string, Set<string>>();

  const addConvenio = (item: TransparenciaConvenioItem) => {
    const key = toConvenioKey(item);
    const current = convenioBuckets.get(key);
    convenioBuckets.set(key, current ? mergeConvenio(current, item) : item);
    return key;
  };

  const addEmenda = (item: TransparenciaEmendaItem, convenioKey: string) => {
    const key = `${item.numero_processo ?? "sem-processo"}|${item.codigo_emenda ?? "sem-codigo"}|${
      item.numero_emenda ?? "sem-numero"
    }|${item.ano ?? "sem-ano"}|${item.autor ?? "sem-autor"}|${item.tipo_emenda ?? "sem-tipo"}`;

    if (!emendaBuckets.has(key)) {
      emendaBuckets.set(key, {
        ...item,
        convenios_vinculados: []
      });
    } else {
      const current = emendaBuckets.get(key)!;
      emendaBuckets.set(key, {
        ...current,
        area_atuacao_funcao: current.area_atuacao_funcao ?? item.area_atuacao_funcao,
        subfuncao: current.subfuncao ?? item.subfuncao,
        programa: current.programa ?? item.programa,
        acao: current.acao ?? item.acao,
        plano_orcamentario_po: current.plano_orcamentario_po ?? item.plano_orcamentario_po
      });
    }

    const byConvenio = emendasDiretasPorConvenio.get(convenioKey) ?? new Set<string>();
    byConvenio.add(key);
    emendasDiretasPorConvenio.set(convenioKey, byConvenio);

    if (item.numero_processo) {
      const byProcesso = emendasPorProcesso.get(item.numero_processo) ?? new Set<string>();
      byProcesso.add(key);
      emendasPorProcesso.set(item.numero_processo, byProcesso);
    }
  };

  const maxTentativas = Math.max(query.max_processos * 6, 120);
  const scrapeQueue: Array<{ identificador: string; origem: "id" | "numero" }> = [
    ...idCandidates.map((id) => ({ identificador: id, origem: "id" as const })),
    ...numeroCandidates.map((numero) => ({ identificador: numero, origem: "numero" as const }))
  ];

  let attempts = 0;
  for (const candidate of scrapeQueue) {
    if (attempts >= maxTentativas) {
      diagnostico.warnings.push(`Limite de tentativas de scraping atingido (${maxTentativas}).`);
      break;
    }

    attempts += 1;
    diagnostico.scraping_tentativas += 1;

    try {
      const scraped = await scrapeConvenioComEmendas(candidate.identificador, candidate.origem);
      const convenio = {
        ...scraped.convenio,
        emendas_vinculadas: 0
      };

      const convenioCnpjDigits = normalizeDigits(convenio.cnpj_convenente);
      if (convenioCnpjDigits && convenioCnpjDigits !== query.cnpj) {
        diagnostico.warnings.push(
          `Convenio ${convenio.numero_convenio ?? candidate.identificador} ignorado por CNPJ divergente (${convenio.cnpj_convenente}).`
        );
        continue;
      }

      const convenioKey = addConvenio(convenio);
      diagnostico.scraping_sucessos += 1;
      if (candidate.origem === "id") {
        diagnostico.convenios_fallback_local_id += 1;
      } else {
        diagnostico.convenios_fallback_local_numero += 1;
      }

      for (const emenda of scraped.emendas) {
        diagnostico.emendas_total_bruto += 1;
        if (query.ano && emenda.ano !== query.ano) {
          continue;
        }
        addEmenda(
          {
            ...emenda,
            convenios_vinculados: []
          },
          convenioKey
        );
      }

      if (convenio.id !== null) {
        try {
          const docs = await scrapeDocumentosPagamentoPorConvenio(convenio.id, convenio.numero_convenio, 200);
          for (const doc of docs) {
            const key = doc.codigo_documento ?? doc.numero_documento ?? "";
            if (key && !documentosPagamentoSeen.has(key)) {
              documentosPagamentoSeen.add(key);
              documentosPagamento.push(doc);
            }
          }
        } catch (error) {
          if (!isIgnorableNotFoundError(error)) {
            diagnostico.warnings.push(
              error instanceof Error
                ? `Scraping documentos convenio ${convenio.id}: ${error.message}`
                : `Scraping documentos convenio ${convenio.id}: erro`
            );
          }
        }
      }
    } catch (error) {
      if (isIgnorableNotFoundError(error)) {
        diagnostico.convenios_nao_encontrados += 1;
        continue;
      }
      diagnostico.warnings.push(
        error instanceof Error
          ? `Scraping convenio ${candidate.origem} ${candidate.identificador}: ${error.message}`
          : `Scraping convenio ${candidate.origem} ${candidate.identificador}: erro`
      );
    }
  }

  diagnostico.warnings = Array.from(new Set(diagnostico.warnings)).slice(0, 12);

  if (diagnostico.scraping_sucessos > 0) {
    diagnostico.fontes_usadas.push("scraping_portal_detalhe_convenio");
  }
  if (diagnostico.emendas_total_bruto > 0) {
    diagnostico.fontes_usadas.push("scraping_portal_emendas_convenio");
  }
  if (documentosPagamento.length > 0) {
    diagnostico.fontes_usadas.push("scraping_portal_documentos_pagamento");
  }

  const conveniosBase = Array.from(convenioBuckets.values());

  for (const convenio of conveniosBase) {
    const convenioKey = toConvenioKey(convenio);
    const keys = new Set<string>();

    if (convenio.numero_processo) {
      for (const emendaKey of emendasPorProcesso.get(convenio.numero_processo) ?? []) {
        keys.add(emendaKey);
      }
    }

    for (const emendaKey of emendasDiretasPorConvenio.get(convenioKey) ?? []) {
      keys.add(emendaKey);
    }
    emendaKeysByConvenio.set(convenioKey, keys);

    let areaAtuacaoFuncao: string | null = null;
    let subfuncao: string | null = null;
    let programa: string | null = null;
    let acao: string | null = null;
    let planoOrcamentarioPo: string | null = null;

    for (const key of keys) {
      const emenda = emendaBuckets.get(key);
      if (!emenda) {
        continue;
      }
      areaAtuacaoFuncao = areaAtuacaoFuncao ?? emenda.area_atuacao_funcao;
      subfuncao = subfuncao ?? emenda.subfuncao;
      programa = programa ?? emenda.programa;
      acao = acao ?? emenda.acao;
      planoOrcamentarioPo = planoOrcamentarioPo ?? emenda.plano_orcamentario_po;
      if (areaAtuacaoFuncao && subfuncao && programa && acao && planoOrcamentarioPo) {
        break;
      }
    }

    convenio.area_atuacao_funcao = convenio.area_atuacao_funcao ?? areaAtuacaoFuncao;
    convenio.subfuncao = convenio.subfuncao ?? subfuncao;
    convenio.programa = convenio.programa ?? programa;
    convenio.acao = convenio.acao ?? acao;
    convenio.plano_orcamentario_po = convenio.plano_orcamentario_po ?? planoOrcamentarioPo;

    convenio.emendas_vinculadas = keys.size;

    const referenciaConvenio = toConvenioReference(convenio);
    for (const key of keys) {
      const emenda = emendaBuckets.get(key);
      if (!emenda) {
        continue;
      }
      if (!emenda.convenios_vinculados.includes(referenciaConvenio)) {
        emenda.convenios_vinculados.push(referenciaConvenio);
      }
    }
  }

  let convenios = conveniosBase;
  let documentosPagamentoFiltrados = documentosPagamento;
  let emendas = Array.from(emendaBuckets.values());

  if (query.ano) {
    const hasDocumentoComRecurso = (convenio: TransparenciaConvenioItem) =>
      documentosPagamento.some((doc) => {
        const byId = convenio.id !== null && doc.convenio_id === convenio.id;
        const byNumero =
          (doc.convenio_numero ?? "").replace(/\D/g, "") !== "" &&
          (convenio.numero_convenio ?? "").replace(/\D/g, "") !== "" &&
          (doc.convenio_numero ?? "").replace(/\D/g, "") === (convenio.numero_convenio ?? "").replace(/\D/g, "");
        return (byId || byNumero) && doc.valor_documento > 0;
      });

    const hasEmendaComRecurso = (convenio: TransparenciaConvenioItem) => {
      const key = toConvenioKey(convenio);
      const emendaKeys = emendaKeysByConvenio.get(key) ?? new Set<string>();
      for (const emendaKey of emendaKeys) {
        const emenda = emendaBuckets.get(emendaKey);
        if (!emenda) {
          continue;
        }
        if (emenda.valor_pago > 0 || emenda.valor_liquidado > 0 || emenda.valor_empenhado > 0) {
          return true;
        }
      }
      return false;
    };

    convenios = convenios.filter(
      (item) => (item.valor_liberado ?? 0) > 0 || hasDocumentoComRecurso(item) || hasEmendaComRecurso(item)
    );

    const allowedReferences = new Set(convenios.map((item) => toConvenioReference(item)));
    emendas = emendas
      .map((item) => ({
        ...item,
        convenios_vinculados: item.convenios_vinculados.filter((ref) => allowedReferences.has(ref))
      }))
      .filter((item) => item.convenios_vinculados.length > 0);

    documentosPagamentoFiltrados = documentosPagamento.filter((doc) => {
      if (doc.convenio_id !== null) {
        return convenios.some((conv) => conv.id === doc.convenio_id);
      }
      const docNumero = (doc.convenio_numero ?? "").replace(/\D/g, "");
      if (!docNumero) {
        return false;
      }
      return convenios.some((conv) => (conv.numero_convenio ?? "").replace(/\D/g, "") === docNumero);
    });
  }

  documentosPagamentoFiltrados = documentosPagamentoFiltrados.filter((doc) => {
    if (doc.convenio_id !== null) {
      return convenios.some((conv) => conv.id === doc.convenio_id);
    }
    const docNumero = (doc.convenio_numero ?? "").replace(/\D/g, "");
    if (!docNumero) {
      return false;
    }
    return convenios.some((conv) => (conv.numero_convenio ?? "").replace(/\D/g, "") === docNumero);
  });

  documentosPagamentoFiltrados = documentosPagamentoFiltrados.filter(
    (doc) =>
      doc.valor_documento > 0 ||
      (doc.empenhos ?? []).some((emp) => emp.valor_pago > 0 || emp.valor_resto_pago > 0 || emp.valor_resto_inscrito > 0)
  );

  // Regra final: usar documentos com pagamento como fonte de verdade
  // para manter somente convênios e emendas vinculados a pagamentos.
  const referenciasComPagamento = new Set<string>();
  for (const doc of documentosPagamentoFiltrados) {
    const numero = normalizeDigits(doc.convenio_numero);
    const referencia = doc.convenio_id !== null ? `id:${doc.convenio_id}` : numero ? `num:${numero}` : "";
    if (referencia) {
      referenciasComPagamento.add(referencia);
    }
  }

  convenios = convenios.filter((convenio) => referenciasComPagamento.has(toConvenioReference(convenio)));

  const referenciasConveniosFiltrados = new Set(convenios.map((item) => toConvenioReference(item)));
  emendas = emendas
    .map((item) => ({
      ...item,
      convenios_vinculados: item.convenios_vinculados.filter((ref) => referenciasConveniosFiltrados.has(ref))
    }))
    .filter((item) => item.convenios_vinculados.length > 0);

  for (const convenio of convenios) {
    const referencia = toConvenioReference(convenio);
    convenio.emendas_vinculadas = emendas.filter((item) => item.convenios_vinculados.includes(referencia)).length;
  }

  const processos = Array.from(
    new Set(convenios.map((item) => item.numero_processo).filter((value): value is string => Boolean(value)))
  ).slice(0, query.max_processos);
  diagnostico.processos_extraidos = processos.length;

  if (query.ano_pagamento) {
    documentosPagamentoFiltrados = documentosPagamentoFiltrados.filter((doc) => {
      if (!doc.data) {
        return false;
      }
      const year = Number(doc.data.slice(0, 4));
      return Number.isFinite(year) && year === query.ano_pagamento;
    });

    const referenciasComPagamentoNoAno = new Set<string>();
    for (const doc of documentosPagamentoFiltrados) {
      const numero = normalizeDigits(doc.convenio_numero);
      const referencia = doc.convenio_id !== null ? `id:${doc.convenio_id}` : numero ? `num:${numero}` : "";
      if (referencia) {
        referenciasComPagamentoNoAno.add(referencia);
      }
    }

    convenios = convenios.filter((convenio) => referenciasComPagamentoNoAno.has(toConvenioReference(convenio)));

    const referenciasConveniosNoAno = new Set(convenios.map((item) => toConvenioReference(item)));
    emendas = emendas
      .map((item) => ({
        ...item,
        convenios_vinculados: item.convenios_vinculados.filter((ref) => referenciasConveniosNoAno.has(ref))
      }))
      .filter((item) => item.convenios_vinculados.length > 0);
  }

  documentosPagamentoFiltrados = documentosPagamentoFiltrados.filter((doc) => {
    if (doc.convenio_id !== null) {
      return convenios.some((conv) => conv.id === doc.convenio_id);
    }
    const docNumero = normalizeDigits(doc.convenio_numero);
    if (!docNumero) {
      return false;
    }
    return convenios.some((conv) => normalizeDigits(conv.numero_convenio) === docNumero);
  });

  const resumoTipoMap = new Map<string, { quantidade: number; valor_empenhado: number; valor_pago: number }>();
  for (const item of emendas) {
    const tipo = item.tipo_emenda ?? "Nao informado";
    const current = resumoTipoMap.get(tipo) ?? { quantidade: 0, valor_empenhado: 0, valor_pago: 0 };
    current.quantidade += 1;
    current.valor_empenhado += item.valor_empenhado;
    current.valor_pago += item.valor_pago;
    resumoTipoMap.set(tipo, current);
  }

  const valorGlobalConvenios = convenios.reduce((acc, item) => acc + (item.valor_global ?? 0), 0);
  const valorLiberadoConvenios = convenios.reduce((acc, item) => acc + (item.valor_liberado ?? 0), 0);
  const valorEmpenhadoTotal = emendas.reduce((acc, item) => acc + item.valor_empenhado, 0);
  const valorLiquidadoTotal = emendas.reduce((acc, item) => acc + item.valor_liquidado, 0);
  const valorPagoTotal = emendas.reduce((acc, item) => acc + item.valor_pago, 0);

  return {
    filtros: {
      cnpj: query.cnpj,
      ano: query.ano ?? null,
      ano_pagamento: query.ano_pagamento ?? null,
      max_paginas_convenios: query.max_paginas_convenios,
      max_processos: query.max_processos
    },
    kpis: {
      convenios_encontrados: convenios.length,
      processos_unicos: processos.length,
      emendas_encontradas: emendas.length,
      valor_global_convenios: valorGlobalConvenios,
      valor_liberado_convenios: valorLiberadoConvenios,
      valor_empenhado_total: valorEmpenhadoTotal,
      valor_liquidado_total: valorLiquidadoTotal,
      valor_pago_total: valorPagoTotal
    },
    convenios: convenios.sort((a, b) => (a.numero_convenio ?? "").localeCompare(b.numero_convenio ?? "", "pt-BR")),
    emendas: emendas.sort((a, b) => {
      const anoA = a.ano ?? 0;
      const anoB = b.ano ?? 0;
      if (anoA !== anoB) {
        return anoB - anoA;
      }
      return (a.numero_emenda ?? "").localeCompare(b.numero_emenda ?? "", "pt-BR");
    }),
    resumo_por_tipo_emenda: Array.from(resumoTipoMap.entries())
      .map(([tipo_emenda, resumo]) => ({
        tipo_emenda,
        quantidade: resumo.quantidade,
        valor_empenhado: resumo.valor_empenhado,
        valor_pago: resumo.valor_pago
      }))
      .sort((a, b) => b.valor_empenhado - a.valor_empenhado),
    documentos_pagamento: documentosPagamentoFiltrados.sort((a, b) => {
      const da = a.data ?? "";
      const db = b.data ?? "";
      return db.localeCompare(da);
    }),
    diagnostico
  };
};
