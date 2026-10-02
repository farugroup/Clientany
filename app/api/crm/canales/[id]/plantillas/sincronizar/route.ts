import { contexto, exigirAdmin, manejar, ok } from "@/lib/crm/server/auth";
import { canalDe, sincronizarPlantillas } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = manejar<{ id: string }>(async (_req, { params }) => {
  const { db, empresa, miembro } = await contexto();
  exigirAdmin(miembro);
  const canal = await canalDe(db, empresa, params.id);
  return ok(await sincronizarPlantillas(db, empresa, canal));
});
