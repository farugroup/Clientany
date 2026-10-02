import { contexto, manejar, ok } from "@/lib/crm/server/auth";
import { pedidoDe } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DELETE = manejar<{ id: string }>(async (_req, { params }) => {
  const { db, empresa } = await contexto();
  const p = await pedidoDe(db, empresa, params.id);
  await db.borrarPedido(p.id);
  return ok({ ok: true });
});
