"use client";

import { useMemo, useState } from "react";
import type { Reservation, ReservationStatus } from "@/lib/reservations";
import { activeOn } from "@/lib/calendar";

const labels: Record<ReservationStatus, string> = {
  on_rezervasyon: "Ön rezervasyon", onaylandi: "Onaylandı", giris_yapti: "Konaklıyor", cikti: "Çıkış yaptı", iptal: "İptal",
};
const TL = (n: number) => n.toLocaleString("tr-TR");
function nights(r: Reservation) {
  return Math.round((new Date(`${r.cikis_tarihi}T00:00:00Z`).getTime() - new Date(`${r.giris_tarihi}T00:00:00Z`).getTime()) / 86_400_000);
}
function mask(tc: string | null) {
  return tc ? `${"•".repeat(Math.max(0, tc.length - 4))}${tc.slice(-4)}` : null;
}

export function ReservationList({ reservations, onEdit }: {
  reservations: Reservation[]; onEdit: (r: Reservation) => void;
}) {
  const [gun, setGun] = useState("");
  const visible = useMemo(
    () => (gun ? activeOn(reservations, gun) : reservations),
    [reservations, gun],
  );

  return (
    <>
      <div className="list-filter">
        <label className="room-date-picker">Güne göre<input type="date" value={gun} onChange={(e) => setGun(e.target.value)} /></label>
        {gun && <button className="btn btn-ghost" onClick={() => setGun("")}>Tümü</button>}
        <span className="sub mono">{visible.length} rezervasyon</span>
      </div>
      <div className="reservation-list">
        {visible.length === 0 ? <p className="grid-empty">Kayıt yok.</p> : visible.map((r) => (
          <article className="reservation-card" key={r.id}>
            <div><strong>Oda {r.oda_no}</strong><span className={`reservation-status status-${r.durum}`}>{labels[r.durum]}</span></div>
            <h2>{r.ad} {r.soyad}</h2>
            <p>{r.giris_tarihi} → {r.cikis_tarihi} · {nights(r)} gece · <b>{TL(nights(r) * r.gunluk_fiyat)} ₺</b></p>
            <p className="reservation-meta">{r.telefon && `Tel: ${r.telefon}`} {r.plaka && ` · Plaka: ${r.plaka}`} {r.tc_kimlik && ` · T.C.: ${mask(r.tc_kimlik)}`}</p>
            {r.notlar && <p className="reservation-meta">Not: {r.notlar}</p>}
            <div className="reservation-actions">
              <button className="btn btn-primary" onClick={() => onEdit(r)}>Düzenle</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
