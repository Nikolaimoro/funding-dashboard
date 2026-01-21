import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { SUPABASE_TABLES, DEFAULT_PAGE_SIZE } from "@/lib/constants";

export const revalidate = 300; // 5 minutes

const PAGE_SIZE = DEFAULT_PAGE_SIZE ?? 1000;

const fetchAll = async (table: string, orderBy?: { column: string; asc?: boolean }) => {
	let allRows: unknown[] = [];
	let from = 0;

	while (true) {
		let query = supabase.from(table).select("*");
		if (orderBy) {
			query = query.order(orderBy.column, {
				ascending: orderBy.asc ?? false,
				nullsFirst: false,
			});
		}

		const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

		if (error) {
			throw new Error(error.message);
		}

		if (!data?.length) break;
		allRows = allRows.concat(data);

		if (data.length < PAGE_SIZE) break;
		from += PAGE_SIZE;
	}

	return allRows;
};

const fetchScreenerData = async () => {
	const { data: columns, error: columnsError } = await supabase
		.from("exchange_columns")
		.select("*")
		.order("column_key", { ascending: true });

	if (columnsError) {
		throw new Error(columnsError.message);
	}

	const rows = await fetchAll("token_funding_matrix_mv");

	return { columns: columns ?? [], rows };
};

export async function GET(request: Request) {
	try {
		const url = new URL(request.url);
		const type = url.searchParams.get("type") ?? "funding";

		let payload: Record<string, unknown> = { generatedAt: new Date().toISOString() };

		if (type === "funding") {
			const rows = await fetchAll(SUPABASE_TABLES.FUNDING_DASHBOARD_MV, {
				column: "volume_24h",
				asc: false,
			});
			payload = { ...payload, rows };
		} else if (type === "arbitrage") {
			const rows = await fetchAll(SUPABASE_TABLES.ARB_OPPORTUNITIES, {
				column: "stability",
				asc: false,
			});
			payload = { ...payload, rows };
		} else if (type === "screener") {
			const data = await fetchScreenerData();
			payload = { ...payload, ...data };
		} else {
			return NextResponse.json({ error: "Invalid type" }, { status: 400 });
		}

		return NextResponse.json(payload, {
			headers: {
				"Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=60",
			},
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
