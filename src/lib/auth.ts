import { getEnv } from "@/lib/env";

export const SESSION_COOKIE = "apart_session";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 gün

async function hmacHex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Sabit zamanlı string karşılaştırma (erken çıkış yok).
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function requirePin(): string {
  const pin = getEnv().APP_PIN;
  if (!pin) throw new Error("APP_PIN tanımlı değil");
  return pin;
}

function requireSessionSecret(): string {
  const secret = getEnv().SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET tanımlı değil");
  return secret;
}

export function checkPin(pin: string): boolean {
  return timingSafeEqual(pin, requirePin());
}

// Oturum token'ı: "<issuedAt>.<hmac(SESSION_SECRET, issuedAt)>"
// PIN'den türetilmez; sızsa bile PIN açığa çıkmaz.
export async function makeToken(now: number = Date.now()): Promise<string> {
  const issuedAt = String(now);
  const mac = await hmacHex(requireSessionSecret(), issuedAt);
  return `${issuedAt}.${mac}`;
}

export async function isAuthed(
  token: string | undefined,
  now: number = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const issuedAt = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const issuedNum = Number(issuedAt);
  if (!Number.isFinite(issuedNum)) return false;
  if (now < issuedNum || now - issuedNum > MAX_AGE_MS) return false; // gelecek/süresi dolmuş
  const expected = await hmacHex(requireSessionSecret(), issuedAt);
  return timingSafeEqual(mac, expected);
}
