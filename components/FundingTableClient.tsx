"use client";

import { useEffect, useState } from "react";
import FundingTable from "@/components/FundingTable";
import { FundingRow } from "@/lib/types";
import { getLocalCache, setLocalCache, withTimeout } from "@/lib/async";

const TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 2;
const CACHE_KEY = "cache-funding-dashboard-rows";
const CACHE_TTL_MS = 3 * 60 * 1000;

const fetchFundingRows = async (): Promise<FundingRow[]> => {
  const res = await fetch("/api/dashboard?type=funding", {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to load funding dashboard data");
  }
  const json = (await res.json()) as { rows?: FundingRow[] };
  return json.rows ?? [];
};

export default function FundingTableClient() {
  const [rows, setRows] = useState<FundingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    let attemptId = 0;
    const cached = getLocalCache<FundingRow[]>(CACHE_KEY, CACHE_TTL_MS);
    const hasCache = !!cached && cached.length > 0;

    if (hasCache) {
      setRows(cached!);
      setLoading(false);
      setError(null);
    }

    const load = async () => {
      setLoading(!hasCache);
      setError(null);

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const currentAttempt = ++attemptId;

        try {
          const allRows = await withTimeout(fetchFundingRows(), TIMEOUT_MS);

          if (!cancelled && currentAttempt === attemptId) {
            setRows(allRows);
            setLoading(false);
            setLocalCache(CACHE_KEY, allRows);
          }
          return;
        } catch (err) {
          if (cancelled || currentAttempt !== attemptId) {
            return;
          }

          if (hasCache) {
            setLoading(false);
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
  }, [retryToken]);

  const handleRetry = () => {
    setRetryToken((t) => t + 1);
  };

  return (
    <FundingTable
      rows={rows}
      loading={loading}
      error={error}
      onRetry={handleRetry}
    />
  );
}
