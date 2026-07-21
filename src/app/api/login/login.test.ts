import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import * as auth from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/auth";
import { POST } from "@/app/api/login/route";

function reqWithPin(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/login", () => {
  afterEach(() => vi.restoreAllMocks());

  it("yanlış PIN'de 401 döner ve cookie set edilmez", async () => {
    vi.spyOn(auth, "checkPin").mockReturnValue(false);
    const res = await POST(reqWithPin({ pin: "0000" }));
    expect(res.status).toBe(401);
    expect(res.cookies.get(SESSION_COOKIE)).toBeUndefined();
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("pin string değilse veya eksikse 401 döner", async () => {
    const res = await POST(reqWithPin({ pin: 1234 }));
    expect(res.status).toBe(401);
    expect(res.cookies.get(SESSION_COOKIE)).toBeUndefined();

    const res2 = await POST(reqWithPin({}));
    expect(res2.status).toBe(401);
    expect(res2.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it("doğru PIN'de 200 döner ve session cookie doğru bayraklarla set edilir", async () => {
    vi.spyOn(auth, "checkPin").mockReturnValue(true);
    vi.spyOn(auth, "makeToken").mockResolvedValue("tok123");

    const res = await POST(reqWithPin({ pin: "1234" }));
    expect(res.status).toBe(200);

    const cookie = res.cookies.get(SESSION_COOKIE);
    expect(cookie?.value).toBe("tok123");

    const setCookieHeader = res.headers.get("set-cookie") ?? "";
    expect(setCookieHeader).toContain("HttpOnly");
    expect(setCookieHeader).toContain("Secure");
    expect(setCookieHeader.toLowerCase()).toContain("samesite=lax");
    expect(setCookieHeader).toContain("Path=/");
    expect(setCookieHeader).toContain(`Max-Age=${60 * 60 * 24 * 30}`);
  });
});
