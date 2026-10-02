import { contexto, exigirAdmin, manejar, ok } from "@/lib/crm/server/auth";
import { canalDe, registrar } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DELETE = manejar<{ id: string }>(async (_req, { params }) => {
  const { db, empresa, miembro } = await contexto();
  exigirAdmin(miembro);
  const canal = await canalDe(db, empresa, params.id);
  await db.borrarCanal(canal.id);
  await registrar(db, empresa.id, miembro.nombre, `desconectó el canal ${canal.nombre}`);
  return ok({ ok: true });
});
