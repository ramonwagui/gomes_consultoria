import type { DocumentoAreaItem, DocumentoScanMonitor, DocumentoSearchItem } from "../types";
import { formatFileSize, renderSnippetHtml } from "./documentosAreaUtils";

type DocumentoTableItem = DocumentoAreaItem | DocumentoSearchItem;

type EditingDocument = {
  id: number;
  nome_atual: string;
};

type DocumentosTableProps = {
  documents: DocumentoTableItem[];
  scanMonitor: DocumentoScanMonitor | null;
  canManage: boolean;
  editing: EditingDocument | null;
  onChangeEditing: (editing: EditingDocument | null) => void;
  onSaveRename: () => void;
  onDownload: (doc: DocumentoTableItem) => void;
  onOpenAudit: (doc: DocumentoTableItem) => void;
  onReindex: (doc: DocumentoTableItem) => void;
  onDelete: (doc: DocumentoTableItem) => void;
};

export default function DocumentosTable({
  documents,
  scanMonitor,
  canManage,
  editing,
  onChangeEditing,
  onSaveRename,
  onDownload,
  onOpenAudit,
  onReindex,
  onDelete
}: DocumentosTableProps) {
  return (
    <div className="card table-card">
      <h3>Documentos</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Arquivo</th>
              <th>Origem</th>
              <th>Vinculo</th>
              <th>Upload</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  Nenhum documento encontrado.
                  {scanMonitor ? ` Pendentes em varredura: ${scanMonitor.queue.pendentes}.` : ""}
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <strong>#{doc.id}</strong>
                  </td>
                  <td>
                    {editing?.id === doc.id ? (
                      <div className="inline-edit">
                        <input
                          value={editing.nome_atual}
                          onChange={(event) => onChangeEditing({ id: doc.id, nome_atual: event.target.value })}
                        />
                        <button type="button" onClick={onSaveRename}>
                          Salvar
                        </button>
                      </div>
                    ) : (
                      <>
                        <strong>{doc.nome_atual}</strong>
                        <p className="subtitle">
                          {formatFileSize(doc.tamanho)} | {doc.indexacao?.status ?? "PENDENTE"}
                        </p>
                        <p className="subtitle">Scan: {doc.scan_status}</p>
                        {"trecho" in doc ? (
                          <p
                            className="document-snippet"
                            dangerouslySetInnerHTML={{ __html: renderSnippetHtml(String(doc.trecho)) }}
                          />
                        ) : null}
                      </>
                    )}
                  </td>
                  <td>
                    {doc.origem === "EXTERNO"
                      ? `Externo${doc.remetente_externo ? `: ${doc.remetente_externo.nome}` : ""}`
                      : "Interno"}
                  </td>
                  <td>
                    {doc.instrumento
                      ? `Instrumento ${doc.instrumento.instrumento}`
                      : doc.proponente
                        ? doc.proponente.nome
                        : "-"}
                  </td>
                  <td>
                    {new Date(doc.created_at).toLocaleString("pt-BR")}
                    <br />
                    <span className="subtitle">{doc.usuario.email}</span>
                  </td>
                  <td>
                    <div className="action-row compact">
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => onDownload(doc)}
                        title={doc.scan_status !== "LIMPO" ? "Download liberado somente apos scan LIMPO." : undefined}
                      >
                        Baixar
                      </button>
                      <button type="button" className="ghost" onClick={() => onOpenAudit(doc)}>
                        Ver auditoria
                      </button>
                      {canManage && doc.status === "ATIVO" ? (
                        <>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => onChangeEditing({ id: doc.id, nome_atual: doc.nome_atual })}
                          >
                            Renomear
                          </button>
                          <button type="button" className="ghost" onClick={() => onReindex(doc)}>
                            Reindexar
                          </button>
                          <button type="button" className="danger" onClick={() => onDelete(doc)}>
                            Excluir
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
