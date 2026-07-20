import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/env", () => ({ getEnv: vi.fn() }));
import { getEnv } from "@/lib/env";
import { SESSION_COOKIE, checkPin, expectedToken, isAuthed } from "@/lib/auth";

function setPin(pin: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(getEnv).mockReturnValue({ APP_PIN: pin } as any);
}

describe("auth", () => {
  beforeEach(() => {
    setPin("4242");
  });

  it("çerez adı sabit", () => {
    expect(SESSION_COOKIE).toBe("apart_session");
  });

  it("doğru PIN'i kabul, yanlışı reddeder", () => {
    expect(checkPin("4242")).toBe(true);
    expect(checkPin("0000")).toBe(false);
  });

  it("expectedToken deterministik ve PIN'e bağlı", async () => {
    const t1 = await expectedToken();
    const t2 = await expectedToken();
    expect(t1).toBe(t2);
    expect(t1).toHaveLength(64); // SHA-256 hex

    setPin("9999");
    const t3 = await expectedToken();
    expect(t3).not.toBe(t1);
  });

  it("isAuthed doğru token'ı kabul, yanlışı/eksiği reddeder", async () => {
    const token = await expectedToken();
    expect(await isAuthed(token)).toBe(true);
    expect(await isAuthed("yanlis")).toBe(false);
    expect(await isAuthed(undefined)).toBe(false);
  });
});
