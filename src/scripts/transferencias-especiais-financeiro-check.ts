import assert from "assert";

import {
  consolidarPagamentoTransferenciaEspecial,
  type DocumentoHabilEspecialFinanceiroItem,
  type EmpenhoEspecialFinanceiroItem,
  type OrdemPagamentoEspecialFinanceiroItem
} from "../modules/transferencias-especiais/transferencias-especiais-financeiro";

const checkedAt = new Date("2026-05-12T12:00:00Z");

const empenho = (id: number, planoId = 1, valor = 100): EmpenhoEspecialFinanceiroItem => ({
  id_empenho: id,
  id_plano_acao: planoId,
  numero_empenho: `2026NE${String(id).padStart(6, "0")}`,
  valor_empenho: valor
});

const documento = (id: number, empenhoId: number, valor = 100, data = "2026-05-10"): DocumentoHabilEspecialFinanceiroItem => ({
  id_dh: id,
  id_empenho: empenhoId,
  numero_documento_habil: `2026TF${String(id).padStart(6, "0")}`,
  data_emissao_dh: data,
  valor_dh: valor,
  descricao_situacao_dh: "Enviado com Sucesso"
});

const ordem = (id: number, documentoId: number, dataOb = "2026-05-11"): OrdemPagamentoEspecialFinanceiroItem => ({
  id_op_ob: id,
  id_dh: documentoId,
  data_emissao_op: "2026-05-10",
  numero_ordem_pagamento: `2026OP${String(id).padStart(6, "0")}`,
  descricao_situacao_op: "OB Enviada à instituição bancária para pagamento",
  data_situacao_op: "2026-05-10",
  data_emissao_ob: dataOb,
  numero_ordem_bancaria: `2026OB${String(id).padStart(6, "0")}`
});

const semEmpenho = consolidarPagamentoTransferenciaEspecial([], [], [], checkedAt);
assert.equal(semEmpenho.pagoDetectado, false);
assert.equal(semEmpenho.quantidadeEmpenhos, 0);

const comEmpenhoSemDh = consolidarPagamentoTransferenciaEspecial([empenho(1)], [], [], checkedAt);
assert.equal(comEmpenhoSemDh.pagoDetectado, false);
assert.equal(comEmpenhoSemDh.quantidadeEmpenhos, 1);

const comDhSemOb = consolidarPagamentoTransferenciaEspecial([empenho(2)], [documento(10, 2, 150)], [], checkedAt);
assert.equal(comDhSemOb.pagoDetectado, true);
assert.equal(comDhSemOb.valorPagoDetectado, 150);
assert.equal(comDhSemOb.dataUltimoPagamento?.toISOString(), "2026-05-10T00:00:00.000Z");

const comDhComOb = consolidarPagamentoTransferenciaEspecial(
  [empenho(3)],
  [documento(11, 3, 200, "2026-05-09")],
  [ordem(21, 11, "2026-05-12")],
  checkedAt
);
assert.equal(comDhComOb.pagoDetectado, true);
assert.equal(comDhComOb.ordemBancariaPrincipal, "2026OB000021");
assert.equal(comDhComOb.dataUltimoPagamento?.toISOString(), "2026-05-12T00:00:00.000Z");

const multiplos = consolidarPagamentoTransferenciaEspecial(
  [empenho(4), empenho(5)],
  [documento(12, 4, 300, "2026-05-08"), documento(13, 5, 400, "2026-05-09")],
  [ordem(22, 12, "2026-05-10"), ordem(23, 13, "2026-05-13")],
  checkedAt
);
assert.equal(multiplos.pagoDetectado, true);
assert.equal(multiplos.quantidadeEmpenhos, 2);
assert.equal(multiplos.quantidadeDocumentosHabeis, 2);
assert.equal(multiplos.quantidadeOrdensPagamento, 2);
assert.equal(multiplos.valorPagoDetectado, 700);
assert.equal(multiplos.documentoHabilPrincipal, "2026TF000013");
assert.equal(multiplos.dataPrimeiroPagamento?.toISOString(), "2026-05-10T00:00:00.000Z");
assert.equal(multiplos.dataUltimoPagamento?.toISOString(), "2026-05-13T00:00:00.000Z");

console.log("Transferencias especiais financeiro check OK");
