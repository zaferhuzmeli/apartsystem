import { d1Query } from "@/lib/d1";
import { addLog } from "@/lib/logs";

export interface Collection {
  id: number;
  oda_no: number;
  tutar: number;
  tarih: string; // datetime('now') — UTC ISO benzeri
}

export interface CollectionFilter {
  from?: string; // YYYY-MM-DD (dahil)
  to?: string; // YYYY-MM-DD (dahil)
  limit?: number;
  offset?: number;
}

// tarih (UTC) üzerinden gün bazlı WHERE koşulu üretir. Parametreler bind edilir.
function dateWhere(from?: string, to?: string): { clause: string; params: string[] } {
  const conds: string[] = [];
  const params: string[] = [];
  if (from) {
    conds.push("date(tarih) >= ?");
    params.push(from);
  }
  if (to) {
    conds.push("date(tarih) <= ?");
    params.push(to);
  }
  return { clause: conds.length ? `WHERE ${conds.join(" AND ")}` : "", params };
}

export async function addCollection(oda_no: number, tutar: number): Promise<void> {
  await d1Query("INSERT INTO collections (oda_no, tutar) VALUES (?, ?)", [oda_no, tutar]);
}

export async function getCollections(opts: CollectionFilter = {}): Promise<Collection[]> {
  const { clause, params } = dateWhere(opts.from, opts.to);
  const limit = opts.limit ?? 500;
  const offset = opts.offset ?? 0;
  // En yeni tahsilat her zaman en üstte (tarihe göre azalan)
  return d1Query<Collection>(
    `SELECT id, oda_no, tutar, tarih FROM collections ${clause} ORDER BY tarih DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
}

export async function getCollectionsCount(opts: CollectionFilter = {}): Promise<number> {
  const { clause, params } = dateWhere(opts.from, opts.to);
  const rows = await d1Query<{ adet: number }>(
    `SELECT COUNT(*) AS adet FROM collections ${clause}`,
    params,
  );
  return rows[0]?.adet ?? 0;
}

export async function getCollectionById(id: number): Promise<Collection | null> {
  const rows = await d1Query<Collection>(
    "SELECT id, oda_no, tutar, tarih FROM collections WHERE id = ?",
    [id],
  );
  return rows[0] ?? null;
}

// Tahsilat kaydını siler ve silme işlemini log'a yazar. Kayıt yoksa null döner.
export async function deleteCollection(id: number): Promise<Collection | null> {
  const existing = await getCollectionById(id);
  if (!existing) return null;
  await d1Query("DELETE FROM collections WHERE id = ?", [id]);
  await addLog(existing.oda_no, `Tahsilat silindi (-${existing.tutar}₺)`);
  return existing;
}

export async function getCollectionsTotal(opts: CollectionFilter = {}): Promise<number> {
  const { clause, params } = dateWhere(opts.from, opts.to);
  const rows = await d1Query<{ toplam: number }>(
    `SELECT COALESCE(SUM(tutar), 0) AS toplam FROM collections ${clause}`,
    params,
  );
  return rows[0]?.toplam ?? 0;
}
