import { PaymentRequestStatus } from "@prisma/client";
import { z } from "zod";

const money = z.coerce.number().finite().min(0);
const aliquota = z.coerce.number().finite().min(0).max(100);

export const createPaymentRequestSchema = z.object({
  instrumento_id: z.coerce.number().int().positive(),
  valor_nota: money,
  valor_bm: money,
  numero_bm: z.string().trim().min(1).max(80),
  impostos: z
    .object({
      inss: z.object({ selecionado: z.boolean().optional(), valor: money.optional(), aliquota: aliquota.optional() }).optional(),
      iss: z.object({ selecionado: z.boolean().optional(), valor: money.optional(), aliquota: aliquota.optional() }).optional(),
      pis: z.object({ selecionado: z.boolean().optional(), valor: money.optional(), aliquota: aliquota.optional() }).optional(),
      cofins: z.object({ selecionado: z.boolean().optional(), valor: money.optional(), aliquota: aliquota.optional() }).optional(),
      ir: z.object({ selecionado: z.boolean().optional(), valor: money.optional(), aliquota: aliquota.optional() }).optional()
    })
    .optional()
    .default({}),
  observacoes: z.string().trim().max(1000).optional()
});

export const paymentRequestListQuerySchema = z.object({
  status: z.nativeEnum(PaymentRequestStatus).optional(),
  proponente_id: z.coerce.number().int().positive().optional(),
  instrumento_id: z.coerce.number().int().positive().optional()
});

export const updatePaymentRequestStatusSchema = z.object({
  status: z.nativeEnum(PaymentRequestStatus)
});

export const paymentRequestIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export type CreatePaymentRequestInput = z.infer<typeof createPaymentRequestSchema>;
export type PaymentRequestListQueryInput = z.infer<typeof paymentRequestListQuerySchema>;
