"use client";

import { useMemo, useRef, useState } from "react";
import type { Reservation } from "@/lib/reservations";
import { addDays, barSpan, dayWindow, todayIstanbul } from "@/lib/calendar";

export const TAPE_DAYS = 14;
export const ROOMS: number[] = Array.from({ length: 15 }, (_, i) => 101 + i);

const statusClass: Record<string, string> = {
  on_rezervasyon: "bar-on", onaylandi: "bar-onay", giris_yapti: "bar-in",
};
const DAY_LABEL = new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "Europe/Istanbul" });
const RANGE_LABEL = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Istanbul" });

type Drag = { id: number; mode: "move" | "start" | "end"; startX: number; dayDelta: number };

export function TapeChart({ reservations, onEdit, onCreate, onMove }: {
  reservations: Reservation[];
  onEdit: (r: Reservation) => void;
  onCreate: (oda_no: number, giris_tarihi: string) => void;
  onMove: (r: Reservation, giris: string, cikis: string) => Promise<boolean>;
}) {
  const [windowStart, setWindowStart] = useState(() => todayIstanbul());
  const [drag, setDrag] = useState<Drag | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const days = useMemo(() => dayWindow(windowStart, TAPE_DAYS), [windowStart]);

  // Bir günün piksel genişliği (track ölçülerek).
  const dayWidth = () => (trackRef.current ? trackRef.current.clientWidth / TAPE_DAYS : 0);

  function onPointerDown(e: React.PointerEvent, r: Reservation, mode: Drag["mode"]) {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id: r.id, mode, startX: e.clientX, dayDelta: 0 });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const w = dayWidth();
    if (w > 0) setDrag({ ...drag, dayDelta: Math.round((e.clientX - drag.startX) / w) });
  }
  async function onPointerUp(r: Reservation) {
    if (!drag || drag.id !== r.id) { setDrag(null); return; }
    const d = drag.dayDelta;
    setDrag(null);
    if (d === 0) { onEdit(r); return; } // hareket yoksa tıklama = düzenle
    let giris = r.giris_tarihi, cikis = r.cikis_tarihi;
    if (drag.mode === "move") { giris = addDays(giris, d); cikis = addDays(cikis, d); }
    else if (drag.mode === "start") { giris = addDays(giris, d); }
    else { cikis = addDays(cikis, d); }
    if (cikis <= giris) return; // geçersiz uzatma → yok say
    await onMove(r, giris, cikis); // başarısızsa page yeniden yükleyip eski hali gösterir
  }

  return (
    <div className="tape">
      <div className="tape-nav">
        <button className="btn btn-ghost" onClick={() => setWindowStart(addDays(windowStart, -TAPE_DAYS))}>← Önceki</button>
        <strong className="tape-range">{RANGE_LABEL.format(new Date(`${windowStart}T12:00:00Z`))} – {RANGE_LABEL.format(new Date(`${addDays(windowStart, TAPE_DAYS - 1)}T12:00:00Z`))}</strong>
        <button className="btn btn-ghost" onClick={() => setWindowStart(addDays(windowStart, TAPE_DAYS))}>Sonraki →</button>
        <button className="btn btn-ghost" onClick={() => setWindowStart(todayIstanbul())}>Bugün</button>
      </div>

      <div className="tape-scroll">
        <div className="tape-grid" style={{ ["--days" as string]: TAPE_DAYS }}>
          <div className="tape-corner" />
          {days.map((d) => <div key={d} className={`tape-daylabel ${d === todayIstanbul() ? "today" : ""}`}>{DAY_LABEL.format(new Date(`${d}T12:00:00Z`))}</div>)}

          {ROOMS.map((oda) => (
            <div className="tape-row" key={oda} style={{ display: "contents" }}>
              <div className="tape-roomlabel">{oda}</div>
              <div className="tape-track" ref={oda === ROOMS[0] ? trackRef : undefined}
                   onPointerMove={onPointerMove}>
                {/* boş hücreler: tıklayınca yeni rezervasyon */}
                {days.map((d, i) => (
                  <button key={d} className="tape-cell" style={{ gridColumn: i + 1 }}
                          onClick={() => onCreate(oda, d)} aria-label={`${oda} ${d} yeni`} />
                ))}
                {/* rezervasyon çubukları */}
                {reservations.filter((r) => r.oda_no === oda && (r.durum === "on_rezervasyon" || r.durum === "onaylandi" || r.durum === "giris_yapti")).map((r) => {
                  const span = barSpan(r, windowStart, TAPE_DAYS);
                  if (!span) return null;
                  const dragging = drag?.id === r.id;
                  const shift = dragging ? drag!.dayDelta : 0;
                  const startCol = drag?.mode === "start" && dragging ? span.startIdx + shift : drag?.mode === "move" && dragging ? span.startIdx + shift : span.startIdx;
                  const spanLen = drag?.mode === "end" && dragging ? span.span + shift : drag?.mode === "start" && dragging ? span.span - shift : span.span;
                  const col = Math.max(0, startCol);
                  const len = Math.max(1, spanLen);
                  return (
                    <div key={r.id} className={`tape-bar ${statusClass[r.durum]}`}
                         style={{ gridColumn: `${col + 1} / span ${len}` }}
                         onPointerDown={(e) => onPointerDown(e, r, "move")}
                         onPointerUp={() => onPointerUp(r)}
                         title={`${r.ad} ${r.soyad}`}>
                      <span className="tape-handle start" onPointerDown={(e) => onPointerDown(e, r, "start")} onPointerUp={(e) => { e.stopPropagation(); onPointerUp(r); }} />
                      <span className="tape-bar-label">{r.ad} {r.soyad}</span>
                      <span className="tape-handle end" onPointerDown={(e) => onPointerDown(e, r, "end")} onPointerUp={(e) => { e.stopPropagation(); onPointerUp(r); }} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
