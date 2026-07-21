import { describe, it, expect, vi, afterEach } from "vitest";
import {
  addCollection,
  getCollections,
  getCollectionsTotal,
  deleteCollection,
} from "@/lib/collections";
import * as d1 from "@/lib/d1";
import * as logs from "@/lib/logs";

afterEach(() => vi.restoreAllMocks());

describe("addCollection", () => {
  it("oda_no ve tutarı INSERT eder", async () => {
    const spy = vi.spyOn(d1, "d1Query").mockResolvedValue([]);
    await addCollection(102, 1500);
    const [sql, params] = spy.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO collections/i);
    expect(params).toEqual([102, 1500]);
  });
});

describe("getCollections", () => {
  it("en yeni tahsilat önce (tarih DESC) sıralı döndürür", async () => {
    const spy = vi.spyOn(d1, "d1Query").mockResolvedValue([
      { id: 2, oda_no: 105, tutar: 1200, tarih: "2026-07-21 09:00:00" },
    ]);
    const rows = await getCollections();
    expect(rows).toHaveLength(1);
    expect(spy.mock.calls[0][0]).toMatch(/ORDER BY tarih DESC/i);
  });
});

describe("getCollections tarih filtresi + sayfalama", () => {
  it("from ve to verilince date(tarih) WHERE koşulu ekler", async () => {
    const spy = vi.spyOn(d1, "d1Query").mockResolvedValue([]);
    await getCollections({ from: "2026-07-01", to: "2026-07-21" });
    const [sql, params] = spy.mock.calls[0];
    expect(sql).toMatch(/WHERE date\(tarih\) >= \? AND date\(tarih\) <= \?/i);
    expect(sql).toMatch(/LIMIT \? OFFSET \?/i);
    expect(params).toEqual(["2026-07-01", "2026-07-21", 500, 0]);
  });
  it("limit ve offset uygular", async () => {
    const spy = vi.spyOn(d1, "d1Query").mockResolvedValue([]);
    await getCollections({ limit: 20, offset: 40 });
    expect(spy.mock.calls[0][1]).toEqual([20, 40]);
  });
  it("filtre yoksa WHERE eklemez", async () => {
    const spy = vi.spyOn(d1, "d1Query").mockResolvedValue([]);
    await getCollections();
    expect(spy.mock.calls[0][0]).not.toMatch(/WHERE/i);
  });
});

describe("getCollectionsCount", () => {
  it("filtreye uyan kayıt sayısını döndürür", async () => {
    vi.spyOn(d1, "d1Query").mockResolvedValue([{ adet: 3 }]);
    const { getCollectionsCount } = await import("@/lib/collections");
    expect(await getCollectionsCount()).toBe(3);
  });
});

describe("getCollectionsTotal", () => {
  it("tutarların toplamını döndürür", async () => {
    vi.spyOn(d1, "d1Query").mockResolvedValue([{ toplam: 4200 }]);
    expect(await getCollectionsTotal()).toBe(4200);
  });
  it("hiç kayıt yoksa 0 döndürür", async () => {
    vi.spyOn(d1, "d1Query").mockResolvedValue([{ toplam: 0 }]);
    expect(await getCollectionsTotal()).toBe(0);
  });
});

describe("deleteCollection", () => {
  it("kaydı siler ve silme işlemini loglar", async () => {
    const record = { id: 7, oda_no: 102, tutar: 1500, tarih: "2026-07-21 09:00:00" };
    const q = vi.spyOn(d1, "d1Query").mockImplementation(async (sql: string) => {
      if (/^SELECT/i.test(sql)) return [record] as never;
      return [] as never; // DELETE
    });
    const logSpy = vi.spyOn(logs, "addLog").mockResolvedValue();

    const removed = await deleteCollection(7);
    expect(removed).toEqual(record);
    expect(q.mock.calls.some(([sql]) => /DELETE FROM collections/i.test(sql))).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(102, "Tahsilat silindi (-1500₺)");
  });

  it("kayıt yoksa null döner, silme/log yapmaz", async () => {
    const q = vi.spyOn(d1, "d1Query").mockResolvedValue([]);
    const logSpy = vi.spyOn(logs, "addLog").mockResolvedValue();
    expect(await deleteCollection(999)).toBeNull();
    expect(q.mock.calls.some(([sql]) => /DELETE/i.test(sql))).toBe(false);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
