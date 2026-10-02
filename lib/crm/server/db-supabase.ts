// ============================================================
// Clientany · CRM — base en Supabase (SOLO servidor).
// Postgres con la SERVICE ROLE KEY (saltea RLS) sobre las tablas `crm_*`
// de supabase/crm_schema.sql, y el bucket `crm-media` para archivos.
// Toda consulta filtra por `empresa_id` cuando aplica; las que buscan por
// id devuelven la fila y el servicio chequea la empresa.
// ============================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Actividad,
  ApiKey,
  Bot,
  Canal,
  CanalCredenciales,
  CanalTipo,
  Contacto,
  Conversacion,
  Empresa,
  Invitacion,
  MensajeEquipo,
  Mensaje,
  Miembro,
  Pedido,
  Plantilla,
  Producto,
  Rapida,
} from "../types";
import type { CrmDb, UsuarioAuth } from "./db";
import type { CrmDbCompleta, RegistroWebhook } from "./db-extra";
import { BOT_DEFAULT } from "../bot";
import { colaTelefono, uid } from "../core";
import { cifrar, descifrar } from "./crypto";
import { empresaNueva, miembroNuevo } from "./defaults";

const BUCKET = "crm-media";
const PAGINA = 1000;

// ---------- helpers de mapeo ----------
type Fila = Record<string, unknown>;

function iso(v: unknown): string {
  if (!v) return "";
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? String(v) : d.toISOString();
}
function isoOpt(v: unknown): string | undefined {
  return v ? iso(v) : undefined;
}
function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}
function strOpt(v: unknown): string | undefined {
  return v === null || v === undefined || v === "" ? undefined : String(v);
}
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function numOpt(v: unknown): number | undefined {
  return v === null || v === undefined ? undefined : num(v);
}
function json<T>(v: unknown, def: T): T {
  if (v === null || v === undefined) return def;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return def;
    }
  }
  return v as T;
}
function oNull<T>(v: T | undefined): T | null {
  return v === undefined ? null : v;
}

function fallo(que: string, error: { message: string } | null): never {
  throw new Error(`Base de datos (${que}): ${error?.message || "error desconocido"}`);
}

// ---------- filas → tipos ----------
function aEmpresa(f: Fila): Empresa {
  return {
    id: str(f.id),
    nombre: str(f.nombre),
    rubro: strOpt(f.rubro),
    pais: str(f.pais) || "Argentina",
    moneda: str(f.moneda) || "ARS",
    plan: (str(f.plan) || "prueba") as Empresa["plan"],
    prueba_hasta: isoOpt(f.prueba_hasta),
    creado: iso(f.creado),
    webhook_verify_token: str(f.webhook_verify_token),
    webhook_salida_url: strOpt(f.webhook_salida_url),
    ia: json(f.ia, { proveedor: "plataforma", clave_cargada: false }),
    horario: json(f.horario, empresaNueva("x", "x").horario),
    etapas: json(f.etapas, []),
    etiquetas: json(f.etiquetas, []),
    firma: strOpt(f.firma),
  };
}
function deEmpresa(e: Partial<Empresa>): Fila {
  const f: Fila = {};
  if (e.nombre !== undefined) f.nombre = e.nombre;
  if (e.rubro !== undefined) f.rubro = oNull(e.rubro);
  if (e.pais !== undefined) f.pais = e.pais;
  if (e.moneda !== undefined) f.moneda = e.moneda;
  if (e.plan !== undefined) f.plan = e.plan;
  if (e.prueba_hasta !== undefined) f.prueba_hasta = oNull(e.prueba_hasta);
  if (e.webhook_verify_token !== undefined) f.webhook_verify_token = e.webhook_verify_token;
  if (e.webhook_salida_url !== undefined) f.webhook_salida_url = oNull(e.webhook_salida_url);
  if (e.ia !== undefined) f.ia = e.ia;
  if (e.horario !== undefined) f.horario = e.horario;
  if (e.etapas !== undefined) f.etapas = e.etapas;
  if (e.etiquetas !== undefined) f.etiquetas = e.etiquetas;
  if (e.firma !== undefined) f.firma = oNull(e.firma);
  return f;
}

function aMiembro(f: Fila): Miembro {
  return {
    id: str(f.id),
    empresa_id: str(f.empresa_id),
    nombre: str(f.nombre),
    email: str(f.email),
    rol: (str(f.rol) || "agente") as Miembro["rol"],
    avatar: strOpt(f.avatar),
    ultimo_visto: isoOpt(f.ultimo_visto),
    creado: iso(f.creado),
  };
}
function deMiembro(m: Partial<Miembro>): Fila {
  const f: Fila = {};
  if (m.id !== undefined) f.id = m.id;
  if (m.empresa_id !== undefined) f.empresa_id = m.empresa_id;
  if (m.nombre !== undefined) f.nombre = m.nombre;
  if (m.email !== undefined) f.email = m.email;
  if (m.rol !== undefined) f.rol = m.rol;
  if (m.avatar !== undefined) f.avatar = oNull(m.avatar);
  if (m.ultimo_visto !== undefined) f.ultimo_visto = oNull(m.ultimo_visto);
  if (m.creado !== undefined) f.creado = m.creado;
  return f;
}

function aInvitacion(f: Fila): Invitacion {
  return { id: str(f.id), empresa_id: str(f.empresa_id), email: str(f.email), rol: (str(f.rol) || "agente") as Invitacion["rol"], creado: iso(f.creado), por: str(f.por) };
}

function aCanal(f: Fila): Canal {
  return {
    id: str(f.id),
    empresa_id: str(f.empresa_id),
    tipo: str(f.tipo) as CanalTipo,
    nombre: str(f.nombre),
    marca_id: strOpt(f.marca_id),
    estado: (str(f.estado) || "pendiente") as Canal["estado"],
    externo_id: str(f.externo_id),
    waba_id: strOpt(f.waba_id),
    page_id: strOpt(f.page_id),
    token_cargado: !!f.token_cifrado,
    app_secret_cargado: !!f.app_secret_cifrado,
    ultimo_error: strOpt(f.ultimo_error),
    conectado_en: isoOpt(f.conectado_en),
    detalle: json(f.detalle, {}),
    api_version: strOpt(f.api_version),
  };
}
function deCanal(c: Canal): Fila {
  return {
    id: c.id,
    empresa_id: c.empresa_id,
    tipo: c.tipo,
    nombre: c.nombre,
    marca_id: oNull(c.marca_id),
    estado: c.estado,
    externo_id: c.externo_id,
    waba_id: oNull(c.waba_id),
    page_id: oNull(c.page_id),
    ultimo_error: oNull(c.ultimo_error),
    conectado_en: oNull(c.conectado_en),
    detalle: c.detalle || {},
    api_version: oNull(c.api_version),
  };
}

function aContacto(f: Fila): Contacto {
  return {
    id: str(f.id),
    empresa_id: str(f.empresa_id),
    nombre: str(f.nombre),
    telefono: strOpt(f.telefono),
    email: strOpt(f.email),
    documento: strOpt(f.documento),
    ig_usuario: strOpt(f.ig_usuario),
    ig_id: strOpt(f.ig_id),
    psid: strOpt(f.psid),
    direccion: strOpt(f.direccion),
    localidad: strOpt(f.localidad),
    provincia: strOpt(f.provincia),
    cp: strOpt(f.cp),
    notas: strOpt(f.notas),
    etiquetas: json(f.etiquetas, []),
    origen: (str(f.origen) || "manual") as Contacto["origen"],
    marca_id: strOpt(f.marca_id),
    creado: iso(f.creado),
    actualizado: iso(f.actualizado),
  };
}
function deContacto(c: Contacto): Fila {
  return {
    id: c.id,
    empresa_id: c.empresa_id,
    nombre: c.nombre,
    telefono: oNull(c.telefono),
    telefono_cola: c.telefono ? colaTelefono(c.telefono) : null,
    email: oNull(c.email),
    documento: oNull(c.documento),
    ig_usuario: oNull(c.ig_usuario),
    ig_id: oNull(c.ig_id),
    psid: oNull(c.psid),
    direccion: oNull(c.direccion),
    localidad: oNull(c.localidad),
    provincia: oNull(c.provincia),
    cp: oNull(c.cp),
    notas: oNull(c.notas),
    etiquetas: c.etiquetas || [],
    origen: c.origen,
    marca_id: oNull(c.marca_id),
    creado: c.creado,
    actualizado: c.actualizado,
  };
}

function aConversacion(f: Fila): Conversacion {
  return {
    id: str(f.id),
    empresa_id: str(f.empresa_id),
    canal_id: str(f.canal_id),
    canal: str(f.canal) as CanalTipo,
    contacto_id: str(f.contacto_id),
    identificador: str(f.identificador),
    nombre: str(f.nombre),
    marca_id: strOpt(f.marca_id),
    ultimo_texto: str(f.ultimo_texto),
    ultimo_en: iso(f.ultimo_en),
    ultimo_de: (str(f.ultimo_de) || "cliente") as Conversacion["ultimo_de"],
    ultimo_entrante_en: isoOpt(f.ultimo_entrante_en),
    ultimo_saliente_humano_en: isoOpt(f.ultimo_saliente_humano_en),
    no_leidos: num(f.no_leidos),
    grupo: (strOpt(f.grupo) as Conversacion["grupo"]) ?? null,
    etapa_id: strOpt(f.etapa_id) ?? null,
    etiquetas: json(f.etiquetas, []),
    nota: strOpt(f.nota),
    asignado_a: strOpt(f.asignado_a) ?? null,
    tomado_por: json<Conversacion["tomado_por"]>(f.tomado_por, null),
    urgente: !!f.urgente,
    recordar: json<Conversacion["recordar"]>(f.recordar, null),
    baja: !!f.baja,
    fuera_horario: !!f.fuera_horario,
    necesita_humano: !!f.necesita_humano,
    visto_in: strOpt(f.visto_in) ? iso(f.visto_in) : null,
    pedido_id: strOpt(f.pedido_id) ?? null,
    bot_estado: json<Conversacion["bot_estado"]>(f.bot_estado, null),
    creado: iso(f.creado),
    actualizado: iso(f.actualizado),
  };
}
function deConversacion(c: Conversacion): Fila {
  return {
    id: c.id,
    empresa_id: c.empresa_id,
    canal_id: c.canal_id,
    canal: c.canal,
    contacto_id: c.contacto_id,
    identificador: c.identificador,
    nombre: c.nombre,
    marca_id: oNull(c.marca_id),
    ultimo_texto: c.ultimo_texto || "",
    ultimo_en: c.ultimo_en,
    ultimo_de: c.ultimo_de,
    ultimo_entrante_en: oNull(c.ultimo_entrante_en),
    ultimo_saliente_humano_en: oNull(c.ultimo_saliente_humano_en),
    no_leidos: c.no_leidos || 0,
    grupo: c.grupo ?? null,
    etapa_id: c.etapa_id ?? null,
    etiquetas: c.etiquetas || [],
    nota: oNull(c.nota),
    asignado_a: c.asignado_a ?? null,
    tomado_por: c.tomado_por ?? null,
    urgente: !!c.urgente,
    recordar: c.recordar ?? null,
    baja: !!c.baja,
    fuera_horario: !!c.fuera_horario,
    necesita_humano: !!c.necesita_humano,
    visto_in: c.visto_in ?? null,
    pedido_id: c.pedido_id ?? null,
    bot_estado: c.bot_estado ?? null,
    creado: c.creado,
    actualizado: c.actualizado,
  };
}

function aMensaje(f: Fila): Mensaje {
  return {
    id: str(f.id),
    empresa_id: str(f.empresa_id),
    conversacion_id: str(f.conversacion_id),
    direccion: str(f.direccion) as Mensaje["direccion"],
    de: str(f.de) as Mensaje["de"],
    autor: strOpt(f.autor),
    tipo: (str(f.tipo) || "texto") as Mensaje["tipo"],
    texto: str(f.texto),
    media_url: strOpt(f.media_url),
    media_nombre: strOpt(f.media_nombre),
    media_mime: strOpt(f.media_mime),
    externo_id: strOpt(f.externo_id),
    estado: strOpt(f.estado) as Mensaje["estado"],
    error: strOpt(f.error),
    cita_id: strOpt(f.cita_id),
    plantilla: strOpt(f.plantilla),
    creado: iso(f.creado),
  };
}
function deMensaje(m: Mensaje): Fila {
  return {
    id: m.id,
    empresa_id: m.empresa_id,
    conversacion_id: m.conversacion_id,
    direccion: m.direccion,
    de: m.de,
    autor: oNull(m.autor),
    tipo: m.tipo,
    texto: m.texto || "",
    media_url: oNull(m.media_url),
    media_nombre: oNull(m.media_nombre),
    media_mime: oNull(m.media_mime),
    externo_id: oNull(m.externo_id),
    estado: oNull(m.estado),
    error: oNull(m.error),
    cita_id: oNull(m.cita_id),
    plantilla: oNull(m.plantilla),
    creado: m.creado,
  };
}

function aPedido(f: Fila): Pedido {
  return {
    id: str(f.id),
    empresa_id: str(f.empresa_id),
    numero: str(f.numero),
    contacto_id: strOpt(f.contacto_id) ?? null,
    nombre: str(f.nombre),
    telefono: strOpt(f.telefono),
    email: strOpt(f.email),
    estado: (str(f.estado) || "pagado") as Pedido["estado"],
    items: json(f.items, []),
    total: num(f.total),
    moneda: str(f.moneda) || "ARS",
    envio: json<Pedido["envio"]>(f.envio, undefined) ?? undefined,
    canal: strOpt(f.canal),
    notas: strOpt(f.notas),
    marca_id: strOpt(f.marca_id),
    creado: iso(f.creado),
    actualizado: iso(f.actualizado),
  };
}
function dePedido(p: Pedido): Fila {
  return {
    id: p.id,
    empresa_id: p.empresa_id,
    numero: p.numero,
    contacto_id: p.contacto_id ?? null,
    nombre: p.nombre,
    telefono: oNull(p.telefono),
    telefono_cola: p.telefono ? colaTelefono(p.telefono) : null,
    email: oNull(p.email),
    estado: p.estado,
    items: p.items || [],
    total: p.total || 0,
    moneda: p.moneda || "ARS",
    envio: p.envio ?? null,
    canal: oNull(p.canal),
    notas: oNull(p.notas),
    marca_id: oNull(p.marca_id),
    creado: p.creado,
    actualizado: p.actualizado,
  };
}

function aProducto(f: Fila): Producto {
  return {
    id: str(f.id),
    empresa_id: str(f.empresa_id),
    sku: str(f.sku),
    nombre: str(f.nombre),
    precio: num(f.precio),
    moneda: str(f.moneda) || "ARS",
    stock: num(f.stock),
    stock_minimo: numOpt(f.stock_minimo),
    categoria: strOpt(f.categoria),
    descripcion: strOpt(f.descripcion),
    imagen_url: strOpt(f.imagen_url),
    activo: f.activo !== false,
    marca_id: strOpt(f.marca_id),
    actualizado: iso(f.actualizado),
  };
}
function deProducto(p: Producto): Fila {
  return {
    id: p.id,
    empresa_id: p.empresa_id,
    sku: p.sku,
    nombre: p.nombre,
    precio: p.precio || 0,
    moneda: p.moneda || "ARS",
    stock: p.stock || 0,
    stock_minimo: oNull(p.stock_minimo),
    categoria: oNull(p.categoria),
    descripcion: oNull(p.descripcion),
    imagen_url: oNull(p.imagen_url),
    activo: p.activo !== false,
    marca_id: oNull(p.marca_id),
    actualizado: p.actualizado,
  };
}

function aPlantilla(f: Fila): Plantilla {
  return {
    id: str(f.id),
    empresa_id: str(f.empresa_id),
    canal_id: strOpt(f.canal_id) ?? null,
    nombre: str(f.nombre),
    idioma: str(f.idioma) || "es_AR",
    categoria: strOpt(f.categoria),
    estado: (str(f.estado) || "local") as Plantilla["estado"],
    cuerpo: str(f.cuerpo),
    variables: num(f.variables),
    ejemplo: json<string[] | undefined>(f.ejemplo, undefined) ?? undefined,
    actualizado: iso(f.actualizado),
  };
}
function dePlantilla(p: Plantilla): Fila {
  return {
    id: p.id,
    empresa_id: p.empresa_id,
    canal_id: p.canal_id ?? null,
    nombre: p.nombre,
    idioma: p.idioma || "es_AR",
    categoria: oNull(p.categoria),
    estado: p.estado,
    cuerpo: p.cuerpo || "",
    variables: p.variables || 0,
    ejemplo: p.ejemplo ?? null,
    actualizado: p.actualizado,
  };
}

function aRapida(f: Fila): Rapida {
  return { id: str(f.id), empresa_id: str(f.empresa_id), atajo: str(f.atajo), texto: str(f.texto), de: strOpt(f.de) ?? null };
}

function aEquipo(f: Fila): MensajeEquipo {
  return {
    id: str(f.id),
    empresa_id: str(f.empresa_id),
    de: str(f.de),
    nombre: str(f.nombre),
    texto: str(f.texto),
    creado: iso(f.creado),
    ref: json<MensajeEquipo["ref"]>(f.ref, null),
    estado: (strOpt(f.estado) as MensajeEquipo["estado"]) ?? null,
    hecho_por: strOpt(f.hecho_por) ?? null,
  };
}

function aApiKey(f: Fila): ApiKey & { hash?: string } {
  return {
    id: str(f.id),
    empresa_id: str(f.empresa_id),
    nombre: str(f.nombre),
    prefijo: str(f.prefijo),
    creado: iso(f.creado),
    ultimo_uso: strOpt(f.ultimo_uso) ? iso(f.ultimo_uso) : null,
    hash: strOpt(f.hash),
  };
}

function aActividad(f: Fila): Actividad {
  return { id: str(f.id), empresa_id: str(f.empresa_id), quien: str(f.quien), que: str(f.que), ref: json<Actividad["ref"]>(f.ref, null), creado: iso(f.creado) };
}

// Una consulta paginable (lo que devuelve `.from().select()...` antes del await).
interface Paginable {
  range(desde: number, hasta: number): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

export class DbSupabase implements CrmDbCompleta {
  private sb: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  // Trae todas las filas de a páginas de 1000 (el tope de Supabase por consulta).
  private async todas(que: string, armar: () => Paginable, tope = 50_000): Promise<Fila[]> {
    const out: Fila[] = [];
    for (let desde = 0; desde < tope; desde += PAGINA) {
      const { data, error } = await armar().range(desde, desde + PAGINA - 1);
      if (error) fallo(que, error);
      const filas = (data || []) as Fila[];
      out.push(...filas);
      if (filas.length < PAGINA) break;
    }
    return out;
  }

  private async una(que: string, q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<Fila | null> {
    const { data, error } = await q;
    if (error) fallo(que, error);
    const filas = Array.isArray(data) ? (data as Fila[]) : data ? [data as Fila] : [];
    return filas[0] || null;
  }

  private async ejecutar(que: string, q: PromiseLike<{ error: { message: string } | null }>): Promise<void> {
    const { error } = await q;
    if (error) fallo(que, error);
  }

  // ---------- empresas y miembros ----------
  async empresaDeUsuario(userId: string) {
    const m = await this.una("miembro", this.sb.from("crm_miembros").select("*").eq("id", userId).limit(1));
    if (!m) return null;
    const e = await this.una("empresa", this.sb.from("crm_empresas").select("*").eq("id", str(m.empresa_id)).limit(1));
    if (!e) return null;
    return { empresa: aEmpresa(e), miembro: aMiembro(m) };
  }

  async crearEmpresaParaUsuario(usuario: UsuarioAuth, nombreEmpresa: string) {
    const ya = await this.empresaDeUsuario(usuario.id);
    if (ya) return ya;
    const inv = await this.invitacionPorEmail(usuario.email);
    if (inv) {
      const e = await this.empresa(inv.empresa_id);
      if (e) {
        const miembro = miembroNuevo(usuario, e.id, inv.rol);
        await this.ejecutar("miembro", this.sb.from("crm_miembros").upsert(deMiembro(miembro), { onConflict: "id" }));
        await this.borrarInvitacion(inv.id);
        return { empresa: e, miembro };
      }
    }
    const empresa = empresaNueva(uid("emp"), nombreEmpresa);
    await this.ejecutar(
      "empresa",
      this.sb.from("crm_empresas").insert({ ...deEmpresa(empresa), id: empresa.id, creado: empresa.creado, bot: BOT_DEFAULT, ia_clave_cifrada: null })
    );
    const miembro = miembroNuevo(usuario, empresa.id, "admin");
    await this.ejecutar("miembro", this.sb.from("crm_miembros").upsert(deMiembro(miembro), { onConflict: "id" }));
    return { empresa, miembro };
  }

  async empresa(id: string) {
    const e = await this.una("empresa", this.sb.from("crm_empresas").select("*").eq("id", id).limit(1));
    return e ? aEmpresa(e) : null;
  }

  async actualizarEmpresa(id: string, patch: Partial<Empresa>) {
    const cols = deEmpresa(patch);
    if (Object.keys(cols).length) {
      await this.ejecutar("empresa", this.sb.from("crm_empresas").update(cols).eq("id", id));
    }
    const e = await this.empresa(id);
    if (!e) throw new Error("La empresa no existe");
    return e;
  }

  async claveIaCifrada(empresaId: string) {
    const f = await this.una("empresa", this.sb.from("crm_empresas").select("ia_clave_cifrada").eq("id", empresaId).limit(1));
    return f ? strOpt(f.ia_clave_cifrada) || null : null;
  }

  async guardarClaveIa(empresaId: string, cifrada: string | null) {
    await this.ejecutar("empresa", this.sb.from("crm_empresas").update({ ia_clave_cifrada: cifrada }).eq("id", empresaId));
  }

  async bot(empresaId: string) {
    const f = await this.una("bot", this.sb.from("crm_empresas").select("bot").eq("id", empresaId).limit(1));
    if (!f) return null;
    const b = json<Partial<Bot>>(f.bot, {});
    return Object.keys(b).length ? (b as Bot) : null;
  }

  async guardarBot(empresaId: string, bot: Bot) {
    await this.ejecutar("bot", this.sb.from("crm_empresas").update({ bot }).eq("id", empresaId));
    return bot;
  }

  async miembros(empresaId: string) {
    const filas = await this.todas("miembros", () => this.sb.from("crm_miembros").select("*").eq("empresa_id", empresaId).order("creado", { ascending: true }));
    return filas.map(aMiembro);
  }

  async miembro(id: string) {
    const f = await this.una("miembro", this.sb.from("crm_miembros").select("*").eq("id", id).limit(1));
    return f ? aMiembro(f) : null;
  }

  async actualizarMiembro(id: string, patch: Partial<Miembro>) {
    const { id: _i, empresa_id: _e, ...resto } = patch;
    void _i;
    void _e;
    const cols = deMiembro(resto);
    if (Object.keys(cols).length) await this.ejecutar("miembro", this.sb.from("crm_miembros").update(cols).eq("id", id));
    const m = await this.miembro(id);
    if (!m) throw new Error("El miembro no existe");
    return m;
  }

  async quitarMiembro(id: string) {
    await this.ejecutar("miembro", this.sb.from("crm_miembros").delete().eq("id", id));
  }

  async invitaciones(empresaId: string) {
    const filas = await this.todas("invitaciones", () => this.sb.from("crm_invitaciones").select("*").eq("empresa_id", empresaId).order("creado", { ascending: true }));
    return filas.map(aInvitacion);
  }

  async invitacionPorEmail(email: string) {
    const e = (email || "").trim().toLowerCase();
    if (!e) return null;
    const f = await this.una("invitación", this.sb.from("crm_invitaciones").select("*").ilike("email", e).limit(1));
    return f ? aInvitacion(f) : null;
  }

  async crearInvitacion(inv: Invitacion) {
    await this.ejecutar("invitación", this.sb.from("crm_invitaciones").upsert({ ...inv }, { onConflict: "id" }));
    return inv;
  }

  async borrarInvitacion(id: string) {
    await this.ejecutar("invitación", this.sb.from("crm_invitaciones").delete().eq("id", id));
  }

  // ---------- canales ----------
  async canales(empresaId: string) {
    const filas = await this.todas("canales", () => this.sb.from("crm_canales").select("*").eq("empresa_id", empresaId).order("creado", { ascending: true }));
    return filas.map(aCanal);
  }

  async canal(id: string) {
    const f = await this.una("canal", this.sb.from("crm_canales").select("*").eq("id", id).limit(1));
    return f ? aCanal(f) : null;
  }

  async canalPorExterno(tipo: CanalTipo, externoId: string, empresaId?: string) {
    let q = this.sb.from("crm_canales").select("*").eq("tipo", tipo).eq("externo_id", externoId);
    if (empresaId) q = q.eq("empresa_id", empresaId);
    const f = await this.una("canal", q.limit(1));
    return f ? aCanal(f) : null;
  }

  // `credenciales` undefined = no tocar las guardadas; null = borrarlas.
  async guardarCanal(canal: Canal, credenciales?: CanalCredenciales | null) {
    const fila = deCanal(canal);
    if (credenciales === null) {
      fila.token_cifrado = null;
      fila.app_secret_cifrado = null;
    } else if (credenciales) {
      fila.token_cifrado = credenciales.token ? cifrar(credenciales.token) : null;
      fila.app_secret_cifrado = credenciales.app_secret ? cifrar(credenciales.app_secret) : null;
    }
    await this.ejecutar("canal", this.sb.from("crm_canales").upsert(fila, { onConflict: "id" }));
    const guardado = await this.canal(canal.id);
    return guardado || canal;
  }

  async credencialesCanal(id: string) {
    const f = await this.una("canal", this.sb.from("crm_canales").select("token_cifrado, app_secret_cifrado").eq("id", id).limit(1));
    if (!f || !f.token_cifrado) return null;
    return {
      token: descifrar(str(f.token_cifrado)),
      app_secret: f.app_secret_cifrado ? descifrar(str(f.app_secret_cifrado)) : undefined,
    };
  }

  async borrarCanal(id: string) {
    await this.ejecutar("canal", this.sb.from("crm_canales").delete().eq("id", id));
  }

  // ---------- contactos ----------
  async contactos(empresaId: string) {
    const filas = await this.todas("contactos", () => this.sb.from("crm_contactos").select("*").eq("empresa_id", empresaId).order("actualizado", { ascending: false }));
    return filas.map(aContacto);
  }

  async contacto(id: string) {
    const f = await this.una("contacto", this.sb.from("crm_contactos").select("*").eq("id", id).limit(1));
    return f ? aContacto(f) : null;
  }

  async contactoPorIdentificador(empresaId: string, campo: "telefono" | "ig_id" | "psid" | "email", valor: string) {
    const v = (valor || "").trim();
    if (!v) return null;
    let q = this.sb.from("crm_contactos").select("*").eq("empresa_id", empresaId);
    if (campo === "telefono") {
      const cola = colaTelefono(v);
      if (cola.length < 8) return null;
      q = q.eq("telefono_cola", cola);
    } else if (campo === "email") q = q.ilike("email", v);
    else q = q.eq(campo, v);
    const f = await this.una("contacto", q.limit(1));
    return f ? aContacto(f) : null;
  }

  async guardarContacto(c: Contacto) {
    await this.ejecutar("contacto", this.sb.from("crm_contactos").upsert(deContacto(c), { onConflict: "id" }));
    return c;
  }

  async guardarContactos(lista: Contacto[]) {
    for (let i = 0; i < lista.length; i += 500) {
      await this.ejecutar("contactos", this.sb.from("crm_contactos").upsert(lista.slice(i, i + 500).map(deContacto), { onConflict: "id" }));
    }
  }

  async borrarContacto(id: string) {
    await this.ejecutar("contacto", this.sb.from("crm_contactos").delete().eq("id", id));
  }

  // ---------- conversaciones ----------
  async conversaciones(empresaId: string, opciones?: { desde?: string; limite?: number }) {
    let q = this.sb.from("crm_conversaciones").select("*").eq("empresa_id", empresaId);
    if (opciones?.desde) q = q.gt("actualizado", opciones.desde);
    const { data, error } = await q.order("actualizado", { ascending: false }).limit(opciones?.limite ?? 500);
    if (error) fallo("conversaciones", error);
    return ((data || []) as Fila[]).map(aConversacion);
  }

  async conversacion(id: string) {
    const f = await this.una("conversación", this.sb.from("crm_conversaciones").select("*").eq("id", id).limit(1));
    return f ? aConversacion(f) : null;
  }

  async conversacionPorIdentificador(canalId: string, identificador: string) {
    const f = await this.una("conversación", this.sb.from("crm_conversaciones").select("*").eq("canal_id", canalId).eq("identificador", identificador).limit(1));
    return f ? aConversacion(f) : null;
  }

  async guardarConversacion(c: Conversacion) {
    await this.ejecutar("conversación", this.sb.from("crm_conversaciones").upsert(deConversacion(c), { onConflict: "id" }));
    return c;
  }

  async borrarConversacion(id: string) {
    // los mensajes se van por el `on delete cascade`
    await this.ejecutar("conversación", this.sb.from("crm_conversaciones").delete().eq("id", id));
  }

  // ---------- mensajes ----------
  async mensajes(conversacionId: string, opciones?: { desde?: string; limite?: number }) {
    let q = this.sb.from("crm_mensajes").select("*").eq("conversacion_id", conversacionId);
    if (opciones?.desde) q = q.gt("creado", opciones.desde);
    if (opciones?.limite) {
      const { data, error } = await q.order("creado", { ascending: false }).limit(opciones.limite);
      if (error) fallo("mensajes", error);
      return ((data || []) as Fila[]).map(aMensaje).reverse();
    }
    const filas = await this.todas("mensajes", () => q.order("creado", { ascending: true }));
    return filas.map(aMensaje);
  }

  async mensaje(id: string) {
    const f = await this.una("mensaje", this.sb.from("crm_mensajes").select("*").eq("id", id).limit(1));
    return f ? aMensaje(f) : null;
  }

  async mensajePorExterno(empresaId: string, externoId: string) {
    if (!externoId) return null;
    const f = await this.una("mensaje", this.sb.from("crm_mensajes").select("*").eq("empresa_id", empresaId).eq("externo_id", externoId).limit(1));
    return f ? aMensaje(f) : null;
  }

  async guardarMensaje(m: Mensaje) {
    await this.ejecutar("mensaje", this.sb.from("crm_mensajes").upsert(deMensaje(m), { onConflict: "id" }));
    return m;
  }

  async borrarMensaje(id: string) {
    await this.ejecutar("mensaje", this.sb.from("crm_mensajes").delete().eq("id", id));
  }

  async mensajesDeEmpresa(empresaId: string, desde: string, hasta: string) {
    const filas = await this.todas("mensajes", () =>
      this.sb.from("crm_mensajes").select("*").eq("empresa_id", empresaId).gte("creado", desde).lte("creado", hasta).order("creado", { ascending: true })
    );
    return filas.map(aMensaje);
  }

  // ---------- pedidos ----------
  async pedidos(empresaId: string) {
    const filas = await this.todas("pedidos", () => this.sb.from("crm_pedidos").select("*").eq("empresa_id", empresaId).order("creado", { ascending: false }));
    return filas.map(aPedido);
  }

  async pedido(id: string) {
    const f = await this.una("pedido", this.sb.from("crm_pedidos").select("*").eq("id", id).limit(1));
    return f ? aPedido(f) : null;
  }

  async pedidoPorNumero(empresaId: string, numero: string) {
    const f = await this.una("pedido", this.sb.from("crm_pedidos").select("*").eq("empresa_id", empresaId).ilike("numero", (numero || "").trim()).limit(1));
    return f ? aPedido(f) : null;
  }

  async guardarPedido(p: Pedido) {
    await this.ejecutar("pedido", this.sb.from("crm_pedidos").upsert(dePedido(p), { onConflict: "empresa_id,numero" }));
    return p;
  }

  async guardarPedidos(lista: Pedido[]) {
    for (let i = 0; i < lista.length; i += 500) {
      await this.ejecutar("pedidos", this.sb.from("crm_pedidos").upsert(lista.slice(i, i + 500).map(dePedido), { onConflict: "empresa_id,numero" }));
    }
  }

  async borrarPedido(id: string) {
    await this.ejecutar("pedido", this.sb.from("crm_pedidos").delete().eq("id", id));
  }

  // ---------- productos ----------
  async productos(empresaId: string) {
    const filas = await this.todas("productos", () => this.sb.from("crm_productos").select("*").eq("empresa_id", empresaId).order("nombre", { ascending: true }));
    return filas.map(aProducto);
  }

  async producto(id: string) {
    const f = await this.una("producto", this.sb.from("crm_productos").select("*").eq("id", id).limit(1));
    return f ? aProducto(f) : null;
  }

  async productoPorSku(empresaId: string, sku: string) {
    const f = await this.una("producto", this.sb.from("crm_productos").select("*").eq("empresa_id", empresaId).ilike("sku", (sku || "").trim()).limit(1));
    return f ? aProducto(f) : null;
  }

  async guardarProducto(p: Producto) {
    await this.ejecutar("producto", this.sb.from("crm_productos").upsert(deProducto(p), { onConflict: "empresa_id,sku" }));
    return p;
  }

  async guardarProductos(lista: Producto[]) {
    for (let i = 0; i < lista.length; i += 500) {
      await this.ejecutar("productos", this.sb.from("crm_productos").upsert(lista.slice(i, i + 500).map(deProducto), { onConflict: "empresa_id,sku" }));
    }
  }

  async borrarProducto(id: string) {
    await this.ejecutar("producto", this.sb.from("crm_productos").delete().eq("id", id));
  }

  // ---------- plantillas y rápidas ----------
  async plantillas(empresaId: string) {
    const filas = await this.todas("plantillas", () => this.sb.from("crm_plantillas").select("*").eq("empresa_id", empresaId).order("nombre", { ascending: true }));
    return filas.map(aPlantilla);
  }

  async guardarPlantilla(p: Plantilla) {
    await this.ejecutar("plantilla", this.sb.from("crm_plantillas").upsert(dePlantilla(p), { onConflict: "empresa_id,nombre,idioma" }));
    return p;
  }

  async guardarPlantillas(lista: Plantilla[]) {
    if (!lista.length) return;
    await this.ejecutar("plantillas", this.sb.from("crm_plantillas").upsert(lista.map(dePlantilla), { onConflict: "empresa_id,nombre,idioma" }));
  }

  async borrarPlantilla(id: string) {
    await this.ejecutar("plantilla", this.sb.from("crm_plantillas").delete().eq("id", id));
  }

  async rapidas(empresaId: string) {
    const filas = await this.todas("rápidas", () => this.sb.from("crm_rapidas").select("*").eq("empresa_id", empresaId).order("atajo", { ascending: true }));
    return filas.map(aRapida);
  }

  async guardarRapida(r: Rapida) {
    await this.ejecutar("rápida", this.sb.from("crm_rapidas").upsert({ id: r.id, empresa_id: r.empresa_id, atajo: r.atajo, texto: r.texto, de: r.de ?? null }, { onConflict: "id" }));
    return r;
  }

  async borrarRapida(id: string) {
    await this.ejecutar("rápida", this.sb.from("crm_rapidas").delete().eq("id", id));
  }

  // ---------- chat del equipo ----------
  async equipoChat(empresaId: string, limite = 200) {
    const { data, error } = await this.sb.from("crm_equipo_chat").select("*").eq("empresa_id", empresaId).order("creado", { ascending: false }).limit(limite);
    if (error) fallo("chat del equipo", error);
    return ((data || []) as Fila[]).map(aEquipo).reverse();
  }

  async guardarMensajeEquipo(m: MensajeEquipo) {
    await this.ejecutar(
      "chat del equipo",
      this.sb.from("crm_equipo_chat").upsert(
        { id: m.id, empresa_id: m.empresa_id, de: m.de, nombre: m.nombre, texto: m.texto, creado: m.creado, ref: m.ref ?? null, estado: m.estado ?? null, hecho_por: m.hecho_por ?? null },
        { onConflict: "id" }
      )
    );
    return m;
  }

  async borrarMensajeEquipo(id: string) {
    await this.ejecutar("chat del equipo", this.sb.from("crm_equipo_chat").delete().eq("id", id));
  }

  // ---------- API keys ----------
  async apiKeys(empresaId: string) {
    const filas = await this.todas("claves de API", () => this.sb.from("crm_api_keys").select("id, empresa_id, nombre, prefijo, creado, ultimo_uso").eq("empresa_id", empresaId).order("creado", { ascending: true }));
    return filas.map((f) => {
      const { hash: _h, ...k } = aApiKey(f);
      void _h;
      return k;
    });
  }

  async apiKeyPorHash(hash: string) {
    const f = await this.una("clave de API", this.sb.from("crm_api_keys").select("*").eq("hash", hash).limit(1));
    return f ? aApiKey(f) : null;
  }

  async crearApiKey(key: ApiKey, hash: string) {
    await this.ejecutar("clave de API", this.sb.from("crm_api_keys").insert({ id: key.id, empresa_id: key.empresa_id, nombre: key.nombre, prefijo: key.prefijo, hash, creado: key.creado, ultimo_uso: null }));
    return key;
  }

  async tocarApiKey(id: string) {
    await this.ejecutar("clave de API", this.sb.from("crm_api_keys").update({ ultimo_uso: new Date().toISOString() }).eq("id", id));
  }

  async borrarApiKey(id: string) {
    await this.ejecutar("clave de API", this.sb.from("crm_api_keys").delete().eq("id", id));
  }

  // ---------- actividad ----------
  async actividad(empresaId: string, limite = 50) {
    const { data, error } = await this.sb.from("crm_actividad").select("*").eq("empresa_id", empresaId).order("creado", { ascending: false }).limit(limite);
    if (error) fallo("actividad", error);
    return ((data || []) as Fila[]).map(aActividad);
  }

  async registrarActividad(a: Actividad) {
    await this.ejecutar("actividad", this.sb.from("crm_actividad").insert({ id: a.id, empresa_id: a.empresa_id, quien: a.quien, que: a.que, ref: a.ref ?? null, creado: a.creado }));
  }

  async registrarWebhook(r: RegistroWebhook) {
    try {
      await this.ejecutar(
        "log del webhook",
        this.sb.from("crm_webhook_log").insert({ id: uid("wh"), empresa_id: r.empresa_id, objeto: r.objeto, entrantes: r.entrantes, estados: r.estados, error: r.error ?? null })
      );
    } catch (e) {
      console.error("[crm webhook] no pude anotar el log:", e instanceof Error ? e.message : e);
    }
  }

  // ---------- archivos ----------
  async guardarArchivo(empresaId: string, nombre: string, bytes: Uint8Array, mime: string) {
    const limpio = nombre.replace(/[^A-Za-z0-9._-]/g, "_");
    const clave = `${empresaId}/${limpio}`;
    const { error } = await this.sb.storage.from(BUCKET).upload(clave, bytes, { contentType: mime, upsert: true });
    if (error) throw new Error(`Storage: ${error.message}`);
    const { data } = this.sb.storage.from(BUCKET).getPublicUrl(clave);
    return { url: data.publicUrl, clave };
  }

  async leerArchivo(clave: string) {
    const { data, error } = await this.sb.storage.from(BUCKET).download(clave);
    if (error || !data) return null;
    return { bytes: new Uint8Array(await data.arrayBuffer()), mime: data.type || "application/octet-stream" };
  }

  // ---------- mantenimiento ----------
  async vaciarDatos(empresaId: string) {
    for (const tabla of ["crm_contactos", "crm_conversaciones", "crm_pedidos", "crm_productos", "crm_equipo_chat", "crm_actividad"]) {
      await this.ejecutar(tabla, this.sb.from(tabla).delete().eq("empresa_id", empresaId));
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __clientanyDbSupabase: DbSupabase | undefined;
}

export function getDbSupabase(): DbSupabase {
  if (!globalThis.__clientanyDbSupabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno");
    globalThis.__clientanyDbSupabase = new DbSupabase(url, key);
  }
  return globalThis.__clientanyDbSupabase;
}

export const _chequeoTipo: CrmDb = null as unknown as DbSupabase;
