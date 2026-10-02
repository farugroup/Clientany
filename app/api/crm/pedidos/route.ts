import { contexto, manejar, ok } from "@/lib/crm/server/auth";
import { leerJson } from "@/lib/crm/server/validar";
import { armarPedido, guardarPedidoAtando, pedidoDe } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Con `id` actualiza; si no, upsert por número. Ata el contacto por teléfono o mail.
export const POST = manejar(async (req) => {
  const { db, empresa } = await contexto();
  const b = await leerJson(req);
  let previo = typeof b.id === "string" && b.id ? await pedidoDe(db, empresa, b.id) : null;
  if (!previo && typeof b.numero === "string" && b.numero.trim()) previo = await db.pedidoPorNumero(empresa.id, b.numero.trim());
  if (!b.canal && !previo) b.canal = "manual";
  const p = armarPedido(empresa, b, previo);
  return ok(await guardarPedidoAtando(db, empresa, p));
});
