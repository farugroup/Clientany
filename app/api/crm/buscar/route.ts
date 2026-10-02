import { contexto, manejar, ok } from "@/lib/crm/server/auth";
import { buscar } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = manejar(async (req) => {
  const { db, empresa } = await contexto();
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 120);
  return ok(await buscar(db, empresa, q));
});
