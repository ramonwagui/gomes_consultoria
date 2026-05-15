import { PrismaClient } from "@prisma/client";
import {
  createSystemInstrumentUpdateAuditLog,
  snapshotInstrumentForAudit
} from "../auditoria/auditoria.service";

const prisma = new PrismaClient();

// Tipos para mapear a resposta da API do Governo (Transferegov Medição)
interface ContratoLoteData {
  status: string;
  data: {
    percentualTotalRealizado: number;
    valorTotalRealizado: number;
    tipoInstrumento: {
      numeroConvenioRepasse: string;
    };
  };
}

interface SituacaoParalisacaoData {
  status: string;
  data: {
    codigo: string;
    descricao: string;
  };
}

/**
 * Sincroniza os dados de medição de uma proposta específica do Transferegov
 * @param idProposta O ID da proposta no Transferegov (ex: 1947083)
 * @param jwtToken Token opcional para autenticação (se não fornecido, tenta ler do .env)
 */
export const sincronizarDadosMedicao = async (idProposta: string | number, jwtToken?: string) => {
  try {
    const baseUrl = "https://medicao.transferegov.sistema.gov.br/medicao-backend";
    const token = jwtToken || process.env.TRANSFEREGOV_MEDICAO_TOKEN;
    
    console.log(`[Medição] Sincronizando proposta ${idProposta}...`);

    // 1. Configura os headers de autenticação e segurança (réplica exata do navegador)
    const headers: Record<string, string> = {
        "accept": "application/json, text/plain, */*",
        "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "sec-ch-ua": "\"Chromium\";v=\"146\", \"Not-A.Brand\";v=\"24\", \"Google Chrome\";v=\"146\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "Referer": `https://medicao.transferegov.sistema.gov.br/medicao/acompanhamento/proposta/${idProposta}/dados-gerais`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };

    if (token) {
        headers["authorization"] = token.startsWith("eyJ") ? `Bearer ${token}` : token;
    }

    // 2. Busca os percentuais gerais (Contratos/Lotes)
    const contratosResponse = await fetch(`${baseUrl}/propostas/${idProposta}/contratoslotes`, { headers });
    if (!contratosResponse.ok) {
        throw new Error(`Erro na API de contratos: ${contratosResponse.statusText}`);
    }
    const contratosJson = (await contratosResponse.json()) as ContratoLoteData;
    
    // 2. Busca o status de paralisação
    const paralisacaoResponse = await fetch(`${baseUrl}/proposta/${idProposta}/situacaoParalisacao`, { headers });
    if (!paralisacaoResponse.ok) {
        throw new Error(`Erro na API de paralisação: ${paralisacaoResponse.statusText}`);
    }
    const paralisacaoJson = (await paralisacaoResponse.json()) as SituacaoParalisacaoData;

    // 3. Extrai os valores (com fallback para zero se não existir)
    const percentualRealizado = contratosJson.data?.percentualTotalRealizado || 0;
    const statusParalisacao = paralisacaoJson.data?.descricao || "Status não informado";

    // 4. Atualiza no nosso banco de dados
    const instrument = await prisma.instrumentProposal.findFirst({
      where: { proposta: String(idProposta), demoOwnerUserId: null },
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

    const atualizado = await prisma.instrumentProposal.updateMany({
      where: {
        proposta: String(idProposta),
        demoOwnerUserId: null
      },
      data: {
        percentualFisicoMedicao: percentualRealizado,
        percentualFinanceiroMedicao: percentualRealizado, 
        statusMedicao: statusParalisacao,
        dataUltimaAtualizacaoMedicao: new Date(),
      },
    });

    if (instrument && atualizado.count > 0) {
      const afterInstrument = await prisma.instrumentProposal.findUnique({
        where: { id: instrument.id },
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
        instrumentId: instrument.id,
        source: "SYNC_MEDICAO_TRANSFEREGOV",
        beforeData: snapshotInstrumentForAudit(instrument),
        afterData: snapshotInstrumentForAudit(afterInstrument)
      });
    }

    if (instrument) {
      await prisma.instrumentWorkProgress.upsert({
        where: { instrumentId: instrument.id },
        update: {
          percentualObra: percentualRealizado,
        },
        create: {
          instrumentId: instrument.id,
          percentualObra: percentualRealizado,
        },
      });
    }

    console.log(`✅ [Medição] Proposta ${idProposta} atualizada! Status: ${statusParalisacao} | Progresso: ${percentualRealizado}%`);
    return atualizado;

  } catch (error) {
    console.error(`❌ [Medição] Erro ao sincronizar a proposta ${idProposta}:`, error);
    throw error;
  }
};

/**
 * Função para rodar em lote (Cron Job / Background Job)
 * Atualiza todas as obras ativas cadastradas no sistema
 */
export const sincronizarTodasAsObrasEmExecucao = async () => {
  console.log("[Medição] Iniciando sincronização em lote com o Transferegov...");
  
  const obras = await prisma.instrumentProposal.findMany({
    where: {
      ativo: true,
      fluxoTipo: "OBRA"
    },
    select: { proposta: true }
  });

  console.log(`[Medição] Encontradas ${obras.length} obras para sincronizar.`);

  for (const [index, obra] of obras.entries()) {
    try {
      // Pequeno delay para evitar rate limit
      await new Promise(resolve => setTimeout(resolve, 800));
      await sincronizarDadosMedicao(obra.proposta);
    } catch (err) {
      console.error(`[Medição] Falha na obra ${index + 1}/${obras.length} (${obra.proposta}):`, err);
    }
  }
  
  console.log("[Medição] Sincronização em lote concluída!");
};
