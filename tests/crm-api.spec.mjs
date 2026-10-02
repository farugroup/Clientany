// ============================================================
// Clientany · CRM — pruebas de la API en modo memoria.
// Levanta `next dev -p 3101` con la base en memoria, el usuario fijo y la
// Graph API simulada (CLIENTANY_GRAPH_FAKE=1), y recorre las rutas con
// fetch. Un ✓ por caso; código ≠ 0 si algo falla. Mata el server al final.
//   node tests/crm-api.spec.mjs
// ============================================================
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUERTO = Number(process.env.CRM_TEST_PORT || 3101);
const BASE = `http://127.0.0.1:${PUERTO}`;
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

fs.rmSync(path.join(raiz, ".clientany-dev"), { recursive: true, force: true });

const env = {
  ...process.env,
  CLIENTANY_DB: "memory",
  NEXT_PUBLIC_CLIENTANY_MODO: "nube",
  CLIENTANY_DEV_USER: "dev@clientany.com",
  CLIENTANY_SECRET: "test",
  CLIENTANY_GRAPH_FAKE: "1",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  ANTHROPIC_API_KEY: "",
  NEXT_TELEMETRY_DISABLED: "1",
};

let salida = "";
const server = spawn(npx, ["next", "dev", "-p", String(PUERTO)], {
  cwd: raiz,
  env,
  stdio: ["ignore", "pipe", "pipe"],
  detached: process.platform !== "win32",
  shell: process.platform === "win32",
});
server.stdout.on("data", (d) => (salida += d.toString()));
server.stderr.on("data", (d) => (salida += d.toString()));

function matar() {
  try {
    if (process.platform !== "win32" && server.pid) process.kill(-server.pid, "SIGTERM");
    else server.kill();
  } catch {
    // ya murió
  }
}
process.on("exit", matar);
process.on("SIGINT", () => {
  matar();
  process.exit(130);
});

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function esperarServer() {
  const limite = Date.now() + 240_000;
  while (Date.now() < limite) {
    if (server.exitCode !== null) throw new Error(`next dev se cerró con código ${server.exitCode}\n${salida.slice(-2000)}`);
    try {
      const r = await fetch(`${BASE}/api/crm/estado`);
      if (r.status === 200) return;
    } catch {
      // todavía no levanta
    }
    await dormir(1000);
  }
  throw new Error(`next dev no respondió en 4 minutos\n${salida.slice(-2000)}`);
}

async function llamar(method, ruta, body, opciones = {}) {
  const headers = { ...(opciones.headers || {}) };
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + ruta, { method, headers, body: payload });
  const texto = await res.text();
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    // no era JSON
  }
  return { status: res.status, json, texto, headers: res.headers };
}

async function esperar(method, ruta, body, status = 200, opciones = {}) {
  const r = await llamar(method, ruta, body, opciones);
  if (r.status !== status) throw new Error(`${method} ${ruta} → ${r.status} (esperaba ${status}): ${r.texto.slice(0, 300)}`);
  return r.json ?? r.texto;
}
const get = (ruta, status, op) => esperar("GET", ruta, undefined, status, op);
const post = (ruta, body, status, op) => esperar("POST", ruta, body ?? {}, status, op);
const put = (ruta, body, status, op) => esperar("PUT", ruta, body, status, op);
const patch = (ruta, body, status, op) => esperar("PATCH", ruta, body, status, op);
const del = (ruta, status, op) => esperar("DELETE", ruta, undefined, status, op);

let total = 0;
let fallas = 0;
async function caso(nombre, fn) {
  total += 1;
  try {
    await fn();
    console.log(`✓ ${nombre}`);
  } catch (e) {
    fallas += 1;
    console.log(`✗ ${nombre}\n    ${e && e.message ? e.message : e}`);
  }
}
function ok(v, msg = "falló la condición") {
  if (!v) throw new Error(msg);
}
function igual(a, b, msg = "") {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} esperaba ${JSON.stringify(b)}, vino ${JSON.stringify(a)}`);
}

const ctx = {};
const inicio = new Date(Date.now() - 60_000).toISOString();
const TODO_EL_DIA = { zona: "America/Argentina/Buenos_Aires", dias: [0, 1, 2, 3, 4, 5, 6].map((dia) => ({ dia, abre: true, desde: "00:00", hasta: "24:00" })) };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

async function correr() {
  console.log("Levantando next dev en el puerto", PUERTO, "…");
  await esperarServer();

  await caso("GET /api/crm/estado crea la empresa y yo soy admin", async () => {
    const e = await get("/api/crm/estado");
    ok(e.empresa && e.empresa.id, "sin empresa");
    igual(e.yo.rol, "admin");
    igual(e.yo.email, "dev@clientany.com");
    ok(e.empresa.webhook_verify_token.length >= 20, "sin verify token");
    ok(!("ia_clave_cifrada" in e.empresa), "la clave cifrada no puede viajar");
    ok(e.bot && e.bot.bienvenida, "sin bot");
    ok(e.ahora, "sin ahora");
    ok(Array.isArray(e.conversaciones) && Array.isArray(e.api_keys), "faltan listas");
    ctx.empresaId = e.empresa.id;
    ctx.verifyToken = e.empresa.webhook_verify_token;
    ctx.bot = e.bot;
  });

  await caso("PUT /api/crm/empresa (nombre, rubro, horario 24/7, ia_clave)", async () => {
    const e = await put("/api/crm/empresa", { nombre: "Tienda Prueba", rubro: "Indumentaria", horario: TODO_EL_DIA, ia: { instrucciones: "Tono amable" }, webhook_salida_url: "" });
    igual(e.nombre, "Tienda Prueba");
    igual(e.rubro, "Indumentaria");
    igual(e.horario.dias.length, 7);
    igual(e.ia.instrucciones, "Tono amable");
    const e2 = await put("/api/crm/empresa", { ia_clave: "sk-ant-prueba" });
    igual(e2.ia.clave_cargada, true);
    igual(e2.ia.proveedor, "anthropic");
    ok(!("ia_clave_cifrada" in e2) && !("ia_clave" in e2), "la clave no vuelve");
    await put("/api/crm/empresa", { horario: { zona: "x", dias: [] } }, 400);
    await put("/api/crm/empresa", { webhook_salida_url: "http://inseguro" }, 400);
  });

  await caso("POST /api/crm/canales manual", async () => {
    const c = await post("/api/crm/canales", { tipo: "manual", nombre: "Mostrador" });
    igual(c.tipo, "manual");
    igual(c.estado, "conectado");
    igual(c.token_cargado, false);
    ok(c.externo_id.startsWith("manual:"));
    ctx.canalManual = c;
  });

  await caso("POST /api/crm/productos", async () => {
    const p = await post("/api/crm/productos", { sku: "REM-01", nombre: "Remera negra", precio: 15000, stock: 3 });
    igual(p.sku, "REM-01");
    igual(p.stock, 3);
    igual(p.activo, true);
    ctx.producto = p;
    await post("/api/crm/productos", { nombre: "Sin sku" }, 400);
  });

  await caso("POST /api/crm/simular «hola» → bienvenida del bot", async () => {
    const r = await post("/api/crm/simular", { texto: "hola", nombre: "Juan", identificador: "11 5555-1234" });
    igual(r.conversacion.identificador, "5491155551234");
    igual(r.conversacion.nombre, "Juan");
    igual(r.conversacion.canal, "manual");
    igual(r.mensaje.direccion, "in");
    ok(r.bot && r.bot.respuestas.length >= 1, `sin respuestas: ${r.bot && r.bot.explicacion}`);
    igual(r.bot.respuestas[0].motivo, "bienvenida");
    ctx.convId = r.conversacion.id;
    ctx.contactoId = r.conversacion.contacto_id;
  });

  await caso("POST /api/crm/simular stock → responde con precio", async () => {
    const r = await post("/api/crm/simular", { texto: "tienen stock de remera negra?", identificador: "11 5555-1234" });
    igual(r.conversacion.id, ctx.convId, "misma conversación");
    igual(r.bot.respuestas[0].motivo, "stock");
    ok(/Remera negra/.test(r.bot.respuestas[0].texto) && /15\.000/.test(r.bot.respuestas[0].texto), r.bot.respuestas[0].texto);
  });

  await caso("POST /api/crm/pedidos ata el contacto; simular «mi pedido #1001» → estado", async () => {
    const p = await post("/api/crm/pedidos", {
      numero: "#1001", nombre: "Juan", telefono: "11 5555-1234", estado: "enviado", total: 15000,
      items: [{ nombre: "Remera negra", cantidad: 1, precio: 15000 }], envio: { transporte: "Andreani", seguimiento: "AR123" },
    });
    igual(p.contacto_id, ctx.contactoId, "contacto atado por teléfono");
    igual(p.telefono, "5491155551234");
    ctx.pedido = p;
    const r = await post("/api/crm/simular", { texto: "mi pedido #1001", identificador: "11 5555-1234" });
    igual(r.bot.respuestas[0].motivo, "pedido");
    ok(/#1001/.test(r.bot.respuestas[0].texto) && /enviado/.test(r.bot.respuestas[0].texto) && /AR123/.test(r.bot.respuestas[0].texto), r.bot.respuestas[0].texto);
    await post("/api/crm/pedidos", { numero: "#9", nombre: "x", estado: "cualquiera" }, 400);
  });

  await caso("GET /api/crm/conversaciones/:id/mensajes (y marca leído)", async () => {
    const m = await get(`/api/crm/conversaciones/${ctx.convId}/mensajes`);
    ok(m.length >= 6, `vinieron ${m.length}`);
    ok(m.some((x) => x.de === "bot" && x.autor === "Bot"), "sin mensajes del bot");
    ok(m.some((x) => x.de === "cliente"), "sin mensajes del cliente");
    const e = await get("/api/crm/estado");
    igual(e.conversaciones.find((c) => c.id === ctx.convId).no_leidos, 0);
    await get("/api/crm/conversaciones/no_existe/mensajes", 404);
  });

  await caso("POST /api/crm/conversaciones/:id/mensajes → enviado (simulado, canal manual)", async () => {
    const m = await post(`/api/crm/conversaciones/${ctx.convId}/mensajes`, { texto: "Hola Juan, ¿todo bien?" });
    igual(m.direccion, "out");
    igual(m.de, "agente");
    igual(m.estado, "enviado");
    igual(m.autor, "Dev");
    const e = await get("/api/crm/estado");
    const c = e.conversaciones.find((x) => x.id === ctx.convId);
    igual(c.ultimo_de, "agente");
    ok(c.ultimo_saliente_humano_en, "sin ultimo_saliente_humano_en");
    ok(c.visto_in === c.ultimo_entrante_en, "visto_in = último entrante");
    await post(`/api/crm/conversaciones/${ctx.convId}/mensajes`, { texto: "" }, 400);
    await post(`/api/crm/conversaciones/${ctx.convId}/mensajes`, { texto: "x".repeat(5000) }, 400);
    ctx.mensajeAgente = m;
  });

  const accion = (a) => post(`/api/crm/conversaciones/${ctx.convId}/accion`, a);
  await caso("accion: respondido / urgente / nota / etiquetas / etapa", async () => {
    let c = await accion({ tipo: "urgente", valor: true });
    igual(c.urgente, true);
    c = await accion({ tipo: "nota", nota: "Quiere talle M" });
    igual(c.nota, "Quiere talle M");
    const e = await get("/api/crm/estado");
    const tag = e.empresa.etiquetas[0].id;
    const etapa = e.empresa.etapas[1].id;
    c = await accion({ tipo: "etiquetas", etiquetas: [tag, "no_existe"] });
    igual(c.etiquetas, [tag]);
    c = await accion({ tipo: "etapa", etapa_id: etapa });
    igual(c.etapa_id, etapa);
    await accion({ tipo: "etapa", etapa_id: "no_existe" }).then(() => ok(false, "tenía que fallar"), (err) => ok(/400/.test(err.message), err.message));
    c = await accion({ tipo: "respondido" });
    igual(c.necesita_humano, false);
    ok(c.visto_in, "visto_in");
  });

  await caso("accion: tomar / soltar / asignar", async () => {
    let c = await accion({ tipo: "tomar" });
    igual(c.tomado_por.nombre, "Dev");
    c = await accion({ tipo: "soltar" });
    igual(c.tomado_por, null);
    const e = await get("/api/crm/estado");
    c = await accion({ tipo: "asignar", miembro_id: e.yo.id });
    igual(c.asignado_a, e.yo.id);
    c = await accion({ tipo: "asignar", miembro_id: null });
    igual(c.asignado_a, null);
    await accion({ tipo: "asignar", miembro_id: "nadie" }).then(() => ok(false, "tenía que fallar"), (err) => ok(/404/.test(err.message), err.message));
  });

  await caso("accion: recordar / resolver / reabrir / baja / pedido / nombre / humano_atendido", async () => {
    const manana = new Date(Date.now() + 24 * 3600000).toISOString();
    let c = await accion({ tipo: "recordar", fecha: manana, nota: "llamar" });
    igual(c.grupo, "mas_adelante");
    igual(c.recordar.nota, "llamar");
    igual(c.recordar.quien, "Dev");
    c = await accion({ tipo: "recordar", fecha: null });
    igual(c.recordar, null);
    igual(c.grupo, null);
    c = await accion({ tipo: "resolver" });
    igual(c.grupo, "resueltos");
    c = await accion({ tipo: "reabrir" });
    igual(c.grupo, null);
    c = await accion({ tipo: "grupo", grupo: "soporte" });
    igual(c.grupo, "soporte");
    c = await accion({ tipo: "baja", valor: true });
    igual(c.baja, true);
    igual(c.grupo, "baja");
    c = await accion({ tipo: "baja", valor: false });
    igual(c.baja, false);
    igual(c.grupo, null);
    c = await accion({ tipo: "pedido", pedido_id: ctx.pedido.id });
    igual(c.pedido_id, ctx.pedido.id);
    c = await accion({ tipo: "nombre", nombre: "Juan Pérez" });
    igual(c.nombre, "Juan Pérez");
    const e = await get("/api/crm/estado");
    igual(e.contactos.find((x) => x.id === ctx.contactoId).nombre, "Juan Pérez");
    c = await accion({ tipo: "humano_atendido" });
    igual(c.necesita_humano, false);
    ok(e.actividad.some((a) => /urgente/.test(a.que) && a.quien === "Dev"), "la actividad se registra en criollo");
    await accion({ tipo: "inventada" }).then(() => ok(false, "tenía que fallar"), (err) => ok(/400/.test(err.message), err.message));
  });

  await caso("GET /api/crm/cambios", async () => {
    const r = await get(`/api/crm/cambios?desde=${encodeURIComponent(inicio)}&conv=${ctx.convId}`);
    ok(r.conversaciones.some((c) => c.id === ctx.convId), "la conversación cambió");
    ok(r.mensajes.length >= 6, "mensajes de la conversación");
    ok(Array.isArray(r.miembros) && r.miembros.length === 1, "miembros");
    ok(r.ahora, "ahora");
    const nada = await get(`/api/crm/cambios?desde=${encodeURIComponent(new Date(Date.now() + 3600000).toISOString())}&conv=${ctx.convId}`);
    igual(nada.conversaciones.length, 0);
    igual(nada.mensajes.length, 0);
  });

  await caso("contactos: crear, actualizar, importar (dedupe), borrar", async () => {
    const c = await post("/api/crm/contactos", { nombre: "Ana", telefono: "11 4444-5555", email: "ana@x.com" });
    igual(c.telefono, "5491144445555");
    const c2 = await post("/api/crm/contactos", { id: c.id, nombre: "Ana López" });
    igual(c2.id, c.id);
    igual(c2.nombre, "Ana López");
    igual(c2.telefono, "5491144445555");
    const c3 = await post("/api/crm/contactos", { nombre: "Ana otra vez", email: "ANA@x.com" });
    igual(c3.id, c.id, "mismo mail → mismo contacto");
    const imp = await post("/api/crm/contactos/importar", { contactos: [{ nombre: "Ana", telefono: "11 4444-5555", localidad: "CABA" }, { nombre: "Beto", telefono: "11 6666-7777" }] });
    igual(imp, { nuevos: 1, actualizados: 1 });
    await post("/api/crm/contactos", { nombre: "Mal", email: "noesmail" }, 400);
    await del(`/api/crm/contactos/${c.id}`);
    await del(`/api/crm/contactos/${c.id}`, 404);
    ctx.beto = (await get("/api/crm/estado")).contactos.find((x) => x.nombre === "Beto");
    ok(ctx.beto, "Beto importado");
  });

  await caso("pedidos: importar (upsert por número) y borrar", async () => {
    const imp = await post("/api/crm/pedidos/importar", { pedidos: [{ numero: "#1001", nombre: "Juan", estado: "entregado" }, { numero: "#1002", nombre: "Beto", telefono: "11 6666-7777", total: 100 }] });
    igual(imp, { nuevos: 1, actualizados: 1 });
    const e = await get("/api/crm/estado");
    const p1 = e.pedidos.find((p) => p.numero === "#1001");
    igual(p1.id, ctx.pedido.id, "mismo id");
    igual(p1.estado, "entregado");
    igual(p1.envio.seguimiento, "AR123", "no pisa lo que no vino");
    const p2 = e.pedidos.find((p) => p.numero === "#1002");
    igual(p2.contacto_id, ctx.beto.id, "atado a Beto");
    igual(p2.canal, "csv");
    await del(`/api/crm/pedidos/${p2.id}`);
    await del(`/api/crm/pedidos/${p2.id}`, 404);
  });

  await caso("productos: ajustar, importar (upsert por sku), borrar", async () => {
    const a = await post(`/api/crm/productos/${ctx.producto.id}/ajustar`, { delta: -1, motivo: "venta" });
    igual(a.stock, 2);
    await post(`/api/crm/productos/${ctx.producto.id}/ajustar`, { delta: -10 }, 400);
    await post(`/api/crm/productos/${ctx.producto.id}/ajustar`, { delta: 0 }, 400);
    const imp = await post("/api/crm/productos/importar", { productos: [{ sku: "REM-01", nombre: "Remera negra", precio: 16000, stock: 5 }, { sku: "BUZ-01", nombre: "Buzo gris", precio: 30000, stock: 0 }] });
    igual(imp, { nuevos: 1, actualizados: 1 });
    const e = await get("/api/crm/estado");
    const rem = e.productos.find((p) => p.sku === "REM-01");
    igual(rem.id, ctx.producto.id);
    igual(rem.precio, 16000);
    igual(rem.stock, 5);
    const buzo = e.productos.find((p) => p.sku === "BUZ-01");
    await del(`/api/crm/productos/${buzo.id}`);
    igual((await get("/api/crm/estado")).productos.length, 1);
  });

  await caso("PUT /api/crm/bot y POST /api/crm/bot/probar (fuera de horario → ausencia)", async () => {
    const b = await put("/api/crm/bot", { ...ctx.bot, menu: { ...ctx.bot.menu, activo: true }, reglas: [{ nombre: "Envíos", palabras: ["envio"], respuesta: "Hacemos envíos a todo el país." }] });
    igual(b.menu.activo, true);
    igual(b.reglas[0].coincidencia, "contiene");
    ok(b.reglas[0].id, "la regla tiene id");
    const r = await post("/api/crm/bot/probar", { texto: "hola", fuera_de_horario: true });
    igual(r.respuestas[0].motivo, "ausencia");
    igual(r.cambios.fuera_horario, true);
    const r2 = await post("/api/crm/bot/probar", { texto: "hola", fuera_de_horario: false });
    igual(r2.respuestas.map((x) => x.motivo), ["bienvenida", "menu"]);
    const r3 = await post("/api/crm/bot/probar", { texto: "hacen envío?", conversacion_id: ctx.convId });
    igual(r3.respuestas[0].motivo.split(":")[0], "regla");
    await put("/api/crm/bot", { ...ctx.bot, tope_por_dia: 999 }, 400);
    await put("/api/crm/bot", ctx.bot);
  });

  await caso("plantillas y rápidas", async () => {
    const p = await post("/api/crm/plantillas", { nombre: "Seguimiento Pedido", cuerpo: "Hola {{1}}, tu pedido {{2}} salió", idioma: "es_AR" });
    igual(p.nombre, "seguimiento_pedido");
    igual(p.variables, 2);
    igual(p.estado, "local");
    const p2 = await post("/api/crm/plantillas", { nombre: "seguimiento_pedido", cuerpo: "Hola {{1}}", idioma: "es_AR" });
    igual(p2.id, p.id, "upsert por nombre+idioma");
    igual(p2.variables, 1);
    const m = await post(`/api/crm/conversaciones/${ctx.convId}/plantilla`, { nombre: "seguimiento_pedido", parametros: ["Juan"] });
    igual(m.tipo, "plantilla");
    igual(m.texto, "Hola Juan");
    igual(m.plantilla, "seguimiento_pedido");
    await del(`/api/crm/plantillas/${p.id}`);
    await del(`/api/crm/plantillas/${p.id}`, 404);
    const r = await post("/api/crm/rapidas", { atajo: "envio", texto: "Hacemos envíos a todo el país" });
    igual(r.atajo, "/envio");
    igual(r.de, null);
    const r2 = await post("/api/crm/rapidas", { id: r.id, atajo: "/envios", texto: "Hacemos envíos" });
    igual(r2.id, r.id);
    igual(r2.atajo, "/envios");
    await del(`/api/crm/rapidas/${r.id}`);
    igual((await get("/api/crm/estado")).rapidas.length, 0);
  });

  await caso("equipo: invitar, chat, pulso, borrar", async () => {
    const inv = await post("/api/crm/equipo/invitar", { email: "sofi@clientany.com", rol: "agente" });
    igual(inv.invitacion.email, "sofi@clientany.com");
    igual(inv.invitacion.rol, "agente");
    await post("/api/crm/equipo/invitar", { email: "dev@clientany.com", rol: "agente" }, 400);
    await post("/api/crm/equipo/invitar", { email: "noesmail", rol: "agente" }, 400);
    const ch = await post("/api/crm/equipo/chat", { texto: "Ojo con el pedido #1001", ref: { tipo: "conversacion", id: ctx.convId, nombre: "Juan" } });
    igual(ch.nombre, "Dev");
    igual(ch.ref.tipo, "conversacion");
    const ch2 = await patch(`/api/crm/equipo/chat/${ch.id}`, { estado: "hecho" });
    igual(ch2.estado, "hecho");
    const ch3 = await patch(`/api/crm/equipo/chat/${ch.id}`, { estado: null });
    igual(ch3.estado, null);
    await post("/api/crm/equipo/pulso", {});
    const e = await get("/api/crm/estado");
    ok(e.yo.ultimo_visto, "ultimo_visto");
    ok(e.equipo.some((m) => m.id === ch.id), "el chat aparece en estado");
    igual(e.invitaciones.length, 1);
    const yo = await patch(`/api/crm/equipo/${e.yo.id}`, { nombre: "Dev Admin" });
    igual(yo.nombre, "Dev Admin");
    await patch(`/api/crm/equipo/${e.yo.id}`, { rol: "agente" }, 400);
    await del(`/api/crm/equipo/${e.yo.id}`, 400);
    await patch(`/api/crm/equipo/${e.yo.id}`, { nombre: "Dev" });
    await del(`/api/crm/equipo/invitaciones/${inv.invitacion.id}`);
    await del(`/api/crm/equipo/chat/${ch.id}`);
    await del(`/api/crm/equipo/chat/${ch.id}`, 404);
  });

  await caso("api-keys: crear devuelve el secreto una vez; GET /api/v1/yo", async () => {
    const r = await post("/api/crm/api-keys", { nombre: "Tienda" }, 201);
    ok(r.secreto.startsWith("ck_live_"), r.secreto);
    ok(r.key.prefijo.endsWith("…") && r.secreto.startsWith(r.key.prefijo.slice(0, -1)), r.key.prefijo);
    ctx.secreto = r.secreto;
    ctx.apiKey = r.key;
    ctx.h = { headers: { "X-API-Key": r.secreto } };
    const yo = await get("/api/v1/yo", 200, ctx.h);
    igual(yo.empresa.id, ctx.empresaId);
    igual(yo.key.nombre, "Tienda");
    const yo2 = await get("/api/v1/yo", 200, { headers: { Authorization: `Bearer ${r.secreto}` } });
    igual(yo2.empresa.id, ctx.empresaId);
    await get("/api/v1/yo", 401, { headers: { "X-API-Key": "ck_live_mala" } });
    await get("/api/v1/yo", 401);
    const e = await get("/api/crm/estado");
    ok(e.api_keys.some((k) => k.id === r.key.id && k.ultimo_uso), "ultimo_uso registrado");
    ok(!e.api_keys.some((k) => "hash" in k), "el hash no viaja");
  });

  await caso("API v1: pedidos (lista, upsert, GET y PATCH por número)", async () => {
    const r = await post("/api/v1/pedidos", [{ numero: "#3003", nombre: "Caro", telefono: "11 2222-3333", estado: "pagado", total: 500, items: [{ sku: "REM-01", nombre: "Remera", cantidad: 1, precio: 500 }] }], 201, ctx.h);
    igual(r.length, 1);
    igual(r[0].canal, "api");
    ok(r[0].contacto_id, "contacto creado y atado");
    const uno = await get(`/api/v1/pedidos/${encodeURIComponent("#3003")}`, 200, ctx.h);
    igual(uno.numero, "#3003");
    const up = await patch(`/api/v1/pedidos/${encodeURIComponent("#3003")}`, { estado: "enviado", envio: { transporte: "Correo", seguimiento: "XX1" } }, 200, ctx.h);
    igual(up.estado, "enviado");
    igual(up.envio.seguimiento, "XX1");
    igual(up.id, r[0].id);
    const otro = await post("/api/v1/pedidos", { numero: "#3003", nombre: "Caro", total: 600 }, 201, ctx.h);
    igual(otro.id, r[0].id, "upsert por número");
    igual(otro.total, 600);
    const lista = await get("/api/v1/pedidos?estado=enviado", 200, ctx.h);
    ok(lista.some((p) => p.numero === "#3003"));
    await get("/api/v1/pedidos?estado=x", 400, ctx.h);
    await get(`/api/v1/pedidos/${encodeURIComponent("#nada")}`, 404, ctx.h);
  });

  await caso("API v1: productos y contactos", async () => {
    const p = await patch("/api/v1/productos/REM-01", { stock: 10 }, 200, ctx.h);
    igual(p.stock, 10);
    igual(p.precio, 16000);
    await patch("/api/v1/productos/NADA", { stock: 1 }, 404, ctx.h);
    const nuevos = await post("/api/v1/productos", [{ sku: "GOR-01", nombre: "Gorra", precio: 5000, stock: 7 }], 201, ctx.h);
    igual(nuevos[0].sku, "GOR-01");
    const lista = await get("/api/v1/productos", 200, ctx.h);
    igual(lista.length, 2);
    const c = await post("/api/v1/contactos", { nombre: "Caro Díaz", telefono: "11 2222-3333", localidad: "Rosario" }, 201, ctx.h);
    igual(c.localidad, "Rosario");
    const busca = await get("/api/v1/contactos?q=caro", 200, ctx.h);
    ok(busca.some((x) => x.id === c.id));
    const todos = await get("/api/v1/contactos", 200, ctx.h);
    ok(todos.length >= 2);
  });

  await caso("API v1: conversaciones y mensajes", async () => {
    const m = await post("/api/v1/mensajes", { conversacion_id: ctx.convId, texto: "Mensaje desde la API" }, 201, ctx.h);
    igual(m.estado, "enviado");
    ok(/API/.test(m.autor), m.autor);
    const lista = await get("/api/v1/conversaciones", 200, ctx.h);
    ok(lista.some((c) => c.id === ctx.convId));
    const msgs = await get(`/api/v1/conversaciones/${ctx.convId}/mensajes`, 200, ctx.h);
    ok(msgs.some((x) => x.id === m.id));
    await post("/api/v1/mensajes", { texto: "sin destino" }, 400, ctx.h);
    await post("/api/v1/mensajes", { conversacion_id: ctx.convId }, 400, ctx.h);
    // por teléfono con canal_id manual: crea la conversación
    const m2 = await post("/api/v1/mensajes", { telefono: "11 7777-8888", canal_id: ctx.canalManual.id, texto: "Hola desde la API" }, 201, ctx.h);
    const e = await get("/api/crm/estado");
    ok(e.conversaciones.some((c) => c.id === m2.conversacion_id && c.identificador === "5491177778888"), "conversación nueva por teléfono");
    // sin canal de WhatsApp conectado → 400
    await post("/api/v1/mensajes", { telefono: "11 7777-8888", texto: "x" }, 400, ctx.h);
  });

  await caso("webhook GET: verificación con hub.challenge", async () => {
    const r = await llamar("GET", `/api/webhooks/meta/${ctx.empresaId}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(ctx.verifyToken)}&hub.challenge=abc`);
    igual(r.status, 200);
    igual(r.texto, "abc");
    const mal = await llamar("GET", `/api/webhooks/meta/${ctx.empresaId}?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=abc`);
    igual(mal.status, 403);
  });

  await caso("POST /api/crm/canales whatsapp (Graph simulado), probar y sincronizar plantillas", async () => {
    const c = await post("/api/crm/canales", { tipo: "whatsapp", phone_number_id: "123456789", waba_id: "987654321", token: "EAAtest", app_secret: "secretito" });
    igual(c.tipo, "whatsapp");
    igual(c.externo_id, "123456789");
    igual(c.token_cargado, true);
    igual(c.app_secret_cargado, true);
    igual(c.detalle.nombre_verificado, "Prueba");
    igual(c.nombre, "+54 9 11 0000-0000");
    ok(!("token_cifrado" in c) && !("token" in c), "el token no viaja");
    ctx.canalWa = c;
    const otra = await post("/api/crm/canales", { tipo: "whatsapp", phone_number_id: "123456789", token: "EAAotro" });
    igual(otra.id, c.id, "mismo (tipo, externo_id) → mismo canal");
    await post("/api/crm/canales", { tipo: "whatsapp", token: "x" }, 400);
    const pb = await post(`/api/crm/canales/${c.id}/probar`, {});
    igual(pb.ok, true);
    const pl = await post(`/api/crm/canales/${c.id}/plantillas/sincronizar`, {});
    ok(pl.some((p) => p.nombre === "seguimiento_pedido" && p.estado === "aprobada" && p.canal_id === c.id), JSON.stringify(pl));
    const pl2 = await post(`/api/crm/canales/${c.id}/plantillas/sincronizar`, {});
    igual(pl2.length, pl.length, "sincronizar dos veces no duplica");
  });

  const firmar = (raw, secreto) => "sha256=" + createHmac("sha256", secreto).update(raw).digest("hex");
  const postWebhook = async (payload, secreto) => {
    const raw = JSON.stringify(payload);
    const headers = { "Content-Type": "application/json" };
    if (secreto) headers["X-Hub-Signature-256"] = firmar(raw, secreto);
    const res = await fetch(`${BASE}/api/webhooks/meta/${ctx.empresaId}`, { method: "POST", headers, body: raw });
    return res.status;
  };
  const valueWa = (extra) => ({
    object: "whatsapp_business_account",
    entry: [{ id: "987654321", changes: [{ field: "messages", value: { messaging_product: "whatsapp", metadata: { display_phone_number: "5491100000000", phone_number_id: "123456789" }, ...extra } }] }],
  });

  await caso("webhook POST WhatsApp: texto entrante → contacto, conversación, mensaje y bot (firma válida)", async () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const payload = valueWa({
      contacts: [{ profile: { name: "Lucía" }, wa_id: "5491155550001" }],
      messages: [{ from: "5491155550001", id: "wamid.HBgL1", timestamp: ts, type: "text", text: { body: "Hola, quiero info" } }],
    });
    igual(await postWebhook(payload, "secretito"), 200);
    const e = await get("/api/crm/estado");
    const conv = e.conversaciones.find((c) => c.identificador === "5491155550001");
    ok(conv, "conversación creada");
    igual(conv.canal, "whatsapp");
    igual(conv.canal_id, ctx.canalWa.id);
    igual(conv.nombre, "Lucía");
    igual(conv.no_leidos, 1);
    ok(e.contactos.some((c) => c.telefono === "5491155550001" && c.nombre === "Lucía" && c.origen === "whatsapp"), "contacto creado");
    ctx.convWa = conv;
    const msgs = await get(`/api/crm/conversaciones/${conv.id}/mensajes`);
    const entrante = msgs.find((m) => m.externo_id === "wamid.HBgL1");
    ok(entrante && entrante.direccion === "in" && entrante.texto === "Hola, quiero info", "mensaje entrante guardado");
    const delBot = msgs.find((m) => m.de === "bot");
    ok(delBot && delBot.externo_id && delBot.externo_id.startsWith("wamid.fake."), "el bot mandó por Graph (simulado)");
    igual(delBot.estado, "enviado");
    ctx.msgBot = delBot;
    ctx.cantidadWa = msgs.length;
  });

  await caso("webhook POST WhatsApp: idempotente por externo_id y rechaza firma inválida", async () => {
    const ts = String(Math.floor(Date.now() / 1000));
    igual(await postWebhook(valueWa({ messages: [{ from: "5491155550001", id: "wamid.HBgL1", timestamp: ts, type: "text", text: { body: "Hola, quiero info" } }] }), "secretito"), 200);
    igual((await get(`/api/crm/conversaciones/${ctx.convWa.id}/mensajes`)).length, ctx.cantidadWa, "no duplica");
    igual(await postWebhook(valueWa({ messages: [{ from: "5491155550001", id: "wamid.HBgL2", timestamp: ts, type: "text", text: { body: "Otro" } }] }), "secreto-equivocado"), 200);
    igual((await get(`/api/crm/conversaciones/${ctx.convWa.id}/mensajes`)).length, ctx.cantidadWa, "con firma inválida no procesa");
    igual(await postWebhook(valueWa({ messages: [{ from: "5491155550001", id: "wamid.HBgL3", timestamp: ts, type: "image", image: { id: "media_1", mime_type: "image/png", caption: "mirá" } }] }), "secretito"), 200);
    const msgs = await get(`/api/crm/conversaciones/${ctx.convWa.id}/mensajes`);
    const img = msgs.find((m) => m.externo_id === "wamid.HBgL3");
    ok(img && img.tipo === "imagen" && img.texto === "mirá" && img.media_url && img.media_url.startsWith("/api/crm/media/"), JSON.stringify(img));
    const media = await fetch(BASE + img.media_url);
    igual(media.status, 200);
    igual(media.headers.get("content-type"), "image/png");
  });

  await caso("webhook POST WhatsApp: statuses delivered / read sobre el saliente", async () => {
    const ts = String(Math.floor(Date.now() / 1000));
    igual(await postWebhook(valueWa({ statuses: [{ id: ctx.msgBot.externo_id, status: "delivered", timestamp: ts, recipient_id: "5491155550001" }] }), "secretito"), 200);
    let m = (await get(`/api/crm/conversaciones/${ctx.convWa.id}/mensajes`)).find((x) => x.id === ctx.msgBot.id);
    igual(m.estado, "entregado");
    igual(await postWebhook(valueWa({ statuses: [{ id: ctx.msgBot.externo_id, status: "read", timestamp: ts, recipient_id: "5491155550001" }] }), "secretito"), 200);
    m = (await get(`/api/crm/conversaciones/${ctx.convWa.id}/mensajes`)).find((x) => x.id === ctx.msgBot.id);
    igual(m.estado, "leido");
    igual(await postWebhook(valueWa({ statuses: [{ id: ctx.msgBot.externo_id, status: "sent", timestamp: ts }] }), "secretito"), 200);
    m = (await get(`/api/crm/conversaciones/${ctx.convWa.id}/mensajes`)).find((x) => x.id === ctx.msgBot.id);
    igual(m.estado, "leido", "no retrocede");
    igual(await postWebhook(valueWa({ statuses: [{ id: ctx.msgBot.externo_id, status: "failed", timestamp: ts, errors: [{ code: 131026, title: "Message undeliverable", message: "Message Undeliverable." }] }] }), "secretito"), 200);
    m = (await get(`/api/crm/conversaciones/${ctx.convWa.id}/mensajes`)).find((x) => x.id === ctx.msgBot.id);
    igual(m.estado, "fallido");
    ok(m.error, "con error");
  });

  await caso("webhook POST WhatsApp: eco de Coexistence se guarda como saliente «desde el celular»", async () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const payload = { object: "whatsapp_business_account", entry: [{ id: "987654321", changes: [{ field: "smb_message_echoes", value: { messaging_product: "whatsapp", metadata: { phone_number_id: "123456789" }, message_echoes: [{ from: "5491100000000", to: "5491155550001", id: "wamid.ECO1", timestamp: ts, type: "text", text: { body: "Te respondo desde el cel" } }] } }] }] };
    igual(await postWebhook(payload, "secretito"), 200);
    const msgs = await get(`/api/crm/conversaciones/${ctx.convWa.id}/mensajes`);
    const eco = msgs.find((m) => m.externo_id === "wamid.ECO1");
    ok(eco && eco.direccion === "out" && eco.de === "agente" && eco.autor === "desde el celular", JSON.stringify(eco));
    const e = await get("/api/crm/estado");
    const conv = e.conversaciones.find((c) => c.id === ctx.convWa.id);
    ok(conv.ultimo_saliente_humano_en, "cuenta como respuesta humana");
    igual(conv.no_leidos, 0);
  });

  await caso("mensaje real por WhatsApp (Graph simulado) y texto fuera de ventana → 400 ventana_cerrada", async () => {
    const m = await post(`/api/crm/conversaciones/${ctx.convWa.id}/mensajes`, { texto: "Hola Lucía" });
    igual(m.estado, "enviado");
    ok(m.externo_id.startsWith("wamid.fake."), m.externo_id);
    // una conversación de WhatsApp sin mensajes del cliente no tiene ventana
    const nueva = await post("/api/crm/conversaciones", { canal_id: ctx.canalWa.id, identificador: "11 3333-4444", nombre: "Sin ventana" });
    igual(nueva.identificador, "5491133334444");
    const r = await llamar("POST", `/api/crm/conversaciones/${nueva.id}/mensajes`, { texto: "No debería salir" });
    igual(r.status, 400);
    igual(r.json.codigo, "ventana_cerrada");
    igual((await get(`/api/crm/conversaciones/${nueva.id}/mensajes`)).length, 0, "no guarda nada");
    const pl = await post(`/api/crm/conversaciones/${nueva.id}/plantilla`, { nombre: "seguimiento_pedido", parametros: ["Juan", "#1001", "AR123"] });
    igual(pl.tipo, "plantilla");
    ok(/Juan/.test(pl.texto) && /AR123/.test(pl.texto), pl.texto);
    const v1 = await llamar("POST", "/api/v1/mensajes", { telefono: "11 3333-4444", texto: "x" }, ctx.h);
    igual(v1.status, 400);
    igual(v1.json.codigo, "ventana_cerrada");
    const v1ok = await post("/api/v1/mensajes", { telefono: "11 3333-4444", plantilla: { nombre: "seguimiento_pedido", parametros: ["a", "b", "c"] } }, 201, ctx.h);
    igual(v1ok.tipo, "plantilla");
    ctx.convSinVentana = nueva;
  });

  await caso("webhook POST Instagram (object: instagram)", async () => {
    const c = await post("/api/crm/canales", { tipo: "instagram", ig_user_id: "17841400000000000", token: "IGtest" });
    igual(c.tipo, "instagram");
    igual(c.externo_id, "17841400000000000");
    igual(c.nombre, "@prueba");
    const payload = { object: "instagram", entry: [{ id: "17841400000000000", time: Date.now(), messaging: [{ sender: { id: "psid_ig_1" }, recipient: { id: "17841400000000000" }, timestamp: Date.now(), message: { mid: "mid.ig.1", text: "Hola por IG" } }] }] };
    igual(await postWebhook(payload), 200);
    const e = await get("/api/crm/estado");
    const conv = e.conversaciones.find((x) => x.identificador === "psid_ig_1");
    ok(conv && conv.canal === "instagram" && conv.canal_id === c.id, "conversación de IG");
    igual(conv.nombre, "Cliente de Instagram");
    const msgs = await get(`/api/crm/conversaciones/${conv.id}/mensajes`);
    ok(msgs.some((m) => m.externo_id === "mid.ig.1" && m.texto === "Hola por IG"));
    ok(msgs.some((m) => m.de === "bot" && m.externo_id.startsWith("mid.fake.")), "bot por IG");
    const m = await post(`/api/crm/conversaciones/${conv.id}/mensajes`, { texto: "Hola!" });
    ok(m.externo_id.startsWith("mid.fake."));
    // read watermark → los salientes quedan leídos
    const lectura = { object: "instagram", entry: [{ id: "17841400000000000", time: Date.now(), messaging: [{ sender: { id: "psid_ig_1" }, recipient: { id: "17841400000000000" }, timestamp: Date.now(), read: { watermark: Date.now() + 1000 } }] }] };
    igual(await postWebhook(lectura), 200);
    const msgs2 = await get(`/api/crm/conversaciones/${conv.id}/mensajes`);
    ok(msgs2.filter((x) => x.direccion === "out").every((x) => x.estado === "leido"), JSON.stringify(msgs2.filter((x) => x.direccion === "out").map((x) => x.estado)));
  });

  await caso("webhook POST Messenger (object: page)", async () => {
    const c = await post("/api/crm/canales", { tipo: "messenger", page_id: "111222333", token: "FBtest" });
    igual(c.tipo, "messenger");
    igual(c.externo_id, "111222333");
    igual(c.nombre, "Página de prueba");
    const payload = { object: "page", entry: [{ id: "111222333", time: Date.now(), messaging: [{ sender: { id: "psid_fb_1" }, recipient: { id: "111222333" }, timestamp: Date.now(), message: { mid: "mid.fb.1", text: "Hola por FB", attachments: [{ type: "image", payload: { url: "https://example.invalid/foto.jpg" } }] } }] }] };
    igual(await postWebhook(payload), 200);
    const e = await get("/api/crm/estado");
    const conv = e.conversaciones.find((x) => x.identificador === "psid_fb_1");
    ok(conv && conv.canal === "messenger", "conversación de Messenger");
    const msgs = await get(`/api/crm/conversaciones/${conv.id}/mensajes`);
    const m = msgs.find((x) => x.externo_id === "mid.fb.1");
    ok(m && m.tipo === "imagen" && m.texto === "Hola por FB", JSON.stringify(m));
    ok(m.media_url && m.error, "si no pudo bajar el adjunto deja la URL y anota el error");
    const entregado = { object: "page", entry: [{ id: "111222333", time: Date.now(), messaging: [{ sender: { id: "psid_fb_1" }, recipient: { id: "111222333" }, timestamp: Date.now(), delivery: { mids: [msgs.find((x) => x.de === "bot").externo_id], watermark: Date.now() } }] }] };
    igual(await postWebhook(entregado), 200);
    const msgs2 = await get(`/api/crm/conversaciones/${conv.id}/mensajes`);
    igual(msgs2.find((x) => x.de === "bot").estado, "entregado");
  });

  await caso("archivo multipart → mensaje con media, y /api/crm/media sirve el archivo", async () => {
    const fd = new FormData();
    fd.append("archivo", new Blob([PNG], { type: "image/png" }), "foto.png");
    fd.append("texto", "Mirá esta foto");
    const r = await llamar("POST", `/api/crm/conversaciones/${ctx.convId}/archivo`, fd);
    igual(r.status, 200, r.texto);
    igual(r.json.tipo, "imagen");
    igual(r.json.texto, "Mirá esta foto");
    igual(r.json.media_nombre, "foto.png");
    ok(r.json.media_url.startsWith("/api/crm/media/"), r.json.media_url);
    const media = await fetch(BASE + r.json.media_url);
    igual(media.status, 200);
    igual(media.headers.get("content-type"), "image/png");
    igual((await media.arrayBuffer()).byteLength, PNG.length);
    const sin = await llamar("POST", `/api/crm/conversaciones/${ctx.convId}/archivo`, new FormData());
    igual(sin.status, 400);
    igual((await fetch(`${BASE}/api/crm/media/no-existe.png`)).status, 404);
  });

  await caso("buscar, nueva conversación, borrar mensaje y conversación", async () => {
    const b = await get(`/api/crm/buscar?q=${encodeURIComponent("Juan")}`);
    ok(b.conversaciones.some((c) => c.id === ctx.convId), "encuentra la conversación");
    ok(b.pedidos.some((p) => p.numero === "#1001"), "encuentra el pedido");
    const b2 = await get("/api/crm/buscar?q=1001");
    ok(b2.pedidos.length >= 1);
    const nc = await post("/api/crm/conversaciones", { canal_id: ctx.canalManual.id, identificador: "11 9999-8888", nombre: "Nuevo", texto: "Hola, te escribo desde el local" });
    igual(nc.identificador, "5491199998888");
    igual(nc.nombre, "Nuevo");
    const msgs = await get(`/api/crm/conversaciones/${nc.id}/mensajes`);
    igual(msgs.length, 1);
    igual(msgs[0].de, "agente");
    await del(`/api/crm/conversaciones/${nc.id}/mensajes/${msgs[0].id}`);
    igual((await get(`/api/crm/conversaciones/${nc.id}/mensajes`)).length, 0);
    await del(`/api/crm/conversaciones/${nc.id}`);
    await get(`/api/crm/conversaciones/${nc.id}/mensajes`, 404);
    await post("/api/crm/conversaciones", { canal_id: "no_existe", identificador: "1" }, 404);
  });

  await caso("IA sin clave → 400 ia_sin_clave; sin sesión usa contexto", async () => {
    await put("/api/crm/empresa", { ia_clave: "", ia: { proveedor: "plataforma" } });
    const r = await llamar("POST", "/api/crm/ia/sugerir", { conversacion_id: ctx.convId });
    igual(r.status, 400, r.texto);
    igual(r.json.codigo, "ia_sin_clave");
    const r2 = await llamar("POST", "/api/crm/ia/sugerir", { contexto: { empresa: { nombre: "Demo" }, mensajes: [] } });
    igual(r2.status, 400);
    igual(r2.json.codigo, "ia_sin_clave");
    const r3 = await llamar("POST", "/api/crm/ia/sugerir", {});
    igual(r3.status, 400);
    igual(r3.json.codigo, "falta_contexto");
  });

  await caso("GET /api/crm/metricas", async () => {
    const m = await get("/api/crm/metricas");
    ok(m.conversaciones && m.conversaciones.total >= 4, JSON.stringify(m.conversaciones));
    ok(m.por_canal && typeof m.por_canal.whatsapp === "number", "por_canal");
    ok(m.stock && m.stock.productos === 2, JSON.stringify(m.stock));
    ok(m.bot && m.bot.respuestas_hoy >= 1, JSON.stringify(m.bot));
  });

  await caso("GET /api/crm/exportar/pedidos → CSV", async () => {
    const r = await llamar("GET", "/api/crm/exportar/pedidos");
    igual(r.status, 200);
    ok(/text\/csv/.test(r.headers.get("content-type")), r.headers.get("content-type"));
    ok(/^﻿numero,fecha,nombre/.test(r.texto), r.texto.slice(0, 60));
    ok(/#1001/.test(r.texto) && /1x Remera negra/.test(r.texto), r.texto);
    const c = await llamar("GET", "/api/crm/exportar/contactos");
    ok(/nombre,telefono,email/.test(c.texto));
    const p = await llamar("GET", "/api/crm/exportar/productos");
    ok(/sku,nombre,precio/.test(p.texto) && /REM-01/.test(p.texto));
    await get("/api/crm/exportar/otra", 400);
  });

  await caso("canales: desconectar", async () => {
    await del(`/api/crm/canales/${ctx.canalWa.id}`);
    await del(`/api/crm/canales/${ctx.canalWa.id}`, 404);
    const e = await get("/api/crm/estado");
    ok(!e.canales.some((c) => c.id === ctx.canalWa.id));
  });

  await caso("POST / DELETE /api/crm/demo", async () => {
    const antes = (await get("/api/crm/estado")).conversaciones.length;
    await post("/api/crm/demo", {});
    const e = await get("/api/crm/estado");
    ok(e.conversaciones.length > antes, "cargó conversaciones de prueba");
    ok(e.canales.some((c) => c.id.startsWith("demo_")), "cargó canales demo");
    ok(e.productos.length > 2 && e.pedidos.length > 1, "cargó productos y pedidos");
    const demoConv = e.conversaciones.find((c) => c.id.startsWith("demo_"));
    const msgs = await get(`/api/crm/conversaciones/${demoConv.id}/mensajes`);
    ok(msgs.length > 0, "mensajes demo");
    await del("/api/crm/demo");
    const e2 = await get("/api/crm/estado");
    igual(e2.conversaciones.length, 0);
    igual(e2.contactos.length, 0);
    igual(e2.pedidos.length, 0);
    igual(e2.productos.length, 0);
    ok(!e2.canales.some((c) => c.id.startsWith("demo_")), "canales demo borrados");
    ok(e2.canales.some((c) => c.id === ctx.canalManual.id), "los canales reales quedan");
    ok(e2.api_keys.length === 1, "las claves quedan");
  });

  await caso("api-keys: borrar deja la clave inválida", async () => {
    await del(`/api/crm/api-keys/${ctx.apiKey.id}`);
    await get("/api/v1/yo", 401, ctx.h);
  });

  await caso("la persistencia en .clientany-dev/db.json queda escrita", async () => {
    await dormir(700);
    const archivo = path.join(raiz, ".clientany-dev", "db.json");
    ok(fs.existsSync(archivo), "falta db.json");
    const v = JSON.parse(fs.readFileSync(archivo, "utf8"));
    ok(v.empresas.length === 1 && v.empresas[0].id === ctx.empresaId, "empresa persistida");
    ok(v.canales.every((c) => !c.token_cifrado || c.token_cifrado.startsWith("enc:v1:")), "tokens cifrados en disco");
  });
}

correr()
  .catch((e) => {
    fallas += 1;
    console.log(`✗ la suite se cortó: ${e && e.stack ? e.stack : e}`);
  })
  .finally(() => {
    matar();
    console.log(`\n${total - fallas}/${total} casos en verde`);
    setTimeout(() => process.exit(fallas ? 1 : 0), 300);
  });
