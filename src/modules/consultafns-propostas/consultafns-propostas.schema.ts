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

const optionalYear = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return value;
}, z.coerce.number().int().min(1998).max(2100).optional());

export const consultaFnsMunicipiosQuerySchema = z.object({
  uf: z.string().trim().toUpperCase().length(2)
});

export const consultaFnsPropostasQuerySchema = z.object({
  ano: optionalYear,
  uf: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
    z.string().length(2).optional()
  ),
  co_municipio_ibge: optionalText,
  nu_proposta: optionalText,
  tp_proposta: optionalText,
  tp_recurso: optionalText,
  tp_emenda: optionalText,
  page: z.coerce.number().int().min(1).default(1),
  count: z.coerce.number().int().min(1).max(100).default(20)
});

export const consultaFnsSyncBodySchema = z.object({
  ano: optionalYear,
  pages_max: z.coerce.number().int().min(1).max(50).default(3),
  count: z.coerce.number().int().min(1).max(100).default(30)
});

export type ConsultaFnsMunicipiosQueryInput = z.infer<typeof consultaFnsMunicipiosQuerySchema>;
export type ConsultaFnsPropostasQueryInput = z.infer<typeof consultaFnsPropostasQuerySchema>;
export type ConsultaFnsSyncBodyInput = z.infer<typeof consultaFnsSyncBodySchema>;
