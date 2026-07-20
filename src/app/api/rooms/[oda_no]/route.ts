import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isAuthed } from "@/lib/auth";
import { updateRoom, validateRoomPatch } from "@/lib/rooms";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ oda_no: string }> },
) {
  if (!(await isAuthed(req.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { oda_no } = await params;
  const n = Number(oda_no);
  if (!Number.isInteger(n)) {
    return NextResponse.json({ error: "Geçersiz oda no" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  try {
    const patch = validateRoomPatch(body);
    await updateRoom(n, patch);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
