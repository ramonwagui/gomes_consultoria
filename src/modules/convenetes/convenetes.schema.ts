import { z } from "zod";

const cnpjRegex = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/;
const cepRegex = /^\d{5}-?\d{3}$/;

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

const conveneteBaseSchema = z.object({
  nome: z.string().min(2).max(160),
  cnpj: z.string().regex(cnpjRegex, "CNPJ invalido"),
  endereco: z.string().min(3).max(180),
  numero: optionalText,
  complemento: optionalText,
  bairro: z.string().min(2).max(120),
  cep: optionalText,
  uf: z.string().trim().toUpperCase().length(2),
  cidade: z.string().min(2).max(120),
  tel: optionalText,
  email: optionalText,
  gestorNome: optionalText,
  gestorCpf: optionalText,
  gestorRg: optionalText,
  gestorEndereco: optionalText,
  gestorEmail: optionalText
});

export const proponenteSugestaoQuerySchema = z.object({
  q: z.string().trim().min(2).max(160),
  limit: z.coerce.number().int().min(1).max(20).default(10)
});

export const createConveneteFromProponenteSchema = z.object({
  cnpj: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }
    return value.replace(/\D/g, "");
  }, z.string().min(11).max(14)),
  nome_proponente: z.string().trim().min(2).max(160),
  uf: z
    .preprocess((value) => {
      if (value === undefined || value === null) {
        return undefined;
      }
      if (typeof value !== "string") {
        return value;
      }
      return value.trim().toUpperCase();
    }, z.string().length(2).optional())
    .optional(),
  cidade: optionalText
});

export const createConveneteSchema = conveneteBaseSchema;

export const updateConveneteSchema = conveneteBaseSchema.partial().refine((input) => Object.keys(input).length > 0, {
  message: "Informe ao menos um campo para atualizar"
});

export type CreateConveneteInput = z.infer<typeof createConveneteSchema>;
export type UpdateConveneteInput = z.infer<typeof updateConveneteSchema>;
export type ProponenteSugestaoQueryInput = z.infer<typeof proponenteSugestaoQuerySchema>;
export type CreateConveneteFromProponenteInput = z.infer<typeof createConveneteFromProponenteSchema>;
