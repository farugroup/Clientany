import { NoEncontrado, manejar, ok } from "@/lib/crm/server/auth";
import { empresaPorApiKey } from "@/lib/crm/server/api-key";
import { leerJson, type Cuerpo } from "@/lib/crm/server/validar";
import { armarProducto } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// { stock?, precio?, activo?, nombre?, stock_minimo?, categoria?… }
export const PATCH = manejar<{ sku: string }>(async (req, { params }) => {
  const { db, empresa } = await empresaPorApiKey(req);
  const previo = await db.productoPorSku(empresa.id, decodeURIComponent(params.sku));
  if (!previo) throw new NoEncontrado("No encontré un producto con ese sku.");
  const b: Cuerpo = { ...(await leerJson(req)) };
  delete b.id;
  delete b.empresa_id;
  delete b.sku;
  const p = armarProducto(empresa, b, previo);
  await db.guardarProducto(p);
  return ok(p);
});
