"use client";

import { useMemo, useState } from "react";
import type { Reservation } from "@/lib/reservations";
import { activeOn, occupancyOn, todayIstanbul } from "@/lib/calendar";
import { ROOMS } from "@/components/TapeChart";

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const TURKISH_MONTH = new Intl.DateTimeFormat("tr-TR", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/Istanbul",
});
const TURKISH_DAY = new Intl.DateTimeFormat("tr-TR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Istanbul",
});

// Verilen ay için (yyyy-mm) Pazartesi başlangıçlı grid hücreleri: her hücre ISO gün ya da "".
function monthCells(year: number, month0: number): string[] {
  const first = new Date(Date.UTC(year, month0, 1));
  const lead = (first.getUTCDay() + 6) % 7; // Pzt=0
  const dim = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  const cells: string[] = Array(lead).fill("");
  for (let d = 1; d <= dim; d++) cells.push(`${year}-${String(month0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7 !== 0) cells.push("");
  return cells;
}

export function MonthCalendar({ reservations, onPickDay }: {
  reservations: Reservation[]; onPickDay: (day: string) => void;
}) {
  const today = todayIstanbul(); // İstanbul saatine göre bugün
  const [ym, setYm] = useState({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 });
  const cells = useMemo(() => monthCells(ym.y, ym.m), [ym]);
  const total = ROOMS.length;
  const shift = (delta: number) => setYm(({ y, m }) => {
    const nm = m + delta;
    return { y: y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
  });

  return (
    <div className="month">
      <div className="calendar-head">
        <div>
          <p className="calendar-kicker">Aylık doluluk</p>
          <h2>{TURKISH_MONTH.format(new Date(Date.UTC(ym.y, ym.m, 1)))}</h2>
        </div>
        <div className="calendar-actions">
          <button className="btn btn-ghost" onClick={() => shift(-1)} aria-label="Önceki ay">←</button>
          <button className="btn btn-ghost" onClick={() => setYm({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 })}>Bugün</button>
          <button className="btn btn-ghost" onClick={() => shift(1)} aria-label="Sonraki ay">→</button>
        </div>
      </div>
      <p className="calendar-help">Bir güne dokunarak o günün rezervasyonlarını açın. Doluluk, oda bazında gösterilir.</p>
      <div className="month-grid" role="grid" aria-label={`${TURKISH_MONTH.format(new Date(Date.UTC(ym.y, ym.m, 1)))} takvimi`}>
        {WEEKDAYS.map((w, i) => <div key={w} className={`month-wd ${i > 4 ? "weekend" : ""}`} role="columnheader">{w}</div>)}
        {cells.map((day, i) => day === "" ? <div key={`e${i}`} className="month-cell empty" /> : (
          <button key={day} className={`month-cell ${day === today ? "today" : ""} ${i % 7 > 4 ? "weekend" : ""}`} onClick={() => onPickDay(day)}
            aria-label={`${TURKISH_DAY.format(new Date(`${day}T12:00:00Z`))}: ${occupancyOn(reservations, day)} / ${total} oda dolu`}>
            <span className="month-day">{Number(day.slice(8))}</span>
            <span className={`month-occ mono ${occupancyOn(reservations, day) === 0 ? "available" : occupancyOn(reservations, day) === total ? "full" : "occupied"}`}>{occupancyOn(reservations, day)}/{total} dolu</span>
            <span className="month-names">{activeOn(reservations, day).slice(0, 3).map((r) => r.soyad).join(", ")}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
