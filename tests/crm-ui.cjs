/* Clientany · prueba de pantalla con Chromium (Playwright).
   Levanta la app dos veces —modo demo (3100) y modo nube en memoria (3101)—,
   recorre cada pantalla en escritorio y en celular, falla si hay errores de
   JS o de red, y ejecuta las acciones de cada pantalla paso a paso.

   node tests/crm-ui.cjs             → todo
   SOLO=demo node tests/crm-ui.cjs   → sólo un modo (demo | nube)
   CAPTURAS=1                        → guarda capturas en qa/
*/
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const assert = require("assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const raiz = path.resolve(__dirname, "..");
const salida = path.resolve(process.env.QA_OUTPUT || path.join(raiz, "qa"));
fs.mkdirSync(salida, { recursive: true });
const CAPTURAS = process.env.CAPTURAS === "1";
const CHROME = process.env.CHROME_BIN || "/opt/pw-browsers/chromium";

const resultados = [];
let fallas = 0;
function ok(nombre, cond, detalle) {
  if (cond) {
    resultados.push(`✓ ${nombre}`);
    console.log(`✓ ${nombre}`);
  } else {
    fallas++;
    resultados.push(`✗ ${nombre}${detalle ? " — " + detalle : ""}`);
    console.log(`✗ ${nombre}${detalle ? " — " + detalle : ""}`);
  }
}

function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function esperarServidor(url, ms = 180000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return true;
    } catch {}
    await esperar(1500);
  }
  throw new Error("El servidor no levantó: " + url);
}

function levantar(puerto, env) {
  const p = cp.spawn("npx", ["next", "dev", "-p", String(puerto)], {
    cwd: raiz,
    env: { ...process.env, ...env, PORT: String(puerto) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const log = fs.createWriteStream(path.join(salida, `server-${puerto}.log`));
  p.stdout.pipe(log);
  p.stderr.pipe(log);
  return p;
}

// Rutas de la app (todas tienen que abrir sin errores de JS).
const RUTAS = [
  "/", "/docs", "/privacidad", "/terminos",
  "/panel", "/inbox", "/clientes", "/pedidos", "/stock",
  "/automaticas", "/plantillas", "/embudo",
  "/conexiones", "/equipo", "/ajustes",
  "/tracking", "/carritos", "/campanas", "/difusion", "/mercadolibre", "/marcas",
];

async function recorrer(nombreModo, base, browser) {
  for (const vista of [
    { nombre: "escritorio", viewport: { width: 1440, height: 900 } },
    { nombre: "celular", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  ]) {
    const ctx = await browser.newContext({ viewport: vista.viewport, isMobile: !!vista.isMobile, hasTouch: !!vista.hasTouch, locale: "es-AR" });
    const page = await ctx.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") errores.push(`console: ${m.text()}`);
    });
    page.on("response", (r) => {
      const u = r.url();
      if (r.status() >= 500 && u.startsWith(base)) errores.push(`http ${r.status()} ${u}`);
    });
    for (const ruta of RUTAS) {
      errores.length = 0;
      let estado = 0;
      try {
        const resp = await page.goto(base + ruta, { waitUntil: "networkidle", timeout: 60000 });
        estado = resp ? resp.status() : 0;
        await esperar(600);
      } catch (e) {
        errores.push("goto: " + e.message.slice(0, 120));
      }
      const malos = errores.filter((e) => !/favicon|hydration|Warning:|picsum|ERR_CERT|manifest|fonts\.g/i.test(e));
      ok(`[${nombreModo}/${vista.nombre}] ${ruta} abre (${estado}) sin errores`, estado < 400 && malos.length === 0, malos.slice(0, 3).join(" | "));
      if (CAPTURAS) {
        await page.screenshot({ path: path.join(salida, `${nombreModo}-${vista.nombre}${ruta.replace(/\//g, "_") || "_home"}.png`), fullPage: ruta === "/" || ruta === "/docs" });
      }
    }
    await ctx.close();
  }
}

// Las acciones paso a paso de cada pantalla (se completan con la UI real).
async function flujos(nombreModo, base, browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-AR" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  const t = (nombre, cond, detalle) => ok(`[${nombreModo}] ${nombre}`, cond, detalle);
  try {
    const mod = require("./crm-ui-flujos.cjs");
    await mod.correr({ page, base, t, esperar, modo: nombreModo, errores, salida, CAPTURAS });
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND" && /crm-ui-flujos/.test(e.message)) {
      console.log("  (sin flujos todavía: falta tests/crm-ui-flujos.cjs)");
    } else {
      t("flujos sin excepción", false, e.message.slice(0, 300));
    }
  }
  await ctx.close();
}

(async () => {
  const solo = process.env.SOLO || "";
  const servidores = [];
  const modos = [];
  if (!solo || solo === "demo") {
    modos.push({ nombre: "demo", puerto: 3100, env: { NEXT_PUBLIC_CLIENTANY_MODO: "demo", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "" } });
  }
  if (!solo || solo === "nube") {
    fs.rmSync(path.join(raiz, ".clientany-dev"), { recursive: true, force: true });
    modos.push({
      nombre: "nube",
      puerto: 3101,
      env: {
        NEXT_PUBLIC_CLIENTANY_MODO: "nube", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
        CLIENTANY_DB: "memory", CLIENTANY_DEV_USER: "dev@clientany.com", CLIENTANY_SECRET: "prueba", CLIENTANY_GRAPH_FAKE: "1",
      },
    });
  }
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    for (const m of modos) {
      const srv = levantar(m.puerto, m.env);
      servidores.push(srv);
      const base = `http://localhost:${m.puerto}`;
      await esperarServidor(base + "/");
      console.log(`\n== Modo ${m.nombre} en ${base}`);
      await recorrer(m.nombre, base, browser);
      await flujos(m.nombre, base, browser);
      srv.kill("SIGTERM");
    }
  } finally {
    await browser.close();
    for (const s of servidores) {
      try { s.kill("SIGKILL"); } catch {}
    }
  }
  fs.writeFileSync(path.join(salida, "crm-ui-resultados.txt"), resultados.join("\n"));
  console.log(`\n${resultados.length - fallas} ok · ${fallas} fallas`);
  process.exit(fallas ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
