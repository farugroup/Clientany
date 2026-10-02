"use client";
// ============================================================
// Clientany · CRM — repositorio del MODO NUBE.
//
// Habla con las rutas internas `/api/crm/*` (sesión por cookie) tal cual
// están en docs/CRM.md («Contrato REST interno»). El store `useCrm` es un
// espejo: cada escritura llama a la API y aplica al store la entidad que
// vuelve (write-through). Las novedades de otros (mensajes entrantes,
// cambios de un compañero) llegan con `refrescar()`, que pide sólo lo que
// cambió desde la última marca de tiempo del servidor.
// ============================================================
import type {
  Actividad,
  ApiKey,
  Bot,
  BotResultado,
  Canal,
  CanalTipo,
  Contacto,
  Conversacion,
  Empresa,
  Invitacion,
  Mensaje,
  MensajeEquipo,
  Metricas,
  Miembro,
  Pedido,
  Plantilla,
  Producto,
  Rapida,
  Rol,
} from "./types";
import {
  CrmError,
  useCrm,
  type AccionConversacion,
  type ConectarCanalInput,
  type CrmRepo,
  type CrmState,
  type NuevaConversacionInput,
  type SimularEntranteInput,
  type Sugerencia,
} from "./repo";
import { ahoraIso, previewMensaje, uid } from "./core";
import { completarBot } from "./bot";

// Lo que devuelve GET /api/crm/estado.
interface EstadoRespuesta {
  empresa: Empresa;
  yo: Miembro;
  miembros: Miembro[];
  invitaciones?: Invitacion[];
  canales: Canal[];
  conversaciones: Conversacion[];
  contactos: Contacto[];
  pedidos: Pedido[];
  productos: Producto[];
  bot: Bot | null;
  plantillas: Plantilla[];
  rapidas: Rapida[];
  equipo: MensajeEquipo[];
  api_keys: ApiKey[];
  actividad: Actividad[];
  ahora?: string;
}

// Lo que devuelve GET /api/crm/cambios.
interface CambiosRespuesta {
  conversaciones?: Conversacion[];
  mensajes?: Mensaje[];
  equipo?: MensajeEquipo[];
  miembros?: Miembro[];
  ahora?: string;
}

type ClaveEstado = Exclude<keyof EstadoRespuesta, "ahora">;

const SIN_RED = "No hay conexión. Revisá internet y probá de nuevo.";
const FALLO_SERVIDOR = "Falló la conexión con el servidor";
// Se pide un poquito para atrás de la marca: lo repetido se pisa por id.
const SOLAPE_MS = 3000;
// Prefijo de los mensajes optimistas (todavía no confirmados por el servidor).
const TMP = "tmp_";

const enc = encodeURIComponent;

const porFecha = (a: { creado: string }, b: { creado: string }) =>
  new Date(a.creado).getTime() - new Date(b.creado).getTime();

function arr<T>(x: T[] | undefined | null): T[] {
  return Array.isArray(x) ? x : [];
}

// Reemplaza por id (o agrega al principio lo nuevo).
function upsert<T extends { id: string }>(listaActual: T[], item: T, alFinal = false): T[] {
  return listaActual.some((x) => x.id === item.id)
    ? listaActual.map((x) => (x.id === item.id ? item : x))
    : alFinal
      ? [...listaActual, item]
      : [item, ...listaActual];
}

async function leerJson(res: Response): Promise<unknown> {
  const texto = await res.text().catch(() => "");
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

function errorDeRespuesta(cuerpo: unknown, status: number): CrmError {
  const c = (cuerpo && typeof cuerpo === "object" ? cuerpo : {}) as { error?: unknown; codigo?: unknown };
  const mensaje = typeof c.error === "string" && c.error.trim() ? c.error : FALLO_SERVIDOR;
  const codigo = typeof c.codigo === "string" && c.codigo ? c.codigo : String(status);
  return new CrmError(mensaje, codigo);
}

async function llamar(ruta: string, op: { method?: string; body?: unknown; form?: FormData }): Promise<Response> {
  const headers: Record<string, string> = {};
  if (!op.form) headers["Content-Type"] = "application/json";
  try {
    return await fetch(ruta, {
      method: op.method || "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers,
      body: op.form ? op.form : op.body !== undefined ? JSON.stringify(op.body) : undefined,
    });
  } catch {
    throw new CrmError(SIN_RED, "sin_red");
  }
}

// El helper de todas las llamadas: JSON de ida y de vuelta, error criollo.
export async function pedir<T>(ruta: string, op: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const res = await llamar(ruta, op);
  const cuerpo = await leerJson(res);
  if (!res.ok) throw errorDeRespuesta(cuerpo, res.status);
  return cuerpo as T;
}

async function pedirTexto(ruta: string): Promise<string> {
  const res = await llamar(ruta, {});
  if (!res.ok) throw errorDeRespuesta(await leerJson(res), res.status);
  return res.text();
}

// ============================================================
export class RepoNube implements CrmRepo {
  readonly modo = "nube" as const;
  // Marca de tiempo del servidor de la última vez que se trajo todo / los cambios.
  private marca: string | null = null;
  // Hasta cuándo están al día los mensajes de cada conversación abierta.
  private marcasConv = new Map<string, string>();
  private refrescoEnCurso: Promise<void> | null = null;
  private convEnCurso: string | null = null;

  private st(): CrmState {
    return useCrm.getState();
  }

  // ---------- carga y refresco ----------
  async cargar(): Promise<void> {
    const r = await pedir<EstadoRespuesta>("/api/crm/estado");
    if (!r || !r.empresa || !r.yo) throw new CrmError("El servidor no devolvió los datos de tu empresa. Probá de nuevo.", "sin_empresa");
    this.st().set({
      empresa: r.empresa,
      yo: r.yo,
      miembros: arr(r.miembros),
      invitaciones: arr(r.invitaciones),
      canales: arr(r.canales),
      conversaciones: arr(r.conversaciones),
      mensajes: {}, // van a demanda (y después de recargar, los viejos ya no sirven)
      contactos: arr(r.contactos),
      pedidos: arr(r.pedidos),
      productos: arr(r.productos),
      bot: completarBot(r.bot),
      plantillas: arr(r.plantillas),
      rapidas: arr(r.rapidas),
      equipo: arr(r.equipo).sort(porFecha),
      api_keys: arr(r.api_keys),
      actividad: arr(r.actividad),
      listo: true,
      modo: "nube",
      error: null,
    });
    this.marca = r.ahora || new Date().toISOString();
    this.marcasConv.clear();
  }

  // Trae de nuevo sólo algunas partes del estado (después de importar, etc.).
  private async recargar(claves: ClaveEstado[]): Promise<void> {
    const r = await pedir<EstadoRespuesta>("/api/crm/estado");
    if (!r) return;
    const patch: Partial<CrmState> = {};
    for (const k of claves) {
      if (k === "bot") patch.bot = completarBot(r.bot);
      else if (k === "empresa") patch.empresa = r.empresa;
      else if (k === "yo") patch.yo = r.yo;
      else if (k === "equipo") patch.equipo = arr(r.equipo).sort(porFecha);
      else (patch as Record<string, unknown>)[k] = arr(r[k] as unknown[]);
    }
    this.st().set(patch);
  }

  async refrescar(convId?: string | null): Promise<void> {
    if (!this.marca) return; // todavía no cargó
    const conv = convId || null;
    if (this.refrescoEnCurso) {
      // Si ya hay uno andando que cubre lo mismo, se espera ése.
      if (!conv || conv === this.convEnCurso) return this.refrescoEnCurso;
      await this.refrescoEnCurso.catch(() => undefined);
    }
    const p = this.hacerRefresco(conv);
    this.refrescoEnCurso = p;
    this.convEnCurso = conv;
    try {
      await p;
    } finally {
      if (this.refrescoEnCurso === p) {
        this.refrescoEnCurso = null;
        this.convEnCurso = null;
      }
    }
  }

  private async hacerRefresco(conv: string | null): Promise<void> {
    const global = this.marca as string;
    const deConv = conv ? this.marcasConv.get(conv) : undefined;
    // Para la conversación abierta se pide desde lo más viejo que falte
    // (si un refresco general avanzó la marca, sus mensajes no vinieron).
    const base = deConv && new Date(deConv).getTime() < new Date(global).getTime() ? deConv : global;
    const desde = new Date(new Date(base).getTime() - SOLAPE_MS).toISOString();
    const qs = new URLSearchParams({ desde });
    if (conv) qs.set("conv", conv);
    const r = await pedir<CambiosRespuesta>(`/api/crm/cambios?${qs.toString()}`);
    const s = this.st();
    const patch: Partial<CrmState> = {};

    const convs = arr(r?.conversaciones);
    if (convs.length) {
      const porId = new Map(convs.map((c) => [c.id, c]));
      const existentes = new Set(s.conversaciones.map((c) => c.id));
      const nuevas = convs.filter((c) => !existentes.has(c.id));
      patch.conversaciones = [...nuevas, ...s.conversaciones.map((c) => porId.get(c.id) || c)];
    }

    const msgs = arr(r?.mensajes);
    if (msgs.length) {
      const mensajes = { ...s.mensajes };
      let cambio = false;
      for (const m of msgs) {
        const l = mensajes[m.conversacion_id];
        if (!l) continue; // esa conversación no está abierta: se carga entera cuando se abra
        mensajes[m.conversacion_id] = l.some((x) => x.id === m.id) ? l.map((x) => (x.id === m.id ? m : x)) : [...l, m];
        cambio = true;
      }
      if (cambio) {
        for (const k of Object.keys(mensajes)) if (mensajes[k] !== s.mensajes[k]) mensajes[k] = [...mensajes[k]].sort(porFecha);
        patch.mensajes = mensajes;
      }
    }

    const eq = arr(r?.equipo);
    if (eq.length) {
      let equipo = s.equipo;
      for (const m of eq) equipo = upsert(equipo, m, true);
      patch.equipo = [...equipo].sort(porFecha);
    }

    if (Array.isArray(r?.miembros) && r.miembros.length) {
      patch.miembros = r.miembros;
      const yo = s.yo ? r.miembros.find((m) => m.id === s.yo!.id) : undefined;
      if (yo) patch.yo = yo;
    }

    if (Object.keys(patch).length) s.set(patch);
    this.marca = r?.ahora || new Date().toISOString();
    if (conv) this.marcasConv.set(conv, this.marca);
  }

  // ---------- ayudas para el store ----------
  private patchConv(convId: string, patch: Partial<Conversacion>) {
    const c = this.st().conversaciones.find((x) => x.id === convId);
    if (c) this.st().setConversacion({ ...c, ...patch });
  }

  // Después de que una persona mandó algo (mientras llega lo del servidor).
  private trasSaliente(convId: string, m: Mensaje) {
    const c = this.st().conversaciones.find((x) => x.id === convId);
    if (!c) return;
    this.st().setConversacion({
      ...c,
      ultimo_texto: previewMensaje(m.tipo, m.texto, m.media_nombre),
      ultimo_en: m.creado,
      ultimo_de: "agente",
      ultimo_saliente_humano_en: m.creado,
      visto_in: c.ultimo_entrante_en ?? c.visto_in ?? null,
      no_leidos: 0,
      actualizado: m.creado,
    });
  }

  // Agrega un mensaje sólo si los de esa conversación ya están cargados (si
  // no, crear la lista haría creer que ya se cargó entera).
  private sumarMensaje(m: Mensaje) {
    if (m && m.conversacion_id in this.st().mensajes) this.st().agregarMensaje(m);
  }

  private reemplazarTemporal(convId: string, tempId: string, real: Mensaje) {
    const s = this.st();
    const l = s.mensajes[convId];
    if (!l) return;
    s.setMensajes(convId, [...l.filter((x) => x.id !== tempId && x.id !== real.id), real].sort(porFecha));
  }

  // ---------- empresa y datos de prueba ----------
  async actualizarEmpresa(patch: Partial<Empresa>): Promise<Empresa> {
    const e = await pedir<Empresa>("/api/crm/empresa", { method: "PUT", body: patch });
    this.st().set({ empresa: e });
    return e;
  }

  async cargarDatosDePrueba(): Promise<void> {
    await pedir<{ ok: boolean }>("/api/crm/demo", { method: "POST" });
    await this.cargar();
  }

  async vaciarDatosDePrueba(): Promise<void> {
    await pedir<{ ok: boolean }>("/api/crm/demo", { method: "DELETE" });
    await this.cargar();
  }

  // ---------- equipo ----------
  async invitarMiembro(input: { email: string; nombre?: string; rol: Rol }): Promise<{ miembro?: Miembro; invitacion?: Invitacion }> {
    const r = await pedir<{ miembro?: Miembro; invitacion?: Invitacion }>("/api/crm/equipo/invitar", { method: "POST", body: input });
    const s = this.st();
    if (r?.miembro) s.set({ miembros: upsert(s.miembros, r.miembro, true) });
    if (r?.invitacion) s.set({ invitaciones: upsert(this.st().invitaciones, r.invitacion, true) });
    return r || {};
  }

  async actualizarMiembro(id: string, patch: Partial<Pick<Miembro, "rol" | "nombre">>): Promise<Miembro> {
    const m = await pedir<Miembro>(`/api/crm/equipo/${enc(id)}`, { method: "PATCH", body: patch });
    const s = this.st();
    s.set({ miembros: upsert(s.miembros, m, true), ...(s.yo?.id === m.id ? { yo: m } : {}) });
    return m;
  }

  async quitarMiembro(id: string): Promise<void> {
    await pedir<{ ok: boolean }>(`/api/crm/equipo/${enc(id)}`, { method: "DELETE" });
    const s = this.st();
    s.set({ miembros: s.miembros.filter((m) => m.id !== id) });
  }

  async cancelarInvitacion(id: string): Promise<void> {
    await pedir<{ ok: boolean }>(`/api/crm/equipo/invitaciones/${enc(id)}`, { method: "DELETE" });
    const s = this.st();
    s.set({ invitaciones: s.invitaciones.filter((i) => i.id !== id) });
  }

  async pulso(): Promise<void> {
    await pedir<{ ok: boolean }>("/api/crm/equipo/pulso", { method: "POST" });
    const s = this.st();
    if (s.yo) {
      const yo: Miembro = { ...s.yo, ultimo_visto: ahoraIso() };
      s.set({ yo, miembros: s.miembros.map((m) => (m.id === yo.id ? yo : m)) });
    }
  }

  // ---------- canales ----------
  async conectarCanal(input: ConectarCanalInput): Promise<Canal> {
    const c = await pedir<Canal>("/api/crm/canales", { method: "POST", body: input });
    const s = this.st();
    s.set({ canales: upsert(s.canales, c, true) });
    return c;
  }

  async probarCanal(id: string): Promise<{ ok: boolean; detalle?: Canal["detalle"]; error?: string }> {
    const r = await pedir<{ ok: boolean; detalle?: Canal["detalle"]; error?: string }>(`/api/crm/canales/${enc(id)}/probar`, {
      method: "POST",
    });
    const s = this.st();
    const c = s.canales.find((x) => x.id === id);
    if (c && r) {
      s.set({
        canales: upsert(
          s.canales,
          {
            ...c,
            estado: r.ok ? "conectado" : "error",
            ultimo_error: r.ok ? undefined : r.error || c.ultimo_error,
            detalle: r.detalle || c.detalle,
          },
          true
        ),
      });
    }
    return r || { ok: false, error: FALLO_SERVIDOR };
  }

  async desconectarCanal(id: string): Promise<void> {
    await pedir<{ ok: boolean }>(`/api/crm/canales/${enc(id)}`, { method: "DELETE" });
    const s = this.st();
    s.set({ canales: s.canales.filter((c) => c.id !== id) });
  }

  // ---------- bandeja y chat ----------
  async cargarMensajes(convId: string): Promise<Mensaje[]> {
    const marcaAntes = this.marca;
    const l = arr(await pedir<Mensaje[]>(`/api/crm/conversaciones/${enc(convId)}/mensajes`)).sort(porFecha);
    // Los optimistas que siguen esperando (o fallaron) no se pierden.
    const temporales = (this.st().mensajes[convId] || []).filter((m) => m.id.startsWith(TMP) && !l.some((x) => x.id === m.id));
    this.st().setMensajes(convId, [...l, ...temporales]);
    if (marcaAntes) this.marcasConv.set(convId, marcaAntes);
    // El servidor la marca leída al traer los mensajes.
    const c = this.st().conversaciones.find((x) => x.id === convId);
    if (c && c.no_leidos) this.patchConv(convId, { no_leidos: 0 });
    return l;
  }

  async enviarTexto(convId: string, texto: string, opciones?: { cita_id?: string }): Promise<Mensaje> {
    const t = (texto || "").trim();
    if (!t) throw new CrmError("Escribí algo antes de mandar.");
    const s = this.st();
    const conv = s.conversaciones.find((c) => c.id === convId);
    const temp: Mensaje = {
      id: TMP + uid("ms"),
      empresa_id: s.empresa?.id || conv?.empresa_id || "",
      conversacion_id: convId,
      direccion: "out",
      de: "agente",
      autor: s.yo?.nombre,
      tipo: "texto",
      texto: t,
      estado: "pendiente",
      cita_id: opciones?.cita_id,
      creado: ahoraIso(),
    };
    this.sumarMensaje(temp);
    try {
      const m = await pedir<Mensaje>(`/api/crm/conversaciones/${enc(convId)}/mensajes`, {
        method: "POST",
        body: { texto: t, cita_id: opciones?.cita_id },
      });
      this.reemplazarTemporal(convId, temp.id, m);
      this.trasSaliente(convId, m);
      return m;
    } catch (e) {
      const err = e instanceof CrmError ? e : new CrmError("No se pudo mandar el mensaje. Probá de nuevo.");
      this.sumarMensaje({ ...temp, estado: "fallido", error: err.message });
      throw err;
    }
  }

  async enviarPlantilla(convId: string, plantilla: { nombre: string; idioma?: string; parametros: string[] }): Promise<Mensaje> {
    const m = await pedir<Mensaje>(`/api/crm/conversaciones/${enc(convId)}/plantilla`, { method: "POST", body: plantilla });
    this.sumarMensaje(m);
    this.trasSaliente(convId, m);
    return m;
  }

  async enviarArchivo(convId: string, archivo: File, texto?: string): Promise<Mensaje> {
    if (!archivo) throw new CrmError("Elegí un archivo.");
    const form = new FormData();
    form.append("archivo", archivo, archivo.name);
    if (texto && texto.trim()) form.append("texto", texto.trim());
    const m = await pedir<Mensaje>(`/api/crm/conversaciones/${enc(convId)}/archivo`, { method: "POST", form });
    this.sumarMensaje(m);
    this.trasSaliente(convId, m);
    return m;
  }

  async marcarLeido(convId: string): Promise<void> {
    const c = this.st().conversaciones.find((x) => x.id === convId);
    if (c && c.no_leidos) this.patchConv(convId, { no_leidos: 0 });
    await pedir<{ ok: boolean }>(`/api/crm/conversaciones/${enc(convId)}/leido`, { method: "POST" });
  }

  async accion(convId: string, accion: AccionConversacion): Promise<Conversacion> {
    const c = await pedir<Conversacion>(`/api/crm/conversaciones/${enc(convId)}/accion`, { method: "POST", body: accion });
    this.st().setConversacion(c);
    // Renombrar el chat también renombra el contacto en el servidor.
    if (accion.tipo === "nombre" && c.contacto_id) {
      const s = this.st();
      s.set({ contactos: s.contactos.map((x) => (x.id === c.contacto_id ? { ...x, nombre: c.nombre } : x)) });
    }
    return c;
  }

  async nuevaConversacion(input: NuevaConversacionInput): Promise<Conversacion> {
    const c = await pedir<Conversacion>("/api/crm/conversaciones", { method: "POST", body: input });
    this.st().setConversacion(c);
    if ((input.texto || "").trim() || input.plantilla) {
      await this.cargarMensajes(c.id).catch(() => undefined);
    }
    return this.st().conversaciones.find((x) => x.id === c.id) || c;
  }

  async borrarConversacion(convId: string): Promise<void> {
    await pedir<{ ok: boolean }>(`/api/crm/conversaciones/${enc(convId)}`, { method: "DELETE" });
    const s = this.st();
    const mensajes = { ...s.mensajes };
    delete mensajes[convId];
    s.set({ conversaciones: s.conversaciones.filter((c) => c.id !== convId), mensajes });
    this.marcasConv.delete(convId);
  }

  async borrarMensaje(convId: string, mensajeId: string): Promise<void> {
    if (!mensajeId.startsWith(TMP)) {
      await pedir<{ ok: boolean }>(`/api/crm/conversaciones/${enc(convId)}/mensajes/${enc(mensajeId)}`, { method: "DELETE" });
    }
    const s = this.st();
    const l = s.mensajes[convId];
    if (l) s.setMensajes(convId, l.filter((m) => m.id !== mensajeId));
  }

  async simularEntrante(input: SimularEntranteInput): Promise<{ conversacion: Conversacion; mensaje: Mensaje; bot: BotResultado }> {
    const r = await pedir<{ conversacion: Conversacion; mensaje: Mensaje; bot: BotResultado }>("/api/crm/simular", {
      method: "POST",
      body: input,
    });
    this.st().setConversacion(r.conversacion);
    try {
      await this.cargarMensajes(r.conversacion.id);
    } catch {
      this.sumarMensaje(r.mensaje);
    }
    return r;
  }

  async buscar(q: string): Promise<{ conversaciones: Conversacion[]; contactos: Contacto[]; pedidos: Pedido[] }> {
    const r = await pedir<{ conversaciones?: Conversacion[]; contactos?: Contacto[]; pedidos?: Pedido[] }>(
      `/api/crm/buscar?q=${enc(q || "")}`
    );
    const conversaciones = arr(r?.conversaciones);
    // Una conversación vieja (fuera de las 500 que trae /estado) se suma al
    // store para que se pueda abrir desde el resultado de la búsqueda.
    const s = this.st();
    const conocidas = new Set(s.conversaciones.map((c) => c.id));
    const faltan = conversaciones.filter((c) => !conocidas.has(c.id));
    if (faltan.length) s.set({ conversaciones: [...s.conversaciones, ...faltan] });
    return { conversaciones, contactos: arr(r?.contactos), pedidos: arr(r?.pedidos) };
  }

  // ---------- contactos ----------
  async guardarContacto(c: Partial<Contacto> & { nombre: string }): Promise<Contacto> {
    const r = await pedir<Contacto>("/api/crm/contactos", { method: "POST", body: c });
    const s = this.st();
    s.set({ contactos: upsert(s.contactos, r) });
    return r;
  }

  async borrarContacto(id: string): Promise<void> {
    await pedir<{ ok: boolean }>(`/api/crm/contactos/${enc(id)}`, { method: "DELETE" });
    const s = this.st();
    s.set({
      contactos: s.contactos.filter((c) => c.id !== id),
      pedidos: s.pedidos.map((p) => (p.contacto_id === id ? { ...p, contacto_id: null } : p)),
    });
  }

  async importarContactos(lista: Contacto[]): Promise<{ nuevos: number; actualizados: number }> {
    const r = await pedir<{ nuevos: number; actualizados: number }>("/api/crm/contactos/importar", {
      method: "POST",
      body: { contactos: lista },
    });
    await this.recargar(["contactos"]).catch(() => undefined);
    return r;
  }

  // ---------- pedidos ----------
  async guardarPedido(p: Partial<Pedido> & { numero: string; nombre: string }): Promise<Pedido> {
    const r = await pedir<Pedido>("/api/crm/pedidos", { method: "POST", body: p });
    const s = this.st();
    s.set({ pedidos: upsert(s.pedidos, r) });
    // Si el servidor creó el contacto al atarlo, se trae.
    if (r.contacto_id && !this.st().contactos.some((c) => c.id === r.contacto_id)) {
      await this.recargar(["contactos"]).catch(() => undefined);
    }
    return r;
  }

  async borrarPedido(id: string): Promise<void> {
    await pedir<{ ok: boolean }>(`/api/crm/pedidos/${enc(id)}`, { method: "DELETE" });
    const s = this.st();
    s.set({
      pedidos: s.pedidos.filter((p) => p.id !== id),
      conversaciones: s.conversaciones.map((c) => (c.pedido_id === id ? { ...c, pedido_id: null } : c)),
    });
  }

  async importarPedidos(lista: Pedido[]): Promise<{ nuevos: number; actualizados: number }> {
    const r = await pedir<{ nuevos: number; actualizados: number }>("/api/crm/pedidos/importar", {
      method: "POST",
      body: { pedidos: lista },
    });
    await this.recargar(["pedidos", "contactos"]).catch(() => undefined);
    return r;
  }

  // ---------- stock ----------
  async guardarProducto(p: Partial<Producto> & { sku: string; nombre: string }): Promise<Producto> {
    const r = await pedir<Producto>("/api/crm/productos", { method: "POST", body: p });
    const s = this.st();
    s.set({ productos: upsert(s.productos, r) });
    return r;
  }

  async borrarProducto(id: string): Promise<void> {
    await pedir<{ ok: boolean }>(`/api/crm/productos/${enc(id)}`, { method: "DELETE" });
    const s = this.st();
    s.set({ productos: s.productos.filter((p) => p.id !== id) });
  }

  async ajustarStock(id: string, delta: number, motivo?: string): Promise<Producto> {
    const r = await pedir<Producto>(`/api/crm/productos/${enc(id)}/ajustar`, { method: "POST", body: { delta, motivo } });
    const s = this.st();
    s.set({ productos: upsert(s.productos, r) });
    return r;
  }

  async importarProductos(lista: Producto[]): Promise<{ nuevos: number; actualizados: number }> {
    const r = await pedir<{ nuevos: number; actualizados: number }>("/api/crm/productos/importar", {
      method: "POST",
      body: { productos: lista },
    });
    await this.recargar(["productos"]).catch(() => undefined);
    return r;
  }

  // ---------- respuestas automáticas ----------
  async guardarBot(bot: Bot): Promise<Bot> {
    const r = completarBot(await pedir<Bot>("/api/crm/bot", { method: "PUT", body: bot }));
    this.st().set({ bot: r });
    return r;
  }

  async probarBot(input: { texto: string; canal?: CanalTipo; conversacion_id?: string; fuera_de_horario?: boolean }): Promise<BotResultado> {
    return pedir<BotResultado>("/api/crm/bot/probar", { method: "POST", body: input });
  }

  // ---------- plantillas y respuestas rápidas ----------
  async sincronizarPlantillas(canalId: string): Promise<Plantilla[]> {
    const r = arr(await pedir<Plantilla[]>(`/api/crm/canales/${enc(canalId)}/plantillas/sincronizar`, { method: "POST" }));
    const s = this.st();
    const ids = new Set(r.map((p) => p.id));
    const clave = (p: Plantilla) => `${p.canal_id || ""}|${p.nombre}|${p.idioma}`;
    const claves = new Set(r.map(clave));
    s.set({ plantillas: [...s.plantillas.filter((p) => !ids.has(p.id) && !claves.has(clave(p))), ...r] });
    return r;
  }

  async guardarPlantilla(p: Partial<Plantilla> & { nombre: string; cuerpo: string }): Promise<Plantilla> {
    const r = await pedir<Plantilla>("/api/crm/plantillas", { method: "POST", body: p });
    const s = this.st();
    s.set({ plantillas: upsert(s.plantillas, r, true) });
    return r;
  }

  async borrarPlantilla(id: string): Promise<void> {
    await pedir<{ ok: boolean }>(`/api/crm/plantillas/${enc(id)}`, { method: "DELETE" });
    const s = this.st();
    s.set({ plantillas: s.plantillas.filter((p) => p.id !== id) });
  }

  async guardarRapida(r: Partial<Rapida> & { atajo: string; texto: string }): Promise<Rapida> {
    const x = await pedir<Rapida>("/api/crm/rapidas", { method: "POST", body: r });
    const s = this.st();
    s.set({ rapidas: upsert(s.rapidas, x, true) });
    return x;
  }

  async borrarRapida(id: string): Promise<void> {
    await pedir<{ ok: boolean }>(`/api/crm/rapidas/${enc(id)}`, { method: "DELETE" });
    const s = this.st();
    s.set({ rapidas: s.rapidas.filter((r) => r.id !== id) });
  }

  // ---------- chat del equipo ----------
  async enviarEquipo(texto: string, ref?: MensajeEquipo["ref"]): Promise<MensajeEquipo> {
    const m = await pedir<MensajeEquipo>("/api/crm/equipo/chat", { method: "POST", body: { texto, ref: ref ?? undefined } });
    const s = this.st();
    s.set({ equipo: upsert(s.equipo, m, true) });
    return m;
  }

  async marcarEquipo(id: string, estado: "pendiente" | "hecho" | null): Promise<MensajeEquipo> {
    const m = await pedir<MensajeEquipo>(`/api/crm/equipo/chat/${enc(id)}`, { method: "PATCH", body: { estado } });
    const s = this.st();
    s.set({ equipo: upsert(s.equipo, m, true) });
    return m;
  }

  async borrarEquipo(id: string): Promise<void> {
    await pedir<{ ok: boolean }>(`/api/crm/equipo/chat/${enc(id)}`, { method: "DELETE" });
    const s = this.st();
    s.set({ equipo: s.equipo.filter((m) => m.id !== id) });
  }

  // ---------- API pública ----------
  async crearApiKey(nombre: string): Promise<{ key: ApiKey; secreto: string }> {
    const r = await pedir<{ key: ApiKey; secreto: string }>("/api/crm/api-keys", { method: "POST", body: { nombre } });
    const s = this.st();
    if (r?.key) s.set({ api_keys: upsert(s.api_keys, r.key) });
    return r;
  }

  async borrarApiKey(id: string): Promise<void> {
    await pedir<{ ok: boolean }>(`/api/crm/api-keys/${enc(id)}`, { method: "DELETE" });
    const s = this.st();
    s.set({ api_keys: s.api_keys.filter((k) => k.id !== id) });
  }

  // ---------- IA ----------
  async sugerirRespuesta(convId: string, borrador?: string): Promise<Sugerencia> {
    return pedir<Sugerencia>("/api/crm/ia/sugerir", { method: "POST", body: { conversacion_id: convId, borrador } });
  }

  // ---------- métricas ----------
  async metricas(): Promise<Metricas> {
    return pedir<Metricas>("/api/crm/metricas");
  }

  // ---------- exportar ----------
  async exportarCsv(que: "contactos" | "pedidos" | "productos"): Promise<string> {
    return pedirTexto(`/api/crm/exportar/${enc(que)}`);
  }
}
