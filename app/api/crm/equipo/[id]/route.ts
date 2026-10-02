import { Invalido, contexto, exigirAdmin, manejar, ok } from "@/lib/crm/server/auth";
import { leerJson, opcion, textoOpcional } from "@/lib/crm/server/validar";
import { miembroDe, registrar } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PATCH = manejar<{ id: string }>(async (req, { params }) => {
  const { db, empresa, miembro } = await contexto();
  // Cada uno puede cambiar su propio nombre («Tu perfil»); el resto es de admin.
  const esYo = params.id === miembro.id;
  if (!esYo) exigirAdmin(miembro);
  const otro = await miembroDe(db, empresa, params.id);
  const b = await leerJson(req);
  const patch: { rol?: "admin" | "agente"; nombre?: string } = {};
  if ("rol" in b) {
    if (esYo && miembro.rol !== "admin") exigirAdmin(miembro);
    patch.rol = opcion(b, "rol", ["admin", "agente"] as const);
  }
  if ("nombre" in b) {
    const n = textoOpcional(b, "nombre");
    if (!n) throw new Invalido("El nombre no puede quedar vacío.", "falta_nombre");
    patch.nombre = n;
  }
  if (patch.rol === "agente" && otro.rol === "admin") {
    const admins = (await db.miembros(empresa.id)).filter((m) => m.rol === "admin");
    if (admins.length <= 1) throw new Invalido("La empresa necesita al menos un administrador.", "ultimo_admin");
  }
  const actualizado = await db.actualizarMiembro(otro.id, patch);
  await registrar(db, empresa.id, miembro.nombre, `cambió el perfil de ${actualizado.nombre}`);
  return ok(actualizado);
});

export const DELETE = manejar<{ id: string }>(async (_req, { params }) => {
  const { db, empresa, miembro } = await contexto();
  exigirAdmin(miembro);
  const otro = await miembroDe(db, empresa, params.id);
  if (otro.id === miembro.id) throw new Invalido("No podés sacarte a vos mismo del equipo.", "soy_yo");
  await db.quitarMiembro(otro.id);
  await registrar(db, empresa.id, miembro.nombre, `sacó a ${otro.nombre} del equipo`);
  return ok({ ok: true });
});
