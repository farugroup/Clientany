import { contexto, manejar, ok } from "@/lib/crm/server/auth";
import { leerJson } from "@/lib/crm/server/validar";
import { armarProducto, productoDe } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Con `id` actualiza; si no, upsert por sku.
export const POST = manejar(async (req) => {
  const { db, empresa } = await contexto();
  const b = await leerJson(req);
  let previo = typeof b.id === "string" && b.id ? await productoDe(db, empresa, b.id) : null;
  if (!previo && typeof b.sku === "string" && b.sku.trim()) previo = await db.productoPorSku(empresa.id, b.sku.trim());
  const p = armarProducto(empresa, b, previo);
  await db.guardarProducto(p);
  return ok(p);
});
