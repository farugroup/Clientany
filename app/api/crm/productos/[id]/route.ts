import { contexto, manejar, ok } from "@/lib/crm/server/auth";
import { productoDe } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DELETE = manejar<{ id: string }>(async (_req, { params }) => {
  const { db, empresa } = await contexto();
  const p = await productoDe(db, empresa, params.id);
  await db.borrarProducto(p.id);
  return ok({ ok: true });
});
