// ============================================================
// Clientany · CRM multiempresa — tipos del dominio
// ------------------------------------------------------------
// Este archivo es el CONTRATO entre el frontend, el repositorio local
// (modo demo, en el navegador), el repositorio en la nube (API) y el
// servidor (Supabase + webhooks de Meta). Si cambia algo acá, cambia en
// todos lados. Los nombres van en español, como el resto del producto.
// ============================================================

export type CanalTipo = "whatsapp" | "instagram" | "messenger" | "manual";

export type Rol = "admin" | "agente";

export type Plan = "prueba" | "inicial" | "pro" | "empresa";

export interface HorarioDia {
  dia: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo … 6 = sábado (igual que Date.getDay)
  abre: boolean;
  desde: string; // "09:00"
  hasta: string; // "18:00"
}

export interface Horario {
  zona: string; // IANA, ej. "America/Argentina/Buenos_Aires"
  dias: HorarioDia[];
}

export interface Etapa {
  id: string;
  nombre: string;
  color: string; // hexa: es un DATO (el color de la etapa), no un color de la UI
  orden: number;
}

export interface Etiqueta {
  id: string;
  nombre: string;
  color: string;
}

export interface ConfigIA {
  proveedor: "plataforma" | "anthropic"; // "plataforma" = la clave de Clientany; "anthropic" = la clave propia de la empresa
  modelo?: string;
  clave_cargada: boolean; // la clave nunca vuelve al navegador
  instrucciones?: string; // "sobre la marca": tono, qué destacar, qué no decir
}

export interface Empresa {
  id: string;
  nombre: string;
  rubro?: string;
  pais: string;
  moneda: string; // "ARS", "USD", …
  plan: Plan;
  prueba_hasta?: string; // ISO
  creado: string;
  // Webhook de Meta: una URL por empresa, /api/webhooks/meta/<empresa_id>
  webhook_verify_token: string;
  // Aviso saliente opcional: cada evento (mensaje entrante, pedido nuevo…) se
  // POSTea a esta URL de la empresa. Best effort.
  webhook_salida_url?: string;
  ia: ConfigIA;
  horario: Horario;
  etapas: Etapa[];
  etiquetas: Etiqueta[];
  // Texto que se usa para presentar la marca en los automáticos ({marca})
  firma?: string;
}

export interface Miembro {
  id: string; // en la nube es el user id de Supabase; en demo, un id local
  empresa_id: string;
  nombre: string;
  email: string;
  rol: Rol;
  avatar?: string; // emoji o iniciales
  ultimo_visto?: string; // ISO (presencia)
  creado: string;
}

export interface Invitacion {
  id: string;
  empresa_id: string;
  email: string;
  rol: Rol;
  creado: string;
  por: string; // miembro id
}

export type CanalEstado = "conectado" | "error" | "pendiente";

// Lo que ve el navegador de un canal. Las credenciales NUNCA viajan al
// front: sólo `token_cargado` / `app_secret_cargado`.
export interface Canal {
  id: string;
  empresa_id: string;
  tipo: CanalTipo;
  nombre: string; // "+54 9 11 5555-1234", "@marca", "Página Marca"
  marca_id?: string; // marca del workspace (multi-tienda); opcional
  estado: CanalEstado;
  // Identificadores de Meta
  externo_id: string; // phone_number_id (WA) · ig user id (IG) · page id (FB) · "manual"
  waba_id?: string; // WhatsApp Business Account id
  page_id?: string; // página de Facebook atada al IG (flujo viejo) o del Messenger
  token_cargado: boolean;
  app_secret_cargado: boolean;
  ultimo_error?: string;
  conectado_en?: string;
  detalle?: {
    numero_visible?: string;
    nombre_verificado?: string;
    nombre_pagina?: string;
    usuario_ig?: string;
    calidad?: string;
    flujo?: "instagram" | "facebook"; // Instagram: por Instagram Login o por la página de Facebook
  };
  api_version?: string; // "v21.0"
}

// Sólo en el servidor (cifradas en la base).
export interface CanalCredenciales {
  token: string;
  app_secret?: string;
}

export type ContactoOrigen = CanalTipo | "csv" | "api" | "manual";

export interface Contacto {
  id: string;
  empresa_id: string;
  nombre: string;
  telefono?: string; // normalizado con `normalizarTelefono` (sólo dígitos, con país)
  email?: string;
  documento?: string;
  ig_usuario?: string;
  ig_id?: string;
  psid?: string; // Messenger page-scoped id
  direccion?: string;
  localidad?: string;
  provincia?: string;
  cp?: string;
  notas?: string;
  etiquetas: string[]; // ids de Etiqueta
  origen: ContactoOrigen;
  marca_id?: string;
  creado: string;
  actualizado: string;
}

export type Grupo = "ventas" | "soporte" | "mas_adelante" | "resueltos" | "baja";

export type De = "cliente" | "agente" | "bot" | "sistema";

export interface Recordatorio {
  fecha: string; // ISO (día u hora)
  nota?: string;
  quien?: string;
  puesto: string;
}

export interface BotEstado {
  dia: string; // "2026-10-02" (en la zona de la empresa)
  respuestas_hoy: number;
  ultima_bienvenida?: string; // ISO
  ultima_ausencia?: string; // ISO
  paso?: string; // "menu" cuando se mandó el menú y se espera una opción
  reglas_hoy?: string[]; // ids de reglas "una vez por día" ya usadas hoy
}

export interface Conversacion {
  id: string;
  empresa_id: string;
  canal_id: string;
  canal: CanalTipo;
  contacto_id: string;
  identificador: string; // teléfono (549…), ig id o psid: la llave del cliente en ese canal
  nombre: string;
  marca_id?: string;
  ultimo_texto: string;
  ultimo_en: string; // ISO
  ultimo_de: De;
  ultimo_entrante_en?: string; // último mensaje del cliente
  ultimo_saliente_humano_en?: string; // última respuesta de una persona
  no_leidos: number;
  // Bandeja puesta a mano. null = la decide `grupoDe` sola.
  grupo?: Grupo | null;
  etapa_id?: string | null;
  etiquetas: string[]; // ids de Etiqueta
  nota?: string; // nota interna (franja ámbar arriba del chat)
  asignado_a?: string | null; // miembro id
  tomado_por?: { quien: string; nombre: string; cuando: string } | null; // "lo tomo yo"
  urgente: boolean;
  recordar?: Recordatorio | null;
  baja: boolean; // el cliente pidió no recibir automáticos
  fuera_horario: boolean; // escribió fuera de horario y espera la apertura
  necesita_humano: boolean; // el bot frenó: que atienda una persona
  // Hasta qué mensaje entrante lo atendió una persona (ISO). Si el cliente
  // escribió después, "escribió después" y vuelve a Ventas.
  visto_in?: string | null;
  pedido_id?: string | null; // pedido atado al chat (el último o el que se eligió)
  bot_estado?: BotEstado | null;
  creado: string;
  actualizado: string;
}

export type MensajeTipo =
  | "texto"
  | "imagen"
  | "audio"
  | "video"
  | "documento"
  | "sticker"
  | "plantilla"
  | "ubicacion"
  | "reaccion"
  | "otro";

export type MensajeEstado = "pendiente" | "enviado" | "entregado" | "leido" | "fallido";

export interface Mensaje {
  id: string;
  empresa_id: string;
  conversacion_id: string;
  direccion: "in" | "out";
  de: De;
  autor?: string; // nombre de quien lo escribió (persona o "Bot")
  tipo: MensajeTipo;
  texto: string;
  media_url?: string;
  media_nombre?: string;
  media_mime?: string;
  externo_id?: string; // wamid (WA) · mid (IG/FB)
  estado?: MensajeEstado;
  error?: string; // criollo, sin secretos
  cita_id?: string; // id de mensaje citado
  plantilla?: string; // nombre de la plantilla si tipo = "plantilla"
  creado: string;
}

export type PedidoEstado =
  | "pendiente"
  | "pagado"
  | "preparacion"
  | "enviado"
  | "entregado"
  | "cancelado"
  | "devuelto";

export interface PedidoItem {
  sku?: string;
  nombre: string;
  cantidad: number;
  precio: number; // unitario
}

export interface PedidoEnvio {
  transporte?: string;
  seguimiento?: string;
  url?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  cp?: string;
}

export interface Pedido {
  id: string;
  empresa_id: string;
  numero: string; // el número que ve el cliente ("#1234", "LUN-10428")
  contacto_id?: string | null;
  nombre: string;
  telefono?: string;
  email?: string;
  estado: PedidoEstado;
  items: PedidoItem[];
  total: number;
  moneda: string;
  envio?: PedidoEnvio;
  canal?: string; // de dónde vino la venta: "tienda", "ml", "whatsapp", "manual", "api", "csv"
  notas?: string;
  marca_id?: string;
  creado: string; // fecha del pedido
  actualizado: string;
}

export interface Producto {
  id: string;
  empresa_id: string;
  sku: string;
  nombre: string;
  precio: number;
  moneda: string;
  stock: number;
  stock_minimo?: number;
  categoria?: string;
  descripcion?: string;
  imagen_url?: string;
  activo: boolean;
  marca_id?: string;
  actualizado: string;
}

export type Coincidencia = "contiene" | "exacta" | "empieza";

export interface Regla {
  id: string;
  nombre: string;
  activa: boolean;
  palabras: string[]; // cualquiera de estas dispara la regla (sin acentos ni mayúsculas)
  coincidencia: Coincidencia;
  respuesta: string;
  canales: CanalTipo[]; // vacío = todos
  solo_fuera_horario: boolean;
  una_vez_por_dia: boolean;
  orden: number;
}

export interface BotMenuOpcion {
  clave: string; // "1", "2"…
  etiqueta: string;
  accion: "responder" | "humano" | "estado_pedido" | "stock";
  respuesta?: string; // para "responder"
}

export interface Bot {
  activo: boolean;
  bienvenida: { activa: boolean; texto: string };
  ausencia: { activa: boolean; texto: string };
  menu: { activo: boolean; texto: string; opciones: BotMenuOpcion[] };
  reglas: Regla[];
  stock: {
    activa: boolean;
    con_stock: string; // admite {producto} {precio} {stock}
    sin_stock: string;
  };
  pedidos: {
    activa: boolean;
    texto_estado: string; // admite {numero} {estado} {transporte} {seguimiento}
    sin_pedido: string;
  };
  humano: { palabras: string[]; texto: string };
  tope_por_dia: number; // respuestas automáticas por chat y día
  pausa_si_persona_min: number; // si una persona respondió hace menos de N min, el bot calla
}

export type PlantillaEstado = "aprobada" | "pendiente" | "rechazada" | "local";

export interface Plantilla {
  id: string;
  empresa_id: string;
  canal_id?: string | null;
  nombre: string; // nombre de Meta (minúsculas y _)
  idioma: string; // "es_AR"
  categoria?: string; // MARKETING / UTILITY
  estado: PlantillaEstado;
  cuerpo: string; // con {{1}} {{2}}
  variables: number;
  ejemplo?: string[];
  actualizado: string;
}

export interface Rapida {
  id: string;
  empresa_id: string;
  atajo: string; // "/envio"
  texto: string;
  de?: string | null; // miembro id dueño; null = compartida
}

export interface MensajeEquipo {
  id: string;
  empresa_id: string;
  de: string; // miembro id
  nombre: string;
  texto: string;
  creado: string;
  ref?: { tipo: "conversacion" | "pedido"; id: string; nombre?: string } | null;
  estado?: "pendiente" | "hecho" | null;
  hecho_por?: string | null;
}

export interface ApiKey {
  id: string;
  empresa_id: string;
  nombre: string;
  prefijo: string; // "ck_live_ab12…" para reconocerla
  creado: string;
  ultimo_uso?: string | null;
}

export interface Actividad {
  id: string;
  empresa_id: string;
  quien: string; // nombre
  que: string; // criollo: "marcó urgente el chat de Sofía"
  ref?: { tipo: string; id: string } | null;
  creado: string;
}

export interface Metricas {
  conversaciones: { total: number; abiertas: number; sin_responder: number; hoy: number };
  por_canal: Record<CanalTipo, number>;
  por_grupo: Record<Grupo, number>;
  por_etapa: { etapa_id: string; nombre: string; color: string; cantidad: number }[];
  bot: { respuestas_hoy: number; respuestas_mes: number; derivadas_a_humano: number };
  pedidos: { hoy: number; mes: number; monto_mes: number; moneda: string };
  stock: { productos: number; sin_stock: number; bajo_minimo: number };
  primera_respuesta_min?: number | null; // promedio del mes, en minutos
  equipo: { miembro_id: string; nombre: string; respondidas_mes: number }[];
}

// ---------- Resultado de evaluar el bot (lib/crm/bot.ts) ----------
export interface BotRespuesta {
  texto: string;
  motivo: string; // "bienvenida" | "ausencia" | "regla:<id>" | "menu" | "stock" | "pedido" | "humano"
}

export interface BotResultado {
  respuestas: BotRespuesta[];
  cambios: Partial<Conversacion>; // qué anotar en la conversación (bot_estado, fuera_horario, necesita_humano…)
  explicacion: string; // por qué respondió o por qué no (para el simulador)
}

// ---------- Entrada normalizada de un webhook de Meta ----------
export interface Entrante {
  canal_tipo: CanalTipo;
  canal_externo_id: string; // phone_number_id / ig id / page id al que le llegó
  identificador: string; // quién escribió (tel / ig id / psid)
  nombre?: string;
  externo_id?: string; // wamid / mid
  tipo: MensajeTipo;
  texto: string;
  media_id?: string; // id de media de Meta (WA) o url directa (IG/FB)
  media_url?: string;
  media_mime?: string;
  media_nombre?: string;
  cita_externo_id?: string;
  fecha: string; // ISO
  eco: boolean; // true si lo mandó la empresa desde el celular (Coexistence)
}

export interface EstadoEntrante {
  externo_id: string;
  estado: MensajeEstado;
  error?: string;
  fecha: string;
}

export interface WebhookParseado {
  entrantes: Entrante[];
  estados: EstadoEntrante[];
  objeto: string; // "whatsapp_business_account" | "instagram" | "page"
}

// ---------- Filtros de la bandeja ----------
export interface FiltroBandeja {
  grupo?: Grupo | "todos";
  canal?: CanalTipo | "todos";
  q?: string;
  marca_id?: string; // "all" o vacío = todas
  asignado_a?: string;
  orden?: "recientes" | "antiguos";
}

export interface FilaBandeja extends Conversacion {
  grupo_calculado: Grupo;
  escribio_despues: boolean; // el cliente escribió y nadie lo atendió
  ventana_horas: number | null; // horas que quedan de la ventana de 24 hs (WhatsApp); null si no aplica
}
