"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMeasurementBulletin = exports.createMeasurementBulletin = exports.updateWorkProgress = exports.getWorkProgress = exports.getChecklistSummary = exports.getStageFollowUpFileById = exports.createStageFollowUp = exports.listStageFollowUps = exports.clearChecklistItemUpload = exports.updateChecklistItemUpload = exports.getChecklistExternalFileById = exports.listChecklistExternalFiles = exports.saveChecklistExternalFilesByToken = exports.getChecklistExternalLinkByToken = exports.getActiveChecklistExternalLinkByToken = exports.deactivateChecklistExternalLink = exports.createChecklistExternalLink = exports.getChecklistItemById = exports.deleteChecklistItem = exports.updateChecklistItem = exports.createChecklistItem = exports.listChecklistItems = exports.getDeadlineAlerts = exports.deleteRepasse = exports.createRepasse = exports.syncInstrumentRepassesFromDesembolsos = exports.listRepasses = exports.deactivateInstrument = exports.updateInstrument = exports.getInstrumentById = exports.listInstruments = exports.createInstrument = exports.syncAllExistingWorkflowChecklists = exports.ensureInstrumentSupportData = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../lib/prisma");
const checklistExternalLinkInclude = {
    externalLinks: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
            files: {
                orderBy: [{ createdAt: "desc" }, { id: "desc" }]
            }
        }
    }
};
const instrumentRepasseInclude = {
    repasses: {
        orderBy: [{ dataRepasse: "desc" }, { id: "desc" }]
    }
};
const toDate = (value) => {
    if (!value) {
        return undefined;
    }
    return new Date(`${value}T00:00:00.000Z`);
};
const STAGE_ORDER = [
    client_1.InstrumentWorkflowStage.PROPOSTA,
    client_1.InstrumentWorkflowStage.REQUISITOS_CELEBRACAO,
    client_1.InstrumentWorkflowStage.PROJETO_BASICO_TERMO_REFERENCIA,
    client_1.InstrumentWorkflowStage.PROCESSO_EXECUCAO_LICITACAO,
    client_1.InstrumentWorkflowStage.VERIFICACAO_PROCESSO_LICITATORIO,
    client_1.InstrumentWorkflowStage.INSTRUMENTOS_CONTRATUAIS,
    client_1.InstrumentWorkflowStage.ACOMPANHAMENTO_OBRA
];
const PROPOSTA_DEFAULT_ITEMS = [
    { nome: "Caracterizacao dos interesses reciprocos", obrigatorio: true },
    { nome: "Publico alvo", obrigatorio: true },
    { nome: "Problema a ser resolvido", obrigatorio: true },
    { nome: "Resultados esperados", obrigatorio: true },
    { nome: "Relacao entre a proposta e os objetivos e diretrizes do programa", obrigatorio: true },
    { nome: "Objeto do instrumento", obrigatorio: true },
    { nome: "Crono fisico financeiro", obrigatorio: true },
    { nome: "Crono desembolso", obrigatorio: true },
    { nome: "Plano de aplicacao detalhado", obrigatorio: true }
];
const FLOW_DEFINITIONS = {
    [client_1.InstrumentFlowType.OBRA]: {
        stages: STAGE_ORDER,
        defaultStageItems: {
            [client_1.InstrumentWorkflowStage.PROPOSTA]: PROPOSTA_DEFAULT_ITEMS,
            [client_1.InstrumentWorkflowStage.REQUISITOS_CELEBRACAO]: [{ nome: "Documentacao", obrigatorio: true }],
            [client_1.InstrumentWorkflowStage.PROJETO_BASICO_TERMO_REFERENCIA]: [
                { nome: "Declaracoes", obrigatorio: true },
                { nome: "Projeto", obrigatorio: true },
                { nome: "Documentacao", obrigatorio: true },
                { nome: "Licenca ambiental", obrigatorio: true },
                { nome: "QCI", obrigatorio: true },
                { nome: "Planilha orcamentaria", obrigatorio: true }
            ],
            [client_1.InstrumentWorkflowStage.PROCESSO_EXECUCAO_LICITACAO]: [
                { nome: "Documentacao referente ao processo licitatorio", obrigatorio: true }
            ],
            [client_1.InstrumentWorkflowStage.VERIFICACAO_PROCESSO_LICITATORIO]: [
                { nome: "Documentacao para verificacao do processo licitatorio (VRPL)", obrigatorio: true }
            ],
            [client_1.InstrumentWorkflowStage.INSTRUMENTOS_CONTRATUAIS]: [{ nome: "Documento", obrigatorio: true }],
            [client_1.InstrumentWorkflowStage.ACOMPANHAMENTO_OBRA]: [
                { nome: "ART de execucao", obrigatorio: true },
                { nome: "ART de fiscalizacao", obrigatorio: true },
                { nome: "Ordem de servico para inicio da obra", obrigatorio: true }
            ]
        }
    },
    [client_1.InstrumentFlowType.AQUISICAO_EQUIPAMENTOS]: {
        stages: STAGE_ORDER,
        defaultStageItems: {
            [client_1.InstrumentWorkflowStage.PROPOSTA]: PROPOSTA_DEFAULT_ITEMS,
            [client_1.InstrumentWorkflowStage.REQUISITOS_CELEBRACAO]: [{ nome: "Documentacao", obrigatorio: true }],
            [client_1.InstrumentWorkflowStage.PROJETO_BASICO_TERMO_REFERENCIA]: [
                { nome: "Termo de referencia", obrigatorio: true },
                { nome: "Especificacoes tecnicas", obrigatorio: true },
                { nome: "Planilha orcamentaria", obrigatorio: true }
            ],
            [client_1.InstrumentWorkflowStage.PROCESSO_EXECUCAO_LICITACAO]: [
                { nome: "Documentacao referente ao processo licitatorio", obrigatorio: true }
            ],
            [client_1.InstrumentWorkflowStage.VERIFICACAO_PROCESSO_LICITATORIO]: [
                { nome: "Documentacao para verificacao do processo licitatorio (VRPL)", obrigatorio: true }
            ],
            [client_1.InstrumentWorkflowStage.INSTRUMENTOS_CONTRATUAIS]: [{ nome: "Documento", obrigatorio: true }],
            [client_1.InstrumentWorkflowStage.ACOMPANHAMENTO_OBRA]: [
                { nome: "Comprovacao de entrega", obrigatorio: true },
                { nome: "Termo de recebimento", obrigatorio: true }
            ]
        }
    },
    [client_1.InstrumentFlowType.EVENTOS]: {
        stages: STAGE_ORDER,
        defaultStageItems: {
            [client_1.InstrumentWorkflowStage.PROPOSTA]: PROPOSTA_DEFAULT_ITEMS,
            [client_1.InstrumentWorkflowStage.REQUISITOS_CELEBRACAO]: [{ nome: "Documentacao", obrigatorio: true }],
            [client_1.InstrumentWorkflowStage.PROJETO_BASICO_TERMO_REFERENCIA]: [
                { nome: "Plano de trabalho do evento", obrigatorio: true },
                { nome: "Cronograma", obrigatorio: true },
                { nome: "Orcamento", obrigatorio: true }
            ],
            [client_1.InstrumentWorkflowStage.PROCESSO_EXECUCAO_LICITACAO]: [
                { nome: "Documentacao referente ao processo licitatorio", obrigatorio: true }
            ],
            [client_1.InstrumentWorkflowStage.VERIFICACAO_PROCESSO_LICITATORIO]: [
                { nome: "Documentacao para verificacao do processo licitatorio (VRPL)", obrigatorio: true }
            ],
            [client_1.InstrumentWorkflowStage.INSTRUMENTOS_CONTRATUAIS]: [{ nome: "Documento", obrigatorio: true }],
            [client_1.InstrumentWorkflowStage.ACOMPANHAMENTO_OBRA]: [
                { nome: "Relatorio de execucao do evento", obrigatorio: true },
                { nome: "Comprovacao de publico/resultado", obrigatorio: true }
            ]
        }
    }
};
const getFlowDefinition = (flowType) => {
    return FLOW_DEFINITIONS[flowType] ?? FLOW_DEFINITIONS[client_1.InstrumentFlowType.OBRA];
};
const LEGACY_RENAME_RULES = [
    {
        etapa: client_1.InstrumentWorkflowStage.REQUISITOS_CELEBRACAO,
        from: "Documentacao de celebracao",
        to: "Documentacao"
    },
    {
        etapa: client_1.InstrumentWorkflowStage.VERIFICACAO_PROCESSO_LICITATORIO,
        from: "Documentacao",
        to: "Documentacao para verificacao do processo licitatorio (VRPL)"
    },
    {
        etapa: client_1.InstrumentWorkflowStage.INSTRUMENTOS_CONTRATUAIS,
        from: "Documento contratual",
        to: "Documento"
    }
];
const LEGACY_ITEMS_TO_MAKE_OPTIONAL = [
    { etapa: client_1.InstrumentWorkflowStage.REQUISITOS_CELEBRACAO, nome: "Plano de trabalho aprovado" },
    { etapa: client_1.InstrumentWorkflowStage.REQUISITOS_CELEBRACAO, nome: "Certidoes obrigatorias" },
    { etapa: client_1.InstrumentWorkflowStage.VERIFICACAO_PROCESSO_LICITATORIO, nome: "Em elaboracao" },
    { etapa: client_1.InstrumentWorkflowStage.VERIFICACAO_PROCESSO_LICITATORIO, nome: "Aceite do VRPL" }
];
const normalizeName = (value) => value.trim().toLowerCase().replace(/\s+/g, " ");
const isCompletedStatus = (status) => {
    return status === client_1.ChecklistItemStatus.CONCLUIDO || status === client_1.ChecklistItemStatus.ACEITO;
};
const isItemCompleted = (item) => {
    return isCompletedStatus(item.status) || item.concluido;
};
const getPreviousStages = (stage, stageOrder) => {
    const index = stageOrder.indexOf(stage);
    if (index <= 0) {
        return [];
    }
    return stageOrder.slice(0, index);
};
const createDefaultWorkflowChecklistTx = async (tx, instrumentId, flowType) => {
    const total = await tx.instrumentChecklistItem.count({ where: { instrumentId } });
    if (total > 0) {
        return;
    }
    const flowDefinition = getFlowDefinition(flowType);
    let ordem = 0;
    const data = flowDefinition.stages.flatMap((etapa) => {
        return flowDefinition.defaultStageItems[etapa].map((item) => {
            const currentOrder = ordem;
            ordem += 1;
            return {
                instrumentId,
                etapa,
                status: client_1.ChecklistItemStatus.NAO_INICIADO,
                nomeDocumento: item.nome,
                obrigatorio: item.obrigatorio,
                concluido: false,
                ordem: currentOrder
            };
        });
    });
    if (data.length > 0) {
        await tx.instrumentChecklistItem.createMany({ data });
    }
};
const syncWorkflowChecklistTx = async (tx, instrumentId) => {
    const instrument = await tx.instrumentProposal.findUnique({
        where: { id: instrumentId },
        select: { fluxoTipo: true }
    });
    if (!instrument) {
        return;
    }
    const flowType = instrument.fluxoTipo;
    const flowDefinition = getFlowDefinition(flowType);
    await createDefaultWorkflowChecklistTx(tx, instrumentId, flowType);
    const existing = await tx.instrumentChecklistItem.findMany({
        where: { instrumentId },
        orderBy: [{ ordem: "asc" }, { createdAt: "asc" }]
    });
    if (existing.length === 0) {
        return;
    }
    if (flowType === client_1.InstrumentFlowType.OBRA) {
        for (const rule of LEGACY_RENAME_RULES) {
            const sourceItems = existing.filter((item) => item.etapa === rule.etapa && normalizeName(item.nomeDocumento) === normalizeName(rule.from));
            for (const source of sourceItems) {
                const targetExists = existing.some((item) => item.id !== source.id &&
                    item.etapa === rule.etapa &&
                    normalizeName(item.nomeDocumento) === normalizeName(rule.to));
                if (targetExists) {
                    if (source.obrigatorio) {
                        await tx.instrumentChecklistItem.update({
                            where: { id: source.id },
                            data: { obrigatorio: false }
                        });
                    }
                    continue;
                }
                await tx.instrumentChecklistItem.update({
                    where: { id: source.id },
                    data: {
                        nomeDocumento: rule.to
                    }
                });
            }
        }
        for (const legacyItem of LEGACY_ITEMS_TO_MAKE_OPTIONAL) {
            const toUpdate = existing.filter((item) => item.etapa === legacyItem.etapa &&
                normalizeName(item.nomeDocumento) === normalizeName(legacyItem.nome) &&
                item.obrigatorio);
            for (const item of toUpdate) {
                await tx.instrumentChecklistItem.update({
                    where: { id: item.id },
                    data: { obrigatorio: false }
                });
            }
        }
    }
    const refreshed = await tx.instrumentChecklistItem.findMany({
        where: { instrumentId },
        orderBy: [{ ordem: "asc" }, { createdAt: "asc" }]
    });
    for (const etapa of flowDefinition.stages) {
        const stageItems = refreshed.filter((item) => item.etapa === etapa);
        let stageOrder = stageItems.reduce((max, item) => Math.max(max, item.ordem), -1);
        for (const defaultItem of flowDefinition.defaultStageItems[etapa]) {
            const existingDefault = stageItems.find((item) => normalizeName(item.nomeDocumento) === normalizeName(defaultItem.nome));
            if (existingDefault) {
                if (defaultItem.obrigatorio && !existingDefault.obrigatorio) {
                    await tx.instrumentChecklistItem.update({
                        where: { id: existingDefault.id },
                        data: { obrigatorio: true }
                    });
                }
                continue;
            }
            stageOrder += 1;
            await tx.instrumentChecklistItem.create({
                data: {
                    instrumentId,
                    etapa,
                    status: client_1.ChecklistItemStatus.NAO_INICIADO,
                    nomeDocumento: defaultItem.nome,
                    obrigatorio: defaultItem.obrigatorio,
                    concluido: false,
                    ordem: stageOrder
                }
            });
        }
    }
};
const ensureWorkflowChecklist = async (instrumentId) => {
    await prisma_1.prisma.$transaction(async (tx) => {
        await syncWorkflowChecklistTx(tx, instrumentId);
    });
};
const parseTransferenciaDateToIso = (value) => {
    if (!value) {
        return null;
    }
    const trimmed = value.trim();
    if (trimmed === "") {
        return null;
    }
    const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
    if (brMatch) {
        return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
    }
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (isoMatch) {
        return trimmed;
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed.toISOString().slice(0, 10);
};
const normalizeConvenioCode = (value) => {
    const normalized = value.replace(/[./\-\s]/g, "").trim();
    return normalized === "" ? null : normalized;
};
const repasseKey = (dataRepasseIso, valorRepasse) => `${dataRepasseIso}|${valorRepasse.toFixed(2)}`;
const isMissingTransferenciasDesembolsoTableError = (error) => {
    if (!(error instanceof client_1.Prisma.PrismaClientKnownRequestError) || error.code !== "P2010") {
        return false;
    }
    const metaMessage = typeof error.meta === "object" && error.meta && "message" in error.meta
        ? String(error.meta.message ?? "")
        : "";
    const details = `${error.message} ${metaMessage}`.toLowerCase();
    const isMissingTable = details.includes("no such table") ||
        details.includes("does not exist") ||
        details.includes("relation") ||
        details.includes("42p01");
    return isMissingTable && details.includes("transferencias_discricionarias_desembolsos");
};
const isMissingTransferenciasDesembolsoNormColumnError = (error) => {
    if (!(error instanceof client_1.Prisma.PrismaClientKnownRequestError) || error.code !== "P2010") {
        return false;
    }
    const metaMessage = typeof error.meta === "object" && error.meta && "message" in error.meta
        ? String(error.meta.message ?? "")
        : "";
    const details = `${error.message} ${metaMessage}`.toLowerCase();
    return details.includes("no such column") && details.includes("nr_convenio_norm");
};
const ensureInstrumentSupportData = async (instrumentId) => {
    await ensureWorkflowChecklist(instrumentId);
    await prisma_1.prisma.instrumentWorkProgress.upsert({
        where: { instrumentId },
        update: {},
        create: { instrumentId, percentualObra: 0 }
    });
    try {
        await (0, exports.syncInstrumentRepassesFromDesembolsos)(instrumentId);
    }
    catch (error) {
        console.error(`Erro ao sincronizar repasses para o instrumento ${instrumentId}:`, error);
    }
};
exports.ensureInstrumentSupportData = ensureInstrumentSupportData;
const syncAllExistingWorkflowChecklists = async () => {
    const instruments = await prisma_1.prisma.instrumentProposal.findMany({
        select: { id: true }
    });
    for (const instrument of instruments) {
        await prisma_1.prisma.$transaction(async (tx) => {
            await syncWorkflowChecklistTx(tx, instrument.id);
        });
    }
    return {
        instrumentos_processados: instruments.length
    };
};
exports.syncAllExistingWorkflowChecklists = syncAllExistingWorkflowChecklists;
const areStagesCompleted = (items, stages) => {
    return stages.every((stage) => {
        const mandatoryItems = items.filter((item) => item.etapa === stage && item.obrigatorio);
        if (mandatoryItems.length === 0) {
            return false;
        }
        return mandatoryItems.every(isItemCompleted);
    });
};
const createInstrument = async (input) => {
    return prisma_1.prisma.$transaction(async (tx) => {
        const created = await tx.instrumentProposal.create({
            data: {
                proposta: input.proposta,
                instrumento: input.instrumento,
                objeto: input.objeto,
                valorRepasse: input.valor_repasse,
                valorContrapartida: input.valor_contrapartida,
                dataCadastro: new Date(`${input.data_cadastro}T00:00:00.000Z`),
                dataAssinatura: toDate(input.data_assinatura),
                vigenciaInicio: new Date(`${input.vigencia_inicio}T00:00:00.000Z`),
                vigenciaFim: new Date(`${input.vigencia_fim}T00:00:00.000Z`),
                dataPrestacaoContas: toDate(input.data_prestacao_contas),
                dataDou: toDate(input.data_dou),
                concedente: input.concedente,
                banco: input.banco,
                agencia: input.agencia,
                conta: input.conta,
                convenete: input.convenete_id ? { connect: { id: input.convenete_id } } : undefined,
                fluxoTipo: input.fluxo_tipo,
                status: input.status,
                responsavel: input.responsavel,
                orgaoExecutor: input.orgao_executor,
                empresaVencedora: input.empresa_vencedora,
                cnpjVencedora: input.cnpj_vencedora,
                valorVencedor: input.valor_vencedor,
                observacoes: input.observacoes
            }
        });
        await createDefaultWorkflowChecklistTx(tx, created.id, created.fluxoTipo);
        await tx.instrumentWorkProgress.upsert({
            where: { instrumentId: created.id },
            update: {},
            create: { instrumentId: created.id, percentualObra: 0 }
        });
        return created;
    });
};
exports.createInstrument = createInstrument;
const listInstruments = async (query) => {
    const where = {
        ativo: query.ativo
    };
    if (query.status) {
        where.status = query.status;
    }
    if (query.concedente) {
        where.concedente = {
            contains: query.concedente
        };
    }
    if (query.convenete_id !== undefined) {
        where.conveneteId = query.convenete_id;
    }
    if (query.vigencia_de || query.vigencia_ate) {
        where.vigenciaFim = {
            gte: toDate(query.vigencia_de),
            lte: toDate(query.vigencia_ate)
        };
    }
    if (query.sync_repasses_desembolsos) {
        try {
            const ids = await prisma_1.prisma.instrumentProposal.findMany({
                where,
                select: { id: true },
                orderBy: [{ vigenciaFim: "asc" }, { createdAt: "desc" }]
            });
            for (const item of ids) {
                try {
                    await (0, exports.syncInstrumentRepassesFromDesembolsos)(item.id);
                }
                catch {
                    // Nao bloqueia a listagem caso algum instrumento falhe na sincronizacao.
                }
            }
        }
        catch {
            // Nao bloqueia a listagem caso a etapa de sincronizacao em lote falhe.
        }
    }
    return prisma_1.prisma.instrumentProposal.findMany({
        where,
        include: instrumentRepasseInclude,
        orderBy: [{ vigenciaFim: "asc" }, { createdAt: "desc" }]
    });
};
exports.listInstruments = listInstruments;
const getInstrumentById = async (id) => {
    return prisma_1.prisma.instrumentProposal.findUnique({ where: { id }, include: instrumentRepasseInclude });
};
exports.getInstrumentById = getInstrumentById;
const updateInstrument = async (id, input) => {
    const data = {
        proposta: input.proposta,
        instrumento: input.instrumento,
        objeto: input.objeto,
        valorRepasse: input.valor_repasse,
        valorContrapartida: input.valor_contrapartida,
        dataCadastro: toDate(input.data_cadastro),
        dataAssinatura: toDate(input.data_assinatura),
        vigenciaInicio: toDate(input.vigencia_inicio),
        vigenciaFim: toDate(input.vigencia_fim),
        dataPrestacaoContas: toDate(input.data_prestacao_contas),
        dataDou: toDate(input.data_dou),
        concedente: input.concedente,
        banco: input.banco,
        agencia: input.agencia,
        conta: input.conta,
        convenete: input.convenete_id === undefined ? undefined : { connect: { id: input.convenete_id } },
        fluxoTipo: input.fluxo_tipo,
        status: input.status,
        responsavel: input.responsavel,
        orgaoExecutor: input.orgao_executor,
        empresaVencedora: input.empresa_vencedora,
        cnpjVencedora: input.cnpj_vencedora,
        valorVencedor: input.valor_vencedor,
        observacoes: input.observacoes,
        ativo: input.ativo
    };
    return prisma_1.prisma.instrumentProposal.update({
        where: { id },
        data,
        include: instrumentRepasseInclude
    });
};
exports.updateInstrument = updateInstrument;
const deactivateInstrument = async (id) => {
    return prisma_1.prisma.instrumentProposal.update({
        where: { id },
        data: { ativo: false },
        include: instrumentRepasseInclude
    });
};
exports.deactivateInstrument = deactivateInstrument;
const listRepasses = async (instrumentId) => {
    return prisma_1.prisma.instrumentRepasse.findMany({
        where: { instrumentId },
        orderBy: [{ dataRepasse: "desc" }, { id: "desc" }]
    });
};
exports.listRepasses = listRepasses;
const syncInstrumentRepassesFromDesembolsos = async (instrumentId) => {
    const instrument = await prisma_1.prisma.instrumentProposal.findUnique({
        where: { id: instrumentId },
        select: { instrumento: true }
    });
    if (!instrument) {
        return {
            criados: 0,
            removidos: 0,
            total_desembolsos_validos: 0
        };
    }
    const convenioCode = instrument.instrumento.trim();
    const convenioCodeNormalized = normalizeConvenioCode(convenioCode);
    if (!convenioCodeNormalized) {
        return {
            criados: 0,
            removidos: 0,
            total_desembolsos_validos: 0
        };
    }
    let desembolsos = [];
    try {
        desembolsos = await prisma_1.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT id, data_desembolso, vl_desembolsado
      FROM transferencias_discricionarias_desembolsos
      WHERE nr_convenio_norm = ${convenioCodeNormalized}
      ORDER BY id DESC
    `);
    }
    catch (error) {
        if (isMissingTransferenciasDesembolsoNormColumnError(error)) {
            desembolsos = await prisma_1.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT id, data_desembolso, vl_desembolsado
        FROM transferencias_discricionarias_desembolsos
        WHERE REPLACE(REPLACE(REPLACE(REPLACE(nr_convenio, '.', ''), '/', ''), '-', ''), ' ', '')
          = ${convenioCodeNormalized}
        ORDER BY id DESC
      `);
        }
        else if (!isMissingTransferenciasDesembolsoTableError(error)) {
            throw error;
        }
    }
    const desiredCounts = new Map();
    for (const row of desembolsos) {
        const dateIso = parseTransferenciaDateToIso(row.data_desembolso);
        const value = Number(row.vl_desembolsado ?? 0);
        if (!dateIso || !Number.isFinite(value) || value <= 0) {
            continue;
        }
        const key = repasseKey(dateIso, value);
        desiredCounts.set(key, (desiredCounts.get(key) ?? 0) + 1);
    }
    return prisma_1.prisma.$transaction(async (tx) => {
        const existing = await tx.instrumentRepasse.findMany({
            where: { instrumentId },
            orderBy: [{ dataRepasse: "desc" }, { id: "desc" }]
        });
        const existingMap = new Map();
        for (const repasse of existing) {
            const key = repasseKey(repasse.dataRepasse.toISOString().slice(0, 10), Number(repasse.valorRepasse));
            const bucket = existingMap.get(key) ?? [];
            bucket.push({ id: repasse.id });
            existingMap.set(key, bucket);
        }
        const toCreate = [];
        const toDeleteIds = [];
        for (const [key, desiredCount] of desiredCounts.entries()) {
            const current = existingMap.get(key) ?? [];
            if (current.length < desiredCount) {
                const [dateIso, valueRaw] = key.split("|");
                const value = Number(valueRaw);
                const missing = desiredCount - current.length;
                for (let i = 0; i < missing; i += 1) {
                    toCreate.push({ dataRepasse: new Date(`${dateIso}T00:00:00.000Z`), valorRepasse: value });
                }
            }
            else if (current.length > desiredCount) {
                const extra = current.slice(desiredCount);
                toDeleteIds.push(...extra.map((item) => item.id));
            }
        }
        for (const [key, current] of existingMap.entries()) {
            if (desiredCounts.has(key)) {
                continue;
            }
            toDeleteIds.push(...current.map((item) => item.id));
        }
        if (toDeleteIds.length > 0) {
            await tx.instrumentRepasse.deleteMany({
                where: {
                    instrumentId,
                    id: { in: toDeleteIds }
                }
            });
        }
        if (toCreate.length > 0) {
            await tx.instrumentRepasse.createMany({
                data: toCreate.map((item) => ({
                    instrumentId,
                    dataRepasse: item.dataRepasse,
                    valorRepasse: item.valorRepasse
                }))
            });
        }
        await recalculateInstrumentRepassado(tx, instrumentId);
        return {
            criados: toCreate.length,
            removidos: toDeleteIds.length,
            total_desembolsos_validos: Array.from(desiredCounts.values()).reduce((acc, value) => acc + value, 0)
        };
    }, {
        timeout: 30000
    });
};
exports.syncInstrumentRepassesFromDesembolsos = syncInstrumentRepassesFromDesembolsos;
const createRepasse = async (instrumentId, input) => {
    return prisma_1.prisma.$transaction(async (tx) => {
        const created = await tx.instrumentRepasse.create({
            data: {
                instrumentId,
                dataRepasse: new Date(`${input.data_repasse}T00:00:00.000Z`),
                valorRepasse: input.valor_repasse
            }
        });
        await recalculateInstrumentRepassado(tx, instrumentId);
        return created;
    });
};
exports.createRepasse = createRepasse;
const deleteRepasse = async (instrumentId, repasseId) => {
    return prisma_1.prisma.$transaction(async (tx) => {
        const existing = await tx.instrumentRepasse.findFirst({
            where: { id: repasseId, instrumentId }
        });
        if (!existing) {
            return null;
        }
        await tx.instrumentRepasse.delete({ where: { id: repasseId } });
        await recalculateInstrumentRepassado(tx, instrumentId);
        return existing;
    });
};
exports.deleteRepasse = deleteRepasse;
const getDeadlineAlerts = async (limiteDias) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const items = await prisma_1.prisma.instrumentProposal.findMany({
        where: { ativo: true },
        orderBy: { vigenciaFim: "asc" }
    });
    const alerts = items
        .map((item) => {
        const vigencia = Math.floor((item.vigenciaFim.getTime() - today.getTime()) / 86400000);
        const prestacao = item.dataPrestacaoContas
            ? Math.floor((item.dataPrestacaoContas.getTime() - today.getTime()) / 86400000)
            : null;
        const inVigenciaLimit = vigencia <= limiteDias;
        const inPrestacaoLimit = prestacao !== null && prestacao <= limiteDias;
        if (!inVigenciaLimit && !inPrestacaoLimit) {
            return null;
        }
        return {
            instrumento_id: item.id,
            proposta: item.proposta,
            instrumento: item.instrumento,
            concedente: item.concedente,
            dias_para_vigencia_fim: vigencia,
            dias_para_prestacao_contas: prestacao
        };
    })
        .filter((value) => Boolean(value))
        .sort((a, b) => {
        const aMin = Math.min(a.dias_para_vigencia_fim, a.dias_para_prestacao_contas ?? Number.POSITIVE_INFINITY);
        const bMin = Math.min(b.dias_para_vigencia_fim, b.dias_para_prestacao_contas ?? Number.POSITIVE_INFINITY);
        return aMin - bMin;
    });
    return {
        referencia: today.toISOString().slice(0, 10),
        limite_dias: limiteDias,
        itens: alerts
    };
};
exports.getDeadlineAlerts = getDeadlineAlerts;
const listChecklistItems = async (instrumentId) => {
    await ensureWorkflowChecklist(instrumentId);
    return prisma_1.prisma.instrumentChecklistItem.findMany({
        where: { instrumentId },
        include: checklistExternalLinkInclude,
        orderBy: [{ etapa: "asc" }, { ordem: "asc" }, { createdAt: "asc" }]
    });
};
exports.listChecklistItems = listChecklistItems;
const recalculateInstrumentRepassado = async (tx, instrumentId) => {
    const aggregate = await tx.instrumentRepasse.aggregate({
        where: { instrumentId },
        _sum: { valorRepasse: true }
    });
    const total = Number(aggregate._sum.valorRepasse ?? 0);
    await tx.instrumentProposal.update({
        where: { id: instrumentId },
        data: { valorJaRepassado: total }
    });
    return total;
};
const createChecklistItem = async (instrumentId, input) => {
    await ensureWorkflowChecklist(instrumentId);
    const highestOrder = await prisma_1.prisma.instrumentChecklistItem.findFirst({
        where: { instrumentId, etapa: input.etapa },
        orderBy: { ordem: "desc" }
    });
    const ordem = input.ordem ?? (highestOrder?.ordem ?? -1) + 1;
    const status = input.status ?? client_1.ChecklistItemStatus.NAO_INICIADO;
    return prisma_1.prisma.instrumentChecklistItem.create({
        data: {
            instrumentId,
            etapa: input.etapa,
            status,
            nomeDocumento: input.nome_documento,
            obrigatorio: input.obrigatorio ?? true,
            concluido: isCompletedStatus(status),
            observacao: input.observacao,
            ordem
        }
    });
};
exports.createChecklistItem = createChecklistItem;
const updateChecklistItem = async (instrumentId, itemId, input) => {
    await ensureWorkflowChecklist(instrumentId);
    const existing = await (0, exports.getChecklistItemById)(instrumentId, itemId);
    if (!existing) {
        throw new Error("CHECKLIST_ITEM_NOT_FOUND");
    }
    const instrument = await prisma_1.prisma.instrumentProposal.findUnique({
        where: { id: instrumentId },
        select: { fluxoTipo: true }
    });
    if (!instrument) {
        throw new Error("CHECKLIST_ITEM_NOT_FOUND");
    }
    const stageOrder = getFlowDefinition(instrument.fluxoTipo).stages;
    const nextStage = input.etapa ?? existing.etapa;
    const nextStatus = input.status ?? existing.status;
    const previousStages = getPreviousStages(nextStage, stageOrder);
    if (nextStatus !== client_1.ChecklistItemStatus.NAO_INICIADO && previousStages.length > 0) {
        const allItems = await prisma_1.prisma.instrumentChecklistItem.findMany({ where: { instrumentId } });
        const previousCompleted = areStagesCompleted(allItems, previousStages);
        if (!previousCompleted) {
            throw new Error("CHECKLIST_STAGE_BLOCKED");
        }
    }
    return prisma_1.prisma.instrumentChecklistItem.update({
        where: { id: itemId },
        data: {
            etapa: input.etapa,
            status: input.status,
            nomeDocumento: input.nome_documento,
            obrigatorio: input.obrigatorio,
            observacao: input.observacao,
            ordem: input.ordem,
            concluido: input.status ? isCompletedStatus(input.status) : undefined
        }
    });
};
exports.updateChecklistItem = updateChecklistItem;
const deleteChecklistItem = async (instrumentId, itemId) => {
    const existing = await (0, exports.getChecklistItemById)(instrumentId, itemId);
    if (!existing) {
        throw new Error("CHECKLIST_ITEM_NOT_FOUND");
    }
    return prisma_1.prisma.instrumentChecklistItem.delete({
        where: { id: itemId }
    });
};
exports.deleteChecklistItem = deleteChecklistItem;
const getChecklistItemById = async (instrumentId, itemId) => {
    return prisma_1.prisma.instrumentChecklistItem.findFirst({
        where: {
            id: itemId,
            instrumentId
        },
        include: checklistExternalLinkInclude
    });
};
exports.getChecklistItemById = getChecklistItemById;
const createChecklistExternalLink = async (instrumentId, itemId, payload) => {
    const item = await prisma_1.prisma.instrumentChecklistItem.findFirst({
        where: {
            id: itemId,
            instrumentId
        }
    });
    if (!item) {
        throw new Error("CHECKLIST_ITEM_NOT_FOUND");
    }
    const expiraEm = new Date(Date.now() + payload.validadeDias * 24 * 60 * 60 * 1000);
    await prisma_1.prisma.instrumentChecklistExternalLink.updateMany({
        where: {
            checklistItemId: itemId,
            ativo: true
        },
        data: {
            ativo: false
        }
    });
    return prisma_1.prisma.instrumentChecklistExternalLink.create({
        data: {
            checklistItemId: itemId,
            token: payload.token,
            expiraEm,
            ativo: true,
            createdByUserId: payload.createdByUserId,
            createdByEmail: payload.createdByEmail
        },
        include: {
            files: {
                orderBy: [{ createdAt: "desc" }, { id: "desc" }]
            }
        }
    });
};
exports.createChecklistExternalLink = createChecklistExternalLink;
const deactivateChecklistExternalLink = async (instrumentId, itemId) => {
    const item = await prisma_1.prisma.instrumentChecklistItem.findFirst({
        where: {
            id: itemId,
            instrumentId
        }
    });
    if (!item) {
        throw new Error("CHECKLIST_ITEM_NOT_FOUND");
    }
    const result = await prisma_1.prisma.instrumentChecklistExternalLink.updateMany({
        where: {
            checklistItemId: itemId,
            ativo: true
        },
        data: {
            ativo: false
        }
    });
    return {
        desativados: result.count
    };
};
exports.deactivateChecklistExternalLink = deactivateChecklistExternalLink;
const getActiveChecklistExternalLinkByToken = async (token) => {
    const link = await prisma_1.prisma.instrumentChecklistExternalLink.findFirst({
        where: {
            token,
            ativo: true
        },
        include: {
            checklistItem: {
                include: {
                    instrument: {
                        select: {
                            id: true,
                            proposta: true,
                            instrumento: true,
                            concedente: true
                        }
                    }
                }
            },
            files: {
                orderBy: [{ createdAt: "desc" }, { id: "desc" }]
            }
        }
    });
    if (!link) {
        return null;
    }
    if (link.expiraEm.getTime() < Date.now()) {
        await prisma_1.prisma.instrumentChecklistExternalLink.update({
            where: { id: link.id },
            data: { ativo: false }
        });
        return null;
    }
    return link;
};
exports.getActiveChecklistExternalLinkByToken = getActiveChecklistExternalLinkByToken;
const getChecklistExternalLinkByToken = async (token) => {
    return prisma_1.prisma.instrumentChecklistExternalLink.findFirst({
        where: {
            token
        },
        include: {
            checklistItem: {
                include: {
                    instrument: {
                        select: {
                            proposta: true,
                            instrumento: true
                        }
                    }
                }
            }
        }
    });
};
exports.getChecklistExternalLinkByToken = getChecklistExternalLinkByToken;
const saveChecklistExternalFilesByToken = async (token, payload) => {
    const link = await (0, exports.getActiveChecklistExternalLinkByToken)(token);
    if (!link) {
        throw new Error("CHECKLIST_EXTERNAL_LINK_NOT_FOUND");
    }
    if (payload.files.length === 0) {
        throw new Error("CHECKLIST_EXTERNAL_FILES_REQUIRED");
    }
    const totalArquivosNoLink = await prisma_1.prisma.$transaction(async (tx) => {
        await tx.instrumentChecklistExternalFile.createMany({
            data: payload.files.map((file) => ({
                externalLinkId: link.id,
                nomeRemetente: payload.nomeRemetente,
                arquivoPath: file.arquivoPath,
                arquivoNomeOriginal: file.arquivoNomeOriginal,
                arquivoMimeType: file.arquivoMimeType,
                arquivoTamanho: file.arquivoTamanho
            }))
        });
        await tx.instrumentChecklistItem.update({
            where: { id: link.checklistItemId },
            data: {
                status: client_1.ChecklistItemStatus.CONCLUIDO,
                concluido: true
            }
        });
        await tx.instrumentChecklistExternalLink.update({
            where: { id: link.id },
            data: { ativo: false }
        });
        return tx.instrumentChecklistExternalFile.count({
            where: { externalLinkId: link.id }
        });
    });
    return {
        totalArquivosNoLink
    };
};
exports.saveChecklistExternalFilesByToken = saveChecklistExternalFilesByToken;
const listChecklistExternalFiles = async (instrumentId, itemId) => {
    return prisma_1.prisma.instrumentChecklistExternalFile.findMany({
        where: {
            externalLink: {
                checklistItemId: itemId,
                checklistItem: {
                    instrumentId
                }
            }
        },
        include: {
            externalLink: {
                select: {
                    id: true,
                    token: true,
                    ativo: true,
                    expiraEm: true,
                    createdAt: true
                }
            }
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    });
};
exports.listChecklistExternalFiles = listChecklistExternalFiles;
const getChecklistExternalFileById = async (instrumentId, itemId, fileId) => {
    return prisma_1.prisma.instrumentChecklistExternalFile.findFirst({
        where: {
            id: fileId,
            externalLink: {
                checklistItemId: itemId,
                checklistItem: {
                    instrumentId
                }
            }
        },
        include: {
            externalLink: {
                select: {
                    id: true,
                    token: true,
                    checklistItemId: true
                }
            }
        }
    });
};
exports.getChecklistExternalFileById = getChecklistExternalFileById;
const updateChecklistItemUpload = async (instrumentId, itemId, payload) => {
    const existing = await (0, exports.getChecklistItemById)(instrumentId, itemId);
    if (!existing) {
        throw new Error("CHECKLIST_ITEM_NOT_FOUND");
    }
    return prisma_1.prisma.instrumentChecklistItem.update({
        where: { id: itemId },
        data: {
            arquivoPath: payload.arquivoPath,
            arquivoNomeOriginal: payload.arquivoNomeOriginal,
            arquivoMimeType: payload.arquivoMimeType,
            arquivoTamanho: payload.arquivoTamanho,
            uploadedAt: new Date(),
            concluido: true,
            status: client_1.ChecklistItemStatus.CONCLUIDO
        }
    });
};
exports.updateChecklistItemUpload = updateChecklistItemUpload;
const clearChecklistItemUpload = async (instrumentId, itemId) => {
    const existing = await (0, exports.getChecklistItemById)(instrumentId, itemId);
    if (!existing) {
        throw new Error("CHECKLIST_ITEM_NOT_FOUND");
    }
    return prisma_1.prisma.instrumentChecklistItem.update({
        where: { id: itemId },
        data: {
            arquivoPath: null,
            arquivoNomeOriginal: null,
            arquivoMimeType: null,
            arquivoTamanho: null,
            uploadedAt: null,
            concluido: false,
            status: client_1.ChecklistItemStatus.NAO_INICIADO
        }
    });
};
exports.clearChecklistItemUpload = clearChecklistItemUpload;
const listStageFollowUps = async (instrumentId, stage) => {
    return prisma_1.prisma.instrumentStageFollowUp.findMany({
        where: {
            instrumentId,
            etapa: stage
        },
        include: {
            user: {
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    avatarPath: true,
                    updatedAt: true
                }
            },
            files: {
                orderBy: [{ createdAt: "asc" }, { id: "asc" }]
            }
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    });
};
exports.listStageFollowUps = listStageFollowUps;
const createStageFollowUp = async (instrumentId, stage, payload) => {
    const texto = payload.texto?.trim() ?? "";
    if (texto.length === 0 && payload.files.length === 0) {
        throw new Error("STAGE_FOLLOW_UP_EMPTY");
    }
    return prisma_1.prisma.$transaction(async (tx) => {
        const created = await tx.instrumentStageFollowUp.create({
            data: {
                instrumentId,
                etapa: stage,
                texto: texto.length > 0 ? texto : null,
                userId: payload.userId,
                userEmail: payload.userEmail
            }
        });
        if (payload.files.length > 0) {
            await tx.instrumentStageFollowUpFile.createMany({
                data: payload.files.map((file) => ({
                    followUpId: created.id,
                    arquivoPath: file.arquivoPath,
                    arquivoNomeOriginal: file.arquivoNomeOriginal,
                    arquivoMimeType: file.arquivoMimeType,
                    arquivoTamanho: file.arquivoTamanho
                }))
            });
        }
        return tx.instrumentStageFollowUp.findUnique({
            where: { id: created.id },
            include: {
                user: {
                    select: {
                        id: true,
                        nome: true,
                        email: true,
                        avatarPath: true,
                        updatedAt: true
                    }
                },
                files: {
                    orderBy: [{ createdAt: "asc" }, { id: "asc" }]
                }
            }
        });
    });
};
exports.createStageFollowUp = createStageFollowUp;
const getStageFollowUpFileById = async (instrumentId, stage, followUpId, fileId) => {
    return prisma_1.prisma.instrumentStageFollowUpFile.findFirst({
        where: {
            id: fileId,
            followUpId,
            followUp: {
                instrumentId,
                etapa: stage
            }
        },
        include: {
            followUp: {
                select: {
                    id: true,
                    instrumentId: true,
                    etapa: true
                }
            }
        }
    });
};
exports.getStageFollowUpFileById = getStageFollowUpFileById;
const getChecklistSummary = async (instrumentId) => {
    await ensureWorkflowChecklist(instrumentId);
    const [items, instrument] = await Promise.all([
        prisma_1.prisma.instrumentChecklistItem.findMany({ where: { instrumentId } }),
        prisma_1.prisma.instrumentProposal.findUnique({ where: { id: instrumentId }, select: { fluxoTipo: true } })
    ]);
    const stageOrder = getFlowDefinition(instrument?.fluxoTipo ?? client_1.InstrumentFlowType.OBRA).stages;
    const total = items.length;
    const obrigatorios = items.filter((item) => item.obrigatorio).length;
    const concluidos = items.filter(isItemCompleted).length;
    const obrigatoriosConcluidos = items.filter((item) => item.obrigatorio && isItemCompleted(item)).length;
    const stageSummary = stageOrder.map((etapa) => {
        const stageItems = items.filter((item) => item.etapa === etapa);
        const stageMandatory = stageItems.filter((item) => item.obrigatorio);
        const pending = stageMandatory.filter((item) => !isItemCompleted(item)).map((item) => item.nomeDocumento);
        return {
            etapa,
            total: stageItems.length,
            obrigatorios: stageMandatory.length,
            concluidos: stageItems.filter(isItemCompleted).length,
            obrigatorios_concluidos: stageMandatory.filter(isItemCompleted).length,
            concluida: stageMandatory.length > 0 && pending.length === 0,
            pendentes_obrigatorios: pending
        };
    });
    const etapaAtual = stageSummary.find((item) => !item.concluida)?.etapa ?? null;
    const executionRequiredStages = stageOrder.slice(0, 5);
    const podeIniciarExecucao = areStagesCompleted(items, executionRequiredStages);
    const pendentesObrigatorios = stageSummary
        .filter((stage) => executionRequiredStages.includes(stage.etapa))
        .flatMap((stage) => stage.pendentes_obrigatorios);
    return {
        total,
        obrigatorios,
        concluidos,
        obrigatorios_concluidos: obrigatoriosConcluidos,
        pode_iniciar_execucao: obrigatorios > 0 && podeIniciarExecucao,
        pendentes_obrigatorios: pendentesObrigatorios,
        etapa_atual: etapaAtual,
        etapas: stageSummary
    };
};
exports.getChecklistSummary = getChecklistSummary;
const getWorkProgress = async (instrumentId) => {
    const progress = await prisma_1.prisma.instrumentWorkProgress.upsert({
        where: { instrumentId },
        update: {},
        create: {
            instrumentId,
            percentualObra: 0
        }
    });
    const boletins = await prisma_1.prisma.instrumentMeasurementBulletin.findMany({
        where: { instrumentId },
        orderBy: [{ dataBoletim: "desc" }, { id: "desc" }]
    });
    const valorTotalBoletins = boletins.reduce((acc, item) => acc + Number(item.valorMedicao), 0);
    return {
        percentual_obra: Number(progress.percentualObra),
        valor_total_boletins: valorTotalBoletins,
        boletins: boletins.map((item) => ({
            id: item.id,
            data_boletim: item.dataBoletim.toISOString().slice(0, 10),
            valor_medicao: Number(item.valorMedicao),
            percentual_obra_informado: item.percentualObraInformado ? Number(item.percentualObraInformado) : null,
            observacao: item.observacao,
            created_at: item.createdAt.toISOString()
        }))
    };
};
exports.getWorkProgress = getWorkProgress;
const updateWorkProgress = async (instrumentId, input) => {
    const updated = await prisma_1.prisma.instrumentWorkProgress.upsert({
        where: { instrumentId },
        update: {
            percentualObra: input.percentual_obra
        },
        create: {
            instrumentId,
            percentualObra: input.percentual_obra
        }
    });
    return {
        percentual_obra: Number(updated.percentualObra)
    };
};
exports.updateWorkProgress = updateWorkProgress;
const createMeasurementBulletin = async (instrumentId, input) => {
    const created = await prisma_1.prisma.instrumentMeasurementBulletin.create({
        data: {
            instrumentId,
            dataBoletim: new Date(`${input.data_boletim}T00:00:00.000Z`),
            valorMedicao: input.valor_medicao,
            percentualObraInformado: input.percentual_obra_informado,
            observacao: input.observacao
        }
    });
    if (input.percentual_obra_informado !== undefined) {
        await prisma_1.prisma.instrumentWorkProgress.upsert({
            where: { instrumentId },
            update: {
                percentualObra: input.percentual_obra_informado
            },
            create: {
                instrumentId,
                percentualObra: input.percentual_obra_informado
            }
        });
    }
    return {
        id: created.id,
        data_boletim: created.dataBoletim.toISOString().slice(0, 10),
        valor_medicao: Number(created.valorMedicao),
        percentual_obra_informado: created.percentualObraInformado
            ? Number(created.percentualObraInformado)
            : null,
        observacao: created.observacao,
        created_at: created.createdAt.toISOString()
    };
};
exports.createMeasurementBulletin = createMeasurementBulletin;
const deleteMeasurementBulletin = async (instrumentId, boletimId) => {
    const item = await prisma_1.prisma.instrumentMeasurementBulletin.findFirst({
        where: {
            id: boletimId,
            instrumentId
        }
    });
    if (!item) {
        throw new Error("MEASUREMENT_NOT_FOUND");
    }
    await prisma_1.prisma.instrumentMeasurementBulletin.delete({
        where: { id: boletimId }
    });
};
exports.deleteMeasurementBulletin = deleteMeasurementBulletin;
