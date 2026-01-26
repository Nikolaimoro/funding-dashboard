import { Metadata } from "next";
import { Suspense } from "react";
import FundingTableServer from "@/components/FundingTableServer";
import PageHeader from "@/components/ui/PageHeader";
import { TableLoadingState } from "@/components/ui/TableStates";
import { EXCHANGE_SEO_LIST } from "@/lib/constants";
import { safeJsonLd } from "@/lib/seo";

export const revalidate = 300;

const exchangeKeywords = EXCHANGE_SEO_LIST.slice(0, 10);

export const metadata: Metadata = {
  title: "Markets - Funding Rates Dashboard | bendbasis",
  description: "Real-time cryptocurrency funding rates across major exchanges, annualized and sortable by volume.",
  keywords: [
    "funding rates",
    "funding rates crypto",
    "funding history",
    "crypto",
    "markets",
    "funding rate dashboard",
    "trading",
    ...exchangeKeywords,
  ],
  alternates: {
    canonical: "/markets",
  },
  openGraph: {
    title: "Markets - Funding Rates Dashboard | bendbasis",
    description: "Real-time cryptocurrency funding rates across major exchanges, annualized and sortable by volume.",
    type: "website",
  },
};

export default function MarketsPage() {
  const exchangeList = EXCHANGE_SEO_LIST.join(", ");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Markets - Funding Rates Dashboard",
    description:
      "Real-time cryptocurrency funding rates across major exchanges, annualized and sortable by volume.",
    publisher: {
      "@type": "Organization",
      name: "bendbasis",
    },
  };

  return (
    <main className="min-h-screen text-gray-200">
      <PageHeader
        title="Markets"
        description="Funding rates across exchanges, annualized and aggregated"
      />
      <Suspense
        fallback={
          <div className="rounded-2xl border border-[#343a4e] bg-[#292e40]">
            <div className="flex flex-wrap items-center gap-4 px-4 py-4">
              <h2 className="text-base font-roboto text-white">Markets</h2>
            </div>
            <TableLoadingState message="Loading funding rates…" />
          </div>
        }
      >
        <FundingTableServer />
      </Suspense>
      <section className="sr-only" aria-hidden="true">
        <h2>Markets funding rates across exchanges</h2>
        <p>
          Track live funding rates across exchanges like {exchangeList} with
          annualized funding rate data and volume context.
        </p>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }}
      />
    </main>
  );
}
