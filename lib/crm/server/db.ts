// ============================================================
// Clientany · CRM — contrato de la base de datos (SOLO servidor).
//
// Dos implementaciones:
//   · `db-supabase.ts` → Postgres de Supabase con la service role key
//     (tablas `crm_*` de supabase/crm_schema.sql).
//   · `db-memoria.ts`  → mapas en memoria con persistencia opcional en
//     `.clientany-dev/db.json` (para `next dev`, tests y Playwright).
// `getDb()` (en `db-factory.ts`) elige según las variables de entorno:
//   CLIENTANY_DB=memory  o  falta SUPABASE_SERVICE_ROLE_KEY → memoria.
//
// Reglas:
//  - Toda consulta lleva `empresa_id`: una empresa nunca ve a otra.
//  - Las credenciales de los canales se guardan cifradas (crypto.ts) y
//    sólo se leen con `credencialesCanal`.
//  - Los ids los genera quien escribe (uid de core.ts), no la base.
// ============================================================
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

export interface UsuarioAuth {
  id: string; // user id de Supabase (uuid) o "dev" en memoria
  email: string;
  nombre?: string;
}

export interface CrmDb {
  // ---- empresas y miembros ----
  empresaDeUsuario(userId: string): Promise<{ empresa: Empresa; miembro: Miembro } | null>;
  // Crea la empresa y su admin (primer acceso). Si el mail tiene una
  // invitación pendiente, lo suma a ESA empresa en vez de crear una nueva.
  crearEmpresaParaUsuario(usuario: UsuarioAuth, nombreEmpresa: string): Promise<{ empresa: Empresa; miembro: Miembro }>;
  empresa(id: string): Promise<Empresa | null>;
  actualizarEmpresa(id: string, patch: Partial<Empresa>): Promise<Empresa>;
  bot(empresaId: string): Promise<Bot | null>;
  guardarBot(empresaId: string, bot: Bot): Promise<Bot>;

  miembros(empresaId: string): Promise<Miembro[]>;
  miembro(id: string): Promise<Miembro | null>;
  actualizarMiembro(id: string, patch: Partial<Miembro>): Promise<Miembro>;
  quitarMiembro(id: string): Promise<void>;
  invitaciones(empresaId: string): Promise<Invitacion[]>;
  invitacionPorEmail(email: string): Promise<Invitacion | null>;
  crearInvitacion(inv: Invitacion): Promise<Invitacion>;
  borrarInvitacion(id: string): Promise<void>;

  // ---- canales ----
  canales(empresaId: string): Promise<Canal[]>;
  canal(id: string): Promise<Canal | null>;
  // Para el webhook: a qué canal (y empresa) le llegó este evento.
  canalPorExterno(tipo: CanalTipo, externoId: string, empresaId?: string): Promise<Canal | null>;
  guardarCanal(canal: Canal, credenciales?: CanalCredenciales | null): Promise<Canal>;
  credencialesCanal(id: string): Promise<CanalCredenciales | null>;
  borrarCanal(id: string): Promise<void>;

  // ---- contactos ----
  contactos(empresaId: string): Promise<Contacto[]>;
  contacto(id: string): Promise<Contacto | null>;
  // Busca por teléfono (cola de 10 dígitos), ig_id, psid o email.
  contactoPorIdentificador(empresaId: string, campo: "telefono" | "ig_id" | "psid" | "email", valor: string): Promise<Contacto | null>;
  guardarContacto(c: Contacto): Promise<Contacto>;
  guardarContactos(lista: Contacto[]): Promise<void>; // upsert masivo por id
  borrarContacto(id: string): Promise<void>;

  // ---- conversaciones ----
  conversaciones(empresaId: string, opciones?: { desde?: string; limite?: number }): Promise<Conversacion[]>;
  conversacion(id: string): Promise<Conversacion | null>;
  conversacionPorIdentificador(canalId: string, identificador: string): Promise<Conversacion | null>;
  guardarConversacion(c: Conversacion): Promise<Conversacion>;
  borrarConversacion(id: string): Promise<void>; // borra también sus mensajes

  // ---- mensajes ----
  mensajes(conversacionId: string, opciones?: { desde?: string; limite?: number }): Promise<Mensaje[]>;
  mensaje(id: string): Promise<Mensaje | null>;
  mensajePorExterno(empresaId: string, externoId: string): Promise<Mensaje | null>;
  guardarMensaje(m: Mensaje): Promise<Mensaje>; // upsert por id
  borrarMensaje(id: string): Promise<void>;
  // Para métricas: mensajes de la empresa en un rango.
  mensajesDeEmpresa(empresaId: string, desde: string, hasta: string): Promise<Mensaje[]>;

  // ---- pedidos ----
  pedidos(empresaId: string): Promise<Pedido[]>;
  pedido(id: string): Promise<Pedido | null>;
  pedidoPorNumero(empresaId: string, numero: string): Promise<Pedido | null>;
  guardarPedido(p: Pedido): Promise<Pedido>;
  guardarPedidos(lista: Pedido[]): Promise<void>; // upsert por (empresa_id, numero)
  borrarPedido(id: string): Promise<void>;

  // ---- productos ----
  productos(empresaId: string): Promise<Producto[]>;
  producto(id: string): Promise<Producto | null>;
  productoPorSku(empresaId: string, sku: string): Promise<Producto | null>;
  guardarProducto(p: Producto): Promise<Producto>;
  guardarProductos(lista: Producto[]): Promise<void>; // upsert por (empresa_id, sku)
  borrarProducto(id: string): Promise<void>;

  // ---- plantillas y rápidas ----
  plantillas(empresaId: string): Promise<Plantilla[]>;
  guardarPlantilla(p: Plantilla): Promise<Plantilla>;
  guardarPlantillas(lista: Plantilla[]): Promise<void>;
  borrarPlantilla(id: string): Promise<void>;
  rapidas(empresaId: string): Promise<Rapida[]>;
  guardarRapida(r: Rapida): Promise<Rapida>;
  borrarRapida(id: string): Promise<void>;

  // ---- chat del equipo ----
  equipoChat(empresaId: string, limite?: number): Promise<MensajeEquipo[]>;
  guardarMensajeEquipo(m: MensajeEquipo): Promise<MensajeEquipo>;
  borrarMensajeEquipo(id: string): Promise<void>;

  // ---- API keys ----
  apiKeys(empresaId: string): Promise<ApiKey[]>;
  apiKeyPorHash(hash: string): Promise<(ApiKey & { hash?: string }) | null>;
  crearApiKey(key: ApiKey, hash: string): Promise<ApiKey>;
  tocarApiKey(id: string): Promise<void>; // ultimo_uso = ahora
  borrarApiKey(id: string): Promise<void>;

  // ---- actividad (registro) ----
  actividad(empresaId: string, limite?: number): Promise<Actividad[]>;
  registrarActividad(a: Actividad): Promise<void>;

  // ---- archivos (media) ----
  // Guarda bytes y devuelve una URL pública (o servible por /api/crm/media/<clave>).
  guardarArchivo(empresaId: string, nombre: string, bytes: Uint8Array, mime: string): Promise<{ url: string; clave: string }>;
  leerArchivo(clave: string): Promise<{ bytes: Uint8Array; mime: string } | null>;

  // ---- mantenimiento ----
  // Borra TODO lo de una empresa menos la empresa, sus miembros, canales y
  // configuración (lo usa "vaciar datos de prueba").
  vaciarDatos(empresaId: string): Promise<void>;
}
