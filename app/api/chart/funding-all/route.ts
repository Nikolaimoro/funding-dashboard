import { NextResponse } from "next/server";
import { supabase as anonClient } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { RPC_FUNCTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const PAGE_SIZE = 1000;

const getNextHourPlusFiveSeconds = () => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(now.getHours() + 1, 5, 0, 0);
  return Math.max(60, Math.floor((next.getTime() - now.getTime()) / 1000));
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const asset = url.searchParams.get("asset");
    const days = Number(url.searchParams.get("days") ?? 30);

    if (!asset) {
      return NextResponse.json({ error: "asset required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const client =
      serviceKey && serviceKey.length > 0
        ? createClient(supabaseUrl, serviceKey, {
            auth: { persistSession: false },
          })
        : anonClient;

    let allRows: unknown[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await client
        .rpc(RPC_FUNCTIONS.TOKEN_FUNDING_CHARTS_ALL, {
          p_base_asset: asset,
          p_days: Number.isFinite(days) ? days : 30,
        })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.length) break;
      allRows = allRows.concat(data);
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    const ttl = getNextHourPlusFiveSeconds();

    return NextResponse.json(
      { rows: allRows ?? [] },
      {
        headers: {
          "Cache-Control": `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=60`,
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
