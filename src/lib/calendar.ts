import type { Reservation } from "@/lib/reservations";

// Europe/Istanbul saatine göre bugün (YYYY-MM-DD). Türkiye kalıcı UTC+3;
// Intl ile yaparız ki ileride yasa değişse bile doğru kalsın. en-CA locale'i
// YYYY-MM-DD biçimi verir.
export function todayIstanbul(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

// ISO tarih (YYYY-MM-DD) aritmetiği — UTC gün bazlı, saat dilimi karışmaz.
export function addDays(iso: string, n: number): string {
  return new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000,
  );
}

// windowStart'tan başlayan count günlük ISO tarih dizisi.
export function dayWindow(windowStart: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(windowStart, i));
}

const ACTIVE: Reservation["durum"][] = ["on_rezervasyon", "onaylandi", "giris_yapti"];
export function isActive(r: Reservation): boolean {
  return ACTIVE.includes(r.durum);
}

// Rezervasyonun [windowStart, windowStart+windowDays) penceresindeki yeri.
// Kesişmiyorsa null. Aralık yarı-açık: giriş dahil, çıkış hariç.
export function barSpan(
  r: Reservation,
  windowStart: string,
  windowDays: number,
): { startIdx: number; span: number } | null {
  const windowEnd = addDays(windowStart, windowDays); // hariç
  if (r.cikis_tarihi <= windowStart || r.giris_tarihi >= windowEnd) return null;
  const startIdx = Math.max(0, diffDays(windowStart, r.giris_tarihi));
  const endIdx = Math.min(windowDays, diffDays(windowStart, r.cikis_tarihi));
  return { startIdx, span: Math.max(1, endIdx - startIdx) };
}

// Belirli günde aktif (o gün konaklama olan) rezervasyonlar. giriş<=gün<çıkış.
export function activeOn(reservations: Reservation[], day: string): Reservation[] {
  return reservations.filter((r) => isActive(r) && r.giris_tarihi <= day && day < r.cikis_tarihi);
}

// Bir günde dolu tekil oda sayısı.
export function occupancyOn(reservations: Reservation[], day: string): number {
  return new Set(activeOn(reservations, day).map((r) => r.oda_no)).size;
}
