"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repasseIdParamSchema = exports.repasseCreateSchema = exports.measurementIdParamSchema = exports.measurementCreateSchema = exports.workProgressUpdateSchema = exports.stageFollowUpCreateSchema = exports.stageFollowUpFileIdParamSchema = exports.stageFollowUpIdParamSchema = exports.stageParamSchema = exports.checklistExternalFileIdParamSchema = exports.checklistExternalUploadBodySchema = exports.checklistExternalLinkTokenParamSchema = exports.checklistExternalLinkCreateSchema = exports.checklistItemIdParamSchema = exports.checklistItemUpdateSchema = exports.checklistItemCreateSchema = exports.alertQuerySchema = exports.listQuerySchema = exports.updateInstrumentSchema = exports.createInstrumentSchema = exports.checklistItemStatusSchema = exports.workflowStageSchema = exports.instrumentFlowTypeSchema = exports.instrumentStatusSchema = void 0;
const zod_1 = require("zod");
exports.instrumentStatusSchema = zod_1.z.enum([
    "EM_ELABORACAO",
    "ASSINADO",
    "EM_EXECUCAO",
    "VENCIDO",
    "PRESTACAO_PENDENTE",
    "CONCLUIDO"
]);
exports.instrumentFlowTypeSchema = zod_1.z.enum([
    "OBRA",
    "AQUISICAO_EQUIPAMENTOS",
    "EVENTOS"
]);
exports.workflowStageSchema = zod_1.z.enum([
    "PROPOSTA",
    "REQUISITOS_CELEBRACAO",
    "PROJETO_BASICO_TERMO_REFERENCIA",
    "PROCESSO_EXECUCAO_LICITACAO",
    "VERIFICACAO_PROCESSO_LICITATORIO",
    "INSTRUMENTOS_CONTRATUAIS",
    "ACOMPANHAMENTO_OBRA"
]);
exports.checklistItemStatusSchema = zod_1.z.enum([
    "NAO_INICIADO",
    "EM_ELABORACAO",
    "CONCLUIDO",
    "ACEITO"
]);
const dateString = zod_1.z.string().date();
const optionalText = zod_1.z.preprocess((value) => {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (typeof value !== "string") {
        return value;
    }
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
}, zod_1.z.string().optional());
const optionalDateString = zod_1.z.preprocess((value) => {
    if (value === null || value === undefined || value === "") {
        return undefined;
    }
    return value;
}, dateString.optional());
const optionalConveneteId = zod_1.z.preprocess((value) => {
    if (value === null || value === undefined || value === "") {
        return undefined;
    }
    return value;
}, zod_1.z.coerce.number().int().positive().optional());
const optionalMoney = zod_1.z.preprocess((value) => {
    if (value === null || value === undefined || value === "") {
        return undefined;
    }
    return value;
}, zod_1.z.coerce.number().min(0).optional());
const optionalBooleanFromQuery = zod_1.z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    if (typeof value === "boolean") {
        return value;
    }
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true" || normalized === "1") {
            return true;
        }
        if (normalized === "false" || normalized === "0") {
            return false;
        }
    }
    return value;
}, zod_1.z.boolean().optional());
const instrumentBaseSchema = zod_1.z.object({
    proposta: zod_1.z.string().min(1).max(40),
    instrumento: zod_1.z.string().min(1).max(40),
    objeto: zod_1.z.string().min(3),
    valor_repasse: zod_1.z.coerce.number().min(0),
    valor_contrapartida: zod_1.z.coerce.number().min(0),
    data_cadastro: dateString,
    data_assinatura: optionalDateString,
    vigencia_inicio: dateString,
    vigencia_fim: dateString,
    data_prestacao_contas: optionalDateString,
    data_dou: optionalDateString,
    concedente: zod_1.z.string().min(2).max(120),
    banco: optionalText,
    agencia: optionalText,
    conta: optionalText,
    convenete_id: optionalConveneteId,
    fluxo_tipo: exports.instrumentFlowTypeSchema.default("OBRA"),
    status: exports.instrumentStatusSchema.default("EM_ELABORACAO"),
    responsavel: optionalText,
    orgao_executor: optionalText,
    empresa_vencedora: optionalText,
    cnpj_vencedora: optionalText,
    valor_vencedor: optionalMoney,
    observacoes: optionalText
});
exports.createInstrumentSchema = instrumentBaseSchema.superRefine((input, ctx) => {
    const vigenciaInicio = new Date(input.vigencia_inicio);
    const vigenciaFim = new Date(input.vigencia_fim);
    if (vigenciaFim < vigenciaInicio) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["vigencia_fim"],
            message: "vigencia_fim deve ser maior ou igual a vigencia_inicio"
        });
    }
    if (input.data_assinatura && new Date(input.data_assinatura) > new Date()) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["data_assinatura"],
            message: "data_assinatura nao pode ser futura"
        });
    }
});
exports.updateInstrumentSchema = instrumentBaseSchema.partial().extend({
    ativo: zod_1.z.boolean().optional()
});
exports.listQuerySchema = zod_1.z.object({
    status: exports.instrumentStatusSchema.optional(),
    concedente: zod_1.z.string().optional(),
    convenete_id: optionalConveneteId,
    sync_repasses_desembolsos: optionalBooleanFromQuery.default(false),
    ativo: optionalBooleanFromQuery.default(true),
    vigencia_de: dateString.optional(),
    vigencia_ate: dateString.optional()
});
exports.alertQuerySchema = zod_1.z.object({
    limite_dias: zod_1.z.coerce.number().int().min(1).max(365).default(30)
});
exports.checklistItemCreateSchema = zod_1.z.object({
    nome_documento: zod_1.z.string().min(3).max(180),
    etapa: exports.workflowStageSchema.optional().default("PROPOSTA"),
    status: exports.checklistItemStatusSchema.optional().default("NAO_INICIADO"),
    obrigatorio: zod_1.z.boolean().optional().default(true),
    observacao: optionalText,
    ordem: zod_1.z.coerce.number().int().min(0).optional()
});
exports.checklistItemUpdateSchema = exports.checklistItemCreateSchema.partial();
exports.checklistItemIdParamSchema = zod_1.z.object({
    itemId: zod_1.z.coerce.number().int().positive()
});
exports.checklistExternalLinkCreateSchema = zod_1.z.object({
    validade_dias: zod_1.z.coerce.number().int().min(1).max(30).default(7)
});
exports.checklistExternalLinkTokenParamSchema = zod_1.z.object({
    token: zod_1.z.string().min(20).max(200)
});
exports.checklistExternalUploadBodySchema = zod_1.z.object({
    nome_remetente: zod_1.z.string().min(2).max(120)
});
exports.checklistExternalFileIdParamSchema = zod_1.z.object({
    fileId: zod_1.z.coerce.number().int().positive()
});
exports.stageParamSchema = zod_1.z.object({
    stage: exports.workflowStageSchema
});
exports.stageFollowUpIdParamSchema = zod_1.z.object({
    followUpId: zod_1.z.coerce.number().int().positive()
});
exports.stageFollowUpFileIdParamSchema = zod_1.z.object({
    fileId: zod_1.z.coerce.number().int().positive()
});
exports.stageFollowUpCreateSchema = zod_1.z
    .object({
    texto: optionalText
})
    .refine((payload) => (payload.texto ?? "").trim().length > 0, {
    message: "Informe um texto ou envie ao menos um arquivo para registrar acompanhamento.",
    path: ["texto"]
});
exports.workProgressUpdateSchema = zod_1.z.object({
    percentual_obra: zod_1.z.coerce.number().min(0).max(100)
});
exports.measurementCreateSchema = zod_1.z.object({
    data_boletim: dateString,
    valor_medicao: zod_1.z.coerce.number().min(0),
    percentual_obra_informado: zod_1.z.coerce.number().min(0).max(100).optional(),
    observacao: optionalText
});
exports.measurementIdParamSchema = zod_1.z.object({
    boletimId: zod_1.z.coerce.number().int().positive()
});
exports.repasseCreateSchema = zod_1.z.object({
    data_repasse: dateString,
    valor_repasse: zod_1.z.coerce.number().min(0)
});
exports.repasseIdParamSchema = zod_1.z.object({
    repasseId: zod_1.z.coerce.number().int().positive()
});
