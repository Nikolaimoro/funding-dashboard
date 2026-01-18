"use client";

import { ExternalLink } from "lucide-react";
import { formatCompactUSD, formatAPR, formatExchange } from "@/lib/formatters";
import { TAILWIND } from "@/lib/theme";
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
  const formatAPRNode = (v: number | null) => {
    const text = formatAPR(v);
    if (text === "–") {
      return (
        <span className="text-white font-mono tabular-nums inline-flex w-full justify-center">
          –
        </span>
      );
    }
    const numeric = text.slice(0, -1);
    return (
      <span className="text-white font-mono tabular-nums inline-flex w-full items-baseline justify-center">
        <span>{numeric}</span>
        <span className="opacity-70">%</span>
      </span>
    );
  };

  return (
    <div className="overflow-auto">
      <table className="w-full text-base">
        <thead className="sticky top-0 text-[13px] bg-[#292e40]">
          <tr className="border-b border-[#343a4e]">
            <th className={TAILWIND.table.header}>
              <span className="inline-flex items-center gap-1 text-left select-none text-gray-400">
                Token
              </span>
            </th>

            <th className={`${TAILWIND.table.header} text-center`}>
              <SortableHeader
                label="APR"
                active={sortKey === "opportunity_apr"}
                dir={sortDir}
                onClick={() => onSort("opportunity_apr")}
              />
            </th>

            <th className={TAILWIND.table.header}>
              <span className="inline-flex items-center gap-1 text-left select-none text-gray-400">
                Long / Short
              </span>
            </th>
            <th className={`${TAILWIND.table.header} text-center`}>
              <span className="inline-flex items-center gap-1 text-left select-none text-gray-400">
                Open Interest
              </span>
            </th>
            <th className={`${TAILWIND.table.header} text-center`}>
              <span className="inline-flex items-center gap-1 text-left select-none text-gray-400">
                Volume 24h
              </span>
            </th>

            <th className={`${TAILWIND.table.header} text-center`}>
              <SortableHeader
                label="Stability"
                active={sortKey === "stability"}
                dir={sortDir}
                onClick={() => onSort("stability")}
              />
            </th>

            <th className={`${TAILWIND.table.header} text-center`}></th>
          </tr>
        </thead>

        <tbody>
          {!loading &&
            rows.map((r) => (
              <tr
                key={`${r.base_asset}-${r.long_market_id}-${r.short_market_id}`}
                onClick={() => onRowClick?.(r)}
                className={`${TAILWIND.table.row} ${TAILWIND.bg.hover} cursor-pointer transition-colors`}
              >
                <td className="px-4 py-4 font-mono font-semibold text-white">
                  {r.base_asset}
                </td>

                <td className="px-4 py-4 text-center">
                  {formatAPRNode(r.opportunity_apr)}
                </td>

                <td className="px-4 py-4 flex gap-2">
                  <LongButton
                    href={r.long_url}
                    label={`${formatExchange(r.long_exchange)}${r.long_quote ? ` (${r.long_quote})` : ""}`}
                  />
                  <ShortButton
                    href={r.short_url}
                    label={`${formatExchange(r.short_exchange)}${r.short_quote ? ` (${r.short_quote})` : ""}`}
                  />
                </td>

                <td className="px-4 py-4 text-center">
                  <span className="inline-flex w-full justify-center font-mono tabular-nums text-white">
                    <span>{formatCompactUSD(r.long_open_interest)}</span>
                    <span className="text-gray-500"> / </span>
                    <span>{formatCompactUSD(r.short_open_interest)}</span>
                  </span>
                </td>

                <td className="px-4 py-4 text-center">
                  <span className="inline-flex w-full justify-center font-mono tabular-nums text-white">
                    <span>{formatCompactUSD(r.long_volume_24h)}</span>
                    <span className="text-gray-500"> / </span>
                    <span>{formatCompactUSD(r.short_volume_24h)}</span>
                  </span>
                </td>

                <td className={`px-4 py-4 text-center font-mono ${
                  r.stability == null ? "text-gray-500" :
                  r.stability >= 0.8 ? "text-emerald-400" :
                  r.stability >= 0.5 ? "text-orange-400" :
                  "text-red-400"
                }`}>
                  <span className="inline-flex w-full justify-center">
                    {r.stability?.toFixed(2)}
                  </span>
                </td>

                <td className="px-4 py-4 text-center text-gray-500">
                  <ExternalLink size={16} />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
