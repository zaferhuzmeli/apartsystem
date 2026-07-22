"use client";

import { useState } from "react";
import type { Reservation, ReservationStatus } from "@/lib/reservations";
import type { PaymentMethod } from "@/lib/collections";

export type EditorTarget =
  | { mode: "edit"; reservation: Reservation }
  | { mode: "create"; oda_no: number; giris_tarihi: string };

type Fields = {
  oda_no: number; giris_tarihi: string; cikis_tarihi: string; gunluk_fiyat: string;
  ad: string; soyad: string; telefon: string; plaka: string; tc_kimlik: string; notlar: string;
};

function initial(target: EditorTarget): Fields {
  if (target.mode === "edit") {
    const r = target.reservation;
    return {
      oda_no: r.oda_no, giris_tarihi: r.giris_tarihi, cikis_tarihi: r.cikis_tarihi,
      gunluk_fiyat: String(r.gunluk_fiyat), ad: r.ad, soyad: r.soyad,
      telefon: r.telefon ?? "", plaka: r.plaka ?? "", tc_kimlik: r.tc_kimlik ?? "", notlar: r.notlar ?? "",
    };
  }
  return {
    oda_no: target.oda_no, giris_tarihi: target.giris_tarihi, cikis_tarihi: "",
    gunluk_fiyat: "", ad: "", soyad: "", telefon: "", plaka: "", tc_kimlik: "", notlar: "",
  };
}

export function ReservationEditor({ target, onClose, onSaved, onError }: {
  target: EditorTarget; onClose: () => void; onSaved: () => void; onError: (m: string) => void;
}) {
  const [f, setF] = useState<Fields>(() => initial(target));
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Fields) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    // Modal form submit değil (butonlar onClick); zorunlu alanları burada denetle.
    if (!f.ad.trim() || !f.soyad.trim() || !f.giris_tarihi || !f.cikis_tarihi) {
      onError("Ad, soyad, giriş ve çıkış tarihi zorunlu."); return;
    }
    if (!(Number(f.gunluk_fiyat) > 0)) { onError("Günlük fiyat 0'dan büyük olmalı."); return; }
    setSaving(true);
    const payload = {
      giris_tarihi: f.giris_tarihi, cikis_tarihi: f.cikis_tarihi, gunluk_fiyat: Number(f.gunluk_fiyat),
      ad: f.ad, soyad: f.soyad,
      telefon: f.telefon || undefined, plaka: f.plaka || undefined,
      tc_kimlik: f.tc_kimlik || undefined, notlar: f.notlar || undefined,
    };
    const res = target.mode === "create"
      ? await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, oda_no: f.oda_no }) })
      : await fetch(`/api/reservations/${target.reservation.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await res.json().catch(() => ({})) as { error?: string };
    setSaving(false);
    if (!res.ok) { onError(body.error ?? "Kaydedilemedi."); return; }
    onSaved(); onClose();
  }

  async function status(durum: ReservationStatus, odeme_yontemi?: PaymentMethod) {
    if (target.mode !== "edit") return;
    if (durum === "cikti" && !confirm("Çıkış ve tahsilat kaydı oluşturulsun mu?")) return;
    const res = await fetch(`/api/reservations/${target.reservation.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ durum, odeme_yontemi }),
    });
    const body = await res.json().catch(() => ({})) as { error?: string };
    if (!res.ok) { onError(body.error ?? "İşlem kaydedilemedi."); return; }
    onSaved(); onClose();
  }

  const durum = target.mode === "edit" ? target.reservation.durum : undefined;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{target.mode === "create" ? "Yeni rezervasyon" : `Rezervasyon · Oda ${f.oda_no}`}</h2>
        <div className="form-grid">
          <label>Giriş<input type="date" value={f.giris_tarihi} onChange={(e) => set("giris_tarihi")(e.target.value)} /></label>
          <label>Çıkış<input type="date" min={f.giris_tarihi || undefined} value={f.cikis_tarihi} onChange={(e) => set("cikis_tarihi")(e.target.value)} /></label>
          <label>Günlük fiyat<input required type="number" min={1} value={f.gunluk_fiyat} onChange={(e) => set("gunluk_fiyat")(e.target.value)} /></label>
          <label>Ad<input required value={f.ad} onChange={(e) => set("ad")(e.target.value)} /></label>
          <label>Soyad<input required value={f.soyad} onChange={(e) => set("soyad")(e.target.value)} /></label>
          <label>Telefon<input value={f.telefon} onChange={(e) => set("telefon")(e.target.value)} /></label>
          <label>Plaka<input value={f.plaka} onChange={(e) => set("plaka")(e.target.value.toUpperCase())} /></label>
          <label>T.C. kimlik<input inputMode="numeric" value={f.tc_kimlik} onChange={(e) => set("tc_kimlik")(e.target.value)} /></label>
          <label>Not<textarea value={f.notlar} onChange={(e) => set("notlar")(e.target.value)} /></label>
        </div>

        {durum && (
          <div className="reservation-actions">
            {(durum === "on_rezervasyon" || durum === "onaylandi") && <button className="btn btn-primary" onClick={() => status("giris_yapti")}>Giriş yapıldı</button>}
            {durum === "giris_yapti" && <><button className="btn btn-primary" onClick={() => status("cikti", "nakit")}>Nakit çıkış</button><button className="btn btn-ghost" onClick={() => status("cikti", "havale")}>Havale çıkış</button></>}
            {(durum === "on_rezervasyon" || durum === "onaylandi") && <button className="btn btn-ghost" onClick={() => status("iptal")}>İptal</button>}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Kapat</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "..." : "Kaydet"}</button>
        </div>
      </div>
    </div>
  );
}
