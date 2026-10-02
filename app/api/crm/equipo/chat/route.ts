import type { MensajeEquipo } from "@/lib/crm/types";
import { Invalido, contexto, manejar, ok } from "@/lib/crm/server/auth";
import { esObjeto, leerJson, texto } from "@/lib/crm/server/validar";
import { uid } from "@/lib/crm/core";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = manejar(async (req) => {
  const { db, empresa, miembro } = await contexto();
  const b = await leerJson(req);
  const textoMsg = texto(b, "texto", { requerido: true, max: 4096 });
  let ref: MensajeEquipo["ref"] = null;
  if (esObjeto(b.ref)) {
    const tipo = b.ref.tipo;
    if (tipo !== "conversacion" && tipo !== "pedido") throw new Invalido("La referencia tiene que ser a una conversación o a un pedido.", "ref_invalida");
    const id = String(b.ref.id || "").trim();
    if (!id) throw new Invalido("Falta el id de la referencia.", "ref_invalida");
    ref = { tipo, id, nombre: String(b.ref.nombre || "").trim().slice(0, 120) || undefined };
  }
  const m: MensajeEquipo = { id: uid("eq"), empresa_id: empresa.id, de: miembro.id, nombre: miembro.nombre, texto: textoMsg, creado: new Date().toISOString(), ref, estado: null, hecho_por: null };
  await db.guardarMensajeEquipo(m);
  return ok(m);
});
