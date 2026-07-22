import { describe, it, expect, vi, afterEach } from "vitest";
import { validateReservationPatch, updateReservation } from "@/lib/reservations";
import * as d1 from "@/lib/d1";
import * as logs from "@/lib/logs";

describe("validateReservationPatch", () => {
  const base = { giris_tarihi: "2026-07-10", cikis_tarihi: "2026-07-13", gunluk_fiyat: 500, ad: "Ali", soyad: "Veli" };
  it("geçerli girdiyi normalize eder", () => {
    expect(validateReservationPatch({ ...base, telefon: " 555 " })).toEqual({ ...base, telefon: "555" });
  });
  it("çıkış girişten büyük değilse reddeder", () => {
    expect(() => validateReservationPatch({ ...base, cikis_tarihi: "2026-07-10" })).toThrow(/tarih/i);
  });
  it("bozuk tarih formatını reddeder", () => {
    expect(() => validateReservationPatch({ ...base, giris_tarihi: "10-07-2026" })).toThrow(/tarih/i);
  });
  it("negatif/sonsuz fiyatı reddeder", () => {
    expect(() => validateReservationPatch({ ...base, gunluk_fiyat: -1 })).toThrow(/fiyat/i);
    expect(() => validateReservationPatch({ ...base, gunluk_fiyat: Infinity })).toThrow(/fiyat/i);
  });
  it("ad/soyad zorunlu", () => {
    expect(() => validateReservationPatch({ ...base, ad: "" })).toThrow(/ad/i);
  });
  it("obje olmayanı reddeder", () => {
    expect(() => validateReservationPatch(null)).toThrow(/geçersiz/i);
    expect(() => validateReservationPatch([])).toThrow(/geçersiz/i);
  });
});

describe("updateReservation", () => {
  afterEach(() => vi.restoreAllMocks());
  const patch = { giris_tarihi: "2026-07-10", cikis_tarihi: "2026-07-13", gunluk_fiyat: 500, ad: "Ali", soyad: "Veli" };

  function mock(existing: unknown, conflict: boolean) {
    vi.spyOn(logs, "addLog").mockResolvedValue();
    return vi.spyOn(d1, "d1Query").mockImplementation(async (sql: string) => {
      if (/JOIN guests/i.test(sql)) return (existing ? [existing] : []) as never;   // getReservation
      if (/COUNT\(\*\) AS adet/i.test(sql)) return [{ adet: conflict ? 1 : 0 }] as never; // hasConflict
      if (/SELECT guest_id/i.test(sql)) return [{ guest_id: 7 }] as never;
      return [] as never; // UPDATE'ler
    });
  }

  it("olmayan rezervasyonda hata", async () => {
    mock(null, false);
    await expect(updateReservation(1, patch)).rejects.toThrow(/bulunamadı/i);
  });
  it("çakışmada hata", async () => {
    mock({ oda_no: 101 }, true);
    await expect(updateReservation(1, patch)).rejects.toThrow(/rezerve/i);
  });
  it("başarılı güncellemede reservations + guests UPDATE eder", async () => {
    const spy = mock({ oda_no: 101 }, false);
    await updateReservation(1, patch);
    const sqls = spy.mock.calls.map((c) => c[0] as string);
    expect(sqls.some((s) => /UPDATE reservations SET/i.test(s))).toBe(true);
    expect(sqls.some((s) => /UPDATE guests SET/i.test(s))).toBe(true);
  });
});
