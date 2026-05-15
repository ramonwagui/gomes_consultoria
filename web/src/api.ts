import type {
  AssistenteHistoricoItem,
  AssistenteResposta,
  AssistenteSessionDetail,
  AssistenteSessionItem,
  ApiError,
  AuditAction,
  AuditLogItem,
  ChecklistExternalFile,
  AuthResponse,
  ChecklistItem,
  ChecklistItemStatus,
  ChecklistResponse,
  Convenete,
  ConveneteProponenteSugestaoItem,
  ConvenetePayload,
  ProponenteImportacaoResumo,
  DocumentTemplateItem,
  DocumentTemplateVersionItem,
  DocumentTemplateStatus,
  DocumentoAreaItem,
  DocumentoScanMonitor,
  DocumentoAuditAction,
  DocumentoAuditLogItem,
  DocumentoExternalRequestItem,
  DocumentoSearchItem,
  EmendaEstadualItem,
  EmendaEstadualDocumentoAuditoriaItem,
  EmendaEstadualDocumentoItem,
  EmendaEstadualMunicipioItem,
  GeneratedTemplateDocumentItem,
  DocumentoGeracaoTemplate,
  DocumentoGeracaoResponsavel,
  DocumentoGeracaoLog,
  InstrumentoDados,
  DeadlineAlertResponse,
  InstrumentFilters,
  InstrumentStatus,
  InstrumentRepasse,
  InstrumentPayload,
  Instrument,
  PaymentRequestInstrument,
  PaymentRequestItem,
  PaymentRequestPayload,
  PaymentRequestStatus,
  ManagedUser,
  HealthResponse,
  AndamentoInstrumentosReportResponse,
  ObraReportResponse,
  TransferenciaDiscricionariaFiltrosResponse,
  TransferenciaDiscricionariaDesembolsoResponse,
  TransferenciaDiscricionariaDesembolsoProponenteResponse,
  TransferenciaDiscricionariaProponenteSugestaoResponse,
  TransferenciaDiscricionariaResponse,
  TransferenciaDiscricionariaChangesNotifyResult,
  TransferenciaDiscricionariaNotifyResult,
  TransferenciaDiscricionariaSyncResult,
  TransferenciaDiscricionariaSyncState,
  TransferenciaEspecialSyncStatus,
  TransferenciaEspecialPlanoAcaoResponse,
  ConsultaFnsAnoItem,
  ConsultaFnsMunicipioItem,
  ConsultaFnsPropostaDetalhe,
  ConsultaFnsPropostasResponse,
  ConsultaFnsSyncStatus,
  ConsultaFnsUfItem,
  FnsEntidadeItem,
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
  SismobResponse,
  SimecUfItem,
  Role,
  Ticket,
  TicketsEmailStatusResponse,
  TicketPriority,
  TicketStatus,
  TicketSource,
  RepasseReportResponse,
  TransparenciaReportResponse,
  StageFollowUp,
  StageFollowUpListResponse,
  User,
  ProponenteBatchImportProgress,
  WorkProgress,
  WorkflowStage
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
export const COOKIE_SESSION_TOKEN = "__cookie_session__";
const CSRF_COOKIE = "gc_csrf";

const buildUrl = (path: string, params?: Record<string, string | number | boolean | null | undefined>) => {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      const normalized = String(value).trim();
      if (normalized !== "") {
        url.searchParams.set(key, normalized);
      }
    });
  }
  return url.toString();
};

const getCookie = (name: string) => {
  if (typeof document === "undefined") {
    return "";
  }
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const value = part.trim();
    if (value.startsWith(prefix)) {
      return decodeURIComponent(value.slice(prefix.length));
    }
  }
  return "";
};

const resolveAuthorizationHeader = (token: string) =>
  token && token !== COOKIE_SESSION_TOKEN ? `Bearer ${token}` : "";

const isMutatingMethod = (method?: string) => ["POST", "PUT", "PATCH", "DELETE"].includes((method ?? "GET").toUpperCase());

let refreshPromise: Promise<boolean> | null = null;

const refreshSession = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(buildUrl("/api/v1/auth/refresh"), {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRF-Token": getCookie(CSRF_COOKIE)
        }
      });
      return response.ok;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

const getErrorMessage = async (res: Response) => {
  const raw = await res.text();

  let payload: ApiError | null = null;
  try {
    payload = raw ? (JSON.parse(raw) as ApiError) : null;
  } catch {
    payload = null;
  }

  const fieldErrors =
    payload && typeof payload.issues === "object" && payload.issues && "fieldErrors" in payload.issues
      ? (payload.issues as { fieldErrors?: Record<string, string[]> }).fieldErrors
      : undefined;

  const firstFieldError = fieldErrors
    ? Object.values(fieldErrors)
        .flat()
        .find((value) => Boolean(value))
    : undefined;

  const fallbackText = raw && !payload ? raw : "";

  return firstFieldError ?? payload?.message ?? payload?.error ?? (fallbackText || `Erro HTTP ${res.status}`);
};

const request = async <T>(
  path: string,
  init: RequestInit = {},
  params?: Record<string, string | number | boolean | null | undefined>,
  retried = false
): Promise<T> => {
  const isFormDataPayload = init.body instanceof FormData;
  const rawHeaders = {
    ...(isFormDataPayload ? {} : { "Content-Type": "application/json" }),
    ...(init.headers ?? {})
  };
  const headers = rawHeaders as Record<string, string | undefined>;
  const authValue = headers.Authorization ?? headers.authorization;
  if (authValue && (authValue === "Bearer" || authValue === "Bearer " || authValue === `Bearer ${COOKIE_SESSION_TOKEN}`)) {
    delete headers.Authorization;
    delete headers.authorization;
  }
  if (isMutatingMethod(init.method)) {
    const csrfToken = getCookie(CSRF_COOKIE);
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }
  const headersInit = new Headers();
  Object.entries(headers).forEach(([key, value]) => {
    if (typeof value === "string") {
      headersInit.set(key, value);
    }
  });

  let res: Response;
  try {
    res = await fetch(buildUrl(path, params), {
      ...init,
      headers: headersInit,
      credentials: "include"
    });
  } catch (error) {
    console.error("[api] Network error", { path, method: init.method ?? "GET", error });
    throw error;
  }

  if (!res.ok) {
    if (res.status === 401 && !retried && path !== "/api/v1/auth/login" && path !== "/api/v1/auth/refresh") {
      try {
        const refreshed = await refreshSession();
        if (refreshed) {
          return request<T>(path, init, params, true);
        }
      } catch {
        // no-op; will trigger auth-expired below
      }
    }
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent("gestconv:auth-expired"));
    }
    throw new Error(await getErrorMessage(res));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
};

export const login = (email: string, senha: string) =>
  request<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, senha })
  });

export const logout = () =>
  request<void>("/api/v1/auth/logout", {
    method: "POST"
  });

export const register = (nome: string, email: string, senha: string, role: Role) =>
  request<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ nome, email, senha, role })
  });

export const listUsersAdmin = (token: string) =>
  request<ManagedUser[]>("/api/v1/usuarios", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const createUserAdmin = (
  token: string,
  payload: { nome: string; email: string; senha: string; role: Role; proponente_ids?: number[] }
) =>
  request<ManagedUser>("/api/v1/usuarios", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const updateUserAdmin = (
  token: string,
  id: number,
  payload: Partial<{ nome: string; email: string; senha: string; role: Role; proponente_ids: number[] }>
) =>
  request<ManagedUser>(`/api/v1/usuarios/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const seedDemoDataAdmin = (token: string) =>
  request<{ message: string; instrumentos: number; repasses: number }>("/api/v1/usuarios/seed-demo", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const listPaymentRequestInstruments = (token: string) =>
  request<{ itens: PaymentRequestInstrument[] }>("/api/v1/pagamentos/instrumentos", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const getPaymentRequestInstrumentById = (token: string, id: number) =>
  request<PaymentRequestInstrument>(`/api/v1/pagamentos/instrumentos/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const listPaymentRequests = (
  token: string,
  filters?: { status?: PaymentRequestStatus | ""; proponente_id?: string; instrumento_id?: string }
) =>
  request<{ itens: PaymentRequestItem[] }>(
    "/api/v1/pagamentos",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      status: filters?.status || undefined,
      proponente_id: filters?.proponente_id,
      instrumento_id: filters?.instrumento_id
    }
  );

export const createPaymentRequest = (token: string, payload: PaymentRequestPayload) =>
  {
    const formData = new FormData();
    formData.append("instrumento_id", String(payload.instrumento_id));
    formData.append("valor_nota", String(payload.valor_nota));
    formData.append("valor_bm", String(payload.valor_bm));
    formData.append("numero_bm", payload.numero_bm);
    formData.append("impostos", JSON.stringify(payload.impostos));
    if (payload.observacoes) {
      formData.append("observacoes", payload.observacoes);
    }
    if (payload.nota_fiscal) {
      formData.append("nota_fiscal", payload.nota_fiscal);
    }
    if (payload.empenho) {
      formData.append("empenho", payload.empenho);
    }

    return request<PaymentRequestItem>("/api/v1/pagamentos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
      body: formData
    });
  };

export const downloadPaymentRequestFile = async (
  token: string,
  id: number,
  tipo: "nota_fiscal" | "empenho",
  fallbackName = "arquivo"
) => {
  const blob = await getPaymentRequestFileBlob(token, id, tipo);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fallbackName;
  link.click();
  URL.revokeObjectURL(url);
};

export const getPaymentRequestFileBlob = async (token: string, id: number, tipo: "nota_fiscal" | "empenho") => {
  const authHeader = resolveAuthorizationHeader(token);
  const res = await fetch(buildUrl(`/api/v1/pagamentos/${id}/arquivos/${tipo}`), {
    headers: authHeader ? { Authorization: authHeader } : {},
    credentials: "include"
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  return res.blob();
};

export const updatePaymentRequestStatus = (token: string, id: number, status: PaymentRequestStatus) =>
  request<PaymentRequestItem>(`/api/v1/pagamentos/${id}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });

export const listInstruments = (
  token: string,
  filters: InstrumentFilters
) =>
  request<Instrument[]>(
    "/api/v1/instrumentos",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      ativo: filters.ativo,
      status: filters.status,
      concedente: filters.concedente,
      convenete_id: filters.convenete_id ?? filters.proponente_id,
      proponente_id: filters.proponente_id,
      sync_repasses_desembolsos: filters.sync_repasses_desembolsos ?? "false",
      vigencia_de: filters.vigencia_de,
      vigencia_ate: filters.vigencia_ate
    }
  );

export const getInstrumentById = (token: string, id: number) =>
  request<Instrument>(`/api/v1/instrumentos/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const getInstrumentChecklist = (token: string, instrumentId: number) =>
  request<ChecklistResponse>(`/api/v1/instrumentos/${instrumentId}/checklist`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const addChecklistItem = (
  token: string,
  instrumentId: number,
  payload: {
    nome_documento: string;
    etapa?: WorkflowStage;
    obrigatorio: boolean;
    observacao?: string;
    status?: ChecklistItemStatus;
  }
) =>
  request<ChecklistItem>(`/api/v1/instrumentos/${instrumentId}/checklist`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const deleteChecklistItem = (token: string, instrumentId: number, itemId: number) =>
  request<void>(`/api/v1/instrumentos/${instrumentId}/checklist/${itemId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const updateChecklistItem = (
  token: string,
  instrumentId: number,
  itemId: number,
  payload: Partial<{
    etapa: WorkflowStage;
    status: ChecklistItemStatus;
    nome_documento: string;
    obrigatorio: boolean;
    observacao: string;
    ordem: number;
  }>
) =>
  request<ChecklistItem>(`/api/v1/instrumentos/${instrumentId}/checklist/${itemId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const getMyProfile = (token: string) =>
  request<User>("/api/v1/usuarios/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const uploadMyAvatar = async (token: string, file: File) => {
  const formData = new FormData();
  formData.append("avatar", file);

  return request<User>("/api/v1/usuarios/me/avatar", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });
};

export const removeMyAvatar = (token: string) =>
  request<void>("/api/v1/usuarios/me/avatar", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const createChecklistExternalLink = (
  token: string,
  instrumentId: number,
  itemId: number,
  validadeDias = 7
) =>
  request<{
    token: string;
    ativo: boolean;
    expira_em: string;
    validade_dias: number;
    link_publico: string;
  }>(`/api/v1/instrumentos/${instrumentId}/checklist/${itemId}/external-link`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ validade_dias: validadeDias })
  });

export const deactivateChecklistExternalLink = (token: string, instrumentId: number, itemId: number) =>
  request<{ message: string; desativados: number }>(`/api/v1/instrumentos/${instrumentId}/checklist/${itemId}/external-link`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const listChecklistExternalFiles = (token: string, instrumentId: number, itemId: number) =>
  request<{ itens: ChecklistExternalFile[] }>(`/api/v1/instrumentos/${instrumentId}/checklist/${itemId}/external-files`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const downloadChecklistExternalFile = async (
  token: string,
  instrumentId: number,
  itemId: number,
  fileId: number,
  fallbackName = "arquivo"
) => {
  const authHeader = resolveAuthorizationHeader(token);
  const res = await fetch(
    buildUrl(`/api/v1/instrumentos/${instrumentId}/checklist/${itemId}/external-files/${fileId}/download`),
    {
      headers: authHeader ? { Authorization: authHeader } : {},
      credentials: "include"
    }
  );

  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fallbackName;
  link.click();
  URL.revokeObjectURL(url);
};

export const uploadChecklistItemFile = (token: string, instrumentId: number, itemId: number, file: File) => {
  const formData = new FormData();
  formData.append("arquivo", file);

  return request<ChecklistItem>(`/api/v1/instrumentos/${instrumentId}/checklist/${itemId}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });
};

export const removeChecklistItemFile = (token: string, instrumentId: number, itemId: number) =>
  request<ChecklistItem>(`/api/v1/instrumentos/${instrumentId}/checklist/${itemId}/upload`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const downloadChecklistItemFile = async (
  token: string,
  instrumentId: number,
  itemId: number,
  fallbackName = "documento"
) => {
  const res = await fetch(buildUrl(`/api/v1/instrumentos/${instrumentId}/checklist/${itemId}/download`), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fallbackName;
  link.click();
  URL.revokeObjectURL(url);
};

export const listStageFollowUps = (token: string, instrumentId: number, stage: WorkflowStage) =>
  request<StageFollowUpListResponse>(`/api/v1/instrumentos/${instrumentId}/stages/${stage}/follow-ups`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const createStageFollowUp = (
  token: string,
  instrumentId: number,
  stage: WorkflowStage,
  payload: {
    texto?: string;
    arquivos?: File[];
  }
) => {
  const formData = new FormData();
  if (payload.texto && payload.texto.trim() !== "") {
    formData.append("texto", payload.texto.trim());
  }
  for (const file of payload.arquivos ?? []) {
    formData.append("arquivos", file);
  }

  return request<StageFollowUp>(`/api/v1/instrumentos/${instrumentId}/stages/${stage}/follow-ups`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });
};

export const updateStageFollowUp = (
  token: string,
  instrumentId: number,
  stage: WorkflowStage,
  followUpId: number,
  payload: { texto: string }
) =>
  request<StageFollowUp>(`/api/v1/instrumentos/${instrumentId}/stages/${stage}/follow-ups/${followUpId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const deleteStageFollowUp = (
  token: string,
  instrumentId: number,
  stage: WorkflowStage,
  followUpId: number
) =>
  request<void>(`/api/v1/instrumentos/${instrumentId}/stages/${stage}/follow-ups/${followUpId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const downloadStageFollowUpFile = async (
  token: string,
  instrumentId: number,
  stage: WorkflowStage,
  followUpId: number,
  fileId: number,
  fallbackName = "arquivo"
) => {
  const res = await fetch(
    buildUrl(`/api/v1/instrumentos/${instrumentId}/stages/${stage}/follow-ups/${followUpId}/files/${fileId}/download`),
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fallbackName;
  link.click();
  URL.revokeObjectURL(url);
};

export const createInstrument = (token: string, payload: InstrumentPayload) =>
  request<Instrument>("/api/v1/instrumentos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const updateInstrument = (token: string, id: number, payload: Partial<InstrumentPayload>) =>
  request<Instrument>(`/api/v1/instrumentos/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const addInstrumentRepasse = (
  token: string,
  instrumentId: number,
  payload: { data_repasse: string; valor_repasse: number }
) =>
  request<Instrument>(`/api/v1/instrumentos/${instrumentId}/repasses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const deleteInstrumentRepasse = (token: string, instrumentId: number, repasseId: number) =>
  request<Instrument>(`/api/v1/instrumentos/${instrumentId}/repasses/${repasseId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const listInstrumentRepasses = (token: string, instrumentId: number) =>
  request<{ itens: InstrumentRepasse[] }>(`/api/v1/instrumentos/${instrumentId}/repasses`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const deactivateInstrument = (token: string, id: number) =>
  request<void>(`/api/v1/instrumentos/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const listDeadlineAlerts = (token: string, limiteDias = 30) =>
  request<DeadlineAlertResponse>(
    "/api/v1/instrumentos/alerts/deadlines",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      limite_dias: String(limiteDias)
    }
  );

export const getWorkProgress = (token: string, instrumentId: number) =>
  request<WorkProgress>(`/api/v1/instrumentos/${instrumentId}/work-progress`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const updateWorkProgress = (token: string, instrumentId: number, percentualObra: number) =>
  request<{ percentual_obra: number }>(`/api/v1/instrumentos/${instrumentId}/work-progress`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ percentual_obra: percentualObra })
  });

export const syncWorkProgressFromTransferegov = (token: string, instrumentId: number) =>
  request<any>(`/api/v1/instrumentos/${instrumentId}/work-progress/sync-transferegov`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const addWorkMeasurementBulletin = (
  token: string,
  instrumentId: number,
  payload: {
    data_boletim: string;
    valor_medicao: number;
    percentual_obra_informado?: number;
    observacao?: string;
  }
) =>
  request(`/api/v1/instrumentos/${instrumentId}/work-progress/boletins`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const deleteWorkMeasurementBulletin = (token: string, instrumentId: number, boletimId: number) =>
  request<void>(`/api/v1/instrumentos/${instrumentId}/work-progress/boletins/${boletimId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const healthCheck = () => request<HealthResponse>("/health");

export const getTicketsEmailStatus = (token: string) =>
  request<TicketsEmailStatusResponse>("/api/v1/tickets-email/status", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const listAuditLogs = (
  token: string,
  query: { instrumento_id?: number; acao?: AuditAction; limite?: number }
) =>
  request<AuditLogItem[]>(
    "/api/v1/auditoria",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      instrumento_id: query.instrumento_id ? String(query.instrumento_id) : "",
      acao: query.acao ?? "",
      limite: String(query.limite ?? 100)
    }
  );

export const listAreaDocumentos = (
  token: string,
  filters?: {
    q?: string;
    status?: string;
    instrumento_id?: string;
    proponente_id?: string;
    usuario_id?: string;
    data_de?: string;
    data_ate?: string;
    limite?: number;
  }
) =>
  request<{ itens: DocumentoAreaItem[] }>(
    "/api/v1/documentos",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      q: filters?.q,
      status: filters?.status,
      instrumento_id: filters?.instrumento_id,
      proponente_id: filters?.proponente_id,
      usuario_id: filters?.usuario_id,
      data_de: filters?.data_de,
      data_ate: filters?.data_ate,
      limite: String(filters?.limite ?? 100)
    }
  );

export const searchAreaDocumentos = (token: string, q: string) =>
  request<{ itens: DocumentoSearchItem[] }>(
    "/api/v1/documentos/search",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    { q, limite: 50 }
  );

export const uploadAreaDocumentoFile = (
  token: string,
  file: File,
  payload: { instrumento_id?: string; proponente_id?: string },
  onProgress?: (progress: number) => void
) =>
  new Promise<{ itens: DocumentoAreaItem[] }>((resolve, reject) => {
    const formData = new FormData();
    formData.append("arquivos", file);
    if (payload.instrumento_id) {
      formData.append("instrumento_id", payload.instrumento_id);
    }
    if (payload.proponente_id) {
      formData.append("proponente_id", payload.proponente_id);
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", buildUrl("/api/v1/documentos/upload"));
    const authHeader = resolveAuthorizationHeader(token);
    if (authHeader) {
      xhr.setRequestHeader("Authorization", authHeader);
    }
    const csrfToken = getCookie(CSRF_COOKIE);
    if (csrfToken) {
      xhr.setRequestHeader("X-CSRF-Token", csrfToken);
    }
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText || "{}") as { itens: DocumentoAreaItem[] });
        } catch {
          reject(new Error("Resposta invalida do servidor."));
        }
        return;
      }
      try {
        const payload = JSON.parse(xhr.responseText || "{}") as ApiError;
        reject(new Error(payload.message || payload.error || `Erro HTTP ${xhr.status}`));
      } catch {
        reject(new Error(`Erro HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Falha de rede ao enviar arquivo."));
    xhr.send(formData);
  });

export const updateAreaDocumento = (
  token: string,
  id: number,
  payload: { nome_atual?: string; instrumento_id?: number; proponente_id?: number }
) =>
  request<DocumentoAreaItem>(`/api/v1/documentos/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const reindexAreaDocumento = (token: string, id: number) =>
  request<DocumentoAreaItem>(`/api/v1/documentos/${id}/reindex`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const deleteAreaDocumento = (token: string, id: number) =>
  request<void>(`/api/v1/documentos/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const downloadAreaDocumento = async (token: string, id: number, fallbackName = "documento") => {
  const authHeader = resolveAuthorizationHeader(token);
  const res = await fetch(buildUrl(`/api/v1/documentos/${id}/download`), {
    headers: authHeader ? { Authorization: authHeader } : {},
    credentials: "include"
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fallbackName;
  link.click();
  URL.revokeObjectURL(url);
};

export const listAreaDocumentoAuditLogs = (
  token: string,
  filters?: {
    documento_id?: string;
    usuario_id?: string;
    arquivo?: string;
    acao?: DocumentoAuditAction | "";
    data_de?: string;
    data_ate?: string;
  }
) =>
  request<{ itens: DocumentoAuditLogItem[] }>(
    "/api/v1/documentos/auditoria",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      documento_id: filters?.documento_id,
      usuario_id: filters?.usuario_id,
      arquivo: filters?.arquivo,
      acao: filters?.acao || undefined,
      data_de: filters?.data_de,
      data_ate: filters?.data_ate,
      limite: 200
    }
  );

export const listDocumentoExternalRequests = (token: string) =>
  request<{ itens: DocumentoExternalRequestItem[] }>("/api/v1/documentos/external-requests", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const getDocumentoScanMonitor = (token: string) =>
  request<DocumentoScanMonitor>("/api/v1/documentos/scan/monitor", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const listDocumentosByExternalRequest = (token: string, id: number) =>
  request<{ solicitacao: { id: number; titulo: string; token: string }; itens: DocumentoAreaItem[] }>(
    `/api/v1/documentos/external-requests/${id}/documentos`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

export const createDocumentoExternalRequest = (
  token: string,
  payload: {
    titulo: string;
    descricao?: string;
    permanente: boolean;
    expira_em?: string | null;
    permitir_reenvio: boolean;
    max_usos?: number;
  }
) =>
  request<DocumentoExternalRequestItem>("/api/v1/documentos/external-requests", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const deactivateDocumentoExternalRequest = (token: string, id: number) =>
  request<DocumentoExternalRequestItem>(`/api/v1/documentos/external-requests/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const updateDocumentoExternalRequestExpiration = (
  token: string,
  id: number,
  payload: { permanente: boolean; expira_em?: string | null }
) =>
  request<DocumentoExternalRequestItem>(`/api/v1/documentos/external-requests/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const resendDocumentoExternalRequest = (token: string, id: number) =>
  request<DocumentoExternalRequestItem>(`/api/v1/documentos/external-requests/${id}/resend`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const listConvenetes = (token: string) =>
  request<Convenete[]>("/api/v1/proponentes", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const searchConveneteProponentes = (token: string, query: { q: string; limit?: number }) =>
  request<{ itens: ConveneteProponenteSugestaoItem[] }>(
    "/api/v1/proponentes/sugestoes",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      q: query.q,
      limit: String(query.limit ?? 10)
    }
  );

export const createConveneteFromProponente = (
  token: string,
  payload: { cnpj: string; nome_proponente: string; uf?: string; cidade?: string }
) =>
  request<Convenete & { importacao?: ProponenteImportacaoResumo }>("/api/v1/proponentes/from-base", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const createConvenete = (token: string, payload: ConvenetePayload) =>
  request<Convenete>("/api/v1/proponentes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const updateConvenete = (token: string, id: number, payload: Partial<ConvenetePayload>) =>
  request<Convenete>(`/api/v1/proponentes/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const deleteConvenete = (token: string, id: number) =>
  request<void>(`/api/v1/proponentes/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const uploadConveneteLogo = async (token: string, id: number, file: File) => {
  const formData = new FormData();
  formData.append("logo", file);

  return request<Convenete>(`/api/v1/proponentes/${id}/logo`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });
};

export const removeConveneteLogo = (token: string, id: number) =>
  request<void>(`/api/v1/proponentes/${id}/logo`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const uploadConveneteTimbre = async (token: string, id: number, file: File) => {
  const formData = new FormData();
  formData.append("timbre", file);

  return request<{ id: number; timbrePath: string | null; timbreMimeType: string | null }>(`/api/v1/proponentes/${id}/timbre`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });
};

export const removeConveneteTimbre = (token: string, id: number) =>
  request<void>(`/api/v1/proponentes/${id}/timbre`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const reimportarInstrumentosProponente = (token: string, id: number) =>
  request<{ proponente_id: number; importacao: ProponenteImportacaoResumo }>(
    `/api/v1/proponentes/${id}/reimportar-instrumentos`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

export const reimportarInstrumentosTodosProponentes = (token: string) =>
  request<ProponenteBatchImportProgress>("/api/v1/proponentes/reimportar-instrumentos-todos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const getReimportarInstrumentosTodosStatus = (token: string) =>
  request<ProponenteBatchImportProgress>("/api/v1/proponentes/reimportar-instrumentos-todos/status", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const getRepasseReport = (
  token: string,
  query: { proponente_id?: number; convenete_id?: number; instrumento_id?: number; data_de?: string; data_ate?: string }
) =>
  request<RepasseReportResponse>(
    "/api/v1/relatorios/repasses",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      convenete_id: String(query.convenete_id ?? query.proponente_id ?? ""),
      proponente_id: String(query.proponente_id ?? query.convenete_id ?? ""),
      instrumento_id: query.instrumento_id ? String(query.instrumento_id) : "",
      data_de: query.data_de ?? "",
      data_ate: query.data_ate ?? ""
    }
  );

export const getObraReport = (
  token: string,
  query: {
    proponente_id?: number;
    convenete_id?: number;
    instrumento_id?: number;
    concedente?: string;
    status?: InstrumentStatus;
    ativo?: boolean;
    data_de?: string;
    data_ate?: string;
  }
) =>
  request<ObraReportResponse>(
    "/api/v1/relatorios/obras",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      convenete_id: query.convenete_id ? String(query.convenete_id) : query.proponente_id ? String(query.proponente_id) : "",
      proponente_id: query.proponente_id ? String(query.proponente_id) : query.convenete_id ? String(query.convenete_id) : "",
      instrumento_id: query.instrumento_id ? String(query.instrumento_id) : "",
      concedente: query.concedente ?? "",
      status: query.status ?? "",
      ativo: query.ativo === undefined ? "true" : String(query.ativo),
      data_de: query.data_de ?? "",
      data_ate: query.data_ate ?? ""
    }
  );

export const getAndamentoInstrumentosReport = (
  token: string,
  query: {
    convenete_id?: number;
    proponente_id?: number;
    status?: InstrumentStatus;
    instrumentos: string[];
  }
) =>
  request<AndamentoInstrumentosReportResponse>(
    "/api/v1/relatorios/andamento-instrumentos",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      convenete_id: query.convenete_id ? String(query.convenete_id) : query.proponente_id ? String(query.proponente_id) : "",
      proponente_id: query.proponente_id ? String(query.proponente_id) : query.convenete_id ? String(query.convenete_id) : "",
      status: query.status ?? "",
      instrumentos: query.instrumentos.join(",")
    }
  );

export const getTransparenciaReport = (
  token: string,
  query: { cnpj: string; ano?: number; ano_pagamento?: number; max_paginas_convenios?: number; max_processos?: number }
) =>
  request<TransparenciaReportResponse>(
    "/api/v1/relatorios/transparencia",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      cnpj: query.cnpj,
      ano: query.ano ? String(query.ano) : "",
      ano_pagamento: query.ano_pagamento ? String(query.ano_pagamento) : "",
      max_paginas_convenios: query.max_paginas_convenios ? String(query.max_paginas_convenios) : "",
      max_processos: query.max_processos ? String(query.max_processos) : ""
    }
  );

export const getTransferenciasEspeciaisPlanoAcao = (
  token: string,
  query: {
    cnpj?: string;
    nome_beneficiario?: string;
    uf?: string;
    ano?: number;
    situacao?: string;
    pagamento?: "pago" | "nao_pago";
    codigo_plano_acao?: string;
    parlamentar?: string;
    page?: number;
    page_size?: number;
  }
) =>
  request<TransferenciaEspecialPlanoAcaoResponse>(
    "/api/v1/transferencias-especiais/plano-acao",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      cnpj: query.cnpj ?? "",
      nome_beneficiario: query.nome_beneficiario ?? "",
      uf: query.uf ?? "",
      ano: query.ano ? String(query.ano) : "",
      situacao: query.situacao ?? "",
      pagamento: query.pagamento ?? "",
      codigo_plano_acao: query.codigo_plano_acao ?? "",
      parlamentar: query.parlamentar ?? "",
      page: String(query.page ?? 1),
      page_size: String(query.page_size ?? 20)
    }
  );

export const syncTransferenciasEspeciaisRealtime = (token: string) =>
  request<{ started: boolean; message: string }>("/api/v1/transferencias-especiais/sincronizar-realtime", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const syncTransferenciasEspeciaisRealtimeByCnpj = (token: string, cnpj: string) =>
  request<{ started: boolean; message: string }>("/api/v1/transferencias-especiais/sincronizar-realtime/cnpj", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ cnpj })
  });

export const getTransferenciasEspeciaisRealtimeSyncStatus = (token: string) =>
  request<TransferenciaEspecialSyncStatus>("/api/v1/transferencias-especiais/sincronizacao-realtime", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const cancelTransferenciasEspeciaisRealtimeSync = (token: string) =>
  request<{ cancelled: boolean; message: string }>("/api/v1/transferencias-especiais/sincronizacao-realtime/cancelar", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const getTransferenciasDiscricionarias = (
  token: string,
  query: {
    cnpj?: string;
    nome_proponente?: string;
    concedente?: string;
    uf?: string;
    municipio?: string;
    ano?: number;
    situacao_proposta?: string;
    situacao_convenio?: string;
    nr_convenio?: string;
    nr_proposta?: string;
    tipo_ente?: "estado" | "municipio";
    vigencia_a_vencer_dias?: 30 | 60 | 90;
    page?: number;
    page_size?: number;
  }
) =>
  request<TransferenciaDiscricionariaResponse>(
    "/api/v1/transferencias-discricionarias/propostas",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      cnpj: query.cnpj ?? "",
      nome_proponente: query.nome_proponente ?? "",
      concedente: query.concedente ?? "",
      uf: query.uf ?? "",
      municipio: query.municipio ?? "",
      ano: query.ano ? String(query.ano) : "",
      situacao_proposta: query.situacao_proposta ?? "",
      situacao_convenio: query.situacao_convenio ?? "",
      nr_convenio: query.nr_convenio ?? "",
      nr_proposta: query.nr_proposta ?? "",
      tipo_ente: query.tipo_ente ?? "",
      vigencia_a_vencer_dias: query.vigencia_a_vencer_dias ? String(query.vigencia_a_vencer_dias) : "",
      page: String(query.page ?? 1),
      page_size: String(query.page_size ?? 20)
    }
  );

export const getTransferenciasDiscricionariasDesembolsos = (
  token: string,
  query: {
    nr_convenio: string;
    ano?: number;
    mes?: number;
    page?: number;
    page_size?: number;
  }
) =>
  request<TransferenciaDiscricionariaDesembolsoResponse>(
    "/api/v1/transferencias-discricionarias/desembolsos",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      nr_convenio: query.nr_convenio,
      ano: query.ano ? String(query.ano) : "",
      mes: query.mes ? String(query.mes) : "",
      page: String(query.page ?? 1),
      page_size: String(query.page_size ?? 50)
    }
  );

export const getTransferenciasDiscricionariasDesembolsosPorProponente = (
  token: string,
  query: {
    cnpj?: string;
    nome_proponente?: string;
    ano?: number;
    mes?: number;
    page?: number;
    page_size?: number;
  }
) =>
  request<TransferenciaDiscricionariaDesembolsoProponenteResponse>(
    "/api/v1/transferencias-discricionarias/desembolsos/proponente",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      cnpj: query.cnpj ?? "",
      nome_proponente: query.nome_proponente ?? "",
      ano: query.ano ? String(query.ano) : "",
      mes: query.mes ? String(query.mes) : "",
      page: String(query.page ?? 1),
      page_size: String(query.page_size ?? 100)
    }
  );

export const getTransferenciasDiscricionariasFiltros = (token: string) =>
  request<TransferenciaDiscricionariaFiltrosResponse>("/api/v1/transferencias-discricionarias/filtros", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const getTransferenciasDiscricionariasProponenteSugestoes = (
  token: string,
  query: { cnpj: string; limit?: number }
) =>
  request<TransferenciaDiscricionariaProponenteSugestaoResponse>(
    "/api/v1/transferencias-discricionarias/proponentes/sugestoes",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      cnpj: query.cnpj,
      limit: String(query.limit ?? 10)
    }
  );

export const getTransferenciasDiscricionariasSyncStatus = (token: string) =>
  request<TransferenciaDiscricionariaSyncState>(
    "/api/v1/transferencias-discricionarias/sincronizacao",
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache"
      }
    },
    { _ts: Date.now() }
  );

export const cancelTransferenciasDiscricionariasSync = (token: string) =>
  request<{ cancelled: boolean; message: string }>("/api/v1/transferencias-discricionarias/sincronizacao/cancelar", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const syncTransferenciasDiscricionarias = (
  token: string,
  options: { force?: boolean; mode?: "full" | "light" } = {}
) =>
  request<TransferenciaDiscricionariaSyncResult>("/api/v1/transferencias-discricionarias/sincronizar", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ force: options.force ?? true, mode: options.mode ?? "full" })
  });

export const triggerTransferenciasDiscricionariasVigenciaNotification = (token: string) =>
  request<TransferenciaDiscricionariaNotifyResult>(
    "/api/v1/transferencias-discricionarias/notificacoes/vigencia/disparar",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
export const triggerTransferenciasDiscricionariasChangesNotification = (token: string) =>
  request<TransferenciaDiscricionariaChangesNotifyResult>(
    "/api/v1/transferencias-discricionarias/notificacoes/alteracoes/disparar",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

export const getFnsSyncStatus = (token: string) =>
  request<FnsSyncStatus>("/api/v1/fns/status", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const getFnsUfs = (token: string) =>
  request<{ itens: FnsUfItem[] }>("/api/v1/fns/ufs", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const getFnsMunicipios = (token: string, query: { uf_id?: number }) =>
  request<{ itens: FnsMunicipioItem[] }>(
    "/api/v1/fns/municipios",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      uf_id: query.uf_id ? String(query.uf_id) : ""
    }
  );

export const getFnsEntidades = (token: string, query: { co_ibge_municipio: number }) =>
  request<{ itens: FnsEntidadeItem[] }>(
    "/api/v1/fns/entidades",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      co_ibge_municipio: String(query.co_ibge_municipio)
    }
  );

export const getFnsRepasses = (token: string, query: { ano?: number; cnpj?: string }) =>
  request<FnsRepassesResponse>(
    "/api/v1/fns/repasses",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      ano: query.ano ? String(query.ano) : "",
      cnpj: query.cnpj ?? ""
    }
  );

export const getFnsRepassesDetalhe = (
  token: string,
  query: { ano?: number; cnpj?: string; codigo_bloco?: string }
) =>
  request<FnsRepassesDetalheResponse>(
    "/api/v1/fns/repasses/detalhe",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      ano: query.ano ? String(query.ano) : "",
      cnpj: query.cnpj ?? "",
      codigo_bloco: query.codigo_bloco ?? ""
    }
  );

export const getFnsSaldosTiposConta = (token: string, query: { cnpj?: string }) =>
  request<FnsSaldosTiposContaResponse>(
    "/api/v1/fns/saldos/tipos-contas",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      cnpj: query.cnpj ?? ""
    }
  );

export const syncFnsCache = (
  token: string,
  payload: { ano?: number; cnpjs: string[]; incluir_ufs?: boolean }
) =>
  request<{
    status: "running" | "ok" | "error";
    atualizado_em?: string | null;
    detalhe?: string | null;
    total_requisicoes?: number;
    falhas?: number;
  }>("/api/v1/fns/sync", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const getConsultaFnsStatus = (token: string) =>
  request<ConsultaFnsSyncStatus>("/api/v1/consultafns/status", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const getConsultaFnsUfs = (token: string) =>
  request<{ itens: ConsultaFnsUfItem[] }>("/api/v1/consultafns/ufs", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const getConsultaFnsAnos = (token: string) =>
  request<{ itens: ConsultaFnsAnoItem[] }>("/api/v1/consultafns/anos", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const getConsultaFnsMunicipios = (token: string, query: { uf: string }) =>
  request<{ itens: ConsultaFnsMunicipioItem[] }>(
    "/api/v1/consultafns/municipios",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      uf: query.uf
    }
  );

export const getConsultaFnsPropostas = (
  token: string,
  query: {
    ano?: number;
    uf?: string;
    co_municipio_ibge?: string;
    nu_proposta?: string;
    tp_proposta?: string;
    tp_recurso?: string;
    tp_emenda?: string;
    page?: number;
    count?: number;
  }
) =>
  request<ConsultaFnsPropostasResponse>(
    "/api/v1/consultafns/propostas",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      ano: query.ano ? String(query.ano) : "",
      uf: query.uf ?? "",
      co_municipio_ibge: query.co_municipio_ibge ?? "",
      nu_proposta: query.nu_proposta ?? "",
      tp_proposta: query.tp_proposta ?? "",
      tp_recurso: query.tp_recurso ?? "",
      tp_emenda: query.tp_emenda ?? "",
      page: String(query.page ?? 1),
      count: String(query.count ?? 20)
    }
  );

export const getConsultaFnsPropostaDetalhe = (token: string, nuProposta: string) =>
  request<ConsultaFnsPropostaDetalhe>(`/api/v1/consultafns/propostas/${encodeURIComponent(nuProposta)}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const syncConsultaFnsCache = (token: string, payload: { ano?: number; pages_max?: number; count?: number }) =>
  request<{
    status: "running" | "ok" | "error";
    atualizado_em?: string | null;
    detalhe?: string | null;
    total_requisicoes?: number;
    total_itens?: number;
    falhas?: number;
  }>("/api/v1/consultafns/sync", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const getSimecUfs = (token: string) =>
  request<{ itens: SimecUfItem[] }>("/api/v1/simec-obras/ufs", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const getSimecMunicipios = (token: string, query: { uf: string }) =>
  request<{ itens: SimecMunicipioItem[] }>(
    "/api/v1/simec-obras/municipios",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      uf: query.uf
    }
  );

export const getSimecObras = (
  token: string,
  query: {
    uf: string;
    muncod: string;
    esfera?: string;
    tipologia?: string;
    obrid?: string;
  }
) =>
  request<SimecObrasResponse>(
    "/api/v1/simec-obras/obras",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      uf: query.uf,
      muncod: query.muncod,
      esfera: query.esfera ?? "",
      tipologia: query.tipologia ?? "",
      obrid: query.obrid ?? ""
    }
  );

export const getSimecObraDetalhe = (token: string, obraId: number) =>
  request<SimecObraDetalhe>(`/api/v1/simec-obras/obras/${obraId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const getSimecTermos = (
  token: string,
  query: {
    dotid_inicio?: string;
    dotid_fim?: string;
    cursor?: string;
    limite?: string;
    ano?: string;
    secretaria?: "E" | "M";
    uf?: string;
    q?: string;
  }
) =>
  request<SimecTermosResponse>(
    "/api/v1/simec-termos/termos",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      dotid_inicio: query.dotid_inicio ?? "",
      dotid_fim: query.dotid_fim ?? "",
      cursor: query.cursor ?? "",
      limite: query.limite ?? "",
      ano: query.ano ?? "",
      secretaria: query.secretaria ?? "",
      uf: query.uf ?? "",
      q: query.q ?? ""
    }
  );

export const getSimecTermoDetalhe = (token: string, dotid: number) =>
  request<SimecTermoDetalhe>(`/api/v1/simec-termos/termos/${dotid}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const getExtracaoSimec = (
  token: string,
  query: {
    uf: string;
    municipio: string;
    ano?: number | string;
    secretaria?: string;
  }
) =>
  request<SimecBotResponse>(
    "/api/v1/relatorios/simec-termos",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      uf: query.uf,
      municipio: query.municipio,
      ano: query.ano ?? "",
      secretaria: query.secretaria ?? ""
    }
  );

export const listTickets = (
  token: string,
  query?: {
    status?: TicketStatus;
    prioridade?: TicketPriority;
    origem?: TicketSource;
    somente_atrasados?: boolean;
    instrument_id?: number;
    responsavel_user_id?: number;
    q?: string;
  }
) =>
  request<Ticket[]>(
    "/api/v1/tickets",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      status: query?.status ?? "",
      prioridade: query?.prioridade ?? "",
      origem: query?.origem ?? "",
      somente_atrasados: query?.somente_atrasados ? "true" : "",
      instrument_id: query?.instrument_id ? String(query.instrument_id) : "",
      responsavel_user_id: query?.responsavel_user_id ? String(query.responsavel_user_id) : "",
      q: query?.q ?? ""
    }
  );

export const getTicketById = (token: string, id: number) =>
  request<Ticket>(`/api/v1/tickets/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const createTicket = (
  token: string,
  payload: {
    titulo: string;
    descricao?: string;
    status?: TicketStatus;
    prioridade?: TicketPriority;
    prazo_alvo?: string;
    motivo_resolucao?: string;
    instrument_id?: number;
    instrumento_informado?: string;
    responsavel_user_id?: number;
  }
) =>
  request<Ticket>("/api/v1/tickets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const updateTicket = (
  token: string,
  id: number,
  payload: Partial<{
    titulo: string;
    descricao: string | null;
    status: TicketStatus;
    prioridade: TicketPriority;
    prazo_alvo: string | null;
    motivo_resolucao: string | null;
    instrument_id: number | null;
    instrumento_informado: string | null;
    responsavel_user_id: number | null;
  }>
) =>
  request<Ticket>(`/api/v1/tickets/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const addTicketComment = (token: string, id: number, mensagem: string) =>
  request<Ticket>(`/api/v1/tickets/${id}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ mensagem })
  });

export const toggleTicketChecklistItem = (token: string, ticketId: number, itemId: number, concluido: boolean) =>
  request<Ticket>(`/api/v1/tickets/${ticketId}/checklist/${itemId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ concluido })
  });

export const listTicketAssignableUsers = (token: string) =>
  request<{ itens: Array<{ id: number; nome: string; email: string; role: Role }> }>(
    "/api/v1/tickets/assignable-users",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

export const associateTicketInstrument = (token: string, ticketId: number, instrumentId: number) =>
  request<{ success: boolean; ticket: Ticket; solicitacaoCaixa: unknown }>(
    `/api/v1/tickets/${ticketId}/instrumento`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ instrument_id: instrumentId })
    }
  );

export const dissociateTicketInstrument = (token: string, ticketId: number) =>
  request<{ success: boolean; ticket: Ticket }>(`/api/v1/tickets/${ticketId}/instrumento`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export type SolicitacaoCaixaItem = {
  id: number;
  tipo: "EMAIL_RECEBIDO" | "COMENTARIO_TICKET" | "RESPOTA_ENVIADA" | "ASSOCIAÇÃO_MANUAL";
  descricao: string;
  origem_email: string | null;
  assunto_email: string | null;
  created_at: string;
  ticket: { id: number; codigo: string; titulo: string } | null;
};

export const listSolicitacoesCaixa = (token: string, instrumentId: number, options?: { tipo?: string; limit?: number; offset?: number }) => {
  const params: Record<string, string> = {};
  if (options?.tipo) params.tipo = options.tipo;
  if (options?.limit) params.limit = String(options.limit);
  if (options?.offset) params.offset = String(options.offset);
  return request<{ itens: SolicitacaoCaixaItem[]; total: number }>(
    `/api/v1/solicitacao-caixa/instrumentos/${instrumentId}/solicitacoes`,
    {
      headers: { Authorization: `Bearer ${token}` },
      ...(Object.keys(params).length > 0 ? { params } : {})
    }
  );
};

export type InstrumentoSearchItem = {
  id: number;
  label: string;
  proposta: string | null;
  instrumento: string | null;
  objeto: string | null;
};

export const searchInstrumentos = (token: string, q: string) =>
  request<InstrumentoSearchItem[]>(`/api/v1/solicitacao-caixa/instrumentos/search?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const askAssistentePergunta = (
  token: string,
  pergunta: string,
  historico: AssistenteHistoricoItem[] = [],
  session_id?: string
) =>
  request<AssistenteResposta>("/api/v1/assistente/perguntar", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pergunta, historico, session_id })
  });

export const listAssistenteSessions = (token: string, limit = 20) =>
  request<{ itens: AssistenteSessionItem[] }>(
    "/api/v1/assistente/sessions",
    { headers: { Authorization: `Bearer ${token}` } },
    { limit: String(limit) }
  );

export const getAssistenteSession = (token: string, sessionId: string) =>
  request<AssistenteSessionDetail>(`/api/v1/assistente/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const listDocumentTemplateFields = (token: string) =>
  request<{ placeholders: string[] }>("/api/v1/document-templates/fields", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const listDocumentTemplates = (
  token: string,
  query?: {
    q?: string;
    status?: DocumentTemplateStatus;
    tipo?: string;
  }
) =>
  request<{ items: DocumentTemplateItem[] }>(
    "/api/v1/document-templates",
    {
      headers: { Authorization: `Bearer ${token}` }
    },
    {
      q: query?.q ?? "",
      status: query?.status ?? "",
      tipo: query?.tipo ?? ""
    }
  );

export const createDocumentTemplate = (
  token: string,
  payload: {
    codigo: string;
    nome: string;
    descricao?: string;
    tipo?: string;
    status?: DocumentTemplateStatus;
    conteudo: string;
  }
) =>
  request<DocumentTemplateItem>("/api/v1/document-templates", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const updateDocumentTemplate = (
  token: string,
  id: number,
  payload: Partial<{
    nome: string;
    descricao: string;
    tipo: string;
    status: DocumentTemplateStatus;
    conteudo: string;
  }>
) =>
  request<DocumentTemplateItem>(`/api/v1/document-templates/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const generateDocumentTemplate = (
  token: string,
  payload: {
    template_id: number;
    proponente_id: number;
    instrumento_id?: number;
    titulo?: string;
    substitutions?: Record<string, string | number | boolean | null>;
  }
) =>
  request<{
    id: number;
    template_id: number;
    proponente_id: number;
    instrumento_id: number | null;
    titulo: string;
    rendered_content: string;
    created_at: string;
  }>("/api/v1/document-templates/generate", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const listEmendasEstaduaisMunicipios = (token: string) =>
  request<{ itens: EmendaEstadualMunicipioItem[] }>("/api/v1/emendas-estaduais/municipios", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const listEmendasEstaduais = (
  token: string,
  query?: {
    q?: string;
    municipio_id?: number;
  }
) =>
  request<{ itens: EmendaEstadualItem[] }>(
    "/api/v1/emendas-estaduais",
    {
      headers: { Authorization: `Bearer ${token}` }
    },
    {
      q: query?.q ?? "",
      municipio_id: query?.municipio_id ? String(query.municipio_id) : ""
    }
  );

export const createEmendaEstadual = (
  token: string,
  payload: {
    objeto: string;
    numero: string;
    parlamentar: string;
    vigencia_inicio: string;
    vigencia_fim: string;
    valor: number;
    contrapartida: number;
    municipio_ids: number[];
  }
) =>
  request<EmendaEstadualItem>("/api/v1/emendas-estaduais", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const updateEmendaEstadual = (
  token: string,
  id: number,
  payload: {
    objeto: string;
    numero: string;
    parlamentar: string;
    vigencia_inicio: string;
    vigencia_fim: string;
    valor: number;
    contrapartida: number;
    municipio_ids: number[];
  }
) =>
  request<EmendaEstadualItem>(`/api/v1/emendas-estaduais/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const deleteEmendaEstadual = (token: string, id: number) =>
  request<void>(`/api/v1/emendas-estaduais/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

export const listEmendaEstadualDocumentos = (token: string, emendaId: number) =>
  request<{ itens: EmendaEstadualDocumentoItem[] }>(`/api/v1/emendas-estaduais/${emendaId}/documentos`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const listEmendaEstadualDocumentosAuditoria = (token: string, emendaId: number) =>
  request<{ itens: EmendaEstadualDocumentoAuditoriaItem[] }>(`/api/v1/emendas-estaduais/${emendaId}/documentos/auditoria`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const uploadEmendaEstadualDocumentos = async (token: string, emendaId: number, arquivos: File[]) => {
  const formData = new FormData();
  for (const arquivo of arquivos) {
    formData.append("arquivos", arquivo);
  }
  return request<{ itens: EmendaEstadualDocumentoItem[] }>(`/api/v1/emendas-estaduais/${emendaId}/documentos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
};

export const updateEmendaEstadualDocumento = async (
  token: string,
  emendaId: number,
  documentoId: number,
  arquivo: File
) => {
  const formData = new FormData();
  formData.append("arquivo", arquivo);
  return request<EmendaEstadualDocumentoItem>(`/api/v1/emendas-estaduais/${emendaId}/documentos/${documentoId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
};

export const deleteEmendaEstadualDocumento = (token: string, emendaId: number, documentoId: number) =>
  request<void>(`/api/v1/emendas-estaduais/${emendaId}/documentos/${documentoId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

export const downloadEmendaEstadualDocumento = async (
  token: string,
  emendaId: number,
  documentoId: number,
  fallbackName = "documento"
) => {
  const authHeader = resolveAuthorizationHeader(token);
  const res = await fetch(buildUrl(`/api/v1/emendas-estaduais/${emendaId}/documentos/${documentoId}/download`), {
    headers: authHeader ? { Authorization: authHeader } : {},
    credentials: "include"
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fallbackName;
  link.click();
  URL.revokeObjectURL(url);
};

export const listGeneratedTemplateDocuments = (
  token: string,
  query?: {
    template_id?: number;
    proponente_id?: number;
    instrumento_id?: number;
    limit?: number;
  }
) =>
  request<{ items: GeneratedTemplateDocumentItem[] }>(
    "/api/v1/document-templates/generated/list",
    {
      headers: { Authorization: `Bearer ${token}` }
    },
    {
      template_id: query?.template_id ? String(query.template_id) : "",
      proponente_id: query?.proponente_id ? String(query.proponente_id) : "",
      instrumento_id: query?.instrumento_id ? String(query.instrumento_id) : "",
      limit: query?.limit ? String(query.limit) : ""
    }
  );

export const listDocumentTemplateVersions = (token: string, id: number) =>
  request<{ items: DocumentTemplateVersionItem[] }>(`/api/v1/document-templates/${id}/versions`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const downloadGeneratedTemplateDocument = async (
  token: string,
  id: number,
  format: "pdf" | "docx",
  fallbackName = `documento-gerado-${id}.${format}`
) => {
  const authHeader = resolveAuthorizationHeader(token);
  const res = await fetch(buildUrl(`/api/v1/document-templates/generated/${id}/export`, { format }), {
    headers: authHeader ? { Authorization: authHeader } : {},
    credentials: "include"
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fallbackName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const getSismobObras = (
  token: string,
  query: {
    uf: string;
    municipio: string;
    page?: number;
    page_size?: number;
  }
) =>
  request<SismobResponse>(
    "/api/v1/sismob-cidadao",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      uf: query.uf,
      municipio: query.municipio,
      page: query.page ? String(query.page) : "",
      page_size: query.page_size ? String(query.page_size) : ""
    }
  );

export const listDocumentoGeracaoTemplates = (token: string, query?: { status?: string; tipo?: string; q?: string }) =>
  request<{ items: DocumentoGeracaoTemplate[] }>(
    "/api/v1/documentos-geracao/templates",
    { headers: { Authorization: `Bearer ${token}` } },
    { status: query?.status ?? "", tipo: query?.tipo ?? "", q: query?.q ?? "" }
  );

export const getDocumentoGeracaoTemplate = (token: string, id: number) =>
  request<DocumentoGeracaoTemplate>(`/api/v1/documentos-geracao/templates/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const createDocumentoGeracaoTemplate = async (
  token: string,
  payload: { codigo: string; nome: string; descricao?: string; tipo?: string; arquivo: File }
) => {
  const formData = new FormData();
  formData.append("codigo", payload.codigo);
  formData.append("nome", payload.nome);
  if (payload.descricao) formData.append("descricao", payload.descricao);
  if (payload.tipo) formData.append("tipo", payload.tipo);
  formData.append("arquivo", payload.arquivo);

  return request<DocumentoGeracaoTemplate>("/api/v1/documentos-geracao/templates", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
};

export const updateDocumentoGeracaoTemplate = async (
  token: string,
  id: number,
  payload: Partial<{ nome: string; descricao: string; tipo: string; status: DocumentTemplateStatus; arquivo: File }>
) => {
  const formData = new FormData();
  if (payload.nome) formData.append("nome", payload.nome);
  if (payload.descricao) formData.append("descricao", payload.descricao);
  if (payload.tipo) formData.append("tipo", payload.tipo);
  if (payload.status) formData.append("status", payload.status);
  if (payload.arquivo) formData.append("arquivo", payload.arquivo);

  return request<DocumentoGeracaoTemplate>(`/api/v1/documentos-geracao/templates/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
};

export const deleteDocumentoGeracaoTemplate = (token: string, id: number) =>
  request<{ message: string }>(`/api/v1/documentos-geracao/templates/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

export const listDocumentoGeracaoresponsaveis = (token: string) =>
  request<{ items: DocumentoGeracaoResponsavel[] }>("/api/v1/documentos-geracao/responsaveis-tecnicos", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const createDocumentoGeracaoResponsavel = (
  token: string,
  payload: { nome: string; cpf: string; crea: string; cargo: string }
) =>
  request<DocumentoGeracaoResponsavel>("/api/v1/documentos-geracao/responsaveis-tecnicos", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const updateDocumentoGeracaoResponsavel = (
  token: string,
  id: number,
  payload: Partial<{ nome: string; crea: string; cargo: string }>
) =>
  request<DocumentoGeracaoResponsavel>(`/api/v1/documentos-geracao/responsaveis-tecnicos/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const deleteDocumentoGeracaoResponsavel = (token: string, id: number) =>
  request<{ message: string }>(`/api/v1/documentos-geracao/responsaveis-tecnicos/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

export const generateDocumentoGeracao = (
  token: string,
  payload: {
    instrumento_id: number;
    template_id: number;
    responsavel_tecnico_id?: number;
    titulo?: string;
    tipo_documento?: string;
    formato?: "docx" | "pdf";
  }
) =>
  request<{ id: number; titulo: string; urlPdf: string; urlDocx: string | null; dataGeracao: string }>(
    "/api/v1/documentos-geracao/gerar",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }
  );

export const listDocumentoGeracaoLogs = (token: string, query?: { instrumento_id?: number; template_id?: number }) =>
  request<{ items: DocumentoGeracaoLog[] }>(
    "/api/v1/documentos-geracao/documentos-log",
    { headers: { Authorization: `Bearer ${token}` } },
    {
      instrumento_id: query?.instrumento_id ? String(query.instrumento_id) : "",
      template_id: query?.template_id ? String(query.template_id) : ""
    }
  );

export const listDocumentoGeracaoLogsByInstrumento = (token: string, instrumentoId: number) =>
  request<{ items: DocumentoGeracaoLog[] }>(`/api/v1/documentos-geracao/documentos-log/instrumento/${instrumentoId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const downloadDocumentoGeracaoLog = async (
  token: string,
  id: number,
  format: "pdf" | "docx" = "pdf",
  fallbackName = `documento-${id}.${format}`
) => {
  const authHeader = resolveAuthorizationHeader(token);
  const res = await fetch(buildUrl(`/api/v1/documentos-geracao/documentos-log/${id}/download`, { formato: format }), {
    headers: authHeader ? { Authorization: authHeader } : {},
    credentials: "include"
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fallbackName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const getInstrumentoDados = (token: string, instrumentoId: number) =>
  request<InstrumentoDados>(`/api/v1/documentos-geracao/instrumento/${instrumentoId}/dados`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export type ConsultaCnpjResponse = {
  nome: string;
  nome_fantasia: string;
  situacao_cadastral: string;
  data_abertura: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  uf: string;
  cidade: string;
  pais: string;
  telefone: string;
  email: string;
};

export const consultaCnpj = (token: string, cnpj: string) =>
  request<ConsultaCnpjResponse>(`/api/v1/consulta-cnpj/${cnpj}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
