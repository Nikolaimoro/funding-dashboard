"use client";

import { ExternalLink } from "lucide-react";
import { formatCompactUSD, formatAPR, formatExchange } from "@/lib/formatters";
import { ArbRow } from "@/lib/types";
import SortableHeader from "@/components/ui/SortableHeader";

type SortKey = "opportunity_apr" | "stability";
type SortDir = "asc" | "desc";

interface LongButtonProps {
  href: string | null;
  label: string;
}

function LongButton({ href, label }: LongButtonProps) {
  if (!href) return <span className="text-gray-600">–</span>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="
        inline-flex items-center px-3 py-1 rounded-md
        bg-green-500/20 text-green-400
        border border-green-500/30
        hover:bg-green-500/30 transition
        whitespace-nowrap
      "
    >
      {label}
    </a>
  );
}

interface ShortButtonProps {
  href: string | null;
  label: string;
}

function ShortButton({ href, label }: ShortButtonProps) {
  if (!href) return <span className="text-gray-600">–</span>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="
        inline-flex items-center px-3 py-1 rounded-md
        bg-red-500/20 text-red-400
        border border-red-500/30
        hover:bg-red-500/30 transition
        whitespace-nowrap
      "
    >
      {label}
    </a>
  );
}

interface ArbitrageTableBodyProps {
  rows: ArbRow[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onRowClick?: (row: ArbRow) => void;
  loading?: boolean;
}

/**
 * Arbitrage table body component
 * Displays headers and data rows with sorting controls
 */
export default function ArbitrageTableBody({
  rows,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  loading = false,
}: ArbitrageTableBodyProps) {
  return (
    <div className="overflow-auto rounded border border-gray-800 bg-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 sticky top-0">
          <tr className="border-b border-gray-700">
            <th className="px-4 py-3 text-left text-gray-400 font-medium">Token</th>

            <th className="px-4 py-3 text-right">
              <SortableHeader
                label="APR"
                active={sortKey === "opportunity_apr"}
                dir={sortDir}
                onClick={() => onSort("opportunity_apr")}
              />
            </th>

            <th className="px-4 py-3 text-left text-gray-400 font-medium">Long / Short</th>
            <th className="px-4 py-3 text-left text-gray-400 font-medium">Open Interest</th>
            <th className="px-4 py-3 text-left text-gray-400 font-medium">Volume 24h</th>

            <th className="px-4 py-3 text-right">
              <SortableHeader
                label="Stability"
                active={sortKey === "stability"}
                dir={sortDir}
                onClick={() => onSort("stability")}
              />
            </th>

            <th className="px-4 py-3 text-right"></th>
          </tr>
        </thead>

        <tbody>
          {!loading &&
            rows.map((r) => (
              <tr
                key={`${r.base_asset}-${r.long_market_id}-${r.short_market_id}`}
                onClick={() => onRowClick?.(r)}
                className="border-b border-gray-800 hover:bg-gray-700/40 cursor-pointer"
              >
                <td className="px-4 py-2 font-mono font-semibold">
                  {r.base_asset}
                </td>

                <td className="px-4 py-2 text-right text-blue-300">
                  <span className="text-gray-300 font-mono tabular-nums">
                    {formatAPR(r.opportunity_apr)}
                  </span>
                </td>

                <td className="px-4 py-2 flex gap-2">
                  <LongButton
                    href={r.long_url}
                    label={`${formatExchange(r.long_exchange)}${r.long_quote ? ` (${r.long_quote})` : ""}`}
                  />
                  <ShortButton
                    href={r.short_url}
                    label={`${formatExchange(r.short_exchange)}${r.short_quote ? ` (${r.short_quote})` : ""}`}
                  />
                </td>

                <td className="px-4 py-2 text-right">
                  <span className="text-gray-300 font-mono tabular-nums">
                    {formatCompactUSD(r.long_open_interest)}
                  </span>
                  <span className="text-gray-500"> / </span>
                  <span className="text-gray-300 font-mono tabular-nums">
                    {formatCompactUSD(r.short_open_interest)}
                  </span>
                </td>

                <td className="px-4 py-2 text-right">
                  <span className="text-gray-300 font-mono tabular-nums">
                    {formatCompactUSD(r.long_volume_24h)}
                  </span>
                  <span className="text-gray-500"> / </span>
                  <span className="text-gray-300 font-mono tabular-nums">
                    {formatCompactUSD(r.short_volume_24h)}
                  </span>
                </td>

                <td className="px-4 py-2 text-right font-mono text-emerald-400">
                  {r.stability?.toFixed(2)}
                </td>

                <td className="px-4 py-2 text-right text-gray-500">
                  <ExternalLink size={16} />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
