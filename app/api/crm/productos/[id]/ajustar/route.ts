import { contexto, manejar, ok } from "@/lib/crm/server/auth";
import { leerJson, numero, textoOpcional } from "@/lib/crm/server/validar";
import { ajustarStock, productoDe } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = manejar<{ id: string }>(async (req, { params }) => {
  const { db, empresa, miembro } = await contexto();
  const p = await productoDe(db, empresa, params.id);
  const b = await leerJson(req);
  const delta = numero(b, "delta", { requerido: true, entero: true });
  return ok(await ajustarStock(db, empresa, miembro.nombre, p, delta, textoOpcional(b, "motivo", 200) || undefined));
});
