import { contexto, exigirAdmin, manejar, ok } from "@/lib/crm/server/auth";
import { cargarDemo, registrar, vaciarDemo } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = manejar(async () => {
  const { db, empresa, miembro } = await contexto();
  exigirAdmin(miembro);
  await cargarDemo(db, empresa);
  await registrar(db, empresa.id, miembro.nombre, "cargó los datos de prueba");
  return ok({ ok: true });
});

export const DELETE = manejar(async () => {
  const { db, empresa, miembro } = await contexto();
  exigirAdmin(miembro);
  await vaciarDemo(db, empresa);
  return ok({ ok: true });
});
