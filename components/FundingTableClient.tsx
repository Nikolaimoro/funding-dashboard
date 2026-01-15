"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import FundingTable from "@/components/FundingTable";
import { FundingRow } from "@/lib/types";

const PAGE_SIZE = 1000;

export default function FundingTableClient() {
  const [rows, setRows] = useState<FundingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        let allRows: FundingRow[] = [];
        let from = 0;

        while (true) {
          const { data, error: fetchError } = await supabase
            .from("funding_dashboard_mv")
            .select("*")
            .order("volume_24h", { ascending: false, nullsFirst: false })
            .range(from, from + PAGE_SIZE - 1);

          if (fetchError) {
            throw new Error(fetchError.message);
          }

          if (!data || data.length === 0) break;

          allRows = allRows.concat(data as FundingRow[]);

          if (data.length < PAGE_SIZE) break;

          from += PAGE_SIZE;
        }

        if (!cancelled) {
          setRows(allRows);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Unknown error";
          setError(`Error loading data: ${message}`);
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return <FundingTable rows={rows} loading={loading} error={error} />;
}
