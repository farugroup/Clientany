import type { ApiKey } from "@/lib/crm/types";
import { contexto, exigirAdmin, manejar, ok } from "@/lib/crm/server/auth";
import { leerJson, texto } from "@/lib/crm/server/validar";
import { uid } from "@/lib/crm/core";
import { generarApiKey } from "@/lib/crm/server/api-key";
import { registrar } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// El secreto se devuelve UNA sola vez.
export const POST = manejar(async (req) => {
  const { db, empresa, miembro } = await contexto();
  exigirAdmin(miembro);
  const b = await leerJson(req);
  const nombre = texto(b, "nombre", { max: 60 }) || "Integración";
  const { secreto, prefijo, hash } = generarApiKey();
  const key: ApiKey = { id: uid("ak"), empresa_id: empresa.id, nombre, prefijo, creado: new Date().toISOString(), ultimo_uso: null };
  await db.crearApiKey(key, hash);
  await registrar(db, empresa.id, miembro.nombre, `creó la clave de API «${nombre}»`);
  return ok({ key, secreto }, 201);
});
