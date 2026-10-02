/* Clientany · flujos paso a paso de cada pantalla (los llama crm-ui.cjs).
   Cada paso registra ✓/✗ y sigue con el siguiente; si falla, saca una captura
   (qa/<modo>-falla-<n>.png) y cierra lo que haya quedado abierto. */
const fs = require("fs");
const path = require("path");

let nFalla = 0;

function csvTemporal(salida, nombre, contenido) {
  const p = path.join(salida, nombre);
  fs.writeFileSync(p, contenido);
  return p;
}

async function aviso(page, re, ms = 6000) {
  await page.getByRole("status").filter({ hasText: re }).first().waitFor({ state: "visible", timeout: ms });
}

async function limpiar(page) {
  for (let i = 0; i < 3; i++) {
    const cancelar = page.getByRole("button", { name: /^Cancelar$/ }).last();
    if (await cancelar.isVisible().catch(() => false)) { await cancelar.click().catch(() => {}); await page.waitForTimeout(150); continue; }
    const cerrar = page.getByRole("dialog").getByRole("button", { name: /^Cerrar$/ }).last();
    if (await cerrar.isVisible().catch(() => false)) { await cerrar.click().catch(() => {}); await page.waitForTimeout(150); continue; }
    break;
  }
  await page.keyboard.press("Escape").catch(() => {});
  await page.keyboard.press("Escape").catch(() => {});
}

// El onboarding viejo (negocio + marca) aparece en modo nube la primera vez
// que un navegador entra: se completa «de cero».
async function completarAlta(pg, esperar) {
  const alta = pg.getByPlaceholder(/Mi Tienda Online/);
  if (!(await alta.isVisible().catch(() => false))) return;
  await alta.fill("Empresa de prueba");
  await pg.getByPlaceholder(/Nombre y apellido/).first().fill("Dev Prueba");
  await pg.getByPlaceholder(/hola@tunegocio/).fill("dev@clientany.com");
  await pg.getByRole("button", { name: /Continuar/ }).click();
  await pg.getByText(/Empezar de cero/).first().click();
  await esperar(400);
  const seguir = pg.getByRole("button", { name: /Continuar|Crear|Listo|Empezar/ }).first();
  if (await seguir.isVisible().catch(() => false)) await seguir.click();
  await esperar(600);
}

async function correr({ page, base, t, esperar, modo, salida, CAPTURAS }) {
  page.setDefaultTimeout(10000);
  const paso = async (nombre, fn) => {
    try {
      await fn();
      t(nombre, true);
      return true;
    } catch (e) {
      nFalla++;
      const cap = path.join(salida, `${modo}-falla-${nFalla}.png`);
      await page.screenshot({ path: cap }).catch(() => {});
      t(nombre, false, (e && e.message ? e.message : String(e)).split("\n")[0].slice(0, 200) + ` [${path.basename(cap)}]`);
      await limpiar(page);
      return false;
    }
  };
  const ir = async (ruta) => {
    await page.goto(base + ruta, { waitUntil: "networkidle", timeout: 60000 });
    await esperar(400);
  };
  const cap = async (nombre) => {
    if (CAPTURAS) await page.screenshot({ path: path.join(salida, `${modo}-flujo-${nombre}.png`) });
  };
  const fila = () => page.getByRole("button", { name: /Sofía|Mica|Juan|Valentina|Tomás|Flor|Lucas|Rocío|Lucía|Camila|Cliente/ }).first();
  const caja = () => page.getByRole("textbox", { name: /^Mensaje$/ });

  // ======================= PREPARACIÓN (modo nube) =======================
  if (modo === "nube") {
    await paso("Nube: cargar datos de ejemplo por la API y completar el alta", async () => {
      const r = await page.request.post(base + "/api/crm/demo");
      if (!r.ok()) throw new Error("POST /api/crm/demo → " + r.status());
      await ir("/panel");
      await completarAlta(page, esperar);
    });
  }

  // ======================= BANDEJA =======================
  // En nube el simulador «Probar como cliente» se muestra sólo con ?simular=1.
  await ir(modo === "nube" ? "/inbox?simular=1" : "/inbox");
  await paso("Bandeja: la lista tiene chats", async () => {
    await page.getByRole("textbox", { name: /Buscar conversaciones/ }).waitFor({ timeout: 15000 });
    await fila().waitFor({ timeout: 10000 });
  });
  for (const g of ["Soporte", "Más adelante", "Resueltos", "Baja", "Ventas"]) {
    await paso(`Bandeja: pestaña ${g}`, async () => {
      await page.getByRole("button", { name: new RegExp(`^${g}`) }).first().click();
      await esperar(250);
    });
  }
  await paso("Bandeja: buscar «sofía» muestra resultados", async () => {
    const q = page.getByRole("textbox", { name: /Buscar conversaciones/ });
    await q.fill("sofía");
    await esperar(500);
    if ((await page.getByRole("button", { name: /Sofía/ }).count()) < 1) throw new Error("sin resultados");
    await q.fill("");
    await esperar(300);
  });
  await paso("Chat: abrir el primero de Ventas", async () => {
    await page.getByRole("button", { name: /^Ventas/ }).first().click();
    await esperar(200);
    await fila().click();
    await caja().waitFor({ timeout: 8000 });
  });
  await cap("chat");
  const texto = `Prueba automática ${Date.now().toString().slice(-5)}`;
  await paso("Chat: mandar un texto (Enter) y verlo en la burbuja", async () => {
    await caja().fill(texto);
    await caja().press("Enter");
    await page.getByText(texto).first().waitFor({ timeout: 8000 });
  });
  await paso("Chat: «Marcar urgente» y volver", async () => {
    await page.getByRole("button", { name: /^Marcar urgente$/ }).click();
    await page.getByRole("button", { name: /^Marcada urgente$/ }).waitFor();
    await page.getByRole("button", { name: /^Marcada urgente$/ }).click();
    await page.getByRole("button", { name: /^Marcar urgente$/ }).waitFor();
  });
  await paso("Chat: nota interna", async () => {
    await page.getByRole("button", { name: /^Nota interna$/ }).click();
    const nota = page.getByPlaceholder(/Nota interna/).first();
    await nota.waitFor();
    await nota.fill("Nota de prueba del equipo");
    const guardar = page.getByRole("button", { name: /^Guardar( nota)?$/ }).first();
    if (await guardar.isVisible().catch(() => false)) await guardar.click();
    else await nota.press("Enter");
    await page.getByText("Nota de prueba del equipo").first().waitFor();
  });
  await paso("Chat: «Lo tomo yo» y soltar", async () => {
    await page.getByRole("button", { name: /^Lo tomo yo$/ }).click();
    await page.getByRole("button", { name: /Lo tengo yo/ }).waitFor();
    await page.getByRole("button", { name: /Lo tengo yo/ }).click();
    await page.getByRole("button", { name: /^Lo tomo yo$/ }).waitFor();
  });
  await paso("Chat: Resolver y Reabrir", async () => {
    await page.getByRole("button", { name: /^Resolver$/ }).click();
    await page.getByRole("button", { name: /^Reabrir$/ }).waitFor();
    await page.getByRole("button", { name: /^Reabrir$/ }).click();
    await page.getByRole("button", { name: /^Resolver$/ }).waitFor();
  });
  await paso("Chat: mover a Soporte y volver a Ventas", async () => {
    await page.getByRole("button", { name: /^Soporte$/ }).click();
    await page.getByRole("button", { name: /^Volver a Ventas$/ }).waitFor();
    await page.getByRole("button", { name: /^Volver a Ventas$/ }).click();
    await page.getByRole("button", { name: /^Soporte$/ }).waitFor();
  });
  await paso("Chat: «Mañana» pone recordatorio y se quita", async () => {
    await page.getByRole("button", { name: /^Mañana$/ }).click();
    const quitar = page.getByRole("button", { name: /quitar/i }).first();
    await quitar.waitFor();
    await quitar.click();
    await page.getByRole("button", { name: /^Mañana$/ }).waitFor();
  });
  await paso("Chat: Posponer… con atajo «En 3 días»", async () => {
    await page.getByRole("button", { name: /^Posponer/ }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByRole("button", { name: /En 3 días/ }).click();
    await dlg.getByRole("button", { name: /^Volver/ }).click();
    const quitar = page.getByRole("button", { name: /quitar/i }).first();
    await quitar.waitFor();
    await quitar.click();
  });
  await paso("Chat: respuestas rápidas con «/envio»", async () => {
    await caja().fill("/env");
    await esperar(500);
    await caja().press("Enter");
    await esperar(300);
    const v = await caja().inputValue();
    if (!/env[ií]o/i.test(v) || v.startsWith("/")) throw new Error("no insertó la rápida: " + v);
    await caja().fill("");
  });
  await paso("Chat: popover de rápidas y de emojis", async () => {
    await page.getByRole("button", { name: /^Respuestas rápidas$/ }).click();
    await page.getByPlaceholder(/Buscar rápida/).waitFor();
    await page.keyboard.press("Escape");
    await esperar(200);
    await page.getByRole("button", { name: /^Emoji$/ }).click();
    await esperar(300);
    await page.keyboard.press("Escape");
  });
  await paso("Chat: etiquetas", async () => {
    await page.getByRole("button", { name: /^Etiquetas/ }).first().click();
    const casilla = page.getByRole("checkbox").first();
    await casilla.waitFor();
    const antes = await casilla.isChecked();
    await casilla.click();
    await esperar(300);
    if ((await casilla.isChecked()) === antes) throw new Error("la casilla no cambió");
    await page.keyboard.press("Escape");
  });
  await paso("Chat: etapa", async () => {
    await page.getByRole("button", { name: /^(Etapa|Sin etapa|En charla|Nuevo|Esperando pago|Vendido|Postventa|Perdido)$/ }).first().click();
    await page.getByRole("button", { name: /^Esperando pago$/ }).first().click();
    await page.getByRole("button", { name: /^Esperando pago$/ }).first().waitFor();
  });
  await paso("Ficha: cerrar y volver a abrir muestra los pedidos", async () => {
    const btn = page.getByRole("button", { name: /^Ficha$/ });
    await btn.click();
    await esperar(300);
    if (await page.getByRole("button", { name: /^Guardar ficha$/ }).isVisible().catch(() => false)) {
      // estaba cerrada y se abrió: ok
    } else {
      await btn.click();
      await page.getByRole("button", { name: /^Guardar ficha$/ }).waitFor();
    }
    await page.getByText(/compras|Sin ficha todavía/).first().waitFor();
  });
  await paso("Ficha: editar y guardar un dato del cliente", async () => {
    const doc = page.getByPlaceholder(/DNI \/ CUIT/).first();
    await doc.fill("30111222");
    await page.getByRole("button", { name: /^Guardar ficha$/ }).click();
    await aviso(page, /guardad|ficha/i, 6000);
  });
  await cap("ficha");
  await paso("Chat: IA sugiere o avisa que no está configurada", async () => {
    await page.getByRole("button", { name: /Sugerir con IA/ }).click();
    await Promise.race([
      aviso(page, /IA|clave|configur|saturada|cuenta|red|conexión/i, 15000),
      page.waitForFunction(() => {
        const c = document.querySelector("textarea[aria-label='Mensaje']");
        return c && c.value.length > 10;
      }, null, { timeout: 15000 }),
    ]);
    await caja().fill("");
  });
  await paso("Bandeja: «Probar como cliente» → el bot contesta", async () => {
    await page.getByRole("button", { name: /^Probar como cliente$/ }).click();
    const dlg = page.getByRole("dialog");
    await dlg.waitFor();
    await dlg.getByRole("textbox").last().fill("Hola, ¿tienen stock del sérum de vitamina C?");
    await dlg.getByRole("button", { name: /Mandar como cliente/ }).click();
    await page.getByText(/Sérum Vitamina C|Tenemos|Gracias por escribir/i).first().waitFor({ timeout: 10000 });
  });
  await cap("bot-contesta");
  await paso("Bandeja: «Escribirle a un cliente» crea un chat nuevo", async () => {
    await page.getByRole("button", { name: /^Escribirle a un cliente$/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.waitFor();
    await dlg.getByPlaceholder(/5555-1234/).fill("11 4444-9876");
    const cajas = dlg.getByRole("textbox");
    if ((await cajas.count()) > 1) await cajas.last().fill("Hola, te escribo por tu consulta.");
    await dlg.getByRole("button", { name: /Crear chat/ }).click();
    await page.getByText(/4444-9876|4444 9876|4444/).first().waitFor({ timeout: 8000 });
  });
  await paso("Bandeja: Baja y Sacar de Baja", async () => {
    await page.getByRole("button", { name: /^Baja$/ }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: /Sí|Dar de baja|Confirmar|Baja/ }).last().click();
    await page.getByRole("button", { name: /^Sacar de Baja$/ }).waitFor();
    await page.getByRole("button", { name: /^Sacar de Baja$/ }).click();
    const conf = page.getByRole("dialog").getByRole("button", { name: /Sí|Confirmar|Sacar/ }).last();
    if (await conf.isVisible().catch(() => false)) await conf.click();
    await page.getByRole("button", { name: /^Baja$/ }).first().waitFor();
  });
  await paso("Bandeja: borrar la conversación de prueba", async () => {
    await page.getByRole("button", { name: /^Borrar conversación$/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: /Sí|Borrar/ }).last().click();
    await esperar(600);
  });
  await paso("Bandeja: selección múltiple (barra y «Listo»)", async () => {
    await page.getByRole("button", { name: /^Seleccionar varios$/ }).click();
    await page.getByText(/seleccionad/).first().waitFor();
    await page.getByRole("button", { name: /^Listo$/ }).click();
  });
  await limpiar(page);

  // ======================= EMBUDO =======================
  await ir("/embudo");
  await paso("Embudo: columnas por etapa y tarjetas", async () => {
    await page.getByText(/En charla/).first().waitFor({ timeout: 8000 });
    if ((await page.getByText(/Vendido|Esperando pago|Nuevo/).count()) < 2) throw new Error("faltan columnas");
  });
  await paso("Embudo: «Sin etapa · Verlos»", async () => {
    const verlos = page.getByRole("button", { name: /Verlos/ }).first();
    if (await verlos.isVisible().catch(() => false)) {
      await verlos.click();
      await page.getByText(/Sin etapa/).first().waitFor();
    }
  });
  await cap("embudo");

  // ======================= CLIENTES =======================
  await ir("/clientes");
  await paso("Clientes: tabla con filas y buscador", async () => {
    await page.getByRole("table").first().waitFor({ timeout: 8000 });
    const q = page.getByRole("textbox", { name: /Buscar clientes/ });
    await q.fill("sof");
    await esperar(400);
    await page.getByText(/Mostrando|Sofía/).first().waitFor();
    await q.fill("");
  });
  await paso("Clientes: nuevo cliente", async () => {
    await page.getByRole("button", { name: /^Nuevo cliente$/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.getByPlaceholder(/Nombre y apellido/).fill("Ramiro Prueba");
    await dlg.getByPlaceholder(/5555-1234/).fill("11 2222-3333");
    await dlg.getByRole("button", { name: /Guardar|Crear/ }).last().click();
    await page.getByText("Ramiro Prueba").first().waitFor();
    // se abre la ficha del cliente nuevo: se cierra para seguir con la tabla
    const cerrar = page.getByRole("button", { name: "Cerrar", exact: true }).first();
    if (await cerrar.isVisible().catch(() => false)) await cerrar.click();
    else await page.keyboard.press("Escape");
    await esperar(300);
  });
  await paso("Clientes: importar CSV con vista previa", async () => {
    const csv = csvTemporal(salida, "clientes.csv", "nombre,telefono,email,localidad\nAna Import,11 5000-1111,ana@import.com,Rosario\nLuis Import,11 5000-2222,luis@import.com,Córdoba\n");
    await page.getByRole("button", { name: /^Importar CSV$/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.waitFor();
    await dlg.locator("input[type=file]").setInputFiles(csv);
    await dlg.getByRole("button", { name: /^Importar \d+/ }).click();
    await aviso(page, /nuevos|importad/i, 8000);
    await page.getByText("Ana Import").first().waitFor();
  });
  await paso("Clientes: exportar CSV descarga", async () => {
    const d = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
    await page.getByRole("button", { name: /^Exportar CSV$/ }).first().click();
    if (!(await d)) throw new Error("no descargó");
  });
  await limpiar(page);

  // ======================= PEDIDOS =======================
  await ir("/pedidos");
  const numeroPedido = "T-" + Date.now().toString().slice(-5);
  await paso("Pedidos: nuevo pedido con un ítem del stock", async () => {
    await page.getByRole("button", { name: /^Nuevo pedido$/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.waitFor();
    await dlg.getByPlaceholder(/#1234/).fill(numeroPedido);
    await dlg.getByPlaceholder(/Sofía Pérez/).fill("Ramiro Prueba");
    await dlg.getByPlaceholder(/5555-1234/).fill("11 2222-3333");
    await dlg.getByPlaceholder(/Nombre del product/).first().fill("Sérum de prueba");
    await dlg.getByPlaceholder(/^Precio$/).first().fill("1500");
    await dlg.getByRole("button", { name: /Cargar pedido|Guardar/ }).click();
    await page.getByText(numeroPedido).first().waitFor();
    await limpiar(page); // se abre el detalle del pedido nuevo: se cierra para seguir con la tabla
  });
  await paso("Pedidos: cambiar el estado desde la fila", async () => {
    await page.getByRole("combobox", { name: /Cambiar el estado del pedido/ }).first().selectOption("enviado");
    await esperar(400);
    if (await page.getByRole("dialog").isVisible().catch(() => false)) throw new Error("cambiar el estado abrió el detalle del pedido");
  });
  await paso("Pedidos: filtro por estado y «Mostrando N de M»", async () => {
    await page.getByRole("button", { name: /^Entregado/ }).first().click();
    await page.getByText(/Mostrando/).first().waitFor();
    await page.getByRole("button", { name: /^Todos/ }).first().click();
  });
  await paso("Pedidos: importar CSV", async () => {
    const csv = csvTemporal(salida, "pedidos.csv", "numero;nombre;telefono;estado;total;productos\nIMP-1;Ana Import;11 5000-1111;pagado;12.500;2x Crema\nIMP-2;Luis Import;11 5000-2222;enviado;8.000;1x Sérum\n");
    await page.getByRole("button", { name: /^Importar CSV$/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.waitFor();
    await dlg.locator("input[type=file]").setInputFiles(csv);
    await dlg.getByRole("button", { name: /^Importar \d+/ }).click();
    await aviso(page, /nuevos|importad/i, 8000);
    await page.getByText("IMP-1").first().waitFor();
  });
  await paso("Pedidos: exportar CSV", async () => {
    const d = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
    await page.getByRole("button", { name: /^Exportar CSV$/ }).first().click();
    if (!(await d)) throw new Error("no descargó");
  });
  await limpiar(page);
  await cap("pedidos");

  // ======================= STOCK =======================
  await ir("/stock");
  await paso("Stock: nuevo producto", async () => {
    await page.getByRole("button", { name: /^Nuevo producto$/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.waitFor();
    await dlg.getByPlaceholder(/MAN-5KG/).fill("PRB-1");
    await dlg.getByPlaceholder(/Mancuerna hexagonal/).fill("Producto de prueba");
    const nums = dlg.getByPlaceholder(/^0$/);
    await nums.nth(0).fill("9900");
    await nums.nth(1).fill("5");
    await dlg.getByRole("button", { name: /Cargar producto|Guardar/ }).click();
    await page.getByText("Producto de prueba").first().waitFor();
  });
  await paso("Stock: sumar y restar con + y −", async () => {
    await page.getByRole("button", { name: /^Sumar 1 a Producto de prueba/ }).click();
    await esperar(300);
    await page.getByRole("button", { name: /^Restar 1 a Producto de prueba/ }).click();
    await esperar(300);
  });
  await paso("Stock: filtro «Sin stock»", async () => {
    await page.getByRole("button", { name: /^Sin stock/ }).click();
    await esperar(300);
    await page.getByRole("button", { name: /^Sin stock/ }).click();
  });
  await paso("Stock: importar CSV", async () => {
    const csv = csvTemporal(salida, "stock.csv", "sku,nombre,precio,stock,categoria\nIMP-A,Crema importada,5000,12,Cremas\nIMP-B,Gel importado,3000,0,Geles\n");
    await page.getByRole("button", { name: /^Importar CSV$/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.waitFor();
    await dlg.locator("input[type=file]").setInputFiles(csv);
    await dlg.getByRole("button", { name: /^Importar \d+/ }).click();
    await aviso(page, /nuevos|importad/i, 8000);
    await page.getByText("Crema importada").first().waitFor();
  });
  await limpiar(page);

  // ======================= RESPUESTAS AUTOMÁTICAS =======================
  await ir("/automaticas");
  const probarBot = async (textoPrueba, re) => {
    const c = page.getByRole("textbox", { name: /Mensaje de prueba/ });
    await c.fill(textoPrueba);
    await c.press("Enter");
    await page.getByText(re).last().waitFor({ timeout: 8000 });
  };
  await paso("Bot: «Probá el bot» responde stock", async () => probarBot("¿tienen stock de crema importada?", /Crema importada/i));
  await paso("Bot: «Probá el bot» responde «hablar con una persona»", async () => probarBot("quiero hablar con una persona", /persona del equipo/i));
  await paso("Bot: nueva regla y Guardar cambios", async () => {
    await page.getByRole("button", { name: /^Nueva regla$/ }).click();
    await page.getByPlaceholder(/^Envíos$/).last().fill("Horarios de prueba");
    await page.getByPlaceholder(/envío, envios/).last().fill("abren, cierran, atienden hasta");
    await page.getByPlaceholder(/Hacemos envíos/).last().fill("Atendemos de lunes a viernes de 9 a 18.");
    await page.getByRole("button", { name: /^Guardar cambios$/ }).click();
    await aviso(page, /guardad/i, 8000);
  });
  await paso("Bot: la regla nueva contesta en «Probá el bot»", async () => probarBot("hasta qué hora atienden?", /lunes a viernes de 9 a 18/));
  await cap("bot");

  // ======================= PLANTILLAS =======================
  await ir("/plantillas");
  await paso("Plantillas: lista con estados", async () => {
    await page.getByText(/aprobada/i).first().waitFor({ timeout: 8000 });
  });
  await paso("Plantillas: nueva plantilla local", async () => {
    await page.getByRole("button", { name: /^Nueva plantilla local$/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.getByPlaceholder(/pedido_enviado/).fill("prueba_local");
    await dlg.getByPlaceholder(/tu pedido \{\{2\}\}/).fill("Hola {{1}}, tu pedido {{2}} ya salió.");
    await dlg.getByPlaceholder(/^Sofía$/).fill("Ramiro");
    await dlg.getByPlaceholder(/^#1234$/).fill("#5001");
    await dlg.getByRole("button", { name: /^Guardar plantilla$/ }).click();
    await page.getByText("prueba_local").first().waitFor();
  });
  await paso("Rápidas: nueva respuesta rápida", async () => {
    await page.getByRole("tab", { name: /rápidas/i }).click();
    await page.getByRole("button", { name: /^Nueva/ }).first().click();
    const atajo = page.getByPlaceholder(/^\/envio$/).last();
    await atajo.fill("/prueba");
    await page.getByPlaceholder(/Hacemos envíos a todo el país/).last().fill("Texto de la rápida de prueba");
    await page.getByRole("button", { name: /^Guardar/ }).last().click();
    await page.getByText("/prueba").first().waitFor();
  });
  await limpiar(page);

  // ======================= CONEXIONES =======================
  await ir("/conexiones");
  await paso("Conexiones: conectar WhatsApp (webhook, token y formulario)", async () => {
    await page.getByRole("button", { name: /WhatsApp Business API/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.waitFor();
    const url = await dlg.locator("input[readonly]").first().inputValue();
    if (!/\/api\/webhooks\/meta\//.test(url)) throw new Error("la URL del webhook no aparece: " + url);
    await dlg.getByRole("button", { name: /^Copiar/ }).first().click();
    await dlg.getByPlaceholder(/1093x/).fill("1093000000001");
    await dlg.getByPlaceholder(/1057x/).fill("1057000000001");
    await dlg.getByPlaceholder(/EAAG/).fill("EAAG-token-de-prueba");
    await dlg.getByRole("button", { name: /^Conectar$/ }).click();
    await Promise.race([aviso(page, /conectad/i, 15000), page.getByText(/1093000000001/).first().waitFor({ timeout: 15000 })]);
  });
  await paso("Conexiones: probar un canal", async () => {
    await page.getByRole("button", { name: /^Probar$/ }).first().click();
    await aviso(page, /anda|ok|conectad|Prueba|funciona/i, 10000);
  });
  await paso("Conexiones: simulador de entrantes", async () => {
    await page.getByPlaceholder(/tienen stock de mancuernas/).fill("hola, quiero comprar");
    await page.getByRole("button", { name: /^Simular mensaje entrante$/ }).click();
    await page.getByText(/bienvenida|regla|Bot|persona|contest|Gracias por escribir/i).last().waitFor({ timeout: 10000 });
  });
  await cap("conexiones");
  await limpiar(page);

  // ======================= EQUIPO =======================
  await ir("/equipo");
  await paso("Equipo: invitar a alguien", async () => {
    await page.getByRole("button", { name: /^Invitar/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.getByPlaceholder(/^Lucía$/).fill("Agente Prueba");
    await dlg.getByPlaceholder(/lucia@tumarca/).fill("agente.prueba@clientany.com");
    await dlg.getByRole("button", { name: /Invitar|Enviar|Sumar/ }).last().click();
    await page.getByText(/Agente Prueba|agente.prueba@/).first().waitFor();
  });
  await paso("Equipo: chat interno manda un mensaje", async () => {
    const c = page.getByRole("textbox", { name: /Mensaje para el equipo/ });
    await c.fill("Mensaje interno de prueba");
    await c.press("Enter");
    await page.getByText("Mensaje interno de prueba").first().waitFor();
  });
  await limpiar(page);

  // ======================= PANEL =======================
  await ir("/panel");
  await paso("Panel: tarjetas de métricas y gráficos", async () => {
    await page.getByText(/Sin responder/).first().waitFor({ timeout: 10000 });
    await page.getByText(/Pedidos del mes/).first().waitFor();
    await page.getByText(/Conversaciones por canal/).first().waitFor();
  });
  await cap("panel");

  // ======================= AJUSTES =======================
  await ir("/ajustes");
  await paso("Ajustes: guardar el nombre de la empresa", async () => {
    const sec = page.locator("#empresa");
    await sec.getByPlaceholder(/Mi Tienda/).fill("Lunar Cosmética SRL");
    await sec.getByRole("button", { name: /^Guardar/ }).first().click();
    await aviso(page, /guardad/i, 8000);
  });
  await paso("Ajustes: agregar una etapa y guardar", async () => {
    const sec = page.locator("#etapas");
    await sec.getByRole("button", { name: /^Etapa$/ }).click();
    await sec.getByRole("textbox", { name: /Nombre de la etapa/ }).last().fill("Prueba");
    await sec.getByRole("button", { name: /^Guardar/ }).first().click();
    await aviso(page, /guardad/i, 8000);
  });
  await paso("Ajustes: crear una clave de API y ver el secreto", async () => {
    await page.locator("#api").getByRole("button", { name: /^Crear clave$/ }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByRole("textbox").first().fill("Integración de prueba");
    await dlg.getByRole("button", { name: /Crear/ }).last().click();
    await page.getByText(/ck_(live|demo)_/).first().waitFor({ timeout: 8000 });
  });
  await limpiar(page);
  await cap("ajustes");

  // ======================= LANDING Y DOCS =======================
  await ir("/");
  await paso("Landing: secciones y CTA de la demo", async () => {
    for (const id of ["funciones", "como-funciona", "precios", "preguntas", "contacto"]) {
      if ((await page.locator(`#${id}`).count()) < 1) throw new Error("falta #" + id);
    }
    const href = await page.getByRole("link", { name: /demo/i }).first().getAttribute("href");
    if (!href || !/inbox|demo/.test(href)) throw new Error("el CTA de demo no apunta a la bandeja: " + href);
  });
  await paso("Landing: formulario de contacto", async () => {
    const form = page.locator("#contacto");
    await form.getByRole("textbox", { name: /Nombre/i }).first().fill("Prueba");
    await form.getByRole("textbox", { name: /mail/i }).first().fill("prueba@clientany.com");
    await form.getByRole("button", { name: /contacten|Enviar|Quiero/i }).first().click();
    await page.getByText(/Listo|24 h/).first().waitFor({ timeout: 8000 });
  });
  await ir("/docs");
  await paso("Docs: anclas de API, WhatsApp y CSV", async () => {
    for (const id of ["api", "whatsapp", "csv"]) {
      if ((await page.locator(`#${id}`).count()) < 1) throw new Error("falta #" + id);
    }
  });

  // ======================= CELULAR =======================
  const ctxCel = await page.context().browser().newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "es-AR" });
  const cel = await ctxCel.newPage();
  cel.setDefaultTimeout(10000);
  const pasoCel = async (nombre, fn) => {
    try { await fn(); t(nombre, true); } catch (e) {
      nFalla++;
      const c = path.join(salida, `${modo}-falla-${nFalla}.png`);
      await cel.screenshot({ path: c }).catch(() => {});
      t(nombre, false, (e && e.message ? e.message : String(e)).split("\n")[0].slice(0, 200) + ` [${path.basename(c)}]`);
    }
  };
  try {
    await cel.goto(base + "/inbox", { waitUntil: "networkidle", timeout: 60000 });
    await esperar(600);
    await completarAlta(cel, esperar);
    await pasoCel("Celular: lista → chat → «⋯» → acción → volver, sin scroll horizontal", async () => {
      await cel.getByRole("button", { name: /Sofía|Mica|Juan|Valentina|Tomás|Flor|Lucas|Rocío|Lucía|Camila/ }).first().click();
      await cel.getByRole("textbox", { name: /^Mensaje$/ }).waitFor();
      await cel.getByRole("button", { name: /^Acciones del chat$/ }).click();
      await cel.getByRole("button", { name: /^(Marcar|Marcada) urgente$/ }).first().click();
      await esperar(500);
      await cel.getByRole("button", { name: /^Volver a la lista$/ }).click();
      await cel.getByRole("textbox", { name: /Buscar conversaciones/ }).waitFor();
      const ancho = await cel.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (ancho > 2) throw new Error("scroll horizontal de " + ancho + " px");
    });
    if (CAPTURAS) await cel.screenshot({ path: path.join(salida, `${modo}-flujo-celular.png`) });
    await cel.goto(base + "/pedidos", { waitUntil: "networkidle", timeout: 60000 });
    await pasoCel("Celular: barra de abajo con «Más» abre el menú", async () => {
      await cel.getByRole("button", { name: /^Abrir el menú completo$/ }).click();
      await cel.getByRole("link", { name: /Respuestas automáticas/ }).first().waitFor();
    });
  } finally {
    await ctxCel.close();
  }
}

module.exports = { correr };
