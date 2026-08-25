import { NextResponse } from "next/server";
import { leads } from "@/lib/mock-data";

// Leads base, filterable by brand and source.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId") ?? undefined;
  const source = searchParams.get("source") ?? undefined;

  let results = leads;
  if (brandId && brandId !== "all") results = results.filter((l) => l.brandId === brandId);
  if (source) results = results.filter((l) => l.source === source);

  return NextResponse.json({ count: results.length, results });
}

// Capture a lead (e.g. from the Mercado Libre lead magnet or a web form).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { name, email, brandId, source } = body as {
    name?: string;
    email?: string;
    brandId?: string;
    source?: string;
  };
  if (!email || !brandId) {
    return NextResponse.json({ error: "email y brandId requeridos" }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    lead: {
      id: `lead_${Date.now()}`,
      name: name ?? "",
      email,
      brandId,
      source: source ?? "leadmagnet",
      capturedAt: new Date().toISOString(),
    },
  });
}
