import { addCollection, type PaymentMethod } from "@/lib/collections";
import { d1Query } from "@/lib/d1";
import { addLog } from "@/lib/logs";

export type ReservationStatus = "on_rezervasyon" | "onaylandi" | "giris_yapti" | "cikti" | "iptal";

export interface Reservation {
  id: number;
  oda_no: number;
  giris_tarihi: string;
  cikis_tarihi: string;
  gunluk_fiyat: number;
  durum: ReservationStatus;
  notlar: string | null;
  ad: string;
  soyad: string;
  telefon: string | null;
  plaka: string | null;
  tc_kimlik: string | null;
}

export interface ReservationInput {
  oda_no: number;
  giris_tarihi: string;
  cikis_tarihi: string;
  gunluk_fiyat: number;
  ad: string;
  soyad: string;
  telefon?: string;
  plaka?: string;
  tc_kimlik?: string;
  notlar?: string;
  durum?: Extract<ReservationStatus, "on_rezervasyon" | "onaylandi">;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const statuses: ReservationStatus[] = ["on_rezervasyon", "onaylandi", "giris_yapti", "cikti", "iptal"];

export function maskedTc(tc: string | null): string | null {
  return tc ? `${"•".repeat(Math.max(0, tc.length - 4))}${tc.slice(-4)}` : null;
}

export function validateReservation(input: unknown): ReservationInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Geçersiz veri");
  const o = input as Record<string, unknown>;
  const text = (key: string, required = false) => {
    const value = o[key];
    if (value === undefined && !required) return undefined;
    if (typeof value !== "string" || !value.trim()) throw new Error(`${key} zorunlu`);
    return value.trim();
  };
  if (typeof o.oda_no !== "number" || !Number.isInteger(o.oda_no) || o.oda_no < 1) throw new Error("Geçersiz oda no");
  if (typeof o.gunluk_fiyat !== "number" || !Number.isFinite(o.gunluk_fiyat) || o.gunluk_fiyat < 0) {
    throw new Error("Geçersiz günlük fiyat");
  }
  const giris_tarihi = text("giris_tarihi", true)!;
  const cikis_tarihi = text("cikis_tarihi", true)!;
  if (!DATE.test(giris_tarihi) || !DATE.test(cikis_tarihi) || cikis_tarihi <= giris_tarihi) {
    throw new Error("Giriş ve çıkış tarihleri geçersiz");
  }
  const durum = o.durum === undefined ? "onaylandi" : o.durum;
  if (durum !== "on_rezervasyon" && durum !== "onaylandi") throw new Error("Geçersiz rezervasyon durumu");
  return {
    oda_no: o.oda_no,
    giris_tarihi,
    cikis_tarihi,
    gunluk_fiyat: o.gunluk_fiyat,
    ad: text("ad", true)!, soyad: text("soyad", true)!, telefon: text("telefon"),
    plaka: text("plaka"), tc_kimlik: text("tc_kimlik"), notlar: text("notlar"), durum,
  };
}

const select = `SELECT r.id, r.oda_no, r.giris_tarihi, r.cikis_tarihi, r.gunluk_fiyat, r.durum,
  r.notlar, g.ad, g.soyad, g.telefon, g.plaka, g.tc_kimlik
  FROM reservations r JOIN guests g ON g.id = r.guest_id`;

export async function getReservations(): Promise<Reservation[]> {
  return d1Query<Reservation>(`${select} ORDER BY r.giris_tarihi ASC, r.oda_no ASC`);
}

export async function getReservation(id: number): Promise<Reservation | null> {
  return (await d1Query<Reservation>(`${select} WHERE r.id = ?`, [id]))[0] ?? null;
}

export async function hasConflict(oda_no: number, giris: string, cikis: string, exceptId?: number): Promise<boolean> {
  const rows = await d1Query<{ adet: number }>(`
    SELECT COUNT(*) AS adet FROM reservations
    WHERE oda_no = ? AND durum != 'iptal'
      AND giris_tarihi < ? AND cikis_tarihi > ?
      ${exceptId === undefined ? "" : "AND id != ?"}
  `, exceptId === undefined ? [oda_no, cikis, giris] : [oda_no, cikis, giris, exceptId]);
  return (rows[0]?.adet ?? 0) > 0;
}

export async function createReservation(input: ReservationInput): Promise<number> {
  if (await hasConflict(input.oda_no, input.giris_tarihi, input.cikis_tarihi)) {
    throw new Error("Bu oda seçili tarihlerde rezerve");
  }
  const guest = await d1Query<{ id: number }>(
    "INSERT INTO guests (ad, soyad, telefon, plaka, tc_kimlik) VALUES (?, ?, ?, ?, ?) RETURNING id",
    [input.ad, input.soyad, input.telefon ?? null, input.plaka ?? null, input.tc_kimlik ?? null],
  );
  const reservation = await d1Query<{ id: number }>(
    `INSERT INTO reservations (guest_id, oda_no, giris_tarihi, cikis_tarihi, gunluk_fiyat, durum, notlar)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [guest[0].id, input.oda_no, input.giris_tarihi, input.cikis_tarihi, input.gunluk_fiyat, input.durum, input.notlar ?? null],
  );
  await addLog(input.oda_no, `Rezervasyon oluşturuldu: ${input.ad} ${input.soyad} (${input.giris_tarihi} – ${input.cikis_tarihi})`);
  return reservation[0].id;
}

export async function setReservationStatus(id: number, durum: ReservationStatus, odeme?: PaymentMethod): Promise<void> {
  if (!statuses.includes(durum)) throw new Error("Geçersiz rezervasyon durumu");
  const reservation = await getReservation(id);
  if (!reservation) throw new Error("Rezervasyon bulunamadı");
  if (durum === "giris_yapti" && await hasConflict(reservation.oda_no, reservation.giris_tarihi, reservation.cikis_tarihi, id)) {
    throw new Error("Oda için çakışan rezervasyon var");
  }
  await d1Query("UPDATE reservations SET durum = ? WHERE id = ?", [durum, id]);
  const name = `${reservation.ad} ${reservation.soyad}`;
  if (durum === "giris_yapti") {
    await d1Query("UPDATE rooms SET durum = 'dolu', fiyat = ? WHERE oda_no = ?", [reservation.gunluk_fiyat, reservation.oda_no]);
    await addLog(reservation.oda_no, `Giriş yapıldı: ${name}`);
  } else if (durum === "cikti") {
    const start = new Date(`${reservation.giris_tarihi}T00:00:00Z`).getTime();
    const end = new Date(`${reservation.cikis_tarihi}T00:00:00Z`).getTime();
    const toplam = ((end - start) / 86_400_000) * reservation.gunluk_fiyat;
    await d1Query("UPDATE rooms SET durum = 'bos' WHERE oda_no = ?", [reservation.oda_no]);
    await addCollection(reservation.oda_no, toplam, odeme ?? "nakit");
    await addLog(reservation.oda_no, `Çıkış yapıldı: ${name} (+${toplam}₺, ${odeme ?? "nakit"})`);
  } else {
    await addLog(reservation.oda_no, `Rezervasyon durumu güncellendi: ${durum}`);
  }
}

export interface ReservationPatch {
  giris_tarihi: string;
  cikis_tarihi: string;
  gunluk_fiyat: number;
  ad: string;
  soyad: string;
  telefon?: string;
  plaka?: string;
  tc_kimlik?: string;
  notlar?: string;
}

// Detay düzenleme doğrulaması. Oda ve durum bu yolla değişmez.
export function validateReservationPatch(input: unknown): ReservationPatch {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Geçersiz veri");
  const o = input as Record<string, unknown>;
  const text = (key: string, required = false) => {
    const value = o[key];
    if (value === undefined && !required) return undefined;
    if (typeof value !== "string" || !value.trim()) throw new Error(`${key} zorunlu`);
    return value.trim();
  };
  if (typeof o.gunluk_fiyat !== "number" || !Number.isFinite(o.gunluk_fiyat) || o.gunluk_fiyat < 0) {
    throw new Error("Geçersiz günlük fiyat");
  }
  const giris_tarihi = text("giris_tarihi", true)!;
  const cikis_tarihi = text("cikis_tarihi", true)!;
  if (!DATE.test(giris_tarihi) || !DATE.test(cikis_tarihi) || cikis_tarihi <= giris_tarihi) {
    throw new Error("Giriş ve çıkış tarihleri geçersiz");
  }
  return {
    giris_tarihi, cikis_tarihi, gunluk_fiyat: o.gunluk_fiyat,
    ad: text("ad", true)!, soyad: text("soyad", true)!, telefon: text("telefon"),
    plaka: text("plaka"), tc_kimlik: text("tc_kimlik"), notlar: text("notlar"),
  };
}

// Rezervasyon detayını günceller: yeni tarihler için çakışma kontrolü yapar,
// reservations ve guests tablolarını günceller, değişikliği loglar.
export async function updateReservation(id: number, patch: ReservationPatch): Promise<void> {
  const existing = await getReservation(id);
  if (!existing) throw new Error("Rezervasyon bulunamadı");
  if (await hasConflict(existing.oda_no, patch.giris_tarihi, patch.cikis_tarihi, id)) {
    throw new Error("Bu oda seçili tarihlerde rezerve");
  }
  const guest = await d1Query<{ guest_id: number }>("SELECT guest_id FROM reservations WHERE id = ?", [id]);
  const guestId = guest[0]?.guest_id;
  await d1Query(
    "UPDATE reservations SET giris_tarihi = ?, cikis_tarihi = ?, gunluk_fiyat = ?, notlar = ? WHERE id = ?",
    [patch.giris_tarihi, patch.cikis_tarihi, patch.gunluk_fiyat, patch.notlar ?? null, id],
  );
  await d1Query(
    "UPDATE guests SET ad = ?, soyad = ?, telefon = ?, plaka = ?, tc_kimlik = ? WHERE id = ?",
    [patch.ad, patch.soyad, patch.telefon ?? null, patch.plaka ?? null, patch.tc_kimlik ?? null, guestId],
  );
  await addLog(existing.oda_no, `Rezervasyon güncellendi: ${patch.ad} ${patch.soyad} (${patch.giris_tarihi} – ${patch.cikis_tarihi})`);
}
