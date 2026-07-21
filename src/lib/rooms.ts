import { d1Query } from "@/lib/d1";

export type Durum = "bos" | "dolu";

export interface Room {
  oda_no: number;
  durum: Durum;
  fatura_kesildi: 0 | 1;
  fiyat: number;
}

export interface RoomPatch {
  durum?: Durum;
  fatura_kesildi?: 0 | 1;
  fiyat?: number;
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

  if (Object.keys(patch).length === 0) {
    throw new Error("En az bir alan gönderilmeli");
  }
  return patch;
}

export async function getAllRooms(): Promise<Room[]> {
  return d1Query<Room>("SELECT oda_no, durum, fatura_kesildi, fiyat FROM rooms ORDER BY oda_no");
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
