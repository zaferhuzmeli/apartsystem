"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { LogEntry } from "@/lib/logs";
import { LoginForm } from "@/components/LoginForm";
import { Pagination } from "@/components/Pagination";

function fmtDateTime(t: string): string {
  const d = new Date(t.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return t;
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LogsPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      const res = await fetch(`/api/logs?${qs.toString()}`);
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      if (!res.ok) {
        setError(true);
        return;
      }
      const json = (await res.json()) as { logs: LogEntry[]; count: number };
      setLogs(json.logs ?? []);
      setCount(json.count ?? 0);
      setAuthed(true);
      setError(false);
    } catch {
      setError(true);
    }
  }, [page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(count / pageSize));
    if (page > pageCount) setPage(pageCount);
  }, [count, pageSize, page]);

  if (authed === null) {
    return (
      <div className="center-state">
        {error ? <p className="err">Bağlantı kurulamadı.</p> : <p>Yükleniyor…</p>}
      </div>
    );
  }
  if (!authed) return <LoginForm onSuccess={load} />;

  return (
    <div className="logs-page">
      <div className="logs-head">
        <h1>İşlem geçmişi</h1>
        <Link className="back-link" href="/">
          ← Odalar
        </Link>
      </div>

      {error && (
        <div className="banner banner-warn">Bağlantı hatası — liste güncel olmayabilir.</div>
      )}

      {count === 0 ? (
        <p className="grid-empty">Henüz kayıt yok.</p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="dtable">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Oda</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="td-time mono">{fmtDateTime(l.tarih)}</td>
                    <td className="td-room mono">Oda {l.oda_no}</td>
                    <td className="td-msg">{l.mesaj}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            count={count}
            onPage={setPage}
            onPageSize={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}
