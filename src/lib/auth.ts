import { getEnv } from "@/lib/env";

export const SESSION_COOKIE = "apart_session";
const TOKEN_MESSAGE = "apart-oda-takip-v1";

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

function requirePin(): string {
  const pin = getEnv().APP_PIN;
  if (!pin) throw new Error("APP_PIN tanımlı değil");
  return pin;
}

export function checkPin(pin: string): boolean {
  return pin === requirePin();
}

export async function expectedToken(): Promise<string> {
  return hmacHex(requirePin(), TOKEN_MESSAGE);
}

export async function isAuthed(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  return token === (await expectedToken());
}
