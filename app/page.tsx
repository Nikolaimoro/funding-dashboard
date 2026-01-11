import { supabase } from "@/lib/supabase";
import FundingTable from "@/components/FundingTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 1000;

export default async function HomePage() {
  let allRows: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("funding_dashboard_mv")
      .select("*")
      .order("15d", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      return (
        <div className="p-6 text-red-600">
          Error loading data: {error.message}
        </div>
      );
    }

    if (!data || data.length === 0) break;

    allRows.push(...data);

    if (data.length < PAGE_SIZE) break;

    from += PAGE_SIZE;
  }

  return <FundingTable rows={allRows} />;
}