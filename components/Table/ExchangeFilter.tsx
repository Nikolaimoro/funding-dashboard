/**
 * Shared exchange filter dropdown for tables
 * Used in FundingTable, ArbitrageTable
 */

import { formatExchange } from "@/lib/formatters";

interface ExchangeFilterProps {
  exchanges: string[];
  selectedExchanges: string[];
  onToggleExchange: (exchange: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExchangeFilter({
  exchanges,
  selectedExchanges,
  onToggleExchange,
  open,
  onOpenChange,
}: ExchangeFilterProps) {
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
          <div className="absolute z-20 mt-2 bg-gray-800 border border-gray-700 rounded w-56 p-2 shadow-lg">
            {exchanges.map((ex) => (
              <label
                key={ex}
                className="flex gap-2 px-2 py-1 cursor-pointer hover:bg-gray-700 rounded items-center"
              >
                <input
                  type="checkbox"
                  checked={selectedExchanges.includes(ex)}
                  onChange={() => onToggleExchange(ex)}
                  className="cursor-pointer"
                />
                {formatExchange(ex)}
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
