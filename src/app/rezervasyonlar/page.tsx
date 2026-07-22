"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { ReservationList } from "@/components/ReservationList";
import { ReservationEditor, type EditorTarget } from "@/components/ReservationEditor";
import { todayIstanbul } from "@/lib/calendar";
import type { Reservation } from "@/lib/reservations";

type Tab = "liste" | "takvim";

export default function ReservationsPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tab, setTab] = useState<Tab>("liste");
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [error, setError] = useState("");

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

    {tab === "liste" && <ReservationList reservations={reservations} onEdit={(r) => setEditor({ mode: "edit", reservation: r })} />}
    {tab === "takvim" && <p className="grid-empty">Takvim yükleniyor…</p>}

    {editor && <ReservationEditor target={editor} onClose={() => setEditor(null)} onSaved={load} onError={setError} />}
  </div>;
}
