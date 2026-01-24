import PageHeader from "@/components/ui/PageHeader";
import { TableLoadingState } from "@/components/ui/TableStates";

export default function ArbitrageLoading() {
  return (
    <main className="min-h-screen text-gray-200">
      <PageHeader title="Arbitrage Top Opportunities" />
      <div className="rounded-2xl border border-[#343a4e] bg-[#292e40]">
        <div className="flex flex-wrap items-center gap-4 px-4 py-4">
          <h2 className="text-base font-roboto text-white">Opportunities</h2>
        </div>
        <TableLoadingState message="Loading arbitrage opportunities…" />
      </div>
    </main>
  );
}
