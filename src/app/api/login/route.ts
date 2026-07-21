import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, checkPin, makeToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const pin = (body as { pin?: unknown } | null)?.pin;

  if (typeof pin !== "string" || !checkPin(pin)) {
    return NextResponse.json({ error: "PIN hatalı" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await makeToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
