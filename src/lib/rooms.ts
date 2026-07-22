import { d1Query } from "@/lib/d1";
import { addCollection } from "@/lib/collections";
import { addLog } from "@/lib/logs";
import type { PaymentMethod } from "@/lib/collections";

export type Durum = "bos" | "dolu";

export interface Room {
  oda_no: number;
  durum: Durum;
  fatura_kesildi: 0 | 1;
  fiyat: number;
  misafir_adi?: string | null;
  rezervasyon_id?: number | null;
}

export interface RoomPatch {
  durum?: Durum;
  fatura_kesildi?: 0 | 1;
  fiyat?: number;
  odeme_yontemi?: PaymentMethod;
}

export function validateRoomPatch(input: unknown): RoomPatch {
  if (typeof input !== "object" || input === null) {
    throw new Error("Geçersiz veri");
  }
  if (Array.isArray(input)) {
    throw new Error("Geçersiz veri");
  }
  const o = input as Record<string, unknown>;
  const patch: RoomPatch = {};

  if (o.durum !== undefined) {
    if (o.durum !== "bos" && o.durum !== "dolu") {
      throw new Error("durum 'bos' veya 'dolu' olmalı");
    }
    patch.durum = o.durum;
  }
  if (o.fatura_kesildi !== undefined) {
    if (o.fatura_kesildi !== 0 && o.fatura_kesildi !== 1) {
      throw new Error("fatura_kesildi 0 veya 1 olmalı");
    }
    patch.fatura_kesildi = o.fatura_kesildi;
  }
  if (o.fiyat !== undefined) {
    if (typeof o.fiyat !== "number" || !Number.isFinite(o.fiyat) || o.fiyat < 0) {
      throw new Error("fiyat 0 veya daha büyük bir sayı olmalı");
    }
    patch.fiyat = o.fiyat;
  }
  if (o.odeme_yontemi !== undefined) {
    if (o.odeme_yontemi !== "nakit" && o.odeme_yontemi !== "havale") {
      throw new Error("odeme_yontemi 'nakit' veya 'havale' olmalı");
    }
    patch.odeme_yontemi = o.odeme_yontemi;
  }

  if (Object.keys(patch).length === 0) {
    throw new Error("En az bir alan gönderilmeli");
  }
  return patch;
}

export async function getAllRooms(): Promise<Room[]> {
  return d1Query<Room>(`
    SELECT r.oda_no, r.durum, r.fatura_kesildi, r.fiyat,
      g.ad || ' ' || g.soyad AS misafir_adi, active.id AS rezervasyon_id
    FROM rooms r
    LEFT JOIN reservations active
      ON active.oda_no = r.oda_no
      AND active.durum = 'giris_yapti'
    LEFT JOIN guests g ON g.id = active.guest_id
    ORDER BY r.oda_no
  `);
}

export async function getRoom(oda_no: number): Promise<Room | null> {
  const rows = await d1Query<Room>(
    "SELECT oda_no, durum, fatura_kesildi, fiyat FROM rooms WHERE oda_no = ?",
    [oda_no],
  );
  return rows[0] ?? null;
}

const durumLabel = (d: Durum) => (d === "dolu" ? "dolu" : "boş");

// Bir PATCH'in mevcut odaya göre yol açtığı insan-okur log mesajları.
// Her değişiklik türü ayrı bir satır olur. checkoutTutar dolu→boş geçişinde
// kesilen tutar; değilse null.
export function roomChangeMessages(
  current: Room,
  patch: RoomPatch,
  checkoutTutar: number | null,
): string[] {
  const msgs: string[] = [];
  if (patch.durum !== undefined && patch.durum !== current.durum) {
    let m = `Durum: ${durumLabel(current.durum)} → ${durumLabel(patch.durum)}`;
    if (checkoutTutar !== null) m += ` (çıkış, +${checkoutTutar}₺)`;
    msgs.push(m);
  }
  if (patch.fatura_kesildi !== undefined && patch.fatura_kesildi !== current.fatura_kesildi) {
    msgs.push(patch.fatura_kesildi === 1 ? "Fatura kesildi" : "Fatura geri alındı");
  }
  if (patch.fiyat !== undefined && patch.fiyat !== current.fiyat) {
    msgs.push(`Fiyat: ${current.fiyat} → ${patch.fiyat} ₺`);
  }
  return msgs;
}

// Odayı günceller; dolu → boş geçişinde (çıkış) o anki fiyat kadar otomatik
// tahsilat kaydı ekler ve tüm değişiklikleri log'a yazar. Sadece gerçek
// geçişte tahsilat olur → çift kesme olmaz.
export async function applyRoomPatch(oda_no: number, patch: RoomPatch): Promise<void> {
  const current = await getRoom(oda_no);
  await updateRoom(oda_no, patch);
  if (!current) return; // oda yoksa loglanacak/kesilecek bir şey yok

  const isCheckout = current.durum === "dolu" && patch.durum === "bos";
  const tutar = patch.fiyat ?? current.fiyat;
  if (isCheckout) await addCollection(oda_no, tutar, patch.odeme_yontemi ?? "nakit");

  for (const mesaj of roomChangeMessages(current, patch, isCheckout ? tutar : null)) {
    await addLog(oda_no, mesaj);
  }
}

export async function updateRoom(oda_no: number, patch: RoomPatch): Promise<void> {
  const fields: string[] = [];
  const params: unknown[] = [];
  if (patch.durum !== undefined) {
    fields.push("durum = ?");
    params.push(patch.durum);
  }
  if (patch.fatura_kesildi !== undefined) {
    fields.push("fatura_kesildi = ?");
    params.push(patch.fatura_kesildi);
  }
  if (patch.fiyat !== undefined) {
    fields.push("fiyat = ?");
    params.push(patch.fiyat);
  }
  if (fields.length === 0) {
    throw new Error("Güncellenecek alan yok");
  }
  params.push(oda_no);
  await d1Query(`UPDATE rooms SET ${fields.join(", ")} WHERE oda_no = ?`, params);
}
