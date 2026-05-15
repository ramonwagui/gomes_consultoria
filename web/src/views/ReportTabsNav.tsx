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

type ReportTabsNavProps = {
  relatorioTab: RelatorioTab;
  setRelatorioTab: (tab: RelatorioTab) => void;
};

type TabGroup = "principal" | "simec";

type TabItem = {
  id: RelatorioTab;
  label: string;
  group: TabGroup;
  icon: "repasses" | "obras" | "instrumentos" | "tickets" | "transparencia" | "transferencias" | "fns" | "consulta" | "simec_obras" | "simec_termos" | "extracao" | "sismob";
};

const TAB_ITEMS: TabItem[] = [
  { id: "repasses", label: "Repasses", group: "principal", icon: "repasses" },
  { id: "obras", label: "Obras", group: "principal", icon: "obras" },
  { id: "andamento_instrumentos", label: "Instrumentos", group: "principal", icon: "instrumentos" },
  { id: "tickets", label: "Tickets", group: "principal", icon: "tickets" },
  { id: "transparencia", label: "Transparencia", group: "principal", icon: "transparencia" },
  { id: "transferencias_discricionarias", label: "Transf.", group: "principal", icon: "transferencias" },
  { id: "fns_repasses", label: "FNS Repasses", group: "principal", icon: "fns" },
  { id: "consultafns_propostas", label: "Consulta FNS", group: "principal", icon: "consulta" },
  { id: "simec_obras", label: "SIMEC Obras", group: "simec", icon: "simec_obras" },
  { id: "simec_termos", label: "SIMEC Termos", group: "simec", icon: "simec_termos" },
  { id: "extracao_simec", label: "Extracao SIMEC", group: "simec", icon: "extracao" },
  { id: "sismob", label: "SISMOB", group: "simec", icon: "sismob" }
];

const Icon = ({ kind }: { kind: TabItem["icon"] }) => {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true
  };

  switch (kind) {
    case "repasses":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h10" />
          <path d="m16 15 2 2 4-4" />
        </svg>
      );
    case "obras":
      return (
        <svg {...common}>
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V6h8v4M8 15h8M12 15v5" />
        </svg>
      );
    case "instrumentos":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );
    case "tickets":
      return (
        <svg {...common}>
          <path d="M3 9a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2Z" />
          <path d="M9 9v6M15 9v6" />
        </svg>
      );
    case "transparencia":
      return (
        <svg {...common}>
          <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "transferencias":
      return (
        <svg {...common}>
          <path d="m7 7 4-4 4 4M11 3v12M17 17l-4 4-4-4M13 21V9" />
        </svg>
      );
    case "fns":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 10.5a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 17h.01" />
        </svg>
      );
    case "consulta":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    case "simec_obras":
      return (
        <svg {...common}>
          <path d="M4 20h16M6 20V8h12v12M9 8V4h6v4" />
        </svg>
      );
    case "simec_termos":
      return (
        <svg {...common}>
          <path d="M7 3h8l4 4v14H7z" />
          <path d="M15 3v4h4M10 13h6M10 17h6" />
        </svg>
      );
    case "extracao":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="6" rx="7" ry="3" />
          <path d="M5 6v8c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
          <path d="M5 10c0 1.7 3.1 3 7 3s7-1.3 7-3" />
        </svg>
      );
    case "sismob":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path d="M9 8h6M8 12h8M10 16h4" />
        </svg>
      );
    default:
      return null;
  }
};

export default function ReportTabsNav({ relatorioTab, setRelatorioTab }: ReportTabsNavProps) {
  if (relatorioTab === "transferencias_especiais") {
    return null;
  }

  const principalTabs = TAB_ITEMS.filter((item) => item.group === "principal");
  const simecTabs = TAB_ITEMS.filter((item) => item.group === "simec");

  return (
    <div className="report-tabs-nav">
      <div className="report-tabs-group">
        <div className="report-tabs-grid">
          {principalTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={relatorioTab === item.id ? "report-tab-pill active" : "report-tab-pill"}
              onClick={() => setRelatorioTab(item.id)}
            >
              <span className="report-tab-icon">
                <Icon kind={item.icon} />
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="report-tabs-group">
        <p className="report-tabs-group-title">SIMEC &amp; SISMOB</p>
        <div className="report-tabs-grid">
          {simecTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={relatorioTab === item.id ? "report-tab-pill active" : "report-tab-pill"}
              onClick={() => setRelatorioTab(item.id)}
            >
              <span className="report-tab-icon">
                <Icon kind={item.icon} />
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
