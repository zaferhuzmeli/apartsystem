import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isAuthed } from "@/lib/auth";
import { deleteCollection } from "@/lib/collections";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthed(req.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n)) {
    return NextResponse.json({ error: "Geçersiz kayıt no" }, { status: 400 });
  }

  try {
    const removed = await deleteCollection(n);
    if (!removed) {
      return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: "Sunucu hatası, silinemedi" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
