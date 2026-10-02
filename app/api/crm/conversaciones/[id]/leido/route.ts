import { contexto, manejar, ok } from "@/lib/crm/server/auth";
import { convDe, marcarLeido } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = manejar<{ id: string }>(async (_req, { params }) => {
  const { db, empresa } = await contexto();
  const conv = await convDe(db, empresa, params.id);
  await marcarLeido(db, empresa, conv);
  return ok({ ok: true });
});
