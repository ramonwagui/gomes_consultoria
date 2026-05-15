import { DocumentoAuditAction, DocumentoAreaStatus } from "@prisma/client";
import { z } from "zod";

const optionalPositiveInt = z
  .union([z.string(), z.number(), z.undefined(), z.null()])
  .transform((value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    if (typeof value === "string" && !/^\d+$/.test(value.trim())) {
      return NaN;
    }
    return Number(value);
  })
  .pipe(z.number({ invalid_type_error: "Informe um numero valido." }).int().positive().optional());

export const listDocumentosQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z.nativeEnum(DocumentoAreaStatus).optional(),
  instrumento_id: optionalPositiveInt,
  proponente_id: optionalPositiveInt,
  usuario_id: optionalPositiveInt,
  data_de: z.string().trim().optional(),
  data_ate: z.string().trim().optional(),
  limite: z.coerce.number().int().positive().max(200).default(100)
});

export const searchDocumentosQuerySchema = z.object({
  q: z.string().trim().min(2, "Informe pelo menos 2 caracteres para buscar."),
  limite: z.coerce.number().int().positive().max(100).default(50)
});

export const documentoIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const updateDocumentoSchema = z.object({
  nome_atual: z.string().trim().min(1).max(240).optional(),
  instrumento_id: optionalPositiveInt.nullish(),
  proponente_id: optionalPositiveInt.nullish()
});

export const listDocumentoAuditQuerySchema = z.object({
  documento_id: optionalPositiveInt,
  usuario_id: optionalPositiveInt,
  arquivo: z.string().trim().optional(),
  acao: z.nativeEnum(DocumentoAuditAction).optional(),
  data_de: z.string().trim().optional(),
  data_ate: z.string().trim().optional(),
  limite: z.coerce.number().int().positive().max(500).default(200)
});

export const createExternalRequestSchema = z.object({
  titulo: z.string().trim().min(2).max(180),
  descricao: z.string().trim().max(1000).optional().nullable(),
  permanente: z.boolean().default(false),
  expira_em: z.string().datetime().optional().nullable(),
  permitir_reenvio: z.boolean().default(false),
  max_usos: z.coerce.number().int().min(1).max(1000).optional()
});

export const updateExternalRequestSchema = z.object({
  permanente: z.boolean().default(false),
  expira_em: z.string().datetime().optional().nullable()
});

export const externalTokenParamSchema = z.object({
  token: z.string().trim().min(24).max(160)
});

export const externalUploadBodySchema = z.object({
  nome_completo: z.string().trim().min(3).max(160),
  cpf: z.string().trim().min(11).max(18)
});

export type ListDocumentosQueryInput = z.infer<typeof listDocumentosQuerySchema>;
export type SearchDocumentosQueryInput = z.infer<typeof searchDocumentosQuerySchema>;
export type UpdateDocumentoInput = z.infer<typeof updateDocumentoSchema>;
export type ListDocumentoAuditQueryInput = z.infer<typeof listDocumentoAuditQuerySchema>;
export type CreateExternalRequestInput = z.infer<typeof createExternalRequestSchema>;
export type UpdateExternalRequestInput = z.infer<typeof updateExternalRequestSchema>;
