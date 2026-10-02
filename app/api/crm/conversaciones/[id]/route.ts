import { contexto, manejar, ok } from "@/lib/crm/server/auth";
import { convDe, registrar } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DELETE = manejar<{ id: string }>(async (_req, { params }) => {
  const { db, empresa, miembro } = await contexto();
  const conv = await convDe(db, empresa, params.id);
  await db.borrarConversacion(conv.id);
  await registrar(db, empresa.id, miembro.nombre, `borró el chat de ${conv.nombre}`);
  return ok({ ok: true });
});
