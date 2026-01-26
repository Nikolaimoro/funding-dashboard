import type { Metadata } from "next";
import Link from "next/link";
import ExchangeIcon from "@/components/ui/ExchangeIcon";

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
    <main className="relative -mx-6 -my-4 min-h-screen bg-white px-6 py-4 text-[#201D1D]">
      <div className="fixed inset-0 z-0 bg-white" />
      <div className="pointer-events-none absolute left-1/2 top-[40px] z-0 h-[900px] w-[1230px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(158,93,238,0.2),_rgba(250,129,77,0.16),_transparent_65%)] blur-3xl opacity-70" />

      <section className="relative z-10 pt-28 pb-12">
        <div className="mx-auto flex max-w-[860px] flex-col items-center text-center">
          <h1 className="text-[42px] leading-[1.05] font-semibold sm:text-[64px]">
            Funding arbitrage
            <span className="block">without the noise</span>
          </h1>
          <p className="mt-4 text-lg text-[#5C5854] max-w-[640px]">
            Find delta-neutral funding arbitrage opportunities across multiple exchanges.
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

      <section className="relative z-10 pb-20">
        <div className="mx-auto max-w-[1200px]">
          <div className="relative">
            <div className="pointer-events-none absolute -left-10 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-white/90 blur-2xl" />
            <div className="pointer-events-none absolute -right-10 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-white/90 blur-2xl" />
            <div className="grid grid-cols-6 gap-x-5 gap-y-4">
              {exchangeCards.map((exchange, index) => (
                <div
                  key={exchange.key}
                  className="flex items-center justify-center gap-3 rounded-full border border-[#E7E2E0] bg-white px-5 py-2 transition-transform duration-700 ease-out hover:-translate-y-1.5"
                  style={{
                    marginLeft: index % 6 === 1 || index % 6 === 4 ? 10 : 0,
                    marginRight: index % 6 === 2 ? 10 : 0,
                  }}
                >
                  <ExchangeIcon
                    exchange={exchange.key}
                    size={22}
                    bgColor="#201D1D"
                  />
                  <span className="text-sm font-medium text-[#201D1D]">
                    {exchange.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
