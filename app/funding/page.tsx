import { Metadata } from "next";
import { Suspense } from "react";
import FundingScreenerServer from "@/components/FundingScreenerServer";
import PageHeader from "@/components/ui/PageHeader";
import { TableLoadingState } from "@/components/ui/TableStates";
import { EXCHANGE_SEO_LIST } from "@/lib/constants";
import { safeJsonLd } from "@/lib/seo";

export const revalidate = 300;

const exchangeKeywords = EXCHANGE_SEO_LIST.slice(0, 10);

export const metadata: Metadata = {
  title: "Funding Rate Arbitrage Screener | bendbasis",
  description: "Screen funding rate arbitrage opportunities across major crypto exchanges with live funding rate comparisons.",
  keywords: [
    "funding rates",
    "funding rates crypto",
    "funding history",
    "crypto",
    "funding rate arbitrage",
    "screener",
    "trading",
    ...exchangeKeywords,
  ],
  alternates: {
    canonical: "/funding",
  },
  openGraph: {
    title: "Funding Rate Arbitrage Screener | bendbasis",
    description: "Screen funding rate arbitrage opportunities across major crypto exchanges with live funding rate comparisons.",
    type: "website",
  },
};

export default function FundingPage() {
  const exchangeList = EXCHANGE_SEO_LIST.join(", ");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Funding Rate Arbitrage Screener",
    description:
      "Screen funding rate arbitrage opportunities across major crypto exchanges with live funding rate comparisons.",
    publisher: {
      "@type": "Organization",
      name: "bendbasis",
    },
  };

  return (
    <main className="min-h-screen text-gray-200">
      <PageHeader
        title="Funding Rate Screener"
        description="Compare funding rates across exchanges to find arbitrage opportunities"
      />
      <Suspense
        fallback={
          <div className="rounded-2xl border border-[#343a4e] bg-[#292e40]">
            <div className="flex flex-wrap items-center gap-4 px-4 py-4">
              <h2 className="text-base font-roboto text-white">Screener</h2>
            </div>
            <TableLoadingState message="Loading funding screener…" />
          </div>
        }
      >
        <FundingScreenerServer />
      </Suspense>
      <section className="sr-only" aria-hidden="true">
        <h2>Funding rate arbitrage screener across exchanges</h2>
        <p>
          Compare funding rates across exchanges like {exchangeList} to identify
          cross-exchange funding rate spreads and arbitrage setups.
        </p>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }}
      />
    </main>
  );
}
