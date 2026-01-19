"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { TAILWIND } from "@/lib/theme";

interface MinAPRFilterProps {
  minAPR: number | "";
  onMinAPRChange: (value: number | "") => void;
  maxAPR: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SLIDER_STEPS = 1000;
const MIDPOINT_VALUE = 100;

function clampValue(value: number, maxValue: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), Math.max(maxValue, 0));
}

function valueFromSlider(t: number, maxValue: number) {
  if (maxValue <= 0) return 0;
  if (maxValue <= MIDPOINT_VALUE) {
    return maxValue * t;
  }

  if (t <= 0.5) {
    const scaledT = t / 0.5;
    return Math.expm1(Math.log1p(MIDPOINT_VALUE) * scaledT);
  }

  const scaledT = (t - 0.5) / 0.5;
  const upperRange = maxValue - MIDPOINT_VALUE;
  return MIDPOINT_VALUE + Math.expm1(Math.log1p(upperRange) * scaledT);
}

function sliderFromValue(value: number, maxValue: number) {
  if (maxValue <= 0) return 0;
  if (maxValue <= MIDPOINT_VALUE) {
    return value / maxValue;
  }

  if (value <= MIDPOINT_VALUE) {
    return 0.5 * (Math.log1p(Math.max(value, 0)) / Math.log1p(MIDPOINT_VALUE));
  }

  const upperRange = maxValue - MIDPOINT_VALUE;
  return (
    0.5 +
    0.5 *
      (Math.log1p(Math.max(value - MIDPOINT_VALUE, 0)) /
        Math.log1p(upperRange))
  );
}

export default function MinAPRFilter({
  minAPR,
  onMinAPRChange,
  maxAPR,
  open,
  onOpenChange,
}: MinAPRFilterProps) {
  const hasActiveFilter = typeof minAPR === "number" && minAPR > 0;
  const previousUserSelect = useRef("");
  const clampedMinAPR =
    typeof minAPR === "number" ? clampValue(minAPR, maxAPR) : 0;
  const sliderValue = Math.round(
    sliderFromValue(clampedMinAPR, maxAPR) * SLIDER_STEPS
  );
  const [inputValue, setInputValue] = useState<string>("");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (typeof minAPR === "number" && minAPR > 0) {
      setInputValue(String(minAPR));
    } else {
      setInputValue("");
    }
  }, [minAPR]);

  useEffect(() => {
    if (!dragging) return;
    previousUserSelect.current = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.userSelect = previousUserSelect.current;
    };
  }, [dragging]);

  return (
    <div className="relative">
      <button
        onClick={() => onOpenChange(!open)}
        className={`${TAILWIND.button.secondary} inline-flex items-center gap-2 text-sm`}
        type="button"
      >
        <span>Filters</span>
        <ChevronDown className="h-4 w-4 text-gray-300" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => onOpenChange(false)} />
          <div className="absolute z-20 mt-2 bg-[#292e40] border border-[#343a4e] rounded w-56 p-3 shadow-lg space-y-3 animate-tooltip-zoom">
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
                    const sliderRatio = Number(e.target.value) / SLIDER_STEPS;
                    const rawValue = valueFromSlider(sliderRatio, maxAPR);
                    onMinAPRChange(Math.round(rawValue * 10) / 10);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onMouseUp={() => setDragging(false)}
                  onMouseLeave={() => setDragging(false)}
                  onTouchStart={() => setDragging(true)}
                  onTouchEnd={() => setDragging(false)}
                  disabled={maxAPR <= 0}
                  className="w-full accent-emerald-400"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={inputValue}
                    onChange={(e) => {
                      const next = e.target.value;
                      setInputValue(next);
                      if (next === "") {
                        onMinAPRChange("");
                        return;
                      }
                      const normalized = next.replace(",", ".");
                      const val = parseFloat(normalized);
                      if (!Number.isNaN(val)) {
                        onMinAPRChange(clampValue(val, maxAPR));
                      }
                    }}
                    onBlur={() => {
                      if (inputValue === "") return;
                      const normalized = inputValue.replace(",", ".");
                      const val = parseFloat(normalized);
                      if (Number.isNaN(val)) {
                        setInputValue("");
                        onMinAPRChange("");
                        return;
                      }
                      const clamped = clampValue(val, maxAPR);
                      setInputValue(String(clamped));
                      onMinAPRChange(clamped);
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
