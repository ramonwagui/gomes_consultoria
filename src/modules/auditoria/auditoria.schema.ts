import { AuditAction } from "@prisma/client";
import { z } from "zod";

export const listAuditQuerySchema = z.object({
  instrumento_id: z.coerce.number().int().positive().optional(),
  acao: z.nativeEnum(AuditAction).optional(),
  limite: z.coerce.number().int().min(1).max(500).default(100)
});

export type ListAuditQueryInput = z.infer<typeof listAuditQuerySchema>;
