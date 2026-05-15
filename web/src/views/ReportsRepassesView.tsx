import { useMemo } from "react";
import type { RepasseReportResponse } from "../types";
import { buildRepasseReportViewModel } from "./reportsRepassesViewModel";

type ReportFilters = {
  proponente_id: string;
  instrumento_id: string;
  data_de: string;
  data_ate: string;
};

type ProponenteOption = {
  id: number;
  nome: string;
  cnpj: string;
};

type InstrumentOption = {
  id: number;
  instrumento: string;
  proposta: string;
};

type ReportsRepassesViewProps = {
  reportFilters: ReportFilters;
  onChangeProponente: (value: string) => void;
  onChangeInstrumento: (value: string) => void;
  onChangeDataDe: (value: string) => void;
  onChangeDataAte: (value: string) => void;
  proponentes: ProponenteOption[];
  reportInstrumentOptions: InstrumentOption[];
  isBusy: boolean;
  onApplyRepasseReportFilters: () => void;
  onClearRepasseReportFilters: () => void;
  reportData: RepasseReportResponse | null;
  exportRepasseReportCsv: (data: RepasseReportResponse) => void;
  exportRepasseReportExcel: (data: RepasseReportResponse) => void;
  onExportRepasseReportPdf: (mode: "executivo" | "analitico") => void;
  formatCurrency: (value: number) => string;
};

export default function ReportsRepassesView({
  reportFilters,
  onChangeProponente,
  onChangeInstrumento,
  onChangeDataDe,
  onChangeDataAte,
  proponentes,
  reportInstrumentOptions,
  isBusy,
  onApplyRepasseReportFilters,
  onClearRepasseReportFilters,
  reportData,
  exportRepasseReportCsv,
  exportRepasseReportExcel,
  onExportRepasseReportPdf,
  formatCurrency
}: ReportsRepassesViewProps) {
  const viewModel = useMemo(() => (reportData ? buildRepasseReportViewModel(reportData) : null), [reportData]);

  return (
    <>
      <div className="card filters-card">
        <h3>Relatorio de repasses por proponente</h3>
        <p className="subtitle">Consolide repasses, saldos e instrumentos por proponente em um unico painel de consulta e exportacao.</p>
        <div className="filters-grid columns-4">
          <label>
            Proponente *
            <select
              value={reportFilters.proponente_id}
              onChange={(e) => onChangeProponente(e.target.value)}
            >
              <option value="">Selecione</option>
              {proponentes.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.nome} ({item.cnpj})
                </option>
              ))}
            </select>
          </label>
          <label>
            Instrumento (opcional)
            <select
              value={reportFilters.instrumento_id}
              onChange={(e) => onChangeInstrumento(e.target.value)}
            >
              <option value="">Todos</option>
              {reportInstrumentOptions.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.instrumento} | proposta {item.proposta}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data de
            <input
              type="date"
              value={reportFilters.data_de}
              onChange={(e) => onChangeDataDe(e.target.value)}
            />
          </label>
          <label>
            Data ate
            <input
              type="date"
              value={reportFilters.data_ate}
              onChange={(e) => onChangeDataAte(e.target.value)}
            />
          </label>
        </div>

        <div className="report-toolbar">
          <div className="action-row compact">
            <button type="button" onClick={onApplyRepasseReportFilters} disabled={isBusy}>
              Gerar relatorio
            </button>
            <button type="button" className="secondary" onClick={onClearRepasseReportFilters}>
              Limpar filtros
            </button>
          </div>
          <div className="action-row compact report-export-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => reportData && exportRepasseReportCsv(reportData)}
              disabled={!reportData}
            >
              Exportar CSV
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => reportData && exportRepasseReportExcel(reportData)}
              disabled={!reportData}
            >
              Exportar Excel
            </button>
            <button type="button" className="secondary" onClick={() => onExportRepasseReportPdf("executivo")} disabled={!reportData}>
              Exportar PDF Executivo
            </button>
            <button type="button" className="secondary" onClick={() => onExportRepasseReportPdf("analitico")} disabled={!reportData}>
              Exportar PDF Analitico
            </button>
          </div>
        </div>
      </div>

      {!reportData ? (
        <div className="card table-card">
          <p className="subtitle">Defina os filtros acima e clique em gerar relatorio para visualizar os dados consolidados.</p>
        </div>
      ) : (
        <>
          <div className="report-kpi-grid">
            <div className="card kpi-card">
              <p className="eyebrow">Repassado no periodo</p>
              <h3>{formatCurrency(reportData.kpis.valor_repassado_periodo)}</h3>
            </div>
            <div className="card kpi-card">
              <p className="eyebrow">Qtd repasses</p>
              <h3>{reportData.kpis.quantidade_repasses}</h3>
            </div>
            <div className="card kpi-card">
              <p className="eyebrow">Saldo pactuado</p>
              <h3>{formatCurrency(reportData.kpis.saldo_pactuado)}</h3>
            </div>
            <div className="card kpi-card">
              <p className="eyebrow">% repassado</p>
              <h3>{reportData.kpis.percentual_repassado.toFixed(2)}%</h3>
            </div>
          </div>

          <div className="report-charts-grid">
            <div className="card">
              <h3>Evolucao mensal de repasses</h3>
              <div className="report-bars">
                {viewModel?.monthlyBars.length === 0 ? (
                  <p className="subtitle">Sem repasses no periodo.</p>
                ) : (
                  viewModel?.monthlyBars.map((item) => (
                    <div key={item.mes} className="report-bar-row">
                      <span>{item.mes}</span>
                      <div className="report-bar-track">
                        <div className="report-bar-fill" style={{ width: `${item.width}%` }} />
                      </div>
                      <strong>{formatCurrency(item.valor)}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card">
              <h3>Repasses por instrumento</h3>
              <div className="report-bars">
                {viewModel?.instrumentBars.length === 0 ? (
                  <p className="subtitle">Sem instrumentos no filtro.</p>
                ) : (
                  viewModel?.instrumentBars.map((item) => (
                    <div key={item.instrumento_id} className="report-bar-row">
                      <span>{item.instrumento}</span>
                      <div className="report-bar-track">
                        <div className="report-bar-fill secondary" style={{ width: `${item.width}%` }} />
                      </div>
                      <strong>{formatCurrency(item.valor)}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="card table-card">
            <h3>Instrumentos no relatorio</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Instrumento</th>
                    <th>Status</th>
                    <th>Orgao concedente</th>
                    <th>Banco</th>
                    <th>Agencia</th>
                    <th>Conta</th>
                    <th>Prestacao de contas</th>
                    <th>Empresa vencedora</th>
                    <th>Valor pactuado</th>
                    <th>Ja repassado</th>
                    <th>Saldo</th>
                    <th>% obra</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.instrumentos.length === 0 ? (
                    <tr>
                      <td colSpan={12}>Nenhum instrumento encontrado.</td>
                    </tr>
                  ) : (
                    reportData.instrumentos.map((item: any) => (
                      <tr key={item.id}>
                        <td>{item.instrumento}</td>
                        <td>{item.status}</td>
                        <td>{item.orgao_concedente}</td>
                        <td>{item.banco ?? "-"}</td>
                        <td>{item.agencia ?? "-"}</td>
                        <td>{item.conta ?? "-"}</td>
                        <td>{item.data_prestacao_contas ?? "-"}</td>
                        <td>{item.empresa_vencedora ?? "-"}</td>
                        <td>{formatCurrency(item.valor_pactuado)}</td>
                        <td>{formatCurrency(item.valor_ja_repassado)}</td>
                        <td>{formatCurrency(item.saldo_pactuado)}</td>
                        <td>{item.percentual_obra === null ? "-" : `${item.percentual_obra.toFixed(2)}%`}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card table-card">
            <h3>Lista de repasses</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Instrumento</th>
                    <th>Proposta</th>
                    <th>Empresa vencedora</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.repasses.length === 0 ? (
                    <tr>
                      <td colSpan={5}>Nenhum repasse encontrado no periodo.</td>
                    </tr>
                  ) : (
                    reportData.repasses.map((item: any) => (
                      <tr key={item.id}>
                        <td>{item.data_repasse}</td>
                        <td>{item.instrumento}</td>
                        <td>{item.proposta}</td>
                        <td>{item.empresa_vencedora ?? "-"}</td>
                        <td>{formatCurrency(item.valor_repasse)}</td>
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
  );
}
