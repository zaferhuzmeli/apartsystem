"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { ReservationList } from "@/components/ReservationList";
import { ReservationEditor, type EditorTarget } from "@/components/ReservationEditor";
import { TapeChart } from "@/components/TapeChart";
import { MonthCalendar } from "@/components/MonthCalendar";
import { todayIstanbul } from "@/lib/calendar";
import type { Reservation } from "@/lib/reservations";

type Tab = "liste" | "takvim";

export default function ReservationsPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tab, setTab] = useState<Tab>("liste");
  const [calTab, setCalTab] = useState<"serit" | "ay">("serit");
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [error, setError] = useState("");
  const [listeGun, setListeGun] = useState("");

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

  async function moveReservation(r: Reservation, giris: string, cikis: string): Promise<boolean> {
    const res = await fetch(`/api/reservations/${r.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ giris_tarihi: giris, cikis_tarihi: cikis, gunluk_fiyat: r.gunluk_fiyat, ad: r.ad, soyad: r.soyad, telefon: r.telefon ?? undefined, plaka: r.plaka ?? undefined, tc_kimlik: r.tc_kimlik ?? undefined, notlar: r.notlar ?? undefined }),
    });
    const body = await res.json().catch(() => ({})) as { error?: string };
    if (!res.ok) setError(body.error ?? "Taşınamadı.");
    await load();
    return res.ok;
  }

  if (authed === null) return <div className="center-state"><p>{error || "Yükleniyor…"}</p></div>;
  if (!authed) return <LoginForm onSuccess={load} />;

  return <div className="reservations-page">
    <div className="logs-head"><h1>Rezervasyonlar</h1><Link className="back-link" href="/">← Odalar</Link></div>

    <div className="tabs">
      <button className={`tab ${tab === "liste" ? "on" : ""}`} onClick={() => setTab("liste")}>Liste</button>
      <button className={`tab ${tab === "takvim" ? "on" : ""}`} onClick={() => setTab("takvim")}>Takvim</button>
      <button className="btn btn-primary tabs-cta" onClick={() => setEditor({ mode: "create", oda_no: 101, giris_tarihi: todayIstanbul() })}>+ Yeni</button>
    </div>

    {error && <div className="banner banner-warn">{error}</div>}

    {tab === "liste" && <ReservationList reservations={reservations} gun={listeGun} onGun={setListeGun} onEdit={(r) => setEditor({ mode: "edit", reservation: r })} />}
    {tab === "takvim" && <>
      <div className="tabs">
        <button className={`tab ${calTab === "serit" ? "on" : ""}`} onClick={() => setCalTab("serit")}>Şerit</button>
        <button className={`tab ${calTab === "ay" ? "on" : ""}`} onClick={() => setCalTab("ay")}>Ay</button>
      </div>
      {calTab === "serit" && <TapeChart
        reservations={reservations}
        onEdit={(r) => setEditor({ mode: "edit", reservation: r })}
        onCreate={(oda_no, giris_tarihi) => setEditor({ mode: "create", oda_no, giris_tarihi })}
        onMove={moveReservation}
      />}
      {calTab === "ay" && <MonthCalendar
        reservations={reservations}
        onPickDay={(day) => { setListeGun(day); setTab("liste"); }}
      />}
    </>}

    {editor && <ReservationEditor target={editor} onClose={() => setEditor(null)} onSaved={load} onError={setError} />}
  </div>;
}
