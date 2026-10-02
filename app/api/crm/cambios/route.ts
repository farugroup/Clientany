import { contexto, manejar, ok } from "@/lib/crm/server/auth";
import { convDe } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Polling: qué cambió desde `desde` (conversaciones, mensajes de `conv`, chat del equipo).
export const GET = manejar(async (req) => {
  const { db, empresa } = await contexto();
  const url = new URL(req.url);
  const desdeRaw = url.searchParams.get("desde") || "";
  const desde = desdeRaw && !isNaN(new Date(desdeRaw).getTime()) ? new Date(desdeRaw).toISOString() : undefined;
  const convId = url.searchParams.get("conv") || "";
  const [conversaciones, miembros, equipoTodo] = await Promise.all([
    db.conversaciones(empresa.id, { desde, limite: 500 }),
    db.miembros(empresa.id),
    db.equipoChat(empresa.id, 200),
  ]);
  let mensajes: unknown[] = [];
  if (convId) {
    await convDe(db, empresa, convId);
    mensajes = await db.mensajes(convId, { desde });
  }
  const equipo = desde ? equipoTodo.filter((m) => new Date(m.creado).getTime() > new Date(desde).getTime()) : equipoTodo;
  return ok({ conversaciones, mensajes, equipo, miembros, ahora: new Date().toISOString() });
});
