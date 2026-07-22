import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isAuthed } from "@/lib/auth";
import { getAllRooms } from "@/lib/rooms";

export async function GET(req: NextRequest) {
  if (!(await isAuthed(req.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const tarih = new URL(req.url).searchParams.get("tarih");
  if (tarih && !/^\d{4}-\d{2}-\d{2}$/.test(tarih)) {
    return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
  }
  const rooms = await getAllRooms(tarih ?? undefined);
  return NextResponse.json({ rooms });
}
