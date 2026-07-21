import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isAuthed } from "@/lib/auth";
import { getLogs, getLogsCount } from "@/lib/logs";
import { parsePaging } from "@/lib/paging";

export async function GET(req: NextRequest) {
  if (!(await isAuthed(req.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const { page, pageSize, offset } = parsePaging(searchParams);

  const [logs, count] = await Promise.all([
    getLogs({ limit: pageSize, offset }),
    getLogsCount(),
  ]);
  return NextResponse.json({ logs, count, page, pageSize });
}
