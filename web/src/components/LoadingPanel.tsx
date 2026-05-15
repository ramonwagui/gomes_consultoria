type LoadingPanelProps = {
  title: string;
  description?: string;
  compact?: boolean;
};

export default function LoadingPanel({ title, description, compact = false }: LoadingPanelProps) {
  return (
    <section className={`card loading-panel${compact ? " loading-panel-compact" : ""}`} aria-live="polite" aria-busy="true">
      <div className="loading-panel-head">
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="loading-skeleton-grid" aria-hidden="true">
        <span className="loading-skeleton loading-skeleton-lg" />
        <span className="loading-skeleton" />
        <span className="loading-skeleton" />
      </div>
    </section>
  );
}
