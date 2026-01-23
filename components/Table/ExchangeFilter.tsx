/**
 * Shared exchange filter dropdown for tables
 * Used in FundingTable, ArbitrageTable
 */

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { formatExchange } from "@/lib/formatters";
import { TAILWIND } from "@/lib/theme";
import ExchangeIcon from "@/components/ui/ExchangeIcon";

interface ExchangeFilterProps {
  exchanges: string[];
  selectedExchanges: string[];
  onToggleExchange: (exchange: string) => void;
  onCheckAll: () => void;
  onUncheckAll: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headerExtras?: ReactNode;
  renderExchangeActions?: (exchange: string) => ReactNode;
}

export default function ExchangeFilter({
  exchanges,
  selectedExchanges,
  onToggleExchange,
  onCheckAll,
  onUncheckAll,
  open,
  onOpenChange,
  headerExtras,
  renderExchangeActions,
}: ExchangeFilterProps) {
  const canCheckAll = exchanges.length > 0 && selectedExchanges.length !== exchanges.length;
  const canUncheckAll = selectedExchanges.length > 0;

  return (
    <div className="relative">
      <button
        onClick={() => onOpenChange(!open)}
        className={`${TAILWIND.button.secondary} inline-flex items-center gap-2 text-sm`}
        type="button"
      >
        <span>Exchanges</span>
        <ChevronDown className="h-4 w-4 text-gray-300" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => onOpenChange(false)}
          />
          <div className="absolute z-50 mt-2 bg-[#292e40] border border-[#343a4e] rounded-lg left-0 w-[min(320px,calc(100vw-16px))] sm:w-[360px] max-w-[calc(100vw-16px)] max-h-[70vh] overflow-x-auto overflow-y-hidden shadow-lg animate-tooltip-zoom p-2">
            <div className="flex items-center justify-between px-2 pb-2 text-xs">
              <span className="font-light text-gray-300">Select Exchanges</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCheckAll}
                  disabled={!canCheckAll}
                  className={[
                    "font-light transition",
                    canCheckAll
                      ? "text-gray-200 underline underline-offset-2"
                      : "text-gray-400/50",
                  ].join(" ")}
                >
                  Check All
                </button>
                <span className="text-gray-500">/</span>
                <button
                  type="button"
                  onClick={onUncheckAll}
                  disabled={!canUncheckAll}
                  className={[
                    "font-light transition",
                    canUncheckAll
                      ? "text-gray-200 underline underline-offset-2"
                      : "text-gray-400/50",
                  ].join(" ")}
                >
                  Uncheck All
                </button>
              </div>
            </div>
            {headerExtras && (
              <div className="px-2 pb-2 text-[11px] text-gray-400">{headerExtras}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 sm:gap-x-4 max-h-[60vh] overflow-y-auto pr-1">
              {exchanges.map((ex) => (
                <div
                  key={ex}
                  className="grid grid-cols-[1fr_auto] items-center gap-0.5 px-2 py-3 sm:py-1.5 sm:flex sm:justify-between sm:gap-1.5 hover:bg-[#353b52] rounded-lg"
                >
                  <label
                    htmlFor={`exchange-${ex}`}
                    className="flex items-center gap-1.5 sm:gap-1 cursor-pointer min-w-0"
                  >
                    <input
                      id={`exchange-${ex}`}
                      type="checkbox"
                      checked={selectedExchanges.includes(ex)}
                      onChange={() => onToggleExchange(ex)}
                      className="cursor-pointer h-4 w-4 accent-blue-500"
                    />
                    <span className="text-sm text-gray-200 inline-flex items-center gap-1">
                      <ExchangeIcon exchange={ex} size={16} />
                      {formatExchange(ex)}
                    </span>
                  </label>
                  {renderExchangeActions && (
                    <div
                      className="w-5 sm:w-6 flex items-center justify-center"
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      {renderExchangeActions(ex)}
                    </div>
                  )}
                </div>
              ))}
              {exchanges.length === 0 && (
                <div className="px-2 py-2 text-gray-500 text-sm">
                  No exchanges
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
