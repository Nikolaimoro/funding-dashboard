import PageHeader from "@/components/ui/PageHeader";
import { TableLoadingState } from "@/components/ui/TableStates";

export default function FundingLoading() {
  return (
    <main className="min-h-screen text-gray-200">
      <PageHeader
        title="Funding Rate Screener"
        description="Compare funding rates across exchanges to find arbitrage opportunities"
      />
      <div className="rounded-2xl border border-[#343a4e] bg-[#292e40]">
        <div className="flex flex-wrap items-center gap-4 px-4 py-4">
          <h2 className="text-base font-roboto text-white">Screener</h2>
        </div>
        <TableLoadingState message="Loading funding screener…" />
      </div>
    </main>
  );
}
