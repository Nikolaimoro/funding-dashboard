"use client";

import { ExternalLink } from "lucide-react";
import { formatExchange, formatAPR, formatCompactUSD } from "@/lib/formatters";
import { TAILWIND } from "@/lib/theme";
import SortableHeader from "@/components/ui/SortableHeader";
import { FundingRow } from "@/lib/types";

type SortKey =
  | "exchange"
  | "market"
  | "funding_rate_now"
  | "open_interest"
  | "volume_24h"
  | "1d"
  | "3d"
  | "7d"
  | "15d"
  | "30d";

type SortDir = "asc" | "desc";

interface FundingTableBodyProps {
  rows: FundingRow[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onRowClick: (row: FundingRow) => void;
}

/**
 * Funding table body component
 * Displays headers and data rows with sorting controls
 */
export default function FundingTableBody({
  rows,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
}: FundingTableBodyProps) {
  const formatCompactUSDNode = (v: number | null) => {
    const text = formatCompactUSD(v);
    return (
      <span className="text-gray-300 font-mono tabular-nums">
        {text}
      </span>
    );
  };

  const formatAPRNode = (v: number | null) => {
    const text = formatAPR(v);
    return (
      <span className="text-gray-300 font-mono tabular-nums">
        {text}
      </span>
    );
  };

  return (
    <div className={`overflow-auto rounded ${TAILWIND.border.default} ${TAILWIND.bg.surface}`}>
      <table className="w-full text-sm">
        <thead className={`${TAILWIND.bg.dark} sticky top-0`}>
          <tr className="border-b border-gray-700">
            <th className={TAILWIND.table.header}>
              <SortableHeader
                label="Exchange"
                active={sortKey === "exchange"}
                dir={sortDir}
                onClick={() => onSort("exchange")}
              />
            </th>
            <th className={TAILWIND.table.header}>
              <SortableHeader
                label="Market"
                active={sortKey === "market"}
                dir={sortDir}
                onClick={() => onSort("market")}
              />
            </th>

            <th className="px-4 py-3 text-right">
              <SortableHeader
                label="Open Interest"
                active={sortKey === "open_interest"}
                dir={sortDir}
                onClick={() => onSort("open_interest")}
              />
            </th>

            <th className="px-4 py-3 text-right">
              <SortableHeader
                label="Volume 24h"
                active={sortKey === "volume_24h"}
                dir={sortDir}
                onClick={() => onSort("volume_24h")}
              />
            </th>

            <th className="px-4 py-3 text-right">
              <SortableHeader
                label="Now"
                active={sortKey === "funding_rate_now"}
                dir={sortDir}
                onClick={() => onSort("funding_rate_now")}
              />
            </th>

            {(["1d", "3d", "7d", "15d", "30d"] as SortKey[]).map(h => (
              <th key={h} className="px-4 py-3 text-right">
                <SortableHeader
                  label={h}
                  active={sortKey === h}
                  dir={sortDir}
                  onClick={() => onSort(h)}
                />
              </th>
            ))}
            <th className="px-4 py-3 w-8"></th>
          </tr>
        </thead>

        <tbody>
          {rows.map(r => (
            <tr
              key={`${r.exchange}:${r.market}`}
              onClick={() => onRowClick(r)}
              className={`${TAILWIND.table.row} ${TAILWIND.bg.hover} cursor-pointer`}
            >
              <td className={TAILWIND.table.cell}>{formatExchange(r.exchange)}</td>
              <td className="px-4 py-2 font-mono font-semibold">
                {r.ref_url ? (
                  <a
                    href={r.ref_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-300 hover:underline"
                  >
                    {r.market}
                  </a>
                ) : (
                  r.market
                )}
              </td>

              <td className="px-4 py-2 text-right">
                {formatCompactUSDNode(r.open_interest)}
              </td>

              <td className="px-4 py-2 text-right">
                {formatCompactUSDNode(r.volume_24h)}
              </td>

              <td className="px-4 py-2 text-right">
                {formatAPRNode(r.funding_rate_now)}
              </td>

              <td className="px-4 py-2 text-right">{formatAPRNode(r["1d"])}</td>
              <td className="px-4 py-2 text-right">{formatAPRNode(r["3d"])}</td>
              <td className="px-4 py-2 text-right">{formatAPRNode(r["7d"])}</td>
              <td className="px-4 py-2 text-right">{formatAPRNode(r["15d"])}</td>
              <td className="px-4 py-2 text-right">{formatAPRNode(r["30d"])}</td>
              <td className="px-4 py-2 text-center">
                {r.market_id && (
                  <ExternalLink size={16} className="text-gray-500" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
