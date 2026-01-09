"use client";

import { useMemo, useState } from "react";

type Row = {
  exchange: string;
  market: string;
  "1d": number | null;
  "3d": number | null;
  "7d": number | null;
  "15d": number | null;
  "30d": number | null;
  "60d": number | null;
  updated: string;
};

export default function FundingTable({ rows }: { rows: Row[] }) {
  const [search, setSearch] = useState("");
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  const [limit, setLimit] = useState(50);

  // список бирж
  const exchanges = useMemo(
    () => Array.from(new Set(rows.map(r => r.exchange))),
    [rows]
  );

  // фильтрация
  const filtered = useMemo(() => {
    return rows
      .filter(r =>
        r.market.toLowerCase().startsWith(search.toLowerCase())
      )
      .filter(r =>
        selectedExchanges.length === 0 ||
        selectedExchanges.includes(r.exchange)
      )
      .slice(0, limit === -1 ? rows.length : limit);
  }, [rows, search, selectedExchanges, limit]);

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">
        Funding Rates Dashboard
      </h1>

      {/* CONTROLS */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {/* SEARCH */}
        <input
          className="border rounded px-3 py-1"
          placeholder="Search market (BT...)"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* LIMIT */}
        <select
          className="border rounded px-2 py-1"
          value={limit}
          onChange={e => setLimit(Number(e.target.value))}
        >
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={-1}>All</option>
        </select>

        {/* EXCHANGE FILTER */}
        <div className="flex gap-3">
          {exchanges.map(ex => (
            <label key={ex} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={selectedExchanges.includes(ex)}
                onChange={() =>
                  setSelectedExchanges(prev =>
                    prev.includes(ex)
                      ? prev.filter(e => e !== ex)
                      : [...prev, ex]
                  )
                }
              />
              {ex}
            </label>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <table className="w-full bg-white text-sm">
        <thead>
          <tr className="border-b border-gray-300">
            {["Exchange", "Market", "1d", "3d", "7d", "15d", "30d", "60d"].map(h => (
              <th
                key={h}
                className="text-left px-3 py-2 font-semibold"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filtered.map((r, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="px-3 py-2">{r.exchange}</td>
              <td className="px-3 py-2 font-mono">{r.market}</td>
              <td className="px-3 py-2">{r["1d"]}</td>
              <td className="px-3 py-2">{r["3d"]}</td>
              <td className="px-3 py-2">{r["7d"]}</td>
              <td className="px-3 py-2">{r["15d"]}</td>
              <td className="px-3 py-2">{r["30d"]}</td>
              <td className="px-3 py-2">{r["60d"]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}