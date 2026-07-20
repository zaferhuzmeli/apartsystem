import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import * as auth from "@/lib/auth";
import * as rooms from "@/lib/rooms";
import { GET } from "@/app/api/rooms/route";
import { PATCH } from "@/app/api/rooms/[oda_no]/route";

function reqWithCookie(cookie?: string, body?: unknown): NextRequest {
  const headers: Record<string, string> = {};
  if (cookie) headers["cookie"] = `apart_session=${cookie}`;
  return new NextRequest("http://localhost/api/rooms", {
    method: "PATCH",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("GET /api/rooms", () => {
  afterEach(() => vi.restoreAllMocks());

  it("yetkisizse 401 döner", async () => {
    vi.spyOn(auth, "isAuthed").mockResolvedValue(false);
    const res = await GET(reqWithCookie());
    expect(res.status).toBe(401);
  });

  it("yetkiliyse odaları döner", async () => {
    vi.spyOn(auth, "isAuthed").mockResolvedValue(true);
    vi.spyOn(rooms, "getAllRooms").mockResolvedValue([
      { oda_no: 101, durum: "bos", fatura_kesildi: 0, fiyat: 100 },
    ]);
    const res = await GET(reqWithCookie("token"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { rooms: unknown[] };
    expect(json.rooms).toHaveLength(1);
  });
});

describe("PATCH /api/rooms/[oda_no]", () => {
  beforeEach(() => vi.spyOn(auth, "isAuthed").mockResolvedValue(true));
  afterEach(() => vi.restoreAllMocks());

  it("geçerli patch'te updateRoom çağırır", async () => {
    const spy = vi.spyOn(rooms, "updateRoom").mockResolvedValue();
    const res = await PATCH(reqWithCookie("token", { durum: "dolu" }), {
      params: Promise.resolve({ oda_no: "101" }),
    });
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(101, { durum: "dolu" });
  });

  it("geçersiz patch'te 400 döner", async () => {
    const res = await PATCH(reqWithCookie("token", { durum: "yarim" }), {
      params: Promise.resolve({ oda_no: "101" }),
    });
    expect(res.status).toBe(400);
  });

  it("yetkisizse 401 döner", async () => {
    vi.spyOn(auth, "isAuthed").mockResolvedValue(false);
    const res = await PATCH(reqWithCookie(undefined, { durum: "dolu" }), {
      params: Promise.resolve({ oda_no: "101" }),
    });
    expect(res.status).toBe(401);
  });
});
