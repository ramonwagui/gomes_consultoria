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

const optionalCnpj = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    return value;
  }
  const digits = value.replace(/\D/g, "");
  return digits === "" ? undefined : digits;
}, z.string().length(14).optional());

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
}, z.coerce.number().int().min(2019).max(2100).optional());

const arrayOrCommaSeparated = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value
      .flatMap((v) => String(v).split(","))
      .map((v) => v.trim())
      .filter((v) => v !== "");
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v !== "");
  }
  return [String(value)];
}, z.array(z.string()).optional());

export const planoAcaoEspecialQuerySchema = z.object({
  cnpj: optionalCnpj,
  nome_beneficiario: optionalText,
  uf: optionalUf,
  ano: optionalYear,
  situacao: arrayOrCommaSeparated,
  pagamento: z.enum(["pago", "nao_pago"]).optional(),
  codigo_plano_acao: optionalText,
  parlamentar: optionalText,
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20)
});

export const sincronizarTransferenciasEspeciaisPorCnpjSchema = z.object({
  cnpj: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }
    return value.replace(/\D/g, "");
  }, z.string().length(14))
});

export type PlanoAcaoEspecialQueryInput = z.infer<typeof planoAcaoEspecialQuerySchema>;
export type SincronizarTransferenciasEspeciaisPorCnpjInput = z.infer<
  typeof sincronizarTransferenciasEspeciaisPorCnpjSchema
>;
