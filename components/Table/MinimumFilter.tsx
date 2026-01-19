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
  const [dragging, setDragging] = useState(false);
  
  const clampedValue = typeof value === "number" ? clampValue(value, maxValue) : 0;
  const sliderRatio = sliderFromValue(clampedValue, maxValue);
  const leftPercent = sliderRatio * 100;

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const rawValue = valueFromSlider(ratio, maxValue);
    onChange(Math.round(rawValue));
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const rawValue = valueFromSlider(ratio, maxValue);
      onChange(Math.round(rawValue));
    };

    const handleMouseUp = () => {
      setDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
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
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 cursor-grab active:cursor-grabbing"
            style={{
              left: `${leftPercent}%`,
              transform: `translate(-50%, -50%)`,
              background: "#292e40",
              borderColor: leftPercent < 50 ? "#9E5DEE" : "#FA814D",
            }}
            onMouseDown={(e) => {
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
            className="w-28 bg-[#383d50] border border-transparent rounded px-2 py-1 text-xs text-gray-200 focus:outline-none text-center"
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
      setOiDisplayValue(formatNumberWithSpaces(minOI));
    } else {
      setOiDisplayValue("");
    }
  }, [minOI]);

  useEffect(() => {
    if (typeof minVolume === "number" && minVolume > 0) {
      setVolumeDisplayValue(formatNumberWithSpaces(minVolume));
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
          <div className="absolute z-50 mt-2 bg-[#292e40] border border-[#343a4e] rounded w-64 p-3 shadow-lg space-y-4 animate-dropdown">
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
