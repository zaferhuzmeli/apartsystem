import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/env", () => ({ getEnv: vi.fn() }));
import { getEnv } from "@/lib/env";
import { SESSION_COOKIE, checkPin, makeToken, isAuthed } from "@/lib/auth";

const SECRET = "test-session-secret-0123456789abcdef";

function setEnv(pin: string, secret: string = SECRET) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(getEnv).mockReturnValue({ APP_PIN: pin, SESSION_SECRET: secret } as any);
}

describe("auth", () => {
  beforeEach(() => setEnv("4242"));

  it("çerez adı sabit", () => {
    expect(SESSION_COOKIE).toBe("apart_session");
  });

  it("doğru PIN'i kabul, yanlışı/farklı uzunluğu reddeder", () => {
    expect(checkPin("4242")).toBe(true);
    expect(checkPin("0000")).toBe(false);
    expect(checkPin("42")).toBe(false);
  });

  it("makeToken '<issuedAt>.<mac>' biçiminde ve SESSION_SECRET'e bağlı", async () => {
    const now = 1_700_000_000_000;
    const token = await makeToken(now);
    expect(token.startsWith(`${now}.`)).toBe(true);
    const mac = token.split(".")[1];
    expect(mac).toHaveLength(64);

    setEnv("4242", "baska-secret");
    const mac2 = (await makeToken(now)).split(".")[1];
    expect(mac2).not.toBe(mac);
  });

  it("isAuthed geçerli token'ı kabul, bozuk/eksik olanı reddeder", async () => {
    const now = 1_700_000_000_000;
    const token = await makeToken(now);
    expect(await isAuthed(token, now)).toBe(true);
    expect(await isAuthed(undefined, now)).toBe(false);
    expect(await isAuthed("cop", now)).toBe(false);
    const [issuedAt, mac] = token.split(".");
    expect(await isAuthed(`${issuedAt}.deadbeef`, now)).toBe(false);
    expect(await isAuthed(`${Number(issuedAt) + 1}.${mac}`, now)).toBe(false);
  });

  it("süresi dolmuş token reddedilir, sınır içindeki kabul edilir", async () => {
    const issued = 1_700_000_000_000;
    const token = await makeToken(issued);
    expect(await isAuthed(token, issued + 1000 * 60 * 60 * 24 * 31)).toBe(false);
    expect(await isAuthed(token, issued + 1000 * 60 * 60 * 24 * 29)).toBe(true);
  });

  it("token PIN'den türetilmez (aynı PIN, farklı SESSION_SECRET -> farklı token)", async () => {
    const now = 1_700_000_000_000;
    setEnv("4242", "secretA");
    const a = await makeToken(now);
    setEnv("4242", "secretB");
    const b = await makeToken(now);
    expect(a).not.toBe(b);
  });
});
