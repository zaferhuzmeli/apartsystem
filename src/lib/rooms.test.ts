import { describe, it, expect, vi, afterEach } from "vitest";
import {
  validateRoomPatch,
  getAllRooms,
  updateRoom,
  applyRoomPatch,
  roomChangeMessages,
} from "@/lib/rooms";
import type { Room } from "@/lib/rooms";
import * as d1 from "@/lib/d1";
import * as collections from "@/lib/collections";
import * as logs from "@/lib/logs";

describe("validateRoomPatch", () => {
  it("geçerli durum kabul eder", () => {
    expect(validateRoomPatch({ durum: "dolu" })).toEqual({ durum: "dolu" });
  });
  it("geçersiz durumu reddeder", () => {
    expect(() => validateRoomPatch({ durum: "yarim" })).toThrow(/durum/);
  });
  it("fatura_kesildi sadece 0/1 kabul eder", () => {
    expect(validateRoomPatch({ fatura_kesildi: 1 })).toEqual({ fatura_kesildi: 1 });
    expect(() => validateRoomPatch({ fatura_kesildi: 2 })).toThrow(/fatura/);
  });
  it("negatif fiyatı reddeder", () => {
    expect(() => validateRoomPatch({ fiyat: -5 })).toThrow(/fiyat/);
  });
  it("fiyatı 0 kabul eder", () => {
    expect(validateRoomPatch({ fiyat: 0 })).toEqual({ fiyat: 0 });
  });
  it("bilinmeyen alanları yok sayar, tanınanları alır", () => {
    expect(validateRoomPatch({ fiyat: 500, foo: "bar" })).toEqual({ fiyat: 500 });
  });
  it("hiç geçerli alan yoksa hata fırlatır", () => {
    expect(() => validateRoomPatch({})).toThrow(/en az bir alan/i);
  });
  it("obje olmayan girdiyi reddeder", () => {
    expect(() => validateRoomPatch(null)).toThrow(/geçersiz/i);
  });
  it("dizi girdiyi reddeder", () => {
    expect(() => validateRoomPatch([])).toThrow(/geçersiz/i);
  });
  it("sonsuz fiyatı reddeder", () => {
    expect(() => validateRoomPatch({ fiyat: Infinity })).toThrow(/fiyat/);
  });
});

describe("getAllRooms", () => {
  afterEach(() => vi.restoreAllMocks());
  it("odaları oda_no'ya göre sıralı döndürür", async () => {
    const spy = vi.spyOn(d1, "d1Query").mockResolvedValue([
      { oda_no: 101, durum: "bos", fatura_kesildi: 0, fiyat: 100 },
    ]);
    const rooms = await getAllRooms();
    expect(rooms).toHaveLength(1);
    expect(spy.mock.calls[0][0]).toMatch(/ORDER BY oda_no/i);
  });
});

describe("updateRoom", () => {
  afterEach(() => vi.restoreAllMocks());
  it("sadece gönderilen alanları UPDATE eder", async () => {
    const spy = vi.spyOn(d1, "d1Query").mockResolvedValue([]);
    await updateRoom(103, { durum: "dolu", fiyat: 750 });
    const [sql, params] = spy.mock.calls[0];
    expect(sql).toMatch(/UPDATE rooms SET durum = \?, fiyat = \? WHERE oda_no = \?/);
    expect(params).toEqual(["dolu", 750, 103]);
  });
  it("boş patch'te hata fırlatır", async () => {
    await expect(updateRoom(103, {})).rejects.toThrow(/güncellenecek alan/i);
  });
});

const room = (over: Partial<Room> = {}): Room => ({
  oda_no: 102,
  durum: "dolu",
  fatura_kesildi: 0,
  fiyat: 1500,
  ...over,
});

describe("roomChangeMessages", () => {
  it("dolu→boş çıkışını tutar ile loglar", () => {
    const msgs = roomChangeMessages(room({ durum: "dolu" }), { durum: "bos" }, 1500);
    expect(msgs).toEqual(["Durum: dolu → boş (çıkış, +1500₺)"]);
  });
  it("boş→dolu geçişini çıkış tutarı olmadan loglar", () => {
    const msgs = roomChangeMessages(room({ durum: "bos" }), { durum: "dolu" }, null);
    expect(msgs).toEqual(["Durum: boş → dolu"]);
  });
  it("fatura ve fiyat değişimlerini ayrı satır yapar", () => {
    const msgs = roomChangeMessages(
      room({ fatura_kesildi: 0, fiyat: 1200 }),
      { fatura_kesildi: 1, fiyat: 1500 },
      null,
    );
    expect(msgs).toEqual(["Fatura kesildi", "Fiyat: 1200 → 1500 ₺"]);
  });
  it("değer aynıysa satır üretmez", () => {
    expect(roomChangeMessages(room({ fiyat: 1500 }), { fiyat: 1500 }, null)).toEqual([]);
  });
  it("fatura geri alınmayı loglar", () => {
    const msgs = roomChangeMessages(room({ fatura_kesildi: 1 }), { fatura_kesildi: 0 }, null);
    expect(msgs).toEqual(["Fatura geri alındı"]);
  });
});

describe("applyRoomPatch", () => {
  afterEach(() => vi.restoreAllMocks());

  function mocks(current: Room | null) {
    vi.spyOn(d1, "d1Query").mockImplementation(async (sql: string) => {
      if (/^SELECT/i.test(sql)) return (current ? [current] : []) as never;
      return [] as never; // UPDATE
    });
    return {
      addCollection: vi.spyOn(collections, "addCollection").mockResolvedValue(),
      addLog: vi.spyOn(logs, "addLog").mockResolvedValue(),
    };
  }

  it("dolu→boş geçişinde tahsilat ekler ve loglar", async () => {
    const m = mocks(room({ durum: "dolu", fiyat: 1500 }));
    await applyRoomPatch(102, { durum: "bos", fiyat: 1500 });
    expect(m.addCollection).toHaveBeenCalledWith(102, 1500);
    expect(m.addLog).toHaveBeenCalledWith(102, "Durum: dolu → boş (çıkış, +1500₺)");
  });

  it("boş→boş tekrar kaydında tahsilat kesmez", async () => {
    const m = mocks(room({ durum: "bos" }));
    await applyRoomPatch(102, { durum: "bos", fiyat: 1500 });
    expect(m.addCollection).not.toHaveBeenCalled();
  });

  it("dolu→dolu güncellemesinde tahsilat kesmez", async () => {
    const m = mocks(room({ durum: "dolu" }));
    await applyRoomPatch(102, { durum: "dolu", fiyat: 1500 });
    expect(m.addCollection).not.toHaveBeenCalled();
  });

  it("çıkışta fiyat değişmişse yeni fiyatı keser", async () => {
    const m = mocks(room({ durum: "dolu", fiyat: 1200 }));
    await applyRoomPatch(102, { durum: "bos", fiyat: 1500 });
    expect(m.addCollection).toHaveBeenCalledWith(102, 1500);
  });

  it("oda yoksa tahsilat/log yapmaz", async () => {
    const m = mocks(null);
    await applyRoomPatch(999, { durum: "bos" });
    expect(m.addCollection).not.toHaveBeenCalled();
    expect(m.addLog).not.toHaveBeenCalled();
  });
});
