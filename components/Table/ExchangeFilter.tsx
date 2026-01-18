/**
 * Shared exchange filter dropdown for tables
 * Used in FundingTable, ArbitrageTable
 */

import { ChevronDown } from "lucide-react";
import { formatExchange } from "@/lib/formatters";
import { TAILWIND } from "@/lib/theme";

interface ExchangeFilterProps {
  exchanges: string[];
  selectedExchanges: string[];
  onToggleExchange: (exchange: string) => void;
  onResetExchanges: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExchangeFilter({
  exchanges,
  selectedExchanges,
  onToggleExchange,
  onResetExchanges,
  open,
  onOpenChange,
}: ExchangeFilterProps) {
  const hasSelection = selectedExchanges.length > 0;

  return (
    <div className="relative">
      <button
        onClick={() => onOpenChange(!open)}
        className={`${TAILWIND.button.secondary} inline-flex items-center gap-2 text-sm`}
        type="button"
      >
        <span>Exchanges</span>
        {selectedExchanges.length > 0 && (
          <span className="text-blue-400">({selectedExchanges.length})</span>
        )}
        <ChevronDown className="h-4 w-4 text-gray-300" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => onOpenChange(false)}
          />
          <div className="absolute z-20 mt-2 bg-[#292e40] border border-[#343a4e] rounded w-56 p-2 shadow-lg">
            <div className="flex items-center justify-between px-2 pb-2 text-xs">
              <span className="font-light text-gray-300">Select Exchanges</span>
              <button
                type="button"
                onClick={onResetExchanges}
                disabled={!hasSelection}
                className={[
                  "font-light transition",
                  hasSelection
                    ? "text-gray-200 underline underline-offset-2"
                    : "text-gray-400/50",
                ].join(" ")}
              >
                Reset
              </button>
            </div>
            {exchanges.map((ex) => (
              <label
                key={ex}
                className="flex gap-2 px-2 py-1 cursor-pointer hover:bg-[#353b52] rounded items-center justify-between"
              >
                {formatExchange(ex)}
                <input
                  type="checkbox"
                  checked={selectedExchanges.includes(ex)}
                  onChange={() => onToggleExchange(ex)}
                  className="cursor-pointer h-5 w-5 accent-blue-500"
                />
              </label>
            ))}
            {exchanges.length === 0 && (
              <div className="px-2 py-2 text-gray-500 text-sm">
                No exchanges
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
