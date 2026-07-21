import { describe, it, expect } from "vitest";
import { parsePaging } from "@/lib/paging";

const P = (q: string) => parsePaging(new URLSearchParams(q));

describe("parsePaging", () => {
  it("varsayılan sayfa 1, boyut 20", () => {
    expect(P("")).toEqual({ page: 1, pageSize: 20, offset: 0 });
  });
  it("offset'i page ve pageSize'dan hesaplar", () => {
    expect(P("page=3&pageSize=10")).toEqual({ page: 3, pageSize: 10, offset: 20 });
  });
  it("geçersiz page'i 1'e düşürür", () => {
    expect(P("page=0").page).toBe(1);
    expect(P("page=-5").page).toBe(1);
    expect(P("page=abc").page).toBe(1);
  });
  it("izin verilmeyen pageSize'ı varsayılana çeker", () => {
    expect(P("pageSize=7").pageSize).toBe(20);
    expect(P("pageSize=999").pageSize).toBe(20);
  });
  it("izin verilen pageSize'ları kabul eder", () => {
    expect(P("pageSize=50").pageSize).toBe(50);
  });
});
