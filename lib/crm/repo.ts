"use client";
// ============================================================
// Clientany · CRM — el store del navegador y el contrato del repositorio.
//
// La UI lee SIEMPRE de `useCrm` (zustand) y escribe SIEMPRE a través del
// repositorio activo (`getRepo()`), que es uno de dos:
//   · `repo-local.ts`  → modo demo: todo vive en el navegador (localStorage).
//   · `repo-nube.ts`   → modo nube: habla con /api/crm/* y el servidor guarda
//                         en Supabase; el store es un espejo que se refresca.
// Las dos implementaciones cumplen `CrmRepo`. La lógica (bandeja, bot, CSV)
// es la misma en los dos lados: vive en core.ts / bot.ts / csv.ts.
// ============================================================
import { create } from "zustand";
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
  MensajeEquipo,
  Mensaje,
  Metricas,
  Miembro,
  Pedido,
  Plantilla,
  Producto,
  Rapida,
  Rol,
} from "./types";

export type Modo = "demo" | "nube";

export interface CrmState {
  listo: boolean; // ya se hidrató (demo) o ya se cargó desde la API (nube)
  modo: Modo;
  error?: string | null; // último error de carga (criollo)
  empresa: Empresa | null;
  yo: Miembro | null;
  miembros: Miembro[];
  invitaciones: Invitacion[];
  canales: Canal[];
  conversaciones: Conversacion[];
  mensajes: Record<string, Mensaje[]>; // por conversación, cargados a demanda
  contactos: Contacto[];
  pedidos: Pedido[];
  productos: Producto[];
  bot: Bot;
  plantillas: Plantilla[];
  rapidas: Rapida[];
  equipo: MensajeEquipo[];
  api_keys: ApiKey[];
  actividad: Actividad[];
  // setters mecánicos (los usan los repositorios; la UI no los llama)
  set: (patch: Partial<CrmState>) => void;
  setConversacion: (c: Conversacion) => void;
  setMensajes: (convId: string, mensajes: Mensaje[]) => void;
  agregarMensaje: (m: Mensaje) => void;
}

export const useCrm = create<CrmState>()((set, get) => ({
  listo: false,
  modo: "demo",
  error: null,
  empresa: null,
  yo: null,
  miembros: [],
  invitaciones: [],
  canales: [],
  conversaciones: [],
  mensajes: {},
  contactos: [],
  pedidos: [],
  productos: [],
  bot: undefined as unknown as Bot, // la completa el repo con `completarBot`
  plantillas: [],
  rapidas: [],
  equipo: [],
  api_keys: [],
  actividad: [],
  set: (patch) => set(patch),
  setConversacion: (c) => {
    const lista = get().conversaciones;
    const i = lista.findIndex((x) => x.id === c.id);
    set({ conversaciones: i >= 0 ? lista.map((x) => (x.id === c.id ? c : x)) : [c, ...lista] });
  },
  setMensajes: (convId, mensajes) => set({ mensajes: { ...get().mensajes, [convId]: mensajes } }),
  agregarMensaje: (m) => {
    const actuales = get().mensajes[m.conversacion_id] || [];
    if (actuales.some((x) => x.id === m.id)) {
      set({ mensajes: { ...get().mensajes, [m.conversacion_id]: actuales.map((x) => (x.id === m.id ? m : x)) } });
    } else {
      set({ mensajes: { ...get().mensajes, [m.conversacion_id]: [...actuales, m] } });
    }
  },
}));

// ---------- entradas de las operaciones ----------
export interface ConectarCanalInput {
  tipo: CanalTipo;
  nombre?: string;
  marca_id?: string;
  // WhatsApp
  phone_number_id?: string;
  waba_id?: string;
  // Instagram / Messenger
  page_id?: string;
  ig_user_id?: string;
  // credenciales (sólo van al servidor; en demo se guardan "cargadas" pero no se usan)
  token?: string;
  app_secret?: string;
  api_version?: string;
}

export type AccionConversacion =
  | { tipo: "respondido" } // visto_in = último entrante; saca "escribió después"
  | { tipo: "grupo"; grupo: Conversacion["grupo"] } // mover de bandeja a mano
  | { tipo: "etapa"; etapa_id: string | null }
  | { tipo: "etiquetas"; etiquetas: string[] }
  | { tipo: "nota"; nota: string }
  | { tipo: "asignar"; miembro_id: string | null }
  | { tipo: "tomar" } // lo tomo yo
  | { tipo: "soltar" }
  | { tipo: "urgente"; valor: boolean }
  | { tipo: "recordar"; fecha: string | null; nota?: string } // posponer / mañana / quitar
  | { tipo: "baja"; valor: boolean }
  | { tipo: "resolver" } // grupo = resueltos + respondido
  | { tipo: "reabrir" }
  | { tipo: "humano_atendido" } // saca necesita_humano
  | { tipo: "pedido"; pedido_id: string | null }
  | { tipo: "nombre"; nombre: string };

export interface NuevaConversacionInput {
  canal_id: string;
  identificador: string; // teléfono para WhatsApp (se normaliza), ig/psid para los otros
  nombre?: string;
  contacto_id?: string;
  texto?: string; // primer mensaje nuestro (si hay ventana o es manual); si no, se crea vacía
  plantilla?: { nombre: string; parametros: string[] }; // para abrir charla por WhatsApp fuera de ventana
}

export interface SimularEntranteInput {
  canal_id?: string; // si no hay, se usa el primer canal (o se crea uno "manual")
  canal_tipo?: CanalTipo;
  identificador?: string; // teléfono / ig / psid del cliente simulado
  nombre?: string;
  texto: string;
}

export interface Sugerencia {
  texto: string;
  motivo?: string; // qué usó: stock, pedidos, instrucciones…
  proveedor?: string;
}

// ---------- el contrato ----------
export interface CrmRepo {
  modo: Modo;
  // Carga inicial e hidratación. En nube: trae todo lo chico (empresa, yo,
  // miembros, canales, conversaciones, contactos, pedidos, productos, bot,
  // plantillas, rápidas, equipo, api_keys). Los mensajes van a demanda.
  cargar(): Promise<void>;
  // Nube: refresca conversaciones nuevas/cambiadas (polling, cada ~5 s en la
  // bandeja) y, si se pasa, los mensajes de ESA conversación. Demo: no hace nada.
  refrescar(convId?: string | null): Promise<void>;

  // ---- empresa y datos de prueba ----
  actualizarEmpresa(patch: Partial<Empresa>): Promise<Empresa>;
  cargarDatosDePrueba(): Promise<void>; // contactos, chats, pedidos, stock de ejemplo
  vaciarDatosDePrueba(): Promise<void>;

  // ---- equipo ----
  invitarMiembro(input: { email: string; nombre?: string; rol: Rol }): Promise<{ miembro?: Miembro; invitacion?: Invitacion }>;
  actualizarMiembro(id: string, patch: Partial<Pick<Miembro, "rol" | "nombre">>): Promise<Miembro>;
  quitarMiembro(id: string): Promise<void>;
  cancelarInvitacion(id: string): Promise<void>;
  pulso(): Promise<void>; // presencia: "estoy acá"

  // ---- canales ----
  conectarCanal(input: ConectarCanalInput): Promise<Canal>;
  probarCanal(id: string): Promise<{ ok: boolean; detalle?: Canal["detalle"]; error?: string }>;
  desconectarCanal(id: string): Promise<void>;

  // ---- bandeja y chat ----
  cargarMensajes(convId: string): Promise<Mensaje[]>;
  enviarTexto(convId: string, texto: string, opciones?: { cita_id?: string }): Promise<Mensaje>;
  enviarPlantilla(convId: string, plantilla: { nombre: string; idioma?: string; parametros: string[] }): Promise<Mensaje>;
  enviarArchivo(convId: string, archivo: File, texto?: string): Promise<Mensaje>;
  marcarLeido(convId: string): Promise<void>;
  accion(convId: string, accion: AccionConversacion): Promise<Conversacion>;
  nuevaConversacion(input: NuevaConversacionInput): Promise<Conversacion>;
  borrarConversacion(convId: string): Promise<void>;
  borrarMensaje(convId: string, mensajeId: string): Promise<void>;
  // Simula que el cliente escribió (demo: corre el bot acá; nube: lo corre el servidor).
  simularEntrante(input: SimularEntranteInput): Promise<{ conversacion: Conversacion; mensaje: Mensaje; bot: BotResultado }>;
  buscar(q: string): Promise<{ conversaciones: Conversacion[]; contactos: Contacto[]; pedidos: Pedido[] }>;

  // ---- contactos ----
  guardarContacto(c: Partial<Contacto> & { nombre: string }): Promise<Contacto>;
  borrarContacto(id: string): Promise<void>;
  importarContactos(lista: Contacto[]): Promise<{ nuevos: number; actualizados: number }>;

  // ---- pedidos ----
  guardarPedido(p: Partial<Pedido> & { numero: string; nombre: string }): Promise<Pedido>;
  borrarPedido(id: string): Promise<void>;
  importarPedidos(lista: Pedido[]): Promise<{ nuevos: number; actualizados: number }>;

  // ---- stock ----
  guardarProducto(p: Partial<Producto> & { sku: string; nombre: string }): Promise<Producto>;
  borrarProducto(id: string): Promise<void>;
  ajustarStock(id: string, delta: number, motivo?: string): Promise<Producto>;
  importarProductos(lista: Producto[]): Promise<{ nuevos: number; actualizados: number }>;

  // ---- respuestas automáticas ----
  guardarBot(bot: Bot): Promise<Bot>;
  // Qué contestaría el bot a este texto, sin mandar nada (para la pantalla de prueba).
  probarBot(input: { texto: string; canal?: CanalTipo; conversacion_id?: string; fuera_de_horario?: boolean }): Promise<BotResultado>;

  // ---- plantillas y respuestas rápidas ----
  sincronizarPlantillas(canalId: string): Promise<Plantilla[]>; // trae las de Meta (nube)
  guardarPlantilla(p: Partial<Plantilla> & { nombre: string; cuerpo: string }): Promise<Plantilla>;
  borrarPlantilla(id: string): Promise<void>;
  guardarRapida(r: Partial<Rapida> & { atajo: string; texto: string }): Promise<Rapida>;
  borrarRapida(id: string): Promise<void>;

  // ---- chat del equipo ----
  enviarEquipo(texto: string, ref?: MensajeEquipo["ref"]): Promise<MensajeEquipo>;
  marcarEquipo(id: string, estado: "pendiente" | "hecho" | null): Promise<MensajeEquipo>;
  borrarEquipo(id: string): Promise<void>;

  // ---- API pública ----
  crearApiKey(nombre: string): Promise<{ key: ApiKey; secreto: string }>; // el secreto se muestra UNA vez
  borrarApiKey(id: string): Promise<void>;

  // ---- IA ----
  sugerirRespuesta(convId: string, borrador?: string): Promise<Sugerencia>;

  // ---- métricas ----
  metricas(): Promise<Metricas>;

  // ---- exportar ----
  exportarCsv(que: "contactos" | "pedidos" | "productos"): Promise<string>;
}

// El repositorio activo lo registra `lib/crm/index.ts` al arrancar la app.
let _repo: CrmRepo | null = null;
export function setRepo(r: CrmRepo) {
  _repo = r;
}
export function getRepo(): CrmRepo {
  if (!_repo) throw new Error("El CRM todavía no arrancó (falta setRepo).");
  return _repo;
}

// Error criollo para mostrar en la pantalla.
export class CrmError extends Error {
  codigo: string;
  constructor(mensaje: string, codigo = "error") {
    super(mensaje);
    this.codigo = codigo;
  }
}
