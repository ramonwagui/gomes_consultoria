import { z } from "zod";

const optionalText = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

const optionalCnpjCpf = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    return value;
  }
  const digits = value.replace(/\D/g, "");
  return digits === "" ? undefined : digits;
}, z.string().min(11).max(14).optional());

const optionalUf = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim().toUpperCase();
  return trimmed === "" ? undefined : trimmed;
}, z.string().length(2).optional());

const optionalYear = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return value;
}, z.coerce.number().int().min(2000).max(2100).optional());

const optionalTipoEnte = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim().toLowerCase();
  return trimmed === "" ? undefined : trimmed;
}, z.enum(["estado", "municipio"]).optional());

const optionalVigenciaDias = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return value;
}, z.coerce.number().int().refine((days) => [30, 60, 90].includes(days), "Informe 30, 60 ou 90 dias").optional());

const coerceBooleanWithDefault = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return defaultValue;
    }
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "sim", "yes", "y"].includes(normalized)) {
        return true;
      }
      if (["false", "0", "nao", "nÃ£o", "no", "n"].includes(normalized)) {
        return false;
      }
    }
    return value;
  }, z.boolean().default(defaultValue));

export const transferenciaDiscricionariaQuerySchema = z.object({
  cnpj: optionalCnpjCpf,
  nome_proponente: optionalText,
  concedente: optionalText,
  uf: optionalUf,
  municipio: optionalText,
  ano: optionalYear,
  situacao_proposta: optionalText,
  situacao_convenio: optionalText,
  nr_convenio: optionalText,
  nr_proposta: optionalText,
  tipo_ente: optionalTipoEnte,
  vigencia_a_vencer_dias: optionalVigenciaDias,
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20)
});

export const sincronizarTransferenciasDiscricionariasBodySchema = z.object({
  force: coerceBooleanWithDefault(false),
  mode: z.enum(["full", "light"]).optional().default("full")
});

export const sugestaoProponentePorCnpjQuerySchema = z.object({
  cnpj: z
    .preprocess((value) => {
      if (value === undefined || value === null) {
        return "";
      }
      if (typeof value !== "string") {
        return value;
      }
      return value.replace(/\D/g, "").trim();
    }, z.string())
    .default(""),
  limit: z.coerce.number().int().min(1).max(20).default(10)
});

export const transferenciaDiscricionariaDesembolsoQuerySchema = z.object({
  nr_convenio: z.preprocess((value) => {
    if (value === undefined || value === null) {
      return value;
    }
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().min(1, "nr_convenio e obrigatorio")),
  ano: optionalYear,
  mes: z.coerce.number().int().min(1).max(12).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(200).default(50)
});

export const transferenciaDiscricionariaDesembolsoProponenteQuerySchema = z
  .object({
    cnpj: optionalCnpjCpf,
    nome_proponente: optionalText,
    ano: optionalYear,
    mes: z.coerce.number().int().min(1).max(12).optional(),
    page: z.coerce.number().int().min(1).default(1),
    page_size: z.coerce.number().int().min(1).max(500).default(100)
  })
  .refine((input) => Boolean(input.cnpj || input.nome_proponente), {
    message: "Informe cnpj ou nome_proponente",
    path: ["cnpj"]
  });

export type TransferenciaDiscricionariaQueryInput = z.infer<typeof transferenciaDiscricionariaQuerySchema>;
export type SincronizarTransferenciasDiscricionariasBodyInput = z.infer<
  typeof sincronizarTransferenciasDiscricionariasBodySchema
>;
export type SugestaoProponentePorCnpjQueryInput = z.infer<typeof sugestaoProponentePorCnpjQuerySchema>;
export type TransferenciaDiscricionariaDesembolsoQueryInput = z.infer<
  typeof transferenciaDiscricionariaDesembolsoQuerySchema
>;
export type TransferenciaDiscricionariaDesembolsoProponenteQueryInput = z.infer<
  typeof transferenciaDiscricionariaDesembolsoProponenteQuerySchema
>;

