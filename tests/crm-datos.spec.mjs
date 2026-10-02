// ============================================================
// Clientany · CRM — prueba de los datos de prueba y de las métricas.
//   node tests/crm-datos.spec.mjs
// Sin navegador ni framework: compila con tsc los módulos puros
// (demo, metricas, core, bot) a una carpeta temporal, los requiere y
// verifica que `datosDePrueba` arme una demo completa y coherente y que
// `calcularMetricas` dé números que cierran (sin NaN).
// ============================================================
import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const salida = mkdtempSync(path.join(tmpdir(), "crm-build-"));

// ---------- compilar ----------
const argsTsc = [
  "--outDir", salida,
  "--rootDir", "lib/crm",
  "--module", "commonjs",
  "--target", "es2020",
  "--esModuleInterop",
  "--skipLibCheck",
  "--strict",
  "lib/crm/demo.ts",
  "lib/crm/metricas.ts",
  "lib/crm/core.ts",
  "lib/crm/bot.ts",
];
try {
  const tscLocal = path.join(raiz, "node_modules", "typescript", "bin", "tsc");
  if (existsSync(tscLocal)) execFileSync(process.execPath, [tscLocal, ...argsTsc], { cwd: raiz, stdio: "pipe" });
  else execSync(`npx tsc ${argsTsc.map((a) => JSON.stringify(a)).join(" ")}`, { cwd: raiz, stdio: "pipe" });
} catch (e) {
  console.error("✗ tsc no compiló los módulos del CRM:\n" + String(e.stdout || "") + String(e.stderr || ""));
  rmSync(salida, { recursive: true, force: true });
  process.exit(1);
}

const require = createRequire(import.meta.url);
const demo = require(path.join(salida, "demo.js"));
const met = require(path.join(salida, "metricas.js"));
const core = require(path.join(salida, "core.js"));
const botMod = require(path.join(salida, "bot.js"));
rmSync(salida, { recursive: true, force: true });

// ---------- mini framework ----------
let ok = 0;
const fallas = [];
function check(cond, msg) {
  if (cond) ok += 1;
  else fallas.push(msg);
}
function seccion(nombre, fn) {
  try {
    fn();
  } catch (e) {
    fallas.push(`${nombre}: explotó → ${e && e.stack ? e.stack : e}`);
  }
}
const MIN = 60_000;
const DIA = 24 * 60 * MIN;
const t = (iso) => new Date(iso).getTime();
const esIso = (x) => typeof x === "string" && !isNaN(new Date(x).getTime());

// Un martes a las 15 hs de Argentina (negocio abierto), a mitad de mes.
const AHORA = new Date("2026-10-20T15:00:00-03:00");
const EMP = "emp_test";
const d = demo.datosDePrueba(EMP, AHORA);

// ---------- cantidades ----------
seccion("cantidades", () => {
  check(d.canales.length >= 3, `canales: ${d.canales.length} (mínimo 3)`);
  check(d.conversaciones.length >= 12, `conversaciones: ${d.conversaciones.length} (mínimo 12)`);
  check(d.contactos.length >= 12, `contactos: ${d.contactos.length} (mínimo 12)`);
  check(d.pedidos.length >= 14, `pedidos: ${d.pedidos.length} (mínimo 14)`);
  check(d.productos.length >= 12, `productos: ${d.productos.length} (mínimo 12)`);
  check(d.rapidas.length === 6, `rápidas: ${d.rapidas.length} (tienen que ser 6)`);
  check(d.equipo.length === 4, `chat del equipo: ${d.equipo.length} (tienen que ser 4)`);
  check(d.etapas.length === 6, `etapas: ${d.etapas.length}`);
  check(d.etiquetas.length === 4, `etiquetas: ${d.etiquetas.length}`);
});

// ---------- canales ----------
seccion("canales", () => {
  const wa = d.canales.find((c) => c.tipo === "whatsapp");
  check(wa && wa.nombre === "+54 9 11 5555-0101" && wa.externo_id === "demo_phone_1", "canal de WhatsApp con +54 9 11 5555-0101 / demo_phone_1");
  check(d.canales.some((c) => c.tipo === "instagram" && c.nombre === "@lunar.cosmetica"), "canal de Instagram @lunar.cosmetica");
  check(d.canales.some((c) => c.tipo === "messenger" && c.nombre === "Lunar Cosmética"), "canal de Messenger «Lunar Cosmética»");
});

// ---------- ids ----------
seccion("ids", () => {
  const todos = [
    ...d.canales, ...d.contactos, ...d.conversaciones, ...Object.values(d.mensajes).flat(), ...d.pedidos,
    ...d.productos, ...d.rapidas, ...d.plantillas, ...d.equipo, ...d.etapas, ...d.etiquetas,
  ];
  const ids = todos.map((x) => x.id);
  check(new Set(ids).size === ids.length, `hay ids repetidos: ${ids.filter((x, i) => ids.indexOf(x) !== i).join(", ")}`);
  const sinPrefijo = ids.filter((x) => !String(x).startsWith("demo_"));
  check(!sinPrefijo.length, `ids sin prefijo demo_: ${sinPrefijo.join(", ")}`);
  const conEmpresa = [...d.canales, ...d.contactos, ...d.conversaciones, ...Object.values(d.mensajes).flat(), ...d.pedidos, ...d.productos, ...d.rapidas, ...d.plantillas, ...d.equipo];
  check(conEmpresa.every((x) => x.empresa_id === EMP), "todo lleva el empresa_id que se pasó");
  // Deterministas: otra vuelta (otro momento) da los mismos ids.
  const d2 = demo.datosDePrueba(EMP, new Date(AHORA.getTime() + 3 * DIA));
  const ids2 = [...d2.conversaciones, ...Object.values(d2.mensajes).flat(), ...d2.pedidos, ...d2.contactos].map((x) => x.id);
  const ids1 = [...d.conversaciones, ...Object.values(d.mensajes).flat(), ...d.pedidos, ...d.contactos].map((x) => x.id);
  check(JSON.stringify(ids1) === JSON.stringify(ids2), "los ids no dependen de la fecha");
  check(JSON.stringify(demo.datosDePrueba(EMP, AHORA)) === JSON.stringify(d), "misma fecha → mismos datos (puro)");
});

// ---------- conversaciones y mensajes ----------
seccion("conversaciones", () => {
  const canales = new Map(d.canales.map((c) => [c.id, c]));
  const contactos = new Set(d.contactos.map((c) => c.id));
  const pedidos = new Set(d.pedidos.map((p) => p.id));
  const etapas = new Set(d.etapas.map((e) => e.id));
  const etiquetas = new Set(d.etiquetas.map((e) => e.id));
  for (const c of d.conversaciones) {
    const ms = d.mensajes[c.id] || [];
    check(ms.length >= 3 && ms.length <= 10, `${c.id}: tiene ${ms.length} mensajes (de 3 a 10)`);
    check(canales.has(c.canal_id) && canales.get(c.canal_id).tipo === c.canal, `${c.id}: canal inexistente o tipo distinto`);
    check(contactos.has(c.contacto_id), `${c.id}: contacto ${c.contacto_id} no existe`);
    check(!c.pedido_id || pedidos.has(c.pedido_id), `${c.id}: pedido ${c.pedido_id} no existe`);
    check(!c.etapa_id || etapas.has(c.etapa_id), `${c.id}: etapa ${c.etapa_id} no existe`);
    check(c.etiquetas.every((e) => etiquetas.has(e)), `${c.id}: etiqueta inexistente`);
    check(ms.every((m) => m.conversacion_id === c.id), `${c.id}: mensajes de otra conversación`);
    check(ms.every((m, i) => i === 0 || t(m.creado) >= t(ms[i - 1].creado)), `${c.id}: mensajes desordenados`);
    const ult = ms[ms.length - 1];
    check(c.ultimo_en === ult.creado && c.ultimo_de === ult.de, `${c.id}: ultimo_en/ultimo_de no coinciden con el último mensaje`);
    const ins = ms.filter((m) => m.direccion === "in");
    check(c.ultimo_entrante_en === (ins.length ? ins[ins.length - 1].creado : undefined), `${c.id}: ultimo_entrante_en mal`);
    check(ms.every((m) => (m.de === "cliente") === (m.direccion === "in")), `${c.id}: dirección y «de» no coinciden`);
    check(ms.filter((m) => m.de === "agente").every((m) => !!m.autor), `${c.id}: mensaje de agente sin autor`);
    check(ms.filter((m) => m.de === "bot").every((m) => m.autor === "Bot"), `${c.id}: mensaje del bot sin autor «Bot»`);
    check(c.no_leidos >= 0 && Number.isInteger(c.no_leidos), `${c.id}: no_leidos raro`);
    if (c.canal === "whatsapp") check(/^549\d{10}$/.test(c.identificador), `${c.id}: identificador de WhatsApp no normalizado (${c.identificador})`);
  }
  const cs = d.conversaciones;
  check(cs.filter((c) => c.no_leidos > 0).length >= 3, "varias sin leer");
  check(cs.some((c) => c.grupo === "soporte"), "una en soporte");
  check(cs.some((c) => c.grupo === "mas_adelante" && c.recordar && t(c.recordar.fecha) > AHORA.getTime()), "una pospuesta con recordar a futuro");
  check(cs.filter((c) => c.grupo === "resueltos").length >= 2, "dos resueltas");
  check(cs.some((c) => c.baja === true), "una con baja");
  check(cs.some((c) => c.necesita_humano), "una con necesita_humano");
  check(cs.some((c) => c.fuera_horario), "una con fuera_horario");
  check(cs.filter((c) => c.pedido_id).length >= 2, "varias con pedido_id");
  check(cs.some((c) => c.tomado_por && c.tomado_por.nombre), "una tomada por alguien");
  check(cs.some((c) => c.etiquetas.length && c.etapa_id), "una con etiquetas y etapa");
  // Lo que ve la bandeja (grupo calculado).
  const g = core.contarGrupos(cs, AHORA);
  check(g.soporte >= 1 && g.mas_adelante >= 1 && g.resueltos >= 2 && g.baja >= 1 && g.ventas >= 3, `grupos calculados raros: ${JSON.stringify(g)}`);

  const todos = Object.values(d.mensajes).flat();
  check(todos.some((m) => m.tipo === "imagen" && /^https:\/\/picsum\.photos\//.test(m.media_url || "")), "una imagen con media_url de picsum");
  check(todos.some((m) => m.tipo === "audio" && !m.media_url), "un audio sin url");
  check(todos.some((m) => m.tipo === "documento" && m.media_nombre), "un documento con nombre");
  check(todos.some((m) => m.tipo === "plantilla" && m.plantilla), "un mensaje de plantilla");
  for (const e of ["enviado", "entregado", "leido"]) check(todos.some((m) => m.estado === e), `algún mensaje ${e}`);
  check(todos.some((m) => m.estado === "fallido" && m.error), "uno fallido con error");
  check(todos.some((m) => m.de === "bot"), "mensajes del bot");
  check(todos.every((m) => m.tipo === "audio" || m.tipo === "documento" || (m.texto || "").trim()), "mensajes de texto vacíos");
});

// ---------- contactos ----------
seccion("contactos", () => {
  for (const c of d.contactos) {
    check(/^549\d{10}$/.test(c.telefono || ""), `${c.nombre}: teléfono no normalizado (${c.telefono})`);
    check(core.normalizarTelefono(c.telefono) === c.telefono, `${c.nombre}: normalizarTelefono lo cambia`);
    check(core.emailValido(c.email), `${c.nombre}: mail inválido`);
    check(!!c.localidad, `${c.nombre}: sin localidad`);
  }
});

// ---------- pedidos ----------
seccion("pedidos", () => {
  const contactos = new Map(d.contactos.map((c) => [c.id, c]));
  const skus = new Set(d.productos.map((p) => p.sku));
  for (const p of d.pedidos) {
    const c = contactos.get(p.contacto_id);
    check(!!c, `${p.numero}: contacto ${p.contacto_id} no existe`);
    if (c) check(c.telefono === p.telefono && c.nombre === p.nombre, `${p.numero}: datos distintos a los del contacto`);
    check(p.items.length > 0, `${p.numero}: sin items`);
    check(p.items.every((i) => skus.has(i.sku) && i.nombre && i.cantidad > 0 && i.precio > 0), `${p.numero}: item mal armado`);
    check(p.total === p.items.reduce((s, i) => s + i.precio * i.cantidad, 0), `${p.numero}: total no suma`);
    check(p.envio && p.envio.transporte && p.envio.localidad && p.envio.cp, `${p.numero}: envío incompleto`);
    check(t(p.creado) <= AHORA.getTime() && t(p.creado) >= AHORA.getTime() - 60 * DIA, `${p.numero}: fecha fuera de los últimos 60 días`);
  }
  check(new Set(d.pedidos.map((p) => p.numero)).size === d.pedidos.length, "números de pedido repetidos");
  check(new Set(d.pedidos.map((p) => p.estado)).size >= 6, "estados de pedido variados");
  check(d.pedidos.some((p) => p.envio && p.envio.seguimiento && p.envio.url), "algún pedido con seguimiento y url");
});

// ---------- productos ----------
seccion("productos", () => {
  check(d.productos.filter((p) => p.stock === 0).length === 2, "dos productos sin stock");
  check(d.productos.filter((p) => p.stock > 0 && p.stock_minimo && p.stock <= p.stock_minimo).length === 1, "uno bajo mínimo");
  check(d.productos.every((p) => p.sku && p.precio > 0 && p.categoria && p.activo), "productos completos");
  check(new Set(d.productos.map((p) => p.sku)).size === d.productos.length, "SKU repetidos");
});

// ---------- rápidas, plantillas, equipo, etapas ----------
seccion("rápidas y plantillas", () => {
  const atajos = d.rapidas.map((r) => r.atajo).sort();
  check(JSON.stringify(atajos) === JSON.stringify(["/envio", "/gracias", "/hola", "/pago", "/seguimiento", "/stock"]), `atajos: ${atajos}`);
  check(d.rapidas.every((r) => !r.de), "las rápidas de prueba son compartidas");
  const pl = Object.fromEntries(d.plantillas.map((p) => [p.nombre, p]));
  const esperadas = { confirmacion_pedido: 2, aviso_despacho: 3, seguimiento_consulta: 1 };
  for (const [n, v] of Object.entries(esperadas)) {
    check(pl[n] && pl[n].estado === "aprobada" && pl[n].variables === v, `plantilla ${n} aprobada con ${v} variables`);
    if (pl[n]) check(new Set([...pl[n].cuerpo.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1])).size === v, `plantilla ${n}: el cuerpo no tiene ${v} variables`);
  }
  check(d.plantillas.filter((p) => p.estado === "pendiente").length === 1, "una plantilla pendiente");
  const eq = d.equipo;
  check(eq.some((m) => m.ref && m.ref.tipo === "conversacion" && d.conversaciones.some((c) => c.id === m.ref.id) && m.estado === "pendiente"), "un mensaje del equipo con ref a una conversación y pendiente");
  const colores = Object.fromEntries(d.etapas.map((e) => [e.nombre, e.color]));
  check(JSON.stringify(colores) === JSON.stringify({ Nuevo: "#9aa3c0", "En charla": "#598bff", "Esperando pago": "#f59e0b", Vendido: "#16a34a", Postventa: "#8b5cf6", Perdido: "#ef4444" }), `etapas: ${JSON.stringify(colores)}`);
  const tags = Object.fromEntries(d.etiquetas.map((e) => [e.nombre, e.color]));
  check(JSON.stringify(tags) === JSON.stringify({ Mayorista: "#8b5cf6", VIP: "#f59e0b", Problema: "#ef4444", Urgente: "#ef4444" }), `etiquetas: ${JSON.stringify(tags)}`);
});

// ---------- fechas ----------
seccion("fechas", () => {
  const pasadas = [];
  for (const c of d.canales) pasadas.push(["canal " + c.id, c.conectado_en]);
  for (const c of d.contactos) pasadas.push([c.id + ".creado", c.creado], [c.id + ".actualizado", c.actualizado]);
  for (const c of d.conversaciones) {
    pasadas.push([c.id + ".creado", c.creado], [c.id + ".ultimo_en", c.ultimo_en], [c.id + ".actualizado", c.actualizado]);
    if (c.ultimo_entrante_en) pasadas.push([c.id + ".ultimo_entrante_en", c.ultimo_entrante_en]);
    if (c.ultimo_saliente_humano_en) pasadas.push([c.id + ".ultimo_saliente_humano_en", c.ultimo_saliente_humano_en]);
    if (c.visto_in) pasadas.push([c.id + ".visto_in", c.visto_in]);
    if (c.tomado_por) pasadas.push([c.id + ".tomado_por", c.tomado_por.cuando]);
    if (c.recordar) {
      pasadas.push([c.id + ".recordar.puesto", c.recordar.puesto]);
      check(esIso(c.recordar.fecha), `${c.id}: recordar.fecha inválida`);
    }
  }
  for (const m of Object.values(d.mensajes).flat()) pasadas.push([m.id, m.creado]);
  for (const p of d.pedidos) pasadas.push([p.id + ".creado", p.creado], [p.id + ".actualizado", p.actualizado]);
  for (const p of d.productos) pasadas.push([p.id, p.actualizado]);
  for (const p of d.plantillas) pasadas.push([p.id, p.actualizado]);
  for (const m of d.equipo) pasadas.push([m.id, m.creado]);
  for (const [quien, iso] of pasadas) {
    check(esIso(iso), `${quien}: fecha inválida (${iso})`);
    check(t(iso) <= AHORA.getTime() && t(iso) >= AHORA.getTime() - 70 * DIA, `${quien}: fecha fuera de rango (${iso})`);
  }
});

// ---------- el bot entiende la demo ----------
seccion("bot con la demo", () => {
  const empresa = { nombre: "Lunar Cosmética", horario: core.HORARIO_DEFAULT, moneda: "ARS", etapas: d.etapas, etiquetas: d.etiquetas };
  const conv = { ...d.conversaciones[0], bot_estado: null, ultimo_saliente_humano_en: undefined, tomado_por: null };
  const r = botMod.evaluarBot({ empresa, bot: botMod.completarBot(null), conv, texto: "tienen protector solar?", esPrimerMensaje: false, productos: d.productos, pedidos: d.pedidos, ahora: AHORA });
  check(r.respuestas.length === 1 && /sin stock/i.test(r.respuestas[0].texto), `stock: ${JSON.stringify(r.respuestas)}`);
  const valen = d.contactos.find((c) => c.nombre === "Valentina Sosa");
  const r2 = botMod.evaluarBot({ empresa, bot: botMod.completarBot(null), conv: { ...conv, nombre: valen.nombre }, contacto: valen, texto: "dónde está mi pedido?", esPrimerMensaje: false, productos: d.productos, pedidos: d.pedidos, ahora: AHORA });
  check(r2.respuestas.length === 1 && r2.respuestas[0].texto.includes("LUN-10428"), `pedido: ${JSON.stringify(r2.respuestas)}`);
});

// ---------- métricas ----------
function sinNaN(x, ruta = "metricas") {
  if (typeof x === "number") return Number.isFinite(x) ? [] : [ruta];
  if (x && typeof x === "object") return Object.entries(x).flatMap(([k, v]) => sinNaN(v, `${ruta}.${k}`));
  return [];
}
const empresa = {
  id: EMP, nombre: "Lunar Cosmética", pais: "Argentina", moneda: "ARS", plan: "prueba", creado: AHORA.toISOString(),
  webhook_verify_token: "x", ia: { proveedor: "plataforma", clave_cargada: false }, horario: core.HORARIO_DEFAULT,
  etapas: d.etapas, etiquetas: d.etiquetas,
};
const miembros = [
  { id: "local_yo", empresa_id: EMP, nombre: "Vos", email: "vos@x.com", rol: "admin", creado: AHORA.toISOString() },
  { id: demo.MIEMBRO_DEMO.id, empresa_id: EMP, nombre: demo.MIEMBRO_DEMO.nombre, email: demo.MIEMBRO_DEMO.email, rol: "agente", creado: AHORA.toISOString() },
];

seccion("métricas", () => {
  const todos = Object.values(d.mensajes).flat();
  const m = met.calcularMetricas({ empresa, conversaciones: d.conversaciones, mensajes: todos, pedidos: d.pedidos, productos: d.productos, miembros, ahora: AHORA });
  const nan = sinNaN(m);
  check(!nan.length, `NaN en: ${nan.join(", ")}`);
  const c = m.conversaciones;
  check(c.total === 12, `total ${c.total}`);
  check(c.abiertas === m.por_grupo.ventas + m.por_grupo.soporte, "abiertas = ventas + soporte");
  check(c.abiertas === 8, `abiertas ${c.abiertas} (esperaba 8)`);
  check(c.sin_responder === 6, `sin responder ${c.sin_responder} (esperaba 6)`);
  check(c.hoy === 7, `creadas hoy ${c.hoy} (esperaba 7)`);
  check(Object.values(m.por_canal).reduce((a, b) => a + b, 0) === c.total, "por_canal suma el total");
  check(m.por_canal.whatsapp === 9 && m.por_canal.instagram === 2 && m.por_canal.messenger === 1 && m.por_canal.manual === 0, `por_canal ${JSON.stringify(m.por_canal)}`);
  check(Object.values(m.por_grupo).reduce((a, b) => a + b, 0) === c.total, "por_grupo suma el total");
  check(JSON.stringify(m.por_grupo) === JSON.stringify({ ventas: 7, soporte: 1, mas_adelante: 1, resueltos: 2, baja: 1 }), `por_grupo ${JSON.stringify(m.por_grupo)}`);
  check(m.por_etapa.length === 6 && m.por_etapa[0].nombre === "Nuevo" && m.por_etapa[0].color === "#9aa3c0", "por_etapa con nombre y color, en orden");
  check(JSON.stringify(m.por_etapa.map((e) => e.cantidad)) === JSON.stringify([1, 2, 1, 2, 4, 1]), `por_etapa ${JSON.stringify(m.por_etapa.map((e) => e.cantidad))}`);
  check(m.bot.respuestas_hoy === 6 && m.bot.respuestas_mes === 7, `bot hoy/mes ${m.bot.respuestas_hoy}/${m.bot.respuestas_mes} (esperaba 6/7)`);
  check(m.bot.derivadas_a_humano === 1, "derivadas a humano: 1");
  // Pedidos del mes contados a mano con el borde del mes en Argentina (1/10 00:00 -03 = 03:00 UTC).
  const inicioMes = t("2026-10-01T03:00:00Z");
  const validos = d.pedidos.filter((p) => p.estado !== "cancelado" && p.estado !== "devuelto");
  const delMes = validos.filter((p) => t(p.creado) >= inicioMes);
  check(m.pedidos.mes === delMes.length && m.pedidos.mes === 9, `pedidos del mes ${m.pedidos.mes} (esperaba ${delMes.length})`);
  check(m.pedidos.monto_mes === delMes.reduce((s, p) => s + p.total, 0) && m.pedidos.monto_mes > 0, `monto del mes ${m.pedidos.monto_mes}`);
  check(m.pedidos.hoy === 2 && m.pedidos.hoy <= m.pedidos.mes, `pedidos de hoy ${m.pedidos.hoy} (esperaba 2)`);
  check(m.pedidos.moneda === "ARS", "moneda ARS");
  check(JSON.stringify(m.stock) === JSON.stringify({ productos: 12, sin_stock: 2, bajo_minimo: 1 }), `stock ${JSON.stringify(m.stock)}`);
  check(m.primera_respuesta_min === 20.4, `primera respuesta ${m.primera_respuesta_min} min (esperaba 20.4)`);
  const agentesMes = todos.filter((x) => x.de === "agente" && t(x.creado) >= inicioMes).length;
  check(m.equipo.length === 2 && m.equipo.every((e) => e.respondidas_mes >= 1), `equipo ${JSON.stringify(m.equipo)}`);
  check(m.equipo.reduce((s, e) => s + e.respondidas_mes, 0) === agentesMes, "el equipo suma todos los mensajes de agente del mes");
});

seccion("métricas: bordes de zona horaria", () => {
  // 1/10 a la 01:00 en Argentina (en UTC ya es 04:00): el mes arranca el 1/10 03:00 UTC.
  check(met.inicioDelMesEnZona(new Date("2026-10-01T01:00:00-03:00"), "America/Argentina/Buenos_Aires") === t("2026-10-01T03:00:00Z"), "inicio de mes el día 1");
  // 31/10 23:30 en Argentina (en UTC ya es noviembre): sigue siendo octubre.
  check(met.inicioDelMesEnZona(new Date("2026-10-31T23:30:00-03:00"), "America/Argentina/Buenos_Aires") === t("2026-10-01T03:00:00Z"), "fin de mes en Argentina (noviembre en UTC)");
  check(met.inicioDelDiaEnZona(new Date("2026-10-20T23:59:00-03:00"), "America/Argentina/Buenos_Aires") === t("2026-10-20T03:00:00Z"), "inicio del día");
  // Con cambio de horario (Madrid, 25/10/2026 a las 3 vuelve a las 2).
  check(met.inicioDelDiaEnZona(new Date("2026-10-25T12:00:00+01:00"), "Europe/Madrid") === t("2026-10-24T22:00:00Z"), "inicio del día con cambio de horario");
});

seccion("métricas: vacías y con la hora real", () => {
  const vacia = met.calcularMetricas({ empresa, conversaciones: [], mensajes: [], pedidos: [], productos: [], miembros: [] });
  check(!sinNaN(vacia).length, "vacía sin NaN");
  check(vacia.conversaciones.total === 0 && vacia.pedidos.monto_mes === 0 && vacia.primera_respuesta_min === null, "vacía: ceros y primera respuesta null");
  const hoy = demo.datosDePrueba(EMP);
  const real = met.calcularMetricas({ empresa, conversaciones: hoy.conversaciones, mensajes: Object.values(hoy.mensajes).flat(), pedidos: hoy.pedidos, productos: hoy.productos, miembros });
  check(!sinNaN(real).length, "con la hora real: sin NaN");
  check(real.conversaciones.total === 12 && real.pedidos.hoy <= real.pedidos.mes && real.bot.respuestas_hoy <= real.bot.respuestas_mes, "con la hora real: números coherentes");
});

// ---------- resultado ----------
if (fallas.length) {
  console.error(`\n✗ ${fallas.length} falla(s), ${ok} ok:`);
  for (const f of fallas) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ crm-datos: ${ok} chequeos ok`);
