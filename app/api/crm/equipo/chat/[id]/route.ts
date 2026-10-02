import { NoEncontrado, SinPermiso, contexto, manejar, ok } from "@/lib/crm/server/auth";
import { leerJson, opcion } from "@/lib/crm/server/validar";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PATCH = manejar<{ id: string }>(async (req, { params }) => {
  const { db, empresa, miembro } = await contexto();
  const m = (await db.equipoChat(empresa.id, 1000)).find((x) => x.id === params.id);
  if (!m) throw new NoEncontrado("No encontré ese mensaje del equipo.");
  const b = await leerJson(req);
  const estado = b.estado === null ? null : opcion(b, "estado", ["pendiente", "hecho"] as const);
  m.estado = estado;
  m.hecho_por = estado === "hecho" ? miembro.id : null;
  await db.guardarMensajeEquipo(m);
  return ok(m);
});

export const DELETE = manejar<{ id: string }>(async (_req, { params }) => {
  const { db, empresa, miembro } = await contexto();
  const m = (await db.equipoChat(empresa.id, 1000)).find((x) => x.id === params.id);
  if (!m) throw new NoEncontrado("No encontré ese mensaje del equipo.");
  if (m.de !== miembro.id && miembro.rol !== "admin") throw new SinPermiso("Sólo quien lo escribió o un administrador puede borrarlo.");
  await db.borrarMensajeEquipo(m.id);
  return ok({ ok: true });
});
