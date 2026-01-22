/**
 * Shared types across the application
 */

export type SortDir = "asc" | "desc";

/* ================= TABLE TYPES ================= */

export type FundingRow = {
  market_id: number | null;
  exchange: string;
  symbol: string;
  market: string;
  ref_url: string | null;

  open_interest: number | null;
  volume_24h: number | null;
  funding_rate_now: number | null;

  "1d": number | null;
  "3d": number | null;
  "7d": number | null;
  "15d": number | null;
  "30d": number | null;

  updated: string;
};

export type ArbRow = {
  base_asset: string;
  apr_spread: number;
  stability: number | null;

  long_market_id: number;
  short_market_id: number;

  short_exchange: string;
  short_quote: string | null;
  short_open_interest: number | null;
  short_volume_24h: number | null;
  short_url: string | null;

  long_exchange: string;
  long_quote: string | null;
  long_open_interest: number | null;
  long_volume_24h: number | null;
  long_url: string | null;
};

/* ================= CHART TYPES ================= */

export type FundingChartPoint = {
  funding_time: string; // ISO string
  apr: number;
};

export type ArbChartRow = {
  h: string; // timestamptz ISO
  long_apr: number | null;
  short_apr: number | null;
  spread_apr: number | null;
};

/* ================= COMPONENT PROPS ================= */

export type TableProps<T> = {
  rows: T[];
};

export type ChartModalProps = {
  open: boolean;
  onClose: () => void;
};

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  loading?: boolean;
  error?: string | null;
  children: React.ReactNode;
  height?: string;
};

/* ================= FUNDING SCREENER TYPES ================= */

export type ExchangeColumn = {
  column_key: string;
  exchange: string;
  quote_asset: string;
};

export type FundingMatrixMarket = {
  market_id: number;
  exchange: string;
  quote: string;
  ref_url: string | null;
  volume_24h: number | null;
  open_interest: number | null;
  now: number | null;
  "1d": number | null;
  "3d": number | null;
  "7d": number | null;
  "15d": number | null;
  "30d": number | null;
};

export type FundingMatrixRow = {
  token: string;
  markets: Record<string, FundingMatrixMarket> | null; // exchange_key -> market data
};

export type TimeWindow = "now" | "1d" | "3d" | "7d" | "15d" | "30d";
