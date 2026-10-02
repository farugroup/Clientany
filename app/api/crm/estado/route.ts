import { contexto, manejar, ok } from "@/lib/crm/server/auth";
import { completarBot } from "@/lib/crm/bot";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Todo lo chico de la empresa en una sola llamada (los mensajes van a demanda).
export const GET = manejar(async () => {
  const { db, empresa, miembro } = await contexto();
  const [miembros, invitaciones, canales, conversaciones, contactos, pedidos, productos, bot, plantillas, rapidas, equipo, api_keys, actividad] =
    await Promise.all([
      db.miembros(empresa.id),
      db.invitaciones(empresa.id),
      db.canales(empresa.id),
      db.conversaciones(empresa.id, { limite: 500 }),
      db.contactos(empresa.id),
      db.pedidos(empresa.id),
      db.productos(empresa.id),
      db.bot(empresa.id),
      db.plantillas(empresa.id),
      db.rapidas(empresa.id),
      db.equipoChat(empresa.id, 200),
      db.apiKeys(empresa.id),
      db.actividad(empresa.id, 50),
    ]);
  return ok({
    empresa,
    yo: miembro,
    miembros,
    invitaciones,
    canales,
    conversaciones,
    contactos,
    pedidos,
    productos,
    bot: completarBot(bot),
    plantillas,
    rapidas,
    equipo,
    api_keys,
    actividad,
    ahora: new Date().toISOString(),
  });
});
