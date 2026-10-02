import type { Conversacion, Horario } from "@/lib/crm/types";
import { contexto, manejar, ok } from "@/lib/crm/server/auth";
import { leerJson, opcion, texto, textoOpcional } from "@/lib/crm/server/validar";
import { completarBot, evaluarBot } from "@/lib/crm/bot";
import { uid } from "@/lib/crm/core";
import { convDe, pedidosDeConversacion } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TODO_EL_DIA: Horario["dias"] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dia: d as Horario["dias"][number]["dia"], abre: true, desde: "00:00", hasta: "24:00" }));
const NUNCA: Horario["dias"] = TODO_EL_DIA.map((d) => ({ ...d, abre: false }));

// Qué contestaría el bot a este texto, sin mandar ni guardar nada.
export const POST = manejar(async (req) => {
  const { db, empresa } = await contexto();
  const b = await leerJson(req);
  const textoMsg = texto(b, "texto", { requerido: true, max: 4096 });
  const canal = b.canal ? opcion(b, "canal", ["whatsapp", "instagram", "messenger", "manual"] as const) : "whatsapp";
  const convId = textoOpcional(b, "conversacion_id", 80);
  const ahora = new Date();
  let conv: Conversacion;
  let contacto = null;
  let pedidosDelContacto = null;
  if (convId) {
    conv = await convDe(db, empresa, convId);
    const r = await pedidosDeConversacion(db, empresa, conv);
    contacto = r.contacto;
    pedidosDelContacto = r.pedidos;
  } else {
    conv = {
      id: uid("cv"), empresa_id: empresa.id, canal_id: "prueba", canal, contacto_id: "prueba", identificador: "5491150000000", nombre: "Cliente de prueba",
      ultimo_texto: textoMsg, ultimo_en: ahora.toISOString(), ultimo_de: "cliente", ultimo_entrante_en: ahora.toISOString(), no_leidos: 1,
      grupo: null, etapa_id: null, etiquetas: [], asignado_a: null, tomado_por: null, urgente: false, recordar: null, baja: false,
      fuera_horario: false, necesita_humano: false, visto_in: null, pedido_id: null, bot_estado: null, creado: ahora.toISOString(), actualizado: ahora.toISOString(),
    };
  }
  let horario = empresa.horario;
  if (typeof b.fuera_de_horario === "boolean") horario = { zona: empresa.horario.zona, dias: b.fuera_de_horario ? NUNCA : TODO_EL_DIA };
  const [botConf, productos, pedidos] = await Promise.all([db.bot(empresa.id), db.productos(empresa.id), db.pedidos(empresa.id)]);
  void pedidosDelContacto;
  const r = evaluarBot({ empresa: { ...empresa, horario }, bot: completarBot(botConf), conv, contacto, texto: textoMsg, esPrimerMensaje: !convId, productos, pedidos, ahora });
  return ok(r);
});
