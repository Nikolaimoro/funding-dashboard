import { supabase } from "@/lib/supabase";
import { SUPABASE_TABLES, DEFAULT_PAGE_SIZE } from "@/lib/constants";

const PAGE_SIZE = DEFAULT_PAGE_SIZE ?? 1000;

type OrderBy = { column: string; asc?: boolean };

export const fetchAll = async (
  table: string,
  orderBy?: OrderBy,
  selectColumns: string = "*",
  keysetColumn?: string
) => {
  let allRows: unknown[] = [];
  let from = 0;
  let lastValue: string | number | null = null;

  while (true) {
    let query = supabase.from(table).select(selectColumns);
    if (keysetColumn) {
      query = query.order(keysetColumn, {
        ascending: true,
        nullsFirst: false,
      });
      if (lastValue !== null) {
        query = query.gt(keysetColumn, lastValue);
      }
      query = query.limit(PAGE_SIZE);
    } else if (orderBy) {
      query = query.order(orderBy.column, {
        ascending: orderBy.asc ?? false,
        nullsFirst: false,
      });
    }

    const { data, error } = keysetColumn
      ? await query
      : await query.range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.length) break;
    allRows = allRows.concat(data);

    if (data.length < PAGE_SIZE) break;
    if (keysetColumn) {
      const last = data[data.length - 1];
      const lastRecord =
        last && typeof last === "object" ? (last as Record<string, unknown>) : null;
      lastValue =
        (lastRecord?.[keysetColumn] as string | number | null | undefined) ??
        lastValue;
      if (lastValue === null || lastValue === undefined) break;
    } else {
      from += PAGE_SIZE;
    }
  }

  if (keysetColumn && orderBy && orderBy.column !== keysetColumn) {
    const dir = orderBy.asc ? 1 : -1;
    return [...allRows].sort((a, b) => {
      const av = (a as Record<string, unknown>)[orderBy.column];
      const bv = (b as Record<string, unknown>)[orderBy.column];
      if (av === bv) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  return allRows;
};

const FUNDING_SELECT_COLUMNS =
  "market_id,exchange,market,ref_url,open_interest,volume_24h,funding_rate_now,1d,3d,7d,15d,30d,base_asset,quote_asset";

import type { FundingRow } from "@/lib/types";

export const fetchFundingRows = async (): Promise<FundingRow[]> => {
  const rows = await fetchAll(
    SUPABASE_TABLES.FUNDING_DASHBOARD_MV,
    undefined,
    FUNDING_SELECT_COLUMNS,
    "market_id"
  );
  return rows as FundingRow[];
};

export const fetchArbitrageRows = async () =>
  fetchAll(SUPABASE_TABLES.ARB_OPPORTUNITIES, {
    column: "stability",
    asc: false,
  });

export const fetchScreenerData = async () => {
  const { data: columns, error: columnsError } = await supabase
    .from("exchange_columns")
    .select("*")
    .order("column_key", { ascending: true });

  if (columnsError) {
    throw new Error(columnsError.message);
  }

  const rows = await fetchAll("token_funding_matrix_mv");

  return { columns: columns ?? [], rows };
};
