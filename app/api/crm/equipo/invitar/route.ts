import { contexto, exigirAdmin, manejar, ok } from "@/lib/crm/server/auth";
import { leerJson, opcion, texto, textoOpcional } from "@/lib/crm/server/validar";
import { invitar } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = manejar(async (req) => {
  const { db, empresa, miembro } = await contexto();
  exigirAdmin(miembro);
  const b = await leerJson(req);
  const r = await invitar(db, empresa, miembro, {
    email: texto(b, "email", { requerido: true, max: 200 }),
    nombre: textoOpcional(b, "nombre"),
    rol: opcion(b, "rol", ["admin", "agente"] as const, "agente"),
  });
  return ok(r);
});
