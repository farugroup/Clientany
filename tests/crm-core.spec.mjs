// ============================================================
// Clientany · CRM — pruebas de la lógica pura (core, bot, csv).
// Compila lib/crm/{core,bot,csv}.ts a CommonJS en un temporal y los
// requiere. Sin framework: un ✓ por caso, código ≠ 0 si algo falla.
//   node tests/crm-core.spec.mjs
// ============================================================
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "crm-core-"));
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
execFileSync(
  npx,
  ["tsc", "lib/crm/core.ts", "lib/crm/bot.ts", "lib/crm/csv.ts", "--outDir", tmp, "--module", "commonjs", "--target", "es2020", "--esModuleInterop", "--skipLibCheck"],
  { cwd: raiz, stdio: "inherit" }
);
const require = createRequire(import.meta.url);
const core = require(path.join(tmp, "core.js"));
const bot = require(path.join(tmp, "bot.js"));
const csv = require(path.join(tmp, "csv.js"));

let fallas = 0;
let total = 0;
function caso(nombre, fn) {
  total += 1;
  try {
    fn();
    console.log(`✓ ${nombre}`);
  } catch (e) {
    fallas += 1;
    console.log(`✗ ${nombre}\n    ${e && e.message ? e.message : e}`);
  }
}
function igual(a, b, msg = "") {
  const ja = JSON.stringify(a);
  const jb = JSON.stringify(b);
  if (ja !== jb) throw new Error(`${msg} esperaba ${jb}, vino ${ja}`);
}
function ok(v, msg = "falló la condición") {
  if (!v) throw new Error(msg);
}

const ahora = new Date("2026-10-07T15:00:00.000Z"); // miércoles 12:00 en Buenos Aires
const hace = (min) => new Date(ahora.getTime() - min * 60000).toISOString();

function conv(extra = {}) {
  return {
    id: "c1", empresa_id: "e1", canal_id: "ch1", canal: "whatsapp", contacto_id: "ct1", identificador: "5491155551234", nombre: "Juan",
    ultimo_texto: "hola", ultimo_en: hace(5), ultimo_de: "cliente", ultimo_entrante_en: hace(5), no_leidos: 1,
    grupo: null, etapa_id: null, etiquetas: [], asignado_a: null, tomado_por: null, urgente: false, recordar: null, baja: false,
    fuera_horario: false, necesita_humano: false, visto_in: null, pedido_id: null, bot_estado: null, creado: hace(5), actualizado: hace(5),
    ...extra,
  };
}

// ---------- teléfonos ----------
caso("normalizarTelefono: 11 5555-1234 → 5491155551234", () => igual(core.normalizarTelefono("11 5555-1234"), "5491155551234"));
caso("normalizarTelefono: +54 9 11 5555 1234", () => igual(core.normalizarTelefono("+54 9 11 5555 1234"), "5491155551234"));
caso("normalizarTelefono: 5491155551234 queda igual", () => igual(core.normalizarTelefono("5491155551234"), "5491155551234"));
caso("normalizarTelefono: 0351 15 123 4567 → 5493511234567", () => igual(core.normalizarTelefono("0351 15 123 4567"), "5493511234567"));
caso("normalizarTelefono: vacío → ''", () => {
  igual(core.normalizarTelefono(""), "");
  igual(core.normalizarTelefono(null), "");
  igual(core.normalizarTelefono("abc"), "");
});
caso("colaTelefono y telefonoLindo", () => {
  igual(core.colaTelefono("+54 9 11 5555-1234"), "1155551234");
  igual(core.telefonoLindo("5491155551234"), "+54 9 11 5555-1234");
});

// ---------- bandeja ----------
caso("grupoDe: baja gana a todo", () => igual(core.grupoDe(conv({ baja: true, grupo: "soporte", urgente: true }), ahora), "baja"));
caso("grupoDe: recordatorio no vencido → mas_adelante", () =>
  igual(core.grupoDe(conv({ recordar: { fecha: new Date(ahora.getTime() + 3600000).toISOString(), puesto: hace(1) }, grupo: "mas_adelante" }), ahora), "mas_adelante"));
caso("grupoDe: recordatorio vencido → ventas", () =>
  igual(core.grupoDe(conv({ recordar: { fecha: hace(1), puesto: hace(60) }, grupo: "mas_adelante" }), ahora), "ventas"));
caso("grupoDe: soporte se queda en soporte aunque escriba", () => igual(core.grupoDe(conv({ grupo: "soporte", visto_in: hace(60) }), ahora), "soporte"));
caso("grupoDe: resueltos vuelve a ventas si escribió después", () => {
  igual(core.grupoDe(conv({ grupo: "resueltos", visto_in: hace(60), ultimo_entrante_en: hace(5) }), ahora), "ventas");
  igual(core.grupoDe(conv({ grupo: "resueltos", visto_in: hace(5), ultimo_entrante_en: hace(60) }), ahora), "resueltos");
});
caso("escribioDespues", () => {
  ok(core.escribioDespues(conv({ visto_in: null })));
  ok(core.escribioDespues(conv({ visto_in: hace(60), ultimo_entrante_en: hace(5) })));
  ok(!core.escribioDespues(conv({ visto_in: hace(5), ultimo_entrante_en: hace(60) })));
  ok(!core.escribioDespues(conv({ ultimo_entrante_en: undefined })));
});
caso("filtrarBandeja: la búsqueda ignora los grupos y cada fila dice el suyo", () => {
  const lista = [conv({ id: "a", nombre: "Juan Pérez" }), conv({ id: "b", nombre: "Ana", grupo: "resueltos", visto_in: hace(1) }), conv({ id: "c", nombre: "Juan Baja", baja: true })];
  const filas = core.filtrarBandeja(lista, { q: "juan" }, ahora);
  igual(filas.map((f) => f.id).sort(), ["a", "c"]);
  igual(filas.find((f) => f.id === "c").grupo_calculado, "baja");
  const soloVentas = core.filtrarBandeja(lista, { grupo: "ventas" }, ahora);
  igual(soloVentas.map((f) => f.id), ["a"]);
  const porCanal = core.filtrarBandeja([...lista, conv({ id: "d", canal: "instagram" })], { grupo: "todos", canal: "instagram" }, ahora);
  igual(porCanal.map((f) => f.id), ["d"]);
});
caso("filtrarBandeja: orden recientes / antiguos", () => {
  const lista = [conv({ id: "viejo", ultimo_en: hace(100) }), conv({ id: "nuevo", ultimo_en: hace(1) })];
  igual(core.filtrarBandeja(lista, { grupo: "todos" }, ahora).map((f) => f.id), ["nuevo", "viejo"]);
  igual(core.filtrarBandeja(lista, { grupo: "todos", orden: "antiguos" }, ahora).map((f) => f.id), ["viejo", "nuevo"]);
});
caso("contarGrupos", () => {
  const r = core.contarGrupos([conv(), conv({ grupo: "soporte" }), conv({ baja: true }), conv({ grupo: "resueltos", visto_in: hace(1) })], ahora);
  igual(r.ventas, 1);
  igual(r.soporte, 1);
  igual(r.baja, 1);
  igual(r.resueltos, 1);
  igual(r.sin_responder, 2);
});

// ---------- ventana de 24 hs ----------
caso("horasDeVentana: hace 23 hs → > 0", () => ok(core.horasDeVentana(conv({ ultimo_entrante_en: hace(23 * 60) }), ahora) > 0));
caso("horasDeVentana: hace 25 hs → 0", () => igual(core.horasDeVentana(conv({ ultimo_entrante_en: hace(25 * 60) }), ahora), 0));
caso("horasDeVentana: canal manual → null", () => igual(core.horasDeVentana(conv({ canal: "manual" }), ahora), null));
caso("ventanaAbierta", () => {
  ok(core.ventanaAbierta(conv({ ultimo_entrante_en: hace(60) }), ahora));
  ok(!core.ventanaAbierta(conv({ ultimo_entrante_en: hace(25 * 60) }), ahora));
  ok(core.ventanaAbierta(conv({ canal: "manual", ultimo_entrante_en: undefined }), ahora));
});

// ---------- horario ----------
const horario = {
  zona: "America/Argentina/Buenos_Aires",
  dias: [1, 2, 3, 4, 5].map((dia) => ({ dia, abre: true, desde: "09:00", hasta: "18:00" })).concat([{ dia: 6, abre: true, desde: "10:00", hasta: "13:00" }, { dia: 0, abre: false, desde: "10:00", hasta: "13:00" }]),
};
caso("estaAbierto: lunes 10:00 BA → abierto", () => ok(core.estaAbierto(horario, new Date("2026-10-05T13:00:00.000Z"))));
caso("estaAbierto: lunes 20:00 BA → cerrado", () => ok(!core.estaAbierto(horario, new Date("2026-10-05T23:00:00.000Z"))));
caso("estaAbierto: domingo 11:00 BA → cerrado", () => ok(!core.estaAbierto(horario, new Date("2026-10-04T14:00:00.000Z"))));
caso("estaAbierto: sábado 11:00 BA → abierto, 14:00 → cerrado", () => {
  ok(core.estaAbierto(horario, new Date("2026-10-03T14:00:00.000Z")));
  ok(!core.estaAbierto(horario, new Date("2026-10-03T17:00:00.000Z")));
});
caso("horarioEnCriollo", () => igual(core.horarioEnCriollo(horario), "lunes a viernes de 9 a 18 y sábado de 10 a 13"));

// ---------- bot ----------
const empresa = { nombre: "Tienda Luna", horario, moneda: "ARS" };
const productos = [
  { id: "p1", empresa_id: "e1", sku: "REM-01", nombre: "Remera negra", precio: 15000, moneda: "ARS", stock: 3, activo: true, actualizado: hace(1) },
  { id: "p2", empresa_id: "e1", sku: "BUZ-01", nombre: "Buzo gris", precio: 30000, moneda: "ARS", stock: 0, activo: true, actualizado: hace(1) },
];
const pedidos = [
  { id: "pd1", empresa_id: "e1", numero: "#1001", contacto_id: "ct1", nombre: "Juan", telefono: "5491155551234", estado: "enviado", items: [], total: 15000, moneda: "ARS", envio: { transporte: "Andreani", seguimiento: "AR123" }, creado: hace(1000), actualizado: hace(1000) },
  { id: "pd2", empresa_id: "e1", numero: "#2002", contacto_id: "otro", nombre: "Ana", telefono: "5491144440000", estado: "pagado", items: [], total: 1, moneda: "ARS", creado: hace(2000), actualizado: hace(2000) },
];
const contacto = { id: "ct1", empresa_id: "e1", nombre: "Juan", telefono: "5491155551234", etiquetas: [], origen: "whatsapp", creado: hace(1), actualizado: hace(1) };
const base = () => ({ ...bot.BOT_DEFAULT, reglas: [] });
const ctx = (extra = {}) => ({ empresa, bot: base(), conv: conv(), contacto, texto: "hola", esPrimerMensaje: true, productos, pedidos, ahora, ...extra });

caso("evaluarBot: bot apagado no responde", () => {
  const r = bot.evaluarBot(ctx({ bot: { ...base(), activo: false } }));
  igual(r.respuestas.length, 0);
  ok(/apagado/.test(r.explicacion));
});
caso("evaluarBot: baja → nada", () => igual(bot.evaluarBot(ctx({ conv: conv({ baja: true }) })).respuestas.length, 0));
caso("evaluarBot: canal manual → nada", () => igual(bot.evaluarBot(ctx({ conv: conv({ canal: "manual" }) })).respuestas.length, 0));
caso("evaluarBot: tomado → nada", () => {
  const r = bot.evaluarBot(ctx({ conv: conv({ tomado_por: { quien: "m1", nombre: "Sofía", cuando: hace(1) } }) }));
  igual(r.respuestas.length, 0);
  ok(/Sofía/.test(r.explicacion));
});
caso("evaluarBot: una persona respondió hace 5 min → calla", () => {
  const r = bot.evaluarBot(ctx({ conv: conv({ ultimo_saliente_humano_en: hace(5) }) }));
  igual(r.respuestas.length, 0);
  ok(/persona respondió/.test(r.explicacion));
});
caso("evaluarBot: tope del día", () => {
  const r = bot.evaluarBot(ctx({ conv: conv({ bot_estado: { dia: "2026-10-07", respuestas_hoy: 6 } }) }));
  igual(r.respuestas.length, 0);
  ok(/tope/.test(r.explicacion));
});
caso("evaluarBot: pide humano → necesita_humano", () => {
  const r = bot.evaluarBot(ctx({ texto: "quiero hablar con una persona" }));
  igual(r.respuestas.length, 1);
  igual(r.respuestas[0].motivo, "humano");
  igual(r.cambios.necesita_humano, true);
});
caso("evaluarBot: regla contiene (palabra entera)", () => {
  const regla = { id: "r1", nombre: "Envíos", activa: true, palabras: ["envio"], coincidencia: "contiene", respuesta: "Hacemos envíos a todo el país, {nombre}.", canales: [], solo_fuera_horario: false, una_vez_por_dia: false, orden: 0 };
  const r = bot.evaluarBot(ctx({ bot: { ...base(), reglas: [regla] }, texto: "hacen envío a córdoba?", esPrimerMensaje: false, conv: conv({ bot_estado: { dia: "2026-10-07", respuestas_hoy: 0, ultima_bienvenida: hace(10) } }) }));
  igual(r.respuestas[0].motivo, "regla:r1");
  igual(r.respuestas[0].texto, "Hacemos envíos a todo el país, Juan.");
  const r2 = bot.evaluarBot(ctx({ bot: { ...base(), reglas: [regla] }, texto: "enviologia", esPrimerMensaje: false, conv: conv({ bot_estado: { dia: "2026-10-07", respuestas_hoy: 0, ultima_bienvenida: hace(10) } }) }));
  igual(r2.respuestas.length, 0, "no dispara con enviologia");
});
caso("evaluarBot: regla exacta y empieza", () => {
  const exacta = { id: "r2", nombre: "Hola", activa: true, palabras: ["precios"], coincidencia: "exacta", respuesta: "Lista de precios: ...", canales: [], solo_fuera_horario: false, una_vez_por_dia: false, orden: 0 };
  const empieza = { id: "r3", nombre: "Gracias", activa: true, palabras: ["gracias"], coincidencia: "empieza", respuesta: "¡De nada!", canales: [], solo_fuera_horario: false, una_vez_por_dia: false, orden: 1 };
  const b = { ...base(), reglas: [exacta, empieza] };
  const estado = conv({ bot_estado: { dia: "2026-10-07", respuestas_hoy: 0, ultima_bienvenida: hace(10) } });
  igual(bot.evaluarBot(ctx({ bot: b, texto: "Precios", esPrimerMensaje: false, conv: estado })).respuestas[0].motivo, "regla:r2");
  igual(bot.evaluarBot(ctx({ bot: b, texto: "los precios", esPrimerMensaje: false, conv: estado })).respuestas.length, 0);
  igual(bot.evaluarBot(ctx({ bot: b, texto: "Gracias por todo", esPrimerMensaje: false, conv: estado })).respuestas[0].motivo, "regla:r3");
});
caso("evaluarBot: regla una vez por día", () => {
  const regla = { id: "r4", nombre: "Promo", activa: true, palabras: ["promo"], coincidencia: "contiene", respuesta: "Promo!", canales: [], solo_fuera_horario: false, una_vez_por_dia: true, orden: 0 };
  const b = { ...base(), reglas: [regla] };
  const r1 = bot.evaluarBot(ctx({ bot: b, texto: "hay promo?", esPrimerMensaje: false, conv: conv({ bot_estado: { dia: "2026-10-07", respuestas_hoy: 0, ultima_bienvenida: hace(10) } }) }));
  igual(r1.respuestas[0].motivo, "regla:r4");
  igual(r1.cambios.bot_estado.reglas_hoy, ["r4"]);
  const r2 = bot.evaluarBot(ctx({ bot: b, texto: "hay promo?", esPrimerMensaje: false, conv: conv({ bot_estado: r1.cambios.bot_estado }) }));
  igual(r2.respuestas.length, 0, "la segunda vez en el día no dispara");
});
caso("evaluarBot: pedido por número", () => {
  const r = bot.evaluarBot(ctx({ texto: "cómo viene el pedido #1001?", esPrimerMensaje: false, conv: conv({ bot_estado: { dia: "2026-10-07", respuestas_hoy: 0, ultima_bienvenida: hace(10) } }) }));
  igual(r.respuestas[0].motivo, "pedido");
  ok(/#1001/.test(r.respuestas[0].texto) && /enviado/.test(r.respuestas[0].texto) && /AR123/.test(r.respuestas[0].texto), r.respuestas[0].texto);
});
caso("evaluarBot: «mi pedido» usa los pedidos del contacto", () => {
  const r = bot.evaluarBot(ctx({ texto: "dónde está mi pedido?", esPrimerMensaje: false, conv: conv({ bot_estado: { dia: "2026-10-07", respuestas_hoy: 0, ultima_bienvenida: hace(10) } }) }));
  igual(r.respuestas[0].motivo, "pedido");
  ok(/#1001/.test(r.respuestas[0].texto), r.respuestas[0].texto);
  const sin = bot.evaluarBot(ctx({ texto: "dónde está mi pedido?", contacto: null, esPrimerMensaje: false, conv: conv({ identificador: "5490000000000", bot_estado: { dia: "2026-10-07", respuestas_hoy: 0, ultima_bienvenida: hace(10) } }) }));
  igual(sin.respuestas[0].texto, bot.BOT_DEFAULT.pedidos.sin_pedido);
});
caso("evaluarBot: stock con y sin stock", () => {
  const con = bot.evaluarBot(ctx({ texto: "tienen stock de remera negra?", esPrimerMensaje: false, conv: conv({ bot_estado: { dia: "2026-10-07", respuestas_hoy: 0, ultima_bienvenida: hace(10) } }) }));
  igual(con.respuestas[0].motivo, "stock");
  ok(/Remera negra/.test(con.respuestas[0].texto) && /15\.000/.test(con.respuestas[0].texto), con.respuestas[0].texto);
  const sin = bot.evaluarBot(ctx({ texto: "cuánto sale el buzo gris?", esPrimerMensaje: false, conv: conv({ bot_estado: { dia: "2026-10-07", respuestas_hoy: 0, ultima_bienvenida: hace(10) } }) }));
  ok(/sin stock/.test(sin.respuestas[0].texto), sin.respuestas[0].texto);
});
caso("evaluarBot: bienvenida + menú en el primer mensaje, y opción 2 → estado del pedido", () => {
  const b = { ...base(), menu: { ...bot.BOT_DEFAULT.menu, activo: true } };
  const r1 = bot.evaluarBot(ctx({ bot: b, texto: "hola" }));
  igual(r1.respuestas.map((x) => x.motivo), ["bienvenida", "menu"]);
  ok(/Tienda Luna/.test(r1.respuestas[0].texto));
  ok(/2\. Estado de mi pedido/.test(r1.respuestas[1].texto));
  igual(r1.cambios.bot_estado.paso, "menu");
  igual(r1.cambios.bot_estado.respuestas_hoy, 2);
  const r2 = bot.evaluarBot(ctx({ bot: b, texto: "2", esPrimerMensaje: false, conv: conv({ bot_estado: r1.cambios.bot_estado }) }));
  igual(r2.respuestas[0].motivo, "pedido");
  ok(/#1001/.test(r2.respuestas[0].texto), r2.respuestas[0].texto);
  igual(r2.cambios.bot_estado.paso, undefined);
});
caso("evaluarBot: bienvenida de nuevo si pasaron 24 hs, y no si fue hace 10 min", () => {
  const otraVez = bot.evaluarBot(ctx({ texto: "buenas", esPrimerMensaje: false, conv: conv({ bot_estado: { dia: "2026-10-06", respuestas_hoy: 3, ultima_bienvenida: hace(25 * 60) } }) }));
  igual(otraVez.respuestas[0].motivo, "bienvenida");
  igual(otraVez.cambios.bot_estado.respuestas_hoy, 1, "nuevo día: arranca de cero");
  const reciente = bot.evaluarBot(ctx({ texto: "buenas", esPrimerMensaje: false, conv: conv({ bot_estado: { dia: "2026-10-07", respuestas_hoy: 1, ultima_bienvenida: hace(10) } }) }));
  igual(reciente.respuestas.length, 0);
});
caso("evaluarBot: ausencia fuera de horario una vez cada 12 hs", () => {
  const noche = new Date("2026-10-07T23:30:00.000Z"); // 20:30 en Buenos Aires: cerrado
  const r1 = bot.evaluarBot(ctx({ texto: "hola", ahora: noche }));
  igual(r1.respuestas[0].motivo, "ausencia");
  ok(/lunes a viernes de 9 a 18/.test(r1.respuestas[0].texto), r1.respuestas[0].texto);
  igual(r1.cambios.fuera_horario, true);
  const r2 = bot.evaluarBot(ctx({ texto: "hola?", ahora: new Date(noche.getTime() + 3600000), esPrimerMensaje: false, conv: conv({ bot_estado: r1.cambios.bot_estado }) }));
  igual(r2.respuestas.length, 0);
  igual(r2.cambios.fuera_horario, true);
  const r3 = bot.evaluarBot(ctx({ texto: "hola?", ahora: new Date(noche.getTime() + 13 * 3600000 + 11 * 3600000), esPrimerMensaje: false, conv: conv({ bot_estado: r1.cambios.bot_estado }) }));
  // 24 hs después (de nuevo 20:30, cerrado): vuelve a avisar
  igual(r3.respuestas[0].motivo, "ausencia");
});
caso("evaluarBot: bot_estado acumula respuestas_hoy", () => {
  const r1 = bot.evaluarBot(ctx({ texto: "hola" }));
  igual(r1.cambios.bot_estado.respuestas_hoy, 1);
  const r2 = bot.evaluarBot(ctx({ texto: "tienen remera negra?", esPrimerMensaje: false, conv: conv({ bot_estado: r1.cambios.bot_estado }) }));
  igual(r2.cambios.bot_estado.respuestas_hoy, 2);
  igual(r2.cambios.bot_estado.dia, "2026-10-07");
});
caso("completarBot rellena lo que falta", () => {
  const b = bot.completarBot({ activo: false, reglas: [{ palabras: ["x"], respuesta: "y" }] });
  igual(b.activo, false);
  igual(b.bienvenida.texto, bot.BOT_DEFAULT.bienvenida.texto);
  igual(b.reglas[0].coincidencia, "contiene");
  ok(b.reglas[0].id.startsWith("rg_"));
});

// ---------- CSV ----------
caso("importarPedidos: coma, comillas y encabezados en español", () => {
  const txt = 'numero,nombre,telefono,email,estado,total,fecha,productos,transporte,seguimiento\n#1001,"Pérez, Juan",11 5555-1234,juan@x.com,enviado,"15.000,50",07/10/2026,"2x Remera | 1x Buzo",Andreani,AR123\n';
  const r = csv.importarPedidos(txt, "e1", "ARS");
  igual(r.errores.length, 0, JSON.stringify(r.errores));
  igual(r.filas.length, 1);
  const p = r.filas[0];
  igual(p.numero, "#1001");
  igual(p.nombre, "Pérez, Juan");
  igual(p.telefono, "5491155551234");
  igual(p.estado, "enviado");
  igual(p.total, 15000.5);
  igual(p.items, [{ nombre: "Remera", cantidad: 2, precio: 0 }, { nombre: "Buzo", cantidad: 1, precio: 0 }]);
  igual(p.envio.transporte, "Andreani");
  igual(p.envio.seguimiento, "AR123");
  ok(p.creado.startsWith("2026-10-07"));
});
caso("importarPedidos: punto y coma y encabezados en inglés", () => {
  const txt = "Order;Customer;Phone;Status;Amount\n2002;Ana;+54 9 351 123 4567;shipped;30000\n";
  const r = csv.importarPedidos(txt, "e1");
  igual(r.separador, ";");
  igual(r.filas[0].numero, "2002");
  igual(r.filas[0].telefono, "5493511234567");
  igual(r.filas[0].estado, "enviado");
  igual(r.filas[0].total, 30000);
});
caso("importarPedidos: sin columna numero ni nombre → error", () => {
  const r = csv.importarPedidos("a,b\n1,2\n", "e1");
  igual(r.filas.length, 0);
  ok(r.errores.length === 1 && /numero/.test(r.errores[0].motivo));
});
caso("importarProductos: coma y comillas", () => {
  const txt = 'sku,nombre,precio,stock,categoria,activo\nREM-01,"Remera ""negra""",15000,3,Remeras,si\n,Sin sku,100,0,,no\n';
  const r = csv.importarProductos(txt, "e1");
  igual(r.filas.length, 2);
  igual(r.filas[0].nombre, 'Remera "negra"');
  igual(r.filas[0].precio, 15000);
  igual(r.filas[0].stock, 3);
  igual(r.filas[0].activo, true);
  igual(r.filas[1].sku, "SIN-SKU");
  igual(r.filas[1].activo, false);
});
caso("importarProductos: inglés con punto y coma", () => {
  const r = csv.importarProductos("Code;Title;Price;Quantity\nBUZ-01;Buzo gris;30000;0\n", "e1");
  igual(r.filas[0].sku, "BUZ-01");
  igual(r.filas[0].nombre, "Buzo gris");
  igual(r.filas[0].stock, 0);
});
caso("importarContactos: coma, punto y coma e inglés", () => {
  const r1 = csv.importarContactos("nombre,telefono,email,localidad\nJuan,11 5555-1234,juan@x.com,CABA\n", "e1");
  igual(r1.filas[0].telefono, "5491155551234");
  igual(r1.filas[0].email, "juan@x.com");
  igual(r1.filas[0].origen, "csv");
  const r2 = csv.importarContactos("Name;Phone;Instagram\nAna;351 15 123 4567;@ana.ok\n", "e1");
  igual(r2.filas[0].nombre, "Ana");
  igual(r2.filas[0].telefono, "5493511234567");
  igual(r2.filas[0].ig_usuario, "ana.ok");
  const r3 = csv.importarContactos("nombre,telefono\n,\n", "e1");
  igual(r3.filas.length, 0);
  igual(r3.errores.length, 1);
});
caso("aCsv escapa comillas, comas y saltos", () => {
  const out = csv.aCsv(["nombre", "nota"], [['Pérez, Juan', 'dijo "hola"\nchau'], ["Ana", undefined]]);
  igual(out, 'nombre,nota\n"Pérez, Juan","dijo ""hola""\nchau"\nAna,');
});
caso("buscarPedidoPorNumero y pedidosDeContacto", () => {
  igual(core.buscarPedidoPorNumero(pedidos, "mi pedido es el 1001").id, "pd1");
  igual(core.buscarPedidoPorNumero(pedidos, "hola"), undefined);
  igual(core.pedidosDeContacto(pedidos, { telefono: "+54 9 11 5555-1234" }).map((p) => p.id), ["pd1"]);
});
caso("errorCriollo no filtra tokens ni URLs", () => {
  const s = core.errorCriollo(new Error("Bearer EAAB123abc falló en https://graph.facebook.com/x?access_token=EAAZ"));
  ok(!/EAA[A-Za-z0-9]/.test(s) && !/graph\.facebook/.test(s), s);
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${total - fallas}/${total} casos en verde`);
process.exit(fallas ? 1 : 0);
