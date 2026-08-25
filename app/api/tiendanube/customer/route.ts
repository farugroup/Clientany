import { NextResponse } from "next/server";
import { orders } from "@/lib/mock-data";
import { buildCustomerProfile } from "@/lib/customers";

/**
 * Identificación de cliente por teléfono (integración Tienda Nube).
 *
 * GET /api/tiendanube/customer?phone=+5491144772231&brandId=b_lunar
 *
 * En producción, acá se consulta la API de Tienda Nube con las credenciales
 * guardadas del comercio:
 *
 *   const res = await fetch(
 *     `https://api.tiendanube.com/v1/${storeId}/orders?q=${phone}`,
 *     { headers: { Authentication: `bearer ${accessToken}`, "User-Agent": "Clientany" } }
 *   );
 *   const tnOrders = await res.json();
 *
 * y se mapean los pedidos de Tienda Nube al formato interno `Order`.
 * Para la demo, resolvemos contra los pedidos ya sincronizados.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone") ?? "";
  const name = searchParams.get("name") ?? undefined;
  const brandId = searchParams.get("brandId") ?? undefined;

  if (!phone && !name) {
    return NextResponse.json({ error: "Falta phone o name" }, { status: 400 });
  }

  const scope = brandId && brandId !== "all" ? orders.filter((o) => o.brandId === brandId) : orders;

  // Simula latencia de red de la integración.
  await new Promise((r) => setTimeout(r, 250));

  const profile = buildCustomerProfile(scope, { phone, name });
  return NextResponse.json({ source: "tiendanube", profile });
}
