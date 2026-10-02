// ============================================================
// Clientany · CRM — la Graph API de Meta (SOLO servidor).
// WhatsApp Cloud API, Instagram (los dos flujos) y Messenger: validar
// credenciales, mandar, bajar media, plantillas, firma y el parseo del
// webhook a `WebhookParseado`. Ningún error devuelve un token.
//
// Con CLIENTANY_GRAPH_FAKE=1 no se toca la red: todo devuelve datos de
// prueba (para la suite de API y el desarrollo sin credenciales).
// ============================================================
import { createHmac, timingSafeEqual } from "node:crypto";
import type { CanalTipo, Entrante, EstadoEntrante, MensajeEstado, MensajeTipo, Plantilla, WebhookParseado } from "../types";
import { errorCriollo, uid } from "../core";
import { Invalido } from "./errores";

export const GRAPH_VERSION_DEFAULT = "v21.0";
const TOPE_MEDIA = 25 * 1024 * 1024;

export function versionGraph(v?: string): string {
  return v || process.env.CLIENTANY_GRAPH_VERSION || GRAPH_VERSION_DEFAULT;
}

export function esFake(): boolean {
  return process.env.CLIENTANY_GRAPH_FAKE === "1";
}

const FB = (v?: string) => `https://graph.facebook.com/${versionGraph(v)}`;
const IG = (v?: string) => `https://graph.instagram.com/${versionGraph(v)}`;

interface ErrorMeta {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  error_data?: { details?: string };
}

function criolloMeta(err: ErrorMeta | undefined, status: number): string {
  const code = err?.code;
  const sub = err?.error_subcode;
  if (code === 190) return "El token de Meta no es válido o venció. Generá uno nuevo y volvé a conectar.";
  if (code === 100 && (sub === 33 || !sub)) return "Meta no reconoce ese ID. Revisá el ID del número, la página o la cuenta.";
  if (code === 10 || code === 200 || code === 230) return "El token no tiene los permisos necesarios para esta acción.";
  if (code === 131047) return "Pasaron más de 24 hs desde el último mensaje del cliente: WhatsApp sólo deja mandar una plantilla aprobada.";
  if (code === 131026) return "Ese número no está en WhatsApp o no puede recibir mensajes.";
  if (code === 131030) return "Ese número no está en la lista de destinatarios permitidos (la app de Meta sigue en modo desarrollo).";
  if (code === 132000 || code === 132001) return "La plantilla no existe o no está aprobada en ese idioma.";
  if (code === 132012) return "Los parámetros no coinciden con los que pide la plantilla.";
  if (code === 4 || code === 80007 || code === 130429) return "Meta está limitando la cantidad de mensajes: probá en unos minutos.";
  if (code === 368) return "Meta bloqueó temporalmente esta cuenta por una infracción de políticas.";
  const detalle = err?.error_data?.details || err?.message;
  if (detalle) return `Meta respondió: ${errorCriollo(detalle)}`;
  return `Meta respondió con un error (${status}).`;
}

async function llamar<T>(
  url: string,
  token: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method || "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    throw new Invalido(`No pude conectarme con Meta: ${errorCriollo(e)}`, "meta_red");
  }
  const json = (await res.json().catch(() => null)) as (T & { error?: ErrorMeta }) | null;
  if (!res.ok || (json && json.error)) {
    throw new Invalido(criolloMeta(json?.error, res.status), "meta_error");
  }
  if (!json) throw new Invalido("Meta respondió algo que no entiendo.", "meta_error");
  return json;
}

// ---------- validar credenciales ----------
export async function validarWhatsApp(token: string, phoneId: string) {
  if (esFake()) return { numero_visible: "+54 9 11 0000-0000", nombre_verificado: "Prueba", calidad: "GREEN" };
  if (!token || !phoneId) throw new Invalido("Faltan el token o el ID del número de WhatsApp.", "faltan_credenciales");
  const r = await llamar<{ display_phone_number?: string; verified_name?: string; quality_rating?: string }>(
    `${FB()}/${encodeURIComponent(phoneId)}?fields=display_phone_number,verified_name,quality_rating`,
    token
  );
  return { numero_visible: r.display_phone_number || "", nombre_verificado: r.verified_name || "", calidad: r.quality_rating || "" };
}

export async function validarPagina(token: string, pageId: string) {
  if (esFake()) return { nombre_pagina: "Página de prueba", ig_id: "17841400000000000", usuario_ig: "prueba" };
  if (!token || !pageId) throw new Invalido("Faltan el token o el ID de la página.", "faltan_credenciales");
  const r = await llamar<{ name?: string; instagram_business_account?: { id?: string; username?: string } }>(
    `${FB()}/${encodeURIComponent(pageId)}?fields=name,instagram_business_account{id,username}`,
    token
  );
  return {
    nombre_pagina: r.name || "",
    ig_id: r.instagram_business_account?.id,
    usuario_ig: r.instagram_business_account?.username,
  };
}

// Flujo «Instagram API con inicio de sesión de Instagram» (sin página de Facebook).
export async function validarInstagramLogin(token: string) {
  if (esFake()) return { ig_id: "17841400000000000", usuario_ig: "prueba" };
  if (!token) throw new Invalido("Falta el token de Instagram.", "faltan_credenciales");
  const r = await llamar<{ id?: string; username?: string }>(`${IG()}/me?fields=id,username`, token);
  if (!r.id) throw new Invalido("Instagram no devolvió el ID de la cuenta.", "meta_error");
  return { ig_id: r.id, usuario_ig: r.username || "" };
}

// ---------- WhatsApp ----------
interface RespuestaEnvio {
  messages?: { id?: string }[];
}

function idDeEnvio(r: RespuestaEnvio, prefijo: string): { externo_id: string } {
  const id = r.messages?.[0]?.id;
  return { externo_id: id || `${prefijo}.${uid("sin_id")}` };
}

export async function enviarTextoWa(token: string, phoneId: string, to: string, texto: string, opciones: { cita_externo_id?: string } = {}) {
  if (esFake()) return { externo_id: "wamid.fake." + uid() };
  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: texto, preview_url: false },
  };
  if (opciones.cita_externo_id) body.context = { message_id: opciones.cita_externo_id };
  const r = await llamar<RespuestaEnvio>(`${FB()}/${encodeURIComponent(phoneId)}/messages`, token, { method: "POST", body });
  return idDeEnvio(r, "wamid");
}

export async function enviarPlantillaWa(token: string, phoneId: string, to: string, nombre: string, idioma: string, parametros: string[]) {
  if (esFake()) return { externo_id: "wamid.fake." + uid() };
  const components = parametros.length
    ? [{ type: "body", parameters: parametros.map((p) => ({ type: "text", text: p })) }]
    : [];
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: { name: nombre, language: { code: idioma || "es_AR" }, components },
  };
  const r = await llamar<RespuestaEnvio>(`${FB()}/${encodeURIComponent(phoneId)}/messages`, token, { method: "POST", body });
  return idDeEnvio(r, "wamid");
}

export async function enviarMediaWa(
  token: string,
  phoneId: string,
  to: string,
  tipo: "image" | "audio" | "video" | "document",
  link: string,
  opciones: { caption?: string; filename?: string } = {}
) {
  if (esFake()) return { externo_id: "wamid.fake." + uid() };
  const media: Record<string, unknown> = { link };
  if (opciones.caption && tipo !== "audio") media.caption = opciones.caption;
  if (opciones.filename && tipo === "document") media.filename = opciones.filename;
  const body = { messaging_product: "whatsapp", to, type: tipo, [tipo]: media };
  const r = await llamar<RespuestaEnvio>(`${FB()}/${encodeURIComponent(phoneId)}/messages`, token, { method: "POST", body });
  return idDeEnvio(r, "wamid");
}

// Marca como leído en el celular del cliente (los dos tildes azules). Best effort.
export async function marcarLeidoWa(token: string, phoneId: string, externoId: string): Promise<void> {
  if (esFake() || !externoId) return;
  try {
    await llamar(`${FB()}/${encodeURIComponent(phoneId)}/messages`, token, {
      method: "POST",
      body: { messaging_product: "whatsapp", status: "read", message_id: externoId },
    });
  } catch {
    // si falla, no pasa nada
  }
}

// 1×1 PNG transparente, para el modo fake.
const PNG_FAKE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

export async function bajarMediaWa(token: string, mediaId: string): Promise<{ bytes: Uint8Array; mime: string }> {
  if (esFake()) return { bytes: new Uint8Array(PNG_FAKE), mime: "image/png" };
  const info = await llamar<{ url?: string; mime_type?: string; file_size?: number }>(`${FB()}/${encodeURIComponent(mediaId)}`, token);
  if (!info.url) throw new Invalido("Meta no devolvió la URL del archivo.", "meta_media");
  if ((info.file_size || 0) > TOPE_MEDIA) throw new Invalido("El archivo pesa más de 25 MB: no lo bajamos.", "media_grande");
  let res: Response;
  try {
    res = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) });
  } catch (e) {
    throw new Invalido(`No pude bajar el archivo de Meta: ${errorCriollo(e)}`, "meta_media");
  }
  if (!res.ok) throw new Invalido(`Meta no me dejó bajar el archivo (${res.status}).`, "meta_media");
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > TOPE_MEDIA) throw new Invalido("El archivo pesa más de 25 MB: no lo bajamos.", "media_grande");
  return { bytes: buf, mime: info.mime_type || res.headers.get("content-type") || "application/octet-stream" };
}

// ---------- Instagram y Messenger ----------
function mensajeIgFb(texto: string, media_url?: string): Record<string, unknown> {
  if (media_url) {
    const tipo = /\.(mp4|mov|webm)(\?|$)/i.test(media_url) ? "video" : /\.(mp3|ogg|m4a|wav|aac)(\?|$)/i.test(media_url) ? "audio" : /\.(png|jpe?g|gif|webp)(\?|$)/i.test(media_url) ? "image" : "file";
    return { attachment: { type: tipo, payload: { url: media_url, is_reusable: true } } };
  }
  return { text: texto };
}

interface RespuestaIg {
  message_id?: string;
  recipient_id?: string;
}

export async function enviarIg(input: {
  token: string;
  ig_id?: string;
  page_id?: string;
  psid: string;
  texto: string;
  media_url?: string;
}): Promise<{ externo_id: string; flujo: "instagram" | "facebook" }> {
  if (esFake()) return { externo_id: "mid.fake." + uid(), flujo: input.ig_id ? "instagram" : "facebook" };
  if (input.ig_id) {
    const r = await llamar<RespuestaIg>(`${IG()}/${encodeURIComponent(input.ig_id)}/messages`, input.token, {
      method: "POST",
      body: { recipient: { id: input.psid }, message: mensajeIgFb(input.texto, input.media_url) },
    });
    return { externo_id: r.message_id || "mid." + uid("sin_id"), flujo: "instagram" };
  }
  if (!input.page_id) throw new Invalido("El canal de Instagram no tiene ni cuenta ni página atada.", "canal_incompleto");
  const r = await llamar<RespuestaIg>(`${FB()}/${encodeURIComponent(input.page_id)}/messages`, input.token, {
    method: "POST",
    body: { recipient: { id: input.psid }, message: mensajeIgFb(input.texto, input.media_url), messaging_type: "RESPONSE" },
  });
  return { externo_id: r.message_id || "mid." + uid("sin_id"), flujo: "facebook" };
}

export async function enviarMessenger(input: { token: string; page_id: string; psid: string; texto: string; media_url?: string }) {
  if (esFake()) return { externo_id: "mid.fake." + uid() };
  const r = await llamar<RespuestaIg>(`${FB()}/${encodeURIComponent(input.page_id)}/messages`, input.token, {
    method: "POST",
    body: { recipient: { id: input.psid }, message: mensajeIgFb(input.texto, input.media_url), messaging_type: "RESPONSE" },
  });
  return { externo_id: r.message_id || "mid." + uid("sin_id") };
}

// ---------- plantillas del WABA ----------
interface PlantillaMeta {
  name?: string;
  status?: string;
  category?: string;
  language?: string;
  components?: { type?: string; text?: string; example?: { body_text?: string[][] } }[];
}

function estadoPlantilla(s: string | undefined): Plantilla["estado"] {
  const e = (s || "").toUpperCase();
  if (e === "APPROVED") return "aprobada";
  if (e === "PENDING" || e === "IN_APPEAL") return "pendiente";
  return "rechazada";
}

export function contarVariables(cuerpo: string): number {
  const vistas = new Set<string>();
  for (const m of (cuerpo || "").matchAll(/\{\{(\d+)\}\}/g)) vistas.add(m[1]);
  return vistas.size;
}

export async function plantillasWaba(token: string, wabaId: string): Promise<Plantilla[]> {
  const ahora = new Date().toISOString();
  if (esFake()) {
    return [
      { id: uid("pl"), empresa_id: "", canal_id: null, nombre: "seguimiento_pedido", idioma: "es_AR", categoria: "UTILITY", estado: "aprobada", cuerpo: "Hola {{1}}, tu pedido {{2}} ya salió. Seguimiento: {{3}}", variables: 3, ejemplo: ["Juan", "#1234", "AR123"], actualizado: ahora },
      { id: uid("pl"), empresa_id: "", canal_id: null, nombre: "recordatorio_pago", idioma: "es_AR", categoria: "MARKETING", estado: "pendiente", cuerpo: "Hola {{1}}, te recordamos que tu pedido {{2}} está pendiente de pago.", variables: 2, actualizado: ahora },
    ];
  }
  if (!wabaId) throw new Invalido("El canal no tiene cargado el ID de la cuenta de WhatsApp Business (WABA).", "sin_waba");
  const r = await llamar<{ data?: PlantillaMeta[] }>(
    `${FB()}/${encodeURIComponent(wabaId)}/message_templates?fields=name,status,category,language,components&limit=100`,
    token
  );
  return (r.data || [])
    .filter((p) => p.name)
    .map((p) => {
      const body = (p.components || []).find((c) => (c.type || "").toUpperCase() === "BODY");
      const cuerpo = body?.text || "";
      return {
        id: uid("pl"),
        empresa_id: "",
        canal_id: null,
        nombre: p.name || "",
        idioma: p.language || "es_AR",
        categoria: p.category,
        estado: estadoPlantilla(p.status),
        cuerpo,
        variables: contarVariables(cuerpo),
        ejemplo: body?.example?.body_text?.[0],
        actualizado: ahora,
      };
    });
}

// ---------- firma del webhook ----------
export function firmaValida(raw: string, header: string | null, appSecret: string): boolean {
  if (!header || !appSecret) return false;
  const esperado = "sha256=" + createHmac("sha256", appSecret).update(raw, "utf8").digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(header.trim());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---------- parseo del webhook ----------
type Obj = Record<string, unknown>;
const esObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const s = (v: unknown): string => (v === undefined || v === null ? "" : String(v));
const lista = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(esObj) : []);

function fechaDeSegundos(ts: unknown): string {
  const n = Number(ts);
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000).toISOString() : new Date().toISOString();
}
function fechaDeMs(ts: unknown): string {
  const n = Number(ts);
  return Number.isFinite(n) && n > 0 ? new Date(n).toISOString() : new Date().toISOString();
}

const ESTADOS_WA: Record<string, MensajeEstado> = { sent: "enviado", delivered: "entregado", read: "leido", failed: "fallido" };

function entranteWa(m: Obj, canalExternoId: string, nombres: Map<string, string>, eco: boolean): Entrante | null {
  const tipoMeta = s(m.type);
  const quien = eco ? s(m.to) : s(m.from);
  if (!quien) return null;
  const base: Entrante = {
    canal_tipo: "whatsapp",
    canal_externo_id: canalExternoId,
    identificador: quien,
    nombre: nombres.get(quien),
    externo_id: s(m.id) || undefined,
    tipo: "otro",
    texto: "",
    fecha: fechaDeSegundos(m.timestamp),
    eco,
  };
  const contexto = esObj(m.context) ? s(m.context.id) : "";
  if (contexto) base.cita_externo_id = contexto;
  const media = (clave: string, tipo: MensajeTipo) => {
    const d = esObj(m[clave]) ? (m[clave] as Obj) : {};
    base.tipo = tipo;
    base.media_id = s(d.id) || undefined;
    base.media_mime = s(d.mime_type) || undefined;
    base.media_nombre = s(d.filename) || undefined;
    base.texto = s(d.caption);
  };
  switch (tipoMeta) {
    case "text":
      base.tipo = "texto";
      base.texto = esObj(m.text) ? s(m.text.body) : "";
      break;
    case "image": media("image", "imagen"); break;
    case "audio": media("audio", "audio"); break;
    case "video": media("video", "video"); break;
    case "document": media("document", "documento"); break;
    case "sticker": media("sticker", "sticker"); break;
    case "location": {
      const l = esObj(m.location) ? m.location : {};
      base.tipo = "ubicacion";
      const nombre = s(l.name) || s(l.address);
      base.texto = `📍 ${s(l.latitude)}, ${s(l.longitude)}${nombre ? ` · ${nombre}` : ""}`;
      break;
    }
    case "reaction": {
      const r = esObj(m.reaction) ? m.reaction : {};
      base.tipo = "reaccion";
      base.texto = s(r.emoji);
      base.cita_externo_id = s(r.message_id) || base.cita_externo_id;
      break;
    }
    case "interactive": {
      const i = esObj(m.interactive) ? m.interactive : {};
      const br = esObj(i.button_reply) ? i.button_reply : null;
      const lr = esObj(i.list_reply) ? i.list_reply : null;
      base.tipo = "texto";
      base.texto = s(br?.title) || s(lr?.title);
      break;
    }
    case "button": {
      base.tipo = "texto";
      base.texto = esObj(m.button) ? s(m.button.text) : "";
      break;
    }
    default:
      base.tipo = "otro";
      base.texto = esObj(m.text) ? s(m.text.body) : "";
  }
  return base;
}

function entranteMensajeria(m: Obj, canalTipo: CanalTipo): { entrante?: Entrante; estados: EstadoEntrante[] } {
  const estados: EstadoEntrante[] = [];
  const sender = esObj(m.sender) ? s(m.sender.id) : "";
  const recipient = esObj(m.recipient) ? s(m.recipient.id) : "";
  const fecha = fechaDeMs(m.timestamp);
  if (esObj(m.delivery)) {
    for (const mid of Array.isArray(m.delivery.mids) ? m.delivery.mids : []) {
      if (s(mid)) estados.push({ externo_id: s(mid), estado: "entregado", fecha });
    }
    return { estados };
  }
  if (esObj(m.read)) {
    estados.push({ externo_id: `watermark:${sender}`, estado: "leido", fecha: fechaDeMs(m.read.watermark) });
    return { estados };
  }
  if (!esObj(m.message)) return { estados };
  const msg = m.message;
  const eco = msg.is_echo === true;
  // En un eco, el que escribe es la página/cuenta y el interlocutor es el destinatario.
  const identificador = eco ? recipient : sender;
  const canalExternoId = eco ? sender : recipient;
  if (!identificador) return { estados };
  const e: Entrante = {
    canal_tipo: canalTipo,
    canal_externo_id: canalExternoId,
    identificador,
    externo_id: s(msg.mid) || undefined,
    tipo: "texto",
    texto: s(msg.text),
    fecha,
    eco,
  };
  if (esObj(msg.reply_to) && s(msg.reply_to.mid)) e.cita_externo_id = s(msg.reply_to.mid);
  const adjuntos = lista(msg.attachments);
  if (adjuntos.length) {
    const a = adjuntos[0];
    const t = s(a.type);
    const url = esObj(a.payload) ? s(a.payload.url) : "";
    e.tipo = t === "image" ? "imagen" : t === "audio" ? "audio" : t === "video" ? "video" : t === "file" ? "documento" : "otro";
    if (url) {
      e.media_url = url;
      e.media_id = url;
    }
    if (!e.texto && t === "share") e.texto = "Compartió una publicación";
    if (!e.texto && t === "story_mention") e.texto = "Te mencionó en una historia";
    if (!e.texto && t === "ig_reel") e.texto = "Compartió un reel";
  } else if (!e.texto) {
    e.tipo = "otro";
  }
  return { entrante: e, estados };
}

export function parsearWebhook(body: unknown): WebhookParseado {
  const out: WebhookParseado = { entrantes: [], estados: [], objeto: "" };
  if (!esObj(body)) return out;
  out.objeto = s(body.object);
  const entries = lista(body.entry);

  if (out.objeto === "whatsapp_business_account") {
    for (const entry of entries) {
      for (const change of lista(entry.changes)) {
        const field = s(change.field);
        const value = esObj(change.value) ? change.value : {};
        const canalExternoId = esObj(value.metadata) ? s(value.metadata.phone_number_id) : "";
        const nombres = new Map<string, string>();
        for (const c of lista(value.contacts)) {
          const nombre = esObj(c.profile) ? s(c.profile.name) : "";
          if (s(c.wa_id) && nombre) nombres.set(s(c.wa_id), nombre);
        }
        if (field === "messages" || field === "smb_message_echoes") {
          for (const m of lista(value.messages)) {
            const e = entranteWa(m, canalExternoId, nombres, field === "smb_message_echoes");
            if (e) out.entrantes.push(e);
          }
          for (const m of lista(value.message_echoes)) {
            const e = entranteWa(m, canalExternoId, nombres, true);
            if (e) out.entrantes.push(e);
          }
          for (const st of lista(value.statuses)) {
            const estado = ESTADOS_WA[s(st.status)];
            if (!s(st.id) || !estado) continue;
            const err = lista(st.errors)[0];
            const errorTexto = err ? [s(err.title), s(err.message), esObj(err.error_data) ? s(err.error_data.details) : ""].filter(Boolean).join(" · ") : "";
            out.estados.push({
              externo_id: s(st.id),
              estado,
              error: errorTexto ? errorCriollo(errorTexto) : undefined,
              fecha: fechaDeSegundos(st.timestamp),
            });
          }
        }
      }
    }
    return out;
  }

  if (out.objeto === "instagram" || out.objeto === "page") {
    const canalTipo: CanalTipo = out.objeto === "instagram" ? "instagram" : "messenger";
    for (const entry of entries) {
      const eventos = [...lista(entry.messaging), ...lista(entry.standby)];
      for (const m of eventos) {
        const r = entranteMensajeria(m, canalTipo);
        if (r.entrante) out.entrantes.push(r.entrante);
        out.estados.push(...r.estados);
      }
    }
  }
  return out;
}
