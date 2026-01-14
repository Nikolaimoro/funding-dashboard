/**
 * Backtester page types
 */

export type BacktesterChartData = {
  token: string;
  longEx: string;
  shortEx: string;
  longQuote: string;
  shortQuote: string;
  longMarketId: number;
  shortMarketId: number;
  longRefUrl: string | null;
  shortRefUrl: string | null;
};

export type BacktesterExchange = {
  exchange: string;
  quotes: Array<{
    asset: string;
    marketId: number;
    refUrl: string | null;
  }>;
};

export type BacktesterFormProps = {
  tokens: string[];
  exchanges: BacktesterExchange[];
  initialToken?: string;
  initialLongEx?: string;
  initialShortEx?: string;
};
