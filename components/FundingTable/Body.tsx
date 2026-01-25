"use client";

import { ExternalLink } from "lucide-react";
import { formatExchange, formatAPR, formatCompactUSD } from "@/lib/formatters";
import { isValidUrl } from "@/lib/validation";
import { TAILWIND } from "@/lib/theme";
import SortableHeader from "@/components/ui/SortableHeader";
import ExchangeIcon from "@/components/ui/ExchangeIcon";
import { FundingRow, SortDir } from "@/lib/types";

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

type GmxSide = "long" | "short";

type FundingRowWithGmx = FundingRow & {
  gmxBase?: string;
  gmxSide?: GmxSide;
  gmxHasOther?: boolean;
};

interface FundingTableBodyProps {
  rows: FundingRowWithGmx[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onRowClick: (row: FundingRow) => void;
  onToggleGmxSide: (key: string) => void;
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
  onToggleGmxSide,
}: FundingTableBodyProps) {
  const formatCompactUSDNode = (v: number | null) => {
    const text = formatCompactUSD(v);
    return (
      <span className="text-white font-mono tabular-nums inline-flex w-full justify-center">
        {text}
      </span>
    );
  };

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
      <table className="w-full text-base table-fixed min-w-[1100px] whitespace-nowrap">
        <colgroup>
          <col className="w-[12%] min-w-[110px]" />
          <col className="w-[14%] min-w-[150px]" />
          <col className="w-[10%] min-w-[120px]" />
          <col className="w-[10%] min-w-[120px]" />
          <col className="w-[8%] min-w-[80px]" />
          <col className="w-[8%] min-w-[80px]" />
          <col className="w-[8%] min-w-[80px]" />
          <col className="w-[8%] min-w-[80px]" />
          <col className="w-[8%] min-w-[80px]" />
          <col className="w-[8%] min-w-[80px]" />
          <col className="w-[4%] min-w-[48px]" />
        </colgroup>
        <thead className="sticky top-0 text-[13px] bg-[#292e40]">
          <tr className="border-b border-[#343a4e]">
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

            <th className={`${TAILWIND.table.header} text-center`}>
              <SortableHeader
                label="Open Interest"
                active={sortKey === "open_interest"}
                dir={sortDir}
                onClick={() => onSort("open_interest")}
                centered
              />
            </th>

            <th className={`${TAILWIND.table.header} text-center`}>
              <SortableHeader
                label="Volume 24h"
                active={sortKey === "volume_24h"}
                dir={sortDir}
                onClick={() => onSort("volume_24h")}
                centered
              />
            </th>

            <th className={`${TAILWIND.table.header} text-center`}>
              <SortableHeader
                label="Now"
                active={sortKey === "funding_rate_now"}
                dir={sortDir}
                onClick={() => onSort("funding_rate_now")}
                centered
              />
            </th>

            {(["1d", "3d", "7d", "15d", "30d"] as SortKey[]).map(h => (
              <th key={h} className={`${TAILWIND.table.header} text-center`}>
                <SortableHeader
                  label={h}
                  active={sortKey === h}
                  dir={sortDir}
                  onClick={() => onSort(h)}
                  centered
                />
              </th>
            ))}
            <th className={`${TAILWIND.table.header} text-center w-8`}></th>
          </tr>
        </thead>

        <tbody>
          {rows.map(r => {
            const gmxToggleKey = r.gmxBase;
            const showGmxToggle =
              r.exchange.toLowerCase() === "gmx" &&
              r.gmxHasOther &&
              gmxToggleKey &&
              r.gmxSide;
            return (
            <tr
              key={`${r.exchange}:${r.market}`}
              onClick={() => onRowClick(r)}
              className={`${TAILWIND.table.row} ${TAILWIND.bg.hover} cursor-pointer transition-colors`}
            >
              <td className="px-4 py-4 text-left text-white font-mono">
                <span className="inline-flex items-center gap-2">
                  <ExchangeIcon exchange={r.exchange} size={16} />
                  {formatExchange(r.exchange)}
                  {showGmxToggle && (
                    <button
                      type="button"
                      aria-pressed={r.gmxSide === "long"}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (gmxToggleKey) {
                          onToggleGmxSide(gmxToggleKey);
                        }
                      }}
                      className="relative inline-flex h-5 w-12 items-center rounded-full border border-[#343a4e] bg-[#23283a] p-0.5 text-[10px] font-medium text-gray-400 transition-colors"
                      title={r.gmxSide === "long" ? "Long rates" : "Short rates"}
                    >
                      <span className="relative z-10 grid w-full grid-cols-2">
                        <span
                          className={`text-center text-[10px] transition-colors ${
                            r.gmxSide === "long"
                              ? "text-emerald-200"
                              : "text-gray-400"
                          }`}
                        >
                          L
                        </span>
                        <span
                          className={`text-center text-[10px] transition-colors ${
                            r.gmxSide === "short"
                              ? "text-red-200"
                              : "text-gray-400"
                          }`}
                        >
                          S
                        </span>
                      </span>
                      <span
                        className={`absolute left-0.5 top-1/2 h-4 w-[calc(50%-2px)] -translate-y-1/2 rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          r.gmxSide === "long"
                            ? "translate-x-0 bg-emerald-500/25"
                            : "translate-x-full bg-red-500/25"
                        }`}
                      />
                    </button>
                  )}
                </span>
              </td>
              <td className="px-4 py-4 text-left font-mono font-semibold text-white">
                {isValidUrl(r.ref_url) ? (
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

              <td className="px-4 py-4 text-center text-white font-mono">
                {formatCompactUSDNode(r.open_interest)}
              </td>

              <td className="px-4 py-4 text-center text-white font-mono">
                {formatCompactUSDNode(r.volume_24h)}
              </td>

              <td className="px-4 py-4 text-center text-white font-mono">
                {formatAPRNode(r.funding_rate_now)}
              </td>

              <td className="px-4 py-4 text-center text-white font-mono">{formatAPRNode(r["1d"])}</td>
              <td className="px-4 py-4 text-center text-white font-mono">{formatAPRNode(r["3d"])}</td>
              <td className="px-4 py-4 text-center text-white font-mono">{formatAPRNode(r["7d"])}</td>
              <td className="px-4 py-4 text-center text-white font-mono">{formatAPRNode(r["15d"])}</td>
              <td className="px-4 py-4 text-center text-white font-mono">{formatAPRNode(r["30d"])}</td>
              <td className="px-4 py-4 text-center">
                {r.market_id && (
                  <span className="inline-flex w-full justify-center">
                    <ExternalLink size={16} className="text-gray-500" />
                  </span>
                )}
              </td>
            </tr>
          );
          })}
        </tbody>
      </table>
    </div>
  );
}
