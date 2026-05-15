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

const optionalPositiveNumber = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
}, z.coerce.number().int().positive().optional());

export const simecTermosMunicipiosQuerySchema = z.object({
  uf: z.string().trim().toUpperCase().length(2)
});

export const simecTermosListQuerySchema = z
  .object({
    dotid_inicio: optionalPositiveNumber,
    dotid_fim: optionalPositiveNumber,
    cursor: optionalPositiveNumber,
    limite: z.coerce.number().int().positive().max(300).default(100),
    ano: z.coerce.number().int().min(2010).max(2100).optional(),
    secretaria: z.enum(["E", "M"]).optional(),
    uf: z.string().trim().toUpperCase().length(2).optional(),
    q: optionalText
  })
  .superRefine((value, ctx) => {
    const inicioBase = value.dotid_inicio ?? 1;
    const fimBase = value.dotid_fim ?? inicioBase + value.limite - 1;
    const inicio = Math.min(inicioBase, fimBase);
    const fim = Math.max(inicioBase, fimBase);
    const total = fim - inicio + 1;

    if (total > 300) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dotid_fim"],
        message: "A consulta aceita no maximo 300 dotids por vez."
      });
    }
  });

export const simecTermoParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

export type SimecTermosMunicipiosQueryInput = z.infer<typeof simecTermosMunicipiosQuerySchema>;
export type SimecTermosListQueryInput = z.infer<typeof simecTermosListQuerySchema>;
export type SimecTermoParamsInput = z.infer<typeof simecTermoParamsSchema>;
