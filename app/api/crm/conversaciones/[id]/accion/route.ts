import type { AccionConversacion } from "@/lib/crm/repo";
import { Invalido, contexto, manejar, ok } from "@/lib/crm/server/auth";
import { leerJson, listaDeTextos, opcion, texto, textoOpcional } from "@/lib/crm/server/validar";
import { aplicarAccion, convDe } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TIPOS = ["respondido", "grupo", "etapa", "etiquetas", "nota", "asignar", "tomar", "soltar", "urgente", "recordar", "baja", "resolver", "reabrir", "humano_atendido", "pedido", "nombre"] as const;
const GRUPOS = ["ventas", "soporte", "mas_adelante", "resueltos", "baja"] as const;

export const POST = manejar<{ id: string }>(async (req, { params }) => {
  const { db, empresa, miembro } = await contexto();
  const conv = await convDe(db, empresa, params.id);
  const b = await leerJson(req);
  const tipo = opcion(b, "tipo", TIPOS);
  let accion: AccionConversacion;
  switch (tipo) {
    case "grupo":
      accion = { tipo, grupo: b.grupo === null || b.grupo === "" || b.grupo === undefined ? null : opcion(b, "grupo", GRUPOS) };
      break;
    case "etapa":
      accion = { tipo, etapa_id: textoOpcional(b, "etapa_id", 80) || null };
      break;
    case "etiquetas":
      accion = { tipo, etiquetas: listaDeTextos(b, "etiquetas") };
      break;
    case "nota":
      accion = { tipo, nota: texto(b, "nota", { max: 4096 }) };
      break;
    case "asignar":
      accion = { tipo, miembro_id: textoOpcional(b, "miembro_id", 80) || null };
      break;
    case "urgente":
    case "baja":
      if (typeof b.valor !== "boolean") throw new Invalido("Falta «valor» (verdadero o falso).", "falta_valor");
      accion = { tipo, valor: b.valor };
      break;
    case "recordar":
      accion = { tipo, fecha: textoOpcional(b, "fecha", 40) || null, nota: textoOpcional(b, "nota", 500) || undefined };
      break;
    case "pedido":
      accion = { tipo, pedido_id: textoOpcional(b, "pedido_id", 80) || null };
      break;
    case "nombre":
      accion = { tipo, nombre: texto(b, "nombre", { requerido: true }) };
      break;
    default:
      accion = { tipo };
  }
  return ok(await aplicarAccion(db, empresa, miembro, conv, accion));
});
