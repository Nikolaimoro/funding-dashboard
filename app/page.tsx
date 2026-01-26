import type { Metadata } from "next";
import Link from "next/link";
import ExchangeIcon from "@/components/ui/ExchangeIcon";
import LandingHeader from "@/components/LandingHeader";
import LandingFaq from "@/components/LandingFaq";

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
      <LandingHeader />
      <div className="fixed inset-0 z-0 bg-white" />
      <div className="pointer-events-none absolute left-1/2 top-[-420px] z-0 h-[1260px] w-[1720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(158,93,238,0.16),_rgba(250,129,77,0.12),_transparent_65%)] blur-3xl opacity-70" />

      <section className="relative z-10 pt-28 pb-12">
        <div className="mx-auto flex max-w-[860px] flex-col items-center text-center">
          <h1 className="text-[42px] leading-[1.05] font-semibold sm:text-[64px]">
            Structured
            <span className="block">funding arbitrage</span>
          </h1>
          <p className="mt-4 text-lg text-[#5C5854] max-w-[640px]">
            Built for identifying delta-neutral funding opportunities.
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

      <section className="relative z-10 pb-16">
        <div className="mx-auto max-w-[1040px] px-2">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <h2 className="text-2xl font-semibold text-[#201D1D]">
                Why BendBasis
              </h2>
              <p className="mt-4 text-[#5C5854]">
                Funding arbitrage needs structure, not just a single rate. BendBasis
                aligns funding data across exchanges, time windows, and long/short
                positioning so delta-neutral decisions are clearer and more reliable.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-[#5C5854]">
                <span className="rounded-full bg-[#F8F8F8] px-4 py-2">
                  Structured over snapshots
                </span>
                <span className="rounded-full bg-[#F8F8F8] px-4 py-2">
                  Long/short asymmetry visible
                </span>
                <span className="rounded-full bg-[#F8F8F8] px-4 py-2">
                  Cross-exchange comparability
                </span>
                <span className="rounded-full bg-[#F8F8F8] px-4 py-2">
                  Delta-neutral by design
                </span>
              </div>
            </div>
            <div className="rounded-3xl bg-[#FCFCFC] p-6">
              <h3 className="text-lg font-semibold text-[#201D1D]">
                Built for
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-[#5C5854]">
                <li>Traders who focus on structure over speculation</li>
                <li>Teams running market-neutral strategies</li>
                <li>Analysts who value consistency and transparency</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 pb-32">
        <div className="mx-auto max-w-[1200px]">
          <div className="relative">
            <div className="pointer-events-none absolute -left-24 top-0 h-full w-28 bg-white/80 backdrop-blur-3xl" />
            <div className="pointer-events-none absolute -right-24 top-0 h-full w-28 bg-white/80 backdrop-blur-3xl" />
            <div className="space-y-4">
              {[0, 1, 2].map((row) => {
                const rowItems = exchangeCards.slice(row * 6, row * 6 + 6);
                const leftPad = row === 1 ? "pl-24" : "pl-0";
                return (
                  <div
                    key={`row-${row}`}
                    className={`flex flex-wrap justify-center gap-x-3 gap-y-3 ${leftPad}`}
                  >
                    {rowItems.map((exchange) => {
                      const width = Math.min(240, Math.max(160, 110 + exchange.label.length * 6));
                      return (
                        <div
                          key={exchange.key}
                          className="flex items-center justify-center gap-3 rounded-full border border-[#E7E2E0] bg-white px-5 py-2 transition-transform duration-700 ease-out hover:-translate-y-1.5"
                          style={{ width }}
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
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <LandingFaq />
    </main>
  );
}
