import type { NuevaConversacionInput } from "@/lib/crm/repo";
import { Invalido, contexto, manejar, ok } from "@/lib/crm/server/auth";
import { esObjeto, leerJson, listaDeTextos, texto, textoOpcional } from "@/lib/crm/server/validar";
import { nuevaConversacion } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = manejar(async (req) => {
  const { db, empresa, miembro } = await contexto();
  const b = await leerJson(req);
  const input: NuevaConversacionInput = {
    canal_id: texto(b, "canal_id", { requerido: true, max: 80 }),
    identificador: texto(b, "identificador", { requerido: true, max: 120 }),
    nombre: textoOpcional(b, "nombre"),
    contacto_id: textoOpcional(b, "contacto_id", 80),
    texto: textoOpcional(b, "texto", 4096),
  };
  if (esObjeto(b.plantilla)) {
    const nombre = String(b.plantilla.nombre || "").trim();
    if (!nombre) throw new Invalido("Falta el nombre de la plantilla.", "falta_plantilla");
    input.plantilla = { nombre, parametros: listaDeTextos(b.plantilla, "parametros", 20) };
  }
  return ok(await nuevaConversacion(db, empresa, miembro, input));
});
