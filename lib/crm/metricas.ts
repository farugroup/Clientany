// ============================================================
// Clientany · CRM — métricas del panel (puro, sin React).
// Lo usan el modo demo (repo-local.ts) y el servidor (`GET /api/crm/metricas`).
//
// «Hoy» y «el mes» se cuentan en la zona horaria de la empresa (no en la del
// navegador ni en UTC): se calcula una vez el inicio del día y del mes en esa
// zona y después se compara por número, así no se arma un formateador de
// fechas por cada mensaje.
// ============================================================
import type {
  CanalTipo,
  Conversacion,
  Empresa,
  Grupo,
  Mensaje,
  Metricas,
  Miembro,
  Pedido,
  Producto,
} from "./types";
import { HORARIO_DEFAULT, contarGrupos, partesEnZona } from "./core";

const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

function ms(iso: string | undefined | null): number {
  if (!iso) return NaN;
  return new Date(iso).getTime();
}

// Inicio del día (00:00) de `fecha` en la zona, como timestamp UTC.
export function inicioDelDiaEnZona(fecha: Date, zona: string): number {
  const p = partesEnZona(fecha, zona);
  let t =
    fecha.getTime() -
    (p.hora * 60 + p.minuto) * MIN -
    fecha.getUTCSeconds() * 1000 -
    fecha.getUTCMilliseconds();
  // Si en el medio hubo cambio de horario (DST), la cuenta queda corrida una
  // hora: se corrige mirando qué hora es en la zona en ese instante.
  const q = partesEnZona(new Date(t), zona);
  const desfase = q.hora * 60 + q.minuto;
  if (desfase !== 0) t += (desfase >= 12 * 60 ? 24 * 60 - desfase : -desfase) * MIN;
  return t;
}

// Inicio del mes (día 1 a las 00:00) de `fecha` en la zona.
export function inicioDelMesEnZona(fecha: Date, zona: string): number {
  const p = partesEnZona(fecha, zona);
  const dia = Number(p.ymd.slice(8, 10)) || 1;
  // Mediodía del día 1 (con margen para un cambio de horario) y de ahí, su 00:00.
  const mediodiaDelUno = inicioDelDiaEnZona(fecha, zona) - (dia - 1) * DIA + 12 * HORA;
  return inicioDelDiaEnZona(new Date(mediodiaDelUno), zona);
}

const redondear1 = (n: number) => Math.round(n * 10) / 10;

export function calcularMetricas(e: {
  empresa: Empresa;
  conversaciones: Conversacion[];
  mensajes: Mensaje[]; // TODOS los mensajes, en una lista plana
  pedidos: Pedido[];
  productos: Producto[];
  miembros: Miembro[];
  ahora?: Date;
}): Metricas {
  const ahora = e.ahora || new Date();
  const zona = e.empresa?.horario?.zona || HORARIO_DEFAULT.zona;
  const moneda = e.empresa?.moneda || "ARS";
  const inicioHoy = inicioDelDiaEnZona(ahora, zona);
  const inicioMes = inicioDelMesEnZona(ahora, zona);
  const esHoy = (iso: string | undefined | null) => ms(iso) >= inicioHoy;
  const esDelMes = (iso: string | undefined | null) => ms(iso) >= inicioMes;

  const convs = e.conversaciones || [];
  const mensajes = e.mensajes || [];
  const pedidos = e.pedidos || [];
  const productos = e.productos || [];

  // ---------- conversaciones ----------
  const conteos = contarGrupos(convs, ahora);
  const por_grupo: Record<Grupo, number> = {
    ventas: conteos.ventas,
    soporte: conteos.soporte,
    mas_adelante: conteos.mas_adelante,
    resueltos: conteos.resueltos,
    baja: conteos.baja,
  };
  const por_canal: Record<CanalTipo, number> = { whatsapp: 0, instagram: 0, messenger: 0, manual: 0 };
  for (const c of convs) {
    if (c.canal in por_canal) por_canal[c.canal] += 1;
  }
  const etapas = [...(e.empresa?.etapas || [])].sort((a, b) => a.orden - b.orden);
  const por_etapa = etapas.map((et) => ({
    etapa_id: et.id,
    nombre: et.nombre,
    color: et.color,
    cantidad: convs.filter((c) => c.etapa_id === et.id).length,
  }));

  // ---------- bot ----------
  let botHoy = 0;
  let botMes = 0;
  for (const m of mensajes) {
    if (m.de !== "bot") continue;
    if (esDelMes(m.creado)) botMes += 1;
    if (esHoy(m.creado)) botHoy += 1;
  }

  // ---------- pedidos (sin cancelados ni devueltos) ----------
  const validos = pedidos.filter((p) => p.estado !== "cancelado" && p.estado !== "devuelto");
  const delMes = validos.filter((p) => esDelMes(p.creado));
  const monto_mes = delMes
    // Sólo se suma lo que está en la moneda de la empresa (no se mezclan monedas).
    .filter((p) => !p.moneda || p.moneda === moneda)
    .reduce((s, p) => s + (Number.isFinite(Number(p.total)) ? Number(p.total) : 0), 0);

  // ---------- stock (sólo productos activos) ----------
  const activos = productos.filter((p) => p.activo !== false);
  const stockDe = (p: Producto) => (Number.isFinite(Number(p.stock)) ? Number(p.stock) : 0);
  const sin_stock = activos.filter((p) => stockDe(p) <= 0).length;
  // Bajo mínimo: todavía queda algo pero está en el mínimo o debajo (los
  // que ya no tienen stock se cuentan aparte, en «sin stock»).
  const bajo_minimo = activos.filter(
    (p) => typeof p.stock_minimo === "number" && p.stock_minimo > 0 && stockDe(p) > 0 && stockDe(p) <= p.stock_minimo
  ).length;

  // ---------- primera respuesta (promedio del mes, en minutos) ----------
  // Por conversación: el primer mensaje del cliente y la primera respuesta de
  // una PERSONA después de ese (el bot no cuenta). Entra al promedio si ese
  // primer mensaje es de este mes.
  const porConv = new Map<string, Mensaje[]>();
  for (const m of mensajes) {
    const l = porConv.get(m.conversacion_id);
    if (l) l.push(m);
    else porConv.set(m.conversacion_id, [m]);
  }
  const demoras: number[] = [];
  porConv.forEach((lista) => {
    const orden = [...lista].sort((a, b) => ms(a.creado) - ms(b.creado));
    const primerIn = orden.find((m) => m.direccion === "in" && Number.isFinite(ms(m.creado)));
    if (!primerIn || !esDelMes(primerIn.creado)) return;
    const t = ms(primerIn.creado);
    const respuesta = orden.find((m) => m.direccion === "out" && m.de === "agente" && ms(m.creado) >= t);
    if (!respuesta) return;
    demoras.push((ms(respuesta.creado) - t) / MIN);
  });
  const primera_respuesta_min = demoras.length
    ? redondear1(demoras.reduce((s, x) => s + x, 0) / demoras.length)
    : null;

  // ---------- equipo: mensajes de cada persona en el mes ----------
  const porAutor = new Map<string, number>();
  for (const m of mensajes) {
    if (m.de !== "agente" || !m.autor || !esDelMes(m.creado)) continue;
    porAutor.set(m.autor, (porAutor.get(m.autor) || 0) + 1);
  }
  const equipo = (e.miembros || [])
    .map((mb) => ({ miembro_id: mb.id, nombre: mb.nombre, respondidas_mes: porAutor.get(mb.nombre) || 0 }))
    .sort((a, b) => b.respondidas_mes - a.respondidas_mes);

  return {
    conversaciones: {
      total: convs.length,
      abiertas: conteos.ventas + conteos.soporte,
      sin_responder: conteos.sin_responder,
      hoy: convs.filter((c) => esHoy(c.creado)).length,
    },
    por_canal,
    por_grupo,
    por_etapa,
    bot: {
      respuestas_hoy: botHoy,
      respuestas_mes: botMes,
      derivadas_a_humano: convs.filter((c) => c.necesita_humano).length,
    },
    pedidos: {
      hoy: validos.filter((p) => esHoy(p.creado)).length,
      mes: delMes.length,
      monto_mes,
      moneda,
    },
    stock: { productos: activos.length, sin_stock, bajo_minimo },
    primera_respuesta_min,
    equipo,
  };
}
