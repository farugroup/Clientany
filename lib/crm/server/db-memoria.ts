// ============================================================
// Clientany · CRM — base en memoria (SOLO servidor).
// Para `next dev`, la suite de API y Playwright. Mapas en RAM, con un
// singleton en `globalThis` (sobrevive al HMR) y, si CLIENTANY_DB=memory,
// persistencia en `.clientany-dev/db.json` (debounce de 300 ms, escritura
// atómica) y los archivos en `.clientany-dev/media/<clave>`.
// ============================================================
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
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

interface EmpresaFila extends Empresa {
  ia_clave_cifrada?: string | null;
}
interface CanalFila extends Canal {
  token_cifrado?: string | null;
  app_secret_cifrado?: string | null;
}
interface ApiKeyFila extends ApiKey {
  hash: string;
}

interface Volcado {
  version: 1;
  empresas: EmpresaFila[];
  bots: { empresa_id: string; bot: Bot }[];
  miembros: Miembro[];
  invitaciones: Invitacion[];
  canales: CanalFila[];
  contactos: Contacto[];
  conversaciones: Conversacion[];
  mensajes: Mensaje[];
  pedidos: Pedido[];
  productos: Producto[];
  plantillas: Plantilla[];
  rapidas: Rapida[];
  equipo: MensajeEquipo[];
  apiKeys: ApiKeyFila[];
  actividad: Actividad[];
}

const DIR = () => path.join(process.cwd(), ".clientany-dev");

function copia<T>(x: T): T {
  return structuredClone(x);
}

function ms(iso: string | undefined | null): number {
  return iso ? new Date(iso).getTime() : 0;
}

function aMap<T extends { id: string }>(lista: T[] | undefined): Map<string, T> {
  const m = new Map<string, T>();
  for (const x of lista || []) m.set(x.id, x);
  return m;
}

export class DbMemoria implements CrmDbCompleta {
  private empresas = new Map<string, EmpresaFila>();
  private bots = new Map<string, Bot>();
  private miembrosM = new Map<string, Miembro>();
  private invitacionesM = new Map<string, Invitacion>();
  private canalesM = new Map<string, CanalFila>();
  private contactosM = new Map<string, Contacto>();
  private conversacionesM = new Map<string, Conversacion>();
  private mensajesM = new Map<string, Mensaje>();
  private pedidosM = new Map<string, Pedido>();
  private productosM = new Map<string, Producto>();
  private plantillasM = new Map<string, Plantilla>();
  private rapidasM = new Map<string, Rapida>();
  private equipoM = new Map<string, MensajeEquipo>();
  private apiKeysM = new Map<string, ApiKeyFila>();
  private actividadM = new Map<string, Actividad>();
  private archivos = new Map<string, { bytes: Uint8Array; mime: string }>();
  private persistir: boolean;
  private timer: NodeJS.Timeout | null = null;

  constructor(persistir: boolean) {
    this.persistir = persistir;
    if (persistir) this.cargar();
  }

  // ---------- persistencia ----------
  private cargar() {
    const archivo = path.join(DIR(), "db.json");
    if (!existsSync(archivo)) return;
    try {
      const v = JSON.parse(readFileSync(archivo, "utf8")) as Partial<Volcado>;
      this.empresas = aMap(v.empresas);
      this.bots = new Map((v.bots || []).map((b) => [b.empresa_id, b.bot]));
      this.miembrosM = aMap(v.miembros);
      this.invitacionesM = aMap(v.invitaciones);
      this.canalesM = aMap(v.canales);
      this.contactosM = aMap(v.contactos);
      this.conversacionesM = aMap(v.conversaciones);
      this.mensajesM = aMap(v.mensajes);
      this.pedidosM = aMap(v.pedidos);
      this.productosM = aMap(v.productos);
      this.plantillasM = aMap(v.plantillas);
      this.rapidasM = aMap(v.rapidas);
      this.equipoM = aMap(v.equipo);
      this.apiKeysM = aMap(v.apiKeys);
      this.actividadM = aMap(v.actividad);
    } catch (e) {
      console.error("[crm] No pude leer .clientany-dev/db.json, arranco vacío:", e instanceof Error ? e.message : e);
    }
  }

  private guardarPronto() {
    if (!this.persistir) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      try {
        this.volcar();
      } catch (e) {
        console.error("[crm] No pude escribir .clientany-dev/db.json:", e instanceof Error ? e.message : e);
      }
    }, 300);
    // Que el timer no mantenga vivo el proceso en los tests.
    if (typeof this.timer.unref === "function") this.timer.unref();
  }

  private volcar() {
    const dir = DIR();
    mkdirSync(dir, { recursive: true });
    const v: Volcado = {
      version: 1,
      empresas: [...this.empresas.values()],
      bots: [...this.bots.entries()].map(([empresa_id, bot]) => ({ empresa_id, bot })),
      miembros: [...this.miembrosM.values()],
      invitaciones: [...this.invitacionesM.values()],
      canales: [...this.canalesM.values()],
      contactos: [...this.contactosM.values()],
      conversaciones: [...this.conversacionesM.values()],
      mensajes: [...this.mensajesM.values()],
      pedidos: [...this.pedidosM.values()],
      productos: [...this.productosM.values()],
      plantillas: [...this.plantillasM.values()],
      rapidas: [...this.rapidasM.values()],
      equipo: [...this.equipoM.values()],
      apiKeys: [...this.apiKeysM.values()],
      actividad: [...this.actividadM.values()],
    };
    const final = path.join(dir, "db.json");
    const tmp = final + ".tmp";
    writeFileSync(tmp, JSON.stringify(v));
    renameSync(tmp, final);
  }

  // Escribe ya mismo (lo usan los tests al cerrar).
  volcarAhora() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.persistir) this.volcar();
  }

  private sinSecretos(e: EmpresaFila): Empresa {
    const { ia_clave_cifrada: _k, ...resto } = e;
    void _k;
    return copia(resto);
  }

  private canalPublico(c: CanalFila): Canal {
    const { token_cifrado: _t, app_secret_cifrado: _s, ...resto } = c;
    void _t;
    void _s;
    return copia({ ...resto, token_cargado: !!c.token_cifrado, app_secret_cargado: !!c.app_secret_cifrado });
  }

  // ---------- empresas y miembros ----------
  async empresaDeUsuario(userId: string) {
    const miembro = this.miembrosM.get(userId);
    if (!miembro) return null;
    const empresa = this.empresas.get(miembro.empresa_id);
    if (!empresa) return null;
    return { empresa: this.sinSecretos(empresa), miembro: copia(miembro) };
  }

  async crearEmpresaParaUsuario(usuario: UsuarioAuth, nombreEmpresa: string) {
    const ya = await this.empresaDeUsuario(usuario.id);
    if (ya) return ya;
    const inv = await this.invitacionPorEmail(usuario.email);
    if (inv && this.empresas.has(inv.empresa_id)) {
      const miembro = miembroNuevo(usuario, inv.empresa_id, inv.rol);
      this.miembrosM.set(miembro.id, miembro);
      this.invitacionesM.delete(inv.id);
      this.guardarPronto();
      return { empresa: this.sinSecretos(this.empresas.get(inv.empresa_id)!), miembro: copia(miembro) };
    }
    const empresa: EmpresaFila = { ...empresaNueva(uid("emp"), nombreEmpresa), ia_clave_cifrada: null };
    this.empresas.set(empresa.id, empresa);
    this.bots.set(empresa.id, copia(BOT_DEFAULT));
    const miembro = miembroNuevo(usuario, empresa.id, "admin");
    this.miembrosM.set(miembro.id, miembro);
    this.guardarPronto();
    return { empresa: this.sinSecretos(empresa), miembro: copia(miembro) };
  }

  async empresa(id: string) {
    const e = this.empresas.get(id);
    return e ? this.sinSecretos(e) : null;
  }

  async actualizarEmpresa(id: string, patch: Partial<Empresa>) {
    const e = this.empresas.get(id);
    if (!e) throw new Error("La empresa no existe");
    const { id: _id, creado: _c, ...resto } = patch;
    void _id;
    void _c;
    Object.assign(e, copia(resto));
    this.guardarPronto();
    return this.sinSecretos(e);
  }

  async claveIaCifrada(empresaId: string) {
    return this.empresas.get(empresaId)?.ia_clave_cifrada || null;
  }

  async guardarClaveIa(empresaId: string, cifrada: string | null) {
    const e = this.empresas.get(empresaId);
    if (!e) throw new Error("La empresa no existe");
    e.ia_clave_cifrada = cifrada;
    this.guardarPronto();
  }

  async bot(empresaId: string) {
    const b = this.bots.get(empresaId);
    return b ? copia(b) : null;
  }

  async guardarBot(empresaId: string, bot: Bot) {
    this.bots.set(empresaId, copia(bot));
    this.guardarPronto();
    return copia(bot);
  }

  async miembros(empresaId: string) {
    return [...this.miembrosM.values()]
      .filter((m) => m.empresa_id === empresaId)
      .sort((a, b) => ms(a.creado) - ms(b.creado))
      .map(copia);
  }

  async miembro(id: string) {
    const m = this.miembrosM.get(id);
    return m ? copia(m) : null;
  }

  async actualizarMiembro(id: string, patch: Partial<Miembro>) {
    const m = this.miembrosM.get(id);
    if (!m) throw new Error("El miembro no existe");
    const { id: _id, empresa_id: _e, ...resto } = patch;
    void _id;
    void _e;
    Object.assign(m, copia(resto));
    this.guardarPronto();
    return copia(m);
  }

  async quitarMiembro(id: string) {
    this.miembrosM.delete(id);
    this.guardarPronto();
  }

  async invitaciones(empresaId: string) {
    return [...this.invitacionesM.values()].filter((i) => i.empresa_id === empresaId).map(copia);
  }

  async invitacionPorEmail(email: string) {
    const e = (email || "").trim().toLowerCase();
    if (!e) return null;
    const inv = [...this.invitacionesM.values()].find((i) => i.email.toLowerCase() === e);
    return inv ? copia(inv) : null;
  }

  async crearInvitacion(inv: Invitacion) {
    this.invitacionesM.set(inv.id, copia(inv));
    this.guardarPronto();
    return copia(inv);
  }

  async borrarInvitacion(id: string) {
    this.invitacionesM.delete(id);
    this.guardarPronto();
  }

  // ---------- canales ----------
  async canales(empresaId: string) {
    return [...this.canalesM.values()].filter((c) => c.empresa_id === empresaId).map((c) => this.canalPublico(c));
  }

  async canal(id: string) {
    const c = this.canalesM.get(id);
    return c ? this.canalPublico(c) : null;
  }

  async canalPorExterno(tipo: CanalTipo, externoId: string, empresaId?: string) {
    const c = [...this.canalesM.values()].find(
      (x) => x.tipo === tipo && x.externo_id === externoId && (!empresaId || x.empresa_id === empresaId)
    );
    return c ? this.canalPublico(c) : null;
  }

  // `credenciales` undefined = no tocar las guardadas; null = borrarlas.
  async guardarCanal(canal: Canal, credenciales?: CanalCredenciales | null) {
    const previo = this.canalesM.get(canal.id);
    const fila: CanalFila = {
      ...copia(canal),
      token_cifrado: previo?.token_cifrado || null,
      app_secret_cifrado: previo?.app_secret_cifrado || null,
    };
    if (credenciales === null) {
      fila.token_cifrado = null;
      fila.app_secret_cifrado = null;
    } else if (credenciales) {
      fila.token_cifrado = credenciales.token ? cifrar(credenciales.token) : null;
      fila.app_secret_cifrado = credenciales.app_secret ? cifrar(credenciales.app_secret) : null;
    }
    this.canalesM.set(fila.id, fila);
    this.guardarPronto();
    return this.canalPublico(fila);
  }

  async credencialesCanal(id: string) {
    const c = this.canalesM.get(id);
    if (!c || !c.token_cifrado) return null;
    return {
      token: descifrar(c.token_cifrado),
      app_secret: c.app_secret_cifrado ? descifrar(c.app_secret_cifrado) : undefined,
    };
  }

  async borrarCanal(id: string) {
    this.canalesM.delete(id);
    this.guardarPronto();
  }

  // ---------- contactos ----------
  async contactos(empresaId: string) {
    return [...this.contactosM.values()]
      .filter((c) => c.empresa_id === empresaId)
      .sort((a, b) => ms(b.actualizado) - ms(a.actualizado))
      .map(copia);
  }

  async contacto(id: string) {
    const c = this.contactosM.get(id);
    return c ? copia(c) : null;
  }

  async contactoPorIdentificador(empresaId: string, campo: "telefono" | "ig_id" | "psid" | "email", valor: string) {
    const v = (valor || "").trim();
    if (!v) return null;
    const cola = campo === "telefono" ? colaTelefono(v) : "";
    const c = [...this.contactosM.values()].find((x) => {
      if (x.empresa_id !== empresaId) return false;
      if (campo === "telefono") return cola.length >= 8 && colaTelefono(x.telefono) === cola;
      if (campo === "email") return (x.email || "").toLowerCase() === v.toLowerCase();
      return x[campo] === v;
    });
    return c ? copia(c) : null;
  }

  async guardarContacto(c: Contacto) {
    this.contactosM.set(c.id, copia(c));
    this.guardarPronto();
    return copia(c);
  }

  async guardarContactos(lista: Contacto[]) {
    for (const c of lista) this.contactosM.set(c.id, copia(c));
    this.guardarPronto();
  }

  async borrarContacto(id: string) {
    this.contactosM.delete(id);
    this.guardarPronto();
  }

  // ---------- conversaciones ----------
  async conversaciones(empresaId: string, opciones?: { desde?: string; limite?: number }) {
    const desde = ms(opciones?.desde);
    return [...this.conversacionesM.values()]
      .filter((c) => c.empresa_id === empresaId && (!desde || ms(c.actualizado) > desde))
      .sort((a, b) => ms(b.actualizado) - ms(a.actualizado))
      .slice(0, opciones?.limite ?? 500)
      .map(copia);
  }

  async conversacion(id: string) {
    const c = this.conversacionesM.get(id);
    return c ? copia(c) : null;
  }

  async conversacionPorIdentificador(canalId: string, identificador: string) {
    const c = [...this.conversacionesM.values()].find((x) => x.canal_id === canalId && x.identificador === identificador);
    return c ? copia(c) : null;
  }

  async guardarConversacion(c: Conversacion) {
    this.conversacionesM.set(c.id, copia(c));
    this.guardarPronto();
    return copia(c);
  }

  async borrarConversacion(id: string) {
    this.conversacionesM.delete(id);
    for (const [mid, m] of this.mensajesM) if (m.conversacion_id === id) this.mensajesM.delete(mid);
    this.guardarPronto();
  }

  // ---------- mensajes ----------
  async mensajes(conversacionId: string, opciones?: { desde?: string; limite?: number }) {
    const desde = ms(opciones?.desde);
    const lista = [...this.mensajesM.values()]
      .filter((m) => m.conversacion_id === conversacionId && (!desde || ms(m.creado) > desde))
      .sort((a, b) => ms(a.creado) - ms(b.creado));
    const limite = opciones?.limite;
    return (limite ? lista.slice(-limite) : lista).map(copia);
  }

  async mensaje(id: string) {
    const m = this.mensajesM.get(id);
    return m ? copia(m) : null;
  }

  async mensajePorExterno(empresaId: string, externoId: string) {
    if (!externoId) return null;
    const m = [...this.mensajesM.values()].find((x) => x.empresa_id === empresaId && x.externo_id === externoId);
    return m ? copia(m) : null;
  }

  async guardarMensaje(m: Mensaje) {
    this.mensajesM.set(m.id, copia(m));
    this.guardarPronto();
    return copia(m);
  }

  async borrarMensaje(id: string) {
    this.mensajesM.delete(id);
    this.guardarPronto();
  }

  async mensajesDeEmpresa(empresaId: string, desde: string, hasta: string) {
    const d = ms(desde);
    const h = ms(hasta);
    return [...this.mensajesM.values()]
      .filter((m) => m.empresa_id === empresaId && ms(m.creado) >= d && ms(m.creado) <= h)
      .sort((a, b) => ms(a.creado) - ms(b.creado))
      .map(copia);
  }

  // ---------- pedidos ----------
  async pedidos(empresaId: string) {
    return [...this.pedidosM.values()]
      .filter((p) => p.empresa_id === empresaId)
      .sort((a, b) => ms(b.creado) - ms(a.creado))
      .map(copia);
  }

  async pedido(id: string) {
    const p = this.pedidosM.get(id);
    return p ? copia(p) : null;
  }

  async pedidoPorNumero(empresaId: string, numero: string) {
    const n = (numero || "").trim().toLowerCase();
    const p = [...this.pedidosM.values()].find((x) => x.empresa_id === empresaId && x.numero.trim().toLowerCase() === n);
    return p ? copia(p) : null;
  }

  async guardarPedido(p: Pedido) {
    // upsert por (empresa_id, numero): si ya hay uno con ese número y otro id, lo reemplaza
    const previo = await this.pedidoPorNumero(p.empresa_id, p.numero);
    if (previo && previo.id !== p.id) this.pedidosM.delete(previo.id);
    this.pedidosM.set(p.id, copia(p));
    this.guardarPronto();
    return copia(p);
  }

  async guardarPedidos(lista: Pedido[]) {
    for (const p of lista) await this.guardarPedido(p);
  }

  async borrarPedido(id: string) {
    this.pedidosM.delete(id);
    this.guardarPronto();
  }

  // ---------- productos ----------
  async productos(empresaId: string) {
    return [...this.productosM.values()]
      .filter((p) => p.empresa_id === empresaId)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      .map(copia);
  }

  async producto(id: string) {
    const p = this.productosM.get(id);
    return p ? copia(p) : null;
  }

  async productoPorSku(empresaId: string, sku: string) {
    const s = (sku || "").trim().toLowerCase();
    const p = [...this.productosM.values()].find((x) => x.empresa_id === empresaId && x.sku.trim().toLowerCase() === s);
    return p ? copia(p) : null;
  }

  async guardarProducto(p: Producto) {
    const previo = await this.productoPorSku(p.empresa_id, p.sku);
    if (previo && previo.id !== p.id) this.productosM.delete(previo.id);
    this.productosM.set(p.id, copia(p));
    this.guardarPronto();
    return copia(p);
  }

  async guardarProductos(lista: Producto[]) {
    for (const p of lista) await this.guardarProducto(p);
  }

  async borrarProducto(id: string) {
    this.productosM.delete(id);
    this.guardarPronto();
  }

  // ---------- plantillas y rápidas ----------
  async plantillas(empresaId: string) {
    return [...this.plantillasM.values()]
      .filter((p) => p.empresa_id === empresaId)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      .map(copia);
  }

  async guardarPlantilla(p: Plantilla) {
    const previo = [...this.plantillasM.values()].find(
      (x) => x.empresa_id === p.empresa_id && x.nombre === p.nombre && x.idioma === p.idioma && x.id !== p.id
    );
    if (previo) this.plantillasM.delete(previo.id);
    this.plantillasM.set(p.id, copia(p));
    this.guardarPronto();
    return copia(p);
  }

  async guardarPlantillas(lista: Plantilla[]) {
    for (const p of lista) await this.guardarPlantilla(p);
  }

  async borrarPlantilla(id: string) {
    this.plantillasM.delete(id);
    this.guardarPronto();
  }

  async rapidas(empresaId: string) {
    return [...this.rapidasM.values()]
      .filter((r) => r.empresa_id === empresaId)
      .sort((a, b) => a.atajo.localeCompare(b.atajo, "es"))
      .map(copia);
  }

  async guardarRapida(r: Rapida) {
    this.rapidasM.set(r.id, copia(r));
    this.guardarPronto();
    return copia(r);
  }

  async borrarRapida(id: string) {
    this.rapidasM.delete(id);
    this.guardarPronto();
  }

  // ---------- chat del equipo ----------
  async equipoChat(empresaId: string, limite = 200) {
    return [...this.equipoM.values()]
      .filter((m) => m.empresa_id === empresaId)
      .sort((a, b) => ms(a.creado) - ms(b.creado))
      .slice(-limite)
      .map(copia);
  }

  async guardarMensajeEquipo(m: MensajeEquipo) {
    this.equipoM.set(m.id, copia(m));
    this.guardarPronto();
    return copia(m);
  }

  async borrarMensajeEquipo(id: string) {
    this.equipoM.delete(id);
    this.guardarPronto();
  }

  // ---------- API keys ----------
  async apiKeys(empresaId: string) {
    return [...this.apiKeysM.values()]
      .filter((k) => k.empresa_id === empresaId)
      .sort((a, b) => ms(a.creado) - ms(b.creado))
      .map((k) => {
        const { hash: _h, ...resto } = k;
        void _h;
        return copia(resto);
      });
  }

  async apiKeyPorHash(hash: string) {
    const k = [...this.apiKeysM.values()].find((x) => x.hash === hash);
    return k ? copia(k) : null;
  }

  async crearApiKey(key: ApiKey, hash: string) {
    this.apiKeysM.set(key.id, { ...copia(key), hash });
    this.guardarPronto();
    return copia(key);
  }

  async tocarApiKey(id: string) {
    const k = this.apiKeysM.get(id);
    if (k) {
      k.ultimo_uso = new Date().toISOString();
      this.guardarPronto();
    }
  }

  async borrarApiKey(id: string) {
    this.apiKeysM.delete(id);
    this.guardarPronto();
  }

  // ---------- actividad ----------
  async actividad(empresaId: string, limite = 50) {
    return [...this.actividadM.values()]
      .filter((a) => a.empresa_id === empresaId)
      .sort((a, b) => ms(b.creado) - ms(a.creado))
      .slice(0, limite)
      .map(copia);
  }

  async registrarActividad(a: Actividad) {
    this.actividadM.set(a.id, copia(a));
    // Que no crezca sin fin en desarrollo: nos quedamos con las últimas 500 por empresa.
    const deEmpresa = [...this.actividadM.values()]
      .filter((x) => x.empresa_id === a.empresa_id)
      .sort((x, y) => ms(y.creado) - ms(x.creado));
    for (const vieja of deEmpresa.slice(500)) this.actividadM.delete(vieja.id);
    this.guardarPronto();
  }

  async registrarWebhook(r: RegistroWebhook) {
    console.log(
      `[crm webhook] empresa=${r.empresa_id || "?"} objeto=${r.objeto} entrantes=${r.entrantes} estados=${r.estados}${r.error ? ` error=${r.error}` : ""}`
    );
  }

  // ---------- archivos ----------
  async guardarArchivo(empresaId: string, nombre: string, bytes: Uint8Array, mime: string) {
    const limpio = nombre.replace(/[^A-Za-z0-9._-]/g, "_");
    const clave = `${empresaId}-${limpio}`.replace(/[^A-Za-z0-9._-]/g, "_");
    this.archivos.set(clave, { bytes: new Uint8Array(bytes), mime });
    if (this.persistir) {
      const dir = path.join(DIR(), "media");
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, clave), bytes);
      writeFileSync(path.join(dir, clave + ".json"), JSON.stringify({ mime }));
    }
    return { url: `/api/crm/media/${encodeURIComponent(clave)}`, clave };
  }

  async leerArchivo(clave: string) {
    const enRam = this.archivos.get(clave);
    if (enRam) return { bytes: enRam.bytes, mime: enRam.mime };
    if (!this.persistir) return null;
    if (!/^[A-Za-z0-9._-]+$/.test(clave)) return null;
    const ruta = path.join(DIR(), "media", clave);
    if (!existsSync(ruta)) return null;
    let mime = "application/octet-stream";
    try {
      mime = (JSON.parse(readFileSync(ruta + ".json", "utf8")) as { mime?: string }).mime || mime;
    } catch {
      // sin sidecar: binario genérico
    }
    return { bytes: new Uint8Array(readFileSync(ruta)), mime };
  }

  // ---------- mantenimiento ----------
  async vaciarDatos(empresaId: string) {
    const borrar = <T extends { empresa_id: string }>(m: Map<string, T>) => {
      for (const [id, x] of m) if (x.empresa_id === empresaId) m.delete(id);
    };
    borrar(this.contactosM);
    borrar(this.conversacionesM);
    borrar(this.mensajesM);
    borrar(this.pedidosM);
    borrar(this.productosM);
    borrar(this.equipoM);
    borrar(this.actividadM);
    this.guardarPronto();
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __clientanyDb: DbMemoria | undefined;
}

export function getDbMemoria(): DbMemoria {
  if (!globalThis.__clientanyDb) {
    globalThis.__clientanyDb = new DbMemoria(process.env.CLIENTANY_DB === "memory");
  }
  return globalThis.__clientanyDb;
}

// Para que `CrmDb` y la implementación no se desalineen sin que tsc avise.
export const _chequeoTipo: CrmDb = null as unknown as DbMemoria;
