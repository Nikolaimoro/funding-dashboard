import { Metadata } from "next";
import FundingTableClient from "@/components/FundingTableClient";
import PageHeader from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Markets - Funding Rates Dashboard | bendbasis",
  description: "Real-time cryptocurrency funding rates across major exchanges",
  keywords: ["funding rates", "crypto", "markets", "trading"],
  openGraph: {
    title: "Markets - Funding Rates Dashboard | bendbasis",
    description: "Real-time cryptocurrency funding rates across major exchanges",
    type: "website",
  },
};

export default function MarketsPage() {
  return (
    <main className="min-h-screen text-gray-200">
      <PageHeader
        title="Markets"
        description="Funding rates across exchanges, annualized and aggregated"
      />
      <FundingTableClient />
    </main>
  );
}
