import { contexto, manejar, ok } from "@/lib/crm/server/auth";
import { leerJson, listaDeTextos, texto, textoOpcional } from "@/lib/crm/server/validar";
import { canalDe, convDe, enviarSaliente } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = manejar<{ id: string }>(async (req, { params }) => {
  const { db, empresa, miembro } = await contexto();
  const conv = await convDe(db, empresa, params.id);
  const canal = await canalDe(db, empresa, conv.canal_id);
  const b = await leerJson(req);
  const m = await enviarSaliente(db, empresa, canal, conv, {
    plantilla: { nombre: texto(b, "nombre", { requerido: true }), idioma: textoOpcional(b, "idioma", 10) || undefined, parametros: listaDeTextos(b, "parametros", 20) },
    de: "agente",
    autor: miembro.nombre,
  });
  return ok(m);
});
