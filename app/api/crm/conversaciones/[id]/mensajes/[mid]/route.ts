import { NoEncontrado, contexto, manejar, ok } from "@/lib/crm/server/auth";
import { convDe } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DELETE = manejar<{ id: string; mid: string }>(async (_req, { params }) => {
  const { db, empresa } = await contexto();
  const conv = await convDe(db, empresa, params.id);
  const m = await db.mensaje(params.mid);
  if (!m || m.conversacion_id !== conv.id) throw new NoEncontrado("No encontré ese mensaje.");
  await db.borrarMensaje(m.id);
  return ok({ ok: true });
});
