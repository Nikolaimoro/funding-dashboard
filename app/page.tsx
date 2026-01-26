import type { Metadata } from "next";
import Link from "next/link";
import { Sora, Caveat } from "next/font/google";
import ExchangeIcon from "@/components/ui/ExchangeIcon";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const exchangeCards = [
  { key: "binance", label: "Binance" },
  { key: "bybit", label: "Bybit" },
  { key: "okx", label: "OKX" },
  { key: "hyperliquid", label: "Hyperliquid" },
  { key: "gate", label: "Gate.io" },
  { key: "gmx", label: "GMX" },
  { key: "mexc", label: "MEXC" },
  { key: "dydx", label: "dYdX" },
  { key: "bingx", label: "BingX" },
  { key: "apex", label: "ApeX" },
  { key: "paradex", label: "Paradex" },
  { key: "variational", label: "Variational" },
  { key: "aster", label: "Aster" },
  { key: "lighter", label: "Lighter" },
  { key: "edgex", label: "edgeX" },
  { key: "blofin", label: "BloFin" },
  { key: "pacifica", label: "Pacifica" },
  { key: "reya", label: "REYA" },
];

export const metadata: Metadata = {
  title: "Funding Arbitrage Dashboard | bendbasis",
  description:
    "Live funding rate arbitrage signals, cross-exchange spreads, and backtests in one clean dashboard.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <main className="relative text-[#201D1D]">
      <div className="fixed inset-0 bg-white -z-10" />
      <div className="pointer-events-none absolute left-1/2 top-[-140px] h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(158,93,238,0.22),_rgba(250,129,77,0.18),_transparent_65%)] blur-3xl opacity-80" />

      <section className="pt-28 pb-16">
        <div className="mx-auto flex max-w-[920px] flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E7E2E0] bg-white px-4 py-1 text-xs uppercase tracking-[0.18em] text-[#8B847E]">
            Funding Arbitrage Screener
          </span>
          <h1 className={`mt-6 text-[44px] leading-tight sm:text-[64px] ${sora.className}`}>
            Turn funding spreads into
            <span className={`block ${caveat.className} text-[48px] sm:text-[70px]`}>
              delta-neutral edge.
            </span>
          </h1>
          <p className="mt-4 text-lg text-[#5C5854] max-w-[640px]">
            Discover profitable delta-neutral funding rate arbitrage opportunities across multiple exchanges.
          </p>
          <div className="mt-7">
            <Link
              href="/funding"
              className="inline-flex items-center justify-center rounded-full bg-[#201D1D] text-white text-sm font-medium px-8 py-3 hover:opacity-90 transition-opacity"
            >
              Open App
            </Link>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-[980px]">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {exchangeCards.map((exchange) => (
              <div
                key={exchange.key}
                className="flex flex-col items-center gap-3 rounded-2xl border border-[#E7E2E0] bg-white px-4 py-5 text-center shadow-[0_14px_30px_rgba(32,29,29,0.05)]"
              >
                <ExchangeIcon
                  exchange={exchange.key}
                  size={44}
                  bgColor="#F7F4F2"
                />
                <span className="text-sm font-medium text-[#201D1D]">
                  {exchange.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
