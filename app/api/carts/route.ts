import { NextResponse } from "next/server";
import { abandonedCarts } from "@/lib/mock-data";

// Abandoned carts feed for the cart-recovery module.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  let results = abandonedCarts;
  if (brandId && brandId !== "all") results = results.filter((c) => c.brandId === brandId);
  if (status) results = results.filter((c) => c.recoveryStatus === status);

  const recoverable = results
    .filter((c) => c.recoveryStatus === "nuevo" || c.recoveryStatus === "contactado")
    .reduce((s, c) => s + c.total, 0);

  return NextResponse.json({ count: results.length, recoverable, results });
}

// Trigger a recovery message for a cart.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { cartId, channel } = body as { cartId?: string; channel?: string };
  if (!cartId) return NextResponse.json({ error: "cartId requerido" }, { status: 400 });
  return NextResponse.json({
    ok: true,
    cartId,
    channel: channel ?? "whatsapp",
    message: "Mensaje de recuperación encolado para envío.",
  });
}
