import { contexto, manejar, ok } from "@/lib/crm/server/auth";
import { leerJson, opcion, texto, textoOpcional } from "@/lib/crm/server/validar";
import { simular } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Crea el entrante como si fuera el webhook y corre el bot (sin tocar la red).
export const POST = manejar(async (req) => {
  const { db, empresa, miembro } = await contexto();
  const b = await leerJson(req);
  const r = await simular(db, empresa, miembro, {
    canal_id: textoOpcional(b, "canal_id", 80) || undefined,
    canal_tipo: b.canal_tipo ? opcion(b, "canal_tipo", ["whatsapp", "instagram", "messenger", "manual"] as const) : undefined,
    identificador: textoOpcional(b, "identificador") || undefined,
    nombre: textoOpcional(b, "nombre") || undefined,
    texto: texto(b, "texto", { requerido: true, max: 4096 }),
  });
  return ok({ conversacion: r.conversacion, mensaje: r.mensaje, bot: r.bot ?? { respuestas: [], cambios: {}, explicacion: "" } });
});
