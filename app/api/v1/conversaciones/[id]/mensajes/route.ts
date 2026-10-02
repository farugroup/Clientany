import { manejar, ok } from "@/lib/crm/server/auth";
import { empresaPorApiKey } from "@/lib/crm/server/api-key";
import { convDe } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = manejar<{ id: string }>(async (req, { params }) => {
  const { db, empresa } = await empresaPorApiKey(req);
  const conv = await convDe(db, empresa, params.id);
  return ok(await db.mensajes(conv.id));
});
