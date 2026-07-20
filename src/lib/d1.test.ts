import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/env", () => ({ getEnv: vi.fn() }));
import { getEnv } from "@/lib/env";
import { d1Query } from "@/lib/d1";

function fakeDb(results: unknown[] | undefined) {
  const all = vi.fn().mockResolvedValue({ results, success: true });
  const bind = vi.fn().mockReturnValue({ all });
  const prepare = vi.fn().mockReturnValue({ bind });
  return { db: { prepare }, prepare, bind, all };
}

describe("d1Query", () => {
  it("prepare/bind/all zincirini çağırır ve satırları döndürür", async () => {
    const f = fakeDb([{ oda_no: 101 }]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(getEnv).mockReturnValue({ DB: f.db, APP_PIN: "x" } as any);

    const rows = await d1Query<{ oda_no: number }>("SELECT * FROM rooms WHERE oda_no = ?", [101]);

    expect(rows).toEqual([{ oda_no: 101 }]);
    expect(f.prepare).toHaveBeenCalledWith("SELECT * FROM rooms WHERE oda_no = ?");
    expect(f.bind).toHaveBeenCalledWith(101);
  });

  it("results boş/undefined ise boş dizi döndürür", async () => {
    const f = fakeDb(undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(getEnv).mockReturnValue({ DB: f.db, APP_PIN: "x" } as any);
    expect(await d1Query("SELECT 1")).toEqual([]);
  });
});
