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

export const simecMunicipiosQuerySchema = z.object({
  uf: z.string().trim().toUpperCase().length(2)
});

export const simecObrasQuerySchema = z.object({
  uf: z.string().trim().toUpperCase().length(2),
  muncod: z.string().trim().min(6).max(12),
  esfera: optionalText,
  tipologia: optionalText,
  obrid: optionalText
});

export const simecObraParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

export type SimecMunicipiosQueryInput = z.infer<typeof simecMunicipiosQuerySchema>;
export type SimecObrasQueryInput = z.infer<typeof simecObrasQuerySchema>;
export type SimecObraParamsInput = z.infer<typeof simecObraParamsSchema>;
