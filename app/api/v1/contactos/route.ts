import type { Contacto } from "@/lib/crm/types";
import { Invalido, manejar, ok } from "@/lib/crm/server/auth";
import { empresaPorApiKey } from "@/lib/crm/server/api-key";
import { leerJsonOLista, type Cuerpo } from "@/lib/crm/server/validar";
import { buscar, guardarContacto } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = manejar(async (req) => {
  const { db, empresa } = await empresaPorApiKey(req);
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q) return ok((await buscar(db, empresa, q)).contactos);
  return ok((await db.contactos(empresa.id)).slice(0, 1000));
});

// Uno o una lista; upsert por teléfono/email.
export const POST = manejar(async (req) => {
  const { db, empresa } = await empresaPorApiKey(req);
  const body = await leerJsonOLista(req);
  const guardarUno = (b: Cuerpo): Promise<Contacto> => {
    const entrada: Cuerpo = { ...b };
    delete entrada.id;
    delete entrada.empresa_id;
    if (!entrada.origen) entrada.origen = "api";
    return guardarContacto(db, empresa, entrada);
  };
  if (Array.isArray(body)) {
    if (body.length > 500) throw new Invalido("Hasta 500 contactos por llamada.", "lista_larga");
    const out: Contacto[] = [];
    for (const b of body) out.push(await guardarUno(b));
    return ok(out, 201);
  }
  return ok(await guardarUno(body), 201);
});
