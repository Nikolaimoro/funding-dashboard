"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import FundingTable from "@/components/FundingTable";
import { FundingRow } from "@/lib/types";
import { withTimeout } from "@/lib/async";

const PAGE_SIZE = 1000;
const TIMEOUT_MS = 3000;
const MAX_ATTEMPTS = 2;

const fetchFundingRows = async (): Promise<FundingRow[]> => {
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

  return allRows;
};

export default function FundingTableClient() {
  const [rows, setRows] = useState<FundingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    let attemptId = 0;

    const load = async () => {
      setLoading(true);
      setError(null);

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const currentAttempt = ++attemptId;

        try {
          const allRows = await withTimeout(fetchFundingRows(), TIMEOUT_MS);

          if (!cancelled && currentAttempt === attemptId) {
            setRows(allRows);
            setLoading(false);
          }
          return;
        } catch (err) {
          if (cancelled || currentAttempt !== attemptId) {
            return;
          }

          if (err instanceof Error && err.message === "timeout") {
            if (attempt < MAX_ATTEMPTS - 1) {
              continue;
            }
            setError("Error loading data: Request timed out");
          } else {
            const message =
              err instanceof Error ? err.message : "Unknown error";
            setError(`Error loading data: ${message}`);
          }

          setRows([]);
          setLoading(false);
          return;
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      attemptId += 1;
    };
  }, []);

  return <FundingTable rows={rows} loading={loading} error={error} />;
}
