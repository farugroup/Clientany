import { manejar, ok } from "@/lib/crm/server/auth";
import { empresaPorApiKey } from "@/lib/crm/server/api-key";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Para probar la clave.
export const GET = manejar(async (req) => {
  const { empresa, key } = await empresaPorApiKey(req);
  return ok({ empresa: { id: empresa.id, nombre: empresa.nombre }, key: { nombre: key.nombre, prefijo: key.prefijo } });
});
