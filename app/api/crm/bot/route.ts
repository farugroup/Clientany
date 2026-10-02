import type { Bot } from "@/lib/crm/types";
import { Invalido, contexto, exigirAdmin, manejar, ok } from "@/lib/crm/server/auth";
import { leerJson } from "@/lib/crm/server/validar";
import { completarBot } from "@/lib/crm/bot";
import { registrar } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PUT = manejar(async (req) => {
  const { db, empresa, miembro } = await contexto();
  exigirAdmin(miembro);
  const b = await leerJson(req);
  const bot = completarBot(b as Partial<Bot>);
  if (!Number.isInteger(bot.tope_por_dia) || bot.tope_por_dia < 0 || bot.tope_por_dia > 100) throw new Invalido("El tope por día va de 0 a 100.", "tope_invalido");
  if (!Number.isFinite(bot.pausa_si_persona_min) || bot.pausa_si_persona_min < 0 || bot.pausa_si_persona_min > 1440) throw new Invalido("La pausa va de 0 a 1440 minutos.", "pausa_invalida");
  if (bot.reglas.length > 100) throw new Invalido("Hasta 100 reglas.", "reglas_invalidas");
  for (const r of bot.reglas) {
    if (r.respuesta.length > 4096) throw new Invalido(`La respuesta de la regla «${r.nombre}» es muy larga.`, "regla_invalida");
  }
  const guardado = await db.guardarBot(empresa.id, bot);
  await registrar(db, empresa.id, miembro.nombre, "cambió las respuestas automáticas");
  return ok(guardado);
});
