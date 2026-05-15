"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferenciaDiscricionariaDesembolsoProponenteQuerySchema = exports.transferenciaDiscricionariaDesembolsoQuerySchema = exports.sugestaoProponentePorCnpjQuerySchema = exports.sincronizarTransferenciasDiscricionariasBodySchema = exports.transferenciaDiscricionariaQuerySchema = void 0;
const zod_1 = require("zod");
const optionalText = zod_1.z.preprocess((value) => {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (typeof value !== "string") {
        return value;
    }
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
}, zod_1.z.string().optional());
const optionalCnpjCpf = zod_1.z.preprocess((value) => {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (typeof value !== "string") {
        return value;
    }
    const digits = value.replace(/\D/g, "");
    return digits === "" ? undefined : digits;
}, zod_1.z.string().min(11).max(14).optional());
const optionalUf = zod_1.z.preprocess((value) => {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (typeof value !== "string") {
        return value;
    }
    const trimmed = value.trim().toUpperCase();
    return trimmed === "" ? undefined : trimmed;
}, zod_1.z.string().length(2).optional());
const optionalYear = zod_1.z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    return value;
}, zod_1.z.coerce.number().int().min(2000).max(2100).optional());
const optionalTipoEnte = zod_1.z.preprocess((value) => {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (typeof value !== "string") {
        return value;
    }
    const trimmed = value.trim().toLowerCase();
    return trimmed === "" ? undefined : trimmed;
}, zod_1.z.enum(["estado", "municipio"]).optional());
const optionalVigenciaDias = zod_1.z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    return value;
}, zod_1.z.coerce.number().int().refine((days) => [30, 60, 90].includes(days), "Informe 30, 60 ou 90 dias").optional());
exports.transferenciaDiscricionariaQuerySchema = zod_1.z.object({
    cnpj: optionalCnpjCpf,
    nome_proponente: optionalText,
    uf: optionalUf,
    municipio: optionalText,
    ano: optionalYear,
    situacao_proposta: optionalText,
    situacao_convenio: optionalText,
    nr_convenio: optionalText,
    nr_proposta: optionalText,
    tipo_ente: optionalTipoEnte,
    vigencia_a_vencer_dias: optionalVigenciaDias,
    page: zod_1.z.coerce.number().int().min(1).default(1),
    page_size: zod_1.z.coerce.number().int().min(1).max(100).default(20)
});
exports.sincronizarTransferenciasDiscricionariasBodySchema = zod_1.z.object({
    force: zod_1.z.coerce.boolean().optional().default(false)
});
exports.sugestaoProponentePorCnpjQuerySchema = zod_1.z.object({
    cnpj: zod_1.z
        .preprocess((value) => {
        if (value === undefined || value === null) {
            return "";
        }
        if (typeof value !== "string") {
            return value;
        }
        return value.replace(/\D/g, "").trim();
    }, zod_1.z.string())
        .default(""),
    limit: zod_1.z.coerce.number().int().min(1).max(20).default(10)
});
exports.transferenciaDiscricionariaDesembolsoQuerySchema = zod_1.z.object({
    nr_convenio: zod_1.z.preprocess((value) => {
        if (value === undefined || value === null) {
            return value;
        }
        if (typeof value !== "string") {
            return value;
        }
        const trimmed = value.trim();
        return trimmed === "" ? undefined : trimmed;
    }, zod_1.z.string().min(1, "nr_convenio e obrigatorio")),
    ano: optionalYear,
    mes: zod_1.z.coerce.number().int().min(1).max(12).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    page_size: zod_1.z.coerce.number().int().min(1).max(200).default(50)
});
exports.transferenciaDiscricionariaDesembolsoProponenteQuerySchema = zod_1.z
    .object({
    cnpj: optionalCnpjCpf,
    nome_proponente: optionalText,
    ano: optionalYear,
    mes: zod_1.z.coerce.number().int().min(1).max(12).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    page_size: zod_1.z.coerce.number().int().min(1).max(500).default(100)
})
    .refine((input) => Boolean(input.cnpj || input.nome_proponente), {
    message: "Informe cnpj ou nome_proponente",
    path: ["cnpj"]
});
