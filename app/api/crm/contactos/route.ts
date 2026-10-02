import { contexto, manejar, ok } from "@/lib/crm/server/auth";
import { leerJson } from "@/lib/crm/server/validar";
import { contactoDe, guardarContacto } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Con `id` actualiza; sin `id`, si ya hay uno con ese teléfono o mail, lo actualiza.
export const POST = manejar(async (req) => {
  const { db, empresa } = await contexto();
  const b = await leerJson(req);
  const previo = typeof b.id === "string" && b.id ? await contactoDe(db, empresa, b.id) : null;
  return ok(await guardarContacto(db, empresa, b, previo));
});
