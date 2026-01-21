import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { RPC_FUNCTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const getNextHourPlusFiveSeconds = () => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(now.getHours() + 1, 5, 0, 0);
  return Math.max(60, Math.floor((next.getTime() - now.getTime()) / 1000));
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const marketId = Number(url.searchParams.get("marketId"));
    const days = Number(url.searchParams.get("days") ?? 30);

    if (!Number.isFinite(marketId)) {
      return NextResponse.json({ error: "marketId required" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc(RPC_FUNCTIONS.FUNDING_CHART, {
      p_market_id: marketId,
      p_days: Number.isFinite(days) ? days : 30,
    });

    if (error) {
      throw new Error(error.message);
    }

    const ttl = getNextHourPlusFiveSeconds();

    return NextResponse.json(
      { rows: data ?? [] },
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
