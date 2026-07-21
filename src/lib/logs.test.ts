import { describe, it, expect, vi, afterEach } from "vitest";
import { addLog, getLogs } from "@/lib/logs";
import * as d1 from "@/lib/d1";

afterEach(() => vi.restoreAllMocks());

describe("addLog", () => {
  it("oda_no ve mesajı INSERT eder", async () => {
    const spy = vi.spyOn(d1, "d1Query").mockResolvedValue([]);
    await addLog(102, "Fatura kesildi");
    const [sql, params] = spy.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO logs/i);
    expect(params).toEqual([102, "Fatura kesildi"]);
  });
});

describe("getLogs", () => {
  it("en yeni önce (tarih DESC) sıralı döndürür", async () => {
    const spy = vi.spyOn(d1, "d1Query").mockResolvedValue([
      { id: 3, oda_no: 102, mesaj: "Fatura kesildi", tarih: "2026-07-21 09:05:00" },
    ]);
    const rows = await getLogs();
    expect(rows).toHaveLength(1);
    expect(spy.mock.calls[0][0]).toMatch(/ORDER BY tarih DESC/i);
  });
});
