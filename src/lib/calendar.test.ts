import { describe, it, expect } from "vitest";
import { todayIstanbul, addDays, diffDays, dayWindow, isActive, barSpan, activeOn, occupancyOn } from "@/lib/calendar";
import type { Reservation } from "@/lib/reservations";

const res = (over: Partial<Reservation> = {}): Reservation => ({
  id: 1, oda_no: 101, giris_tarihi: "2026-07-10", cikis_tarihi: "2026-07-13",
  gunluk_fiyat: 100, durum: "onaylandi", notlar: null,
  ad: "Ali", soyad: "Veli", telefon: null, plaka: null, tc_kimlik: null, ...over,
});

describe("todayIstanbul", () => {
  it("YYYY-MM-DD biçiminde bir tarih verir", () => {
    expect(todayIstanbul()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("addDays / diffDays", () => {
  it("gün ekler", () => expect(addDays("2026-07-10", 3)).toBe("2026-07-13"));
  it("gün çıkarır", () => expect(addDays("2026-07-10", -2)).toBe("2026-07-08"));
  it("ay sınırını geçer", () => expect(addDays("2026-07-31", 1)).toBe("2026-08-01"));
  it("iki tarih farkını gün olarak verir", () => expect(diffDays("2026-07-10", "2026-07-13")).toBe(3));
});

describe("dayWindow", () => {
  it("count günlük dizi üretir", () => {
    expect(dayWindow("2026-07-10", 3)).toEqual(["2026-07-10", "2026-07-11", "2026-07-12"]);
  });
});

describe("isActive", () => {
  it("aktif durumlar true", () => {
    for (const d of ["on_rezervasyon", "onaylandi", "giris_yapti"] as const)
      expect(isActive(res({ durum: d }))).toBe(true);
  });
  it("cikti/iptal false", () => {
    expect(isActive(res({ durum: "cikti" }))).toBe(false);
    expect(isActive(res({ durum: "iptal" }))).toBe(false);
  });
});

describe("barSpan", () => {
  it("pencere içi rezervasyonu konumlar", () => {
    expect(barSpan(res({ giris_tarihi: "2026-07-11", cikis_tarihi: "2026-07-14" }), "2026-07-10", 14))
      .toEqual({ startIdx: 1, span: 3 });
  });
  it("pencere başına taşanı kırpar", () => {
    expect(barSpan(res({ giris_tarihi: "2026-07-08", cikis_tarihi: "2026-07-12" }), "2026-07-10", 14))
      .toEqual({ startIdx: 0, span: 2 });
  });
  it("pencere sonuna taşanı kırpar", () => {
    expect(barSpan(res({ giris_tarihi: "2026-07-22", cikis_tarihi: "2026-07-30" }), "2026-07-10", 14))
      .toEqual({ startIdx: 12, span: 2 });
  });
  it("penceresiz kesişimde null", () => {
    expect(barSpan(res({ giris_tarihi: "2026-08-01", cikis_tarihi: "2026-08-03" }), "2026-07-10", 14)).toBeNull();
    expect(barSpan(res({ giris_tarihi: "2026-07-01", cikis_tarihi: "2026-07-10" }), "2026-07-10", 14)).toBeNull();
  });
});

describe("activeOn", () => {
  it("o gün konaklayanları verir (giriş dahil, çıkış hariç)", () => {
    const list = [
      res({ id: 1, giris_tarihi: "2026-07-10", cikis_tarihi: "2026-07-12" }),
      res({ id: 2, giris_tarihi: "2026-07-12", cikis_tarihi: "2026-07-14" }),
    ];
    expect(activeOn(list, "2026-07-11").map((r) => r.id)).toEqual([1]);
    expect(activeOn(list, "2026-07-12").map((r) => r.id)).toEqual([2]);
  });
  it("iptal edileni saymaz", () => {
    expect(activeOn([res({ durum: "iptal" })], "2026-07-11")).toEqual([]);
  });
});

describe("occupancyOn", () => {
  it("o gün dolu tekil oda sayısı", () => {
    const list = [
      res({ id: 1, oda_no: 101 }), res({ id: 2, oda_no: 102 }),
      res({ id: 3, oda_no: 102 }), // aynı oda tekrar sayılmaz
    ];
    expect(occupancyOn(list, "2026-07-11")).toBe(2);
  });
});
