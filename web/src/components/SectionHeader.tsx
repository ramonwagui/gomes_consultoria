type SectionHeaderProps = {
  title: string;
  subtitle: string;
  healthStatus: "checking" | "ok" | "error";
};

export default function SectionHeader({ title, subtitle, healthStatus }: SectionHeaderProps) {
  return (
    <header className="card topbar">
      <div>
        <h2>{title}</h2>
        <p className="subtitle">{subtitle}</p>
      </div>
      <div className={`health health-${healthStatus}`}>
        API: {healthStatus === "checking" ? "verificando" : healthStatus === "ok" ? "online" : "offline"}
      </div>
    </header>
  );
}
