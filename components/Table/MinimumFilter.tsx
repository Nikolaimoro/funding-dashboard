/**
 * Shared minimum threshold filter for OI and Volume
 * Used in FundingTable, ArbitrageTable
 */

"use client";

import { useEffect, useState, useRef } from "react";
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

const MIDPOINT_VALUE = 1_000_000;

function formatNumberWithCommas(value: number) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseNumberInput(rawValue: string) {
  const digitsOnly = rawValue.replace(/,/g, "").replace(/[^\d]/g, "");
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

interface SingleSliderProps {
  label: string;
  value: number | "";
  onChange: (value: number | "") => void;
  maxValue: number;
  displayValue: string;
  onDisplayChange: (value: string) => void;
}

function GradientSlider({
  label,
  value,
  onChange,
  maxValue,
  displayValue,
  onDisplayChange,
}: SingleSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const previousUserSelect = useRef("");
  const [dragging, setDragging] = useState(false);
  
  const clampedValue = typeof value === "number" ? clampValue(value, maxValue) : 0;
  const sliderRatio = sliderFromValue(clampedValue, maxValue);
  const leftPercent = sliderRatio * 100;

  const updateFromClientX = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const rawValue = valueFromSlider(ratio, maxValue);
    onChange(Math.round(rawValue));
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    updateFromClientX(e.clientX);
  };

  useEffect(() => {
    if (!dragging) return;
    previousUserSelect.current = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      updateFromClientX(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      e.preventDefault();
      updateFromClientX(touch.clientX);
    };

    const handleMouseUp = () => {
      setDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchend", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleMouseUp);
      document.body.style.userSelect = previousUserSelect.current;
    };
  }, [dragging, maxValue, onChange]);

  return (
    <div>
      <label className="block text-sm text-gray-300 mb-3">{label}</label>
      <div className="space-y-3">
        <div
          ref={trackRef}
          className="relative h-2 rounded-full cursor-pointer"
          style={{ backgroundColor: "#383d50" }}
          onClick={handleTrackClick}
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            if (!touch) return;
            updateFromClientX(touch.clientX);
            setDragging(true);
          }}
        >
          {/* Gradient fill from left to thumb */}
          <div
            className="absolute h-full rounded-full"
            style={{
              left: 0,
              width: `${leftPercent}%`,
              background: "linear-gradient(to right, #9E5DEE, #FA814D)",
            }}
          />
          
          {/* Thumb */}
          <div
            className="absolute w-4 h-4 rounded-full border-2 cursor-grab active:cursor-grabbing"
            style={{
              left: `${leftPercent}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              background: "#292e40",
              borderColor: leftPercent < 50 ? "#9E5DEE" : "#FA814D",
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragging(true);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragging(true);
            }}
          />
        </div>

        {/* Input field */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={displayValue}
            onChange={(e) => {
              onDisplayChange(e.target.value);
              const parsed = parseNumberInput(e.target.value);
              onChange(parsed === "" ? "" : clampValue(Math.round(parsed), maxValue));
            }}
            placeholder="0"
            className="w-28 bg-[#383d50] border border-transparent rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none text-center"
          />
          {typeof value === "number" && value > 0 && (
            <button
              type="button"
              onClick={() => onChange(0)}
              className="h-5 w-5 rounded-full bg-[#383d50] border border-[#343a4e] text-gray-300 text-xs leading-none flex items-center justify-center transition-colors duration-200 hover:border-white hover:text-white"
              aria-label={`Clear ${label.toLowerCase()}`}
              title="Clear"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
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
  const [oiDisplayValue, setOiDisplayValue] = useState("");
  const [volumeDisplayValue, setVolumeDisplayValue] = useState("");

  useEffect(() => {
    if (typeof minOI === "number" && minOI > 0) {
      setOiDisplayValue(formatNumberWithCommas(minOI));
    } else {
      setOiDisplayValue("");
    }
  }, [minOI]);

  useEffect(() => {
    if (typeof minVolume === "number" && minVolume > 0) {
      setVolumeDisplayValue(formatNumberWithCommas(minVolume));
    } else {
      setVolumeDisplayValue("");
    }
  }, [minVolume]);

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
          <div
            className="fixed inset-0 z-40"
            onClick={() => onOpenChange(false)}
          />
          <div className="fixed z-50 left-2 right-2 top-20 bg-[#292e40] border border-[#343a4e] rounded-lg max-h-[80vh] overflow-hidden sm:absolute sm:left-0 sm:right-auto sm:top-auto sm:mt-2 sm:w-64 sm:max-h-none p-3 shadow-lg space-y-4 animate-tooltip-zoom">
            <GradientSlider
              label="Min Open Interest"
              value={minOI}
              onChange={onMinOIChange}
              maxValue={maxOI}
              displayValue={oiDisplayValue}
              onDisplayChange={setOiDisplayValue}
            />

            <GradientSlider
              label="Min Volume"
              value={minVolume}
              onChange={onMinVolumeChange}
              maxValue={maxVolume}
              displayValue={volumeDisplayValue}
              onDisplayChange={setVolumeDisplayValue}
            />
          </div>
        </>
      )}
    </div>
  );
}
