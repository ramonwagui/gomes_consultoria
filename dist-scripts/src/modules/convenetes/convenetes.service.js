"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteConvenete = exports.updateConvenete = exports.getConveneteById = exports.createConveneteFromProponente = exports.listProponenteSugestoesFromTransferencias = exports.listConvenetes = exports.createConvenete = exports.reimportarInstrumentosTodosProponentesAtendidos = exports.reimportarInstrumentosDoProponenteAtendido = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../lib/prisma");
const instrumentos_service_1 = require("../instrumentos/instrumentos.service");
const TABLE_TRANSFERENCIAS_DISCRICIONARIAS = "transferencias_discricionarias";
const escapeLikeValue = (value) => value.replace(/([\\%_])/g, "\\$1");
const isMissingTransferenciasTableError = (error) => {
    if (!(error instanceof client_1.Prisma.PrismaClientKnownRequestError) || error.code !== "P2010") {
        return false;
    }
    const metaMessage = typeof error.meta === "object" && error.meta && "message" in error.meta
        ? String(error.meta.message ?? "")
        : "";
    const details = `${error.message} ${metaMessage}`.toLowerCase();
    return details.includes("no such table") && details.includes(TABLE_TRANSFERENCIAS_DISCRICIONARIAS);
};
const parseMaybeDate = (value) => {
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
const toNonNegativeNumber = (value) => {
    const num = typeof value === "number" ? value : Number(value ?? 0);
    if (!Number.isFinite(num)) {
        return 0;
    }
    return Math.max(0, num);
};
const normalizeCode = (value) => value?.trim() ?? "";
const mapStatusFromTransferencia = (situacaoProposta, situacaoConvenio, vigenciaFim) => {
    const source = `${situacaoConvenio ?? ""} ${situacaoProposta ?? ""}`.toLowerCase();
    if (source.includes("conclu") || source.includes("encerr")) {
        return client_1.InstrumentStatus.CONCLUIDO;
    }
    if (source.includes("prest") && source.includes("cont")) {
        return client_1.InstrumentStatus.PRESTACAO_PENDENTE;
    }
    if (source.includes("exec") || source.includes("vigent")) {
        return client_1.InstrumentStatus.EM_EXECUCAO;
    }
    if (vigenciaFim.getTime() < Date.now()) {
        return client_1.InstrumentStatus.VENCIDO;
    }
    if (source.includes("assin")) {
        return client_1.InstrumentStatus.ASSINADO;
    }
    return client_1.InstrumentStatus.EM_ELABORACAO;
};
const resolveConcedenteFromTransferencia = (row) => {
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
const importarInstrumentosDoProponente = async (conveneteId, cnpjDigits) => {
    try {
        const rows = await prisma_1.prisma.$queryRaw(client_1.Prisma.sql `
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
        MAX(concedente_orgao_sup) AS concedente_orgao_sup,
        MAX(concedente_orgao) AS concedente_orgao
      FROM ${client_1.Prisma.raw(TABLE_TRANSFERENCIAS_DISCRICIONARIAS)}
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
            const dataPayload = {
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
                banco: null,
                agencia: null,
                conta: null,
                conveneteId,
                fluxoTipo: client_1.InstrumentFlowType.OBRA,
                status: mapStatusFromTransferencia(row.situacao_proposta, row.situacao_convenio, vigenciaFimSafe),
                responsavel: null,
                orgaoExecutor: null,
                empresaVencedora: null,
                cnpjVencedora: null,
                valorVencedor: null,
                observacoes: "Importado automaticamente da base Transferegov ao marcar proponente como atendido.",
                ativo: true
            };
            try {
                const existing = await prisma_1.prisma.instrumentProposal.findFirst({
                    where: {
                        OR: [{ proposta }, { instrumento }]
                    },
                    select: { id: true }
                });
                if (existing) {
                    await prisma_1.prisma.instrumentProposal.update({
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
                            banco: dataPayload.banco,
                            agencia: dataPayload.agencia,
                            conta: dataPayload.conta,
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
                        }
                    });
                    await (0, instrumentos_service_1.ensureInstrumentSupportData)(existing.id);
                    atualizados += 1;
                }
                else {
                    const created = await prisma_1.prisma.instrumentProposal.create({ data: dataPayload });
                    await (0, instrumentos_service_1.ensureInstrumentSupportData)(created.id);
                    criados += 1;
                }
            }
            catch {
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
    }
    catch (error) {
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
const reimportarInstrumentosDoProponenteAtendido = async (conveneteId) => {
    const proponente = await prisma_1.prisma.convenete.findUnique({
        where: { id: conveneteId },
        select: { id: true, cnpj: true }
    });
    if (!proponente) {
        return null;
    }
    const cnpjDigits = proponente.cnpj.replace(/\D/g, "").trim();
    const importacao = await importarInstrumentosDoProponente(proponente.id, cnpjDigits);
    return {
        proponente_id: proponente.id,
        importacao
    };
};
exports.reimportarInstrumentosDoProponenteAtendido = reimportarInstrumentosDoProponenteAtendido;
const reimportarInstrumentosTodosProponentesAtendidos = async () => {
    const proponentes = await prisma_1.prisma.convenete.findMany({
        select: { id: true, nome: true, cnpj: true },
        orderBy: [{ nome: "asc" }, { id: "asc" }]
    });
    let criados = 0;
    let atualizados = 0;
    let ignorados = 0;
    let erros = 0;
    const itens = [];
    for (const proponente of proponentes) {
        const cnpjDigits = proponente.cnpj.replace(/\D/g, "").trim();
        const importacao = await importarInstrumentosDoProponente(proponente.id, cnpjDigits);
        criados += importacao.criados;
        atualizados += importacao.atualizados;
        ignorados += importacao.ignorados;
        erros += importacao.erros;
        itens.push({
            proponente_id: proponente.id,
            nome: proponente.nome,
            importacao
        });
    }
    return {
        total_proponentes: proponentes.length,
        criados,
        atualizados,
        ignorados,
        erros,
        itens
    };
};
exports.reimportarInstrumentosTodosProponentesAtendidos = reimportarInstrumentosTodosProponentesAtendidos;
const createConvenete = async (input) => {
    return prisma_1.prisma.convenete.create({
        data: {
            nome: input.nome,
            cnpj: input.cnpj,
            endereco: input.endereco,
            bairro: input.bairro,
            cep: input.cep,
            uf: input.uf,
            cidade: input.cidade,
            tel: input.tel,
            email: input.email
        }
    });
};
exports.createConvenete = createConvenete;
const listConvenetes = async () => {
    return prisma_1.prisma.convenete.findMany({
        orderBy: [{ nome: "asc" }, { id: "asc" }]
    });
};
exports.listConvenetes = listConvenetes;
const listProponenteSugestoesFromTransferencias = async (query) => {
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
                const data = await response.json();
                console.log(`Brasil API retornou: ${data.razao_social}`);
                return [{
                        cnpj: digits,
                        nome_proponente: data.razao_social ?? "RAZAO SOCIAL NAO ENCONTRADA",
                        uf: data.uf ?? null,
                        cidade: data.municipio ?? null
                    }];
            }
        }
        catch (err) {
            console.error(`Erro ao buscar na Brasil API: ${err.message}`);
        }
    }
    if (term.length < 2) {
        return [];
    }
    const normalizedLike = `%${escapeLikeValue(term.toLowerCase())}%`;
    const filters = [client_1.Prisma.sql `LOWER(nome_proponente) LIKE ${normalizedLike} ESCAPE '\\'`];
    if (digits.length >= 2) {
        filters.push(client_1.Prisma.sql `REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') LIKE ${`%${digits}%`}`);
    }
    const whereClause = client_1.Prisma.sql `
    WHERE cnpj IS NOT NULL
      AND TRIM(cnpj) <> ''
      AND nome_proponente IS NOT NULL
      AND TRIM(nome_proponente) <> ''
      AND (${client_1.Prisma.join(filters, " OR ")})
  `;
    try {
        const rows = await prisma_1.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        cnpj,
        nome_proponente,
        MAX(uf) AS uf,
        MAX(municipio) AS cidade,
        COUNT(*) AS total
      FROM ${client_1.Prisma.raw(TABLE_TRANSFERENCIAS_DISCRICIONARIAS)}
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
    }
    catch (error) {
        if (isMissingTransferenciasTableError(error)) {
            return [];
        }
        throw error;
    }
};
exports.listProponenteSugestoesFromTransferencias = listProponenteSugestoesFromTransferencias;
const createConveneteFromProponente = async (input) => {
    const cnpjDigits = input.cnpj.replace(/\D/g, "").trim();
    const nomeProponente = input.nome_proponente.trim();
    const uf = input.uf?.trim().toUpperCase();
    const cidade = input.cidade?.trim();
    const updateData = {
        nome: nomeProponente
    };
    if (uf && uf.length === 2) {
        updateData.uf = uf;
    }
    if (cidade && cidade.length > 0) {
        updateData.cidade = cidade;
    }
    const proponente = await prisma_1.prisma.convenete.upsert({
        where: { cnpj: cnpjDigits },
        update: updateData,
        create: {
            nome: nomeProponente,
            cnpj: cnpjDigits,
            endereco: "Origem Transferegov",
            bairro: "NAO INFORMADO",
            cep: "00000-000",
            uf: uf && uf.length === 2 ? uf : "NI",
            cidade: cidade && cidade.length > 0 ? cidade : "NAO INFORMADA",
            tel: "0000000000",
            email: `${cnpjDigits}@proponente.local`
        }
    });
    const importacao = await importarInstrumentosDoProponente(proponente.id, cnpjDigits);
    return {
        proponente,
        importacao
    };
};
exports.createConveneteFromProponente = createConveneteFromProponente;
const getConveneteById = async (id) => {
    return prisma_1.prisma.convenete.findUnique({ where: { id } });
};
exports.getConveneteById = getConveneteById;
const updateConvenete = async (id, input) => {
    return prisma_1.prisma.convenete.update({
        where: { id },
        data: {
            nome: input.nome,
            cnpj: input.cnpj,
            endereco: input.endereco,
            bairro: input.bairro,
            cep: input.cep,
            uf: input.uf,
            cidade: input.cidade,
            tel: input.tel,
            email: input.email
        }
    });
};
exports.updateConvenete = updateConvenete;
const deleteConvenete = async (id) => {
    return prisma_1.prisma.convenete.delete({ where: { id } });
};
exports.deleteConvenete = deleteConvenete;
