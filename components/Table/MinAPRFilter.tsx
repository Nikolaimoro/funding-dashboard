"use client";

import { ChevronDown } from "lucide-react";
import { TAILWIND } from "@/lib/theme";

interface MinAPRFilterProps {
  minAPR: number | "";
  onMinAPRChange: (value: number | "") => void;
  maxAPR: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SLIDER_STEPS = 100;

export default function MinAPRFilter({
  minAPR,
  onMinAPRChange,
  maxAPR,
  open,
  onOpenChange,
}: MinAPRFilterProps) {
  const hasActiveFilter = typeof minAPR === "number" && minAPR > 0;
  const sliderValue =
    typeof minAPR === "number"
      ? Math.round((minAPR / Math.max(maxAPR, 1)) * SLIDER_STEPS)
      : 0;
  const displayValue =
    typeof minAPR === "number" && minAPR > 0 ? minAPR.toFixed(1) : "";

  return (
    <div className="relative">
      <button
        onClick={() => onOpenChange(!open)}
        className={`${TAILWIND.button.secondary} inline-flex items-center gap-2 text-sm`}
        type="button"
      >
        <span>Filters</span>
        {hasActiveFilter && <span className="text-blue-400">(1)</span>}
        <ChevronDown className="h-4 w-4 text-gray-300" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => onOpenChange(false)} />
          <div className="absolute z-20 mt-2 bg-[#292e40] border border-[#343a4e] rounded w-56 p-3 shadow-lg space-y-3 animate-dropdown-in">
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Min Max Arb (%)
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min={0}
                  max={SLIDER_STEPS}
                  value={sliderValue}
                  onChange={(e) => {
                    const val = (Number(e.target.value) / SLIDER_STEPS) * maxAPR;
                    onMinAPRChange(Math.round(val * 10) / 10);
                  }}
                  disabled={maxAPR <= 0}
                  className="w-full accent-emerald-400"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={displayValue}
                    onChange={(e) => {
                      const val =
                        e.target.value === "" ? "" : parseFloat(e.target.value);
                      if (val === "" || !isNaN(val)) {
                        onMinAPRChange(val === "" ? "" : Math.min(val, maxAPR));
                      }
                    }}
                    placeholder="0"
                    className="w-36 bg-[#383d50] border border-transparent rounded px-2 py-1 text-sm text-gray-200 focus:outline-none"
                  />
                  {hasActiveFilter && (
                    <button
                      type="button"
                      onClick={() => onMinAPRChange(0)}
                      className="h-5 w-5 rounded-full bg-[#383d50] border border-[#343a4e] text-gray-300 text-xs leading-none flex items-center justify-center transition-colors duration-200 hover:border-white hover:text-white"
                      aria-label="Clear filter"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
