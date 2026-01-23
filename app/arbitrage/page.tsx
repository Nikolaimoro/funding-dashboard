import { Metadata } from "next";
import ArbitrageTable from "@/components/ArbitrageTable";
import PageHeader from "@/components/ui/PageHeader";
import { EXCHANGE_SEO_LIST } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const exchangeKeywords = EXCHANGE_SEO_LIST.slice(0, 10);

export const metadata: Metadata = {
  title: "Crypto Funding Arbitrage Opportunities | bendbasis",
  description: "Top cryptocurrency funding arbitrage opportunities across exchanges, ranked by stability and APR spread.",
  keywords: ["arbitrage", "crypto", "funding arbitrage", "funding rates", "trading", ...exchangeKeywords],
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
      <ArbitrageTable />
      <section className="sr-only" aria-hidden="true">
        <h2>Funding arbitrage opportunities across exchanges</h2>
        <p>
          Explore funding arbitrage setups across {exchangeList} with spreads
          ranked by stability and APR spread.
        </p>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </main>
  );
}
