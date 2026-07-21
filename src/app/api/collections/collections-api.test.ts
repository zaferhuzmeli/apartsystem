import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import * as auth from "@/lib/auth";
import * as collections from "@/lib/collections";
import { GET } from "@/app/api/collections/route";
import { DELETE } from "@/app/api/collections/[id]/route";

function req(cookie?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cookie) headers["cookie"] = `apart_session=${cookie}`;
  return new NextRequest("http://localhost/api/collections", { headers });
}

function delReq(cookie?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cookie) headers["cookie"] = `apart_session=${cookie}`;
  return new NextRequest("http://localhost/api/collections/7", { method: "DELETE", headers });
}

afterEach(() => vi.restoreAllMocks());

describe("GET /api/collections", () => {
  it("yetkisizse 401 döner", async () => {
    vi.spyOn(auth, "isAuthed").mockResolvedValue(false);
    expect((await GET(req())).status).toBe(401);
  });

  it("yetkiliyse kayıtları ve toplamı döner", async () => {
    vi.spyOn(auth, "isAuthed").mockResolvedValue(true);
    vi.spyOn(collections, "getCollections").mockResolvedValue([
      { id: 1, oda_no: 102, tutar: 1500, tarih: "2026-07-21 09:00:00" },
    ]);
    vi.spyOn(collections, "getCollectionsTotal").mockResolvedValue(1500);
    vi.spyOn(collections, "getCollectionsCount").mockResolvedValue(1);
    const res = await GET(req("token"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { collections: unknown[]; toplam: number; count: number };
    expect(json.collections).toHaveLength(1);
    expect(json.toplam).toBe(1500);
    expect(json.count).toBe(1);
  });
});

describe("DELETE /api/collections/[id]", () => {
  it("yetkisizse 401 döner", async () => {
    vi.spyOn(auth, "isAuthed").mockResolvedValue(false);
    const res = await DELETE(delReq(), { params: Promise.resolve({ id: "7" }) });
    expect(res.status).toBe(401);
  });

  it("kayıt varsa siler (200)", async () => {
    vi.spyOn(auth, "isAuthed").mockResolvedValue(true);
    const spy = vi.spyOn(collections, "deleteCollection").mockResolvedValue({
      id: 7,
      oda_no: 102,
      tutar: 1500,
      tarih: "2026-07-21 09:00:00",
    });
    const res = await DELETE(delReq("token"), { params: Promise.resolve({ id: "7" }) });
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(7);
  });

  it("kayıt yoksa 404 döner", async () => {
    vi.spyOn(auth, "isAuthed").mockResolvedValue(true);
    vi.spyOn(collections, "deleteCollection").mockResolvedValue(null);
    const res = await DELETE(delReq("token"), { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("geçersiz id'de 400 döner", async () => {
    vi.spyOn(auth, "isAuthed").mockResolvedValue(true);
    const res = await DELETE(delReq("token"), { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });
});
