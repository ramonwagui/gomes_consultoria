import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  createDocumentoExternalRequest,
  deactivateDocumentoExternalRequest,
  deleteAreaDocumento,
  downloadAreaDocumento,
  getDocumentoScanMonitor,
  listConvenetes,
  listAreaDocumentoAuditLogs,
  listDocumentosByExternalRequest,
  listAreaDocumentos,
  listDocumentoExternalRequests,
  listInstruments,
  reindexAreaDocumento,
  resendDocumentoExternalRequest,
  searchAreaDocumentos,
  updateAreaDocumento,
  updateDocumentoExternalRequestExpiration,
  uploadAreaDocumentoFile
} from "../api";
import type {
  DocumentoAreaItem,
  DocumentoAuditAction,
  DocumentoAuditLogItem,
  DocumentoExternalRequestItem,
  DocumentoScanMonitor,
  DocumentoSearchItem,
  Instrument,
  InstrumentFilters,
  Proponente
} from "../types";
import {
  formatFileSize,
  getDocumentoExternalStatusLabel,
  toDatetimeLocalValue,
  toExternalPublicUrl as buildExternalPublicUrl
} from "./documentosAreaUtils";
import DocumentosTable from "./DocumentosTable";

type Props = {
  token: string;
  canManage: boolean;
  onMessage: (message: string) => void;
};

type UploadRow = {
  name: string;
  progress: number;
  status: "aguardando" | "enviando" | "ok" | "erro";
  message: string;
};

const AUDIT_ACTIONS: DocumentoAuditAction[] = [
  "UPLOAD",
  "DOWNLOAD",
  "EXCLUSAO",
  "RENOMEACAO",
  "ALTERACAO",
  "ENVIO_EXTERNO",
  "SCAN_INICIADO",
  "SCAN_LIMPO",
  "SCAN_INFECTADO",
  "SCAN_ERRO"
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const toExternalPublicUrl = (value: string) => {
  return buildExternalPublicUrl(value, API_BASE_URL, window.location.origin);
};

export default function DocumentosAreaView({ token, canManage, onMessage }: Props) {
  const [tab, setTab] = useState<"documentos" | "auditoria" | "links">("documentos");
  const [documents, setDocuments] = useState<DocumentoAreaItem[]>([]);
  const [searchResults, setSearchResults] = useState<DocumentoSearchItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<DocumentoAuditLogItem[]>([]);
  const [links, setLinks] = useState<DocumentoExternalRequestItem[]>([]);
  const [externalDocumentsModal, setExternalDocumentsModal] = useState<{
    link: DocumentoExternalRequestItem;
    documents: DocumentoAreaItem[];
  } | null>(null);
  const [expirationModal, setExpirationModal] = useState<{
    link: DocumentoExternalRequestItem;
    permanente: boolean;
    expira_em: string;
  } | null>(null);
  const [proponentes, setProponentes] = useState<Proponente[]>([]);
  const [instrumentos, setInstrumentos] = useState<Instrument[]>([]);
  const [scanMonitor, setScanMonitor] = useState<DocumentoScanMonitor | null>(null);
  const [downloadErrorModal, setDownloadErrorModal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ instrumento_id: "", proponente_id: "", data_de: "", data_ate: "" });
  const [auditFilters, setAuditFilters] = useState({
    documento_id: "",
    usuario_id: "",
    arquivo: "",
    acao: "" as DocumentoAuditAction | "",
    data_de: "",
    data_ate: ""
  });
  const [uploadRows, setUploadRows] = useState<UploadRow[]>([]);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadLinks, setUploadLinks] = useState({ instrumento_id: "", proponente_id: "" });
  const [editing, setEditing] = useState<{ id: number; nome_atual: string } | null>(null);
  const [externalForm, setExternalForm] = useState({
    titulo: "",
    descricao: "",
    permanente: false,
    expira_em: "",
    permitir_reenvio: false,
    max_usos: "1"
  });

  const visibleDocuments = useMemo(() => (query.trim().length >= 2 ? searchResults : documents), [documents, query, searchResults]);
  const uploadInstrumentOptions = useMemo(() => {
    if (!uploadLinks.proponente_id) {
      return instrumentos;
    }
    const proponenteId = Number(uploadLinks.proponente_id);
    return instrumentos.filter((item) => (item.proponente_id ?? item.convenete_id) === proponenteId);
  }, [instrumentos, uploadLinks.proponente_id]);
  const filterInstrumentOptions = useMemo(() => {
    if (!filters.proponente_id) {
      return instrumentos;
    }
    const proponenteId = Number(filters.proponente_id);
    return instrumentos.filter((item) => (item.proponente_id ?? item.convenete_id) === proponenteId);
  }, [filters.proponente_id, instrumentos]);

  const loadSelectorData = async () => {
    const emptyInstrumentFilters: InstrumentFilters = {
      status: "",
      concedente: "",
      proponente_id: "",
      ativo: "true" as const,
      vigencia_de: "",
      vigencia_ate: "",
      sync_repasses_desembolsos: "false" as const
    };
    const [proponentesResponse, activeInstruments, inactiveInstruments] = await Promise.all([
      listConvenetes(token),
      listInstruments(token, emptyInstrumentFilters),
      listInstruments(token, { ...emptyInstrumentFilters, ativo: "false" })
    ]);
    const byId = new Map<number, Instrument>();
    [...activeInstruments, ...inactiveInstruments].forEach((item) => byId.set(item.id, item));
    setProponentes(proponentesResponse);
    setInstrumentos(Array.from(byId.values()).sort((a, b) => a.instrumento.localeCompare(b.instrumento, "pt-BR")));
  };

  const loadDocuments = async () => {
    const response = await listAreaDocumentos(token, { ...filters, q: query.trim().length < 2 ? query : "" });
    setDocuments(response.itens);
  };

  const loadAudit = async () => {
    const response = await listAreaDocumentoAuditLogs(token, auditFilters);
    setAuditLogs(response.itens);
  };

  const loadAuditFromForm = async (event: FormEvent) => {
    event.preventDefault();
    const documentoId = auditFilters.documento_id.trim();
    if (documentoId && !/^\d+$/.test(documentoId)) {
      onMessage("Documento ID aceita apenas numeros. Para buscar por texto, use o campo Arquivo.");
      return;
    }
    await loadAudit();
  };

  const loadLinks = async () => {
    const response = await listDocumentoExternalRequests(token);
    setLinks(response.itens);
  };

  const openExternalDocuments = async (link: DocumentoExternalRequestItem) => {
    setIsLoading(true);
    try {
      const response = await listDocumentosByExternalRequest(token, link.id);
      setExternalDocumentsModal({ link, documents: response.itens });
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Falha ao carregar documentos recebidos.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyExternalLink = async (link: DocumentoExternalRequestItem, message = "Link copiado.") => {
    const publicUrl = toExternalPublicUrl(link.link_publico);
    try {
      await navigator.clipboard.writeText(publicUrl);
      onMessage(message);
    } catch {
      window.prompt("Copie o link abaixo:", publicUrl);
    }
  };

  const onResendExternalLink = async (link: DocumentoExternalRequestItem) => {
    setIsLoading(true);
    try {
      const updated = await resendDocumentoExternalRequest(token, link.id);
      await copyExternalLink(updated, "Link preparado para reenvio e copiado.");
      const publicUrl = toExternalPublicUrl(updated.link_publico);
      const subject = encodeURIComponent(`Solicitacao de documentos - ${updated.titulo}`);
      const body = encodeURIComponent(`Segue o link para envio dos documentos solicitados:\n\n${publicUrl}`);
      window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
      await loadLinks();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Falha ao preparar reenvio do link.");
    } finally {
      setIsLoading(false);
    }
  };

  const openExpirationModal = (link: DocumentoExternalRequestItem) => {
    setExpirationModal({
      link,
      permanente: !link.expira_em,
      expira_em: toDatetimeLocalValue(link.expira_em)
    });
  };

  const onSaveExternalExpiration = async (event: FormEvent) => {
    event.preventDefault();
    if (!expirationModal) {
      return;
    }

    const nextDate = expirationModal.permanente ? null : new Date(expirationModal.expira_em);
    if (!expirationModal.permanente && !expirationModal.expira_em) {
      onMessage("Informe a data de expiracao ou marque como permanente.");
      return;
    }
    if (nextDate && Number.isNaN(nextDate.getTime())) {
      onMessage("Data de expiracao invalida.");
      return;
    }
    const expiraEm = nextDate ? nextDate.toISOString() : null;
    setIsLoading(true);
    try {
      await updateDocumentoExternalRequestExpiration(token, expirationModal.link.id, {
        permanente: expirationModal.permanente,
        expira_em: expiraEm
      });
      setExpirationModal(null);
      await loadLinks();
      onMessage("Expiracao do link atualizada.");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Falha ao atualizar expiracao.");
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    setIsLoading(true);
    try {
      if (tab === "auditoria") {
        await loadAudit();
      } else if (tab === "links") {
        await loadLinks();
      } else {
        await Promise.all([loadDocuments(), getDocumentoScanMonitor(token).then(setScanMonitor).catch(() => null)]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh().catch((error) => onMessage(error instanceof Error ? error.message : "Falha ao carregar documentos."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab !== "documentos") {
      return;
    }

    const trimmedQuery = query.trim();
    const timeoutId = window.setTimeout(() => {
      if (trimmedQuery.length >= 2) {
        searchAreaDocumentos(token, trimmedQuery)
          .then((response) => setSearchResults(response.itens))
          .catch((error) => onMessage(error instanceof Error ? error.message : "Falha ao buscar documentos."));
        return;
      }

      setSearchResults([]);
      loadDocuments().catch((error) =>
        onMessage(error instanceof Error ? error.message : "Falha ao carregar documentos.")
      );
    }, 350);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filters.instrumento_id, filters.proponente_id, filters.data_de, filters.data_ate, tab, token]);

  useEffect(() => {
    loadSelectorData().catch((error) =>
      onMessage(error instanceof Error ? error.message : "Falha ao carregar proponentes e instrumentos.")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      if (query.trim().length >= 2) {
        const response = await searchAreaDocumentos(token, query.trim());
        setSearchResults(response.itens);
      } else {
        setSearchResults([]);
        await loadDocuments();
      }
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Falha ao buscar documentos.");
    } finally {
      setIsLoading(false);
    }
  };

  const openAuditForDocument = (doc: DocumentoAreaItem) => {
    setAuditFilters((prev) => ({ ...prev, documento_id: String(doc.id) }));
    setTab("auditoria");
    onMessage(`Auditoria filtrada pelo documento #${doc.id}.`);
  };

  const onPickFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setUploadFiles(files);
    setUploadRows(files.map((file) => ({ name: file.name, progress: 0, status: "aguardando", message: "" })));
  };

  const updateUploadRow = (index: number, patch: Partial<UploadRow>) => {
    setUploadRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const onUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (uploadFiles.length === 0) {
      onMessage("Selecione ao menos um arquivo.");
      return;
    }
    for (let index = 0; index < uploadFiles.length; index += 1) {
      const file = uploadFiles[index];
      updateUploadRow(index, { status: "enviando", progress: 1, message: "" });
      try {
        await uploadAreaDocumentoFile(token, file, uploadLinks, (progress) => updateUploadRow(index, { progress }));
        updateUploadRow(index, { status: "ok", progress: 100, message: "Enviado" });
      } catch (error) {
        updateUploadRow(index, {
          status: "erro",
          message: error instanceof Error ? error.message : "Falha ao enviar"
        });
      }
    }
    await loadDocuments();
    onMessage("Processamento de upload concluido.");
  };

  const onSaveRename = async () => {
    if (!editing) {
      return;
    }
    try {
      await updateAreaDocumento(token, editing.id, { nome_atual: editing.nome_atual });
      setEditing(null);
      await loadDocuments();
      onMessage("Documento atualizado.");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Falha ao atualizar documento.");
    }
  };

  const notifyDownloadError = (error: unknown) => {
    const message = error instanceof Error ? error.message : "Falha ao baixar documento.";
    onMessage(message);
    setDownloadErrorModal(message);
  };

  const onDelete = async (doc: DocumentoAreaItem) => {
    if (!window.confirm(`Excluir logicamente "${doc.nome_atual}"?`)) {
      return;
    }
    try {
      await deleteAreaDocumento(token, doc.id);
      await loadDocuments();
      onMessage("Documento excluido logicamente.");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Falha ao excluir documento.");
    }
  };

  const onReindex = async (doc: DocumentoAreaItem) => {
    try {
      await reindexAreaDocumento(token, doc.id);
      await loadDocuments();
      onMessage("Documento reindexado.");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Falha ao reindexar documento.");
    }
  };

  const onCreateLink = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await createDocumentoExternalRequest(token, {
        titulo: externalForm.titulo,
        descricao: externalForm.descricao,
        permanente: externalForm.permanente,
        expira_em: externalForm.permanente || !externalForm.expira_em ? null : new Date(externalForm.expira_em).toISOString(),
        permitir_reenvio: externalForm.permitir_reenvio,
        max_usos: Math.max(1, Number(externalForm.max_usos || "1"))
      });
      setExternalForm({ titulo: "", descricao: "", permanente: false, expira_em: "", permitir_reenvio: false, max_usos: "1" });
      await loadLinks();
      onMessage("Link externo criado.");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Falha ao criar link externo.");
    }
  };

  return (
    <section className="dashboard documents-area-view">
      <div className="segmented-tabs">
        <button type="button" className={tab === "documentos" ? "active" : ""} onClick={() => setTab("documentos")}>
          Documentos
        </button>
        <button type="button" className={tab === "auditoria" ? "active" : ""} onClick={() => setTab("auditoria")}>
          Auditoria
        </button>
        <button type="button" className={tab === "links" ? "active" : ""} onClick={() => setTab("links")}>
          Links externos
        </button>
      </div>

      {tab === "documentos" ? (
        <>
          {canManage ? (
            <form className="card documents-upload-card" onSubmit={onUpload}>
              <h3>Upload de documentos</h3>
              <div className="filters-grid columns-4">
                <label>
                  Proponente
                  <select
                    value={uploadLinks.proponente_id}
                    onChange={(e) =>
                      setUploadLinks((prev) => ({ ...prev, proponente_id: e.target.value, instrumento_id: "" }))
                    }
                  >
                    <option value="">Sem proponente</option>
                    {proponentes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome} {item.cnpj ? `- ${item.cnpj}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Instrumento
                  <select
                    value={uploadLinks.instrumento_id}
                    onChange={(e) => setUploadLinks((prev) => ({ ...prev, instrumento_id: e.target.value }))}
                  >
                    <option value="">Sem instrumento</option>
                    {uploadInstrumentOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.instrumento} - {item.proposta}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Arquivos
                  <input type="file" multiple onChange={onPickFiles} accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" />
                </label>
              </div>
              <div className="action-row">
                <button type="submit" disabled={isLoading || uploadFiles.length === 0}>
                  Enviar arquivos
                </button>
              </div>
              {uploadRows.length > 0 ? (
                <div className="upload-progress-list">
                  {uploadRows.map((row) => (
                    <div key={row.name} className={`upload-progress-row ${row.status}`}>
                      <span>{row.name}</span>
                      <progress max={100} value={row.progress} />
                      <small>{row.message || `${row.progress}%`}</small>
                    </div>
                  ))}
                </div>
              ) : null}
            </form>
          ) : null}

          <form className="card filters-card" onSubmit={onSearch}>
            <h3>Localizar documentos</h3>
            <div className="filters-grid columns-4">
              <label>
                Palavra ou nome
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar no conteudo ou nome" />
              </label>
              <label>
                Proponente
                <select
                  value={filters.proponente_id}
                  onChange={(e) => setFilters((prev) => ({ ...prev, proponente_id: e.target.value, instrumento_id: "" }))}
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
                Instrumento
                <select
                  value={filters.instrumento_id}
                  onChange={(e) => setFilters((prev) => ({ ...prev, instrumento_id: e.target.value }))}
                >
                  <option value="">Todos</option>
                  {filterInstrumentOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.instrumento} - {item.proposta}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Periodo de
                <input type="date" value={filters.data_de} onChange={(e) => setFilters((prev) => ({ ...prev, data_de: e.target.value }))} />
              </label>
            </div>
            <div className="action-row">
              <button type="submit" disabled={isLoading}>
                Buscar
              </button>
              <button type="button" className="ghost" onClick={() => refresh()}>
                Atualizar
              </button>
            </div>
          </form>

          {scanMonitor ? (
            <div className="card">
              <h3>Monitor de varredura</h3>
              <p className="subtitle">
                Worker: {scanMonitor.worker_enabled ? "Ativo" : "Desativado"} | Execucao: {scanMonitor.is_running ? "Em andamento" : "Ocioso"}
              </p>
              <p className="subtitle">
                Fila - Pendentes: {scanMonitor.queue.pendentes} | Processando: {scanMonitor.queue.processando} | Infectados: {scanMonitor.queue.infectados} | Erros: {scanMonitor.queue.erros_scan}
              </p>
              <p className="subtitle">
                Ultimo ciclo: {scanMonitor.last_cycle_at ? new Date(scanMonitor.last_cycle_at).toLocaleString("pt-BR") : "ainda nao executado"}
              </p>
              {scanMonitor.last_error ? <p className="subtitle" style={{ color: "#9b2c2c" }}>Ultimo erro: {scanMonitor.last_error}</p> : null}
            </div>
          ) : null}

          <DocumentosTable
            documents={visibleDocuments}
            scanMonitor={scanMonitor}
            canManage={canManage}
            editing={editing}
            onChangeEditing={setEditing}
            onSaveRename={onSaveRename}
            onDownload={(doc) => {
              downloadAreaDocumento(token, doc.id, doc.nome_atual).catch(notifyDownloadError);
            }}
            onOpenAudit={openAuditForDocument}
            onReindex={onReindex}
            onDelete={onDelete}
          />
        </>
      ) : tab === "auditoria" ? (
        <>
          <form className="card filters-card" onSubmit={(event) => { loadAuditFromForm(event).catch((error) => onMessage(error.message)); }}>
            <h3>Historico de auditoria</h3>
            <div className="filters-grid columns-4">
              <label>Documento ID<input inputMode="numeric" pattern="[0-9]*" placeholder="Ex.: 14" value={auditFilters.documento_id} onChange={(e) => setAuditFilters((prev) => ({ ...prev, documento_id: e.target.value }))} /></label>
              <label>Arquivo<input value={auditFilters.arquivo} onChange={(e) => setAuditFilters((prev) => ({ ...prev, arquivo: e.target.value }))} /></label>
              <label>Acao<select value={auditFilters.acao} onChange={(e) => setAuditFilters((prev) => ({ ...prev, acao: e.target.value as DocumentoAuditAction | "" }))}><option value="">Todas</option>{AUDIT_ACTIONS.map((action) => <option key={action} value={action}>{action}</option>)}</select></label>
              <label>Periodo de<input type="date" value={auditFilters.data_de} onChange={(e) => setAuditFilters((prev) => ({ ...prev, data_de: e.target.value }))} /></label>
            </div>
            <div className="action-row"><button type="submit">Filtrar</button></div>
          </form>
          <div className="card table-card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Data</th><th>Doc. ID</th><th>Acao</th><th>Arquivo</th><th>Usuario</th><th>IP</th></tr></thead>
                <tbody>{auditLogs.length === 0 ? <tr><td colSpan={6}>Sem registros.</td></tr> : auditLogs.map((log) => (
                  <tr key={log.id}><td>{new Date(log.created_at).toLocaleString("pt-BR")}</td><td>{log.documento_id ? `#${log.documento_id}` : "-"}</td><td>{log.acao}</td><td>{log.arquivo_nome}</td><td>{log.usuario.nome || log.usuario.email}</td><td>{log.ip ?? "-"}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {canManage ? (
            <form className="card filters-card" onSubmit={onCreateLink}>
              <h3>Novo link externo</h3>
              <div className="filters-grid columns-4">
                <label>Titulo<input value={externalForm.titulo} onChange={(e) => setExternalForm((prev) => ({ ...prev, titulo: e.target.value }))} required /></label>
                <label>Expira em<input type="datetime-local" value={externalForm.expira_em} onChange={(e) => setExternalForm((prev) => ({ ...prev, expira_em: e.target.value }))} disabled={externalForm.permanente} /></label>
                <label>
                  Maximo de envios
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={externalForm.max_usos}
                    onChange={(e) => setExternalForm((prev) => ({ ...prev, max_usos: e.target.value }))}
                  />
                </label>
                <label className="checkbox-label"><input type="checkbox" checked={externalForm.permanente} onChange={(e) => setExternalForm((prev) => ({ ...prev, permanente: e.target.checked }))} /> Permanente</label>
                <label className="checkbox-label"><input type="checkbox" checked={externalForm.permitir_reenvio} onChange={(e) => setExternalForm((prev) => ({ ...prev, permitir_reenvio: e.target.checked }))} /> Permitir reenvio</label>
              </div>
              <label>Descricao<textarea rows={2} value={externalForm.descricao} onChange={(e) => setExternalForm((prev) => ({ ...prev, descricao: e.target.value }))} /></label>
              <div className="action-row"><button type="submit">Criar link</button></div>
            </form>
          ) : null}
          <div className="card table-card">
            <h3>Links externos</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Solicitacao</th><th>Status</th><th>Link</th><th>Uso</th><th>Recebidos</th><th>Acoes</th></tr></thead>
                <tbody>{links.length === 0 ? <tr><td colSpan={6}>Nenhum link criado.</td></tr> : links.map((link) => (
                  <tr key={link.id}>
                    <td><strong>{link.titulo}</strong><p className="subtitle">{link.expira_em ? new Date(link.expira_em).toLocaleString("pt-BR") : "Permanente"}</p></td>
                    <td>{getDocumentoExternalStatusLabel(link.status, link)}</td>
                    <td>
                      <div className="inline-edit">
                        <input readOnly value={toExternalPublicUrl(link.link_publico)} onFocus={(e) => e.currentTarget.select()} />
                        <button type="button" className="ghost" onClick={() => copyExternalLink(link)}>
                          Copiar
                        </button>
                      </div>
                    </td>
                    <td>
                      <strong>
                        {link.usos_atuais}/{link.max_usos}
                      </strong>
                      <p className="subtitle">Restantes: {link.usos_restantes}</p>
                    </td>
                    <td>{link.documentos_recebidos}</td>
                    <td>
                      <div className="action-row compact">
                        <button type="button" className="ghost" onClick={() => openExternalDocuments(link)} disabled={link.documentos_recebidos === 0 || isLoading}>
                          Ver documentos
                        </button>
                        {canManage ? (
                          <button type="button" className="ghost" onClick={() => onResendExternalLink(link)} disabled={link.status === "DESATIVADO" || link.status === "EXPIRADO" || isLoading}>
                            Reenviar
                          </button>
                        ) : null}
                        {canManage ? (
                          <button type="button" className="ghost" onClick={() => openExpirationModal(link)} disabled={isLoading}>
                            Alterar expiracao
                          </button>
                        ) : null}
                        {canManage && link.status === "ATIVO" ? <button type="button" className="danger" onClick={() => deactivateDocumentoExternalRequest(token, link.id).then(loadLinks)}>Desativar</button> : null}
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {expirationModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setExpirationModal(null)}>
          <form className="modal-content expiration-modal" onSubmit={onSaveExternalExpiration} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Alterar expiracao</h3>
                <p className="subtitle">{expirationModal.link.titulo}</p>
              </div>
              <button type="button" className="close-btn" onClick={() => setExpirationModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="expiration-summary">
                <span>Status atual</span>
                <strong>{getDocumentoExternalStatusLabel(expirationModal.link.status, expirationModal.link)}</strong>
              </div>
              <div className="form-grid columns-2 expiration-form-grid">
                <label>
                  Nova expiracao
                  <input
                    type="datetime-local"
                    value={expirationModal.expira_em}
                    disabled={expirationModal.permanente}
                    onChange={(event) => setExpirationModal((prev) => (prev ? { ...prev, expira_em: event.target.value } : prev))}
                  />
                </label>
                <label className="checkbox-label expiration-checkbox">
                  <input
                    type="checkbox"
                    checked={expirationModal.permanente}
                    onChange={(event) =>
                      setExpirationModal((prev) =>
                        prev ? { ...prev, permanente: event.target.checked, expira_em: event.target.checked ? "" : prev.expira_em } : prev
                      )
                    }
                  />
                  Link permanente
                </label>
              </div>
              <p className="subtitle">
                Use uma data futura para manter o link disponivel ate o prazo informado, ou marque como permanente para remover a expiracao.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary" onClick={() => setExpirationModal(null)} disabled={isLoading}>
                Cancelar
              </button>
              <button type="submit" disabled={isLoading}>
                Salvar expiracao
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {downloadErrorModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setDownloadErrorModal(null)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Download indisponivel</h3>
              <button type="button" className="close-btn" onClick={() => setDownloadErrorModal(null)}>x</button>
            </div>
            <div className="modal-body">
              <p>{downloadErrorModal}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary" onClick={() => setDownloadErrorModal(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {externalDocumentsModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content documents-received-modal">
            <div className="modal-header">
              <h3>Documentos recebidos - {externalDocumentsModal.link.titulo}</h3>
              <button type="button" className="close-btn" onClick={() => setExternalDocumentsModal(null)}>x</button>
            </div>
            <div className="modal-body">
              {externalDocumentsModal.documents.length === 0 ? (
                <p className="subtitle">Nenhum documento recebido para esta solicitacao.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Arquivo</th>
                        <th>Enviado por</th>
                        <th>CPF</th>
                        <th>Data</th>
                        <th>Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {externalDocumentsModal.documents.map((doc) => (
                        <tr key={doc.id}>
                          <td>#{doc.id}</td>
                          <td><strong>{doc.nome_atual}</strong><br /><span className="subtitle">{formatFileSize(doc.tamanho)} | {doc.indexacao?.status ?? "PENDENTE"}</span></td>
                          <td>{doc.remetente_externo?.nome ?? doc.usuario.nome ?? doc.usuario.email}</td>
                          <td>{doc.remetente_externo?.cpf ?? "-"}</td>
                          <td>{new Date(doc.created_at).toLocaleString("pt-BR")}</td>
                          <td>
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => downloadAreaDocumento(token, doc.id, doc.nome_atual).catch(notifyDownloadError)}
                            >
                              Baixar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary" onClick={() => setExternalDocumentsModal(null)}>Fechar</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
