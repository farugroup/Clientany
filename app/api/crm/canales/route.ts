import type { ConectarCanalInput } from "@/lib/crm/repo";
import { contexto, exigirAdmin, manejar, ok } from "@/lib/crm/server/auth";
import { leerJson, opcion, textoOpcional } from "@/lib/crm/server/validar";
import { conectarCanal, registrar } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Prueba las credenciales contra Graph ANTES de guardar; si fallan, 400 con el motivo.
export const POST = manejar(async (req) => {
  const { db, empresa, miembro } = await contexto();
  exigirAdmin(miembro);
  const b = await leerJson(req);
  const input: ConectarCanalInput = {
    tipo: opcion(b, "tipo", ["whatsapp", "instagram", "messenger", "manual"] as const),
    nombre: textoOpcional(b, "nombre"),
    marca_id: textoOpcional(b, "marca_id", 80),
    phone_number_id: textoOpcional(b, "phone_number_id", 80),
    waba_id: textoOpcional(b, "waba_id", 80),
    page_id: textoOpcional(b, "page_id", 80),
    ig_user_id: textoOpcional(b, "ig_user_id", 80),
    token: textoOpcional(b, "token", 1000),
    app_secret: textoOpcional(b, "app_secret", 200),
    api_version: textoOpcional(b, "api_version", 10),
  };
  const canal = await conectarCanal(db, empresa, input);
  await registrar(db, empresa.id, miembro.nombre, `conectó el canal ${canal.nombre}`, { tipo: "canal", id: canal.id });
  return ok(canal);
});
