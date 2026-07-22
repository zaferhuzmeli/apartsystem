"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import type { Reservation, ReservationStatus } from "@/lib/reservations";
import type { PaymentMethod } from "@/lib/collections";

type FormState = {
  oda_no: string; giris_tarihi: string; cikis_tarihi: string; gunluk_fiyat: string;
  ad: string; soyad: string; telefon: string; plaka: string; tc_kimlik: string; notlar: string;
};
const empty: FormState = { oda_no: "101", giris_tarihi: "", cikis_tarihi: "", gunluk_fiyat: "", ad: "", soyad: "", telefon: "", plaka: "", tc_kimlik: "", notlar: "" };
const labels: Record<ReservationStatus, string> = {
  on_rezervasyon: "Ön rezervasyon", onaylandi: "Onaylandı", giris_yapti: "Konaklıyor", cikti: "Çıkış yaptı", iptal: "İptal",
};
const TL = (n: number) => n.toLocaleString("tr-TR");

function nights(r: Reservation) {
  return Math.round((new Date(`${r.cikis_tarihi}T00:00:00Z`).getTime() - new Date(`${r.giris_tarihi}T00:00:00Z`).getTime()) / 86_400_000);
}

export default function ReservationsPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/reservations");
      if (res.status === 401) { setAuthed(false); return; }
      if (!res.ok) throw new Error();
      setReservations((await res.json() as { reservations: Reservation[] }).reservations);
      setAuthed(true); setError("");
    } catch { setError("Rezervasyonlar yüklenemedi."); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const res = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      ...form, oda_no: Number(form.oda_no), gunluk_fiyat: Number(form.gunluk_fiyat),
      telefon: form.telefon || undefined, plaka: form.plaka || undefined, tc_kimlik: form.tc_kimlik || undefined, notlar: form.notlar || undefined,
    }) });
    const body = await res.json() as { error?: string };
    setSaving(false);
    if (!res.ok) { setError(body.error ?? "Kaydedilemedi."); return; }
    setForm(empty); await load();
  }

  async function changeStatus(id: number, durum: ReservationStatus, odeme_yontemi?: PaymentMethod) {
    if (durum === "cikti" && !confirm("Çıkış ve tahsilat kaydı oluşturulsun mu?")) return;
    const res = await fetch(`/api/reservations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ durum, odeme_yontemi }) });
    const body = await res.json() as { error?: string };
    if (!res.ok) { setError(body.error ?? "İşlem kaydedilemedi."); return; }
    await load();
  }

  if (authed === null) return <div className="center-state"><p>{error || "Yükleniyor…"}</p></div>;
  if (!authed) return <LoginForm onSuccess={load} />;

  return <div className="reservations-page">
    <div className="logs-head"><h1>Rezervasyonlar</h1><Link className="back-link" href="/">← Odalar</Link></div>
    <form className="reservation-form" onSubmit={submit}>
      <h2>Yeni rezervasyon</h2>
      <div className="form-grid">
        <label>Oda<select value={form.oda_no} onChange={e => setForm({ ...form, oda_no: e.target.value })}>{Array.from({ length: 15 }, (_, i) => <option key={i} value={101 + i}>{101 + i}</option>)}</select></label>
        <label>Günlük fiyat<input required min="0" type="number" value={form.gunluk_fiyat} onChange={e => setForm({ ...form, gunluk_fiyat: e.target.value })} /></label>
        <label>Giriş<input required type="date" value={form.giris_tarihi} onChange={e => setForm({ ...form, giris_tarihi: e.target.value })} /></label>
        <label>Çıkış<input required min={form.giris_tarihi || undefined} type="date" value={form.cikis_tarihi} onChange={e => setForm({ ...form, cikis_tarihi: e.target.value })} /></label>
        <label>Ad<input required value={form.ad} onChange={e => setForm({ ...form, ad: e.target.value })} /></label>
        <label>Soyad<input required value={form.soyad} onChange={e => setForm({ ...form, soyad: e.target.value })} /></label>
        <label>Telefon<input value={form.telefon} onChange={e => setForm({ ...form, telefon: e.target.value })} /></label>
        <label>Plaka<input value={form.plaka} onChange={e => setForm({ ...form, plaka: e.target.value.toUpperCase() })} /></label>
        <label>T.C. kimlik<input inputMode="numeric" value={form.tc_kimlik} onChange={e => setForm({ ...form, tc_kimlik: e.target.value })} /></label>
        <label>Not<textarea value={form.notlar} onChange={e => setForm({ ...form, notlar: e.target.value })} /></label>
      </div>
      <button className="btn btn-primary" disabled={saving}>{saving ? "Kaydediliyor…" : "Rezervasyon oluştur"}</button>
    </form>
    {error && <div className="banner banner-warn">{error}</div>}
    <div className="reservation-list">
      {reservations.length === 0 ? <p className="grid-empty">Henüz rezervasyon yok.</p> : reservations.map(r => <article className="reservation-card" key={r.id}>
        <div><strong>Oda {r.oda_no}</strong><span className={`reservation-status status-${r.durum}`}>{labels[r.durum]}</span></div>
        <h2>{r.ad} {r.soyad}</h2>
        <p>{r.giris_tarihi} → {r.cikis_tarihi} · {nights(r)} gece · <b>{TL(nights(r) * r.gunluk_fiyat)} ₺</b></p>
        <p className="reservation-meta">{r.telefon && `Tel: ${r.telefon}`} {r.plaka && ` · Plaka: ${r.plaka}`} {r.tc_kimlik && ` · T.C.: ${"•".repeat(Math.max(0, r.tc_kimlik.length - 4))}${r.tc_kimlik.slice(-4)}`}</p>
        {r.notlar && <p className="reservation-meta">Not: {r.notlar}</p>}
        <div className="reservation-actions">
          {(r.durum === "on_rezervasyon" || r.durum === "onaylandi") && <button className="btn btn-primary" onClick={() => changeStatus(r.id, "giris_yapti")}>Giriş yapıldı</button>}
          {r.durum === "giris_yapti" && <><button className="btn btn-primary" onClick={() => changeStatus(r.id, "cikti", "nakit")}>Nakit çıkış</button><button className="btn btn-ghost" onClick={() => changeStatus(r.id, "cikti", "havale")}>Havale çıkış</button></>}
          {(r.durum === "on_rezervasyon" || r.durum === "onaylandi") && <button className="btn btn-ghost" onClick={() => changeStatus(r.id, "iptal")}>İptal</button>}
        </div>
      </article>)}</div>
  </div>;
}
