import { z } from "zod";

const optionalPositiveInt = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return Number.NaN;
    }
    return parsed;
  })
  .refine((value) => value === undefined || Number.isFinite(value), {
    message: "Deve ser um inteiro positivo"
  });

const dateOnly = z.string().trim().date();

export const listEmendasEstaduaisQuerySchema = z.object({
  q: z.string().trim().optional(),
  municipio_id: optionalPositiveInt
});

export const createEmendaEstadualSchema = z
  .object({
    objeto: z.string().trim().min(3).max(2000),
    numero: z.string().trim().min(2).max(120),
    parlamentar: z.string().trim().min(3).max(180),
    vigencia_inicio: dateOnly,
    vigencia_fim: dateOnly,
    valor: z.coerce.number().nonnegative(),
    contrapartida: z.coerce.number().nonnegative(),
    municipio_ids: z.array(z.number().int().positive()).min(1).max(100)
  })
  .refine((value) => value.vigencia_inicio <= value.vigencia_fim, {
    message: "vigencia_inicio deve ser menor ou igual a vigencia_fim",
    path: ["vigencia_fim"]
  });

export const updateEmendaEstadualSchema = createEmendaEstadualSchema;

export const emendaEstadualIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const emendaEstadualDocumentoIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  documentoId: z.coerce.number().int().positive()
});

export type ListEmendasEstaduaisQueryInput = z.infer<typeof listEmendasEstaduaisQuerySchema>;
export type CreateEmendaEstadualInput = z.infer<typeof createEmendaEstadualSchema>;
export type UpdateEmendaEstadualInput = z.infer<typeof updateEmendaEstadualSchema>;
