"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronDown, X } from "lucide-react";
import { TAILWIND } from "@/lib/theme";

interface APRRangeFilterProps {
  minAPR: number | "";
  maxAPRFilter: number | "";
  onMinAPRChange: (value: number | "") => void;
  onMaxAPRFilterChange: (value: number | "") => void;
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

export default function APRRangeFilter({
  minAPR,
  maxAPRFilter,
  onMinAPRChange,
  onMaxAPRFilterChange,
  maxAPR,
  open,
  onOpenChange,
}: APRRangeFilterProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const previousUserSelect = useRef("");
  
  const clampedMin = typeof minAPR === "number" ? clampValue(minAPR, maxAPR) : 0;
  const clampedMax = typeof maxAPRFilter === "number" ? clampValue(maxAPRFilter, maxAPR) : maxAPR;
  
  const minSliderRatio = sliderFromValue(clampedMin, maxAPR);
  const maxSliderRatio = sliderFromValue(clampedMax, maxAPR);
  
  const [minInputValue, setMinInputValue] = useState<string>("");
  const [maxInputValue, setMaxInputValue] = useState<string>("");
  const [dragging, setDragging] = useState<"min" | "max" | null>(null);
  const hasActiveFilter =
    (typeof minAPR === "number" && minAPR > 0) ||
    (typeof maxAPRFilter === "number" && maxAPRFilter < maxAPR);

  useEffect(() => {
    if (typeof minAPR === "number" && minAPR > 0) {
      setMinInputValue(String(minAPR));
    } else {
      setMinInputValue("");
    }
  }, [minAPR]);

  useEffect(() => {
    if (typeof maxAPRFilter === "number" && maxAPRFilter < maxAPR) {
      setMaxInputValue(String(maxAPRFilter));
    } else {
      setMaxInputValue("");
    }
  }, [maxAPRFilter, maxAPR]);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const value = valueFromSlider(ratio, maxAPR);
    const rounded = Math.round(value * 10) / 10;
    
    // Determine which thumb is closer
    const distToMin = Math.abs(ratio - minSliderRatio);
    const distToMax = Math.abs(ratio - maxSliderRatio);
    
    if (distToMin < distToMax) {
      onMinAPRChange(Math.min(rounded, clampedMax));
    } else {
      onMaxAPRFilterChange(Math.max(rounded, clampedMin));
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const value = valueFromSlider(ratio, maxAPR);
    const rounded = Math.round(value * 10) / 10;
    
    if (dragging === "min") {
      onMinAPRChange(Math.min(rounded, clampedMax));
    } else {
      onMaxAPRFilterChange(Math.max(rounded, clampedMin));
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  useEffect(() => {
    if (dragging) {
      previousUserSelect.current = document.body.style.userSelect;
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        document.body.style.userSelect = previousUserSelect.current;
      };
    }
  }, [dragging, clampedMin, clampedMax, maxAPR]);

  const leftPercent = minSliderRatio * 100;
  const rightPercent = maxSliderRatio * 100;

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onOpenChange(!open)}
          className={`${TAILWIND.button.secondary} inline-flex items-center gap-2 text-sm`}
          type="button"
        >
          <span>Filters</span>
          <ChevronDown className="h-4 w-4 text-gray-300" />
        </button>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMinAPRChange("");
              onMaxAPRFilterChange("");
              setMinInputValue("");
              setMaxInputValue("");
            }}
            className="h-6 w-6 rounded-full bg-[#383d50] border border-[#343a4e] text-gray-300 text-xs leading-none flex items-center justify-center transition-colors duration-200 hover:border-white hover:text-white"
            aria-label="Clear APR filters"
            title="Clear"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => onOpenChange(false)} />
          <div className="absolute z-50 mt-2 bg-[#292e40] border border-[#343a4e] rounded w-64 p-3 shadow-lg space-y-3 animate-dropdown">
            <div>
              <label className="block text-sm text-gray-300 mb-3">
                APR Range (%)
              </label>
              
              {/* Gradient SVG for slider */}
              <svg width="0" height="0" className="absolute">
                <defs>
                  <linearGradient id="sliderGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#9E5DEE" />
                    <stop offset="100%" stopColor="#FA814D" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Custom dual range slider */}
              <div className="space-y-3 select-none">
                <div
                  ref={trackRef}
                  className="relative h-2 rounded-full cursor-pointer"
                  style={{ backgroundColor: "#383d50" }}
                  onClick={handleTrackClick}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {/* Gradient fill between thumbs */}
                  <div
                    className="absolute h-full rounded-full"
                    style={{
                      left: `${leftPercent}%`,
                      right: `${100 - rightPercent}%`,
                      background: "linear-gradient(to right, #9E5DEE, #FA814D)",
                    }}
                  />
                  
                  {/* Min thumb */}
                  <div
                    className="absolute w-4 h-4 rounded-full border-2 cursor-grab active:cursor-grabbing"
                    style={{
                      left: `${leftPercent}%`,
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      background: "#292e40",
                      borderColor: "#9E5DEE",
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragging("min");
                    }}
                  />
                  
                  {/* Max thumb */}
                  <div
                    className="absolute w-4 h-4 rounded-full border-2 cursor-grab active:cursor-grabbing"
                    style={{
                      left: `${rightPercent}%`,
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      background: "#292e40",
                      borderColor: "#FA814D",
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragging("max");
                    }}
                  />
                </div>

                {/* Input fields */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={minInputValue}
                    onChange={(e) => {
                      const next = e.target.value;
                      setMinInputValue(next);
                      if (next === "") {
                        onMinAPRChange("");
                        return;
                      }
                      const normalized = next.replace(",", ".");
                      const val = parseFloat(normalized);
                      if (!Number.isNaN(val)) {
                        onMinAPRChange(Math.min(clampValue(val, maxAPR), clampedMax));
                      }
                    }}
                    onBlur={() => {
                      if (minInputValue === "") return;
                      const normalized = minInputValue.replace(",", ".");
                      const val = parseFloat(normalized);
                      if (Number.isNaN(val)) {
                        setMinInputValue("");
                        onMinAPRChange("");
                        return;
                      }
                      const clamped = Math.min(clampValue(val, maxAPR), clampedMax);
                      setMinInputValue(clamped > 0 ? String(clamped) : "");
                      onMinAPRChange(clamped > 0 ? clamped : "");
                    }}
                    placeholder="Min"
                    className="w-20 bg-[#383d50] border border-transparent rounded px-2 py-1 text-xs text-gray-200 focus:outline-none text-center"
                  />
                  <span className="text-gray-500 text-xs">–</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={maxInputValue}
                    onChange={(e) => {
                      const next = e.target.value;
                      setMaxInputValue(next);
                      if (next === "") {
                        onMaxAPRFilterChange("");
                        return;
                      }
                      const normalized = next.replace(",", ".");
                      const val = parseFloat(normalized);
                      if (!Number.isNaN(val)) {
                        onMaxAPRFilterChange(Math.max(clampValue(val, maxAPR), clampedMin));
                      }
                    }}
                    onBlur={() => {
                      if (maxInputValue === "") return;
                      const normalized = maxInputValue.replace(",", ".");
                      const val = parseFloat(normalized);
                      if (Number.isNaN(val)) {
                        setMaxInputValue("");
                        onMaxAPRFilterChange("");
                        return;
                      }
                      const clamped = Math.max(clampValue(val, maxAPR), clampedMin);
                      setMaxInputValue(clamped < maxAPR ? String(clamped) : "");
                      onMaxAPRFilterChange(clamped < maxAPR ? clamped : "");
                    }}
                    placeholder="Max"
                    className="w-20 bg-[#383d50] border border-transparent rounded px-2 py-1 text-xs text-gray-200 focus:outline-none text-center"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
