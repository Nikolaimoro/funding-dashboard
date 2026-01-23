import { Metadata } from "next";
import FundingScreener from "@/components/FundingScreener";
import PageHeader from "@/components/ui/PageHeader";
import { EXCHANGE_SEO_LIST } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const exchangeKeywords = EXCHANGE_SEO_LIST.slice(0, 10);

export const metadata: Metadata = {
  title: "Funding Rate Arbitrage Screener | bendbasis",
  description: "Screen funding rate arbitrage opportunities across major crypto exchanges with live funding rate comparisons.",
  keywords: ["funding rates", "crypto", "funding rate arbitrage", "screener", "trading", ...exchangeKeywords],
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
      <FundingScreener />
      <section className="sr-only" aria-hidden="true">
        <h2>Funding rate arbitrage screener across exchanges</h2>
        <p>
          Compare funding rates across exchanges like {exchangeList} to identify
          cross-exchange funding rate spreads and arbitrage setups.
        </p>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </main>
  );
}
