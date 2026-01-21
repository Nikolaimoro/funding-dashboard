import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TYPES = ["funding", "arbitrage", "screener"] as const;

type TypeKey = (typeof TYPES)[number];

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const provided = url.searchParams.get("secret") || request.headers.get("x-cron-secret");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deploymentUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    url.origin;
  const baseUrl = new URL(
    deploymentUrl.startsWith("http") ? deploymentUrl : `https://${deploymentUrl}`
  );

  const results = await Promise.all(
    TYPES.map(async (type) => {
      const endpoint = new URL("/api/dashboard", baseUrl);
      endpoint.searchParams.set("type", type);

      const res = await fetch(endpoint.toString(), {
        cache: "no-store",
      });

      return {
        type,
        ok: res.ok,
        status: res.status,
      } as { type: TypeKey; ok: boolean; status: number };
    })
  );

  return NextResponse.json(
    {
      refreshedAt: new Date().toISOString(),
      results,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
