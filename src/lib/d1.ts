import { getEnv } from "@/lib/env";

export async function d1Query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const { results } = await getEnv().DB.prepare(sql).bind(...params).all<T>();
  return results ?? [];
}
