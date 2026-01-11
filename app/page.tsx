import { supabase } from "@/lib/supabase";
import FundingTable from "@/components/FundingTable";

/* ⛔️ отключаем кеш App Router */
export const revalidate = 0;

/* ---------------- types ---------------- */

type SortKey = "exchange" | "market" | "1d" | "3d" | "7d" | "15d" | "30d";
type SortDir = "asc" | "desc";

/* ---------------- helpers ---------------- */

function parseNumber(
  v: string | string[] | undefined,
  def: number
): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) ? n : def;
}

function parseString(
  v: string | string[] | undefined,
  def: string
): string {
  return Array.isArray(v) ? v[0] : v ?? def;
}

function parseArray(
  v: string | string[] | undefined
): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/* ---------------- page ---------------- */

export default async function HomePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  /* ---------- query params ---------- */

  const page = parseNumber(searchParams.page, 1);
  const limit = parseNumber(searchParams.limit, 20);

  const sortKey = parseString(
    searchParams.sort,
    "15d"
  ) as SortKey;

  const sortDir = parseString(
    searchParams.dir,
    "desc"
  ) as SortDir;

  const search = parseString(searchParams.q, "").trim();

  const exchanges = parseArray(searchParams.exchange);

  /* ---------- range ---------- */

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  /* ---------- base query ---------- */

  let query = supabase
    .from("funding_dashboard_mv")
    .select("*", { count: "exact" })
    .order(sortKey, { ascending: sortDir === "asc" })
    .range(from, to);

  /* ---------- filters ---------- */

  if (search) {
    query = query.ilike("market", `${search}%`);
  }

  if (exchanges.length > 0) {
    query = query.in("exchange", exchanges);
  }

  /* ---------- execute ---------- */

  const { data, error, count } = await query;

  if (error) {
    return (
      <div className="p-6 text-red-600">
        Error loading data: {error.message}
      </div>
    );
  }

  return (
    <FundingTable
      rows={data ?? []}
      totalCount={count ?? 0}
      page={page}
      limit={limit}
      sortKey={sortKey}
      sortDir={sortDir}
      search={search}
      exchanges={exchanges}
    />
  );
}