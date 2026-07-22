"use client";

import { useMemo, useState } from "react";
import type { Reservation } from "@/lib/reservations";
import { activeOn, occupancyOn, todayIstanbul } from "@/lib/calendar";
import { ROOMS } from "@/components/TapeChart";

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

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
      <div className="tape-nav">
        <button className="btn btn-ghost" onClick={() => shift(-1)}>← Önceki</button>
        <span className="mono">{ym.y}-{String(ym.m + 1).padStart(2, "0")}</span>
        <button className="btn btn-ghost" onClick={() => shift(1)}>Sonraki →</button>
      </div>
      <div className="month-grid">
        {WEEKDAYS.map((w) => <div key={w} className="month-wd">{w}</div>)}
        {cells.map((day, i) => day === "" ? <div key={`e${i}`} className="month-cell empty" /> : (
          <button key={day} className="month-cell" onClick={() => onPickDay(day)}>
            <span className="month-day">{Number(day.slice(8))}</span>
            <span className="month-occ mono">{occupancyOn(reservations, day)}/{total}</span>
            <span className="month-names">{activeOn(reservations, day).slice(0, 3).map((r) => r.soyad).join(", ")}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
