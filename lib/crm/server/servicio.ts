// ============================================================
// Clientany · CRM — los casos de uso del servidor.
// Los usan las rutas internas (/api/crm), el webhook de Meta, la API
// pública (/api/v1) y el simulador. Acá vive la lógica que junta la base
// (CrmDb), la Graph API (meta.ts) y la lógica pura (core/bot/csv).
// ============================================================
import type {
  Actividad,
  BotResultado,
  Canal,
  CanalCredenciales,
  CanalTipo,
  Contacto,
  Conversacion,
  Empresa,
  Entrante,
  EstadoEntrante,
  Invitacion,
  MensajeEstado,
  MensajeTipo,
  Mensaje,
  Metricas,
  Miembro,
  Pedido,
  PedidoEstado,
  Plantilla,
  Producto,
} from "../types";
import type { AccionConversacion, ConectarCanalInput, NuevaConversacionInput, SimularEntranteInput } from "../repo";
import type { CrmDbCompleta } from "./db-extra";
import {
  LIMITE_TEXTO_WHATSAPP,
  ahoraIso,
  colaTelefono,
  emailValido,
  errorCriollo,
  estaAbierto,
  normalizarTelefono,
  normalizarTexto,
  pedidosDeContacto,
  previewMensaje,
  telefonoLindo,
  uid,
  ventanaAbierta,
} from "../core";
import { completarBot, evaluarBot } from "../bot";
import { aCsv } from "../csv";
import { datosDePrueba } from "../demo";
import { calcularMetricas } from "../metricas";
import * as meta from "./meta";
import { Invalido, NoEncontrado } from "./errores";
import { MAX_NOMBRE, MAX_TEXTO, booleano, lista, listaDeTextos, numero, opcion, texto, textoOpcional, type Cuerpo, esObjeto } from "./validar";

type Db = CrmDbCompleta;

// `flujo` no está en el tipo público de `Canal.detalle`: lo guardamos igual
// (la columna es jsonb) para saber por dónde mandar en Instagram.
export type DetalleCanal = NonNullable<Canal["detalle"]> & { flujo?: "instagram" | "facebook" };

const ESTADOS_PEDIDO: readonly PedidoEstado[] = ["pendiente", "pagado", "preparacion", "enviado", "entregado", "cancelado", "devuelto"];
const VENTANA_WA = "Pasaron más de 24 hs desde el último mensaje del cliente: WhatsApp sólo deja mandar una plantilla aprobada.";
const VENTANA_IG = "Pasaron más de 24 hs desde el último mensaje del cliente: Meta no deja escribirle hasta que vuelva a escribir.";

// ---------- helpers ----------
export async function registrar(db: Db, empresaId: string, quien: string, que: string, ref?: Actividad["ref"]): Promise<void> {
  try {
    await db.registrarActividad({ id: uid("ac"), empresa_id: empresaId, quien, que, ref: ref ?? null, creado: ahoraIso() });
  } catch (e) {
    console.error("[crm] no pude registrar actividad:", errorCriollo(e));
  }
}

function campoContacto(tipo: CanalTipo, identificador: string): "telefono" | "ig_id" | "psid" | null {
  if (tipo === "whatsapp") return "telefono";
  if (tipo === "instagram") return "ig_id";
  if (tipo === "messenger") return "psid";
  return /^\d{8,}$/.test(identificador) ? "telefono" : null;
}

function nombrePorDefecto(tipo: CanalTipo, identificador: string): string {
  if (tipo === "instagram") return "Cliente de Instagram";
  if (tipo === "messenger") return "Cliente de Messenger";
  if (/^\d{8,}$/.test(identificador)) return telefonoLindo(identificador);
  return identificador || "Cliente";
}

export function tipoDeMime(mime: string | undefined): MensajeTipo {
  const m = (mime || "").toLowerCase();
  if (m.startsWith("image/")) return "imagen";
  if (m.startsWith("audio/")) return "audio";
  if (m.startsWith("video/")) return "video";
  return "documento";
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/aac": "aac", "audio/amr": "amr",
  "video/mp4": "mp4", "video/3gpp": "3gp",
  "application/pdf": "pdf", "text/plain": "txt",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};
export function extDeMime(mime: string | undefined, nombre?: string): string {
  const m = (mime || "").split(";")[0].trim().toLowerCase();
  if (EXT[m]) return EXT[m];
  const deNombre = (nombre || "").match(/\.([a-z0-9]{1,5})$/i)?.[1];
  if (deNombre) return deNombre.toLowerCase();
  const sub = m.split("/")[1];
  return sub && /^[a-z0-9]+$/.test(sub) ? sub : "bin";
}

function urlAbsoluta(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  return base ? `${base}${url.startsWith("/") ? "" : "/"}${url}` : url;
}

function rellenarPlantilla(cuerpo: string, parametros: string[]): string {
  return (cuerpo || "").replace(/\{\{(\d+)\}\}/g, (m, n: string) => parametros[Number(n) - 1] ?? m);
}

// Las rutas reciben ids: estas funciones devuelven la fila o 404, y nunca
// una fila de otra empresa.
export async function convDe(db: Db, empresa: Empresa, id: string): Promise<Conversacion> {
  const c = id ? await db.conversacion(id) : null;
  if (!c || c.empresa_id !== empresa.id) throw new NoEncontrado("No encontré esa conversación.");
  return c;
}
export async function canalDe(db: Db, empresa: Empresa, id: string): Promise<Canal> {
  const c = id ? await db.canal(id) : null;
  if (!c || c.empresa_id !== empresa.id) throw new NoEncontrado("No encontré ese canal.");
  return c;
}
export async function contactoDe(db: Db, empresa: Empresa, id: string): Promise<Contacto> {
  const c = id ? await db.contacto(id) : null;
  if (!c || c.empresa_id !== empresa.id) throw new NoEncontrado("No encontré ese contacto.");
  return c;
}
export async function pedidoDe(db: Db, empresa: Empresa, id: string): Promise<Pedido> {
  const p = id ? await db.pedido(id) : null;
  if (!p || p.empresa_id !== empresa.id) throw new NoEncontrado("No encontré ese pedido.");
  return p;
}
export async function productoDe(db: Db, empresa: Empresa, id: string): Promise<Producto> {
  const p = id ? await db.producto(id) : null;
  if (!p || p.empresa_id !== empresa.id) throw new NoEncontrado("No encontré ese producto.");
  return p;
}
export async function miembroDe(db: Db, empresa: Empresa, id: string): Promise<Miembro> {
  const m = id ? await db.miembro(id) : null;
  if (!m || m.empresa_id !== empresa.id) throw new NoEncontrado("No encontré a esa persona en el equipo.");
  return m;
}

// ============================================================
// Entrante (webhook y simulador)
// ============================================================
export interface ResultadoEntrante {
  conversacion: Conversacion;
  mensaje: Mensaje;
  bot?: BotResultado;
}

export async function procesarEntrante(
  db: Db,
  empresa: Empresa,
  canal: Canal,
  entrante: Entrante,
  opciones: { simulado?: boolean } = {}
): Promise<ResultadoEntrante> {
  const ahora = new Date();
  const simulado = !!opciones.simulado;

  // 1. idempotencia por externo_id
  if (entrante.externo_id) {
    const ya = await db.mensajePorExterno(empresa.id, entrante.externo_id);
    if (ya) {
      const conv = await db.conversacion(ya.conversacion_id);
      if (conv) return { conversacion: conv, mensaje: ya };
    }
  }

  const identificador =
    canal.tipo === "whatsapp" ? normalizarTelefono(entrante.identificador) || entrante.identificador.trim() : entrante.identificador.trim();
  if (!identificador) throw new Invalido("El mensaje no dice quién lo mandó.", "sin_identificador");

  // 2. conversación y 3. contacto (upsert)
  let conv = await db.conversacionPorIdentificador(canal.id, identificador);
  let contacto: Contacto | null = conv ? await db.contacto(conv.contacto_id) : null;
  const campo = campoContacto(canal.tipo, identificador);
  if (!contacto && campo) contacto = await db.contactoPorIdentificador(empresa.id, campo, identificador);
  const defecto = nombrePorDefecto(canal.tipo, identificador);
  const nombrePerfil = (entrante.nombre || "").trim();
  if (!contacto) {
    contacto = {
      id: uid("ct"),
      empresa_id: empresa.id,
      nombre: nombrePerfil || defecto,
      telefono: campo === "telefono" ? identificador : undefined,
      ig_id: campo === "ig_id" ? identificador : undefined,
      psid: campo === "psid" ? identificador : undefined,
      etiquetas: [],
      origen: canal.tipo,
      marca_id: canal.marca_id,
      creado: ahora.toISOString(),
      actualizado: ahora.toISOString(),
    };
    await db.guardarContacto(contacto);
  } else if (nombrePerfil && (contacto.nombre === defecto || !contacto.nombre)) {
    contacto.nombre = nombrePerfil;
    contacto.actualizado = ahora.toISOString();
    await db.guardarContacto(contacto);
  }

  // 4. conversación
  const esPrimerMensaje = !conv;
  const abierto = estaAbierto(empresa.horario, ahora);
  const preview = previewMensaje(entrante.tipo, entrante.texto, entrante.media_nombre);
  if (!conv) {
    conv = {
      id: uid("cv"),
      empresa_id: empresa.id,
      canal_id: canal.id,
      canal: canal.tipo,
      contacto_id: contacto.id,
      identificador,
      nombre: contacto.nombre,
      marca_id: canal.marca_id,
      ultimo_texto: preview,
      ultimo_en: entrante.fecha,
      ultimo_de: entrante.eco ? "agente" : "cliente",
      ultimo_entrante_en: entrante.eco ? undefined : entrante.fecha,
      ultimo_saliente_humano_en: entrante.eco ? entrante.fecha : undefined,
      no_leidos: entrante.eco ? 0 : 1,
      grupo: null,
      etapa_id: null,
      etiquetas: [],
      asignado_a: null,
      tomado_por: null,
      urgente: false,
      recordar: null,
      baja: false,
      fuera_horario: entrante.eco ? false : !abierto,
      necesita_humano: false,
      visto_in: null,
      pedido_id: null,
      bot_estado: null,
      creado: ahora.toISOString(),
      actualizado: ahora.toISOString(),
    };
  } else {
    conv.ultimo_texto = preview;
    conv.ultimo_en = entrante.fecha;
    if (entrante.eco) {
      conv.ultimo_de = "agente";
      conv.ultimo_saliente_humano_en = entrante.fecha;
      conv.visto_in = conv.ultimo_entrante_en || conv.visto_in || null;
      conv.no_leidos = 0;
      conv.necesita_humano = false;
      conv.fuera_horario = false;
    } else {
      conv.ultimo_de = "cliente";
      conv.no_leidos = (conv.no_leidos || 0) + 1;
      conv.ultimo_entrante_en = entrante.fecha;
      conv.fuera_horario = !abierto;
      if (contacto.nombre && conv.nombre === defecto) conv.nombre = contacto.nombre;
    }
    conv.actualizado = ahora.toISOString();
  }
  await db.guardarConversacion(conv);

  // 5. media: bajar y subir al storage
  let media_url = entrante.media_url;
  let media_mime = entrante.media_mime;
  let error: string | undefined;
  const esMedia = ["imagen", "audio", "video", "documento", "sticker"].includes(entrante.tipo);
  if (!simulado && esMedia && (entrante.media_id || entrante.media_url)) {
    try {
      if (canal.tipo === "whatsapp" && entrante.media_id) {
        const creds = await db.credencialesCanal(canal.id);
        if (!creds) throw new Invalido("El canal no tiene token: no pude bajar el archivo.", "sin_token");
        const bajado = await meta.bajarMediaWa(creds.token, entrante.media_id);
        const guardado = await db.guardarArchivo(empresa.id, `${uid("f")}.${extDeMime(bajado.mime, entrante.media_nombre)}`, bajado.bytes, bajado.mime);
        media_url = guardado.url;
        media_mime = bajado.mime;
      } else if (entrante.media_url) {
        const res = await fetch(entrante.media_url, { signal: AbortSignal.timeout(30_000) });
        if (!res.ok) throw new Error(`Meta no me dejó bajar el archivo (${res.status}).`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (bytes.byteLength > 25 * 1024 * 1024) throw new Error("El archivo pesa más de 25 MB: no lo bajamos.");
        const mime = (res.headers.get("content-type") || media_mime || "application/octet-stream").split(";")[0].trim();
        const guardado = await db.guardarArchivo(empresa.id, `${uid("f")}.${extDeMime(mime, entrante.media_nombre)}`, bytes, mime);
        media_url = guardado.url;
        media_mime = mime;
      }
    } catch (e) {
      error = `No pude guardar el archivo: ${errorCriollo(e)}`;
    }
  }

  let cita_id: string | undefined;
  if (entrante.cita_externo_id) {
    const citado = await db.mensajePorExterno(empresa.id, entrante.cita_externo_id);
    cita_id = citado?.id;
  }

  const mensaje: Mensaje = {
    id: uid("m"),
    empresa_id: empresa.id,
    conversacion_id: conv.id,
    direccion: entrante.eco ? "out" : "in",
    de: entrante.eco ? "agente" : "cliente",
    autor: entrante.eco ? "desde el celular" : contacto.nombre,
    tipo: entrante.tipo,
    texto: entrante.texto || "",
    media_url,
    media_nombre: entrante.media_nombre,
    media_mime,
    externo_id: entrante.externo_id,
    estado: entrante.eco ? "enviado" : undefined,
    error,
    cita_id,
    creado: entrante.fecha,
  };
  await db.guardarMensaje(mensaje);

  // 6. bot
  let bot: BotResultado | undefined;
  if (!entrante.eco) {
    const [botConf, productos, pedidos] = await Promise.all([db.bot(empresa.id), db.productos(empresa.id), db.pedidos(empresa.id)]);
    bot = evaluarBot({
      empresa,
      bot: completarBot(botConf),
      conv,
      contacto,
      texto: entrante.texto || "",
      esPrimerMensaje,
      productos,
      pedidos,
      ahora,
    });
    for (const r of bot.respuestas) {
      try {
        await enviarSaliente(db, empresa, canal, conv, { texto: r.texto, de: "bot", autor: "Bot", simulado });
      } catch (e) {
        console.error("[crm bot] no pude mandar la respuesta automática:", errorCriollo(e));
      }
    }
    Object.assign(conv, bot.cambios);
    conv.actualizado = ahoraIso();
    await db.guardarConversacion(conv);
  }

  // 7. aviso a la empresa (best effort)
  if (empresa.webhook_salida_url && !simulado) {
    avisarWebhookSalida(empresa.webhook_salida_url, { evento: "mensaje_entrante", conversacion: conv, mensaje });
  }

  return { conversacion: conv, mensaje, bot };
}

export function avisarWebhookSalida(url: string, payload: Record<string, unknown>): void {
  if (!/^https?:\/\//i.test(url)) return;
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Clientany-Webhook/1.0" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  }).catch(() => {
    // best effort: si la empresa no responde, no frenamos nada
  });
}

// Estados que manda Meta (sent/delivered/read/failed) sobre nuestros salientes.
const ORDEN_ESTADO: Record<MensajeEstado, number> = { pendiente: 0, enviado: 1, entregado: 2, leido: 3, fallido: 4 };

export async function aplicarEstado(db: Db, empresa: Empresa, estado: EstadoEntrante): Promise<boolean> {
  if (estado.externo_id.startsWith("watermark:")) {
    const psid = estado.externo_id.slice("watermark:".length);
    if (!psid) return false;
    const convs = (await db.conversaciones(empresa.id, { limite: 2000 })).filter((c) => c.identificador === psid);
    let tocados = 0;
    const hasta = new Date(estado.fecha).getTime();
    for (const conv of convs) {
      const mensajes = await db.mensajes(conv.id, { limite: 50 });
      for (const m of mensajes) {
        if (m.direccion === "out" && m.estado !== "leido" && m.estado !== "fallido" && new Date(m.creado).getTime() <= hasta) {
          m.estado = "leido";
          await db.guardarMensaje(m);
          tocados += 1;
        }
      }
    }
    return tocados > 0;
  }
  const m = await db.mensajePorExterno(empresa.id, estado.externo_id);
  if (!m) return false;
  const actual = m.estado ? ORDEN_ESTADO[m.estado] : 0;
  const nuevo = ORDEN_ESTADO[estado.estado];
  if (estado.estado !== "fallido" && nuevo <= actual) return false;
  m.estado = estado.estado;
  if (estado.estado === "fallido") m.error = estado.error || "Meta no pudo entregar el mensaje.";
  await db.guardarMensaje(m);
  return true;
}

// ============================================================
// Saliente
// ============================================================
export interface OpcionesSaliente {
  texto?: string;
  tipo?: MensajeTipo;
  media_url?: string;
  media_nombre?: string;
  media_mime?: string;
  plantilla?: { nombre: string; idioma?: string; parametros: string[] };
  cita_id?: string;
  de: "agente" | "bot";
  autor: string;
  simulado?: boolean;
}

function tipoWa(tipo: MensajeTipo): "image" | "audio" | "video" | "document" {
  if (tipo === "imagen" || tipo === "sticker") return "image";
  if (tipo === "audio") return "audio";
  if (tipo === "video") return "video";
  return "document";
}

async function mandarPorGraph(
  db: Db,
  canal: Canal,
  conv: Conversacion,
  creds: CanalCredenciales,
  op: OpcionesSaliente,
  texto: string,
  tipo: MensajeTipo,
  ahora: Date
): Promise<string> {
  const to = conv.identificador;
  if (canal.tipo === "whatsapp") {
    if (op.plantilla) {
      const r = await meta.enviarPlantillaWa(creds.token, canal.externo_id, to, op.plantilla.nombre, op.plantilla.idioma || "es_AR", op.plantilla.parametros || []);
      return r.externo_id;
    }
    if (!ventanaAbierta(conv, ahora)) throw new Invalido(VENTANA_WA, "ventana_cerrada");
    if (op.media_url) {
      const r = await meta.enviarMediaWa(creds.token, canal.externo_id, to, tipoWa(tipo), urlAbsoluta(op.media_url), { caption: texto || undefined, filename: op.media_nombre });
      return r.externo_id;
    }
    const cita = op.cita_id ? (await db.mensaje(op.cita_id))?.externo_id : undefined;
    const r = await meta.enviarTextoWa(creds.token, canal.externo_id, to, texto, { cita_externo_id: cita });
    return r.externo_id;
  }
  if (canal.tipo === "instagram") {
    if (!ventanaAbierta(conv, ahora)) throw new Invalido(VENTANA_IG, "ventana_cerrada");
    const detalle = (canal.detalle || {}) as DetalleCanal;
    const r = await meta.enviarIg({
      token: creds.token,
      ig_id: detalle.flujo === "instagram" ? canal.externo_id : undefined,
      page_id: canal.page_id,
      psid: to,
      texto,
      media_url: op.media_url ? urlAbsoluta(op.media_url) : undefined,
    });
    return r.externo_id;
  }
  if (canal.tipo === "messenger") {
    if (!ventanaAbierta(conv, ahora)) throw new Invalido(VENTANA_IG, "ventana_cerrada");
    const r = await meta.enviarMessenger({
      token: creds.token,
      page_id: canal.page_id || canal.externo_id,
      psid: to,
      texto,
      media_url: op.media_url ? urlAbsoluta(op.media_url) : undefined,
    });
    return r.externo_id;
  }
  throw new Invalido("Este canal no manda mensajes por la red.", "canal_manual");
}

// Manda (o simula) un mensaje nuestro y actualiza la conversación. Si el
// canal es manual, no tiene token, o `simulado`, se guarda como enviado
// sin tocar la red. Muta `conv` para que quien llama tenga la versión final.
export async function enviarSaliente(db: Db, empresa: Empresa, canal: Canal, conv: Conversacion, op: OpcionesSaliente): Promise<Mensaje> {
  const ahora = new Date();
  let texto = (op.texto || "").trim();
  let nombrePlantilla: string | undefined;
  const tipo: MensajeTipo = op.tipo || (op.plantilla ? "plantilla" : op.media_url ? tipoDeMime(op.media_mime) : "texto");
  if (op.plantilla) {
    nombrePlantilla = op.plantilla.nombre;
    const todas = await db.plantillas(empresa.id);
    const p =
      todas.find((x) => x.nombre === op.plantilla!.nombre && (!op.plantilla!.idioma || x.idioma === op.plantilla!.idioma)) ||
      todas.find((x) => x.nombre === op.plantilla!.nombre);
    texto = p ? rellenarPlantilla(p.cuerpo, op.plantilla.parametros || []) : `[plantilla ${op.plantilla.nombre}] ${(op.plantilla.parametros || []).join(" · ")}`.trim();
  }
  if (!texto && !op.media_url) throw new Invalido("El mensaje está vacío.", "texto_vacio");
  if (texto.length > LIMITE_TEXTO_WHATSAPP) throw new Invalido(`El mensaje es muy largo (máximo ${LIMITE_TEXTO_WHATSAPP} caracteres).`, "texto_largo");

  const creds = op.simulado || canal.tipo === "manual" ? null : await db.credencialesCanal(canal.id);
  const mensaje: Mensaje = {
    id: uid("m"),
    empresa_id: empresa.id,
    conversacion_id: conv.id,
    direccion: "out",
    de: op.de,
    autor: op.autor,
    tipo,
    texto,
    media_url: op.media_url,
    media_nombre: op.media_nombre,
    media_mime: op.media_mime,
    estado: "enviado",
    cita_id: op.cita_id,
    plantilla: nombrePlantilla,
    creado: ahora.toISOString(),
  };

  if (creds) {
    try {
      mensaje.externo_id = await mandarPorGraph(db, canal, conv, creds, op, texto, tipo, ahora);
    } catch (e) {
      if (e instanceof Invalido && e.codigo === "ventana_cerrada") throw e; // no se intentó nada: la UI ofrece plantilla
      const motivo = errorCriollo(e);
      mensaje.estado = "fallido";
      mensaje.error = motivo;
      await db.guardarMensaje(mensaje);
      throw new Invalido(motivo, "envio_fallido");
    }
  }

  await db.guardarMensaje(mensaje);
  conv.ultimo_texto = previewMensaje(tipo, texto, op.media_nombre);
  conv.ultimo_en = mensaje.creado;
  conv.ultimo_de = op.de;
  if (op.de === "agente") {
    conv.ultimo_saliente_humano_en = mensaje.creado;
    conv.visto_in = conv.ultimo_entrante_en || conv.visto_in || null;
    conv.no_leidos = 0;
    conv.necesita_humano = false;
    conv.fuera_horario = false;
  }
  conv.actualizado = ahoraIso();
  await db.guardarConversacion(conv);
  return mensaje;
}

// Marca leído: no_leidos = 0 y, si hay credenciales, los tildes azules en WhatsApp.
export async function marcarLeido(db: Db, empresa: Empresa, conv: Conversacion): Promise<Conversacion> {
  if (!conv.no_leidos) return conv;
  conv.no_leidos = 0;
  conv.actualizado = ahoraIso();
  await db.guardarConversacion(conv);
  if (conv.canal === "whatsapp") {
    try {
      const creds = await db.credencialesCanal(conv.canal_id);
      const canal = creds ? await db.canal(conv.canal_id) : null;
      if (creds && canal) {
        const ultimos = await db.mensajes(conv.id, { limite: 20 });
        const entrante = [...ultimos].reverse().find((m) => m.direccion === "in" && m.externo_id);
        if (entrante?.externo_id) await meta.marcarLeidoWa(creds.token, canal.externo_id, entrante.externo_id);
      }
    } catch {
      // best effort
    }
  }
  return conv;
}

// ============================================================
// Acciones sobre la conversación
// ============================================================
export async function aplicarAccion(db: Db, empresa: Empresa, miembro: Miembro, conv: Conversacion, accion: AccionConversacion): Promise<Conversacion> {
  const ahora = ahoraIso();
  const ref = { tipo: "conversacion", id: conv.id };
  let que = "";
  switch (accion.tipo) {
    case "respondido":
      conv.visto_in = conv.ultimo_entrante_en || ahora;
      conv.necesita_humano = false;
      conv.fuera_horario = false;
      que = `marcó como respondido el chat de ${conv.nombre}`;
      break;
    case "grupo":
      conv.grupo = accion.grupo ?? null;
      if (accion.grupo === "resueltos") conv.visto_in = conv.ultimo_entrante_en || ahora;
      que = accion.grupo ? `movió el chat de ${conv.nombre} a ${accion.grupo}` : `devolvió el chat de ${conv.nombre} a Ventas`;
      break;
    case "resolver":
      conv.grupo = "resueltos";
      conv.visto_in = conv.ultimo_entrante_en || ahora;
      conv.recordar = null;
      conv.necesita_humano = false;
      conv.fuera_horario = false;
      que = `resolvió el chat de ${conv.nombre}`;
      break;
    case "reabrir":
      conv.grupo = null;
      que = `reabrió el chat de ${conv.nombre}`;
      break;
    case "recordar":
      if (accion.fecha) {
        const d = new Date(accion.fecha);
        if (isNaN(d.getTime())) throw new Invalido("La fecha del recordatorio no es válida.", "fecha_invalida");
        conv.recordar = { fecha: d.toISOString(), nota: (accion.nota || "").trim() || undefined, quien: miembro.nombre, puesto: ahora };
        conv.grupo = "mas_adelante";
        que = `pospuso el chat de ${conv.nombre}`;
      } else {
        conv.recordar = null;
        if (conv.grupo === "mas_adelante") conv.grupo = null;
        que = `sacó el recordatorio del chat de ${conv.nombre}`;
      }
      break;
    case "tomar":
      conv.tomado_por = { quien: miembro.id, nombre: miembro.nombre, cuando: ahora };
      que = `tomó el chat de ${conv.nombre}`;
      break;
    case "soltar":
      conv.tomado_por = null;
      que = `soltó el chat de ${conv.nombre}`;
      break;
    case "baja":
      conv.baja = !!accion.valor;
      if (accion.valor) conv.grupo = "baja";
      else if (conv.grupo === "baja") conv.grupo = null;
      que = accion.valor ? `dio de baja a ${conv.nombre}` : `sacó de Baja a ${conv.nombre}`;
      break;
    case "asignar": {
      if (accion.miembro_id) await miembroDe(db, empresa, accion.miembro_id);
      conv.asignado_a = accion.miembro_id || null;
      const a = accion.miembro_id ? await db.miembro(accion.miembro_id) : null;
      que = a ? `asignó el chat de ${conv.nombre} a ${a.nombre}` : `desasignó el chat de ${conv.nombre}`;
      break;
    }
    case "urgente":
      conv.urgente = !!accion.valor;
      que = accion.valor ? `marcó urgente el chat de ${conv.nombre}` : `sacó la urgencia del chat de ${conv.nombre}`;
      break;
    case "etapa": {
      if (accion.etapa_id && !empresa.etapas.some((e) => e.id === accion.etapa_id)) throw new Invalido("Esa etapa no existe.", "etapa_invalida");
      conv.etapa_id = accion.etapa_id || null;
      const e = empresa.etapas.find((x) => x.id === accion.etapa_id);
      que = e ? `pasó el chat de ${conv.nombre} a la etapa ${e.nombre}` : `sacó la etapa del chat de ${conv.nombre}`;
      break;
    }
    case "etiquetas": {
      const validas = new Set(empresa.etiquetas.map((e) => e.id));
      conv.etiquetas = (accion.etiquetas || []).filter((id) => validas.has(id));
      que = `cambió las etiquetas del chat de ${conv.nombre}`;
      break;
    }
    case "nota":
      if ((accion.nota || "").length > MAX_TEXTO) throw new Invalido("La nota es muy larga.", "texto_largo");
      conv.nota = (accion.nota || "").trim() || undefined;
      que = conv.nota ? `dejó una nota en el chat de ${conv.nombre}` : `borró la nota del chat de ${conv.nombre}`;
      break;
    case "humano_atendido":
      conv.necesita_humano = false;
      que = `atendió el pedido de persona en el chat de ${conv.nombre}`;
      break;
    case "pedido":
      if (accion.pedido_id) await pedidoDe(db, empresa, accion.pedido_id);
      conv.pedido_id = accion.pedido_id || null;
      que = accion.pedido_id ? `ató un pedido al chat de ${conv.nombre}` : `desató el pedido del chat de ${conv.nombre}`;
      break;
    case "nombre": {
      const nombre = (accion.nombre || "").trim();
      if (!nombre) throw new Invalido("El nombre no puede quedar vacío.", "falta_nombre");
      if (nombre.length > MAX_NOMBRE) throw new Invalido("El nombre es muy largo.", "largo_nombre");
      const anterior = conv.nombre;
      conv.nombre = nombre;
      const contacto = await db.contacto(conv.contacto_id);
      if (contacto && contacto.empresa_id === empresa.id) {
        contacto.nombre = nombre;
        contacto.actualizado = ahora;
        await db.guardarContacto(contacto);
      }
      que = `renombró a ${anterior} como ${nombre}`;
      break;
    }
    default:
      throw new Invalido("No conozco esa acción.", "accion_invalida");
  }
  conv.actualizado = ahora;
  await db.guardarConversacion(conv);
  if (que) await registrar(db, empresa.id, miembro.nombre, que, ref);
  return conv;
}

// ============================================================
// Conversación nueva y simulador
// ============================================================
export async function nuevaConversacion(db: Db, empresa: Empresa, miembro: Miembro, input: NuevaConversacionInput): Promise<Conversacion> {
  const canal = await canalDe(db, empresa, input.canal_id);
  const crudo = (input.identificador || "").trim();
  const identificador = canal.tipo === "whatsapp" || (canal.tipo === "manual" && /^[\d\s()+-]{8,}$/.test(crudo)) ? normalizarTelefono(crudo) : crudo;
  if (!identificador) throw new Invalido("Falta el teléfono o el usuario del cliente.", "falta_identificador");
  const ahora = ahoraIso();
  let contacto: Contacto | null = input.contacto_id ? await contactoDe(db, empresa, input.contacto_id) : null;
  const campo = campoContacto(canal.tipo, identificador);
  if (!contacto && campo) contacto = await db.contactoPorIdentificador(empresa.id, campo, identificador);
  if (!contacto) {
    contacto = {
      id: uid("ct"),
      empresa_id: empresa.id,
      nombre: (input.nombre || "").trim() || nombrePorDefecto(canal.tipo, identificador),
      telefono: campo === "telefono" ? identificador : undefined,
      ig_id: campo === "ig_id" ? identificador : undefined,
      psid: campo === "psid" ? identificador : undefined,
      etiquetas: [],
      origen: "manual",
      marca_id: canal.marca_id,
      creado: ahora,
      actualizado: ahora,
    };
    await db.guardarContacto(contacto);
  }
  let conv = await db.conversacionPorIdentificador(canal.id, identificador);
  if (!conv) {
    conv = {
      id: uid("cv"),
      empresa_id: empresa.id,
      canal_id: canal.id,
      canal: canal.tipo,
      contacto_id: contacto.id,
      identificador,
      nombre: (input.nombre || "").trim() || contacto.nombre,
      marca_id: canal.marca_id,
      ultimo_texto: "",
      ultimo_en: ahora,
      ultimo_de: "sistema",
      no_leidos: 0,
      grupo: null,
      etapa_id: null,
      etiquetas: [],
      asignado_a: null,
      tomado_por: null,
      urgente: false,
      recordar: null,
      baja: false,
      fuera_horario: false,
      necesita_humano: false,
      visto_in: null,
      pedido_id: null,
      bot_estado: null,
      creado: ahora,
      actualizado: ahora,
    };
    await db.guardarConversacion(conv);
    await registrar(db, empresa.id, miembro.nombre, `abrió un chat con ${conv.nombre}`, { tipo: "conversacion", id: conv.id });
  }
  if (input.plantilla) {
    await enviarSaliente(db, empresa, canal, conv, { plantilla: { nombre: input.plantilla.nombre, parametros: input.plantilla.parametros || [] }, de: "agente", autor: miembro.nombre });
  } else if ((input.texto || "").trim()) {
    await enviarSaliente(db, empresa, canal, conv, { texto: input.texto, de: "agente", autor: miembro.nombre });
  }
  return conv;
}

export async function simular(db: Db, empresa: Empresa, miembro: Miembro, input: SimularEntranteInput): Promise<ResultadoEntrante> {
  const textoMsg = (input.texto || "").trim();
  if (!textoMsg) throw new Invalido("Escribí el texto del mensaje a simular.", "falta_texto");
  if (textoMsg.length > MAX_TEXTO) throw new Invalido("El texto es muy largo.", "texto_largo");
  let canal: Canal | null = null;
  if (input.canal_id) canal = await canalDe(db, empresa, input.canal_id);
  if (!canal) {
    const canales = await db.canales(empresa.id);
    canal = (input.canal_tipo ? canales.find((c) => c.tipo === input.canal_tipo) : undefined) || canales[0] || null;
  }
  if (!canal) {
    canal = await db.guardarCanal(
      {
        id: uid("ch"),
        empresa_id: empresa.id,
        tipo: "manual",
        nombre: "Canal manual",
        estado: "conectado",
        externo_id: "manual:" + uid(),
        token_cargado: false,
        app_secret_cargado: false,
        conectado_en: ahoraIso(),
        detalle: {},
      },
      null
    );
  }
  const crudo = (input.identificador || "").trim();
  let identificador: string;
  if (canal.tipo === "whatsapp" || canal.tipo === "manual") {
    identificador = crudo ? normalizarTelefono(crudo) || crudo : `549111500${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
  } else {
    identificador = crudo || `sim_${uid()}`;
  }
  const entrante: Entrante = {
    canal_tipo: canal.tipo,
    canal_externo_id: canal.externo_id,
    identificador,
    nombre: (input.nombre || "").trim() || undefined,
    externo_id: "sim_" + uid(),
    tipo: "texto",
    texto: textoMsg,
    fecha: ahoraIso(),
    eco: false,
  };
  void miembro;
  return procesarEntrante(db, empresa, canal, entrante, { simulado: true });
}

// ============================================================
// Contactos
// ============================================================
export function armarContacto(empresa: Empresa, b: Cuerpo, previo?: Contacto | null): Contacto {
  const ahora = ahoraIso();
  const nombre = texto(b, "nombre", { requerido: !previo });
  const email = textoOpcional(b, "email");
  if (email && !emailValido(email)) throw new Invalido("El email no parece válido.", "email_invalido");
  const telRaw = textoOpcional(b, "telefono", 40);
  const telefono = telRaw === undefined ? previo?.telefono : telRaw ? normalizarTelefono(telRaw) : undefined;
  const origenes: readonly Contacto["origen"][] = ["whatsapp", "instagram", "messenger", "manual", "csv", "api"];
  return {
    id: previo?.id || uid("ct"),
    empresa_id: empresa.id,
    nombre: nombre || previo?.nombre || telefonoLindo(telefono) || email || "Sin nombre",
    telefono: telefono || undefined,
    email: email === undefined ? previo?.email : email.toLowerCase() || undefined,
    documento: textoOpcional(b, "documento", 40) ?? previo?.documento,
    ig_usuario: (textoOpcional(b, "ig_usuario", 80) ?? previo?.ig_usuario)?.replace(/^@/, "") || undefined,
    ig_id: textoOpcional(b, "ig_id", 80) ?? previo?.ig_id,
    psid: textoOpcional(b, "psid", 80) ?? previo?.psid,
    direccion: textoOpcional(b, "direccion", 200) ?? previo?.direccion,
    localidad: textoOpcional(b, "localidad") ?? previo?.localidad,
    provincia: textoOpcional(b, "provincia") ?? previo?.provincia,
    cp: textoOpcional(b, "cp", 20) ?? previo?.cp,
    notas: textoOpcional(b, "notas", MAX_TEXTO) ?? previo?.notas,
    etiquetas: "etiquetas" in b ? listaDeTextos(b, "etiquetas") : previo?.etiquetas || [],
    origen: previo?.origen || opcion(b, "origen", origenes, "manual"),
    marca_id: textoOpcional(b, "marca_id", 80) ?? previo?.marca_id,
    creado: previo?.creado || ahora,
    actualizado: ahora,
  };
}

function limpiarVacios<T extends object>(o: T): T {
  for (const k of Object.keys(o) as (keyof T)[]) if (o[k] === undefined || o[k] === "") delete o[k];
  return o;
}

// Guarda un contacto. Sin `previo`, si ya hay uno con ese teléfono o mail, lo actualiza en vez de duplicar.
export async function guardarContacto(db: Db, empresa: Empresa, b: Cuerpo, previo?: Contacto | null): Promise<Contacto> {
  let base = previo || null;
  if (!base) {
    const tel = typeof b.telefono === "string" ? normalizarTelefono(b.telefono) : "";
    const mail = typeof b.email === "string" ? b.email.trim() : "";
    if (tel) base = await db.contactoPorIdentificador(empresa.id, "telefono", tel);
    if (!base && mail) base = await db.contactoPorIdentificador(empresa.id, "email", mail);
  }
  const c = limpiarVacios(armarContacto(empresa, b, base));
  await db.guardarContacto(c);
  return c;
}

export async function importarContactos(db: Db, empresa: Empresa, filas: Cuerpo[]): Promise<{ nuevos: number; actualizados: number }> {
  const existentes = await db.contactos(empresa.id);
  const porTel = new Map<string, Contacto>();
  const porMail = new Map<string, Contacto>();
  for (const c of existentes) {
    const cola = colaTelefono(c.telefono);
    if (cola.length >= 8) porTel.set(cola, c);
    if (c.email) porMail.set(c.email.toLowerCase(), c);
  }
  let nuevos = 0;
  let actualizados = 0;
  const aGuardar: Contacto[] = [];
  for (const fila of filas) {
    const b: Cuerpo = { ...fila };
    delete b.id;
    delete b.empresa_id;
    if (!b.origen) b.origen = "csv";
    const tel = typeof b.telefono === "string" ? colaTelefono(normalizarTelefono(b.telefono)) : "";
    const mail = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
    const previo = (tel.length >= 8 ? porTel.get(tel) : undefined) || (mail ? porMail.get(mail) : undefined) || null;
    let c: Contacto;
    try {
      c = limpiarVacios(armarContacto(empresa, b, previo));
    } catch {
      continue; // fila inválida: se saltea
    }
    if (previo) {
      // no pisamos lo que ya había con vacíos; sumamos etiquetas
      c.etiquetas = [...new Set([...(previo.etiquetas || []), ...(c.etiquetas || [])])];
      actualizados += 1;
    } else nuevos += 1;
    aGuardar.push(c);
    const colaN = colaTelefono(c.telefono);
    if (colaN.length >= 8) porTel.set(colaN, c);
    if (c.email) porMail.set(c.email.toLowerCase(), c);
  }
  if (aGuardar.length) await db.guardarContactos(aGuardar);
  return { nuevos, actualizados };
}

// ============================================================
// Pedidos
// ============================================================
function armarItems(v: unknown): Pedido["items"] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(esObjeto)
    .map((i) => ({
      sku: typeof i.sku === "string" && i.sku.trim() ? i.sku.trim() : undefined,
      nombre: String(i.nombre ?? "").trim() || "Producto",
      cantidad: Math.max(1, Math.round(Number(i.cantidad) || 1)),
      precio: Number(i.precio) || 0,
    }))
    .slice(0, 200);
}

function armarEnvio(v: unknown, previo?: Pedido["envio"]): Pedido["envio"] {
  if (v === undefined) return previo;
  if (v === null || !esObjeto(v)) return undefined;
  const t = (k: string) => (typeof v[k] === "string" && (v[k] as string).trim() ? (v[k] as string).trim().slice(0, 200) : undefined);
  const e = limpiarVacios({ transporte: t("transporte"), seguimiento: t("seguimiento"), url: t("url"), direccion: t("direccion"), localidad: t("localidad"), provincia: t("provincia"), cp: t("cp") });
  return Object.keys(e).length ? e : undefined;
}

export function armarPedido(empresa: Empresa, b: Cuerpo, previo?: Pedido | null): Pedido {
  const ahora = ahoraIso();
  const numeroP = texto(b, "numero", { requerido: !previo, max: 60 }) || previo?.numero || "";
  const nombre = texto(b, "nombre", { requerido: !previo }) || previo?.nombre || "Sin nombre";
  const telRaw = textoOpcional(b, "telefono", 40);
  const telefono = telRaw === undefined ? previo?.telefono : telRaw ? normalizarTelefono(telRaw) : undefined;
  const email = textoOpcional(b, "email");
  if (email && !emailValido(email)) throw new Invalido("El email no parece válido.", "email_invalido");
  const items = "items" in b ? armarItems(b.items) : previo?.items || [];
  const total = "total" in b ? numero(b, "total") : previo ? previo.total : items.reduce((s, i) => s + i.cantidad * i.precio, 0);
  let creado = previo?.creado || ahora;
  if (typeof b.creado === "string" || typeof b.fecha === "string") {
    const d = new Date(String(b.creado || b.fecha));
    if (!isNaN(d.getTime())) creado = d.toISOString();
  }
  return limpiarVacios({
    id: previo?.id || uid("pd"),
    empresa_id: empresa.id,
    numero: numeroP,
    contacto_id: typeof b.contacto_id === "string" ? b.contacto_id : previo?.contacto_id ?? null,
    nombre,
    telefono: telefono || undefined,
    email: email === undefined ? previo?.email : email.toLowerCase() || undefined,
    estado: "estado" in b && b.estado ? opcion(b, "estado", ESTADOS_PEDIDO) : previo?.estado || "pagado",
    items,
    total,
    moneda: texto(b, "moneda", { max: 8 }) || previo?.moneda || empresa.moneda || "ARS",
    envio: armarEnvio(b.envio, previo?.envio),
    canal: textoOpcional(b, "canal", 40) ?? previo?.canal,
    notas: textoOpcional(b, "notas", MAX_TEXTO) ?? previo?.notas,
    marca_id: textoOpcional(b, "marca_id", 80) ?? previo?.marca_id,
    creado,
    actualizado: ahora,
  });
}

async function atarContacto(db: Db, empresa: Empresa, pedido: Pedido, cache?: { porTel: Map<string, Contacto>; porMail: Map<string, Contacto>; nuevos: Contacto[] }): Promise<void> {
  if (pedido.contacto_id) {
    const c = await db.contacto(pedido.contacto_id);
    if (c && c.empresa_id === empresa.id) return;
    pedido.contacto_id = null;
  }
  const cola = colaTelefono(pedido.telefono);
  const mail = (pedido.email || "").toLowerCase();
  let c: Contacto | null = null;
  if (cache) {
    c = (cola.length >= 8 ? cache.porTel.get(cola) : undefined) || (mail ? cache.porMail.get(mail) : undefined) || null;
  } else {
    if (cola.length >= 8) c = await db.contactoPorIdentificador(empresa.id, "telefono", pedido.telefono || "");
    if (!c && mail) c = await db.contactoPorIdentificador(empresa.id, "email", mail);
  }
  if (!c && (cola.length >= 8 || mail)) {
    const ahora = ahoraIso();
    const origen: Contacto["origen"] = pedido.canal === "csv" ? "csv" : pedido.canal === "api" ? "api" : "manual";
    c = limpiarVacios({
      id: uid("ct"),
      empresa_id: empresa.id,
      nombre: pedido.nombre || telefonoLindo(pedido.telefono) || mail,
      telefono: pedido.telefono,
      email: mail || undefined,
      direccion: pedido.envio?.direccion,
      localidad: pedido.envio?.localidad,
      provincia: pedido.envio?.provincia,
      cp: pedido.envio?.cp,
      etiquetas: [],
      origen,
      marca_id: pedido.marca_id,
      creado: ahora,
      actualizado: ahora,
    });
    if (cache) {
      cache.nuevos.push(c);
      if (cola.length >= 8) cache.porTel.set(cola, c);
      if (mail) cache.porMail.set(mail, c);
    } else await db.guardarContacto(c);
  }
  pedido.contacto_id = c ? c.id : null;
}

// Guarda un pedido (upsert por número) atando el contacto por teléfono o mail.
export async function guardarPedidoAtando(db: Db, empresa: Empresa, pedido: Pedido): Promise<Pedido> {
  await atarContacto(db, empresa, pedido);
  await db.guardarPedido(pedido);
  return pedido;
}

export async function importarPedidos(db: Db, empresa: Empresa, filas: Cuerpo[]): Promise<{ nuevos: number; actualizados: number }> {
  const existentes = await db.pedidos(empresa.id);
  const porNumero = new Map(existentes.map((p) => [p.numero.trim().toLowerCase(), p]));
  const contactos = await db.contactos(empresa.id);
  const cache = { porTel: new Map<string, Contacto>(), porMail: new Map<string, Contacto>(), nuevos: [] as Contacto[] };
  for (const c of contactos) {
    const cola = colaTelefono(c.telefono);
    if (cola.length >= 8) cache.porTel.set(cola, c);
    if (c.email) cache.porMail.set(c.email.toLowerCase(), c);
  }
  let nuevos = 0;
  let actualizados = 0;
  const aGuardar: Pedido[] = [];
  for (const fila of filas) {
    const b: Cuerpo = { ...fila };
    delete b.id;
    delete b.empresa_id;
    delete b.contacto_id;
    if (!b.canal) b.canal = "csv";
    const num = typeof b.numero === "string" ? b.numero.trim().toLowerCase() : "";
    const previo = num ? porNumero.get(num) || null : null;
    let p: Pedido;
    try {
      p = armarPedido(empresa, b, previo);
    } catch {
      continue;
    }
    if (previo) actualizados += 1;
    else nuevos += 1;
    await atarContacto(db, empresa, p, cache);
    aGuardar.push(p);
    porNumero.set(p.numero.trim().toLowerCase(), p);
  }
  if (cache.nuevos.length) await db.guardarContactos(cache.nuevos);
  if (aGuardar.length) await db.guardarPedidos(aGuardar);
  return { nuevos, actualizados };
}

// ============================================================
// Productos
// ============================================================
export function armarProducto(empresa: Empresa, b: Cuerpo, previo?: Producto | null): Producto {
  const sku = texto(b, "sku", { requerido: !previo, max: 60 }) || previo?.sku || "";
  const nombre = texto(b, "nombre", { requerido: !previo, max: 200 }) || previo?.nombre || "";
  const stockMin = "stock_minimo" in b ? (b.stock_minimo === null || b.stock_minimo === "" ? undefined : numero(b, "stock_minimo", { entero: true, min: 0 })) : previo?.stock_minimo;
  return limpiarVacios({
    id: previo?.id || uid("pr"),
    empresa_id: empresa.id,
    sku,
    nombre,
    precio: "precio" in b ? numero(b, "precio", { min: 0 }) : previo?.precio || 0,
    moneda: texto(b, "moneda", { max: 8 }) || previo?.moneda || empresa.moneda || "ARS",
    stock: "stock" in b ? Math.round(numero(b, "stock", { min: 0 })) : previo?.stock || 0,
    stock_minimo: stockMin,
    categoria: textoOpcional(b, "categoria") ?? previo?.categoria,
    descripcion: textoOpcional(b, "descripcion", MAX_TEXTO) ?? previo?.descripcion,
    imagen_url: textoOpcional(b, "imagen_url", 500) ?? previo?.imagen_url,
    activo: "activo" in b ? booleano(b, "activo", true) : previo?.activo ?? true,
    marca_id: textoOpcional(b, "marca_id", 80) ?? previo?.marca_id,
    actualizado: ahoraIso(),
  });
}

export async function importarProductos(db: Db, empresa: Empresa, filas: Cuerpo[]): Promise<{ nuevos: number; actualizados: number }> {
  const existentes = await db.productos(empresa.id);
  const porSku = new Map(existentes.map((p) => [p.sku.trim().toLowerCase(), p]));
  let nuevos = 0;
  let actualizados = 0;
  const aGuardar: Producto[] = [];
  for (const fila of filas) {
    const b: Cuerpo = { ...fila };
    delete b.id;
    delete b.empresa_id;
    const sku = typeof b.sku === "string" ? b.sku.trim().toLowerCase() : "";
    const previo = sku ? porSku.get(sku) || null : null;
    let p: Producto;
    try {
      p = armarProducto(empresa, b, previo);
    } catch {
      continue;
    }
    if (previo) actualizados += 1;
    else nuevos += 1;
    aGuardar.push(p);
    porSku.set(p.sku.trim().toLowerCase(), p);
  }
  if (aGuardar.length) await db.guardarProductos(aGuardar);
  return { nuevos, actualizados };
}

export async function ajustarStock(db: Db, empresa: Empresa, quien: string, producto: Producto, delta: number, motivo?: string): Promise<Producto> {
  if (!Number.isInteger(delta) || delta === 0) throw new Invalido("El ajuste tiene que ser un número entero distinto de cero.", "delta_invalido");
  const nuevo = producto.stock + delta;
  if (nuevo < 0) throw new Invalido(`No hay tanto stock: quedan ${producto.stock} unidades.`, "stock_insuficiente");
  producto.stock = nuevo;
  producto.actualizado = ahoraIso();
  await db.guardarProducto(producto);
  await registrar(db, empresa.id, quien, `ajustó el stock de ${producto.nombre} (${delta > 0 ? "+" : ""}${delta}, queda ${nuevo})${motivo ? `: ${motivo}` : ""}`, { tipo: "producto", id: producto.id });
  return producto;
}

// ============================================================
// Canales
// ============================================================
export async function conectarCanal(db: Db, empresa: Empresa, input: ConectarCanalInput): Promise<Canal> {
  const ahora = ahoraIso();
  const token = (input.token || "").trim();
  const appSecret = (input.app_secret || "").trim();
  let externo_id = "";
  let nombre = (input.nombre || "").trim();
  const detalle: DetalleCanal = {};
  let waba_id = (input.waba_id || "").trim() || undefined;
  let page_id = (input.page_id || "").trim() || undefined;

  if (input.tipo === "whatsapp") {
    const phoneId = (input.phone_number_id || "").trim();
    if (!phoneId) throw new Invalido("Falta el ID del número de WhatsApp (Phone number ID).", "falta_phone_number_id");
    if (!token) throw new Invalido("Falta el token de acceso de Meta.", "falta_token");
    const v = await meta.validarWhatsApp(token, phoneId);
    externo_id = phoneId;
    detalle.numero_visible = v.numero_visible;
    detalle.nombre_verificado = v.nombre_verificado;
    detalle.calidad = v.calidad;
    nombre = nombre || v.numero_visible || v.nombre_verificado || "WhatsApp";
  } else if (input.tipo === "messenger") {
    if (!page_id) throw new Invalido("Falta el ID de la página de Facebook.", "falta_page_id");
    if (!token) throw new Invalido("Falta el token de acceso de Meta.", "falta_token");
    const v = await meta.validarPagina(token, page_id);
    externo_id = page_id;
    detalle.nombre_pagina = v.nombre_pagina;
    nombre = nombre || v.nombre_pagina || "Messenger";
  } else if (input.tipo === "instagram") {
    if (!token) throw new Invalido("Falta el token de acceso.", "falta_token");
    const igUser = (input.ig_user_id || "").trim();
    if (igUser && !page_id) {
      try {
        const v = await meta.validarInstagramLogin(token);
        externo_id = igUser || v.ig_id;
        detalle.usuario_ig = v.usuario_ig;
        detalle.flujo = "instagram";
      } catch (e1) {
        // Puede ser un token de página: probamos el flujo viejo con la cuenta de IG atada
        try {
          const v = await meta.validarPagina(token, igUser);
          externo_id = v.ig_id || igUser;
          detalle.usuario_ig = v.usuario_ig;
          detalle.nombre_pagina = v.nombre_pagina;
          detalle.flujo = "facebook";
          page_id = igUser;
        } catch {
          throw e1;
        }
      }
    } else {
      if (!page_id) throw new Invalido("Falta el ID de la cuenta de Instagram o el de la página de Facebook atada.", "falta_page_id");
      const v = await meta.validarPagina(token, page_id);
      if (!v.ig_id && !igUser) throw new Invalido("Esa página no tiene una cuenta de Instagram profesional atada.", "sin_instagram");
      externo_id = igUser || v.ig_id || "";
      detalle.usuario_ig = v.usuario_ig;
      detalle.nombre_pagina = v.nombre_pagina;
      detalle.flujo = "facebook";
    }
    nombre = nombre || (detalle.usuario_ig ? `@${detalle.usuario_ig}` : "Instagram");
  } else if (input.tipo === "manual") {
    externo_id = "manual:" + uid();
    nombre = nombre || "Canal manual";
  } else {
    throw new Invalido("Tipo de canal desconocido.", "tipo_invalido");
  }

  const previo = input.tipo === "manual" ? null : await db.canalPorExterno(input.tipo, externo_id, empresa.id);
  const canal: Canal = {
    id: previo?.id || uid("ch"),
    empresa_id: empresa.id,
    tipo: input.tipo,
    nombre: nombre.slice(0, MAX_NOMBRE),
    marca_id: (input.marca_id || "").trim() || previo?.marca_id,
    estado: "conectado",
    externo_id,
    waba_id: waba_id || previo?.waba_id,
    page_id: page_id || previo?.page_id,
    token_cargado: !!token,
    app_secret_cargado: !!appSecret,
    ultimo_error: undefined,
    conectado_en: ahora,
    detalle: { ...(previo?.detalle || {}), ...detalle },
    api_version: (input.api_version || "").trim() || previo?.api_version || meta.versionGraph(),
  };
  if (!canal.marca_id) delete canal.marca_id;
  if (!waba_id && !canal.waba_id) delete canal.waba_id;
  if (!canal.page_id) delete canal.page_id;
  // Sin token (manual): sin credenciales. Con token: se reemplazan. Si es una
  // reconexión sin token nuevo, se mantienen las guardadas.
  const credenciales = input.tipo === "manual" ? null : token ? { token, app_secret: appSecret || undefined } : undefined;
  return db.guardarCanal(canal, credenciales);
}

export async function probarCanal(db: Db, empresa: Empresa, canal: Canal): Promise<{ ok: boolean; detalle?: Canal["detalle"]; error?: string }> {
  void empresa;
  if (canal.tipo === "manual") return { ok: true, detalle: canal.detalle };
  const creds = await db.credencialesCanal(canal.id);
  if (!creds) {
    canal.estado = "error";
    canal.ultimo_error = "El canal no tiene un token cargado.";
    await db.guardarCanal(canal);
    return { ok: false, error: canal.ultimo_error };
  }
  try {
    const detalle: DetalleCanal = { ...(canal.detalle || {}) };
    if (canal.tipo === "whatsapp") {
      const v = await meta.validarWhatsApp(creds.token, canal.externo_id);
      Object.assign(detalle, v);
    } else if (canal.tipo === "messenger") {
      const v = await meta.validarPagina(creds.token, canal.page_id || canal.externo_id);
      detalle.nombre_pagina = v.nombre_pagina;
    } else if (canal.tipo === "instagram") {
      if (detalle.flujo === "instagram" || !canal.page_id) {
        const v = await meta.validarInstagramLogin(creds.token);
        detalle.usuario_ig = v.usuario_ig;
      } else {
        const v = await meta.validarPagina(creds.token, canal.page_id);
        detalle.usuario_ig = v.usuario_ig || detalle.usuario_ig;
        detalle.nombre_pagina = v.nombre_pagina;
      }
    }
    canal.estado = "conectado";
    canal.ultimo_error = undefined;
    canal.detalle = detalle;
    await db.guardarCanal(canal);
    return { ok: true, detalle };
  } catch (e) {
    canal.estado = "error";
    canal.ultimo_error = errorCriollo(e);
    await db.guardarCanal(canal);
    return { ok: false, error: canal.ultimo_error };
  }
}

export async function sincronizarPlantillas(db: Db, empresa: Empresa, canal: Canal): Promise<Plantilla[]> {
  if (canal.tipo !== "whatsapp") throw new Invalido("Las plantillas se sincronizan desde un canal de WhatsApp.", "canal_invalido");
  const creds = await db.credencialesCanal(canal.id);
  if (!creds && !meta.esFake()) throw new Invalido("El canal no tiene un token cargado.", "sin_token");
  if (!canal.waba_id && !meta.esFake()) throw new Invalido("El canal no tiene cargado el ID de la cuenta de WhatsApp Business (WABA).", "sin_waba");
  const traidas = await meta.plantillasWaba(creds?.token || "", canal.waba_id || "");
  const actuales = await db.plantillas(empresa.id);
  const lista: Plantilla[] = traidas.map((p) => {
    const previa = actuales.find((x) => x.nombre === p.nombre && x.idioma === p.idioma);
    return { ...p, id: previa?.id || p.id, empresa_id: empresa.id, canal_id: canal.id };
  });
  if (lista.length) await db.guardarPlantillas(lista);
  return db.plantillas(empresa.id);
}

// ============================================================
// Datos de prueba
// ============================================================
export async function cargarDemo(db: Db, empresa: Empresa): Promise<void> {
  const d = datosDePrueba(empresa.id);
  // Las etapas y etiquetas que usan los chats de prueba tienen que existir en la empresa.
  const etapas = [...empresa.etapas, ...d.etapas.filter((e) => !empresa.etapas.some((x) => x.id === e.id))];
  const etiquetas = [...empresa.etiquetas, ...d.etiquetas.filter((e) => !empresa.etiquetas.some((x) => x.id === e.id))];
  if (etapas.length !== empresa.etapas.length || etiquetas.length !== empresa.etiquetas.length) {
    await db.actualizarEmpresa(empresa.id, { etapas, etiquetas });
  }
  for (const c of d.canales) {
    await db.guardarCanal({ ...c, empresa_id: empresa.id, estado: "conectado", token_cargado: false, app_secret_cargado: false }, null);
  }
  await db.guardarContactos(d.contactos.map((c) => ({ ...c, empresa_id: empresa.id })));
  for (const c of d.conversaciones) await db.guardarConversacion({ ...c, empresa_id: empresa.id });
  for (const lista of Object.values(d.mensajes)) {
    for (const m of lista) await db.guardarMensaje({ ...m, empresa_id: empresa.id });
  }
  await db.guardarPedidos(d.pedidos.map((p) => ({ ...p, empresa_id: empresa.id })));
  await db.guardarProductos(d.productos.map((p) => ({ ...p, empresa_id: empresa.id })));
  await db.guardarPlantillas(d.plantillas.map((p) => ({ ...p, empresa_id: empresa.id })));
  for (const r of d.rapidas) await db.guardarRapida({ ...r, empresa_id: empresa.id });
  for (const m of d.equipo) await db.guardarMensajeEquipo({ ...m, empresa_id: empresa.id });
}

export async function vaciarDemo(db: Db, empresa: Empresa): Promise<void> {
  await db.vaciarDatos(empresa.id);
  for (const c of await db.canales(empresa.id)) if (c.id.startsWith("demo_")) await db.borrarCanal(c.id);
  for (const p of await db.plantillas(empresa.id)) if (p.id.startsWith("demo_")) await db.borrarPlantilla(p.id);
  for (const r of await db.rapidas(empresa.id)) if (r.id.startsWith("demo_")) await db.borrarRapida(r.id);
}

// ============================================================
// Métricas, búsqueda y exportación
// ============================================================
export async function metricas(db: Db, empresa: Empresa): Promise<Metricas> {
  const ahora = new Date();
  const desde = new Date(ahora.getTime() - 35 * 24 * 3_600_000).toISOString();
  const [conversaciones, mensajes, pedidos, productos, miembros] = await Promise.all([
    db.conversaciones(empresa.id, { limite: 5000 }),
    db.mensajesDeEmpresa(empresa.id, desde, ahora.toISOString()),
    db.pedidos(empresa.id),
    db.productos(empresa.id),
    db.miembros(empresa.id),
  ]);
  return calcularMetricas({ empresa, conversaciones, mensajes, pedidos, productos, miembros, ahora });
}

export async function buscar(db: Db, empresa: Empresa, q: string): Promise<{ conversaciones: Conversacion[]; contactos: Contacto[]; pedidos: Pedido[] }> {
  const t = normalizarTexto(q || "");
  if (!t) return { conversaciones: [], contactos: [], pedidos: [] };
  const tel = t.replace(/\D/g, "");
  const coincide = (...partes: (string | undefined | null)[]) => {
    const s = normalizarTexto(partes.filter(Boolean).join(" "));
    return s.includes(t) || (tel.length >= 6 && s.replace(/\D/g, "").includes(tel));
  };
  const [convs, contactos, pedidos] = await Promise.all([db.conversaciones(empresa.id, { limite: 2000 }), db.contactos(empresa.id), db.pedidos(empresa.id)]);
  return {
    conversaciones: convs.filter((c) => coincide(c.nombre, c.identificador, c.ultimo_texto, c.nota)).slice(0, 50),
    contactos: contactos.filter((c) => coincide(c.nombre, c.telefono, c.email, c.ig_usuario, c.documento)).slice(0, 50),
    pedidos: pedidos.filter((p) => coincide(p.numero, p.nombre, p.telefono, p.email, p.envio?.seguimiento)).slice(0, 50),
  };
}

export async function exportarCsv(db: Db, empresa: Empresa, que: "contactos" | "pedidos" | "productos"): Promise<string> {
  if (que === "contactos") {
    const lista = await db.contactos(empresa.id);
    const nombres = new Map(empresa.etiquetas.map((e) => [e.id, e.nombre]));
    return aCsv(
      ["nombre", "telefono", "email", "documento", "localidad", "provincia", "cp", "etiquetas", "origen", "creado"],
      lista.map((c) => [c.nombre, c.telefono, c.email, c.documento, c.localidad, c.provincia, c.cp, (c.etiquetas || []).map((id) => nombres.get(id) || id).join(" | "), c.origen, c.creado])
    );
  }
  if (que === "pedidos") {
    const lista = await db.pedidos(empresa.id);
    return aCsv(
      ["numero", "fecha", "nombre", "telefono", "email", "estado", "total", "moneda", "transporte", "seguimiento", "productos"],
      lista.map((p) => [p.numero, p.creado, p.nombre, p.telefono, p.email, p.estado, p.total, p.moneda, p.envio?.transporte, p.envio?.seguimiento, (p.items || []).map((i) => `${i.cantidad}x ${i.nombre}`).join(" | ")])
    );
  }
  const lista = await db.productos(empresa.id);
  return aCsv(
    ["sku", "nombre", "precio", "moneda", "stock", "stock_minimo", "categoria", "activo"],
    lista.map((p) => [p.sku, p.nombre, p.precio, p.moneda, p.stock, p.stock_minimo, p.categoria, p.activo ? "si" : "no"])
  );
}

// ============================================================
// Equipo
// ============================================================
export async function invitar(db: Db, empresa: Empresa, miembro: Miembro, input: { email: string; nombre?: string; rol: "admin" | "agente" }): Promise<{ miembro?: Miembro; invitacion?: Invitacion }> {
  const email = (input.email || "").trim().toLowerCase();
  if (!emailValido(email)) throw new Invalido("El email no parece válido.", "email_invalido");
  const miembros = await db.miembros(empresa.id);
  if (miembros.some((m) => m.email.toLowerCase() === email)) throw new Invalido("Esa persona ya está en el equipo.", "ya_es_miembro");
  const pendiente = await db.invitacionPorEmail(email);
  if (pendiente && pendiente.empresa_id === empresa.id) return { invitacion: pendiente };
  if (pendiente) throw new Invalido("Ese mail ya tiene una invitación pendiente de otra empresa.", "invitacion_ajena");
  const invitacion: Invitacion = { id: uid("inv"), empresa_id: empresa.id, email, rol: input.rol, creado: ahoraIso(), por: miembro.id };
  await db.crearInvitacion(invitacion);
  await registrar(db, empresa.id, miembro.nombre, `invitó a ${input.nombre?.trim() || email} al equipo`);
  return { invitacion };
}

// Lista de pedidos del contacto de una conversación (para la ficha y la IA).
export async function pedidosDeConversacion(db: Db, empresa: Empresa, conv: Conversacion): Promise<{ contacto: Contacto | null; pedidos: Pedido[] }> {
  const contacto = await db.contacto(conv.contacto_id);
  const todos = await db.pedidos(empresa.id);
  const c = contacto && contacto.empresa_id === empresa.id ? contacto : null;
  const pedidos = c ? pedidosDeContacto(todos, c) : pedidosDeContacto(todos, { telefono: /^\d{8,}$/.test(conv.identificador) ? conv.identificador : undefined });
  return { contacto: c, pedidos };
}

export { lista as listaDeCuerpo };
