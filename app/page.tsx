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

      <section className="relative z-10 pb-24">
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

      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-[1100px] px-8">
          <h2 className="mb-12 text-[34px] font-semibold text-[#201D1D]">
            A better way to view funding
          </h2>
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
            <div className="relative flex flex-col overflow-hidden rounded-3xl bg-[#F9F9F9] p-6 md:min-h-[320px] group">
              <span
                className="pointer-events-none absolute -right-20 -top-8 h-[30rem] w-[30rem] opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-55"
                style={{
                  background: "radial-gradient(circle, rgba(107,124,255,0.35) 0%, rgba(107,124,255,0) 72%)",
                  filter: "blur(18px)",
                }}
              />
              <span
                className="pointer-events-none absolute -right-20 -top-8 h-[26rem] w-[26rem] opacity-20"
                style={{
                  background: "linear-gradient(135deg, #8BD3FF 0%, #6B7CFF 55%, #E5D6FF 100%)",
                  WebkitMaskImage: "url(/brand/logo_icon.svg)",
                  maskImage: "url(/brand/logo_icon.svg)",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                }}
              />
              <div className="relative z-10 mt-auto pt-24">
                <h3 className="text-xl font-semibold text-[#201D1D]">
                  Compare
                </h3>
                <p className="mt-3 text-base text-[#5C5854]">
                  Funding rates across exchanges, side by side.
                </p>
              </div>
            </div>

            <div className="grid gap-8">
              <div className="relative flex flex-col overflow-hidden rounded-3xl bg-[#F9F9F9] p-6 md:min-h-[200px] group">
                <span
                  className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-55"
                  style={{
                    background: "radial-gradient(circle, rgba(255,122,61,0.35) 0%, rgba(255,122,61,0) 72%)",
                    filter: "blur(16px)",
                  }}
                />
                <span
                  className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 opacity-20"
                  style={{
                    background: "linear-gradient(135deg, #FFC5A1 0%, #FF7A3D 55%, #FF3B00 100%)",
                    WebkitMaskImage: "url(/brand/logo_icon.svg)",
                    maskImage: "url(/brand/logo_icon.svg)",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                  }}
                />
                <div className="relative z-10 mt-auto pt-20">
                  <h3 className="text-xl font-semibold text-[#201D1D]">
                    Neutral
                  </h3>
                  <p className="mt-3 text-base text-[#5C5854]">
                    Built for delta-neutral positioning.
                  </p>
                </div>
              </div>

              <div className="relative flex flex-col overflow-hidden rounded-3xl bg-[#F9F9F9] p-6 md:min-h-[200px] group">
                <span
                  className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-55"
                  style={{
                    background: "radial-gradient(circle, rgba(122,230,161,0.35) 0%, rgba(122,230,161,0) 72%)",
                    filter: "blur(16px)",
                  }}
                />
                <span
                  className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 opacity-20"
                  style={{
                    background: "linear-gradient(135deg, #D5F5DC 0%, #7AE6A1 55%, #4AC68B 100%)",
                    WebkitMaskImage: "url(/brand/logo_icon.svg)",
                    maskImage: "url(/brand/logo_icon.svg)",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                  }}
                />
                <div className="relative z-10 mt-auto pt-20">
                  <h3 className="text-xl font-semibold text-[#201D1D]">
                    History
                  </h3>
                  <p className="mt-3 text-base text-[#5C5854]">
                    Focus on consistent funding, not isolated spikes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFaq />

      <footer className="relative z-10 pb-16">
        <div className="mx-auto max-w-[1100px] rounded-[28px] bg-[#F9F9F9] px-8 py-12">
          <div className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
            <div className="flex h-full flex-col">
              <span
                className="inline-block h-[18px] w-[140px]"
                aria-label="bendbasis"
                role="img"
                style={{
                  backgroundColor: "#8F8E8E",
                  WebkitMaskImage: "url(/brand/logo_full.svg)",
                  maskImage: "url(/brand/logo_full.svg)",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "left center",
                  maskPosition: "left center",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                }}
              />
              <div className="mt-auto flex items-center gap-2 text-[#8F8E8E]">
                <a
                  href="https://x.com/bendbasis"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Bendbasis on X"
                  className="inline-flex h-9 w-9 items-center justify-center"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4 fill-current"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.504 11.24h-6.662l-5.213-6.818-5.967 6.818H1.68l7.73-8.844L1.25 2.25h6.83l4.713 6.231L18.244 2.25zm-1.161 17.52h1.833L7.08 4.126H5.114l11.97 15.644z" />
                  </svg>
                </a>
                <a
                  href="https://t.me/bendbasis"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Bendbasis on Telegram"
                  className="inline-flex h-9 w-9 items-center justify-center"
                >
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 inline-block"
                    style={{
                      backgroundColor: "currentColor",
                      WebkitMaskImage: "url(/icons/social/telegram.svg)",
                      maskImage: "url(/icons/social/telegram.svg)",
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                      maskPosition: "center",
                      WebkitMaskSize: "contain",
                      maskSize: "contain",
                    }}
                  />
                </a>
              </div>
            </div>
            <div className="grid gap-3">
              <h3 className="text-sm font-medium text-[#201D1D]">App</h3>
              <nav className="space-y-2 text-sm text-[#5C5854]">
                <Link href="/funding" className="block hover:text-[#201D1D]">
                  Funding
                </Link>
                <Link href="/markets" className="block hover:text-[#201D1D]">
                  Markets
                </Link>
                <Link href="/arbitrage" className="block hover:text-[#201D1D]">
                  Arbitrage
                </Link>
                <Link href="/backtester" className="block hover:text-[#201D1D]">
                  Backtester
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
