import { ChangeEvent, DragEvent, FormEvent, ReactNode, Suspense, lazy, startTransition, useEffect, useMemo, useRef, useState } from "react";
import LoadingPanel from "./components/LoadingPanel";
import SectionHeader from "./components/SectionHeader";
import SidebarShell from "./components/SidebarShell";
import { buildDashboardKpis } from "./views/dashboardViewModel";
import {
  askAssistentePergunta,
  addTicketComment,
  addWorkMeasurementBulletin,
  addChecklistItem,
  associateTicketInstrument,
  dissociateTicketInstrument,
  createUserAdmin,
  seedDemoDataAdmin,
  createChecklistExternalLink,
  deactivateChecklistExternalLink as deactivateChecklistExternalLinkApi,
  createConveneteFromProponente as createProponenteFromBase,
  updateConvenete,
  consultaCnpj,
  createTicket,
  createEmendaEstadual,
  deleteEmendaEstadualDocumento,
  createInstrument,
  createPaymentRequest,
  deleteWorkMeasurementBulletin,
  deleteConvenete as deleteProponente,
  removeConveneteLogo as removeProponenteLogo,
  deactivateInstrument,
  deleteChecklistItem,
  downloadChecklistExternalFile,
  downloadPaymentRequestFile,
  downloadStageFollowUpFile,
  getPaymentRequestFileBlob,
  getPaymentRequestInstrumentById,
  getInstrumentById,
  getInstrumentChecklist,
  getAndamentoInstrumentosReport,
  getMyProfile,
  getAssistenteSession,
  getObraReport,
  getRepasseReport,
  getTransparenciaReport,
  getTransferenciasDiscricionarias,
  getTransferenciasDiscricionariasDesembolsosPorProponente,
  getTransferenciasDiscricionariasDesembolsos,
  getTransferenciasDiscricionariasFiltros,
  getTransferenciasDiscricionariasProponenteSugestoes,
  getTransferenciasDiscricionariasSyncStatus,
  getConsultaFnsAnos,
  getConsultaFnsMunicipios,
  getConsultaFnsPropostaDetalhe,
  getConsultaFnsPropostas,
  getConsultaFnsStatus,
  getConsultaFnsUfs,
  getFnsMunicipios,
  getFnsRepasses,
  getFnsRepassesDetalhe,
  getFnsSaldosTiposConta,
  getFnsSyncStatus,
  getFnsUfs,
  getExtracaoSimec,
  getSimecMunicipios,
  getSimecObraDetalhe,
  getSimecObras,
  getSismobObras,
  getSimecTermoDetalhe,
  getSimecTermos,
  getSimecUfs,
  getTransferenciasEspeciaisPlanoAcao,
  getTransferenciasEspeciaisRealtimeSyncStatus,
  cancelTransferenciasEspeciaisRealtimeSync,
  syncTransferenciasEspeciaisRealtime,
  syncTransferenciasEspeciaisRealtimeByCnpj,
  getTicketById,
  getWorkProgress,
  healthCheck,
  getTicketsEmailStatus,
  getReimportarInstrumentosTodosStatus,
  listAuditLogs,
  listConvenetes as listProponentes,
  searchConveneteProponentes as searchProponentesDaBase,
  reimportarInstrumentosProponente,
  reimportarInstrumentosTodosProponentes,
  uploadConveneteLogo as uploadProponenteLogo,
  uploadConveneteTimbre as uploadProponenteTimbre,
  removeConveneteTimbre as removeProponenteTimbre,
  listDeadlineAlerts,
  listEmendasEstaduais,
  listEmendasEstaduaisMunicipios,
  listInstruments,
  listInstrumentRepasses,
  listPaymentRequestInstruments,
  listPaymentRequests,
  listTicketAssignableUsers,
  listTickets,
  listUsersAdmin,
  listSolicitacoesCaixa,
  listDocumentoGeracaoTemplates,
  createDocumentoGeracaoTemplate,
  updateDocumentoGeracaoTemplate,
  deleteDocumentoGeracaoTemplate,
  listDocumentoGeracaoresponsaveis,
  createDocumentoGeracaoResponsavel,
  deleteDocumentoGeracaoResponsavel,
  generateDocumentoGeracao,
  listDocumentoGeracaoLogs,
  downloadDocumentoGeracaoLog,
  listAssistenteSessions,
  login,
  logout as logoutSession,
  COOKIE_SESSION_TOKEN,
  removeMyAvatar,
  createStageFollowUp,
  listStageFollowUps,
  searchInstrumentos,
  cancelTransferenciasDiscricionariasSync,
  syncTransferenciasDiscricionarias,
  triggerTransferenciasDiscricionariasChangesNotification,
  triggerTransferenciasDiscricionariasVigenciaNotification,
  syncFnsCache,
  syncConsultaFnsCache,
  deleteStageFollowUp as deleteStageFollowUpApi,
  updateStageFollowUp as updateStageFollowUpApi,
  updateUserAdmin,
  updateChecklistItem,
  updateTicket,
  updateWorkProgress,
  updateEmendaEstadual,
  updateInstrument,
  updatePaymentRequestStatus,
  uploadMyAvatar,
  deleteEmendaEstadual,
  downloadEmendaEstadualDocumento,
  listEmendaEstadualDocumentos,
  listEmendaEstadualDocumentosAuditoria,
  updateEmendaEstadualDocumento,
  uploadEmendaEstadualDocumentos
} from "./api";
import type {
  AssistenteHistoricoItem,
  AssistenteResposta,
  AssistenteSessionDetail,
  AssistenteSessionItem,
  AuditAction,
  AuditLogItem,
  ChecklistItem,
  ChecklistItemStatus,
  ChecklistSummary,
  Proponente,
  ProponenteSugestaoItem,
  DeadlineAlertItem,
  EmendaEstadualItem,
  EmendaEstadualDocumentoAuditoriaItem,
  EmendaEstadualDocumentoItem,
  EmendaEstadualMunicipioItem,
  Instrument,
  InstrumentFlowType,
  InstrumentFilters,
  InstrumentPayload,
  InstrumentStatus,
  ManagedUser,
  PaymentRequestInstrument,
  PaymentRequestItem,
  PaymentRequestStatus,
  ProponenteBatchImportProgress,
  AndamentoInstrumentosReportResponse,
  ObraReportResponse,
  TransferenciaDiscricionariaFiltrosResponse,
  TransferenciaDiscricionariaDesembolsoResponse,
  TransferenciaDiscricionariaDesembolsoProponenteResponse,
  TransferenciaDiscricionariaProponenteSugestaoItem,
  TransferenciaDiscricionariaResponse,
  TransferenciaDiscricionariaChangesNotifyResult,
  TransferenciaDiscricionariaNotifyResult,
  ConsultaFnsAnoItem,
  ConsultaFnsMunicipioItem,
  ConsultaFnsPropostaDetalhe,
  ConsultaFnsPropostaItem,
  ConsultaFnsPropostasResponse,
  ConsultaFnsSyncStatus,
  ConsultaFnsUfItem,
  FnsMunicipioItem,
  FnsRepassesDetalheResponse,
  FnsRepassesResponse,
  FnsSaldosTiposContaResponse,
  FnsSyncStatus,
  FnsUfItem,
  SimecMunicipioItem,
  SimecObraDetalhe,
  SimecObrasResponse,
  SimecTermoDetalhe,
  SimecTermosResponse,
  SimecBotResponse,
  SimecUfItem,
  SismobResponse,
  Ticket,
  TicketPriority,
  TicketSource,
  TicketStatus,
  Role,
  RepasseReportResponse,
  TransparenciaReportResponse,
  TransferenciaEspecialSyncStatus,
  TransferenciaEspecialPlanoAcaoResponse,
  DocumentoGeracaoTemplate,
  DocumentoGeracaoResponsavel,
  DocumentoGeracaoLog,
  InstrumentoDados,
  StageFollowUp,
  User,
  WorkProgress,
  WorkflowStage
} from "./types";

const LandingPage = lazy(() => import("./LandingPage"));
const DashboardView = lazy(() => import("./views/DashboardView"));
const DocumentosAreaView = lazy(() => import("./views/DocumentosAreaView"));
const ReportTabsNav = lazy(() => import("./views/ReportTabsNav"));
const ReportsRepassesView = lazy(() => import("./views/ReportsRepassesView"));

const USER_KEY = "gestconv360.user";
const TICKET_TAB_KEY = "gestconv360.ticket-tab";

const STATUS_OPTIONS: InstrumentStatus[] = [
  "EM_ELABORACAO",
  "ASSINADO",
  "EM_EXECUCAO",
  "VENCIDO",
  "PRESTACAO_PENDENTE",
  "CONCLUIDO"
];

const INSTRUMENT_STATUS_LABELS: Record<InstrumentStatus, string> = {
  EM_ELABORACAO: "Em elaboração",
  ASSINADO: "Assinado",
  EM_EXECUCAO: "Em execução",
  VENCIDO: "Vencido",
  PRESTACAO_PENDENTE: "Prestação pendente",
  CONCLUIDO: "Concluído"
};

const PAYMENT_STATUS_OPTIONS: PaymentRequestStatus[] = ["SOLICITADO", "EM_ANALISE", "APROVADO", "REJEITADO", "PAGO"];
const PAYMENT_STATUS_LABELS: Record<PaymentRequestStatus, string> = {
  SOLICITADO: "Solicitado",
  EM_ANALISE: "Em analise",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
  PAGO: "Pago"
};
const PAYMENT_STATUS_CLASSNAMES: Record<PaymentRequestStatus, string> = {
  SOLICITADO: "payment-status-solicitado",
  EM_ANALISE: "payment-status-em-analise",
  APROVADO: "payment-status-aprovado",
  REJEITADO: "payment-status-rejeitado",
  PAGO: "payment-status-pago"
};
const PAYMENT_TAXES = [
  { key: "inss", label: "INSS" },
  { key: "iss", label: "ISS" },
  { key: "pis", label: "PIS" },
  { key: "cofins", label: "COFINS" },
  { key: "ir", label: "IR" }
] as const;

const AUDIT_ACTION_OPTIONS: AuditAction[] = ["CREATE", "UPDATE", "DEACTIVATE"];
const TICKET_STATUS_OPTIONS: TicketStatus[] = ["ABERTO", "EM_ANDAMENTO", "RESOLVIDO", "CANCELADO"];
const TICKET_SOURCE_OPTIONS: TicketSource[] = ["MANUAL", "EMAIL"];
const TICKET_PRIORITY_OPTIONS: TicketPriority[] = ["BAIXA", "MEDIA", "ALTA", "CRITICA"];
const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  ABERTO: "Aberto",
  EM_ANDAMENTO: "Em andamento",
  RESOLVIDO: "Resolvido",
  CANCELADO: "Cancelado"
};
const TICKET_SOURCE_LABELS: Record<TicketSource, string> = {
  MANUAL: "Manual",
  EMAIL: "Email"
};
const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  BAIXA: "Baixa",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Critica"
};
const MAX_CONVENIOS_DESEMBOLSO_PDF = 30;
const TRANSFERENCIAS_PAGE_SIZE_MAX = 100;
const DESEMBOLSOS_PAGE_SIZE_MAX = 200;

const FLOW_TYPE_OPTIONS: InstrumentFlowType[] = ["OBRA", "AQUISICAO_EQUIPAMENTOS", "EVENTOS"];

const FLOW_TYPE_LABELS: Record<InstrumentFlowType, string> = {
  OBRA: "Obra",
  AQUISICAO_EQUIPAMENTOS: "Aquisicao de Equipamentos",
  EVENTOS: "Eventos"
};

const BRAZIL_UFS: SimecUfItem[] = [
  { uf: "AC", sigla: "AC", nome: "Acre" },
  { uf: "AL", sigla: "AL", nome: "Alagoas" },
  { uf: "AP", sigla: "AP", nome: "Amapa" },
  { uf: "AM", sigla: "AM", nome: "Amazonas" },
  { uf: "BA", sigla: "BA", nome: "Bahia" },
  { uf: "CE", sigla: "CE", nome: "Ceara" },
  { uf: "DF", sigla: "DF", nome: "Distrito Federal" },
  { uf: "ES", sigla: "ES", nome: "Espirito Santo" },
  { uf: "GO", sigla: "GO", nome: "Goias" },
  { uf: "MA", sigla: "MA", nome: "Maranhao" },
  { uf: "MT", sigla: "MT", nome: "Mato Grosso" },
  { uf: "MS", sigla: "MS", nome: "Mato Grosso do Sul" },
  { uf: "MG", sigla: "MG", nome: "Minas Gerais" },
  { uf: "PA", sigla: "PA", nome: "Para" },
  { uf: "PB", sigla: "PB", nome: "Paraiba" },
  { uf: "PR", sigla: "PR", nome: "Parana" },
  { uf: "PE", sigla: "PE", nome: "Pernambuco" },
  { uf: "PI", sigla: "PI", nome: "Piaui" },
  { uf: "RJ", sigla: "RJ", nome: "Rio de Janeiro" },
  { uf: "RN", sigla: "RN", nome: "Rio Grande do Norte" },
  { uf: "RS", sigla: "RS", nome: "Rio Grande do Sul" },
  { uf: "RO", sigla: "RO", nome: "Rondonia" },
  { uf: "RR", sigla: "RR", nome: "Roraima" },
  { uf: "SC", sigla: "SC", nome: "Santa Catarina" },
  { uf: "SP", sigla: "SP", nome: "Sao Paulo" },
  { uf: "SE", sigla: "SE", nome: "Sergipe" },
  { uf: "TO", sigla: "TO", nome: "Tocantins" }
];

const WORKFLOW_STAGES: WorkflowStage[] = [
  "PROPOSTA",
  "REQUISITOS_CELEBRACAO",
  "PROJETO_BASICO_TERMO_REFERENCIA",
  "PROCESSO_EXECUCAO_LICITACAO",
  "VERIFICACAO_PROCESSO_LICITATORIO",
  "INSTRUMENTOS_CONTRATUAIS",
  "ACOMPANHAMENTO_OBRA"
];

const CHECKLIST_STATUS_OPTIONS: ChecklistItemStatus[] = [
  "NAO_INICIADO",
  "EM_ELABORACAO",
  "CONCLUIDO",
  "ACEITO"
];

const EXTERNAL_LINK_VALIDITY_OPTIONS = [1, 3, 7, 15, 30] as const;

const CHECKLIST_STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  NAO_INICIADO: "Em analise",
  EM_ELABORACAO: "Em elaboracao",
  CONCLUIDO: "Concluido",
  ACEITO: "Aceito"
};

const PROPOSTA_STATUS_OPTIONS: ChecklistItemStatus[] = ["NAO_INICIADO", "ACEITO", "EM_ELABORACAO"];
const PROPOSTA_STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  ACEITO: "Aprovado",
  EM_ELABORACAO: "Ajustar",
  CONCLUIDO: "Aprovado",
  NAO_INICIADO: "Em analise"
};

const STAGE_LABELS_BY_FLOW: Record<InstrumentFlowType, Record<WorkflowStage, string>> = {
  OBRA: {
    PROPOSTA: "Proposta",
    REQUISITOS_CELEBRACAO: "Requisitos de Celebracao",
    PROJETO_BASICO_TERMO_REFERENCIA: "Projeto Basico / Termo de Referencia",
    PROCESSO_EXECUCAO_LICITACAO: "Processo de Execucao (Licitacao)",
    VERIFICACAO_PROCESSO_LICITATORIO: "Verificacao do Processo Licitatorio",
    INSTRUMENTOS_CONTRATUAIS: "Instrumentos Contratuais",
    ACOMPANHAMENTO_OBRA: "Acompanhamento de Obra"
  },
  AQUISICAO_EQUIPAMENTOS: {
    PROPOSTA: "Proposta",
    REQUISITOS_CELEBRACAO: "Requisitos de Celebracao",
    PROJETO_BASICO_TERMO_REFERENCIA: "Termo de Referencia e Projeto",
    PROCESSO_EXECUCAO_LICITACAO: "Processo de Aquisicao (Licitacao)",
    VERIFICACAO_PROCESSO_LICITATORIO: "Verificacao do Processo Licitatorio",
    INSTRUMENTOS_CONTRATUAIS: "Instrumentos Contratuais",
    ACOMPANHAMENTO_OBRA: "Acompanhamento de Entregas"
  },
  EVENTOS: {
    PROPOSTA: "Proposta",
    REQUISITOS_CELEBRACAO: "Requisitos de Celebracao",
    PROJETO_BASICO_TERMO_REFERENCIA: "Plano Basico do Evento",
    PROCESSO_EXECUCAO_LICITACAO: "Processo de Contratacao",
    VERIFICACAO_PROCESSO_LICITATORIO: "Verificacao do Processo",
    INSTRUMENTOS_CONTRATUAIS: "Instrumentos Contratuais",
    ACOMPANHAMENTO_OBRA: "Acompanhamento de Execucao"
  }
};

const getStageLabels = (flowType?: InstrumentFlowType) => {
  return STAGE_LABELS_BY_FLOW[flowType ?? "OBRA"];
};

const getCompletedChecklistStatusByStage = (stage: WorkflowStage): ChecklistItemStatus => {
  return stage === "PROPOSTA" ? "ACEITO" : "CONCLUIDO";
};

const getIncompleteChecklistStatusByStage = (_stage: WorkflowStage): ChecklistItemStatus => {
  return "NAO_INICIADO";
};

const isChecklistStatusCompleted = (status: ChecklistItemStatus) => {
  return status === "ACEITO" || status === "CONCLUIDO";
};

const getNextWorkflowStage = (stage: WorkflowStage): WorkflowStage | null => {
  const index = WORKFLOW_STAGES.indexOf(stage);
  if (index < 0 || index >= WORKFLOW_STAGES.length - 1) {
    return null;
  }
  return WORKFLOW_STAGES[index + 1];
};

const emptyStageFollowUps = (): Record<WorkflowStage, StageFollowUp[]> => ({
  PROPOSTA: [],
  REQUISITOS_CELEBRACAO: [],
  PROJETO_BASICO_TERMO_REFERENCIA: [],
  PROCESSO_EXECUCAO_LICITACAO: [],
  VERIFICACAO_PROCESSO_LICITATORIO: [],
  INSTRUMENTOS_CONTRATUAIS: [],
  ACOMPANHAMENTO_OBRA: []
});

type MenuView =
  | "dashboard"
  | "instrumentos"
  | "proponentes"
  | "emendas_estaduais"
  | "documentos"
  | "geracao_documentos"
  | "pagamentos"
  | "usuarios"
  | "auditoria"
  | "tickets"
  | "assistente"
  | "relatorios"
  | "relatorios_personalizados"
  | "saude_tecnica";
type StageFollowUpFilter = "TODOS" | "SO_MEUS" | "COM_ANEXO" | "COM_TEXTO";
type ReportPdfMode = "executivo" | "analitico";

type ReportFilters = {
  proponente_id: string;
  instrumento_id: string;
  data_de: string;
  data_ate: string;
};

type ObraReportFilters = {
  proponente_id: string;
  instrumento_id: string;
  concedente: string;
  status: InstrumentStatus | "";
  ativo: "true" | "false";
  data_de: string;
  data_ate: string;
};

type AndamentoInstrumentosReportFilters = {
  proponente_id: string;
  status: InstrumentStatus | "";
  instrumento_query: string;
  instrumentos: string[];
};

type TransferenciasEspeciaisFilters = {
  proponente_id: string;
  cnpj: string;
  nome_beneficiario: string;
  uf: string;
  ano: string;
  situacao: string[];
  pagamento: "" | "pago" | "nao_pago";
  codigo_plano_acao: string;
  parlamentar: string;
  page_size: string;
};

const TRANSFERENCIAS_ESPECIAIS_SITUACAO_OPTIONS = [
  "Em elaboração",
  "Aprovado",
  "Em Complementação",
  "Enviado para análise",
  "Legado ADPF 854 STF / NT - TCU"
] as const;

type TransferenciasDiscricionariasFilters = {
  cnpj: string;
  nome_proponente: string;
  concedente: string;
  uf: string;
  municipio: string;
  ano: string;
  vigencia_a_vencer_dias: "" | "30" | "60" | "90";
  situacao_proposta: string;
  situacao_convenio: string;
  nr_convenio: string;
  nr_proposta: string;
  tipo_ente: "" | "estado" | "municipio";
  page_size: string;
};

type TransferenciasDiscricionariasDesembolsoFilters = {
  nr_convenio: string;
  ano: string;
  mes: string;
  page_size: string;
};

type TransferenciasDiscricionariasProponenteDesembolsoFilters = {
  cnpj: string;
  nome_proponente: string;
  ano: string;
  mes: string;
  page_size: string;
};

type TransferenciasDiscricionariasTab = "convenios" | "proponente";
type TransparenciaReportFilters = {
  cnpj: string;
  ano: string;
  ano_pagamento: string;
  max_paginas_convenios: string;
  max_processos: string;
};
type FnsRepassesFilters = {
  ano: string;
  uf_id: string;
  co_ibge_municipio: string;
  cnpj: string;
  codigo_bloco: string;
};

type ConsultaFnsFilters = {
  ano: string;
  uf: string;
  co_municipio_ibge: string;
  nu_proposta: string;
  tp_proposta: string;
  tp_recurso: string;
  tp_emenda: string;
  count: string;
};

type SimecObrasFilters = {
  uf: string;
  muncod: string;
  esfera: string;
  tipologia: string;
  obrid: string;
  vigencia_status: "" | "vencidas" | "30" | "60" | "90";
};

type SimecTermosFilters = {
  dotid_inicio: string;
  dotid_fim: string;
  cursor: string;
  limite: string;
  ano: string;
  secretaria: "" | "E" | "M";
  uf: string;
  q: string;
};

type ExtracaoSimecFilters = {
  uf: string;
  muncod: string;
  ano: string;
  secretaria: "M" | "E";
};

type SismobFilters = {
  proponente_id: string;
  uf: string;
  municipio: string;
  situacao: string[];
  page: number;
  page_size: string;
};

type RelatorioTab =
  | "repasses"
  | "obras"
  | "andamento_instrumentos"
  | "tickets"
  | "transparencia"
  | "transferencias_especiais"
  | "transferencias_discricionarias"
  | "fns_repasses"
  | "consultafns_propostas"
  | "simec_obras"
  | "simec_termos"
  | "extracao_simec"
  | "sismob";

type TicketBoardTab = "abertos" | "resolvidos" | "cancelados";
type TicketFilters = {
  status: TicketStatus | "";
  prioridade: TicketPriority | "";
  origem: TicketSource | "";
  somente_atrasados: boolean;
  instrument_id: string;
  responsavel_user_id: string;
  q: string;
};

type TicketReportFilters = {
  status: TicketStatus | "";
  prioridade: TicketPriority | "";
  origem: TicketSource | "";
  responsavel_user_id: string;
  somente_atrasados: boolean;
  q: string;
  data_de: string;
  data_ate: string;
};

type TechnicalRouteStatus = "checking" | "ok" | "missing" | "error";

type TechnicalHealthState = {
  backendVersion: string;
  reportRouteStatus: TechnicalRouteStatus;
  lastCheckedAt: string | null;
};

type GmailDeliveryHealthState = {
  status: "checking" | "ok" | "error" | "unknown";
  reason: string;
  message: string;
  checkedAt: string | null;
};

type AssistenteChatItem = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  intencao?: AssistenteResposta["intencao"];
  confianca?: AssistenteResposta["confianca"];
  contextoUsado?: boolean;
  perguntaInterpretada?: string;
  fontesConsultadas?: string[];
  sugestoes?: string[];
  dadosResumo?: string[];
  dados?: Record<string, unknown>;
};

const STAGE_FOLLOW_UP_FILTER_LABELS: Record<StageFollowUpFilter, string> = {
  TODOS: "Todos",
  SO_MEUS: "So meus",
  COM_ANEXO: "Com anexo",
  COM_TEXTO: "Com texto"
};

type ProponenteCadastroState = {
  busca: string;
  cnpj_selecionado: string;
};

type EmendaEstadualForm = {
  objeto: string;
  numero: string;
  parlamentar: string;
  vigencia_inicio: string;
  vigencia_fim: string;
  valor: string;
  contrapartida: string;
  municipio_ids: string[];
};

type AdminUserForm = {
  nome: string;
  email: string;
  senha: string;
  role: Role;
  proponente_ids: string[];
};

type PaymentTaxKey = (typeof PAYMENT_TAXES)[number]["key"];

type PaymentForm = {
  instrumento_id: string;
  valor_nota: string;
  valor_bm: string;
  numero_bm: string;
  nota_fiscal: File | null;
  empenho: File | null;
  impostos: Record<PaymentTaxKey, { selecionado: boolean; valor: string; aliquota: string }>;
  observacoes: string;
};

type PaymentFilters = {
  status: PaymentRequestStatus | "";
  proponente_id: string;
  instrumento_id: string;
};

type InstrumentForm = {
  proposta: string;
  instrumento: string;
  objeto: string;
  valor_repasse: string;
  valor_contrapartida: string;
  data_cadastro: string;
  data_assinatura: string;
  vigencia_inicio: string;
  vigencia_fim: string;
  data_prestacao_contas: string;
  data_dou: string;
  concedente: string;
  banco: string;
  agencia: string;
  conta: string;
  fluxo_tipo: InstrumentFlowType;
  proponente_id: string;
  status: InstrumentStatus;
  responsavel: string;
  orgao_executor: string;
  empresa_vencedora: string;
  cnpj_vencedora: string;
  valor_vencedor: string;
  observacoes: string;
};

const REPORT_TAB_BY_SEGMENT: Record<string, RelatorioTab> = {
  repasses: "repasses",
  obras: "obras",
  "andamento-instrumentos": "andamento_instrumentos",
  tickets: "tickets",
  transparencia: "transparencia",
  "transferencias-especiais": "transferencias_especiais",
  "transferencias-discricionarias": "transferencias_discricionarias",
  "fns-repasses": "fns_repasses",
  "consultafns-propostas": "consultafns_propostas",
  "simec-obras": "simec_obras",
  "simec-termos": "simec_termos",
  "extracao-simec": "extracao_simec",
  sismob: "sismob"
};

const REPORT_SEGMENT_BY_TAB: Record<RelatorioTab, string> = {
  repasses: "repasses",
  obras: "obras",
  andamento_instrumentos: "andamento-instrumentos",
  tickets: "tickets",
  transparencia: "transparencia",
  transferencias_especiais: "transferencias-especiais",
  transferencias_discricionarias: "transferencias-discricionarias",
  fns_repasses: "fns-repasses",
  consultafns_propostas: "consultafns-propostas",
  simec_obras: "simec-obras",
  simec_termos: "simec-termos",
  extracao_simec: "extracao-simec",
  sismob: "sismob"
};

const VIEW_PATH_BY_MENU: Record<Exclude<MenuView, "relatorios">, string> = {
  dashboard: "/dashboard",
  instrumentos: "/instrumentos",
  proponentes: "/proponentes",
  emendas_estaduais: "/emendas-estaduais",
  documentos: "/documentos",
  geracao_documentos: "/gerador-documentos",
  pagamentos: "/pagamentos",
  usuarios: "/usuarios",
  auditoria: "/auditoria",
  tickets: "/tickets",
  assistente: "/assistente",
  relatorios_personalizados: "/relatorios/repasses",
  saude_tecnica: "/saude-tecnica"
};

type NavigationState = {
  activeView: MenuView;
  relatorioTab: RelatorioTab;
  instrumentPageId: number | null;
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const formatChatTime = (value: string) =>
  new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });

const emptyAssistenteConversa = (): AssistenteChatItem[] => [];

const mapAssistenteSessionToConversa = (session: AssistenteSessionDetail): AssistenteChatItem[] =>
  session.messages.map((item) => ({
    id: item.id,
    role: item.role,
    text: item.text,
    createdAt: item.created_at
  }));

const normalizeAssistenteSessionTitle = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Conversa sem titulo";
  }
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}...` : trimmed;
};

const readInstrumentIdFromPath = (pathname: string): number | null => {
  const match = /^\/instrumentos\/(\d+)$/.exec(pathname);
  if (!match) {
    return null;
  }

  const id = Number(match[1]);
  return Number.isNaN(id) ? null : id;
};

const parseNavigationFromUrl = (pathname: string): NavigationState => {
  const instrumentId = readInstrumentIdFromPath(pathname);
  if (instrumentId !== null) {
    return {
      activeView: "instrumentos",
      relatorioTab: "repasses",
      instrumentPageId: instrumentId
    };
  }

  const normalizedPath = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (normalizedPath === "/" || normalizedPath === "/dashboard") {
    return { activeView: "dashboard", relatorioTab: "repasses", instrumentPageId: null };
  }
  if (normalizedPath === "/instrumentos") {
    return { activeView: "instrumentos", relatorioTab: "repasses", instrumentPageId: null };
  }
  if (normalizedPath === "/proponentes") {
    return { activeView: "proponentes", relatorioTab: "repasses", instrumentPageId: null };
  }
  if (normalizedPath === "/emendas-estaduais") {
    return { activeView: "emendas_estaduais", relatorioTab: "repasses", instrumentPageId: null };
  }
  if (normalizedPath === "/documentos") {
    return { activeView: "documentos", relatorioTab: "repasses", instrumentPageId: null };
  }
  if (normalizedPath === "/gerador-documentos") {
    return { activeView: "geracao_documentos", relatorioTab: "repasses", instrumentPageId: null };
  }
  if (normalizedPath === "/pagamentos") {
    return { activeView: "pagamentos", relatorioTab: "repasses", instrumentPageId: null };
  }
  if (normalizedPath === "/usuarios") {
    return { activeView: "usuarios", relatorioTab: "repasses", instrumentPageId: null };
  }
  if (normalizedPath === "/auditoria") {
    return { activeView: "auditoria", relatorioTab: "repasses", instrumentPageId: null };
  }
  if (normalizedPath === "/tickets") {
    return { activeView: "tickets", relatorioTab: "repasses", instrumentPageId: null };
  }
  if (normalizedPath === "/assistente") {
    return { activeView: "assistente", relatorioTab: "repasses", instrumentPageId: null };
  }
  if (normalizedPath === "/saude-tecnica") {
    return { activeView: "saude_tecnica", relatorioTab: "repasses", instrumentPageId: null };
  }
  if (normalizedPath === "/relatorios") {
    return { activeView: "relatorios", relatorioTab: "repasses", instrumentPageId: null };
  }

  const reportMatch = /^\/relatorios\/([a-z0-9-]+)$/.exec(normalizedPath);
  if (reportMatch) {
    return {
      activeView: "relatorios",
      relatorioTab: REPORT_TAB_BY_SEGMENT[reportMatch[1]] ?? "repasses",
      instrumentPageId: null
    };
  }

  return { activeView: "dashboard", relatorioTab: "repasses", instrumentPageId: null };
};

const getPathForView = (view: MenuView, relatorioTab: RelatorioTab) => {
  if (view === "relatorios") {
    return `/relatorios/${REPORT_SEGMENT_BY_TAB[relatorioTab]}`;
  }
  return VIEW_PATH_BY_MENU[view];
};

const summarizeText = (value: string, maxLength = 140) => {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trimEnd()}...`;
};

const assistenteConfidenceLabel = (confianca?: AssistenteResposta["confianca"]) => {
  if (confianca === "alta") {
    return "Confianca alta";
  }
  if (confianca === "media") {
    return "Confianca media";
  }
  if (confianca === "baixa") {
    return "Confianca baixa";
  }
  return null;
};

const summarizeAssistenteDados = (dados?: Record<string, unknown>): string[] => {
  if (!dados) {
    return [];
  }

  const linhas: string[] = [];
  const push = (label: string, value: unknown) => {
    if (value === null || value === undefined || value === "") {
      return;
    }
    linhas.push(`${label}: ${String(value)}`);
  };

  if (typeof dados.cidade === "string" && typeof dados.uf === "string") {
    linhas.push(`Local: ${dados.cidade}/${dados.uf}`);
  } else if (typeof dados.cidade === "string") {
    linhas.push(`Local: ${dados.cidade}`);
  }

  if (typeof dados.valor_desembolso === "number") {
    linhas.push(
      `Desembolso: ${dados.valor_desembolso.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      })}`
    );
  }

  push("Instrumentos ativos", dados.instrumentos_ativos);
  push("Instrumentos totais", dados.instrumentos_total);
  push("Instrumentos encontrados", dados.instrumentos);
  push("Proponentes encontrados", dados.proponentes_encontrados);
  push("Percentual", typeof dados.percentual_execucao === "number" ? `${dados.percentual_execucao}%` : dados.percentual_execucao);
  push("Obras com percentual", dados.obras_com_percentual);
  push("Percentual medio", typeof dados.percentual_medio === "number" ? `${dados.percentual_medio}%` : dados.percentual_medio);
  push("Tickets", dados.total);
  push("Filtro", dados.filtro);
  push("Status filtrado", dados.status_filtrado);

  if (Array.isArray(dados.top) && dados.top.length > 0) {
    linhas.push(`Ranking: ${dados.top.length} cidade(s) no top retornado`);
  }

  if (Array.isArray(dados.amostra) && dados.amostra.length > 0) {
    linhas.push(`Amostra: ${dados.amostra.length} registro(s) destacados`);
  }

  if (Array.isArray(dados.resultados) && dados.resultados.length > 0) {
    linhas.push(`Resultados de conhecimento: ${dados.resultados.length}`);
  }

  if (Array.isArray(dados.candidatos) && dados.candidatos.length > 0) {
    linhas.push(`Candidatos proximos: ${dados.candidatos.length}`);
  }

  return linhas.slice(0, 5);
};

const formatAssistenteScalar = (value: unknown): string => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (typeof value === "boolean") {
    return value ? "Sim" : "Nao";
  }
  return String(value);
};

const renderAssistenteRecordSummary = (record: Record<string, unknown>, prefix: string): ReactNode => {
  const keys = Object.keys(record)
    .filter((key) => !Array.isArray(record[key]) && typeof record[key] !== "object")
    .slice(0, 6);

  if (keys.length === 0) {
    return null;
  }

  return (
    <div className="assistant-structured-fields">
      {keys.map((key) => (
        <div key={`${prefix}-${key}`} className="assistant-structured-field">
          <span>{key.replace(/_/g, " ")}</span>
          <strong>{formatAssistenteScalar(record[key])}</strong>
        </div>
      ))}
    </div>
  );
};

const renderAssistenteStructuredData = (
  dados: Record<string, unknown> | undefined,
  renderActions?: (record: Record<string, unknown>, index: number, section: "top" | "sample" | "result") => ReactNode
): ReactNode => {
  if (!dados) {
    return null;
  }

  const top = Array.isArray(dados.top) ? dados.top : [];
  const amostra = Array.isArray(dados.amostra) ? dados.amostra : [];
  const resultados = Array.isArray(dados.resultados) ? dados.resultados : [];

  const topRecords = top.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null).slice(0, 5);
  const amostraRecords = amostra
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .slice(0, 5);
  const resultadoRecords = resultados
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .slice(0, 3);

  if (topRecords.length === 0 && amostraRecords.length === 0 && resultadoRecords.length === 0) {
    return null;
  }

  return (
    <div className="assistant-structured-blocks">
      {topRecords.length > 0 ? (
        <div className="assistant-structured-section">
          <span className="assistant-structured-title">Top resultados</span>
          <div className="assistant-structured-list">
            {topRecords.map((record, index) => (
              <article key={`top-${index}`} className="assistant-structured-card">
                {renderAssistenteRecordSummary(record, `top-${index}`)}
                {renderActions ? renderActions(record, index, "top") : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}
      {amostraRecords.length > 0 ? (
        <div className="assistant-structured-section">
          <span className="assistant-structured-title">Amostra</span>
          <div className="assistant-structured-list">
            {amostraRecords.map((record, index) => (
              <article key={`sample-${index}`} className="assistant-structured-card">
                {renderAssistenteRecordSummary(record, `sample-${index}`)}
                {renderActions ? renderActions(record, index, "sample") : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}
      {resultadoRecords.length > 0 ? (
        <div className="assistant-structured-section">
          <span className="assistant-structured-title">Evidencias</span>
          <div className="assistant-structured-list">
            {resultadoRecords.map((record, index) => (
              <article key={`result-${index}`} className="assistant-structured-card">
                {renderAssistenteRecordSummary(record, `result-${index}`)}
                {renderActions ? renderActions(record, index, "result") : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const formatFileSize = (size: number) => {
  if (size < 1024) {
    return `${size} B`;
  }
  const kb = size / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
};

const readTicketIdFromSearch = (search: string): number | null => {
  const params = new URLSearchParams(search);
  const raw = params.get("ticket");
  if (!raw) {
    return null;
  }

  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const parseDateOnly = (value: string) => {
  const dateOnly = value.trim().match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/)?.[1] ?? "";
  if (!dateOnly) {
    return null;
  }
  const parsed = new Date(`${dateOnly}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateOnlyPtBr = (value: string) => {
  const parsed = parseDateOnly(value);
  if (!parsed) {
    return "Data invalida";
  }
  return parsed.toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

const formatUnixDatePtBr = (value?: number | null) => {
  if (value == null || !Number.isFinite(value)) {
    return "-";
  }
  const normalized = value > 9999999999 ? value : value * 1000;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleDateString("pt-BR");
};

const getDaysUntilDate = (value: string) => {
  const dueDate = parseDateOnly(value);
  if (!dueDate) {
    return null;
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dueUtc = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  return Math.floor((dueUtc - todayUtc) / (1000 * 60 * 60 * 24));
};

const formatRelativeTimeFromIso = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "agora";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) {
    return "agora";
  }
  if (diffMinutes < 60) {
    return `ha ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `ha ${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `ha ${diffDays}d`;
};

const formatTicketSla = (ticket: Ticket) => {
  if (!ticket.prazo_alvo) {
    return "Sem prazo";
  }

  const dueDate = parseDateOnly(ticket.prazo_alvo);
  if (!dueDate) {
    return "Prazo invalido";
  }

  if (ticket.status === "RESOLVIDO" && ticket.resolvido_em) {
    const resolvedAt = new Date(ticket.resolvido_em);
    const resolvedUtc = Date.UTC(resolvedAt.getUTCFullYear(), resolvedAt.getUTCMonth(), resolvedAt.getUTCDate());
    const dueUtc = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
    const diffDays = Math.floor((resolvedUtc - dueUtc) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      return "Resolvido no prazo";
    }
    return `Resolvido com ${diffDays} dia(s) de atraso`;
  }

  if (ticket.status === "CANCELADO") {
    return "Cancelado";
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dueUtc = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const diffDays = Math.floor((dueUtc - todayUtc) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return `Atrasado ha ${Math.abs(diffDays)} dia(s)`;
  }
  if (diffDays === 0) {
    return "Vence hoje";
  }
  return `Vence em ${diffDays} dia(s)`;
};

const isTicketOverdue = (ticket: Ticket) => {
  if (!ticket.prazo_alvo) {
    return false;
  }
  if (ticket.status !== "ABERTO" && ticket.status !== "EM_ANDAMENTO") {
    return false;
  }
  const dueDate = parseDateOnly(ticket.prazo_alvo);
  if (!dueDate) {
    return false;
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dueUtc = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  return dueUtc < todayUtc;
};

const formatTicketInstrumentLabel = (ticket: Ticket, emptyLabel = "Sem instrumento") => {
  if (ticket.instrumento) {
    const base = `${ticket.instrumento.instrumento} (proposta ${ticket.instrumento.proposta})`;
    const objeto = normalizeReadableText(ticket.instrumento.objeto)?.trim();
    if (objeto) {
      return `${base} - Objeto: ${objeto}`;
    }
    return base;
  }

  return ticket.instrumento_informado ?? emptyLabel;
};

const moveUpdatedTicketToTop = (items: Ticket[], updated: Ticket) => {
  return [updated, ...items.filter((item) => item.id !== updated.id)];
};

const resolveConsultaFnsNuProposta = (item: ConsultaFnsPropostaItem) => {
  const direct = (item.nuProposta ?? "").trim();
  if (direct !== "") {
    return direct;
  }

  const fromLinha = item.linhaPropostas?.find((entry) => (entry.nuProposta ?? "").trim() !== "")?.nuProposta;
  return (fromLinha ?? "").trim();
};

const sumConsultaFnsValorEmenda = (item: ConsultaFnsPropostaItem) => {
  const valores = (item.parlamentares ?? [])
    .map((entry) => Number(entry?.vlIndObjeto ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (valores.length === 0) {
    return null;
  }

  return valores.reduce((acc, current) => acc + current, 0);
};

const resolveConsultaFnsDataPagamento = (item: ConsultaFnsPropostaItem) => {
  const pagamentos = item.pagamentos ?? [];
  if (pagamentos.length === 0) {
    return "-";
  }

  const timestamps = pagamentos
    .map((entry) => Number(entry?.dtCriacaoSiafi ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (timestamps.length === 0) {
    return "-";
  }

  const latest = Math.max(...timestamps);
  return formatUnixDatePtBr(latest);
};

const resolveConsultaFnsParlamentarLabel = (item: ConsultaFnsPropostaItem) => {
  const parlamentar = item.parlamentares?.[0]?.noApelidoPolitico?.trim() ?? "";
  if (parlamentar !== "") {
    return parlamentar;
  }

  const recurso = (item.dsTipoRecurso ?? "").trim().toUpperCase();
  if (recurso.includes("PROGRAMA")) {
    return "PROGRAMA";
  }

  return "-";
};

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

type TicketForm = {
  titulo: string;
  descricao: string;
  prioridade: TicketPriority;
  prazo_alvo: string;
  instrument_id: string;
  instrumento_informado: string;
  responsavel_user_id: string;
};

const formatBankInfo = (item: { banco: string | null; agencia: string | null; conta: string | null }) => {
  return [item.banco, item.agencia ? `Ag ${item.agencia}` : null, item.conta ? `Conta ${item.conta}` : null]
    .filter((value) => Boolean(value))
    .join(" | ");
};

const toAbsoluteUrl = (value: string) => {
  const resolveApiPath = (apiPath: string) => {
    const safePath = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
    if (safePath.startsWith("/api/")) {
      return buildApiAbsoluteUrl(safePath);
    }
    return safePath;
  };

  if (value.startsWith("/api/")) {
    return resolveApiPath(value);
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const parsed = new URL(value);
      if (parsed.pathname.startsWith("/api/") && parsed.host !== window.location.host) {
        return resolveApiPath(`${parsed.pathname}${parsed.search}`);
      }
      return value;
    } catch {
      return value;
    }
  }
  return new URL(value, window.location.origin).toString();
};

const getExternalLinkState = (file: { origem_link_ativo: boolean; origem_link_expira_em: string | null }) => {
  if (file.origem_link_ativo) {
    return { label: "Link ativo", tone: "ok" as const };
  }
  if (file.origem_link_expira_em && new Date(file.origem_link_expira_em).getTime() < Date.now()) {
    return { label: "Link expirado", tone: "warn" as const };
  }
  return { label: "Link desativado", tone: "warn" as const };
};

const getChecklistStatusVisual = (status: ChecklistItemStatus) => {
  if (status === "ACEITO" || status === "CONCLUIDO") {
    return { icon: "OK", tone: "done" as const };
  }
  if (status === "EM_ELABORACAO") {
    return { icon: "!", tone: "adjust" as const };
  }
  return { icon: "i", tone: "analysis" as const };
};

const getChecklistStatusOptionLabel = (status: ChecklistItemStatus, label: string) => {
  return `${getChecklistStatusVisual(status).icon} ${label}`;
};

const getInitials = (name: string | null | undefined, email: string) => {
  const base = (name && name.trim().length > 0 ? name : email).trim();
  if (base.length === 0) {
    return "U";
  }
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

const blankFilters = (): InstrumentFilters => ({
  status: "",
  concedente: "",
  proponente_id: "",
  sync_repasses_desembolsos: "false",
  ativo: "true",
  vigencia_de: "",
  vigencia_ate: ""
});

const emptyReportFilters = (): ReportFilters => ({
  proponente_id: "",
  instrumento_id: "",
  data_de: "",
  data_ate: ""
});

const emptyObraReportFilters = (): ObraReportFilters => ({
  proponente_id: "",
  instrumento_id: "",
  concedente: "",
  status: "",
  ativo: "true",
  data_de: "",
  data_ate: ""
});

const emptyAndamentoInstrumentosReportFilters = (): AndamentoInstrumentosReportFilters => ({
  proponente_id: "",
  status: "",
  instrumento_query: "",
  instrumentos: []
});

const normalizeInstrumentLookup = (value: string) => value.replace(/[^a-z0-9]/gi, "").toLowerCase();

const emptyTransferenciasEspeciaisFilters = (): TransferenciasEspeciaisFilters => ({
  proponente_id: "",
  cnpj: "",
  nome_beneficiario: "",
  uf: "",
  ano: "",
  situacao: [],
  pagamento: "",
  codigo_plano_acao: "",
  parlamentar: "",
  page_size: "20"
});

const emptyTransferenciasDiscricionariasFilters = (): TransferenciasDiscricionariasFilters => ({
  cnpj: "",
  nome_proponente: "",
  concedente: "",
  uf: "",
  municipio: "",
  ano: "",
  vigencia_a_vencer_dias: "",
  situacao_proposta: "",
  situacao_convenio: "",
  nr_convenio: "",
  nr_proposta: "",
  tipo_ente: "",
  page_size: "20"
});

const emptyTransferenciasDiscricionariasDesembolsoFilters = (): TransferenciasDiscricionariasDesembolsoFilters => ({
  nr_convenio: "",
  ano: "",
  mes: "",
  page_size: "50"
});

const emptyTransferenciasDiscricionariasProponenteDesembolsoFilters =
  (): TransferenciasDiscricionariasProponenteDesembolsoFilters => ({
    cnpj: "",
    nome_proponente: "",
    ano: "",
    mes: "",
    page_size: "100"
  });

const emptyTransparenciaReportFilters = (): TransparenciaReportFilters => ({
  cnpj: "",
  ano: String(new Date().getFullYear()),
  ano_pagamento: "",
  max_paginas_convenios: "3",
  max_processos: "30"
});

const emptyFnsRepassesFilters = (): FnsRepassesFilters => ({
  ano: String(new Date().getFullYear()),
  uf_id: "",
  co_ibge_municipio: "",
  cnpj: "",
  codigo_bloco: ""
});

const emptyConsultaFnsFilters = (): ConsultaFnsFilters => ({
  ano: String(new Date().getFullYear()),
  uf: "",
  co_municipio_ibge: "",
  nu_proposta: "",
  tp_proposta: "",
  tp_recurso: "",
  tp_emenda: "",
  count: "20"
});

const emptySimecObrasFilters = (): SimecObrasFilters => ({
  uf: "",
  muncod: "",
  esfera: "",
  tipologia: "",
  obrid: "",
  vigencia_status: ""
});

const emptySimecTermosFilters = (): SimecTermosFilters => ({
  dotid_inicio: "",
  dotid_fim: "",
  cursor: "50000",
  limite: "50",
  ano: "",
  secretaria: "",
  uf: "",
  q: ""
});

const emptyExtracaoSimecFilters = (): ExtracaoSimecFilters => ({
  uf: "",
  muncod: "",
  ano: "",
  secretaria: "M"
});

const emptySismobFilters = (): SismobFilters => ({
  proponente_id: "",
  uf: "",
  municipio: "",
  situacao: [],
  page: 1,
  page_size: "20"
});

const emptyTicketFilters = (): TicketFilters => ({
  status: "",
  prioridade: "",
  origem: "",
  somente_atrasados: false,
  instrument_id: "",
  responsavel_user_id: "",
  q: ""
});

const emptyTicketReportFilters = (): TicketReportFilters => ({
  status: "",
  prioridade: "",
  origem: "",
  responsavel_user_id: "",
  somente_atrasados: false,
  q: "",
  data_de: "",
  data_ate: ""
});

const emptyTicketForm = (): TicketForm => ({
  titulo: "",
  descricao: "",
  prioridade: "MEDIA",
  prazo_alvo: "",
  instrument_id: "",
  instrumento_informado: "",
  responsavel_user_id: ""
});

const emptyInstrumentForm = (): InstrumentForm => ({
  proposta: "",
  instrumento: "",
  objeto: "",
  valor_repasse: formatCurrencyInput(0),
  valor_contrapartida: formatCurrencyInput(0),
  data_cadastro: todayDate(),
  data_assinatura: "",
  vigencia_inicio: todayDate(),
  vigencia_fim: todayDate(),
  data_prestacao_contas: "",
  data_dou: "",
  concedente: "",
  banco: "",
  agencia: "",
  conta: "",
  fluxo_tipo: "OBRA",
  proponente_id: "",
  status: "EM_ELABORACAO",
  responsavel: "",
  orgao_executor: "",
  empresa_vencedora: "",
  cnpj_vencedora: "",
  valor_vencedor: formatCurrencyInput(0),
  observacoes: ""
});

const emptyProponenteCadastroState = (): ProponenteCadastroState => ({
  busca: "",
  cnpj_selecionado: ""
});

const emptyEmendaEstadualForm = (): EmendaEstadualForm => ({
  objeto: "",
  numero: "",
  parlamentar: "",
  vigencia_inicio: todayDate(),
  vigencia_fim: todayDate(),
  valor: formatCurrencyInput(0),
  contrapartida: formatCurrencyInput(0),
  municipio_ids: []
});

const emptyAdminUserForm = (): AdminUserForm => ({
  nome: "",
  email: "",
  senha: "",
  role: "CONSULTA",
  proponente_ids: []
});

const emptyPaymentForm = (): PaymentForm => ({
  instrumento_id: "",
  valor_nota: formatCurrencyInput(0),
  valor_bm: formatCurrencyInput(0),
  numero_bm: "",
  nota_fiscal: null,
  empenho: null,
  impostos: {
    inss: { selecionado: false, valor: formatCurrencyInput(0), aliquota: "0" },
    iss: { selecionado: false, valor: formatCurrencyInput(0), aliquota: "0" },
    pis: { selecionado: false, valor: formatCurrencyInput(0), aliquota: "0" },
    cofins: { selecionado: false, valor: formatCurrencyInput(0), aliquota: "0" },
    ir: { selecionado: false, valor: formatCurrencyInput(0), aliquota: "0" }
  },
  observacoes: ""
});

const emptyPaymentFilters = (): PaymentFilters => ({
  status: "",
  proponente_id: "",
  instrumento_id: ""
});

const readStoredUser = (): User | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<User>;
    if (!parsed || typeof parsed.id !== "number" || typeof parsed.nome !== "string" || typeof parsed.email !== "string") {
      return null;
    }
    return {
      id: parsed.id,
      nome: parsed.nome,
      email: parsed.email,
      role: (parsed.role as User["role"]) ?? "CONSULTA",
      avatar_url: parsed.avatar_url ?? null
    };
  } catch {
    return null;
  }
};

const asOptional = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const asOptionalNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits === "") {
    return 0;
  }

  return Number(digits) / 100;
};

const formatCurrencyInput = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

const normalizeCurrencyInput = (value: string) => formatCurrencyInput(parseCurrencyInput(value));

const parsePaymentCurrencyInput = (value: string) => {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")
    .trim();

  if (normalized === "" || normalized === "-" || normalized === ".") {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizePaymentCurrencyInput = (value: string) => formatCurrencyInput(parsePaymentCurrencyInput(value));

const calculatePaymentTaxesTotal = (impostos: PaymentForm["impostos"]) =>
  PAYMENT_TAXES.reduce((acc, tax) => {
    const item = impostos[tax.key];
    if (!item.selecionado) {
      return acc;
    }
    return acc + parsePaymentCurrencyInput(item.valor);
  }, 0);

const calculateRepassePercentage = (valorJaRepassado: number, valorRepasse: number) => {
  if (valorRepasse <= 0) {
    return 0;
  }

  const percentage = (valorJaRepassado / valorRepasse) * 100;
  return Math.max(0, Math.min(100, percentage));
};

const withLoadedRepasses = async (authToken: string, instrument: Instrument): Promise<Instrument> => {
  try {
    const response = await listInstrumentRepasses(authToken, instrument.id);
    return {
      ...instrument,
      repasses: response.itens ?? []
    };
  } catch {
    return {
      ...instrument,
      repasses: instrument.repasses ?? []
    };
  }
};

const toPayload = (form: InstrumentForm): InstrumentPayload => {
  const valorRepasse = parseCurrencyInput(form.valor_repasse);
  const valorContrapartida = parseCurrencyInput(form.valor_contrapartida);
  const valorVencedor = parseCurrencyInput(form.valor_vencedor);

  if (Number.isNaN(valorRepasse) || Number.isNaN(valorContrapartida) || Number.isNaN(valorVencedor)) {
    throw new Error("Valores de repasse/contrapartida invalidos.");
  }

  if (form.vigencia_fim < form.vigencia_inicio) {
    throw new Error("Vigencia fim deve ser maior ou igual a vigencia inicio.");
  }

  if (form.data_assinatura && form.data_assinatura > todayDate()) {
    throw new Error("Data de assinatura nao pode ser futura.");
  }

  return {
    proposta: form.proposta.trim(),
    instrumento: form.instrumento.trim(),
    objeto: form.objeto.trim(),
    valor_repasse: valorRepasse,
    valor_contrapartida: valorContrapartida,
    data_cadastro: form.data_cadastro,
    data_assinatura: asOptional(form.data_assinatura),
    vigencia_inicio: form.vigencia_inicio,
    vigencia_fim: form.vigencia_fim,
    data_prestacao_contas: asOptional(form.data_prestacao_contas),
    data_dou: asOptional(form.data_dou),
    concedente: form.concedente.trim(),
    banco: asOptional(form.banco),
    agencia: asOptional(form.agencia),
    conta: asOptional(form.conta),
    fluxo_tipo: form.fluxo_tipo,
    proponente_id: asOptionalNumber(form.proponente_id),
    status: form.status,
    responsavel: asOptional(form.responsavel),
    orgao_executor: asOptional(form.orgao_executor),
    empresa_vencedora: asOptional(form.empresa_vencedora),
    cnpj_vencedora: asOptional(form.cnpj_vencedora),
    valor_vencedor: valorVencedor > 0 ? valorVencedor : undefined,
    observacoes: asOptional(form.observacoes)
  };
};

const fromInstrumentToForm = (item: Instrument): InstrumentForm => ({
  proposta: item.proposta,
  instrumento: item.instrumento,
  objeto: item.objeto,
  valor_repasse: formatCurrencyInput(item.valor_repasse),
  valor_contrapartida: formatCurrencyInput(item.valor_contrapartida),
  data_cadastro: item.data_cadastro ?? todayDate(),
  data_assinatura: item.data_assinatura ?? "",
  vigencia_inicio: item.vigencia_inicio ?? todayDate(),
  vigencia_fim: item.vigencia_fim ?? todayDate(),
  data_prestacao_contas: item.data_prestacao_contas ?? "",
  data_dou: item.data_dou ?? "",
  concedente: item.concedente,
  banco: item.banco ?? "",
  agencia: item.agencia ?? "",
  conta: item.conta ?? "",
  fluxo_tipo: item.fluxo_tipo,
  proponente_id: item.proponente_id ? String(item.proponente_id) : item.convenete_id ? String(item.convenete_id) : "",
  status: item.status,
  responsavel: item.responsavel ?? "",
  orgao_executor: item.orgao_executor ?? "",
  empresa_vencedora: item.empresa_vencedora ?? "",
  cnpj_vencedora: item.cnpj_vencedora ?? "",
  valor_vencedor: formatCurrencyInput(item.valor_vencedor ?? 0),
  observacoes: item.observacoes ?? ""
});

const toFiniteNumber = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getInstrumentRepassadoTotal = (item: Instrument) => {
  const fromField = toFiniteNumber((item as { valor_ja_repassado?: unknown }).valor_ja_repassado);
  const fromRepasses = Array.isArray(item.repasses)
    ? item.repasses.reduce((acc, repasse) => acc + toFiniteNumber(repasse.valor_repasse), 0)
    : 0;
  return Math.max(fromField, fromRepasses);
};

const getInstrumentPercentualRepassado = (item: Instrument) => {
  const fromField = toFiniteNumber((item as { percentual_repassado?: unknown }).percentual_repassado);
  if (fromField > 0) {
    return fromField;
  }

  const valorRepasse = toFiniteNumber(item.valor_repasse);
  if (valorRepasse <= 0) {
    return 0;
  }

  return Math.min(100, (getInstrumentRepassadoTotal(item) / valorRepasse) * 100);
};

const formatCurrency = (value: number) =>
  toFiniteNumber(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatCnpj = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

const normalizeLocationLabel = (value: string) => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
};

const normalizeReadableText = (value: string | null | undefined) => {
  if (value === null || value === undefined) {
    return value;
  }
  const hasSuspiciousEncoding = /[ÃÂ�\u0080-\u009F]/.test(value);
  if (!hasSuspiciousEncoding) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(Array.from(value).map((char) => char.charCodeAt(0) & 0xff));
    const repaired = new TextDecoder("utf-8").decode(bytes);
    if (repaired.includes("\uFFFD")) {
      return value.replace(/[\u0080-\u009F]/g, "");
    }
    return repaired.replace(/[\u0080-\u009F]/g, "");
  } catch {
    return value.replace(/[\u0080-\u009F]/g, "");
  }
};

const normalizeReadableTextSafe = (value: string | null | undefined, fallback = "-") => {
  const normalized = normalizeReadableText(value);
  if (normalized === null || normalized === undefined) {
    return fallback;
  }
  const trimmed = normalized.trim();
  return trimmed === "" ? fallback : trimmed;
};

const normalizeUnknownTextSafe = (value: unknown, fallback = "-") => {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === "string") {
    return normalizeReadableTextSafe(value, fallback);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    const text = String(value).trim();
    return text === "" ? fallback : text;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidate = record.sigla ?? record.uf ?? record.nomeIBGE ?? record.nome ?? record.descricao ?? null;
    if (typeof candidate === "string" || typeof candidate === "number" || typeof candidate === "boolean") {
      return normalizeUnknownTextSafe(candidate, fallback);
    }
  }
  return fallback;
};

const normalizeMultilineTextSafe = (value: string | null | undefined, fallback = "-") => {
  const normalized = normalizeReadableText(value);
  if (normalized === null || normalized === undefined) {
    return fallback;
  }

  const trimmed = normalized.trim();
  if (trimmed === "") {
    return fallback;
  }

  return trimmed.replace(/\r\n/g, "\n");
};

const readEmendaIdFromSearch = (search: string): number | null => {
  const params = new URLSearchParams(search);
  const raw = params.get("emenda");
  if (!raw) {
    return null;
  }

  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const CRITICAL_PENDING_TERMS = [
  "urgente",
  "prazo",
  "vencimento",
  "vencer",
  "imediato",
  "bloqueio",
  "suspens",
  "risco",
  "pendente",
  "inadimpl",
  "notifica",
  "regulariza",
  "diligencia",
  "document"
];

const getPendingSeverity = (text: string): "critical" | "normal" => {
  const normalized = normalizeReadableTextSafe(text, "").toLowerCase();
  if (normalized === "") {
    return "normal";
  }
  return CRITICAL_PENDING_TERMS.some((term) => normalized.includes(term)) ? "critical" : "normal";
};

const loadIbgeMunicipiosByUf = async (uf: string): Promise<SimecMunicipioItem[]> => {
  const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios`);
  if (!res.ok) {
    throw new Error(`Falha ao consultar municipios no IBGE (${res.status}).`);
  }

  const payload = (await res.json()) as Array<{ id?: number; nome?: string }>;
  return payload
    .map((item) => ({
      codigo: String(item.id ?? "").trim(),
      uf,
      nome: String(item.nome ?? "").trim()
    }))
    .filter((item) => item.codigo !== "" && item.nome !== "")
    .sort((a, b) => a.nome.localeCompare(b.nome));
};

const parseConvenioList = (value: string) => {
  const set = new Set<string>();
  for (const part of value.split(/[\n,;]+/)) {
    const cleaned = part.trim();
    if (cleaned !== "") {
      set.add(cleaned);
    }
  }
  return Array.from(set);
};

type DesembolsoParcelaItem = {
  id: number;
  id_desembolso: number | null;
  nr_convenio: string | null;
  data_desembolso: string | null;
};

type SyncStepState = "default" | "active" | "complete";

type SyncStepViewModel = {
  key: string;
  label: string;
  state: SyncStepState;
};

const TRANSFERENCIAS_DISCRICIONARIAS_SYNC_STEPS = [
  { key: "prepare", label: "Preparando" },
  { key: "collect", label: "Coletando" },
  { key: "process", label: "Processando" },
  { key: "finish", label: "Concluindo" }
] as const;

const mapSyncProgressToStepIndex = (progress: number) => {
  if (progress >= 100) {
    return TRANSFERENCIAS_DISCRICIONARIAS_SYNC_STEPS.length - 1;
  }
  if (progress >= 75) {
    return 3;
  }
  if (progress >= 45) {
    return 2;
  }
  if (progress >= 15) {
    return 1;
  }
  return 0;
};

const mapSyncPhaseToStepIndex = (phase: string) => {
  const normalized = phase.trim().toLowerCase();
  if (normalized === "") {
    return null;
  }
  if (
    normalized.includes("conclu") ||
    normalized.includes("final") ||
    normalized.includes("finish")
  ) {
    return 3;
  }
  if (
    normalized.includes("process") ||
    normalized.includes("import") ||
    normalized.includes("parse")
  ) {
    return 2;
  }
  if (
    normalized.includes("colet") ||
    normalized.includes("download") ||
    normalized.includes("api")
  ) {
    return 1;
  }
  if (
    normalized.includes("prepar") ||
    normalized.includes("inici") ||
    normalized.includes("start")
  ) {
    return 0;
  }
  return null;
};

const buildSyncSteps = (params: {
  status: string;
  progress: number;
  phase: string;
}): SyncStepViewModel[] => {
  const normalizedStatus = params.status.trim().toLowerCase();
  const doneStatuses = new Set(["ok", "completed", "complete", "finished", "idle"]);

  if (doneStatuses.has(normalizedStatus) || params.progress >= 100) {
    return TRANSFERENCIAS_DISCRICIONARIAS_SYNC_STEPS.map((step) => ({ ...step, state: "complete" }));
  }

  const phaseStepIndex = mapSyncPhaseToStepIndex(params.phase);
  const activeStepIndex = phaseStepIndex ?? mapSyncProgressToStepIndex(params.progress);

  return TRANSFERENCIAS_DISCRICIONARIAS_SYNC_STEPS.map((step, index) => ({
    ...step,
    state: index < activeStepIndex ? "complete" : index === activeStepIndex ? "active" : "default"
  }));
};

const buildDesembolsoParcelaMap = (items: DesembolsoParcelaItem[]) => {
  const groups = new Map<string, DesembolsoParcelaItem[]>();

  for (const item of items) {
    const convenioKey = item.nr_convenio?.trim() ? item.nr_convenio.trim() : `sem-convenio-${item.id}`;
    const current = groups.get(convenioKey);
    if (current) {
      current.push(item);
    } else {
      groups.set(convenioKey, [item]);
    }
  }

  const parcelaById = new Map<number, number>();

  for (const [, groupItems] of groups) {
    const sorted = [...groupItems].sort((a, b) => {
      const dateA = a.data_desembolso ?? "9999-12-31";
      const dateB = b.data_desembolso ?? "9999-12-31";
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }

      const idA = a.id_desembolso ?? a.id;
      const idB = b.id_desembolso ?? b.id;
      return idA - idB;
    });

    sorted.forEach((item, index) => {
      parcelaById.set(item.id, index + 1);
    });
  }

  return parcelaById;
};

const WEB_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const buildApiAbsoluteUrl = (path: string) => new URL(`${WEB_API_BASE_URL}${path}`, window.location.origin).toString();

const getNcReportLogoUrl = () => buildApiAbsoluteUrl("/api/v1/public/brand-logo");

const getReportLogoUrl = (proponenteLogoUrl?: string | null) => {
  if (proponenteLogoUrl && proponenteLogoUrl.trim() !== "") {
    return toAbsoluteUrl(proponenteLogoUrl);
  }
  return getNcReportLogoUrl();
};

const fetchImageAsDataUrl = async (imageUrl: string) => {
  try {
    const response = await fetch(imageUrl, { mode: "cors", credentials: "omit" });
    if (!response.ok) {
      return imageUrl;
    }

    const blob = await response.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === "string" ? reader.result : imageUrl);
      };
      reader.onerror = () => resolve(imageUrl);
      reader.readAsDataURL(blob);
    });
  } catch {
    return imageUrl;
  }
};

const getDeferredPrintScript = () =>
  `<script>(function(){let printed=false;const run=()=>{if(printed)return;printed=true;setTimeout(()=>window.print(),120);};const logos=Array.from(document.querySelectorAll('img[data-report-logo]'));if(logos.length===0){run();return;}let pending=0;for(const img of logos){if(img.complete){continue;}pending+=1;const done=()=>{pending-=1;if(pending<=0){run();}};img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});}if(pending===0){run();return;}setTimeout(run,2500);})();</script>`;

const buildReportHeadHtml = (title: string, proponenteLogoUrl?: string | null) => {
  const ncLogoUrl = getNcReportLogoUrl();
  const proponenteUrl =
    proponenteLogoUrl && proponenteLogoUrl.trim() !== "" ? getReportLogoUrl(proponenteLogoUrl) : null;

  return `<div class="report-head"><h1>${title}</h1><div class="report-logos"><div class="report-logo-slot"><img data-report-logo src="${ncLogoUrl}" alt="NC Convenios" /><small>NC Convenios</small></div>${proponenteUrl ? `<div class="report-logo-slot"><img data-report-logo src="${proponenteUrl}" alt="Logo do proponente" /><small>Proponente</small></div>` : ""}</div></div>`;
};

const toCsvCell = (value: string | number | boolean | null | undefined) => {
  const safe = String(value ?? "").replace(/"/g, '""');
  return `"${safe}"`;
};

const exportCsv = (items: Instrument[]) => {
  const columns = [
    "id",
    "proposta",
    "instrumento",
    "status",
    "concedente",
    "valor_repasse",
    "valor_contrapartida",
    "valor_total",
    "vigencia_inicio",
    "vigencia_fim",
    "responsavel",
    "percentual_fisico_medicao",
    "status_medicao",
    "ativo"
  ] as const;
  type CsvColumn = (typeof columns)[number];

  const header = columns.map((col) => toCsvCell(col)).join(";");
  const rows = items.map((item) => {
    const row = item as unknown as Record<CsvColumn, string | number | boolean | null | undefined>;
    return columns.map((col) => toCsvCell(row[col])).join(";");
  });
  const csv = [header, ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `instrumentos-${todayDate()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportExcel = (items: Instrument[]) => {
  const rows = items
    .map(
      (item) =>
        `<tr><td>${item.id}</td><td>${item.proposta}</td><td>${item.instrumento}</td><td>${item.status}</td><td>${item.concedente}</td><td>${item.valor_total}</td><td>${item.vigencia_fim ?? ""}</td><td>${item.ativo ? "SIM" : "NAO"}</td></tr>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr><th>ID</th><th>Proposta</th><th>Instrumento</th><th>Status</th><th>Concedente</th><th>Valor Total</th><th>Vigencia Fim</th><th>Ativo</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `instrumentos-${todayDate()}.xls`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportRepasseReportCsv = (report: RepasseReportResponse) => {
  const columns = [
    "id",
    "instrumento_id",
    "proposta",
    "instrumento",
    "data_repasse",
    "valor_repasse",
    "empresa_vencedora"
  ] as const;
  type CsvColumn = (typeof columns)[number];

  const header = columns.map((col) => toCsvCell(col)).join(";");
  const rows = report.repasses.map((item) => {
    const row = item as unknown as Record<CsvColumn, string | number | null>;
    return columns.map((col) => toCsvCell(row[col])).join(";");
  });
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-repasses-${report.filtros.proponente_id ?? report.filtros.convenete_id}-${todayDate()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportRepasseReportExcel = (report: RepasseReportResponse) => {
  const proponenteNome = report.filtros.proponente_nome ?? report.filtros.convenete_nome;
  const proponenteCnpj = report.filtros.proponente_cnpj ?? report.filtros.convenete_cnpj;

  const repasseRows = report.repasses
    .map(
      (item) =>
        `<tr><td>${item.id}</td><td>${item.instrumento_id}</td><td>${item.proposta}</td><td>${item.instrumento}</td><td>${item.data_repasse}</td><td>${item.valor_repasse}</td><td>${item.empresa_vencedora ?? ""}</td></tr>`
    )
    .join("");

  const instrumentoRows = report.instrumentos
    .map(
      (item) =>
        `<tr><td>${item.id}</td><td>${item.proposta}</td><td>${item.instrumento}</td><td>${item.status}</td><td>${item.orgao_concedente}</td><td>${item.banco ?? ""}</td><td>${item.agencia ?? ""}</td><td>${item.conta ?? ""}</td><td>${item.data_prestacao_contas ?? ""}</td><td>${item.empresa_vencedora ?? ""}</td><td>${item.valor_pactuado}</td><td>${item.valor_ja_repassado}</td><td>${item.valor_repassado_periodo}</td><td>${item.saldo_pactuado}</td></tr>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><h3>Resumo</h3><table border="1"><tbody><tr><td>Proponente</td><td>${proponenteNome}</td></tr><tr><td>CNPJ</td><td>${proponenteCnpj}</td></tr><tr><td>Valor repassado no periodo</td><td>${report.kpis.valor_repassado_periodo}</td></tr><tr><td>Quantidade de repasses</td><td>${report.kpis.quantidade_repasses}</td></tr><tr><td>% repassado</td><td>${report.kpis.percentual_repassado.toFixed(2)}%</td></tr></tbody></table><h3>Repasses</h3><table border="1"><thead><tr><th>ID</th><th>Instrumento ID</th><th>Proposta</th><th>Instrumento</th><th>Data</th><th>Valor</th><th>Empresa vencedora</th></tr></thead><tbody>${repasseRows}</tbody></table><h3>Instrumentos</h3><table border="1"><thead><tr><th>ID</th><th>Proposta</th><th>Instrumento</th><th>Status</th><th>Orgao concedente</th><th>Banco</th><th>Agencia</th><th>Conta</th><th>Prestacao de contas</th><th>Empresa vencedora</th><th>Valor pactuado</th><th>Valor ja repassado</th><th>Repassado no periodo</th><th>Saldo</th></tr></thead><tbody>${instrumentoRows}</tbody></table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-repasses-${report.filtros.proponente_id ?? report.filtros.convenete_id}-${todayDate()}.xls`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportRepasseReportPdf = (report: RepasseReportResponse, mode: ReportPdfMode, proponenteLogoUrl?: string | null) => {
  const proponenteNome = report.filtros.proponente_nome ?? report.filtros.convenete_nome;
  const proponenteCnpj = report.filtros.proponente_cnpj ?? report.filtros.convenete_cnpj;

  const popup = window.open("", "_blank");
  if (!popup) {
    return;
  }

  const repasseRows = report.repasses
    .map(
      (item) =>
        `<tr><td>${item.data_repasse}</td><td>${item.instrumento}</td><td style="text-align:right">${formatCurrency(item.valor_repasse)}</td><td>${item.empresa_vencedora ?? "-"}</td></tr>`
    )
    .join("");
  const instrumentRows = report.instrumentos
    .map(
      (item) =>
        `<tr><td>${item.instrumento}</td><td>${item.status}</td><td>${item.orgao_concedente}</td><td>${item.banco ?? "-"}</td><td>${item.agencia ?? "-"}</td><td>${item.conta ?? "-"}</td><td>${item.data_prestacao_contas ?? "-"}</td><td style="text-align:right">${formatCurrency(item.valor_pactuado)}</td><td style="text-align:right">${formatCurrency(item.valor_ja_repassado)}</td><td style="text-align:right">${formatCurrency(item.saldo_pactuado)}</td></tr>`
    )
    .join("");

  const reportHeadHtml = buildReportHeadHtml(`Relatorio de repasses (${mode})`, proponenteLogoUrl);
  const printScript = getDeferredPrintScript();

  popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Relatorio de repasses</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43}.report-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.report-logos{display:flex;align-items:flex-start;gap:12px}.report-logo-slot{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:120px}.report-logo-slot img{max-width:160px;max-height:80px;height:auto;display:block}.report-logo-slot small{font-size:10px;color:#486581}h1,h2{margin:0 0 12px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left}.kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}.kpi div{border:1px solid #cbd5e1;border-radius:8px;padding:10px}</style></head><body>${reportHeadHtml}<p><strong>Proponente:</strong> ${proponenteNome} (${proponenteCnpj})</p><p><strong>Periodo:</strong> ${report.filtros.data_de ?? "inicio"} ate ${report.filtros.data_ate ?? "hoje"}</p><div class="kpi"><div><strong>Repassado no periodo</strong><br/>${formatCurrency(report.kpis.valor_repassado_periodo)}</div><div><strong>Qtd repasses</strong><br/>${report.kpis.quantidade_repasses}</div><div><strong>Valor pactuado</strong><br/>${formatCurrency(report.kpis.valor_pactuado)}</div><div><strong>% repassado</strong><br/>${report.kpis.percentual_repassado.toFixed(2)}%</div></div>${mode === "analitico" ? `<h2>Instrumentos</h2><table><thead><tr><th>Instrumento</th><th>Status</th><th>Orgao concedente</th><th>Banco</th><th>Agencia</th><th>Conta</th><th>Prestacao de contas</th><th>Pactuado</th><th>Ja repassado</th><th>Saldo</th></tr></thead><tbody>${instrumentRows}</tbody></table>` : ""}<h2>Repasses</h2><table><thead><tr><th>Data</th><th>Instrumento</th><th>Valor</th><th>Empresa vencedora</th></tr></thead><tbody>${repasseRows}</tbody></table>${printScript}</body></html>`);
  popup.document.close();
};

const exportObraReportCsv = (report: ObraReportResponse) => {
  const columns = [
    "id",
    "proposta",
    "instrumento",
    "objeto",
    "status",
    "orgao_concedente",
    "banco",
    "agencia",
    "conta",
    "data_prestacao_contas",
    "vigencia_fim",
    "dias_para_vigencia_fim",
    "percentual_obra",
    "valor_pactuado",
    "valor_ja_repassado",
    "valor_boletins_periodo",
    "valor_repasses_periodo",
    "ultimo_boletim_data",
    "ultimo_boletim_valor",
    "risco"
  ] as const;
  type CsvColumn = (typeof columns)[number];

  const header = columns.map((col) => toCsvCell(col)).join(";");
  const rows = report.instrumentos.map((item) => {
    const row = item as unknown as Record<CsvColumn, string | number | null>;
    return columns.map((col) => toCsvCell(row[col])).join(";");
  });

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-obras-${todayDate()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportObraReportExcel = (report: ObraReportResponse) => {
  const instrumentoRows = report.instrumentos
    .map(
      (item) =>
        `<tr><td>${item.id}</td><td>${item.proposta}</td><td>${item.instrumento}</td><td>${item.objeto}</td><td>${item.status}</td><td>${item.orgao_concedente}</td><td>${item.banco ?? ""}</td><td>${item.agencia ?? ""}</td><td>${item.conta ?? ""}</td><td>${item.data_prestacao_contas ?? ""}</td><td>${item.vigencia_fim}</td><td>${item.dias_para_vigencia_fim}</td><td>${item.percentual_obra}</td><td>${item.valor_pactuado}</td><td>${item.valor_ja_repassado}</td><td>${item.valor_boletins_periodo}</td><td>${item.valor_repasses_periodo}</td><td>${item.ultimo_boletim_data ?? ""}</td><td>${item.ultimo_boletim_valor ?? ""}</td><td>${item.risco}</td></tr>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><h3>Resumo</h3><table border="1"><tbody><tr><td>Obras monitoradas</td><td>${report.kpis.obras_monitoradas}</td></tr><tr><td>% medio da obra</td><td>${report.kpis.percentual_medio_obra.toFixed(2)}%</td></tr><tr><td>Boletins no periodo</td><td>${report.kpis.valor_total_boletins_periodo}</td></tr><tr><td>Repasses no periodo</td><td>${report.kpis.valor_total_repasses_periodo}</td></tr><tr><td>Risco alto</td><td>${report.kpis.obras_risco_alto}</td></tr></tbody></table><h3>Obras</h3><table border="1"><thead><tr><th>ID</th><th>Proposta</th><th>Instrumento</th><th>Objeto</th><th>Status</th><th>Orgao concedente</th><th>Banco</th><th>Agencia</th><th>Conta</th><th>Prestacao contas</th><th>Vigencia fim</th><th>Dias vigencia fim</th><th>% obra</th><th>Pactuado</th><th>Ja repassado</th><th>Boletins periodo</th><th>Repasses periodo</th><th>Ultimo boletim data</th><th>Ultimo boletim valor</th><th>Risco</th></tr></thead><tbody>${instrumentoRows}</tbody></table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-obras-${todayDate()}.xls`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportObraReportPdf = (
  report: ObraReportResponse,
  mode: ReportPdfMode,
  proponenteLogoUrl?: string | null,
  concedenteSelecionado?: string
) => {
  const popup = window.open("", "_blank");
  if (!popup) {
    return;
  }

  const instrumentRows = report.instrumentos
    .map(
      (item) =>
        `<tr><td>${item.instrumento}</td><td>${item.objeto}</td><td>${item.status}</td><td>${item.orgao_concedente}</td><td>${item.banco ?? "-"}</td><td>${item.agencia ?? "-"}</td><td>${item.conta ?? "-"}</td><td>${item.percentual_obra.toFixed(2)}%</td><td>${item.dias_para_vigencia_fim}</td><td>${item.risco}</td><td style="text-align:right">${formatCurrency(item.valor_boletins_periodo)}</td><td style="text-align:right">${formatCurrency(item.valor_repasses_periodo)}</td></tr>`
    )
    .join("");

  const reportTitle = concedenteSelecionado
    ? `Relatorio de obras (${mode}) - Concedente: ${concedenteSelecionado}`
    : `Relatorio de obras (${mode})`;
  const reportHeadHtml = buildReportHeadHtml(reportTitle, proponenteLogoUrl);
  const printScript = getDeferredPrintScript();

  popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Relatorio de obras</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43}.report-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.report-logos{display:flex;align-items:flex-start;gap:12px}.report-logo-slot{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:120px}.report-logo-slot img{max-width:160px;max-height:80px;height:auto;display:block}.report-logo-slot small{font-size:10px;color:#486581}h1,h2{margin:0 0 12px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left}.kpi{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:16px 0}.kpi div{border:1px solid #cbd5e1;border-radius:8px;padding:10px}</style></head><body>${reportHeadHtml}<p><strong>Periodo:</strong> ${report.filtros.data_de ?? "inicio"} ate ${report.filtros.data_ate ?? "hoje"}</p><div class="kpi"><div><strong>Obras monitoradas</strong><br/>${report.kpis.obras_monitoradas}</div><div><strong>% medio da obra</strong><br/>${report.kpis.percentual_medio_obra.toFixed(2)}%</div><div><strong>Boletins no periodo</strong><br/>${formatCurrency(report.kpis.valor_total_boletins_periodo)}</div><div><strong>Repasses no periodo</strong><br/>${formatCurrency(report.kpis.valor_total_repasses_periodo)}</div><div><strong>Risco alto</strong><br/>${report.kpis.obras_risco_alto}</div></div>${mode === "analitico" ? `<h2>Instrumentos</h2><table><thead><tr><th>Instrumento</th><th>Objeto</th><th>Status</th><th>Orgao concedente</th><th>Banco</th><th>Agencia</th><th>Conta</th><th>% obra</th><th>Dias vigencia fim</th><th>Risco</th><th>Boletins periodo</th><th>Repasses periodo</th></tr></thead><tbody>${instrumentRows}</tbody></table>` : ""}${printScript}</body></html>`);
  popup.document.close();
};

const exportAndamentoInstrumentosReportPdf = async (
  report: AndamentoInstrumentosReportResponse,
  proponenteLogoUrl?: string | null
) => {
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const formatSolicitacaoCaixaForPdf = (sol: AndamentoInstrumentosReportResponse["itens"][number]["solicitacoes_caixa_email"][number]) => {
    const data = new Date(sol.created_at).toLocaleString("pt-BR");
    const linhas: string[] = [
      `<strong>Data:</strong> ${escapeHtml(data)}`,
      `<strong>Protocolo:</strong> ${escapeHtml(String(sol.id))}`,
      `<strong>De:</strong> ${escapeHtml(sol.origem_email ? normalizeReadableTextSafe(sol.origem_email) : "-")}`,
      `<strong>Assunto:</strong> ${escapeHtml(sol.assunto_email ? normalizeReadableTextSafe(sol.assunto_email) : "-")}`,
      `<strong>Ticket:</strong> ${escapeHtml(sol.ticket?.codigo ? normalizeReadableTextSafe(sol.ticket.codigo) : "-")}`
    ];

    const pendencias = sol.pendencias_email.filter((item) => item.trim() !== "");
    const criticalCount = pendencias.filter((item) => getPendingSeverity(item) === "critical").length;
    const pendenciasHtml =
      pendencias.length > 0
        ? `<div class="sol-pendencias"><strong>Pendencias solicitadas:</strong>${criticalCount > 0 ? ` <span class="sol-critical-badge">${criticalCount} critica(s)</span>` : ""}<ul>${pendencias
            .map((item) => `<li class="${getPendingSeverity(item) === "critical" ? "sol-pendencia-critica" : ""}">${escapeHtml(
              normalizeReadableTextSafe(item, "")
            )}</li>`)
            .join("")}</ul></div>`
        : "";

    return `<div class="solicitacao-item"><div>${linhas.join("<br/>")}</div>${pendenciasHtml}</div>`;
  };

  const formatHistoricoCompletoForPdf = (item: AndamentoInstrumentosReportResponse["itens"][number]) => {
    if (item.historico_completo.length === 0) {
      return "-";
    }

    const formatMultilineHtml = (value: string) => {
      return escapeHtml(normalizeMultilineTextSafe(value, "")).replace(/\n/g, "<br/>");
    };

    return item.historico_completo
      .map((evento) => {
        const linhas: string[] = [
          `<strong>${escapeHtml(new Date(evento.created_at).toLocaleString("pt-BR"))}</strong>`,
          `${escapeHtml(evento.tipo)} - ${escapeHtml(normalizeReadableTextSafe(evento.subtipo_label))}`,
          formatMultilineHtml(evento.descricao)
        ];
        if (evento.usuario?.email) {
          linhas.push(`Usuario: ${escapeHtml(normalizeReadableTextSafe(evento.usuario.nome ?? evento.usuario.email))}`);
        }
        if (evento.ticket?.codigo) {
          linhas.push(`Ticket: ${escapeHtml(normalizeReadableTextSafe(evento.ticket.codigo))}`);
        }
        return `<div class="historico-item">${linhas.join("<br/>")}</div>`;
      })
      .join("");
  };

  const buildStageProgressHtml = (
    currentStage: WorkflowStage | null,
    flowType: InstrumentFlowType | undefined
  ) => {
    const stageLabels = STAGE_LABELS_BY_FLOW[flowType ?? "OBRA"] ?? STAGE_LABELS_BY_FLOW.OBRA;
    const currentIndex = currentStage ? WORKFLOW_STAGES.indexOf(currentStage) : -1;
    const stagesToShow =
      currentIndex >= 0
        ? WORKFLOW_STAGES.slice(0, currentIndex + 1)
        : WORKFLOW_STAGES;

    return stagesToShow
      .map((stage, index) => {
        const chipClass = "stage-chip done";
        const separator = index < stagesToShow.length - 1 ? `<span class="stage-sep">&gt;</span>` : "";
        return `<span class="${chipClass}">${stageLabels[stage]}</span>${separator}`;
      })
      .join("");
  };

  const buildCurrentStageHighlightHtml = (
    currentStage: WorkflowStage | null,
    currentStageLabel: string | null | undefined,
    flowType: InstrumentFlowType | undefined
  ) => {
    const stageLabels = STAGE_LABELS_BY_FLOW[flowType ?? "OBRA"] ?? STAGE_LABELS_BY_FLOW.OBRA;
    const currentLabel =
      (currentStageLabel && normalizeReadableTextSafe(currentStageLabel, "").trim() !== ""
        ? normalizeReadableTextSafe(currentStageLabel, "")
        : currentStage
          ? stageLabels[currentStage] ?? currentStage
          : "") || "";

    if (currentLabel === "") {
      return "-";
    }

    const progressTrail = currentStage ? buildStageProgressHtml(currentStage, flowType) : "";

    return `<div class="pdf-current-stage-card"><div class="pdf-current-stage-header"><div class="pdf-current-stage-label">Etapa atual</div><div class="pdf-current-stage-name">${escapeHtml(currentLabel)}</div></div>${progressTrail ? `<div class="pdf-current-stage-trail">${progressTrail}</div>` : ""}</div>`;
  };

  const popup = window.open("", "_blank");
  if (!popup) {
    return;
  }

  const rows = report.itens
    .map(
      (item) => {
        const solicitacoesEmail = item.solicitacoes_caixa_email.map(formatSolicitacaoCaixaForPdf).join("");

        return `<tr><td>${item.instrumento}</td><td>${INSTRUMENT_STATUS_LABELS[item.status]}</td><td>${normalizeReadableTextSafe(item.objeto)}</td><td>${buildCurrentStageHighlightHtml(item.etapa_atual, item.etapa_atual_label, item.fluxo_tipo)}</td><td style="white-space:pre-wrap">${item.acompanhamento?.texto?.trim() ? `${normalizeReadableTextSafe(item.acompanhamento.texto)}\nPor: ${normalizeReadableTextSafe(item.acompanhamento.usuario.nome ?? item.acompanhamento.usuario.email)}` : "-"}</td><td>${solicitacoesEmail || "-"}</td><td>${formatHistoricoCompletoForPdf(item)}</td><td>${item.acompanhamento?.usuario.nome ?? item.acompanhamento?.usuario.email ?? "-"}</td><td>${item.acompanhamento?.created_at ? new Date(item.acompanhamento.created_at).toLocaleString("pt-BR") : "-"}</td></tr>`;
      }
    )
    .join("");

  const embeddedNcLogoUrl = await fetchImageAsDataUrl(getNcReportLogoUrl());
  const proponenteUrl =
    proponenteLogoUrl && proponenteLogoUrl.trim() !== "" ? getReportLogoUrl(proponenteLogoUrl) : null;
  const reportHeadHtml = `<div class="report-head"><h1>Relatorio de andamento de instrumentos (analitico)</h1><div class="report-logos"><div class="report-logo-slot"><img data-report-logo src="${embeddedNcLogoUrl}" alt="NC Convenios" /><small>NC Convenios</small></div>${proponenteUrl ? `<div class="report-logo-slot"><img data-report-logo src="${proponenteUrl}" alt="Logo do proponente" /><small>Proponente</small></div>` : ""}</div></div>`;
  const printScript = getDeferredPrintScript();

  popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Relatorio de andamento de instrumentos</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43}.report-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.report-logos{display:flex;align-items:flex-start;gap:12px}.report-logo-slot{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:120px}.report-logo-slot img{max-width:160px;max-height:80px;height:auto;display:block}.report-logo-slot small{font-size:10px;color:#486581}h1,h2{margin:0 0 12px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left;vertical-align:top}.kpi{display:grid;grid-template-columns:repeat(1,minmax(0,1fr));gap:10px;margin:16px 0}.kpi div{border:1px solid #cbd5e1;border-radius:8px;padding:10px}.stage-progress{display:flex;align-items:center;flex-wrap:wrap;gap:6px}.stage-chip{display:inline-block;border:1px solid #9fb3c8;border-radius:999px;padding:2px 8px;font-size:11px;line-height:1.3;background:#f8fbff;color:#334e68}.stage-chip.done{background:#e7f7ef;border-color:#8fd2ad;color:#1f6f46}.stage-chip.current{background:#dbeafe;border-color:#2563eb;color:#1d4ed8;font-weight:800;box-shadow:0 0 0 1px rgba(37,99,235,.18)}.stage-sep{color:#627d98;font-size:11px}.pdf-current-stage-card{display:block;min-width:170px;padding:8px 10px;border-radius:12px;border:1px solid #93c5fd;background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%)}.pdf-current-stage-header{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px}.pdf-current-stage-label{font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#1e3a8a}.pdf-current-stage-name{display:inline-block;padding:7px 12px;border-radius:10px;border:1px solid #2563eb;background:#fff;color:#1d4ed8;font-size:13px;font-weight:400;line-height:1.3}.pdf-current-stage-trail{display:flex;align-items:center;flex-wrap:wrap;gap:6px}.solicitacao-item{border:1px solid #dbe5ef;border-radius:8px;padding:8px;margin-bottom:8px;background:#f8fbff}.solicitacao-item:last-child{margin-bottom:0}.sol-pendencias ul{margin:6px 0 0;padding-left:18px}.sol-pendencias li{margin-bottom:2px}.sol-pendencia-critica{color:#9b1c1c;font-weight:700}.sol-critical-badge{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:999px;background:#fee2e2;border:1px solid #fca5a5;color:#9b1c1c;font-size:10px;font-weight:700}.historico-item{border-left:3px solid #9fb3c8;padding-left:8px;margin-bottom:8px}.historico-item:last-child{margin-bottom:0}</style></head><body>${reportHeadHtml}<div class="kpi"><div><strong>Instrumentos no relatorio</strong><br/>${report.resumo.total}</div></div><h2>Detalhamento analitico</h2><table><thead><tr><th>Instrumento</th><th>Situação</th><th>Objeto</th><th>Etapa atual</th><th>Acomp. Atual</th><th>Solicitacoes da Caixa (email)</th><th>Historico completo</th><th>Usuario</th><th>Data</th></tr></thead><tbody>${rows || '<tr><td colspan="9">Sem dados para os filtros informados.</td></tr>'}</tbody></table>${printScript}</body></html>`);
  popup.document.close();
};

const exportTransparenciaReportExcel = (report: TransparenciaReportResponse, proponenteLogoUrl?: string | null) => {
  const convenioRows = report.convenios
    .map(
      (item) =>
        `<tr><td>${item.numero_convenio ?? "-"}</td><td>${item.numero_processo ?? "-"}</td><td>${item.situacao ?? "-"}</td><td>${normalizeUnknownTextSafe(item.municipio)}</td><td>${normalizeUnknownTextSafe(item.uf)}</td><td>${item.objeto ?? "-"}</td><td>${item.orgao ?? "-"}</td><td>${item.tipo_instrumento ?? "-"}</td><td>${item.convenente ?? "-"}</td><td>${item.cnpj_convenente ?? "-"}</td><td style="text-align:right">${item.valor_global == null ? "-" : formatCurrency(item.valor_global)}</td><td style="text-align:right">${item.valor_liberado == null ? "-" : formatCurrency(item.valor_liberado)}</td><td>${item.data_inicio_vigencia ?? "-"}</td><td>${item.data_fim_vigencia ?? "-"}</td><td>${item.emendas_vinculadas}</td></tr>`
    )
    .join("");

  const emendaRows = report.emendas
    .map(
      (item) =>
        `<tr><td>${item.ano ?? "-"}</td><td>${item.codigo_emenda ?? "-"}</td><td>${item.numero_emenda ?? "-"}</td><td>${item.autor ?? "-"}</td><td>${item.tipo_emenda ?? "-"}</td><td>${item.numero_processo ?? "-"}</td><td style="text-align:right">${formatCurrency(item.valor_empenhado)}</td><td style="text-align:right">${formatCurrency(item.valor_liquidado)}</td><td style="text-align:right">${formatCurrency(item.valor_pago)}</td><td>${item.convenios_vinculados.join(", ") || "-"}</td></tr>`
    )
    .join("");

  const documentos = report.documentos_pagamento ?? [];
  const documentoRows = documentos
    .map(
      (doc) =>
        `<tr><td>${doc.convenio_numero ?? "-"}</td><td>${doc.codigo_documento ?? "-"}</td><td>${doc.numero_documento ?? "-"}</td><td>${doc.data ? formatDateOnlyPtBr(doc.data) : "-"}</td><td>${doc.descricao ?? "-"}</td><td>${doc.fase ?? "-"}</td><td>${doc.tipo_documento ?? "-"}</td><td style="text-align:right">${formatCurrency(doc.valor_documento)}</td><td>${doc.observacao_documento ?? "-"}</td><td>${doc.favorecido_cnpj ? formatCnpj(doc.favorecido_cnpj) : "-"}</td><td>${doc.favorecido_nome ?? "-"}</td><td>${doc.orgao_superior_codigo ?? "-"}</td><td>${doc.orgao_superior_nome ?? "-"}</td><td>${doc.orgao_vinculado_codigo ?? "-"}</td><td>${doc.orgao_vinculado_nome ?? "-"}</td><td>${doc.unidade_gestora_codigo ?? "-"}</td><td>${doc.unidade_gestora_nome ?? "-"}</td><td>${doc.gestao_codigo ?? "-"}</td><td>${doc.gestao_nome ?? "-"}</td><td>${doc.processo ?? "-"}</td></tr>`
    )
    .join("");

  const ncLogoUrl = getNcReportLogoUrl();
  const proponenteLogoAbsolute =
    proponenteLogoUrl && proponenteLogoUrl.trim() !== "" ? getReportLogoUrl(proponenteLogoUrl) : null;
  const logoHeader = `<table border="0" cellspacing="0" cellpadding="4"><tr><td><img src="${ncLogoUrl}" alt="NC Convenios" style="max-height:60px;max-width:180px;" /></td><td style="padding-left:16px;"><strong>NC Convenios</strong></td>${
    proponenteLogoAbsolute
      ? `<td style="padding-left:24px;"><img src="${proponenteLogoAbsolute}" alt="Logo proponente" style="max-height:60px;max-width:180px;" /></td><td style="padding-left:16px;"><strong>Proponente</strong></td>`
      : ""
  }</tr></table>`;

  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>${logoHeader}<h3>Filtros</h3><table border="1"><tbody><tr><td>CNPJ</td><td>${formatCnpj(report.filtros.cnpj)}</td></tr><tr><td>Ano</td><td>${report.filtros.ano ?? "-"}</td></tr><tr><td>Ano do pagamento</td><td>${report.filtros.ano_pagamento ?? "-"}</td></tr><tr><td>Max paginas convenios</td><td>${report.filtros.max_paginas_convenios}</td></tr><tr><td>Max processos</td><td>${report.filtros.max_processos}</td></tr></tbody></table><h3>KPIs</h3><table border="1"><tbody><tr><td>Convenios encontrados</td><td>${report.kpis.convenios_encontrados}</td></tr><tr><td>Processos unicos</td><td>${report.kpis.processos_unicos}</td></tr><tr><td>Emendas encontradas</td><td>${report.kpis.emendas_encontradas}</td></tr><tr><td>Valor global convenios</td><td>${formatCurrency(report.kpis.valor_global_convenios)}</td></tr><tr><td>Valor liberado convenios</td><td>${formatCurrency(report.kpis.valor_liberado_convenios)}</td></tr><tr><td>Valor empenhado total</td><td>${formatCurrency(report.kpis.valor_empenhado_total)}</td></tr><tr><td>Valor liquidado total</td><td>${formatCurrency(report.kpis.valor_liquidado_total)}</td></tr><tr><td>Valor pago total</td><td>${formatCurrency(report.kpis.valor_pago_total)}</td></tr></tbody></table><h3>Convenios</h3><table border="1"><thead><tr><th>Convenio</th><th>Processo</th><th>Situacao</th><th>Municipio</th><th>UF</th><th>Objeto</th><th>Orgao</th><th>Tipo instrumento</th><th>Convenente</th><th>CNPJ</th><th>Valor global</th><th>Valor liberado</th><th>Inicio vigencia</th><th>Fim vigencia</th><th>Emendas vinculadas</th></tr></thead><tbody>${convenioRows}</tbody></table><h3>Emendas</h3><table border="1"><thead><tr><th>Ano</th><th>Codigo emenda</th><th>Numero emenda</th><th>Autor</th><th>Tipo</th><th>Processo</th><th>Empenhado</th><th>Liquidado</th><th>Pago</th><th>Convenios vinculados</th></tr></thead><tbody>${emendaRows}</tbody></table><h3>Documentos de pagamento</h3><table border="1"><thead><tr><th>Convenio</th><th>Codigo documento</th><th>Numero documento</th><th>Data</th><th>Descricao</th><th>Fase</th><th>Tipo documento</th><th>Valor documento</th><th>Observacao</th><th>Favorecido CNPJ</th><th>Favorecido nome</th><th>Orgao superior cod.</th><th>Orgao superior</th><th>Orgao vinculado cod.</th><th>Orgao vinculado</th><th>UG cod.</th><th>Unidade gestora</th><th>Gestao cod.</th><th>Gestao</th><th>Processo</th></tr></thead><tbody>${documentoRows || '<tr><td colspan="20">Sem documentos de pagamento</td></tr>'}</tbody></table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-transparencia-${report.filtros.cnpj}-${todayDate()}.xls`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportTransparenciaReportPdf = (report: TransparenciaReportResponse, proponenteLogoUrl?: string | null) => {
  const popup = window.open("", "_blank");
  if (!popup) {
    return;
  }

  const conveniosComEmendas = report.convenios.filter((item) => item.emendas_vinculadas > 0);
  const convenioByReference = new Map<string, (typeof report.convenios)[number]>();
  for (const convenio of conveniosComEmendas) {
    if (convenio.id !== null) {
      convenioByReference.set(`id:${convenio.id}`, convenio);
    }
    const numeroConvenioDigits = (convenio.numero_convenio ?? "").replace(/\D/g, "");
    if (numeroConvenioDigits !== "") {
      convenioByReference.set(`num:${numeroConvenioDigits}`, convenio);
    }
    const numeroProcesso = (convenio.numero_processo ?? "").trim();
    if (numeroProcesso !== "") {
      convenioByReference.set(numeroProcesso, convenio);
    }
  }

  const convenioRows = conveniosComEmendas
    .map(
      (item) =>
        `<tr><td>${item.numero_convenio ?? "-"}</td><td>${item.numero_processo ?? "-"}</td><td>${item.situacao ?? "-"}</td><td>${normalizeUnknownTextSafe(item.municipio)} / ${normalizeUnknownTextSafe(item.uf)}</td><td>${item.objeto ?? "-"}</td><td style="text-align:right">${item.valor_global == null ? "-" : formatCurrency(item.valor_global)}</td><td style="text-align:right">${item.valor_liberado == null ? "-" : formatCurrency(item.valor_liberado)}</td><td>${item.emendas_vinculadas}</td></tr>`
    )
    .join("");

  const emendaRows = report.emendas
    .flatMap((item) => {
      const conveniosAssociados = (item.convenios_vinculados ?? [])
        .map((reference) => convenioByReference.get(reference))
        .filter((convenio): convenio is (typeof report.convenios)[number] => Boolean(convenio));

      return conveniosAssociados.map(
        (convenio) =>
          `<tr><td>${item.ano ?? "-"}</td><td>${item.codigo_emenda ?? "-"}</td><td>${item.numero_emenda ?? "-"}</td><td>${item.autor ?? "-"}</td><td>${item.tipo_emenda ?? "-"}</td><td>${convenio.numero_convenio ?? "-"}</td><td>${convenio.data_inicio_vigencia ? formatDateOnlyPtBr(convenio.data_inicio_vigencia) : "-"}</td><td>${convenio.data_fim_vigencia ? formatDateOnlyPtBr(convenio.data_fim_vigencia) : "-"}</td></tr>`
      );
    })
    .join("");

  const documentoRows = (report.documentos_pagamento ?? [])
    .map(
      (doc) =>
        `<tr><td>${doc.convenio_numero ?? "-"}</td><td>${doc.numero_documento ?? "-"}</td><td>${doc.data ? formatDateOnlyPtBr(doc.data) : "-"}</td><td>${doc.tipo_documento ?? "-"}</td><td style="text-align:right">${formatCurrency(doc.valor_documento)}</td><td>${doc.unidade_gestora_codigo ?? "-"} - ${doc.unidade_gestora_nome ?? "-"}</td><td>${doc.gestao_codigo ?? "-"} - ${doc.gestao_nome ?? "-"}</td></tr>`
    )
    .join("");
  const detalhesOrcamentariosRows = conveniosComEmendas
    .map(
      (item) =>
        `<tr><td>${item.numero_convenio ?? "-"}</td><td>${item.area_atuacao_funcao ?? "-"}</td><td>${item.subfuncao ?? "-"}</td><td>${item.programa ?? "-"}</td><td>${item.acao ?? "-"}</td><td>${item.plano_orcamentario_po ?? "-"}</td></tr>`
    )
    .join("");

  const reportHeadHtml = buildReportHeadHtml("Relatorio Transparencia - Analitico", proponenteLogoUrl);
  const printScript = getDeferredPrintScript();
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Relatorio Transparencia - Analitico</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43}.report-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.report-logos{display:flex;align-items:flex-start;gap:12px}.report-logo-slot{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:120px}.report-logo-slot img{max-width:160px;max-height:80px;height:auto;display:block}.report-logo-slot small{font-size:10px;color:#486581}h1,h2{margin:0 0 12px}.kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}.kpi div{border:1px solid #cbd5e1;border-radius:8px;padding:10px}table{width:100%;border-collapse:collapse;margin-top:10px;margin-bottom:18px}th,td{border:1px solid #cbd5e1;padding:6px;font-size:11px;text-align:left;vertical-align:top}</style></head><body>${reportHeadHtml}<p><strong>CNPJ:</strong> ${formatCnpj(report.filtros.cnpj)} | <strong>Ano emenda:</strong> ${report.filtros.ano ?? "-"} | <strong>Ano pagamento:</strong> ${report.filtros.ano_pagamento ?? "-"}</p><div class="kpi"><div><strong>Convenios</strong><br/>${conveniosComEmendas.length}</div><div><strong>Processos</strong><br/>${report.kpis.processos_unicos}</div><div><strong>Emendas</strong><br/>${report.kpis.emendas_encontradas}</div><div><strong>Valor pago emendas</strong><br/>${formatCurrency(report.kpis.valor_pago_total)}</div></div><h2>Convenios vinculados</h2><table><thead><tr><th>Convenio</th><th>Processo</th><th>Situacao</th><th>Municipio/UF</th><th>Objeto</th><th>Valor global</th><th>Valor liberado</th><th>Emendas vinculadas</th></tr></thead><tbody>${convenioRows || '<tr><td colspan="8">Sem convenios</td></tr>'}</tbody></table><h2>Detalhes Orcamentarios</h2><table><thead><tr><th>Convenio</th><th>Area de Atuacao (Funcao)</th><th>Subfuncao</th><th>Programa</th><th>Acao</th><th>Plano Orcamentario - PO</th></tr></thead><tbody>${detalhesOrcamentariosRows || '<tr><td colspan="6">Sem detalhes orcamentarios</td></tr>'}</tbody></table><h2>Emendas vinculadas aos processos</h2><table><thead><tr><th>Ano</th><th>Codigo emenda</th><th>Numero emenda</th><th>Autor</th><th>Tipo</th><th>Numero do convenio</th><th>Inicio da vigencia</th><th>Fim da vigencia</th></tr></thead><tbody>${emendaRows || '<tr><td colspan="8">Sem emendas</td></tr>'}</tbody></table><h2>Documentos de pagamento detalhados</h2><table><thead><tr><th>Convenio</th><th>Documento</th><th>Data</th><th>Tipo</th><th>Valor</th><th>Unidade gestora</th><th>Gestao</th></tr></thead><tbody>${documentoRows || '<tr><td colspan="7">Sem documentos de pagamento</td></tr>'}</tbody></table>${printScript}</body></html>`);
  popup.document.close();
};

const exportTicketReportCsv = (items: Ticket[]) => {
  const columns = [
    "codigo",
    "status",
    "prioridade",
    "origem",
    "criado_por",
    "responsavel",
    "titulo",
    "instrumento",
    "prazo_alvo",
    "sla",
    "atrasado",
    "created_at",
    "updated_at",
    "resolvido_em"
  ] as const;

  const header = columns.map((col) => toCsvCell(col)).join(";");
  const rows = items.map((item) => {
    const row = {
      codigo: item.codigo,
      status: TICKET_STATUS_LABELS[item.status],
      prioridade: TICKET_PRIORITY_LABELS[item.prioridade],
      origem: TICKET_SOURCE_LABELS[item.origem],
      criado_por: item.criado_por.nome,
      responsavel: item.responsavel?.nome ?? "Nao atribuido",
      titulo: item.titulo,
      instrumento: formatTicketInstrumentLabel(item),
      prazo_alvo: item.prazo_alvo ?? "",
      sla: formatTicketSla(item),
      atrasado: isTicketOverdue(item) ? "SIM" : "NAO",
      created_at: new Date(item.created_at).toLocaleString("pt-BR"),
      updated_at: new Date(item.updated_at).toLocaleString("pt-BR"),
      resolvido_em: item.resolvido_em ? new Date(item.resolvido_em).toLocaleString("pt-BR") : ""
    };

    return columns.map((col) => toCsvCell(row[col])).join(";");
  });

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-tickets-${todayDate()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportTicketReportExcel = (items: Ticket[]) => {
  const rows = items
    .map(
      (item) =>
        `<tr><td>${item.codigo}</td><td>${TICKET_STATUS_LABELS[item.status]}</td><td>${TICKET_PRIORITY_LABELS[item.prioridade]}</td><td>${TICKET_SOURCE_LABELS[item.origem]}</td><td>${item.criado_por.nome}</td><td>${item.responsavel?.nome ?? "Nao atribuido"}</td><td>${item.titulo}</td><td>${formatTicketInstrumentLabel(item)}</td><td>${item.prazo_alvo ?? ""}</td><td>${formatTicketSla(item)}</td><td>${isTicketOverdue(item) ? "SIM" : "NAO"}</td><td>${new Date(item.created_at).toLocaleString("pt-BR")}</td><td>${new Date(item.updated_at).toLocaleString("pt-BR")}</td><td>${item.resolvido_em ? new Date(item.resolvido_em).toLocaleString("pt-BR") : ""}</td></tr>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><h3>Relatorio de tickets</h3><table border="1"><thead><tr><th>Codigo</th><th>Status</th><th>Prioridade</th><th>Origem</th><th>Criado por</th><th>Atribuido</th><th>Titulo</th><th>Instrumento</th><th>Prazo alvo</th><th>SLA</th><th>Atrasado</th><th>Criado em</th><th>Atualizado em</th><th>Resolvido em</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-tickets-${todayDate()}.xls`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportTransferenciasEspeciaisCsv = (report: TransferenciaEspecialPlanoAcaoResponse) => {
  const columns = [
    "id_plano_acao",
    "codigo_plano_acao",
    "ano_plano_acao",
    "modalidade_plano_acao",
    "situacao_plano_acao",
    "nome_beneficiario_plano_acao",
    "uf_beneficiario_plano_acao",
    "emenda_parlamentar_plano_acao",
    "valor_custeio_plano_acao",
    "valor_investimento_plano_acao",
    "id_programa",
    "finalidade",
    "detalhamento_objeto",
    "banco",
    "agencia",
    "conta",
    "saldo_conta_corrente",
    "pagamento_status",
    "data_pagamento_detectado",
    "valor_pago_detectado",
    "documentos_habeis_quantidade",
    "empenhos_quantidade",
    "ordens_pagamento_quantidade",
    "documento_habil_principal",
    "ordem_pagamento_principal",
    "ordem_bancaria_principal"
  ] as const;

  const header = columns.map((col) => toCsvCell(col)).join(";");
  const rows = report.itens.map((item) => {
    const row = {
      id_plano_acao: item.id_plano_acao,
      codigo_plano_acao: item.codigo_plano_acao,
      ano_plano_acao: item.ano_plano_acao,
      modalidade_plano_acao: item.modalidade_plano_acao,
      situacao_plano_acao: item.situacao_plano_acao,
      nome_beneficiario_plano_acao: item.nome_beneficiario_plano_acao,
      uf_beneficiario_plano_acao: item.uf_beneficiario_plano_acao,
      emenda_parlamentar_plano_acao: item.nome_parlamentar_emenda_plano_acao,
      valor_custeio_plano_acao: item.valor_custeio_plano_acao,
      valor_investimento_plano_acao: item.valor_investimento_plano_acao,
      id_programa: item.id_programa,
      finalidade: item.finalidade,
      detalhamento_objeto: item.detalhamento_objeto,
      banco: item.banco,
      agencia: item.agencia,
      conta: item.conta,
      saldo_conta_corrente: item.saldo_conta_corrente,
      pagamento_status: item.pagamento_status,
      data_pagamento_detectado: item.data_pagamento_detectado
        ? formatDateOnlyPtBr(item.data_pagamento_detectado)
        : "",
      valor_pago_detectado: item.valor_pago_detectado,
      documentos_habeis_quantidade: item.documentos_habeis_quantidade,
      empenhos_quantidade: item.empenhos_quantidade,
      ordens_pagamento_quantidade: item.ordens_pagamento_quantidade,
      documento_habil_principal: item.documento_habil_principal,
      ordem_pagamento_principal: item.ordem_pagamento_principal,
      ordem_bancaria_principal: item.ordem_bancaria_principal
    };
    return columns.map((col) => toCsvCell(row[col])).join(";");
  });

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-transferencias-especiais-p${report.paginacao.pagina}-${todayDate()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// Relatório Personalizado - Exportações
const exportTransferenciasEspeciaisPdf = (
  report: TransferenciaEspecialPlanoAcaoResponse,
  mode: ReportPdfMode = "analitico",
  proponenteLogoUrl?: string | null
) => {
  const popup = window.open("", "_blank");
  if (!popup) {
    return;
  }

  const totalCusteio = report.itens.reduce((acc, item) => acc + item.valor_custeio_plano_acao, 0);
  const totalInvestimento = report.itens.reduce((acc, item) => acc + item.valor_investimento_plano_acao, 0);

  const rows = report.itens
    .map(
      (item) =>
        `<tr><td>${item.id_plano_acao}</td><td>${item.codigo_plano_acao}</td><td>${item.ano_plano_acao}</td><td>${item.situacao_plano_acao}</td><td>${item.concedente ?? "-"}</td><td>${item.nome_parlamentar_emenda_plano_acao ?? "-"}</td><td style="text-align:right">${formatCurrency(item.valor_custeio_plano_acao)}</td><td style="text-align:right">${formatCurrency(item.valor_investimento_plano_acao)}</td><td>${item.finalidade ?? "-"}</td><td>${item.detalhamento_objeto ?? "-"}</td><td>${item.banco ?? "-"}</td><td>${item.agencia ?? "-"}</td><td>${item.conta ?? "-"}</td><td>${item.saldo_conta_corrente != null ? formatCurrency(item.saldo_conta_corrente) : "-"}</td><td>${item.pagamento_status}</td><td>${item.data_pagamento_detectado ? formatDateOnlyPtBr(item.data_pagamento_detectado) : "-"}</td><td style="text-align:right">${formatCurrency(item.valor_pago_detectado ?? 0)}</td><td>${item.documento_habil_principal ?? "-"}${item.ordem_bancaria_principal ? ` / ${item.ordem_bancaria_principal}` : ""}</td></tr>`
    )
    .join("");

  const reportHeadHtml = buildReportHeadHtml(`Transferencias especiais (${mode})`, proponenteLogoUrl);
  const printScript = getDeferredPrintScript();

  popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Transferencias especiais</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43}.report-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.report-logos{display:flex;align-items:flex-start;gap:12px}.report-logo-slot{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:120px}.report-logo-slot img{max-width:160px;max-height:80px;height:auto;display:block}.report-logo-slot small{font-size:10px;color:#486581}h1,h2{margin:0 0 12px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:8px;font-size:11px;text-align:left;vertical-align:top}.kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}.kpi div{border:1px solid #cbd5e1;border-radius:8px;padding:10px}</style></head><body>${reportHeadHtml}<div class="kpi"><div><strong>Total de registros</strong><br/>${report.paginacao.total}</div><div><strong>Pagina</strong><br/>${report.paginacao.pagina}/${report.paginacao.total_paginas}</div><div><strong>Total custeio (pagina)</strong><br/>${formatCurrency(totalCusteio)}</div><div><strong>Total investimento (pagina)</strong><br/>${formatCurrency(totalInvestimento)}</div></div>${mode === "analitico" ? `<h2>Planos de acao especial</h2><table><thead><tr><th>ID</th><th>Codigo</th><th>Ano</th><th>Situacao</th><th>Concedente</th><th>Emenda Parlamentar</th><th>Custeio</th><th>Investimento</th><th>Finalidade</th><th>Detalhamento Objeto</th><th>Banco</th><th>Agencia</th><th>Conta</th><th>Saldo Conta Corrente</th><th>Pagamento</th><th>Pago em</th><th>Valor pago</th><th>Doc. habil / OB</th></tr></thead><tbody>${rows}</tbody></table>` : ""}${printScript}</body></html>`);
  popup.document.close();
};

const exportTransferenciasDiscricionariasProponenteDesembolsosPdf = (
  report: TransferenciaDiscricionariaDesembolsoProponenteResponse,
  mode: ReportPdfMode = "analitico",
  proponenteLogoUrl?: string | null
) => {
  const popup = window.open("", "_blank");
  if (!popup) {
    return;
  }

  const parcelaById = buildDesembolsoParcelaMap(report.itens);
  const rows = report.itens
    .map(
      (item) =>
        `<tr><td>${parcelaById.get(item.id) ?? "-"}a parcela</td><td>${item.id_desembolso ?? "-"}</td><td>${item.nr_convenio ?? "-"}</td><td>${item.nr_siafi ?? "-"}</td><td>${normalizeReadableText(item.objeto) ?? "-"}</td><td style="text-align:right">${item.valor_contrapartida_financeira === null ? "-" : formatCurrency(item.valor_contrapartida_financeira)}</td><td>${item.data_desembolso ? formatDateOnlyPtBr(item.data_desembolso) : "-"}</td><td>${item.ano_desembolso ?? "-"}</td><td>${item.mes_desembolso ?? "-"}</td><td>${item.ug_emitente_dh ?? "-"}</td><td style="text-align:right">${item.vl_desembolsado === null ? "-" : formatCurrency(item.vl_desembolsado)}</td><td>${item.observacao_dh ?? "-"}</td></tr>`
    )
    .join("");

  const reportHeadHtml = buildReportHeadHtml(`Desembolsos por proponente (${mode})`, proponenteLogoUrl);
  const printScript = getDeferredPrintScript();
  const proponenteLabel = report.resumo.nome_proponente ?? "Nao informado";
  const cnpjLabel = report.resumo.cnpj ? formatCnpj(report.resumo.cnpj) : "Nao informado";

  popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Desembolsos por proponente</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43}.report-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.report-logos{display:flex;align-items:flex-start;gap:12px}.report-logo-slot{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:120px}.report-logo-slot img{max-width:160px;max-height:80px;height:auto;display:block}.report-logo-slot small{font-size:10px;color:#486581}h1,h2{margin:0 0 12px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left;vertical-align:top}.kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}.kpi div{border:1px solid #cbd5e1;border-radius:8px;padding:10px}</style></head><body>${reportHeadHtml}<p><strong>Proponente:</strong> ${proponenteLabel}</p><p><strong>CNPJ:</strong> ${cnpjLabel}</p><div class="kpi"><div><strong>Total de desembolsos</strong><br/>${report.resumo.total_desembolsos}</div><div><strong>Total de convenios</strong><br/>${report.resumo.total_convenios}</div><div><strong>Valor total desembolsado</strong><br/>${formatCurrency(report.resumo.valor_total_desembolsado)}</div><div><strong>Data da carga</strong><br/>${report.sincronizacao.data_carga_fonte ?? "Nao informada"}</div></div>${mode === "analitico" ? `<h2>Desembolsos</h2><table><thead><tr><th>Parcela</th><th>ID desembolso</th><th>Convenio</th><th>SIAFI</th><th>Objeto</th><th>Contrapartida</th><th>Data</th><th>Ano</th><th>Mes</th><th>UG emitente</th><th>Valor</th><th>Observacao</th></tr></thead><tbody>${rows}</tbody></table>` : ""}${printScript}</body></html>`);
  popup.document.close();
};

const exportTransferenciasDiscricionariasPdf = (
  report: TransferenciaDiscricionariaResponse,
  mode: ReportPdfMode = "analitico",
  desembolsoReports: TransferenciaDiscricionariaDesembolsoResponse[] = [],
  siafiByConvenioInput: Map<string, string> = new Map<string, string>(),
  targetPopup?: Window | null,
  proponenteLogoUrl?: string | null,
  concedenteSelecionado?: string
) => {
  const popup = targetPopup ?? window.open("", "_blank");
  if (!popup) {
    return;
  }

  const siafiByConvenio = new Map<string, string>(siafiByConvenioInput);
  desembolsoReports.forEach((desembolsoReport) => {
    const convenio = (desembolsoReport.resumo.nr_convenio ?? "").trim();
    if (!convenio) {
      return;
    }
    const siafis = Array.from(
      new Set(
        desembolsoReport.itens
          .map((item) => (item.nr_siafi ?? "").trim())
          .filter((item) => item !== "")
      )
    );
    if (siafis.length > 0) {
      siafiByConvenio.set(convenio, siafis.join(", "));
    }
  });

  const rows = report.itens
    .map(
      (item) =>
        `<tr><td>${item.nr_convenio ?? "-"}</td><td>${siafiByConvenio.get(item.nr_convenio ?? "") ?? "-"}</td><td>${item.concedente ?? "-"}</td><td>${normalizeReadableText(item.objeto) ?? "-"}</td><td>${item.situacao_convenio ?? "-"}</td><td>${item.ano_referencia ?? "-"}</td><td>${item.dia_inic_vigencia ?? "-"}</td><td>${item.dia_fim_vigencia ?? "-"}</td><td>${item.dias_para_vencimento ?? "-"}</td><td>${item.dt_conclusao_prestacao_contas ?? "-"}</td><td>${item.banco ?? "-"}</td><td>${item.agencia ?? "-"}</td><td>${item.conta ?? "-"}</td><td style="text-align:right">${item.valor_contrapartida_financeira === null ? "-" : formatCurrency(item.valor_contrapartida_financeira)}</td><td style="text-align:right">${item.valor_contrapartida_depositada === null ? "-" : formatCurrency(item.valor_contrapartida_depositada)}</td><td style="text-align:right">${item.valor_global_conv === null ? "-" : formatCurrency(item.valor_global_conv)}</td><td style="text-align:right">${item.valor_desembolsado_conv === null ? "-" : formatCurrency(item.valor_desembolsado_conv)}</td></tr>`
    )
    .join("");

  const hasDesembolsoDetails = mode === "analitico" && desembolsoReports.length > 0;
  const desembolsoSections = hasDesembolsoDetails
    ? desembolsoReports
        .map((desembolsoReport) => {
          const parcelaById = buildDesembolsoParcelaMap(desembolsoReport.itens);
          const desembolsoRows = [...desembolsoReport.itens]
            .sort((a, b) => {
              const parcelaA = parcelaById.get(a.id) ?? Number.MAX_SAFE_INTEGER;
              const parcelaB = parcelaById.get(b.id) ?? Number.MAX_SAFE_INTEGER;
              if (parcelaA !== parcelaB) {
                return parcelaA - parcelaB;
              }

              const dateA = a.data_desembolso ?? "9999-12-31";
              const dateB = b.data_desembolso ?? "9999-12-31";
              if (dateA !== dateB) {
                return dateA.localeCompare(dateB);
              }

              const idA = a.id_desembolso ?? a.id;
              const idB = b.id_desembolso ?? b.id;
              return idA - idB;
            })
            .map(
              (item) =>
                `<tr><td>${parcelaById.get(item.id) ?? "-"}a parcela</td><td>${item.id_desembolso ?? "-"}</td><td>${desembolsoReport.resumo.nr_convenio ?? "-"}</td><td>${item.nr_siafi ?? "-"}</td><td>${item.data_desembolso ? formatDateOnlyPtBr(item.data_desembolso) : "-"}</td><td>${item.dt_ult_desembolso ? formatDateOnlyPtBr(item.dt_ult_desembolso) : "-"}</td><td>${item.ano_desembolso ?? "-"}</td><td>${item.mes_desembolso ?? "-"}</td><td>${item.qtd_dias_sem_desembolso ?? "-"}</td><td>${item.ug_emitente_dh ?? "-"}</td><td style="text-align:right">${item.vl_desembolsado === null ? "-" : formatCurrency(item.vl_desembolsado)}</td><td>${item.observacao_dh ?? "-"}</td></tr>`
            )
            .join("");

          return `<h2>Historico de desembolsos do convenio ${desembolsoReport.resumo.nr_convenio}</h2><table><thead><tr><th>Parcela</th><th>ID desembolso</th><th>Convenio</th><th>SIAFI</th><th>Data</th><th>Ult. desembolso</th><th>Ano</th><th>Mes</th><th>Dias sem desembolso</th><th>UG emitente</th><th>Valor</th><th>Observacao</th></tr></thead><tbody>${desembolsoRows}</tbody></table>`;
        })
        .join("")
    : "";

  const reportTitle = concedenteSelecionado
    ? `Transferencias discricionarias (${mode}) - Concedente: ${concedenteSelecionado}`
    : `Transferencias discricionarias (${mode})`;
  const reportHeadHtml = buildReportHeadHtml(reportTitle, proponenteLogoUrl);
  const printScript = getDeferredPrintScript();

  popup.document.open();
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Transferencias discricionarias</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43}.report-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.report-logos{display:flex;align-items:flex-start;gap:12px}.report-logo-slot{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:120px}.report-logo-slot img{max-width:160px;max-height:80px;height:auto;display:block}.report-logo-slot small{font-size:10px;color:#486581}h1,h2{margin:0 0 12px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:8px;font-size:11px;text-align:left;vertical-align:top}.kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}.kpi div{border:1px solid #cbd5e1;border-radius:8px;padding:10px}</style></head><body>${reportHeadHtml}<div class="kpi"><div><strong>Total registros</strong><br/>${report.paginacao.total}</div><div><strong>Pagina</strong><br/>${report.paginacao.pagina}/${report.paginacao.total_paginas}</div><div><strong>Status sincronizacao</strong><br/>${report.sincronizacao.status}</div><div><strong>Data carga</strong><br/>${report.sincronizacao.data_carga_fonte ?? "Nao informada"}</div></div>${mode === "analitico" ? `<h2>Propostas e convenios</h2><table><thead><tr><th>Convenio</th><th>SIAFI</th><th>Concedente</th><th>Objeto</th><th>Situacao convenio</th><th>Ano</th><th>Inicio vigencia</th><th>Fim vigencia</th><th>Dias p/ vencer</th><th>Prestacao contas</th><th>Banco</th><th>Agencia</th><th>Conta</th><th>Contrapartida financeira</th><th>Contrapartida depositada</th><th>Valor global</th><th>Desembolsado</th></tr></thead><tbody>${rows}</tbody></table>` : ""}${desembolsoSections}${printScript}</body></html>`);
  popup.document.close();
};

const exportTicketReportPdf = (items: Ticket[], mode: ReportPdfMode) => {
  const popup = window.open("", "_blank");
  if (!popup) {
    return;
  }

  const total = items.length;
  const abertos = items.filter((item) => item.status === "ABERTO" || item.status === "EM_ANDAMENTO").length;
  const resolvidos = items.filter((item) => item.status === "RESOLVIDO").length;
  const atrasados = items.filter((item) => isTicketOverdue(item)).length;
  const semAtribuicao = items.filter((item) => !item.responsavel).length;

  const tempoResolucaoDias = items
    .filter((item) => item.resolvido_em)
    .map((item) => {
      const started = new Date(item.created_at).getTime();
      const resolved = new Date(item.resolvido_em as string).getTime();
      return Math.max(0, (resolved - started) / (1000 * 60 * 60 * 24));
    });
  const tempoMedioResolucaoDias =
    tempoResolucaoDias.length === 0
      ? 0
      : tempoResolucaoDias.reduce((acc, value) => acc + value, 0) / tempoResolucaoDias.length;

  const rows = items
    .map(
      (item) =>
        `<tr><td>${item.codigo}</td><td>${item.titulo}</td><td>${TICKET_STATUS_LABELS[item.status]}</td><td>${TICKET_PRIORITY_LABELS[item.prioridade]}</td><td>${item.responsavel?.nome ?? "Nao atribuido"}</td><td>${item.prazo_alvo ?? "-"}</td><td>${formatTicketSla(item)}</td><td>${new Date(item.created_at).toLocaleString("pt-BR")}</td><td>${item.resolvido_em ? new Date(item.resolvido_em).toLocaleString("pt-BR") : "-"}</td></tr>`
    )
    .join("");

  const logoUrl = getReportLogoUrl();
  const printScript = getDeferredPrintScript();

  popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Relatorio de tickets</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43}.report-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.report-head img{max-width:180px;height:auto;display:block}h1,h2{margin:0 0 12px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left;vertical-align:top}.kpi{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin:16px 0}.kpi div{border:1px solid #cbd5e1;border-radius:8px;padding:10px}</style></head><body><div class="report-head"><img id="report-logo" src="${logoUrl}" alt="NC Convenios" /><h1>Relatorio de tickets (${mode})</h1></div><div class="kpi"><div><strong>Total</strong><br/>${total}</div><div><strong>Em aberto</strong><br/>${abertos}</div><div><strong>Resolvidos</strong><br/>${resolvidos}</div><div><strong>Atrasados</strong><br/>${atrasados}</div><div><strong>Sem atribuicao</strong><br/>${semAtribuicao}</div><div><strong>Tempo medio resolucao</strong><br/>${tempoMedioResolucaoDias.toFixed(1)} dia(s)</div></div>${mode === "analitico" ? `<h2>Tickets</h2><table><thead><tr><th>Codigo</th><th>Titulo</th><th>Status</th><th>Prioridade</th><th>Atribuido</th><th>Prazo alvo</th><th>SLA</th><th>Criado em</th><th>Resolvido em</th></tr></thead><tbody>${rows}</tbody></table>` : ""}${printScript}</body></html>`);
  popup.document.close();
};

export default function App() {
  const logoSrc = "/logo-gestconv-novo-semfundo-removebg-preview.png";
  const initialNavigation = parseNavigationFromUrl(window.location.pathname);

  const [healthStatus, setHealthStatus] = useState<"checking" | "ok" | "error">("checking");
  const [technicalHealth, setTechnicalHealth] = useState<TechnicalHealthState>({
    backendVersion: "desconhecida",
    reportRouteStatus: "checking",
    lastCheckedAt: null
  });
  const [gmailDeliveryHealth, setGmailDeliveryHealth] = useState<GmailDeliveryHealthState>({
    status: "checking",
    reason: "VERIFICANDO",
    message: "Checando autenticacao de envio Gmail...",
    checkedAt: null
  });
  const [activeView, setActiveView] = useState<MenuView>(() => {
    if (readTicketIdFromSearch(window.location.search)) {
      return "tickets";
    }
    if (readEmendaIdFromSearch(window.location.search)) {
      return "emendas_estaduais";
    }
    return initialNavigation.activeView;
  });
  const [instrumentPageId, setInstrumentPageId] = useState<number | null>(initialNavigation.instrumentPageId);
  const [menuTransition, setMenuTransition] = useState<"" | "menu-to-tickets" | "menu-from-tickets">("");
  const menuTransitionTimeoutRef = useRef<number | null>(null);
  const [isViewPending, setIsViewPending] = useState(false);
  const viewPendingTimeoutRef = useRef<number | null>(null);
  const assistenteTypingIntervalRef = useRef<number | null>(null);
  const assistenteChatLogRef = useRef<HTMLDivElement | null>(null);
  const [assistenteTypingMessageId, setAssistenteTypingMessageId] = useState<string | null>(null);

  const [token, setToken] = useState<string>(() => (readStoredUser() ? COOKIE_SESSION_TOKEN : ""));
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [publicPreviewHash, setPublicPreviewHash] = useState(() => window.location.hash);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [filters, setFilters] = useState<InstrumentFilters>(() => blankFilters());
  const [form, setForm] = useState<InstrumentForm>(() => emptyInstrumentForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showCreateInstrumentForm, setShowCreateInstrumentForm] = useState(false);

  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [overviewItems, setOverviewItems] = useState<Instrument[]>([]);
  const [alerts, setAlerts] = useState<DeadlineAlertItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditInstrumentId, setAuditInstrumentId] = useState("");
  const [auditAction, setAuditAction] = useState<AuditAction | "">("");
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistSummary, setChecklistSummary] = useState<ChecklistSummary | null>(null);
  const [checklistDocName, setChecklistDocName] = useState("");
  const [checklistRequired, setChecklistRequired] = useState(true);
  const [checklistNote, setChecklistNote] = useState("");
  const [checklistStage, setChecklistStage] = useState<WorkflowStage>("PROPOSTA");
  const [externalLinkValidityDays, setExternalLinkValidityDays] = useState<number>(7);
  const [activeWorkflowStage, setActiveWorkflowStage] = useState<WorkflowStage | null>(null);
  const [busyChecklistItemId, setBusyChecklistItemId] = useState<number | null>(null);
  const [busyChecklistStage, setBusyChecklistStage] = useState<WorkflowStage | null>(null);
  const [busyExternalLinkItemId, setBusyExternalLinkItemId] = useState<number | null>(null);
  const [stageFollowUps, setStageFollowUps] = useState<Record<WorkflowStage, StageFollowUp[]>>(() =>
    emptyStageFollowUps()
  );
  const [stageFollowUpText, setStageFollowUpText] = useState("");
  const [stageFollowUpFiles, setStageFollowUpFiles] = useState<File[]>([]);
  const [isSavingStageFollowUp, setIsSavingStageFollowUp] = useState(false);
  const [workProgressFollowUpText, setWorkProgressFollowUpText] = useState("");
  const [isSavingWorkProgressFollowUp, setIsSavingWorkProgressFollowUp] = useState(false);
  const [editingStageFollowUp, setEditingStageFollowUp] = useState<{ stage: WorkflowStage; followUpId: number } | null>(null);
  const [editingStageFollowUpText, setEditingStageFollowUpText] = useState("");
  const [isSavingStageFollowUpEdit, setIsSavingStageFollowUpEdit] = useState(false);
  const [isDraggingStageFiles, setIsDraggingStageFiles] = useState(false);
  const [stageFollowUpModalStage, setStageFollowUpModalStage] = useState<WorkflowStage | null>(null);
  const [stageFollowUpFilter, setStageFollowUpFilter] = useState<StageFollowUpFilter>("TODOS");
  const [expandedFollowUpIds, setExpandedFollowUpIds] = useState<number[]>([]);
  const [expandedChecklistAttachmentItemIds, setExpandedChecklistAttachmentItemIds] = useState<number[]>([]);
  const [workProgress, setWorkProgress] = useState<WorkProgress | null>(null);
  const [obraPercentual, setObraPercentual] = useState("0");
  const [boletimData, setBoletimData] = useState(todayDate());
  const [boletimValor, setBoletimValor] = useState(formatCurrencyInput(0));
  const [boletimPercentual, setBoletimPercentual] = useState("");
  const [boletimObservacao, setBoletimObservacao] = useState("");
  const [showRepassePanel, setShowRepassePanel] = useState(false);
  const [showWorkProgressPanel, setShowWorkProgressPanel] = useState(false);
  const [proponentesImportProgress, setProponentesImportProgress] = useState<ProponenteBatchImportProgress | null>(null);
  const [empresaVencedoraNomeInput, setEmpresaVencedoraNomeInput] = useState("");
  const [empresaVencedoraCnpjInput, setEmpresaVencedoraCnpjInput] = useState("");
  const [empresaVencedoraValorInput, setEmpresaVencedoraValorInput] = useState(formatCurrencyInput(0));
  const [showSolicitacoesCaixaPanel, setShowSolicitacoesCaixaPanel] = useState(false);
  const [solicitacoesCaixaItens, setSolicitacoesCaixaItens] = useState<any[]>([]);
  const [solicitacoesCaixaLoading, setSolicitacoesCaixaLoading] = useState(false);
  const [ticketInstrumentSearch, setTicketInstrumentSearch] = useState("");
  const [ticketInstrumentResults, setTicketInstrumentResults] = useState<any[]>([]);
  const [ticketInstrumentSearching, setTicketInstrumentSearching] = useState(false);
  const [showTicketModalFromSolicitacao, setShowTicketModalFromSolicitacao] = useState(false);

  const [proponenteBuscaLocal, setProponenteBuscaLocal] = useState("");
  const [proponentes, setProponentes] = useState<Proponente[]>([]);
  const [showProponenteEditModal, setShowProponenteEditModal] = useState(false);
  const [proponenteEditTab, setProponenteEditTab] = useState<"proponente" | "gestor">("proponente");
  const [isLoadingCnpjConsulta, setIsLoadingCnpjConsulta] = useState(false);
  const [editingProponente, setEditingProponente] = useState<Proponente | null>(null);
  const [proponenteEditForm, setProponenteEditForm] = useState({
    nome: "",
    cnpj: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cep: "",
    cidade: "",
    uf: "",
    tel: "",
    email: "",
    gestorNome: "",
    gestorCpf: "",
    gestorRg: "",
    gestorEndereco: "",
    gestorEmail: ""
  });
  const [emendasEstaduais, setEmendasEstaduais] = useState<EmendaEstadualItem[]>([]);
  const [emendasEstaduaisMunicipios, setEmendasEstaduaisMunicipios] = useState<EmendaEstadualMunicipioItem[]>([]);
  const [emendaDocumentosByEmenda, setEmendaDocumentosByEmenda] = useState<Record<number, EmendaEstadualDocumentoItem[]>>(
    {}
  );
  const [emendaDocumentosAuditByEmenda, setEmendaDocumentosAuditByEmenda] = useState<
    Record<number, EmendaEstadualDocumentoAuditoriaItem[]>
  >({});
  const [emendaUploadFilesByEmenda, setEmendaUploadFilesByEmenda] = useState<Record<number, File[]>>({});
  const [expandedEmendaDocumentosId, setExpandedEmendaDocumentosId] = useState<number | null>(null);
  const [emendaIdFromUrl, setEmendaIdFromUrl] = useState<number | null>(() => readEmendaIdFromSearch(window.location.search));
  const [emendaEstadualForm, setEmendaEstadualForm] = useState<EmendaEstadualForm>(() => emptyEmendaEstadualForm());
  const [editingEmendaEstadualId, setEditingEmendaEstadualId] = useState<number | null>(null);
  const [emendaEstadualSearch, setEmendaEstadualSearch] = useState("");
  const [ticketFilters, setTicketFilters] = useState<TicketFilters>(() => emptyTicketFilters());
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketBoardTab, setTicketBoardTab] = useState<TicketBoardTab>(() => {
    const stored = localStorage.getItem(TICKET_TAB_KEY);
    if (stored === "abertos" || stored === "resolvidos" || stored === "cancelados") {
      return stored;
    }
    return "abertos";
  });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketIdFromUrl, setTicketIdFromUrl] = useState<number | null>(() => readTicketIdFromSearch(window.location.search));
  const [ticketForm, setTicketForm] = useState<TicketForm>(() => emptyTicketForm());
  const [ticketResolutionReason, setTicketResolutionReason] = useState("");
  const [ticketCommentText, setTicketCommentText] = useState("");
  const [showTicketCreateModal, setShowTicketCreateModal] = useState(false);
  const [ticketAssignableUsers, setTicketAssignableUsers] = useState<Array<{ id: number; nome: string; email: string; role: Role }>>([]);
  const [assistentePergunta, setAssistentePergunta] = useState("");
  const [assistenteConversa, setAssistenteConversa] = useState<AssistenteChatItem[]>(() => emptyAssistenteConversa());
  const [isConsultandoAssistente, setIsConsultandoAssistente] = useState(false);
  const [assistenteSessionId, setAssistenteSessionId] = useState<string | null>(null);
  const [assistenteSessionHydrated, setAssistenteSessionHydrated] = useState(false);
  const [assistenteSessions, setAssistenteSessions] = useState<AssistenteSessionItem[]>([]);
  const [isLoadingAssistenteSessions, setIsLoadingAssistenteSessions] = useState(false);
  const [relatorioTab, setRelatorioTab] = useState<RelatorioTab>(initialNavigation.relatorioTab);
  const [reportFilters, setReportFilters] = useState<ReportFilters>(() => emptyReportFilters());
  const [reportData, setReportData] = useState<RepasseReportResponse | null>(null);
  const [obraReportFilters, setObraReportFilters] = useState<ObraReportFilters>(() => emptyObraReportFilters());
  const [obraReportData, setObraReportData] = useState<ObraReportResponse | null>(null);
  const [andamentoInstrumentosReportFilters, setAndamentoInstrumentosReportFilters] =
    useState<AndamentoInstrumentosReportFilters>(() => emptyAndamentoInstrumentosReportFilters());
  const [andamentoInstrumentosReportData, setAndamentoInstrumentosReportData] =
    useState<AndamentoInstrumentosReportResponse | null>(null);
  const [transparenciaReportFilters, setTransparenciaReportFilters] =
    useState<TransparenciaReportFilters>(() => emptyTransparenciaReportFilters());
  const [transparenciaReportData, setTransparenciaReportData] = useState<TransparenciaReportResponse | null>(null);
  const [transferenciasEspeciaisFilters, setTransferenciasEspeciaisFilters] = useState<TransferenciasEspeciaisFilters>(() =>
    emptyTransferenciasEspeciaisFilters()
  );
  const [transferenciasEspeciaisData, setTransferenciasEspeciaisData] =
    useState<TransferenciaEspecialPlanoAcaoResponse | null>(null);
  const [transferenciasEspeciaisPage, setTransferenciasEspeciaisPage] = useState(1);
  const [isSyncingTransferenciasEspeciais, setIsSyncingTransferenciasEspeciais] = useState(false);
  const [transferenciasEspeciaisSyncStatus, setTransferenciasEspeciaisSyncStatus] =
    useState<TransferenciaEspecialSyncStatus | null>(null);
  const [transferenciasDiscricionariasFilters, setTransferenciasDiscricionariasFilters] =
    useState<TransferenciasDiscricionariasFilters>(() => emptyTransferenciasDiscricionariasFilters());
  const [transferenciasDiscricionariasData, setTransferenciasDiscricionariasData] =
    useState<TransferenciaDiscricionariaResponse | null>(null);
  const [transferenciasDiscricionariasFiltros, setTransferenciasDiscricionariasFiltros] =
    useState<TransferenciaDiscricionariaFiltrosResponse | null>(null);
  const [sismobFilters, setSismobFilters] = useState<SismobFilters>(() => emptySismobFilters());
  const [sismobData, setSismobData] = useState<SismobResponse | null>(null);
  const [sismobSituacaoOptions, setSismobSituacaoOptions] = useState<string[]>([]);
  const [transferenciasDiscricionariasCnpjSugestoes, setTransferenciasDiscricionariasCnpjSugestoes] =
    useState<TransferenciaDiscricionariaProponenteSugestaoItem[]>([]);
  const [transferenciasDiscricionariasSyncState, setTransferenciasDiscricionariasSyncState] =
    useState<TransferenciaDiscricionariaResponse["sincronizacao"] | null>(null);
  const [transferenciasDiscricionariasPage, setTransferenciasDiscricionariasPage] = useState(1);
  const [transferenciasDiscricionariasTab, setTransferenciasDiscricionariasTab] =
    useState<TransferenciasDiscricionariasTab>("convenios");
  const [transferenciasDiscricionariasDesembolsoFilters, setTransferenciasDiscricionariasDesembolsoFilters] =
    useState<TransferenciasDiscricionariasDesembolsoFilters>(() => emptyTransferenciasDiscricionariasDesembolsoFilters());
  const [transferenciasDiscricionariasDesembolsoData, setTransferenciasDiscricionariasDesembolsoData] =
    useState<TransferenciaDiscricionariaDesembolsoResponse | null>(null);
  const [transferenciasDiscricionariasDesembolsoPage, setTransferenciasDiscricionariasDesembolsoPage] = useState(1);
  const [isLoadingTransferenciasDiscricionariasDesembolsos, setIsLoadingTransferenciasDiscricionariasDesembolsos] = useState(false);
  const [transferenciasDiscricionariasProponenteDesembolsoFilters, setTransferenciasDiscricionariasProponenteDesembolsoFilters] =
    useState<TransferenciasDiscricionariasProponenteDesembolsoFilters>(() =>
      emptyTransferenciasDiscricionariasProponenteDesembolsoFilters()
    );
  const [transferenciasDiscricionariasProponenteDesembolsoData, setTransferenciasDiscricionariasProponenteDesembolsoData] =
    useState<TransferenciaDiscricionariaDesembolsoProponenteResponse | null>(null);
  const [transferenciasDiscricionariasProponenteDesembolsoPage, setTransferenciasDiscricionariasProponenteDesembolsoPage] =
    useState(1);
  const [isLoadingTransferenciasDiscricionariasProponenteDesembolsos, setIsLoadingTransferenciasDiscricionariasProponenteDesembolsos] =
    useState(false);
  const [isSyncingTransferenciasDiscricionarias, setIsSyncingTransferenciasDiscricionarias] = useState(false);
  const [isNotifyingTransferenciasDiscricionarias, setIsNotifyingTransferenciasDiscricionarias] = useState(false);
  const [isNotifyingTransferenciasDiscricionariasChanges, setIsNotifyingTransferenciasDiscricionariasChanges] = useState(false);
  const [transferenciasDiscricionariasSyncMode, setTransferenciasDiscricionariasSyncMode] =
    useState<"light" | "full" | null>(null);
  const [fnsRepassesFilters, setFnsRepassesFilters] = useState<FnsRepassesFilters>(() => emptyFnsRepassesFilters());
  const [fnsUfs, setFnsUfs] = useState<FnsUfItem[]>([]);
  const [fnsMunicipios, setFnsMunicipios] = useState<FnsMunicipioItem[]>([]);
  const [fnsRepassesData, setFnsRepassesData] = useState<FnsRepassesResponse | null>(null);
  const [fnsRepassesDetalheData, setFnsRepassesDetalheData] = useState<FnsRepassesDetalheResponse | null>(null);
  const [fnsSaldosData, setFnsSaldosData] = useState<FnsSaldosTiposContaResponse | null>(null);
  const [fnsSyncStatus, setFnsSyncStatus] = useState<FnsSyncStatus | null>(null);
  const [fnsDetalheBlocoLabel, setFnsDetalheBlocoLabel] = useState<string>("");
  const [consultaFnsFilters, setConsultaFnsFilters] = useState<ConsultaFnsFilters>(() => emptyConsultaFnsFilters());
  const [consultaFnsUfs, setConsultaFnsUfs] = useState<ConsultaFnsUfItem[]>([]);
  const [consultaFnsAnos, setConsultaFnsAnos] = useState<ConsultaFnsAnoItem[]>([]);
  const [consultaFnsMunicipios, setConsultaFnsMunicipios] = useState<ConsultaFnsMunicipioItem[]>([]);
  const [consultaFnsData, setConsultaFnsData] = useState<ConsultaFnsPropostasResponse | null>(null);
  const [consultaFnsPage, setConsultaFnsPage] = useState(1);
  const [consultaFnsSelected, setConsultaFnsSelected] = useState<ConsultaFnsPropostaItem | null>(null);
  const [consultaFnsDetalhe, setConsultaFnsDetalhe] = useState<ConsultaFnsPropostaDetalhe | null>(null);
  const [consultaFnsSyncStatus, setConsultaFnsSyncStatus] = useState<ConsultaFnsSyncStatus | null>(null);
  const [simecObrasFilters, setSimecObrasFilters] = useState<SimecObrasFilters>(() => emptySimecObrasFilters());
  const [simecUfs, setSimecUfs] = useState<SimecUfItem[]>([]);
  const [simecMunicipios, setSimecMunicipios] = useState<SimecMunicipioItem[]>([]);
  const [simecObrasData, setSimecObrasData] = useState<SimecObrasResponse | null>(null);
  const [simecObraDetalhe, setSimecObraDetalhe] = useState<SimecObraDetalhe | null>(null);
  const [simecObraDetalheId, setSimecObraDetalheId] = useState<number | null>(null);
  const [simecTermosFilters, setSimecTermosFilters] = useState<SimecTermosFilters>(() => emptySimecTermosFilters());
  const [simecTermosData, setSimecTermosData] = useState<SimecTermosResponse | null>(null);
  const [simecTermoDetalhe, setSimecTermoDetalhe] = useState<SimecTermoDetalhe | null>(null);
  const [simecTermoDetalheId, setSimecTermoDetalheId] = useState<number | null>(null);
  const [extracaoSimecData, setExtracaoSimecData] = useState<SimecBotResponse | null>(null);
  const [extracaoSimecFilters, setExtracaoSimecFilters] = useState<ExtracaoSimecFilters>(() => emptyExtracaoSimecFilters());
  const [ticketReportFilters, setTicketReportFilters] = useState<TicketReportFilters>(() => emptyTicketReportFilters());
  const [ticketReportData, setTicketReportData] = useState<Ticket[] | null>(null);
  const [proponenteCadastro, setProponenteCadastro] = useState<ProponenteCadastroState>(() =>
    emptyProponenteCadastroState()
  );
  const [proponenteSugestoes, setProponenteSugestoes] = useState<ProponenteSugestaoItem[]>([]);
  const [isLoadingProponenteSugestoes, setIsLoadingProponenteSugestoes] = useState(false);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [adminUserForm, setAdminUserForm] = useState<AdminUserForm>(() => emptyAdminUserForm());
  const [editingManagedUserId, setEditingManagedUserId] = useState<number | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestItem[]>([]);
  const [paymentInstruments, setPaymentInstruments] = useState<PaymentRequestInstrument[]>([]);
  const [paymentInstrumentDetails, setPaymentInstrumentDetails] = useState<PaymentRequestInstrument | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(() => emptyPaymentForm());
  const [paymentFilters, setPaymentFilters] = useState<PaymentFilters>(() => emptyPaymentFilters());
  const [showPaymentCreateForm, setShowPaymentCreateForm] = useState(false);
  const [paymentPreview, setPaymentPreview] = useState<{
    item: PaymentRequestItem;
    tipo: "nota_fiscal" | "empenho";
    url: string;
    nome: string;
    mimeType: string;
  } | null>(null);


  const [geracaoDocumentosTab, setGeracaoDocumentosTab] = useState<"templates" | "responsaveis" | "historico">("templates");
  const [geracaoDocumentosTemplates, setGeracaoDocumentosTemplates] = useState<DocumentoGeracaoTemplate[]>([]);
  const [geracaoDocumentosResponsaveis, setGeracaoDocumentosResponsaveis] = useState<DocumentoGeracaoResponsavel[]>([]);
  const [geracaoDocumentosLogs, setGeracaoDocumentosLogs] = useState<DocumentoGeracaoLog[]>([]);
  const [showGeracaoDocumentoTemplateModal, setShowGeracaoDocumentoTemplateModal] = useState(false);
  const [showGerarDocumentoModal, setShowGerarDocumentoModal] = useState(false);
  const [gerarDocumentoSelectedTemplate, setGerarDocumentoSelectedTemplate] = useState<number | null>(null);
  const [gerarDocumentoSelectedResponsavel, setGerarDocumentoSelectedResponsavel] = useState<number | null>(null);
  const [gerarDocumentoTitulo, setGerarDocumentoTitulo] = useState("");
  const [gerarDocumentoFormato, setGerarDocumentoFormato] = useState<"docx" | "pdf">("docx");
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);
  const [_instrumentoDados, _setInstrumentoDados] = useState<InstrumentoDados | null>(null);
  const [showGeracaoDocumentoResponsavelModal, setShowGeracaoDocumentoResponsavelModal] = useState(false);
  const [geracaoDocumentoTemplateForm, setGeracaoDocumentoTemplateForm] = useState({ codigo: "", nome: "", descricao: "", tipo: "DECLARACAO", arquivo: null as File | null });
  const [geracaoDocumentoTemplateEdit, setGeracaoDocumentoTemplateEdit] = useState<{ id: number; nome: string; descricao: string; tipo: string; arquivo: File | null } | null>(null);
  const [geracaoDocumentoResponsavelForm, setGeracaoDocumentoResponsavelForm] = useState({ nome: "", cpf: "", crea: "", cargo: "" });
  const [_isLoadingGeracaoDocumentos, setIsLoadingGeracaoDocumentos] = useState(false);

  const isAuthenticated = Boolean(token && user);
  const isLandingPreview = publicPreviewHash === "#landing";
  const canManageInstruments = user?.role === "ADMIN" || user?.role === "GESTOR" || user?.role === "DEMONSTRACAO";
  const canDeactivateInstruments = user?.role === "ADMIN";
  const canDeleteProponentes = user?.role === "ADMIN" || user?.role === "GESTOR" || user?.role === "DEMONSTRACAO";
  const isAdmin = user?.role === "ADMIN";
  const isFinanceiro = user?.role === "FINANCEIRO";
  const canCreatePaymentRequest = user?.role === "ADMIN" || user?.role === "FINANCEIRO";
  const canUpdatePaymentRequestStatus = user?.role === "ADMIN";
  const isInstrumentProfileView = activeView === "instrumentos" && instrumentPageId !== null;
  const selectedPaymentInstrument = useMemo(
    () => paymentInstruments.find((item) => String(item.id) === paymentForm.instrumento_id) ?? null,
    [paymentForm.instrumento_id, paymentInstruments]
  );
  const selectedPaymentInstrumentFromList = useMemo(
    () => instruments.find((item) => String(item.id) === paymentForm.instrumento_id) ?? null,
    [paymentForm.instrumento_id, instruments]
  );
  const selectedPaymentInstrumentTotals = useMemo(() => {
    const sourceInstrument = paymentInstrumentDetails ?? selectedPaymentInstrument;

    if (!sourceInstrument) {
      return null;
    }

    const totalPagoSistema = sourceInstrument.total_pago_sistema ?? 0;
    const totalRepassadoFallback = selectedPaymentInstrumentFromList
      ? Math.max(
          Number(selectedPaymentInstrumentFromList.valor_ja_repassado ?? 0),
          Array.isArray(selectedPaymentInstrumentFromList.repasses)
            ? selectedPaymentInstrumentFromList.repasses.reduce(
                (acc, repasse) => acc + Number(repasse.valor_repasse ?? 0),
                0
              )
            : 0
        )
      : null;
    const totalRepassado =
      totalRepassadoFallback !== null && totalRepassadoFallback > 0
        ? totalRepassadoFallback
        : sourceInstrument.total_repassado ?? 0;

    return {
      total_repassado: totalRepassado,
      total_pago_sistema: totalPagoSistema,
      saldo: Math.max(0, totalRepassado - totalPagoSistema)
    };
  }, [paymentInstrumentDetails, selectedPaymentInstrument, selectedPaymentInstrumentFromList]);
  const selectedPaymentInstrumentCompany = useMemo(() => {
    const sourceInstrument = paymentInstrumentDetails ?? selectedPaymentInstrument;
    return sourceInstrument?.empresa_vencedora ?? selectedPaymentInstrumentFromList?.empresa_vencedora ?? null;
  }, [paymentInstrumentDetails, selectedPaymentInstrument, selectedPaymentInstrumentFromList]);
  const selectedPaymentInstrumentCompanyCnpj = useMemo(() => {
    const sourceInstrument = paymentInstrumentDetails ?? selectedPaymentInstrument;
    return sourceInstrument?.cnpj_vencedora ?? selectedPaymentInstrumentFromList?.cnpj_vencedora ?? null;
  }, [paymentInstrumentDetails, selectedPaymentInstrument, selectedPaymentInstrumentFromList]);
  const selectedPaymentInstrumentWorkPercent = useMemo(() => {
    const sourceInstrument = paymentInstrumentDetails ?? selectedPaymentInstrument;
    if (sourceInstrument?.percentual_obra !== null && sourceInstrument?.percentual_obra !== undefined) {
      return Number(sourceInstrument.percentual_obra);
    }
    if (
      selectedPaymentInstrumentFromList?.percentual_fisico_medicao !== null &&
      selectedPaymentInstrumentFromList?.percentual_fisico_medicao !== undefined
    ) {
      return Number(selectedPaymentInstrumentFromList.percentual_fisico_medicao);
    }
    return null;
  }, [paymentInstrumentDetails, selectedPaymentInstrument, selectedPaymentInstrumentFromList]);
  const paymentFormTaxesTotal = useMemo(() => calculatePaymentTaxesTotal(paymentForm.impostos), [paymentForm.impostos]);
  const paymentFormValorNota = useMemo(() => parsePaymentCurrencyInput(paymentForm.valor_nota), [paymentForm.valor_nota]);
  const paymentFormNetValue = useMemo(
    () => Math.max(0, paymentFormValorNota - paymentFormTaxesTotal),
    [paymentFormTaxesTotal, paymentFormValorNota]
  );

  const sortedInstruments = useMemo(() => [...instruments].sort((a, b) => a.id - b.id), [instruments]);
  const concedenteOptions = useMemo(() => {
    const values = new Set<string>();
    for (const item of overviewItems) {
      const value = item.concedente.trim();
      if (value) {
        values.add(value);
      }
    }
    for (const item of sortedInstruments) {
      const value = item.concedente.trim();
      if (value) {
        values.add(value);
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [overviewItems, sortedInstruments]);
  const proponenteNameById = useMemo(() => {
    return new Map(proponentes.map((item) => [item.id, item.nome]));
  }, [proponentes]);
  const proponenteLogoById = useMemo(() => {
    return new Map(proponentes.map((item) => [item.id, item.logo_url]));
  }, [proponentes]);
  const proponenteLogoByCnpj = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of proponentes) {
      const cnpjDigits = item.cnpj.replace(/\D/g, "");
      if (cnpjDigits !== "" && item.logo_url) {
        map.set(cnpjDigits, item.logo_url);
      }
    }
    return map;
  }, [proponentes]);
  const selectedSismobProponente = useMemo(
    () => proponentes.find((item) => String(item.id) === sismobFilters.proponente_id) ?? null,
    [proponentes, sismobFilters.proponente_id]
  );
  const filteredSismobItens = useMemo(() => {
    const selectedSituacoes = sismobFilters.situacao;
    if (selectedSituacoes.length === 0) {
      return sismobData?.itens ?? [];
    }
    const selectedSet = new Set(selectedSituacoes);
    return (sismobData?.itens ?? []).filter((item) => selectedSet.has(item.situacao));
  }, [sismobData, sismobFilters.situacao]);
  const proponentesAtendidosCnpj = useMemo(() => {
    const set = new Set<string>();
    for (const item of proponentes) {
      const cnpjDigits = item.cnpj.replace(/\D/g, "");
      if (cnpjDigits !== "") {
        set.add(cnpjDigits);
      }
    }
    return set;
  }, [proponentes]);
  const proponentesAtendidosMunicipiosPorUf = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const item of proponentes) {
      const uf = item.uf.trim().toUpperCase();
      const cidade = item.cidade.trim();
      if (uf.length !== 2 || cidade === "") {
        continue;
      }

      const normalizedCidade = normalizeLocationLabel(cidade);
      if (normalizedCidade === "") {
        continue;
      }

      const current = map.get(uf) ?? new Set<string>();
      current.add(normalizedCidade);
      map.set(uf, current);
    }
    return map;
  }, [proponentes]);
  const proponentesAtendidosCnpjsPorUfCidade = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of proponentes) {
      const uf = item.uf.trim().toUpperCase();
      const cidade = normalizeLocationLabel(item.cidade.trim());
      const cnpj = item.cnpj.replace(/\D/g, "");
      if (uf.length !== 2 || cidade === "" || cnpj.length < 11) {
        continue;
      }

      const key = `${uf}|${cidade}`;
      const current = map.get(key) ?? [];
      if (!current.includes(cnpj)) {
        current.push(cnpj);
        current.sort((a, b) => a.localeCompare(b));
      }
      map.set(key, current);
    }
    return map;
  }, [proponentes]);
  const proponentesAtendidosUfs = useMemo(() => {
    const set = new Set<string>();
    for (const item of proponentes) {
      const uf = item.uf.trim().toUpperCase();
      if (uf.length === 2) {
        set.add(uf);
      }
    }
    return set;
  }, [proponentes]);
  const fnsUfsAtendidas = useMemo(() => {
    return fnsUfs.filter((item) => proponentesAtendidosUfs.has(item.sigla.trim().toUpperCase()));
  }, [fnsUfs, proponentesAtendidosUfs]);
  const fnsMunicipiosAtendidos = useMemo(() => {
    const ufSelected = fnsUfs.find((item) => item.id === fnsRepassesFilters.uf_id)?.sigla?.trim().toUpperCase() ?? "";
    if (ufSelected.length !== 2) {
      return [] as FnsMunicipioItem[];
    }

    const allowedMunicipios = proponentesAtendidosMunicipiosPorUf.get(ufSelected);
    if (!allowedMunicipios || allowedMunicipios.size === 0) {
      return [] as FnsMunicipioItem[];
    }

    return fnsMunicipios.filter((item) => allowedMunicipios.has(normalizeLocationLabel(item.descricao)));
  }, [fnsMunicipios, fnsRepassesFilters.uf_id, fnsUfs, proponentesAtendidosMunicipiosPorUf]);
  const fnsCnpjAutomatico = useMemo(() => {
    const municipioCodigo = fnsRepassesFilters.co_ibge_municipio.trim();
    if (municipioCodigo === "") {
      return "";
    }

    const ufSelected = fnsUfs.find((item) => item.id === fnsRepassesFilters.uf_id)?.sigla?.trim().toUpperCase() ?? "";
    if (ufSelected.length !== 2) {
      return "";
    }

    const municipioItem = fnsMunicipiosAtendidos.find((item) => item.codigo === municipioCodigo);
    if (!municipioItem) {
      return "";
    }

    const key = `${ufSelected}|${normalizeLocationLabel(municipioItem.descricao)}`;
    return proponentesAtendidosCnpjsPorUfCidade.get(key)?.[0] ?? "";
  }, [fnsRepassesFilters.co_ibge_municipio, fnsRepassesFilters.uf_id, fnsUfs, fnsMunicipiosAtendidos, proponentesAtendidosCnpjsPorUfCidade]);
  const consultaFnsMunicipiosAtendidos = useMemo(() => {
    const ufSelected = consultaFnsFilters.uf.trim().toUpperCase();
    if (ufSelected.length !== 2) {
      return [] as ConsultaFnsMunicipioItem[];
    }

    const allowedMunicipios = proponentesAtendidosMunicipiosPorUf.get(ufSelected);
    if (!allowedMunicipios || allowedMunicipios.size === 0) {
      return [] as ConsultaFnsMunicipioItem[];
    }

    return consultaFnsMunicipios.filter((item) => allowedMunicipios.has(normalizeLocationLabel(item.noMunicipio)));
  }, [consultaFnsFilters.uf, consultaFnsMunicipios, proponentesAtendidosMunicipiosPorUf]);
  const consultaFnsUfsAtendidas = useMemo(() => {
    return consultaFnsUfs.filter((item) => proponentesAtendidosUfs.has(item.sigla.trim().toUpperCase()));
  }, [consultaFnsUfs, proponentesAtendidosUfs]);
  const consultaFnsTipoPropostaOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of consultaFnsData?.itens ?? []) {
      const value = (item.coTipoProposta ?? "").trim();
      if (value !== "") {
        set.add(value);
      }
    }
    const current = consultaFnsFilters.tp_proposta.trim();
    if (current !== "") {
      set.add(current);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [consultaFnsData?.itens, consultaFnsFilters.tp_proposta]);
  const consultaFnsTipoRecursoOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of consultaFnsData?.itens ?? []) {
      const value = (item.dsTipoRecurso ?? "").trim();
      if (value !== "") {
        set.add(value);
      }
    }
    const current = consultaFnsFilters.tp_recurso.trim();
    if (current !== "") {
      set.add(current);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [consultaFnsData?.itens, consultaFnsFilters.tp_recurso]);
  const consultaFnsNuPropostaOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of consultaFnsData?.itens ?? []) {
      const value = resolveConsultaFnsNuProposta(item).trim();
      if (value !== "") {
        set.add(value);
      }
    }
    const current = consultaFnsFilters.nu_proposta.trim();
    if (current !== "") {
      set.add(current);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [consultaFnsData?.itens, consultaFnsFilters.nu_proposta]);
  const consultaFnsTipoEmendaOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of consultaFnsData?.itens ?? []) {
      const recurso = (item.dsTipoRecurso ?? "").trim();
      const normalized = recurso.toUpperCase().replace(/^EMENDA\s+/, "").trim();
      if (normalized !== "") {
        set.add(normalized);
      }
    }
    const current = consultaFnsFilters.tp_emenda.trim();
    if (current !== "") {
      set.add(current);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [consultaFnsData?.itens, consultaFnsFilters.tp_emenda]);
  const transferenciasDiscricionariasProponenteSelecionadoId = useMemo(() => {
    const cnpjDigits = transferenciasDiscricionariasFilters.cnpj.replace(/\D/g, "");
    if (cnpjDigits === "") {
      return "";
    }

    const selected = proponentes.find((item) => item.cnpj === cnpjDigits);
    return selected ? String(selected.id) : "";
  }, [proponentes, transferenciasDiscricionariasFilters.cnpj]);
  const transferenciasDiscricionariasDesembolsoProponenteSelecionadoId = useMemo(() => {
    const cnpjDigits = transferenciasDiscricionariasProponenteDesembolsoFilters.cnpj.replace(/\D/g, "");
    if (cnpjDigits === "") {
      return "";
    }

    const selected = proponentes.find((item) => item.cnpj === cnpjDigits);
    return selected ? String(selected.id) : "";
  }, [proponentes, transferenciasDiscricionariasProponenteDesembolsoFilters.cnpj]);
  const profileInstrument = useMemo(() => {
    if (instrumentPageId === null) {
      return null;
    }

    const byList = sortedInstruments.find((item) => item.id === instrumentPageId);
    if (byList) {
      return byList;
    }

    if (selectedInstrument?.id === instrumentPageId) {
      return selectedInstrument;
    }

    return null;
  }, [instrumentPageId, sortedInstruments, selectedInstrument]);
  const currentFlowType: InstrumentFlowType = profileInstrument?.fluxo_tipo ?? "OBRA";
  const allowChecklistExternalLink = currentFlowType !== "OBRA";
  const isEditingProfileInstrument = Boolean(
    canManageInstruments && isInstrumentProfileView && profileInstrument && editingId === profileInstrument.id
  );
  const stageLabels = getStageLabels(currentFlowType);
  const repassePercentualAtual = profileInstrument
    ? calculateRepassePercentage(profileInstrument.valor_ja_repassado, profileInstrument.valor_repasse)
    : 0;
  const profileInstrumentRepasses = profileInstrument?.repasses ?? [];
  const reportInstrumentOptions = useMemo(() => {
    if (reportFilters.proponente_id.trim() === "") {
      return [];
    }

    const proponenteId = Number(reportFilters.proponente_id);
    return sortedInstruments.filter((item) => (item.proponente_id ?? item.convenete_id) === proponenteId);
  }, [reportFilters.proponente_id, sortedInstruments]);
  const obraReportInstrumentOptions = useMemo(() => {
    let obraItems = sortedInstruments.filter((item) => item.fluxo_tipo === "OBRA");
    if (obraReportFilters.proponente_id.trim() === "") {
      if (obraReportFilters.concedente.trim() !== "") {
        obraItems = obraItems.filter((item) => item.concedente === obraReportFilters.concedente);
      }
      return obraItems;
    }

    const proponenteId = Number(obraReportFilters.proponente_id);
    obraItems = obraItems.filter((item) => (item.proponente_id ?? item.convenete_id) === proponenteId);
    if (obraReportFilters.concedente.trim() !== "") {
      obraItems = obraItems.filter((item) => item.concedente === obraReportFilters.concedente);
    }
    return obraItems;
  }, [obraReportFilters.concedente, obraReportFilters.proponente_id, sortedInstruments]);
  const obraReportConcedenteOptions = useMemo(() => {
    let obraItems = sortedInstruments.filter((item) => item.fluxo_tipo === "OBRA");
    if (obraReportFilters.proponente_id.trim() !== "") {
      const proponenteId = Number(obraReportFilters.proponente_id);
      obraItems = obraItems.filter((item) => (item.proponente_id ?? item.convenete_id) === proponenteId);
    }
    const values = new Set<string>();
    for (const item of obraItems) {
      const value = item.concedente.trim();
      if (value) {
        values.add(value);
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [obraReportFilters.proponente_id, sortedInstruments]);
  const andamentoInstrumentosOptions = useMemo(() => {
    let items = sortedInstruments;
    if (andamentoInstrumentosReportFilters.proponente_id.trim() !== "") {
      const proponenteId = Number(andamentoInstrumentosReportFilters.proponente_id);
      items = items.filter((item) => (item.proponente_id ?? item.convenete_id) === proponenteId);
    }

    if (andamentoInstrumentosReportFilters.status) {
      items = items.filter((item) => item.status === andamentoInstrumentosReportFilters.status);
    }

    return items;
  }, [andamentoInstrumentosReportFilters.proponente_id, andamentoInstrumentosReportFilters.status, sortedInstruments]);
  const andamentoInstrumentosSelecionados = useMemo(() => {
    const selected = new Set(andamentoInstrumentosReportFilters.instrumentos);
    return andamentoInstrumentosOptions.filter((item) => selected.has(item.instrumento));
  }, [andamentoInstrumentosOptions, andamentoInstrumentosReportFilters.instrumentos]);
  const filteredSimecObrasItems = useMemo(() => {
    if (!simecObrasData) {
      return [] as SimecObrasResponse["itens"];
    }

    const vigenciaStatus = simecObrasFilters.vigencia_status;
    if (vigenciaStatus === "") {
      return simecObrasData.itens;
    }

    return simecObrasData.itens.filter((item) => {
      if (!item.vigencia_fim) {
        return false;
      }

      const diasParaVencimento = getDaysUntilDate(item.vigencia_fim);
      if (diasParaVencimento === null) {
        return false;
      }

      if (vigenciaStatus === "vencidas") {
        return diasParaVencimento < 0;
      }

      const limiteDias = Number(vigenciaStatus);
      return Number.isFinite(limiteDias) && diasParaVencimento >= 0 && diasParaVencimento <= limiteDias;
    });
  }, [simecObrasData, simecObrasFilters.vigencia_status]);

  const overviewItemsAtendidos = useMemo(() => {
    const proponenteIds = new Set(proponentes.map((item) => item.id));
    if (proponenteIds.size === 0) {
      return [] as Instrument[];
    }
    return overviewItems.filter((item) => {
      const proponenteId = item.proponente_id ?? item.convenete_id;
      return proponenteId !== null && proponenteId !== undefined && proponenteIds.has(proponenteId);
    });
  }, [overviewItems, proponentes]);

  const alertsAtendidos = useMemo(() => {
    const instrumentoIds = new Set(overviewItemsAtendidos.map((item) => item.id));
    return alerts.filter((item) => instrumentoIds.has(item.instrumento_id));
  }, [alerts, overviewItemsAtendidos]);

  const dashboard = useMemo(() => {
    const totalRegistros = overviewItemsAtendidos.length;
    const ativos = overviewItemsAtendidos.filter((item) => item.ativo).length;
    const valorTotal = overviewItemsAtendidos.reduce((acc, item) => acc + toFiniteNumber(item.valor_total), 0);
    const porStatus = STATUS_OPTIONS.map((status) => ({
      status,
      quantidade: overviewItemsAtendidos.filter((item) => item.status === status).length
    }));

    return {
      totalRegistros,
      ativos,
      inativos: totalRegistros - ativos,
      valorTotal,
      alertas: alertsAtendidos.length,
      porStatus
    };
  }, [overviewItemsAtendidos, alertsAtendidos]);

  const dashboardInsights = useMemo(() => {
    const totalRepassado = overviewItemsAtendidos.reduce((acc, item) => acc + getInstrumentRepassadoTotal(item), 0);
    const percentualMedioRepassado =
      overviewItemsAtendidos.length > 0
        ? overviewItemsAtendidos.reduce((acc, item) => acc + getInstrumentPercentualRepassado(item), 0) /
          overviewItemsAtendidos.length
        : 0;

    const flowTypes: InstrumentFlowType[] = [
      "OBRA",
      "AQUISICAO_EQUIPAMENTOS",
      "EVENTOS"
    ];
    const porFluxo: Array<{ fluxo: InstrumentFlowType; quantidade: number }> = flowTypes.map((fluxo) => ({
      fluxo,
      quantidade: overviewItemsAtendidos.filter((item) => item.fluxo_tipo === fluxo).length
    }));

    const concedenteMap = new Map<string, number>();
    for (const item of overviewItemsAtendidos) {
      const key = item.concedente.trim();
      concedenteMap.set(key, (concedenteMap.get(key) ?? 0) + 1);
    }
    const topConcedentes = Array.from(concedenteMap.entries())
      .map(([concedente, quantidade]) => ({ concedente, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    const alertasCriticos = [...alertsAtendidos]
      .sort((a, b) => {
        const aMin = Math.min(a.dias_para_vigencia_fim, a.dias_para_prestacao_contas ?? Number.POSITIVE_INFINITY);
        const bMin = Math.min(b.dias_para_vigencia_fim, b.dias_para_prestacao_contas ?? Number.POSITIVE_INFINITY);
        return aMin - bMin;
      })
      .slice(0, 5);

    const obrasAtivas = overviewItemsAtendidos.filter((item) => item.fluxo_tipo === "OBRA" && item.ativo);
    const obrasComBaixoRepasse = [...obrasAtivas]
      .sort((a, b) => getInstrumentPercentualRepassado(a) - getInstrumentPercentualRepassado(b))
      .slice(0, 5);

    return {
      totalRepassado,
      percentualMedioRepassado,
      porFluxo,
      topConcedentes,
      alertasCriticos,
      obrasComBaixoRepasse,
      prestacaoPendente: overviewItemsAtendidos.filter((item) => item.status === "PRESTACAO_PENDENTE").length,
      emExecucao: overviewItemsAtendidos.filter((item) => item.status === "EM_EXECUCAO").length,
      vencidos: overviewItemsAtendidos.filter((item) => item.status === "VENCIDO").length,
      usuarios: managedUsers.length,
      logs: auditLogs.length
    };
  }, [overviewItemsAtendidos, alertsAtendidos, managedUsers, auditLogs]);

  const dashboardKpis = useMemo(
    () => buildDashboardKpis(user?.role, dashboard, dashboardInsights, formatCurrency),
    [dashboard, dashboardInsights, user?.role]
  );

  const openTickets = useMemo(
    () => tickets.filter((item) => item.status === "ABERTO" || item.status === "EM_ANDAMENTO"),
    [tickets]
  );
  const resolvedTickets = useMemo(() => tickets.filter((item) => item.status === "RESOLVIDO"), [tickets]);
  const canceledTickets = useMemo(() => tickets.filter((item) => item.status === "CANCELADO"), [tickets]);
  const visibleTickets = useMemo(() => {
    if (ticketBoardTab === "resolvidos") {
      return resolvedTickets;
    }
    if (ticketBoardTab === "cancelados") {
      return canceledTickets;
    }
    return openTickets;
  }, [ticketBoardTab, openTickets, resolvedTickets, canceledTickets]);

  const ticketReportSummary = useMemo(() => {
    const items = ticketReportData ?? [];
    const total = items.length;
    const abertos = items.filter((item) => item.status === "ABERTO" || item.status === "EM_ANDAMENTO").length;
    const resolvidos = items.filter((item) => item.status === "RESOLVIDO").length;
    const cancelados = items.filter((item) => item.status === "CANCELADO").length;
    const atrasados = items.filter((item) => isTicketOverdue(item)).length;
    const semAtribuicao = items.filter((item) => !item.responsavel).length;

    const tempoResolucaoDias = items
      .filter((item) => item.resolvido_em)
      .map((item) => {
        const started = new Date(item.created_at).getTime();
        const resolved = new Date(item.resolvido_em as string).getTime();
        return Math.max(0, (resolved - started) / (1000 * 60 * 60 * 24));
      });

    const tempoMedioResolucaoDias =
      tempoResolucaoDias.length === 0
        ? 0
        : tempoResolucaoDias.reduce((acc, value) => acc + value, 0) / tempoResolucaoDias.length;

    const porPrioridade = TICKET_PRIORITY_OPTIONS.map((priority) => ({
      prioridade: priority,
      quantidade: items.filter((item) => item.prioridade === priority).length
    }));

    const porStatus = TICKET_STATUS_OPTIONS.map((status) => ({
      status,
      quantidade: items.filter((item) => item.status === status).length
    }));

    const porResponsavel = new Map<string, number>();
    for (const item of items) {
      const key = item.responsavel?.nome ?? "Nao atribuido";
      porResponsavel.set(key, (porResponsavel.get(key) ?? 0) + 1);
    }
    const topResponsaveis = Array.from(porResponsavel.entries())
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 6);

    return {
      total,
      abertos,
      resolvidos,
      cancelados,
      atrasados,
      semAtribuicao,
      tempoMedioResolucaoDias,
      porPrioridade,
      porStatus,
      topResponsaveis
    };
  }, [ticketReportData]);

  const transferenciasDiscricionariasSyncInfo =
    transferenciasDiscricionariasSyncState ?? transferenciasDiscricionariasData?.sincronizacao ?? null;
  const transferenciasEspeciaisSyncProgress = Math.max(
    0,
    Math.min(100, Number(transferenciasEspeciaisSyncStatus?.progresso_percentual ?? 0))
  );
  const transferenciasEspeciaisSyncHeartbeat =
    transferenciasEspeciaisSyncStatus?.atualizado_em
      ? new Date(transferenciasEspeciaisSyncStatus.atualizado_em).toLocaleString("pt-BR")
      : "-";
  const transferenciasDiscricionariasSyncProgress = Math.max(
    0,
    Math.min(100, Number(transferenciasDiscricionariasSyncInfo?.progresso_percentual ?? 0))
  );
  const transferenciasDiscricionariasSyncPhase =
    transferenciasDiscricionariasSyncInfo?.fase_atual?.trim() ||
    (transferenciasDiscricionariasSyncInfo?.status === "running" ? "Sincronizacao em andamento" : "");
  const transferenciasDiscricionariasSyncHeartbeatLabel = useMemo(() => {
    const heartbeat = transferenciasDiscricionariasSyncInfo?.heartbeat_em ?? transferenciasDiscricionariasSyncInfo?.atualizado_em;
    if (!heartbeat) {
      return "";
    }

    const ms = Date.now() - new Date(heartbeat).getTime();
    if (!Number.isFinite(ms) || ms < 0) {
      return "";
    }

    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `Atualizado ha ${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    return `Atualizado ha ${minutes}min`;
  }, [transferenciasDiscricionariasSyncInfo?.heartbeat_em, transferenciasDiscricionariasSyncInfo?.atualizado_em]);
  const isTransferenciasDiscricionariasSyncRunning = transferenciasDiscricionariasSyncInfo?.status === "running";
  const shouldShowProponentesSyncProgress =
    isTransferenciasDiscricionariasSyncRunning ||
    (isSyncingTransferenciasDiscricionarias &&
      (transferenciasDiscricionariasSyncMode === "light" || transferenciasDiscricionariasSyncMode === "full"));
  const proponentesSyncProgressValue = shouldShowProponentesSyncProgress
    ? transferenciasDiscricionariasSyncInfo?.progresso_percentual == null &&
      isSyncingTransferenciasDiscricionarias &&
      transferenciasDiscricionariasSyncInfo?.status !== "running"
      ? 2
      : transferenciasDiscricionariasSyncProgress
    : 0;
  const proponentesSyncPhaseLabel =
    transferenciasDiscricionariasSyncPhase ||
    (isSyncingTransferenciasDiscricionarias
      ? transferenciasDiscricionariasSyncMode === "full"
        ? "Iniciando sincronizacao completa"
        : "Iniciando sincronizacao leve"
      : "Aguardando nova sincronizacao");
  const proponentesSyncSteps = shouldShowProponentesSyncProgress
    ? buildSyncSteps({
        status: transferenciasDiscricionariasSyncInfo?.status ?? (isSyncingTransferenciasDiscricionarias ? "running" : "idle"),
        progress: proponentesSyncProgressValue,
        phase: transferenciasDiscricionariasSyncInfo?.fase_atual ?? proponentesSyncPhaseLabel
      })
    : [];
  const shouldShowTransferenciasDiscricionariasSyncProgress = shouldShowProponentesSyncProgress;
  const transferenciasDiscricionariasSyncSteps = shouldShowTransferenciasDiscricionariasSyncProgress
    ? buildSyncSteps({
        status: transferenciasDiscricionariasSyncInfo?.status ?? (isSyncingTransferenciasDiscricionarias ? "running" : "idle"),
        progress: proponentesSyncProgressValue,
        phase: transferenciasDiscricionariasSyncInfo?.fase_atual ?? proponentesSyncPhaseLabel
      })
    : [];
  const transferenciasDiscricionariasProponenteParcelaMap = useMemo(
    () =>
      transferenciasDiscricionariasProponenteDesembolsoData
        ? buildDesembolsoParcelaMap(transferenciasDiscricionariasProponenteDesembolsoData.itens)
        : new Map<number, number>(),
    [transferenciasDiscricionariasProponenteDesembolsoData]
  );

  const refreshTechnicalHealth = async () => {
    let backendVersion = "desconhecida";

    try {
      const health = await healthCheck();
      setHealthStatus("ok");
      backendVersion = health.version?.trim() ? health.version : "desconhecida";
    } catch {
      setHealthStatus("error");
      setTechnicalHealth((prev) => ({
        ...prev,
        reportRouteStatus: "error",
        lastCheckedAt: new Date().toISOString()
      }));
      return;
    }

    if (!token) {
      setTechnicalHealth({
        backendVersion,
        reportRouteStatus: "checking",
        lastCheckedAt: new Date().toISOString()
      });
      setGmailDeliveryHealth({
        status: "unknown",
        reason: "AUTH_REQUIRED",
        message: "Faca login como admin para verificar o envio Gmail.",
        checkedAt: new Date().toISOString()
      });
      return;
    }

    if (!isAdmin) {
      setTechnicalHealth({
        backendVersion,
        reportRouteStatus: "checking",
        lastCheckedAt: new Date().toISOString()
      });
      setGmailDeliveryHealth({
        status: "unknown",
        reason: "ADMIN_REQUIRED",
        message: "Status tecnico detalhado disponivel apenas para administradores.",
        checkedAt: new Date().toISOString()
      });
      return;
    }

    try {
      const smokeResponse = await fetch(buildApiAbsoluteUrl("/api/v1/relatorios/obras?ativo=true"), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const routeStatus: TechnicalRouteStatus = smokeResponse.status === 404 ? "missing" : "ok";
      setTechnicalHealth({
        backendVersion,
        reportRouteStatus: routeStatus,
        lastCheckedAt: new Date().toISOString()
      });
    } catch {
      setTechnicalHealth({
        backendVersion,
        reportRouteStatus: "error",
        lastCheckedAt: new Date().toISOString()
      });
    }

    try {
      const emailStatus = await getTicketsEmailStatus(token);
      const gmail = emailStatus.gmailDeliveryHealth;
      if (!gmail) {
        setGmailDeliveryHealth({
          status: "unknown",
          reason: "NOT_AVAILABLE",
          message: "Status de envio Gmail indisponivel no momento.",
          checkedAt: new Date().toISOString()
        });
        return;
      }

      setGmailDeliveryHealth({
        status: gmail.ok ? "ok" : "error",
        reason: gmail.reason,
        message: gmail.message,
        checkedAt: gmail.checkedAt
      });
    } catch {
      setGmailDeliveryHealth({
        status: "unknown",
        reason: "UNAUTHORIZED_OR_ERROR",
        message: "Nao foi possivel consultar o Gmail (requer ADMIN e endpoint ativo).",
        checkedAt: new Date().toISOString()
      });
    }
  };

  const gmailHealthStatusLabel = useMemo(() => {
    if (gmailDeliveryHealth.status === "ok") {
      return "ok";
    }
    if (gmailDeliveryHealth.status === "error") {
      return "falha";
    }
    if (gmailDeliveryHealth.status === "checking") {
      return "verificando";
    }
    return "indisponivel";
  }, [gmailDeliveryHealth.status]);

  useEffect(() => {
    void refreshTechnicalHealth();
  }, [token]);

  const persistAuth = (nextToken: string, nextUser: User) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  };

  const clearAuth = () => {
    setToken("");
    setUser(null);
    setInstruments([]);
    setOverviewItems([]);
    setAlerts([]);
    setSelectedInstrument(null);
    setChecklistItems([]);
    setChecklistSummary(null);
    setStageFollowUps(emptyStageFollowUps());
    setStageFollowUpText("");
    setStageFollowUpFiles([]);
    setWorkProgressFollowUpText("");
    setStageFollowUpModalStage(null);
    setStageFollowUpFilter("TODOS");
    setExpandedFollowUpIds([]);
    setWorkProgress(null);
    setChecklistStage("PROPOSTA");
    setActiveWorkflowStage(null);
    setExpandedChecklistAttachmentItemIds([]);
    setBusyExternalLinkItemId(null);
    setObraPercentual("0");
    setBoletimData(todayDate());
    setBoletimValor(formatCurrencyInput(0));
    setBoletimPercentual("");
    setBoletimObservacao("");
    setShowRepassePanel(false);
    setShowWorkProgressPanel(false);
    setRelatorioTab("repasses");
    setReportFilters(emptyReportFilters());
    setReportData(null);
    setObraReportFilters(emptyObraReportFilters());
    setObraReportData(null);
    setAndamentoInstrumentosReportFilters(emptyAndamentoInstrumentosReportFilters());
    setAndamentoInstrumentosReportData(null);
    setTransparenciaReportFilters(emptyTransparenciaReportFilters());
    setTransparenciaReportData(null);
    setTransferenciasEspeciaisFilters(emptyTransferenciasEspeciaisFilters());
    setTransferenciasEspeciaisData(null);
    setTransferenciasEspeciaisPage(1);
    setTransferenciasDiscricionariasFilters(emptyTransferenciasDiscricionariasFilters());
    setTransferenciasDiscricionariasData(null);
    setTransferenciasDiscricionariasFiltros(null);
    setTransferenciasDiscricionariasCnpjSugestoes([]);
    setTransferenciasDiscricionariasSyncState(null);
    setTransferenciasDiscricionariasPage(1);
    setTransferenciasDiscricionariasTab("convenios");
    setTransferenciasDiscricionariasDesembolsoFilters(emptyTransferenciasDiscricionariasDesembolsoFilters());
    setTransferenciasDiscricionariasDesembolsoData(null);
    setTransferenciasDiscricionariasDesembolsoPage(1);
    setTransferenciasDiscricionariasProponenteDesembolsoFilters(
      emptyTransferenciasDiscricionariasProponenteDesembolsoFilters()
    );
    setTransferenciasDiscricionariasProponenteDesembolsoData(null);
    setTransferenciasDiscricionariasProponenteDesembolsoPage(1);
    setFnsRepassesFilters(emptyFnsRepassesFilters());
    setFnsUfs([]);
    setFnsMunicipios([]);
    setFnsRepassesData(null);
    setFnsRepassesDetalheData(null);
    setFnsSaldosData(null);
    setFnsSyncStatus(null);
    setFnsDetalheBlocoLabel("");
    setConsultaFnsFilters(emptyConsultaFnsFilters());
    setConsultaFnsUfs([]);
    setConsultaFnsAnos([]);
    setConsultaFnsMunicipios([]);
    setConsultaFnsData(null);
    setConsultaFnsPage(1);
    setConsultaFnsSelected(null);
    setConsultaFnsDetalhe(null);
    setConsultaFnsSyncStatus(null);
    setSimecObrasFilters(emptySimecObrasFilters());
    setSimecUfs([]);
    setSimecMunicipios([]);
    setSimecObrasData(null);
    setSimecObraDetalhe(null);
    setSimecObraDetalheId(null);
    setSimecTermosFilters(emptySimecTermosFilters());
    setSimecTermosData(null);
    setSimecTermoDetalhe(null);
    setSimecTermoDetalheId(null);
    setTicketReportFilters(emptyTicketReportFilters());
    setTicketReportData(null);
    setTicketFilters(emptyTicketFilters());
    setTickets([]);
    setTicketBoardTab("abertos");
    setSelectedTicket(null);
    setTicketIdFromUrl(null);
    setTicketForm(emptyTicketForm());
    setTicketResolutionReason("");
    setTicketCommentText("");
    setTicketAssignableUsers([]);
    setAssistentePergunta("");
    setAssistenteConversa(emptyAssistenteConversa());
    setIsConsultandoAssistente(false);
    setAssistenteSessionId(null);
    setAssistenteSessionHydrated(false);
    setEditingId(null);
    setShowCreateInstrumentForm(false);
    setForm(emptyInstrumentForm());
    setProponentes([]);
    setProponenteCadastro(emptyProponenteCadastroState());
    setProponenteSugestoes([]);
    setManagedUsers([]);
    setEditingManagedUserId(null);
    setAdminUserForm(emptyAdminUserForm());
    setFilters(blankFilters());
    setInstrumentPageId(null);
    if (window.location.pathname !== "/dashboard" || window.location.search !== "") {
      window.history.replaceState({}, "", "/dashboard");
    }
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TICKET_TAB_KEY);
  };

  const onLogout = async () => {
    try {
      await logoutSession();
    } catch {
      // clear local state even if backend logout fails
    } finally {
      clearAuth();
      setMessage("Sessao encerrada.");
    }
  };

  useEffect(() => {
    const onAuthExpired = () => {
      clearAuth();
      setMessage("Sessao expirada. Faca login novamente.");
    };

    window.addEventListener("gestconv:auth-expired", onAuthExpired);
    return () => window.removeEventListener("gestconv:auth-expired", onAuthExpired);
  }, []);

  useEffect(() => {
    if (token || user) {
      return;
    }
    getMyProfile(COOKIE_SESSION_TOKEN)
      .then((profile) => {
        persistAuth(COOKIE_SESSION_TOKEN, profile);
      })
      .catch(() => {
        // no active session cookie
      });
  }, [token, user]);

  useEffect(() => {
    const onHashChange = () => setPublicPreviewHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    return () => {
      if (menuTransitionTimeoutRef.current !== null) {
        window.clearTimeout(menuTransitionTimeoutRef.current);
      }
      if (viewPendingTimeoutRef.current !== null) {
        window.clearTimeout(viewPendingTimeoutRef.current);
      }
      if (assistenteTypingIntervalRef.current !== null) {
        window.clearInterval(assistenteTypingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!assistenteChatLogRef.current) {
      return;
    }
    assistenteChatLogRef.current.scrollTo({
      top: assistenteChatLogRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [assistenteConversa, isConsultandoAssistente]);

  const startNewAssistenteConversation = () => {
    if (assistenteTypingIntervalRef.current !== null) {
      window.clearInterval(assistenteTypingIntervalRef.current);
      assistenteTypingIntervalRef.current = null;
    }
    setAssistenteTypingMessageId(null);
    setAssistenteConversa(emptyAssistenteConversa());
    setAssistentePergunta("");
    setAssistenteSessionId(null);
    setAssistenteSessionHydrated(true);
  };

  const loadAssistenteSessionsHistory = async (authToken?: string) => {
    const safeToken = authToken ?? token;
    if (!safeToken) {
      return;
    }
    setIsLoadingAssistenteSessions(true);
    try {
      const list = await listAssistenteSessions(safeToken, 50);
      setAssistenteSessions(list.itens);
    } catch {
      setAssistenteSessions([]);
    } finally {
      setIsLoadingAssistenteSessions(false);
    }
  };

  const onOpenAssistenteSession = async (sessionId: string) => {
    if (!token || isConsultandoAssistente) {
      return;
    }
    setIsBusy(true);
    setMessage("");
    try {
      const detail = await getAssistenteSession(token, sessionId);
      setAssistenteSessionId(detail.id);
      setAssistenteConversa(mapAssistenteSessionToConversa(detail));
      setAssistenteSessionHydrated(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar a conversa.");
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (!token || activeView !== "assistente") {
      return;
    }
    if (!assistenteSessionHydrated) {
      startNewAssistenteConversation();
    }
    void loadAssistenteSessionsHistory(token);
  }, [activeView, assistenteSessionHydrated, token]);

  useEffect(() => {
    localStorage.setItem(TICKET_TAB_KEY, ticketBoardTab);
  }, [ticketBoardTab]);

  useEffect(() => {
    if (!selectedTicket) {
      return;
    }
    const stillVisible = visibleTickets.some((item) => item.id === selectedTicket.id);
    if (!stillVisible) {
      setSelectedTicket(null);
    }
  }, [visibleTickets, selectedTicket]);

  useEffect(() => {
    if (!isAuthenticated || !token || ticketIdFromUrl === null) {
      return;
    }

    if (selectedTicket?.id === ticketIdFromUrl) {
      return;
    }

    setActiveView("tickets");
    void onSelectTicket(ticketIdFromUrl, false);
  }, [isAuthenticated, token, ticketIdFromUrl]);

  useEffect(() => {
    if (!isAuthenticated || !token || emendaIdFromUrl === null) {
      return;
    }

    if (expandedEmendaDocumentosId === emendaIdFromUrl) {
      return;
    }

    setActiveView("emendas_estaduais");
    setExpandedEmendaDocumentosId(emendaIdFromUrl);
    void loadEmendaDocumentos(emendaIdFromUrl).catch(() => undefined);
  }, [isAuthenticated, token, emendaIdFromUrl, expandedEmendaDocumentosId]);

  useEffect(() => {
    if (activeView !== "tickets" || window.location.pathname !== "/tickets") {
      return;
    }

    const currentUrl = `${window.location.pathname}${window.location.search}`;
    const nextUrl = selectedTicket ? `/tickets?ticket=${selectedTicket.id}` : "/tickets";
    if (currentUrl !== nextUrl) {
      window.history.replaceState({}, "", nextUrl);
    }
  }, [activeView, selectedTicket]);

  useEffect(() => {
    if (activeView !== "emendas_estaduais" || window.location.pathname !== "/emendas-estaduais") {
      return;
    }

    const currentUrl = `${window.location.pathname}${window.location.search}`;
    const nextUrl = expandedEmendaDocumentosId
      ? `/emendas-estaduais?emenda=${expandedEmendaDocumentosId}`
      : "/emendas-estaduais";
    if (currentUrl !== nextUrl) {
      window.history.replaceState({}, "", nextUrl);
    }
  }, [activeView, expandedEmendaDocumentosId]);

  useEffect(() => {
    if (activeView === "tickets" || activeView === "emendas_estaduais") {
      return;
    }
    if (activeView === "instrumentos" && instrumentPageId !== null) {
      return;
    }

    const nextPath = getPathForView(activeView, relatorioTab);
    if (window.location.pathname !== nextPath || window.location.search !== "") {
      window.history.replaceState({}, "", nextPath);
    }
  }, [activeView, instrumentPageId, relatorioTab]);

  const navigateToInstrumentList = () => {
    setInstrumentPageId(null);
    setChecklistItems([]);
    setChecklistSummary(null);
    setStageFollowUps(emptyStageFollowUps());
    setStageFollowUpText("");
    setStageFollowUpFiles([]);
    setStageFollowUpModalStage(null);
    setStageFollowUpFilter("TODOS");
    setExpandedFollowUpIds([]);
    setExpandedChecklistAttachmentItemIds([]);
    setWorkProgress(null);
    setShowRepassePanel(false);
    setShowWorkProgressPanel(false);
    setActiveWorkflowStage(null);
    setBusyExternalLinkItemId(null);
    if (window.location.pathname !== "/instrumentos") {
      window.history.pushState({}, "", "/instrumentos");
    }
  };

  const onViewProponenteInstruments = (proponenteId: number) => {
    setFilters((prev) => ({ ...prev, proponente_id: String(proponenteId) }));
    setActiveView("instrumentos");
    setInstrumentPageId(null);
    window.scrollTo(0, 0);
  };

  const navigateToInstrumentProfile = (id: number) => {
    const nextPath = `/instrumentos/${id}`;
    setInstrumentPageId(id);
    setActiveWorkflowStage(null);
    setExpandedChecklistAttachmentItemIds([]);
    setActiveView("instrumentos");
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
  };

  const loadInstruments = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const items = await listInstruments(currentToken, filters);
    setInstruments(items);
    if (selectedInstrument) {
      setSelectedInstrument(items.find((item) => item.id === selectedInstrument.id) ?? null);
    }
  };

  const loadDashboard = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const base = blankFilters();
    const [ativos, inativos, alertas] = await Promise.all([
      listInstruments(currentToken, { ...base, ativo: "true" }),
      listInstruments(currentToken, { ...base, ativo: "false" }),
      listDeadlineAlerts(currentToken, 30)
    ]);

    setOverviewItems([...ativos, ...inativos]);
    setAlerts(alertas.itens);
  };

  const loadAuditTrail = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const logs = await listAuditLogs(currentToken, {
      instrumento_id: auditInstrumentId.trim() === "" ? undefined : Number(auditInstrumentId),
      acao: auditAction || undefined,
      limite: 150
    });
    setAuditLogs(logs);
  };

  const loadProponentes = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const items = await listProponentes(currentToken);
    setProponentes(items);
  };

  const loadEmendasEstaduais = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const [emendasResp, municipiosResp] = await Promise.all([
      listEmendasEstaduais(currentToken, { q: emendaEstadualSearch.trim() || undefined }),
      listEmendasEstaduaisMunicipios(currentToken)
    ]);

    setEmendasEstaduais(emendasResp.itens);
    setEmendasEstaduaisMunicipios(municipiosResp.itens);
  };

  const loadEmendaDocumentos = async (emendaId: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }
    const [docsResp, auditResp] = await Promise.all([
      listEmendaEstadualDocumentos(currentToken, emendaId),
      listEmendaEstadualDocumentosAuditoria(currentToken, emendaId)
    ]);
    setEmendaDocumentosByEmenda((prev) => ({ ...prev, [emendaId]: docsResp.itens }));
    setEmendaDocumentosAuditByEmenda((prev) => ({ ...prev, [emendaId]: auditResp.itens }));
  };

  const loadRepasseReport = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    if (reportFilters.proponente_id.trim() === "") {
      setReportData(null);
      return;
    }

    const report = await getRepasseReport(currentToken, {
      proponente_id: Number(reportFilters.proponente_id),
      instrumento_id: reportFilters.instrumento_id.trim() === "" ? undefined : Number(reportFilters.instrumento_id),
      data_de: reportFilters.data_de || undefined,
      data_ate: reportFilters.data_ate || undefined
    });
    setReportData(report);
  };

  const loadObraReport = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const report = await getObraReport(currentToken, {
      proponente_id: obraReportFilters.proponente_id.trim() === "" ? undefined : Number(obraReportFilters.proponente_id),
      instrumento_id: obraReportFilters.instrumento_id.trim() === "" ? undefined : Number(obraReportFilters.instrumento_id),
      concedente: obraReportFilters.concedente.trim() || undefined,
      status: obraReportFilters.status || undefined,
      ativo: obraReportFilters.ativo === "true",
      data_de: obraReportFilters.data_de || undefined,
      data_ate: obraReportFilters.data_ate || undefined
    });

    setObraReportData(report);
  };

  const loadAndamentoInstrumentosReport = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    if (andamentoInstrumentosReportFilters.instrumentos.length === 0) {
      setAndamentoInstrumentosReportData(null);
      return;
    }

    const report = await getAndamentoInstrumentosReport(currentToken, {
      proponente_id:
        andamentoInstrumentosReportFilters.proponente_id.trim() === ""
          ? undefined
          : Number(andamentoInstrumentosReportFilters.proponente_id),
      status: andamentoInstrumentosReportFilters.status || undefined,
      instrumentos: andamentoInstrumentosReportFilters.instrumentos
    });

    setAndamentoInstrumentosReportData(report);
  };

  const loadTransparenciaReport = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const cnpjDigits = transparenciaReportFilters.cnpj.replace(/\D/g, "");
    if (cnpjDigits.length !== 14) {
      setTransparenciaReportData(null);
      return;
    }

    const ano = Number(transparenciaReportFilters.ano);
    const anoPagamento = Number(transparenciaReportFilters.ano_pagamento);
    const maxPaginas = Number(transparenciaReportFilters.max_paginas_convenios);
    const maxProcessos = Number(transparenciaReportFilters.max_processos);

    const report = await getTransparenciaReport(currentToken, {
      cnpj: cnpjDigits,
      ano: Number.isFinite(ano) && ano >= 2000 && ano <= 2100 ? ano : undefined,
      ano_pagamento: Number.isFinite(anoPagamento) && anoPagamento >= 2000 && anoPagamento <= 2100 ? anoPagamento : undefined,
      max_paginas_convenios: Number.isFinite(maxPaginas) && maxPaginas > 0 ? maxPaginas : undefined,
      max_processos: Number.isFinite(maxProcessos) && maxProcessos > 0 ? maxProcessos : undefined
    });

    setTransparenciaReportData(report);
  };

  const loadTransferenciasEspeciaisReport = async (pageOverride?: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const pageSizeParsed = Number(transferenciasEspeciaisFilters.page_size);
    const report = await getTransferenciasEspeciaisPlanoAcao(currentToken, {
      cnpj: transferenciasEspeciaisFilters.cnpj.trim() || undefined,
      nome_beneficiario: transferenciasEspeciaisFilters.nome_beneficiario.trim() || undefined,
      uf: transferenciasEspeciaisFilters.uf.trim().toUpperCase() || undefined,
      ano: transferenciasEspeciaisFilters.ano.trim() === "" ? undefined : Number(transferenciasEspeciaisFilters.ano),
      situacao:
        transferenciasEspeciaisFilters.situacao.length > 0
          ? transferenciasEspeciaisFilters.situacao.join(",")
          : undefined,
      pagamento: transferenciasEspeciaisFilters.pagamento || undefined,
      codigo_plano_acao: transferenciasEspeciaisFilters.codigo_plano_acao.trim() || undefined,
      parlamentar: transferenciasEspeciaisFilters.parlamentar.trim() || undefined,
      page: pageOverride ?? transferenciasEspeciaisPage,
      page_size: Number.isFinite(pageSizeParsed) && pageSizeParsed > 0 ? pageSizeParsed : 20
    });

    setTransferenciasEspeciaisData(report);
    setTransferenciasEspeciaisPage(report.paginacao.pagina);
  };

  const buildTransferenciasDiscricionariasQuery = (
    page: number,
    pageSize: number,
    filters: TransferenciasDiscricionariasFilters
  ) => {
    const vigenciaDiasParsed = Number(filters.vigencia_a_vencer_dias);
    const vigenciaDias = [30, 60, 90].includes(vigenciaDiasParsed)
      ? (vigenciaDiasParsed as 30 | 60 | 90)
      : undefined;

    return {
      cnpj: filters.cnpj.trim() || undefined,
      nome_proponente: filters.nome_proponente.trim() || undefined,
      concedente: filters.concedente.trim() || undefined,
      uf: filters.uf.trim().toUpperCase() || undefined,
      municipio: filters.municipio.trim() || undefined,
      ano: filters.ano.trim() === "" ? undefined : Number(filters.ano),
      situacao_proposta: filters.situacao_proposta.trim() || undefined,
      situacao_convenio: filters.situacao_convenio.trim() || undefined,
      nr_convenio: filters.nr_convenio.trim() || undefined,
      nr_proposta: filters.nr_proposta.trim() || undefined,
      tipo_ente: filters.tipo_ente || undefined,
      vigencia_a_vencer_dias: vigenciaDias,
      page,
      page_size: pageSize
    };
  };
  const loadTransferenciasDiscricionariasReport = async (
    pageOverride?: number,
    authToken?: string,
    filtersOverride?: Partial<TransferenciasDiscricionariasFilters>
  ) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const sourceFilters = filtersOverride
      ? { ...transferenciasDiscricionariasFilters, ...filtersOverride }
      : transferenciasDiscricionariasFilters;

    const pageSizeParsed = Number(sourceFilters.page_size);
    const effectivePageSize = Number.isFinite(pageSizeParsed) && pageSizeParsed > 0 ? pageSizeParsed : 20;

    const queryParams = buildTransferenciasDiscricionariasQuery(pageOverride ?? transferenciasDiscricionariasPage, effectivePageSize, sourceFilters);

    const report = await getTransferenciasDiscricionarias(
      currentToken,
      queryParams
    );

    setTransferenciasDiscricionariasData(report);
    setTransferenciasDiscricionariasSyncState(report.sincronizacao);
    setTransferenciasDiscricionariasPage(report.paginacao.pagina);
  };

  const loadTransferenciasDiscricionariasFiltros = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const filtros = await getTransferenciasDiscricionariasFiltros(currentToken);
    setTransferenciasDiscricionariasFiltros(filtros);
  };
  const loadTransferenciasDiscricionariasCnpjSugestoes = async (cnpjParcial: string, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const digits = cnpjParcial.replace(/\D/g, "");
    if (digits.length < 4) {
      setTransferenciasDiscricionariasCnpjSugestoes([]);
      return;
    }

    const result = await getTransferenciasDiscricionariasProponenteSugestoes(currentToken, {
      cnpj: digits,
      limit: 10
    });
    setTransferenciasDiscricionariasCnpjSugestoes(result.itens);
  };

  const loadTransferenciasDiscricionariasDesembolsos = async (pageOverride?: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const nrConvenio = transferenciasDiscricionariasDesembolsoFilters.nr_convenio.trim();
    if (nrConvenio === "") {
      setTransferenciasDiscricionariasDesembolsoData(null);
      return;
    }

    const pageSizeParsed = Number(transferenciasDiscricionariasDesembolsoFilters.page_size);
    const anoParsed = Number(transferenciasDiscricionariasDesembolsoFilters.ano);
    const mesParsed = Number(transferenciasDiscricionariasDesembolsoFilters.mes);

    const report = await getTransferenciasDiscricionariasDesembolsos(currentToken, {
      nr_convenio: nrConvenio,
      ano: Number.isFinite(anoParsed) && anoParsed >= 2000 ? anoParsed : undefined,
      mes: Number.isFinite(mesParsed) && mesParsed >= 1 && mesParsed <= 12 ? mesParsed : undefined,
      page: pageOverride ?? transferenciasDiscricionariasDesembolsoPage,
      page_size: Number.isFinite(pageSizeParsed) && pageSizeParsed > 0 ? pageSizeParsed : 50
    });

    setTransferenciasDiscricionariasDesembolsoData(report);
    setTransferenciasDiscricionariasDesembolsoPage(report.paginacao.pagina);
  };

  const loadTransferenciasDiscricionariasDesembolsosPorProponente = async (pageOverride?: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const cnpjDigits = transferenciasDiscricionariasProponenteDesembolsoFilters.cnpj.replace(/\D/g, "");
    const nomeProponente = transferenciasDiscricionariasProponenteDesembolsoFilters.nome_proponente.trim();

    if (cnpjDigits === "" && nomeProponente === "") {
      setTransferenciasDiscricionariasProponenteDesembolsoData(null);
      return;
    }

    const pageSizeParsed = Number(transferenciasDiscricionariasProponenteDesembolsoFilters.page_size);
    const anoParsed = Number(transferenciasDiscricionariasProponenteDesembolsoFilters.ano);
    const mesParsed = Number(transferenciasDiscricionariasProponenteDesembolsoFilters.mes);

    const report = await getTransferenciasDiscricionariasDesembolsosPorProponente(currentToken, {
      cnpj: cnpjDigits || undefined,
      nome_proponente: nomeProponente || undefined,
      ano: Number.isFinite(anoParsed) && anoParsed >= 2000 ? anoParsed : undefined,
      mes: Number.isFinite(mesParsed) && mesParsed >= 1 && mesParsed <= 12 ? mesParsed : undefined,
      page: pageOverride ?? transferenciasDiscricionariasProponenteDesembolsoPage,
      page_size: Number.isFinite(pageSizeParsed) && pageSizeParsed > 0 ? pageSizeParsed : 100
    });

    setTransferenciasDiscricionariasProponenteDesembolsoData(report);
    setTransferenciasDiscricionariasProponenteDesembolsoPage(report.paginacao.pagina);
  };

  const loadFnsSyncStatus = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const status = await getFnsSyncStatus(currentToken);
    setFnsSyncStatus(status);
  };

  const loadFnsUfs = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const result = await getFnsUfs(currentToken);
    setFnsUfs(Array.isArray(result?.itens) ? result.itens : []);
  };

  const loadFnsMunicipios = async (ufId: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const result = await getFnsMunicipios(currentToken, { uf_id: ufId });
    setFnsMunicipios(Array.isArray(result?.itens) ? result.itens : []);
  };

  const loadFnsRepasses = async (authToken?: string, override?: Partial<FnsRepassesFilters>) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const source = override ? { ...fnsRepassesFilters, ...override } : fnsRepassesFilters;
    const cnpjDigits = source.cnpj.replace(/\D/g, "");
    const ano = Number(source.ano);
    if (cnpjDigits.length < 11) {
      setFnsRepassesData(null);
      setFnsRepassesDetalheData(null);
      setFnsSaldosData(null);
      return;
    }

    const repasses = await getFnsRepasses(currentToken, {
      cnpj: cnpjDigits,
      ano: Number.isFinite(ano) ? ano : undefined
    });
    setFnsRepassesData({
      quantidade: Number(repasses?.quantidade ?? 0),
      valor: Number(repasses?.valor ?? 0),
      itens: Array.isArray(repasses?.itens) ? repasses.itens : []
    });

    const saldos = await getFnsSaldosTiposConta(currentToken, { cnpj: cnpjDigits });
    setFnsSaldosData({
      quantidade: Number(saldos?.quantidade ?? 0),
      valor: Number(saldos?.valor ?? 0),
      itens: Array.isArray(saldos?.itens) ? saldos.itens : []
    });

    const codigoBloco = source.codigo_bloco.trim();
    if (codigoBloco !== "") {
      const detalhe = await getFnsRepassesDetalhe(currentToken, {
        cnpj: cnpjDigits,
        ano: Number.isFinite(ano) ? ano : undefined,
        codigo_bloco: codigoBloco
      });
      setFnsRepassesDetalheData({
        quantidade: Number(detalhe?.quantidade ?? 0),
        valor: Number(detalhe?.valor ?? 0),
        itens: Array.isArray(detalhe?.itens) ? detalhe.itens : []
      });
      setFnsDetalheBlocoLabel(codigoBloco);
    } else {
      setFnsRepassesDetalheData(null);
      setFnsDetalheBlocoLabel("");
    }
  };

  const loadFnsRepassesDetalheByBloco = async (codigoBloco: string, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const cnpjDigits = fnsRepassesFilters.cnpj.replace(/\D/g, "");
    if (cnpjDigits.length < 11) {
      throw new Error("Informe um CNPJ valido para consultar detalhe de repasses.");
    }

    const ano = Number(fnsRepassesFilters.ano);
    const detalhe = await getFnsRepassesDetalhe(currentToken, {
      cnpj: cnpjDigits,
      ano: Number.isFinite(ano) ? ano : undefined,
      codigo_bloco: codigoBloco
    });
    setFnsRepassesDetalheData({
      quantidade: Number(detalhe?.quantidade ?? 0),
      valor: Number(detalhe?.valor ?? 0),
      itens: Array.isArray(detalhe?.itens) ? detalhe.itens : []
    });
    setFnsDetalheBlocoLabel(codigoBloco);
    setFnsRepassesFilters((prev) => ({ ...prev, codigo_bloco: codigoBloco }));
  };

  const loadConsultaFnsStatus = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const status = await getConsultaFnsStatus(currentToken);
    setConsultaFnsSyncStatus(status);
  };

  const loadConsultaFnsCatalogos = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const [ufsRes, anosRes] = await Promise.all([getConsultaFnsUfs(currentToken), getConsultaFnsAnos(currentToken)]);
    setConsultaFnsUfs(Array.isArray(ufsRes?.itens) ? ufsRes.itens : []);
    setConsultaFnsAnos(Array.isArray(anosRes?.itens) ? anosRes.itens : []);
  };

  const loadConsultaFnsMunicipios = async (uf: string, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const response = await getConsultaFnsMunicipios(currentToken, { uf });
    setConsultaFnsMunicipios(Array.isArray(response?.itens) ? response.itens : []);
  };

  const loadConsultaFnsPropostas = async (pageOverride?: number, authToken?: string, override?: Partial<ConsultaFnsFilters>) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const source = override ? { ...consultaFnsFilters, ...override } : consultaFnsFilters;
    const ano = Number(source.ano);
    const count = Number(source.count);

    const result = await getConsultaFnsPropostas(currentToken, {
      ano: Number.isFinite(ano) ? ano : undefined,
      uf: source.uf || undefined,
      co_municipio_ibge: source.co_municipio_ibge || undefined,
      nu_proposta: source.nu_proposta.trim() || undefined,
      tp_proposta: source.tp_proposta.trim() || undefined,
      tp_recurso: source.tp_recurso.trim() || undefined,
      tp_emenda: source.tp_emenda.trim() || undefined,
      page: pageOverride ?? consultaFnsPage,
      count: Number.isFinite(count) && count > 0 ? count : 20
    });

    const itensResult = Array.isArray(result?.itens) ? result.itens : [];
    const paginacaoResult = result?.paginacao ?? {
      pagina: 1,
      tamanho_pagina: Number.isFinite(count) && count > 0 ? count : 20,
      total: 0,
      total_paginas: 1,
      tem_proxima: false,
      tem_anterior: false
    };

    setConsultaFnsData({
      itens: itensResult,
      paginacao: {
        pagina: Number(paginacaoResult.pagina ?? 1),
        tamanho_pagina: Number(paginacaoResult.tamanho_pagina ?? (Number.isFinite(count) && count > 0 ? count : 20)),
        total: Number(paginacaoResult.total ?? 0),
        total_paginas: Number(paginacaoResult.total_paginas ?? 1),
        tem_proxima: Boolean(paginacaoResult.tem_proxima),
        tem_anterior: Boolean(paginacaoResult.tem_anterior)
      }
    });
    setConsultaFnsPage(Number(paginacaoResult.pagina ?? 1));
  };

  const loadConsultaFnsPropostaDetalhe = async (nuProposta: string, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const detalhe = await getConsultaFnsPropostaDetalhe(currentToken, nuProposta);
    setConsultaFnsDetalhe({
      ...detalhe,
      situacao: detalhe?.situacao ?? { descricaoSituacaoproposta: "Nao informada", dataSituacaoProjeto: null },
      parlamentares: Array.isArray(detalhe?.parlamentares) ? detalhe.parlamentares : [],
      pagamentos: Array.isArray(detalhe?.pagamentos) ? detalhe.pagamentos : []
    });
  };

  const loadSimecUfs = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    try {
      const result = await getSimecUfs(currentToken);
      setSimecUfs(result.itens.length > 0 ? result.itens : BRAZIL_UFS);
    } catch {
      setSimecUfs(BRAZIL_UFS);
    }
  };

  const loadSimecMunicipios = async (uf: string, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    try {
      const result = await getSimecMunicipios(currentToken, { uf });
      if (result.itens.length > 0) {
        setSimecMunicipios(result.itens);
        return;
      }
    } catch {
      // fallback handled below
    }

    try {
      const fallback = await loadIbgeMunicipiosByUf(uf);
      setSimecMunicipios(fallback);
    } catch {
      setSimecMunicipios([]);
    }
  };

  const loadSimecObras = async (authToken?: string, override?: Partial<SimecObrasFilters>) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const source = override ? { ...simecObrasFilters, ...override } : simecObrasFilters;
    const uf = source.uf.trim().toUpperCase();
    const muncod = source.muncod.trim();

    if (uf.length !== 2 || muncod.length < 6) {
      setSimecObrasData(null);
      return;
    }

    const result = await getSimecObras(currentToken, {
      uf,
      muncod,
      esfera: source.esfera.trim() || undefined,
      tipologia: source.tipologia.trim() || undefined,
      obrid: source.obrid.trim() || undefined
    });
    setSimecObrasData(result);
  };

  const loadSimecObraDetalhe = async (obraId: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const result = await getSimecObraDetalhe(currentToken, obraId);
    setSimecObraDetalhe(result);
    setSimecObraDetalheId(obraId);
  };

  const loadSimecTermos = async (authToken?: string, override?: Partial<SimecTermosFilters>) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const source = override ? { ...simecTermosFilters, ...override } : simecTermosFilters;
    const dotidInicio = source.dotid_inicio.trim();
    const dotidFim = source.dotid_fim.trim();
    const limite = source.limite.trim() || "100";
    const cursor = source.cursor.trim();

    const result = await getSimecTermos(currentToken, {
      dotid_inicio: dotidInicio || undefined,
      dotid_fim: dotidFim || undefined,
      cursor: !dotidInicio && !dotidFim ? cursor || undefined : undefined,
      limite,
      ano: source.ano.trim() || undefined,
      secretaria: source.secretaria || undefined,
      uf: source.uf.trim().toUpperCase() || undefined,
      q: source.q.trim() || undefined
    });
    setSimecTermosData(result);
  };

  const loadSimecTermoDetalhe = async (dotid: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const result = await getSimecTermoDetalhe(currentToken, dotid);
    setSimecTermoDetalhe(result);
    setSimecTermoDetalheId(dotid);
  };

  const loadManagedUsers = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken || !isAdmin) {
      setManagedUsers([]);
      return;
    }

    const items = await listUsersAdmin(currentToken);
    setManagedUsers(items);
  };

  const loadPaymentInstruments = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      setPaymentInstruments([]);
      return;
    }

    const result = await listPaymentRequestInstruments(currentToken);
    setPaymentInstruments(result.itens);
  };

  const loadPaymentRequests = async (authToken?: string, filtersOverride?: PaymentFilters) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      setPaymentRequests([]);
      return;
    }

    const sourceFilters = filtersOverride ?? paymentFilters;
    const result = await listPaymentRequests(currentToken, sourceFilters);
    setPaymentRequests(result.itens);
  };

  useEffect(() => {
    if (!token || paymentForm.instrumento_id.trim() === "") {
      setPaymentInstrumentDetails(null);
      return;
    }

    let cancelled = false;

    getPaymentRequestInstrumentById(token, Number(paymentForm.instrumento_id))
      .then((item) => {
        if (!cancelled) {
          setPaymentInstrumentDetails(item);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPaymentInstrumentDetails(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, paymentForm.instrumento_id]);

  const loadTickets = async (authToken?: string, filtersOverride?: TicketFilters) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      setTickets([]);
      return;
    }

    const sourceFilters = filtersOverride ?? ticketFilters;

    const items = await listTickets(currentToken, {
      status: sourceFilters.status || undefined,
      prioridade: sourceFilters.prioridade || undefined,
      origem: sourceFilters.origem || undefined,
      somente_atrasados: sourceFilters.somente_atrasados,
      instrument_id: sourceFilters.instrument_id.trim() === "" ? undefined : Number(sourceFilters.instrument_id),
      responsavel_user_id:
        sourceFilters.responsavel_user_id.trim() === "" ? undefined : Number(sourceFilters.responsavel_user_id),
      q: sourceFilters.q.trim() === "" ? undefined : sourceFilters.q.trim()
    });
    setTickets(items);
  };

  const loadTicketAssignableUsers = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken || !canManageInstruments) {
      setTicketAssignableUsers([]);
      return;
    }

    const result = await listTicketAssignableUsers(currentToken);
    setTicketAssignableUsers(result.itens);
  };

  const loadChecklist = async (instrumentId: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const data = await getInstrumentChecklist(currentToken, instrumentId);
    setChecklistItems(
      data.itens.map((item) => ({
        ...item,
        solicitacao_externa: item.solicitacao_externa ?? null,
        anexos_externos: item.anexos_externos ?? []
      }))
    );
    setExpandedChecklistAttachmentItemIds([]);
    setChecklistSummary(data.resumo);
  };

  const loadAllStageFollowUps = async (instrumentId: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const responses = await Promise.all(WORKFLOW_STAGES.map((stage) => listStageFollowUps(currentToken, instrumentId, stage)));
    const next = emptyStageFollowUps();
    WORKFLOW_STAGES.forEach((stage, index) => {
      next[stage] = responses[index].itens;
    });
    setStageFollowUps(next);
  };

  const loadWorkProgress = async (instrumentId: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const data = await getWorkProgress(currentToken, instrumentId);
    setWorkProgress(data);
    setObraPercentual(String(data.percentual_obra));
  };

  const refreshData = async (authToken?: string) => {
    setIsBusy(true);
    setMessage("");
    try {
      if ((authToken ?? token) && isFinanceiro) {
        await Promise.all([loadPaymentInstruments(authToken), loadPaymentRequests(authToken)]);
        setMessage("Dados atualizados com sucesso.");
        return;
      }

      const coreResults = await Promise.allSettled([
        loadInstruments(authToken),
        loadDashboard(authToken),
        loadAuditTrail(authToken),
        loadTickets(authToken)
      ]);

      const coreFailures = coreResults.filter((item) => item.status === "rejected");
      try {
        await loadProponentes(authToken);
      } catch {
        // Intencionalmente ignorado para nao bloquear o modulo de instrumentos.
      }
      try {
        await loadManagedUsers(authToken);
      } catch {
        // Intencionalmente ignorado para nao bloquear outras telas.
      }
      try {
        await loadTicketAssignableUsers(authToken);
      } catch {
        // Intencionalmente ignorado para nao bloquear outras telas.
      }
      try {
        await Promise.all([loadPaymentInstruments(authToken), loadPaymentRequests(authToken)]);
      } catch {
        // Intencionalmente ignorado para nao bloquear outras telas.
      }

      if (coreFailures.length === 0) {
        setMessage("Dados atualizados com sucesso.");
      } else {
        const firstError = coreFailures[0] as PromiseRejectedResult;
        const baseMessage =
          firstError.reason instanceof Error ? firstError.reason.message : "Falha parcial ao atualizar dados.";
        setMessage(`${baseMessage} (${coreFailures.length} modulo(s) com falha).`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar dados.");
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    void refreshData();
  }, [isAuthenticated, isAdmin, isFinanceiro]);

  useEffect(() => {
    if (isAuthenticated && isFinanceiro && activeView !== "pagamentos") {
      setActiveView("pagamentos");
    }
  }, [activeView, isAuthenticated, isFinanceiro]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "pagamentos") {
      return;
    }
    void Promise.all([loadPaymentInstruments(), loadPaymentRequests()]);
  }, [activeView, isAuthenticated]);

  useEffect(() => {
    if (!token || !isAuthenticated) {
      return;
    }

    getMyProfile(token)
      .then((profile) => {
        persistAuth(token, profile);
      })
      .catch(() => undefined);
  }, [token, isAuthenticated]);

  useEffect(() => {
    const onPopState = () => {
      const navigation = parseNavigationFromUrl(window.location.pathname);
      const idFromPath = readInstrumentIdFromPath(window.location.pathname);
      const ticketFromSearch = readTicketIdFromSearch(window.location.search);
      const emendaFromSearch = readEmendaIdFromSearch(window.location.search);
      setInstrumentPageId(idFromPath);
      setTicketIdFromUrl(ticketFromSearch);
      setEmendaIdFromUrl(emendaFromSearch);
      setRelatorioTab(navigation.relatorioTab);
      if (idFromPath !== null) {
        setActiveView("instrumentos");
        return;
      }
      if (ticketFromSearch !== null) {
        setActiveView("tickets");
        return;
      }
      if (emendaFromSearch !== null) {
        setActiveView("emendas_estaduais");
        return;
      }
      setActiveView(navigation.activeView);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || instrumentPageId === null || !token) {
      return;
    }

    const existing = instruments.find((item) => item.id === instrumentPageId);
    if (existing) {
      setSelectedInstrument(existing);
      return;
    }

    getInstrumentById(token, instrumentPageId)
      .then((item) => {
        setSelectedInstrument(item);
      })
      .catch(() => {
        setMessage("Instrumento nao encontrado.");
      });
  }, [instrumentPageId, isAuthenticated, token, instruments]);

  useEffect(() => {
    if (!isAuthenticated || instrumentPageId === null || !token) {
      setChecklistItems([]);
      setChecklistSummary(null);
      setStageFollowUps(emptyStageFollowUps());
      setStageFollowUpText("");
      setStageFollowUpFiles([]);
      setStageFollowUpModalStage(null);
      setEditingStageFollowUp(null);
      setEditingStageFollowUpText("");
      setStageFollowUpFilter("TODOS");
      setExpandedFollowUpIds([]);
      setWorkProgress(null);
      return;
    }

    Promise.all([
      loadChecklist(instrumentPageId, token),
      loadWorkProgress(instrumentPageId, token),
      loadAllStageFollowUps(instrumentPageId, token)
    ]).catch(
      (error) => {
        setMessage(error instanceof Error ? error.message : "Falha ao carregar acompanhamento do instrumento.");
      }
    );
  }, [instrumentPageId, isAuthenticated, token]);

  useEffect(() => {
    if (!profileInstrument) {
      setEmpresaVencedoraNomeInput("");
      setEmpresaVencedoraCnpjInput("");
      setEmpresaVencedoraValorInput(formatCurrencyInput(0));
      return;
    }

    setEmpresaVencedoraNomeInput(profileInstrument.empresa_vencedora ?? "");
    setEmpresaVencedoraCnpjInput(profileInstrument.cnpj_vencedora ?? "");
    setEmpresaVencedoraValorInput(formatCurrencyInput(profileInstrument.valor_vencedor ?? 0));
  }, [
    profileInstrument?.id,
    profileInstrument?.empresa_vencedora,
    profileInstrument?.cnpj_vencedora,
    profileInstrument?.valor_vencedor
  ]);

  useEffect(() => {
    if (!token || !showRepassePanel || !profileInstrument) {
      return;
    }

    withLoadedRepasses(token, profileInstrument)
      .then((updatedWithRepasses) => {
        setInstruments((prev) => prev.map((item) => (item.id === updatedWithRepasses.id ? updatedWithRepasses : item)));
        setSelectedInstrument(updatedWithRepasses);
      })
      .catch(() => undefined);
  }, [token, showRepassePanel, profileInstrument?.id]);

  useEffect(() => {
    setStageFollowUpText("");
    setStageFollowUpFiles([]);
    setStageFollowUpModalStage(null);
    setEditingStageFollowUp(null);
    setEditingStageFollowUpText("");
    setExpandedFollowUpIds([]);
    setWorkProgressFollowUpText("");
  }, [activeWorkflowStage]);

  useEffect(() => {
    setReportFilters((prev) => {
      if (prev.proponente_id.trim() === "") {
        return prev;
      }
      const selectedId = Number(prev.proponente_id);
      const hasSelected = Number.isInteger(selectedId) && proponentes.some((item) => item.id === selectedId);
      return hasSelected ? prev : { ...prev, proponente_id: "", instrumento_id: "" };
    });

    setObraReportFilters((prev) => {
      if (prev.proponente_id.trim() === "") {
        return prev;
      }
      const selectedId = Number(prev.proponente_id);
      const hasSelected = Number.isInteger(selectedId) && proponentes.some((item) => item.id === selectedId);
      return hasSelected ? prev : { ...prev, proponente_id: "", instrumento_id: "" };
    });

    setAndamentoInstrumentosReportFilters((prev) => {
      if (prev.proponente_id.trim() === "") {
        return prev;
      }
      const selectedId = Number(prev.proponente_id);
      const hasSelected = Number.isInteger(selectedId) && proponentes.some((item) => item.id === selectedId);
      return hasSelected ? prev : { ...prev, proponente_id: "", instrumentos: [] };
    });
  }, [proponentes]);

  useEffect(() => {
    setReportData(null);
  }, [reportFilters.proponente_id, reportFilters.instrumento_id, reportFilters.data_de, reportFilters.data_ate]);

  useEffect(() => {
    setTransparenciaReportData(null);
  }, [
    transparenciaReportFilters.cnpj,
    transparenciaReportFilters.ano,
    transparenciaReportFilters.ano_pagamento,
    transparenciaReportFilters.max_paginas_convenios,
    transparenciaReportFilters.max_processos
  ]);

  useEffect(() => {
    setAndamentoInstrumentosReportData(null);
  }, [
    andamentoInstrumentosReportFilters.proponente_id,
    andamentoInstrumentosReportFilters.status,
    andamentoInstrumentosReportFilters.instrumentos
  ]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "emendas_estaduais") {
      return;
    }

    void loadEmendasEstaduais();
  }, [activeView, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios") {
      return;
    }

    if (relatorioTab !== "repasses") {
      return;
    }

    if (reportFilters.proponente_id.trim() === "" || reportData) {
      return;
    }

    void onApplyRepasseReportFilters();
  }, [activeView, isAuthenticated, relatorioTab, reportFilters.proponente_id, reportData]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios") {
      return;
    }

    if (relatorioTab !== "obras") {
      return;
    }

    if (obraReportData) {
      return;
    }

    void onApplyObraReportFilters();
  }, [activeView, isAuthenticated, relatorioTab, obraReportData]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios") {
      return;
    }

    if (relatorioTab !== "andamento_instrumentos") {
      return;
    }

    if (andamentoInstrumentosReportFilters.instrumentos.length === 0 || andamentoInstrumentosReportData) {
      return;
    }

    void onApplyAndamentoInstrumentosReportFilters();
  }, [
    activeView,
    isAuthenticated,
    relatorioTab,
    andamentoInstrumentosReportFilters.instrumentos,
    andamentoInstrumentosReportData
  ]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios") {
      return;
    }

    if (relatorioTab !== "tickets") {
      return;
    }

    if (ticketReportData) {
      return;
    }

    void onApplyTicketReportFilters();
  }, [activeView, isAuthenticated, relatorioTab, ticketReportData]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios") {
      return;
    }

    if (relatorioTab !== "transparencia") {
      return;
    }

    if (transparenciaReportData) {
      return;
    }

    void onApplyTransparenciaReportFilters();
  }, [activeView, isAuthenticated, relatorioTab, transparenciaReportData]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios") {
      return;
    }

    if (relatorioTab !== "transferencias_especiais") {
      return;
    }

    if (transferenciasEspeciaisData) {
      return;
    }

    void onApplyTransferenciasEspeciaisFilters(1);
  }, [activeView, isAuthenticated, relatorioTab, transferenciasEspeciaisData]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios") {
      return;
    }

    if (relatorioTab !== "transferencias_discricionarias") {
      return;
    }

    // Sempre carregar dados quando abrir a aba
    void onApplyTransferenciasDiscricionariasFilters(1);
  }, [activeView, isAuthenticated, relatorioTab]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios") {
      return;
    }

    if (relatorioTab !== "transferencias_discricionarias") {
      return;
    }

    // Sempre carregar filtros quando abrir a aba
    void loadTransferenciasDiscricionariasFiltros();
  }, [activeView, isAuthenticated, relatorioTab]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    const shouldRefreshSyncStatus =
      activeView === "proponentes" ||
      (activeView === "relatorios" && relatorioTab === "transferencias_discricionarias");

    if (!shouldRefreshSyncStatus) {
      return;
    }

    void getTransferenciasDiscricionariasSyncStatus(token)
      .then((status) => {
        setTransferenciasDiscricionariasSyncState(status);
        setTransferenciasDiscricionariasData((prev) => (prev ? { ...prev, sincronizacao: status } : prev));
      })
      .catch(() => undefined);
  }, [activeView, isAuthenticated, relatorioTab, token]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios" || relatorioTab !== "fns_repasses") {
      return;
    }

    if (fnsUfs.length === 0) {
      void loadFnsUfs();
    }
    if (!fnsSyncStatus) {
      void loadFnsSyncStatus();
    }
  }, [activeView, isAuthenticated, relatorioTab, fnsUfs.length, fnsSyncStatus]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios" || relatorioTab !== "fns_repasses") {
      return;
    }

    if (fnsRepassesFilters.uf_id !== "" || fnsUfsAtendidas.length !== 1) {
      return;
    }

    const ufAuto = fnsUfsAtendidas[0];
    setFnsRepassesFilters((prev) => ({
      ...prev,
      uf_id: ufAuto.id,
      co_ibge_municipio: "",
      cnpj: ""
    }));
  }, [activeView, isAuthenticated, relatorioTab, fnsRepassesFilters.uf_id, fnsUfsAtendidas]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios" || relatorioTab !== "fns_repasses") {
      return;
    }

    const ufId = Number(fnsRepassesFilters.uf_id);
    if (!Number.isFinite(ufId) || ufId < 11) {
      setFnsMunicipios([]);
      return;
    }

    void loadFnsMunicipios(ufId);
  }, [activeView, isAuthenticated, relatorioTab, fnsRepassesFilters.uf_id]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios" || relatorioTab !== "consultafns_propostas") {
      return;
    }

    if (consultaFnsUfs.length === 0 || consultaFnsAnos.length === 0) {
      void loadConsultaFnsCatalogos();
    }
    if (!consultaFnsSyncStatus) {
      void loadConsultaFnsStatus();
    }
  }, [activeView, isAuthenticated, relatorioTab, consultaFnsUfs.length, consultaFnsAnos.length, consultaFnsSyncStatus]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios" || relatorioTab !== "consultafns_propostas") {
      return;
    }

    const uf = consultaFnsFilters.uf.trim().toUpperCase();
    if (uf.length !== 2) {
      setConsultaFnsMunicipios([]);
      setConsultaFnsFilters((prev) => (prev.co_municipio_ibge === "" ? prev : { ...prev, co_municipio_ibge: "" }));
      return;
    }

    void loadConsultaFnsMunicipios(uf);
  }, [activeView, isAuthenticated, relatorioTab, consultaFnsFilters.uf]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios" || relatorioTab !== "consultafns_propostas") {
      return;
    }

    if (consultaFnsFilters.uf.trim() !== "" || consultaFnsUfsAtendidas.length !== 1) {
      return;
    }

    const ufAuto = consultaFnsUfsAtendidas[0].sigla.trim().toUpperCase();
    setConsultaFnsFilters((prev) => ({
      ...prev,
      uf: ufAuto,
      co_municipio_ibge: ""
    }));
  }, [activeView, isAuthenticated, relatorioTab, consultaFnsFilters.uf, consultaFnsUfsAtendidas]);

  useEffect(() => {
    if (fnsRepassesFilters.co_ibge_municipio === "") {
      return;
    }

    const exists = fnsMunicipiosAtendidos.some((item) => item.codigo === fnsRepassesFilters.co_ibge_municipio);
    if (!exists) {
      setFnsRepassesFilters((prev) => ({ ...prev, co_ibge_municipio: "", cnpj: "" }));
    }
  }, [fnsMunicipiosAtendidos, fnsRepassesFilters.co_ibge_municipio]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios" || relatorioTab !== "fns_repasses") {
      return;
    }

    const currentCnpj = fnsRepassesFilters.cnpj.replace(/\D/g, "");
    if (fnsCnpjAutomatico === "") {
      if (currentCnpj !== "") {
        setFnsRepassesFilters((prev) => ({ ...prev, cnpj: "" }));
      }
      return;
    }

    if (currentCnpj !== fnsCnpjAutomatico) {
      setFnsRepassesFilters((prev) => ({ ...prev, cnpj: fnsCnpjAutomatico }));
    }
  }, [activeView, isAuthenticated, relatorioTab, fnsRepassesFilters.cnpj, fnsCnpjAutomatico]);

  useEffect(() => {
    if (consultaFnsFilters.co_municipio_ibge === "") {
      return;
    }

    const exists = consultaFnsMunicipiosAtendidos.some((item) => item.coMunicipioIbge === consultaFnsFilters.co_municipio_ibge);
    if (!exists) {
      setConsultaFnsFilters((prev) => ({ ...prev, co_municipio_ibge: "" }));
    }
  }, [consultaFnsMunicipiosAtendidos, consultaFnsFilters.co_municipio_ibge]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios") {
      return;
    }

    if (relatorioTab !== "simec_obras" && relatorioTab !== "simec_termos" && relatorioTab !== "extracao_simec") {
      return;
    }

    if (simecUfs.length === 0) {
      void loadSimecUfs();
    }
  }, [activeView, isAuthenticated, relatorioTab, simecUfs.length]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios") {
      return;
    }

    if (relatorioTab === "simec_obras") {
      const uf = simecObrasFilters.uf.trim().toUpperCase();
      if (uf.length !== 2) {
        setSimecMunicipios([]);
        return;
      }
      void loadSimecMunicipios(uf);
    } else if (relatorioTab === "extracao_simec") {
      const uf = extracaoSimecFilters.uf.trim().toUpperCase();
      if (uf.length !== 2) {
        setSimecMunicipios([]);
        return;
      }
      void loadSimecMunicipios(uf);
    }
  }, [activeView, isAuthenticated, relatorioTab, simecObrasFilters.uf, extracaoSimecFilters.uf]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios" || relatorioTab !== "transferencias_discricionarias") {
      return;
    }

    const cnpjDigits = transferenciasDiscricionariasFilters.cnpj.replace(/\D/g, "");
    if (cnpjDigits.length < 4) {
      setTransferenciasDiscricionariasCnpjSugestoes([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void loadTransferenciasDiscricionariasCnpjSugestoes(cnpjDigits);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [
    activeView,
    isAuthenticated,
    relatorioTab,
    transferenciasDiscricionariasFilters.cnpj
  ]);

  useEffect(() => {
    if (reportFilters.instrumento_id.trim() === "") {
      return;
    }

    const selectedId = Number(reportFilters.instrumento_id);
    const stillAvailable = reportInstrumentOptions.some((item) => item.id === selectedId);
    if (!stillAvailable) {
      setReportFilters((prev) => ({ ...prev, instrumento_id: "" }));
      setReportData(null);
    }
  }, [reportFilters.instrumento_id, reportInstrumentOptions]);

  useEffect(() => {
    if (obraReportFilters.instrumento_id.trim() === "") {
      return;
    }

    const selectedId = Number(obraReportFilters.instrumento_id);
    const stillAvailable = obraReportInstrumentOptions.some((item) => item.id === selectedId);
    if (!stillAvailable) {
      setObraReportFilters((prev) => ({ ...prev, instrumento_id: "" }));
      setObraReportData(null);
    }
  }, [obraReportFilters.instrumento_id, obraReportInstrumentOptions]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "geracao_documentos") {
      return;
    }
    void onLoadGeracaoDocumentosData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeView]);

  const onToggleWorkflowStage = (stage: WorkflowStage) => {
    setActiveWorkflowStage((prev) => (prev === stage ? null : stage));
  };

  const onAddChecklistItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    const nomeDocumento = checklistDocName.trim();
    if (nomeDocumento.length < 3) {
      setMessage("Informe um nome de documento com pelo menos 3 caracteres.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await addChecklistItem(token, instrumentPageId, {
        nome_documento: nomeDocumento,
        etapa: checklistStage,
        obrigatorio: checklistRequired,
        observacao: checklistNote.trim() || undefined
      });
      setChecklistDocName("");
      setChecklistRequired(true);
      setChecklistNote("");
      await loadChecklist(instrumentPageId);
      setMessage("Item adicionado ao checklist.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao adicionar item no checklist.");
    } finally {
      setIsBusy(false);
    }
  };

  const onDeleteChecklistItem = async (itemId: number, nomeDocumento?: string) => {
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    const alvo = nomeDocumento?.trim() ? `"${nomeDocumento.trim()}"` : "este item";
    if (!window.confirm(`Deseja realmente excluir ${alvo} do checklist?`)) {
      return;
    }

    setBusyChecklistItemId(itemId);
    setMessage("");
    try {
      await deleteChecklistItem(token, instrumentPageId, itemId);
      await loadChecklist(instrumentPageId);
      setMessage("Item removido do checklist.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao remover item do checklist.");
    } finally {
      setBusyChecklistItemId(null);
    }
  };

  const onUpdateChecklistItemStatus = async (itemId: number, status: ChecklistItemStatus) => {
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    setBusyChecklistItemId(itemId);
    setMessage("");
    try {
      await updateChecklistItem(token, instrumentPageId, itemId, { status });
      await loadChecklist(instrumentPageId);
      setMessage("Status do item atualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar status do checklist.");
    } finally {
      setBusyChecklistItemId(null);
    }
  };

  const onCompleteChecklistStage = async (stage: WorkflowStage) => {
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    const stageItems = checklistItems.filter((item) => item.etapa === stage);
    if (stageItems.length === 0) {
      setMessage("Nao ha itens nesta etapa para concluir.");
      return;
    }

    const pendingItems = stageItems.filter((item) => !isChecklistStatusCompleted(item.status));
    const nextStage = getNextWorkflowStage(stage);

    setBusyChecklistStage(stage);
    setMessage("");
    try {
      if (pendingItems.length > 0) {
        await Promise.all(
          pendingItems.map((item) =>
            updateChecklistItem(token, instrumentPageId, item.id, {
              status: getCompletedChecklistStatusByStage(item.etapa)
            })
          )
        );
        await loadChecklist(instrumentPageId);
      }

      setActiveWorkflowStage(nextStage);
      setMessage(
        pendingItems.length > 0
          ? nextStage
            ? "Etapa concluida e proxima etapa aberta."
            : "Etapa concluida."
          : nextStage
            ? "Todos os itens desta etapa ja estavam concluidos. Proxima etapa aberta."
            : "Todos os itens desta etapa ja estavam concluidos."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao concluir a etapa do checklist.");
    } finally {
      setBusyChecklistStage(null);
    }
  };

  const onReopenChecklistStage = async (stage: WorkflowStage) => {
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    const stageItems = checklistItems.filter((item) => item.etapa === stage);
    if (stageItems.length === 0) {
      setMessage("Nao ha itens nesta etapa para reabrir.");
      return;
    }

    const completedItems = stageItems.filter((item) => isChecklistStatusCompleted(item.status));

    setBusyChecklistStage(stage);
    setMessage("");
    try {
      if (completedItems.length > 0) {
        await Promise.all(
          completedItems.map((item) =>
            updateChecklistItem(token, instrumentPageId, item.id, {
              status: getIncompleteChecklistStatusByStage(item.etapa)
            })
          )
        );
        await loadChecklist(instrumentPageId);
      }

      setActiveWorkflowStage(stage);
      setMessage(
        completedItems.length > 0
          ? "Etapa marcada como nao concluida."
          : "Todos os itens desta etapa ja estavam como nao concluidos."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao marcar a etapa como nao concluida.");
    } finally {
      setBusyChecklistStage(null);
    }
  };

  const onGenerateChecklistExternalLink = async (itemId: number) => {
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    setBusyExternalLinkItemId(itemId);
    setMessage("");
    try {
      const created = await createChecklistExternalLink(token, instrumentPageId, itemId, externalLinkValidityDays);
      await navigator.clipboard.writeText(created.link_publico);
      await loadChecklist(instrumentPageId);
      setMessage("Link externo gerado e copiado para a area de transferencia.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao gerar link externo.");
    } finally {
      setBusyExternalLinkItemId(null);
    }
  };

  const onCopyExternalLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(toAbsoluteUrl(url));
      setMessage("Link copiado.");
    } catch {
      setMessage("Nao foi possivel copiar automaticamente. Copie o link manualmente.");
    }
  };

  const onDeactivateChecklistExternalLink = async (itemId: number) => {
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    setBusyExternalLinkItemId(itemId);
    setMessage("");
    try {
      const response = await deactivateChecklistExternalLinkApi(token, instrumentPageId, itemId);
      await loadChecklist(instrumentPageId);
      setMessage(response.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao desativar link externo.");
    } finally {
      setBusyExternalLinkItemId(null);
    }
  };

  const onDownloadChecklistExternalAttachment = async (itemId: number, fileId: number, name: string) => {
    if (!token || instrumentPageId === null) {
      return;
    }

    try {
      await downloadChecklistExternalFile(token, instrumentPageId, itemId, fileId, name);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao baixar anexo externo.");
    }
  };

  const onSaveStageFollowUp = async (stage: WorkflowStage) => {
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    if (stageFollowUpText.trim().length === 0 && stageFollowUpFiles.length === 0) {
      setMessage("Informe um texto ou envie ao menos um arquivo para registrar acompanhamento.");
      return;
    }

    setIsSavingStageFollowUp(true);
    setMessage("");
    try {
      await createStageFollowUp(token, instrumentPageId, stage, {
        texto: stageFollowUpText,
        arquivos: stageFollowUpFiles
      });
      setStageFollowUpText("");
      setStageFollowUpFiles([]);
      setStageFollowUpModalStage(null);
      await loadAllStageFollowUps(instrumentPageId);
      setMessage("Acompanhamento da etapa registrado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao registrar acompanhamento da etapa.");
    } finally {
      setIsSavingStageFollowUp(false);
    }
  };

  const onSaveWorkProgressFollowUp = async () => {
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    if (workProgressFollowUpText.trim().length === 0) {
      setMessage("Informe a situacao da obra para registrar o acompanhamento.");
      return;
    }

    setIsSavingWorkProgressFollowUp(true);
    setMessage("");
    try {
      await createStageFollowUp(token, instrumentPageId, "ACOMPANHAMENTO_OBRA", {
        texto: workProgressFollowUpText.trim(),
        arquivos: []
      });
      setWorkProgressFollowUpText("");
      await loadAllStageFollowUps(instrumentPageId);
      setMessage("Situacao da obra registrada com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao registrar a situacao da obra.");
    } finally {
      setIsSavingWorkProgressFollowUp(false);
    }
  };

  const onOpenStageFollowUpModal = (stage: WorkflowStage) => {
    setStageFollowUpModalStage(stage);
    setStageFollowUpText("");
    setStageFollowUpFiles([]);
    setIsDraggingStageFiles(false);
  };

  const onCloseStageFollowUpModal = () => {
    setStageFollowUpModalStage(null);
    setIsDraggingStageFiles(false);
  };

  const appendStageFollowUpFiles = (incoming: File[]) => {
    if (incoming.length === 0) {
      return;
    }

    setStageFollowUpFiles((prev) => {
      const known = new Set(prev.map((file) => `${file.name}|${file.size}|${file.lastModified}`));
      const next = [...prev];
      for (const file of incoming) {
        const key = `${file.name}|${file.size}|${file.lastModified}`;
        if (!known.has(key)) {
          next.push(file);
          known.add(key);
        }
      }
      return next;
    });
  };

  const onSelectStageFollowUpFiles = (files: FileList | null) => {
    appendStageFollowUpFiles(Array.from(files ?? []));
  };

  const onDropStageFollowUpFiles = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingStageFiles(false);
    appendStageFollowUpFiles(Array.from(event.dataTransfer.files ?? []));
  };

  const onRemoveSelectedStageFollowUpFile = (index: number) => {
    setStageFollowUpFiles((prev) => prev.filter((_, current) => current !== index));
  };

  const onDownloadStageFollowUpAttachment = async (stage: WorkflowStage, followUpId: number, fileId: number, name: string) => {
    if (!token || instrumentPageId === null) {
      return;
    }

    try {
      await downloadStageFollowUpFile(token, instrumentPageId, stage, followUpId, fileId, name);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao baixar arquivo do acompanhamento.");
    }
  };

  const onEditStageFollowUp = (stage: WorkflowStage, followUp: StageFollowUp) => {
    if (!token || instrumentPageId === null || !canManageInstruments || !user) {
      return;
    }

    const isAuthor =
      (followUp.user.id !== null && followUp.user.id === user.id) ||
      followUp.user.email.trim().toLowerCase() === user.email.trim().toLowerCase();
    if (!isAuthor) {
      setMessage("Voce so pode alterar acompanhamentos de sua autoria.");
      return;
    }

    setEditingStageFollowUp({ stage, followUpId: followUp.id });
    setEditingStageFollowUpText(followUp.texto ?? "");
  };

  const onCloseEditStageFollowUpModal = () => {
    if (isSavingStageFollowUpEdit) {
      return;
    }
    setEditingStageFollowUp(null);
    setEditingStageFollowUpText("");
  };

  const onSaveEditedStageFollowUp = async () => {
    if (!token || instrumentPageId === null || !editingStageFollowUp) {
      return;
    }

    const nextText = editingStageFollowUpText.trim();
    if (nextText.length === 0) {
      setMessage("Informe um texto valido para atualizar o acompanhamento.");
      return;
    }

    setIsSavingStageFollowUpEdit(true);
    setMessage("");
    try {
      await updateStageFollowUpApi(token, instrumentPageId, editingStageFollowUp.stage, editingStageFollowUp.followUpId, {
        texto: nextText
      });
      await loadAllStageFollowUps(instrumentPageId);
      setEditingStageFollowUp(null);
      setEditingStageFollowUpText("");
      setMessage("Acompanhamento atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar acompanhamento da etapa.");
    } finally {
      setIsSavingStageFollowUpEdit(false);
    }
  };

  const onDeleteStageFollowUp = async (stage: WorkflowStage, followUp: StageFollowUp) => {
    if (!token || instrumentPageId === null || !canManageInstruments || !user) {
      return;
    }

    const isAuthor =
      (followUp.user.id !== null && followUp.user.id === user.id) ||
      followUp.user.email.trim().toLowerCase() === user.email.trim().toLowerCase();
    if (!isAuthor) {
      setMessage("Voce so pode remover acompanhamentos de sua autoria.");
      return;
    }

    if (!window.confirm("Deseja remover este acompanhamento?")) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await deleteStageFollowUpApi(token, instrumentPageId, stage, followUp.id);
      await loadAllStageFollowUps(instrumentPageId);
      setMessage("Acompanhamento removido com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao remover acompanhamento da etapa.");
    } finally {
      setIsBusy(false);
    }
  };

  const onToggleFollowUpText = (followUpId: number) => {
    setExpandedFollowUpIds((prev) =>
      prev.includes(followUpId) ? prev.filter((id) => id !== followUpId) : [...prev, followUpId]
    );
  };

  const onToggleChecklistAttachments = (itemId: number) => {
    setExpandedChecklistAttachmentItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const filterStageFollowUps = (items: StageFollowUp[]) => {
    return items.filter((item) => {
      if (stageFollowUpFilter === "SO_MEUS") {
        return user?.email ? item.user.email === user.email : false;
      }
      if (stageFollowUpFilter === "COM_ANEXO") {
        return item.arquivos.length > 0;
      }
      if (stageFollowUpFilter === "COM_TEXTO") {
        return (item.texto ?? "").trim().length > 0;
      }
      return true;
    });
  };

  const onStartExecution = async () => {
    if (!token || !profileInstrument) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const updated = await updateInstrument(token, profileInstrument.id, {
        status: "EM_EXECUCAO"
      });
      setSelectedInstrument(updated);
      await refreshData();
      await loadChecklist(profileInstrument.id);
      setMessage("Instrumento movido para EM_EXECUCAO.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao iniciar execucao.");
    } finally {
      setIsBusy(false);
    }
  };

  const onSaveWorkProgress = async () => {
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    const percentual = Number(obraPercentual);
    if (Number.isNaN(percentual) || percentual < 0 || percentual > 100) {
      setMessage("Percentual da obra deve estar entre 0 e 100.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await updateWorkProgress(token, instrumentPageId, percentual);
      await loadWorkProgress(instrumentPageId);
      setMessage("Percentual da obra atualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar percentual da obra.");
    } finally {
      setIsBusy(false);
    }
  };

  const onAddMeasurementBulletin = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    const valorMedicao = parseCurrencyInput(boletimValor);
    if (Number.isNaN(valorMedicao) || valorMedicao < 0) {
      setMessage("Valor do boletim invalido.");
      return;
    }

    const percentualInformado = boletimPercentual.trim() === "" ? undefined : Number(boletimPercentual);
    if (
      percentualInformado !== undefined &&
      (Number.isNaN(percentualInformado) || percentualInformado < 0 || percentualInformado > 100)
    ) {
      setMessage("Percentual informado no boletim deve estar entre 0 e 100.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await addWorkMeasurementBulletin(token, instrumentPageId, {
        data_boletim: boletimData,
        valor_medicao: valorMedicao,
        percentual_obra_informado: percentualInformado,
        observacao: asOptional(boletimObservacao)
      });
      setBoletimValor(formatCurrencyInput(0));
      setBoletimPercentual("");
      setBoletimObservacao("");
      await loadWorkProgress(instrumentPageId);
      await loadChecklist(instrumentPageId);
      setMessage("Boletim de medicao cadastrado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao cadastrar boletim de medicao.");
    } finally {
      setIsBusy(false);
    }
  };

  const onDeleteMeasurementBulletin = async (boletimId: number) => {
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await deleteWorkMeasurementBulletin(token, instrumentPageId, boletimId);
      await loadWorkProgress(instrumentPageId);
      setMessage("Boletim removido.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao remover boletim.");
    } finally {
      setIsBusy(false);
    }
  };

  const onLogin = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setMessage("");
    try {
      const auth = await login(email, senha);
      persistAuth(COOKIE_SESSION_TOKEN, auth.user);
      await refreshData(COOKIE_SESSION_TOKEN);
      setMessage(`Bem-vindo, ${auth.user.nome}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no login.");
    } finally {
      setIsBusy(false);
    }
  };

  const onChangeForm = <K extends keyof InstrumentForm>(field: K, value: InstrumentForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const clearForm = () => {
    setEditingId(null);
    setShowCreateInstrumentForm(false);
    setForm(emptyInstrumentForm());
  };

  const onEdit = (item: Instrument, openProfile = false) => {
    setEditingId(item.id);
    setShowCreateInstrumentForm(false);
    setForm(fromInstrumentToForm(item));
    setActiveView("instrumentos");
    setSelectedInstrument(item);
    if (openProfile) {
      navigateToInstrumentProfile(item.id);
    }
    setMessage(`Editando registro ${item.id}.`);
  };

  const onChangeView = (view: MenuView) => {
    const transitionClass =
      activeView !== "tickets" && view === "tickets"
        ? "menu-to-tickets"
        : activeView === "tickets" && view !== "tickets"
          ? "menu-from-tickets"
          : "";

    setMenuTransition(transitionClass);
    if (menuTransitionTimeoutRef.current !== null) {
      window.clearTimeout(menuTransitionTimeoutRef.current);
      menuTransitionTimeoutRef.current = null;
    }
    if (transitionClass) {
      menuTransitionTimeoutRef.current = window.setTimeout(() => {
        setMenuTransition("");
        menuTransitionTimeoutRef.current = null;
      }, 520);
    }

    setIsViewPending(true);
    if (viewPendingTimeoutRef.current !== null) {
      window.clearTimeout(viewPendingTimeoutRef.current);
      viewPendingTimeoutRef.current = null;
    }

    startTransition(() => {
      setActiveView(view);
    });
    viewPendingTimeoutRef.current = window.setTimeout(() => {
      setIsViewPending(false);
      viewPendingTimeoutRef.current = null;
    }, 260);

    if (view === "assistente") {
      startNewAssistenteConversation();
      void loadAssistenteSessionsHistory();
    }

    if (view === "instrumentos") {
      setShowCreateInstrumentForm(false);
      setEditingId(null);
      navigateToInstrumentList();
      return;
    }

    const targetPath = getPathForView(view, relatorioTab);
    if (window.location.pathname !== targetPath || window.location.search !== "") {
      window.history.pushState({}, "", targetPath);
    }
    setInstrumentPageId(null);
    setTicketIdFromUrl(null);
    setEmendaIdFromUrl(null);
    setExpandedEmendaDocumentosId(null);
  };

  const appShellClassName = `${activeView === "tickets" ? "app-shell tickets-top-nav" : "app-shell"}${menuTransition ? ` ${menuTransition}` : ""}`;
  const sectionTitle =
    activeView === "dashboard"
      ? "Dashboard"
      : activeView === "instrumentos"
        ? isInstrumentProfileView
          ? `Acompanhamento do instrumento #${instrumentPageId}`
          : "Instrumentos e Propostas"
        : activeView === "proponentes"
          ? "Cadastro de Proponentes"
          : activeView === "emendas_estaduais"
            ? "Emendas Estaduais"
            : activeView === "documentos"
              ? "Area de Documentos"
              : activeView === "pagamentos"
                ? "Pagamentos"
                : activeView === "usuarios"
                  ? "Gestao de Usuarios"
                  : activeView === "auditoria"
                    ? "Auditoria e Historico"
                    : activeView === "assistente"
                      ? "Assistente 360"
                      : relatorioTab === "transferencias_especiais"
                        ? "Especiais"
                        : relatorioTab === "transparencia"
                          ? "Relatorios Transparencia"
                          : activeView === "saude_tecnica"
                            ? "Saude Tecnica"
                            : "Relatorios Analiticos";
  const sectionSubtitle =
    activeView === "saude_tecnica"
      ? "Monitoramento de saude do backend, rotas e servicos externos."
      : isInstrumentProfileView
        ? "Pagina unica para acompanhar e editar o instrumento selecionado."
        : "Visao operacional com filtros, CRUD e exportacao.";

  const onApplyRepasseReportFilters = async () => {
    if (reportFilters.proponente_id.trim() === "") {
      setMessage("Selecione um proponente para gerar o relatorio.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadRepasseReport();
      setMessage("Relatorio atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao gerar relatorio de repasses.");
    } finally {
      setIsBusy(false);
    }
  };

  const onClearRepasseReportFilters = () => {
    setReportFilters(emptyReportFilters());
    setReportData(null);
  };

  const onClearObraReportFilters = () => {
    setObraReportFilters(emptyObraReportFilters());
    setObraReportData(null);
  };

  const onApplyAndamentoInstrumentosReportFilters = async () => {
    if (
      andamentoInstrumentosReportFilters.instrumentos.length === 0 &&
      andamentoInstrumentosReportFilters.status === "" &&
      andamentoInstrumentosReportFilters.proponente_id.trim() === ""
    ) {
      setMessage("Selecione um proponente, uma situacao ou ao menos um instrumento para gerar o relatorio.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadAndamentoInstrumentosReport();
      setMessage("Relatorio de andamento de instrumentos atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao gerar relatorio de andamento de instrumentos.");
    } finally {
      setIsBusy(false);
    }
  };

  const onAddAndamentoInstrumento = () => {
    const query = andamentoInstrumentosReportFilters.instrumento_query.trim();
    if (query === "") {
      setMessage("Digite o numero do instrumento para adicionar na lista.");
      return;
    }

    const normalizedQuery = normalizeInstrumentLookup(query);
    const exactMatch = andamentoInstrumentosOptions.find(
      (item) => normalizeInstrumentLookup(item.instrumento) === normalizedQuery
    );
    const partialMatches =
      exactMatch === undefined
        ? andamentoInstrumentosOptions.filter((item) =>
            normalizeInstrumentLookup(item.instrumento).includes(normalizedQuery)
          )
        : [];

    const selectedInstrument =
      exactMatch ?? (partialMatches.length === 1 ? partialMatches[0] : null);

    if (!selectedInstrument) {
      setMessage(
        partialMatches.length > 1
          ? "Mais de um instrumento encontrado. Digite o numero completo para adicionar."
          : "Instrumento nao encontrado para o proponente selecionado."
      );
      return;
    }

    if (andamentoInstrumentosReportFilters.instrumentos.includes(selectedInstrument.instrumento)) {
      setAndamentoInstrumentosReportFilters((prev) => ({
        ...prev,
        instrumento_query: ""
      }));
      setMessage("Esse instrumento ja esta na lista.");
      return;
    }

    setAndamentoInstrumentosReportFilters((prev) => ({
      ...prev,
      instrumento_query: "",
      instrumentos: [...prev.instrumentos, selectedInstrument.instrumento]
    }));
    setMessage("");
  };

  const onRemoveAndamentoInstrumento = (instrumento: string) => {
    setAndamentoInstrumentosReportFilters((prev) => ({
      ...prev,
      instrumentos: prev.instrumentos.filter((item) => item !== instrumento)
    }));
  };

  const onClearAndamentoInstrumentosReportFilters = () => {
    setAndamentoInstrumentosReportFilters(emptyAndamentoInstrumentosReportFilters());
    setAndamentoInstrumentosReportData(null);
  };

  const onApplyTransparenciaReportFilters = async () => {
    const cnpjDigits = transparenciaReportFilters.cnpj.replace(/\D/g, "");
    if (cnpjDigits.length !== 14) {
      setMessage("Informe um CNPJ valido para consultar o Portal da Transparencia.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadTransparenciaReport();
      setMessage("Relatorio de transparencia atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar dados de transparencia.");
    } finally {
      setIsBusy(false);
    }
  };

  const onClearTransparenciaReportFilters = () => {
    setTransparenciaReportFilters(emptyTransparenciaReportFilters());
    setTransparenciaReportData(null);
  };

  const onChangeSismobProponente = (proponenteId: string) => {
    const selected = proponentes.find((item) => String(item.id) === proponenteId);
    setSismobData(null);
    setSismobSituacaoOptions([]);
    setSismobFilters((prev) => ({
      ...prev,
      proponente_id: proponenteId,
      uf: selected?.uf?.trim().toUpperCase() ?? "",
      municipio: selected?.cidade?.trim() ?? "",
      situacao: [],
      page: 1
    }));
  };

  const onApplySismobFilters = async (nextPage = 1) => {
    if (!isAuthenticated) return;
    if (!sismobFilters.proponente_id || !sismobFilters.uf || !sismobFilters.municipio) {
      setMessage("Selecione um proponente atendido para realizar a consulta no SISMOB.");
      return;
    }
    setIsBusy(true);
    setMessage("Consultando portal SISMOB Cidadão...");
    try {
      const data = await getSismobObras(token!, {
        uf: sismobFilters.uf,
        municipio: sismobFilters.municipio,
        page: nextPage,
        page_size: Number(sismobFilters.page_size)
      });
      const filtersData = await getSismobObras(token!, {
        uf: sismobFilters.uf,
        municipio: sismobFilters.municipio,
        page: 1,
        page_size: 100
      });
      const situacoes = Array.from(
        new Set(
          filtersData.itens
            .map((item) => item.situacao?.trim())
            .filter((item): item is string => Boolean(item))
        )
      ).sort((a, b) => a.localeCompare(b, "pt-BR"));
      setSismobData(data);
      setSismobSituacaoOptions(situacoes);
      setSismobFilters((prev) => ({ ...prev, page: nextPage }));
      setMessage("Consulta SISMOB concluída com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar dados do SISMOB.");
    } finally {
      setIsBusy(false);
    }
  };

  const onExportSismobReportPdf = async (mode: ReportPdfMode) => {
    if (!sismobData) {
      setMessage("Consulte o SISMOB antes de exportar o relatório analítico.");
      return;
    }
    if (!token) {
      setMessage("Sessão expirada. Faça login novamente para exportar o relatório.");
      return;
    }

    const popup = window.open("", "_blank");
    if (!popup) {
      setMessage("Não foi possível abrir o relatório. Verifique o bloqueador de pop-ups.");
      return;
    }
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Relatório SISMOB</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43}</style></head><body><p>Preparando relatório completo do SISMOB...</p></body></html>`);

    setIsBusy(true);
    setMessage("Preparando relatório SISMOB completo...");
    let reportData = sismobData;
    try {
      const pageSize = 100;
      const firstPage = await getSismobObras(token, {
        uf: sismobFilters.uf,
        municipio: sismobFilters.municipio,
        page: 1,
        page_size: pageSize
      });
      const remainingPages = Array.from(
        { length: Math.max(0, firstPage.paginacao.total_paginas - 1) },
        (_, index) => index + 2
      );
      const remainingResults = await Promise.all(
        remainingPages.map((page) =>
          getSismobObras(token, {
            uf: sismobFilters.uf,
            municipio: sismobFilters.municipio,
            page,
            page_size: pageSize
          })
        )
      );
      reportData = {
        ...firstPage,
        itens: [
          ...firstPage.itens,
          ...remainingResults.flatMap((page) => page.itens)
        ]
      };
      if (sismobFilters.situacao.length > 0) {
        const selectedSet = new Set(sismobFilters.situacao);
        reportData = {
          ...reportData,
          itens: reportData.itens.filter((item) => selectedSet.has(item.situacao))
        };
      }
    } catch (error) {
      popup.close();
      setMessage(error instanceof Error ? error.message : "Falha ao preparar relatório SISMOB completo.");
      setIsBusy(false);
      return;
    }

    const rows = reportData.itens
      .map(
        (obra) =>
          `<tr><td>${obra.codigo}</td><td>${obra.municipio}/${obra.uf}</td><td>${obra.objeto}</td><td>${obra.situacao}</td><td style="text-align:right">${formatCurrency(obra.valor_total)}</td><td style="text-align:right">${formatCurrency(obra.valor_pago)}</td><td style="text-align:right">${obra.percentual_execucao}%</td><td>${obra.ultima_atualizacao ?? "-"}</td></tr>`
      )
      .join("");

    const proponenteNome = selectedSismobProponente?.nome ?? "Proponente não informado";
    const proponenteCnpj = selectedSismobProponente?.cnpj ? formatCnpj(selectedSismobProponente.cnpj) : "Não informado";
    const proponenteLogoUrl = selectedSismobProponente ? (proponenteLogoById.get(selectedSismobProponente.id) ?? null) : null;
    const reportHeadHtml = buildReportHeadHtml(`SISMOB (${mode})`, proponenteLogoUrl);
    const printScript = getDeferredPrintScript();

    popup.document.open();
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Relatório SISMOB</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43}.report-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.report-logos{display:flex;align-items:flex-start;gap:12px}.report-logo-slot{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:120px}.report-logo-slot img{max-width:160px;max-height:80px;height:auto;display:block}.report-logo-slot small{font-size:10px;color:#486581}h1,h2{margin:0 0 12px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:8px;font-size:11px;text-align:left;vertical-align:top}.kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}.kpi div{border:1px solid #cbd5e1;border-radius:8px;padding:10px}</style></head><body>${reportHeadHtml}<p><strong>Proponente:</strong> ${proponenteNome}</p><p><strong>CNPJ:</strong> ${proponenteCnpj}</p><p><strong>Município/UF:</strong> ${sismobFilters.municipio} / ${sismobFilters.uf}</p><p><strong>Situação:</strong> ${sismobFilters.situacao.length > 0 ? sismobFilters.situacao.join(", ") : "Todas"}</p><div class="kpi"><div><strong>Total de obras</strong><br/>${reportData.paginacao.total}</div><div><strong>Registros no PDF</strong><br/>${reportData.itens.length}</div><div><strong>Consulta paginada</strong><br/>${reportData.paginacao.total_paginas} página(s)</div><div><strong>Gerado em</strong><br/>${new Date().toLocaleString("pt-BR")}</div></div>${mode === "analitico" ? `<h2>Obras localizadas</h2><table><thead><tr><th>Código/Proposta</th><th>Município/UF</th><th>Objeto</th><th>Situação</th><th>Valor Total</th><th>Valor Pago</th><th>Execução</th><th>Atualização</th></tr></thead><tbody>${rows || '<tr><td colspan="8">Sem dados para os filtros informados.</td></tr>'}</tbody></table>` : ""}${printScript}</body></html>`);
    popup.document.close();
    setIsBusy(false);
    setMessage(`Relatório SISMOB preparado com ${reportData.itens.length} registro(s).`);
  };

  const onApplyTransferenciasEspeciaisFilters = async (nextPage = 1) => {
    setIsBusy(true);
    setMessage("");
    try {
      await loadTransferenciasEspeciaisReport(nextPage);
      setMessage("Relatorio de transferencias especiais atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar transferencias especiais.");
    } finally {
      setIsBusy(false);
    }
  };

  const onClearTransferenciasEspeciaisFilters = () => {
    setTransferenciasEspeciaisFilters(emptyTransferenciasEspeciaisFilters());
    setTransferenciasEspeciaisData(null);
    setTransferenciasEspeciaisPage(1);
  };

  const onSyncTransferenciasEspeciaisRealtime = async () => {
    if (!token || !canManageInstruments) {
      return;
    }

    setIsSyncingTransferenciasEspeciais(true);
    setMessage("");
    try {
      const result = await syncTransferenciasEspeciaisRealtime(token);
      const status = await getTransferenciasEspeciaisRealtimeSyncStatus(token);
      setTransferenciasEspeciaisSyncStatus(status);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao iniciar sincronizacao de transferencias especiais.");
    } finally {
      setIsSyncingTransferenciasEspeciais(false);
    }
  };

  const onSyncTransferenciasEspeciaisRealtimeByCnpj = async () => {
    if (!token || !canManageInstruments) {
      return;
    }

    const cnpjDigits = transferenciasEspeciaisFilters.cnpj.replace(/\D/g, "");
    if (cnpjDigits.length !== 14) {
      setMessage("Informe um CNPJ valido no filtro para sincronizar por CNPJ.");
      return;
    }

    setIsSyncingTransferenciasEspeciais(true);
    setMessage("");
    try {
      const result = await syncTransferenciasEspeciaisRealtimeByCnpj(token, cnpjDigits);
      const status = await getTransferenciasEspeciaisRealtimeSyncStatus(token);
      setTransferenciasEspeciaisSyncStatus(status);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao iniciar sincronizacao por CNPJ.");
    } finally {
      setIsSyncingTransferenciasEspeciais(false);
    }
  };

  const onRefreshTransferenciasEspeciaisSyncStatus = async () => {
    if (!token) {
      return;
    }

    try {
      const status = await getTransferenciasEspeciaisRealtimeSyncStatus(token);
      setTransferenciasEspeciaisSyncStatus(status);
    } catch {
      // silencioso
    }
  };

  const onCancelTransferenciasEspeciaisSync = async () => {
    if (!token || !canManageInstruments) {
      return;
    }

    try {
      const result = await cancelTransferenciasEspeciaisRealtimeSync(token);
      await onRefreshTransferenciasEspeciaisSyncStatus();
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao interromper sincronizacao.");
    }
  };

  const onApplyTransferenciasDiscricionariasFilters = async (nextPage = 1) => {
    setIsBusy(true);
    setMessage("");
    try {
      await loadTransferenciasDiscricionariasReport(nextPage);
      setMessage("Relatorio de transferencias discricionarias atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar transferencias discricionarias.");
    } finally {
      setIsBusy(false);
    }
  };
  const onClearTransferenciasDiscricionariasFilters = () => {
    setTransferenciasDiscricionariasFilters(emptyTransferenciasDiscricionariasFilters());
    setTransferenciasDiscricionariasData(null);
    setTransferenciasDiscricionariasCnpjSugestoes([]);
    setTransferenciasDiscricionariasSyncState(null);
    setTransferenciasDiscricionariasPage(1);
    setTransferenciasDiscricionariasTab("convenios");
    setTransferenciasDiscricionariasDesembolsoFilters(emptyTransferenciasDiscricionariasDesembolsoFilters());
    setTransferenciasDiscricionariasDesembolsoData(null);
    setTransferenciasDiscricionariasDesembolsoPage(1);
    setTransferenciasDiscricionariasProponenteDesembolsoFilters(
      emptyTransferenciasDiscricionariasProponenteDesembolsoFilters()
    );
    setTransferenciasDiscricionariasProponenteDesembolsoData(null);
    setTransferenciasDiscricionariasProponenteDesembolsoPage(1);
  };

  const onOpenTransferenciasDiscricionariasDesembolsos = async (nrConvenio: string) => {
    const convenio = nrConvenio.trim();
    if (convenio === "") {
      return;
    }

    setTransferenciasDiscricionariasDesembolsoFilters((prev) => ({
      ...prev,
      nr_convenio: convenio
    }));
    setTransferenciasDiscricionariasDesembolsoPage(1);
    setIsLoadingTransferenciasDiscricionariasDesembolsos(true);
    setMessage("");
    try {
      await loadTransferenciasDiscricionariasDesembolsos(1);
      setMessage(`Historico de desembolsos do convenio ${convenio} carregado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar historico de desembolsos.");
    } finally {
      setIsLoadingTransferenciasDiscricionariasDesembolsos(false);
    }
  };

  const onApplyTransferenciasDiscricionariasDesembolsoFilters = async (nextPage = 1) => {
    setTransferenciasDiscricionariasDesembolsoPage(nextPage);
    setIsLoadingTransferenciasDiscricionariasDesembolsos(true);
    setMessage("");
    try {
      await loadTransferenciasDiscricionariasDesembolsos(nextPage);
      setMessage("Historico de desembolsos atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar historico de desembolsos.");
    } finally {
      setIsLoadingTransferenciasDiscricionariasDesembolsos(false);
    }
  };

  const onClearTransferenciasDiscricionariasDesembolsos = () => {
    setTransferenciasDiscricionariasDesembolsoFilters(emptyTransferenciasDiscricionariasDesembolsoFilters());
    setTransferenciasDiscricionariasDesembolsoData(null);
    setTransferenciasDiscricionariasDesembolsoPage(1);
  };

  const onApplyTransferenciasDiscricionariasProponenteDesembolsoFilters = async (nextPage = 1) => {
    setTransferenciasDiscricionariasProponenteDesembolsoPage(nextPage);
    setIsLoadingTransferenciasDiscricionariasProponenteDesembolsos(true);
    setMessage("");
    try {
      await loadTransferenciasDiscricionariasDesembolsosPorProponente(nextPage);
      setMessage("Relatorio de desembolsos por proponente atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar desembolsos por proponente.");
    } finally {
      setIsLoadingTransferenciasDiscricionariasProponenteDesembolsos(false);
    }
  };

  const onClearTransferenciasDiscricionariasProponenteDesembolsos = () => {
    setTransferenciasDiscricionariasProponenteDesembolsoFilters(
      emptyTransferenciasDiscricionariasProponenteDesembolsoFilters()
    );
    setTransferenciasDiscricionariasProponenteDesembolsoData(null);
    setTransferenciasDiscricionariasProponenteDesembolsoPage(1);
  };

  const onExportTransferenciasDiscricionariasProponenteDesembolsosPdf = async (mode: ReportPdfMode) => {
    if (!token) {
      return;
    }

    const cnpjDigits = transferenciasDiscricionariasProponenteDesembolsoFilters.cnpj.replace(/\D/g, "");
    const nomeProponente = transferenciasDiscricionariasProponenteDesembolsoFilters.nome_proponente.trim();
    if (cnpjDigits === "" && nomeProponente === "") {
      setMessage("Informe CNPJ ou nome do proponente antes de exportar PDF.");
      return;
    }

    setIsLoadingTransferenciasDiscricionariasProponenteDesembolsos(true);
    setMessage("");
    try {
      const anoParsed = Number(transferenciasDiscricionariasProponenteDesembolsoFilters.ano);
      const mesParsed = Number(transferenciasDiscricionariasProponenteDesembolsoFilters.mes);
      const firstPage = await getTransferenciasDiscricionariasDesembolsosPorProponente(token, {
        cnpj: cnpjDigits || undefined,
        nome_proponente: nomeProponente || undefined,
        ano: Number.isFinite(anoParsed) && anoParsed >= 2000 ? anoParsed : undefined,
        mes: Number.isFinite(mesParsed) && mesParsed >= 1 && mesParsed <= 12 ? mesParsed : undefined,
        page: 1,
        page_size: 500
      });

      const allItems = [...firstPage.itens];
      for (let page = 2; page <= firstPage.paginacao.total_paginas; page += 1) {
        const next = await getTransferenciasDiscricionariasDesembolsosPorProponente(token, {
          cnpj: cnpjDigits || undefined,
          nome_proponente: nomeProponente || undefined,
          ano: Number.isFinite(anoParsed) && anoParsed >= 2000 ? anoParsed : undefined,
          mes: Number.isFinite(mesParsed) && mesParsed >= 1 && mesParsed <= 12 ? mesParsed : undefined,
          page,
          page_size: 500
        });
        allItems.push(...next.itens);
      }

      const fullReport: TransferenciaDiscricionariaDesembolsoProponenteResponse = {
        ...firstPage,
        itens: allItems,
        paginacao: {
          ...firstPage.paginacao,
          pagina: 1,
          tamanho_pagina: allItems.length,
          total: allItems.length,
          total_paginas: 1,
          tem_anterior: false,
          tem_proxima: false
        }
      };

      const logoCnpj = cnpjDigits || (fullReport.resumo.cnpj ? fullReport.resumo.cnpj.replace(/\D/g, "") : "");
      const proponenteLogoUrl = logoCnpj !== "" ? (proponenteLogoByCnpj.get(logoCnpj) ?? null) : null;

      exportTransferenciasDiscricionariasProponenteDesembolsosPdf(fullReport, mode, proponenteLogoUrl);
      setMessage("PDF de desembolsos por proponente gerado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao exportar PDF de desembolsos por proponente.");
    } finally {
      setIsLoadingTransferenciasDiscricionariasProponenteDesembolsos(false);
    }
  };

  const onRefreshTransferenciasDiscricionariasSyncStatus = async () => {
    if (!token) {
      return;
    }

    setIsSyncingTransferenciasDiscricionarias(true);
    setMessage("");
    try {
      const status = await getTransferenciasDiscricionariasSyncStatus(token);
      setTransferenciasDiscricionariasSyncState(status);
      setTransferenciasDiscricionariasData((prev) => (prev ? { ...prev, sincronizacao: status } : prev));
      setMessage("Status da sincronizacao atualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar status da sincronizacao.");
    } finally {
      setIsSyncingTransferenciasDiscricionarias(false);
    }
  };

  const onSyncTransferenciasDiscricionarias = async (mode: "light" | "full") => {
    if (!token || !canManageInstruments) {
      return;
    }

    setTransferenciasDiscricionariasSyncMode(mode);
    setIsSyncingTransferenciasDiscricionarias(true);
    setMessage("");
    try {
      const result = await syncTransferenciasDiscricionarias(token, { force: true, mode });
      const status = await getTransferenciasDiscricionariasSyncStatus(token);
      setTransferenciasDiscricionariasSyncState(status);
      setTransferenciasDiscricionariasData((prev) => (prev ? { ...prev, sincronizacao: status } : prev));
      await loadTransferenciasDiscricionariasReport(1);
      setMessage(
        result.status === "rejected"
          ? (result.detalhe ?? "Carga rejeitada. Base anterior preservada.")
          : result.skipped
          ? "Sincronizacao ja em andamento ou base atualizada."
          : mode === "light"
            ? `Sincronizacao (modo teste leve) concluida: ${result.total_registros} registros carregados.`
            : `Sincronizacao completa concluida: ${result.total_registros} registros carregados.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao sincronizar transferencias discricionarias.");
    } finally {
      setTransferenciasDiscricionariasSyncMode(null);
      setIsSyncingTransferenciasDiscricionarias(false);
    }
  };

  const onCancelTransferenciasDiscricionariasSync = async () => {
    if (!token || !canManageInstruments) {
      return;
    }

    setIsSyncingTransferenciasDiscricionarias(true);
    setMessage("");
    try {
      const result = await cancelTransferenciasDiscricionariasSync(token);
      const status = await getTransferenciasDiscricionariasSyncStatus(token);
      setTransferenciasDiscricionariasSyncState(status);
      setTransferenciasDiscricionariasData((prev) => (prev ? { ...prev, sincronizacao: status } : prev));
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao interromper sincronizacao.");
    } finally {
      setTransferenciasDiscricionariasSyncMode(null);
      setIsSyncingTransferenciasDiscricionarias(false);
    }
  };

  const onNotifyTransferenciasDiscricionariasVigencia = async () => {
    if (!token || !canManageInstruments) {
      return;
    }

    setIsNotifyingTransferenciasDiscricionarias(true);
    setMessage("");
    try {
      const result: TransferenciaDiscricionariaNotifyResult =
        await triggerTransferenciasDiscricionariasVigenciaNotification(token);
      const daysLabel = result.dias_monitorados.join("/");
      setMessage(
        `${result.mensagem} Dias: ${daysLabel}. Elegiveis: ${result.elegiveis}. Enviados: ${result.enviados}.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao disparar alertas de vigencia.");
    } finally {
      setIsNotifyingTransferenciasDiscricionarias(false);
    }
  };

  useEffect(() => {
    if (!token || transferenciasDiscricionariasSyncInfo?.status !== "running") {
      return;
    }

    let cancelled = false;
    const pollStatus = async () => {
      try {
        const status = await getTransferenciasDiscricionariasSyncStatus(token);
        if (cancelled) {
          return;
        }
        setTransferenciasDiscricionariasSyncState(status);
        setTransferenciasDiscricionariasData((prev) => (prev ? { ...prev, sincronizacao: status } : prev));
      } catch {
        // silencioso; o usuario ainda pode atualizar manualmente
      }
    };

    const timerId = window.setInterval(() => {
      void pollStatus();
    }, 5000);

    void pollStatus();

    return () => {
      cancelled = true;
      window.clearInterval(timerId);
    };
  }, [token, transferenciasDiscricionariasSyncInfo?.status]);

  useEffect(() => {
    if (!token || relatorioTab !== "transferencias_especiais") {
      return;
    }

    void onRefreshTransferenciasEspeciaisSyncStatus();
  }, [token, relatorioTab]);

  useEffect(() => {
    if (!token || transferenciasEspeciaisSyncStatus?.status !== "running") {
      return;
    }

    const timerId = window.setInterval(() => {
      void onRefreshTransferenciasEspeciaisSyncStatus();
    }, 5000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [token, transferenciasEspeciaisSyncStatus?.status]);

  const onApplyFnsRepassesFilters = async () => {
    if (!token) {
      return;
    }

    let cnpjDigits = fnsRepassesFilters.cnpj.replace(/\D/g, "");
    if (cnpjDigits.length < 11 && fnsCnpjAutomatico.length >= 11) {
      cnpjDigits = fnsCnpjAutomatico;
      setFnsRepassesFilters((prev) => ({ ...prev, cnpj: fnsCnpjAutomatico }));
    }

    if (cnpjDigits.length < 11) {
      setFnsRepassesData(null);
      setFnsRepassesDetalheData(null);
      setFnsSaldosData(null);
      setMessage("Selecione um municipio atendido para definir automaticamente o CNPJ da consulta FNS.");
      return;
    }
    if (!proponentesAtendidosCnpj.has(cnpjDigits)) {
      setFnsRepassesData(null);
      setFnsRepassesDetalheData(null);
      setFnsSaldosData(null);
      setMessage("Nao foi possivel vincular automaticamente o CNPJ do proponente atendido para este municipio.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadFnsRepasses(token, { cnpj: cnpjDigits });
      await loadFnsSyncStatus(token);
      setMessage("Relatorio de repasses FNS atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar repasses FNS.");
    } finally {
      setIsBusy(false);
    }
  };

  const onLoadFnsDetalheBloco = async (codigoBloco: string, nomeBloco?: string) => {
    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadFnsRepassesDetalheByBloco(codigoBloco, token);
      setMessage(`Detalhe do bloco ${nomeBloco ?? codigoBloco} carregado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar detalhe de repasses FNS.");
    } finally {
      setIsBusy(false);
    }
  };

  const onSyncFnsCache = async () => {
    if (!token || !canManageInstruments) {
      return;
    }

    const cnpjDigits = fnsRepassesFilters.cnpj.replace(/\D/g, "");
    const cnpjs = cnpjDigits.length >= 11 ? [cnpjDigits] : [];
    const ano = Number(fnsRepassesFilters.ano);

    setIsBusy(true);
    setMessage("");
    try {
      const result = await syncFnsCache(token, {
        ano: Number.isFinite(ano) ? ano : undefined,
        cnpjs,
        incluir_ufs: true
      });
      await loadFnsSyncStatus(token);
      setMessage(
        result.status === "running"
          ? "Sincronizacao FNS ja estava em andamento."
          : "Sincronizacao de cache FNS concluida."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao sincronizar cache FNS.");
    } finally {
      setIsBusy(false);
    }
  };

  const onClearFnsRepassesFilters = () => {
    setFnsRepassesFilters(emptyFnsRepassesFilters());
    setFnsMunicipios([]);
    setFnsRepassesData(null);
    setFnsRepassesDetalheData(null);
    setFnsSaldosData(null);
    setFnsDetalheBlocoLabel("");
  };

  const onApplyConsultaFnsFilters = async (nextPage = 1) => {
    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadConsultaFnsPropostas(nextPage, token);
      setMessage("Relatorio Consulta FNS atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar propostas no Consulta FNS.");
    } finally {
      setIsBusy(false);
    }
  };

  const onOpenConsultaFnsDetalhe = async (item: ConsultaFnsPropostaItem) => {
    if (!token) {
      return;
    }

    const nuPropostaResolved = resolveConsultaFnsNuProposta(item);

    if (nuPropostaResolved === "") {
      const nextFilters: ConsultaFnsFilters = {
        ...consultaFnsFilters,
        nu_proposta: "",
        tp_proposta: item.coTipoProposta ?? "",
        tp_recurso: item.dsTipoRecurso ?? ""
      };

      setConsultaFnsFilters(nextFilters);
      setConsultaFnsDetalhe(null);
      setConsultaFnsSelected(null);
      setIsBusy(true);
      setMessage("");
      try {
        await loadConsultaFnsPropostas(1, token, nextFilters);
        setMessage("Lista refinada por tipo de proposta e recurso para localizar numeros de proposta.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Falha ao refinar lista de propostas.");
      } finally {
        setIsBusy(false);
      }
      return;
    }

    setConsultaFnsSelected(item);
    setIsBusy(true);
    setMessage("");
    try {
      await loadConsultaFnsPropostaDetalhe(nuPropostaResolved, token);
      setMessage(`Detalhe da proposta ${nuPropostaResolved} carregado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar detalhe da proposta.");
    } finally {
      setIsBusy(false);
    }
  };

  const onClearConsultaFnsFilters = () => {
    setConsultaFnsFilters(emptyConsultaFnsFilters());
    setConsultaFnsMunicipios([]);
    setConsultaFnsData(null);
    setConsultaFnsPage(1);
    setConsultaFnsSelected(null);
    setConsultaFnsDetalhe(null);
  };

  const onResetConsultaFnsToSearchStart = () => {
    setConsultaFnsFilters(emptyConsultaFnsFilters());
    setConsultaFnsMunicipios([]);
    setConsultaFnsData(null);
    setConsultaFnsPage(1);
    setConsultaFnsSelected(null);
    setConsultaFnsDetalhe(null);
    setMessage("Retornou ao inicio das buscas Consulta FNS.");
  };

  const onExportConsultaFnsAnalitico = () => {
    if (!consultaFnsData || consultaFnsData.itens.length === 0) {
      setMessage("Consulte propostas antes de gerar o relatorio analitico.");
      return;
    }

    const rows = consultaFnsData.itens
      .map((item) => {
        const parlamentar = item.parlamentares?.[0];
        const valorEmendaSomado = sumConsultaFnsValorEmenda(item);
        const tipoLinha = resolveConsultaFnsNuProposta(item) !== "" ? "Detalhavel" : "Agregada";
        return `<tr>
          <td>${escapeHtml(tipoLinha)}</td>
          <td>${escapeHtml(item.coTipoProposta ?? "-")}</td>
          <td>${escapeHtml(item.dsTipoRecurso ?? "-")}</td>
          <td>${escapeHtml(resolveConsultaFnsNuProposta(item) || "-")}</td>
          <td>${escapeHtml(item.noEntidade ?? "-")}</td>
          <td>${formatCurrency(item.vlProposta)}</td>
          <td>${formatCurrency(item.vlPago)}</td>
          <td>${resolveConsultaFnsDataPagamento(item)}</td>
          <td>${escapeHtml(resolveConsultaFnsParlamentarLabel(item))}</td>
          <td>${escapeHtml(parlamentar?.sgPartido ?? "-")}</td>
          <td>${escapeHtml(parlamentar?.coEmendaPolitica ?? "-")}</td>
          <td>${escapeHtml(parlamentar?.nuAnoExercicio ?? "-")}</td>
          <td>${valorEmendaSomado == null ? "-" : formatCurrency(valorEmendaSomado)}</td>
        </tr>`;
      })
      .join("");

    const detalheHtml =
      consultaFnsDetalhe
        ? `<h2>Detalhe selecionado</h2>
          <p><strong>Proposta:</strong> ${escapeHtml(consultaFnsSelected?.nuProposta ?? consultaFnsDetalhe.nuProposta)}</p>
          <p><strong>Entidade:</strong> ${escapeHtml(consultaFnsDetalhe.noEntidade)} | <strong>Municipio/UF:</strong> ${escapeHtml(consultaFnsDetalhe.noMunicipio)}/${escapeHtml(consultaFnsDetalhe.sgUf)}</p>
          <p><strong>Situacao:</strong> ${escapeHtml(consultaFnsDetalhe.situacao?.descricaoSituacaoproposta ?? "Nao informada")}</p>
          <p><strong>Valor proposta:</strong> ${formatCurrency(consultaFnsDetalhe.vlProposta)} | <strong>Pago:</strong> ${formatCurrency(consultaFnsDetalhe.vlPago)} | <strong>Saldo:</strong> ${formatCurrency(consultaFnsDetalhe.vlPagar)}</p>`
        : "";

    const logoUrl = getReportLogoUrl();
    const html = `<!doctype html><html><head><meta charset="utf-8" /><title>Consulta FNS - Relatorio analitico</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:20px;color:#102a43}.report-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.report-head img{max-width:180px;height:auto;display:block}h1,h2{margin:0 0 10px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #cbd5e1;padding:6px;font-size:11px;text-align:left;vertical-align:top}.muted{color:#486581}.toolbar{margin:12px 0 16px}.toolbar button{padding:8px 12px;border:1px solid #9fb3c8;background:#e7eff7;color:#102a43;border-radius:6px;cursor:pointer}</style></head><body><div class="report-head"><img src="${logoUrl}" alt="NC Convenios" /><h1>Consulta FNS - Relatorio analitico</h1></div><p class="muted">Gerado em ${new Date().toLocaleString("pt-BR")}</p><div class="toolbar"><button onclick="window.print()">Imprimir / Salvar PDF</button></div><table><thead><tr><th>Tipo linha</th><th>Tipo proposta</th><th>Tipo recurso</th><th>N° proposta</th><th>Entidade</th><th>Valor da proposta</th><th>Valor pago</th><th>Data do pagamento</th><th>Parlamentar</th><th>Partido</th><th>Emenda</th><th>Ano</th><th>Valor emenda</th></tr></thead><tbody>${rows || '<tr><td colspan="13">Sem dados para exportacao</td></tr>'}</tbody></table>${detalheHtml}</body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const popup = window.open(blobUrl, "_blank", "width=1200,height=900");
    if (!popup) {
      URL.revokeObjectURL(blobUrl);
      setMessage("Nao foi possivel abrir o relatorio. Verifique o bloqueador de pop-ups.");
      return;
    }

    window.setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 60000);
  };

  const onExportExtracaoSimecAnalitico = () => {
    if (!extracaoSimecData || extracaoSimecData.dados.length === 0) {
      setMessage("Consulte termos do SIMEC antes de gerar o relatorio analitico.");
      return;
    }

    const rows = extracaoSimecData.dados
      .map(
        (item) => `<tr>
          <td>${escapeHtml(item.numeroTermo || "-")}</td>
          <td>${escapeHtml(item.par || "-")}</td>
          <td>${escapeHtml(item.objeto || "-")}</td>
          <td>${escapeHtml(item.municipio || "-")}</td>
          <td>${escapeHtml(item.ano || "-")}</td>
          <td>${escapeHtml(item.valor || "-")}</td>
          <td>${escapeHtml(item.situacao || "-")}</td>
          <td>${escapeHtml(item.valorEmpenhado || "-")}</td>
          <td>${escapeHtml(item.valorPago || "-")}</td>
          <td>${escapeHtml(item.saldoBancario || "-")}</td>
          <td>${escapeHtml(item.prestacaoContas || "-")}</td>
        </tr>`
      )
      .join("");

    const reportHeadHtml = buildReportHeadHtml("Extracao SIMEC - Relatorio Analitico");
    const printScript = getDeferredPrintScript();
    const popup = window.open("", "_blank", "width=1200,height=900");
    if (!popup) {
      setMessage("Nao foi possivel abrir o relatorio. Verifique o bloqueador de pop-ups.");
      return;
    }

    popup.document.open();
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Extracao SIMEC - Relatorio Analitico</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43}.report-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.report-logos{display:flex;align-items:flex-start;gap:12px}.report-logo-slot{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:120px}.report-logo-slot img{max-width:160px;max-height:80px;height:auto;display:block}.report-logo-slot small{font-size:10px;color:#486581}h1,h2{margin:0 0 12px}.muted{color:#486581}.toolbar{margin:12px 0 16px}.toolbar button{padding:8px 12px;border:1px solid #9fb3c8;background:#e7eff7;color:#102a43;border-radius:6px;cursor:pointer}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:6px;font-size:11px;text-align:left;vertical-align:top}</style></head><body>${reportHeadHtml}<p class="muted">Gerado em ${new Date().toLocaleString("pt-BR")} | Total de termos: ${extracaoSimecData.dados.length}</p><div class="toolbar"><button onclick="window.print()">Imprimir / Salvar PDF</button></div><h2>Termos</h2><table><thead><tr><th>Termo</th><th>PAR</th><th>Tipo do Objeto</th><th>Municipio</th><th>Ano</th><th>Valor do Termo</th><th>Vigencia Final</th><th>Valor Empenhado</th><th>Valor Pago</th><th>Saldo Bancario</th><th>Prestacao de Contas</th></tr></thead><tbody>${rows || '<tr><td colspan="11">Sem dados para exportacao</td></tr>'}</tbody></table>${printScript}</body></html>`);
    popup.document.close();
  };

  const onSyncConsultaFnsCache = async () => {
    if (!token || !canManageInstruments) {
      return;
    }

    const ano = Number(consultaFnsFilters.ano);
    const count = Number(consultaFnsFilters.count);

    setIsBusy(true);
    setMessage("");
    try {
      const result = await syncConsultaFnsCache(token, {
        ano: Number.isFinite(ano) ? ano : undefined,
        pages_max: 3,
        count: Number.isFinite(count) ? count : 20
      });
      await loadConsultaFnsStatus(token);
      setMessage(
        result.status === "running"
          ? "Sincronizacao Consulta FNS ja estava em andamento."
          : "Sincronizacao de cache Consulta FNS concluida."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao sincronizar cache Consulta FNS.");
    } finally {
      setIsBusy(false);
    }
  };

  const onCloseConsultaFnsDetalhe = () => {
    setConsultaFnsSelected(null);
    setConsultaFnsDetalhe(null);
    setMessage("Retornou para a lista de propostas Consulta FNS.");
  };

  const onApplySimecObrasFilters = async () => {
    if (!token) {
      return;
    }

    const uf = simecObrasFilters.uf.trim().toUpperCase();
    const muncod = simecObrasFilters.muncod.trim();
    if (uf.length !== 2 || muncod.length < 6) {
      setMessage("Selecione UF e municipio para consultar obras no SIMEC.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadSimecObras(token, { uf });
      setMessage("Relatorio SIMEC Obras atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar obras no SIMEC.");
    } finally {
      setIsBusy(false);
    }
  };

  const onOpenSimecObraDetalhe = async (obraId: number) => {
    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadSimecObraDetalhe(obraId, token);
      setMessage(`Detalhe da obra ${obraId} carregado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar detalhe da obra SIMEC.");
    } finally {
      setIsBusy(false);
    }
  };

  const onCloseSimecObraDetalhe = () => {
    setSimecObraDetalhe(null);
    setSimecObraDetalheId(null);
    setMessage("Retornou para a lista de obras do SIMEC.");
  };

  const onClearSimecObrasFilters = () => {
    setSimecObrasFilters(emptySimecObrasFilters());
    setSimecMunicipios([]);
    setSimecObrasData(null);
    setSimecObraDetalhe(null);
    setSimecObraDetalheId(null);
  };

  const onApplySimecTermosFilters = async () => {
    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadSimecTermos(token);
      setMessage("Relatorio SIMEC Termos atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar termos no SIMEC.");
    } finally {
      setIsBusy(false);
    }
  };

  const onOpenSimecTermoDetalhe = async (dotid: number) => {
    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadSimecTermoDetalhe(dotid, token);
      setMessage(`Detalhe do termo ${dotid} carregado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar detalhe do termo SIMEC.");
    } finally {
      setIsBusy(false);
    }
  };

  const onCloseSimecTermoDetalhe = () => {
    setSimecTermoDetalhe(null);
    setSimecTermoDetalheId(null);
    setMessage("Retornou para a lista de termos do SIMEC.");
  };

  const onClearSimecTermosFilters = () => {
    setSimecTermosFilters(emptySimecTermosFilters());
    setSimecTermosData(null);
    setSimecTermoDetalhe(null);
    setSimecTermoDetalheId(null);
  };

  const onApplySimecTermosPreset = (inicio: number, limite: number) => {
    setSimecTermosFilters((prev) => ({
      ...prev,
      dotid_inicio: String(inicio),
      dotid_fim: "",
      cursor: String(inicio),
      limite: String(limite)
    }));
  };

  const onApplySimecTermosRecentPreset = (cursor: number, limite: number) => {
    setSimecTermosFilters((prev) => ({
      ...prev,
      dotid_inicio: "",
      dotid_fim: "",
      cursor: String(cursor),
      limite: String(limite)
    }));
  };

  const onLoadMoreSimecTermos = async () => {
    if (!token || !simecTermosData?.resumo.proximo_cursor) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const result = await getSimecTermos(token, {
        cursor: String(simecTermosData.resumo.proximo_cursor),
        limite: simecTermosFilters.limite.trim() || "100",
        ano: simecTermosFilters.ano.trim() || undefined,
        secretaria: simecTermosFilters.secretaria || undefined,
        uf: simecTermosFilters.uf.trim().toUpperCase() || undefined,
        q: simecTermosFilters.q.trim() || undefined
      });
      setSimecTermosFilters((prev) => ({
        ...prev,
        cursor: result.filtros.cursor ? String(result.filtros.cursor) : prev.cursor
      }));
      setSimecTermosData((prev) =>
        prev
          ? {
              ...result,
              itens: [...prev.itens, ...result.itens],
              resumo: {
                ...result.resumo,
                termos_encontrados: prev.itens.length + result.itens.length
              }
            }
          : result
      );
      setMessage("Mais termos recentes carregados.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar mais termos do SIMEC.");
    } finally {
      setIsBusy(false);
    }
  };

  const typeAssistantMessage = async (payload: {
    text: string;
    intencao?: AssistenteResposta["intencao"];
    confianca?: AssistenteResposta["confianca"];
    contextoUsado?: boolean;
    perguntaInterpretada?: string;
    fontesConsultadas?: string[];
    sugestoes?: string[];
    dados?: Record<string, unknown>;
  }) => {
    const messageId = `assistant-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fullText = payload.text?.trim() ?? "";
    const safeText = fullText === "" ? "Sem resposta no momento." : fullText;
    setAssistenteTypingMessageId(messageId);

    setAssistenteConversa((prev) => [
      ...prev,
      {
        id: messageId,
        role: "assistant",
        text: "",
        createdAt: new Date().toISOString(),
        intencao: payload.intencao,
        confianca: payload.confianca,
        contextoUsado: payload.contextoUsado,
        perguntaInterpretada: payload.perguntaInterpretada,
        fontesConsultadas: payload.fontesConsultadas,
        sugestoes: payload.sugestoes?.filter((item) => item.trim() !== "").slice(0, 4) ?? [],
        dadosResumo: summarizeAssistenteDados(payload.dados),
        dados: payload.dados
      }
    ]);

    await new Promise<void>((resolve) => {
      let cursor = 0;
      const stride = safeText.length > 240 ? 3 : 2;
      const delayMs = safeText.length > 240 ? 12 : 18;

      if (assistenteTypingIntervalRef.current !== null) {
        window.clearInterval(assistenteTypingIntervalRef.current);
      }

      assistenteTypingIntervalRef.current = window.setInterval(() => {
        cursor = Math.min(safeText.length, cursor + stride);
        const partial = safeText.slice(0, cursor);
        setAssistenteConversa((prev) =>
          prev.map((item) =>
            item.id === messageId
              ? {
                  ...item,
                  text: partial
                }
              : item
          )
        );

        if (cursor >= safeText.length) {
          if (assistenteTypingIntervalRef.current !== null) {
            window.clearInterval(assistenteTypingIntervalRef.current);
            assistenteTypingIntervalRef.current = null;
          }
          setAssistenteTypingMessageId(null);
          resolve();
        }
      }, delayMs);
    });
  };

  const onAskAssistente = async () => {
    if (!token) {
      return;
    }

    const pergunta = assistentePergunta.trim();
    if (pergunta === "") {
      setMessage("Digite uma pergunta para o Assistente 360.");
      return;
    }

    const userMessage: AssistenteChatItem = {
      id: `user-${Date.now()}`,
      role: "user",
      text: pergunta,
      createdAt: new Date().toISOString()
    };

    setAssistenteConversa((prev) => [...prev, userMessage]);
    setAssistentePergunta("");
    setIsConsultandoAssistente(true);
    setMessage("");

    try {
      const historico: AssistenteHistoricoItem[] = assistenteConversa
        .filter((item) => item.text.trim() !== "")
        .slice(-10)
        .map((item) => ({ role: item.role, text: item.text }));

      const result = await askAssistentePergunta(token, pergunta, historico, assistenteSessionId ?? undefined);
      if (result.session_id) {
        const createdSessionId = result.session_id;
        setAssistenteSessionId(createdSessionId);
        const nextTitle = normalizeAssistenteSessionTitle(pergunta);
        setAssistenteSessions((prev) => {
          const existing = prev.find((item) => item.id === createdSessionId);
          if (existing) {
            return prev.map((item) =>
              item.id === createdSessionId
                ? {
                    ...item,
                    titulo: nextTitle,
                    updatedAt: new Date().toISOString()
                  }
                : item
            );
          }

          return [
            {
              id: createdSessionId,
              titulo: nextTitle,
              entidadeAtivaTipo: null,
              entidadeAtivaId: null,
              municipioAtivo: null,
              topicoAtivo: null,
              resumoContexto: null,
              updatedAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            },
            ...prev
          ];
        });
      }
      void loadAssistenteSessionsHistory(token);
      await typeAssistantMessage({
        text: result.resposta,
        intencao: result.intencao,
        confianca: result.confianca,
        contextoUsado: result.contexto_usado,
        perguntaInterpretada: result.pergunta_interpretada,
        fontesConsultadas: result.fontes_consultadas,
        sugestoes: result.sugestoes,
        dados: result.dados
      });
    } catch (error) {
      await typeAssistantMessage({
        text: error instanceof Error ? error.message : "Falha ao consultar o Assistente 360.",
        intencao: "nao_entendida"
      });
    } finally {
      setIsConsultandoAssistente(false);
      setAssistenteTypingMessageId(null);
    }
  };

  const onAssistenteOpenTicketSearch = async (query: string) => {
    if (!token) {
      return;
    }

    const next = {
      ...emptyTicketFilters(),
      q: query
    };

    setTicketFilters(next);
    setSelectedTicket(null);
    setActiveView("tickets");
    setIsBusy(true);
    setMessage("");
    try {
      await loadTickets(token, next);
      setMessage(`Tickets filtrados por '${query}'.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao filtrar tickets.");
    } finally {
      setIsBusy(false);
    }
  };

  const onAssistenteOpenInstrumentTickets = async (instrumentId: number) => {
    if (!token) {
      return;
    }

    const next = {
      ...emptyTicketFilters(),
      instrument_id: String(instrumentId)
    };

    setTicketFilters(next);
    setSelectedTicket(null);
    setActiveView("tickets");
    setIsBusy(true);
    setMessage("");
    try {
      await loadTickets(token, next);
      setMessage(`Tickets do instrumento ${instrumentId} carregados.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar tickets do instrumento.");
    } finally {
      setIsBusy(false);
    }
  };

  const renderAssistenteRecordActions = (
    record: Record<string, unknown>,
    index: number,
    section: "top" | "sample" | "result"
  ): ReactNode => {
    const actions: Array<{ key: string; label: string; onClick: () => void }> = [];
    const instrumentId = typeof record.id === "number" ? record.id : null;
    const cidade = typeof record.cidade === "string" ? record.cidade : null;
    const cnpj = typeof record.cnpj === "string" ? record.cnpj : null;
    const proposta = typeof record.proposta === "string" ? record.proposta : null;
    const instrumento = typeof record.instrumento === "string" ? record.instrumento : null;
    const ticketCodigo = typeof record.codigo === "string" ? record.codigo : null;

    if (instrumentId !== null && (instrumento || proposta || "codigo_plano_acao" in record)) {
      actions.push({
        key: "instrument",
        label: "Abrir instrumento",
        onClick: () => void onTrack(instrumentId)
      });
      actions.push({
        key: "instrument-tickets",
        label: "Ver tickets",
        onClick: () => void onAssistenteOpenInstrumentTickets(instrumentId)
      });
    }

    if (ticketCodigo) {
      actions.push({
        key: "ticket-search",
        label: "Filtrar tickets",
        onClick: () => void onAssistenteOpenTicketSearch(ticketCodigo)
      });
    }

    if (cidade) {
      actions.push({
        key: "city-question",
        label: "Perguntar pela cidade",
        onClick: () => setAssistentePergunta(`Quais instrumentos existem na cidade de ${cidade}?`)
      });
    }

    if (cnpj && cnpj.replace(/\D/g, "").length === 14) {
      actions.push({
        key: "cnpj-question",
        label: "Perguntar pelo CNPJ",
        onClick: () => setAssistentePergunta(`Quais transferencias especiais existem para o CNPJ ${cnpj}?`)
      });
    }

    if (instrumento) {
      actions.push({
        key: "instrument-question",
        label: "Perguntar pelo instrumento",
        onClick: () => setAssistentePergunta(`Quais tickets existem para o instrumento ${instrumento}?`)
      });
    } else if (proposta) {
      actions.push({
        key: "proposal-question",
        label: "Perguntar pela proposta",
        onClick: () => setAssistentePergunta(`Quais tickets existem para a proposta ${proposta}?`)
      });
    }

    const uniqueActions = actions.filter(
      (action, actionIndex, all) => all.findIndex((candidate) => candidate.key === action.key && candidate.label === action.label) === actionIndex
    );

    if (uniqueActions.length === 0) {
      return null;
    }

    return (
      <div className="assistant-structured-actions">
        {uniqueActions.slice(0, 3).map((action) => (
          <button
            key={`${section}-${index}-${action.key}`}
            type="button"
            className="secondary assistant-structured-action-button"
            onClick={action.onClick}
            disabled={isConsultandoAssistente || isBusy}
          >
            {action.label}
          </button>
        ))}
      </div>
    );
  };

  const onApplyTicketReportFilters = async () => {
    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const items = await listTickets(token, {
        status: ticketReportFilters.status || undefined,
        prioridade: ticketReportFilters.prioridade || undefined,
        origem: ticketReportFilters.origem || undefined,
        somente_atrasados: ticketReportFilters.somente_atrasados,
        responsavel_user_id:
          ticketReportFilters.responsavel_user_id.trim() === ""
            ? undefined
            : Number(ticketReportFilters.responsavel_user_id),
        q: ticketReportFilters.q.trim() === "" ? undefined : ticketReportFilters.q.trim()
      });

      const startDate = ticketReportFilters.data_de ? parseDateOnly(ticketReportFilters.data_de) : null;
      const endDate = ticketReportFilters.data_ate ? parseDateOnly(ticketReportFilters.data_ate) : null;
      const filteredByDate = items.filter((item) => {
        if (!startDate && !endDate) {
          return true;
        }
        const createdAt = new Date(item.created_at);
        const createdUtc = Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth(), createdAt.getUTCDate());
        const startUtc = startDate
          ? Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())
          : Number.NEGATIVE_INFINITY;
        const endUtc = endDate
          ? Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
          : Number.POSITIVE_INFINITY;
        return createdUtc >= startUtc && createdUtc <= endUtc;
      });

      setTicketReportData(filteredByDate);
      setMessage("Relatorio de tickets atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao gerar relatorio de tickets.");
    } finally {
      setIsBusy(false);
    }
  };

  const onClearTicketReportFilters = () => {
    setTicketReportFilters(emptyTicketReportFilters());
    setTicketReportData(null);
  };

  const onExportRepasseReportPdf = (mode: ReportPdfMode) => {
    if (!reportData) {
      setMessage("Gere o relatorio antes de exportar.");
      return;
    }

    const selectedProponenteId = reportData.filtros.proponente_id ?? reportData.filtros.convenete_id ?? null;
    const proponenteLogoUrl = selectedProponenteId ? (proponenteLogoById.get(selectedProponenteId) ?? null) : null;
    exportRepasseReportPdf(reportData, mode, proponenteLogoUrl);
  };

  const onExportObraReportPdf = (mode: ReportPdfMode) => {
    if (!obraReportData) {
      setMessage("Gere o relatorio de obras antes de exportar.");
      return;
    }

    const selectedProponenteId = obraReportData.filtros.proponente_id ?? obraReportData.filtros.convenete_id ?? null;
    const proponenteLogoUrl = selectedProponenteId ? (proponenteLogoById.get(selectedProponenteId) ?? null) : null;
    exportObraReportPdf(obraReportData, mode, proponenteLogoUrl, obraReportData.filtros.concedente ?? undefined);
  };

  const onExportAndamentoInstrumentosReportPdf = () => {
    if (!andamentoInstrumentosReportData) {
      setMessage("Gere o relatorio de andamento de instrumentos antes de exportar.");
      return;
    }

    const selectedProponenteId = andamentoInstrumentosReportData.filtros.convenete_id;
    const proponenteLogoUrl = selectedProponenteId ? (proponenteLogoById.get(selectedProponenteId) ?? null) : null;
    void exportAndamentoInstrumentosReportPdf(andamentoInstrumentosReportData, proponenteLogoUrl);
  };

  const onExportTransferenciasEspeciaisPdf = (mode: ReportPdfMode) => {
    if (!transferenciasEspeciaisData) {
      setMessage("Consulte transferencias especiais antes de exportar PDF.");
      return;
    }

    const cnpjDigits = transferenciasEspeciaisFilters.cnpj.replace(/\D/g, "");
    const proponenteLogoUrl = cnpjDigits !== "" ? (proponenteLogoByCnpj.get(cnpjDigits) ?? null) : null;
    exportTransferenciasEspeciaisPdf(transferenciasEspeciaisData, mode, proponenteLogoUrl);
  };

  const onExportTicketReportPdf = (mode: ReportPdfMode) => {
    if (!ticketReportData) {
      setMessage("Gere o relatorio de tickets antes de exportar.");
      return;
    }
    exportTicketReportPdf(ticketReportData, mode);
  };

  const onExportTransferenciasDiscricionariasPdf = async (mode: ReportPdfMode) => {
    if (!transferenciasDiscricionariasData) {
      setMessage("Consulte o relatorio de transferencias discricionarias antes de exportar.");
      return;
    }

    const popup = window.open("", "_blank");
    if (!popup) {
      setMessage("Nao foi possivel abrir a janela do PDF. Verifique o bloqueio de pop-ups do navegador.");
      return;
    }

    popup.document.open();
    popup.document.write(
      '<!doctype html><html><head><meta charset="utf-8" /><title>Gerando PDF...</title></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43"><p>Gerando PDF analitico de transferencias discricionarias...</p></body></html>'
    );
    popup.document.close();

    setIsBusy(true);
    setMessage("");
    try {
      const cnpjDigits = transferenciasDiscricionariasFilters.cnpj.replace(/\D/g, "");
      const rawProponenteLogoUrl = cnpjDigits !== "" ? (proponenteLogoByCnpj.get(cnpjDigits) ?? null) : null;
      const proponenteLogoUrl =
        rawProponenteLogoUrl && rawProponenteLogoUrl.trim() !== ""
          ? await fetchImageAsDataUrl(getReportLogoUrl(rawProponenteLogoUrl))
          : null;
      const desembolsoReports: TransferenciaDiscricionariaDesembolsoResponse[] = [];
      const siafiByConvenio = new Map<string, string>();
      let truncatedConvenios = false;
      let partialConvenioCollection = false;
      const failedConvenios: string[] = [];
      let skippedSingleParcelaConvenios = 0;

      if (mode === "analitico" && token) {
        const anoParsed = Number(transferenciasDiscricionariasDesembolsoFilters.ano);
        const mesParsed = Number(transferenciasDiscricionariasDesembolsoFilters.mes);
        const anoFilter = Number.isFinite(anoParsed) && anoParsed >= 2000 ? anoParsed : undefined;
        const mesFilter = Number.isFinite(mesParsed) && mesParsed >= 1 && mesParsed <= 12 ? mesParsed : undefined;

        let conveniosToExport = parseConvenioList(transferenciasDiscricionariasDesembolsoFilters.nr_convenio);

        if (conveniosToExport.length === 0) {
          const convenioSet = new Set<string>();
          const collectConvenios = (items: TransferenciaDiscricionariaResponse["itens"]) => {
            for (const item of items) {
              const convenio = item.nr_convenio?.trim();
              if (!convenio) {
                continue;
              }
              convenioSet.add(convenio);
              if (convenioSet.size >= MAX_CONVENIOS_DESEMBOLSO_PDF) {
                return true;
              }
            }
            return false;
          };

          let reachedCap = collectConvenios(transferenciasDiscricionariasData.itens);

          if (!reachedCap) {
            const totalPages = transferenciasDiscricionariasData.paginacao.total_paginas;
            const currentPage = transferenciasDiscricionariasData.paginacao.pagina;

            for (let page = 1; page <= totalPages; page += 1) {
              if (page === currentPage) {
                continue;
              }

              try {
                const nextPage = await getTransferenciasDiscricionarias(
                  token,
                  buildTransferenciasDiscricionariasQuery(
                    page,
                    TRANSFERENCIAS_PAGE_SIZE_MAX,
                    transferenciasDiscricionariasFilters
                  )
                );
                reachedCap = collectConvenios(nextPage.itens);
                if (reachedCap) {
                  break;
                }
              } catch {
                partialConvenioCollection = true;
                break;
              }
            }
          }

          conveniosToExport = Array.from(convenioSet);
          truncatedConvenios = reachedCap;
        }

        if (conveniosToExport.length > MAX_CONVENIOS_DESEMBOLSO_PDF) {
          conveniosToExport = conveniosToExport.slice(0, MAX_CONVENIOS_DESEMBOLSO_PDF);
          truncatedConvenios = true;
        }

        for (const convenio of conveniosToExport) {
          try {
            const firstPage = await getTransferenciasDiscricionariasDesembolsos(token, {
              nr_convenio: convenio,
              ano: anoFilter,
              mes: mesFilter,
              page: 1,
              page_size: DESEMBOLSOS_PAGE_SIZE_MAX
            });

            const allItems = [...firstPage.itens];
            for (let page = 2; page <= firstPage.paginacao.total_paginas; page += 1) {
              const next = await getTransferenciasDiscricionariasDesembolsos(token, {
                nr_convenio: convenio,
                ano: anoFilter,
                mes: mesFilter,
                page,
                page_size: DESEMBOLSOS_PAGE_SIZE_MAX
              });
              allItems.push(...next.itens);
            }

            const uniqueSiafis = Array.from(
              new Set(
                allItems
                  .map((item) => (item.nr_siafi ?? "").trim())
                  .filter((value) => value !== "")
              )
            );
            if (uniqueSiafis.length > 0) {
              siafiByConvenio.set(convenio, uniqueSiafis.join(", "));
            }

            if (allItems.length > 1) {
              desembolsoReports.push({
                ...firstPage,
                itens: allItems,
                paginacao: {
                  ...firstPage.paginacao,
                  pagina: 1,
                  tamanho_pagina: allItems.length,
                  total: allItems.length,
                  total_paginas: 1,
                  tem_anterior: false,
                  tem_proxima: false
                }
              });
            } else if (allItems.length === 1) {
              skippedSingleParcelaConvenios += 1;
            }
          } catch {
            failedConvenios.push(convenio);
          }
        }
      }

      exportTransferenciasDiscricionariasPdf(
        transferenciasDiscricionariasData,
        mode,
        desembolsoReports,
        siafiByConvenio,
        popup,
        proponenteLogoUrl,
        transferenciasDiscricionariasFilters.concedente.trim() || undefined
      );

      if (mode !== "analitico") {
        setMessage("PDF de transferencias discricionarias gerado com sucesso.");
      } else if (desembolsoReports.length === 0) {
        setMessage(
          "PDF analitico gerado sem secoes de desembolso (apenas convenios com mais de uma parcela sao listados)."
        );
      } else if (
        truncatedConvenios ||
        partialConvenioCollection ||
        failedConvenios.length > 0 ||
        skippedSingleParcelaConvenios > 0
      ) {
        const problemas: string[] = [];
        if (truncatedConvenios) {
          problemas.push(`limite de ${MAX_CONVENIOS_DESEMBOLSO_PDF} convenios`);
        }
        if (partialConvenioCollection) {
          problemas.push("falha parcial na coleta de convenios");
        }
        if (failedConvenios.length > 0) {
          problemas.push(`${failedConvenios.length} convenio(s) com erro ao buscar desembolsos`);
        }
        if (skippedSingleParcelaConvenios > 0) {
          problemas.push(`${skippedSingleParcelaConvenios} convenio(s) ignorado(s) por terem apenas 1 parcela`);
        }
        setMessage(
          `PDF analitico gerado com ${desembolsoReports.length} convenio(s) e ajustes por: ${problemas.join(", ")}.`
        );
      } else {
        setMessage(`PDF analitico gerado com historico completo de desembolsos em ${desembolsoReports.length} convenio(s).`);
      }
    } catch (error) {
      popup.close();
      setMessage(error instanceof Error ? error.message : "Falha ao exportar PDF de transferencias discricionarias.");
    } finally {
      setIsBusy(false);
    }
  };

  const onStartCreateInstrument = () => {
    navigateToInstrumentList();
    setSelectedInstrument(null);
    setEditingId(null);
    setForm(emptyInstrumentForm());
    setShowCreateInstrumentForm(true);
    setMessage("Preencha os dados para adicionar um novo instrumento.");
  };

  const onSaveInstrument = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !canManageInstruments) {
      return;
    }

    const requiredFields = [form.proposta, form.instrumento, form.objeto, form.data_cadastro, form.concedente];
    if (requiredFields.some((value) => value.trim() === "")) {
      setMessage("Preencha os campos obrigatorios.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const currentEditingId = editingId;
      const wasEditing = currentEditingId !== null;
      const payload = toPayload(form);
      const saved = currentEditingId !== null
        ? await updateInstrument(token, currentEditingId, payload)
        : await createInstrument(token, payload);

      setInstruments((prev) => {
        if (wasEditing) {
          return prev.map((item) => (item.id === saved.id ? saved : item));
        }
        return [saved, ...prev];
      });
      setSelectedInstrument(saved);
      if (instrumentPageId === saved.id) {
        setSelectedInstrument(saved);
      }
      clearForm();
      setReportData(null);
      setObraReportData(null);
      await refreshData();
      setMessage(wasEditing ? "Instrumento atualizado." : "Instrumento criado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar instrumento.");
    } finally {
      setIsBusy(false);
    }
  };

  const onDeactivate = async (item: Instrument) => {
    if (!token || !canDeactivateInstruments) {
      return;
    }

    if (!window.confirm(`Confirma inativar o instrumento ${item.instrumento}?`)) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await deactivateInstrument(token, item.id);
      if (selectedInstrument?.id === item.id) {
        setSelectedInstrument(null);
      }
      if (editingId === item.id) {
        clearForm();
      }
      await refreshData();
      setMessage("Instrumento inativado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao inativar instrumento.");
    } finally {
      setIsBusy(false);
    }
  };

  const onTrack = async (id: number) => {
    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const item = await getInstrumentById(token, id);
      setSelectedInstrument(item);
      navigateToInstrumentProfile(id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar detalhes.");
    } finally {
      setIsBusy(false);
    }
  };

  const onSearchProponenteSugestoes = async () => {
    if (!token) {
      return;
    }

    const busca = proponenteCadastro.busca.trim();
    if (busca.length < 2) {
      setMessage("Para novos proponentes, digite o CNPJ completo (14 digitos). Para os ja existentes, digite ao menos 2 caracteres.");
      setProponenteSugestoes([]);
      setProponenteCadastro((prev) => ({ ...prev, cnpj_selecionado: "" }));
      return;
    }

    setIsLoadingProponenteSugestoes(true);
    setMessage("");
    try {
      const result = await searchProponentesDaBase(token, { q: busca, limit: 20 });
      setProponenteSugestoes(result.itens);
      setProponenteCadastro((prev) => ({
        ...prev,
        cnpj_selecionado: result.itens[0]?.cnpj ?? ""
      }));

      if (result.itens.length === 0) {
        setMessage("Nenhum proponente encontrado na base do Transferegov para o termo informado.");
      } else {
        setMessage(`${result.itens.length} proponente(s) encontrado(s) na base do Transferegov.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao buscar proponentes na base do Transferegov.");
    } finally {
      setIsLoadingProponenteSugestoes(false);
    }
  };

  const onAddProponenteAtendido = async () => {
    if (!token || !canManageInstruments) {
      return;
    }

    const selected = proponenteSugestoes.find((item) => item.cnpj === proponenteCadastro.cnpj_selecionado);
    if (!selected) {
      setMessage("Selecione um proponente da lista para adicionar.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const created = await createProponenteFromBase(token, {
        cnpj: selected.cnpj,
        nome_proponente: selected.nome_proponente,
        uf: selected.uf ?? undefined,
        cidade: selected.cidade ?? undefined
      });

      await Promise.all([loadProponentes(), loadInstruments(), loadDashboard()]);

      const resumo = created.importacao;
      if (resumo) {
        setMessage(
          `Proponente ${selected.nome_proponente} adicionado(a). Importacao automatica: ${resumo.criados} criado(s), ${resumo.atualizados} atualizado(s), ${resumo.ignorados} ignorado(s), ${resumo.erros} erro(s).`
        );
      } else {
        setMessage(`Proponente ${selected.nome_proponente} adicionado(a) com sucesso.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao adicionar proponente.");
    } finally {
      setIsBusy(false);
    }
  };

  const onDeleteProponente = async (id: number) => {
    if (!token || !canDeleteProponentes) {
      return;
    }

    if (!window.confirm("Confirma excluir este proponente da lista de atendimento?")) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await deleteProponente(token, id);
      await loadProponentes();
      setMessage("Proponente excluido com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao remover proponente.");
    } finally {
      setIsBusy(false);
    }
  };

  const onUploadProponenteLogoFile = async (item: Proponente, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !token || !canManageInstruments) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await uploadProponenteLogo(token, item.id, file);
      await loadProponentes();
      setMessage(`Imagem do proponente ${item.nome} atualizada com sucesso.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao enviar imagem do proponente.");
    } finally {
      setIsBusy(false);
    }
  };

  const onRemoveProponenteLogo = async (item: Proponente) => {
    if (!token || !canManageInstruments) {
      return;
    }

    if (!item.logo_url) {
      setMessage("Este proponente ainda nao possui imagem anexada.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await removeProponenteLogo(token, item.id);
      await loadProponentes();
      setMessage(`Imagem do proponente ${item.nome} removida com sucesso.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao remover imagem do proponente.");
    } finally {
      setIsBusy(false);
    }
  };

  const onUploadProponenteTimbreFile = async (item: Proponente, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !token || !canManageInstruments) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await uploadProponenteTimbre(token, item.id, file);
      await loadProponentes();
      setMessage(`Timbre do proponente ${item.nome} atualizado com sucesso.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao enviar timbre do proponente.");
    } finally {
      setIsBusy(false);
    }
  };

  const onRemoveProponenteTimbre = async (item: Proponente) => {
    if (!token || !canManageInstruments) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await removeProponenteTimbre(token, item.id);
      await loadProponentes();
      setMessage(`Timbre do proponente ${item.nome} removido com sucesso.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao remover timbre do proponente.");
    } finally {
      setIsBusy(false);
    }
  };

  const onBuscarDadosCnpj = async () => {
    if (!token || !proponenteEditForm.cnpj) {
      setMessage("Informe o CNPJ para buscar os dados.");
      return;
    }
    const cnpjNumerico = proponenteEditForm.cnpj.replace(/\D/g, "");
    if (cnpjNumerico.length !== 14) {
      setMessage("CNPJ inválido. Deve ter 14 dígitos.");
      return;
    }
    setIsLoadingCnpjConsulta(true);
    try {
      const dados = await consultaCnpj(token, cnpjNumerico);
      console.log("[Frontend] Dados recebidos:", dados);
      setProponenteEditForm((prev) => ({
        ...prev,
        nome: dados.nome || prev.nome,
        endereco: dados.logradouro || prev.endereco,
        numero: dados.numero || "",
        complemento: dados.complemento || "",
        bairro: dados.bairro || prev.bairro,
        cep: dados.cep || prev.cep,
        cidade: dados.cidade || prev.cidade,
        uf: dados.uf || prev.uf,
        tel: dados.telefone || prev.tel,
        email: dados.email || prev.email
      }));
      setMessage("Dados carregados com sucesso!");
      setMessage("Dados encontrados e preenchidos automaticamente!");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao buscar dados do CNPJ.");
    } finally {
      setIsLoadingCnpjConsulta(false);
    }
  };

const onSaveProponente = async () => {
    if (!token || !editingProponente) return;
    setIsBusy(true);
    try {
      await updateConvenete(token, editingProponente.id, {
        nome: proponenteEditForm.nome || undefined,
        cnpj: proponenteEditForm.cnpj || undefined,
        endereco: proponenteEditForm.endereco || undefined,
        bairro: proponenteEditForm.bairro || undefined,
        cep: proponenteEditForm.cep || undefined,
        cidade: proponenteEditForm.cidade || undefined,
        uf: proponenteEditForm.uf || undefined,
        tel: proponenteEditForm.tel || undefined,
        email: proponenteEditForm.email || undefined,
        gestorNome: proponenteEditForm.gestorNome || null,
        gestorCpf: proponenteEditForm.gestorCpf || null,
        gestorRg: proponenteEditForm.gestorRg || null,
        gestorEndereco: proponenteEditForm.gestorEndereco || null,
        gestorEmail: proponenteEditForm.gestorEmail || null
      });
      setMessage("Dados atualizados com sucesso!");
      await loadProponentes();
      setShowProponenteEditModal(false);
      setEditingProponente(null);
      setMessage("Dados atualizados com sucesso!");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao salvar dados.");
    } finally {
      setIsBusy(false);
    }
  };

  const onReimportProponenteInstrumentos = async (item: Proponente) => {
    if (!token || !canManageInstruments) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const result = await reimportarInstrumentosProponente(token, item.id);
      await Promise.all([loadInstruments(), loadDashboard()]);
      setMessage(
        `Reimportacao de ${item.nome}: ${result.importacao.criados} criado(s), ${result.importacao.atualizados} atualizado(s), ${result.importacao.ignorados} ignorado(s), ${result.importacao.erros} erro(s).`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao reimportar instrumentos do proponente.");
    } finally {
      setIsBusy(false);
    }
  };

  const onReimportTodosProponentesInstrumentos = async () => {
    if (!token || !canManageInstruments) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const result = await reimportarInstrumentosTodosProponentes(token);
      setProponentesImportProgress(result);
      setMessage(result.message ?? "Sincronizacao em lote iniciada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao reimportar instrumentos de todos os proponentes.");
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (!token || proponentesImportProgress?.status !== "running") {
      return;
    }

    const intervalId = window.setInterval(() => {
      void getReimportarInstrumentosTodosStatus(token)
        .then(async (status) => {
          setProponentesImportProgress(status);
          if (status.status === "completed") {
            await Promise.all([loadInstruments(), loadDashboard()]);
            setMessage(
              `Reimportacao em lote concluida (${status.total_proponentes} proponente(s)): ${status.criados} criado(s), ${status.atualizados} atualizado(s), ${status.ignorados} ignorado(s), ${status.erros} erro(s).`
            );
          } else if (status.status === "error") {
            setMessage(status.message ?? "Falha ao reimportar instrumentos de todos os proponentes.");
          }
        })
        .catch(() => undefined);
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, [proponentesImportProgress?.status, token]);

  const onChangeAdminUserForm = <K extends keyof AdminUserForm>(field: K, value: AdminUserForm[K]) => {
    setAdminUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const clearAdminUserForm = () => {
    setEditingManagedUserId(null);
    setAdminUserForm(emptyAdminUserForm());
  };

  const onEditManagedUser = (item: ManagedUser) => {
    setEditingManagedUserId(item.id);
    setAdminUserForm({
      nome: item.nome,
      email: item.email,
      senha: "",
      role: item.role,
      proponente_ids: item.proponentes.map((proponente) => String(proponente.id))
    });
    setMessage(`Editando usuario #${item.id}.`);
  };

  const onSaveManagedUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !isAdmin) {
      return;
    }

    if (adminUserForm.nome.trim() === "" || adminUserForm.email.trim() === "") {
      setMessage("Preencha nome e email do usuario.");
      return;
    }

    if (editingManagedUserId === null && adminUserForm.senha.trim().length < 6) {
      setMessage("Informe uma senha com pelo menos 6 caracteres.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      if (editingManagedUserId === null) {
        await createUserAdmin(token, {
          nome: adminUserForm.nome.trim(),
          email: adminUserForm.email.trim(),
          senha: adminUserForm.senha,
          role: adminUserForm.role,
          proponente_ids: adminUserForm.proponente_ids.map(Number)
        });
        setMessage("Usuario criado com sucesso.");
      } else {
        await updateUserAdmin(token, editingManagedUserId, {
          nome: adminUserForm.nome.trim(),
          email: adminUserForm.email.trim(),
          role: adminUserForm.role,
          senha: adminUserForm.senha.trim() === "" ? undefined : adminUserForm.senha,
          proponente_ids: adminUserForm.proponente_ids.map(Number)
        });
        setMessage("Usuario atualizado com sucesso.");
      }

      clearAdminUserForm();
      await loadManagedUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar usuario.");
    } finally {
      setIsBusy(false);
    }
  };

  const onChangeAdminUserProponentes = (event: ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
    onChangeAdminUserForm("proponente_ids", selected);
  };

  const onChangePaymentTax = (
    taxKey: PaymentTaxKey,
    field: "selecionado" | "valor" | "aliquota",
    value: boolean | string
  ) => {
    setPaymentForm((prev) => ({
      ...prev,
      impostos: {
        ...prev.impostos,
        [taxKey]: {
          ...prev.impostos[taxKey],
          [field]: value
        }
      }
    }));
  };

  const onSubmitPaymentRequest = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !canCreatePaymentRequest) {
      return;
    }

    const instrumentId = Number(paymentForm.instrumento_id);
    if (!instrumentId) {
      setMessage("Selecione o instrumento para solicitar o pagamento.");
      return;
    }

    if (paymentForm.numero_bm.trim() === "") {
      setMessage("Informe o numero do BM.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await createPaymentRequest(token, {
        instrumento_id: instrumentId,
        valor_nota: parsePaymentCurrencyInput(paymentForm.valor_nota),
        valor_bm: parsePaymentCurrencyInput(paymentForm.valor_bm),
        numero_bm: paymentForm.numero_bm.trim(),
        impostos: {
          inss: {
            selecionado: paymentForm.impostos.inss.selecionado,
            valor: parsePaymentCurrencyInput(paymentForm.impostos.inss.valor),
            aliquota: Number(paymentForm.impostos.inss.aliquota || 0)
          },
          iss: {
            selecionado: paymentForm.impostos.iss.selecionado,
            valor: parsePaymentCurrencyInput(paymentForm.impostos.iss.valor),
            aliquota: Number(paymentForm.impostos.iss.aliquota || 0)
          },
          pis: {
            selecionado: paymentForm.impostos.pis.selecionado,
            valor: parsePaymentCurrencyInput(paymentForm.impostos.pis.valor),
            aliquota: Number(paymentForm.impostos.pis.aliquota || 0)
          },
          cofins: {
            selecionado: paymentForm.impostos.cofins.selecionado,
            valor: parsePaymentCurrencyInput(paymentForm.impostos.cofins.valor),
            aliquota: Number(paymentForm.impostos.cofins.aliquota || 0)
          },
          ir: {
            selecionado: paymentForm.impostos.ir.selecionado,
            valor: parsePaymentCurrencyInput(paymentForm.impostos.ir.valor),
            aliquota: Number(paymentForm.impostos.ir.aliquota || 0)
          }
        },
        observacoes: paymentForm.observacoes.trim() || undefined,
        nota_fiscal: paymentForm.nota_fiscal,
        empenho: paymentForm.empenho
      });
      setPaymentForm(emptyPaymentForm());
      setShowPaymentCreateForm(false);
      await loadPaymentRequests();
      setMessage("Solicitacao de pagamento registrada com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao solicitar pagamento.");
    } finally {
      setIsBusy(false);
    }
  };

  const onApplyPaymentFilters = async () => {
    setIsBusy(true);
    setMessage("");
    try {
      await loadPaymentRequests();
      setMessage("Pagamentos atualizados com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao listar pagamentos.");
    } finally {
      setIsBusy(false);
    }
  };

  const onUpdatePaymentStatus = async (item: PaymentRequestItem, status: PaymentRequestStatus) => {
    if (!token || !canManageInstruments) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await updatePaymentRequestStatus(token, item.id, status);
      await Promise.all([loadPaymentRequests(), loadPaymentInstruments()]);
      setMessage("Status do pagamento atualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar pagamento.");
    } finally {
      setIsBusy(false);
    }
  };

  const onOpenPaymentPreview = async (
    item: PaymentRequestItem,
    tipo: "nota_fiscal" | "empenho",
    fallbackName: string
  ) => {
    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const blob = await getPaymentRequestFileBlob(token, item.id, tipo);
      const url = URL.createObjectURL(blob);
      setPaymentPreview({
        item,
        tipo,
        url,
        nome: fallbackName,
        mimeType: blob.type
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao abrir arquivo.");
    } finally {
      setIsBusy(false);
    }
  };

  const onClosePaymentPreview = () => {
    if (paymentPreview) {
      URL.revokeObjectURL(paymentPreview.url);
    }
    setPaymentPreview(null);
  };

  const onDownloadPaymentPreview = async () => {
    if (!token || !paymentPreview) {
      return;
    }

    await downloadPaymentRequestFile(token, paymentPreview.item.id, paymentPreview.tipo, paymentPreview.nome);
  };

  const onApplyObraReportFilters = async () => {
    setIsBusy(true);
    setMessage("");
    try {
      await loadObraReport();
      setMessage("Relatorio de obras atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao gerar relatorio de obras.");
    } finally {
      setIsBusy(false);
    }
  };

  const onSeedDemoData = async () => {
    if (!token || !isAdmin) {
      return;
    }

    if (!window.confirm("Isso vai recriar os 10 instrumentos demo e seus repasses. Deseja continuar?")) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const result = await seedDemoDataAdmin(token);
      await refreshData();
      setMessage(`${result.message} Instrumentos: ${result.instrumentos}. Repasses: ${result.repasses}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar dados demo.");
    } finally {
      setIsBusy(false);
    }
  };

  const onApplyTicketFilters = async () => {
    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadTickets();
      setSelectedTicket(null);
      setMessage("Tickets atualizados com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao listar tickets.");
    } finally {
      setIsBusy(false);
    }
  };

  const onChangeTicketBoardTab = (tab: TicketBoardTab) => {
    setTicketBoardTab(tab);
    if (selectedTicket) {
      const willBeVisible =
        tab === "abertos"
          ? selectedTicket.status === "ABERTO" || selectedTicket.status === "EM_ANDAMENTO"
          : tab === "resolvidos"
            ? selectedTicket.status === "RESOLVIDO"
            : selectedTicket.status === "CANCELADO";
      if (!willBeVisible) {
        setSelectedTicket(null);
      }
    }
  };

  const onClearTicketFilters = async () => {
    const next = emptyTicketFilters();
    setTicketFilters(next);
    setSelectedTicket(null);
    if (token) {
      try {
        await loadTickets(token, next);
      } catch {
        // ignored
      }
    }
  };

  const onFilterMyTickets = async () => {
    if (!user) {
      return;
    }

    const next = {
      ...ticketFilters,
      responsavel_user_id: String(user.id)
    };
    setTicketFilters(next);

    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadTickets(token, next);
      setSelectedTicket(null);
      setMessage("Filtro aplicado: meus tickets.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao filtrar meus tickets.");
    } finally {
      setIsBusy(false);
    }
  };

  const onCreateTicket = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !canManageInstruments) {
      return;
    }

    if (ticketForm.titulo.trim().length < 3) {
      setMessage("Informe um titulo com pelo menos 3 caracteres.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const created = await createTicket(token, {
        titulo: ticketForm.titulo.trim(),
        descricao: ticketForm.descricao.trim() === "" ? undefined : ticketForm.descricao.trim(),
        prioridade: ticketForm.prioridade,
        prazo_alvo: ticketForm.prazo_alvo.trim() === "" ? undefined : ticketForm.prazo_alvo,
        instrument_id: ticketForm.instrument_id.trim() === "" ? undefined : Number(ticketForm.instrument_id),
        instrumento_informado:
          ticketForm.instrumento_informado.trim() === "" ? undefined : ticketForm.instrumento_informado.trim(),
        responsavel_user_id:
          ticketForm.responsavel_user_id.trim() === "" ? undefined : Number(ticketForm.responsavel_user_id)
      });

      setTicketForm(emptyTicketForm());
      setTickets((prev) => [created, ...prev]);
      setSelectedTicket(created);
      setShowTicketCreateModal(false);
      setMessage(`Ticket ${created.codigo} criado com sucesso.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao criar ticket.");
    } finally {
      setIsBusy(false);
    }
  };

  const onSelectTicket = async (id: number, syncUrl = true) => {
    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const full = await getTicketById(token, id);
      setSelectedTicket(full);
      setTicketIdFromUrl(id);
      setTicketResolutionReason(full.motivo_resolucao ?? "");
      if (syncUrl) {
        const nextUrl = `/tickets?ticket=${id}`;
        if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
          window.history.pushState({}, "", nextUrl);
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar ticket.");
    } finally {
      setIsBusy(false);
    }
  };

  const onCloseTicketDetail = () => {
    setSelectedTicket(null);
    setTicketIdFromUrl(null);
    setTicketResolutionReason("");
    setTicketCommentText("");
    if (`${window.location.pathname}${window.location.search}` !== "/tickets") {
      window.history.pushState({}, "", "/tickets");
    }
  };

  const onUpdateTicketStatus = async (id: number, status: TicketStatus) => {
    if (!token || !canManageInstruments) {
      return;
    }

    const currentStatus = selectedTicket?.id === id ? selectedTicket.status : tickets.find((item) => item.id === id)?.status;
    const isReopening =
      currentStatus === "RESOLVIDO" && (status === "ABERTO" || status === "EM_ANDAMENTO");
    if (isReopening && !isAdmin) {
      setMessage("Somente ADMIN pode reabrir ticket resolvido.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      if (status === "RESOLVIDO" && ticketResolutionReason.trim().length < 8) {
        setMessage("Informe um motivo de resolucao com pelo menos 8 caracteres.");
        setIsBusy(false);
        return;
      }

      const updated = await updateTicket(token, id, {
        status,
        motivo_resolucao: status === "RESOLVIDO" ? ticketResolutionReason.trim() : undefined
      });
      setTickets((prev) => moveUpdatedTicketToTop(prev, updated));
      if (selectedTicket?.id === id) {
        setSelectedTicket(updated);
        if (status !== "RESOLVIDO") {
          setTicketResolutionReason("");
        }
      }
      if (status === "RESOLVIDO") {
        setTicketBoardTab("resolvidos");
      } else if (status === "CANCELADO") {
        setTicketBoardTab("cancelados");
      } else {
        setTicketBoardTab("abertos");
      }
      setMessage(`Ticket ${updated.codigo} atualizado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar status do ticket.");
    } finally {
      setIsBusy(false);
    }
  };

  const onUpdateTicketPriority = async (id: number, prioridade: TicketPriority) => {
    if (!token || !canManageInstruments) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const updated = await updateTicket(token, id, { prioridade });
      setTickets((prev) => moveUpdatedTicketToTop(prev, updated));
      if (selectedTicket?.id === id) {
        setSelectedTicket(updated);
      }
      setMessage(`Prioridade atualizada no ticket ${updated.codigo}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar prioridade.");
    } finally {
      setIsBusy(false);
    }
  };

  const onUpdateTicketDueDate = async (id: number, prazoAlvo: string) => {
    if (!token || !canManageInstruments) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const updated = await updateTicket(token, id, { prazo_alvo: prazoAlvo.trim() === "" ? null : prazoAlvo });
      setTickets((prev) => moveUpdatedTicketToTop(prev, updated));
      if (selectedTicket?.id === id) {
        setSelectedTicket(updated);
      }
      setMessage(`Prazo alvo atualizado no ticket ${updated.codigo}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar prazo alvo.");
    } finally {
      setIsBusy(false);
    }
  };

  const onAssignTicket = async (id: number, responsavelUserId: string) => {
    if (!token || !canManageInstruments) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const updated = await updateTicket(token, id, {
        responsavel_user_id: responsavelUserId.trim() === "" ? null : Number(responsavelUserId)
      });
      setTickets((prev) => moveUpdatedTicketToTop(prev, updated));
      if (selectedTicket?.id === id) {
        setSelectedTicket(updated);
      }
      setMessage(`Responsavel atualizado no ticket ${updated.codigo}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atribuir responsavel.");
    } finally {
      setIsBusy(false);
    }
  };

  const onAddTicketComment = async () => {
    if (!token || !selectedTicket || !canManageInstruments) {
      return;
    }

    if (ticketCommentText.trim().length < 2) {
      setMessage("Comentario deve ter pelo menos 2 caracteres.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const updated = await addTicketComment(token, selectedTicket.id, ticketCommentText.trim());
      setSelectedTicket(updated);
      setTickets((prev) => moveUpdatedTicketToTop(prev, updated));
      setTicketCommentText("");
      setMessage("Comentario registrado no ticket.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao registrar comentario.");
    } finally {
      setIsBusy(false);
    }
  };

  const onToggleTicketChecklistItem = async (ticketId: number, itemId: number, concluido: boolean) => {
    if (!token || !canManageInstruments) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const { toggleTicketChecklistItem: toggleFn } = await import("./api");
      const updated = await toggleFn(token, ticketId, itemId, concluido);
      setSelectedTicket(updated);
      setTickets((prev) => moveUpdatedTicketToTop(prev, updated));
      setMessage(concluido ? "Item marcado como concluido." : "Item marcado como pendente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar checklist do ticket.");
    } finally {
      setIsBusy(false);
    }
  };

  const onSyncRepassesFromDesembolsos = async () => {
    if (!token || !profileInstrument) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const updatedWithRepasses = await withLoadedRepasses(token, profileInstrument);
      setInstruments((prev) => prev.map((item) => (item.id === updatedWithRepasses.id ? updatedWithRepasses : item)));
      setSelectedInstrument(updatedWithRepasses);
      setReportData(null);
      setObraReportData(null);
      setMessage("Lista de repasses sincronizada automaticamente pelos desembolsos.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao sincronizar repasses automaticamente.");
    } finally {
      setIsBusy(false);
    }
  };

  const onSyncWorkProgressFromTransferegov = async () => {
    if (!token || !profileInstrument) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const { syncWorkProgressFromTransferegov: syncFn } = await import("./api");
      await syncFn(token, profileInstrument.id);
      await loadWorkProgress(profileInstrument.id);
      setObraReportData(null);
      setMessage("Acompanhamento de obra sincronizado com o Transferegov.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao sincronizar acompanhamento com o Transferegov.");
    } finally {
      setIsBusy(false);
    }
  };

  const onSaveEmpresaVencedora = async () => {
    if (!token || !profileInstrument || !canManageInstruments) {
      return;
    }

    const empresa = empresaVencedoraNomeInput.trim();
    const cnpj = empresaVencedoraCnpjInput.trim();
    const valorVencedor = parseCurrencyInput(empresaVencedoraValorInput);

    if (empresa === "") {
      setMessage("Informe a empresa vencedora.");
      return;
    }

    if (cnpj === "") {
      setMessage("Informe o CNPJ da empresa vencedora.");
      return;
    }

    if (Number.isNaN(valorVencedor) || valorVencedor <= 0) {
      setMessage("Informe o valor vencedor em reais.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const updated = await updateInstrument(token, profileInstrument.id, {
        empresa_vencedora: empresa,
        cnpj_vencedora: cnpj,
        valor_vencedor: valorVencedor,
        orgao_executor: `${empresa} - ${cnpj}`
      });
      const updatedWithRepasses = await withLoadedRepasses(token, updated);
      setInstruments((prev) => prev.map((item) => (item.id === updatedWithRepasses.id ? updatedWithRepasses : item)));
      setSelectedInstrument(updatedWithRepasses);
      setMessage("Dados da empresa vencedora salvos com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar empresa vencedora.");
    } finally {
      setIsBusy(false);
    }
  };

  const onLoadSolicitacoesCaixa = async () => {
    if (!token || instrumentPageId === null) return;
    setSolicitacoesCaixaLoading(true);
    try {
      const result = await listSolicitacoesCaixa(token, instrumentPageId);
      setSolicitacoesCaixaItens(result.itens);
    } catch (error) {
      setMessage("Falha ao carregar solicitacoes.");
    } finally {
      setSolicitacoesCaixaLoading(false);
    }
  };


  const onNotifyTransferenciasDiscricionariasChanges = async () => {
    if (!token || !canManageInstruments) {
      return;
    }

    setIsNotifyingTransferenciasDiscricionariasChanges(true);
    setMessage("");
    try {
      const result: TransferenciaDiscricionariaChangesNotifyResult =
        await triggerTransferenciasDiscricionariasChangesNotification(token);
      setMessage(
        `${result.mensagem} Alteracoes: ${result.total_alteracoes}. Pagamentos: ${result.pagamentos_alterados}. ` +
          `Desembolsos novos: ${result.novos_desembolsos}. Desembolsos atualizados: ${result.desembolsos_atualizados}.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao disparar notificacoes de alteracoes financeiras.");
    } finally {
      setIsNotifyingTransferenciasDiscricionariasChanges(false);
    }
  };


  const onLoadGeracaoDocumentosData = async () => {
    if (!token) return;
    setIsLoadingGeracaoDocumentos(true);
    try {
      const [templatesRes, responsaveisRes, logsRes] = await Promise.all([
        listDocumentoGeracaoTemplates(token),
        listDocumentoGeracaoresponsaveis(token),
        listDocumentoGeracaoLogs(token)
      ]);
      setGeracaoDocumentosTemplates(templatesRes.items);
      setGeracaoDocumentosResponsaveis(responsaveisRes.items);
      setGeracaoDocumentosLogs(logsRes.items);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar dados do gerador.");
    } finally {
      setIsLoadingGeracaoDocumentos(false);
    }
  };

  const onSaveGeracaoDocumentoTemplate = async () => {
    if (!token || !geracaoDocumentoTemplateForm.codigo || !geracaoDocumentoTemplateForm.nome || !geracaoDocumentoTemplateForm.arquivo) {
      setMessage("Preencha o código, nome e selecione um arquivo.");
      return;
    }
    try {
      await createDocumentoGeracaoTemplate(token, {
        codigo: geracaoDocumentoTemplateForm.codigo,
        nome: geracaoDocumentoTemplateForm.nome,
        descricao: geracaoDocumentoTemplateForm.descricao || undefined,
        tipo: geracaoDocumentoTemplateForm.tipo,
        arquivo: geracaoDocumentoTemplateForm.arquivo
      });
      setShowGeracaoDocumentoTemplateModal(false);
      setGeracaoDocumentoTemplateForm({ codigo: "", nome: "", descricao: "", tipo: "DECLARACAO", arquivo: null });
      setMessage("Template criado com sucesso!");
      void onLoadGeracaoDocumentosData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao criar template.");
    }
  };

  const onDeleteGeracaoDocumentoTemplate = async (id: number) => {
    if (!token || !confirm("Tem certeza que deseja excluir este template?")) return;
    try {
      await deleteDocumentoGeracaoTemplate(token, id);
      setMessage("Template excluído.");
      void onLoadGeracaoDocumentosData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao excluir template.");
    }
  };

  const onEditGeracaoDocumentoTemplate = (template: DocumentoGeracaoTemplate) => {
    setGeracaoDocumentoTemplateEdit({
      id: template.id,
      nome: template.nome,
      descricao: template.descricao || "",
      tipo: template.tipo,
      arquivo: null
    });
  };

  const onSaveGeracaoDocumentoTemplateEdit = async () => {
    if (!token || !geracaoDocumentoTemplateEdit) return;
    try {
      if (geracaoDocumentoTemplateEdit.arquivo) {
        await updateDocumentoGeracaoTemplate(token, geracaoDocumentoTemplateEdit.id, {
          nome: geracaoDocumentoTemplateEdit.nome,
          descricao: geracaoDocumentoTemplateEdit.descricao || undefined,
          tipo: geracaoDocumentoTemplateEdit.tipo,
          arquivo: geracaoDocumentoTemplateEdit.arquivo
        });
      } else {
        await updateDocumentoGeracaoTemplate(token, geracaoDocumentoTemplateEdit.id, {
          nome: geracaoDocumentoTemplateEdit.nome,
          descricao: geracaoDocumentoTemplateEdit.descricao || undefined,
          tipo: geracaoDocumentoTemplateEdit.tipo
        });
      }
      setGeracaoDocumentoTemplateEdit(null);
      setMessage("Template atualizado!");
      void onLoadGeracaoDocumentosData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao atualizar template.");
    }
  };

  const onSaveGeracaoDocumentoResponsavel = async () => {
    if (!token || !geracaoDocumentoResponsavelForm.nome || !geracaoDocumentoResponsavelForm.cpf || !geracaoDocumentoResponsavelForm.crea || !geracaoDocumentoResponsavelForm.cargo) {
      setMessage("Preencha todos os campos.");
      return;
    }
    try {
      await createDocumentoGeracaoResponsavel(token, geracaoDocumentoResponsavelForm);
      setShowGeracaoDocumentoResponsavelModal(false);
      setGeracaoDocumentoResponsavelForm({ nome: "", cpf: "", crea: "", cargo: "" });
      setMessage("Responsável técnico criado!");
      void onLoadGeracaoDocumentosData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao criar responsável.");
    }
  };

  const onDeleteGeracaoDocumentoResponsavel = async (id: number) => {
    if (!token || !confirm("Tem certeza que deseja excluir este responsável?")) return;
    try {
      await deleteDocumentoGeracaoResponsavel(token, id);
      setMessage("Responsável excluído.");
      void onLoadGeracaoDocumentosData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao excluir responsável.");
    }
  };


  const onOpenTicketFromSolicitacao = async (ticketId: number) => {
    if (!token) return;
    try {
      const fullTicket = await getTicketById(token, ticketId);
      setSelectedTicket(fullTicket);
      setShowTicketModalFromSolicitacao(true);
    } catch (error) {
      setMessage("Falha ao carregar detalhes do ticket.");
    }
  };

  const onSearchTicketInstrument = async (q: string) => {
    setTicketInstrumentSearch(q);
    if (q.length < 2) {
      setTicketInstrumentResults([]);
      return;
    }
    setTicketInstrumentSearching(true);
    try {
      const results = await searchInstrumentos(token, q);
      setTicketInstrumentResults(results);
    } catch {
      setTicketInstrumentResults([]);
    } finally {
      setTicketInstrumentSearching(false);
    }
  };

  const onAssociateTicketInstrument = async (instrumentId: number) => {
    if (!token || !selectedTicket) return;
    setIsBusy(true);
    setMessage("");
    try {
      const result = await associateTicketInstrument(token, selectedTicket.id, instrumentId);
      setSelectedTicket(result.ticket);
      setTickets((prev) => moveUpdatedTicketToTop(prev, result.ticket));
      setTicketInstrumentSearch("");
      setTicketInstrumentResults([]);
      setMessage("Instrumento associado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao associar instrumento.");
    } finally {
      setIsBusy(false);
    }
  };

  const onDissociateTicketInstrument = async () => {
    if (!token || !selectedTicket) return;
    setIsBusy(true);
    setMessage("");
    try {
      const result = await dissociateTicketInstrument(token, selectedTicket.id);
      setSelectedTicket(result.ticket);
      setTickets((prev) => moveUpdatedTicketToTop(prev, result.ticket));
      setMessage("Instrumento desassociado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao desassociar instrumento.");
    } finally {
      setIsBusy(false);
    }
  };

  const onSaveEmendaEstadual = async () => {
    if (!token || !canManageInstruments) {
      return;
    }

    if (emendaEstadualForm.municipio_ids.length === 0) {
      setMessage("Selecione ao menos um municipio atendido.");
      return;
    }

    const payload = {
      objeto: emendaEstadualForm.objeto.trim(),
      numero: emendaEstadualForm.numero.trim(),
      parlamentar: emendaEstadualForm.parlamentar.trim(),
      vigencia_inicio: emendaEstadualForm.vigencia_inicio,
      vigencia_fim: emendaEstadualForm.vigencia_fim,
      valor: parseCurrencyInput(emendaEstadualForm.valor),
      contrapartida: parseCurrencyInput(emendaEstadualForm.contrapartida),
      municipio_ids: emendaEstadualForm.municipio_ids.map((item) => Number(item))
    };

    if (!payload.objeto || !payload.numero || !payload.parlamentar) {
      setMessage("Preencha objeto, numero e parlamentar.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      if (editingEmendaEstadualId) {
        await updateEmendaEstadual(token, editingEmendaEstadualId, payload);
        setMessage("Emenda estadual atualizada com sucesso.");
      } else {
        await createEmendaEstadual(token, payload);
        setMessage("Emenda estadual cadastrada com sucesso.");
      }
      setEmendaEstadualForm(emptyEmendaEstadualForm());
      setEditingEmendaEstadualId(null);
      await loadEmendasEstaduais();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar emenda estadual.");
    } finally {
      setIsBusy(false);
    }
  };

  const onEditEmendaEstadual = (item: EmendaEstadualItem) => {
    setEditingEmendaEstadualId(item.id);
    setEmendaEstadualForm({
      objeto: item.objeto,
      numero: item.numero,
      parlamentar: item.parlamentar,
      vigencia_inicio: item.vigencia_inicio,
      vigencia_fim: item.vigencia_fim,
      valor: formatCurrencyInput(item.valor),
      contrapartida: formatCurrencyInput(item.contrapartida),
      municipio_ids: item.municipios.map((m) => String(m.id))
    });
  };

  const onDeleteEmendaEstadual = async (id: number) => {
    if (!token || !canManageInstruments) {
      return;
    }

    if (!window.confirm("Confirma excluir esta emenda estadual?")) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await deleteEmendaEstadual(token, id);
      await loadEmendasEstaduais();
      setMessage("Emenda estadual removida com sucesso.");
      if (editingEmendaEstadualId === id) {
        setEditingEmendaEstadualId(null);
        setEmendaEstadualForm(emptyEmendaEstadualForm());
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao remover emenda estadual.");
    } finally {
      setIsBusy(false);
    }
  };

  const onToggleEmendaDocumentos = async (emendaId: number) => {
    setExpandedEmendaDocumentosId(emendaId);
    setEmendaIdFromUrl(emendaId);
    setActiveView("emendas_estaduais");
    if (!emendaDocumentosByEmenda[emendaId]) {
      try {
        await loadEmendaDocumentos(emendaId);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Falha ao carregar documentos da emenda.");
      }
    }
  };

  const onBackToEmendasList = () => {
    setExpandedEmendaDocumentosId(null);
    setEmendaIdFromUrl(null);
    if (`${window.location.pathname}${window.location.search}` !== "/emendas-estaduais") {
      window.history.pushState({}, "", "/emendas-estaduais");
    }
  };

  const onUploadEmendaDocumentos = async (emendaId: number) => {
    if (!token || !canManageInstruments) {
      return;
    }
    const files = emendaUploadFilesByEmenda[emendaId] ?? [];
    if (files.length === 0) {
      setMessage("Selecione ao menos um arquivo para anexar.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await uploadEmendaEstadualDocumentos(token, emendaId, files);
      setEmendaUploadFilesByEmenda((prev) => ({ ...prev, [emendaId]: [] }));
      await loadEmendaDocumentos(emendaId);
      setMessage("Documentos anexados com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao anexar documentos da emenda.");
    } finally {
      setIsBusy(false);
    }
  };

  const onReplaceEmendaDocumento = async (emendaId: number, documentoId: number, file: File | null) => {
    if (!token || !canManageInstruments || !file) {
      return;
    }
    setIsBusy(true);
    setMessage("");
    try {
      await updateEmendaEstadualDocumento(token, emendaId, documentoId, file);
      await loadEmendaDocumentos(emendaId);
      setMessage("Documento substituido com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao substituir documento.");
    } finally {
      setIsBusy(false);
    }
  };

  const onDeleteEmendaDocumento = async (emendaId: number, documentoId: number) => {
    if (!token || !canManageInstruments) {
      return;
    }
    if (!window.confirm("Deseja remover este documento?")) {
      return;
    }
    setIsBusy(true);
    setMessage("");
    try {
      await deleteEmendaEstadualDocumento(token, emendaId, documentoId);
      await loadEmendaDocumentos(emendaId);
      setMessage("Documento removido com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao remover documento.");
    } finally {
      setIsBusy(false);
    }
  };

  const onDownloadEmendaDocumento = async (emendaId: number, documentoId: number, nomeArquivo: string) => {
    if (!token) {
      return;
    }
    try {
      await downloadEmendaEstadualDocumento(token, emendaId, documentoId, nomeArquivo);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao baixar documento.");
    }
  };

  const onUploadMyAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !token) {
      return;
    }

    setIsUploadingAvatar(true);
    setMessage("");
    try {
      const updated = await uploadMyAvatar(token, file);
      persistAuth(token, updated);
      setMessage("Avatar atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar avatar.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onRemoveMyAvatar = async () => {
    if (!token || !user?.avatar_url) {
      return;
    }

    setIsUploadingAvatar(true);
    setMessage("");
    try {
      await removeMyAvatar(token);
      persistAuth(token, { ...user, avatar_url: null });
      setMessage("Avatar removido com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao remover avatar.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const renderInstrumentForm = () => (
    <div className="card editor-card">
      <h3>{editingId ? `Editar instrumento #${editingId}` : "Novo instrumento"}</h3>
      <form className="form-grid" onSubmit={onSaveInstrument}>
        <div className="filters-grid columns-4">
          <label>
            Proposta *
            <input value={form.proposta} onChange={(e) => onChangeForm("proposta", e.target.value)} required />
          </label>
          <label>
            Instrumento *
            <input value={form.instrumento} onChange={(e) => onChangeForm("instrumento", e.target.value)} required />
          </label>
          <label>
            Concedente *
            <input value={form.concedente} onChange={(e) => onChangeForm("concedente", e.target.value)} required />
          </label>
          <label>
            Banco
            <input
              value={form.banco}
              onChange={(e) => onChangeForm("banco", e.target.value)}
              placeholder="Ex.: Banco do Brasil"
            />
          </label>
          <label>
            Agencia
            <input
              value={form.agencia}
              onChange={(e) => onChangeForm("agencia", e.target.value)}
              placeholder="Ex.: 1234"
            />
          </label>
          <label>
            Conta
            <input
              value={form.conta}
              onChange={(e) => onChangeForm("conta", e.target.value)}
              placeholder="Ex.: 56789-0"
            />
          </label>
          <label>
            Proponente
            <select value={form.proponente_id} onChange={(e) => onChangeForm("proponente_id", e.target.value)}>
              <option value="">Nao associado</option>
              {proponentes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo de fluxo *
            <select
              value={form.fluxo_tipo}
              onChange={(e) => onChangeForm("fluxo_tipo", e.target.value as InstrumentFlowType)}
            >
              {FLOW_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {FLOW_TYPE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status *
            <select value={form.status} onChange={(e) => onChangeForm("status", e.target.value as InstrumentStatus)}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            Valor repasse *
            <input
              type="text"
              inputMode="numeric"
              className="currency-input"
              value={form.valor_repasse}
              onChange={(e) => onChangeForm("valor_repasse", normalizeCurrencyInput(e.target.value))}
              required
            />
          </label>
          <label>
            Valor contrapartida *
            <input
              type="text"
              inputMode="numeric"
              className="currency-input"
              value={form.valor_contrapartida}
              onChange={(e) => onChangeForm("valor_contrapartida", normalizeCurrencyInput(e.target.value))}
              required
            />
          </label>
          <label>
            Data cadastro *
            <input
              type="date"
              value={form.data_cadastro}
              onChange={(e) => onChangeForm("data_cadastro", e.target.value)}
              required
            />
          </label>
          <label>
            Data assinatura
            <input
              type="date"
              value={form.data_assinatura}
              onChange={(e) => onChangeForm("data_assinatura", e.target.value)}
            />
          </label>

          <label>
            Vigencia inicio *
            <input
              type="date"
              value={form.vigencia_inicio}
              onChange={(e) => onChangeForm("vigencia_inicio", e.target.value)}
              required
            />
          </label>
          <label>
            Vigencia fim *
            <input
              type="date"
              value={form.vigencia_fim}
              onChange={(e) => onChangeForm("vigencia_fim", e.target.value)}
              required
            />
          </label>
          <label>
            Prestacao contas
            <input
              type="date"
              value={form.data_prestacao_contas}
              onChange={(e) => onChangeForm("data_prestacao_contas", e.target.value)}
            />
          </label>
          <label>
            Data DOU
            <input type="date" value={form.data_dou} onChange={(e) => onChangeForm("data_dou", e.target.value)} />
          </label>

          <label>
            Responsavel
            <input value={form.responsavel} onChange={(e) => onChangeForm("responsavel", e.target.value)} />
          </label>
          <label>
            Orgao executor
            <input value={form.orgao_executor} onChange={(e) => onChangeForm("orgao_executor", e.target.value)} />
          </label>
        </div>

        <label>
          Objeto *
          <textarea value={form.objeto} onChange={(e) => onChangeForm("objeto", e.target.value)} rows={3} required />
        </label>

        <label>
          Observacoes
          <textarea value={form.observacoes} onChange={(e) => onChangeForm("observacoes", e.target.value)} rows={3} />
        </label>

        <div className="action-row">
          <button type="submit" disabled={isBusy}>
            {editingId ? "Salvar alteracoes" : "Criar instrumento"}
          </button>
          {editingId && selectedInstrument ? (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setEditingId(null);
                setShowCreateInstrumentForm(false);
                navigateToInstrumentProfile(selectedInstrument.id);
              }}
            >
              Voltar ao instrumento
            </button>
          ) : null}
          <button type="button" className="secondary" onClick={clearForm}>
            Limpar formulario
          </button>
        </div>
      </form>
    </div>
  );

  if (isLandingPreview) {
    return (
      <Suspense fallback={<LoadingPanel title="Carregando landing..." description="Preparando experiencia visual." />}>
        <LandingPage logoSrc={logoSrc} healthStatus={healthStatus} />
      </Suspense>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page">
        <header className="hero">
          <div>
            <img className="hero-logo" src={logoSrc} alt="Gestconv360" />
          </div>
          <div className={`health health-${healthStatus}`}>
            API: {healthStatus === "checking" ? "verificando" : healthStatus === "ok" ? "online" : "offline"}
          </div>
        </header>

        <section className="login-layout">
          <article className="card system-info-card">
            <h3>Funcionalidades do modulo</h3>
            <p className="subtitle">Visao completa para ciclo de instrumentos e propostas.</p>

            <div className="feature-grid">
              <div className="feature-item feature-item-instrumentos">
                <span className="feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M3.75 6.75a2.25 2.25 0 0 1 2.25-2.25h4.2a2.25 2.25 0 0 1 1.6.66l.9.9c.42.42.99.66 1.6.66h3.75a2.25 2.25 0 0 1 2.25 2.25v8.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6.75Z" />
                  </svg>
                </span>
                <p className="eyebrow">Instrumentos</p>
                <p>CRUD completo com filtros por status, concedente, vigencia e ativo.</p>
              </div>
              <div className="feature-item feature-item-checklist">
                <span className="feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M8.25 7.5h9M8.25 12h9m-9 4.5h9" />
                    <path d="M4.5 7.5h.008v.008H4.5V7.5Zm0 4.5h.008v.008H4.5V12Zm0 4.5h.008v.008H4.5V16.5Z" />
                  </svg>
                </span>
                <p className="eyebrow">Checklist</p>
                <p>Controle de documentos obrigatorios com upload, download e pendencias.</p>
              </div>
              <div className="feature-item feature-item-auditoria">
                <span className="feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M6.75 3.75h7.5l3 3v13.5h-10.5a2.25 2.25 0 0 1-2.25-2.25V6a2.25 2.25 0 0 1 2.25-2.25Z" />
                    <path d="M14.25 3.75V6a.75.75 0 0 0 .75.75h2.25M8.25 10.5h7.5m-7.5 3h7.5m-7.5 3h4.5" />
                  </svg>
                </span>
                <p className="eyebrow">Auditoria</p>
                <p>Historico de alteracoes com usuario, data e campos alterados.</p>
              </div>
              <div className="feature-item feature-item-painel">
                <span className="feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M4.5 19.5h15" />
                    <path d="M7.5 16.5v-4.5m4.5 4.5V8.25m4.5 8.25v-6" />
                    <path d="M6.75 9.75 12 6.75l4.5 2.25" />
                  </svg>
                </span>
                <p className="eyebrow">Painel</p>
                <p>KPIs, alertas de prazo e exportacao CSV/Excel para analise rapida.</p>
              </div>
            </div>

            <div className="quick-stats">
              <span>Perfis: ADMIN, GESTOR, CONSULTA, FINANCEIRO, DEMONSTRACAO</span>
              <span>Alertas: vigencia e prestacao de contas</span>
              <span>Seguranca: autenticacao JWT</span>
            </div>
          </article>

          <section className="card auth-card">
            <form onSubmit={onLogin} className="form-grid">
              <img className="auth-logo" src={getReportLogoUrl()} alt="NC Convenios" />
              <p className="subtitle">Acesso restrito. Novos usuarios sao cadastrados somente por administrador.</p>
              <a className="auth-preview-link" href="#landing" target="_blank" rel="noreferrer">
                Ver landing comercial em nova aba
              </a>

              <label>
                E-mail
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="admin@gestconv360.local"
                  required
                />
              </label>

              <label>
                Senha
                <input
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  type="password"
                  minLength={6}
                  required
                />
              </label>

              <button type="submit" disabled={isBusy}>
                {isBusy ? "Processando..." : "Entrar"}
              </button>
            </form>
          </section>
        </section>

        {message && <p className="message">{message}</p>}
      </div>
    );
  }

  return (
    <div className="page">
      <div className={appShellClassName}>
        <SidebarShell
          logoSrc={logoSrc}
          footer={
            <>
              <div className="user-panel">
                {user?.avatar_url ? (
                  <img className="user-avatar" src={toAbsoluteUrl(user.avatar_url)} alt={user.nome} />
                ) : (
                  <div className="user-avatar user-avatar-fallback">{getInitials(user?.nome, user?.email ?? "")}</div>
                )}
                <div className="user-panel-info">
                  <p>{user?.nome}</p>
                  <p>{user?.role}</p>
                </div>
              </div>
              <div className="user-panel-actions">
                <label className="ghost upload-trigger">
                  {isUploadingAvatar ? "Enviando..." : "Alterar avatar"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={onUploadMyAvatar}
                    disabled={isUploadingAvatar}
                  />
                </label>
                {user?.avatar_url && (
                  <button type="button" className="ghost" onClick={onRemoveMyAvatar} disabled={isUploadingAvatar}>
                    Remover avatar
                  </button>
                )}
              </div>
              <button type="button" className="ghost" onClick={onLogout}>
                Sair
              </button>
            </>
          }
        >
          {!isFinanceiro && (
            <>
          <button
            type="button"
            className={activeView === "dashboard" ? "menu-item active" : "menu-item"}
            onClick={() => onChangeView("dashboard")}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={activeView === "instrumentos" ? "menu-item active" : "menu-item"}
            onClick={() => onChangeView("instrumentos")}
          >
            Instrumentos/Propostas
          </button>
          <button
            type="button"
            className={activeView === "proponentes" ? "menu-item active" : "menu-item"}
            onClick={() => onChangeView("proponentes")}
          >
            Proponente
          </button>
          <button
            type="button"
            className={activeView === "emendas_estaduais" ? "menu-item active" : "menu-item"}
            onClick={() => onChangeView("emendas_estaduais")}
          >
            Emendas Estaduais
          </button>
          <button
            type="button"
            className={activeView === "documentos" ? "menu-item active" : "menu-item"}
            onClick={() => onChangeView("documentos")}
          >
            Area de Documentos
          </button>
          {(isAdmin || user?.role === "GESTOR") && (
            <button
              type="button"
              className={activeView === "geracao_documentos" ? "menu-item active" : "menu-item"}
              onClick={() => onChangeView("geracao_documentos")}
            >
              Gerador de Documentos
            </button>
          )}
            </>
          )}
          <button
            type="button"
            className={activeView === "pagamentos" ? "menu-item active" : "menu-item"}
            onClick={() => onChangeView("pagamentos")}
          >
            Pagamentos
          </button>
          {isAdmin && (
            <button
              type="button"
              className={activeView === "usuarios" ? "menu-item active" : "menu-item"}
              onClick={() => onChangeView("usuarios")}
            >
              Usuarios
            </button>
          )}
          {!isFinanceiro && (
            <>
          <button
            type="button"
            className={activeView === "auditoria" ? "menu-item active" : "menu-item"}
            onClick={() => onChangeView("auditoria")}
          >
            Auditoria/Historico
          </button>
          <button
            type="button"
            className={activeView === "tickets" ? "menu-item active" : "menu-item"}
            onClick={() => onChangeView("tickets")}
          >
            Tickets
          </button>
          <button
            type="button"
            className={activeView === "assistente" ? "menu-item active" : "menu-item"}
            onClick={() => onChangeView("assistente")}
          >
            Assistente 360
          </button>
          <button
            type="button"
            className={activeView === "relatorios" && relatorioTab === "transferencias_especiais" ? "menu-item active" : "menu-item"}
            onClick={() => {
              setRelatorioTab("transferencias_especiais");
              onChangeView("relatorios");
            }}
          >
            Especiais
          </button>
          <button
            type="button"
            className={activeView === "relatorios" && relatorioTab === "transparencia" ? "menu-item active" : "menu-item"}
            onClick={() => {
              setRelatorioTab("transparencia");
              onChangeView("relatorios");
            }}
          >
            Relatorios Transparencia
          </button>
          <button
            type="button"
            className={
              activeView === "relatorios" &&
              relatorioTab !== "transferencias_especiais" &&
              relatorioTab !== "transparencia"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => {
              if (relatorioTab === "transferencias_especiais" || relatorioTab === "transparencia") {
                setRelatorioTab("repasses");
              }
              onChangeView("relatorios");
            }}
          >
            Relatorios
          </button>
          {isAdmin && (
            <button
              type="button"
              className={activeView === "saude_tecnica" ? "menu-item active" : "menu-item"}
              onClick={() => onChangeView("saude_tecnica")}
            >
              Saude Tecnica
            </button>
          )}

            </>
          )}
        </SidebarShell>

        <main className="content">
          {isViewPending && <LoadingPanel title="Atualizando modulo..." description="Organizando painel e dados da secao." compact />}
          {activeView !== "tickets" && !(activeView === "relatorios" && relatorioTab === "transferencias_especiais") && (
          <>
          <SectionHeader title={sectionTitle} subtitle={sectionSubtitle} healthStatus={healthStatus} />

          </>
          )}

          {activeView === "dashboard" ? (
            <Suspense fallback={<LoadingPanel title="Carregando dashboard..." description="Montando indicadores e paineis executivos." />}>
              <DashboardView
                role={user?.role}
                dashboardInsights={dashboardInsights}
                kpis={dashboardKpis}
                isBusy={isBusy}
                isAdmin={isAdmin}
                refreshData={refreshData}
                onChangeView={onChangeView}
              />
            </Suspense>
          ) : activeView === "saude_tecnica" ? (
            <section className="dashboard">
              {isAdmin && (
                <section className="card technical-health-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '20px' }}>Saude Tecnica do Sistema</h3>
                      <p className="subtitle" style={{ marginTop: '8px' }}>
                        Backend v{technicalHealth.backendVersion} | Rota relatorios:{" "}
                        <strong style={{ color: technicalHealth.reportRouteStatus === "ok" ? '#10b981' : '#ef4444' }}>
                        {technicalHealth.reportRouteStatus === "ok"
                          ? "OK"
                          : technicalHealth.reportRouteStatus === "missing"
                            ? "NAO ENCONTRADA"
                            : technicalHealth.reportRouteStatus === "checking"
                              ? "VERIFICANDO"
                              : "ERRO"}
                        </strong>
                      </p>
                      <p className="subtitle">
                        Ultima verificacao:{" "}
                        {technicalHealth.lastCheckedAt
                          ? new Date(technicalHealth.lastCheckedAt).toLocaleString("pt-BR")
                          : "ainda nao verificada"}
                      </p>
                      <button type="button" className="secondary" style={{ marginTop: '12px' }} onClick={refreshTechnicalHealth} disabled={isBusy}>
                        Verificar agora
                      </button>
                    </div>

                    <div style={{ border: "1px solid #d6e0ea", borderRadius: 12, padding: "16px", minWidth: 320, background: '#f8fafc' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status do Servico de E-mail</h4>
                      <p className="subtitle" style={{ margin: 0, fontSize: '14px' }}>
                        Gmail envio: <strong style={{ color: gmailDeliveryHealth.status === 'ok' ? '#10b981' : '#ef4444' }}>{gmailHealthStatusLabel}</strong>
                      </p>
                      <div style={{ marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <p className="subtitle" style={{ margin: 0, fontWeight: 500 }}>Motivo:</p>
                        <p className="subtitle" style={{ margin: '2px 0 0' }}>{gmailDeliveryHealth.reason}</p>
                      </div>
                      {gmailDeliveryHealth.message && (
                        <p className="subtitle" style={{ margin: "12px 0 0", fontStyle: 'italic', color: '#64748b' }}>
                          "{gmailDeliveryHealth.message}"
                        </p>
                      )}
                      <p className="subtitle" style={{ margin: "12px 0 0", fontSize: '11px', color: '#94a3b8' }}>
                        Ultima checagem:{" "}
                        {gmailDeliveryHealth.checkedAt
                          ? new Date(gmailDeliveryHealth.checkedAt).toLocaleString("pt-BR")
                          : "ainda nao verificada"}
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </section>
          ) : activeView === "instrumentos" ? (
            <section className={`dashboard reports-layout${relatorioTab === "transferencias_discricionarias" ? " reports-tdl-layout" : ""}`}>
              {canManageInstruments && !isInstrumentProfileView && (
                <div className="card sticky-add-row">
                  <button type="button" className="add-new-cta" onClick={onStartCreateInstrument}>
                    Adicionar novo
                  </button>
                </div>
              )}

              <div className="card filters-card">
                <h3>Filtros da listagem</h3>
                <div className="filters-grid columns-4">
                  <div className="filters-actions" style={{ gridColumn: "1 / -1", display: "flex", gap: "12px", marginBottom: "16px" }}>
                    <button
                      type="button"
                      className="secondary compact"
                      onClick={() => setFilters(blankFilters())}
                      disabled={JSON.stringify(filters) === JSON.stringify(blankFilters())}
                    >
                      Limpar todos os filtros
                    </button>
                  </div>
                  <label>
                    Status
                    <select
                      value={filters.status}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, status: e.target.value as InstrumentStatus | "" }))
                      }
                    >
                      <option value="">Todos</option>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Concedente
                    <select
                      value={filters.concedente}
                      onChange={(e) => setFilters((prev) => ({ ...prev, concedente: e.target.value }))}
                    >
                      <option value="">Todos</option>
                      {concedenteOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Proponente
                    <select
                      value={filters.proponente_id}
                      onChange={(e) => setFilters((prev) => ({ ...prev, proponente_id: e.target.value }))}
                    >
                      <option value="">Todos</option>
                      {proponentes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nome}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Vigencia de
                    <input
                      type="date"
                      value={filters.vigencia_de}
                      onChange={(e) => setFilters((prev) => ({ ...prev, vigencia_de: e.target.value }))}
                    />
                  </label>

                  <label>
                    Vigencia ate
                    <input
                      type="date"
                      value={filters.vigencia_ate}
                      onChange={(e) => setFilters((prev) => ({ ...prev, vigencia_ate: e.target.value }))}
                    />
                  </label>

                  <label>
                    Ativo
                    <select
                      value={filters.ativo}
                      onChange={(e) => setFilters((prev) => ({ ...prev, ativo: e.target.value as "true" | "false" }))}
                    >
                      <option value="true">Sim</option>
                      <option value="false">Nao</option>
                    </select>
                  </label>
                </div>

                <div className="action-row">
                  <button type="button" onClick={() => refreshData()} disabled={isBusy}>
                    Aplicar filtros
                  </button>
                  <button type="button" className="secondary" onClick={() => exportCsv(sortedInstruments)}>
                    Exportar CSV da lista
                  </button>
                  <button type="button" className="secondary" onClick={() => exportExcel(sortedInstruments)}>
                    Exportar Excel da lista
                  </button>
                </div>
              </div>

              {isInstrumentProfileView ? (
                isEditingProfileInstrument ? (
                  renderInstrumentForm()
                ) : (
                  <>
                  <div className="card profile-card">
                    <div className="profile-header-row">
                      <h3>{profileInstrument ? `Instrumento ${profileInstrument.instrumento}` : "Carregando instrumento"}</h3>
                      <div className="action-row compact">
                        <button type="button" className="ghost" onClick={navigateToInstrumentList}>
                          Voltar para lista
                        </button>
                        {profileInstrument && (
                          <button
                            type="button"
                            className={`secondary panel-toggle${showRepassePanel ? " active" : ""}`}
                            onClick={() => {
                              setShowRepassePanel((prev) => !prev);
                              setShowWorkProgressPanel(false);
                            }}
                          >
                            Lista de Repasses
                          </button>
                        )}
                        {profileInstrument && (
                          <button
                            type="button"
                            className={`secondary panel-toggle${showWorkProgressPanel ? " active" : ""}`}
                            onClick={() => {
                              setShowWorkProgressPanel((prev) => !prev);
                              setShowRepassePanel(false);
                              setShowSolicitacoesCaixaPanel(false);
                            }}
                          >
                            Acompanhamento de obras
                          </button>
                        )}
                        {profileInstrument && (
                          <button
                            type="button"
                            className={`secondary panel-toggle${showSolicitacoesCaixaPanel ? " active" : ""}`}
                            onClick={() => {
                              const willOpen = !showSolicitacoesCaixaPanel;
                              setShowSolicitacoesCaixaPanel(willOpen);
                              setShowRepassePanel(false);
                              setShowWorkProgressPanel(false);
                              if (willOpen) {
                                onLoadSolicitacoesCaixa();
                              }
                            }}
                          >
                            Solicitações Caixa
                          </button>
                        )}
                        {canManageInstruments && profileInstrument && (
                          <button type="button" onClick={() => onEdit(profileInstrument)}>
                            Editar
                          </button>
                        )}
                        {canDeactivateInstruments && profileInstrument?.ativo && (
                          <button type="button" className="danger" onClick={() => onDeactivate(profileInstrument)}>
                            Inativar
                          </button>
                        )}
                        {profileInstrument && (
                          <button type="button" className="primary" onClick={() => {
                            setShowGerarDocumentoModal(true);
                            void onLoadGeracaoDocumentosData();
                          }}>
                            Gerar Declaração
                          </button>
                        )}
                      </div>
                    </div>

                    {!profileInstrument ? (
                      <p>Carregando dados do instrumento...</p>
                    ) : (
                      <>
                        <div className="details-grid profile-grid">
                        <p>
                          <strong>ID:</strong> {profileInstrument.id}
                        </p>
                        <p>
                          <strong>Proposta:</strong> {profileInstrument.proposta}
                        </p>
                        <p>
                          <strong>Status:</strong> {profileInstrument.status}
                        </p>
                        <p>
                          <strong>Fluxo:</strong> {FLOW_TYPE_LABELS[profileInstrument.fluxo_tipo]}
                        </p>
                        <p>
                          <strong>Concedente:</strong> {profileInstrument.concedente}
                        </p>
                        <p>
                          <strong>Dados bancarios:</strong>{" "}
                          {formatBankInfo(profileInstrument) || "-"}
                        </p>
                        <p>
                          <strong>Proponente:</strong>{" "}
                          {(profileInstrument.proponente_id ?? profileInstrument.convenete_id)
                            ? (proponenteNameById.get(profileInstrument.proponente_id ?? profileInstrument.convenete_id ?? 0) ??
                              `#${profileInstrument.proponente_id ?? profileInstrument.convenete_id}`)
                            : "-"}
                        </p>
                        <p>
                          <strong>Vigencia:</strong> {profileInstrument.vigencia_inicio ?? "-"} a{" "}
                          {profileInstrument.vigencia_fim ?? "-"}
                        </p>
                        <p>
                          <strong>Valor total:</strong> {formatCurrency(profileInstrument.valor_total)}
                        </p>
                        <p>
                          <strong>Ativo:</strong> {profileInstrument.ativo ? "Sim" : "Nao"}
                        </p>
                        <p className="profile-object">
                          <strong>Objeto:</strong> {profileInstrument.objeto}
                        </p>
                        <p>
                          <strong>Observacoes:</strong> {profileInstrument.observacoes ?? "-"}
                        </p>
                        </div>

                        {showRepassePanel && (
                          <div className="repasse-card">
                            <h3>Lista de Repasses</h3>
                            <div className="repasse-grid">
                              <p>
                                <strong>Valor total do repasse:</strong> {formatCurrency(profileInstrument.valor_repasse)}
                              </p>
                              <p>
                                <strong>Valor contrapartida:</strong> {formatCurrency(profileInstrument.valor_contrapartida)}
                              </p>
                              <p>
                                <strong>Valor ja repassado:</strong> {formatCurrency(profileInstrument.valor_ja_repassado)}
                              </p>
                              <p>
                                <strong>Total de repasses:</strong> {profileInstrumentRepasses.length}
                              </p>
                              <p>
                                <strong>% repassado:</strong> {repassePercentualAtual.toFixed(2)}%
                              </p>
                            </div>

                            <div className="repasse-progress" role="presentation">
                              <span style={{ width: `${repassePercentualAtual}%` }} />
                            </div>

                            <p className="subtitle">
                              Lista sincronizada automaticamente pelos desembolsos do Transferegov.
                            </p>
                            <div className="action-row compact">
                              <button type="button" className="secondary" onClick={onSyncRepassesFromDesembolsos} disabled={isBusy}>
                                Sincronizar agora
                              </button>
                            </div>

                            <div className="repasse-list">
                              {profileInstrumentRepasses.length === 0 ? (
                                <p>Nenhum repasse cadastrado.</p>
                              ) : (
                                profileInstrumentRepasses.map((repasse) => (
                                  <div key={repasse.id} className="repasse-item">
                                    <span>{repasse.data_repasse}</span>
                                    <strong>{formatCurrency(repasse.valor_repasse)}</strong>
                                    <span className="subtitle">Origem: Desembolso</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {showWorkProgressPanel && (
                          <div className="work-progress-card">
                            <h3>Acompanhamento de obra</h3>
                            <p className="subtitle">
                              Empresa vencedora: {profileInstrument.empresa_vencedora?.trim() || "Nao informada"} | CNPJ: {" "}
                              {profileInstrument.cnpj_vencedora?.trim() || "Nao informado"}
                            </p>
                            <p className="subtitle">
                              Valor vencedor: {formatCurrency(profileInstrument.valor_vencedor ?? 0)}
                            </p>
                            <p className="subtitle">
                              Valor ja repassado: {formatCurrency(profileInstrument.valor_ja_repassado)} | Valor total de repasse: {" "}
                              {formatCurrency(profileInstrument.valor_repasse)}
                            </p>
                            <p className="subtitle">
                              Percentual atual: {workProgress ? `${workProgress.percentual_obra.toFixed(2)}%` : "0.00%"} | Total boletins:{" "}
                              {formatCurrency(workProgress?.valor_total_boletins ?? 0)}
                            </p>

                            <div className="stage-followup-box">
                              <div className="stage-followup-head">
                                <h5>Situacao da obra</h5>
                                <div className="stage-followup-stats">
                                  <span>{(stageFollowUps.ACOMPANHAMENTO_OBRA ?? []).length} registro(s)</span>
                                  <span>
                                    {(stageFollowUps.ACOMPANHAMENTO_OBRA ?? [])[0]?.created_at
                                      ? `Ultimo: ${new Date((stageFollowUps.ACOMPANHAMENTO_OBRA ?? [])[0].created_at).toLocaleDateString("pt-BR")}`
                                      : "Sem registros"}
                                  </span>
                                </div>
                              </div>
                              {(stageFollowUps.ACOMPANHAMENTO_OBRA ?? [])[0]?.texto && (
                                <>
                                  <p className="subtitle" style={{ whiteSpace: "pre-wrap" }}>
                                    Ultimo acompanhamento: {(stageFollowUps.ACOMPANHAMENTO_OBRA ?? [])[0].texto}
                                  </p>
                                  <p className="subtitle">
                                    Registrado por:{" "}
                                    {(stageFollowUps.ACOMPANHAMENTO_OBRA ?? [])[0].user.nome ??
                                      (stageFollowUps.ACOMPANHAMENTO_OBRA ?? [])[0].user.email}
                                  </p>
                                </>
                              )}
                              {canManageInstruments && (
                                <div className="stage-followup-form">
                                  <textarea
                                    value={workProgressFollowUpText}
                                    onChange={(e) => setWorkProgressFollowUpText(e.target.value)}
                                    placeholder="Escreva a situacao atual da obra para aparecer no relatorio de andamento."
                                    rows={4}
                                    disabled={isSavingWorkProgressFollowUp}
                                  />
                                  <div className="action-row compact">
                                    <button
                                      type="button"
                                      onClick={onSaveWorkProgressFollowUp}
                                      disabled={isSavingWorkProgressFollowUp}
                                    >
                                      {isSavingWorkProgressFollowUp ? "Salvando..." : "Salvar acompanhamento"}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {profileInstrument.percentual_fisico_medicao !== null && (
                              <div className="work-progress-transferegov-alert" style={{
                                background: "rgba(var(--primary-rgb), 0.05)",
                                border: "1px solid var(--primary)",
                                borderRadius: "8px",
                                padding: "12px",
                                marginBottom: "16px"
                              }}>
                                <p style={{ margin: "0 0 8px 0", fontWeight: 600, color: "var(--primary-dark)" }}>
                                  Sincronizado do Transferegov (Dados Oficiais):
                                </p>
                                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.9rem" }}>
                                  <li>Percentual Fisico: <strong>{profileInstrument.percentual_fisico_medicao.toFixed(2)}%</strong></li>
                                  {profileInstrument.percentual_financeiro_medicao !== null && (
                                    <li>Valor Realizado: <strong>{formatCurrency(profileInstrument.percentual_financeiro_medicao)}</strong></li>
                                  )}
                                  {profileInstrument.status_medicao && (
                                    <li>Status: <strong>{profileInstrument.status_medicao}</strong></li>
                                  )}
                                  {profileInstrument.data_ultima_atualizacao_medicao && (
                                    <li className="subtitle" style={{ listStyle: "none", marginLeft: "-20px", marginTop: "4px" }}>
                                      Ultima atualizacao na base: {new Date(profileInstrument.data_ultima_atualizacao_medicao).toLocaleString('pt-BR')}
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}

                            {canManageInstruments && (
                              <div className="action-row compact">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={obraPercentual}
                                  onChange={(e) => setObraPercentual(e.target.value)}
                                  placeholder="Percentual da obra"
                                />
                                <button type="button" onClick={onSaveWorkProgress} disabled={isBusy}>
                                  Salvar percentual
                                </button>
                                <button
                                  type="button"
                                  className="secondary"
                                  onClick={onSyncWorkProgressFromTransferegov}
                                  disabled={isBusy}
                                  title="Busca o percentual de medicao diretamente do Transferegov"
                                >
                                  Sincronizar Transferegov
                                </button>
                              </div>
                            )}

                            {canManageInstruments && (
                              <form className="checklist-add-form" onSubmit={onAddMeasurementBulletin}>
                                <input type="date" value={boletimData} onChange={(e) => setBoletimData(e.target.value)} required />
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={boletimValor}
                                  onChange={(e) => setBoletimValor(normalizeCurrencyInput(e.target.value))}
                                  placeholder="Valor do boletim"
                                  required
                                />
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={boletimPercentual}
                                  onChange={(e) => setBoletimPercentual(e.target.value)}
                                  placeholder="% obra (opcional)"
                                />
                                <input
                                  value={boletimObservacao}
                                  onChange={(e) => setBoletimObservacao(e.target.value)}
                                  placeholder="Observacao"
                                />
                                <button type="submit" disabled={isBusy}>
                                  Adicionar boletim
                                </button>
                              </form>
                            )}

                            {workProgress && workProgress.boletins.length > 0 ? (
                              <div className="table-wrap">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Data</th>
                                      <th>Valor</th>
                                      <th>% obra</th>
                                      <th>Observacao</th>
                                      {canManageInstruments && <th>Acoes</th>}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {workProgress.boletins.map((item) => (
                                      <tr key={item.id}>
                                        <td>{item.data_boletim}</td>
                                        <td>{formatCurrency(item.valor_medicao)}</td>
                                        <td>
                                          {item.percentual_obra_informado === null ? "-" : `${item.percentual_obra_informado.toFixed(2)}%`}
                                        </td>
                                        <td>{item.observacao ?? "-"}</td>
                                        {canManageInstruments && (
                                          <td>
                                            <button
                                              type="button"
                                              className="danger"
                                              onClick={() => onDeleteMeasurementBulletin(item.id)}
                                            >
                                              Excluir
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="subtitle">Nenhum boletim de medicao cadastrado.</p>
                            )}
                          </div>
                        )}

                        {showSolicitacoesCaixaPanel && (
                          <div className="work-progress-card">
                            <h3>Solicitações Caixa</h3>
                            <p className="subtitle">
                              Historico de interacoes deste instrumento com a Caixa.
                            </p>
                            {solicitacoesCaixaLoading ? (
                              <p>Carregando...</p>
                            ) : solicitacoesCaixaItens.length === 0 ? (
                              <p className="subtitle">Nenhuma solicitacao registrada.</p>
                            ) : (
                              <div className="solicitacoes-caixa-list">
                                {solicitacoesCaixaItens.map((item) => (
                                  <div key={item.id} className="solicitacao-caixa-item">
                                    <div className="solicitacao-caixa-header">
                                      <span className={`solicitacao-caixa-tipo tipo-${item.tipo.toLowerCase()}`}>
                                        {item.tipo === "EMAIL_RECEBIDO" && "E-mail"}
                                        {item.tipo === "COMENTARIO_TICKET" && "Comentário"}
                                        {item.tipo === "RESPOTA_ENVIADA" && "Resposta enviada"}
                                        {item.tipo === "ASSOCIAÇÃO_MANUAL" && "Associação manual"}
                                      </span>
                                      <span className="solicitacao-caixa-data">
                                        {new Date(item.created_at).toLocaleString("pt-BR")}
                                      </span>
                                    </div>
                                    <p className="solicitacao-caixa-desc">{item.descricao}</p>
                                    {item.origem_email && (
                                      <p className="subtitle">De: {item.origem_email}</p>
                                    )}
                                    {item.assunto_email && (
                                      <p className="subtitle">Assunto: {item.assunto_email}</p>
                                    )}
                                    {item.ticket && (
                                      <p className="subtitle">
                                        Ticket: <a href="#" onClick={(e) => { e.preventDefault(); onOpenTicketFromSolicitacao(item.ticket.id); }}>{item.ticket.codigo}</a>
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {showTicketModalFromSolicitacao && selectedTicket && (
                          <div className="stage-followup-modal-overlay" onClick={() => setShowTicketModalFromSolicitacao(false)}>
                            <div className="ticket-modal-content" onClick={(event) => event.stopPropagation()}>
                              <div className="ticket-modal-header">
                                <div>
                                  <p className="eyebrow">{selectedTicket.codigo}</p>
                                  <h3>{selectedTicket.titulo}</h3>
                                  <p className="subtitle">
                                    {TICKET_STATUS_LABELS[selectedTicket.status]} | {TICKET_SOURCE_LABELS[selectedTicket.origem]} | Criado em {" "}
                                    {new Date(selectedTicket.created_at).toLocaleString("pt-BR")}
                                  </p>
                                </div>
                                <button type="button" className="ghost" onClick={() => setShowTicketModalFromSolicitacao(false)}>
                                  Fechar
                                </button>
                              </div>
                              <div className="ticket-modal-body">
                                <p>
                                  <strong>Instrumento:</strong>{" "}
                                  {formatTicketInstrumentLabel(selectedTicket, "Nao informado")}
                                </p>
                                <p>
                                  <strong>Responsavel:</strong> {selectedTicket.responsavel?.nome ?? "Nao atribuido"}
                                </p>
                                <div className="ticket-description-block">
                                  <strong>Descricao:</strong>
                                  <div className="ticket-description-text">{selectedTicket.descricao ?? "Sem descricao"}</div>
                                </div>
                                <p>
                                  <strong>Prazo alvo:</strong>{" "}
                                  {selectedTicket.prazo_alvo ? formatDateOnlyPtBr(selectedTicket.prazo_alvo) : "Nao definido"}
                                </p>
                                {selectedTicket.resolvido_em && (
                                  <p>
                                    <strong>Resolvido em:</strong> {formatDateOnlyPtBr(selectedTicket.resolvido_em)}
                                  </p>
                                )}
                                {selectedTicket.motivo_resolucao && (
                                  <p>
                                    <strong>Motivo da resolucao:</strong> {selectedTicket.motivo_resolucao}
                                  </p>
                                )}
                                {selectedTicket.comentarios && selectedTicket.comentarios.length > 0 && (
                                  <div className="ticket-comments-section">
                                    <h4>Comentarios ({selectedTicket.comentarios.length})</h4>
                                    {selectedTicket.comentarios.map((comment) => (
                                      <div key={comment.id} className="ticket-comment">
                                        <div className="ticket-comment-head">
                                          <strong>{comment.user.nome}</strong>
                                          <span className="subtitle">
                                            {new Date(comment.created_at).toLocaleString("pt-BR")}
                                          </span>
                                        </div>
                                        <p>{comment.mensagem}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {selectedTicket.checklist_itens && selectedTicket.checklist_itens.length > 0 && (
                                  <div className="ticket-checklist-section">
                                    <h4>Pendencias ({selectedTicket.checklist_itens.length})</h4>
                                    {selectedTicket.checklist_itens.map((item) => (
                                      <div key={item.id} className="ticket-checklist-item">
                                        <span className={item.concluido ? "checklist-done" : "checklist-pending"}>
                                          {item.concluido ? "OK" : "Pendente"}
                                        </span>
                                        <span>{item.descricao}</span>
                                        {item.concluido_em && (
                                          <span className="subtitle">
                                            Concluido em: {new Date(item.concluido_em).toLocaleString("pt-BR")}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {!showRepassePanel && !showWorkProgressPanel && !showSolicitacoesCaixaPanel && (
                          <div className="checklist-card">
                          <div className="checklist-head">
                            <h3>Fluxo de liberacao do recurso federal - {FLOW_TYPE_LABELS[currentFlowType]}</h3>
                            <div className="checklist-head-meta">
                              {canManageInstruments && allowChecklistExternalLink && (
                                <label className="checklist-validity-control">
                                  Validade do link externo
                                  <select
                                    value={String(externalLinkValidityDays)}
                                    onChange={(e) => setExternalLinkValidityDays(Number(e.target.value))}
                                  >
                                    {EXTERNAL_LINK_VALIDITY_OPTIONS.map((days) => (
                                      <option key={days} value={String(days)}>
                                        {days} dia{days > 1 ? "s" : ""}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              )}
                              {checklistSummary && (
                                <p className="subtitle">
                                  {checklistSummary.concluidos}/{checklistSummary.total} concluidos | obrigatorios: {" "}
                                  {checklistSummary.obrigatorios_concluidos}/{checklistSummary.obrigatorios}
                                </p>
                              )}
                            </div>
                          </div>

                          {checklistSummary?.etapa_atual && (
                            <p className="subtitle">Etapa atual: {stageLabels[checklistSummary.etapa_atual]}</p>
                          )}

                          {canManageInstruments && (
                            <form className="checklist-add-form" onSubmit={onAddChecklistItem}>
                              <select value={checklistStage} onChange={(e) => setChecklistStage(e.target.value as WorkflowStage)}>
                                {WORKFLOW_STAGES.map((stage) => (
                                  <option key={stage} value={stage}>
                                    {stageLabels[stage]}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={checklistDocName}
                                onChange={(e) => setChecklistDocName(e.target.value)}
                                placeholder="Nome do documento"
                                required
                              />
                              <input
                                value={checklistNote}
                                onChange={(e) => setChecklistNote(e.target.value)}
                                placeholder="Observacao (opcional)"
                              />
                              <label className="checklist-toggle">
                                <input
                                  type="checkbox"
                                  checked={checklistRequired}
                                  onChange={(e) => setChecklistRequired(e.target.checked)}
                                />
                                Obrigatorio
                              </label>
                              <button type="submit" disabled={isBusy}>
                                Adicionar item
                              </button>
                            </form>
                          )}

                          {checklistItems.length === 0 ? (
                            <p>Sem checklist cadastrado para este instrumento.</p>
                          ) : (
                            <div className="workflow-stage-list">
                              {WORKFLOW_STAGES.map((stage) => {
                                const stageItems = checklistItems.filter((item) => item.etapa === stage);
                                const stageResume = checklistSummary?.etapas.find((item) => item.etapa === stage);
                                const isExpanded = activeWorkflowStage === stage;
                                const isStageDone = Boolean(stageResume?.concluida);
                                const allFollowUps = stageFollowUps[stage] ?? [];
                                const visibleFollowUps = filterStageFollowUps(allFollowUps);
                                const totalAttachments = allFollowUps.reduce((acc, item) => acc + item.arquivos.length, 0);
                                const latestFollowUp = allFollowUps[0] ?? null;

                                return (
                                  <section
                                    key={stage}
                                    className={`workflow-stage-section${isExpanded ? " open" : ""}${
                                      isStageDone ? " done" : ""
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      className="workflow-accordion-trigger"
                                      onClick={() => onToggleWorkflowStage(stage)}
                                    >
                                      <div className="workflow-stage-head">
                                        <h4>{stageLabels[stage]}</h4>
                                        <span className={isExpanded ? "accordion-indicator open" : "accordion-indicator"}>
                                          {isExpanded ? "-" : "+"}
                                        </span>
                                      </div>
                                      {stageResume ? (
                                        <span className={stageResume.concluida ? "stage-badge done" : "stage-badge"}>
                                          {stageResume.concluida ? "Concluida" : "Pendente"}
                                        </span>
                                      ) : (
                                        <span className="stage-badge">Sem itens</span>
                                      )}
                                    </button>

                                    {isExpanded && (
                                      <div className="workflow-accordion-content">
                                        {stageResume && (
                                          <p className="subtitle">
                                            Obrigatorios: {stageResume.obrigatorios_concluidos}/{stageResume.obrigatorios}
                                          </p>
                                        )}

                                        {canManageInstruments && (
                                          <div className="action-row compact">
                                            <button
                                              type="button"
                                              onClick={() => onCompleteChecklistStage(stage)}
                                              disabled={busyChecklistStage === stage || stageItems.length === 0}
                                            >
                                              {busyChecklistStage === stage
                                                ? "Concluindo secao..."
                                                : "Marcar secao como concluida"}
                                            </button>
                                            <button
                                              type="button"
                                              className="secondary"
                                              onClick={() => onReopenChecklistStage(stage)}
                                              disabled={busyChecklistStage === stage || stageItems.length === 0}
                                            >
                                              {busyChecklistStage === stage
                                                ? "Atualizando secao..."
                                                : "Marcar secao como nao concluida"}
                                            </button>
                                          </div>
                                        )}

                                        {stage === "PROCESSO_EXECUCAO_LICITACAO" && (
                                          <div className="work-progress-card">
                                            <h5>Dados do vencedor da licitacao</h5>
                                            {canManageInstruments ? (
                                              <>
                                                <div className="filters-grid columns-3">
                                                  <input
                                                    value={empresaVencedoraNomeInput}
                                                    onChange={(e) => setEmpresaVencedoraNomeInput(e.target.value)}
                                                    placeholder="Empresa vencedora"
                                                  />
                                                  <input
                                                    value={empresaVencedoraCnpjInput}
                                                    onChange={(e) => setEmpresaVencedoraCnpjInput(e.target.value)}
                                                    placeholder="CNPJ da vencedora"
                                                  />
                                                  <input
                                                    value={empresaVencedoraValorInput}
                                                    onChange={(e) => setEmpresaVencedoraValorInput(e.target.value)}
                                                    onBlur={() =>
                                                      setEmpresaVencedoraValorInput(
                                                        normalizeCurrencyInput(empresaVencedoraValorInput)
                                                      )
                                                    }
                                                    placeholder="Valor vencedor (R$)"
                                                  />
                                                </div>
                                                <div className="action-row compact">
                                                  <button type="button" onClick={onSaveEmpresaVencedora} disabled={isBusy}>
                                                    Salvar dados do vencedor
                                                  </button>
                                                </div>
                                              </>
                                            ) : (
                                              <>
                                                <p className="subtitle">
                                                  Empresa: {profileInstrument?.empresa_vencedora?.trim() || "Nao informada"}
                                                </p>
                                                <p className="subtitle">
                                                  CNPJ: {profileInstrument?.cnpj_vencedora?.trim() || "Nao informado"}
                                                </p>
                                                <p className="subtitle">
                                                  Valor vencedor: {formatCurrency(profileInstrument?.valor_vencedor ?? 0)}
                                                </p>
                                              </>
                                            )}
                                          </div>
                                        )}

                                        <div className="stage-followup-box">
                                          <div className="stage-followup-head">
                                            <h5>Acompanhamento da etapa</h5>
                                            <div className="stage-followup-stats">
                                              <span>{allFollowUps.length} registro(s)</span>
                                              <span>{totalAttachments} anexo(s)</span>
                                              <span>
                                                {latestFollowUp
                                                  ? `Ultimo: ${new Date(latestFollowUp.created_at).toLocaleDateString("pt-BR")}`
                                                  : "Sem registros"}
                                              </span>
                                            </div>
                                          </div>
                                          {canManageInstruments && (
                                            <div className="stage-followup-actions">
                                              <button type="button" onClick={() => onOpenStageFollowUpModal(stage)}>
                                                Novo acompanhamento
                                              </button>
                                            </div>
                                          )}

                                          {stageFollowUpModalStage === stage && (
                                            <div className="stage-followup-modal-overlay" onClick={onCloseStageFollowUpModal}>
                                              <div className="stage-followup-modal" onClick={(event) => event.stopPropagation()}>
                                                <div className="stage-followup-modal-head">
                                                  <h5>Novo acompanhamento</h5>
                                                  <button
                                                    type="button"
                                                    className="ghost compact-link"
                                                    onClick={onCloseStageFollowUpModal}
                                                  >
                                                    Fechar
                                                  </button>
                                                </div>
                                                <p className="subtitle">{stageLabels[stage]}</p>
                                                <div className="stage-followup-form">
                                                  <textarea
                                                    value={stageFollowUpText}
                                                    onChange={(e) => setStageFollowUpText(e.target.value)}
                                                    placeholder="Registre observacoes livres sobre o andamento desta etapa"
                                                    rows={4}
                                                  />
                                                  <div
                                                    className={
                                                      isDraggingStageFiles
                                                        ? "stage-followup-dropzone dragging"
                                                        : "stage-followup-dropzone"
                                                    }
                                                    onDragOver={(event) => {
                                                      event.preventDefault();
                                                      setIsDraggingStageFiles(true);
                                                    }}
                                                    onDragLeave={() => setIsDraggingStageFiles(false)}
                                                    onDrop={onDropStageFollowUpFiles}
                                                  >
                                                    <p>
                                                      Arraste arquivos aqui ou clique para selecionar
                                                    </p>
                                                    <label className="ghost upload-trigger">
                                                      Selecionar arquivos
                                                      <input
                                                        type="file"
                                                        multiple
                                                        onChange={(e) => onSelectStageFollowUpFiles(e.target.files)}
                                                        disabled={isSavingStageFollowUp}
                                                      />
                                                    </label>
                                                  </div>
                                                  <div className="stage-followup-selected-files">
                                                    {stageFollowUpFiles.length > 0
                                                      ? `${stageFollowUpFiles.length} arquivo(s) selecionado(s)`
                                                      : "Nenhum arquivo selecionado"}
                                                  </div>
                                                  {stageFollowUpFiles.length > 0 && (
                                                    <div className="stage-followup-selected-list">
                                                      {stageFollowUpFiles.map((file, index) => (
                                                        <div key={`${file.name}-${file.lastModified}-${index}`} className="stage-followup-selected-item">
                                                          <span>{file.name}</span>
                                                          <span className="subtitle">{formatFileSize(file.size)}</span>
                                                          <button
                                                            type="button"
                                                            className="ghost compact-link"
                                                            onClick={() => onRemoveSelectedStageFollowUpFile(index)}
                                                            disabled={isSavingStageFollowUp}
                                                          >
                                                            Remover
                                                          </button>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                  <div className="action-row compact">
                                                    <button
                                                      type="button"
                                                      className="ghost"
                                                      onClick={onCloseStageFollowUpModal}
                                                      disabled={isSavingStageFollowUp}
                                                    >
                                                      Cancelar
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => onSaveStageFollowUp(stage)}
                                                      disabled={isSavingStageFollowUp}
                                                    >
                                                      Salvar acompanhamento
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          {editingStageFollowUp?.stage === stage && (
                                            <div className="stage-followup-modal-overlay" onClick={onCloseEditStageFollowUpModal}>
                                              <div className="stage-followup-modal" onClick={(event) => event.stopPropagation()}>
                                                <div className="stage-followup-modal-head">
                                                  <h5>Editar acompanhamento</h5>
                                                  <button
                                                    type="button"
                                                    className="ghost compact-link"
                                                    onClick={onCloseEditStageFollowUpModal}
                                                    disabled={isSavingStageFollowUpEdit}
                                                  >
                                                    Fechar
                                                  </button>
                                                </div>
                                                <p className="subtitle">{stageLabels[stage]}</p>
                                                <div className="stage-followup-form">
                                                  <textarea
                                                    value={editingStageFollowUpText}
                                                    onChange={(e) => setEditingStageFollowUpText(e.target.value)}
                                                    placeholder="Atualize o texto do acompanhamento"
                                                    rows={6}
                                                    disabled={isSavingStageFollowUpEdit}
                                                  />
                                                  <div className="action-row compact">
                                                    <button
                                                      type="button"
                                                      className="ghost"
                                                      onClick={onCloseEditStageFollowUpModal}
                                                      disabled={isSavingStageFollowUpEdit}
                                                    >
                                                      Cancelar
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={onSaveEditedStageFollowUp}
                                                      disabled={isSavingStageFollowUpEdit}
                                                    >
                                                      {isSavingStageFollowUpEdit ? "Salvando..." : "Salvar alteracoes"}
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          <div className="stage-followup-toolbar">
                                            <label>
                                              Filtro
                                              <select
                                                value={stageFollowUpFilter}
                                                onChange={(e) => setStageFollowUpFilter(e.target.value as StageFollowUpFilter)}
                                              >
                                                {(Object.keys(STAGE_FOLLOW_UP_FILTER_LABELS) as StageFollowUpFilter[]).map(
                                                  (option) => (
                                                    <option key={option} value={option}>
                                                      {STAGE_FOLLOW_UP_FILTER_LABELS[option]}
                                                    </option>
                                                  )
                                                )}
                                              </select>
                                            </label>
                                            <p className="subtitle">Mostrando {visibleFollowUps.length} registro(s)</p>
                                          </div>

                                          <div className="stage-followup-history">
                                            {visibleFollowUps.length === 0 ? (
                                              <p className="subtitle">Sem registros de acompanhamento nesta etapa.</p>
                                            ) : (
                                              visibleFollowUps.map((followUp) => {
                                                const canManageOwnFollowUp =
                                                  canManageInstruments &&
                                                  !!user &&
                                                  ((followUp.user.id !== null && followUp.user.id === user.id) ||
                                                    followUp.user.email.trim().toLowerCase() === user.email.trim().toLowerCase());
                                                return (
                                                <article key={followUp.id} className="stage-followup-item">
                                                  <div className="stage-followup-item-head">
                                                    <div className="stage-followup-user">
                                                      {followUp.user.avatar_url ? (
                                                        <img
                                                          className="followup-avatar"
                                                          src={toAbsoluteUrl(followUp.user.avatar_url)}
                                                          alt={followUp.user.nome ?? followUp.user.email}
                                                        />
                                                      ) : (
                                                        <div className="followup-avatar followup-avatar-fallback">
                                                          {getInitials(followUp.user.nome, followUp.user.email)}
                                                        </div>
                                                      )}
                                                      <div>
                                                        <p className="stage-followup-user-name">
                                                          {followUp.user.nome
                                                            ? `${followUp.user.nome} (${followUp.user.email})`
                                                            : followUp.user.email}
                                                        </p>
                                                        <p className="subtitle">
                                                          {new Date(followUp.created_at).toLocaleString("pt-BR")}
                                                        </p>
                                                      </div>
                                                    </div>
                                                    <div className="stage-followup-item-controls">
                                                      <span className="stage-badge">
                                                        {followUp.texto && followUp.arquivos.length > 0
                                                          ? "Texto + anexo"
                                                          : followUp.arquivos.length > 0
                                                            ? "Anexo"
                                                            : "Texto"}
                                                      </span>
                                                      {canManageOwnFollowUp && (
                                                        <>
                                                          <button
                                                            type="button"
                                                            className="ghost compact-link"
                                                            onClick={() => onEditStageFollowUp(stage, followUp)}
                                                          >
                                                            Alterar
                                                          </button>
                                                          <button
                                                            type="button"
                                                            className="ghost compact-link danger"
                                                            onClick={() => onDeleteStageFollowUp(stage, followUp)}
                                                          >
                                                            Remover
                                                          </button>
                                                        </>
                                                      )}
                                                    </div>
                                                  </div>
                                                  {followUp.texto && (
                                                    <div>
                                                      <p
                                                        className={
                                                          expandedFollowUpIds.includes(followUp.id)
                                                            ? "stage-followup-text"
                                                            : "stage-followup-text compact"
                                                        }
                                                      >
                                                        {expandedFollowUpIds.includes(followUp.id)
                                                          ? followUp.texto
                                                          : summarizeText(followUp.texto, 180)}
                                                      </p>
                                                      {followUp.texto.length > 180 && (
                                                        <button
                                                          type="button"
                                                          className="ghost compact-link"
                                                          onClick={() => onToggleFollowUpText(followUp.id)}
                                                        >
                                                          {expandedFollowUpIds.includes(followUp.id)
                                                            ? "Mostrar menos"
                                                            : "Ver mais"}
                                                        </button>
                                                      )}
                                                    </div>
                                                  )}
                                                  {followUp.arquivos.length > 0 && (
                                                    <div className="stage-followup-files">
                                                      {followUp.arquivos.map((file) => (
                                                        <button
                                                          key={file.id}
                                                          type="button"
                                                          className="secondary"
                                                          onClick={() =>
                                                            onDownloadStageFollowUpAttachment(
                                                              stage,
                                                              followUp.id,
                                                              file.id,
                                                              file.nome_original
                                                            )
                                                          }
                                                        >
                                                          Baixar {file.nome_original}
                                                        </button>
                                                      ))}
                                                    </div>
                                                  )}
                                                </article>
                                              )})
                                            )}
                                          </div>
                                        </div>

                                        {stageItems.length === 0 ? (
                                          <p className="subtitle">Nenhum item cadastrado nesta etapa.</p>
                                        ) : (
                                          <div className="checklist-list">
                                            {stageItems.map((item) => {
                                              const statusVisual = getChecklistStatusVisual(item.status);
                                              const isPropostaItem = item.etapa === "PROPOSTA";
                                              const statusOptions = isPropostaItem
                                                ? PROPOSTA_STATUS_OPTIONS
                                                : CHECKLIST_STATUS_OPTIONS;
                                              const statusLabelMap = isPropostaItem
                                                ? PROPOSTA_STATUS_LABELS
                                                : CHECKLIST_STATUS_LABELS;
                                              const hasExternalAttachments = (item.anexos_externos?.length ?? 0) > 0;
                                              const isAttachmentExpanded = expandedChecklistAttachmentItemIds.includes(item.id);
                                              return (
                                                <article key={item.id} className="checklist-item">
                                                  <div>
                                                    <p className="checklist-title">
                                                      <span className={`check-status ${statusVisual.tone}`}>
                                                        {statusVisual.icon}
                                                      </span>
                                                      {item.nome_documento}
                                                      {item.obrigatorio && <span className="check-required">Obrigatorio</span>}
                                                    </p>
                                                    <p className="subtitle">Status: {item.status_label ?? statusLabelMap[item.status]}</p>
                                                    {item.observacao && <p className="subtitle">{item.observacao}</p>}
                                                    {allowChecklistExternalLink && item.solicitacao_externa && (
                                                      <div className="external-link-box">
                                                        <p className="subtitle">
                                                          Link externo ativo ate {new Date(item.solicitacao_externa.expira_em).toLocaleString("pt-BR")}
                                                        </p>
                                                        <div className="action-row compact external-link-row">
                                                          <input value={toAbsoluteUrl(item.solicitacao_externa.link_publico)} readOnly />
                                                          <button
                                                            type="button"
                                                            className="ghost"
                                                            onClick={() => onCopyExternalLink(item.solicitacao_externa?.link_publico ?? "")}
                                                          >
                                                            Copiar
                                                          </button>
                                                        </div>
                                                      </div>
                                                    )}
                                                    {hasExternalAttachments && (
                                                      <div className="external-files-panel">
                                                        <button
                                                          type="button"
                                                          className="attachment-chip"
                                                          onClick={() => onToggleChecklistAttachments(item.id)}
                                                        >
                                                          {isAttachmentExpanded
                                                            ? "Ocultar anexos"
                                                            : `Ver anexos (${item.anexos_externos.length})`}
                                                        </button>
                                                        {isAttachmentExpanded && (
                                                          <div className="external-files-list">
                                                            {(item.anexos_externos ?? []).map((file) => (
                                                              <div key={file.id} className="external-file-row">
                                                                <div>
                                                                  <p className="external-file-name">{file.nome_original}</p>
                                                                  <p className="subtitle">
                                                                    {file.nome_remetente} | {formatFileSize(file.tamanho ?? 0)} |{" "}
                                                                    {new Date(file.created_at).toLocaleString("pt-BR")}
                                                                  </p>
                                                                  <p className="subtitle">
                                                                    <span
                                                                      className={`external-link-state ${
                                                                        getExternalLinkState(file).tone
                                                                      }`}
                                                                    >
                                                                      {getExternalLinkState(file).label}
                                                                    </span>
                                                                  </p>
                                                                </div>
                                                                <button
                                                                  type="button"
                                                                  className="secondary"
                                                                  onClick={() =>
                                                                    onDownloadChecklistExternalAttachment(
                                                                      item.id,
                                                                      file.id,
                                                                      file.nome_original
                                                                    )
                                                                  }
                                                                >
                                                                  Baixar
                                                                </button>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                  <div className="action-row compact checklist-actions">
                                                    {canManageInstruments && allowChecklistExternalLink && (
                                                      <button
                                                        type="button"
                                                        className="ghost"
                                                        onClick={() => onGenerateChecklistExternalLink(item.id)}
                                                        disabled={busyChecklistStage === stage || busyExternalLinkItemId === item.id}
                                                      >
                                                        {item.solicitacao_externa ? "Gerar novo link externo" : "Gerar link externo"}
                                                      </button>
                                                    )}
                                                    {canManageInstruments && allowChecklistExternalLink && item.solicitacao_externa && (
                                                      <button
                                                        type="button"
                                                        className="danger"
                                                        onClick={() => onDeactivateChecklistExternalLink(item.id)}
                                                        disabled={busyChecklistStage === stage || busyExternalLinkItemId === item.id}
                                                      >
                                                        Desativar link externo
                                                      </button>
                                                    )}
                                                    {canManageInstruments && (
                                                      <select
                                                        value={item.status}
                                                        onChange={(e) =>
                                                          onUpdateChecklistItemStatus(
                                                            item.id,
                                                            e.target.value as ChecklistItemStatus
                                                          )
                                                        }
                                                        disabled={
                                                          busyChecklistStage === stage ||
                                                          busyChecklistItemId === item.id ||
                                                          busyExternalLinkItemId === item.id
                                                        }
                                                      >
                                                        {statusOptions.map((option) => (
                                                          <option key={option} value={option}>
                                                            {getChecklistStatusOptionLabel(option, statusLabelMap[option])}
                                                          </option>
                                                        ))}
                                                      </select>
                                                    )}
                                                    {canManageInstruments && (
                                                      <button
                                                        type="button"
                                                        className="danger"
                                                        onClick={() => onDeleteChecklistItem(item.id, item.nome_documento)}
                                                        disabled={
                                                          busyChecklistStage === stage ||
                                                          busyChecklistItemId === item.id ||
                                                          busyExternalLinkItemId === item.id
                                                        }
                                                      >
                                                        Excluir item
                                                      </button>
                                                    )}
                                                  </div>
                                                </article>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </section>
                                );
                              })}
                            </div>
                          )}

                          {profileInstrument.status !== "EM_EXECUCAO" && canManageInstruments && (
                            <div className="checklist-start-row">
                              <button
                                type="button"
                                onClick={onStartExecution}
                                disabled={!checklistSummary?.pode_iniciar_execucao || isBusy}
                              >
                                Iniciar execucao
                              </button>
                              {!checklistSummary?.pode_iniciar_execucao && (
                                <p className="subtitle">
                                  Para iniciar execucao, faltam: {checklistSummary?.pendentes_obrigatorios.join(", ") || "adicione itens obrigatorios"}
                                </p>
                              )}
                            </div>
                          )}

                        </div>
                        )}
                      </>
                    )}
                  </div>

                  </>
                )
              ) : (
                <>
                  {canManageInstruments && showCreateInstrumentForm && renderInstrumentForm()}

                  <div className="card table-card">
                    <h3>Lista de instrumentos</h3>
                    {sortedInstruments.length === 0 ? (
                      <p>Nenhum registro encontrado.</p>
                    ) : (
                      <div className="instrument-list">
                        {sortedInstruments.map((item) => (
                          <article key={item.id} className="instrument-card">
                            <div className="instrument-card-head">
                              <p className="eyebrow">Instrumento</p>
                              <h3>{item.instrumento}</h3>
                              <p className="subtitle">Proposta {item.proposta}</p>
                              <p className="subtitle proponente-link">
                                <strong>Proponente:</strong>{" "}
                                {(item.proponente_id ?? item.convenete_id)
                                  ? (proponenteNameById.get(item.proponente_id ?? item.convenete_id ?? 0) ??
                                    `#${item.proponente_id ?? item.convenete_id}`)
                                  : "-"}
                              </p>
                            </div>
                            <p className="instrument-summary">{summarizeText(item.objeto)}</p>
                            <div className="instrument-meta">
                              <span>{item.status}</span>
                              <span>{item.vigencia_fim ? `Vigencia ate ${item.vigencia_fim}` : "Sem vigencia final"}</span>
                              <span>{formatCurrency(item.valor_total)}</span>
                              {item.percentual_fisico_medicao !== null && (
                                <span title="Percentual físico sincronizado do Transferegov" style={{ color: "var(--primary-dark)" }}>
                                  Obra (Tgov): {item.percentual_fisico_medicao.toFixed(2)}%
                                </span>
                              )}
                            </div>                            <div className="action-row compact">
                              <button type="button" className="secondary" onClick={() => onTrack(item.id)}>
                                Acompanhar
                              </button>
                              {canManageInstruments && (
                                <button type="button" onClick={() => onEdit(item, true)}>
                                  Editar
                                </button>
                              )}
                              {canDeactivateInstruments && item.ativo && (
                                <button type="button" className="danger" onClick={() => onDeactivate(item)}>
                                  Inativar
                                </button>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          ) : activeView === "proponentes" ? (
            <section className="dashboard">
              <div className="card editor-card">
                <h3>Selecionar proponentes atendidos (base Transferegov)</h3>
                <div className="filters-grid columns-4">
                  <label>
                    Buscar proponente
                    <input
                      value={proponenteCadastro.busca}
                      onChange={(e) =>
                        setProponenteCadastro((prev) => ({
                          ...prev,
                          busca: e.target.value
                        }))
                      }
                      placeholder="Nome ou CNPJ"
                    />
                  </label>
                  <label>
                    Selecione o proponente
                    <select
                      value={proponenteCadastro.cnpj_selecionado}
                      onChange={(e) =>
                        setProponenteCadastro((prev) => ({
                          ...prev,
                          cnpj_selecionado: e.target.value
                        }))
                      }
                      disabled={proponenteSugestoes.length === 0}
                    >
                      <option value="">Selecione</option>
                      {proponenteSugestoes.map((item) => (
                        <option key={`${item.cnpj}-${item.nome_proponente}`} value={item.cnpj}>
                          {item.nome_proponente} ({formatCnpj(item.cnpj)})
                          {item.cidade || item.uf ? ` - ${item.cidade ?? ""}${item.cidade && item.uf ? "/" : ""}${item.uf ?? ""}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="action-row">
                  <button
                    type="button"
                    onClick={() => void onSearchProponenteSugestoes()}
                    disabled={isLoadingProponenteSugestoes || isBusy}
                  >
                    {isLoadingProponenteSugestoes ? "Buscando..." : "Buscar na base"}
                  </button>
                  {canManageInstruments && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void onAddProponenteAtendido()}
                      disabled={isBusy || proponenteCadastro.cnpj_selecionado.trim() === ""}
                    >
                      Adicionar proponente atendido
                    </button>
                  )}
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setProponenteCadastro(emptyProponenteCadastroState());
                      setProponenteSugestoes([]);
                    }}
                    disabled={isBusy || isLoadingProponenteSugestoes}
                  >
                    Limpar busca
                  </button>
                  {canManageInstruments && (
                    <>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void onSyncTransferenciasDiscricionarias("light")}
                        disabled={isSyncingTransferenciasDiscricionarias}
                      >
                        {isSyncingTransferenciasDiscricionarias && transferenciasDiscricionariasSyncMode === "light"
                          ? "Sincronizando base (leve)..."
                          : "Sincronizar base (teste leve)"}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void onSyncTransferenciasDiscricionarias("full")}
                        disabled={isSyncingTransferenciasDiscricionarias}
                      >
                        {isSyncingTransferenciasDiscricionarias && transferenciasDiscricionariasSyncMode === "full"
                          ? "Sincronizando base (full)..."
                          : "Sincronizar base (completa/full)"}
                      </button>
                    </>
                  )}
                  {canManageInstruments && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void onReimportTodosProponentesInstrumentos()}
                      disabled={isBusy || proponentesImportProgress?.status === "running"}
                    >
                      {proponentesImportProgress?.status === "running" ? "Sincronizando atendidos..." : "Sincronizar todos atendidos"}
                    </button>
                  )}
                </div>
                {proponentesImportProgress && proponentesImportProgress.status !== "idle" && (
                  <div style={{ marginTop: 14 }}>
                    <div className="repasse-progress" role="presentation">
                      <span style={{ width: `${proponentesImportProgress.progresso_percentual}%` }} />
                    </div>
                    <p className="muted" style={{ marginTop: 6 }}>
                      {proponentesImportProgress.message ?? "Sincronizacao em andamento"} - {proponentesImportProgress.processados} de{" "}
                      {proponentesImportProgress.total_proponentes} proponente(s) - {proponentesImportProgress.progresso_percentual}%
                    </p>
                    {proponentesImportProgress.proponente_atual && (
                      <p className="muted" style={{ marginTop: 4 }}>
                        Processando: {proponentesImportProgress.proponente_atual}
                      </p>
                    )}
                  </div>
                )}
                {shouldShowProponentesSyncProgress && (
                  <div className="td-sync-progress-card">
                    <p className="muted td-sync-progress-status">
                      {proponentesSyncPhaseLabel} - {Math.round(proponentesSyncProgressValue)}%
                      {transferenciasDiscricionariasSyncHeartbeatLabel ? ` (${transferenciasDiscricionariasSyncHeartbeatLabel})` : ""}
                    </p>
                    <div className="repasse-progress" role="presentation" style={{ marginTop: 8 }}>
                      <span style={{ width: `${proponentesSyncProgressValue}%` }} />
                    </div>
                    <div className="td-sync-step-trail" aria-label="Etapas da sincronizacao">
                      {proponentesSyncSteps.map((step) => (
                        <span key={step.key} className={`td-sync-step-chip td-sync-step-chip-${step.state}`}>
                          {step.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="card table-card">
                <h3>Lista de proponentes atendidos</h3>
                <div className="search-group" style={{ marginBottom: "16px" }}>
                  <input
                    type="text"
                    placeholder="Filtrar por nome ou CNPJ..."
                    value={proponenteBuscaLocal}
                    onChange={(e) => setProponenteBuscaLocal(e.target.value)}
                  />
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>IMAGEM</th>
                        <th>NOME</th>
                        <th>CNPJ</th>
                        <th>CIDADE/UF</th>
                        <th>ACOES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proponentes.length === 0 ? (
                        <tr>
                          <td colSpan={6}>Nenhum proponente selecionado.</td>
                        </tr>
                      ) : proponentes.filter(p => p.nome.toLowerCase().includes(proponenteBuscaLocal.toLowerCase()) || p.cnpj.includes(proponenteBuscaLocal.replace(/\D/g, ""))).length === 0 ? (
                        <tr>
                          <td colSpan={6}>Nenhum proponente encontrado na busca.</td>
                        </tr>
                      ) : (
                        proponentes.filter(p => p.nome.toLowerCase().includes(proponenteBuscaLocal.toLowerCase()) || p.cnpj.includes(proponenteBuscaLocal.replace(/\D/g, ""))).map((item) => (
                          <tr key={item.id}>
                            <td>{item.id}</td>
                            <td>
                              {item.logo_url ? (
                                <img
                                  src={toAbsoluteUrl(item.logo_url)}
                                  alt={`Imagem de ${item.nome}`}
                                  style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 6, border: "1px solid #cbd5e1" }}
                                />
                              ) : (
                                <span className="muted">Sem imagem</span>
                              )}
                            </td>
                            <td>{item.nome}</td>
                            <td>{formatCnpj(item.cnpj)}</td>
                            <td>{item.cidade}/{item.uf}</td>
                            <td>
                              <div className="action-row compact">
                                <button
                                  type="button"
                                  className="secondary"
                                  onClick={() => onViewProponenteInstruments(item.id)}
                                >
                                  Ver instrumentos
                                </button>
                                {canManageInstruments && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingProponente(item);
                                      setProponenteEditForm({
                                        nome: item.nome || "",
                                        cnpj: item.cnpj || "",
                                        endereco: item.endereco || "",
                                        numero: (item as any).numero || "",
                                        complemento: (item as any).complemento || "",
                                        bairro: item.bairro || "",
                                        cep: item.cep || "",
                                        cidade: item.cidade || "",
                                        uf: item.uf || "",
                                        tel: item.tel || "",
                                        email: item.email || "",
                                        gestorNome: item.gestorNome || "",
                                        gestorCpf: item.gestorCpf || "",
                                        gestorRg: item.gestorRg || "",
                                        gestorEndereco: item.gestorEndereco || "",
                                        gestorEmail: (item as any).gestorEmail || ""
                                      });
                                      setShowProponenteEditModal(true);
                                    }}
                                  >
                                    Editar
                                  </button>
                                )}
                                {canManageInstruments && (
                                  <button
                                    type="button"
                                    className="secondary"
                                    onClick={() => void onReimportProponenteInstrumentos(item)}
                                    disabled={isBusy}
                                    >
                                      Reimportar instrumentos
                                    </button>
                                )}
                                {canManageInstruments && (
                                  <>
                                    <input
                                      id={`proponente-logo-input-${item.id}`}
                                      type="file"
                                      accept="image/png,image/jpeg"
                                      style={{ display: "none" }}
                                      disabled={isBusy}
                                      onChange={(event) => void onUploadProponenteLogoFile(item, event)}
                                    />
                                    <button
                                      type="button"
                                      className="secondary"
                                      onClick={() => {
                                        const input = document.getElementById(
                                          `proponente-logo-input-${item.id}`
                                        ) as HTMLInputElement | null;
                                        input?.click();
                                      }}
                                      disabled={isBusy}
                                    >
                                      Anexar imagem
                                    </button>
                                    <button
                                      type="button"
                                      className="secondary"
                                      onClick={() => void onRemoveProponenteLogo(item)}
                                      disabled={isBusy || !item.logo_url}
                                    >
                                      Remover imagem
                                    </button>
                                    <input
                                      id={`proponente-timbre-input-${item.id}`}
                                      type="file"
                                      accept="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                      style={{ display: "none" }}
                                      disabled={isBusy}
                                      onChange={(event) => void onUploadProponenteTimbreFile(item, event)}
                                    />
                                    <button
                                      type="button"
                                      className="secondary"
                                      onClick={() => {
                                        const input = document.getElementById(
                                          `proponente-timbre-input-${item.id}`
                                        ) as HTMLInputElement | null;
                                        input?.click();
                                      }}
                                      disabled={isBusy}
                                    >
                                      Anexar timbre (DOCX)
                                    </button>
                                    <button
                                      type="button"
                                      className="secondary"
                                      onClick={() => void onRemoveProponenteTimbre(item)}
                                      disabled={isBusy || !(item as any).timbre_url}
                                    >
                                      Remover timbre
                                    </button>
                                  </>
                                )}
                                {canDeleteProponentes && (
                                  <button type="button" className="danger" onClick={() => void onDeleteProponente(item.id)}>
                                    Excluir
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : activeView === "emendas_estaduais" ? (
            <section className="dashboard">
              <div className="card editor-card">
                <h3>{editingEmendaEstadualId ? "Editar Emenda Estadual" : "Cadastrar Emenda Estadual"}</h3>
                <div className="filters-grid columns-4 compact-form-grid emendas-form-grid">
                  <label className="field-objeto">
                    Objeto
                    <textarea
                      value={emendaEstadualForm.objeto}
                      onChange={(e) => setEmendaEstadualForm((prev) => ({ ...prev, objeto: e.target.value }))}
                      rows={3}
                    />
                  </label>
                  <label>
                    Numero
                    <input
                      value={emendaEstadualForm.numero}
                      onChange={(e) => setEmendaEstadualForm((prev) => ({ ...prev, numero: e.target.value }))}
                    />
                  </label>
                  <label>
                    Parlamentar
                    <input
                      value={emendaEstadualForm.parlamentar}
                      onChange={(e) => setEmendaEstadualForm((prev) => ({ ...prev, parlamentar: e.target.value }))}
                    />
                  </label>
                  <label>
                    Inicio vigencia
                    <input
                      type="date"
                      value={emendaEstadualForm.vigencia_inicio}
                      onChange={(e) => setEmendaEstadualForm((prev) => ({ ...prev, vigencia_inicio: e.target.value }))}
                    />
                  </label>
                  <label>
                    Final de vigencia
                    <input
                      type="date"
                      value={emendaEstadualForm.vigencia_fim}
                      onChange={(e) => setEmendaEstadualForm((prev) => ({ ...prev, vigencia_fim: e.target.value }))}
                    />
                  </label>
                  <label>
                    Dias restantes
                    <input
                      value={
                        (() => {
                          const dias = getDaysUntilDate(emendaEstadualForm.vigencia_fim);
                          if (dias === null) return "-";
                          if (dias < 0) return `Vencida ha ${Math.abs(dias)} dia(s)`;
                          return `${dias} dia(s)`;
                        })()
                      }
                      readOnly
                    />
                  </label>
                  <label>
                    Valor
                    <input
                      value={emendaEstadualForm.valor}
                      onChange={(e) =>
                        setEmendaEstadualForm((prev) => ({
                          ...prev,
                          valor: formatCurrencyInput(parseCurrencyInput(e.target.value))
                        }))
                      }
                    />
                  </label>
                  <label>
                    Contrapartida
                    <input
                      value={emendaEstadualForm.contrapartida}
                      onChange={(e) =>
                        setEmendaEstadualForm((prev) => ({
                          ...prev,
                          contrapartida: formatCurrencyInput(parseCurrencyInput(e.target.value))
                        }))
                      }
                    />
                  </label>
                  <label className="field-municipios">
                    Municipios atendidos (base)
                    <select
                      multiple
                      size={8}
                      value={emendaEstadualForm.municipio_ids}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                        setEmendaEstadualForm((prev) => ({ ...prev, municipio_ids: values }));
                      }}
                    >
                      {emendasEstaduaisMunicipios.map((m) => (
                        <option key={m.id} value={String(m.id)}>
                          {m.nome} - {m.cidade}/{m.uf}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="action-row">
                  <button type="button" onClick={() => void onSaveEmendaEstadual()} disabled={isBusy || !canManageInstruments}>
                    {editingEmendaEstadualId ? "Salvar alteracoes" : "Cadastrar emenda"}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setEditingEmendaEstadualId(null);
                      setEmendaEstadualForm(emptyEmendaEstadualForm());
                    }}
                    disabled={isBusy}
                  >
                    Limpar
                  </button>
                </div>
              </div>

              {expandedEmendaDocumentosId === null && (
              <div className="card table-card">
                <h3>Emendas Estaduais cadastradas</h3>
                <div className="filters-grid columns-4 compact-form-grid">
                  <label>
                    Buscar
                    <input
                      value={emendaEstadualSearch}
                      onChange={(e) => setEmendaEstadualSearch(e.target.value)}
                      placeholder="Objeto, numero ou parlamentar"
                    />
                  </label>
                </div>
                <div className="action-row">
                  <button type="button" className="secondary" onClick={() => void loadEmendasEstaduais()} disabled={isBusy}>
                    Atualizar lista
                  </button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Numero</th>
                        <th>Parlamentar</th>
                        <th>Objeto</th>
                        <th>Vigencia</th>
                        <th>Dias restantes</th>
                        <th>Valor</th>
                        <th>Contrapartida</th>
                        <th>Municipios associados</th>
                        <th>Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emendasEstaduais.length === 0 ? (
                        <tr>
                          <td colSpan={9}>Nenhuma emenda estadual cadastrada.</td>
                        </tr>
                      ) : (
                        emendasEstaduais.map((item) => (
                              <tr
                                key={item.id}
                                className="emenda-row-clickable"
                                onClick={() => void onToggleEmendaDocumentos(item.id)}
                              >
                                <td>{item.numero}</td>
                                <td>{item.parlamentar}</td>
                                <td>{normalizeReadableTextSafe(item.objeto)}</td>
                                <td>
                                  {formatDateOnlyPtBr(item.vigencia_inicio)} ate {formatDateOnlyPtBr(item.vigencia_fim)}
                                </td>
                                <td>
                                  {(() => {
                                    const dias = getDaysUntilDate(item.vigencia_fim);
                                    if (dias === null) return "-";
                                    if (dias < 0) return `Vencida ha ${Math.abs(dias)} dia(s)`;
                                    return `${dias} dia(s)`;
                                  })()}
                                </td>
                                <td>{formatCurrency(item.valor)}</td>
                                <td>{formatCurrency(item.contrapartida)}</td>
                                <td>
                                  {item.municipios.length === 0
                                    ? "-"
                                    : item.municipios.map((m) => `${m.nome} (${m.cidade}/${m.uf})`).join(", ")}
                                </td>
                                <td>
                                  <div className="action-row compact">
                                    <button
                                      type="button"
                                      className="secondary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEditEmendaEstadual(item);
                                      }}
                                    >
                                      Editar
                                    </button>
                                    {canManageInstruments && (
                                      <button
                                        type="button"
                                        className="danger"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void onDeleteEmendaEstadual(item.id);
                                        }}
                                        disabled={isBusy}
                                      >
                                        Excluir
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {expandedEmendaDocumentosId !== null && (
                <div className="card table-card">
                  <div className="action-row">
                    <button type="button" className="secondary" onClick={onBackToEmendasList}>
                      Voltar para lista
                    </button>
                  </div>
                  {(() => {
                    const emenda = emendasEstaduais.find((item) => item.id === expandedEmendaDocumentosId) ?? null;
                    if (!emenda) {
                      return <p className="subtitle">Emenda nao encontrada.</p>;
                    }

                    const documentos = emendaDocumentosByEmenda[emenda.id] ?? [];
                    const auditoria = emendaDocumentosAuditByEmenda[emenda.id] ?? [];
                    const uploadFiles = emendaUploadFilesByEmenda[emenda.id] ?? [];

                    return (
                      <div className="ticket-checklist-box">
                        <h3>
                          Emenda {emenda.numero} - {emenda.parlamentar}
                        </h3>
                        <p className="subtitle">{normalizeReadableTextSafe(emenda.objeto)}</p>

                        <h4>Documentos da emenda</h4>
                        {canManageInstruments && (
                          <div className="action-row compact emenda-upload-row">
                            <input
                              className="emenda-file-input"
                              type="file"
                              multiple
                              onChange={(e) => {
                                const files = e.target.files ? Array.from(e.target.files) : [];
                                setEmendaUploadFilesByEmenda((prev) => ({ ...prev, [emenda.id]: files }));
                              }}
                            />
                            <button
                              type="button"
                              className="emenda-upload-btn"
                              onClick={() => void onUploadEmendaDocumentos(emenda.id)}
                              disabled={isBusy || uploadFiles.length === 0}
                            >
                              Anexar multiplos
                            </button>
                            {uploadFiles.length > 0 && (
                              <span className="subtitle">
                                {uploadFiles.length} arquivo(s) selecionado(s)
                              </span>
                            )}
                          </div>
                        )}

                        {documentos.length === 0 ? (
                          <p className="subtitle">Nenhum documento anexado.</p>
                        ) : (
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Arquivo</th>
                                  <th>Versao</th>
                                  <th>Tamanho</th>
                                  <th>Atualizado por</th>
                                  <th>Atualizado em</th>
                                  <th>Acoes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {documentos.map((doc) => (
                                  <tr key={doc.id}>
                                    <td>{doc.arquivo_nome_original}</td>
                                    <td>{doc.versao}</td>
                                    <td>{doc.tamanho ? formatFileSize(doc.tamanho) : "-"}</td>
                                    <td>{doc.updated_by_email}</td>
                                    <td>{new Date(doc.updated_at).toLocaleString("pt-BR")}</td>
                                    <td>
                                      <div className="action-row compact emenda-doc-actions">
                                        <button
                                          type="button"
                                          className="secondary"
                                          onClick={() =>
                                            void onDownloadEmendaDocumento(emenda.id, doc.id, doc.arquivo_nome_original)
                                          }
                                        >
                                          Baixar
                                        </button>
                                        {canManageInstruments && (
                                          <>
                                            <input
                                              className="emenda-file-input emenda-file-input-inline"
                                              type="file"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0] ?? null;
                                                e.target.value = "";
                                                void onReplaceEmendaDocumento(emenda.id, doc.id, file);
                                              }}
                                            />
                                            <button
                                              type="button"
                                              className="danger"
                                              onClick={() => void onDeleteEmendaDocumento(emenda.id, doc.id)}
                                              disabled={isBusy}
                                            >
                                              Remover
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <h4>Auditoria de documentos</h4>
                        {auditoria.length === 0 ? (
                          <p className="subtitle">Sem registros de auditoria.</p>
                        ) : (
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Data</th>
                                  <th>Acao</th>
                                  <th>Usuario</th>
                                  <th>Detalhes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {auditoria.map((log) => (
                                  <tr key={log.id}>
                                    <td>{new Date(log.created_at).toLocaleString("pt-BR")}</td>
                                    <td>{log.acao}</td>
                                    <td>{log.user_nome ?? log.user_email}</td>
                                    <td>{log.documento_id ? `Documento #${log.documento_id}` : "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </section>

          ) : activeView === "documentos" ? (
            <Suspense fallback={<LoadingPanel title="Carregando area de documentos..." />}>
              <DocumentosAreaView
                token={token ?? ""}
                canManage={canManageInstruments}
                onMessage={setMessage}
              />
            </Suspense>

          ) : activeView === "geracao_documentos" ? (
            <section className="dashboard">
              <div className="card filters-card">
                <h3>Gerador de Documentos Dinâmicos</h3>
                <p className="subtitle">Gerencie templates e responsáveis técnicos para geração automática de documentos.</p>
                <div className="tabs" style={{ marginBottom: "16px" }}>
                  <button
                    type="button"
                    className={geracaoDocumentosTab === "templates" ? "tab active" : "tab"}
                    onClick={() => setGeracaoDocumentosTab("templates")}
                  >
                    Templates
                  </button>
                  <button
                    type="button"
                    className={geracaoDocumentosTab === "responsaveis" ? "tab active" : "tab"}
                    onClick={() => setGeracaoDocumentosTab("responsaveis")}
                  >
                    Responsáveis Técnicos
                  </button>
                  <button
                    type="button"
                    className={geracaoDocumentosTab === "historico" ? "tab active" : "tab"}
                    onClick={() => setGeracaoDocumentosTab("historico")}
                  >
                    Histórico
                  </button>
                </div>

                {geracaoDocumentosTab === "templates" && (
                  <>
                    <div className="action-row">
                      <button type="button" onClick={() => setShowGeracaoDocumentoTemplateModal(true)}>
                        + Novo Template
                      </button>
                    </div>
                    {geracaoDocumentosTemplates.length === 0 ? (
                      <p>Nenhum template cadastrado.</p>
                    ) : (
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Código</th>
                              <th>Nome</th>
                              <th>Tipo</th>
                              <th>Status</th>
                              <th>Placeholders</th>
                              <th>Gerações</th>
                              <th>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {geracaoDocumentosTemplates.map((t) => (
                              <tr key={t.id}>
                                <td>{t.codigo}</td>
                                <td>{t.nome}</td>
                                <td>{t.tipo}</td>
                                <td>
                                  <span className={`status-badge ${t.status.toLowerCase()}`}>{t.status}</span>
                                </td>
                                <td>{t.placeholdersJson?.join(", ") || "-"}</td>
                                <td>{t.geracoes}</td>
                                <td>
                                  <button type="button" className="ghost" onClick={() => onEditGeracaoDocumentoTemplate(t)}>
                                    Editar
                                  </button>
                                  <button type="button" className="ghost" onClick={() => onDeleteGeracaoDocumentoTemplate(t.id)}>
                                    Excluir
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}

                {geracaoDocumentosTab === "responsaveis" && (
                  <>
                    <div className="action-row">
                      <button type="button" onClick={() => setShowGeracaoDocumentoResponsavelModal(true)}>
                        + Novo Responsável Técnico
                      </button>
                    </div>
                    {geracaoDocumentosResponsaveis.length === 0 ? (
                      <p>Nenhum responsável técnico cadastrado.</p>
                    ) : (
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Nome</th>
                              <th>CPF</th>
                              <th>CREA</th>
                              <th>Cargo</th>
                              <th>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {geracaoDocumentosResponsaveis.map((r) => (
                              <tr key={r.id}>
                                <td>{r.nome}</td>
                                <td>{r.cpf}</td>
                                <td>{r.crea}</td>
                                <td>{r.cargo}</td>
                                <td>
                                  <button type="button" className="ghost" onClick={() => onDeleteGeracaoDocumentoResponsavel(r.id)}>
                                    Excluir
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}

                {geracaoDocumentosTab === "historico" && (
                  <>
                    {geracaoDocumentosLogs.length === 0 ? (
                      <p>Nenhum documento gerado.</p>
                    ) : (
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Data</th>
                              <th>Instrumento</th>
                              <th>Template</th>
                              <th>Responsável</th>
                              <th>Usuário</th>
                              <th>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {geracaoDocumentosLogs.map((log) => (
                              <tr key={log.id}>
                                <td>{new Date(log.dataGeracao).toLocaleDateString("pt-BR")}</td>
                                <td>{log.instrumento_nome}</td>
                                <td>{log.template_nome}</td>
                                <td>{log.responsavel_tecnico?.nome || "-"}</td>
                                <td>{log.usuario}</td>
                                <td>
                                  <button type="button" className="ghost" onClick={() => downloadDocumentoGeracaoLog(token, log.id, "pdf", `${log.titulo}.pdf`)}>
                                    Baixar PDF
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          ) : activeView === "pagamentos" ? (
            <section className="dashboard">
              {canCreatePaymentRequest && showPaymentCreateForm ? (
              <div className="card editor-card">
                <h3>Solicitar pagamento</h3>
                <form className="form-grid" onSubmit={onSubmitPaymentRequest}>
                  <div className="payment-form-top-grid">
                    <label>
                      Instrumento *
                      <select
                        value={paymentForm.instrumento_id}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, instrumento_id: e.target.value }))}
                        required
                      >
                        <option value="">Selecione</option>
                        {paymentInstruments.map((instrumento) => (
                          <option key={instrumento.id} value={instrumento.id}>
                            {instrumento.instrumento} - {instrumento.proponente_nome ?? "Sem proponente"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Valor da nota *
                      <input
                        value={paymentForm.valor_nota}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, valor_nota: e.target.value }))}
                        onBlur={(e) => setPaymentForm((prev) => ({ ...prev, valor_nota: normalizePaymentCurrencyInput(e.target.value) }))}
                        required
                      />
                    </label>
                    <label>
                      Valor do BM *
                      <input
                        value={paymentForm.valor_bm}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, valor_bm: e.target.value }))}
                        onBlur={(e) => setPaymentForm((prev) => ({ ...prev, valor_bm: normalizePaymentCurrencyInput(e.target.value) }))}
                        required
                      />
                    </label>
                    <label>
                      Numero do BM *
                      <input
                        value={paymentForm.numero_bm}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, numero_bm: e.target.value }))}
                        required
                      />
                    </label>
                  </div>

                  {selectedPaymentInstrument && (
                    <div className="payment-instrument-details">
                      <h3>Dados do instrumento selecionado</h3>
                      <p>{selectedPaymentInstrument.objeto}</p>
                      <div className="summary-grid">
                        <article>
                          <span>Empresa</span>
                          <strong>{selectedPaymentInstrumentCompany?.trim() || "-"}</strong>
                        </article>
                        <article>
                          <span>CNPJ da empresa</span>
                          <strong>{selectedPaymentInstrumentCompanyCnpj?.trim() || "-"}</strong>
                        </article>
                        <article>
                          <span>Percentual da obra</span>
                          <strong>
                            {selectedPaymentInstrumentWorkPercent === null
                              ? "-"
                              : `${selectedPaymentInstrumentWorkPercent.toFixed(2)}%`}
                          </strong>
                        </article>
                        <article>
                          <span>Banco</span>
                          <strong>{selectedPaymentInstrument.banco || "-"}</strong>
                        </article>
                        <article>
                          <span>Agencia</span>
                          <strong>{selectedPaymentInstrument.agencia || "-"}</strong>
                        </article>
                        <article>
                          <span>Conta corrente</span>
                          <strong>{selectedPaymentInstrument.conta || selectedPaymentInstrument.conta_bancaria || "-"}</strong>
                        </article>
                        <article>
                          <span>Total repassado</span>
                          <strong>{formatCurrency(selectedPaymentInstrumentTotals?.total_repassado ?? 0)}</strong>
                        </article>
                        <article>
                          <span>Total pago</span>
                          <strong>{formatCurrency(selectedPaymentInstrumentTotals?.total_pago_sistema ?? 0)}</strong>
                        </article>
                        <article>
                          <span>Saldo disponivel</span>
                          <strong>
                            {selectedPaymentInstrumentTotals === null
                              ? "-"
                              : formatCurrency(selectedPaymentInstrumentTotals.saldo)}
                          </strong>
                        </article>
                        <article>
                          <span>Total de impostos</span>
                          <strong>{formatCurrency(paymentFormTaxesTotal)}</strong>
                        </article>
                        <article>
                          <span>Valor liquido</span>
                          <strong>{formatCurrency(paymentFormNetValue)}</strong>
                        </article>
                      </div>
                    </div>
                  )}

                  <div className="payment-request-layout">
                    <div className="payment-tax-panel">
                      <div className="payment-section-header">
                        <h4>Impostos</h4>
                        <p>Selecione apenas os tributos que entram nesta solicitacao.</p>
                      </div>
                      <div className="payment-tax-list">
                        {PAYMENT_TAXES.map((tax) => (
                          <div key={tax.key} className="payment-tax-row">
                            <div className="payment-tax-label">
                              <strong>{tax.label}</strong>
                            </div>
                            <label className="payment-tax-toggle">
                              <input
                                type="checkbox"
                                checked={paymentForm.impostos[tax.key].selecionado}
                                onChange={(e) => onChangePaymentTax(tax.key, "selecionado", e.target.checked)}
                              />
                              <span>Aplicar</span>
                            </label>
                            <label className="payment-tax-field">
                              <span>Valor</span>
                              <input
                                value={paymentForm.impostos[tax.key].valor}
                                onChange={(e) => onChangePaymentTax(tax.key, "valor", e.target.value)}
                                onBlur={(e) => onChangePaymentTax(tax.key, "valor", normalizePaymentCurrencyInput(e.target.value))}
                                disabled={!paymentForm.impostos[tax.key].selecionado}
                              />
                            </label>
                            <label className="payment-tax-field payment-tax-field-small">
                              <span>Aliquota %</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={paymentForm.impostos[tax.key].aliquota}
                                onChange={(e) => onChangePaymentTax(tax.key, "aliquota", e.target.value)}
                                disabled={!paymentForm.impostos[tax.key].selecionado}
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="payment-side-panel">
                      <div className="payment-upload-panel">
                        <div className="payment-section-header">
                          <h4>Anexos</h4>
                          <p>Envie os documentos de suporte antes de concluir a solicitacao.</p>
                        </div>
                        <label>
                          Nota Fiscal
                          <span className="payment-file-picker">
                            <span>{paymentForm.nota_fiscal ? paymentForm.nota_fiscal.name : "Anexar Nota Fiscal"}</span>
                            <input
                              type="file"
                              accept="application/pdf,image/png,image/jpeg"
                              onChange={(e) => setPaymentForm((prev) => ({ ...prev, nota_fiscal: e.target.files?.[0] ?? null }))}
                            />
                          </span>
                        </label>
                        <label>
                          Empenho
                          <span className="payment-file-picker">
                            <span>{paymentForm.empenho ? paymentForm.empenho.name : "Anexar Empenho"}</span>
                            <input
                              type="file"
                              accept="application/pdf,image/png,image/jpeg"
                              onChange={(e) => setPaymentForm((prev) => ({ ...prev, empenho: e.target.files?.[0] ?? null }))}
                            />
                          </span>
                        </label>
                      </div>

                      <label className="payment-notes-field">
                        Observacoes
                        <textarea
                          rows={6}
                          value={paymentForm.observacoes}
                          onChange={(e) => setPaymentForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="action-row">
                    <button type="submit" disabled={isBusy}>
                      Solicitar pagamento
                    </button>
                    <button type="button" className="secondary" onClick={() => setPaymentForm(emptyPaymentForm())}>
                      Limpar formulario
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        setPaymentForm(emptyPaymentForm());
                        setShowPaymentCreateForm(false);
                      }}
                    >
                      Voltar para solicitacoes
                    </button>
                  </div>
                </form>
              </div>
              ) : (

              <div className="card table-card">
                <div className="section-heading-row">
                  <h3>Solicitacoes de pagamento</h3>
                  {canCreatePaymentRequest && (
                    <button type="button" onClick={() => setShowPaymentCreateForm(true)}>
                      Novo pagamento
                    </button>
                  )}
                </div>
                <div className="filters-grid columns-4">
                  <label>
                    Status
                    <select
                      value={paymentFilters.status}
                      onChange={(e) =>
                        setPaymentFilters((prev) => ({ ...prev, status: e.target.value as PaymentRequestStatus | "" }))
                      }
                    >
                      <option value="">Todos</option>
                      {PAYMENT_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {PAYMENT_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Proponente
                    <select
                      value={paymentFilters.proponente_id}
                      onChange={(e) => setPaymentFilters((prev) => ({ ...prev, proponente_id: e.target.value }))}
                    >
                      <option value="">Todos</option>
                      {proponentes.map((proponente) => (
                        <option key={proponente.id} value={proponente.id}>
                          {proponente.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Instrumento
                    <select
                      value={paymentFilters.instrumento_id}
                      onChange={(e) => setPaymentFilters((prev) => ({ ...prev, instrumento_id: e.target.value }))}
                    >
                      <option value="">Todos</option>
                      {paymentInstruments.map((instrumento) => (
                        <option key={instrumento.id} value={instrumento.id}>
                          {instrumento.instrumento}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="action-row compact">
                    <button type="button" onClick={onApplyPaymentFilters} disabled={isBusy}>
                      Filtrar
                    </button>
                  </div>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Instrumento</th>
                        <th>Proponente</th>
                        <th>BM</th>
                        <th>Valor nota</th>
                        <th>Valor liquido</th>
                        <th>Valor BM</th>
                        <th>Impostos</th>
                        <th>Anexos</th>
                        <th>Status</th>
                        <th>Solicitado por</th>
                        <th>Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentRequests.length === 0 ? (
                        <tr>
                          <td colSpan={11}>Nenhuma solicitacao de pagamento encontrada.</td>
                        </tr>
                      ) : (
                        paymentRequests.map((item) => (
                          <tr key={item.id}>
                            <td>{item.id}</td>
                            <td>
                              <strong>{item.instrumento}</strong>
                              <p className="subtitle">{item.objeto}</p>
                            </td>
                            <td>{item.proponente_nome}</td>
                            <td>{item.numero_bm}</td>
                            <td>{formatCurrency(item.valor_nota)}</td>
                            <td>{formatCurrency(item.valor_liquido)}</td>
                            <td>{formatCurrency(item.valor_bm)}</td>
                            <td>
                              {PAYMENT_TAXES.map((tax) => {
                                const imposto = item.impostos[tax.key];
                                return imposto.valor > 0 || imposto.aliquota > 0 ? (
                                  <p key={tax.key} className="subtitle">
                                    {tax.label}: {formatCurrency(imposto.valor)} ({imposto.aliquota}%)
                                  </p>
                                ) : null;
                              })}
                            </td>
                            <td>
                              {item.anexos.nota_fiscal ? (
                                <button
                                  type="button"
                                  className="ghost"
                                  onClick={() => onOpenPaymentPreview(item, "nota_fiscal", item.anexos.nota_fiscal?.nome_original ?? "nota-fiscal")}
                                >
                                  Nota Fiscal
                                </button>
                              ) : (
                                <p className="subtitle">Nota Fiscal: -</p>
                              )}
                              {item.anexos.empenho ? (
                                <button
                                  type="button"
                                  className="ghost"
                                  onClick={() => onOpenPaymentPreview(item, "empenho", item.anexos.empenho?.nome_original ?? "empenho")}
                                >
                                  Empenho
                                </button>
                              ) : (
                                <p className="subtitle">Empenho: -</p>
                              )}
                            </td>
                            <td>
                              {canUpdatePaymentRequestStatus ? (
                                <select
                                  className={`payment-status-select ${PAYMENT_STATUS_CLASSNAMES[item.status]}`}
                                  value={item.status}
                                  onChange={(e) => onUpdatePaymentStatus(item, e.target.value as PaymentRequestStatus)}
                                >
                                  {PAYMENT_STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>
                                      {PAYMENT_STATUS_LABELS[status]}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className={`payment-status-chip ${PAYMENT_STATUS_CLASSNAMES[item.status]}`}>
                                  {PAYMENT_STATUS_LABELS[item.status]}
                                </span>
                              )}
                            </td>
                            <td>{item.solicitado_por_nome}</td>
                            <td>{new Date(item.created_at).toLocaleString("pt-BR")}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
              {paymentPreview && (
                <div className="stage-followup-modal-overlay" onClick={onClosePaymentPreview}>
                  <div className="stage-followup-modal payment-preview-modal" onClick={(event) => event.stopPropagation()}>
                    <div className="stage-followup-modal-head">
                      <h5>{paymentPreview.nome}</h5>
                      <button type="button" className="ghost compact-link" onClick={onClosePaymentPreview}>
                        Fechar
                      </button>
                    </div>
                    <div className="payment-preview-body">
                      {paymentPreview.mimeType.startsWith("image/") ? (
                        <img src={paymentPreview.url} alt={paymentPreview.nome} />
                      ) : (
                        <iframe src={paymentPreview.url} title={paymentPreview.nome} />
                      )}
                    </div>
                    <div className="action-row">
                      <button type="button" onClick={onDownloadPaymentPreview}>
                        Baixar arquivo
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          ) : activeView === "usuarios" ? (
            <section className="dashboard">
              {isAdmin ? (
                <>
                  <div className="card editor-card">
                    <h3>{editingManagedUserId ? `Editar usuario #${editingManagedUserId}` : "Novo usuario"}</h3>
                    <form className="form-grid" onSubmit={onSaveManagedUser}>
                      <div className="filters-grid columns-4">
                        <label>
                          Nome *
                          <input
                            value={adminUserForm.nome}
                            onChange={(e) => onChangeAdminUserForm("nome", e.target.value)}
                            required
                          />
                        </label>
                        <label>
                          E-mail *
                          <input
                            type="email"
                            value={adminUserForm.email}
                            onChange={(e) => onChangeAdminUserForm("email", e.target.value)}
                            required
                          />
                        </label>
                        <label>
                          Perfil *
                          <select
                            value={adminUserForm.role}
                            onChange={(e) => onChangeAdminUserForm("role", e.target.value as Role)}
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="GESTOR">GESTOR</option>
                            <option value="CONSULTA">CONSULTA</option>
                            <option value="FINANCEIRO">FINANCEIRO</option>
                            <option value="DEMONSTRACAO">DEMONSTRACAO</option>
                          </select>
                        </label>
                        <label>
                          Senha {editingManagedUserId ? "(opcional)" : "*"}
                          <input
                            type="password"
                            minLength={6}
                            value={adminUserForm.senha}
                            onChange={(e) => onChangeAdminUserForm("senha", e.target.value)}
                            required={editingManagedUserId === null}
                          />
                        </label>
                        <label>
                          Proponentes permitidos
                          <select
                            multiple
                            value={adminUserForm.proponente_ids}
                            onChange={onChangeAdminUserProponentes}
                            disabled={adminUserForm.role === "DEMONSTRACAO"}
                          >
                            {proponentes.map((proponente) => (
                              <option key={proponente.id} value={proponente.id}>
                                {proponente.nome} - {proponente.cidade}/{proponente.uf}
                              </option>
                            ))}
                          </select>
                          {adminUserForm.role === "DEMONSTRACAO" && (
                            <small className="field-hint">Perfil de demonstracao sempre inicia em ambiente isolado e sem proponentes vinculados.</small>
                          )}
                        </label>
                      </div>

                      <div className="action-row">
                        <button type="submit" disabled={isBusy}>
                          {editingManagedUserId ? "Salvar alteracoes" : "Criar usuario"}
                        </button>
                        <button type="button" className="secondary" onClick={clearAdminUserForm}>
                          Limpar formulario
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="card table-card">
                    <h3>Usuarios cadastrados</h3>
                    <div className="action-row compact">
                      <button type="button" className="secondary" onClick={onSeedDemoData} disabled={isBusy}>
                        Carregar 10 instrumentos demo
                      </button>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Avatar</th>
                            <th>Nome</th>
                            <th>E-mail</th>
                            <th>Perfil</th>
                            <th>Proponentes</th>
                            <th>Criado em</th>
                            <th>Acoes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {managedUsers.length === 0 ? (
                            <tr>
                              <td colSpan={8}>Nenhum usuario cadastrado.</td>
                            </tr>
                          ) : (
                            managedUsers.map((item) => (
                              <tr key={item.id}>
                                <td>{item.id}</td>
                                <td>
                                  {item.avatar_url ? (
                                    <img className="table-avatar" src={toAbsoluteUrl(item.avatar_url)} alt={item.nome} />
                                  ) : (
                                    <div className="table-avatar table-avatar-fallback">
                                      {getInitials(item.nome, item.email)}
                                    </div>
                                  )}
                                </td>
                                <td>{item.nome}</td>
                                <td>{item.email}</td>
                                <td>{item.role}</td>
                                <td>{item.proponentes.map((proponente) => proponente.nome).join(", ") || "-"}</td>
                                <td>{new Date(item.created_at).toLocaleString("pt-BR")}</td>
                                <td>
                                  <div className="action-row compact">
                                    <button type="button" onClick={() => onEditManagedUser(item)}>
                                      Editar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="card table-card">
                  <p>Acesso restrito a administradores.</p>
                </div>
              )}
            </section>
          ) : activeView === "tickets" ? (
            <section className="dashboard ticket-helpdesk-view">
              <div className="ticket-helpdesk-shell">
                <aside className="card ticket-helpdesk-nav">
                  <p className="eyebrow">Help Desk</p>
                  <h3>Central de Tickets</h3>
                  <p className="subtitle">Fila operacional para triagem, acompanhamento e resolucao.</p>

                  <div className="ticket-helpdesk-board-menu">
                    <button
                      type="button"
                      className={ticketBoardTab === "abertos" ? "ticket-board-tab active" : "ticket-board-tab"}
                      onClick={() => onChangeTicketBoardTab("abertos")}
                    >
                      Em aberto ({openTickets.length})
                    </button>
                    <button
                      type="button"
                      className={ticketBoardTab === "resolvidos" ? "ticket-board-tab active" : "ticket-board-tab"}
                      onClick={() => onChangeTicketBoardTab("resolvidos")}
                    >
                      Resolvidos ({resolvedTickets.length})
                    </button>
                    <button
                      type="button"
                      className={ticketBoardTab === "cancelados" ? "ticket-board-tab active" : "ticket-board-tab"}
                      onClick={() => onChangeTicketBoardTab("cancelados")}
                    >
                      Cancelados ({canceledTickets.length})
                    </button>
                  </div>

                  <div className="ticket-helpdesk-kpis">
                    <article>
                      <span>Total no painel</span>
                      <strong>{visibleTickets.length}</strong>
                    </article>
                    <article>
                      <span>Alta/Critica</span>
                      <strong>{visibleTickets.filter((item) => item.prioridade === "ALTA" || item.prioridade === "CRITICA").length}</strong>
                    </article>
                    <article>
                      <span>Atrasados</span>
                      <strong>
                        {
                          visibleTickets.filter((item) =>
                            item.prazo_alvo && (item.status === "ABERTO" || item.status === "EM_ANDAMENTO")
                              ? new Date(`${item.prazo_alvo}T00:00:00.000Z`) < new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z")
                              : false
                          ).length
                        }
                      </strong>
                    </article>
                  </div>

                  <div className="ticket-helpdesk-nav-actions">
                    <button type="button" className="secondary" onClick={() => refreshData()} disabled={isBusy}>
                      Atualizar fila
                    </button>
                    {canManageInstruments && (
                      <button
                        type="button"
                        onClick={() => setShowTicketCreateModal(true)}
                      >
                        Criar novo ticket
                      </button>
                    )}
                  </div>
                </aside>

                <div className="ticket-helpdesk-main">
                  <div className="card ticket-helpdesk-toolbar">
                    <div className="ticket-helpdesk-toolbar-head">
                      <h3>
                        {ticketBoardTab === "abertos"
                          ? `Tickets em aberto (${openTickets.length})`
                          : ticketBoardTab === "resolvidos"
                            ? `Tickets resolvidos (${resolvedTickets.length})`
                            : `Tickets cancelados (${canceledTickets.length})`}
                      </h3>
                      <p className="subtitle">Visao tabular inspirada em helpdesk para operacao diaria.</p>
                    </div>

                    <div className="ticket-helpdesk-filters filters-grid columns-5">
                      <label>
                        Busca livre
                        <input
                          value={ticketFilters.q}
                          onChange={(e) => setTicketFilters((prev) => ({ ...prev, q: e.target.value }))}
                          placeholder="Codigo, titulo, descricao"
                        />
                      </label>
                      <label>
                        Status
                        <select
                          value={ticketFilters.status}
                          onChange={(e) =>
                            setTicketFilters((prev) => ({ ...prev, status: e.target.value as TicketStatus | "" }))
                          }
                        >
                          <option value="">Todos</option>
                          {TICKET_STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {TICKET_STATUS_LABELS[option]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Prioridade
                        <select
                          value={ticketFilters.prioridade}
                          onChange={(e) =>
                            setTicketFilters((prev) => ({ ...prev, prioridade: e.target.value as TicketPriority | "" }))
                          }
                        >
                          <option value="">Todas</option>
                          {TICKET_PRIORITY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {TICKET_PRIORITY_LABELS[option]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Origem
                        <select
                          value={ticketFilters.origem}
                          onChange={(e) =>
                            setTicketFilters((prev) => ({ ...prev, origem: e.target.value as TicketSource | "" }))
                          }
                        >
                          <option value="">Todas</option>
                          {TICKET_SOURCE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {TICKET_SOURCE_LABELS[option]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="ticket-overdue-toggle">
                        <span>Somente atrasados</span>
                        <input
                          type="checkbox"
                          checked={ticketFilters.somente_atrasados}
                          onChange={(e) =>
                            setTicketFilters((prev) => ({ ...prev, somente_atrasados: e.target.checked }))
                          }
                        />
                      </label>
                      <label>
                        Instrumento
                        <select
                          value={ticketFilters.instrument_id}
                          onChange={(e) => setTicketFilters((prev) => ({ ...prev, instrument_id: e.target.value }))}
                        >
                          <option value="">Todos</option>
                          {sortedInstruments.map((item) => (
                            <option key={item.id} value={String(item.id)}>
                              {summarizeText(`${item.instrumento} | proposta ${item.proposta}`, 36)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Responsavel
                        <select
                          value={ticketFilters.responsavel_user_id}
                          onChange={(e) =>
                            setTicketFilters((prev) => ({ ...prev, responsavel_user_id: e.target.value }))
                          }
                          disabled={ticketAssignableUsers.length === 0}
                        >
                          <option value="">Todos</option>
                          {ticketAssignableUsers.map((userItem) => (
                            <option key={userItem.id} value={String(userItem.id)}>
                              {userItem.nome} ({userItem.role})
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="ticket-helpdesk-actions action-row">
                      <button type="button" onClick={onApplyTicketFilters} disabled={isBusy}>
                        Aplicar filtros
                      </button>
                      <button type="button" className="secondary" onClick={onClearTicketFilters} disabled={isBusy}>
                        Limpar filtros
                      </button>
                      <button type="button" className="secondary" onClick={onFilterMyTickets} disabled={isBusy || !user}>
                        Meus tickets
                      </button>
                    </div>
                  </div>

                  {showTicketCreateModal && canManageInstruments && (
                    <div className="stage-followup-modal-overlay" onClick={() => setShowTicketCreateModal(false)}>
                      <div className="stage-followup-modal ticket-create-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="stage-followup-modal-head">
                          <h5>Abrir ticket manual</h5>
                          <button type="button" className="ghost compact-link" onClick={() => setShowTicketCreateModal(false)}>
                            Fechar
                          </button>
                        </div>
                        <form className="form-grid" onSubmit={onCreateTicket}>
                          <div className="filters-grid columns-4">
                            <label>
                              Titulo *
                              <input
                                value={ticketForm.titulo}
                                onChange={(e) => setTicketForm((prev) => ({ ...prev, titulo: e.target.value }))}
                                placeholder="Ex.: Pendencia documental no instrumento"
                                required
                              />
                            </label>
                            <label>
                              Prioridade
                              <select
                                value={ticketForm.prioridade}
                                onChange={(e) =>
                                  setTicketForm((prev) => ({ ...prev, prioridade: e.target.value as TicketPriority }))
                                }
                              >
                                {TICKET_PRIORITY_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {TICKET_PRIORITY_LABELS[option]}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Prazo alvo (SLA)
                              <input
                                type="date"
                                value={ticketForm.prazo_alvo}
                                onChange={(e) => setTicketForm((prev) => ({ ...prev, prazo_alvo: e.target.value }))}
                              />
                            </label>
                            <label>
                              Instrumento (opcional)
                              <select
                                value={ticketForm.instrument_id}
                                onChange={(e) => setTicketForm((prev) => ({ ...prev, instrument_id: e.target.value }))}
                              >
                                <option value="">Nao associado</option>
                                {sortedInstruments.map((item) => (
                                  <option key={item.id} value={String(item.id)}>
                                    {summarizeText(`${item.instrumento} | proposta ${item.proposta}`, 44)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Instrumento informado
                              <input
                                value={ticketForm.instrumento_informado}
                                onChange={(e) =>
                                  setTicketForm((prev) => ({ ...prev, instrumento_informado: e.target.value }))
                                }
                                placeholder="Texto livre para identificacao"
                              />
                            </label>
                            <label>
                              Responsavel inicial
                              <select
                                value={ticketForm.responsavel_user_id}
                                onChange={(e) =>
                                  setTicketForm((prev) => ({ ...prev, responsavel_user_id: e.target.value }))
                                }
                              >
                                <option value="">Nao atribuido</option>
                                {ticketAssignableUsers.map((userItem) => (
                                  <option key={userItem.id} value={String(userItem.id)}>
                                    {userItem.nome} ({userItem.role})
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <label>
                            Descricao
                            <textarea
                              rows={3}
                              value={ticketForm.descricao}
                              onChange={(e) => setTicketForm((prev) => ({ ...prev, descricao: e.target.value }))}
                              placeholder="Contexto do atendimento"
                            />
                          </label>
                          <div className="action-row">
                            <button type="submit" disabled={isBusy}>
                              Criar ticket
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {!selectedTicket ? (
                    <div className="tickets-layout ticket-list-layout">
                      <div className="card table-card ticket-grid-card">
                        {visibleTickets.length === 0 ? (
                          <p>Nenhum ticket encontrado.</p>
                        ) : (
                          <div className="ticket-grid-wrap">
                            <table className="ticket-grid-table">
                              <thead>
                              <tr>
                                <th>Tracking ID</th>
                                <th>Atualizado</th>
                                <th>Solicitante</th>
                                <th>Assunto</th>
                                <th>Status</th>
                                <th>Atribuido</th>
                                <th>Prioridade</th>
                                <th>Prazo alvo</th>
                                <th>SLA</th>
                              </tr>
                            </thead>
                              <tbody>
                                {visibleTickets.map((item) => (
                                  <tr
                                    key={item.id}
                                    className="ticket-row"
                                    onClick={() => onSelectTicket(item.id)}
                                  >
                                    <td>
                                      <button type="button" className="ticket-row-link" onClick={() => onSelectTicket(item.id)}>
                                        {item.codigo}
                                      </button>
                                    </td>
                                    <td>
                                      <div className="ticket-row-subject">
                                        <strong>{new Date(item.updated_at).toLocaleString("pt-BR")}</strong>
                                        <span>{formatRelativeTimeFromIso(item.updated_at)}</span>
                                      </div>
                                    </td>
                                    <td>{item.criado_por.nome}</td>
                                    <td>
                                      <div className="ticket-row-subject">
                                        <strong>{item.titulo}</strong>
                                        <span>{formatTicketInstrumentLabel(item)}</span>
                                      </div>
                                    </td>
                                    <td>
                                      <span className={`ticket-status-chip ${item.status.toLowerCase()}`}>
                                        {TICKET_STATUS_LABELS[item.status]}
                                      </span>
                                    </td>
                                    <td>{item.responsavel?.nome ?? "Nao atribuido"}</td>
                                    <td>
                                      <span className={`ticket-priority-chip ${item.prioridade.toLowerCase()}`}>
                                        {TICKET_PRIORITY_LABELS[item.prioridade]}
                                      </span>
                                    </td>
                                    <td>{item.prazo_alvo ? formatDateOnlyPtBr(item.prazo_alvo) : "Nao definido"}</td>
                                    <td>{formatTicketSla(item)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="card table-card ticket-detail-card ticket-detail-page">
                      <div className="ticket-detail-page-head">
                        <button type="button" className="ghost" onClick={onCloseTicketDetail}>
                          Voltar para fila
                        </button>
                        <p className="subtitle">Detalhes completos do ticket selecionado.</p>
                      </div>
                      <div className="ticket-detail">
                      <div>
                        <p className="eyebrow">{selectedTicket.codigo}</p>
                        <h3>{selectedTicket.titulo}</h3>
                        <p className="subtitle">
                          {TICKET_STATUS_LABELS[selectedTicket.status]} | {TICKET_SOURCE_LABELS[selectedTicket.origem]} | Criado em {" "}
                          {new Date(selectedTicket.created_at).toLocaleString("pt-BR")}
                        </p>
                        <p className="subtitle">
                          Prioridade: {TICKET_PRIORITY_LABELS[selectedTicket.prioridade]} | SLA: {formatTicketSla(selectedTicket)}
                        </p>
                        <p className="subtitle">
                          Criado por {selectedTicket.criado_por.nome} ({selectedTicket.criado_por.role})
                        </p>
                      </div>

                      <div className="details-grid">
                        {(!selectedTicket.instrumento || !selectedTicket.instrumento_encontrado) && selectedTicket.origem === "EMAIL" && (
                          <div className="ticket-instrument-warning">
                            <span className="warning-icon">!</span>
                            <div>
                              <strong>Instrumento não identificado automaticamente</strong>
                              {selectedTicket.instrumento_informado && (
                                <p className="subtitle">Texto identificado: {selectedTicket.instrumento_informado}</p>
                              )}
                            </div>
                          </div>
                        )}
                        <p>
                          <strong>Instrumento:</strong>{" "}
                          {formatTicketInstrumentLabel(selectedTicket, "Nao informado")}
                        </p>
                        {selectedTicket.origem === "EMAIL" && selectedTicket.instrumento && canManageInstruments && (
                          <div className="ticket-instrument-associate">
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => void onDissociateTicketInstrument()}
                              disabled={isBusy}
                            >
                              Desassociar instrumento
                            </button>
                          </div>
                        )}
                        {!selectedTicket.instrumento && canManageInstruments && (
                          <div className="ticket-instrument-associate">
                            <label>
                              Buscar instrumento para associar:
                              <input
                                type="text"
                                value={ticketInstrumentSearch}
                                onChange={(e) => onSearchTicketInstrument(e.target.value)}
                                placeholder="Digite proposta, instrumento ou objeto..."
                              />
                            </label>
                            {ticketInstrumentSearching && <p className="subtitle">Buscando...</p>}
                            {ticketInstrumentResults.length > 0 && (
                              <div className="ticket-instrument-results">
                                {ticketInstrumentResults.map((inst) => (
                                  <button
                                    key={inst.id}
                                    type="button"
                                    className="instrument-result-item"
                                    onClick={() => onAssociateTicketInstrument(inst.id)}
                                    disabled={isBusy}
                                  >
                                    <strong>{inst.proposta || inst.instrumento || `#${inst.id}`}</strong>
                                    <span className="subtitle">{inst.objeto}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <p>
                          <strong>Responsavel:</strong> {selectedTicket.responsavel?.nome ?? "Nao atribuido"}
                        </p>
                        <div className="ticket-description-block">
                          <strong>Descricao:</strong>
                          <div className="ticket-description-text">{selectedTicket.descricao ?? "Sem descricao"}</div>
                        </div>
                        <p>
                          <strong>Prazo alvo:</strong>{" "}
                          {selectedTicket.prazo_alvo ? formatDateOnlyPtBr(selectedTicket.prazo_alvo) : "Nao definido"}
                        </p>
                        {selectedTicket.resolvido_em && (
                          <p>
                            <strong>Resolvido em:</strong> {new Date(selectedTicket.resolvido_em).toLocaleString("pt-BR")}
                          </p>
                        )}
                        {selectedTicket.motivo_resolucao && (
                          <p>
                            <strong>Motivo da resolucao:</strong> {selectedTicket.motivo_resolucao}
                          </p>
                        )}
                      </div>

                      {selectedTicket.origem === "EMAIL" && selectedTicket.checklist_itens.length > 0 && (
                        <div className="ticket-email-pending-box">
                          <div className="ticket-email-pending-header">
                            <span className="ticket-email-pending-icon">i</span>
                            <div>
                              <h4 className="ticket-email-pending-title">Pendências identificadas via email</h4>
                              <p className="ticket-email-pending-subtitle">
                                {selectedTicket.checklist_itens.filter((i) => i.concluido).length} de{" "}
                                {selectedTicket.checklist_itens.length} pendência
                                {selectedTicket.checklist_itens.length !== 1 ? "s" : ""} concluída
                                {selectedTicket.checklist_itens.filter((i) => i.concluido).length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          <div className="ticket-email-pending-progress">
                            <div
                              className="ticket-email-pending-progress-bar"
                              style={{
                                width: `${
                                  selectedTicket.checklist_itens.length > 0
                                    ? Math.round(
                                        (selectedTicket.checklist_itens.filter((i) => i.concluido).length /
                                          selectedTicket.checklist_itens.length) *
                                          100
                                      )
                                    : 0
                                }%`
                              }}
                            />
                          </div>
                          <div className="ticket-checklist-list">
                            {selectedTicket.checklist_itens.map((item) => (
                              <label key={item.id} className="ticket-email-pending-item">
                                <input
                                  type="checkbox"
                                  checked={item.concluido}
                                  onChange={(e) =>
                                    onToggleTicketChecklistItem(selectedTicket.id, item.id, e.target.checked)
                                  }
                                  disabled={isBusy || !canManageInstruments}
                                />
                                <span className={item.concluido ? "done" : ""}>{item.descricao}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="ticket-checklist-box">
                        <h3>
                          Checklist ({selectedTicket.checklist_itens.filter((item) => item.concluido).length}/
                          {selectedTicket.checklist_itens.length})
                        </h3>
                        {selectedTicket.checklist_itens.length === 0 ? (
                          <p className="subtitle">Sem checklist neste ticket.</p>
                        ) : (
                          <div className="ticket-checklist-list">
                            {selectedTicket.checklist_itens.map((item) => (
                              <label key={item.id} className="ticket-checklist-item">
                                <input
                                  type="checkbox"
                                  checked={item.concluido}
                                  onChange={(e) =>
                                    onToggleTicketChecklistItem(selectedTicket.id, item.id, e.target.checked)
                                  }
                                  disabled={isBusy || !canManageInstruments}
                                />
                                <span className={item.concluido ? "done" : ""}>{item.descricao}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      {canManageInstruments && (
                        <>
                          <div className="action-row compact">
                            <label>
                              Prioridade
                              <select
                                value={selectedTicket.prioridade}
                                onChange={(e) => onUpdateTicketPriority(selectedTicket.id, e.target.value as TicketPriority)}
                                disabled={isBusy}
                              >
                                {TICKET_PRIORITY_OPTIONS.map((priority) => (
                                  <option key={priority} value={priority}>
                                    {TICKET_PRIORITY_LABELS[priority]}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Prazo alvo
                              <input
                                type="date"
                                value={selectedTicket.prazo_alvo ? selectedTicket.prazo_alvo.slice(0, 10) : ""}
                                onChange={(e) => onUpdateTicketDueDate(selectedTicket.id, e.target.value)}
                                disabled={isBusy}
                              />
                            </label>
                          </div>

                          <div className="ticket-resolution-box">
                            <label>
                              Motivo de resolucao (obrigatorio para concluir)
                              <textarea
                                rows={2}
                                value={ticketResolutionReason}
                                onChange={(e) => setTicketResolutionReason(e.target.value)}
                                placeholder="Descreva o que foi feito para resolver"
                              />
                            </label>
                          </div>

                          {selectedTicket.status === "RESOLVIDO" && (
                            <div className="action-row compact">
                              <button
                                type="button"
                                onClick={() => onUpdateTicketStatus(selectedTicket.id, "EM_ANDAMENTO")}
                                disabled={isBusy || !isAdmin}
                              >
                                Reabrir ticket
                              </button>
                            </div>
                          )}

                          <div className="action-row compact">
                            {TICKET_STATUS_OPTIONS.map((status) => {
                              const isReopenStatus = status === "ABERTO" || status === "EM_ANDAMENTO";
                              const blockedByRole =
                                selectedTicket.status === "RESOLVIDO" && isReopenStatus && !isAdmin;
                              const isActive = selectedTicket.status === status;
                              const colorClass = {
                                ABERTO: "ticket-status-btn-aberto",
                                EM_ANDAMENTO: "ticket-status-btn-andamento",
                                RESOLVIDO: "ticket-status-btn-resolvido",
                                CANCELADO: "ticket-status-btn-cancelado"
                              }[status];
                              return (
                                <button
                                  key={status}
                                  type="button"
                                  className={`ticket-status-btn ${colorClass}${isActive ? " active" : ""}`}
                                  onClick={() => onUpdateTicketStatus(selectedTicket.id, status)}
                                  disabled={isBusy || isActive || blockedByRole}
                                  title={blockedByRole ? "Somente ADMIN pode reabrir ticket resolvido." : undefined}
                                >
                                  {TICKET_STATUS_LABELS[status]}
                                </button>
                              );
                            })}
                          </div>

                          <div className="action-row compact">
                            <label>
                              Alterar responsavel
                              <select
                                value={selectedTicket.responsavel?.id ? String(selectedTicket.responsavel.id) : ""}
                                onChange={(e) => onAssignTicket(selectedTicket.id, e.target.value)}
                                disabled={isBusy}
                              >
                                <option value="">Nao atribuido</option>
                                {ticketAssignableUsers.map((userItem) => (
                                  <option key={userItem.id} value={String(userItem.id)}>
                                    {userItem.nome} ({userItem.role})
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        </>
                      )}

                      <div className="ticket-comments">
                        <h3>Acompanhamentos ({selectedTicket.comentarios.length})</h3>
                        {selectedTicket.comentarios.length === 0 ? (
                          <p className="subtitle">Nenhum acompanhamento registrado.</p>
                        ) : (
                          <div className="ticket-comment-list">
                            {selectedTicket.comentarios.map((comment) => (
                              <article key={comment.id} className="ticket-comment-item">
                                <p className="ticket-comment-head">
                                  <strong>{comment.user.nome}</strong> ({comment.user.role})
                                </p>
                                <p className="subtitle">{new Date(comment.created_at).toLocaleString("pt-BR")}</p>
                                <p>{comment.mensagem}</p>
                              </article>
                            ))}
                          </div>
                        )}

                        {canManageInstruments && (
                          <div className="ticket-comment-form">
                            <textarea
                              rows={3}
                              value={ticketCommentText}
                              onChange={(e) => setTicketCommentText(e.target.value)}
                              placeholder="Adicionar acompanhamento"
                            />
                            <div className="action-row compact">
                              <button type="button" onClick={onAddTicketComment} disabled={isBusy}>
                                Registrar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      </div>
                    </div>
                  )}
            </div>
          </div>
            </section>
          ) : activeView === "auditoria" ? (
            <section className="dashboard">
              <div className="card filters-card">
                <h3>Filtro de auditoria</h3>
                <div className="filters-grid columns-4">
                  <label>
                    Instrumento ID
                    <input
                      type="number"
                      min="1"
                      placeholder="Ex.: 12"
                      value={auditInstrumentId}
                      onChange={(e) => setAuditInstrumentId(e.target.value)}
                    />
                  </label>

                  <label>
                    Acao
                    <select value={auditAction} onChange={(e) => setAuditAction(e.target.value as AuditAction | "") }>
                      <option value="">Todas</option>
                      {AUDIT_ACTION_OPTIONS.map((action) => (
                        <option key={action} value={action}>
                          {action}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="action-row">
                  <button type="button" onClick={() => refreshData()} disabled={isBusy}>
                    Atualizar historico
                  </button>
                </div>
              </div>

              <div className="card table-card">
                <h3>Historico de alteracoes</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Instrumento ID</th>
                        <th>Acao</th>
                        <th>Usuario</th>
                        <th>Campos alterados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5}>Nenhum log de auditoria encontrado.</td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id}>
                            <td>{new Date(log.created_at).toLocaleString("pt-BR")}</td>
                            <td>{log.instrumento_id}</td>
                            <td>{log.acao}</td>
                            <td>{log.user_email}</td>
                            <td>
                              {Array.isArray(log.campos_alterados) && log.campos_alterados.length > 0
                                ? log.campos_alterados.join(", ")
                                : "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : activeView === "assistente" ? (
            <section className="assistant-container">
              <aside className="assistant-history-panel card">
                <div className="assistant-history-head">
                  <h3>Conversas</h3>
                  <button
                    type="button"
                    className="secondary assistant-new-chat-button"
                    onClick={() => startNewAssistenteConversation()}
                    disabled={isConsultandoAssistente}
                  >
                    Nova conversa
                  </button>
                </div>
                <div className="assistant-history-list">
                  {isLoadingAssistenteSessions ? (
                    <p className="subtitle">Carregando histórico...</p>
                  ) : assistenteSessions.length === 0 ? (
                    <p className="subtitle">Sem conversas salvas.</p>
                  ) : (
                    assistenteSessions.map((session) => {
                      const isActive = assistenteSessionId === session.id;
                      return (
                        <button
                          key={session.id}
                          type="button"
                          className={`assistant-history-item${isActive ? " active" : ""}`}
                          onClick={() => void onOpenAssistenteSession(session.id)}
                          disabled={isConsultandoAssistente}
                        >
                          <strong>{normalizeAssistenteSessionTitle(session.titulo ?? "")}</strong>
                          <span>{session.municipioAtivo?.trim() || session.topicoAtivo?.trim() || "Sem contexto"}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>
              <div className="assistant-chat-panel">
                <div className="assistant-chat-log" ref={assistenteChatLogRef}>
                  {assistenteConversa.length === 0 ? (
                    <article className="assistant-chat-empty-state">
                      <div className="assistant-empty-icon">AI</div>
                      <h4>Olá, eu sou o Assistente 360</h4>
                      <p>O que você quer analisar no Gestconv360 hoje?</p>
                      <div className="assistant-chat-suggestions">
                        {[
                          "Qual valor de desembolso já foi feito para a cidade de Parnamirim?",
                          "Quais tickets estão atrasados e sem responsável?",
                          "Quais instrumentos já venceram ou vencem em 30 dias?",
                          "Mostre o ranking de cidades por desembolso"
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            className="assistant-suggestion-button"
                            onClick={() => setAssistentePergunta(suggestion)}
                            disabled={isConsultandoAssistente}
                          >
                            <span>{">"}</span> {suggestion}
                          </button>
                        ))}
                      </div>
                    </article>
                  ) : null}
                  {assistenteConversa.map((item) => (
                    <article
                      key={item.id}
                      className={`assistant-chat-message ${item.role === "assistant" ? "assistant" : "user"}`}
                    >
                      <div className="assistant-chat-meta">
                        <span className="assistant-chat-avatar" aria-hidden="true">
                          {item.role === "assistant" ? "AI" : "EU"}
                        </span>
                        <p className="eyebrow">{item.role === "assistant" ? "Assistente 360" : "Você"}</p>
                        {item.role === "assistant" && item.contextoUsado ? (
                          <span
                            className="assistant-context-badge"
                            title={
                              item.perguntaInterpretada
                                ? `Pergunta interpretada: ${item.perguntaInterpretada}`
                                : "Resposta usando contexto da conversa"
                            }
                          >
                            Contexto ativo
                          </span>
                        ) : null}
                        {item.role === "assistant" && item.confianca ? (
                          <span className={`assistant-confidence-badge ${item.confianca}`}>
                            {assistenteConfidenceLabel(item.confianca)}
                          </span>
                        ) : null}
                      </div>

                      <div className="assistant-chat-bubble">
                        <p>
                          {item.text}
                          {isConsultandoAssistente && assistenteTypingMessageId === item.id ? (
                            <span className="assistant-typing-cursor" aria-hidden="true">
                              |
                            </span>
                          ) : null}
                        </p>
                        {item.role === "assistant" && item.perguntaInterpretada ? (
                          <div className="assistant-chat-detail">
                            <span>Pergunta interpretada:</span> {item.perguntaInterpretada}
                          </div>
                        ) : null}
                        {item.role === "assistant" && item.dadosResumo && item.dadosResumo.length > 0 ? (
                          <div className="assistant-chat-detail">
                            <span>Resumo:</span>
                            <ul>
                              {item.dadosResumo.map((linha) => (
                                <li key={`${item.id}-${linha}`}>{linha}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {item.role === "assistant"
                          ? renderAssistenteStructuredData(item.dados, renderAssistenteRecordActions)
                          : null}
                        {item.role === "assistant" && item.fontesConsultadas && item.fontesConsultadas.length > 0 ? (
                          <div className="assistant-chat-sources">
                            <span>Fontes:</span>
                            <ul>
                              {item.fontesConsultadas.slice(0, 5).map((fonte) => (
                                <li key={`${item.id}-${fonte}`}>{fonte}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {item.role === "assistant" && item.sugestoes && item.sugestoes.length > 0 ? (
                          <div className="assistant-chat-suggestions">
                            {item.sugestoes.map((suggestion) => (
                              <button
                                key={`${item.id}-${suggestion}`}
                                type="button"
                                className="assistant-suggestion-button"
                                onClick={() => setAssistentePergunta(suggestion)}
                                disabled={isConsultandoAssistente}
                              >
                                <span>*</span> {suggestion}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <p className="assistant-chat-time">{formatChatTime(item.createdAt)}</p>
                    </article>
                  ))}
                  {isConsultandoAssistente && (
                    <article className="assistant-chat-message assistant assistant-chat-typing">
                      <div className="assistant-chat-meta">
                        <span className="assistant-chat-avatar" aria-hidden="true">
                          AI
                        </span>
                        <p className="eyebrow">Assistente 360</p>
                      </div>
                      <div className="assistant-typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </article>
                  )}
                </div>

                <div className="assistant-chat-form-area">
                  <div className="assistant-chat-form">
                    <textarea
                      rows={2}
                      value={assistentePergunta}
                      onChange={(e) => setAssistentePergunta(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (!isConsultandoAssistente && !isBusy && assistentePergunta.trim()) {
                            void onAskAssistente();
                          }
                        }
                      }}
                      placeholder="Faça uma pergunta sobre desembolsos, tickets, convênios... (Ex: Quais tickets estão atrasados?)"
                    />
                    <div className="assistant-chat-actions">
                      <button
                        type="button"
                        className="secondary assistant-new-chat-button"
                        onClick={() => startNewAssistenteConversation()}
                        disabled={isConsultandoAssistente}
                      >
                        Nova conversa
                      </button>
                      <button
                        type="button"
                        className="primary assistant-send-button"
                        onClick={() => void onAskAssistente()}
                        disabled={isConsultandoAssistente || isBusy || !assistentePergunta.trim()}
                      >
                        {isConsultandoAssistente ? "..." : "Enviar"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className={`dashboard${relatorioTab === "transferencias_discricionarias" ? " reports-tdl-layout" : ""}`}>
              <div className="card filters-card">
                <h3>Central de Relatórios</h3>
                <p className="subtitle">Escolha uma área de análise, aplique os filtros e exporte os resultados em um padrão único.</p>
              </div>
              <Suspense fallback={<LoadingPanel title="Carregando navegação de relatórios..." compact />}>
                <ReportTabsNav relatorioTab={relatorioTab} setRelatorioTab={setRelatorioTab} />
              </Suspense>

              {relatorioTab === "sismob" ? (
                <>
                  <div className="card">
                    <h3>SISMOB Cidadão</h3>
                    <p className="subtitle">Consulta de obras e repasses do Ministério da Saúde via Portal SISMOB, limitada aos proponentes atendidos na sua base.</p>
                    <div className="filters-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 16 }}>
                      <div className="filter-item">
                        <label>Proponente atendido</label>
                        <select
                          value={sismobFilters.proponente_id}
                          onChange={(e) => onChangeSismobProponente(e.target.value)}
                        >
                          <option value="">Selecione</option>
                          {proponentes.map((proponente) => (
                            <option key={proponente.id} value={String(proponente.id)}>
                              {proponente.nome} ({proponente.cidade}/{proponente.uf})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="filter-item">
                        <label>UF</label>
                        <input value={sismobFilters.uf} readOnly placeholder="UF" />
                      </div>
                      <div className="filter-item">
                        <label>Município</label>
                        <input
                          value={sismobFilters.municipio}
                          readOnly
                          placeholder="Município do proponente"
                        />
                      </div>
                      <div className="filter-item">
                        <label>Situação</label>
                        <div className="transferencias-especiais-situacao-list">
                          {sismobSituacaoOptions.length === 0 ? (
                            <span className="subtitle">Consulte para carregar as situações.</span>
                          ) : (
                            sismobSituacaoOptions.map((option) => {
                              const checked = sismobFilters.situacao.includes(option);
                              return (
                                <label key={option} className="transferencias-especiais-situacao-item">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) => {
                                      const isChecked = event.target.checked;
                                      setSismobFilters((prev) => ({
                                        ...prev,
                                        situacao: isChecked
                                          ? [...prev.situacao, option]
                                          : prev.situacao.filter((item) => item !== option),
                                        page: 1
                                      }));
                                    }}
                                  />
                                  <span>{option}</span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                      <div className="filter-item" style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button
                          type="button"
                          className="primary"
                          onClick={() => onApplySismobFilters(1)}
                          disabled={isBusy || !sismobFilters.proponente_id || !sismobFilters.uf || !sismobFilters.municipio}
                        >
                          Consultar SISMOB
                        </button>
                      </div>
                    </div>
                  </div>

                  {sismobData && (
                    <div className="card table-card" style={{ marginTop: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3>
                          Resultados SISMOB ({filteredSismobItens.length}
                          {sismobFilters.situacao.length > 0 ? ` de ${sismobData.itens.length}` : ""})
                        </h3>
                        <div className="action-row compact">
                          <button type="button" className="secondary" onClick={() => void onExportSismobReportPdf("analitico")}>
                            Relatório analítico
                          </button>
                          <button type="button" className="secondary" onClick={() => { setSismobData(null); setSismobFilters(emptySismobFilters()); }}>
                            Limpar
                          </button>
                        </div>
                      </div>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Código/Proposta</th>
                              <th>Objeto</th>
                              <th>Situação</th>
                              <th>Valor Total</th>
                              <th>Valor Pago</th>
                              <th>Execução</th>
                              <th>Atualização</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredSismobItens.length > 0 ? (
                              filteredSismobItens.map((obra: any) => (
                                <tr key={obra.id}>
                                  <td><strong>{obra.codigo}</strong></td>
                                  <td>{obra.objeto}</td>
                                  <td>
                                    <span className={`status-badge ${obra.situacao.toLowerCase().includes('conclu') ? 'success' : 'info'}`}>
                                      {obra.situacao}
                                    </span>
                                  </td>
                                  <td>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(obra.valor_total)}</td>
                                  <td>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(obra.valor_pago)}</td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div style={{ flex: 1, height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(100, obra.percentual_execucao)}%`, height: '100%', background: '#4CAF50' }} />
                                      </div>
                                      <span style={{ fontSize: '0.8rem', minWidth: 40 }}>{obra.percentual_execucao}%</span>
                                    </div>
                                  </td>
                                  <td>{obra.ultima_atualizacao}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: 32 }}>Nenhuma obra encontrada para estes filtros.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {sismobData.paginacao.total_paginas > 1 && (
                        <div className="pagination" style={{ marginTop: 16 }}>
                          <button
                            type="button"
                            className="secondary"
                            disabled={isBusy || sismobFilters.page <= 1}
                            onClick={() => onApplySismobFilters(sismobFilters.page - 1)}
                          >
                            Anterior
                          </button>
                          <span>Página {sismobFilters.page} de {sismobData.paginacao.total_paginas}</span>
                          <button
                            type="button"
                            className="secondary"
                            disabled={isBusy || sismobFilters.page >= sismobData.paginacao.total_paginas}
                            onClick={() => onApplySismobFilters(sismobFilters.page + 1)}
                          >
                            Próxima
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : relatorioTab === "repasses" ? (
                <Suspense fallback={<LoadingPanel title="Carregando relatorio de repasses..." description="Preparando filtros e consolidacoes." />}>
                  <ReportsRepassesView
                    reportFilters={reportFilters}
                    onChangeProponente={(value) =>
                      setReportFilters((prev) => ({
                        ...prev,
                        proponente_id: value,
                        instrumento_id: ""
                      }))
                    }
                    onChangeInstrumento={(value) =>
                      setReportFilters((prev) => ({ ...prev, instrumento_id: value }))
                    }
                    onChangeDataDe={(value) => setReportFilters((prev) => ({ ...prev, data_de: value }))}
                    onChangeDataAte={(value) => setReportFilters((prev) => ({ ...prev, data_ate: value }))}
                    proponentes={proponentes}
                    reportInstrumentOptions={reportInstrumentOptions}
                    isBusy={isBusy}
                    onApplyRepasseReportFilters={onApplyRepasseReportFilters}
                    onClearRepasseReportFilters={onClearRepasseReportFilters}
                    reportData={reportData}
                    exportRepasseReportCsv={exportRepasseReportCsv}
                    exportRepasseReportExcel={exportRepasseReportExcel}
                    onExportRepasseReportPdf={onExportRepasseReportPdf}
                    formatCurrency={formatCurrency}
                  />
                </Suspense>
              ) : relatorioTab === "obras" ? (
                <>
                  <div className="card filters-card">
                    <h3>Relatorio de acompanhamento de obras</h3>
                    <p className="subtitle">Analise execucao fisica, repasses, boletins e riscos das obras com a mesma estrutura de filtros e exportacoes.</p>
                    <div className="filters-grid columns-4">
                      <label>
                        Proponente
                        <select
                          value={obraReportFilters.proponente_id}
                          onChange={(e) =>
                            setObraReportFilters((prev) => ({
                              ...prev,
                              proponente_id: e.target.value,
                              instrumento_id: "",
                              concedente: ""
                            }))
                          }
                        >
                          <option value="">Todos</option>
                          {proponentes.map((item) => (
                            <option key={item.id} value={String(item.id)}>
                              {item.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Instrumento
                        <select
                          value={obraReportFilters.instrumento_id}
                          onChange={(e) =>
                            setObraReportFilters((prev) => ({ ...prev, instrumento_id: e.target.value }))
                          }
                        >
                          <option value="">Todos</option>
                          {obraReportInstrumentOptions.map((item) => (
                            <option key={item.id} value={String(item.id)}>
                              {item.instrumento} | proposta {item.proposta}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Concedente
                        <select
                          value={obraReportFilters.concedente}
                          onChange={(e) =>
                            setObraReportFilters((prev) => ({
                              ...prev,
                              concedente: e.target.value,
                              instrumento_id: ""
                            }))
                          }
                        >
                          <option value="">Todos</option>
                          {obraReportConcedenteOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Status
                        <select
                          value={obraReportFilters.status}
                          onChange={(e) =>
                            setObraReportFilters((prev) => ({
                              ...prev,
                              status: e.target.value as InstrumentStatus | ""
                            }))
                          }
                        >
                          <option value="">Todos</option>
                          {STATUS_OPTIONS.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Ativo
                        <select
                          value={obraReportFilters.ativo}
                          onChange={(e) =>
                            setObraReportFilters((prev) => ({ ...prev, ativo: e.target.value as "true" | "false" }))
                          }
                        >
                          <option value="true">Sim</option>
                          <option value="false">Nao</option>
                        </select>
                      </label>
                      <label>
                        Data de
                        <input
                          type="date"
                          value={obraReportFilters.data_de}
                          onChange={(e) =>
                            setObraReportFilters((prev) => ({ ...prev, data_de: e.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Data ate
                        <input
                          type="date"
                          value={obraReportFilters.data_ate}
                          onChange={(e) =>
                            setObraReportFilters((prev) => ({ ...prev, data_ate: e.target.value }))
                          }
                        />
                      </label>
                    </div>

                    <div className="report-toolbar">
                      <div className="action-row compact">
                        <button type="button" onClick={onApplyObraReportFilters} disabled={isBusy}>
                          Gerar relatorio
                        </button>
                        <button type="button" className="secondary" onClick={onClearObraReportFilters}>
                          Limpar filtros
                        </button>
                      </div>
                      <div className="action-row compact report-export-actions">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => obraReportData && exportObraReportCsv(obraReportData)}
                          disabled={!obraReportData}
                        >
                          Exportar CSV
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => obraReportData && exportObraReportExcel(obraReportData)}
                          disabled={!obraReportData}
                        >
                          Exportar Excel
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => onExportObraReportPdf("executivo")}
                          disabled={!obraReportData}
                        >
                          Exportar PDF Executivo
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => onExportObraReportPdf("analitico")}
                          disabled={!obraReportData}
                        >
                          Exportar PDF Analitico
                        </button>
                      </div>
                    </div>
                  </div>

                  {!obraReportData ? (
                    <div className="card table-card">
                      <p className="subtitle">Defina os filtros acima e clique em gerar relatorio para visualizar os dados consolidados.</p>
                    </div>
                  ) : (
                    <>
                      <div className="report-kpi-grid">
                        <div className="card kpi-card">
                          <p className="eyebrow">Obras monitoradas</p>
                          <h3>{obraReportData.kpis.obras_monitoradas}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">% medio da obra</p>
                          <h3>{obraReportData.kpis.percentual_medio_obra.toFixed(2)}%</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Boletins no periodo</p>
                          <h3>{formatCurrency(obraReportData.kpis.valor_total_boletins_periodo)}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Risco alto</p>
                          <h3>{obraReportData.kpis.obras_risco_alto}</h3>
                        </div>
                      </div>

                      <div className="report-charts-grid">
                        <div className="card">
                          <h3>Evolucao mensal de boletins</h3>
                          <div className="report-bars">
                            {obraReportData.series.boletins_mensais.length === 0 ? (
                              <p className="subtitle">Sem boletins no periodo.</p>
                            ) : (
                              obraReportData.series.boletins_mensais.map((item) => {
                                const max = Math.max(...obraReportData.series.boletins_mensais.map((point) => point.valor), 1);
                                const width = (item.valor / max) * 100;
                                return (
                                  <div key={item.mes} className="report-bar-row">
                                    <span>{item.mes}</span>
                                    <div className="report-bar-track">
                                      <div className="report-bar-fill" style={{ width: `${width}%` }} />
                                    </div>
                                    <strong>{formatCurrency(item.valor)}</strong>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                        <div className="card">
                          <h3>Evolucao mensal de repasses</h3>
                          <div className="report-bars">
                            {obraReportData.series.repasses_mensais.length === 0 ? (
                              <p className="subtitle">Sem repasses no periodo.</p>
                            ) : (
                              obraReportData.series.repasses_mensais.map((item) => {
                                const max = Math.max(...obraReportData.series.repasses_mensais.map((point) => point.valor), 1);
                                const width = (item.valor / max) * 100;
                                return (
                                  <div key={item.mes} className="report-bar-row">
                                    <span>{item.mes}</span>
                                    <div className="report-bar-track">
                                      <div className="report-bar-fill secondary" style={{ width: `${width}%` }} />
                                    </div>
                                    <strong>{formatCurrency(item.valor)}</strong>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="card table-card">
                        <h3>Instrumentos (fluxo obra)</h3>
                        <div className="table-wrap tdl-main-table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Instrumento</th>
                                <th>Situação</th>
                                <th>Objeto</th>
                                <th>Status</th>
                                <th>% obra (interna)</th>
                                <th>Execucao real</th>
                                <th>Status Transferegov</th>
                                <th>Boletins periodo</th>
                                <th>Repasses periodo</th>
                                <th>Ultimo boletim</th>
                                <th>Banco</th>
                                <th>Agencia</th>
                                <th>Conta</th>
                                <th>Prestacao contas</th>
                                <th>Dias vigencia fim</th>
                                <th>Risco</th>
                              </tr>
                            </thead>
                            <tbody>
                              {obraReportData.instrumentos.length === 0 ? (
                                <tr>
                                  <td colSpan={15}>Nenhum instrumento encontrado.</td>
                                </tr>
                              ) : (
                                obraReportData.instrumentos.map((item) => (
                                  <tr key={item.id}>
                                    <td>{item.instrumento}</td>
                                    <td>{item.objeto}</td>
                                    <td>{item.status}</td>
                                    <td>{item.percentual_obra ? item.percentual_obra.toFixed(2) : "0.00"}%</td>
                                    <td>
                                      {item.percentual_fisico_medicao !== null && item.percentual_fisico_medicao !== undefined
                                        ? `${Number(item.percentual_fisico_medicao).toFixed(2)}%`
                                        : "-"}
                                    </td>
                                    <td>
                                      {item.status_medicao ? (
                                        <span className={item.status_medicao.toLowerCase().includes("paralisacao") ? "text-danger" : ""}>
                                          {item.status_medicao}
                                        </span>
                                      ) : (
                                        "-"
                                      )}
                                    </td>
                                    <td>{formatCurrency(item.valor_boletins_periodo)}</td>
                                    <td>{formatCurrency(item.valor_repasses_periodo)}</td>
                                    <td>
                                      {item.ultimo_boletim_data
                                        ? `${item.ultimo_boletim_data} (${formatCurrency(item.ultimo_boletim_valor ?? 0)})`
                                        : "-"}
                                    </td>
                                    <td>{item.banco ?? "-"}</td>
                                    <td>{item.agencia ?? "-"}</td>
                                    <td>{item.conta ?? "-"}</td>
                                    <td>{item.data_prestacao_contas ?? "-"}</td>
                                    <td>{item.dias_para_vigencia_fim}</td>
                                    <td>{item.risco}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                </>
              )}
                </>
              ) : relatorioTab === "andamento_instrumentos" ? (
                <>
                  <div className="card filters-card">
                    <h3>Relatorio de Andamento de Instrumentos</h3>
                    <p className="subtitle">Acompanhe etapa atual, historico, solicitacoes da Caixa e situacao operacional dos instrumentos selecionados.</p>
                    <div className="filters-grid columns-4">
                      <label>
                        Proponente
                        <select
                          value={andamentoInstrumentosReportFilters.proponente_id}
                          onChange={(e) =>
                            setAndamentoInstrumentosReportFilters((prev) => ({
                              ...prev,
                              proponente_id: e.target.value,
                              instrumento_query: "",
                              instrumentos: []
                            }))
                          }
                        >
                          <option value="">Todos</option>
                          {proponentes.map((item) => (
                            <option key={item.id} value={String(item.id)}>
                              {item.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Status do instrumento
                        <select
                          value={andamentoInstrumentosReportFilters.status}
                          onChange={(e) =>
                            setAndamentoInstrumentosReportFilters((prev) => ({
                              ...prev,
                              status: e.target.value as InstrumentStatus | "",
                              instrumento_query: "",
                              instrumentos: []
                            }))
                          }
                        >
                          <option value="">Todas</option>
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {INSTRUMENT_STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Numero do instrumento
                        <div className="inline-search-row">
                          <input
                            list="andamento-instrumentos-sugestoes"
                            value={andamentoInstrumentosReportFilters.instrumento_query}
                            onChange={(e) =>
                              setAndamentoInstrumentosReportFilters((prev) => ({
                                ...prev,
                                instrumento_query: e.target.value
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                onAddAndamentoInstrumento();
                              }
                            }}
                            placeholder="Digite o numero do instrumento"
                          />
                          <button
                            type="button"
                            className="secondary"
                            onClick={onAddAndamentoInstrumento}
                            disabled={isBusy || andamentoInstrumentosReportFilters.instrumento_query.trim() === ""}
                          >
                            Adicionar
                          </button>
                        </div>
                        <datalist id="andamento-instrumentos-sugestoes">
                          {andamentoInstrumentosOptions.map((item) => (
                            <option key={item.id} value={item.instrumento}>
                              {`Proposta ${item.proposta}`}
                            </option>
                          ))}
                        </datalist>
                        <div className="subtitle">Opcional: adicione instrumentos específicos ou gere o relatório com os filtros acima.</div>
                      </label>
                    </div>

                    <div className="andamento-report-selected-box">
                      <div className="andamento-report-selected-head">
                        <strong>Instrumentos adicionados</strong>
                        <span>{andamentoInstrumentosReportFilters.instrumentos.length}</span>
                      </div>
                      {andamentoInstrumentosSelecionados.length === 0 ? (
                        <p className="subtitle">Nenhum instrumento foi adicionado ainda.</p>
                      ) : (
                        <div className="andamento-report-selected-list">
                          {andamentoInstrumentosSelecionados.map((item) => (
                            <div key={item.id} className="andamento-report-selected-item">
                              <div>
                                <strong>{item.instrumento}</strong>
                                <span>Proposta {item.proposta}</span>
                              </div>
                              <button
                                type="button"
                                className="secondary"
                                onClick={() => onRemoveAndamentoInstrumento(item.instrumento)}
                                disabled={isBusy}
                              >
                                Remover
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="report-toolbar">
                      <div className="action-row compact">
                        <button type="button" onClick={onApplyAndamentoInstrumentosReportFilters} disabled={isBusy}>
                          Gerar relatorio
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={onClearAndamentoInstrumentosReportFilters}
                          disabled={isBusy}
                        >
                          Limpar filtros
                        </button>
                      </div>
                      <div className="action-row compact report-export-actions">
                        <button
                          type="button"
                          className="secondary"
                          onClick={onExportAndamentoInstrumentosReportPdf}
                          disabled={!andamentoInstrumentosReportData}
                        >
                          Exportar PDF Analitico
                        </button>
                      </div>
                    </div>
                  </div>

                  {!andamentoInstrumentosReportData ? (
                    <div className="card table-card">
                      <p className="subtitle">Selecione um proponente, uma situacao ou instrumentos especificos e gere o relatorio para acompanhar o andamento.</p>
                    </div>
                  ) : (
                    <>
                      <div className="report-kpi-grid">
                        <div className="card kpi-card">
                          <p className="eyebrow">Instrumentos selecionados</p>
                          <h3>{andamentoInstrumentosReportData.resumo.total}</h3>
                        </div>
                      </div>

                      <div className="card table-card">
                        <h3>Andamento por instrumento</h3>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Instrumento</th>
                                <th>Objeto</th>
                                <th>Etapa atual</th>
                                <th>Acomp. Atual</th>
                                <th>Solicitacoes da Caixa (email)</th>
                                <th>Historico completo</th>
                                <th>Usuario</th>
                                <th>Data</th>
                              </tr>
                            </thead>
                            <tbody>
                              {andamentoInstrumentosReportData.itens.length === 0 ? (
                                <tr>
                                  <td colSpan={9}>Nenhum instrumento encontrado com os filtros informados.</td>
                                </tr>
                              ) : (
                                andamentoInstrumentosReportData.itens.map((item) => (
                                  <tr key={item.instrumento_id}>
                                    <td>{item.instrumento}</td>
                                    <td>{INSTRUMENT_STATUS_LABELS[item.status]}</td>
                                    <td>{normalizeReadableTextSafe(item.objeto)}</td>
                                    <td>
                                      {item.etapa_atual_label ? (
                                        <div className="relatorio-etapa-atual-card">
                                          <div className="relatorio-etapa-atual-header">
                                            <span className="relatorio-etapa-atual-label">Etapa atual</span>
                                            <span className="relatorio-etapa-atual-badge">{item.etapa_atual_label}</span>
                                          </div>
                                        </div>
                                      ) : (
                                        "-"
                                      )}
                                    </td>
                                    <td style={{ whiteSpace: "pre-wrap" }}>
                                      {item.acompanhamento?.texto?.trim() ? (
                                        <>
                                          <div>{item.acompanhamento.texto}</div>
                                          <div className="subtitle">
                                            Por: {item.acompanhamento.usuario.nome ?? item.acompanhamento.usuario.email}
                                          </div>
                                        </>
                                      ) : (
                                        "-"
                                      )}
                                    </td>
                                    <td>
                                      {item.solicitacoes_caixa_email.length === 0 ? (
                                        "-"
                                      ) : (
                                        <div className="relatorio-solicitacoes-list">
                                          {item.solicitacoes_caixa_email.map((sol) => {
                                            const pendencias = sol.pendencias_email
                                              .map((itemPendencia) => normalizeReadableTextSafe(itemPendencia, ""))
                                              .filter((itemPendencia) => itemPendencia !== "");
                                            const criticalCount = pendencias.filter(
                                              (itemPendencia) => getPendingSeverity(itemPendencia) === "critical"
                                            ).length;

                                            return (
                                              <article key={sol.id} className="relatorio-solicitacao-item">
                                                <p>
                                                  <strong>Data:</strong> {new Date(sol.created_at).toLocaleString("pt-BR")}
                                                </p>
                                                <p>
                                                  <strong>Protocolo:</strong> {sol.id}
                                                </p>
                                                <p>
                                                  <strong>De:</strong>{" "}
                                                  {sol.origem_email ? normalizeReadableTextSafe(sol.origem_email) : "-"}
                                                </p>
                                                <p>
                                                  <strong>Assunto:</strong>{" "}
                                                  {sol.assunto_email ? normalizeReadableTextSafe(sol.assunto_email) : "-"}
                                                </p>
                                                <p>
                                                  <strong>Ticket:</strong>{" "}
                                                  {sol.ticket?.codigo ? normalizeReadableTextSafe(sol.ticket.codigo) : "-"}
                                                </p>
                                                {pendencias.length > 0 && (
                                                  <div className="relatorio-solicitacao-pendencias">
                                                    <p>
                                                      <strong>Pendencias do e-mail:</strong>{" "}
                                                      {criticalCount > 0 && (
                                                        <span className="relatorio-pendencia-badge-critical">
                                                          {criticalCount} critica(s)
                                                        </span>
                                                      )}
                                                    </p>
                                                    <ul>
                                                      {pendencias.map((itemPendencia, idx) => (
                                                        <li
                                                          key={`${sol.id}-${idx}`}
                                                          className={
                                                            getPendingSeverity(itemPendencia) === "critical"
                                                              ? "is-critical"
                                                              : undefined
                                                          }
                                                        >
                                                          {itemPendencia}
                                                        </li>
                                                      ))}
                                                    </ul>
                                                  </div>
                                                )}
                                              </article>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </td>
                                    <td>
                                      {item.historico_completo.length === 0 ? (
                                        "-"
                                      ) : (
                                        <div className="relatorio-historico-list">
                                          {item.historico_completo.map((evento, idx) => (
                                            <article key={`${item.instrumento_id}-${evento.created_at}-${idx}`} className="relatorio-historico-item">
                                              <p>
                                                <strong>{new Date(evento.created_at).toLocaleString("pt-BR")}</strong>
                                              </p>
                                              <p>
                                                <strong>{evento.tipo}</strong>: {normalizeReadableTextSafe(evento.subtipo_label)}
                                              </p>
                                              <p className="relatorio-preserve-text">
                                                {normalizeMultilineTextSafe(evento.descricao)}
                                              </p>
                                              {evento.usuario?.email && (
                                                <p className="subtitle">
                                                  Usuario: {normalizeReadableTextSafe(evento.usuario.nome ?? evento.usuario.email)}
                                                </p>
                                              )}
                                              {evento.ticket?.codigo && (
                                                <p className="subtitle">
                                                  Ticket: {normalizeReadableTextSafe(evento.ticket.codigo)}
                                                </p>
                                              )}
                                            </article>
                                          ))}
                                        </div>
                                      )}
                                    </td>
                                    <td>{item.acompanhamento?.usuario.nome ?? item.acompanhamento?.usuario.email ?? "-"}</td>
                                    <td>
                                      {item.acompanhamento?.created_at
                                        ? new Date(item.acompanhamento.created_at).toLocaleString("pt-BR")
                                        : "-"}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : relatorioTab === "transparencia" ? (
                <>
                  <div className="card filters-card">
                    <h3>Relatorios Transparencia (Portal da Transparencia)</h3>
                    <p className="subtitle">
                      Consulte convenios, emendas e documentos de pagamento por CNPJ do proponente com dados consolidados do Portal da Transparencia.
                    </p>
                    <div className="filters-grid columns-4">
                      <label>
                        Proponente (CNPJ) *
                        <select
                          value={transparenciaReportFilters.cnpj}
                          onChange={(e) =>
                            setTransparenciaReportFilters((prev) => ({
                              ...prev,
                              cnpj: e.target.value
                            }))
                          }
                        >
                          <option value="">Selecione</option>
                          {proponentes
                            .slice()
                            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                            .map((item) => (
                              <option key={item.id} value={formatCnpj(item.cnpj)}>
                                {`${formatCnpj(item.cnpj)} - ${item.nome}`}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        Ano da emenda (opcional)
                        <select
                          value={transparenciaReportFilters.ano}
                          onChange={(e) =>
                            setTransparenciaReportFilters((prev) => ({ ...prev, ano: e.target.value }))
                          }
                        >
                          <option value="">Todos</option>
                          {Array.from({ length: Math.max(new Date().getFullYear() - 1999, 1) }, (_v, index) => {
                            const year = String(new Date().getFullYear() - index);
                            return (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                      <label>
                        Ano do pagamento (opcional)
                        <select
                          value={transparenciaReportFilters.ano_pagamento}
                          onChange={(e) =>
                            setTransparenciaReportFilters((prev) => ({ ...prev, ano_pagamento: e.target.value }))
                          }
                        >
                          <option value="">Todos</option>
                          {Array.from({ length: Math.max(new Date().getFullYear() - 1999, 1) }, (_v, index) => {
                            const year = String(new Date().getFullYear() - index);
                            return (
                              <option key={`pag-${year}`} value={year}>
                                {year}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                      <label>
                        Max. paginas convenios
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={transparenciaReportFilters.max_paginas_convenios}
                          onChange={(e) =>
                            setTransparenciaReportFilters((prev) => ({
                              ...prev,
                              max_paginas_convenios: e.target.value
                            }))
                          }
                        />
                      </label>
                      <label>
                        Max. processos
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={transparenciaReportFilters.max_processos}
                          onChange={(e) =>
                            setTransparenciaReportFilters((prev) => ({ ...prev, max_processos: e.target.value }))
                          }
                        />
                      </label>
                    </div>

                    <div className="report-toolbar">
                      <div className="action-row compact">
                        <button type="button" onClick={onApplyTransparenciaReportFilters} disabled={isBusy}>
                          Consultar transparencia
                        </button>
                        <button type="button" className="secondary" onClick={onClearTransparenciaReportFilters} disabled={isBusy}>
                          Limpar filtros
                        </button>
                      </div>
                      <div className="action-row compact report-export-actions">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => {
                            if (!transparenciaReportData) {
                              return;
                            }
                            const cnpjDigits = transparenciaReportData.filtros.cnpj.replace(/\D/g, "");
                            const proponenteLogoUrl = cnpjDigits !== "" ? (proponenteLogoByCnpj.get(cnpjDigits) ?? null) : null;
                            exportTransparenciaReportExcel(transparenciaReportData, proponenteLogoUrl);
                          }}
                          disabled={isBusy || !transparenciaReportData}
                        >
                          Exportar Excel
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => {
                            if (!transparenciaReportData) {
                              return;
                            }
                            const cnpjDigits = transparenciaReportData.filtros.cnpj.replace(/\D/g, "");
                            const proponenteLogoUrl = cnpjDigits !== "" ? (proponenteLogoByCnpj.get(cnpjDigits) ?? null) : null;
                            exportTransparenciaReportPdf(transparenciaReportData, proponenteLogoUrl);
                          }}
                          disabled={isBusy || !transparenciaReportData}
                        >
                          Exportar PDF Analitico
                        </button>
                      </div>
                    </div>
                  </div>

                  {!transparenciaReportData ? (
                    <div className="card table-card">
                      <p className="subtitle">Selecione um proponente e clique em consultar transparencia para carregar convenios, emendas e documentos de pagamento.</p>
                    </div>
                  ) : (
                    <>
                      {transparenciaReportData.diagnostico && (
                        <div className="card table-card">
                          <p className="subtitle" style={{ marginTop: 0 }}>
                            Diagnostico: Nome-hint={transparenciaReportData.diagnostico.convenente_nome_hint || "-"} | Base local numero=
                            {transparenciaReportData.diagnostico.convenios_fallback_local_numero} | Base local ID=
                            {transparenciaReportData.diagnostico.convenios_fallback_local_id} | Scraping=
                            {transparenciaReportData.diagnostico.scraping_sucessos ?? 0}/
                            {transparenciaReportData.diagnostico.scraping_tentativas ?? 0} | Processos=
                            {transparenciaReportData.diagnostico.processos_extraidos} | Emendas brutas=
                            {transparenciaReportData.diagnostico.emendas_total_bruto}
                          </p>
                          {(transparenciaReportData.diagnostico.fontes_usadas?.length ?? 0) > 0 && (
                            <p className="subtitle" style={{ marginTop: 4 }}>
                              Fontes usadas: {transparenciaReportData.diagnostico.fontes_usadas?.join(", ")}
                            </p>
                          )}
                          {(transparenciaReportData.diagnostico.warnings?.length ?? 0) > 0 && (
                            <p className="subtitle text-danger" style={{ marginTop: 4 }}>
                              Alertas: {transparenciaReportData.diagnostico.warnings?.join(" | ")}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="report-kpi-grid">
                        <div className="card kpi-card">
                          <p className="eyebrow">Convenios</p>
                          <h3>{transparenciaReportData.kpis.convenios_encontrados}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Processos</p>
                          <h3>{transparenciaReportData.kpis.processos_unicos}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Emendas</p>
                          <h3>{transparenciaReportData.kpis.emendas_encontradas}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Valor pago emendas</p>
                          <h3>{formatCurrency(transparenciaReportData.kpis.valor_pago_total)}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Valor global convenios</p>
                          <h3>{formatCurrency(transparenciaReportData.kpis.valor_global_convenios)}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Valor liberado convenios</p>
                          <h3>{formatCurrency(transparenciaReportData.kpis.valor_liberado_convenios)}</h3>
                        </div>
                      </div>

                      <div className="card table-card">
                        <h3>Convenios vinculados</h3>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Convenio</th>
                                <th>Processo</th>
                                <th>Situacao</th>
                                <th>Municipio/UF</th>
                                <th>Objeto</th>
                                <th>Valor global</th>
                                <th>Valor liberado</th>
                                <th>Emendas vinculadas</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transparenciaReportData.convenios.length === 0 ? (
                                <tr>
                                  <td colSpan={8}>Nenhum convenio encontrado para o CNPJ informado.</td>
                                </tr>
                              ) : (
                                transparenciaReportData.convenios.map((item) => (
                                  <tr key={`${item.id ?? "sem-id"}-${item.numero_convenio ?? "sem-convenio"}-${item.numero_processo ?? "sem-processo"}`}>
                                    <td>{item.numero_convenio ?? "-"}</td>
                                    <td>{item.numero_processo ?? "-"}</td>
                                    <td>{item.situacao ?? "-"}</td>
                                    <td>{`${normalizeUnknownTextSafe(item.municipio)} / ${normalizeUnknownTextSafe(item.uf)}`}</td>
                                    <td>{item.objeto ?? "-"}</td>
                                    <td>{item.valor_global == null ? "-" : formatCurrency(item.valor_global)}</td>
                                    <td>{item.valor_liberado == null ? "-" : formatCurrency(item.valor_liberado)}</td>
                                    <td>{item.emendas_vinculadas}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="card table-card">
                        <h3>Emendas vinculadas aos processos</h3>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Ano</th>
                                <th>Codigo emenda</th>
                                <th>Numero emenda</th>
                                <th>Autor</th>
                                <th>Tipo</th>
                                <th>Processo</th>
                                <th>Empenhado</th>
                                <th>Liquidado</th>
                                <th>Pago</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transparenciaReportData.emendas.length === 0 ? (
                                <tr>
                                  <td colSpan={9}>Nenhuma emenda encontrada para os processos retornados.</td>
                                </tr>
                              ) : (
                                transparenciaReportData.emendas.map((item) => (
                                  <tr
                                    key={`${item.numero_processo ?? "sem-processo"}-${item.codigo_emenda ?? "sem-codigo"}-${item.numero_emenda ?? "sem-numero"}-${item.ano ?? 0}`}
                                  >
                                    <td>{item.ano ?? "-"}</td>
                                    <td>{item.codigo_emenda ?? "-"}</td>
                                    <td>{item.numero_emenda ?? "-"}</td>
                                    <td>{item.autor ?? "-"}</td>
                                    <td>{item.tipo_emenda ?? "-"}</td>
                                    <td>{item.numero_processo ?? "-"}</td>
                                    <td>{formatCurrency(item.valor_empenhado)}</td>
                                    <td>{formatCurrency(item.valor_liquidado)}</td>
                                    <td>{formatCurrency(item.valor_pago)}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="card table-card">
                        <h3>Detalhes Orcamentarios</h3>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Convenio</th>
                                <th>Area de Atuacao (Funcao)</th>
                                <th>Subfuncao</th>
                                <th>Programa</th>
                                <th>Acao</th>
                                <th>Plano Orcamentario - PO</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transparenciaReportData.convenios.length === 0 ? (
                                <tr>
                                  <td colSpan={6}>Nenhum detalhe orcamentario encontrado para os convenios retornados.</td>
                                </tr>
                              ) : (
                                transparenciaReportData.convenios.map((item) => (
                                  <tr key={`detalhe-orc-${item.id ?? "sem-id"}-${item.numero_convenio ?? "sem-convenio"}`}>
                                    <td>{item.numero_convenio ?? "-"}</td>
                                    <td>{item.area_atuacao_funcao ?? "-"}</td>
                                    <td>{item.subfuncao ?? "-"}</td>
                                    <td>{item.programa ?? "-"}</td>
                                    <td>{item.acao ?? "-"}</td>
                                    <td>{item.plano_orcamentario_po ?? "-"}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="card table-card">
                        <h3>Documentos de pagamento detalhados</h3>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Convenio</th>
                                <th>Documento</th>
                                <th>Data</th>
                                <th>Tipo</th>
                                <th>Valor da proposta</th>
                                <th>Unidade gestora</th>
                                <th>Gestao</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(transparenciaReportData.documentos_pagamento ?? []).length === 0 ? (
                                <tr>
                                  <td colSpan={7}>Nenhum documento de pagamento encontrado para os convenios retornados.</td>
                                </tr>
                              ) : (
                                (transparenciaReportData.documentos_pagamento ?? []).map((doc) => (
                                  <tr key={`${doc.codigo_documento ?? "sem-codigo"}-${doc.numero_documento ?? "sem-numero"}`}>
                                    <td>{doc.convenio_numero ?? "-"}</td>
                                    <td>{doc.numero_documento ?? doc.codigo_documento ?? "-"}</td>
                                    <td>{doc.data ? formatDateOnlyPtBr(doc.data) : "-"}</td>
                                    <td>{doc.tipo_documento ?? doc.descricao ?? "-"}</td>
                                    <td>{formatCurrency(doc.valor_documento ?? 0)}</td>
                                    <td>{`${doc.unidade_gestora_codigo ?? "-"} ${doc.unidade_gestora_nome ? `- ${doc.unidade_gestora_nome}` : ""}`}</td>
                                    <td>{`${doc.gestao_codigo ?? "-"} ${doc.gestao_nome ? `- ${doc.gestao_nome}` : ""}`}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </>
                  )}
                </>
              ) : relatorioTab === "fns_repasses" ? (
                <>
                  <div className="card filters-card">
                    <h3>Repasses FNS para municipios (InvestSUS)</h3>
                    <div className="filters-grid columns-4">
                      <label>
                        Ano
                        <input
                          type="number"
                          min={2000}
                          max={2100}
                          value={fnsRepassesFilters.ano}
                          onChange={(e) => setFnsRepassesFilters((prev) => ({ ...prev, ano: e.target.value }))}
                          placeholder="Ex.: 2025"
                        />
                      </label>
                      <label>
                        UF
                        <select
                          value={fnsRepassesFilters.uf_id}
                          onChange={(e) =>
                            setFnsRepassesFilters((prev) => ({
                              ...prev,
                              uf_id: e.target.value,
                              co_ibge_municipio: "",
                              cnpj: ""
                            }))
                          }
                          disabled={fnsUfsAtendidas.length <= 1}
                        >
                          <option value="">Selecione</option>
                          {fnsUfsAtendidas.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.sigla} - {item.nomeAcentuado}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Municipio (IBGE)
                        <select
                          value={fnsRepassesFilters.co_ibge_municipio}
                          onChange={(e) =>
                            setFnsRepassesFilters((prev) => ({
                              ...prev,
                              co_ibge_municipio: e.target.value,
                              cnpj: ""
                            }))
                          }
                          disabled={fnsMunicipiosAtendidos.length === 0}
                        >
                          <option value="">Selecione</option>
                          {fnsMunicipiosAtendidos.map((item) => (
                            <option key={item.codigo} value={item.codigo}>
                              {item.descricao} ({item.codigo})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        CNPJ selecionado automaticamente
                        <input value={formatCnpj(fnsRepassesFilters.cnpj)} readOnly placeholder="Definido automaticamente" />
                      </label>
                      <label>
                        Codigo bloco (detalhe)
                        <input
                          value={fnsRepassesFilters.codigo_bloco}
                          onChange={(e) => setFnsRepassesFilters((prev) => ({ ...prev, codigo_bloco: e.target.value }))}
                          placeholder="Ex.: 10"
                        />
                      </label>
                    </div>

                    <div className="action-row">
                      <button type="button" onClick={() => void onApplyFnsRepassesFilters()} disabled={isBusy}>
                        Consultar
                      </button>
                      <button type="button" className="secondary" onClick={onClearFnsRepassesFilters} disabled={isBusy}>
                        Limpar filtros
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void loadFnsSyncStatus()}
                        disabled={isBusy}
                      >
                        Atualizar status
                      </button>
                      {canManageInstruments && (
                        <button type="button" className="secondary" onClick={() => void onSyncFnsCache()} disabled={isBusy}>
                          Sincronizar cache FNS
                        </button>
                      )}
                    </div>
                  </div>

                  {fnsSyncStatus && (
                    <div className="card table-card">
                      <p>
                        Status cache: {fnsSyncStatus.status} | Atualizado em: {fnsSyncStatus.atualizado_em ?? "-"} | Entradas: {" "}
                        {fnsSyncStatus.entradas_cache} | Falhas: {fnsSyncStatus.falhas}
                      </p>
                      {fnsSyncStatus.detalhe && <p className="muted">{fnsSyncStatus.detalhe}</p>}
                    </div>
                  )}

                  {!fnsRepassesData ? (
                    <div className="card table-card">
                      <p>Selecione o municipio atendido e clique em consultar. O CNPJ do proponente e definido automaticamente.</p>
                    </div>
                  ) : (
                    <>
                      <div className="report-kpi-grid">
                        <div className="card kpi-card">
                          <p className="eyebrow">Blocos com repasse</p>
                          <h3>{fnsRepassesData.quantidade}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Total repassado</p>
                          <h3>{formatCurrency(fnsRepassesData.valor)}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Tipos de conta</p>
                          <h3>{fnsSaldosData?.quantidade ?? 0}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Saldo total</p>
                          <h3>{formatCurrency(fnsSaldosData?.valor ?? 0)}</h3>
                        </div>
                      </div>

                      <div className="card table-card">
                        <h3>Repasses por bloco</h3>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Codigo</th>
                                <th>Bloco</th>
                                <th>Valor repassado</th>
                                <th>Acoes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fnsRepassesData.itens.length === 0 ? (
                                <tr>
                                  <td colSpan={4}>Nenhum repasse encontrado para os filtros informados.</td>
                                </tr>
                              ) : (
                                fnsRepassesData.itens.map((item) => (
                                  <tr key={`${item.codigoBloco}-${item.nomeBloco}`}>
                                    <td>{item.codigoBloco}</td>
                                    <td>{item.nomeBloco}</td>
                                    <td>{formatCurrency(item.valorRepassado)}</td>
                                    <td>
                                      <button
                                        type="button"
                                        className="secondary"
                                        onClick={() => void onLoadFnsDetalheBloco(item.codigoBloco, item.nomeBloco)}
                                        disabled={isBusy}
                                      >
                                        Ver detalhe
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {fnsSaldosData && (
                        <div className="card table-card">
                          <h3>Saldos por tipo de conta</h3>
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>ID</th>
                                  <th>Sigla</th>
                                  <th>Descricao</th>
                                  <th>Valor saldo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {fnsSaldosData.itens.length === 0 ? (
                                  <tr>
                                    <td colSpan={4}>Nenhum saldo encontrado.</td>
                                  </tr>
                                ) : (
                                  fnsSaldosData.itens.map((item) => (
                                    <tr key={`${item.idTipoConta}-${item.sigla}`}>
                                      <td>{item.idTipoConta}</td>
                                      <td>{item.sigla}</td>
                                      <td>{item.descricao}</td>
                                      <td>{formatCurrency(item.valorSaldo)}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {fnsRepassesDetalheData && (
                        <div className="card table-card">
                          <h3>Detalhe de repasses ({fnsDetalheBlocoLabel || "bloco selecionado"})</h3>
                          <p className="muted" style={{ marginTop: 0 }}>
                            Registros: {fnsRepassesDetalheData.quantidade} | Valor: {formatCurrency(fnsRepassesDetalheData.valor)}
                          </p>
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Competencia</th>
                                  <th>Grupo</th>
                                  <th>Processo</th>
                                  <th>OB</th>
                                  <th>Data OB</th>
                                  <th>Banco/Ag/Conta</th>
                                  <th>Acao</th>
                                  <th>Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {fnsRepassesDetalheData.itens.length === 0 ? (
                                  <tr>
                                    <td colSpan={8}>Nenhum detalhe encontrado para o bloco selecionado.</td>
                                  </tr>
                                ) : (
                                  fnsRepassesDetalheData.itens.map((item, index) => (
                                    <tr key={`${item.numeroOB ?? "ob"}-${index}`}>
                                      <td>{item.descricaoCompetencia ?? item.descricaoTipoCompetencia ?? "-"}</td>
                                      <td>{item.nomeGrupo ?? "-"}</td>
                                      <td>{item.numeroProcesso ?? "-"}</td>
                                      <td>{item.numeroOB ?? "-"}</td>
                                      <td>{item.dataOB ? item.dataOB.slice(0, 10) : "-"}</td>
                                      <td>{`${item.codigoBanco ?? "-"} / ${item.numeroAgencia ?? "-"} / ${item.numeroConta ?? "-"}`}</td>
                                      <td>{normalizeReadableText(item.nomeAcao ?? null) ?? "-"}</td>
                                      <td>{formatCurrency(item.valorRepassado ?? 0)}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : relatorioTab === "consultafns_propostas" ? (
                <>
                  <div className="card filters-card">
                    <h3>Consulta FNS - Propostas</h3>
                    <div className="filters-grid columns-4">
                      <label>
                        Ano
                        <select
                          value={consultaFnsFilters.ano}
                          onChange={(e) => setConsultaFnsFilters((prev) => ({ ...prev, ano: e.target.value }))}
                        >
                          <option value="">Todos</option>
                          {consultaFnsAnos.map((item) => (
                            <option key={item.valor} value={item.valor}>
                              {item.descricao}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        UF
                        <select
                          value={consultaFnsFilters.uf}
                          onChange={(e) =>
                            setConsultaFnsFilters((prev) => ({
                              ...prev,
                              uf: e.target.value,
                              co_municipio_ibge: ""
                            }))
                          }
                          disabled={consultaFnsUfsAtendidas.length <= 1}
                        >
                          <option value="">Todas</option>
                          {consultaFnsUfsAtendidas.map((item) => (
                            <option key={item.id} value={item.sigla}>
                              {item.sigla} - {item.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Municipio
                        <select
                          value={consultaFnsFilters.co_municipio_ibge}
                          onChange={(e) => setConsultaFnsFilters((prev) => ({ ...prev, co_municipio_ibge: e.target.value }))}
                          disabled={consultaFnsMunicipiosAtendidos.length === 0}
                        >
                          <option value="">Todos</option>
                          {consultaFnsMunicipiosAtendidos.map((item) => (
                            <option key={item.coMunicipioIbge} value={item.coMunicipioIbge}>
                              {item.noMunicipio}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        N° proposta
                        <select
                          value={consultaFnsFilters.nu_proposta}
                          onChange={(e) => setConsultaFnsFilters((prev) => ({ ...prev, nu_proposta: e.target.value }))}
                        >
                          <option value="">Todos</option>
                          {consultaFnsNuPropostaOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Tipo proposta
                        <select
                          value={consultaFnsFilters.tp_proposta}
                          onChange={(e) => setConsultaFnsFilters((prev) => ({ ...prev, tp_proposta: e.target.value }))}
                        >
                          <option value="">Todos</option>
                          {consultaFnsTipoPropostaOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Tipo recurso
                        <select
                          value={consultaFnsFilters.tp_recurso}
                          onChange={(e) => setConsultaFnsFilters((prev) => ({ ...prev, tp_recurso: e.target.value }))}
                        >
                          <option value="">Todos</option>
                          {consultaFnsTipoRecursoOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Tipo emenda
                        <select
                          value={consultaFnsFilters.tp_emenda}
                          onChange={(e) => setConsultaFnsFilters((prev) => ({ ...prev, tp_emenda: e.target.value }))}
                        >
                          <option value="">Todos</option>
                          {consultaFnsTipoEmendaOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Tamanho da pagina
                        <select
                          value={consultaFnsFilters.count}
                          onChange={(e) => setConsultaFnsFilters((prev) => ({ ...prev, count: e.target.value }))}
                        >
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                      </label>
                    </div>
                    <div className="action-row">
                      <button type="button" onClick={() => void onApplyConsultaFnsFilters(1)} disabled={isBusy}>
                        Consultar
                      </button>
                      <button type="button" className="secondary" onClick={onClearConsultaFnsFilters} disabled={isBusy}>
                        Limpar filtros
                      </button>
                      <button type="button" className="secondary" onClick={() => void loadConsultaFnsStatus()} disabled={isBusy}>
                        Atualizar status
                      </button>
                      {canManageInstruments && (
                        <button type="button" className="secondary" onClick={() => void onSyncConsultaFnsCache()} disabled={isBusy}>
                          Sincronizar cache
                        </button>
                      )}
                      <button type="button" className="secondary" onClick={onExportConsultaFnsAnalitico} disabled={isBusy}>
                        Relatorio analitico
                      </button>
                    </div>
                  </div>

                  {consultaFnsSyncStatus && (
                    <div className="card table-card">
                      <p>
                        Status cache: {consultaFnsSyncStatus.status} | Atualizado em: {consultaFnsSyncStatus.atualizado_em ?? "-"} |
                        Entradas: {consultaFnsSyncStatus.entradas_cache} | Falhas: {consultaFnsSyncStatus.falhas}
                      </p>
                    </div>
                  )}

                  {!consultaFnsData ? (
                    <div className="card table-card">
                      <p>Defina os filtros e clique em consultar para listar propostas do Consulta FNS dos proponentes atendidos.</p>
                    </div>
                  ) : (
                    <>
                      <div className="card table-card">
                        <h3>Propostas FAF</h3>
                        <p className="muted" style={{ marginTop: 0 }}>
                          Linhas detalhaveis: {consultaFnsData.itens.filter((item) => resolveConsultaFnsNuProposta(item) !== "").length} |
                          Parlamentar preenchido: {consultaFnsData.itens.filter((item) => (item.parlamentares?.length ?? 0) > 0).length}
                        </p>
                        {(consultaFnsFilters.tp_proposta.trim() !== "" ||
                          consultaFnsFilters.tp_recurso.trim() !== "" ||
                          consultaFnsFilters.nu_proposta.trim() !== "") && (
                          <div className="action-row" style={{ marginBottom: 10 }}>
                            <button type="button" className="secondary" onClick={onResetConsultaFnsToSearchStart}>
                              Voltar ao inicio das buscas
                            </button>
                          </div>
                        )}
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Tipo linha</th>
                                <th>Tipo proposta</th>
                                <th>Tipo recurso</th>
                                <th>N° proposta</th>
                                <th>Entidade</th>
                                <th>Valor da proposta</th>
                                <th>Valor pago</th>
                                <th>Data do pagamento</th>
                                <th>Parlamentar</th>
                                <th>Partido</th>
                                <th>Emenda</th>
                                <th>Ano</th>
                                <th>Valor emenda</th>
                                <th>Acoes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {consultaFnsData.itens.length === 0 ? (
                                <tr>
                                    <td colSpan={14}>Nenhuma proposta encontrada para os proponentes atendidos.</td>
                                  </tr>
                              ) : (
                                consultaFnsData.itens.map((item, index) => (
                                  (() => {
                                    const parlamentar = item.parlamentares?.[0];
                                    const valorEmendaSomado = sumConsultaFnsValorEmenda(item);
                                    const hasNuProposta = resolveConsultaFnsNuProposta(item) !== "";
                                    return (
                                  <tr key={`${item.nuProposta ?? index}-${item.coTipoProposta}`}>
                                    <td>
                                      <span className={hasNuProposta ? "stage-badge done" : "stage-badge"}>
                                        {hasNuProposta ? "Detalhavel" : "Agregada"}
                                      </span>
                                    </td>
                                    <td>{item.coTipoProposta}</td>
                                    <td>{item.dsTipoRecurso}</td>
                                    <td>{resolveConsultaFnsNuProposta(item) || "-"}</td>
                                    <td>{item.noEntidade ?? "-"}</td>
                                    <td>{formatCurrency(item.vlProposta)}</td>
                                    <td>{formatCurrency(item.vlPago)}</td>
                                    <td>{resolveConsultaFnsDataPagamento(item)}</td>
                                    <td>{resolveConsultaFnsParlamentarLabel(item)}</td>
                                    <td>{parlamentar?.sgPartido ?? "-"}</td>
                                    <td>{parlamentar?.coEmendaPolitica ?? "-"}</td>
                                    <td>{parlamentar?.nuAnoExercicio ?? "-"}</td>
                                    <td>{valorEmendaSomado == null ? "-" : formatCurrency(valorEmendaSomado)}</td>
                                    <td>
                                      <button
                                        type="button"
                                        className="secondary"
                                        onClick={() => void onOpenConsultaFnsDetalhe(item)}
                                        disabled={isBusy}
                                      >
                                        {hasNuProposta ? "Detalhar" : "Listar propostas"}
                                      </button>
                                    </td>
                                  </tr>
                                    );
                                  })()
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="action-row">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void onApplyConsultaFnsFilters(consultaFnsPage - 1)}
                          disabled={isBusy || !consultaFnsData.paginacao.tem_anterior}
                        >
                          Pagina anterior
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void onApplyConsultaFnsFilters(consultaFnsPage + 1)}
                          disabled={isBusy || !consultaFnsData.paginacao.tem_proxima}
                        >
                          Proxima pagina
                        </button>
                      </div>

                      {consultaFnsDetalhe && (
                        <div className="modal-overlay" onClick={onCloseConsultaFnsDetalhe}>
                          <div
                            className="modal-content"
                            style={{ maxWidth: "1100px", maxHeight: "85vh", overflowY: "auto" }}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="modal-header">
                              <h3>Detalhe proposta {consultaFnsSelected?.nuProposta ?? consultaFnsDetalhe.nuProposta}</h3>
                              <button type="button" className="ghost" onClick={onCloseConsultaFnsDetalhe}>
                                Fechar
                              </button>
                            </div>
                            <div className="modal-body">
                              <p>
                                <strong>Entidade:</strong> {consultaFnsDetalhe.noEntidade} | <strong>Municipio/UF:</strong>{" "}
                                {consultaFnsDetalhe.noMunicipio}/{consultaFnsDetalhe.sgUf} | <strong>Situacao:</strong>{" "}
                                {consultaFnsDetalhe.situacao?.descricaoSituacaoproposta ?? "Nao informada"}
                              </p>
                              <p>
                                <strong>Portaria:</strong> {consultaFnsDetalhe.nuPortaria ?? "-"} | <strong>Processo:</strong>{" "}
                                {consultaFnsDetalhe.nuProcesso ?? "-"}
                              </p>
                              <p>
                                <strong>Valor proposta:</strong> {formatCurrency(consultaFnsDetalhe.vlProposta)} | <strong>Empenhado:</strong>{" "}
                                {formatCurrency(consultaFnsDetalhe.vlEmpenhado)} | <strong>Pago:</strong>{" "}
                                {formatCurrency(consultaFnsDetalhe.vlPago)}
                              </p>
                              <div className="table-wrap">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Parlamentar</th>
                                      <th>Partido</th>
                                      <th>Emenda</th>
                                      <th>Ano</th>
                                      <th>Valor</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {consultaFnsDetalhe.parlamentares.length === 0 ? (
                                      <tr>
                                        <td colSpan={5}>Nenhum parlamentar informado.</td>
                                      </tr>
                                    ) : (
                                      consultaFnsDetalhe.parlamentares.map((item, index) => (
                                        <tr key={`${item.coEmendaPolitica}-${index}`}>
                                          <td>{item.noApelidoPolitico}</td>
                                          <td>{item.sgPartido}</td>
                                          <td>{item.coEmendaPolitica}</td>
                                          <td>{item.nuAnoExercicio}</td>
                                          <td>{formatCurrency(item.vlIndObjeto)}</td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                              <div className="table-wrap" style={{ marginTop: 12 }}>
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Data Pagamento</th>
                                      <th>Ordem Bancaria</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {consultaFnsDetalhe.pagamentos.length === 0 ? (
                                      <tr>
                                        <td colSpan={2}>Nenhum pagamento informado.</td>
                                      </tr>
                                    ) : (
                                      consultaFnsDetalhe.pagamentos.map((item, index) => (
                                        <tr key={`${item.nuOb}-${index}`}>
                                          <td>{formatUnixDatePtBr(item.dtCriacaoSiafi)}</td>
                                          <td>{item.nuOb || "-"}</td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : relatorioTab === "simec_obras" ? (
                <>
                  {!simecObraDetalhe && (
                    <div className="card filters-card">
                      <h3>SIMEC - Painel de Obras</h3>
                      <div className="filters-grid columns-4">
                        <label>
                          UF
                          <select
                            value={simecObrasFilters.uf}
                            onChange={(e) =>
                              setSimecObrasFilters((prev) => ({
                                ...prev,
                                uf: e.target.value,
                                muncod: ""
                              }))
                            }
                          >
                            <option value="">Selecione</option>
                            {simecUfs.map((item) => (
                              <option key={item.uf} value={item.sigla}>
                                {item.sigla} - {item.nome}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Municipio
                          <select
                            value={simecObrasFilters.muncod}
                            onChange={(e) => setSimecObrasFilters((prev) => ({ ...prev, muncod: e.target.value }))}
                            disabled={simecMunicipios.length === 0}
                          >
                            <option value="">Selecione</option>
                            {simecMunicipios.map((item) => (
                              <option key={item.codigo} value={item.codigo}>
                                {item.nome} ({item.codigo})
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Codigo municipio (IBGE)
                          <input
                            value={simecObrasFilters.muncod}
                            onChange={(e) =>
                              setSimecObrasFilters((prev) => ({ ...prev, muncod: e.target.value.replace(/\D/g, "") }))
                            }
                            placeholder="Ex.: 120040"
                          />
                        </label>
                        <label>
                          Esfera
                          <input
                            value={simecObrasFilters.esfera}
                            onChange={(e) => setSimecObrasFilters((prev) => ({ ...prev, esfera: e.target.value }))}
                            placeholder="Ex.: MUNICIPAL"
                          />
                        </label>
                        <label>
                          Tipologia
                          <input
                            value={simecObrasFilters.tipologia}
                            onChange={(e) => setSimecObrasFilters((prev) => ({ ...prev, tipologia: e.target.value }))}
                            placeholder="Ex.: QUADRA"
                          />
                        </label>
                        <label>
                          Vigencia
                          <select
                            value={simecObrasFilters.vigencia_status}
                            onChange={(e) =>
                              setSimecObrasFilters((prev) => ({
                                ...prev,
                                vigencia_status: e.target.value as "" | "vencidas" | "30" | "60" | "90"
                              }))
                            }
                          >
                            <option value="">Todas</option>
                            <option value="vencidas">Ja venceram</option>
                            <option value="30">Vencem em ate 30 dias</option>
                            <option value="60">Vencem em ate 60 dias</option>
                            <option value="90">Vencem em ate 90 dias</option>
                          </select>
                        </label>
                        <label>
                          ID da obra
                          <input
                            value={simecObrasFilters.obrid}
                            onChange={(e) =>
                              setSimecObrasFilters((prev) => ({ ...prev, obrid: e.target.value.replace(/\D/g, "") }))
                            }
                            placeholder="Ex.: 1016561"
                          />
                        </label>
                      </div>

                      <div className="action-row">
                        <button type="button" onClick={() => void onApplySimecObrasFilters()} disabled={isBusy}>
                          Consultar
                        </button>
                        <button type="button" className="secondary" onClick={onClearSimecObrasFilters} disabled={isBusy}>
                          Limpar filtros
                        </button>
                      </div>
                    </div>
                  )}

                  {!simecObrasData ? (
                    <div className="card table-card">
                      <p>Selecione UF e municipio para consultar obras do SIMEC.</p>
                    </div>
                  ) : simecObraDetalhe ? (
                    <div className="card table-card">
                      <div className="action-row" style={{ marginBottom: 10 }}>
                        <button type="button" className="secondary" onClick={onCloseSimecObraDetalhe}>
                          Voltar para lista
                        </button>
                      </div>
                      <h3>Detalhe da obra {simecObraDetalheId ?? simecObraDetalhe.obra_id}</h3>
                      <p>
                        <strong>Titulo:</strong> {normalizeReadableTextSafe(simecObraDetalhe.titulo)}
                      </p>
                      <p>
                        <strong>Pagina oficial:</strong>{" "}
                        <a href={simecObraDetalhe.detalhe_url} target="_blank" rel="noreferrer">
                          Abrir no SIMEC
                        </a>
                      </p>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Campo</th>
                              <th>Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(simecObraDetalhe.detalhes).length === 0 ? (
                              <tr>
                                <td colSpan={2}>Sem detalhes estruturados para esta obra.</td>
                              </tr>
                            ) : (
                              Object.entries(simecObraDetalhe.detalhes).map(([campo, valor]) => (
                                <tr key={campo}>
                                  <td>{normalizeReadableTextSafe(campo)}</td>
                                  <td>{normalizeReadableTextSafe(valor)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="report-kpi-grid">
                        <div className="card kpi-card">
                          <p className="eyebrow">Obras encontradas</p>
                          <h3>{simecObrasData.total}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Obras exibidas</p>
                          <h3>{filteredSimecObrasItems.length}</h3>
                        </div>
                      </div>

                      <div className="card table-card">
                        <h3>Obras listadas</h3>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>ID</th>
                                <th>Titulo</th>
                                <th>Situacao</th>
                                <th>Localizacao</th>
                                <th>Esfera</th>
                                <th>Tipologia</th>
                                <th>Fim vigencia</th>
                                <th>Dias p/ vencer</th>
                                <th>Valor previsto</th>
                                <th>Pago FNDE</th>
                                <th>% execucao</th>
                                <th>Acoes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredSimecObrasItems.length === 0 ? (
                                <tr>
                                  <td colSpan={12}>Nenhuma obra encontrada para os filtros informados.</td>
                                </tr>
                              ) : (
                                filteredSimecObrasItems.map((item) => {
                                  const diasParaVencer = item.vigencia_fim ? getDaysUntilDate(item.vigencia_fim) : null;
                                  return (
                                    <tr key={item.obra_id}>
                                      <td>{item.obra_id}</td>
                                      <td>{normalizeReadableTextSafe(item.titulo)}</td>
                                      <td>{normalizeReadableTextSafe(item.situacao)}</td>
                                      <td>{normalizeReadableTextSafe(item.localizacao)}</td>
                                      <td>{normalizeReadableTextSafe(item.esfera)}</td>
                                      <td>{normalizeReadableTextSafe(item.tipo)}</td>
                                      <td>{item.vigencia_fim ? formatDateOnlyPtBr(item.vigencia_fim) : "-"}</td>
                                      <td>{diasParaVencer === null ? "-" : `${diasParaVencer} dias`}</td>
                                      <td>{item.valor_previsto == null ? "-" : formatCurrency(item.valor_previsto)}</td>
                                      <td>{item.valor_pago_fnde == null ? "-" : formatCurrency(item.valor_pago_fnde)}</td>
                                      <td>{item.percentual_execucao == null ? "-" : `${item.percentual_execucao.toFixed(2)}%`}</td>
                                      <td>
                                        <button
                                          type="button"
                                          className="secondary"
                                          onClick={() => void onOpenSimecObraDetalhe(item.obra_id)}
                                          disabled={isBusy}
                                        >
                                          Detalhar
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : relatorioTab === "simec_termos" ? (
                <>
                  {!simecTermoDetalhe && (
                    <div className="card filters-card">
                      <h3>SIMEC - Termos de compromisso</h3>
                      <div className="filters-grid columns-4">
                        <label>
                          Busca livre
                          <input
                            value={simecTermosFilters.q}
                            onChange={(e) => setSimecTermosFilters((prev) => ({ ...prev, q: e.target.value }))}
                            placeholder="Numero do termo, secretaria, processo, CPF, CNPJ..."
                          />
                        </label>
                        <label>
                          Ano
                          <input
                            value={simecTermosFilters.ano}
                            onChange={(e) =>
                              setSimecTermosFilters((prev) => ({ ...prev, ano: e.target.value.replace(/\D/g, "").slice(0, 4) }))
                            }
                            placeholder="Ex.: 2021"
                          />
                        </label>
                        <label>
                          Secretaria
                          <select
                            value={simecTermosFilters.secretaria}
                            onChange={(e) =>
                              setSimecTermosFilters((prev) => ({
                                ...prev,
                                secretaria: e.target.value as "" | "E" | "M"
                              }))
                            }
                          >
                            <option value="">Todas</option>
                            <option value="E">Estadual</option>
                            <option value="M">Municipal</option>
                          </select>
                        </label>
                        <label>
                          UF
                          <select
                            value={simecTermosFilters.uf}
                            onChange={(e) => setSimecTermosFilters((prev) => ({ ...prev, uf: e.target.value }))}
                          >
                            <option value="">Todas</option>
                            {simecUfs.map((item) => (
                              <option key={item.uf} value={item.sigla}>
                                {item.sigla} - {item.nome}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Quantos IDs varrer
                          <select
                            value={simecTermosFilters.limite}
                            onChange={(e) => setSimecTermosFilters((prev) => ({ ...prev, limite: e.target.value }))}
                          >
                            <option value="50">50</option>
                            <option value="100">100</option>
                            <option value="200">200</option>
                            <option value="300">300</option>
                          </select>
                        </label>
                      </div>

                      <div className="action-row" style={{ marginBottom: 12 }}>
                        <button type="button" className="secondary" onClick={() => onApplySimecTermosRecentPreset(50000, 50)} disabled={isBusy}>
                          Recentes 50
                        </button>
                        <button type="button" className="secondary" onClick={() => onApplySimecTermosRecentPreset(50000, 100)} disabled={isBusy}>
                          Recentes 100
                        </button>
                        <button type="button" className="secondary" onClick={() => onApplySimecTermosPreset(1, 100)} disabled={isBusy}>
                          Faixa 1-100
                        </button>
                      </div>

                      <details className="card" style={{ marginBottom: 12 }}>
                        <summary>Faixa tecnica por dotid</summary>
                        <div className="filters-grid columns-4" style={{ marginTop: 12 }}>
                          <label>
                            ID interno inicial do SIMEC
                            <input
                              value={simecTermosFilters.dotid_inicio}
                              onChange={(e) =>
                                setSimecTermosFilters((prev) => ({
                                  ...prev,
                                  dotid_inicio: e.target.value.replace(/\D/g, "")
                                }))
                              }
                              placeholder="Ex.: 1"
                            />
                          </label>
                          <label>
                            ID interno final do SIMEC
                            <input
                              value={simecTermosFilters.dotid_fim}
                              onChange={(e) =>
                                setSimecTermosFilters((prev) => ({
                                  ...prev,
                                  dotid_fim: e.target.value.replace(/\D/g, "")
                                }))
                              }
                              placeholder="Opcional"
                            />
                          </label>
                        </div>
                      </details>

                      <div className="action-row">
                        <button type="button" onClick={() => void onApplySimecTermosFilters()} disabled={isBusy}>
                          Buscar termos
                        </button>
                        <button type="button" className="secondary" onClick={onClearSimecTermosFilters} disabled={isBusy}>
                          Limpar filtros
                        </button>
                      </div>
                      <p className="subtitle">
                        Sem faixa tecnica, a busca percorre os termos mais recentes usando cursor automatico.
                      </p>
                    </div>
                  )}

                  {!simecTermosData ? (
                    <div className="card table-card">
                      <p>Use a busca livre e a varredura automatica para encontrar termos publicos do SIMEC.</p>
                    </div>
                  ) : simecTermoDetalhe ? (
                    <div className="card table-card">
                      <div className="action-row" style={{ marginBottom: 10 }}>
                        <button type="button" className="secondary" onClick={onCloseSimecTermoDetalhe}>
                          Voltar para lista
                        </button>
                      </div>
                      <h3>Detalhe do termo {simecTermoDetalhe.termo_numero}</h3>
                      <div className="report-kpi-grid">
                        <div className="card kpi-card">
                          <p className="eyebrow">Dotid</p>
                          <h3>{simecTermoDetalheId ?? simecTermoDetalhe.dotid}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Total geral</p>
                          <h3>{simecTermoDetalhe.total_geral == null ? "-" : formatCurrency(simecTermoDetalhe.total_geral)}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Itens</p>
                          <h3>{simecTermoDetalhe.itens.length}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Empenhos</p>
                          <h3>{simecTermoDetalhe.empenhos.length}</h3>
                        </div>
                      </div>
                      <p>
                        <strong>Pagina oficial:</strong>{" "}
                        <a href={simecTermoDetalhe.detalhe_url} target="_blank" rel="noreferrer">
                          Abrir no SIMEC
                        </a>
                      </p>

                      <div className="card table-card">
                        <h3>Campos estruturados</h3>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Campo</th>
                                <th>Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(simecTermoDetalhe.campos).length === 0 ? (
                                <tr>
                                  <td colSpan={2}>Sem campos estruturados para este termo.</td>
                                </tr>
                              ) : (
                                Object.entries(simecTermoDetalhe.campos).map(([campo, valor]) => (
                                  <tr key={campo}>
                                    <td>{normalizeReadableTextSafe(campo)}</td>
                                    <td>{normalizeReadableTextSafe(valor)}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="card table-card">
                        <h3>Itens financiados</h3>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Codigo</th>
                                <th>Iniciativa</th>
                                <th>Etapa</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {simecTermoDetalhe.itens.length === 0 ? (
                                <tr>
                                  <td colSpan={4}>Nenhum item estruturado encontrado.</td>
                                </tr>
                              ) : (
                                simecTermoDetalhe.itens.map((item, index) => (
                                  <tr key={`${item.codigo ?? "item"}-${index}`}>
                                    <td>{normalizeReadableTextSafe(item.codigo)}</td>
                                    <td>{normalizeReadableTextSafe(item.iniciativa)}</td>
                                    <td>{normalizeReadableTextSafe(item.etapa)}</td>
                                    <td>{item.total == null ? "-" : formatCurrency(item.total)}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="card table-card">
                        <h3>Empenhos</h3>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Iniciativa</th>
                                <th>Numero</th>
                                <th>Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {simecTermoDetalhe.empenhos.length === 0 ? (
                                <tr>
                                  <td colSpan={3}>Nenhum empenho estruturado encontrado.</td>
                                </tr>
                              ) : (
                                simecTermoDetalhe.empenhos.map((item, index) => (
                                  <tr key={`${item.numero ?? "empenho"}-${index}`}>
                                    <td>{normalizeReadableTextSafe(item.iniciativa)}</td>
                                    <td>{normalizeReadableTextSafe(item.numero)}</td>
                                    <td>{item.valor == null ? "-" : formatCurrency(item.valor)}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="report-kpi-grid">
                        <div className="card kpi-card">
                          <p className="eyebrow">Dotids consultados</p>
                          <h3>{simecTermosData.resumo.dotids_consultados}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Termos encontrados</p>
                          <h3>{simecTermosData.resumo.termos_encontrados}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Modo</p>
                          <h3>{simecTermosData.resumo.modo === "recentes" ? "Recentes" : "Faixa"}</h3>
                        </div>
                      </div>

                      <div className="card table-card">
                        <h3>Termos listados</h3>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Dotid</th>
                                <th>Termo</th>
                                <th>Tipo</th>
                                <th>UF</th>
                                <th>Secretaria</th>
                                <th>Processo</th>
                                <th>Total geral</th>
                                <th>Assinatura</th>
                                <th>Acoes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {simecTermosData.itens.length === 0 ? (
                                <tr>
                                  <td colSpan={9}>
                                    {simecTermosData.resumo.modo === "recentes"
                                      ? "Nenhum termo encontrado para os filtros informados na varredura recente."
                                      : "Nenhum termo encontrado para a faixa informada."}
                                  </td>
                                </tr>
                              ) : (
                                simecTermosData.itens.map((item) => (
                                  <tr key={item.dotid}>
                                    <td>{item.dotid}</td>
                                    <td>{normalizeReadableTextSafe(item.termo_numero)}</td>
                                    <td>{normalizeReadableTextSafe(item.ente_tipo)}</td>
                                    <td>{normalizeReadableTextSafe(item.uf)}</td>
                                    <td>{normalizeReadableTextSafe(item.secretaria_nome)}</td>
                                    <td>{normalizeReadableTextSafe(item.processo)}</td>
                                    <td>{item.total_geral == null ? "-" : formatCurrency(item.total_geral)}</td>
                                    <td>{item.data_assinatura ? formatDateOnlyPtBr(item.data_assinatura) : "-"}</td>
                                    <td>
                                      <button
                                        type="button"
                                        className="secondary"
                                        onClick={() => void onOpenSimecTermoDetalhe(item.dotid)}
                                        disabled={isBusy}
                                      >
                                        Detalhar
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                        {simecTermosData.resumo.proximo_cursor ? (
                          <div className="action-row" style={{ marginTop: 12 }}>
                            <button type="button" className="secondary" onClick={() => void onLoadMoreSimecTermos()} disabled={isBusy}>
                              Carregar mais recentes
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                </>
              ) : relatorioTab === "extracao_simec" ? (
                <>
                  <div className="card">
                    <h3>Consulta SIMEC por município</h3>
                    <p className="subtitle">Consulta os termos do SIMEC pelo município selecionado e lista os registros retornados pelo portal.</p>

                    <div className="filters-grid columns-2" style={{ marginTop: 16, maxWidth: 600 }}>
                      <label>
                        UF *
                        <select
                          value={extracaoSimecFilters.uf}
                          onChange={(e) => {
                            const newUf = e.target.value;
                            setExtracaoSimecFilters(prev => ({ ...prev, uf: newUf, muncod: "" }));
                            if (newUf) {
                              void loadSimecMunicipios(newUf);
                            }
                          }}
                        >
                          <option value="">Selecione</option>
                          {simecUfs.map((item) => (
                            <option key={item.uf} value={item.sigla}>
                              {item.sigla} - {item.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Município *
                        <select
                          value={extracaoSimecFilters.muncod}
                          onChange={(e) => setExtracaoSimecFilters(prev => ({ ...prev, muncod: e.target.value }))}
                          disabled={!extracaoSimecFilters.uf || simecMunicipios.length === 0}
                        >
                          <option value="">Selecione</option>
                          {simecMunicipios.map((item) => (
                            <option key={item.codigo} value={item.codigo}>
                              {item.nome} ({item.codigo})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Esfera (M/E) *
                        <select
                          value={extracaoSimecFilters.secretaria}
                          onChange={(e) => setExtracaoSimecFilters(prev => ({ ...prev, secretaria: e.target.value as "M" | "E" }))}
                        >
                          <option value="M">Municipal</option>
                          <option value="E">Estadual</option>
                        </select>
                      </label>
                      <label>
                        Ano (Opcional)
                        <input
                          placeholder="Todos os anos"
                          type="number"
                          value={extracaoSimecFilters.ano}
                          onChange={(e) => setExtracaoSimecFilters(prev => ({ ...prev, ano: e.target.value }))}
                        />
                      </label>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gridColumn: 'span 2' }}>
                        <button
                          type="button"
                          disabled={isBusy || !extracaoSimecFilters.uf || !extracaoSimecFilters.muncod}
                          style={{ width: '100%' }}
                          onClick={async () => {
                            const { uf, muncod, ano, secretaria } = extracaoSimecFilters;
                            const municipioSelecionado = simecMunicipios.find((item) => item.codigo === muncod);

                            setIsBusy(true);
                            setMessage("Iniciando extração. Isso pode levar alguns segundos...");
                            console.log("[SIMEC] Parâmetros enviados:", { uf, muncod, ano, secretaria });

                            try {
                              const res = await getExtracaoSimec(token!, {
                                uf,
                                municipio: muncod,
                                ano: ano ? Number(ano) : undefined,
                                secretaria
                              });
                              console.log("Resultado SIMEC:", res);
                              setExtracaoSimecData({
                                ...res,
                                dados: res.dados.map((item) => ({
                                  ...item,
                                  municipio: municipioSelecionado?.nome ?? item.municipio
                                }))
                              });
                              if (!res.sucesso) {
                                if (res.html_bruto) {
                                  console.log("HTML de Diagnóstico SIMEC:", res.html_bruto);
                                }
                                alert(res.mensagem || "Erro na consulta");
                              }
                              setMessage("");
                            } catch (err: any) {
                              setMessage(`Erro na consulta do SIMEC: ${err.message}`);
                            } finally {
                              setIsBusy(false);
                            }
                          }}
                        >
                          Consultar termos
                        </button>
                      </div>
                    </div>
                  </div>

                  {extracaoSimecData && (
                    <div className="card table-card" style={{ marginTop: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3>Dados Extraídos ({extracaoSimecData.dados.length})</h3>
                        <div className="action-row">
                          <button
                            type="button"
                            className="secondary"
                            onClick={onExportExtracaoSimecAnalitico}
                            disabled={extracaoSimecData.dados.length === 0}
                          >
                            Relatório Analítico
                          </button>
                          <button type="button" className="secondary" onClick={() => setExtracaoSimecData(null)}>Limpar resultados</button>
                        </div>
                      </div>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Termo</th>
                              <th>Tipo do Objeto</th>
                              <th>Município</th>
                              <th>Ano</th>
                              <th>Valor</th>
                              <th>Vigência Final</th>
                            </tr>
                          </thead>
                          <tbody>
                            {extracaoSimecData.dados.length === 0 ? (
                              <tr>
                                <td colSpan={6}>Nenhum dado encontrado para os filtros informados.</td>
                              </tr>
                            ) : (
                              extracaoSimecData.dados.map((item, idx) => (
                                <tr key={idx}>
                                  <td>{item.numeroTermo}</td>
                                  <td>{item.objeto}</td>
                                  <td>{item.municipio}</td>
                                  <td>{item.ano}</td>
                                  <td>{item.valor}</td>
                                  <td>{item.situacao}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : relatorioTab === "transferencias_especiais" ? (
                <>
                  <div className="card">
                    <h3>Especiais</h3>
                    <p className="subtitle">Consulta de emendas especiais com foco em filtros e resultados.</p>
                  </div>

                  <div className="card filters-card">
                    <h3>Filtros</h3>
                    <div className="filters-grid transferencias-especiais-filters-grid">
                      <label className="transferencias-especiais-field transferencias-especiais-field-proponente">
                        Proponente (Cidade)
                        <select
                          value={transferenciasEspeciaisFilters.proponente_id}
                          onChange={(e) => {
                            const selectedId = Number(e.target.value);
                            const selected = proponentes.find((p) => p.id === selectedId);
                            setTransferenciasEspeciaisFilters((prev) => ({
                              ...emptyTransferenciasEspeciaisFilters(),
                              proponente_id: e.target.value,
                              cnpj: selected?.cnpj || "",
                              nome_beneficiario: selected?.nome || "",
                              uf: selected?.uf || "",
                              page_size: prev.page_size
                            }));
                            setTransferenciasEspeciaisData(null);
                            setTransferenciasEspeciaisPage(1);
                          }}
                        >
                          <option value="">Todos</option>
                          {proponentes.map((item) => (
                            <option key={item.id} value={String(item.id)}>
                              {item.nome} ({item.cnpj})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="transferencias-especiais-field transferencias-especiais-field-ano">
                        Ano
                        <input
                          type="number"
                          min={2019}
                          max={2100}
                          value={transferenciasEspeciaisFilters.ano}
                          onChange={(e) =>
                            setTransferenciasEspeciaisFilters((prev) => ({ ...prev, ano: e.target.value }))
                          }
                          placeholder="Ex.: 2026"
                        />
                      </label>
                      <div className="transferencias-especiais-field transferencias-especiais-field-situacao">
                        <span style={{ display: "inline-block", marginBottom: 6 }}>Situação</span>
                        <div className="transferencias-especiais-situacao-list">
                          {TRANSFERENCIAS_ESPECIAIS_SITUACAO_OPTIONS.map((option) => {
                            const checked = transferenciasEspeciaisFilters.situacao.includes(option);
                            return (
                              <label
                                key={option}
                                style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400, fontSize: 13 }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  style={{ width: 13, height: 13 }}
                                  onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    setTransferenciasEspeciaisFilters((prev) => ({
                                      ...prev,
                                      situacao: isChecked
                                        ? [...prev.situacao, option]
                                        : prev.situacao.filter((item) => item !== option)
                                    }));
                                  }}
                                />
                                <span>{option}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      <label className="transferencias-especiais-field">
                        Status do pagamento
                        <select
                          value={transferenciasEspeciaisFilters.pagamento}
                          onChange={(e) =>
                            setTransferenciasEspeciaisFilters((prev) => ({
                              ...prev,
                              pagamento: e.target.value as TransferenciasEspeciaisFilters["pagamento"]
                            }))
                          }
                        >
                          <option value="">Todos</option>
                          <option value="pago">Pago / Em conta</option>
                          <option value="nao_pago">Não identificado</option>
                        </select>
                      </label>
                      <label className="transferencias-especiais-field">
                        Codigo plano de acao
                        <input
                          value={transferenciasEspeciaisFilters.codigo_plano_acao}
                          onChange={(e) =>
                            setTransferenciasEspeciaisFilters((prev) => ({ ...prev, codigo_plano_acao: e.target.value }))
                          }
                          placeholder="Ex.: 0903-003192"
                        />
                      </label>
                      <label className="transferencias-especiais-field">
                        Emenda Parlamentar
                        <input
                          value={transferenciasEspeciaisFilters.parlamentar}
                          onChange={(e) =>
                            setTransferenciasEspeciaisFilters((prev) => ({ ...prev, parlamentar: e.target.value }))
                          }
                          placeholder="Codigo ou nome da emenda"
                        />
                      </label>
                      <label className="transferencias-especiais-field transferencias-especiais-field-page-size">
                        Tamanho da pagina
                        <select
                          value={transferenciasEspeciaisFilters.page_size}
                          onChange={(e) =>
                            setTransferenciasEspeciaisFilters((prev) => ({ ...prev, page_size: e.target.value }))
                          }
                        >
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                      </label>
                    </div>

                    <div className="action-row">
                      <button type="button" onClick={() => void onApplyTransferenciasEspeciaisFilters(1)} disabled={isBusy}>
                        Consultar
                      </button>
                      <button type="button" className="secondary" onClick={onClearTransferenciasEspeciaisFilters}>
                        Limpar filtros
                      </button>
                      {canManageInstruments && (
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void onSyncTransferenciasEspeciaisRealtime()}
                          disabled={
                            isSyncingTransferenciasEspeciais || transferenciasEspeciaisSyncStatus?.status === "running"
                          }
                        >
                          {isSyncingTransferenciasEspeciais
                            ? "Iniciando sincronizacao..."
                            : "Sincronizar especiais (painel + API)"}
                        </button>
                      )}
                      {canManageInstruments && (
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void onSyncTransferenciasEspeciaisRealtimeByCnpj()}
                          disabled={
                            isSyncingTransferenciasEspeciais ||
                            transferenciasEspeciaisSyncStatus?.status === "running" ||
                            transferenciasEspeciaisFilters.cnpj.replace(/\D/g, "").length !== 14
                          }
                        >
                          Sincronizar por CNPJ (painel + API)
                        </button>
                      )}
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void onRefreshTransferenciasEspeciaisSyncStatus()}
                      >
                        Atualizar status sync
                      </button>
                      {canManageInstruments && (
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void onCancelTransferenciasEspeciaisSync()}
                          disabled={!transferenciasEspeciaisSyncStatus || transferenciasEspeciaisSyncStatus.status !== "running"}
                        >
                          Interromper sincronizacao especiais
                        </button>
                      )}
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => transferenciasEspeciaisData && exportTransferenciasEspeciaisCsv(transferenciasEspeciaisData)}
                        disabled={!transferenciasEspeciaisData}
                      >
                        Exportar CSV
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => onExportTransferenciasEspeciaisPdf("executivo")}
                        disabled={!transferenciasEspeciaisData}
                      >
                        Exportar PDF Executivo
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => onExportTransferenciasEspeciaisPdf("analitico")}
                        disabled={!transferenciasEspeciaisData}
                      >
                        Exportar PDF Analitico
                      </button>
                    </div>

                    {transferenciasEspeciaisSyncStatus && (
                      <div className="card table-card" style={{ marginTop: 12 }}>
                        <p>
                          Status sincronizacao especiais: <strong>{transferenciasEspeciaisSyncStatus.status}</strong>
                          {transferenciasEspeciaisSyncStatus.detalhe ? ` - ${transferenciasEspeciaisSyncStatus.detalhe}` : ""}
                        </p>
                        <p className="muted" style={{ marginTop: 4 }}>
                          Estrategia ativa: <strong>{transferenciasEspeciaisSyncStatus.estrategia_status}</strong>
                        </p>
                        <p className="muted" style={{ marginTop: 4 }}>
                          Fonte prioritaria: <strong>{transferenciasEspeciaisSyncStatus.fonte_prioritaria}</strong>
                          {transferenciasEspeciaisSyncStatus.fonte_fallback
                            ? ` | Fallback: ${transferenciasEspeciaisSyncStatus.fonte_fallback}`
                            : ""}
                          {transferenciasEspeciaisSyncStatus.comparacao_habilitada ? " | Comparacao painel x API: ativa" : ""}
                        </p>
                        <p className="muted" style={{ marginTop: 4 }}>
                          Fase: {transferenciasEspeciaisSyncStatus.fase_atual} | Atualizado em: {transferenciasEspeciaisSyncHeartbeat}
                        </p>
                        {transferenciasEspeciaisSyncStatus.resumo_ultima_execucao && (
                          <p className="muted" style={{ marginTop: 4 }}>
                            Ultima execucao: {transferenciasEspeciaisSyncStatus.resumo_ultima_execucao.total_atualizados} atualizados
                            {" | "}
                            {transferenciasEspeciaisSyncStatus.resumo_ultima_execucao.total_criados} criados
                            {" | "}
                            {transferenciasEspeciaisSyncStatus.resumo_ultima_execucao.total_erros} erros
                          </p>
                        )}
                        <div className="repasse-progress" role="presentation" style={{ marginTop: 8 }}>
                          <span style={{ width: `${transferenciasEspeciaisSyncProgress}%` }} />
                        </div>
                        <p className="muted" style={{ marginTop: 6 }}>{transferenciasEspeciaisSyncProgress}%</p>
                      </div>
                    )}
                  </div>

                  {!transferenciasEspeciaisData ? (
                    <div className="card table-card">
                      <p>Preencha os filtros e consulte para visualizar os planos de acao especial.</p>
                    </div>
                  ) : (
                    <>
                      <div className="report-kpi-grid">
                        <div className="card kpi-card">
                          <p className="eyebrow">Total de registros</p>
                          <h3>{transferenciasEspeciaisData.paginacao.total}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Pagas / Em conta</p>
                          <h3>{transferenciasEspeciaisData.itens.filter((item) => item.pago_detectado).length}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Pagina atual</p>
                          <h3>
                            {transferenciasEspeciaisData.paginacao.pagina}/{transferenciasEspeciaisData.paginacao.total_paginas}
                          </h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Atualizado em</p>
                          <h3>{new Date(transferenciasEspeciaisData.cache.atualizado_em).toLocaleString("pt-BR")}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Fonte</p>
                          <h3>{transferenciasEspeciaisData.cache.em_cache ? "Cache" : "Tempo real"}</h3>
                        </div>
                      </div>

                      <div className="card table-card">
                        <h3>Planos de acao especial</h3>
                        <div className="table-wrap transferencias-especiais-table-wrap">
                          <table className="transferencias-especiais-table">
                            <thead>
                              <tr>
                                <th>Plano</th>
                                <th>Situação</th>
                                <th>Concedente</th>
                                <th>Beneficiário</th>
                                <th>Emenda</th>
                                <th>Valores</th>
                                <th>Pagamento</th>
                                <th>Conta</th>
                                <th>Objeto</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transferenciasEspeciaisData.itens.length === 0 ? (
                                <tr>
                                  <td colSpan={9}>Nenhum plano de acao encontrado para os filtros informados.</td>
                                </tr>
                              ) : (
                                transferenciasEspeciaisData.itens.map((item) => (
                                  <tr key={item.id_plano_acao}>
                                    <td>
                                      <strong>{item.codigo_plano_acao}</strong>
                                      <div className="muted" style={{ marginTop: 4 }}>
                                        ID {item.id_plano_acao} | {item.ano_plano_acao}
                                      </div>
                                      <div className="muted" style={{ marginTop: 4 }}>{item.fonte_status}</div>
                                    </td>
                                    <td>
                                      <strong>{item.situacao_plano_acao}</strong>
                                      {item.comparacao_status && (
                                        <div className="muted" style={{ marginTop: 4 }}>
                                          {item.comparacao_status}
                                        </div>
                                      )}
                                    </td>
                                    <td>{item.concedente ?? "-"}</td>
                                    <td>
                                      <strong>{item.nome_beneficiario_plano_acao}</strong>
                                      <div className="muted" style={{ marginTop: 4 }}>{item.uf_beneficiario_plano_acao}</div>
                                    </td>
                                    <td>{item.nome_parlamentar_emenda_plano_acao ?? "-"}</td>
                                    <td>
                                      <strong>{formatCurrency(item.valor_investimento_plano_acao)}</strong>
                                      <div className="muted" style={{ marginTop: 4 }}>
                                        Custeio: {formatCurrency(item.valor_custeio_plano_acao)}
                                      </div>
                                      <div className="muted" style={{ marginTop: 4 }}>
                                        Saldo: {item.saldo_conta_corrente != null ? formatCurrency(item.saldo_conta_corrente) : "-"}
                                      </div>
                                    </td>
                                    <td>
                                      <strong>{item.pagamento_status}</strong>
                                      <div className="muted" style={{ marginTop: 4 }}>
                                        {item.data_pagamento_detectado ? formatDateOnlyPtBr(item.data_pagamento_detectado) : "-"} |{" "}
                                        {formatCurrency(item.valor_pago_detectado ?? 0)}
                                      </div>
                                      <div className="muted" style={{ marginTop: 4 }}>
                                        {item.documentos_habeis_quantidade === 1
                                          ? "1 doc. hábil"
                                          : `${item.documentos_habeis_quantidade} docs. hábeis`}
                                      </div>
                                      <div className="muted" style={{ marginTop: 4 }}>{item.documento_habil_principal ?? "-"}</div>
                                      {(item.ordem_pagamento_principal || item.ordem_bancaria_principal) && (
                                        <div className="muted" style={{ marginTop: 4 }}>
                                          {[item.ordem_pagamento_principal, item.ordem_bancaria_principal]
                                            .filter(Boolean)
                                            .join(" / ")}
                                        </div>
                                      )}
                                    </td>
                                    <td>
                                      <strong>{item.banco ?? "-"}</strong>
                                      <div className="muted" style={{ marginTop: 4 }}>
                                        Ag. {item.agencia ?? "-"} | Cc. {item.conta ?? "-"}
                                      </div>
                                    </td>
                                    <td>
                                      <div>{item.finalidade ?? "-"}</div>
                                      {item.detalhamento_objeto && (
                                        <div className="muted" style={{ marginTop: 4 }}>{item.detalhamento_objeto}</div>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="action-row">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void onApplyTransferenciasEspeciaisFilters(transferenciasEspeciaisPage - 1)}
                          disabled={isBusy || !transferenciasEspeciaisData.paginacao.tem_anterior}
                        >
                          Pagina anterior
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void onApplyTransferenciasEspeciaisFilters(transferenciasEspeciaisPage + 1)}
                          disabled={isBusy || !transferenciasEspeciaisData.paginacao.tem_proxima}
                        >
                          Proxima pagina
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : relatorioTab === "transferencias_discricionarias" ? (
                <>
                  <div className="card filters-card">
                    <h3>Transferencias discricionarias e legais (Transferegov)</h3>
                    <div className="tab-row" style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        className={transferenciasDiscricionariasTab === "convenios" ? "tab active" : "tab"}
                        onClick={() => setTransferenciasDiscricionariasTab("convenios")}
                      >
                        Convenios
                      </button>
                      <button
                        type="button"
                        className={transferenciasDiscricionariasTab === "proponente" ? "tab active" : "tab"}
                        onClick={() => setTransferenciasDiscricionariasTab("proponente")}
                      >
                        Desembolsos por proponente
                      </button>
                    </div>

                    {transferenciasDiscricionariasTab === "convenios" && (
                      <>
                    <div className="filters-grid columns-4">
                      <label>
                        Proponente cadastrado
                        <select
                          value={transferenciasDiscricionariasProponenteSelecionadoId}
                          onChange={(e) => {
                            const selectedId = Number(e.target.value);
                            const selected = proponentes.find((item) => item.id === selectedId);
                            const cnpjSemFormatacao = selected ? selected.cnpj.replace(/\D/g, "") : "";
                            setTransferenciasDiscricionariasFilters((prev) => ({
                              ...prev,
                              cnpj: cnpjSemFormatacao,
                              nome_proponente: selected?.nome ?? "",
                              uf: selected?.uf ?? "",
                              municipio: selected?.cidade ?? ""
                            }));
                          }}
                        >
                          <option value="">Todos</option>
                          {proponentes.map((item) => (
                            <option key={item.id} value={String(item.id)}>
                              {`${item.nome}${item.cidade || item.uf ? ` - ${item.cidade || ""}${item.cidade && item.uf ? "/" : ""}${item.uf || ""}` : ""}`}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        CNPJ proponente
                        <input
                          list="td-cnpj-sugestoes"
                          value={transferenciasDiscricionariasFilters.cnpj}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "");
                            const sugestaoSelecionada = transferenciasDiscricionariasCnpjSugestoes.find(
                              (item) => item.cnpj === digits
                            );
                            setTransferenciasDiscricionariasFilters((prev) => ({
                              ...prev,
                              cnpj: formatCnpj(digits),
                              nome_proponente: sugestaoSelecionada?.nome_proponente ?? prev.nome_proponente
                            }));
                          }}
                          placeholder="00.000.000/0000-00"
                        />
                        <datalist id="td-cnpj-sugestoes">
                          {transferenciasDiscricionariasCnpjSugestoes.map((item) => (
                            <option key={`${item.cnpj}-${item.nome_proponente}`} value={formatCnpj(item.cnpj)}>
                              {`${formatCnpj(item.cnpj)} - ${item.nome_proponente}`}
                            </option>
                          ))}
                        </datalist>
                      </label>
                      <label>
                        Nome proponente
                        <input
                          value={transferenciasDiscricionariasFilters.nome_proponente}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({ ...prev, nome_proponente: e.target.value }))
                          }
                          placeholder="Ex.: PREFEITURA..."
                        />
                      </label>
                      <label>
                        Concedente
                        <select
                          value={transferenciasDiscricionariasFilters.concedente}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({ ...prev, concedente: e.target.value }))
                          }
                        >
                          <option value="">Todos</option>
                          {(transferenciasDiscricionariasFiltros?.concedentes ?? []).map((concedente) => (
                            <option key={concedente} value={concedente}>
                              {concedente}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        UF
                        <select
                          value={transferenciasDiscricionariasFilters.uf}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({ ...prev, uf: e.target.value }))
                          }
                        >
                          <option value="">Todas</option>
                          {(transferenciasDiscricionariasFiltros?.ufs ?? []).map((uf) => (
                            <option key={uf} value={uf}>
                              {uf}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Municipio
                        <input
                          value={transferenciasDiscricionariasFilters.municipio}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({ ...prev, municipio: e.target.value }))
                          }
                          placeholder="Ex.: SALVADOR"
                        />
                      </label>
                      <label>
                        Ano
                        <input
                          type="number"
                          min={2000}
                          max={2100}
                          value={transferenciasDiscricionariasFilters.ano}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({ ...prev, ano: e.target.value }))
                          }
                          placeholder="Ex.: 2025"
                        />
                      </label>
                      <label>
                        Vigencias a vencer em ate
                        <select
                          value={transferenciasDiscricionariasFilters.vigencia_a_vencer_dias}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({
                              ...prev,
                              vigencia_a_vencer_dias: e.target.value as "" | "30" | "60" | "90"
                            }))
                          }
                        >
                          <option value="">Sem filtro</option>
                          <option value="30">30 dias</option>
                          <option value="60">60 dias</option>
                          <option value="90">90 dias</option>
                        </select>
                      </label>
                      <label>
                        Situacao proposta
                        <select
                          value={transferenciasDiscricionariasFilters.situacao_proposta}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({ ...prev, situacao_proposta: e.target.value }))
                          }
                        >
                          <option value="">Todas</option>
                          {(transferenciasDiscricionariasFiltros?.situacoes_proposta ?? []).map((situacao) => (
                            <option key={situacao} value={situacao}>
                              {situacao}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Situacao convenio
                        <select
                          value={transferenciasDiscricionariasFilters.situacao_convenio}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({ ...prev, situacao_convenio: e.target.value }))
                          }
                        >
                          <option value="">Todas</option>
                          {(transferenciasDiscricionariasFiltros?.situacoes_convenio ?? []).map((situacao) => (
                            <option key={situacao} value={situacao}>
                              {situacao}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Tipo ente
                        <select
                          value={transferenciasDiscricionariasFilters.tipo_ente}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({
                              ...prev,
                              tipo_ente: e.target.value as "" | "estado" | "municipio"
                            }))
                          }
                        >
                          <option value="">Todos</option>
                          <option value="estado">Estado</option>
                          <option value="municipio">Municipio</option>
                        </select>
                      </label>
                      <label>
                        Nr convenio
                        <input
                          value={transferenciasDiscricionariasFilters.nr_convenio}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({ ...prev, nr_convenio: e.target.value }))
                          }
                          placeholder="Ex.: 943522"
                        />
                      </label>
                      <label>
                        Nr proposta
                        <input
                          value={transferenciasDiscricionariasFilters.nr_proposta}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({ ...prev, nr_proposta: e.target.value }))
                          }
                          placeholder="Ex.: 12345/2025"
                        />
                      </label>
                      <label>
                        Tamanho da pagina
                        <select
                          value={transferenciasDiscricionariasFilters.page_size}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({ ...prev, page_size: e.target.value }))
                          }
                        >
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                      </label>
                    </div>

                    <div className="action-row">
                      <button
                        type="button"
                        onClick={() => void onApplyTransferenciasDiscricionariasFilters(1)}
                        disabled={isBusy || isSyncingTransferenciasDiscricionarias}
                      >
                        Consultar
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={onClearTransferenciasDiscricionariasFilters}
                        disabled={isSyncingTransferenciasDiscricionarias}
                      >
                        Limpar filtros
                      </button>                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void onRefreshTransferenciasDiscricionariasSyncStatus()}
                        disabled={isSyncingTransferenciasDiscricionarias}
                      >
                        {isSyncingTransferenciasDiscricionarias ? "Atualizando status..." : "Atualizar status"}
                      </button>
                      {canManageInstruments && (
                        <>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => void onCancelTransferenciasDiscricionariasSync()}
                            disabled={
                              isSyncingTransferenciasDiscricionarias ||
                              transferenciasDiscricionariasSyncInfo?.status !== "running"
                            }
                          >
                            Interromper sincronizacao
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => void onNotifyTransferenciasDiscricionariasVigencia()}
                            disabled={
                              isSyncingTransferenciasDiscricionarias || isNotifyingTransferenciasDiscricionarias
                            }
                          >
                            {isNotifyingTransferenciasDiscricionarias
                              ? "Disparando alertas..."
                              : "Disparar alerta vigencia (90/60/30)"}
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => void onNotifyTransferenciasDiscricionariasChanges()}
                            disabled={
                              isSyncingTransferenciasDiscricionarias || isNotifyingTransferenciasDiscricionariasChanges
                            }
                          >
                            {isNotifyingTransferenciasDiscricionariasChanges
                              ? "Disparando alteracoes..."
                              : "Disparar alteracoes financeiras"}
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void onExportTransferenciasDiscricionariasPdf("analitico")}
                        disabled={!transferenciasDiscricionariasData || isBusy || isSyncingTransferenciasDiscricionarias}
                      >
                        Exportar PDF Analitico
                      </button>
                    </div>

                    <p className="muted" style={{ marginTop: 6 }}>
                      Campos detalhados (inicio/fim de vigencia e prestacao de contas) estao disponiveis no PDF Analitico.
                      Se o campo de convenio ficar vazio, o PDF inclui automaticamente os convenios da consulta atual (limite de 30).
                      No historico de desembolsos, sao listados somente convenios com mais de uma parcela.
                    </p>

                    <div className="filters-grid columns-4">
                      <label>
                        Convenios para historico de desembolsos (opcional)
                        <input
                          value={transferenciasDiscricionariasDesembolsoFilters.nr_convenio}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasDesembolsoFilters((prev) => ({
                              ...prev,
                              nr_convenio: e.target.value
                            }))
                          }
                          placeholder="Ex.: 943522, 812112"
                        />
                      </label>
                      <label>
                        Ano desembolso
                        <input
                          type="number"
                          min={2000}
                          max={2100}
                          value={transferenciasDiscricionariasDesembolsoFilters.ano}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasDesembolsoFilters((prev) => ({
                              ...prev,
                              ano: e.target.value
                            }))
                          }
                          placeholder="Todos"
                        />
                      </label>
                      <label>
                        Mes desembolso
                        <select
                          value={transferenciasDiscricionariasDesembolsoFilters.mes}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasDesembolsoFilters((prev) => ({
                              ...prev,
                              mes: e.target.value
                            }))
                          }
                        >
                          <option value="">Todos</option>
                          {Array.from({ length: 12 }, (_, index) => {
                            const month = index + 1;
                            return (
                              <option key={month} value={String(month)}>
                                {month.toString().padStart(2, "0")}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                      <label>
                        Tamanho pagina desembolsos
                        <select
                          value={transferenciasDiscricionariasDesembolsoFilters.page_size}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasDesembolsoFilters((prev) => ({
                              ...prev,
                              page_size: e.target.value
                            }))
                          }
                        >
                          <option value="20">20</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                          <option value="200">200</option>
                        </select>
                      </label>
                    </div>

                    <div className="action-row">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void onApplyTransferenciasDiscricionariasDesembolsoFilters(1)}
                        disabled={isLoadingTransferenciasDiscricionariasDesembolsos}
                      >
                        {isLoadingTransferenciasDiscricionariasDesembolsos ? "Consultando desembolsos..." : "Consultar desembolsos"}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={onClearTransferenciasDiscricionariasDesembolsos}
                        disabled={isLoadingTransferenciasDiscricionariasDesembolsos}
                      >
                        Limpar desembolsos
                      </button>
                    </div>
                      </>
                    )}

                    {transferenciasDiscricionariasTab === "proponente" && (
                      <>
                        <div className="filters-grid columns-4">
                          <label>
                            Proponente cadastrado
                            <select
                              value={transferenciasDiscricionariasDesembolsoProponenteSelecionadoId}
                              onChange={(e) => {
                                const selectedId = Number(e.target.value);
                                const selected = proponentes.find((item) => item.id === selectedId);
                                setTransferenciasDiscricionariasProponenteDesembolsoFilters((prev) => ({
                                  ...prev,
                                  cnpj: selected ? formatCnpj(selected.cnpj) : "",
                                  nome_proponente: selected?.nome ?? ""
                                }));
                              }}
                            >
                              <option value="">Todos</option>
                              {proponentes.map((item) => (
                                <option key={item.id} value={String(item.id)}>
                                  {`${item.nome}${item.cidade || item.uf ? ` - ${item.cidade || ""}${item.cidade && item.uf ? "/" : ""}${item.uf || ""}` : ""}`}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            CNPJ proponente
                            <input
                              value={transferenciasDiscricionariasProponenteDesembolsoFilters.cnpj}
                              onChange={(e) =>
                                setTransferenciasDiscricionariasProponenteDesembolsoFilters((prev) => ({
                                  ...prev,
                                  cnpj: formatCnpj(e.target.value.replace(/\D/g, ""))
                                }))
                              }
                              placeholder="00.000.000/0000-00"
                            />
                          </label>
                          <label>
                            Nome proponente
                            <input
                              value={transferenciasDiscricionariasProponenteDesembolsoFilters.nome_proponente}
                              onChange={(e) =>
                                setTransferenciasDiscricionariasProponenteDesembolsoFilters((prev) => ({
                                  ...prev,
                                  nome_proponente: e.target.value
                                }))
                              }
                              placeholder="Ex.: PREFEITURA..."
                            />
                          </label>
                          <label>
                            Ano desembolso
                            <input
                              type="number"
                              min={2000}
                              max={2100}
                              value={transferenciasDiscricionariasProponenteDesembolsoFilters.ano}
                              onChange={(e) =>
                                setTransferenciasDiscricionariasProponenteDesembolsoFilters((prev) => ({
                                  ...prev,
                                  ano: e.target.value
                                }))
                              }
                              placeholder="Todos"
                            />
                          </label>
                          <label>
                            Mes desembolso
                            <select
                              value={transferenciasDiscricionariasProponenteDesembolsoFilters.mes}
                              onChange={(e) =>
                                setTransferenciasDiscricionariasProponenteDesembolsoFilters((prev) => ({
                                  ...prev,
                                  mes: e.target.value
                                }))
                              }
                            >
                              <option value="">Todos</option>
                              {Array.from({ length: 12 }, (_, index) => {
                                const month = index + 1;
                                return (
                                  <option key={month} value={String(month)}>
                                    {month.toString().padStart(2, "0")}
                                  </option>
                                );
                              })}
                            </select>
                          </label>
                          <label>
                            Tamanho da pagina
                            <select
                              value={transferenciasDiscricionariasProponenteDesembolsoFilters.page_size}
                              onChange={(e) =>
                                setTransferenciasDiscricionariasProponenteDesembolsoFilters((prev) => ({
                                  ...prev,
                                  page_size: e.target.value
                                }))
                              }
                            >
                              <option value="50">50</option>
                              <option value="100">100</option>
                              <option value="200">200</option>
                              <option value="500">500</option>
                            </select>
                          </label>
                        </div>

                        <div className="action-row">
                          <button
                            type="button"
                            onClick={() => void onApplyTransferenciasDiscricionariasProponenteDesembolsoFilters(1)}
                            disabled={isLoadingTransferenciasDiscricionariasProponenteDesembolsos}
                          >
                            {isLoadingTransferenciasDiscricionariasProponenteDesembolsos
                              ? "Consultando..."
                              : "Consultar por proponente"}
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={onClearTransferenciasDiscricionariasProponenteDesembolsos}
                            disabled={isLoadingTransferenciasDiscricionariasProponenteDesembolsos}
                          >
                            Limpar filtros
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => void onExportTransferenciasDiscricionariasProponenteDesembolsosPdf("executivo")}
                            disabled={isLoadingTransferenciasDiscricionariasProponenteDesembolsos}
                          >
                            Exportar PDF Executivo
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => void onExportTransferenciasDiscricionariasProponenteDesembolsosPdf("analitico")}
                            disabled={isLoadingTransferenciasDiscricionariasProponenteDesembolsos}
                          >
                            Exportar PDF Analitico
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {transferenciasDiscricionariasTab === "convenios" && (!transferenciasDiscricionariasData ? (
                    <>
                      <div className="card table-card">
                        <p>Preencha os filtros e consulte para visualizar transferencias discricionarias e legais.</p>
                      </div>
                      {transferenciasDiscricionariasSyncInfo && (
                        <div className="card table-card">
                          <p>
                            Ultima carga: {transferenciasDiscricionariasSyncInfo.data_carga_fonte ?? "Nao informada"} | Status: {" "}
                            {transferenciasDiscricionariasSyncInfo.status} | Registros: {" "}
                            {transferenciasDiscricionariasSyncInfo.total_registros.toLocaleString("pt-BR")}
                          </p>
                          {shouldShowTransferenciasDiscricionariasSyncProgress && (
                            <div className="td-sync-progress-card">
                              <p className="muted td-sync-progress-status">
                                {proponentesSyncPhaseLabel} - {Math.round(proponentesSyncProgressValue)}%
                                {transferenciasDiscricionariasSyncHeartbeatLabel
                                  ? ` (${transferenciasDiscricionariasSyncHeartbeatLabel})`
                                  : ""}
                              </p>
                              <div className="repasse-progress" role="presentation" style={{ marginTop: 8 }}>
                                <span style={{ width: `${proponentesSyncProgressValue}%` }} />
                              </div>
                              <div className="td-sync-step-trail" aria-label="Etapas da sincronizacao">
                                {transferenciasDiscricionariasSyncSteps.map((step) => (
                                  <span key={step.key} className={`td-sync-step-chip td-sync-step-chip-${step.state}`}>
                                    {step.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="report-kpi-grid">
                        <div className="card kpi-card">
                          <p className="eyebrow">Total de registros</p>
                          <h3>{transferenciasDiscricionariasData.paginacao.total}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Pagina atual</p>
                          <h3>
                            {transferenciasDiscricionariasData.paginacao.pagina}/
                            {transferenciasDiscricionariasData.paginacao.total_paginas}
                          </h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Data da carga oficial</p>
                          <h3>{transferenciasDiscricionariasSyncInfo?.data_carga_fonte ?? "Nao informada"}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Status da sincronizacao</p>
                          <h3>{transferenciasDiscricionariasSyncInfo?.status ?? "desconhecido"}</h3>
                        </div>
                      </div>

                      {transferenciasDiscricionariasSyncInfo?.detalhe && (
                        <div className="card table-card">
                          <p>{transferenciasDiscricionariasSyncInfo.detalhe}</p>
                        </div>
                      )}

                      {shouldShowTransferenciasDiscricionariasSyncProgress && (
                        <div className="card table-card">
                          <p style={{ marginBottom: 8 }}>
                            {proponentesSyncPhaseLabel}
                            {transferenciasDiscricionariasSyncHeartbeatLabel ? ` - ${transferenciasDiscricionariasSyncHeartbeatLabel}` : ""}
                          </p>
                          <div className="repasse-progress" role="presentation">
                            <span style={{ width: `${proponentesSyncProgressValue}%` }} />
                          </div>
                          <p className="muted" style={{ marginTop: 6 }}>{Math.round(proponentesSyncProgressValue)}%</p>
                          <div className="td-sync-step-trail" aria-label="Etapas da sincronizacao">
                            {transferenciasDiscricionariasSyncSteps.map((step) => (
                              <span key={step.key} className={`td-sync-step-chip td-sync-step-chip-${step.state}`}>
                                {step.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="card table-card">
                        <h3>Propostas e convenios (discricionarias/legais)</h3>
                        <div className="table-wrap tdl-main-table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Nr proposta</th>
                                <th>Nr convenio</th>
                                <th>UF</th>
                                <th>Proponente</th>
                                <th>Concedente</th>
                                <th>Objeto</th>
                                <th>Situacao convenio</th>
                                <th>Ano</th>
                                <th>Fim vigencia</th>
                                <th>Dias p/ vencer</th>
                                <th>Banco</th>
                                <th>Agencia</th>
                                <th>Conta</th>
                                <th>Contrapartida financeira</th>
                                <th>Contrapartida depositada</th>
                                <th>Valor global</th>
                                <th>Desembolsado</th>
                                <th>Acoes</th>
                              </tr>
                            </thead>
                            <tbody>
                                {transferenciasDiscricionariasData.itens.length === 0 ? (
                                  <tr>
                                    <td colSpan={18}>Nenhum registro encontrado para os filtros informados.</td>
                                  </tr>
                                ) : (
                                transferenciasDiscricionariasData.itens.map((item) => (
                                  <tr key={item.id}>
                                    <td>{item.nr_proposta ?? "-"}</td>
                                    <td>{item.nr_convenio ?? "-"}</td>
                                    <td>{item.uf ?? "-"}</td>
                                    <td>{item.nome_proponente ?? "-"}</td>
                                    <td>{item.concedente ?? "-"}</td>
                                    <td>{normalizeReadableText(item.objeto) ?? "-"}</td>
                                    <td>{item.situacao_convenio ?? "-"}</td>
                                    <td>{item.ano_referencia ?? "-"}</td>
                                    <td>{item.dia_fim_vigencia ?? "-"}</td>
                                    <td>{item.dias_para_vencimento == null ? "-" : `${item.dias_para_vencimento} dias`}</td>
                                    <td>{item.banco ?? "-"}</td>
                                    <td>{item.agencia ?? "-"}</td>
                                    <td>{item.conta ?? "-"}</td>
                                    <td>
                                      {item.valor_contrapartida_financeira === null
                                        ? "-"
                                        : formatCurrency(item.valor_contrapartida_financeira)}
                                    </td>
                                    <td>
                                      {item.valor_contrapartida_depositada === null
                                        ? "-"
                                        : formatCurrency(item.valor_contrapartida_depositada)}
                                    </td>
                                    <td>{item.valor_global_conv === null ? "-" : formatCurrency(item.valor_global_conv)}</td>
                                    <td>
                                      {item.valor_desembolsado_conv === null
                                        ? "-"
                                        : formatCurrency(item.valor_desembolsado_conv)}
                                    </td>
                                    <td>
                                      <button
                                        type="button"
                                        className="secondary"
                                        onClick={() => item.nr_convenio && void onOpenTransferenciasDiscricionariasDesembolsos(item.nr_convenio)}
                                        disabled={!item.nr_convenio || isLoadingTransferenciasDiscricionariasDesembolsos}
                                      >
                                        Ver desembolsos
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {transferenciasDiscricionariasDesembolsoData && (
                        <>
                          <div className="report-kpi-grid">
                            <div className="card kpi-card">
                              <p className="eyebrow">Convenio selecionado</p>
                              <h3>{transferenciasDiscricionariasDesembolsoData.resumo.nr_convenio}</h3>
                            </div>
                            <div className="card kpi-card">
                              <p className="eyebrow">Total de desembolsos</p>
                              <h3>{transferenciasDiscricionariasDesembolsoData.resumo.total_desembolsos}</h3>
                            </div>
                            <div className="card kpi-card">
                              <p className="eyebrow">Valor total desembolsado</p>
                              <h3>{formatCurrency(transferenciasDiscricionariasDesembolsoData.resumo.valor_total_desembolsado)}</h3>
                            </div>
                            <div className="card kpi-card">
                              <p className="eyebrow">Pagina atual</p>
                              <h3>
                                {transferenciasDiscricionariasDesembolsoData.paginacao.pagina}/
                                {transferenciasDiscricionariasDesembolsoData.paginacao.total_paginas}
                              </h3>
                            </div>
                          </div>

                          <div className="card table-card">
                            <h3>Historico de desembolsos do convenio</h3>
                            <div className="table-wrap tdl-desembolso-table-wrap">
                              <table>
                                <thead>
                                  <tr>
                                    <th>ID desembolso</th>
                                    <th>Convenio</th>
                                    <th>SIAFI</th>
                                    <th>Data desembolso</th>
                                    <th>Ult. desembolso</th>
                                    <th>Ano</th>
                                    <th>Mes</th>
                                    <th>Dias sem desembolso</th>
                                    <th>UG emitente</th>
                                    <th>Valor desembolsado</th>
                                    <th>Observacao</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {transferenciasDiscricionariasDesembolsoData.itens.length === 0 ? (
                                    <tr>
                                      <td colSpan={11}>Nenhum desembolso encontrado para os filtros informados.</td>
                                    </tr>
                                  ) : (
                                    transferenciasDiscricionariasDesembolsoData.itens.map((item) => (
                                      <tr key={item.id}>
                                        <td>{item.id_desembolso ?? "-"}</td>
                                        <td>{transferenciasDiscricionariasDesembolsoData.resumo.nr_convenio ?? "-"}</td>
                                        <td>{item.nr_siafi ?? "-"}</td>
                                        <td>{item.data_desembolso ? formatDateOnlyPtBr(item.data_desembolso) : "-"}</td>
                                        <td>{item.dt_ult_desembolso ? formatDateOnlyPtBr(item.dt_ult_desembolso) : "-"}</td>
                                        <td>{item.ano_desembolso ?? "-"}</td>
                                        <td>{item.mes_desembolso ?? "-"}</td>
                                        <td>{item.qtd_dias_sem_desembolso ?? "-"}</td>
                                        <td>{item.ug_emitente_dh ?? "-"}</td>
                                        <td>{item.vl_desembolsado === null ? "-" : formatCurrency(item.vl_desembolsado)}</td>
                                        <td>{item.observacao_dh ?? "-"}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="action-row">
                            <button
                              type="button"
                              className="secondary"
                              onClick={() =>
                                void onApplyTransferenciasDiscricionariasDesembolsoFilters(
                                  transferenciasDiscricionariasDesembolsoPage - 1
                                )
                              }
                              disabled={
                                isLoadingTransferenciasDiscricionariasDesembolsos ||
                                !transferenciasDiscricionariasDesembolsoData.paginacao.tem_anterior
                              }
                            >
                              Pagina anterior (desembolsos)
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() =>
                                void onApplyTransferenciasDiscricionariasDesembolsoFilters(
                                  transferenciasDiscricionariasDesembolsoPage + 1
                                )
                              }
                              disabled={
                                isLoadingTransferenciasDiscricionariasDesembolsos ||
                                !transferenciasDiscricionariasDesembolsoData.paginacao.tem_proxima
                              }
                            >
                              Proxima pagina (desembolsos)
                            </button>
                          </div>
                        </>
                      )}

                      <div className="action-row">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void onApplyTransferenciasDiscricionariasFilters(transferenciasDiscricionariasPage - 1)}
                          disabled={isBusy || !transferenciasDiscricionariasData.paginacao.tem_anterior}
                        >
                          Pagina anterior
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void onApplyTransferenciasDiscricionariasFilters(transferenciasDiscricionariasPage + 1)}
                          disabled={isBusy || !transferenciasDiscricionariasData.paginacao.tem_proxima}
                        >
                          Proxima pagina
                        </button>
                      </div>
                    </>
                  ))}

                  {transferenciasDiscricionariasTab === "proponente" && (
                    !transferenciasDiscricionariasProponenteDesembolsoData ? (
                      <div className="card table-card">
                        <p>Informe CNPJ ou nome do proponente para consultar desembolsos e exportar PDF.</p>
                      </div>
                    ) : (
                      <>
                        <div className="report-kpi-grid">
                          <div className="card kpi-card">
                            <p className="eyebrow">Proponente</p>
                            <h3>{transferenciasDiscricionariasProponenteDesembolsoData.resumo.nome_proponente ?? "Nao informado"}</h3>
                          </div>
                          <div className="card kpi-card">
                            <p className="eyebrow">CNPJ</p>
                            <h3>
                              {transferenciasDiscricionariasProponenteDesembolsoData.resumo.cnpj
                                ? formatCnpj(transferenciasDiscricionariasProponenteDesembolsoData.resumo.cnpj)
                                : "Nao informado"}
                            </h3>
                          </div>
                          <div className="card kpi-card">
                            <p className="eyebrow">Total de desembolsos</p>
                            <h3>{transferenciasDiscricionariasProponenteDesembolsoData.resumo.total_desembolsos}</h3>
                          </div>
                          <div className="card kpi-card">
                            <p className="eyebrow">Valor total desembolsado</p>
                            <h3>
                              {formatCurrency(
                                transferenciasDiscricionariasProponenteDesembolsoData.resumo.valor_total_desembolsado
                              )}
                            </h3>
                          </div>
                        </div>

                        <div className="card table-card">
                          <h3>Desembolsos por proponente</h3>
                          <div className="table-wrap tdl-main-table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Parcela</th>
                                  <th>ID desembolso</th>
                                  <th>Convenio</th>
                                  <th>Objeto</th>
                                  <th>Contrapartida</th>
                                  <th>UF</th>
                                  <th>Municipio</th>
                                  <th>Data</th>
                                  <th>Ano</th>
                                  <th>Mes</th>
                                  <th>SIAFI</th>
                                  <th>UG emitente</th>
                                  <th>Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {transferenciasDiscricionariasProponenteDesembolsoData.itens.length === 0 ? (
                                  <tr>
                                    <td colSpan={13}>Nenhum desembolso encontrado para o proponente informado.</td>
                                  </tr>
                                ) : (
                                  transferenciasDiscricionariasProponenteDesembolsoData.itens.map((item) => (
                                    <tr key={item.id}>
                                      <td>{transferenciasDiscricionariasProponenteParcelaMap.get(item.id) ?? "-"}a parcela</td>
                                      <td>{item.id_desembolso ?? "-"}</td>
                                      <td>{item.nr_convenio ?? "-"}</td>
                                      <td>{normalizeReadableText(item.objeto) ?? "-"}</td>
                                      <td>
                                        {item.valor_contrapartida_financeira === null
                                          ? "-"
                                          : formatCurrency(item.valor_contrapartida_financeira)}
                                      </td>
                                      <td>{item.uf ?? "-"}</td>
                                      <td>{item.municipio ?? "-"}</td>
                                      <td>{item.data_desembolso ? formatDateOnlyPtBr(item.data_desembolso) : "-"}</td>
                                      <td>{item.ano_desembolso ?? "-"}</td>
                                      <td>{item.mes_desembolso ?? "-"}</td>
                                      <td>{item.nr_siafi ?? "-"}</td>
                                      <td>{item.ug_emitente_dh ?? "-"}</td>
                                      <td>{item.vl_desembolsado === null ? "-" : formatCurrency(item.vl_desembolsado)}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="action-row">
                          <button
                            type="button"
                            className="secondary"
                            onClick={() =>
                              void onApplyTransferenciasDiscricionariasProponenteDesembolsoFilters(
                                transferenciasDiscricionariasProponenteDesembolsoPage - 1
                              )
                            }
                            disabled={
                              isLoadingTransferenciasDiscricionariasProponenteDesembolsos ||
                              !transferenciasDiscricionariasProponenteDesembolsoData.paginacao.tem_anterior
                            }
                          >
                            Pagina anterior
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() =>
                              void onApplyTransferenciasDiscricionariasProponenteDesembolsoFilters(
                                transferenciasDiscricionariasProponenteDesembolsoPage + 1
                              )
                            }
                            disabled={
                              isLoadingTransferenciasDiscricionariasProponenteDesembolsos ||
                              !transferenciasDiscricionariasProponenteDesembolsoData.paginacao.tem_proxima
                            }
                          >
                            Proxima pagina
                          </button>
                        </div>
                      </>
                    )
                  )}
                </>
              ) : (
                <>
                  <div className="card filters-card">
                    <h3>Relatorio de tickets</h3>
                    <p className="subtitle">Filtre a operacao de tickets por status, prioridade, origem e responsavel, com exportacoes padronizadas para analise.</p>
                    <div className="filters-grid columns-4">
                      <label>
                        Data de
                        <input
                          type="date"
                          value={ticketReportFilters.data_de}
                          onChange={(e) =>
                            setTicketReportFilters((prev) => ({ ...prev, data_de: e.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Data ate
                        <input
                          type="date"
                          value={ticketReportFilters.data_ate}
                          onChange={(e) =>
                            setTicketReportFilters((prev) => ({ ...prev, data_ate: e.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Status
                        <select
                          value={ticketReportFilters.status}
                          onChange={(e) =>
                            setTicketReportFilters((prev) => ({ ...prev, status: e.target.value as TicketStatus | "" }))
                          }
                        >
                          <option value="">Todos</option>
                          {TICKET_STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {TICKET_STATUS_LABELS[option]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Prioridade
                        <select
                          value={ticketReportFilters.prioridade}
                          onChange={(e) =>
                            setTicketReportFilters((prev) => ({ ...prev, prioridade: e.target.value as TicketPriority | "" }))
                          }
                        >
                          <option value="">Todas</option>
                          {TICKET_PRIORITY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {TICKET_PRIORITY_LABELS[option]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Origem
                        <select
                          value={ticketReportFilters.origem}
                          onChange={(e) =>
                            setTicketReportFilters((prev) => ({ ...prev, origem: e.target.value as TicketSource | "" }))
                          }
                        >
                          <option value="">Todas</option>
                          {TICKET_SOURCE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {TICKET_SOURCE_LABELS[option]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Responsavel
                        <select
                          value={ticketReportFilters.responsavel_user_id}
                          onChange={(e) =>
                            setTicketReportFilters((prev) => ({ ...prev, responsavel_user_id: e.target.value }))
                          }
                          disabled={ticketAssignableUsers.length === 0}
                        >
                          <option value="">Todos</option>
                          {ticketAssignableUsers.map((userItem) => (
                            <option key={userItem.id} value={String(userItem.id)}>
                              {userItem.nome} ({userItem.role})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Busca livre
                        <input
                          value={ticketReportFilters.q}
                          onChange={(e) =>
                            setTicketReportFilters((prev) => ({ ...prev, q: e.target.value }))
                          }
                          placeholder="Codigo, titulo, descricao"
                        />
                      </label>
                      <label className="ticket-overdue-toggle">
                        <span>Somente atrasados</span>
                        <input
                          type="checkbox"
                          checked={ticketReportFilters.somente_atrasados}
                          onChange={(e) =>
                            setTicketReportFilters((prev) => ({ ...prev, somente_atrasados: e.target.checked }))
                          }
                        />
                      </label>
                    </div>

                    <div className="report-toolbar">
                      <div className="action-row compact">
                        <button type="button" onClick={onApplyTicketReportFilters} disabled={isBusy}>
                          Gerar relatorio
                        </button>
                        <button type="button" className="secondary" onClick={onClearTicketReportFilters}>
                          Limpar filtros
                        </button>
                      </div>
                      <div className="action-row compact report-export-actions">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => ticketReportData && exportTicketReportCsv(ticketReportData)}
                          disabled={!ticketReportData}
                        >
                          Exportar CSV
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => ticketReportData && exportTicketReportExcel(ticketReportData)}
                          disabled={!ticketReportData}
                        >
                          Exportar Excel
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => onExportTicketReportPdf("executivo")}
                          disabled={!ticketReportData}
                        >
                          Exportar PDF Executivo
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => onExportTicketReportPdf("analitico")}
                          disabled={!ticketReportData}
                        >
                          Exportar PDF Analitico
                        </button>
                      </div>
                    </div>
                  </div>

                  {!ticketReportData ? (
                    <div className="card table-card">
                      <p className="subtitle">Defina os filtros acima e clique em gerar relatorio para visualizar os tickets consolidados.</p>
                    </div>
                  ) : (
                    <>
                      <div className="report-kpi-grid">
                        <div className="card kpi-card">
                          <p className="eyebrow">Total</p>
                          <h3>{ticketReportSummary.total}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Em aberto</p>
                          <h3>{ticketReportSummary.abertos}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Resolvidos</p>
                          <h3>{ticketReportSummary.resolvidos}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Atrasados</p>
                          <h3>{ticketReportSummary.atrasados}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Sem atribuicao</p>
                          <h3>{ticketReportSummary.semAtribuicao}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Tempo medio resolucao</p>
                          <h3>{ticketReportSummary.tempoMedioResolucaoDias.toFixed(1)} dia(s)</h3>
                        </div>
                      </div>

                      <div className="report-charts-grid">
                        <div className="card">
                          <h3>Tickets por status</h3>
                          <div className="report-bars">
                            {ticketReportSummary.porStatus.map((item) => {
                              const max = Math.max(...ticketReportSummary.porStatus.map((point) => point.quantidade), 1);
                              const width = (item.quantidade / max) * 100;
                              return (
                                <div key={item.status} className="report-bar-row">
                                  <span>{TICKET_STATUS_LABELS[item.status]}</span>
                                  <div className="report-bar-track">
                                    <div className="report-bar-fill" style={{ width: `${width}%` }} />
                                  </div>
                                  <strong>{item.quantidade}</strong>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="card">
                          <h3>Top responsaveis</h3>
                          <div className="report-bars">
                            {ticketReportSummary.topResponsaveis.length === 0 ? (
                              <p className="subtitle">Sem dados para o filtro atual.</p>
                            ) : (
                              ticketReportSummary.topResponsaveis.map((item) => {
                                const max = Math.max(...ticketReportSummary.topResponsaveis.map((point) => point.quantidade), 1);
                                const width = (item.quantidade / max) * 100;
                                return (
                                  <div key={item.nome} className="report-bar-row">
                                    <span>{item.nome}</span>
                                    <div className="report-bar-track">
                                      <div className="report-bar-fill secondary" style={{ width: `${width}%` }} />
                                    </div>
                                    <strong>{item.quantidade}</strong>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="card table-card">
                        <h3>Tickets no filtro</h3>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Codigo</th>
                                <th>Titulo</th>
                                <th>Status</th>
                                <th>Prioridade</th>
                                <th>Atribuido</th>
                                <th>Origem</th>
                                <th>Prazo alvo</th>
                                <th>SLA</th>
                                <th>Criado em</th>
                                <th>Resolvido em</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ticketReportData.length === 0 ? (
                                <tr>
                                  <td colSpan={10}>Nenhum ticket encontrado para os filtros selecionados.</td>
                                </tr>
                              ) : (
                                ticketReportData.map((item) => (
                                  <tr key={item.id}>
                                    <td>{item.codigo}</td>
                                    <td>{item.titulo}</td>
                                    <td>{TICKET_STATUS_LABELS[item.status]}</td>
                                    <td>{TICKET_PRIORITY_LABELS[item.prioridade]}</td>
                                    <td>{item.responsavel?.nome ?? "Nao atribuido"}</td>
                                    <td>{TICKET_SOURCE_LABELS[item.origem]}</td>
                                    <td>{item.prazo_alvo ? formatDateOnlyPtBr(item.prazo_alvo) : "Nao definido"}</td>
                                    <td>{formatTicketSla(item)}</td>
                                    <td>{new Date(item.created_at).toLocaleString("pt-BR")}</td>
                                    <td>{item.resolvido_em ? new Date(item.resolvido_em).toLocaleString("pt-BR") : "-"}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </section>
          )}

          {showGerarDocumentoModal && profileInstrument && (
            <div className="stage-followup-modal-overlay" onClick={() => setShowGerarDocumentoModal(false)}>
              <div className="stage-followup-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="stage-followup-modal-header">
                  <h3>Gerar Documento - {profileInstrument.instrumento}</h3>
                  <button type="button" className="close-btn" onClick={() => setShowGerarDocumentoModal(false)}>
                    ×
                  </button>
                </div>
                <div className="stage-followup-modal-body">
                  <div className="form-grid">
                    <label>
                      Template *
                      <select
                        value={gerarDocumentoSelectedTemplate ?? ""}
                        onChange={(e) => setGerarDocumentoSelectedTemplate(e.target.value ? Number(e.target.value) : null)}
                        required
                      >
                        <option value="">Selecione um template</option>
                        {geracaoDocumentosTemplates
                          .filter((t) => t.status === "ATIVO" || t.status === "RASCUNHO")
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.nome} ({t.codigo}) {t.status === "RASCUNHO" ? "[RASCUNHO]" : ""}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Título do documento
                      <input
                        value={gerarDocumentoTitulo}
                        onChange={(e) => setGerarDocumentoTitulo(e.target.value)}
                        placeholder="Declaração de Adimplência"
                      />
                    </label>
                    <label>
                      Responsável Técnico (opcional)
                      <select
                        value={gerarDocumentoSelectedResponsavel ?? ""}
                        onChange={(e) => setGerarDocumentoSelectedResponsavel(e.target.value ? Number(e.target.value) : null)}
                      >
                        <option value="">Selecione um responsável</option>
                        {geracaoDocumentosResponsaveis.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nome} - {r.crea}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Formato de saída
                      <select
                        value={gerarDocumentoFormato}
                        onChange={(e) => setGerarDocumentoFormato(e.target.value as "docx" | "pdf")}
                      >
                        <option value="docx">DOCX (Word)</option>
                        <option value="pdf">PDF</option>
                      </select>
                    </label>
                  </div>
                  {gerarDocumentoSelectedTemplate && (() => {
                    const template = geracaoDocumentosTemplates.find((t) => t.id === gerarDocumentoSelectedTemplate);
                    const tags = template?.placeholdersJson;
                    return (
                      <div className="info-box" style={{ marginTop: "16px" }}>
                        <p style={{ marginBottom: "8px" }}>
                          <strong>Template:</strong> {template?.nome} ({template?.codigo})
                        </p>
                        <p style={{ marginBottom: "4px" }}>
                          <strong>Tags detectadas no documento:</strong>
                        </p>
                        <p className="subtitle">
                          {tags && Array.isArray(tags) && tags.length > 0
                            ? tags.join(", ")
                            : "Nenhuma tag detectada"}
                        </p>
                        <p style={{ marginTop: "12px", marginBottom: "4px", color: "#666" }}>
                          <strong>Tags disponíveis para uso:</strong>
                        </p>
                        <p className="subtitle" style={{ fontSize: "12px" }}>
                          [NOME_PREFEITURA], [CNPJ_PREFEITURA], [ENDERECO_PREFEITURA], [BAIRRO_PREFEITURA], [CEP_PREFEITURA], [CIDADE_PREFEITURA], [UF_PREFEITURA], [TELEFONE_PREFEITURA], [EMAIL_PREFEITURA], [NOME_GESTOR], [CPF_GESTOR], [RG_GESTOR], [ENDERECO_GESTOR], [EMAIL_GESTOR], [NUMERO_PROPOSTA], [NUMERO_INSTRUMENTO], [OBJETO], [VALOR_REPASSE], [VALOR_CONTRAPARTIDA], [VALOR_TOTAL], [VIGENCIA_INICIO], [VIGENCIA_FIM], [CONCEDENTE], [NOME_ENGENHEIRO], [CPF_ENGENHEIRO], [CREA_ENGENHEIRO], [CARGO_ENGENHEIRO]
                        </p>
                      </div>
                    );
                  })()}
                </div>
                <div className="stage-followup-modal-footer">
                  <button type="button" className="secondary" onClick={() => setShowGerarDocumentoModal(false)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="primary"
                    disabled={!gerarDocumentoSelectedTemplate || isGeneratingDocument}
                    onClick={async () => {
                      if (!token || !gerarDocumentoSelectedTemplate) return;
                      setIsGeneratingDocument(true);
                      try {
                        const result = await generateDocumentoGeracao(token, {
                          instrumento_id: profileInstrument.id,
                          template_id: gerarDocumentoSelectedTemplate,
                          responsavel_tecnico_id: gerarDocumentoSelectedResponsavel || undefined,
                          titulo: gerarDocumentoTitulo || `Documento ${profileInstrument.instrumento}`,
                          formato: gerarDocumentoFormato
                        });
                        setShowGerarDocumentoModal(false);
                        setGerarDocumentoSelectedTemplate(null);
                        setGerarDocumentoSelectedResponsavel(null);
                        setGerarDocumentoTitulo("");
                        const ext = gerarDocumentoFormato === "pdf" ? "pdf" : "docx";
                        setMessage(`Documento gerado com sucesso! O download do ${gerarDocumentoFormato === "pdf" ? "PDF" : "DOCX"} iniciou.`);
                        await downloadDocumentoGeracaoLog(token, result.id, ext, `${result.titulo}.${ext}`);
                      } catch (error) {
                        setMessage(error instanceof Error ? error.message : "Erro ao gerar documento.");
                      } finally {
                        setIsGeneratingDocument(false);
                      }
                    }}
                  >
                    {isGeneratingDocument ? "Gerando..." : "Gerar Documento"}
                  </button>
                </div>
              </div>
            </div>
)}

          {showProponenteEditModal && editingProponente && (
            <div className="modal-overlay" onClick={() => setShowProponenteEditModal(false)}>
              <div className="modal-content" style={{ maxWidth: "1100px" }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Editar Proponente - {editingProponente.nome}</h3>
                  <button type="button" className="close-btn" onClick={() => setShowProponenteEditModal(false)}>×</button>
                </div>
                <div className="modal-body">
                  <div className="tabs" style={{ marginBottom: "16px" }}>
                    <button
                      type="button"
                      className={proponenteEditTab === "proponente" ? "tab active" : "tab"}
                      onClick={() => setProponenteEditTab("proponente")}
                    >
                      Dados do Proponente
                    </button>
                    <button
                      type="button"
                      className={proponenteEditTab === "gestor" ? "tab active" : "tab"}
                      onClick={() => setProponenteEditTab("gestor")}
                    >
                      Dados do Gestor
                    </button>
                  </div>

                  {proponenteEditTab === "proponente" && (
                    <div style={{ marginBottom: "12px" }}>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void onBuscarDadosCnpj()}
                        disabled={isLoadingCnpjConsulta || !proponenteEditForm.cnpj}
                      >
                        {isLoadingCnpjConsulta ? "Buscando..." : "Buscar dados da Receita Federal"}
                      </button>
                    </div>
                  )}

                  {proponenteEditTab === "proponente" && (
                    <div className="form-grid columns-3">
                      <label>
                        Nome
                        <input
                          value={proponenteEditForm.nome}
                          onChange={(e) => setProponenteEditForm((prev) => ({ ...prev, nome: e.target.value }))}
                        />
                      </label>
                      <label>
                        CNPJ
                        <input
                          value={proponenteEditForm.cnpj}
                          onChange={(e) => setProponenteEditForm((prev) => ({ ...prev, cnpj: e.target.value }))}
                        />
                      </label>
                      <label>
                        Endereço
                        <input
                          value={proponenteEditForm.endereco}
                          onChange={(e) => setProponenteEditForm((prev) => ({ ...prev, endereco: e.target.value }))}
                        />
                      </label>
                      <label>
                        Número
                        <input
                          value={proponenteEditForm.numero}
                          onChange={(e) => setProponenteEditForm((prev) => ({ ...prev, numero: e.target.value }))}
                        />
                      </label>
                      <label>
                        Complemento
                        <input
                          value={proponenteEditForm.complemento}
                          onChange={(e) => setProponenteEditForm((prev) => ({ ...prev, complemento: e.target.value }))}
                        />
                      </label>
                      <label>
                        Bairro
                        <input
                          value={proponenteEditForm.bairro}
                          onChange={(e) => setProponenteEditForm((prev) => ({ ...prev, bairro: e.target.value }))}
                        />
                      </label>
                      <label>
                        CEP
                        <input
                          value={proponenteEditForm.cep}
                          onChange={(e) => setProponenteEditForm((prev) => ({ ...prev, cep: e.target.value }))}
                          placeholder="00000-000"
                        />
                      </label>
                      <label>
                        Cidade
                        <input
                          value={proponenteEditForm.cidade}
                          onChange={(e) => setProponenteEditForm((prev) => ({ ...prev, cidade: e.target.value }))}
                        />
                      </label>
                      <label>
                        UF
                        <select
                          value={proponenteEditForm.uf}
                          onChange={(e) => setProponenteEditForm((prev) => ({ ...prev, uf: e.target.value }))}
                        >
                          <option value="">Selecione</option>
                          <option value="AC">AC</option><option value="AL">AL</option><option value="AP">AP</option>
                          <option value="AM">AM</option><option value="BA">BA</option><option value="CE">CE</option>
                          <option value="DF">DF</option><option value="ES">ES</option><option value="GO">GO</option>
                          <option value="MA">MA</option><option value="MT">MT</option><option value="MS">MS</option>
                          <option value="MG">MG</option><option value="PA">PA</option><option value="PB">PB</option>
                          <option value="PR">PR</option><option value="PE">PE</option><option value="PI">PI</option>
                          <option value="RJ">RJ</option><option value="RN">RN</option><option value="RS">RS</option>
                          <option value="RO">RO</option><option value="RR">RR</option><option value="SC">SC</option>
                          <option value="SP">SP</option><option value="SE">SE</option><option value="TO">TO</option>
                        </select>
                      </label>
                      <label>
                        Telefone
                        <input
                          value={proponenteEditForm.tel}
                          onChange={(e) => setProponenteEditForm((prev) => ({ ...prev, tel: e.target.value }))}
                        />
                      </label>
                      <label>
                        Email
                        <input
                          value={proponenteEditForm.email}
                          onChange={(e) => setProponenteEditForm((prev) => ({ ...prev, email: e.target.value }))}
                        />
                      </label>
                    </div>
                  )}

                  {proponenteEditTab === "gestor" && (
                    <div className="form-grid columns-3">
                      <label>
                        Nome do Gestor/Prefeito
                        <input
                          value={proponenteEditForm.gestorNome}
                          onChange={(e) => setProponenteEditForm((prev) => ({ ...prev, gestorNome: e.target.value }))}
                          placeholder="Nome completo do gestor"
                        />
                      </label>
                      <label>
                        CPF do Gestor
                        <input
                          value={proponenteEditForm.gestorCpf}
                          onChange={(e) => setProponenteEditForm((prev) => ({ ...prev, gestorCpf: e.target.value }))}
                          placeholder="000.000.000-00"
                        />
                      </label>
                      <label>
                        RG do Gestor
                        <input
                          value={proponenteEditForm.gestorRg}
                          onChange={(e) => setProponenteEditForm((prev) => ({ ...prev, gestorRg: e.target.value }))}
                          placeholder="00000000"
                        />
                      </label>
                      <label>
                        Endereço do Gestor
                        <input
                          value={proponenteEditForm.gestorEndereco}
                          onChange={(e) => setProponenteEditForm((prev) => ({ ...prev, gestorEndereco: e.target.value }))}
                          placeholder="Endereço completo"
                        />
                      </label>
                      <label>
                        Email do Gestor
                        <input
                          value={proponenteEditForm.gestorEmail}
                          onChange={(e) => setProponenteEditForm((prev) => ({ ...prev, gestorEmail: e.target.value }))}
                          placeholder="email@gestor.com.br"
                        />
                      </label>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="secondary" onClick={() => setShowProponenteEditModal(false)}>Cancelar</button>
                  <button
                    type="button"
                    className="primary"
                    disabled={isBusy}
                    onClick={() => void onSaveProponente()}
                  >
                    Salvar Dados
                  </button>
                </div>
              </div>
            </div>
          )}

          {showGeracaoDocumentoTemplateModal && (
            <div className="modal-overlay" onClick={() => setShowGeracaoDocumentoTemplateModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Novo Template</h3>
                  <button type="button" className="close-btn" onClick={() => setShowGeracaoDocumentoTemplateModal(false)}>×</button>
                </div>
                <div className="modal-body">
                  <div className="form-grid">
                    <label>
                      Código *
                      <input
                        value={geracaoDocumentoTemplateForm.codigo}
                        onChange={(e) => setGeracaoDocumentoTemplateForm((prev) => ({ ...prev, codigo: e.target.value }))}
                        placeholder="DECL_ADIMPLENCIA"
                      />
                    </label>
                    <label>
                      Nome *
                      <input
                        value={geracaoDocumentoTemplateForm.nome}
                        onChange={(e) => setGeracaoDocumentoTemplateForm((prev) => ({ ...prev, nome: e.target.value }))}
                        placeholder="Declaração de Adimplência"
                      />
                    </label>
                    <label>
                      Descrição
                      <input
                        value={geracaoDocumentoTemplateForm.descricao}
                        onChange={(e) => setGeracaoDocumentoTemplateForm((prev) => ({ ...prev, descricao: e.target.value }))}
                        placeholder="Descrição do template"
                      />
                    </label>
                    <label>
                      Tipo
                      <select
                        value={geracaoDocumentoTemplateForm.tipo}
                        onChange={(e) => setGeracaoDocumentoTemplateForm((prev) => ({ ...prev, tipo: e.target.value }))}
                      >
                        <option value="DECLARACAO">Declaração</option>
                        <option value="RELATORIO">Relatório</option>
                        <option value="CONTRATO">Contrato</option>
                        <option value="OFICIO">Ofício</option>
                      </select>
                    </label>
                    <label>
                      Arquivo DOCX *
                      <input
                        type="file"
                        accept=".docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setGeracaoDocumentoTemplateForm((prev) => ({ ...prev, arquivo: file }));
                        }}
                      />
                    </label>
                  </div>
                  <p className="subtitle" style={{ marginTop: "8px" }}>
                    O arquivo deve conter tags no formato [NOME_CAMPO] para serem substituídas automaticamente.
                  </p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="secondary" onClick={() => setShowGeracaoDocumentoTemplateModal(false)}>Cancelar</button>
                  <button
                    type="button"
                    className="primary"
                    disabled={!geracaoDocumentoTemplateForm.codigo || !geracaoDocumentoTemplateForm.nome || !geracaoDocumentoTemplateForm.arquivo}
                    onClick={() => void onSaveGeracaoDocumentoTemplate()}
                  >
                    Criar Template
                  </button>
                </div>
              </div>
            </div>
          )}

          {geracaoDocumentoTemplateEdit && (
            <div className="modal-overlay" onClick={() => setGeracaoDocumentoTemplateEdit(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Editar Template</h3>
                  <button type="button" className="close-btn" onClick={() => setGeracaoDocumentoTemplateEdit(null)}>×</button>
                </div>
                <div className="modal-body">
                  <div className="form-grid">
                    <label>
                      Nome *
                      <input
                        value={geracaoDocumentoTemplateEdit.nome}
                        onChange={(e) => setGeracaoDocumentoTemplateEdit((prev) => prev ? { ...prev, nome: e.target.value } : null)}
                        placeholder="Declaração de Adimplência"
                      />
                    </label>
                    <label>
                      Descrição
                      <input
                        value={geracaoDocumentoTemplateEdit.descricao}
                        onChange={(e) => setGeracaoDocumentoTemplateEdit((prev) => prev ? { ...prev, descricao: e.target.value } : null)}
                        placeholder="Descrição do template"
                      />
                    </label>
                    <label>
                      Tipo
                      <select
                        value={geracaoDocumentoTemplateEdit.tipo}
                        onChange={(e) => setGeracaoDocumentoTemplateEdit((prev) => prev ? { ...prev, tipo: e.target.value } : null)}
                      >
                        <option value="DECLARACAO">Declaração</option>
                        <option value="RELATORIO">Relatório</option>
                        <option value="CONTRATO">Contrato</option>
                        <option value="OFICIO">Ofício</option>
                      </select>
                    </label>
                    <label>
                      Arquivo DOCX (opcional)
                      <input
                        type="file"
                        accept=".docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setGeracaoDocumentoTemplateEdit((prev) => prev ? { ...prev, arquivo: file } : null);
                        }}
                      />
                      <span className="subtitle">Se não selecionar um novo arquivo, o atual será mantido.</span>
                    </label>
                  </div>
                  <p className="subtitle" style={{ marginTop: "8px" }}>
                    O arquivo deve conter tags no formato [NOME_CAMPO] para serem substituídas automaticamente.
                  </p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="secondary" onClick={() => setGeracaoDocumentoTemplateEdit(null)}>Cancelar</button>
                  <button
                    type="button"
                    className="primary"
                    disabled={!geracaoDocumentoTemplateEdit.nome}
                    onClick={() => void onSaveGeracaoDocumentoTemplateEdit()}
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </div>
          )}

          {showGeracaoDocumentoResponsavelModal && (
            <div className="modal-overlay" onClick={() => setShowGeracaoDocumentoResponsavelModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Novo Responsável Técnico</h3>
                  <button type="button" className="close-btn" onClick={() => setShowGeracaoDocumentoResponsavelModal(false)}>×</button>
                </div>
                <div className="modal-body">
                  <div className="form-grid">
                    <label>
                      Nome *
                      <input
                        value={geracaoDocumentoResponsavelForm.nome}
                        onChange={(e) => setGeracaoDocumentoResponsavelForm((prev) => ({ ...prev, nome: e.target.value }))}
                        placeholder="Nome completo"
                      />
                    </label>
                    <label>
                      CPF *
                      <input
                        value={geracaoDocumentoResponsavelForm.cpf}
                        onChange={(e) => setGeracaoDocumentoResponsavelForm((prev) => ({ ...prev, cpf: e.target.value }))}
                        placeholder="000.000.000-00"
                      />
                    </label>
                    <label>
                      CREA *
                      <input
                        value={geracaoDocumentoResponsavelForm.crea}
                        onChange={(e) => setGeracaoDocumentoResponsavelForm((prev) => ({ ...prev, crea: e.target.value }))}
                        placeholder="0000000000"
                      />
                    </label>
                    <label>
                      Cargo *
                      <input
                        value={geracaoDocumentoResponsavelForm.cargo}
                        onChange={(e) => setGeracaoDocumentoResponsavelForm((prev) => ({ ...prev, cargo: e.target.value }))}
                        placeholder="Engenheiro Civil"
                      />
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="secondary" onClick={() => setShowGeracaoDocumentoResponsavelModal(false)}>Cancelar</button>
                  <button
                    type="button"
                    className="primary"
                    disabled={!geracaoDocumentoResponsavelForm.nome || !geracaoDocumentoResponsavelForm.cpf || !geracaoDocumentoResponsavelForm.crea || !geracaoDocumentoResponsavelForm.cargo}
                    onClick={() => void onSaveGeracaoDocumentoResponsavel()}
                  >
                    Criar Responsável
                  </button>
                </div>
              </div>
            </div>
          )}

          {message && <p className="message">{message}</p>}
        </main>
      </div>
    </div>
  );
}
