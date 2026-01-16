import { Metadata } from "next";
import FundingTableClient from "@/components/FundingTableClient";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Funding Rates Dashboard",
  description: "Real-time cryptocurrency funding rates and opportunities across major exchanges",
  keywords: ["funding rates", "crypto", "arbitrage", "trading"],
  openGraph: {
    title: "Funding Rates Dashboard",
    description: "Real-time cryptocurrency funding rates and opportunities across major exchanges",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-900 p-6 text-gray-200">
      <PageHeader title="Funding Rates Dashboard" />
      <FundingTableClient />
    </main>
  );
}
