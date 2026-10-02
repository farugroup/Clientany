// ============================================================
// Clientany · CRM — lógica pura, sin estado ni red.
// La usan el navegador (modo demo y modo nube), el servidor (webhooks,
// API) y los tests. Nada de acá importa React ni Supabase.
// ============================================================
import type {
  CanalTipo,
  Conversacion,
  FilaBandeja,
  FiltroBandeja,
  Grupo,
  Horario,
  HorarioDia,
  Pedido,
  PedidoEstado,
  Producto,
} from "./types";

// ---------- ids y fechas ----------
export function uid(prefijo = "id"): string {
  const r = Math.random().toString(36).slice(2, 10);
  const t = Date.now().toString(36).slice(-6);
  return `${prefijo}_${t}${r}`;
}

export function ahoraIso(): string {
  return new Date().toISOString();
}

export function tokenAleatorio(largo = 32): string {
  const abc = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  // crypto si está (navegador y Node 19+), si no Math.random
  const c: Crypto | undefined = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (c && typeof c.getRandomValues === "function") {
    const arr = new Uint8Array(largo);
    c.getRandomValues(arr);
    for (let i = 0; i < largo; i++) s += abc[arr[i] % abc.length];
    return s;
  }
  for (let i = 0; i < largo; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

// ---------- texto ----------
export function sinAcentos(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Para comparar: sin acentos, sin signos, espacios simples.
export function normalizarTexto(s: string): string {
  return sinAcentos(s)
    .replace(/[^\p{L}\p{N}\s#@+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function iniciales(nombre: string): string {
  return (
    (nombre || "?")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function recortar(s: string, n: number): string {
  const t = (s || "").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

// Reemplaza {nombre}, {marca}, {producto}… en un texto.
export function rellenar(texto: string, vars: Record<string, string | number | undefined | null>): string {
  return (texto || "").replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = vars[k];
    return v === undefined || v === null ? m : String(v);
  });
}

// ---------- teléfonos ----------
// Devuelve sólo dígitos con el país adelante. Argentina: "11 5555-1234" →
// "5491155551234". Si ya viene con país lo respeta. Vacío si no parece un
// teléfono.
export function normalizarTelefono(raw: string | undefined | null, paisDefault = "54"): string {
  let d = (raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (paisDefault === "54") {
    if (d.startsWith("549") && d.length >= 12) return d;
    if (d.startsWith("54") && d.length === 12) return "549" + d.slice(2); // 54 11 1234 5678 sin el 9
    if (d.startsWith("54") && d.length === 13) return d;
    if (d.startsWith("0")) d = d.slice(1); // 011…
    if (d.startsWith("15") && d.length === 10) d = d.slice(2); // 15 xxxx xxxx (sin área)
    // área + 15 + número («11 15 2222-1111», «351 15 555 1020», «2345 15 123456»):
    // sacando el 15 tienen que quedar los 10 dígitos de siempre
    if (d.length === 12 && !d.startsWith("54")) {
      for (const area of [2, 3, 4]) {
        if (d.slice(area, area + 2) === "15") {
          d = d.slice(0, area) + d.slice(area + 2);
          break;
        }
      }
    }
    if (d.length === 10) return "549" + d; // 11 5555 1234
    if (d.length === 8) return "54911" + d; // sin área: asumimos AMBA
    if (d.length >= 11 && !d.startsWith("54")) return d; // otro país
    return d;
  }
  if (d.length <= 10) return paisDefault + d;
  return d;
}

// Los últimos 10 dígitos: para buscar un pedido por teléfono aunque esté
// cargado con otro formato.
export function colaTelefono(raw: string | undefined | null): string {
  return (raw || "").replace(/\D/g, "").slice(-10);
}

export function telefonoLindo(tel: string | undefined | null): string {
  const d = (tel || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("549") && d.length === 13) {
    const area = d.slice(3, 5);
    const resto = d.slice(5);
    if (area === "11") return `+54 9 11 ${resto.slice(0, 4)}-${resto.slice(4)}`;
    return `+54 9 ${d.slice(3, 6)} ${d.slice(6, 9)}-${d.slice(9)}`;
  }
  return "+" + d;
}

export function emailValido(e: string | undefined | null): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || "").trim());
}

// ---------- horario de atención ----------
export const HORARIO_DEFAULT: Horario = {
  zona: "America/Argentina/Buenos_Aires",
  dias: [
    { dia: 1, abre: true, desde: "09:00", hasta: "18:00" },
    { dia: 2, abre: true, desde: "09:00", hasta: "18:00" },
    { dia: 3, abre: true, desde: "09:00", hasta: "18:00" },
    { dia: 4, abre: true, desde: "09:00", hasta: "18:00" },
    { dia: 5, abre: true, desde: "09:00", hasta: "18:00" },
    { dia: 6, abre: true, desde: "10:00", hasta: "13:00" },
    { dia: 0, abre: false, desde: "10:00", hasta: "13:00" },
  ],
};

// Partes de la fecha en una zona horaria (sin librerías).
export function partesEnZona(fecha: Date, zona: string): {
  dia: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  hora: number;
  minuto: number;
  ymd: string;
} {
  try {
    const f = new Intl.DateTimeFormat("en-US", {
      timeZone: zona,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const p: Record<string, string> = {};
    for (const x of f.formatToParts(fecha)) p[x.type] = x.value;
    const dias: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const hora = Number(p.hour === "24" ? "0" : p.hour);
    return {
      dia: dias[p.weekday] ?? 0,
      hora,
      minuto: Number(p.minute),
      ymd: `${p.year}-${p.month}-${p.day}`,
    };
  } catch {
    return {
      dia: fecha.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      hora: fecha.getHours(),
      minuto: fecha.getMinutes(),
      ymd: fecha.toISOString().slice(0, 10),
    };
  }
}

function minutos(hhmm: string): number {
  const [h, m] = (hhmm || "0:0").split(":").map((x) => Number(x) || 0);
  return h * 60 + m;
}

export function diaHorario(horario: Horario, dia: number): HorarioDia | undefined {
  return (horario?.dias || HORARIO_DEFAULT.dias).find((d) => d.dia === dia);
}

export function estaAbierto(horario: Horario | undefined, fecha: Date = new Date()): boolean {
  const h = horario || HORARIO_DEFAULT;
  const p = partesEnZona(fecha, h.zona || HORARIO_DEFAULT.zona);
  const d = diaHorario(h, p.dia);
  if (!d || !d.abre) return false;
  const ahora = p.hora * 60 + p.minuto;
  return ahora >= minutos(d.desde) && ahora < minutos(d.hasta);
}

// "lunes a viernes de 9 a 18 y sábados de 10 a 13" para los textos del bot.
export function horarioEnCriollo(horario: Horario | undefined): string {
  const h = horario || HORARIO_DEFAULT;
  const nombres = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const abiertos = [...h.dias].filter((d) => d.abre).sort((a, b) => a.dia - b.dia);
  if (!abiertos.length) return "sin horario de atención cargado";
  const grupos: { desde: string; hasta: string; dias: number[] }[] = [];
  for (const d of abiertos) {
    const g = grupos.find((x) => x.desde === d.desde && x.hasta === d.hasta);
    if (g) g.dias.push(d.dia);
    else grupos.push({ desde: d.desde, hasta: d.hasta, dias: [d.dia] });
  }
  const hora = (s: string) => (s.endsWith(":00") ? s.slice(0, -3) : s);
  return grupos
    .map((g) => {
      const ds = g.dias.map((x) => nombres[x]);
      const rango = ds.length > 2 ? `${ds[0]} a ${ds[ds.length - 1]}` : ds.join(" y ");
      return `${rango} de ${hora(g.desde)} a ${hora(g.hasta)}`;
    })
    .join(" y ");
}

// ---------- ventana de 24 hs de WhatsApp ----------
export function horasDeVentana(conv: Pick<Conversacion, "canal" | "ultimo_entrante_en">, ahora: Date = new Date()): number | null {
  if (conv.canal !== "whatsapp" && conv.canal !== "instagram" && conv.canal !== "messenger") return null;
  if (!conv.ultimo_entrante_en) return 0;
  const t = new Date(conv.ultimo_entrante_en).getTime();
  const horas = 24 - (ahora.getTime() - t) / 3_600_000;
  return horas > 0 ? Math.floor(horas * 10) / 10 : 0;
}

export function ventanaAbierta(conv: Pick<Conversacion, "canal" | "ultimo_entrante_en">, ahora: Date = new Date()): boolean {
  const h = horasDeVentana(conv, ahora);
  return h === null ? true : h > 0;
}

// ---------- bandeja: en qué grupo cae cada chat ----------
export function escribioDespues(conv: Conversacion): boolean {
  if (!conv.ultimo_entrante_en) return false;
  if (!conv.visto_in) return true;
  return new Date(conv.ultimo_entrante_en).getTime() > new Date(conv.visto_in).getTime();
}

export function recordatorioVencido(conv: Conversacion, ahora: Date = new Date()): boolean {
  if (!conv.recordar?.fecha) return false;
  return new Date(conv.recordar.fecha).getTime() <= ahora.getTime();
}

// Reglas, en orden:
//  1. Baja → "baja" (siempre, aunque escriba).
//  2. Recordatorio pendiente y no vencido → "mas_adelante".
//  3. El cliente escribió después de que lo atendieron → "ventas"
//     (salvo soporte, que se queda en soporte y se marca urgente en la UI).
//  4. Grupo puesto a mano (soporte / resueltos) → ese.
//  5. Si no, "ventas".
export function grupoDe(conv: Conversacion, ahora: Date = new Date()): Grupo {
  if (conv.baja) return "baja";
  if (conv.recordar?.fecha && !recordatorioVencido(conv, ahora)) return "mas_adelante";
  const despues = escribioDespues(conv);
  if (conv.grupo === "soporte") return "soporte";
  if (despues) return "ventas";
  if (conv.grupo === "resueltos") return "resueltos";
  if (conv.grupo === "mas_adelante" && !conv.recordar) return "ventas";
  return "ventas";
}

export const GRUPOS: { id: Grupo; nombre: string; vacio: string }[] = [
  { id: "ventas", nombre: "Ventas", vacio: "Ningún chat esperando. Cuando un cliente escriba, aparece acá." },
  { id: "soporte", nombre: "Soporte", vacio: "Nadie con un problema por ahora." },
  { id: "mas_adelante", nombre: "Más adelante", vacio: "Nada pospuesto: desde el chat, «Posponer» o «Mañana»." },
  { id: "resueltos", nombre: "Resueltos", vacio: "Nada resuelto todavía." },
  { id: "baja", nombre: "Baja", vacio: "Nadie dado de baja." },
];

export const CANALES: { id: CanalTipo; nombre: string }[] = [
  { id: "whatsapp", nombre: "WhatsApp" },
  { id: "instagram", nombre: "Instagram" },
  { id: "messenger", nombre: "Messenger" },
  { id: "manual", nombre: "Manual" },
];

export function armarFila(conv: Conversacion, ahora: Date = new Date()): FilaBandeja {
  return {
    ...conv,
    grupo_calculado: grupoDe(conv, ahora),
    escribio_despues: escribioDespues(conv),
    ventana_horas: horasDeVentana(conv, ahora),
  };
}

export function filtrarBandeja(
  convs: Conversacion[],
  filtro: FiltroBandeja,
  ahora: Date = new Date()
): FilaBandeja[] {
  const q = normalizarTexto(filtro.q || "");
  let filas = convs.map((c) => armarFila(c, ahora));
  if (filtro.marca_id && filtro.marca_id !== "all") {
    filas = filas.filter((c) => !c.marca_id || c.marca_id === filtro.marca_id);
  }
  if (filtro.canal && filtro.canal !== "todos") filas = filas.filter((c) => c.canal === filtro.canal);
  if (filtro.asignado_a) filas = filas.filter((c) => c.asignado_a === filtro.asignado_a);
  if (q) {
    // Con búsqueda se ignoran los grupos: cada fila dice en cuál está.
    filas = filas.filter((c) =>
      normalizarTexto(`${c.nombre} ${c.identificador} ${c.ultimo_texto} ${c.nota || ""}`).includes(q)
    );
  } else if (filtro.grupo && filtro.grupo !== "todos") {
    filas = filas.filter((c) => c.grupo_calculado === filtro.grupo);
  }
  const dir = filtro.orden === "antiguos" ? 1 : -1;
  filas.sort((a, b) => (new Date(a.ultimo_en).getTime() - new Date(b.ultimo_en).getTime()) * dir);
  return filas;
}

export function contarGrupos(convs: Conversacion[], ahora: Date = new Date()): Record<Grupo, number> & { sin_responder: number } {
  const r: Record<Grupo, number> & { sin_responder: number } = {
    ventas: 0, soporte: 0, mas_adelante: 0, resueltos: 0, baja: 0, sin_responder: 0,
  };
  for (const c of convs) {
    r[grupoDe(c, ahora)] += 1;
    if (escribioDespues(c) && !c.baja) r.sin_responder += 1;
  }
  return r;
}

// ---------- pedidos ----------
export const ESTADOS_PEDIDO: { id: PedidoEstado; nombre: string; color: string }[] = [
  { id: "pendiente", nombre: "Pendiente de pago", color: "#f59e0b" },
  { id: "pagado", nombre: "Pagado", color: "#598bff" },
  { id: "preparacion", nombre: "En preparación", color: "#8b5cf6" },
  { id: "enviado", nombre: "Enviado", color: "#3563ff" },
  { id: "entregado", nombre: "Entregado", color: "#16a34a" },
  { id: "cancelado", nombre: "Cancelado", color: "#ef4444" },
  { id: "devuelto", nombre: "Devuelto", color: "#9aa3c0" },
];

export function nombreEstadoPedido(e: PedidoEstado): string {
  return ESTADOS_PEDIDO.find((x) => x.id === e)?.nombre || e;
}

export function estadoPedidoEnCriollo(p: Pedido): string {
  const n = nombreEstadoPedido(p.estado).toLowerCase();
  const seg = p.envio?.seguimiento ? ` Seguimiento: ${p.envio.seguimiento}${p.envio.transporte ? ` (${p.envio.transporte})` : ""}.` : "";
  const url = p.envio?.url ? ` ${p.envio.url}` : "";
  return `Tu pedido ${p.numero} está ${n}.${seg}${url}`.trim();
}

// Pedidos de un contacto: por id, y si no por teléfono o mail.
export function pedidosDeContacto(
  pedidos: Pedido[],
  contacto: { id?: string; telefono?: string | null; email?: string | null }
): Pedido[] {
  const cola = colaTelefono(contacto.telefono);
  const mail = (contacto.email || "").trim().toLowerCase();
  return pedidos
    .filter(
      (p) =>
        (contacto.id && p.contacto_id === contacto.id) ||
        (cola.length >= 8 && colaTelefono(p.telefono) === cola) ||
        (mail && (p.email || "").trim().toLowerCase() === mail)
    )
    .sort((a, b) => new Date(b.creado).getTime() - new Date(a.creado).getTime());
}

export function buscarPedidoPorNumero(pedidos: Pedido[], texto: string): Pedido | undefined {
  const t = normalizarTexto(texto);
  const m = t.match(/#?\s*([a-z]{0,4}-?\d{3,})/i);
  if (!m) return undefined;
  const num = m[1].replace(/\s/g, "").toLowerCase();
  return pedidos.find((p) => normalizarTexto(p.numero).replace(/[#\s]/g, "") === num.replace(/[#\s]/g, ""));
}

// ---------- productos ----------
export function buscarProductos(productos: Producto[], texto: string, max = 3): Producto[] {
  const t = normalizarTexto(texto);
  if (!t) return [];
  const palabras = t.split(" ").filter((w) => w.length >= 3);
  const puntuados = productos
    .filter((p) => p.activo !== false)
    .map((p) => {
      const nombre = normalizarTexto(p.nombre);
      const sku = normalizarTexto(p.sku);
      let puntos = 0;
      if (sku && t.includes(sku)) puntos += 10;
      if (nombre && t.includes(nombre)) puntos += 8;
      for (const w of palabras) if (nombre.includes(w)) puntos += 2;
      return { p, puntos };
    })
    .filter((x) => x.puntos >= 2)
    .sort((a, b) => b.puntos - a.puntos);
  return puntuados.slice(0, max).map((x) => x.p);
}

export function dinero(monto: number, moneda = "ARS"): string {
  try {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: moneda, maximumFractionDigits: 0 }).format(monto || 0);
  } catch {
    return `${moneda} ${Math.round(monto || 0)}`;
  }
}

// ---------- tiempo relativo (con el "ahora" real) ----------
export function haceCuanto(iso: string | undefined | null, ahora: Date = new Date()): string {
  if (!iso) return "";
  const diff = ahora.getTime() - new Date(iso).getTime();
  const min = Math.round(Math.abs(diff) / 60000);
  const fut = diff < 0;
  if (min < 1) return "recién";
  if (min < 60) return fut ? `en ${min} min` : `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return fut ? `en ${h} h` : `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return fut ? `en ${d} d` : `hace ${d} d`;
  const mes = Math.round(d / 30);
  return fut ? `en ${mes} mes` : `hace ${mes} mes${mes > 1 ? "es" : ""}`;
}

export function horaCorta(iso: string, zona?: string): string {
  try {
    const d = new Date(iso);
    const hoy = new Date();
    const mismoDia = d.toDateString() === hoy.toDateString();
    if (mismoDia) return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: zona });
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", timeZone: zona });
  } catch {
    return "";
  }
}

export function fechaHora(iso: string, zona?: string): string {
  try {
    return new Date(iso).toLocaleString("es-AR", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: zona,
    });
  } catch {
    return "";
  }
}

export function fechaCorta(iso: string, zona?: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric", timeZone: zona });
  } catch {
    return "";
  }
}

// Mensaje criollo para un error de Meta sin filtrar secretos.
export function errorCriollo(e: unknown): string {
  const raw = e instanceof Error ? e.message : typeof e === "string" ? e : JSON.stringify(e ?? "");
  return (raw || "Error desconocido")
    .replace(/EAA[A-Za-z0-9]+/g, "[token]")
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/Bearer\s+\S+/gi, "Bearer [token]")
    .slice(0, 300);
}

// Vista previa del último mensaje en la lista.
export function previewMensaje(tipo: string, texto: string, mediaNombre?: string): string {
  switch (tipo) {
    case "imagen": return texto ? `📷 ${texto}` : "📷 Foto";
    case "audio": return "🎤 Audio";
    case "video": return texto ? `🎬 ${texto}` : "🎬 Video";
    case "documento": return `📄 ${mediaNombre || "Archivo"}`;
    case "sticker": return "Sticker";
    case "ubicacion": return "📍 Ubicación";
    case "plantilla": return texto || "Plantilla";
    default: return texto || "";
  }
}

export const LIMITE_TEXTO_WHATSAPP = 4096;
