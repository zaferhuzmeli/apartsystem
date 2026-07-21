import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isAuthed } from "@/lib/auth";
import {
  getCollections,
  getCollectionsCount,
  getCollectionsTotal,
} from "@/lib/collections";
import { parsePaging } from "@/lib/paging";

// YYYY-MM-DD ise değeri döndür, değilse undefined
function validDate(v: string | null): string | undefined {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
}

export async function GET(req: NextRequest) {
  if (!(await isAuthed(req.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const from = validDate(searchParams.get("from"));
  const to = validDate(searchParams.get("to"));
  const { page, pageSize, offset } = parsePaging(searchParams);
  const filter = { from, to };

  const [collections, toplam, count] = await Promise.all([
    getCollections({ ...filter, limit: pageSize, offset }),
    getCollectionsTotal(filter),
    getCollectionsCount(filter),
  ]);
  return NextResponse.json({ collections, toplam, count, page, pageSize });
}
