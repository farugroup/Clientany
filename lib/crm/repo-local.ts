"use client";
// ============================================================
// Clientany · CRM — repositorio del MODO DEMO (todo en el navegador).
//
// El estado entero del CRM vive en `localStorage` bajo «clientany-crm»
// (un JSON con `version: 1`). Cada método cambia el store `useCrm` y el
// guardado se hace solo: hay una suscripción al store que escribe con un
// debounce de 300 ms cuando cambia algo de lo que se persiste (y se fuerza
// al cerrar la pestaña). Si otra pestaña guarda, ésta se rehidrata.
//
// No hay red (salvo la sugerencia de IA, que va a /api/crm/ia/sugerir sin
// sesión): los mensajes «salen» como enviados y el bot corre acá mismo.
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
  Horario,
  Invitacion,
  Mensaje,
  MensajeEquipo,
  MensajeTipo,
  Metricas,
  Miembro,
  Pedido,
  PedidoItem,
  Plantilla,
  Producto,
  Rapida,
  Regla,
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
import {
  GRUPOS,
  HORARIO_DEFAULT,
  LIMITE_TEXTO_WHATSAPP,
  ahoraIso,
  colaTelefono,
  emailValido,
  estaAbierto,
  fechaCorta,
  iniciales,
  nombreEstadoPedido,
  normalizarTelefono,
  normalizarTexto,
  partesEnZona,
  pedidosDeContacto,
  previewMensaje,
  sinAcentos,
  telefonoLindo,
  tokenAleatorio,
  uid,
} from "./core";
import { completarBot, evaluarBot } from "./bot";
import { aCsv } from "./csv";
import { MIEMBRO_DEMO, YO_DEMO, datosDePrueba } from "./demo";
import { calcularMetricas } from "./metricas";

const CLAVE = "clientany-crm";
const CLAVE_RESPALDO = "clientany-crm-respaldo";
const VERSION = 1;
const DEBOUNCE_MS = 300;
const MAX_ADJUNTO = 1.5 * 1024 * 1024;
const MAX_ACTIVIDAD = 200;
const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

interface Guardado {
  version: 1;
  empresa: Empresa;
  yo: Miembro;
  miembros: Miembro[];
  canales: Canal[];
  conversaciones: Conversacion[];
  mensajes: Record<string, Mensaje[]>;
  contactos: Contacto[];
  pedidos: Pedido[];
  productos: Producto[];
  bot: Bot;
  plantillas: Plantilla[];
  rapidas: Rapida[];
  equipo: MensajeEquipo[];
  api_keys: ApiKey[];
  actividad: Actividad[];
}

// Lo que se persiste del store (si cambia alguna de estas, se guarda).
const CLAVES_PERSISTIDAS = [
  "empresa",
  "yo",
  "miembros",
  "canales",
  "conversaciones",
  "mensajes",
  "contactos",
  "pedidos",
  "productos",
  "bot",
  "plantillas",
  "rapidas",
  "equipo",
  "api_keys",
  "actividad",
] as const satisfies readonly (keyof CrmState)[];

// ---------- utilidades sueltas ----------
const porFecha = (a: { creado: string }, b: { creado: string }) =>
  new Date(a.creado).getTime() - new Date(b.creado).getTime();

const lista = <T,>(x: T[] | undefined | null): T[] => (Array.isArray(x) ? x : []);

function copiar<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

function normalizarGuardado(g: Partial<Guardado>): Guardado | null {
  if (!g || g.version !== VERSION || !g.empresa || !g.yo) return null;
  const empresa: Empresa = {
    ...g.empresa,
    horario: g.empresa.horario || copiar(HORARIO_DEFAULT),
    etapas: lista(g.empresa.etapas),
    etiquetas: lista(g.empresa.etiquetas),
    ia: g.empresa.ia || { proveedor: "plataforma", clave_cargada: false },
  };
  const miembros = lista(g.miembros);
  return {
    version: VERSION,
    empresa,
    yo: g.yo,
    miembros: miembros.some((m) => m.id === g.yo!.id) ? miembros : [g.yo, ...miembros],
    canales: lista(g.canales),
    conversaciones: lista(g.conversaciones),
    mensajes: g.mensajes && typeof g.mensajes === "object" ? g.mensajes : {},
    contactos: lista(g.contactos),
    pedidos: lista(g.pedidos),
    productos: lista(g.productos),
    bot: completarBot(g.bot),
    plantillas: lista(g.plantillas),
    rapidas: lista(g.rapidas),
    equipo: lista(g.equipo),
    api_keys: lista(g.api_keys),
    actividad: lista(g.actividad),
  };
}

function leerGuardado(): Guardado | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(CLAVE);
  } catch {
    return null; // localStorage bloqueado (modo privado estricto): se arranca de cero
  }
  if (!raw) return null;
  try {
    return normalizarGuardado(JSON.parse(raw) as Partial<Guardado>);
  } catch {
    // JSON roto: se guarda una copia por las dudas y se arranca de cero.
    try {
      window.localStorage.setItem(CLAVE_RESPALDO, raw);
    } catch {
      /* sin lugar: se pierde */
    }
    return null;
  }
}

// Los adjuntos de la demo son data URLs: si el navegador se queda sin lugar,
// se guarda sin ellos (en memoria siguen estando hasta recargar).
function sinAdjuntos(mensajes: Record<string, Mensaje[]>): Record<string, Mensaje[]> {
  const out: Record<string, Mensaje[]> = {};
  for (const [k, l] of Object.entries(mensajes)) {
    out[k] = l.map((m) => (m.media_url && m.media_url.startsWith("data:") ? { ...m, media_url: undefined } : m));
  }
  return out;
}

function tipoPorMime(mime: string): MensajeTipo {
  if (mime.startsWith("image/")) return "imagen";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "documento";
}

function leerComoDataUrl(archivo: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ""));
    r.onerror = () => rej(new CrmError("No pude leer el archivo. Probá con otro."));
    r.readAsDataURL(archivo);
  });
}

function digitosAzar(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function llenarPlantilla(cuerpo: string, parametros: string[]): string {
  return cuerpo.replace(/\{\{(\d+)\}\}/g, (m, n: string) => {
    const v = parametros[Number(n) - 1];
    return v === undefined || v === null || String(v).trim() === "" ? m : String(v);
  });
}

function contarVariables(cuerpo: string): number {
  const nums = new Set<string>();
  for (const m of (cuerpo || "").matchAll(/\{\{(\d+)\}\}/g)) nums.add(m[1]);
  return nums.size;
}

function nombrePlantillaMeta(nombre: string): string {
  return sinAcentos(nombre)
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizarAtajo(atajo: string): string {
  const limpio = sinAcentos(atajo).replace(/^\/+/, "").replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "");
  return limpio ? "/" + limpio : "";
}

function numeroSeguro(x: unknown, porDefecto = 0): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : porDefecto;
}

function limpiarItems(items: PedidoItem[] | undefined): PedidoItem[] {
  return lista(items)
    .filter((it) => it && String(it.nombre || "").trim())
    .map((it) => ({
      ...it,
      nombre: String(it.nombre).trim(),
      cantidad: Math.max(1, Math.round(numeroSeguro(it.cantidad, 1))),
      precio: Math.max(0, numeroSeguro(it.precio, 0)),
    }));
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// "dd/mm/aaaa hh:mm" en la zona de la empresa (lo entiende el importador).
function fechaCsv(iso: string | undefined | null, zona: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = partesEnZona(d, zona);
  const [y, m, dd] = p.ymd.split("-");
  return `${dd}/${m}/${y} ${pad2(p.hora)}:${pad2(p.minuto)}`;
}

// Un momento seguro «fuera de horario» para el simulador del bot: el próximo
// domingo a las 3 de la mañana en la zona de la empresa (y si justo atiende
// a esa hora, la primera hora cerrada después).
export function momentoFueraDeHorario(horario: Horario | undefined, desde: Date = new Date()): Date {
  const h = horario || HORARIO_DEFAULT;
  const zona = h.zona || HORARIO_DEFAULT.zona;
  let candidato: Date | null = null;
  for (let i = 0; i <= 7 && !candidato; i++) {
    const d = new Date(desde.getTime() + i * DIA);
    const p = partesEnZona(d, zona);
    if (p.dia !== 0) continue;
    const t = d.getTime() - ((p.hora - 3) * 60 + p.minuto) * MIN;
    if (t > desde.getTime()) candidato = new Date(t);
  }
  const base = candidato || new Date(desde.getTime() + DIA);
  if (!estaAbierto(h, base)) return base;
  for (let i = 1; i <= 7 * 24; i++) {
    const c = new Date(base.getTime() + i * HORA);
    if (!estaAbierto(h, c)) return c;
  }
  return base;
}

// ============================================================
export class RepoLocal implements CrmRepo {
  readonly modo = "demo" as const;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendiente = false;
  private desuscribir: (() => void) | null = null;
  private escuchandoVentana = false;
  private silencio = false;

  // ---------- carga y guardado ----------
  async cargar(): Promise<void> {
    const guardado = leerGuardado();
    const datos = guardado || this.estadoInicial();
    this.hidratar(datos);
    this.escuchar();
    if (!guardado) this.programarGuardado();
  }

  async refrescar(): Promise<void> {
    // En demo no hay nada que traer: todo está en el navegador.
  }

  private hidratar(d: Guardado) {
    this.silencio = true;
    try {
      useCrm.getState().set({
        empresa: d.empresa,
        yo: d.yo,
        miembros: d.miembros,
        invitaciones: [],
        canales: d.canales,
        conversaciones: d.conversaciones,
        mensajes: d.mensajes,
        contactos: d.contactos,
        pedidos: d.pedidos,
        productos: d.productos,
        bot: completarBot(d.bot),
        plantillas: d.plantillas,
        rapidas: d.rapidas,
        equipo: d.equipo,
        api_keys: d.api_keys,
        actividad: d.actividad,
        listo: true,
        modo: "demo",
        error: null,
      });
    } finally {
      this.silencio = false;
    }
  }

  private escuchar() {
    if (typeof window === "undefined") return;
    this.desuscribir?.();
    this.desuscribir = useCrm.subscribe((s, prev) => {
      if (this.silencio || !s.listo || s.modo !== "demo") return;
      if (CLAVES_PERSISTIDAS.some((k) => s[k] !== prev[k])) this.programarGuardado();
    });
    if (this.escuchandoVentana) return;
    this.escuchandoVentana = true;
    // Al cerrar o esconder la pestaña se guarda lo que esté esperando el debounce.
    window.addEventListener("pagehide", () => this.guardarYa());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.guardarYa();
    });
    // Otra pestaña guardó: se toma su versión para no pisarla después.
    window.addEventListener("storage", (ev) => {
      if (ev.key !== CLAVE || !ev.newValue) return;
      try {
        const g = normalizarGuardado(JSON.parse(ev.newValue) as Partial<Guardado>);
        if (g) {
          if (this.timer) clearTimeout(this.timer);
          this.timer = null;
          this.pendiente = false;
          this.hidratar(g);
        }
      } catch {
        /* lo que escribió la otra pestaña no se entiende: se ignora */
      }
    });
  }

  private programarGuardado() {
    if (typeof window === "undefined") return;
    this.pendiente = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.guardarYa(), DEBOUNCE_MS);
  }

  private guardarYa() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.pendiente || typeof window === "undefined") return;
    const s = useCrm.getState();
    if (!s.listo || s.modo !== "demo" || !s.empresa || !s.yo) return;
    this.pendiente = false;
    const g: Guardado = {
      version: VERSION,
      empresa: s.empresa,
      yo: s.yo,
      miembros: s.miembros,
      canales: s.canales,
      conversaciones: s.conversaciones,
      mensajes: s.mensajes,
      contactos: s.contactos,
      pedidos: s.pedidos,
      productos: s.productos,
      bot: s.bot,
      plantillas: s.plantillas,
      rapidas: s.rapidas,
      equipo: s.equipo,
      api_keys: s.api_keys,
      actividad: s.actividad,
    };
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(g));
    } catch {
      try {
        window.localStorage.setItem(CLAVE, JSON.stringify({ ...g, mensajes: sinAdjuntos(g.mensajes) }));
      } catch (e) {
        console.warn("[clientany] No pude guardar la demo en este navegador (¿sin lugar?).", e);
      }
    }
  }

  private estadoInicial(): Guardado {
    const ahora = new Date();
    const iso = ahora.toISOString();
    const empresa_id = "local_empresa";
    const d = datosDePrueba(empresa_id, ahora, { yo: YO_DEMO });
    const empresa: Empresa = {
      id: empresa_id,
      nombre: "Lunar Cosmética",
      rubro: "Cosmética y skincare",
      pais: "Argentina",
      moneda: "ARS",
      plan: "prueba",
      prueba_hasta: new Date(ahora.getTime() + 14 * DIA).toISOString(),
      creado: iso,
      webhook_verify_token: tokenAleatorio(24),
      ia: {
        proveedor: "plataforma",
        clave_cargada: false,
        instrucciones:
          "Somos Lunar Cosmética, skincare argentino. Tono cálido y cercano, tuteando. Envío gratis desde $ 50.000; transferencia con 10% off; 3 cuotas sin interés con tarjeta.",
      },
      horario: copiar(HORARIO_DEFAULT),
      etapas: d.etapas,
      etiquetas: d.etiquetas,
    };
    const yo: Miembro = {
      id: YO_DEMO.id,
      empresa_id,
      nombre: YO_DEMO.nombre,
      email: "vos@lunarcosmetica.com.ar",
      rol: "admin",
      avatar: iniciales(YO_DEMO.nombre),
      ultimo_visto: iso,
      creado: iso,
    };
    const martina: Miembro = {
      id: MIEMBRO_DEMO.id,
      empresa_id,
      nombre: MIEMBRO_DEMO.nombre,
      email: MIEMBRO_DEMO.email,
      rol: "agente",
      avatar: iniciales(MIEMBRO_DEMO.nombre),
      ultimo_visto: new Date(ahora.getTime() - 12 * MIN).toISOString(),
      creado: new Date(ahora.getTime() - 60 * DIA).toISOString(),
    };
    const reglas: Regla[] = [
      {
        id: "demo_rg_envios",
        nombre: "Envíos",
        activa: true,
        palabras: ["envio", "envios", "envian", "mandan", "costo de envio", "hacen envios"],
        coincidencia: "contiene",
        respuesta:
          "Hacemos envíos a todo el país 📦 Por Andreani llega en 2 a 5 días hábiles y en AMBA por moto en el día si comprás antes de las 13. ¡El envío es gratis desde $ 50.000!",
        canales: [],
        solo_fuera_horario: false,
        una_vez_por_dia: true,
        orden: 0,
      },
      {
        id: "demo_rg_horarios",
        nombre: "Horarios",
        activa: true,
        palabras: ["horario", "horarios", "abren", "atienden", "showroom"],
        coincidencia: "contiene",
        respuesta: "Atendemos {horario}. El showroom está en Palermo y se visita con turno 😊",
        canales: [],
        solo_fuera_horario: false,
        una_vez_por_dia: false,
        orden: 1,
      },
    ];
    return {
      version: VERSION,
      empresa,
      yo,
      miembros: [yo, martina],
      canales: d.canales,
      conversaciones: d.conversaciones,
      mensajes: d.mensajes,
      contactos: d.contactos,
      pedidos: d.pedidos,
      productos: d.productos,
      bot: completarBot({ reglas }),
      plantillas: d.plantillas,
      rapidas: d.rapidas,
      equipo: d.equipo,
      api_keys: [],
      actividad: [
        { id: uid("ac"), empresa_id, quien: yo.nombre, que: "creó la cuenta de prueba de Lunar Cosmética", ref: null, creado: iso },
      ],
    };
  }

  // ---------- ayudas internas ----------
  private st(): CrmState {
    return useCrm.getState();
  }

  private empresa(): Empresa {
    const e = this.st().empresa;
    if (!e) throw new CrmError("El CRM todavía no terminó de cargar. Probá en un segundo.", "no_listo");
    return e;
  }

  private yo(): Miembro {
    const y = this.st().yo;
    if (!y) throw new CrmError("El CRM todavía no terminó de cargar. Probá en un segundo.", "no_listo");
    return y;
  }

  private conv(id: string): Conversacion {
    const c = this.st().conversaciones.find((x) => x.id === id);
    if (!c) throw new CrmError("No encuentro esa conversación (quizás la borraron).", "no_existe");
    return c;
  }

  private canal(id: string): Canal {
    const c = this.st().canales.find((x) => x.id === id);
    if (!c) throw new CrmError("No encuentro ese canal. Revisalo en Conexiones.", "no_existe");
    return c;
  }

  private guardarConv(c: Conversacion, patch: Partial<Conversacion>): Conversacion {
    const n: Conversacion = { ...c, ...patch, id: c.id, empresa_id: c.empresa_id, actualizado: ahoraIso() };
    this.st().setConversacion(n);
    return n;
  }

  private registrar(que: string, ref?: Actividad["ref"]) {
    const s = this.st();
    if (!s.empresa) return;
    const a: Actividad = {
      id: uid("ac"),
      empresa_id: s.empresa.id,
      quien: s.yo?.nombre || "Alguien",
      que,
      ref: ref ?? null,
      creado: ahoraIso(),
    };
    s.set({ actividad: [a, ...s.actividad].slice(0, MAX_ACTIVIDAD) });
  }

  private asegurarListaMensajes(convId: string) {
    if (!(convId in this.st().mensajes)) this.st().setMensajes(convId, []);
  }

  // Después de mandar algo una persona: el chat queda atendido.
  private trasSalienteHumano(c: Conversacion, m: Mensaje): Conversacion {
    return this.guardarConv(c, {
      ultimo_texto: previewMensaje(m.tipo, m.texto, m.media_nombre),
      ultimo_en: m.creado,
      ultimo_de: "agente",
      ultimo_saliente_humano_en: m.creado,
      visto_in: c.ultimo_entrante_en ?? c.visto_in ?? null,
      no_leidos: 0,
    });
  }

  private buscarConv(canalId: string, canalTipo: CanalTipo, identificador: string): Conversacion | undefined {
    const convs = this.st().conversaciones.filter((c) => c.canal_id === canalId);
    if (canalTipo === "whatsapp") {
      const cola = colaTelefono(identificador);
      return convs.find((c) => c.identificador === identificador || (cola.length >= 8 && colaTelefono(c.identificador) === cola));
    }
    return convs.find((c) => c.identificador === identificador);
  }

  // Busca el contacto del cliente en ese canal; si no está, lo crea.
  private contactoPara(canal: Canal, identificador: string, nombre?: string, contactoId?: string): Contacto {
    const s = this.st();
    const empresa = this.empresa();
    if (contactoId) {
      const c = s.contactos.find((x) => x.id === contactoId);
      if (c) return c;
    }
    const pareceTelefono = /^[+\d\s().-]{8,}$/.test(identificador);
    let c: Contacto | undefined;
    if (canal.tipo === "whatsapp" || (canal.tipo === "manual" && pareceTelefono)) {
      const cola = colaTelefono(identificador);
      if (cola.length >= 8) c = s.contactos.find((x) => colaTelefono(x.telefono) === cola);
    } else if (canal.tipo === "instagram") {
      const usuario = identificador.replace(/^@/, "");
      c = s.contactos.find((x) => x.ig_id === identificador || (!!x.ig_usuario && x.ig_usuario === usuario));
    } else if (canal.tipo === "messenger") {
      c = s.contactos.find((x) => x.psid === identificador);
    } else if (nombre) {
      const n = normalizarTexto(nombre);
      c = s.contactos.find((x) => normalizarTexto(x.nombre) === n);
    }
    if (c) return c;
    const ahora = ahoraIso();
    const esTel = canal.tipo === "whatsapp" || (canal.tipo === "manual" && pareceTelefono);
    const telefono = esTel ? normalizarTelefono(identificador) || undefined : undefined;
    const nuevo: Contacto = {
      id: uid("ct"),
      empresa_id: empresa.id,
      nombre: (nombre || "").trim() || (telefono ? telefonoLindo(telefono) : identificador) || "Sin nombre",
      telefono,
      ig_id: canal.tipo === "instagram" ? identificador : undefined,
      ig_usuario: canal.tipo === "instagram" && identificador.startsWith("@") ? identificador.slice(1) : undefined,
      psid: canal.tipo === "messenger" ? identificador : undefined,
      etiquetas: [],
      origen: canal.tipo,
      marca_id: canal.marca_id,
      creado: ahora,
      actualizado: ahora,
    };
    s.set({ contactos: [nuevo, ...s.contactos] });
    return nuevo;
  }

  private crearConv(canal: Canal, contacto: Contacto, identificador: string, nombre?: string): Conversacion {
    const ahora = ahoraIso();
    const c: Conversacion = {
      id: uid("cv"),
      empresa_id: this.empresa().id,
      canal_id: canal.id,
      canal: canal.tipo,
      contacto_id: contacto.id,
      identificador,
      nombre: (nombre || "").trim() || contacto.nombre,
      marca_id: canal.marca_id ?? contacto.marca_id,
      ultimo_texto: "",
      ultimo_en: ahora,
      ultimo_de: "sistema",
      no_leidos: 0,
      grupo: null,
      etapa_id: null,
      etiquetas: [...(contacto.etiquetas || [])],
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
    this.st().setConversacion(c);
    this.st().setMensajes(c.id, []);
    return c;
  }

  // Ata el pedido a un contacto por teléfono o mail; si no existe, lo crea.
  // Trabaja sobre la lista que recibe (para importar en lote sin pisarse).
  private atarContacto(p: Pedido, contactos: Contacto[], origen: Contacto["origen"]): { pedido: Pedido; contactos: Contacto[] } {
    if (p.contacto_id && contactos.some((c) => c.id === p.contacto_id)) return { pedido: p, contactos };
    const cola = colaTelefono(p.telefono);
    const mail = (p.email || "").trim().toLowerCase();
    let c = contactos.find(
      (x) => (cola.length >= 8 && colaTelefono(x.telefono) === cola) || (!!mail && (x.email || "").toLowerCase() === mail)
    );
    if (!c && (cola.length >= 8 || mail)) {
      const ahora = ahoraIso();
      c = {
        id: uid("ct"),
        empresa_id: p.empresa_id,
        nombre: p.nombre || mail || telefonoLindo(p.telefono) || "Sin nombre",
        telefono: p.telefono || undefined,
        email: mail || undefined,
        direccion: p.envio?.direccion,
        localidad: p.envio?.localidad,
        provincia: p.envio?.provincia,
        cp: p.envio?.cp,
        etiquetas: [],
        origen,
        marca_id: p.marca_id,
        creado: ahora,
        actualizado: ahora,
      };
      contactos = [c, ...contactos];
    }
    return { pedido: { ...p, contacto_id: c?.id ?? null }, contactos };
  }

  // ---------- empresa y datos de prueba ----------
  async actualizarEmpresa(patch: Partial<Empresa>): Promise<Empresa> {
    const actual = this.empresa();
    const extra = patch as Partial<Empresa> & { ia_clave?: string };
    const { ia_clave, ...resto } = extra;
    if (resto.nombre !== undefined && !resto.nombre.trim()) throw new CrmError("Poné el nombre de la empresa.");
    if (resto.webhook_salida_url && !/^https:\/\//i.test(resto.webhook_salida_url.trim())) {
      throw new CrmError("La URL de aviso tiene que empezar con https://");
    }
    const ia = { ...actual.ia, ...(resto.ia || {}) };
    if (ia_clave !== undefined) ia.clave_cargada = !!ia_clave.trim(); // en demo la clave no se guarda nunca
    const nueva: Empresa = {
      ...actual,
      ...resto,
      id: actual.id,
      nombre: (resto.nombre ?? actual.nombre).trim(),
      ia,
      horario: resto.horario || actual.horario,
      etapas: resto.etapas || actual.etapas,
      etiquetas: resto.etiquetas || actual.etiquetas,
    };
    this.st().set({ empresa: nueva });
    this.registrar("actualizó los datos de la empresa");
    return nueva;
  }

  async cargarDatosDePrueba(): Promise<void> {
    const s = this.st();
    const empresa = this.empresa();
    const yo = this.yo();
    const d = datosDePrueba(empresa.id, new Date(), { yo: { id: yo.id, nombre: yo.nombre } });
    const idsCanales = new Set(s.canales.map((c) => c.id));
    const idsEtapas = new Set(empresa.etapas.map((e) => e.id));
    const idsEtiquetas = new Set(empresa.etiquetas.map((e) => e.id));
    s.set({
      contactos: d.contactos,
      conversaciones: d.conversaciones,
      mensajes: d.mensajes,
      pedidos: d.pedidos,
      productos: d.productos,
      equipo: d.equipo,
      // Los chats de prueba apuntan a los canales, etapas y etiquetas de
      // prueba: se suman los que falten (lo propio se conserva).
      canales: [...s.canales, ...d.canales.filter((c) => !idsCanales.has(c.id))],
      empresa: {
        ...empresa,
        etapas: [...empresa.etapas, ...d.etapas.filter((e) => !idsEtapas.has(e.id))],
        etiquetas: [...empresa.etiquetas, ...d.etiquetas.filter((e) => !idsEtiquetas.has(e.id))],
      },
      plantillas: [...s.plantillas.filter((p) => !p.id.startsWith("demo_")), ...d.plantillas],
      rapidas: [...s.rapidas.filter((r) => !r.id.startsWith("demo_")), ...d.rapidas],
    });
    this.registrar("cargó los datos de prueba");
  }

  async vaciarDatosDePrueba(): Promise<void> {
    this.st().set({ conversaciones: [], mensajes: {}, contactos: [], pedidos: [], productos: [], equipo: [] });
    this.registrar("vació los datos de prueba");
  }

  // ---------- equipo ----------
  async invitarMiembro(input: { email: string; nombre?: string; rol: Rol }): Promise<{ miembro?: Miembro; invitacion?: Invitacion }> {
    const email = (input.email || "").trim().toLowerCase();
    if (!emailValido(email)) throw new CrmError("Ese mail no parece válido.");
    const s = this.st();
    if (s.miembros.some((m) => m.email.toLowerCase() === email)) throw new CrmError("Esa persona ya está en el equipo.", "duplicado");
    const nombre = (input.nombre || "").trim() || email.split("@")[0];
    const miembro: Miembro = {
      id: uid("mb"),
      empresa_id: this.empresa().id,
      nombre,
      email,
      rol: input.rol === "admin" ? "admin" : "agente",
      avatar: iniciales(nombre),
      creado: ahoraIso(),
    };
    s.set({ miembros: [...s.miembros, miembro] });
    this.registrar(`sumó a ${nombre} al equipo`);
    return { miembro };
  }

  async actualizarMiembro(id: string, patch: Partial<Pick<Miembro, "rol" | "nombre">>): Promise<Miembro> {
    const s = this.st();
    const m = s.miembros.find((x) => x.id === id);
    if (!m) throw new CrmError("No encuentro a esa persona en el equipo.", "no_existe");
    if (patch.nombre !== undefined && !patch.nombre.trim()) throw new CrmError("Poné un nombre.");
    if (patch.rol === "agente" && m.rol === "admin" && s.miembros.filter((x) => x.rol === "admin").length <= 1) {
      throw new CrmError("Tiene que quedar al menos una persona administradora.");
    }
    const n: Miembro = {
      ...m,
      ...(patch.nombre !== undefined ? { nombre: patch.nombre.trim(), avatar: iniciales(patch.nombre) } : {}),
      ...(patch.rol ? { rol: patch.rol } : {}),
    };
    s.set({ miembros: s.miembros.map((x) => (x.id === id ? n : x)), ...(s.yo?.id === id ? { yo: n } : {}) });
    if (patch.rol && patch.rol !== m.rol) this.registrar(`cambió el rol de ${n.nombre} a ${n.rol === "admin" ? "administración" : "agente"}`);
    else if (patch.nombre && patch.nombre.trim() !== m.nombre) this.registrar(`renombró a ${m.nombre} como ${n.nombre}`);
    return n;
  }

  async quitarMiembro(id: string): Promise<void> {
    const s = this.st();
    if (s.yo?.id === id) throw new CrmError("No podés sacarte a vos del equipo.");
    const m = s.miembros.find((x) => x.id === id);
    if (!m) return;
    s.set({
      miembros: s.miembros.filter((x) => x.id !== id),
      conversaciones: s.conversaciones.map((c) =>
        c.asignado_a === id || c.tomado_por?.quien === id
          ? {
              ...c,
              asignado_a: c.asignado_a === id ? null : c.asignado_a,
              tomado_por: c.tomado_por?.quien === id ? null : c.tomado_por,
              actualizado: ahoraIso(),
            }
          : c
      ),
    });
    this.registrar(`sacó a ${m.nombre} del equipo`);
  }

  async cancelarInvitacion(id: string): Promise<void> {
    const s = this.st();
    s.set({ invitaciones: s.invitaciones.filter((i) => i.id !== id) });
  }

  async pulso(): Promise<void> {
    const s = this.st();
    if (!s.yo) return;
    const yo: Miembro = { ...s.yo, ultimo_visto: ahoraIso() };
    s.set({ yo, miembros: s.miembros.map((m) => (m.id === yo.id ? yo : m)) });
  }

  // ---------- canales ----------
  async conectarCanal(input: ConectarCanalInput): Promise<Canal> {
    const s = this.st();
    const empresa = this.empresa();
    const tipo = input.tipo;
    const externo =
      tipo === "whatsapp"
        ? input.phone_number_id
        : tipo === "instagram"
          ? input.ig_user_id
          : tipo === "messenger"
            ? input.page_id
            : "manual";
    const externo_id = (externo || "").trim() || (tipo === "manual" ? "manual" : `demo_${tipo}_${tokenAleatorio(10)}`);
    const nombrePorDefecto = { whatsapp: "WhatsApp", instagram: "Instagram", messenger: empresa.nombre, manual: "Manual" }[tipo];
    const nombre = (input.nombre || "").trim() || nombrePorDefecto;
    const detalle: Canal["detalle"] =
      tipo === "whatsapp"
        ? { numero_visible: nombre, nombre_verificado: empresa.nombre, calidad: "GREEN" }
        : tipo === "instagram"
          ? { usuario_ig: nombre.replace(/^@/, ""), nombre_pagina: empresa.nombre }
          : tipo === "messenger"
            ? { nombre_pagina: nombre }
            : {};
    const existente = tipo === "manual" ? undefined : s.canales.find((c) => c.tipo === tipo && c.externo_id === externo_id);
    const canal: Canal = {
      ...(existente || {}),
      id: existente?.id || uid("cn"),
      empresa_id: empresa.id,
      tipo,
      nombre,
      marca_id: input.marca_id ?? existente?.marca_id,
      estado: "conectado",
      externo_id,
      waba_id: input.waba_id || existente?.waba_id,
      page_id: input.page_id || existente?.page_id,
      token_cargado: !!input.token || !!existente?.token_cargado,
      app_secret_cargado: !!input.app_secret || !!existente?.app_secret_cargado,
      ultimo_error: undefined,
      conectado_en: ahoraIso(),
      detalle,
      api_version: input.api_version || existente?.api_version || "v21.0",
    };
    s.set({ canales: existente ? s.canales.map((c) => (c.id === canal.id ? canal : c)) : [...s.canales, canal] });
    this.registrar(`conectó ${tipo === "whatsapp" ? "WhatsApp" : tipo === "instagram" ? "Instagram" : tipo === "messenger" ? "Messenger" : "un canal manual"} (${nombre})`);
    return canal;
  }

  async probarCanal(id: string): Promise<{ ok: boolean; detalle?: Canal["detalle"]; error?: string }> {
    const c = this.canal(id);
    const s = this.st();
    if (c.estado !== "conectado" || c.ultimo_error) {
      s.set({ canales: s.canales.map((x) => (x.id === id ? { ...x, estado: "conectado", ultimo_error: undefined } : x)) });
    }
    return { ok: true, detalle: c.detalle };
  }

  async desconectarCanal(id: string): Promise<void> {
    const s = this.st();
    const c = s.canales.find((x) => x.id === id);
    if (!c) return;
    // Las conversaciones quedan: se pueden seguir leyendo.
    s.set({ canales: s.canales.filter((x) => x.id !== id) });
    this.registrar(`desconectó el canal ${c.nombre}`);
  }

  // ---------- bandeja y chat ----------
  async cargarMensajes(convId: string): Promise<Mensaje[]> {
    const actuales = this.st().mensajes[convId];
    const l = [...(actuales || [])].sort(porFecha);
    // Sólo se toca el store si no estaba la lista o estaba desordenada.
    if (!actuales || l.some((m, i) => m !== actuales[i])) this.st().setMensajes(convId, l);
    return l;
  }

  async enviarTexto(convId: string, texto: string, opciones?: { cita_id?: string }): Promise<Mensaje> {
    const t = (texto || "").trim();
    if (!t) throw new CrmError("Escribí algo antes de mandar.");
    const c = this.conv(convId);
    if (c.canal === "whatsapp" && t.length > LIMITE_TEXTO_WHATSAPP) {
      throw new CrmError(`El mensaje es muy largo para WhatsApp (hasta ${LIMITE_TEXTO_WHATSAPP} caracteres).`);
    }
    // En demo no se exige la ventana de 24 hs (no sale nada de verdad);
    // `horasDeVentana` sigue informando en la pantalla.
    const m: Mensaje = {
      id: uid("ms"),
      empresa_id: c.empresa_id,
      conversacion_id: c.id,
      direccion: "out",
      de: "agente",
      autor: this.yo().nombre,
      tipo: "texto",
      texto: t,
      estado: "enviado",
      cita_id: opciones?.cita_id,
      creado: ahoraIso(),
    };
    this.asegurarListaMensajes(c.id);
    this.st().agregarMensaje(m);
    this.trasSalienteHumano(c, m);
    return m;
  }

  async enviarPlantilla(convId: string, plantilla: { nombre: string; idioma?: string; parametros: string[] }): Promise<Mensaje> {
    const c = this.conv(convId);
    const s = this.st();
    const candidatas = s.plantillas.filter((p) => p.nombre === plantilla.nombre);
    const p =
      candidatas.find((x) => x.canal_id === c.canal_id && (!plantilla.idioma || x.idioma === plantilla.idioma)) ||
      candidatas.find((x) => !plantilla.idioma || x.idioma === plantilla.idioma) ||
      candidatas[0];
    if (!p) throw new CrmError(`No encuentro la plantilla «${plantilla.nombre}».`, "no_existe");
    if (p.estado === "pendiente") throw new CrmError(`La plantilla «${p.nombre}» todavía está en revisión de Meta: no se puede mandar.`);
    if (p.estado === "rechazada") throw new CrmError(`Meta rechazó la plantilla «${p.nombre}»: editala y volvé a mandarla a revisión.`);
    const parametros = (plantilla.parametros || []).map((x) => String(x ?? ""));
    const texto = llenarPlantilla(p.cuerpo, parametros);
    if (/\{\{\d+\}\}/.test(texto)) {
      throw new CrmError(`La plantilla «${p.nombre}» pide ${p.variables || contarVariables(p.cuerpo)} dato(s): completalos todos.`);
    }
    const m: Mensaje = {
      id: uid("ms"),
      empresa_id: c.empresa_id,
      conversacion_id: c.id,
      direccion: "out",
      de: "agente",
      autor: this.yo().nombre,
      tipo: "plantilla",
      plantilla: p.nombre,
      texto,
      estado: "enviado",
      creado: ahoraIso(),
    };
    this.asegurarListaMensajes(c.id);
    s.agregarMensaje(m);
    this.trasSalienteHumano(c, m);
    return m;
  }

  async enviarArchivo(convId: string, archivo: File, texto?: string): Promise<Mensaje> {
    const c = this.conv(convId);
    if (!archivo) throw new CrmError("Elegí un archivo.");
    if (archivo.size > MAX_ADJUNTO) throw new CrmError("En modo demo los adjuntos van hasta 1,5 MB", "muy_grande");
    const url = await leerComoDataUrl(archivo);
    const mime = archivo.type || "application/octet-stream";
    const m: Mensaje = {
      id: uid("ms"),
      empresa_id: c.empresa_id,
      conversacion_id: c.id,
      direccion: "out",
      de: "agente",
      autor: this.yo().nombre,
      tipo: tipoPorMime(mime),
      texto: (texto || "").trim(),
      media_url: url,
      media_nombre: archivo.name || "archivo",
      media_mime: mime,
      estado: "enviado",
      creado: ahoraIso(),
    };
    this.asegurarListaMensajes(c.id);
    this.st().agregarMensaje(m);
    // Releo la conversación: mientras se leía el archivo pudo cambiar.
    this.trasSalienteHumano(this.conv(convId), m);
    return m;
  }

  async marcarLeido(convId: string): Promise<void> {
    const c = this.st().conversaciones.find((x) => x.id === convId);
    if (!c || !c.no_leidos) return;
    this.guardarConv(c, { no_leidos: 0 });
  }

  async accion(convId: string, accion: AccionConversacion): Promise<Conversacion> {
    const c = this.conv(convId);
    const yo = this.yo();
    const empresa = this.empresa();
    const quien = c.nombre || "un cliente";
    const ref = { tipo: "conversacion", id: c.id };
    const ahora = ahoraIso();
    const visto = c.ultimo_entrante_en ?? c.visto_in ?? null;
    let patch: Partial<Conversacion> = {};
    let que = "";
    switch (accion.tipo) {
      case "respondido":
        patch = { visto_in: visto, necesita_humano: false, fuera_horario: false };
        que = `marcó como respondido el chat de ${quien}`;
        break;
      case "grupo": {
        const g = accion.grupo ?? null;
        patch = { grupo: g };
        if (g === "resueltos") patch.visto_in = visto;
        if (g === "baja") patch.baja = true; // la bandeja de Baja se decide por `baja`
        const nombreGrupo = GRUPOS.find((x) => x.id === g)?.nombre;
        que = nombreGrupo ? `movió el chat de ${quien} a ${nombreGrupo}` : `devolvió el chat de ${quien} a la bandeja automática`;
        break;
      }
      case "resolver":
        patch = { grupo: "resueltos", visto_in: visto, recordar: null, necesita_humano: false, fuera_horario: false };
        que = `resolvió el chat de ${quien}`;
        break;
      case "reabrir":
        patch = { grupo: null };
        que = `reabrió el chat de ${quien}`;
        break;
      case "recordar":
        if (accion.fecha) {
          if (isNaN(new Date(accion.fecha).getTime())) throw new CrmError("Esa fecha no se entiende. Elegí otra.");
          patch = {
            recordar: { fecha: accion.fecha, nota: (accion.nota || "").trim() || undefined, quien: yo.nombre, puesto: ahora },
            grupo: "mas_adelante",
          };
          que = `pospuso el chat de ${quien} hasta el ${fechaCorta(accion.fecha, empresa.horario?.zona)}`;
        } else {
          patch = { recordar: null, grupo: null };
          que = `sacó el recordatorio del chat de ${quien}`;
        }
        break;
      case "tomar":
        patch = { tomado_por: { quien: yo.id, nombre: yo.nombre, cuando: ahora } };
        que = `tomó el chat de ${quien}`;
        break;
      case "soltar":
        patch = { tomado_por: null };
        que = `soltó el chat de ${quien}`;
        break;
      case "baja":
        patch = { baja: accion.valor };
        if (accion.valor) patch.grupo = "baja";
        else if (c.grupo === "baja") patch.grupo = null;
        que = accion.valor ? `dio de baja a ${quien} (no recibe más automáticos)` : `sacó de Baja a ${quien}`;
        break;
      case "asignar": {
        const m = accion.miembro_id ? this.st().miembros.find((x) => x.id === accion.miembro_id) : null;
        if (accion.miembro_id && !m) throw new CrmError("No encuentro a esa persona en el equipo.", "no_existe");
        patch = { asignado_a: accion.miembro_id || null };
        que = m ? `le asignó el chat de ${quien} a ${m.id === yo.id ? "sí mismo/a" : m.nombre}` : `sacó la asignación del chat de ${quien}`;
        break;
      }
      case "urgente":
        patch = { urgente: !!accion.valor };
        que = accion.valor ? `marcó urgente el chat de ${quien}` : `sacó la marca de urgente del chat de ${quien}`;
        break;
      case "etapa": {
        const et = accion.etapa_id ? empresa.etapas.find((x) => x.id === accion.etapa_id) : null;
        if (accion.etapa_id && !et) throw new CrmError("Esa etapa ya no existe. Revisá el embudo.", "no_existe");
        patch = { etapa_id: accion.etapa_id || null };
        que = et ? `pasó a ${quien} a la etapa «${et.nombre}»` : `sacó de la etapa al chat de ${quien}`;
        break;
      }
      case "etiquetas": {
        const ids = Array.from(new Set(accion.etiquetas || []));
        patch = { etiquetas: ids };
        const nombres = ids.map((id) => empresa.etiquetas.find((x) => x.id === id)?.nombre).filter(Boolean);
        que = nombres.length ? `le puso las etiquetas ${nombres.join(", ")} al chat de ${quien}` : `sacó las etiquetas del chat de ${quien}`;
        break;
      }
      case "nota": {
        const nota = (accion.nota || "").trim();
        patch = { nota: nota || undefined };
        que = nota ? `dejó una nota interna en el chat de ${quien}` : `borró la nota interna del chat de ${quien}`;
        break;
      }
      case "humano_atendido":
        patch = { necesita_humano: false };
        que = `atendió el pedido de una persona en el chat de ${quien}`;
        break;
      case "pedido": {
        const p = accion.pedido_id ? this.st().pedidos.find((x) => x.id === accion.pedido_id) : null;
        if (accion.pedido_id && !p) throw new CrmError("No encuentro ese pedido.", "no_existe");
        patch = { pedido_id: accion.pedido_id || null };
        que = p ? `ató el pedido ${p.numero} al chat de ${quien}` : `desató el pedido del chat de ${quien}`;
        break;
      }
      case "nombre": {
        const nombre = (accion.nombre || "").trim();
        if (!nombre) throw new CrmError("Poné un nombre.");
        patch = { nombre };
        if (c.contacto_id) {
          const s = this.st();
          s.set({
            contactos: s.contactos.map((x) => (x.id === c.contacto_id ? { ...x, nombre, actualizado: ahora } : x)),
          });
        }
        que = `renombró a ${quien} como ${nombre}`;
        break;
      }
      default: {
        const nunca: never = accion;
        throw new CrmError(`No conozco esa acción (${String((nunca as { tipo?: string }).tipo)}).`);
      }
    }
    const n = this.guardarConv(c, patch);
    this.registrar(que, ref);
    return n;
  }

  async nuevaConversacion(input: NuevaConversacionInput): Promise<Conversacion> {
    const canal = this.canal(input.canal_id);
    const crudo = (input.identificador || "").trim();
    const identificador = canal.tipo === "whatsapp" ? normalizarTelefono(crudo) : crudo;
    if (!identificador) {
      throw new CrmError(
        canal.tipo === "whatsapp"
          ? "Ese teléfono no parece válido. Probá con el código de área, por ejemplo 11 5555 1234."
          : "Falta a quién escribirle."
      );
    }
    if (canal.tipo === "whatsapp" && identificador.length < 10) {
      throw new CrmError("Ese teléfono es muy corto. Probá con el código de área, por ejemplo 11 5555 1234.");
    }
    let conv = this.buscarConv(canal.id, canal.tipo, identificador);
    if (!conv) {
      const contacto = this.contactoPara(canal, identificador, input.nombre, input.contacto_id);
      conv = this.crearConv(canal, contacto, identificador, input.nombre);
      this.registrar(`abrió un chat con ${conv.nombre}`, { tipo: "conversacion", id: conv.id });
    }
    if (input.plantilla) await this.enviarPlantilla(conv.id, input.plantilla);
    else if ((input.texto || "").trim()) await this.enviarTexto(conv.id, input.texto as string);
    return this.conv(conv.id);
  }

  async borrarConversacion(convId: string): Promise<void> {
    const s = this.st();
    const c = s.conversaciones.find((x) => x.id === convId);
    if (!c) return;
    const mensajes = { ...s.mensajes };
    delete mensajes[convId];
    s.set({ conversaciones: s.conversaciones.filter((x) => x.id !== convId), mensajes });
    this.registrar(`borró el chat de ${c.nombre}`);
  }

  async borrarMensaje(convId: string, mensajeId: string): Promise<void> {
    const s = this.st();
    const restantes = (s.mensajes[convId] || []).filter((m) => m.id !== mensajeId).sort(porFecha);
    s.setMensajes(convId, restantes);
    const c = s.conversaciones.find((x) => x.id === convId);
    if (!c) return;
    // Recalcula el «último» del chat con lo que quedó.
    const ultimo = restantes[restantes.length - 1];
    const ultimoIn = [...restantes].reverse().find((m) => m.direccion === "in");
    const ultimoHumano = [...restantes].reverse().find((m) => m.de === "agente");
    this.guardarConv(c, {
      ultimo_texto: ultimo ? previewMensaje(ultimo.tipo, ultimo.texto, ultimo.media_nombre) : "",
      ultimo_en: ultimo?.creado || c.ultimo_en,
      ultimo_de: ultimo?.de || c.ultimo_de,
      ultimo_entrante_en: ultimoIn?.creado,
      ultimo_saliente_humano_en: ultimoHumano?.creado,
    });
  }

  private canalParaSimular(input: SimularEntranteInput): Canal {
    const s = this.st();
    if (input.canal_id) return this.canal(input.canal_id);
    const porTipo = input.canal_tipo ? s.canales.find((c) => c.tipo === input.canal_tipo) : undefined;
    if (porTipo) return porTipo;
    if (s.canales[0]) return s.canales[0];
    const manual: Canal = {
      id: uid("cn"),
      empresa_id: this.empresa().id,
      tipo: "manual",
      nombre: "Manual",
      estado: "conectado",
      externo_id: "manual",
      token_cargado: false,
      app_secret_cargado: false,
      conectado_en: ahoraIso(),
      detalle: {},
    };
    s.set({ canales: [...s.canales, manual] });
    return manual;
  }

  async simularEntrante(input: SimularEntranteInput): Promise<{ conversacion: Conversacion; mensaje: Mensaje; bot: BotResultado }> {
    const texto = (input.texto || "").trim();
    if (!texto) throw new CrmError("Escribí qué diría el cliente.");
    const empresa = this.empresa();
    const canal = this.canalParaSimular(input);
    let identificador = (input.identificador || "").trim();
    if (canal.tipo === "whatsapp") {
      identificador = normalizarTelefono(identificador) || "54911" + digitosAzar(8);
    } else if (!identificador) {
      identificador = canal.tipo === "manual" ? `cliente-${tokenAleatorio(6)}` : `demo_${canal.tipo}_${tokenAleatorio(8)}`;
    }
    const nombre = (input.nombre || "").trim() || undefined;
    let conv = this.buscarConv(canal.id, canal.tipo, identificador);
    const esNueva = !conv;
    const contacto = conv
      ? this.st().contactos.find((x) => x.id === conv!.contacto_id) || this.contactoPara(canal, identificador, nombre)
      : this.contactoPara(canal, identificador, nombre || (canal.tipo === "whatsapp" ? telefonoLindo(identificador) : "Cliente de prueba"));
    if (!conv) conv = this.crearConv(canal, contacto, identificador, nombre || contacto.nombre);

    const ahora = new Date();
    const mensaje: Mensaje = {
      id: uid("ms"),
      empresa_id: empresa.id,
      conversacion_id: conv.id,
      direccion: "in",
      de: "cliente",
      tipo: "texto",
      texto,
      estado: "entregado",
      creado: ahora.toISOString(),
    };
    this.asegurarListaMensajes(conv.id);
    this.st().agregarMensaje(mensaje);
    let actual = this.guardarConv(conv, {
      ultimo_texto: previewMensaje("texto", texto),
      ultimo_en: mensaje.creado,
      ultimo_de: "cliente",
      ultimo_entrante_en: mensaje.creado,
      no_leidos: (conv.no_leidos || 0) + 1,
      // Como el webhook: si escribe con el negocio abierto, ya no espera la apertura.
      ...(estaAbierto(empresa.horario, ahora) ? { fuera_horario: false } : {}),
    });

    const s = this.st();
    const resultado = evaluarBot({
      empresa,
      bot: s.bot,
      conv: actual,
      contacto,
      texto,
      esPrimerMensaje: esNueva,
      productos: s.productos,
      pedidos: s.pedidos,
      ahora,
    });
    let t = ahora.getTime();
    let ultimoBot: Mensaje | null = null;
    for (const r of resultado.respuestas) {
      t += 1; // un milisegundo después, para que queden en orden
      const mb: Mensaje = {
        id: uid("ms"),
        empresa_id: empresa.id,
        conversacion_id: actual.id,
        direccion: "out",
        de: "bot",
        autor: "Bot",
        tipo: "texto",
        texto: r.texto,
        estado: "enviado",
        creado: new Date(t).toISOString(),
      };
      this.st().agregarMensaje(mb);
      ultimoBot = mb;
    }
    actual = this.guardarConv(this.conv(actual.id), {
      ...resultado.cambios,
      ...(ultimoBot
        ? { ultimo_texto: previewMensaje("texto", ultimoBot.texto), ultimo_en: ultimoBot.creado, ultimo_de: "bot" as const }
        : {}),
    });
    return { conversacion: actual, mensaje, bot: resultado };
  }

  async buscar(q: string): Promise<{ conversaciones: Conversacion[]; contactos: Contacto[]; pedidos: Pedido[] }> {
    const t = normalizarTexto(q || "");
    if (!t) return { conversaciones: [], contactos: [], pedidos: [] };
    const digitos = (q || "").replace(/\D/g, "");
    const porTel = (tel?: string | null) => digitos.length >= 4 && (tel || "").replace(/\D/g, "").includes(digitos);
    const s = this.st();
    const conversaciones = s.conversaciones
      .filter(
        (c) =>
          normalizarTexto(`${c.nombre} ${c.identificador} ${c.ultimo_texto} ${c.nota || ""}`).includes(t) ||
          porTel(c.identificador) ||
          (s.mensajes[c.id] || []).some((m) => normalizarTexto(`${m.texto} ${m.media_nombre || ""}`).includes(t))
      )
      .sort((a, b) => new Date(b.ultimo_en).getTime() - new Date(a.ultimo_en).getTime());
    const contactos = s.contactos.filter(
      (c) => normalizarTexto(`${c.nombre} ${c.telefono || ""} ${c.email || ""}`).includes(t) || porTel(c.telefono)
    );
    const pedidos = s.pedidos
      .filter((p) => normalizarTexto(`${p.numero} ${p.nombre} ${p.email || ""}`).includes(t) || porTel(p.telefono))
      .sort(porFecha)
      .reverse();
    return { conversaciones, contactos, pedidos };
  }

  // ---------- contactos ----------
  async guardarContacto(c: Partial<Contacto> & { nombre: string }): Promise<Contacto> {
    const s = this.st();
    const empresa = this.empresa();
    const nombre = (c.nombre || "").trim();
    if (!nombre) throw new CrmError("Poné el nombre del contacto.");
    const existente = c.id ? s.contactos.find((x) => x.id === c.id) : undefined;
    const telefono = c.telefono !== undefined ? normalizarTelefono(c.telefono) || undefined : existente?.telefono;
    const email = c.email !== undefined ? (c.email || "").trim().toLowerCase() || undefined : existente?.email;
    if (email && !emailValido(email)) throw new CrmError("Ese mail no parece válido.");
    const ahora = ahoraIso();
    const nuevo: Contacto = {
      ...(existente || {}),
      ...c,
      id: c.id || uid("ct"),
      empresa_id: empresa.id,
      nombre,
      telefono,
      email,
      etiquetas: c.etiquetas ?? existente?.etiquetas ?? [],
      origen: c.origen ?? existente?.origen ?? "manual",
      creado: existente?.creado ?? c.creado ?? ahora,
      actualizado: ahora,
    };
    const renombrado = !!existente && existente.nombre !== nombre;
    s.set({
      contactos: existente ? s.contactos.map((x) => (x.id === nuevo.id ? nuevo : x)) : [nuevo, ...s.contactos],
      ...(renombrado
        ? {
            conversaciones: s.conversaciones.map((cv) =>
              cv.contacto_id === nuevo.id && cv.nombre === existente!.nombre ? { ...cv, nombre, actualizado: ahora } : cv
            ),
          }
        : {}),
    });
    this.registrar(existente ? `editó el contacto ${nombre}` : `cargó el contacto ${nombre}`, { tipo: "contacto", id: nuevo.id });
    return nuevo;
  }

  async borrarContacto(id: string): Promise<void> {
    const s = this.st();
    const c = s.contactos.find((x) => x.id === id);
    if (!c) return;
    s.set({
      contactos: s.contactos.filter((x) => x.id !== id),
      pedidos: s.pedidos.map((p) => (p.contacto_id === id ? { ...p, contacto_id: null } : p)),
    });
    this.registrar(`borró el contacto ${c.nombre}`);
  }

  async importarContactos(entrada: Contacto[]): Promise<{ nuevos: number; actualizados: number }> {
    const empresa = this.empresa();
    let contactos = [...this.st().contactos];
    let nuevos = 0;
    let actualizados = 0;
    const ahora = ahoraIso();
    for (const x of lista(entrada)) {
      const telefono = normalizarTelefono(x.telefono) || undefined;
      const email = (x.email || "").trim().toLowerCase() || undefined;
      const nombre = (x.nombre || "").trim();
      if (!nombre && !telefono && !email) continue;
      const cola = colaTelefono(telefono);
      const i = contactos.findIndex(
        (c) => (cola.length >= 8 && colaTelefono(c.telefono) === cola) || (!!email && (c.email || "").toLowerCase() === email)
      );
      if (i >= 0) {
        const viejo = contactos[i];
        // Completa con lo que trae el archivo, sin borrar lo que ya había.
        const definido = Object.fromEntries(
          Object.entries(x).filter(([k, v]) => v !== undefined && v !== null && v !== "" && !["id", "empresa_id", "creado", "etiquetas", "origen"].includes(k))
        ) as Partial<Contacto>;
        contactos[i] = {
          ...viejo,
          ...definido,
          nombre: nombre || viejo.nombre,
          telefono: telefono || viejo.telefono,
          email: email || viejo.email,
          etiquetas: Array.from(new Set([...(viejo.etiquetas || []), ...lista(x.etiquetas)])),
          actualizado: ahora,
        };
        actualizados += 1;
      } else {
        contactos = [
          {
            ...x,
            id: x.id || uid("ct"),
            empresa_id: empresa.id,
            nombre: nombre || email || telefonoLindo(telefono) || "Sin nombre",
            telefono,
            email,
            etiquetas: lista(x.etiquetas),
            origen: x.origen || "csv",
            creado: x.creado || ahora,
            actualizado: ahora,
          },
          ...contactos,
        ];
        nuevos += 1;
      }
    }
    this.st().set({ contactos });
    if (nuevos || actualizados) this.registrar(`importó contactos (${nuevos} nuevos, ${actualizados} actualizados)`);
    return { nuevos, actualizados };
  }

  // ---------- pedidos ----------
  async guardarPedido(p: Partial<Pedido> & { numero: string; nombre: string }): Promise<Pedido> {
    const s = this.st();
    const empresa = this.empresa();
    const numero = (p.numero || "").trim();
    const nombre = (p.nombre || "").trim();
    if (!numero) throw new CrmError("Poné el número del pedido.");
    if (!nombre) throw new CrmError("Poné el nombre del cliente.");
    const existente = p.id ? s.pedidos.find((x) => x.id === p.id) : undefined;
    const id = p.id || uid("pd");
    if (s.pedidos.some((x) => x.id !== id && x.numero.trim().toLowerCase() === numero.toLowerCase())) {
      throw new CrmError(`Ya hay otro pedido con el número ${numero}.`, "duplicado");
    }
    const email = p.email !== undefined ? (p.email || "").trim().toLowerCase() || undefined : existente?.email;
    if (email && !emailValido(email)) throw new CrmError("Ese mail no parece válido.");
    const telefono = p.telefono !== undefined ? normalizarTelefono(p.telefono) || undefined : existente?.telefono;
    const items = p.items !== undefined ? limpiarItems(p.items) : existente?.items || [];
    const total =
      p.total !== undefined && p.total !== null && Number.isFinite(Number(p.total))
        ? Number(p.total)
        : p.items !== undefined || !existente
          ? items.reduce((suma, it) => suma + it.precio * it.cantidad, 0)
          : existente.total;
    const ahora = ahoraIso();
    let pedido: Pedido = {
      ...(existente || {}),
      ...p,
      id,
      empresa_id: empresa.id,
      numero,
      nombre,
      telefono,
      email,
      items,
      total,
      estado: p.estado || existente?.estado || "pendiente",
      moneda: p.moneda || existente?.moneda || empresa.moneda,
      canal: p.canal ?? existente?.canal ?? "manual",
      contacto_id: p.contacto_id !== undefined ? p.contacto_id : existente?.contacto_id ?? null,
      creado: p.creado || existente?.creado || ahora,
      actualizado: ahora,
    };
    const atado = this.atarContacto(pedido, s.contactos, "manual");
    pedido = atado.pedido;
    s.set({
      contactos: atado.contactos,
      pedidos: existente ? s.pedidos.map((x) => (x.id === id ? pedido : x)) : [pedido, ...s.pedidos],
    });
    const que = !existente
      ? `cargó el pedido ${numero}`
      : existente.estado !== pedido.estado
        ? `pasó el pedido ${numero} a «${nombreEstadoPedido(pedido.estado)}»`
        : `editó el pedido ${numero}`;
    this.registrar(que, { tipo: "pedido", id });
    return pedido;
  }

  async borrarPedido(id: string): Promise<void> {
    const s = this.st();
    const p = s.pedidos.find((x) => x.id === id);
    if (!p) return;
    s.set({
      pedidos: s.pedidos.filter((x) => x.id !== id),
      conversaciones: s.conversaciones.map((c) => (c.pedido_id === id ? { ...c, pedido_id: null } : c)),
    });
    this.registrar(`borró el pedido ${p.numero}`);
  }

  async importarPedidos(entrada: Pedido[]): Promise<{ nuevos: number; actualizados: number }> {
    const empresa = this.empresa();
    let pedidos = [...this.st().pedidos];
    let contactos = [...this.st().contactos];
    let nuevos = 0;
    let actualizados = 0;
    const ahora = ahoraIso();
    for (const x of lista(entrada)) {
      const numero = (x.numero || "").trim();
      if (!numero) continue;
      const items = limpiarItems(x.items);
      const base: Pedido = {
        ...x,
        numero,
        nombre: (x.nombre || "").trim() || "Sin nombre",
        telefono: normalizarTelefono(x.telefono) || undefined,
        email: (x.email || "").trim().toLowerCase() || undefined,
        items,
        total: Number.isFinite(Number(x.total)) ? Number(x.total) : items.reduce((s, it) => s + it.precio * it.cantidad, 0),
        moneda: x.moneda || empresa.moneda,
        estado: x.estado || "pagado",
        empresa_id: empresa.id,
        id: x.id || uid("pd"),
        creado: x.creado || ahora,
        actualizado: ahora,
      };
      const i = pedidos.findIndex((p) => p.numero.trim().toLowerCase() === numero.toLowerCase());
      let pedido: Pedido;
      if (i >= 0) {
        const viejo = pedidos[i];
        pedido = {
          ...viejo,
          ...base,
          id: viejo.id,
          creado: x.creado || viejo.creado,
          items: items.length ? items : viejo.items,
          telefono: base.telefono || viejo.telefono,
          email: base.email || viejo.email,
          contacto_id: viejo.contacto_id ?? base.contacto_id ?? null,
          envio: { ...(viejo.envio || {}), ...(x.envio || {}) },
        };
      } else {
        pedido = base;
      }
      const atado = this.atarContacto(pedido, contactos, x.canal === "api" ? "api" : "csv");
      contactos = atado.contactos;
      if (i >= 0) {
        pedidos[i] = atado.pedido;
        actualizados += 1;
      } else {
        pedidos = [atado.pedido, ...pedidos];
        nuevos += 1;
      }
    }
    this.st().set({ pedidos, contactos });
    if (nuevos || actualizados) this.registrar(`importó pedidos (${nuevos} nuevos, ${actualizados} actualizados)`);
    return { nuevos, actualizados };
  }

  // ---------- stock ----------
  async guardarProducto(p: Partial<Producto> & { sku: string; nombre: string }): Promise<Producto> {
    const s = this.st();
    const empresa = this.empresa();
    const sku = (p.sku || "").trim();
    const nombre = (p.nombre || "").trim();
    if (!sku) throw new CrmError("Poné el SKU (el código del producto).");
    if (!nombre) throw new CrmError("Poné el nombre del producto.");
    const existente = p.id ? s.productos.find((x) => x.id === p.id) : undefined;
    const id = p.id || uid("pr");
    if (s.productos.some((x) => x.id !== id && x.sku.trim().toLowerCase() === sku.toLowerCase())) {
      throw new CrmError(`Ya hay un producto con el SKU ${sku}.`, "duplicado");
    }
    const producto: Producto = {
      ...(existente || {}),
      ...p,
      id,
      empresa_id: empresa.id,
      sku,
      nombre,
      precio: Math.max(0, numeroSeguro(p.precio ?? existente?.precio, 0)),
      moneda: p.moneda || existente?.moneda || empresa.moneda,
      stock: Math.max(0, Math.round(numeroSeguro(p.stock ?? existente?.stock, 0))),
      stock_minimo:
        p.stock_minimo !== undefined && p.stock_minimo !== null
          ? Math.max(0, Math.round(numeroSeguro(p.stock_minimo, 0)))
          : existente?.stock_minimo,
      activo: p.activo ?? existente?.activo ?? true,
      actualizado: ahoraIso(),
    };
    s.set({ productos: existente ? s.productos.map((x) => (x.id === id ? producto : x)) : [producto, ...s.productos] });
    this.registrar(existente ? `editó el producto ${nombre}` : `cargó el producto ${nombre}`, { tipo: "producto", id });
    return producto;
  }

  async borrarProducto(id: string): Promise<void> {
    const s = this.st();
    const p = s.productos.find((x) => x.id === id);
    if (!p) return;
    s.set({ productos: s.productos.filter((x) => x.id !== id) });
    this.registrar(`borró el producto ${p.nombre}`);
  }

  async ajustarStock(id: string, delta: number, motivo?: string): Promise<Producto> {
    const s = this.st();
    const p = s.productos.find((x) => x.id === id);
    if (!p) throw new CrmError("No encuentro ese producto.", "no_existe");
    const d = Math.round(numeroSeguro(delta, 0));
    if (!d) throw new CrmError("Poné cuántas unidades sumar o restar.");
    const stock = Math.max(0, p.stock + d);
    const n: Producto = { ...p, stock, actualizado: ahoraIso() };
    s.set({ productos: s.productos.map((x) => (x.id === id ? n : x)) });
    const unidades = (k: number) => `${k} ${k === 1 ? "unidad" : "unidades"}`;
    const porque = (motivo || "").trim() ? ` (${(motivo || "").trim()})` : "";
    const tope = p.stock + d < 0 ? " y quedó en cero" : "";
    this.registrar(
      d > 0 ? `sumó ${unidades(d)} de ${p.nombre}${porque}` : `descontó ${unidades(-d)} de ${p.nombre}${porque}${tope}`,
      { tipo: "producto", id }
    );
    return n;
  }

  async importarProductos(entrada: Producto[]): Promise<{ nuevos: number; actualizados: number }> {
    const empresa = this.empresa();
    let productos = [...this.st().productos];
    let nuevos = 0;
    let actualizados = 0;
    const ahora = ahoraIso();
    for (const x of lista(entrada)) {
      const nombre = (x.nombre || "").trim();
      const sku = (x.sku || "").trim();
      if (!sku || !nombre) continue;
      const i = productos.findIndex((p) => p.sku.trim().toLowerCase() === sku.toLowerCase());
      if (i >= 0) {
        const viejo = productos[i];
        productos[i] = {
          ...viejo,
          nombre,
          precio: Math.max(0, numeroSeguro(x.precio, viejo.precio)),
          stock: Math.max(0, Math.round(numeroSeguro(x.stock, viejo.stock))),
          stock_minimo: x.stock_minimo ?? viejo.stock_minimo,
          categoria: x.categoria || viejo.categoria,
          descripcion: x.descripcion || viejo.descripcion,
          imagen_url: x.imagen_url || viejo.imagen_url,
          activo: x.activo ?? viejo.activo,
          actualizado: ahora,
        };
        actualizados += 1;
      } else {
        productos = [
          {
            ...x,
            id: x.id || uid("pr"),
            empresa_id: empresa.id,
            sku,
            nombre,
            precio: Math.max(0, numeroSeguro(x.precio, 0)),
            moneda: x.moneda || empresa.moneda,
            stock: Math.max(0, Math.round(numeroSeguro(x.stock, 0))),
            activo: x.activo ?? true,
            actualizado: ahora,
          },
          ...productos,
        ];
        nuevos += 1;
      }
    }
    this.st().set({ productos });
    if (nuevos || actualizados) this.registrar(`importó productos (${nuevos} nuevos, ${actualizados} actualizados)`);
    return { nuevos, actualizados };
  }

  // ---------- respuestas automáticas ----------
  async guardarBot(bot: Bot): Promise<Bot> {
    const b = completarBot(bot);
    this.st().set({ bot: b });
    this.registrar("guardó las respuestas automáticas");
    return b;
  }

  async probarBot(input: { texto: string; canal?: CanalTipo; conversacion_id?: string; fuera_de_horario?: boolean }): Promise<BotResultado> {
    const s = this.st();
    const empresa = this.empresa();
    const ahora = input.fuera_de_horario ? momentoFueraDeHorario(empresa.horario) : new Date();
    let conv: Conversacion;
    let contacto: Contacto | null = null;
    let esPrimer = false;
    if (input.conversacion_id) {
      conv = this.conv(input.conversacion_id);
      contacto = s.contactos.find((c) => c.id === conv.contacto_id) || null;
    } else {
      // Un chat de mentira, recién creado: no se guarda nada.
      const iso = ahora.toISOString();
      conv = {
        id: "prueba",
        empresa_id: empresa.id,
        canal_id: "prueba",
        canal: input.canal || "whatsapp",
        contacto_id: "",
        identificador: "5491100000000",
        nombre: "Cliente de prueba",
        ultimo_texto: input.texto || "",
        ultimo_en: iso,
        ultimo_de: "cliente",
        ultimo_entrante_en: iso,
        no_leidos: 1,
        grupo: null,
        etiquetas: [],
        urgente: false,
        baja: false,
        fuera_horario: false,
        necesita_humano: false,
        bot_estado: null,
        creado: iso,
        actualizado: iso,
      };
      esPrimer = true;
    }
    return evaluarBot({
      empresa,
      bot: s.bot,
      conv,
      contacto,
      texto: input.texto || "",
      esPrimerMensaje: esPrimer,
      productos: s.productos,
      pedidos: s.pedidos,
      ahora,
    });
  }

  // ---------- plantillas y respuestas rápidas ----------
  async sincronizarPlantillas(canalId: string): Promise<Plantilla[]> {
    this.canal(canalId);
    // En demo no hay Meta: se devuelven las que ya están cargadas para ese canal.
    return this.st().plantillas.filter((p) => !p.canal_id || p.canal_id === canalId);
  }

  async guardarPlantilla(p: Partial<Plantilla> & { nombre: string; cuerpo: string }): Promise<Plantilla> {
    const s = this.st();
    const empresa = this.empresa();
    const nombre = nombrePlantillaMeta(p.nombre || "");
    const cuerpo = (p.cuerpo || "").trim();
    if (!nombre) throw new CrmError("Poné un nombre (minúsculas y guiones bajos, por ejemplo aviso_despacho).");
    if (!cuerpo) throw new CrmError("Escribí el texto de la plantilla.");
    const existente = p.id ? s.plantillas.find((x) => x.id === p.id) : undefined;
    const id = p.id || uid("pl");
    const idioma = p.idioma || existente?.idioma || "es_AR";
    if (s.plantillas.some((x) => x.id !== id && x.nombre === nombre && x.idioma === idioma)) {
      throw new CrmError(`Ya hay una plantilla «${nombre}» en ese idioma.`, "duplicado");
    }
    const plantilla: Plantilla = {
      ...(existente || {}),
      ...p,
      id,
      empresa_id: empresa.id,
      canal_id: p.canal_id !== undefined ? p.canal_id : existente?.canal_id ?? s.canales.find((c) => c.tipo === "whatsapp")?.id ?? null,
      nombre,
      idioma,
      cuerpo,
      variables: contarVariables(cuerpo),
      estado: p.estado || existente?.estado || "local",
      actualizado: ahoraIso(),
    };
    s.set({ plantillas: existente ? s.plantillas.map((x) => (x.id === id ? plantilla : x)) : [...s.plantillas, plantilla] });
    this.registrar(existente ? `editó la plantilla ${nombre}` : `creó la plantilla ${nombre}`);
    return plantilla;
  }

  async borrarPlantilla(id: string): Promise<void> {
    const s = this.st();
    const p = s.plantillas.find((x) => x.id === id);
    if (!p) return;
    s.set({ plantillas: s.plantillas.filter((x) => x.id !== id) });
    this.registrar(`borró la plantilla ${p.nombre}`);
  }

  async guardarRapida(r: Partial<Rapida> & { atajo: string; texto: string }): Promise<Rapida> {
    const s = this.st();
    const empresa = this.empresa();
    const atajo = normalizarAtajo(r.atajo || "");
    const texto = (r.texto || "").trim();
    if (!atajo) throw new CrmError("Poné un atajo, por ejemplo /envio.");
    if (!texto) throw new CrmError("Escribí el texto de la respuesta rápida.");
    const existente = r.id ? s.rapidas.find((x) => x.id === r.id) : undefined;
    const id = r.id || uid("rp");
    const de = r.de !== undefined ? r.de || null : existente?.de ?? null;
    const yoId = s.yo?.id;
    const choca = s.rapidas.some((x) => x.id !== id && x.atajo === atajo && (!x.de || !de || x.de === de || x.de === yoId));
    if (choca) throw new CrmError(`Ya hay una respuesta rápida con el atajo ${atajo}.`, "duplicado");
    const rapida: Rapida = { ...(existente || {}), ...r, id, empresa_id: empresa.id, atajo, texto, de };
    s.set({ rapidas: existente ? s.rapidas.map((x) => (x.id === id ? rapida : x)) : [...s.rapidas, rapida] });
    return rapida;
  }

  async borrarRapida(id: string): Promise<void> {
    const s = this.st();
    s.set({ rapidas: s.rapidas.filter((x) => x.id !== id) });
  }

  // ---------- chat del equipo ----------
  async enviarEquipo(texto: string, ref?: MensajeEquipo["ref"]): Promise<MensajeEquipo> {
    const t = (texto || "").trim();
    if (!t) throw new CrmError("Escribí algo antes de mandar.");
    const yo = this.yo();
    const m: MensajeEquipo = {
      id: uid("eq"),
      empresa_id: this.empresa().id,
      de: yo.id,
      nombre: yo.nombre,
      texto: t,
      creado: ahoraIso(),
      ref: ref ?? null,
      estado: null,
      hecho_por: null,
    };
    const s = this.st();
    s.set({ equipo: [...s.equipo, m] });
    return m;
  }

  async marcarEquipo(id: string, estado: "pendiente" | "hecho" | null): Promise<MensajeEquipo> {
    const s = this.st();
    const m = s.equipo.find((x) => x.id === id);
    if (!m) throw new CrmError("Ese mensaje ya no está.", "no_existe");
    const n: MensajeEquipo = { ...m, estado, hecho_por: estado === "hecho" ? this.yo().nombre : null };
    s.set({ equipo: s.equipo.map((x) => (x.id === id ? n : x)) });
    return n;
  }

  async borrarEquipo(id: string): Promise<void> {
    const s = this.st();
    s.set({ equipo: s.equipo.filter((x) => x.id !== id) });
  }

  // ---------- API pública ----------
  async crearApiKey(nombre: string): Promise<{ key: ApiKey; secreto: string }> {
    const secreto = "ck_demo_" + tokenAleatorio(32);
    const key: ApiKey = {
      id: uid("ak"),
      empresa_id: this.empresa().id,
      nombre: (nombre || "").trim() || "Mi integración",
      prefijo: secreto.slice(0, 16) + "…",
      creado: ahoraIso(),
      ultimo_uso: null,
    };
    const s = this.st();
    s.set({ api_keys: [key, ...s.api_keys] });
    this.registrar(`creó la clave de API «${key.nombre}»`);
    return { key, secreto };
  }

  async borrarApiKey(id: string): Promise<void> {
    const s = this.st();
    const k = s.api_keys.find((x) => x.id === id);
    if (!k) return;
    s.set({ api_keys: s.api_keys.filter((x) => x.id !== id) });
    this.registrar(`borró la clave de API «${k.nombre}»`);
  }

  // ---------- IA ----------
  async sugerirRespuesta(convId: string, borrador?: string): Promise<Sugerencia> {
    const s = this.st();
    const empresa = this.empresa();
    const conv = this.conv(convId);
    const mensajes = [...(s.mensajes[convId] || [])]
      .sort(porFecha)
      .slice(-30)
      // los adjuntos de la demo son data URLs: no viajan
      .map((m) => (m.media_url && m.media_url.startsWith("data:") ? { ...m, media_url: undefined } : m));
    const contacto = s.contactos.find((c) => c.id === conv.contacto_id) || null;
    const pedidos = contacto
      ? pedidosDeContacto(s.pedidos, contacto)
      : conv.canal === "whatsapp"
        ? pedidosDeContacto(s.pedidos, { telefono: conv.identificador })
        : [];
    const productos = s.productos.filter((p) => p.activo !== false).slice(0, 40);
    let res: Response;
    try {
      res = await fetch("/api/crm/ia/sugerir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          contexto: {
            empresa: { nombre: empresa.nombre, rubro: empresa.rubro, instrucciones: empresa.ia?.instrucciones },
            mensajes,
            contacto,
            pedidos: pedidos.slice(0, 20),
            productos,
          },
          borrador,
        }),
      });
    } catch {
      throw new CrmError("No hay conexión. Revisá internet y probá de nuevo.", "sin_red");
    }
    let cuerpo: unknown = null;
    try {
      cuerpo = await res.json();
    } catch {
      cuerpo = null;
    }
    if (!res.ok) {
      const c = (cuerpo || {}) as { error?: string; codigo?: string };
      throw new CrmError(c.error || "No pude armar una sugerencia. Probá de nuevo en un rato.", c.codigo || "ia");
    }
    const sug = (cuerpo || {}) as Sugerencia;
    if (!sug.texto) throw new CrmError("La IA no devolvió ninguna sugerencia. Probá de nuevo.", "ia");
    return sug;
  }

  // ---------- métricas ----------
  async metricas(): Promise<Metricas> {
    const s = this.st();
    return calcularMetricas({
      empresa: this.empresa(),
      conversaciones: s.conversaciones,
      mensajes: Object.values(s.mensajes).flat(),
      pedidos: s.pedidos,
      productos: s.productos,
      miembros: s.miembros,
    });
  }

  // ---------- exportar ----------
  async exportarCsv(que: "contactos" | "pedidos" | "productos"): Promise<string> {
    const s = this.st();
    const empresa = this.empresa();
    const zona = empresa.horario?.zona || HORARIO_DEFAULT.zona;
    if (que === "contactos") {
      const nombreEtiqueta = (id: string) => empresa.etiquetas.find((e) => e.id === id)?.nombre || id;
      return aCsv(
        ["nombre", "telefono", "email", "documento", "localidad", "provincia", "cp", "etiquetas", "origen", "creado"],
        s.contactos.map((c) => [
          c.nombre,
          c.telefono,
          c.email,
          c.documento,
          c.localidad,
          c.provincia,
          c.cp,
          (c.etiquetas || []).map(nombreEtiqueta).join(" | "),
          c.origen,
          fechaCsv(c.creado, zona),
        ])
      );
    }
    if (que === "pedidos") {
      return aCsv(
        ["numero", "fecha", "nombre", "telefono", "email", "estado", "total", "moneda", "transporte", "seguimiento", "productos"],
        [...s.pedidos]
          .sort(porFecha)
          .reverse()
          .map((p) => [
            p.numero,
            fechaCsv(p.creado, zona),
            p.nombre,
            p.telefono,
            p.email,
            p.estado,
            p.total,
            p.moneda,
            p.envio?.transporte,
            p.envio?.seguimiento,
            (p.items || []).map((it) => `${it.cantidad}x ${it.nombre}`).join(" | "),
          ])
      );
    }
    if (que === "productos") {
      return aCsv(
        ["sku", "nombre", "precio", "moneda", "stock", "stock_minimo", "categoria", "activo"],
        s.productos.map((p) => [p.sku, p.nombre, p.precio, p.moneda, p.stock, p.stock_minimo, p.categoria, p.activo === false ? "no" : "si"])
      );
    }
    throw new CrmError("No sé exportar eso.");
  }
}
