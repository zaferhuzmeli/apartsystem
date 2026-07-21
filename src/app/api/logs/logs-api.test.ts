import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import * as auth from "@/lib/auth";
import * as logs from "@/lib/logs";
import { GET } from "@/app/api/logs/route";

function req(cookie?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cookie) headers["cookie"] = `apart_session=${cookie}`;
  return new NextRequest("http://localhost/api/logs", { headers });
}

afterEach(() => vi.restoreAllMocks());

describe("GET /api/logs", () => {
  it("yetkisizse 401 döner", async () => {
    vi.spyOn(auth, "isAuthed").mockResolvedValue(false);
    expect((await GET(req())).status).toBe(401);
  });

  it("yetkiliyse log kayıtlarını döner", async () => {
    vi.spyOn(auth, "isAuthed").mockResolvedValue(true);
    vi.spyOn(logs, "getLogs").mockResolvedValue([
      { id: 1, oda_no: 102, mesaj: "Fatura kesildi", tarih: "2026-07-21 09:05:00" },
    ]);
    vi.spyOn(logs, "getLogsCount").mockResolvedValue(1);
    const res = await GET(req("token"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { logs: unknown[]; count: number };
    expect(json.logs).toHaveLength(1);
    expect(json.count).toBe(1);
  });
});
