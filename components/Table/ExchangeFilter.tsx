/**
 * Shared exchange filter dropdown for tables
 * Used in FundingTable, ArbitrageTable
 */

import { formatExchange } from "@/lib/formatters";

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
        className="bg-gray-800 border border-gray-700 px-3 py-2 rounded text-sm hover:border-gray-600 transition"
        type="button"
      >
        Exchanges
        {selectedExchanges.length > 0 && (
          <span className="text-blue-400 ml-1">({selectedExchanges.length})</span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => onOpenChange(false)}
          />
          <div className="absolute z-20 mt-2 bg-gray-800 border border-gray-700 rounded w-72 p-3 shadow-lg">
            <div className="flex items-center justify-between px-2 pb-2 text-xs uppercase tracking-wide text-gray-400">
              <span>Select Exchanges</span>
              <button
                type="button"
                onClick={() => hasSelection && onResetExchanges()}
                className={`transition ${
                  hasSelection
                    ? "text-gray-200 underline cursor-pointer"
                    : "text-gray-500 opacity-60 cursor-default"
                }`}
                aria-disabled={!hasSelection}
              >
                Reset
              </button>
            </div>
            {exchanges.map((ex) => (
              <label
                key={ex}
                className="flex items-center justify-between gap-3 px-2 py-2 cursor-pointer hover:bg-gray-700 rounded"
              >
                <span className="text-sm text-gray-200">
                  {formatExchange(ex)}
                </span>
                <input
                  type="checkbox"
                  checked={selectedExchanges.includes(ex)}
                  onChange={() => onToggleExchange(ex)}
                  className="h-5 w-5 cursor-pointer rounded border-gray-500 bg-gray-900 text-blue-500 focus:ring-2 focus:ring-blue-500"
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
