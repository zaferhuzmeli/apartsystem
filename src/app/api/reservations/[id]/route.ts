import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isAuthed } from "@/lib/auth";
import {
  setReservationStatus, updateReservation, validateReservationPatch, type ReservationStatus,
} from "@/lib/reservations";
import type { PaymentMethod } from "@/lib/collections";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed(req.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Geçersiz rezervasyon no" }, { status: 400 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  try {
    // Durum alanı varsa: giriş/çıkış/iptal akışı (mevcut davranış).
    if (typeof body.durum === "string") {
      if (body.odeme_yontemi !== undefined && body.odeme_yontemi !== "nakit" && body.odeme_yontemi !== "havale") {
        return NextResponse.json({ error: "Geçersiz ödeme yöntemi" }, { status: 400 });
      }
      await setReservationStatus(id, body.durum as ReservationStatus, body.odeme_yontemi as PaymentMethod | undefined);
      return NextResponse.json({ ok: true });
    }
    // Aksi halde: detay güncelleme (tarih/fiyat/misafir).
    await updateReservation(id, validateReservationPatch(body));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
