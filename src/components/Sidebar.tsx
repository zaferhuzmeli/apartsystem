"use client";

import Link from "next/link";
import type { Room } from "@/lib/rooms";

export type RoomFilter = "tumu" | "bos" | "dolu" | "faturasiz";

const TL = (n: number) => n.toLocaleString("tr-TR");

export function Sidebar({
  rooms,
  filter,
  onFilter,
  onSelectRoom,
  onLogout,
}: {
  rooms: Room[];
  filter: RoomFilter;
  onFilter: (f: RoomFilter) => void;
  onSelectRoom: (room: Room) => void;
  onLogout: () => void;
}) {
  const bos = rooms.filter((r) => r.durum === "bos" && !r.rezervasyon_id).length;
  const dolu = rooms.length - bos;
  const bekleyen = rooms.filter((r) => (r.durum === "dolu" || r.rezervasyon_id) && !r.fatura_kesildi);

  const filters: { key: RoomFilter; label: string; count: number }[] = [
    { key: "tumu", label: "Tümü", count: rooms.length },
    { key: "bos", label: "Boş", count: bos },
    { key: "dolu", label: "Dolu", count: dolu },
    { key: "faturasiz", label: "Fatura bekleyen", count: bekleyen.length },
  ];

  return (
    <>
      <div className="brand">
        <span className="brand-mark">Maviasya</span>
        <span className="brand-sub">Oda takip</span>
      </div>

      {/* Özet */}
      <div className="side-section">
        <div className="stat-grid">
          <div className="stat accent-bos">
            <div className="stat-num mono">{bos}</div>
            <div className="stat-label">Boş</div>
          </div>
          <div className="stat accent-dolu">
            <div className="stat-num mono">{dolu}</div>
            <div className="stat-label">Dolu</div>
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="side-section">
        <div className="side-title">Filtrele</div>
        <div className="filters">
          {filters.map((f) => (
            <button
              key={f.key}
              className="filter-btn"
              aria-pressed={filter === f.key}
              onClick={() => onFilter(f.key)}
            >
              <span>{f.label}</span>
              <span className="filter-count">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fatura bekleyen */}
      <div className="side-section">
        <div className="side-title">Fatura bekleyen</div>
        <div className="mini-list">
          {bekleyen.length === 0 ? (
            <div className="mini-empty">Bekleyen fatura yok.</div>
          ) : (
            bekleyen.map((r) => (
              <button key={r.oda_no} className="mini-row" onClick={() => onSelectRoom(r)}>
                <span className="room-ref">Oda {r.oda_no}</span>
                <span className="row-meta mono">
                  {TL(r.fiyat)} ₺ <span className="warn-dot">⚠</span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Alt menü — geçmiş sayfaları */}
      <nav className="side-nav">
        <Link className="side-nav-link" href="/tahsilat">
          <span>Tahsilat geçmişi</span>
          <span className="side-nav-arrow">→</span>
        </Link>
        <Link className="side-nav-link" href="/rezervasyonlar">
          <span>Rezervasyonlar</span>
          <span className="side-nav-arrow">→</span>
        </Link>
        <button className="side-nav-link side-logout" onClick={onLogout}>
          <span>Oturumu kapat</span>
          <span className="side-nav-arrow">⎋</span>
        </button>
      </nav>
    </>
  );
}
