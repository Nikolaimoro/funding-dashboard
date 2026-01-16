/**
 * Centralized theme configuration
 * All colors, spacing, and design constants
 */

export const COLORS = {
  text: {
    primary: "#e5e7eb",      // gray-200
    secondary: "#9ca3af",    // gray-500
    muted: "#6b7280",        // gray-600
    disabled: "#4b5563",     // gray-700
  },
  bg: {
    page: "#111827",         // gray-900
    surface: "#1f2937",      // gray-800
    hover: "#374151",        // gray-700
    overlay: "rgba(0,0,0,0.6)",
  },
  chart: {
    primary: "#60a5fa",      // blue-400
    success: "#34d399",      // emerald-400
    danger: "#f87171",       // red-400
    grid: "rgba(148, 163, 184, 0.06)",
    gridZero: "rgba(148, 163, 184, 0.35)",
  },
  borders: {
    default: "#1e293b",      // gray-800
    hover: "#475569",        // gray-700
  },
} as const;

export const CHART_CONFIG = {
  SEVEN_DAYS_MS: 7 * 24 * 60 * 60 * 1000,
  THIRTY_DAYS_MS: 30 * 24 * 60 * 60 * 1000,
  TOOLTIP_FORMAT: "yyyy-MM-dd HH:mm",
  MODAL_HEIGHT: "520px",
  MODAL_WIDTH: "1100px",
  MODAL_BREAKPOINT: "92vw", // max-width for mobile
} as const;

export const TAILWIND = {
  text: {
    primary: "text-gray-200",
    secondary: "text-gray-400",
    muted: "text-gray-600",
    active: "text-blue-400",
  },
  bg: {
    page: "bg-gray-900",
    surface: "bg-gray-800",
    dark: "bg-gray-900",
    hover: "hover:bg-gray-700/40",
  },
  border: {
    default: "border border-gray-800",
    hover: "hover:border-gray-600",
  },
  table: {
    header: "px-4 py-3 text-left",
    cell: "px-4 py-2",
    row: "border-b border-gray-800",
  },
  modal: {
    overlay: "fixed inset-0 z-50",
    background: "absolute inset-0 bg-black/60",
    container: "absolute left-1/2 top-1/2 w-[min(1100px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-800 bg-gray-900 shadow-2xl",
    header: "flex items-center justify-between gap-3 border-b border-gray-800 px-4 py-3",
    body: "px-4 py-4",
    title: "text-lg font-outfit font-normal text-gray-100 truncate",
  },
  button: {
    secondary: "border border-gray-700 px-3 py-1 rounded hover:border-gray-500 hover:text-gray-200 transition disabled:opacity-40",
  },
  input: {
    default: "bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm",
  },
} as const;

// Spinner/Loading
export const LOADING_SPINNER = {
  size: "h-5 w-5",
  borderColor: "border-2 border-gray-500",
  animation: "border-t-transparent animate-spin",
} as const;
