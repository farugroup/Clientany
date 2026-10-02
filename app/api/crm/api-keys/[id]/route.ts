import { NoEncontrado, contexto, exigirAdmin, manejar, ok } from "@/lib/crm/server/auth";
import { registrar } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DELETE = manejar<{ id: string }>(async (_req, { params }) => {
  const { db, empresa, miembro } = await contexto();
  exigirAdmin(miembro);
  const k = (await db.apiKeys(empresa.id)).find((x) => x.id === params.id);
  if (!k) throw new NoEncontrado("No encontré esa clave de API.");
  await db.borrarApiKey(k.id);
  await registrar(db, empresa.id, miembro.nombre, `borró la clave de API «${k.nombre}»`);
  return ok({ ok: true });
});
