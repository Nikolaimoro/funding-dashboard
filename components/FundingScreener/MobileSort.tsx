"use client";

import { ChevronDown } from "lucide-react";
import { SortDir } from "@/lib/types";
import { TAILWIND } from "@/lib/theme";

type SortOption = {
  key: string;
  dir: SortDir;
  label: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sortKey: string;
  sortDir: SortDir;
  options: SortOption[];
  onSelect: (key: string, dir: SortDir) => void;
  className?: string;
};

const getSortLabel = (key: string, dir: SortDir, options: SortOption[]) => {
  const found = options.find(
    (option) => option.key === key && option.dir === dir
  );
  return found ? found.label : "Sort";
};

export default function FundingScreenerMobileSort({
  open,
  onOpenChange,
  sortKey,
  sortDir,
  options,
  onSelect,
  className,
}: Props) {
  return (
    <div className={`relative min-[960px]:hidden ${className ?? ""}`}>
      <button
        onClick={() => onOpenChange(!open)}
        className={`${TAILWIND.button.secondary} inline-flex items-center gap-2 text-sm`}
        type="button"
      >
        <span>Sort by: {getSortLabel(sortKey, sortDir, options)}</span>
        <ChevronDown className="h-4 w-4 text-gray-300" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => onOpenChange(false)}
          />
          <div className="absolute z-50 mt-2 bg-[#292e40] border border-[#343a4e] rounded-lg left-0 w-[min(280px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[70vh] overflow-hidden shadow-lg animate-tooltip-zoom p-2">
            <div className="grid gap-1 max-h-[64vh] overflow-y-auto pr-1">
              {options.map((option) => {
                const isActive =
                  option.key === sortKey && option.dir === sortDir;
                return (
                  <button
                    key={`${option.key}-${option.dir}`}
                    type="button"
                    onClick={() => {
                      onSelect(option.key, option.dir);
                      onOpenChange(false);
                    }}
                    className={[
                      "w-full text-left rounded-md px-3 py-2 text-sm transition",
                      isActive
                        ? "bg-[#353b52] text-white"
                        : "text-gray-200 hover:bg-[#353b52]",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
