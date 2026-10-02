import { contexto, manejar, ok } from "@/lib/crm/server/auth";
import { leerJson, lista } from "@/lib/crm/server/validar";
import { importarProductos, registrar } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = manejar(async (req) => {
  const { db, empresa, miembro } = await contexto();
  const b = await leerJson(req);
  const r = await importarProductos(db, empresa, lista(b, "productos").slice(0, 5000));
  await registrar(db, empresa.id, miembro.nombre, `importó productos (${r.nuevos} nuevos, ${r.actualizados} actualizados)`);
  return ok(r);
});
