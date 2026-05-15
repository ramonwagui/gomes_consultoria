import { z } from "zod";

export const instrumentStatusSchema = z.enum([
  "EM_ELABORACAO",
  "ASSINADO",
  "EM_EXECUCAO",
  "VENCIDO",
  "PRESTACAO_PENDENTE",
  "CONCLUIDO"
]);

export const instrumentFlowTypeSchema = z.enum([
  "OBRA",
  "AQUISICAO_EQUIPAMENTOS",
  "EVENTOS"
]);

export const workflowStageSchema = z.enum([
  "PROPOSTA",
  "REQUISITOS_CELEBRACAO",
  "PROJETO_BASICO_TERMO_REFERENCIA",
  "PROCESSO_EXECUCAO_LICITACAO",
  "VERIFICACAO_PROCESSO_LICITATORIO",
  "INSTRUMENTOS_CONTRATUAIS",
  "ACOMPANHAMENTO_OBRA"
]);

export const checklistItemStatusSchema = z.enum([
  "NAO_INICIADO",
  "EM_ELABORACAO",
  "CONCLUIDO",
  "ACEITO"
]);

const dateString = z.string().date();

const optionalText = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

const optionalDateString = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  return value;
}, dateString.optional());

const optionalConveneteId = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  return value;
}, z.coerce.number().int().positive().optional());

const optionalMoney = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  return value;
}, z.coerce.number().min(0).optional());

const optionalBooleanFromQuery = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }

  return value;
}, z.boolean().optional());

const instrumentBaseSchema = z.object({
  proposta: z.string().min(1).max(40),
  instrumento: z.string().min(1).max(40),
  objeto: z.string().min(3),
  valor_repasse: z.coerce.number().min(0),
  valor_contrapartida: z.coerce.number().min(0),
  data_cadastro: dateString,
  data_assinatura: optionalDateString,
  vigencia_inicio: dateString,
  vigencia_fim: dateString,
  data_prestacao_contas: optionalDateString,
  data_dou: optionalDateString,
  concedente: z.string().min(2).max(120),
  banco: optionalText,
  agencia: optionalText,
  conta: optionalText,
  convenete_id: optionalConveneteId,
  fluxo_tipo: instrumentFlowTypeSchema.default("OBRA"),
  status: instrumentStatusSchema.default("EM_ELABORACAO"),
  responsavel: optionalText,
  orgao_executor: optionalText,
  empresa_vencedora: optionalText,
  cnpj_vencedora: optionalText,
  valor_vencedor: optionalMoney,
  observacoes: optionalText
});

export const createInstrumentSchema = instrumentBaseSchema.superRefine((input, ctx) => {
    const vigenciaInicio = new Date(input.vigencia_inicio);
    const vigenciaFim = new Date(input.vigencia_fim);

    if (vigenciaFim < vigenciaInicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vigencia_fim"],
        message: "vigencia_fim deve ser maior ou igual a vigencia_inicio"
      });
    }

    if (input.data_assinatura && new Date(input.data_assinatura) > new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["data_assinatura"],
        message: "data_assinatura nao pode ser futura"
      });
    }
});

export const updateInstrumentSchema = instrumentBaseSchema.partial().extend({
  ativo: z.boolean().optional()
});

export const listQuerySchema = z.object({
  status: instrumentStatusSchema.optional(),
  concedente: z.string().optional(),
  convenete_id: optionalConveneteId,
  incluir_especiais: optionalBooleanFromQuery.default(false),
  sync_repasses_desembolsos: optionalBooleanFromQuery.default(false),
  ativo: optionalBooleanFromQuery.default(true),
  vigencia_de: dateString.optional(),
  vigencia_ate: dateString.optional()
});

export const alertQuerySchema = z.object({
  limite_dias: z.coerce.number().int().min(1).max(365).default(30)
});

export const checklistItemCreateSchema = z.object({
  nome_documento: z.string().min(3).max(180),
  etapa: workflowStageSchema.optional().default("PROPOSTA"),
  status: checklistItemStatusSchema.optional().default("NAO_INICIADO"),
  obrigatorio: z.boolean().optional().default(true),
  observacao: optionalText,
  ordem: z.coerce.number().int().min(0).optional()
});

export const checklistItemUpdateSchema = checklistItemCreateSchema.partial();

export const checklistItemIdParamSchema = z.object({
  itemId: z.coerce.number().int().positive()
});

export const checklistExternalLinkCreateSchema = z.object({
  validade_dias: z.coerce.number().int().min(1).max(30).default(7)
});

export const checklistExternalLinkTokenParamSchema = z.object({
  token: z.string().min(20).max(200)
});

export const checklistExternalUploadBodySchema = z.object({
  nome_remetente: z.string().min(2).max(120)
});

export const checklistExternalFileIdParamSchema = z.object({
  fileId: z.coerce.number().int().positive()
});

export const stageParamSchema = z.object({
  stage: workflowStageSchema
});

export const stageFollowUpIdParamSchema = z.object({
  followUpId: z.coerce.number().int().positive()
});

export const stageFollowUpFileIdParamSchema = z.object({
  fileId: z.coerce.number().int().positive()
});

export const stageFollowUpCreateSchema = z
  .object({
    texto: optionalText
  })
  .refine((payload) => (payload.texto ?? "").trim().length > 0, {
    message: "Informe um texto ou envie ao menos um arquivo para registrar acompanhamento.",
    path: ["texto"]
  });

export const stageFollowUpUpdateSchema = z
  .object({
    texto: optionalText
  })
  .refine((payload) => (payload.texto ?? "").trim().length > 0, {
    message: "Informe um texto valido para atualizar o acompanhamento.",
    path: ["texto"]
  });

export const workProgressUpdateSchema = z.object({
  percentual_obra: z.coerce.number().min(0).max(100)
});

export const measurementCreateSchema = z.object({
  data_boletim: dateString,
  valor_medicao: z.coerce.number().min(0),
  percentual_obra_informado: z.coerce.number().min(0).max(100).optional(),
  observacao: optionalText
});

export const measurementIdParamSchema = z.object({
  boletimId: z.coerce.number().int().positive()
});

export const repasseCreateSchema = z.object({
  data_repasse: dateString,
  valor_repasse: z.coerce.number().min(0)
});

export const repasseIdParamSchema = z.object({
  repasseId: z.coerce.number().int().positive()
});

export type CreateInstrumentInput = z.infer<typeof createInstrumentSchema>;
export type UpdateInstrumentInput = z.infer<typeof updateInstrumentSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
export type AlertQueryInput = z.infer<typeof alertQuerySchema>;
export type ChecklistItemCreateInput = z.infer<typeof checklistItemCreateSchema>;
export type ChecklistItemUpdateInput = z.infer<typeof checklistItemUpdateSchema>;
export type WorkProgressUpdateInput = z.infer<typeof workProgressUpdateSchema>;
export type MeasurementCreateInput = z.infer<typeof measurementCreateSchema>;
export type StageFollowUpCreateInput = z.infer<typeof stageFollowUpCreateSchema>;
export type StageFollowUpUpdateInput = z.infer<typeof stageFollowUpUpdateSchema>;
export type ChecklistExternalLinkCreateInput = z.infer<typeof checklistExternalLinkCreateSchema>;
export type ChecklistExternalUploadBodyInput = z.infer<typeof checklistExternalUploadBodySchema>;
export type RepasseCreateInput = z.infer<typeof repasseCreateSchema>;
