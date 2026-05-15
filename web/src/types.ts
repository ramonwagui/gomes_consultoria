export type Role = "ADMIN" | "GESTOR" | "CONSULTA" | "FINANCEIRO" | "DEMONSTRACAO";

export type User = {
  id: number;
  nome: string;
  email: string;
  role: Role;
  avatar_url: string | null;
};

export type ManagedUser = {
  id: number;
  nome: string;
  email: string;
  role: Role;
  avatar_url: string | null;
  proponentes: Array<{
    id: number;
    nome: string;
    cnpj: string;
    cidade: string;
    uf: string;
  }>;
  created_at: string;
  updated_at: string;
};

export type ProponenteBatchImportProgress = {
  status: "idle" | "running" | "completed" | "error";
  total_proponentes: number;
  processados: number;
  progresso_percentual: number;
  proponente_atual: string | null;
  criados: number;
  atualizados: number;
  ignorados: number;
  erros: number;
  message: string | null;
  started_at: string | null;
  finished_at: string | null;
  itens: Array<{
    proponente_id: number;
    nome: string;
    importacao: ProponenteImportacaoResumo;
  }>;
};

export type PaymentRequestStatus = "SOLICITADO" | "EM_ANALISE" | "APROVADO" | "REJEITADO" | "PAGO";

export type PaymentRequestInstrument = {
  id: number;
  instrumento: string;
  proposta: string;
  objeto: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  conta_bancaria: string | null;
  empresa_vencedora: string | null;
  cnpj_vencedora: string | null;
  percentual_obra: number | null;
  proponente_id: number | null;
  proponente_nome: string | null;
  status: InstrumentStatus;
  total_repassado: number | null;
  total_pago_sistema: number | null;
  saldo: number | null;
};

export type PaymentTaxValues = {
  valor: number;
  aliquota: number;
};

export type PaymentRequestItem = {
  id: number;
  instrumento_id: number;
  instrumento: string;
  proposta: string;
  objeto: string;
  proponente_id: number;
  proponente_nome: string;
  proponente_cnpj: string;
  solicitado_por_id: number;
  solicitado_por_nome: string;
  solicitado_por_email: string;
  valor_nota: number;
  valor_liquido: number;
  valor_bm: number;
  numero_bm: string;
  status: PaymentRequestStatus;
  impostos: {
    inss: PaymentTaxValues;
    iss: PaymentTaxValues;
    pis: PaymentTaxValues;
    cofins: PaymentTaxValues;
    ir: PaymentTaxValues;
  };
  anexos: {
    nota_fiscal: { nome_original: string; mime_type: string | null; download_path: string } | null;
    empenho: { nome_original: string; mime_type: string | null; download_path: string } | null;
  };
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentRequestPayload = {
  instrumento_id: number;
  valor_nota: number;
  valor_bm: number;
  numero_bm: string;
  impostos: Record<"inss" | "iss" | "pis" | "cofins" | "ir", { selecionado: boolean; valor: number; aliquota: number }>;
  observacoes?: string;
  nota_fiscal?: File | null;
  empenho?: File | null;
};

export type AuthResponse = {
  user: User;
};

export type InstrumentStatus =
  | "EM_ELABORACAO"
  | "ASSINADO"
  | "EM_EXECUCAO"
  | "VENCIDO"
  | "PRESTACAO_PENDENTE"
  | "CONCLUIDO";

export type InstrumentFlowType = "OBRA" | "AQUISICAO_EQUIPAMENTOS" | "EVENTOS";

export type Instrument = {
  id: number;
  proposta: string;
  instrumento: string;
  objeto: string;
  valor_repasse: number;
  valor_contrapartida: number;
  valor_ja_repassado: number;
  percentual_repassado: number;
  repasses: InstrumentRepasse[];
  valor_total: number;
  data_cadastro: string | null;
  data_assinatura: string | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  data_prestacao_contas: string | null;
  data_dou: string | null;
  concedente: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  fluxo_tipo: InstrumentFlowType;
  proponente_id: number | null;
  convenete_id?: number | null;
  status: InstrumentStatus;
  responsavel: string | null;
  orgao_executor: string | null;
  empresa_vencedora: string | null;
  cnpj_vencedora: string | null;
  valor_vencedor: number | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  percentual_fisico_medicao: number | null;
  percentual_financeiro_medicao: number | null;
  status_medicao: string | null;
  data_ultima_atualizacao_medicao: string | null;
};

export type InstrumentFilters = {
  status: InstrumentStatus | "";
  concedente: string;
  proponente_id: string;
  convenete_id?: string;
  sync_repasses_desembolsos?: "true" | "false";
  ativo: "true" | "false";
  vigencia_de: string;
  vigencia_ate: string;
};

export type InstrumentPayload = {
  proposta: string;
  instrumento: string;
  objeto: string;
  valor_repasse: number;
  valor_contrapartida: number;
  data_cadastro: string;
  data_assinatura?: string;
  vigencia_inicio: string;
  vigencia_fim: string;
  data_prestacao_contas?: string;
  data_dou?: string;
  concedente: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  fluxo_tipo?: InstrumentFlowType;
  convenete_id?: number;
  proponente_id?: number;
  status: InstrumentStatus;
  responsavel?: string;
  orgao_executor?: string;
  empresa_vencedora?: string;
  cnpj_vencedora?: string;
  valor_vencedor?: number;
  observacoes?: string;
};

export type ChecklistItemFile = {
  nome_original: string;
  mime_type: string | null;
  tamanho: number | null;
  uploaded_at: string | null;
  download_path: string;
};

export type InstrumentRepasse = {
  id: number;
  data_repasse: string;
  valor_repasse: number;
  created_at: string;
  updated_at: string;
};

export type ChecklistExternalRequest = {
  token: string;
  ativo: boolean;
  expira_em: string;
  link_publico: string;
  arquivos_recebidos: number;
};

export type ChecklistExternalFile = {
  id: number;
  nome_remetente: string;
  nome_original: string;
  mime_type: string | null;
  tamanho: number | null;
  created_at: string;
  origem_link_ativo: boolean;
  origem_link_expira_em: string | null;
  download_path: string;
};

export type WorkflowStage =
  | "PROPOSTA"
  | "REQUISITOS_CELEBRACAO"
  | "PROJETO_BASICO_TERMO_REFERENCIA"
  | "PROCESSO_EXECUCAO_LICITACAO"
  | "VERIFICACAO_PROCESSO_LICITATORIO"
  | "INSTRUMENTOS_CONTRATUAIS"
  | "ACOMPANHAMENTO_OBRA";

export type ChecklistItemStatus = "NAO_INICIADO" | "EM_ELABORACAO" | "CONCLUIDO" | "ACEITO";

export type ChecklistItem = {
  id: number;
  etapa: WorkflowStage;
  status: ChecklistItemStatus;
  status_label: string;
  nome_documento: string;
  obrigatorio: boolean;
  concluido: boolean;
  observacao: string | null;
  ordem: number;
  arquivo: ChecklistItemFile | null;
  solicitacao_externa: ChecklistExternalRequest | null;
  anexos_externos: ChecklistExternalFile[];
  created_at: string;
  updated_at: string;
};

export type ChecklistSummary = {
  total: number;
  obrigatorios: number;
  concluidos: number;
  obrigatorios_concluidos: number;
  pode_iniciar_execucao: boolean;
  pendentes_obrigatorios: string[];
  etapa_atual: WorkflowStage | null;
  etapas: Array<{
    etapa: WorkflowStage;
    total: number;
    obrigatorios: number;
    concluidos: number;
    obrigatorios_concluidos: number;
    concluida: boolean;
    pendentes_obrigatorios: string[];
  }>;
};

export type ChecklistResponse = {
  resumo: ChecklistSummary;
  itens: ChecklistItem[];
};

export type StageFollowUpFile = {
  id: number;
  nome_original: string;
  mime_type: string | null;
  tamanho: number | null;
  created_at: string;
  download_path: string;
};

export type StageFollowUp = {
  id: number;
  etapa: WorkflowStage;
  texto: string | null;
  user: {
    id: number | null;
    nome: string | null;
    email: string;
    avatar_url: string | null;
  };
  arquivos: StageFollowUpFile[];
  created_at: string;
  updated_at: string;
};

export type StageFollowUpListResponse = {
  itens: StageFollowUp[];
};

export type WorkMeasurementBulletin = {
  id: number;
  data_boletim: string;
  valor_medicao: number;
  percentual_obra_informado: number | null;
  observacao: string | null;
  created_at: string;
};

export type WorkProgress = {
  percentual_obra: number;
  valor_total_boletins: number;
  boletins: WorkMeasurementBulletin[];
};

export type ApiError = {
  message?: string;
  error?: string;
  path?: string;
  issues?: unknown;
};

export type HealthResponse = {
  status: string;
  version?: string;
  timestamp?: string;
};

export type GmailDeliveryHealthStatus = {
  configured: boolean;
  ok: boolean;
  checkedAt: string;
  reason:
    | "OK"
    | "GMAIL_CONFIG_MISSING"
    | "GMAIL_REFRESH_TOKEN_INVALID"
    | "GMAIL_AUTH_FAILED"
    | "GMAIL_API_ERROR";
  message: string;
  details?: {
    httpStatus?: number;
    googleError?: string;
  };
};

export type TicketsEmailStatusResponse = {
  gmailDeliveryHealth?: GmailDeliveryHealthStatus;
};

export type DeadlineAlertItem = {
  instrumento_id: number;
  proposta: string;
  instrumento: string;
  concedente: string;
  dias_para_vigencia_fim: number;
  dias_para_prestacao_contas: number | null;
};

export type DeadlineAlertResponse = {
  referencia: string;
  limite_dias: number;
  itens: DeadlineAlertItem[];
};

export type AuditAction = "CREATE" | "UPDATE" | "DEACTIVATE";

export type TicketStatus = "ABERTO" | "EM_ANDAMENTO" | "RESOLVIDO" | "CANCELADO";
export type TicketSource = "MANUAL" | "EMAIL";
export type TicketPriority = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";

export type TicketUserRef = {
  id: number;
  nome: string;
  email: string;
  role: Role;
};

export type TicketInstrumentRef = {
  id: number;
  proposta: string;
  instrumento: string;
  objeto: string;
  status: InstrumentStatus;
};

export type TicketComment = {
  id: number;
  mensagem: string;
  created_at: string;
  updated_at: string;
  user: TicketUserRef;
};

export type TicketChecklistItem = {
  id: number;
  descricao: string;
  concluido: boolean;
  concluido_em: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
};

export type Ticket = {
  id: number;
  codigo: string;
  titulo: string;
  descricao: string | null;
  status: TicketStatus;
  prioridade: TicketPriority;
  origem: TicketSource;
  prazo_alvo: string | null;
  resolvido_em: string | null;
  motivo_resolucao: string | null;
  instrumento_informado: string | null;
  instrumento_encontrado: boolean;
  instrumento: TicketInstrumentRef | null;
  responsavel: TicketUserRef | null;
  criado_por: TicketUserRef;
  comentarios: TicketComment[];
  checklist_itens: TicketChecklistItem[];
  created_at: string;
  updated_at: string;
};

export type DocumentIndexStatus = "PENDENTE" | "PROCESSANDO" | "INDEXADO" | "ERRO";
export type DocumentAiCategory = "CONTRATO" | "OFICIO" | "RELATORIO" | "PRESTACAO_CONTAS" | "COMPROVANTE" | "OUTROS";
export type DocumentAiRiskLevel = "BAIXO" | "MEDIO" | "ALTO" | "CRITICO";
export type DocumentoAreaOrigem = "INTERNO" | "EXTERNO";
export type DocumentoAreaStatus = "ATIVO" | "EXCLUIDO";
export type DocumentoAuditAction =
  | "UPLOAD"
  | "DOWNLOAD"
  | "EXCLUSAO"
  | "RENOMEACAO"
  | "ALTERACAO"
  | "ENVIO_EXTERNO"
  | "SCAN_INICIADO"
  | "SCAN_LIMPO"
  | "SCAN_INFECTADO"
  | "SCAN_ERRO";
export type DocumentoScanStatus = "PENDENTE" | "PROCESSANDO" | "LIMPO" | "INFECTADO" | "ERRO_SCAN";
export type DocumentoExternalRequestStatus = "ATIVO" | "EXPIRADO" | "ENVIO_REALIZADO" | "DESATIVADO";

export type DocumentoAreaItem = {
  id: number;
  nome_original: string;
  nome_atual: string;
  mime_type: string | null;
  tamanho: number;
  origem: DocumentoAreaOrigem;
  status: DocumentoAreaStatus;
  scan_status: DocumentoScanStatus;
  scan_provider: string | null;
  scan_result: string | null;
  scanned_at: string | null;
  instrumento: { id: number; proposta: string; instrumento: string } | null;
  proponente: { id: number; nome: string; cnpj: string } | null;
  usuario: { id: number | null; nome: string | null; email: string };
  remetente_externo: { nome: string; cpf: string } | null;
  indexacao: { status: DocumentIndexStatus; erro: string | null } | null;
  solicitacao_externa: { id: number; token: string; titulo: string; status: DocumentoExternalRequestStatus } | null;
  download_path: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentoScanMonitor = {
  worker_enabled: boolean;
  is_running: boolean;
  interval_ms: number;
  batch_size: number;
  queue: {
    pendentes: number;
    processando: number;
    limpos: number;
    infectados: number;
    erros_scan: number;
  };
  last_cycle_at: string | null;
  last_cycle_result: {
    encontrados: number;
    processados: number;
    limpos: number;
    infectados: number;
    erros: number;
  } | null;
  last_error: string | null;
};

export type DocumentoSearchItem = DocumentoAreaItem & {
  trecho: string;
  data_upload: string;
};

export type DocumentoAuditLogItem = {
  id: number;
  documento_id: number | null;
  usuario: { id: number | null; nome: string | null; email: string };
  acao: DocumentoAuditAction;
  arquivo_nome: string;
  ip: string | null;
  detalhes: unknown;
  documento: {
    id: number;
    nomeAtual: string;
    origem: DocumentoAreaOrigem;
    externalSenderNome: string | null;
    externalSenderCpf: string | null;
  } | null;
  created_at: string;
};

export type DocumentoExternalRequestItem = {
  id: number;
  token: string;
  titulo: string;
  descricao: string | null;
  status: DocumentoExternalRequestStatus;
  expira_em: string | null;
  permanente: boolean;
  permitir_reenvio: boolean;
  max_usos: number;
  usos_atuais: number;
  usos_restantes: number;
  link_publico: string;
  criado_por: { id: number; nome: string; email: string };
  documentos_recebidos: number;
  envios: number;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentTemplateStatus = "RASCUNHO" | "ATIVO" | "ARQUIVADO";

export type DocumentTemplateItem = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  status: DocumentTemplateStatus;
  versao_atual: number;
  conteudo: string;
  created_at: string;
  updated_at: string;
};

export type DocumentTemplateVersionItem = {
  id: number;
  template_id: number;
  version: number;
  nome: string;
  descricao: string | null;
  tipo: string;
  status: DocumentTemplateStatus;
  conteudo: string;
  created_at: string;
};

export type GeneratedTemplateDocumentItem = {
  id: number;
  template_id: number;
  template_codigo: string;
  template_nome: string;
  template_tipo: string;
  template_version: number;
  proponente_id: number;
  proponente_nome: string;
  proponente_cnpj: string;
  instrumento_id: number | null;
  titulo: string;
  rendered_content: string;
  created_at: string;
};

export type DocumentoGeracaoTemplate = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  status: DocumentTemplateStatus;
  arquivoNomeOriginal: string | null;
  placeholdersJson: string[] | null;
  geracoes: number;
  createdAt: string;
  criado_por: { id: number; nome: string; email: string };
};

export type DocumentoGeracaoResponsavel = {
  id: number;
  nome: string;
  cpf: string;
  crea: string;
  cargo: string;
  createdAt: string;
};

export type DocumentoGeracaoLog = {
  id: number;
  instrumento_id: number;
  instrumento_nome: string;
  template_id: number;
  template_nome: string;
  responsavel_tecnico: { id: number; nome: string; crea: string } | null;
  tipoDocumento: string;
  titulo: string;
  urlPdf: string;
  urlDocx: string | null;
  usuario: string;
  dataGeracao: string;
};

export type InstrumentoDados = {
  instrumento: {
    id: number;
    proposta: string;
    instrumento: string;
    objeto: string;
    valor_repasse: number;
    valor_contrapartida: number;
    vigencia_inicio: string;
    vigencia_fim: string;
    concedente: string;
    status: string;
    fluxo_tipo: string;
  };
  convenete: {
    id: number;
    nome: string;
    cnpj: string;
    endereco: string;
    bairro: string;
    cep: string;
    cidade: string;
    uf: string;
    tel: string;
    email: string;
    gestorNome: string | null;
    gestorCpf: string | null;
    gestorRg: string | null;
    gestorEndereco: string | null;
  } | null;
};

export type AuditLogItem = {
  id: number;
  instrumento_id: number;
  user_id: number | null;
  user_email: string;
  acao: AuditAction;
  campos_alterados: string[] | null;
  antes: unknown;
  depois: unknown;
  created_at: string;
};

export type Convenete = {
  id: number;
  nome: string;
  cnpj: string;
  endereco: string;
  bairro: string;
  cep: string;
  uf: string;
  cidade: string;
  tel: string;
  email: string;
  logo_url: string | null;
  timbre_url: string | null;
  gestorNome: string | null;
  gestorCpf: string | null;
  gestorRg: string | null;
  gestorEndereco: string | null;
  created_at: string;
  updated_at: string;
};

export type Proponente = Convenete;

export type ConvenetePayload = {
  nome: string;
  cnpj: string;
  endereco: string;
  numero?: string;
  complemento?: string;
  bairro: string;
  cep: string;
  uf: string;
  cidade: string;
  tel: string;
  email: string;
  gestorNome?: string | null;
  gestorCpf?: string | null;
  gestorRg?: string | null;
  gestorEndereco?: string | null;
  gestorEmail?: string | null;
};

export type ProponentePayload = ConvenetePayload;

export type ConveneteProponenteSugestaoItem = {
  cnpj: string;
  nome_proponente: string;
  uf: string | null;
  cidade: string | null;
};

export type ProponenteSugestaoItem = ConveneteProponenteSugestaoItem;

export type EmendaEstadualMunicipioItem = {
  id: number;
  nome: string;
  cidade: string;
  uf: string;
  cnpj: string;
};

export type EmendaEstadualItem = {
  id: number;
  objeto: string;
  numero: string;
  parlamentar: string;
  vigencia_inicio: string;
  vigencia_fim: string;
  valor: number;
  contrapartida: number;
  municipios: EmendaEstadualMunicipioItem[];
  created_at: string;
  updated_at: string;
};

export type EmendaEstadualDocumentoItem = {
  id: number;
  emenda_id: number;
  arquivo_nome_original: string;
  mime_type: string | null;
  tamanho: number | null;
  versao: number;
  created_by_user_id: number | null;
  created_by_email: string;
  updated_by_user_id: number | null;
  updated_by_email: string;
  created_at: string;
  updated_at: string;
};

export type EmendaEstadualDocumentoAuditoriaItem = {
  id: number;
  emenda_id: number;
  documento_id: number | null;
  acao: string;
  detalhes: Record<string, unknown> | null;
  user_id: number | null;
  user_email: string;
  user_nome: string | null;
  created_at: string;
};

export type ProponenteImportacaoResumo = {
  total_encontrado: number;
  criados: number;
  atualizados: number;
  ignorados: number;
  erros: number;
};

export type RepasseReportFilters = {
  proponente_id: number;
  proponente_nome: string;
  proponente_cnpj: string;
  convenete_id?: number;
  convenete_nome?: string;
  convenete_cnpj?: string;
  instrumento_id: number | null;
  data_de: string | null;
  data_ate: string | null;
};

export type RepasseReportKpis = {
  instrumentos: number;
  quantidade_repasses: number;
  valor_repassado_periodo: number;
  ticket_medio_repasse: number;
  valor_pactuado: number;
  valor_ja_repassado: number;
  saldo_pactuado: number;
  percentual_repassado: number;
};

export type RepasseReportMonthlyPoint = {
  mes: string;
  valor: number;
};

export type RepasseReportByInstrumentPoint = {
  instrumento_id: number;
  instrumento: string;
  proposta: string;
  valor: number;
};

export type RepasseReportByStatusPoint = {
  status: InstrumentStatus;
  quantidade: number;
};

export type RepasseReportInstrument = {
  id: number;
  proposta: string;
  instrumento: string;
  status: InstrumentStatus;
  data_prestacao_contas: string | null;
  orgao_concedente: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  empresa_vencedora: string | null;
  valor_pactuado: number;
  valor_ja_repassado: number;
  valor_repassado_periodo: number;
  saldo_pactuado: number;
  percentual_obra: number | null;
};

export type RepasseReportRepasse = {
  id: number;
  instrumento_id: number;
  proposta: string;
  instrumento: string;
  data_repasse: string;
  valor_repasse: number;
  empresa_vencedora: string | null;
};

export type RepasseReportResponse = {
  filtros: RepasseReportFilters;
  kpis: RepasseReportKpis;
  series: {
    repasses_mensais: RepasseReportMonthlyPoint[];
    repasses_por_instrumento: RepasseReportByInstrumentPoint[];
    instrumentos_por_status: RepasseReportByStatusPoint[];
  };
  instrumentos: RepasseReportInstrument[];
  repasses: RepasseReportRepasse[];
};

export type ObraReportFilters = {
  proponente_id: number | null;
  convenete_id?: number | null;
  instrumento_id: number | null;
  concedente: string | null;
  status: InstrumentStatus | null;
  ativo: boolean;
  data_de: string | null;
  data_ate: string | null;
};

export type ObraReportKpis = {
  obras_monitoradas: number;
  percentual_medio_obra: number;
  valor_total_boletins_periodo: number;
  valor_total_repasses_periodo: number;
  obras_risco_alto: number;
};

export type ObraReportMonthlyPoint = {
  mes: string;
  valor: number;
};

export type ObraReportByStatusPoint = {
  status: InstrumentStatus;
  quantidade: number;
};

export type ObraReportInstrument = {
  id: number;
  proposta: string;
  instrumento: string;
  objeto: string;
  status: InstrumentStatus;
  proponente_id: number | null;
  proponente_nome: string | null;
  convenete_id?: number | null;
  convenete_nome?: string | null;
  orgao_concedente: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  data_prestacao_contas: string | null;
  vigencia_fim: string;
  dias_para_vigencia_fim: number;
  percentual_obra: number;
  valor_pactuado: number;
  valor_ja_repassado: number;
  valor_boletins_periodo: number;
  valor_repasses_periodo: number;
  ultimo_boletim_data: string | null;
  ultimo_boletim_valor: number | null;
  risco: "BAIXO" | "MEDIO" | "ALTO";
  percentual_fisico_medicao: number | null;
  percentual_financeiro_medicao: number | null;
  status_medicao: string | null;
  data_ultima_atualizacao_medicao: string | null;
  };
export type ObraReportResponse = {
  filtros: ObraReportFilters;
  kpis: ObraReportKpis;
  series: {
    boletins_mensais: ObraReportMonthlyPoint[];
    repasses_mensais: ObraReportMonthlyPoint[];
    obras_por_status: ObraReportByStatusPoint[];
  };
  instrumentos: ObraReportInstrument[];
};

export type AndamentoInstrumentosReportFilters = {
  convenete_id: number | null;
  status: InstrumentStatus | null;
  instrumentos: string[];
};

export type AndamentoInstrumentosReportItem = {
  instrumento_id: number;
  proposta: string;
  instrumento: string;
  objeto: string;
  status: InstrumentStatus;
  fluxo_tipo: InstrumentFlowType;
  etapa_atual: WorkflowStage | null;
  etapa_atual_label: string | null;
  solicitacoes_caixa_email: Array<{
    id: number;
    ticket_id: number | null;
    descricao: string;
    origem_email: string | null;
    assunto_email: string | null;
    ticket: {
      id: number;
      codigo: string;
      titulo: string;
      descricao: string | null;
      pendencias: string[];
    } | null;
    pendencias_email: string[];
    conteudo_email: string | null;
    created_at: string;
  }>;
  acompanhamento: {
    id: number;
    etapa: WorkflowStage;
    etapa_label: string | null;
    texto: string | null;
    created_at: string;
    usuario: {
      id: number | null;
      nome: string | null;
      email: string;
    };
  } | null;
  historico_completo: Array<{
    tipo: "ACOMPANHAMENTO" | "SOLICITACAO_CAIXA" | "AUDITORIA";
    subtipo: string;
    subtipo_label: string;
    descricao: string;
    usuario:
      | {
          id: number | null;
          nome: string | null;
          email: string;
        }
      | null;
    ticket?: {
      id: number | null;
      codigo: string | null;
      titulo: string | null;
    } | null;
    origem_email?: string | null;
    assunto_email?: string | null;
    changed_fields?: string[];
    created_at: string;
  }>;
};

export type AndamentoInstrumentosReportResponse = {
  filtros: AndamentoInstrumentosReportFilters;
  resumo: {
    total: number;
  };
  itens: AndamentoInstrumentosReportItem[];
};

export type TransparenciaReportFilters = {
  cnpj: string;
  ano: number | null;
  ano_pagamento: number | null;
  max_paginas_convenios: number;
  max_processos: number;
};

export type TransparenciaReportKpis = {
  convenios_encontrados: number;
  processos_unicos: number;
  emendas_encontradas: number;
  valor_global_convenios: number;
  valor_liberado_convenios: number;
  valor_empenhado_total: number;
  valor_liquidado_total: number;
  valor_pago_total: number;
};

export type TransparenciaReportConvenioItem = {
  id: number | null;
  numero_convenio: string | null;
  numero_processo: string | null;
  situacao: string | null;
  objeto: string | null;
  orgao: string | null;
  tipo_instrumento: string | null;
  convenente: string | null;
  cnpj_convenente: string | null;
  municipio: string | null;
  uf: string | null;
  valor_global: number | null;
  valor_liberado: number | null;
  data_inicio_vigencia: string | null;
  data_fim_vigencia: string | null;
  area_atuacao_funcao: string | null;
  subfuncao: string | null;
  programa: string | null;
  acao: string | null;
  plano_orcamentario_po: string | null;
  emendas_vinculadas: number;
};

export type TransparenciaReportEmendaItem = {
  codigo_emenda: string | null;
  numero_emenda: string | null;
  ano: number | null;
  tipo_emenda: string | null;
  autor: string | null;
  numero_processo: string | null;
  valor_empenhado: number;
  valor_liquidado: number;
  valor_pago: number;
  convenios_vinculados: string[];
};

export type TransparenciaReportTipoEmendaResumoItem = {
  tipo_emenda: string;
  quantidade: number;
  valor_empenhado: number;
  valor_pago: number;
};

export type TransparenciaDocumentoPagamentoEmpenhoItem = {
  empenho: string | null;
  subitem: string | null;
  valor_pago: number;
  valor_resto_inscrito: number;
  valor_resto_cancelado: number;
  valor_resto_pago: number;
};

export type TransparenciaDocumentoPagamentoItem = {
  convenio_id: number | null;
  convenio_numero: string | null;
  codigo_documento: string | null;
  numero_documento: string | null;
  data: string | null;
  descricao: string | null;
  fase: string | null;
  tipo_documento: string | null;
  valor_documento: number;
  observacao_documento: string | null;
  favorecido_cnpj: string | null;
  favorecido_nome: string | null;
  orgao_superior_codigo: string | null;
  orgao_superior_nome: string | null;
  orgao_vinculado_codigo: string | null;
  orgao_vinculado_nome: string | null;
  unidade_gestora_codigo: string | null;
  unidade_gestora_nome: string | null;
  gestao_codigo: string | null;
  gestao_nome: string | null;
  processo: string | null;
  empenhos: TransparenciaDocumentoPagamentoEmpenhoItem[];
};

export type TransparenciaReportResponse = {
  filtros: TransparenciaReportFilters;
  kpis: TransparenciaReportKpis;
  convenios: TransparenciaReportConvenioItem[];
  emendas: TransparenciaReportEmendaItem[];
  resumo_por_tipo_emenda: TransparenciaReportTipoEmendaResumoItem[];
  documentos_pagamento: TransparenciaDocumentoPagamentoItem[];
  diagnostico?: {
    convenente_nome_hint?: string;
    convenios_api_cnpj: number;
    convenios_fallback_local_numero: number;
    convenios_fallback_local_id: number;
    processos_extraidos: number;
    emendas_total_bruto: number;
    scraping_tentativas?: number;
    scraping_sucessos?: number;
    fontes_usadas?: string[];
    warnings?: string[];
  };
};

export type TransferenciaEspecialPlanoAcaoItem = {
  id_plano_acao: number;
  codigo_plano_acao: string;
  ano_plano_acao: number;
  modalidade_plano_acao: string;
  situacao_plano_acao: string;
  fonte_status: string;
  comparacao_status: string | null;
  cnpj_beneficiario_plano_acao: string;
  nome_beneficiario_plano_acao: string;
  uf_beneficiario_plano_acao: string;
  concedente: string;
  nome_parlamentar_emenda_plano_acao: string | null;
  valor_custeio_plano_acao: number;
  valor_investimento_plano_acao: number;
  id_programa: number;
  finalidade: string | null;
  detalhamento_objeto: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  saldo_conta_corrente: number | null;
  pagamento_status: string;
  pago_detectado: boolean;
  data_pagamento_detectado: string | null;
  valor_pago_detectado: number;
  documentos_habeis_quantidade: number;
  empenhos_quantidade: number;
  ordens_pagamento_quantidade: number;
  documento_habil_principal: string | null;
  ordem_pagamento_principal: string | null;
  ordem_bancaria_principal: string | null;
  situacao_pagamento: string | null;
  data_ultima_consulta_pagamento: string | null;
};

export type TransferenciaEspecialPlanoAcaoResponse = {
  itens: TransferenciaEspecialPlanoAcaoItem[];
  paginacao: {
    pagina: number;
    tamanho_pagina: number;
    total: number;
    total_paginas: number;
    tem_proxima: boolean;
    tem_anterior: boolean;
  };
  cache: {
    ttl_ms: number;
    em_cache: boolean;
    atualizado_em: string;
  };
};

export type TransferenciaEspecialSyncStatus = {
  status: "idle" | "running" | "success" | "error";
  fase_atual: string;
  progresso_percentual: number;
  atualizado_em: string;
  initiated_at: string | null;
  finalized_em: string | null;
  detalhe: string | null;
  cancel_requested: boolean;
  estrategia_status: string;
  fonte_prioritaria: string;
  fonte_fallback: string | null;
  comparacao_habilitada: boolean;
  resumo_ultima_execucao: {
    total_atualizados: number;
    total_criados: number;
    total_erros: number;
  } | null;
};

export type TransferenciaDiscricionariaItem = {
  id: number;
  nr_proposta: string | null;
  nr_convenio: string | null;
  uf: string | null;
  cnpj: string | null;
  nome_proponente: string | null;
  natureza_juridica: string | null;
  situacao_proposta: string | null;
  situacao_convenio: string | null;
  situacao_contratacao: string | null;
  objeto: string | null;
  ano_referencia: number | null;
  dia_assin_conv: string | null;
  dia_inic_vigencia: string | null;
  dia_fim_vigencia: string | null;
  dt_aprovacao_proposta: string | null;
  dt_conclusao_prestacao_contas: string | null;
  valor_global_conv: number | null;
  valor_desembolsado_conv: number | null;
  valor_pagamentos: number | null;
  valor_tributos: number | null;
  total_gasto: number | null;
  quantidade_convenios: number | null;
  qtd_tas_convenio: number | null;
  qtd_dias_prorroga: number | null;
  valor_contrapartida_financeira: number | null;
  valor_contrapartida_depositada: number | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  concedente: string | null;
  dias_para_vencimento: number | null;
  link_acesso_livre: string | null;
  fonte_arquivo: string;
};

export type TransferenciaDiscricionariaResponse = {
  itens: TransferenciaDiscricionariaItem[];
  paginacao: {
    pagina: number;
    tamanho_pagina: number;
    total: number;
    total_paginas: number;
    tem_proxima: boolean;
    tem_anterior: boolean;
  };
  sincronizacao: TransferenciaDiscricionariaSyncState;
};

export type TransferenciaDiscricionariaSyncState = {
  data_carga_fonte: string | null;
  atualizado_em: string | null;
  status: string;
  detalhe: string | null;
  total_registros: number;
  fase_atual?: string | null;
  progresso_percentual?: number | null;
  heartbeat_em?: string | null;
  mode?: "full" | "light" | null;
  cancel_requested?: boolean;
  run_id?: string | null;
  published_run_id?: string | null;
};

export type TransferenciaDiscricionariaSyncResult = {
  skipped: boolean;
  data_carga_fonte: string;
  arquivos_processados: string[];
  total_registros: number;
  status: "ok" | "partial" | "rejected";
  detalhe: string | null;
  mode?: "full" | "light";
};

export type TransferenciaDiscricionariaNotifyResult = {
  modo: "manual" | "auto";
  dias_monitorados: number[];
  monitorados: number;
  elegiveis: number;
  enviados: number;
  suprimidos_ja_notificados: number;
  notificacao_enviada: boolean;
  mensagem: string;
};

export type TransferenciaDiscricionariaChangesNotifyResult = {
  modo: "sync" | "manual";
  total_alteracoes: number;
  pagamentos_alterados: number;
  valor_desembolsado_alterado: number;
  novos_desembolsos: number;
  desembolsos_atualizados: number;
  notificacao_enviada: boolean;
  mensagem: string;
};

export type TransferenciaDiscricionariaFiltrosResponse = {
  ufs: string[];
  situacoes_proposta: string[];
  situacoes_convenio: string[];
  concedentes: string[];
};

export type TransferenciaDiscricionariaProponenteSugestaoItem = {
  cnpj: string;
  nome_proponente: string;
};

export type TransferenciaDiscricionariaProponenteSugestaoResponse = {
  itens: TransferenciaDiscricionariaProponenteSugestaoItem[];
};

export type TransferenciaDiscricionariaDesembolsoItem = {
  id: number;
  id_desembolso: number | null;
  nr_convenio: string | null;
  data_desembolso: string | null;
  dt_ult_desembolso: string | null;
  ano_desembolso: number | null;
  mes_desembolso: number | null;
  qtd_dias_sem_desembolso: number | null;
  nr_siafi: string | null;
  ug_emitente_dh: string | null;
  observacao_dh: string | null;
  vl_desembolsado: number | null;
  fonte_arquivo: string;
};

export type TransferenciaDiscricionariaDesembolsoResponse = {
  itens: TransferenciaDiscricionariaDesembolsoItem[];
  paginacao: {
    pagina: number;
    tamanho_pagina: number;
    total: number;
    total_paginas: number;
    tem_proxima: boolean;
    tem_anterior: boolean;
  };
  resumo: {
    nr_convenio: string;
    total_desembolsos: number;
    valor_total_desembolsado: number;
  };
  sincronizacao: TransferenciaDiscricionariaSyncState;
};

export type TransferenciaDiscricionariaDesembolsoProponenteItem = {
  id: number;
  id_desembolso: number | null;
  cnpj_proponente: string | null;
  nome_proponente: string | null;
  nr_convenio: string | null;
  objeto: string | null;
  valor_contrapartida_financeira: number | null;
  uf: string | null;
  municipio: string | null;
  data_desembolso: string | null;
  dt_ult_desembolso: string | null;
  ano_desembolso: number | null;
  mes_desembolso: number | null;
  qtd_dias_sem_desembolso: number | null;
  nr_siafi: string | null;
  ug_emitente_dh: string | null;
  observacao_dh: string | null;
  vl_desembolsado: number | null;
  fonte_arquivo: string;
};

export type TransferenciaDiscricionariaDesembolsoProponenteResponse = {
  itens: TransferenciaDiscricionariaDesembolsoProponenteItem[];
  paginacao: {
    pagina: number;
    tamanho_pagina: number;
    total: number;
    total_paginas: number;
    tem_proxima: boolean;
    tem_anterior: boolean;
  };
  resumo: {
    cnpj: string | null;
    nome_proponente: string | null;
    total_desembolsos: number;
    total_convenios: number;
    valor_total_desembolsado: number;
  };
  sincronizacao: TransferenciaDiscricionariaSyncState;
};

export type TransferenciaDiscricionariaRelatorioPersonalizadoItem = {
  id: number;
  id_proposta: number | null;
  nr_proposta: string | null;
  nr_convenio: string | null;
  cnpj_proponente: string | null;
  nome_proponente: string | null;
  uf_proponente: string | null;
  municipio_proponente: string | null;
  parlamentar_autor_emenda: string | null;
  nr_emenda: string | null;
  codigo_programa_emenda: string | null;
  tipo_emenda: string | null;
  funcao_orcamentaria: string | null;
  subfuncao_orcamentaria: string | null;
  localidade_gasto: string | null;
  valor_emenda_parlamentar: number | null;
  valor_liquidado_emenda: number | null;
  valor_pago_emenda: number | null;
  concedente_orgao_sup: string | null;
  concedente_orgao: string | null;
  tipo_instrumento: string | null;
  objeto_resumido: string | null;
  objeto_detalhado: string | null;
  situacao_emenda: "EM_ANALISE" | "IMPEDIMENTO_TECNICO" | "PARCIALMENTE_EXECUTADA" | "TOTALMENTE_EXECUTADA";
  data_inicio_vigencia: string | null;
  data_fim_vigencia: string | null;
  valor_convenio: number | null;
  valor_liberado: number | null;
  valor_contrapartida: number | null;
  tp_processo_compra: string | null;
  modalidade_licitacao: string | null;
  nr_processo_licitacao: string | null;
  nr_licitacao: string | null;
  nr_contrato: string | null;
  situacao_contrato: string | null;
  valor_final_contrato: number | null;
  link_acesso_livre: string | null;
  fonte_principal: "LOCAL_SICONV" | "PORTAL_TRANSPARENCIA";
  confianca_vinculo: "ALTA" | "MEDIA" | "BAIXA";
  detalhe_confianca: string;
};
export type FnsUfItem = {
  id: string;
  nome: string;
  nomeAcentuado: string;
  sigla: string;
};

export type FnsMunicipioItem = {
  codigo: string;
  descricao: string;
};

export type FnsEntidadeItem = {
  nome: string;
  cnpj: string;
  municipal: boolean;
  estadual: boolean;
  privada: boolean;
  brasilia: boolean;
};

export type FnsRepassesResponse = {
  quantidade: number;
  valor: number;
  itens: Array<{
    codigoBloco: string;
    nomeBloco: string;
    valorRepassado: number;
  }>;
};

export type FnsRepassesDetalheResponse = {
  quantidade: number;
  valor: number;
  itens: Array<{
    descricaoTipoCompetencia?: string | null;
    descricaoCompetencia?: string | null;
    nomeBloco?: string | null;
    nomeGrupo?: string | null;
    numeroProcesso?: string | null;
    numeroOB?: string | null;
    dataOB?: string | null;
    valorRepassado?: number | null;
    codigoBanco?: string | null;
    numeroAgencia?: string | null;
    numeroConta?: string | null;
    nomeAcao?: string | null;
  }>;
};

export type FnsSaldosTiposContaResponse = {
  quantidade: number;
  valor: number;
  itens: Array<{
    idTipoConta: number;
    sigla: string;
    descricao: string;
    valorSaldo: number;
  }>;
};

export type FnsSyncStatus = {
  status: "idle" | "running" | "ok" | "error";
  atualizado_em: string | null;
  detalhe: string | null;
  total_requisicoes: number;
  falhas: number;
  ttl_cache_ms: number;
  entradas_cache: number;
};

export type ConsultaFnsUfItem = {
  coUfIbge: string;
  sigla: string;
  nome: string;
  id: string;
};

export type ConsultaFnsAnoItem = {
  valor: string;
  descricao: string;
};

export type ConsultaFnsMunicipioItem = {
  coMunicipioIbge: string;
  noMunicipio: string;
  sgUf: string;
};

export type ConsultaFnsPropostaItem = {
  coTipoProposta: string;
  dsTipoRecurso: string;
  nuProposta?: string;
  noEntidade?: string;
  vlProposta: number;
  vlPago: number;
  vlPagar: number;
  nuProcesso?: string;
  pagamentos?: Array<{
    dtCriacaoSiafi?: number;
    nuOb?: string;
    nuParcela?: string;
    localizacao?: string;
    nuProcesso?: string;
    vlLiquido?: number;
    vlAcumulado?: number;
  }>;
  parlamentares?: Array<{
    sgPartido?: string;
    noApelidoPolitico?: string;
    vlIndObjeto?: number;
    coEmendaPolitica?: string;
    nuAnoExercicio?: string;
  }>;
  linhaPropostas?: Array<{
    nuProposta?: string;
  }>;
  constituidoProcesso: boolean;
};

export type ConsultaFnsPropostasResponse = {
  itens: ConsultaFnsPropostaItem[];
  paginacao: {
    pagina: number;
    tamanho_pagina: number;
    total: number;
    total_paginas: number;
    tem_proxima: boolean;
    tem_anterior: boolean;
  };
};

export type ConsultaFnsPropostaDetalhe = {
  nuProposta: string;
  sgUf: string;
  noMunicipio: string;
  cnpj: string;
  noEntidade: string;
  coTipoProposta: string;
  vlProposta: number;
  nuAnoProposta: string;
  dsTipoRecurso: string;
  coEsfera: string;
  nuPortaria: string | null;
  nuProcesso: string | null;
  dtPortaria: number | null;
  situacao: {
    descricaoSituacaoproposta: string;
    dataSituacaoProjeto?: number | null;
  };
  vlEmpenhado: number;
  vlPago: number;
  vlPagar: number;
  parlamentares: Array<{
    sgPartido: string;
    noApelidoPolitico: string;
    vlIndObjeto: number;
    coEmendaPolitica: string;
    nuAnoExercicio: string;
  }>;
  pagamentos: Array<{
    dtCriacaoSiafi: number;
    nuParcela: string;
    localizacao: string;
    nuProcesso: string;
    nuOb: string;
    vlLiquido: number;
    vlAcumulado: number;
  }>;
  constituidoProcesso: boolean;
};

export type ConsultaFnsSyncStatus = {
  status: "idle" | "running" | "ok" | "error";
  atualizado_em: string | null;
  detalhe: string | null;
  total_requisicoes: number;
  total_itens: number;
  falhas: number;
  ttl_cache_ms: number;
  entradas_cache: number;
};

export type SimecUfItem = {
  uf: string;
  sigla: string;
  nome: string;
};

export type SimecMunicipioItem = {
  codigo: string;
  uf: string;
  nome: string;
};

export type SimecObraResumoItem = {
  obra_id: number;
  titulo: string;
  situacao: string | null;
  localizacao: string | null;
  esfera: string | null;
  tipo: string | null;
  vigencia_fim: string | null;
  valor_previsto: number | null;
  valor_pago_fnde: number | null;
  percentual_execucao: number | null;
  detalhe_url: string;
};

export type SimecObrasResponse = {
  filtros: {
    uf: string;
    muncod: string;
    esfera?: string;
    tipologia?: string;
    obrid?: string;
  };
  total: number;
  itens: SimecObraResumoItem[];
};

export type SimecObraDetalhe = {
  obra_id: number;
  titulo: string | null;
  detalhe_url: string;
  detalhes: Record<string, string>;
};

export type SimecTermoResumoItem = {
  dotid: number;
  modo: "PAR3" | "PAR4";
  termo_numero: string;
  exercicio: number | null;
  processo: string | null;
  ente_tipo: "ESTADUAL" | "MUNICIPAL" | null;
  secretaria_nome: string | null;
  municipio_nome: string | null;
  uf: string | null;
  cnpj: string | null;
  endereco: string | null;
  secretario_nome: string | null;
  secretario_cpf: string | null;
  total_geral: number | null;
  mes_inicial: string | null;
  mes_final: string | null;
  data_assinatura: string | null;
  detalhe_url: string;
  itens_quantidade: number;
  empenhos_quantidade: number;
};

export type SimecTermoItem = {
  codigo: string | null;
  iniciativa: string | null;
  etapa: string | null;
  total: number | null;
};

export type SimecTermoEmpenho = {
  iniciativa: string | null;
  numero: string | null;
  valor: number | null;
};

export type SimecTermosResponse = {
  filtros: {
    dotid_inicio: number | null;
    dotid_fim: number | null;
    cursor: number | null;
    limite: number;
    ano: number | null;
    secretaria: "E" | "M" | null;
    uf: string | null;
    q: string | null;
  };
  resumo: {
    dotids_consultados: number;
    termos_encontrados: number;
    modo: "recentes" | "faixa";
    proximo_cursor: number | null;
  };
  itens: SimecTermoResumoItem[];
};

export type SimecTermoDetalhe = {
  dotid: number;
  modo: "PAR3" | "PAR4";
  termo_numero: string;
  exercicio: number | null;
  processo: string | null;
  ente_tipo: "ESTADUAL" | "MUNICIPAL" | null;
  secretaria_nome: string | null;
  municipio_nome: string | null;
  uf: string | null;
  cnpj: string | null;
  endereco: string | null;
  secretario_nome: string | null;
  secretario_cpf: string | null;
  total_geral: number | null;
  mes_inicial: string | null;
  mes_final: string | null;
  data_assinatura: string | null;
  detalhe_url: string;
  campos: Record<string, string>;
  itens: SimecTermoItem[];
  empenhos: SimecTermoEmpenho[];
};

export type SimecBotTermo = {
  numeroTermo: string;
  par?: string;
  objeto: string;
  municipio: string;
  uf: string;
  situacao: string;
  valor: string;
  ano: string;
  valorEmpenhado?: string;
  valorPago?: string;
  saldoBancario?: string;
  prestacaoContas?: string;
};

export type SimecBotResponse = {
  sucesso: boolean;
  mensagem: string;
  dados: SimecBotTermo[];
  html_bruto?: string;
};

export type AssistenteIntencao =
  | "convenios_cidade"
  | "desembolso_cidade"
  | "instrumentos_municipio_status"
  | "instrumentos_vencendo_com_tickets"
  | "percentual_obra"
  | "obras_percentual_alto_desembolso_baixo"
  | "tickets_atrasados_sem_responsavel"
  | "tickets_por_instrumento"
  | "vigencias_instrumentos"
  | "ranking_cidades_desembolso"
  | "transferencias_especiais_cnpj"
  | "transferencias_especiais_municipio"
  | "transferencias_especiais_divergentes"
  | "busca_conhecimento"
  | "nao_entendida";

export type AssistenteHistoricoItem = {
  role: "user" | "assistant";
  text: string;
};

export type AssistenteResposta = {
  pergunta: string;
  session_id?: string;
  intencao: AssistenteIntencao;
  confianca: "alta" | "media" | "baixa";
  resposta: string;
  dados?: Record<string, unknown>;
  sugestoes: string[];
  contexto_usado?: boolean;
  pergunta_interpretada?: string;
  fontes_consultadas?: string[];
};

export type AssistenteSessionItem = {
  id: string;
  titulo: string | null;
  entidadeAtivaTipo: string | null;
  entidadeAtivaId: string | null;
  municipioAtivo: string | null;
  topicoAtivo: string | null;
  resumoContexto: string | null;
  updatedAt: string;
  createdAt: string;
};

export type AssistenteSessionDetail = {
  id: string;
  titulo: string | null;
  entidadeAtivaTipo: string | null;
  entidadeAtivaId: string | null;
  municipioAtivo: string | null;
  topicoAtivo: string | null;
  resumoContexto: string | null;
  updatedAt: string;
  createdAt: string;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    text: string;
    created_at: string;
  }>;
};

export type SismobObra = {
  id: string;
  codigo: string;
  municipio: string;
  uf: string;
  objeto: string;
  situacao: string;
  valor_total: number;
  valor_pago: number;
  percentual_execucao: number;
  ultima_atualizacao: string | null;
};

export type SismobResponse = {
  itens: SismobObra[];
  paginacao: {
    pagina: number;
    tamanho_pagina: number;
    total: number;
    total_paginas: number;
  };
};
