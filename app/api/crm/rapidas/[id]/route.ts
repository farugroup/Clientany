import { NoEncontrado, SinPermiso, contexto, manejar, ok } from "@/lib/crm/server/auth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DELETE = manejar<{ id: string }>(async (_req, { params }) => {
  const { db, empresa, miembro } = await contexto();
  const r = (await db.rapidas(empresa.id)).find((x) => x.id === params.id);
  if (!r) throw new NoEncontrado("No encontré esa respuesta rápida.");
  if (r.de && r.de !== miembro.id && miembro.rol !== "admin") throw new SinPermiso("Esa rápida es de otra persona.");
  if (!r.de && miembro.rol !== "admin") throw new SinPermiso();
  await db.borrarRapida(r.id);
  return ok({ ok: true });
});
