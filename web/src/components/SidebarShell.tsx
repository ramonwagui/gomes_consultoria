import { ReactNode } from "react";

type SidebarShellProps = {
  logoSrc: string;
  children: ReactNode;
  footer: ReactNode;
};

export default function SidebarShell({ logoSrc, children, footer }: SidebarShellProps) {
  return (
    <aside className="card sidebar">
      <img className="sidebar-logo" src={logoSrc} alt="Gestconv360" />
      <p className="eyebrow">Menu</p>
      {children}
      <div className="sidebar-footer">{footer}</div>
    </aside>
  );
}
