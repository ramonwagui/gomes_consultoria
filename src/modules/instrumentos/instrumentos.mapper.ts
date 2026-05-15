import { InstrumentProposal } from "@prisma/client";

type InstrumentRepasseLike = {
  id: number;
  dataRepasse: Date;
  valorRepasse: { toString(): string } | number;
  createdAt: Date;
  updatedAt: Date;
};

type InstrumentWithRepassesLike = InstrumentProposal & {
  repasses?: InstrumentRepasseLike[];
};

const toDateOnly = (value: Date | null): string | null => {
  if (!value) {
    return null;
  }
  return value.toISOString().slice(0, 10);
};

export const mapInstrument = (item: InstrumentWithRepassesLike) => {
  const repasses = (item.repasses ?? []).map((repasse) => ({
    id: repasse.id,
    data_repasse: repasse.dataRepasse.toISOString().slice(0, 10),
    valor_repasse: Number(repasse.valorRepasse),
    created_at: repasse.createdAt.toISOString(),
    updated_at: repasse.updatedAt.toISOString()
  }));

  const valorJaRepassadoPorRepasses = repasses.reduce((acc, repasse) => acc + repasse.valor_repasse, 0);
  const valorJaRepassadoPersistido = Number(item.valorJaRepassado ?? 0);
  const valorJaRepassado = Math.max(valorJaRepassadoPorRepasses, valorJaRepassadoPersistido);
  const percentualRepassado = Number(item.valorRepasse) > 0 ? Math.min(100, (valorJaRepassado / Number(item.valorRepasse)) * 100) : 0;

  return {
    id: item.id,
    proposta: item.proposta,
    instrumento: item.instrumento,
    objeto: item.objeto,
    valor_repasse: Number(item.valorRepasse),
    valor_contrapartida: Number(item.valorContrapartida),
    valor_ja_repassado: valorJaRepassado,
    percentual_repassado: percentualRepassado,
    repasses,
    valor_total: Number(item.valorRepasse) + Number(item.valorContrapartida),
    data_cadastro: toDateOnly(item.dataCadastro),
    data_assinatura: toDateOnly(item.dataAssinatura),
    vigencia_inicio: toDateOnly(item.vigenciaInicio),
    vigencia_fim: toDateOnly(item.vigenciaFim),
    data_prestacao_contas: toDateOnly(item.dataPrestacaoContas),
    data_dou: toDateOnly(item.dataDou),
    concedente: item.concedente,
    banco: item.banco,
    agencia: item.agencia,
    conta: item.conta,
    fluxo_tipo: item.fluxoTipo,
    convenete_id: item.conveneteId,
    proponente_id: item.conveneteId,
    status: item.status,
    responsavel: item.responsavel,
    orgao_executor: item.orgaoExecutor,
    empresa_vencedora: item.empresaVencedora,
    cnpj_vencedora: item.cnpjVencedora,
    valor_vencedor: item.valorVencedor ? Number(item.valorVencedor) : null,
    observacoes: item.observacoes,
    ativo: item.ativo,
    created_at: item.createdAt.toISOString(),
    updated_at: item.updatedAt.toISOString(),
    percentual_fisico_medicao: item.percentualFisicoMedicao ? Number(item.percentualFisicoMedicao) : null,
    percentual_financeiro_medicao: item.percentualFinanceiroMedicao ? Number(item.percentualFinanceiroMedicao) : null,
    status_medicao: item.statusMedicao,
    data_ultima_atualizacao_medicao: item.dataUltimaAtualizacaoMedicao ? item.dataUltimaAtualizacaoMedicao.toISOString() : null
  };
};
