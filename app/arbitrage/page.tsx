import { Metadata } from "next";
import ArbitrageTable from "@/components/ArbitrageTable";
import PageHeader from "@/components/ui/PageHeader";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Arbitrage Opportunities | Funding Dashboard",
  description: "Top cryptocurrency arbitrage opportunities identified over the last 15 days",
  keywords: ["arbitrage", "crypto", "opportunities", "funding rates", "trading"],
  openGraph: {
    title: "Arbitrage Opportunities | Funding Dashboard",
    description: "Top cryptocurrency arbitrage opportunities identified over the last 15 days",
    type: "website",
  },
};

export default function ArbitragePage() {
  return (
    <main className="min-h-screen bg-gray-900 p-6 text-gray-200">
      <PageHeader title="Arbitrage Top Opportunities" description="Last 15 days" />

      <ArbitrageTable />
    </main>
  );
}
