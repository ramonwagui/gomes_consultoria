import { prisma } from "../../lib/prisma";
import {
  createSystemInstrumentUpdateAuditLog,
  snapshotInstrumentForAudit
} from "../auditoria/auditoria.service";
import { 
  downloadCsvBytesFromZipWithRetry, 
  detectCsvEncoding, 
  processCsvBytesByLine, 
  splitCsvLine 
} from "./transferencias-discricionarias.service";

/**
 * Sincroniza dados de medições e andamento de obras do Transferegov.
 * Agora reconstrói o histórico completo usando o arquivo de pagamentos.
 */
export const sincronizarObrasTransferegov = async () => {
  console.log("Iniciando sincronização de obras e medições...");

  // 1. Carregar instrumentos ativos no banco para filtrar a importação
  const instrumentosAtivos = await prisma.instrumentProposal.findMany({
    where: { ativo: true },
    select: { 
      id: true, 
      instrumento: true, 
      proposta: true, 
      valorRepasse: true, 
      valorContrapartida: true 
    }
  });

  const mapInstrumentoPorNumero = new Map(instrumentosAtivos.map(i => [i.instrumento, i]));
  const mapInstrumentoPorProposta = new Map(instrumentosAtivos.map(i => [i.proposta, i]));
  
  console.log(`Filtrando por ${instrumentosAtivos.length} instrumentos ativos.`);

  // 1.5. Criar mapeamento de ID_PROPOSTA (numeric) -> NR_CONVENIO (display)
  const mapIdPropostaParaNumeroConvenio = new Map<string, string>();
  try {
    console.log("Baixando mapeamento de convênios...");
    const convenioFile = "siconv_convenio.csv.zip";
    const csvBytes = await downloadCsvBytesFromZipWithRetry(convenioFile);
    const encoding = detectCsvEncoding(csvBytes);

    let headerIndexMap: Map<string, number> | null = null;
    await processCsvBytesByLine(csvBytes, encoding, (line, lineIndex) => {
      if (lineIndex === 0) {
        const headerCells = splitCsvLine(line.replace(/^(?:\uFEFF|ï»¿)/, ""));
        headerIndexMap = new Map(headerCells.map((col, idx) => [col.trim(), idx]));
        return;
      }
      if (!headerIndexMap) return;
      const cells = splitCsvLine(line);
      const idProposta = cells[headerIndexMap.get("ID_PROPOSTA") ?? -1];
      const nrConvenio = cells[headerIndexMap.get("NR_CONVENIO") ?? -1];
      if (idProposta && nrConvenio) {
        mapIdPropostaParaNumeroConvenio.set(idProposta.trim(), nrConvenio.trim());
      }
    });
    console.log(`Mapeamento concluído: ${mapIdPropostaParaNumeroConvenio.size} convênios mapeados.`);
  } catch (err: any) {
    console.error("Erro ao criar mapeamento de convênios:", err.message);
  }

  let mediçõesProcessadas = 0;
  let andamentosProcessados = 0;

  // 2. Processar Andamento Físico Consolidado
  try {
    const resumoFile = "siconv_resumo_fisico_financeiro.zip";
    const csvBytes = await downloadCsvBytesFromZipWithRetry(resumoFile);
    const encoding = detectCsvEncoding(csvBytes);

    let headerIndexMap: Map<string, number> | null = null;

    await processCsvBytesByLine(csvBytes, encoding, async (line, lineIndex) => {
      if (lineIndex === 0) {
        const headerCells = splitCsvLine(line.replace(/^(?:\uFEFF|ï»¿)/, ""));
        headerIndexMap = new Map(headerCells.map((col, idx) => [col.trim(), idx]));
        return;
      }

      if (!headerIndexMap) return;
      const cells = splitCsvLine(line);
      const getCell = (col: string) => cells[headerIndexMap!.get(col) ?? -1] ?? "";

      const idPropostaGov = getCell("ID_PROPOSTA").trim();
      const nrConvenioGov = mapIdPropostaParaNumeroConvenio.get(idPropostaGov);
      
      const instr = mapInstrumentoPorNumero.get(nrConvenioGov || "") || mapInstrumentoPorProposta.get(idPropostaGov);

      if (instr) {
        const percentualFisico = parseFloat(getCell("PERCENTUAL_EXECUCAO_RESUMO_FISICO_FINANCEIRO").replace(",", "."));
        const valorRealizado = parseFloat(getCell("VALOR_REALIZADO_RESUMO_FISICO_FINANCEIRO").replace(",", "."));

        if (!isNaN(percentualFisico)) {
          await prisma.instrumentWorkProgress.upsert({
            where: { instrumentId: instr.id },
            create: {
              instrumentId: instr.id,
              percentualObra: percentualFisico
            },
            update: {
              percentualObra: percentualFisico
            }
          });

          const beforeSnapshot = snapshotInstrumentForAudit(
            await prisma.instrumentProposal.findUnique({
              where: { id: instr.id },
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
            where: { id: instr.id },
            data: {
              percentualFisicoMedicao: percentualFisico,
              percentualFinanceiroMedicao: isNaN(valorRealizado) ? undefined : valorRealizado,
              dataUltimaAtualizacaoMedicao: new Date()
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
            instrumentId: instr.id,
            source: "SYNC_OBRAS_TRANSFEREGOV",
            beforeData: beforeSnapshot,
            afterData: snapshotInstrumentForAudit(updated)
          });

          andamentosProcessados++;
        }
      }
    });
    console.log(`Processados ${andamentosProcessados} andamentos de obras.`);
  } catch (error: any) {
    console.error("Erro ao processar resumo físico-financeiro:", error.message);
  }

  // 3. Processar Histórico Completo via Pagamentos
  // Este arquivo contém cada pagamento feito à empresa, que corresponde a uma medição.
  try {
    console.log("Processando histórico de medições via pagamentos...");
    const pagamentoFile = "siconv_pagamento.csv.zip";
    const csvBytes = await downloadCsvBytesFromZipWithRetry(pagamentoFile);
    const encoding = detectCsvEncoding(csvBytes);

    let headerIndexMap: Map<string, number> | null = null;

    // Carregar medições existentes para evitar duplicatas (chave: instrumentId|data|valor)
    const medicoesExistentes = await prisma.instrumentMeasurementBulletin.findMany({
      select: { instrumentId: true, dataBoletim: true, valorMedicao: true }
    });
    const setExistentes = new Set(medicoesExistentes.map(m => 
      `${m.instrumentId}|${m.dataBoletim.toISOString().slice(0, 10)}|${Number(m.valorMedicao).toFixed(2)}`
    ));

    await processCsvBytesByLine(csvBytes, encoding, async (line, lineIndex) => {
      if (lineIndex === 0) {
        const headerCells = splitCsvLine(line.replace(/^(?:\uFEFF|ï»¿)/, ""));
        headerIndexMap = new Map(headerCells.map((col, idx) => [col.trim(), idx]));
        return;
      }

      if (!headerIndexMap) return;
      const cells = splitCsvLine(line);
      const getCell = (col: string) => cells[headerIndexMap!.get(col) ?? -1] ?? "";

      const nrConvenio = getCell("NR_CONVENIO").trim();
      const instr = mapInstrumentoPorNumero.get(nrConvenio);

      if (instr) {
        const valorPago = parseFloat(getCell("VL_PAGO").replace(",", "."));
        const dataPagStr = getCell("DATA_PAG");
        const favorecido = getCell("NOME_FORNECEDOR");
        const descricao = getCell("DESC_DL");

        if (!isNaN(valorPago) && dataPagStr && valorPago > 0) {
          const dataBoletim = parseDate(dataPagStr);
          if (dataBoletim) {
            const dateIso = dataBoletim.toISOString().slice(0, 10);
            const key = `${instr.id}|${dateIso}|${valorPago.toFixed(2)}`;

            if (!setExistentes.has(key)) {
              // Calcular percentual estimado desta medição
              const valorTotal = Number(instr.valorRepasse) + Number(instr.valorContrapartida);
              const percentualEstimado = valorTotal > 0 ? (valorPago / valorTotal) * 100 : null;

              await prisma.instrumentMeasurementBulletin.create({
                data: {
                  instrumentId: instr.id,
                  dataBoletim,
                  valorMedicao: valorPago,
                  percentualObraInformado: percentualEstimado,
                  observacao: `Pagamento reconstruído: ${favorecido} - ${descricao}`
                }
              }).catch(() => {});

              setExistentes.add(key);
              mediçõesProcessadas++;
            }
          }
        }
      }
    });
    console.log(`Processados ${mediçõesProcessadas} novos boletins de medição via pagamentos.`);
  } catch (error: any) {
    console.error("Erro ao processar boletins de medição via pagamentos:", error.message);
  }

  return { mediçõesProcessadas, andamentosProcessados };
};

/**
 * Converte data BR (DD/MM/YYYY) ou ISO para objeto Date.
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month, day);
  }
  const isoParts = dateStr.split("-");
  if (isoParts.length === 3) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}
