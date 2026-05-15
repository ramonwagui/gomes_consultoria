export type DashboardKpi = {
  label: string;
  value: string | number;
};

type DashboardSummary = {
  totalRegistros: number;
  ativos: number;
  valorTotal: number;
  alertas: number;
};

type DashboardInsightsSummary = {
  totalRepassado: number;
  percentualMedioRepassado: number;
  usuarios: number;
  logs: number;
  emExecucao: number;
  prestacaoPendente: number;
  vencidos: number;
};

export const buildDashboardKpis = (
  role: string | undefined,
  dashboard: DashboardSummary,
  insights: DashboardInsightsSummary,
  formatCurrency: (value: number) => string
): DashboardKpi[] => {
  const baseKpis: DashboardKpi[] = [
    { label: "Instrumentos", value: dashboard.totalRegistros },
    { label: "Ativos", value: dashboard.ativos },
    { label: "Valor pactuado", value: formatCurrency(dashboard.valorTotal) },
    { label: "Valor ja repassado", value: formatCurrency(insights.totalRepassado) },
    { label: "% medio repassado", value: `${insights.percentualMedioRepassado.toFixed(2)}%` },
    { label: "Alertas de prazo", value: dashboard.alertas }
  ];

  if (role === "ADMIN") {
    return [
      ...baseKpis,
      { label: "Usuarios cadastrados", value: insights.usuarios },
      { label: "Logs auditoria", value: insights.logs }
    ];
  }

  if (role === "GESTOR") {
    return [
      ...baseKpis,
      { label: "Em execucao", value: insights.emExecucao },
      { label: "Prestacao pendente", value: insights.prestacaoPendente }
    ];
  }

  return [
    ...baseKpis,
    { label: "Vencidos", value: insights.vencidos },
    { label: "Em execucao", value: insights.emExecucao }
  ];
};
