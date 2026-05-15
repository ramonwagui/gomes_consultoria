export type EmpenhoEspecialFinanceiroItem = {
  id_empenho: number | null;
  id_plano_acao: number | null;
  numero_empenho: string | null;
  valor_empenho: number | null;
};

export type DocumentoHabilEspecialFinanceiroItem = {
  id_dh: number | null;
  id_empenho: number | null;
  numero_documento_habil: string | null;
  data_emissao_dh: string | null;
  valor_dh: number | null;
  descricao_situacao_dh: string | null;
};

export type OrdemPagamentoEspecialFinanceiroItem = {
  id_op_ob: number | null;
  id_dh: number | null;
  data_emissao_op: string | null;
  numero_ordem_pagamento: string | null;
  descricao_situacao_op: string | null;
  data_situacao_op: string | null;
  data_emissao_ob: string | null;
  numero_ordem_bancaria: string | null;
};

export type TransferenciaEspecialFinanceiroResumo = {
  pagoDetectado: boolean;
  dataPrimeiroPagamento: Date | null;
  dataUltimoPagamento: Date | null;
  valorPagoDetectado: number;
  quantidadeEmpenhos: number;
  quantidadeDocumentosHabeis: number;
  quantidadeOrdensPagamento: number;
  documentoHabilPrincipal: string | null;
  ordemPagamentoPrincipal: string | null;
  ordemBancariaPrincipal: string | null;
  situacaoPagamento: string | null;
  dataUltimaConsulta: Date;
  payloadResumo: {
    empenhos: Array<{
      id_empenho: number | null;
      numero_empenho: string | null;
      valor_empenho: number | null;
    }>;
    documentos_habeis: Array<{
      id_dh: number | null;
      id_empenho: number | null;
      numero_documento_habil: string | null;
      data_emissao_dh: string | null;
      valor_dh: number | null;
      descricao_situacao_dh: string | null;
    }>;
    ordens_pagamento: Array<{
      id_op_ob: number | null;
      id_dh: number | null;
      numero_ordem_pagamento: string | null;
      numero_ordem_bancaria: string | null;
      data_emissao_op: string | null;
      data_situacao_op: string | null;
      data_emissao_ob: string | null;
      descricao_situacao_op: string | null;
    }>;
  };
};

const toFiniteNumber = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const parseApiDate = (value: string | null | undefined): Date | null => {
  const raw = (value ?? "").trim();
  if (!raw) {
    return null;
  }
  const date = raw.includes("T") ? new Date(raw) : new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const pickOrderPaymentDate = (ordem: OrdemPagamentoEspecialFinanceiroItem) =>
  parseApiDate(ordem.data_emissao_ob) ??
  parseApiDate(ordem.data_situacao_op) ??
  parseApiDate(ordem.data_emissao_op);

const pickPaymentDate = (
  documento: DocumentoHabilEspecialFinanceiroItem,
  ordens: OrdemPagamentoEspecialFinanceiroItem[]
) => {
  const orderDates = ordens
    .map((ordem) => pickOrderPaymentDate(ordem))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime());

  return orderDates[0] ?? parseApiDate(documento.data_emissao_dh);
};

export const consolidarPagamentoTransferenciaEspecial = (
  empenhos: EmpenhoEspecialFinanceiroItem[],
  documentosHabeis: DocumentoHabilEspecialFinanceiroItem[],
  ordensPagamento: OrdemPagamentoEspecialFinanceiroItem[],
  dataUltimaConsulta = new Date()
): TransferenciaEspecialFinanceiroResumo => {
  const ordensByDocumento = new Map<number, OrdemPagamentoEspecialFinanceiroItem[]>();
  for (const ordem of ordensPagamento) {
    const idDh = Number(ordem.id_dh);
    if (!Number.isFinite(idDh)) {
      continue;
    }
    const current = ordensByDocumento.get(idDh) ?? [];
    current.push(ordem);
    ordensByDocumento.set(idDh, current);
  }

  const documentosComData = documentosHabeis.map((documento) => {
    const idDh = Number(documento.id_dh);
    const ordens = Number.isFinite(idDh) ? ordensByDocumento.get(idDh) ?? [] : [];
    return {
      documento,
      ordens,
      dataPagamento: pickPaymentDate(documento, ordens)
    };
  });

  const datasPagamento = documentosComData
    .map((item) => item.dataPagamento)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());

  const principal = [...documentosComData].sort((a, b) => {
    const aTime = a.dataPagamento?.getTime() ?? 0;
    const bTime = b.dataPagamento?.getTime() ?? 0;
    return bTime - aTime;
  })[0];
  const ordemPrincipal = principal?.ordens
    .filter((ordem) => ordem.numero_ordem_pagamento || ordem.numero_ordem_bancaria)
    .sort((a, b) => (pickOrderPaymentDate(b)?.getTime() ?? 0) - (pickOrderPaymentDate(a)?.getTime() ?? 0))[0];

  const valorPagoDetectado = documentosHabeis.reduce((acc, doc) => acc + toFiniteNumber(doc.valor_dh), 0);
  const pagoDetectado = documentosHabeis.length > 0;

  return {
    pagoDetectado,
    dataPrimeiroPagamento: datasPagamento[0] ?? null,
    dataUltimoPagamento: datasPagamento[datasPagamento.length - 1] ?? null,
    valorPagoDetectado,
    quantidadeEmpenhos: empenhos.length,
    quantidadeDocumentosHabeis: documentosHabeis.length,
    quantidadeOrdensPagamento: ordensPagamento.length,
    documentoHabilPrincipal: principal?.documento.numero_documento_habil ?? null,
    ordemPagamentoPrincipal: ordemPrincipal?.numero_ordem_pagamento ?? null,
    ordemBancariaPrincipal: ordemPrincipal?.numero_ordem_bancaria ?? null,
    situacaoPagamento: pagoDetectado ? "Paga / Em conta" : "Nao identificado",
    dataUltimaConsulta,
    payloadResumo: {
      empenhos: empenhos.map((item) => ({
        id_empenho: item.id_empenho,
        numero_empenho: item.numero_empenho,
        valor_empenho: item.valor_empenho
      })),
      documentos_habeis: documentosHabeis.map((item) => ({
        id_dh: item.id_dh,
        id_empenho: item.id_empenho,
        numero_documento_habil: item.numero_documento_habil,
        data_emissao_dh: item.data_emissao_dh,
        valor_dh: item.valor_dh,
        descricao_situacao_dh: item.descricao_situacao_dh
      })),
      ordens_pagamento: ordensPagamento.map((item) => ({
        id_op_ob: item.id_op_ob,
        id_dh: item.id_dh,
        numero_ordem_pagamento: item.numero_ordem_pagamento,
        numero_ordem_bancaria: item.numero_ordem_bancaria,
        data_emissao_op: item.data_emissao_op,
        data_situacao_op: item.data_situacao_op,
        data_emissao_ob: item.data_emissao_ob,
        descricao_situacao_op: item.descricao_situacao_op
      }))
    }
  };
};
