import { Invalido, manejar, ok } from "@/lib/crm/server/auth";
import { empresaPorApiKey } from "@/lib/crm/server/api-key";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = manejar(async (req) => {
  const { db, empresa } = await empresaPorApiKey(req);
  const desde = new URL(req.url).searchParams.get("desde") || "";
  if (desde && isNaN(new Date(desde).getTime())) throw new Invalido("«desde» no es una fecha válida.", "fecha_invalida");
  return ok(await db.conversaciones(empresa.id, { desde: desde ? new Date(desde).toISOString() : undefined, limite: 500 }));
});
