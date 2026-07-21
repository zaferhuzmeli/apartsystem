export interface Paging {
  page: number; // 1 tabanlı
  pageSize: number;
  offset: number;
}

const DEFAULT_SIZE = 20;
const ALLOWED_SIZES = [10, 20, 50, 100];

// URL query'sinden güvenli sayfa/sayfa-boyutu üretir.
export function parsePaging(params: URLSearchParams): Paging {
  const rawPage = Number(params.get("page"));
  const rawSize = Number(params.get("pageSize"));
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const pageSize = ALLOWED_SIZES.includes(rawSize) ? rawSize : DEFAULT_SIZE;
  return { page, pageSize, offset: (page - 1) * pageSize };
}
