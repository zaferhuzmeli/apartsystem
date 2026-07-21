"use client";

import { useState, type ReactNode } from "react";

export function AppShell({
  sidebar,
  children,
}: {
  sidebar: (close: () => void) => ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false); // mobil çekmece
  const [collapsed, setCollapsed] = useState(false); // masaüstü daraltma
  const close = () => setOpen(false);

  return (
    <div className={`shell ${collapsed ? "collapsed" : ""}`}>
      <header className="topbar">
        <span className="brand-title">Maviasya</span>
        <button className="hamburger" aria-label="Menüyü aç" onClick={() => setOpen(true)}>
          ☰
        </button>
      </header>

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <button
          className="side-collapse"
          aria-label="Menüyü daralt"
          title="Menüyü gizle"
          onClick={() => setCollapsed(true)}
        >
          ‹‹
        </button>
        {sidebar(close)}
      </aside>

      <div className={`overlay ${open ? "show" : ""}`} onClick={close} aria-hidden />

      {/* Masaüstü: daraltılmışken menüyü geri açma */}
      <button
        className="side-expand"
        aria-label="Menüyü göster"
        title="Menüyü göster"
        onClick={() => setCollapsed(false)}
      >
        ☰
      </button>

      <main className="main">{children}</main>
    </div>
  );
}
