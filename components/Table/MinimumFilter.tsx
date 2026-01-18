/**
 * Shared minimum threshold filter for OI and Volume
 * Used in FundingTable, ArbitrageTable
 */

import { ChevronDown } from "lucide-react";
import { TAILWIND } from "@/lib/theme";

interface MinimumFilterProps {
  minOI: number | "";
  minVolume: number | "";
  onMinOIChange: (value: number | "") => void;
  onMinVolumeChange: (value: number | "") => void;
  maxOI: number;
  maxVolume: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SLIDER_STEPS = 1000;
const MIDPOINT_VALUE = 1_000_000;
function formatNumberWithSpaces(value: number) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function parseNumberInput(rawValue: string) {
  const digitsOnly = rawValue.replace(/\s+/g, "").replace(/[^\d]/g, "");
  if (!digitsOnly) return "";
  return Number(digitsOnly);
}

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
    return (
      0.5 * (Math.log1p(Math.max(value, 0)) / Math.log1p(MIDPOINT_VALUE))
    );
  }

  const upperRange = maxValue - MIDPOINT_VALUE;
  return (
    0.5 +
    0.5 *
      (Math.log1p(Math.max(value - MIDPOINT_VALUE, 0)) /
        Math.log1p(upperRange))
  );
}

export default function MinimumFilter({
  minOI,
  minVolume,
  onMinOIChange,
  onMinVolumeChange,
  maxOI,
  maxVolume,
  open,
  onOpenChange,
}: MinimumFilterProps) {
  const activeFilters =
    (typeof minOI === "number" && minOI > 0 ? 1 : 0) +
    (typeof minVolume === "number" && minVolume > 0 ? 1 : 0);

  const clampedMinOI =
    typeof minOI === "number" ? clampValue(minOI, maxOI) : 0;
  const clampedMinVolume =
    typeof minVolume === "number" ? clampValue(minVolume, maxVolume) : 0;
  const oiDisplayValue =
    typeof minOI === "number" ? formatNumberWithSpaces(minOI) : "";
  const volumeDisplayValue =
    typeof minVolume === "number" ? formatNumberWithSpaces(minVolume) : "";
  const oiSliderValue = Math.round(
    sliderFromValue(clampedMinOI, maxOI) * SLIDER_STEPS
  );
  const volumeSliderValue = Math.round(
    sliderFromValue(clampedMinVolume, maxVolume) * SLIDER_STEPS
  );

  return (
    <div className="relative">
      <button
        onClick={() => onOpenChange(!open)}
        className={`${TAILWIND.button.secondary} inline-flex items-center gap-2 text-sm`}
        type="button"
      >
        <span>Filters</span>
        {activeFilters > 0 && (
          <span className="text-blue-400">({activeFilters})</span>
        )}
        <ChevronDown className="h-4 w-4 text-gray-300" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => onOpenChange(false)}
          />
          <div className="absolute z-20 mt-2 bg-[#292e40] border border-[#343a4e] rounded w-56 p-3 shadow-lg space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Min Open Interest
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min={0}
                  max={SLIDER_STEPS}
                  value={oiSliderValue}
                  onChange={(e) => {
                    const sliderValue = Number(e.target.value) / SLIDER_STEPS;
                    const rawValue = valueFromSlider(sliderValue, maxOI);
                    onMinOIChange(Math.round(rawValue));
                  }}
                  disabled={maxOI <= 0}
                  className="w-full accent-emerald-400"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    min={0}
                    max={maxOI || undefined}
                    value={oiDisplayValue}
                    onChange={(e) => {
                      const parsed = parseNumberInput(e.target.value);
                      onMinOIChange(
                        parsed === ""
                          ? ""
                          : clampValue(Math.round(parsed), maxOI)
                      );
                    }}
                    placeholder="0"
                    className="w-36 bg-[#383d50] border border-transparent rounded px-2 py-1 text-sm text-gray-200 focus:outline-none"
                  />
                  {typeof minOI === "number" && minOI > 0 && (
                    <button
                      type="button"
                      onClick={() => onMinOIChange(0)}
                      className="h-6 w-6 rounded-full border border-transparent text-gray-300 text-xs leading-none hover:border-white hover:text-white transition-colors duration-200"
                      aria-label="Clear minimum open interest"
                      title="Clear"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Min Volume
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min={0}
                  max={SLIDER_STEPS}
                  value={volumeSliderValue}
                  onChange={(e) => {
                    const sliderValue = Number(e.target.value) / SLIDER_STEPS;
                    const rawValue = valueFromSlider(sliderValue, maxVolume);
                    onMinVolumeChange(Math.round(rawValue));
                  }}
                  disabled={maxVolume <= 0}
                  className="w-full accent-emerald-400"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    min={0}
                    max={maxVolume || undefined}
                    value={volumeDisplayValue}
                    onChange={(e) => {
                      const parsed = parseNumberInput(e.target.value);
                      onMinVolumeChange(
                        parsed === ""
                          ? ""
                          : clampValue(Math.round(parsed), maxVolume)
                      );
                    }}
                    placeholder="0"
                    className="w-36 bg-[#383d50] border border-transparent rounded px-2 py-1 text-sm text-gray-200 focus:outline-none"
                  />
                  {typeof minVolume === "number" && minVolume > 0 && (
                    <button
                      type="button"
                      onClick={() => onMinVolumeChange(0)}
                      className="h-6 w-6 rounded-full border border-transparent text-gray-300 text-xs leading-none hover:border-white hover:text-white transition-colors duration-200"
                      aria-label="Clear minimum volume"
                      title="Clear"
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
