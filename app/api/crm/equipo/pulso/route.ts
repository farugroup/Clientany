import { contexto, manejar, ok } from "@/lib/crm/server/auth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Presencia: "estoy acá".
export const POST = manejar(async () => {
  const { db, miembro } = await contexto();
  await db.actualizarMiembro(miembro.id, { ultimo_visto: new Date().toISOString() });
  return ok({ ok: true });
});
