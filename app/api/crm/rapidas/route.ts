import type { Rapida } from "@/lib/crm/types";
import { NoEncontrado, SinPermiso, contexto, manejar, ok } from "@/lib/crm/server/auth";
import { leerJson, texto } from "@/lib/crm/server/validar";
import { uid } from "@/lib/crm/core";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Rápida compartida (de: null, sólo admin) o mía (de: mi id).
export const POST = manejar(async (req) => {
  const { db, empresa, miembro } = await contexto();
  const b = await leerJson(req);
  const atajoRaw = texto(b, "atajo", { requerido: true, max: 40 });
  const atajo = "/" + atajoRaw.replace(/^\/+/, "").toLowerCase().replace(/\s+/g, "-");
  const textoR = texto(b, "texto", { requerido: true, max: 4096 });
  const todas = await db.rapidas(empresa.id);
  const previa = typeof b.id === "string" && b.id ? todas.find((r) => r.id === b.id) : undefined;
  if (typeof b.id === "string" && b.id && !previa) throw new NoEncontrado("No encontré esa respuesta rápida.");
  const compartida = b.de === null || b.de === "" || (b.de === undefined && !previa && miembro.rol === "admin");
  if (previa && previa.de && previa.de !== miembro.id && miembro.rol !== "admin") throw new SinPermiso("Esa rápida es de otra persona.");
  if (compartida && miembro.rol !== "admin") throw new SinPermiso("Las rápidas compartidas las crea un administrador; la tuya la guardás con de: tu id.");
  const r: Rapida = { id: previa?.id || uid("rp"), empresa_id: empresa.id, atajo, texto: textoR, de: compartida ? null : previa?.de ?? miembro.id };
  await db.guardarRapida(r);
  return ok(r);
});
