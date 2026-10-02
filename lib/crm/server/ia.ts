// ============================================================
// Clientany · CRM — el copilot: sugiere una respuesta para el chat.
// Usa la clave de Anthropic de la empresa (si cargó la suya) o la de la
// plataforma. Sólo responde con los datos que le pasamos (stock, pedidos):
// no inventa precios ni plazos.
// ============================================================
import Anthropic from "@anthropic-ai/sdk";
import type { Contacto, Mensaje, Pedido, Producto } from "../types";
import type { Sugerencia } from "../repo";
import { buscarProductos, dinero, errorCriollo, fechaCorta, nombreEstadoPedido, previewMensaje, recortar } from "../core";
import { DemasiadasLlamadas, Invalido } from "./errores";

export interface EntradaSugerencia {
  empresa: { nombre: string; rubro?: string; instrucciones?: string; moneda: string };
  mensajes: Mensaje[];
  contacto?: Contacto | null;
  pedidos?: Pedido[];
  productos?: Producto[];
  borrador?: string;
  claveEmpresa?: string;
}

const MODELO = () => process.env.CLIENTANY_IA_MODELO || "claude-opus-5-5";
const MAX_MENSAJES = 30;
const MAX_PRODUCTOS = 40;
const MAX_PEDIDOS = 5;

// ---------- límite por IP para el modo demo (sin sesión) ----------
const CUOTA_POR_HORA = 20;
declare global {
  // eslint-disable-next-line no-var
  var __clientanyIaCuota: Map<string, { n: number; desde: number }> | undefined;
}
export function verificarCuotaIp(ip: string): void {
  if (!globalThis.__clientanyIaCuota) globalThis.__clientanyIaCuota = new Map();
  const m = globalThis.__clientanyIaCuota;
  const ahora = Date.now();
  const r = m.get(ip);
  if (!r || ahora - r.desde > 3_600_000) {
    m.set(ip, { n: 1, desde: ahora });
  } else {
    if (r.n >= CUOTA_POR_HORA) throw new DemasiadasLlamadas("Para seguir usando la IA creá tu cuenta");
    r.n += 1;
  }
  // que el mapa no crezca sin fin
  if (m.size > 5000) {
    for (const [k, v] of m) if (ahora - v.desde > 3_600_000) m.delete(k);
  }
}

// ---------- armado del contexto ----------
function bloqueProductos(productos: Producto[], ultimoTexto: string, moneda: string): string {
  if (!productos.length) return "Productos: la empresa no cargó stock.";
  const primero = buscarProductos(productos, ultimoTexto, MAX_PRODUCTOS);
  const ids = new Set(primero.map((p) => p.id));
  const resto = productos.filter((p) => !ids.has(p.id) && p.activo !== false);
  const lista = [...primero, ...resto].slice(0, MAX_PRODUCTOS);
  const lineas = lista.map((p) => `${p.sku} · ${p.nombre} · ${dinero(p.precio, p.moneda || moneda)} · stock ${p.stock}`);
  const demas = productos.length - lista.length;
  return `Productos (sku · nombre · precio · stock):\n${lineas.join("\n")}${demas > 0 ? `\n(+${demas} productos más que no se listan)` : ""}`;
}

function bloquePedidos(pedidos: Pedido[]): string {
  if (!pedidos.length) return "Pedidos del cliente: ninguno registrado.";
  const lineas = pedidos.slice(0, MAX_PEDIDOS).map((p) => {
    const items = (p.items || []).map((i) => `${i.cantidad}x ${i.nombre}`).join(", ") || "sin detalle";
    const envio = p.envio?.seguimiento ? `envío ${p.envio.transporte || ""} ${p.envio.seguimiento}`.trim() : p.envio?.transporte ? `envío ${p.envio.transporte}` : "sin datos de envío";
    return `${p.numero} · ${fechaCorta(p.creado)} · ${nombreEstadoPedido(p.estado)} · ${items} · ${dinero(p.total, p.moneda)} · ${envio}`;
  });
  return `Pedidos del cliente (número · fecha · estado · items · total · envío):\n${lineas.join("\n")}`;
}

function bloqueCliente(c: Contacto | null | undefined): string {
  if (!c) return "Cliente: sin datos.";
  const partes = [c.nombre, c.localidad ? `de ${c.localidad}${c.provincia ? `, ${c.provincia}` : ""}` : ""].filter(Boolean);
  return `Cliente: ${partes.join(" ")}`;
}

function armarSystem(e: EntradaSugerencia, ultimoTexto: string): string {
  const rubro = e.empresa.rubro ? ` (${e.empresa.rubro})` : "";
  const partes = [
    `Sos el asistente de ventas de la empresa ${e.empresa.nombre}${rubro}. Respondés como una persona del equipo por chat: corto (máximo 3 oraciones), tono cercano y rioplatense (vos, tenés, querés), sin formalidades ni listas largas.`,
    `Reglas: no inventes precios, stock ni plazos; usá SÓLO los datos de «Productos» y «Pedidos» de abajo. Si no sabés algo, decí que lo consultás y volvés. Nunca prometas descuentos ni cambios de precio. No uses emojis de más (uno como mucho). No firmes ni saludes con el nombre de la empresa en cada mensaje.`,
    `Devolvé únicamente el texto del mensaje para mandarle al cliente, sin comillas ni explicaciones.`,
  ];
  if (e.empresa.instrucciones?.trim()) partes.push(`Instrucciones de la empresa:\n${recortar(e.empresa.instrucciones.trim(), 4000)}`);
  partes.push(bloqueProductos(e.productos || [], ultimoTexto, e.empresa.moneda));
  partes.push(bloquePedidos(e.pedidos || []));
  partes.push(bloqueCliente(e.contacto));
  return partes.join("\n\n");
}

function textoDe(m: Mensaje): string {
  return m.tipo === "texto" || m.tipo === "plantilla" ? m.texto : previewMensaje(m.tipo, m.texto, m.media_nombre);
}

function armarTurnos(mensajes: Mensaje[], borrador?: string): Anthropic.Beta.BetaMessageParam[] {
  const ultimos = mensajes
    .filter((m) => m.de !== "sistema")
    .slice(-MAX_MENSAJES);
  const turnos: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of ultimos) {
    const role: "user" | "assistant" = m.direccion === "in" ? "user" : "assistant";
    const texto = recortar(textoDe(m), 1500);
    if (!texto) continue;
    const ultimo = turnos[turnos.length - 1];
    if (ultimo && ultimo.role === role && typeof ultimo.content === "string") {
      ultimo.content = `${ultimo.content}\n${texto}`;
    } else {
      turnos.push({ role, content: texto });
    }
  }
  if (!turnos.length) turnos.push({ role: "user", content: "(todavía no hay mensajes: proponé un primer mensaje de contacto)" });
  if (turnos[0].role === "assistant") turnos.unshift({ role: "user", content: "(inicio de la conversación)" });
  const pedido = borrador?.trim()
    ? `Mejorá este borrador sin cambiar lo que quiero decir (ortografía, tono, claridad): ${recortar(borrador.trim(), 2000)}`
    : "";
  const ultimo = turnos[turnos.length - 1];
  if (pedido) {
    if (ultimo.role === "user" && typeof ultimo.content === "string") ultimo.content = `${ultimo.content}\n\n${pedido}`;
    else turnos.push({ role: "user", content: pedido });
  } else if (ultimo.role === "assistant") {
    turnos.push({ role: "user", content: "(el cliente todavía no respondió: proponé el siguiente mensaje para mandarle)" });
  }
  return turnos;
}

function motivoDe(e: EntradaSugerencia): Sugerencia["motivo"] {
  if (e.borrador?.trim()) return "mejora";
  const hayStock = (e.productos || []).length > 0;
  const hayPedidos = (e.pedidos || []).length > 0;
  if (hayStock && hayPedidos) return "stock+pedidos";
  if (hayPedidos) return "pedidos";
  if (hayStock) return "stock";
  return "general";
}

export async function sugerir(e: EntradaSugerencia): Promise<Sugerencia> {
  const apiKey = (e.claveEmpresa || process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) throw new Invalido("La IA no está configurada: cargá tu clave de Anthropic en Configuración → IA.", "ia_sin_clave");
  const ultimoEntrante = [...e.mensajes].reverse().find((m) => m.direccion === "in");
  const system = armarSystem(e, ultimoEntrante ? textoDe(ultimoEntrante) : "");
  const messages = armarTurnos(e.mensajes, e.borrador);
  const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 1 });
  try {
    const r = await client.beta.messages.create({
      model: MODELO(),
      max_tokens: 1024,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system,
      messages,
    });
    if (r.stop_reason === "refusal") throw new Invalido("La IA no quiso responder a esto.", "ia_rechazo");
    const texto = r.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!texto) throw new Invalido("La IA no devolvió texto. Probá de nuevo.", "ia_vacia");
    return { texto, motivo: motivoDe(e), proveedor: "anthropic" };
  } catch (err) {
    if (err instanceof Invalido) throw err;
    if (err instanceof Anthropic.AuthenticationError) throw new Invalido("La clave de IA no es válida", "ia_clave");
    if (err instanceof Anthropic.RateLimitError) throw new Invalido("La IA está saturada, probá en un minuto", "ia_saturada");
    if (err instanceof Anthropic.APIError) throw new Invalido(`La IA respondió con un error: ${errorCriollo(err.message)}`, "ia_error");
    throw new Invalido(`No pude hablar con la IA: ${errorCriollo(err)}`, "ia_error");
  }
}
