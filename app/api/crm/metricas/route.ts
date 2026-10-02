import { contexto, manejar, ok } from "@/lib/crm/server/auth";
import { metricas } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = manejar(async () => {
  const { db, empresa } = await contexto();
  return ok(await metricas(db, empresa));
});
