import { Metadata } from "next";
import ArbitrageTable from "@/components/ArbitrageTable";

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
<div className="mb-4 flex flex-wrap items-end justify-between gap-3">
  <h1 className="text-2xl font-semibold">
    Arbitrage Top Opportunities
  </h1>

  <p className="max-w-xl text-sm text-gray-200">
    Last 15 days
  </p>
</div>

      <ArbitrageTable />
    </main>
  );
}