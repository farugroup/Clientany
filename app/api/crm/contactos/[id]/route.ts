import { contexto, manejar, ok } from "@/lib/crm/server/auth";
import { contactoDe } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DELETE = manejar<{ id: string }>(async (_req, { params }) => {
  const { db, empresa } = await contexto();
  const c = await contactoDe(db, empresa, params.id);
  await db.borrarContacto(c.id);
  return ok({ ok: true });
});
