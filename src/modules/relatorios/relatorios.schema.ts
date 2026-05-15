import { z } from "zod";

const instrumentStatusSchema = z.enum([
  "EM_ELABORACAO",
  "ASSINADO",
  "EM_EXECUCAO",
  "VENCIDO",
  "PRESTACAO_PENDENTE",
  "CONCLUIDO"
]);

const optionalDate = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return value;
}, z.string().date().optional());

const optionalPositiveInt = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return value;
}, z.coerce.number().int().positive().optional());

const optionalBooleanFromQuery = z.preprocess((value) => {
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
}, z.boolean().optional());

export const repasseReportQuerySchema = z
  .object({
    convenete_id: z.coerce.number().int().positive(),
    instrumento_id: optionalPositiveInt,
    data_de: optionalDate,
    data_ate: optionalDate
  })
  .refine(
    (value) => {
      if (!value.data_de || !value.data_ate) {
        return true;
      }
      return value.data_de <= value.data_ate;
    },
    {
      message: "data_de deve ser menor ou igual a data_ate",
      path: ["data_ate"]
    }
  );

export type RepasseReportQueryInput = z.infer<typeof repasseReportQuerySchema>;

export const obraReportQuerySchema = z
  .object({
    convenete_id: optionalPositiveInt,
    instrumento_id: optionalPositiveInt,
    concedente: z.string().trim().optional(),
    status: instrumentStatusSchema.optional(),
    ativo: optionalBooleanFromQuery.default(true),
    data_de: optionalDate,
    data_ate: optionalDate
  })
  .refine(
    (value) => {
      if (!value.data_de || !value.data_ate) {
        return true;
      }
      return value.data_de <= value.data_ate;
    },
    {
      message: "data_de deve ser menor ou igual a data_ate",
      path: ["data_ate"]
    }
  );

export type ObraReportQueryInput = z.infer<typeof obraReportQuerySchema>;

const instrumentCodesSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  const rawValues = Array.isArray(value) ? value : [value];
  const parsed = rawValues
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return parsed;
}, z.array(z.string().min(1).max(80)).max(200));

export const andamentoInstrumentosReportQuerySchema = z.object({
  convenete_id: optionalPositiveInt,
  status: instrumentStatusSchema.optional(),
  instrumentos: instrumentCodesSchema
});

export type AndamentoInstrumentosReportQueryInput = z.infer<typeof andamentoInstrumentosReportQuerySchema>;

const cnpjDigitsSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    return value;
  }
  return value.replace(/\D/g, "");
}, z.string().length(14, "Informe um CNPJ valido com 14 digitos"));

const optionalYear = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return value;
}, z.coerce.number().int().min(2000).max(2100).optional());

const optionalPositiveIntWithDefault = (defaultValue: number, min: number, max: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return defaultValue;
    }
    return value;
  }, z.coerce.number().int().min(min).max(max).default(defaultValue));

export const transparenciaReportQuerySchema = z.object({
  cnpj: cnpjDigitsSchema,
  ano: optionalYear,
  ano_pagamento: optionalYear,
  max_paginas_convenios: optionalPositiveIntWithDefault(3, 1, 10),
  max_processos: optionalPositiveIntWithDefault(30, 1, 100)
});

export type TransparenciaReportQueryInput = z.infer<typeof transparenciaReportQuerySchema>;

export const simecReportQuerySchema = z.object({
  uf: z.string().length(2).toUpperCase(),
  municipio: z.string().min(1),
  ano: optionalYear,
  secretaria: z.string().optional()
});

export type SimecReportQueryInput = z.infer<typeof simecReportQuerySchema>;

