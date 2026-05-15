import { TicketPriority, TicketSource, TicketStatus } from "@prisma/client";
import { z } from "zod";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? undefined : value));

const nullableText = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  });

const optionalDateOnly = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? undefined : value))
  .refine((value) => value === undefined || (DATE_ONLY_REGEX.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime())), {
    message: "Data deve estar no formato YYYY-MM-DD"
  });

const nullableDateOnly = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  })
  .refine(
    (value) =>
      value === undefined ||
      value === null ||
      (DATE_ONLY_REGEX.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime())),
    {
    message: "Data deve estar no formato YYYY-MM-DD"
    }
  );

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

const nullablePositiveInt = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }
    if (value === null || value === "") {
      return null;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return Number.NaN;
    }
    return parsed;
  })
  .refine((value) => value === undefined || value === null || Number.isFinite(value), {
    message: "Deve ser um inteiro positivo"
  });

export const ticketStatusSchema = z.nativeEnum(TicketStatus);
export const ticketSourceSchema = z.nativeEnum(TicketSource);
export const ticketPrioritySchema = z.nativeEnum(TicketPriority);

export const ticketIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const ticketListQuerySchema = z.object({
  status: ticketStatusSchema.optional(),
  prioridade: ticketPrioritySchema.optional(),
  origem: ticketSourceSchema.optional(),
  somente_atrasados: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return false;
      }
      if (typeof value === "boolean") {
        return value;
      }
      return value === "true";
    }),
  instrument_id: optionalPositiveInt,
  responsavel_user_id: optionalPositiveInt,
  q: optionalText
});

export const createTicketSchema = z.object({
  titulo: z.string().trim().min(3).max(160),
  descricao: optionalText,
  status: ticketStatusSchema.default(TicketStatus.ABERTO),
  prioridade: ticketPrioritySchema.default(TicketPriority.MEDIA),
  prazo_alvo: optionalDateOnly,
  motivo_resolucao: optionalText.refine((value) => value === undefined || value.length >= 8, {
    message: "Motivo de resolucao deve ter pelo menos 8 caracteres"
  }),
  instrument_id: optionalPositiveInt,
  instrumento_informado: optionalText,
  responsavel_user_id: optionalPositiveInt
});

export const updateTicketSchema = z
  .object({
    titulo: z.string().trim().min(3).max(160).optional(),
    descricao: nullableText,
    status: ticketStatusSchema.optional(),
    prioridade: ticketPrioritySchema.optional(),
    prazo_alvo: nullableDateOnly,
    motivo_resolucao: nullableText.refine((value) => value === undefined || value === null || value.length >= 8, {
      message: "Motivo de resolucao deve ter pelo menos 8 caracteres"
    }),
    instrument_id: nullablePositiveInt,
    instrumento_informado: nullableText,
    responsavel_user_id: nullablePositiveInt
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Informe ao menos um campo para atualizar"
  });

export const addTicketCommentSchema = z.object({
  mensagem: z.string().trim().min(2).max(2000)
});

export const ticketChecklistItemIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  itemId: z.coerce.number().int().positive()
});

export const toggleTicketChecklistItemSchema = z.object({
  concluido: z.boolean()
});

export const associateTicketInstrumentSchema = z.object({
  instrument_id: z.number().int().positive()
});

export type TicketListQueryInput = z.infer<typeof ticketListQuerySchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type AddTicketCommentInput = z.infer<typeof addTicketCommentSchema>;
export type ToggleTicketChecklistItemInput = z.infer<typeof toggleTicketChecklistItemSchema>;
export type AssociateTicketInstrumentInput = z.infer<typeof associateTicketInstrumentSchema>;
