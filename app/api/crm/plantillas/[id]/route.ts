import { NoEncontrado, contexto, exigirAdmin, manejar, ok } from "@/lib/crm/server/auth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DELETE = manejar<{ id: string }>(async (_req, { params }) => {
  const { db, empresa, miembro } = await contexto();
  exigirAdmin(miembro);
  const p = (await db.plantillas(empresa.id)).find((x) => x.id === params.id);
  if (!p) throw new NoEncontrado("No encontré esa plantilla.");
  await db.borrarPlantilla(p.id);
  return ok({ ok: true });
});
