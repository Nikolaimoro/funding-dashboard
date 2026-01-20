"use client";

import Image from "next/image";

/**
 * Exchange icon configuration
 * Maps exchange key to icon filename and optional background color
 */
export const EXCHANGE_ICONS: Record<string, { file: string; bg?: string; scale?: number }> = {
  aster: { file: "aster.svg", bg: "#1a1a2e" },
  binance: { file: "binance.png", bg: "#1e2026" },
  bingx: { file: "bingx.png", bg: "#1a1a2e", scale: 1 },
  bybit: { file: "bybit.svg", bg: "#1a1a2e" },
  gate: { file: "gate.png", bg: "#1a1a2e" },
  hyperliquid: { file: "hyperliquid.png", bg: "#1a1a2e" },
  mexc: { file: "mexc.svg", bg: "#1a1a2e", scale: 1 },
  okx: { file: "okx.png", bg: "#1a1a2e", scale: 1 },
  paradex: { file: "paradex.png", bg: "#1a1a2e", scale: 1 },
  variational: { file: "variational.png", bg: "#1a1a2e", scale: 1 },
  extended: { file: "extended.svg", bg: "#1a1a2e", scale: 0.7 },
  lighter: { file: "lighter.svg", bg: "#1a1a2e", scale: 0.5},
};

interface ExchangeIconProps {
  exchange: string;
  /** Icon size in pixels (default: 16) */
  size?: number;
  /** Custom background color override */
  bgColor?: string;
  /** Additional class names */
  className?: string;
}

/**
 * Exchange icon component with rounded square background
 * Displays exchange logo inside a rounded container
 */
export default function ExchangeIcon({
  exchange,
  size = 16,
  bgColor,
  className = "",
}: ExchangeIconProps) {
  const config = EXCHANGE_ICONS[exchange.toLowerCase()];
  
  const borderRadius = Math.max(4, Math.round(size * 0.25));

  if (!config) {
    // Fallback: show first letter in a rounded square
    return (
      <span
        className={`inline-flex items-center justify-center text-[10px] font-bold text-gray-400 ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: bgColor || "#1a1a2e",
          borderRadius,
        }}
      >
        {exchange.charAt(0).toUpperCase()}
      </span>
    );
  }

  const bg = bgColor || config.bg || "#1a1a2e";
  const scale = config.scale ?? 0.8;
  const iconSize = Math.round(size * scale);

  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        borderRadius,
      }}
    >
      <Image
        src={`/icons/exchanges/${config.file}`}
        alt={exchange}
        width={iconSize}
        height={iconSize}
        className="object-contain"
        unoptimized={config.file.endsWith(".svg")}
      />
    </span>
  );
}

