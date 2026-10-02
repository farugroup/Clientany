import { NoEncontrado, contexto, exigirAdmin, manejar, ok } from "@/lib/crm/server/auth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DELETE = manejar<{ id: string }>(async (_req, { params }) => {
  const { db, empresa, miembro } = await contexto();
  exigirAdmin(miembro);
  const inv = (await db.invitaciones(empresa.id)).find((i) => i.id === params.id);
  if (!inv) throw new NoEncontrado("No encontré esa invitación.");
  await db.borrarInvitacion(inv.id);
  return ok({ ok: true });
});
