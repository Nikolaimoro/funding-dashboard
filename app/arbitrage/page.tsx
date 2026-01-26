import { Metadata } from "next";
import { Suspense } from "react";
import ArbitrageTableServer from "@/components/ArbitrageTableServer";
import PageHeader from "@/components/ui/PageHeader";
import { TableLoadingState } from "@/components/ui/TableStates";
import { EXCHANGE_SEO_LIST } from "@/lib/constants";
import { safeJsonLd } from "@/lib/seo";

export const revalidate = 300;

const exchangeKeywords = EXCHANGE_SEO_LIST.slice(0, 10);

export const metadata: Metadata = {
  title: "Crypto Funding Arbitrage Opportunities | bendbasis",
  description: "Top cryptocurrency funding arbitrage opportunities across exchanges, ranked by stability and APR spread.",
  keywords: [
    "arbitrage",
    "crypto",
    "funding arbitrage",
    "funding rates",
    "funding rates crypto",
    "funding history",
    "trading",
    ...exchangeKeywords,
  ],
  alternates: {
    canonical: "/arbitrage",
  },
  openGraph: {
    title: "Crypto Funding Arbitrage Opportunities | bendbasis",
    description: "Top cryptocurrency funding arbitrage opportunities across exchanges, ranked by stability and APR spread.",
    type: "website",
  },
};

export default function ArbitragePage() {
  const exchangeList = EXCHANGE_SEO_LIST.join(", ");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Crypto Funding Arbitrage Opportunities",
    description:
      "Top cryptocurrency funding arbitrage opportunities across exchanges, ranked by stability and APR spread.",
    publisher: {
      "@type": "Organization",
      name: "bendbasis",
    },
  };

  return (
    <main className="min-h-screen text-gray-200">
      <PageHeader
        title="Arbitrage Top Opportunities"
      />
      <Suspense
        fallback={
          <div className="rounded-2xl border border-[#343a4e] bg-[#292e40]">
            <div className="flex flex-wrap items-center gap-4 px-4 py-4">
              <h2 className="text-base font-roboto text-white">Opportunities</h2>
            </div>
            <TableLoadingState message="Loading arbitrage opportunities…" />
          </div>
        }
      >
        <ArbitrageTableServer />
      </Suspense>
      <section className="sr-only" aria-hidden="true">
        <h2>Funding arbitrage opportunities across exchanges</h2>
        <p>
          Explore funding arbitrage setups across {exchangeList} with spreads
          ranked by stability and APR spread.
        </p>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }}
      />
    </main>
  );
}
