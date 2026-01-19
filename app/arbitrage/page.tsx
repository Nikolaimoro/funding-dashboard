import { Metadata } from "next";
import ArbitrageTable from "@/components/ArbitrageTable";
import PageHeader from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Crypto Funding Arbitrage Opportunities | bendbasis",
  description: "Top cryptocurrency arbitrage opportunities identified over the last 15 days",
  keywords: ["arbitrage", "crypto", "opportunities", "funding rates", "trading"],
  alternates: {
    canonical: "/arbitrage",
  },
  openGraph: {
    title: "Crypto Funding Arbitrage Opportunities | bendbasis",
    description: "Top cryptocurrency arbitrage opportunities identified over the last 15 days",
    type: "website",
  },
};

export default function ArbitragePage() {
  return (
    <main className="min-h-screen text-gray-200">
      <PageHeader
        title="Arbitrage Top Opportunities"
      />
      <ArbitrageTable />
    </main>
  );
}
