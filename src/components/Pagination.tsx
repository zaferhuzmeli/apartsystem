"use client";

const SIZES = [10, 20, 50, 100];

export function Pagination({
  page,
  pageSize,
  count,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  count: number;
  onPage: (p: number) => void;
  onPageSize: (s: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const start = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(count, page * pageSize);

  return (
    <div className="pager">
      <div className="pager-info">
        <span className="mono">
          {start}–{end}
        </span>{" "}
        / <span className="mono">{count}</span> kayıt
      </div>
      <div className="pager-controls">
        <label className="pager-size">
          Sayfa
          <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <div className="pager-nav">
          <button disabled={page <= 1} onClick={() => onPage(1)} aria-label="İlk sayfa">
            «
          </button>
          <button disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Önceki sayfa">
            ‹
          </button>
          <span className="pager-page mono">
            {page} / {pageCount}
          </span>
          <button
            disabled={page >= pageCount}
            onClick={() => onPage(page + 1)}
            aria-label="Sonraki sayfa"
          >
            ›
          </button>
          <button
            disabled={page >= pageCount}
            onClick={() => onPage(pageCount)}
            aria-label="Son sayfa"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}
