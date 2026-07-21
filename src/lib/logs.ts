import { d1Query } from "@/lib/d1";

export interface LogEntry {
  id: number;
  oda_no: number;
  mesaj: string;
  tarih: string; // datetime('now') — UTC
}

export interface LogFilter {
  limit?: number;
  offset?: number;
}

export async function addLog(oda_no: number, mesaj: string): Promise<void> {
  await d1Query("INSERT INTO logs (oda_no, mesaj) VALUES (?, ?)", [oda_no, mesaj]);
}

export async function getLogs(opts: LogFilter = {}): Promise<LogEntry[]> {
  const limit = opts.limit ?? 200;
  const offset = opts.offset ?? 0;
  // En yeni kayıt her zaman en üstte (tarihe göre azalan)
  return d1Query<LogEntry>(
    "SELECT id, oda_no, mesaj, tarih FROM logs ORDER BY tarih DESC, id DESC LIMIT ? OFFSET ?",
    [limit, offset],
  );
}

export async function getLogsCount(): Promise<number> {
  const rows = await d1Query<{ adet: number }>("SELECT COUNT(*) AS adet FROM logs");
  return rows[0]?.adet ?? 0;
}
