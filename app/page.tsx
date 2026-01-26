import type { Metadata } from "next";
import Link from "next/link";
import { Sora } from "next/font/google";
import { EXCHANGE_SEO_LIST } from "@/lib/constants";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const exchangeCards = [
  "Binance",
  "Bybit",
  "OKX",
  "Hyperliquid",
  "Gate.io",
  "GMX",
  "MEXC",
  "dYdX",
  "BingX",
  "ApeX",
  "Paradex",
  "Variational",
  "Aster",
  "Lighter",
  "edgeX",
  "BloFin",
  "Pacifica",
  "REYA",
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

      <section className="pt-24 pb-10">
        <div className="max-w-[980px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E7E2E0] bg-white px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#8B847E]">
            Live Funding Arbitrage
          </span>
          <h1 className={`mt-6 text-[42px] leading-tight sm:text-[64px] ${sora.className}`}>
            See funding spreads,
            <span className="block text-[#201D1D]">clearly and instantly.</span>
          </h1>
          <p className="mt-5 text-lg text-[#5C5854] max-w-[640px]">
            bendbasis maps funding rates across top exchanges in real time. Compare
            long-short spreads, pin your venues, and open backtests in seconds.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/funding"
              className="inline-flex items-center justify-center rounded-full bg-[#201D1D] text-white text-sm font-medium px-7 py-3 hover:opacity-90 transition-opacity"
            >
              Open App
            </Link>
            <div className="text-xs uppercase tracking-[0.2em] text-[#8B847E]">
              Tracking {EXCHANGE_SEO_LIST.length}+ exchanges
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-[1100px]">
          <div className="mb-5 flex items-center justify-between">
            <h2 className={`text-lg font-semibold ${sora.className}`}>Available Exchanges</h2>
            <span className="text-xs text-[#8B847E]">Updated daily</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {exchangeCards.map((name, idx) => {
              const isWide = idx === 0 || idx === 3 || idx === 7;
              const isTall = idx === 5;
              return (
                <div
                  key={name}
                  className={[
                    "rounded-2xl border border-[#E7E2E0] bg-white px-4 py-3",
                    "flex items-center justify-between text-sm font-medium text-[#201D1D]",
                    "shadow-[0_12px_30px_rgba(32,29,29,0.04)]",
                    isWide ? "sm:col-span-2" : "",
                    isTall ? "lg:row-span-2 lg:min-h-[140px]" : "",
                  ].join(" ")}
                >
                  <span>{name}</span>
                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-[#9E5DEE] to-[#FA814D]" />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
