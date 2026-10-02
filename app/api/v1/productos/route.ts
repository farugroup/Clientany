import type { Producto } from "@/lib/crm/types";
import { Invalido, manejar, ok } from "@/lib/crm/server/auth";
import { empresaPorApiKey } from "@/lib/crm/server/api-key";
import { leerJsonOLista, type Cuerpo } from "@/lib/crm/server/validar";
import { armarProducto } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = manejar(async (req) => {
  const { db, empresa } = await empresaPorApiKey(req);
  return ok(await db.productos(empresa.id));
});

// Uno o una lista; upsert por sku.
export const POST = manejar(async (req) => {
  const { db, empresa } = await empresaPorApiKey(req);
  const body = await leerJsonOLista(req);
  const guardarUno = async (b: Cuerpo): Promise<Producto> => {
    const entrada: Cuerpo = { ...b };
    delete entrada.id;
    delete entrada.empresa_id;
    const sku = typeof entrada.sku === "string" ? entrada.sku.trim() : "";
    const previo = sku ? await db.productoPorSku(empresa.id, sku) : null;
    const p = armarProducto(empresa, entrada, previo);
    await db.guardarProducto(p);
    return p;
  };
  if (Array.isArray(body)) {
    if (body.length > 500) throw new Invalido("Hasta 500 productos por llamada.", "lista_larga");
    const out: Producto[] = [];
    for (const b of body) out.push(await guardarUno(b));
    return ok(out, 201);
  }
  return ok(await guardarUno(body), 201);
});
