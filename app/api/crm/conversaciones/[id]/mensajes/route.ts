import { contexto, manejar, ok } from "@/lib/crm/server/auth";
import { leerJson, texto, textoOpcional } from "@/lib/crm/server/validar";
import { canalDe, convDe, enviarSaliente, marcarLeido } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Los mensajes del chat (y marca leído).
export const GET = manejar<{ id: string }>(async (_req, { params }) => {
  const { db, empresa } = await contexto();
  const conv = await convDe(db, empresa, params.id);
  const mensajes = await db.mensajes(conv.id);
  await marcarLeido(db, empresa, conv);
  return ok(mensajes);
});

// Texto libre: manda por Graph (fuera de ventana → 400 ventana_cerrada).
export const POST = manejar<{ id: string }>(async (req, { params }) => {
  const { db, empresa, miembro } = await contexto();
  const conv = await convDe(db, empresa, params.id);
  const canal = await canalDe(db, empresa, conv.canal_id);
  const b = await leerJson(req);
  const textoMsg = texto(b, "texto", { requerido: true, max: 4096 });
  const cita_id = textoOpcional(b, "cita_id", 80) || undefined;
  const m = await enviarSaliente(db, empresa, canal, conv, { texto: textoMsg, cita_id, de: "agente", autor: miembro.nombre });
  return ok(m);
});
