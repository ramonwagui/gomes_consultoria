import type { DashboardKpi } from "./dashboardViewModel";

type DashboardViewProps = {
  role?: string;
  dashboardInsights: {
    totalRepassado: number;
    percentualMedioRepassado: number;
    usuarios: number;
    logs: number;
    emExecucao: number;
    prestacaoPendente: number;
    vencidos: number;
    alertasCriticos: Array<{
      instrumento_id: number;
      instrumento: string;
      dias_para_vigencia_fim: number;
      dias_para_prestacao_contas: number | null;
    }>;
    obrasComBaixoRepasse: Array<{
      id: number;
      instrumento: string;
      concedente: string;
      percentual_repassado: number;
    }>;
    porFluxo: Array<{
      fluxo: string;
      quantidade: number;
    }>;
    topConcedentes: Array<{
      concedente: string;
      quantidade: number;
    }>;
  };
  kpis: DashboardKpi[];
  isBusy: boolean;
  isAdmin: boolean;
  refreshData: () => void;
  onChangeView: (view: "instrumentos" | "relatorios" | "usuarios") => void;
};

export default function DashboardView({
  role,
  dashboardInsights,
  kpis,
  isBusy,
  isAdmin,
  refreshData,
  onChangeView
}: DashboardViewProps) {
  return (
    <section className="dashboard">
      <div className="card">
        <h3>Painel inicial {role ? `(${role})` : ""}</h3>
        <p className="subtitle">Resumo executivo para tomada de decisao rapida ao entrar no sistema.</p>
      </div>

      <div className="dashboard-kpi-grid">
        {kpis.map((item) => (
          <div className="card kpi-card" key={item.label}>
            <p className="eyebrow">{item.label}</p>
            <h3>{item.value}</h3>
          </div>
        ))}
      </div>

      <div className="dashboard-panels-grid">
        <div className="card">
          <h3>Prazos criticos (top 5)</h3>
          <div className="table-wrap table-wrap-compact">
            <table>
              <thead>
                <tr>
                  <th>Instrumento</th>
                  <th>Vigencia</th>
                  <th>Prestacao</th>
                </tr>
              </thead>
              <tbody>
                {dashboardInsights.alertasCriticos.length === 0 ? (
                  <tr>
                    <td colSpan={3}>Sem alertas criticos no momento.</td>
                  </tr>
                ) : (
                  dashboardInsights.alertasCriticos.map((item) => (
                    <tr key={item.instrumento_id}>
                      <td>{item.instrumento}</td>
                      <td>{item.dias_para_vigencia_fim} dias</td>
                      <td>{item.dias_para_prestacao_contas ?? "-"} dias</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>Obras com menor execucao financeira</h3>
          <div className="table-wrap table-wrap-compact">
            <table>
              <thead>
                <tr>
                  <th>Instrumento</th>
                  <th>Concedente</th>
                  <th>% repassado</th>
                </tr>
              </thead>
              <tbody>
                {dashboardInsights.obrasComBaixoRepasse.length === 0 ? (
                  <tr>
                    <td colSpan={3}>Sem obras para analise.</td>
                  </tr>
                ) : (
                  dashboardInsights.obrasComBaixoRepasse.map((item) => (
                    <tr key={item.id}>
                      <td>{item.instrumento}</td>
                      <td>{item.concedente}</td>
                      <td>{item.percentual_repassado.toFixed(2)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>Distribuicao por fluxo</h3>
          <div className="table-wrap table-wrap-compact">
            <table>
              <thead>
                <tr>
                  <th>Fluxo</th>
                  <th>Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {dashboardInsights.porFluxo.map((item) => (
                  <tr key={item.fluxo}>
                    <td>{item.fluxo}</td>
                    <td>{item.quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>Top concedentes</h3>
          <div className="table-wrap table-wrap-compact">
            <table>
              <thead>
                <tr>
                  <th>Concedente</th>
                  <th>Instrumentos</th>
                </tr>
              </thead>
              <tbody>
                {dashboardInsights.topConcedentes.length === 0 ? (
                  <tr>
                    <td colSpan={2}>Sem dados de concedente.</td>
                  </tr>
                ) : (
                  dashboardInsights.topConcedentes.map((item) => (
                    <tr key={item.concedente}>
                      <td>{item.concedente}</td>
                      <td>{item.quantidade}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Acoes rapidas</h3>
        <div className="action-row">
          <button type="button" onClick={() => refreshData()} disabled={isBusy}>
            Atualizar dashboard
          </button>
          <button type="button" className="secondary" onClick={() => onChangeView("instrumentos")}>
            Instrumentos
          </button>
          <button type="button" className="secondary" onClick={() => onChangeView("relatorios")}>
            Relatorios
          </button>
          {isAdmin && (
            <button type="button" className="secondary" onClick={() => onChangeView("usuarios")}>
              Usuarios
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
