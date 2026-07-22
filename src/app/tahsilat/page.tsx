"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Collection } from "@/lib/collections";
import { LoginForm } from "@/components/LoginForm";
import { Pagination } from "@/components/Pagination";

const TL = (n: number) => n.toLocaleString("tr-TR");

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

const pad = (n: number) => String(n).padStart(2, "0");
const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type PresetKey = "bugun" | "hafta" | "ay" | "tumu";

function presetRange(key: PresetKey): { from: string; to: string } {
  const now = new Date();
  const today = toYMD(now);
  if (key === "bugun") return { from: today, to: today };
  if (key === "hafta") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { from: toYMD(d), to: today };
  }
  if (key === "ay") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toYMD(d), to: today };
  }
  return { from: "", to: "" };
}

export default function TahsilatPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [toplam, setToplam] = useState(0);
  const [count, setCount] = useState(0);
  const [error, setError] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      const res = await fetch(`/api/collections?${qs.toString()}`);
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      if (!res.ok) {
        setError(true);
        return;
      }
      const json = (await res.json()) as {
        collections: Collection[];
        toplam: number;
        count: number;
      };
      setCollections(json.collections ?? []);
      setToplam(json.toplam ?? 0);
      setCount(json.count ?? 0);
      setAuthed(true);
      setError(false);
    } catch {
      setError(true);
    }
  }, [from, to, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  // Sayfa aralık dışında kalırsa (silme/filtre sonrası) düzelt
  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(count / pageSize));
    if (page > pageCount) setPage(pageCount);
  }, [count, pageSize, page]);

  function applyPreset(key: PresetKey) {
    const r = presetRange(key);
    setFrom(r.from);
    setTo(r.to);
    setPage(1);
  }

  async function remove(c: Collection) {
    if (!confirm(`Oda ${c.oda_no} · ${TL(c.tutar)} ₺ tahsilat kaydı silinsin mi?`)) return;
    try {
      const res = await fetch(`/api/collections/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        setError(true);
        return;
      }
      await load();
    } catch {
      setError(true);
    }
  }

  if (authed === null) {
    return (
      <div className="center-state">
        {error ? <p className="err">Bağlantı kurulamadı.</p> : <p>Yükleniyor…</p>}
      </div>
    );
  }
  if (!authed) return <LoginForm onSuccess={load} />;

  const filtreli = Boolean(from || to);

  return (
    <div className="logs-page">
      <div className="logs-head">
        <h1>Tahsilat geçmişi</h1>
        <Link className="back-link" href="/">
          ← Odalar
        </Link>
      </div>

      <div className="revenue" style={{ marginBottom: 16 }}>
        <div className="revenue-label">Toplam tahsilat{filtreli ? " (seçili aralık)" : ""}</div>
        <div className="revenue-num mono">{TL(toplam)} ₺</div>
      </div>

      <div className="date-filter">
        <div className="preset-row">
          <button className="chip" onClick={() => applyPreset("bugun")}>Bugün</button>
          <button className="chip" onClick={() => applyPreset("hafta")}>Son 7 gün</button>
          <button className="chip" onClick={() => applyPreset("ay")}>Bu ay</button>
          <button className="chip" aria-pressed={!filtreli} onClick={() => applyPreset("tumu")}>
            Tümü
          </button>
        </div>
        <div className="range-row">
          <label className="range-field">
            <span>Başlangıç</span>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="range-field">
            <span>Bitiş</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="banner banner-warn">Bağlantı hatası — liste güncel olmayabilir.</div>
      )}

      {count === 0 ? (
        <p className="grid-empty">
          {filtreli
            ? "Seçili tarih aralığında tahsilat yok."
            : "Henüz tahsilat yok. Bir oda çıkışı yapıldığında burada görünür."}
        </p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="dtable">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Oda</th>
                  <th className="ta-right">Tutar</th>
                  <th>Ödeme</th>
                  <th aria-label="İşlem"></th>
                </tr>
              </thead>
              <tbody>
                {collections.map((c) => (
                  <tr key={c.id}>
                    <td className="td-time mono">{fmtDateTime(c.tarih)}</td>
                    <td className="td-room mono">Oda {c.oda_no}</td>
                    <td className="td-amount mono ta-right">{TL(c.tutar)} ₺</td>
                    <td><span className="payment-chip">{c.odeme_yontemi === "havale" ? "Havale" : "Nakit"}</span></td>
                    <td className="ta-right">
                      <button
                        className="row-delete"
                        aria-label={`Oda ${c.oda_no} tahsilatını sil`}
                        title="Sil"
                        onClick={() => remove(c)}
                      >
                        ✕
                      </button>
                    </td>
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
