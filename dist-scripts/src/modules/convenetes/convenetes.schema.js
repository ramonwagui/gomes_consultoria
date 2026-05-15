"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateConveneteSchema = exports.createConveneteSchema = exports.createConveneteFromProponenteSchema = exports.proponenteSugestaoQuerySchema = void 0;
const zod_1 = require("zod");
const cnpjRegex = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/;
const cepRegex = /^\d{5}-?\d{3}$/;
const conveneteBaseSchema = zod_1.z.object({
    nome: zod_1.z.string().min(2).max(160),
    cnpj: zod_1.z.string().regex(cnpjRegex, "CNPJ invalido"),
    endereco: zod_1.z.string().min(3).max(180),
    bairro: zod_1.z.string().min(2).max(120),
    cep: zod_1.z.string().regex(cepRegex, "CEP invalido"),
    uf: zod_1.z.string().trim().toUpperCase().length(2),
    cidade: zod_1.z.string().min(2).max(120),
    tel: zod_1.z.string().min(8).max(24),
    email: zod_1.z.string().email().max(160)
});
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
exports.proponenteSugestaoQuerySchema = zod_1.z.object({
    q: zod_1.z.string().trim().min(2).max(160),
    limit: zod_1.z.coerce.number().int().min(1).max(20).default(10)
});
exports.createConveneteFromProponenteSchema = zod_1.z.object({
    cnpj: zod_1.z.preprocess((value) => {
        if (typeof value !== "string") {
            return value;
        }
        return value.replace(/\D/g, "");
    }, zod_1.z.string().min(11).max(14)),
    nome_proponente: zod_1.z.string().trim().min(2).max(160),
    uf: zod_1.z
        .preprocess((value) => {
        if (value === undefined || value === null) {
            return undefined;
        }
        if (typeof value !== "string") {
            return value;
        }
        return value.trim().toUpperCase();
    }, zod_1.z.string().length(2).optional())
        .optional(),
    cidade: optionalText
});
exports.createConveneteSchema = conveneteBaseSchema;
exports.updateConveneteSchema = conveneteBaseSchema.partial().refine((input) => Object.keys(input).length > 0, {
    message: "Informe ao menos um campo para atualizar"
});
