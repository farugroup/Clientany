import { NextResponse } from "next/server";
import { orders } from "@/lib/mock-data";

// "Seguí tu envío" lookup: find an order by order number, email, or name.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const brandId = searchParams.get("brandId") ?? undefined;

  if (!q) {
    return NextResponse.json({ error: "Ingresá un número de orden, email o nombre." }, { status: 400 });
  }

  const results = orders.filter((o) => {
    if (brandId && brandId !== "all" && o.brandId !== brandId) return false;
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.trackingCode.toLowerCase().includes(q)
    );
  });

  // Simulate network latency for realism.
  await new Promise((r) => setTimeout(r, 350));

  return NextResponse.json({ count: results.length, results });
}
