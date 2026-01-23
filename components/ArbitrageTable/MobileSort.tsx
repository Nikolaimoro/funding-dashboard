"use client";

import { ChevronDown } from "lucide-react";
import { SortDir } from "@/lib/types";
import { TAILWIND } from "@/lib/theme";

type SortKey = "apr_spread" | "stability";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSelect: (key: SortKey, dir: SortDir) => void;
};

export default function MobileSort({
  open,
  onOpenChange,
  sortKey,
  sortDir,
  onSelect,
}: Props) {
  const options: Array<{
    key: SortKey;
    dir: SortDir;
    label: string;
  }> = [
    { key: "apr_spread", dir: "asc", label: "APR asc" },
    { key: "apr_spread", dir: "desc", label: "APR desc" },
    { key: "stability", dir: "asc", label: "Stability asc" },
    { key: "stability", dir: "desc", label: "Stability desc" },
  ];

  return (
    <div className="relative min-[960px]:hidden">
      <button
        onClick={() => onOpenChange(!open)}
        className={`${TAILWIND.button.secondary} inline-flex items-center gap-2 text-sm`}
        type="button"
      >
        <span>Sort</span>
        <ChevronDown className="h-4 w-4 text-gray-300" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => onOpenChange(false)}
          />
          <div className="absolute z-50 mt-2 bg-[#292e40] border border-[#343a4e] rounded-lg left-0 w-[min(220px,calc(100vw-16px))] max-w-[calc(100vw-16px)] overflow-hidden shadow-lg animate-tooltip-zoom p-2">
            <div className="grid gap-1">
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
