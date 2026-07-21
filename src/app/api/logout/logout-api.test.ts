import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/logout/route";
import { SESSION_COOKIE } from "@/lib/auth";

describe("POST /api/logout", () => {
  it("oturum çerezini siler (maxAge 0)", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const cookie = res.cookies.get(SESSION_COOKIE);
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
  });
});
