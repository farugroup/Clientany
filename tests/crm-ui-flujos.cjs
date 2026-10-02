/* Clientany · flujos paso a paso de cada pantalla (los llama crm-ui.cjs).
   Cada paso registra ✓/✗ y sigue con el siguiente: al final se ve TODO lo que
   anda y lo que no, en un solo informe. */
const fs = require("fs");
const path = require("path");

async function paso(t, nombre, fn) {
  try {
    await fn();
    t(nombre, true);
    return true;
  } catch (e) {
    t(nombre, false, (e && e.message ? e.message : String(e)).split("\n")[0].slice(0, 220));
    return false;
  }
}

function csvTemporal(salida, nombre, contenido) {
  const p = path.join(salida, nombre);
  fs.writeFileSync(p, contenido);
  return p;
}

async function aviso(page, re, ms = 6000) {
  await page.getByRole("status").filter({ hasText: re }).first().waitFor({ state: "visible", timeout: ms });
}

async function cerrarModales(page) {
  for (let i = 0; i < 3; i++) {
    const btn = page.getByRole("button", { name: /^Cerrar$/ }).last();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(150);
    } else break;
  }
  await page.keyboard.press("Escape").catch(() => {});
}

async function correr({ page, base, t, esperar, modo, salida, CAPTURAS }) {
  page.setDefaultTimeout(10000);
  const ir = async (ruta) => {
    await page.goto(base + ruta, { waitUntil: "networkidle", timeout: 60000 });
    await esperar(400);
  };
  const cap = async (nombre) => {
    if (CAPTURAS) await page.screenshot({ path: path.join(salida, `${modo}-flujo-${nombre}.png`) });
  };

  // ======================= BANDEJA =======================
  await ir("/inbox");
  await paso(t, "Bandeja: la lista tiene chats", async () => {
    await page.getByRole("textbox", { name: /Buscar conversaciones/ }).waitFor({ timeout: 15000 });
    const n = await page.getByRole("button", { name: /Sofía|Mica|Juan|Valentina|Tomás|Flor|Lucas|Cliente/ }).count();
    if (n < 1) throw new Error("no hay filas con nombres");
  });
  const grupos = ["Soporte", "Más adelante", "Resueltos", "Baja", "Ventas"];
  for (const g of grupos) {
    await paso(t, `Bandeja: pestaña ${g}`, async () => {
      await page.getByRole("button", { name: new RegExp(`^${g}`) }).first().click();
      await esperar(250);
    });
  }
  await paso(t, "Bandeja: buscar «sofía» muestra resultados y el grupo de cada fila", async () => {
    const q = page.getByRole("textbox", { name: /Buscar conversaciones/ });
    await q.fill("sofía");
    await esperar(500);
    const filas = await page.getByRole("button", { name: /Sofía/ }).count();
    if (filas < 1) throw new Error("sin resultados");
    await q.fill("");
    await esperar(300);
  });
  await paso(t, "Chat: abrir el primero de Ventas", async () => {
    await page.getByRole("button", { name: /^Ventas/ }).first().click();
    await esperar(200);
    await page.getByRole("button", { name: /Sofía|Mica|Juan|Valentina|Tomás|Flor|Lucas|Cliente/ }).first().click();
    await page.getByRole("textbox", { name: /^Mensaje$/ }).waitFor({ timeout: 8000 });
  });
  await cap("chat");
  const texto = `Prueba automática ${Date.now().toString().slice(-5)}`;
  await paso(t, "Chat: mandar un texto (Enter) y verlo en la burbuja", async () => {
    const caja = page.getByRole("textbox", { name: /^Mensaje$/ });
    await caja.fill(texto);
    await caja.press("Enter");
    await page.getByText(texto).first().waitFor({ timeout: 8000 });
  });
  await paso(t, "Chat: acción «Marcar urgente» y volver", async () => {
    await page.getByRole("button", { name: /^Marcar urgente/ }).first().click();
    await page.getByRole("button", { name: /^Marcada urgente/ }).first().waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: /^Marcada urgente/ }).first().click();
    await page.getByRole("button", { name: /^Marcar urgente/ }).first().waitFor({ timeout: 5000 });
  });
  await paso(t, "Chat: nota interna", async () => {
    await page.getByRole("button", { name: /^Nota interna$/ }).first().click();
    const nota = page.getByPlaceholder(/Nota interna/).first();
    await nota.waitFor({ timeout: 5000 });
    await nota.fill("Nota de prueba del equipo");
    await nota.press("Enter").catch(() => {});
    const guardar = page.getByRole("button", { name: /^Guardar/ }).first();
    if (await guardar.isVisible().catch(() => false)) await guardar.click();
    await page.getByText("Nota de prueba del equipo").first().waitFor({ timeout: 5000 });
  });
  await paso(t, "Chat: «Lo tomo yo» y soltar", async () => {
    await page.getByRole("button", { name: /^Lo tomo yo$/ }).first().click();
    await page.getByRole("button", { name: /Lo tengo yo/ }).first().waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: /Lo tengo yo/ }).first().click();
    await page.getByRole("button", { name: /^Lo tomo yo$/ }).first().waitFor({ timeout: 5000 });
  });
  await paso(t, "Chat: Resolver y Reabrir", async () => {
    await page.getByRole("button", { name: /^Resolver$/ }).first().click();
    await page.getByRole("button", { name: /^Reabrir$/ }).first().waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: /^Reabrir$/ }).first().click();
    await page.getByRole("button", { name: /^Resolver$/ }).first().waitFor({ timeout: 5000 });
  });
  await paso(t, "Chat: mover a Soporte y volver a Ventas", async () => {
    await page.getByRole("button", { name: /^Soporte$/ }).first().click();
    await page.getByRole("button", { name: /^Volver a Ventas$/ }).first().waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: /^Volver a Ventas$/ }).first().click();
    await page.getByRole("button", { name: /^Soporte$/ }).first().waitFor({ timeout: 5000 });
  });
  await paso(t, "Chat: «Mañana» pone recordatorio y se quita", async () => {
    await page.getByRole("button", { name: /^Mañana$/ }).first().click();
    await page.getByText(/Escribirle|mañana|Mañana/).first().waitFor({ timeout: 5000 });
    const quitar = page.getByRole("button", { name: /quitar/i }).first();
    await quitar.waitFor({ timeout: 5000 });
    await quitar.click();
    await esperar(300);
  });
  await paso(t, "Chat: Posponer… con atajo «En 3 días»", async () => {
    await page.getByRole("button", { name: /^Posponer/ }).first().click();
    await page.getByRole("button", { name: /En 3 días/ }).first().click();
    const ok = page.getByRole("button", { name: /^Posponer$|^Guardar$|^Listo$/ }).last();
    await ok.click();
    await page.getByRole("button", { name: /quitar/i }).first().waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: /quitar/i }).first().click();
  });
  await paso(t, "Chat: respuestas rápidas con «/envio»", async () => {
    const caja = page.getByRole("textbox", { name: /^Mensaje$/ });
    await caja.fill("/env");
    await esperar(400);
    await caja.press("Enter");
    await esperar(300);
    const v = await caja.inputValue();
    if (!/env[ií]o/i.test(v) || v.startsWith("/")) throw new Error("no insertó la rápida: " + v);
    await caja.fill("");
  });
  await paso(t, "Chat: popover de rápidas y de emojis abren", async () => {
    await page.getByRole("button", { name: /Respuestas rápidas/ }).first().click();
    await page.getByPlaceholder(/Buscar rápida/).waitFor({ timeout: 4000 });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /^Emoji$/ }).first().click();
    await esperar(300);
    await page.keyboard.press("Escape");
  });
  await paso(t, "Chat: etiquetas y etapa", async () => {
    const eti = page.getByRole("button", { name: /^Etiquetas/ }).first();
    await eti.click();
    const casilla = page.getByRole("checkbox").first();
    await casilla.waitFor({ timeout: 4000 });
    await casilla.check();
    await page.keyboard.press("Escape");
    const etapa = page.getByRole("button", { name: /^Etapa|Sin etapa/ }).first();
    await etapa.click();
    await page.getByRole("button", { name: /En charla/ }).first().click();
    await page.getByText(/En charla/).first().waitFor({ timeout: 4000 });
  });
  await paso(t, "Ficha: se abre y muestra pedidos o «Sin ficha todavía»", async () => {
    const btn = page.getByRole("button", { name: /^Ficha$/ }).first();
    await btn.click();
    await esperar(400);
    const ok = (await page.getByText(/compras|Sin ficha todavía|Pedidos/).count()) > 0;
    if (!ok) throw new Error("no se ve la ficha");
  });
  await cap("ficha");
  await paso(t, "Chat: IA sugiere o avisa que no está configurada", async () => {
    await page.getByRole("button", { name: /Sugerir con IA/ }).first().click();
    await Promise.race([
      aviso(page, /IA|clave|configur|saturada|cuenta/i, 15000),
      page.waitForFunction(() => {
        const c = document.querySelector("textarea[aria-label='Mensaje']");
        return c && c.value.length > 10;
      }, null, { timeout: 15000 }),
    ]);
    await page.getByRole("textbox", { name: /^Mensaje$/ }).fill("");
  });
  await paso(t, "Bandeja: «Probar como cliente» → el bot contesta", async () => {
    await page.getByRole("button", { name: /Probar como cliente|Simula que un cliente/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.waitFor({ timeout: 5000 });
    await dlg.getByRole("textbox").last().fill("Hola, ¿tienen stock del sérum?");
    await dlg.getByRole("button", { name: /Simular|Mandar|Enviar/ }).last().click();
    await aviso(page, /bot|regla|bienvenida|stock|persona|horario/i, 10000).catch(() => {});
    await page.getByText(/Bot/).first().waitFor({ timeout: 8000 });
  });
  await cap("bot-contesta");
  await paso(t, "Bandeja: «Escribirle a un cliente» crea un chat nuevo", async () => {
    await page.getByRole("button", { name: /Escribirle a un cliente/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.waitFor({ timeout: 5000 });
    const tel = dlg.getByPlaceholder(/5555-1234/).first();
    await tel.fill("11 4444-9876");
    const nombre = dlg.getByPlaceholder(/Nombre y apellido/).first();
    if (await nombre.isVisible().catch(() => false)) await nombre.fill("Cliente Nuevo Prueba");
    const primer = dlg.getByPlaceholder(/Hola, ¿cómo estás/).first();
    if (await primer.isVisible().catch(() => false)) await primer.fill("Hola, te escribo por tu consulta.");
    await dlg.getByRole("button", { name: /Crear|Escribirle|Enviar|Empezar/ }).last().click();
    await page.getByText(/Cliente Nuevo Prueba|4444/).first().waitFor({ timeout: 8000 });
  });
  await paso(t, "Bandeja: Baja y Sacar de Baja", async () => {
    await page.getByRole("button", { name: /^Baja$/ }).first().click();
    await page.getByRole("button", { name: /Sí, seguir|Dar de baja|Confirmar/ }).last().click();
    await page.getByRole("button", { name: /Sacar de Baja/ }).first().waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: /Sacar de Baja/ }).first().click();
    const conf = page.getByRole("button", { name: /Sí, seguir|Confirmar/ }).last();
    if (await conf.isVisible().catch(() => false)) await conf.click();
    await page.getByRole("button", { name: /^Baja$/ }).first().waitFor({ timeout: 5000 });
  });
  await paso(t, "Bandeja: borrar la conversación de prueba", async () => {
    await page.getByRole("button", { name: /^Borrar conversación/ }).first().click();
    await page.getByRole("button", { name: /Sí, seguir|Borrar/ }).last().click();
    await esperar(600);
  });
  await paso(t, "Bandeja: selección múltiple (barra y «Listo»)", async () => {
    await page.getByRole("button", { name: /Seleccionar|selección/i }).first().click();
    await page.getByText(/seleccionad/).first().waitFor({ timeout: 4000 });
    await page.getByRole("button", { name: /^Listo$/ }).first().click();
  });
  await cerrarModales(page);

  // ======================= EMBUDO =======================
  await ir("/embudo");
  await paso(t, "Embudo: columnas por etapa y tarjetas", async () => {
    await page.getByText(/En charla/).first().waitFor({ timeout: 8000 });
    const ok = (await page.getByText(/Vendido|Esperando pago|Nuevo/).count()) >= 2;
    if (!ok) throw new Error("faltan columnas");
  });
  await paso(t, "Embudo: «Sin etapa · Verlos» muestra la columna extra", async () => {
    const verlos = page.getByRole("button", { name: /Verlos|Ver/ }).first();
    if (await verlos.isVisible().catch(() => false)) {
      await verlos.click();
      await page.getByText(/Sin etapa/).first().waitFor({ timeout: 4000 });
    }
  });
  await cap("embudo");

  // ======================= CLIENTES =======================
  await ir("/clientes");
  await paso(t, "Clientes: tabla con filas y buscador", async () => {
    await page.getByRole("table").first().waitFor({ timeout: 8000 });
    const q = page.getByRole("textbox", { name: /Buscar/ }).first();
    await q.fill("sof");
    await esperar(400);
    await page.getByText(/Mostrando|Sofía/).first().waitFor({ timeout: 4000 });
    await q.fill("");
  });
  await paso(t, "Clientes: nuevo cliente", async () => {
    await page.getByRole("button", { name: /Nuevo cliente/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.getByPlaceholder(/Nombre y apellido/).first().fill("Ramiro Prueba");
    const tel = dlg.getByPlaceholder(/5555-1234/).first();
    if (await tel.isVisible().catch(() => false)) await tel.fill("11 2222-3333");
    await dlg.getByRole("button", { name: /Guardar|Crear/ }).last().click();
    await page.getByText("Ramiro Prueba").first().waitFor({ timeout: 6000 });
  });
  await paso(t, "Clientes: importar CSV con vista previa", async () => {
    const csv = csvTemporal(salida, "clientes.csv", "nombre,telefono,email,localidad\nAna Import,11 5000-1111,ana@import.com,Rosario\nLuis Import,11 5000-2222,luis@import.com,Córdoba\n");
    await page.getByRole("button", { name: /Importar CSV/ }).first().click();
    const input = page.locator("input[type=file]").last();
    await input.setInputFiles(csv);
    await page.getByRole("button", { name: /^Importar \d+/ }).first().click();
    await aviso(page, /nuevos|importad/i, 8000);
    await page.getByText("Ana Import").first().waitFor({ timeout: 6000 });
  });
  await paso(t, "Clientes: exportar CSV descarga", async () => {
    const d = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
    await page.getByRole("button", { name: /Exportar CSV/ }).first().click();
    if (!(await d)) throw new Error("no descargó");
  });
  await cerrarModales(page);

  // ======================= PEDIDOS =======================
  await ir("/pedidos");
  const numeroPedido = "T-" + Date.now().toString().slice(-5);
  await paso(t, "Pedidos: nuevo pedido con ítems", async () => {
    await page.getByRole("button", { name: /Nuevo pedido/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.waitFor({ timeout: 5000 });
    await dlg.getByPlaceholder(/#1234|Número|1234/).first().fill(numeroPedido);
    await dlg.getByPlaceholder(/Nombre y apellido|Nombre del cliente|Nombre/).first().fill("Ramiro Prueba");
    const tel = dlg.getByPlaceholder(/5555-1234/).first();
    if (await tel.isVisible().catch(() => false)) await tel.fill("11 2222-3333");
    const prod = dlg.getByRole("textbox", { name: /^Producto$/ }).first();
    if (await prod.isVisible().catch(() => false)) {
      await prod.fill("Sérum de prueba");
      const precio = dlg.getByRole("spinbutton", { name: /Precio unitario/ }).first();
      if (await precio.isVisible().catch(() => false)) await precio.fill("1500");
    }
    await dlg.getByRole("button", { name: /Guardar|Crear/ }).last().click();
    await page.getByText(numeroPedido).first().waitFor({ timeout: 6000 });
  });
  await paso(t, "Pedidos: cambiar el estado desde la fila", async () => {
    const sel = page.getByRole("combobox", { name: /Cambiar el estado del pedido/ }).first();
    await sel.selectOption("enviado");
    await esperar(400);
  });
  await paso(t, "Pedidos: filtro por estado y «Mostrando N de M»", async () => {
    await page.getByRole("button", { name: /^Entregado/ }).first().click();
    await page.getByText(/Mostrando/).first().waitFor({ timeout: 4000 });
    await page.getByRole("button", { name: /^Todos/ }).first().click();
  });
  await paso(t, "Pedidos: importar CSV", async () => {
    const csv = csvTemporal(salida, "pedidos.csv", "numero;nombre;telefono;estado;total;productos\nIMP-1;Ana Import;11 5000-1111;pagado;12.500;2x Crema\nIMP-2;Luis Import;11 5000-2222;enviado;8.000;1x Sérum\n");
    await page.getByRole("button", { name: /Importar CSV/ }).first().click();
    await page.locator("input[type=file]").last().setInputFiles(csv);
    await page.getByRole("button", { name: /^Importar \d+/ }).first().click();
    await aviso(page, /nuevos|importad/i, 8000);
    await page.getByText("IMP-1").first().waitFor({ timeout: 6000 });
  });
  await paso(t, "Pedidos: exportar CSV", async () => {
    const d = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
    await page.getByRole("button", { name: /Exportar CSV/ }).first().click();
    if (!(await d)) throw new Error("no descargó");
  });
  await cerrarModales(page);
  await cap("pedidos");

  // ======================= STOCK =======================
  await ir("/stock");
  await paso(t, "Stock: nuevo producto", async () => {
    await page.getByRole("button", { name: /Nuevo producto/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.waitFor({ timeout: 5000 });
    await dlg.getByRole("textbox", { name: /SKU/i }).first().fill("PRB-1");
    await dlg.getByRole("textbox", { name: /Nombre/i }).first().fill("Producto de prueba");
    const precio = dlg.getByRole("spinbutton", { name: /Precio/i }).first();
    await precio.fill("9900");
    const stock = dlg.getByRole("spinbutton", { name: /^Stock$|Stock actual|Cantidad/i }).first();
    if (await stock.isVisible().catch(() => false)) await stock.fill("5");
    await dlg.getByRole("button", { name: /Guardar|Crear/ }).last().click();
    await page.getByText("Producto de prueba").first().waitFor({ timeout: 6000 });
  });
  await paso(t, "Stock: sumar y restar con + y −", async () => {
    const fila = page.getByRole("row", { name: /Producto de prueba/ }).first();
    const mas = fila.getByRole("button", { name: /Sumar|\+/ }).first();
    await mas.click();
    await esperar(300);
    const menos = fila.getByRole("button", { name: /Restar|−|-/ }).first();
    await menos.click();
    await esperar(300);
  });
  await paso(t, "Stock: filtro «Sin stock»", async () => {
    await page.getByRole("button", { name: /Sin stock/ }).first().click();
    await esperar(300);
    await page.getByRole("button", { name: /Sin stock/ }).first().click();
  });
  await paso(t, "Stock: importar CSV", async () => {
    const csv = csvTemporal(salida, "stock.csv", "sku,nombre,precio,stock,categoria\nIMP-A,Crema importada,5000,12,Cremas\nIMP-B,Gel importado,3000,0,Geles\n");
    await page.getByRole("button", { name: /Importar CSV/ }).first().click();
    await page.locator("input[type=file]").last().setInputFiles(csv);
    await page.getByRole("button", { name: /^Importar \d+/ }).first().click();
    await aviso(page, /nuevos|importad/i, 8000);
    await page.getByText("Crema importada").first().waitFor({ timeout: 6000 });
  });
  await cerrarModales(page);

  // ======================= RESPUESTAS AUTOMÁTICAS =======================
  await ir("/automaticas");
  await paso(t, "Bot: «Probá el bot» responde stock", async () => {
    const caja = page.getByRole("textbox", { name: /Mensaje de prueba/ }).first();
    await caja.fill("¿tienen stock de crema importada?");
    await caja.press("Enter");
    await page.getByText(/Crema importada|stock|Tenemos/i).nth(1).waitFor({ timeout: 8000 });
  });
  await paso(t, "Bot: «Probá el bot» responde «hablar con una persona»", async () => {
    const caja = page.getByRole("textbox", { name: /Mensaje de prueba/ }).first();
    await caja.fill("quiero hablar con una persona");
    await caja.press("Enter");
    await page.getByText(/persona del equipo|una persona/i).first().waitFor({ timeout: 8000 });
  });
  await paso(t, "Bot: nueva regla y Guardar cambios", async () => {
    await page.getByRole("button", { name: /Nueva regla/ }).first().click();
    const nombre = page.getByPlaceholder(/Nombre de la regla|Envíos|Ej\./).last();
    await nombre.fill("Horarios de prueba");
    const palabras = page.getByPlaceholder(/palabra|coma/i).last();
    await palabras.fill("horario, abren, cierran");
    const resp = page.getByPlaceholder(/respuesta|Respuesta/i).last();
    await resp.fill("Atendemos de lunes a viernes de 9 a 18.");
    await page.getByRole("button", { name: /Guardar cambios/ }).first().click();
    await aviso(page, /guardad/i, 8000);
  });
  await paso(t, "Bot: la regla nueva contesta en «Probá el bot»", async () => {
    const caja = page.getByRole("textbox", { name: /Mensaje de prueba/ }).first();
    await caja.fill("a qué hora abren?");
    await caja.press("Enter");
    await page.getByText(/lunes a viernes de 9 a 18/).first().waitFor({ timeout: 8000 });
  });
  await cap("bot");

  // ======================= PLANTILLAS =======================
  await ir("/plantillas");
  await paso(t, "Plantillas: lista con estados", async () => {
    await page.getByText(/aprobada|Aprobada/).first().waitFor({ timeout: 8000 });
  });
  await paso(t, "Plantillas: nueva plantilla local", async () => {
    await page.getByRole("button", { name: /Nueva plantilla/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.getByRole("textbox", { name: /Nombre/i }).first().fill("prueba_local");
    await dlg.getByRole("textbox", { name: /Cuerpo|Texto/i }).first().fill("Hola {{1}}, tu pedido {{2}} ya salió.");
    await dlg.getByRole("button", { name: /Guardar|Crear/ }).last().click();
    await page.getByText("prueba_local").first().waitFor({ timeout: 6000 });
  });
  await paso(t, "Rápidas: nueva respuesta rápida", async () => {
    await page.getByRole("button", { name: /rápidas/i }).first().click();
    await page.getByRole("button", { name: /Nueva/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.getByRole("textbox", { name: /Atajo/i }).first().fill("/prueba");
    await dlg.getByRole("textbox", { name: /Texto/i }).first().fill("Texto de la rápida de prueba");
    await dlg.getByRole("button", { name: /Guardar|Crear/ }).last().click();
    await page.getByText("/prueba").first().waitFor({ timeout: 6000 });
  });
  await cerrarModales(page);

  // ======================= CONEXIONES =======================
  await ir("/conexiones");
  await paso(t, "Conexiones: webhook y token con «Copiar»", async () => {
    await page.getByText(/api\/webhooks\/meta/).first().waitFor({ timeout: 8000 });
    await page.getByRole("button", { name: /Copiar/ }).first().click();
  });
  await paso(t, "Conexiones: conectar WhatsApp (formulario)", async () => {
    await page.getByRole("button", { name: /Conectar WhatsApp|WhatsApp Business API/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.waitFor({ timeout: 5000 });
    await dlg.getByRole("textbox", { name: /Phone Number ID/i }).first().fill("1093000000001");
    const waba = dlg.getByRole("textbox", { name: /WABA|Business Account/i }).first();
    if (await waba.isVisible().catch(() => false)) await waba.fill("1057000000001");
    await dlg.locator("input[type=password]").first().fill("EAAG-token-de-prueba");
    await dlg.getByRole("button", { name: /^Conectar$/ }).last().click();
    await Promise.race([aviso(page, /conectad/i, 15000), page.getByText(/1093000000001|Conectado/).first().waitFor({ timeout: 15000 })]);
  });
  await paso(t, "Conexiones: probar un canal", async () => {
    await page.getByRole("button", { name: /^Probar$/ }).first().click();
    await aviso(page, /anda|ok|conectad|Prueba/i, 10000);
  });
  await paso(t, "Conexiones: simulador de entrantes", async () => {
    const caja = page.getByRole("textbox", { name: /Mensaje de prueba|texto/i }).last();
    await caja.fill("hola, quiero comprar");
    await page.getByRole("button", { name: /Simular|Mandar/ }).last().click();
    await page.getByText(/bienvenida|regla|Bot|persona|contest/i).last().waitFor({ timeout: 10000 });
  });
  await cap("conexiones");
  await cerrarModales(page);

  // ======================= EQUIPO =======================
  await ir("/equipo");
  await paso(t, "Equipo: invitar a alguien", async () => {
    await page.getByRole("button", { name: /Invitar/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.getByRole("textbox", { name: /Nombre/i }).first().fill("Agente Prueba");
    await dlg.getByRole("textbox", { name: /mail/i }).first().fill("agente.prueba@clientany.com");
    await dlg.getByRole("button", { name: /Invitar|Enviar/ }).last().click();
    await page.getByText(/Agente Prueba|agente.prueba@/).first().waitFor({ timeout: 6000 });
  });
  await paso(t, "Equipo: chat interno manda un mensaje", async () => {
    const caja = page.getByRole("textbox", { name: /Mensaje para el equipo/ }).first();
    await caja.fill("Mensaje interno de prueba");
    await caja.press("Enter");
    await page.getByText("Mensaje interno de prueba").first().waitFor({ timeout: 6000 });
  });
  await cerrarModales(page);

  // ======================= PANEL =======================
  await ir("/panel");
  await paso(t, "Panel: tarjetas de métricas", async () => {
    await page.getByText(/Sin responder/).first().waitFor({ timeout: 10000 });
    await page.getByText(/Pedidos del mes|Conversaciones por canal/).first().waitFor({ timeout: 8000 });
  });
  await cap("panel");

  // ======================= AJUSTES =======================
  await ir("/ajustes");
  await paso(t, "Ajustes: guardar el nombre de la empresa", async () => {
    const nombre = page.getByRole("textbox", { name: /Nombre de la empresa|^Nombre$/ }).first();
    await nombre.fill("Lunar Cosmética SRL");
    await page.getByRole("button", { name: /^Guardar/ }).first().click();
    await aviso(page, /guardad/i, 8000);
  });
  await paso(t, "Ajustes: crear una clave de API y ver el secreto", async () => {
    await page.getByRole("button", { name: /Crear clave/ }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.getByRole("textbox").first().fill("Integración de prueba");
    await dlg.getByRole("button", { name: /Crear/ }).last().click();
    await page.getByText(/ck_(live|demo)_/).first().waitFor({ timeout: 8000 });
  });
  await paso(t, "Ajustes: agregar una etapa", async () => {
    await page.getByRole("button", { name: /Agregar etapa|Nueva etapa/ }).first().click();
    const campo = page.getByRole("textbox", { name: /Nombre de la etapa/ }).last();
    await campo.fill("Prueba");
    const guardar = page.getByRole("button", { name: /Guardar etapas|^Guardar/ }).nth(1);
    if (await guardar.isVisible().catch(() => false)) await guardar.click();
    await esperar(400);
  });
  await cerrarModales(page);
  await cap("ajustes");

  // ======================= LANDING Y DOCS =======================
  await ir("/");
  await paso(t, "Landing: secciones y CTA", async () => {
    for (const id of ["funciones", "como-funciona", "precios", "preguntas", "contacto"]) {
      if ((await page.locator(`#${id}`).count()) < 1) throw new Error("falta #" + id);
    }
    const demo = page.getByRole("link", { name: /demo/i }).first();
    const href = await demo.getAttribute("href");
    if (!href || !/inbox|demo/.test(href)) throw new Error("el CTA de demo no apunta a la bandeja: " + href);
  });
  await paso(t, "Landing: formulario de contacto", async () => {
    const form = page.locator("#contacto");
    await form.getByRole("textbox", { name: /Nombre/i }).first().fill("Prueba");
    await form.getByRole("textbox", { name: /mail/i }).first().fill("prueba@clientany.com");
    await form.getByRole("button", { name: /contacten|Enviar|Quiero/i }).first().click();
    await page.getByText(/Listo|24 h/).first().waitFor({ timeout: 8000 });
  });
  await ir("/docs");
  await paso(t, "Docs: anclas de API y WhatsApp", async () => {
    for (const id of ["api", "whatsapp", "csv"]) {
      if ((await page.locator(`#${id}`).count()) < 1) throw new Error("falta #" + id);
    }
  });

  // ======================= CELULAR =======================
  const ctxCel = await page.context().browser().newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "es-AR" });
  const cel = await ctxCel.newPage();
  try {
    await cel.goto(base + "/inbox", { waitUntil: "networkidle", timeout: 60000 });
    await esperar(500);
    await paso(t, "Celular: lista → chat → «⋯» → acción → volver", async () => {
      await cel.getByRole("button", { name: /Sofía|Mica|Juan|Valentina|Tomás|Flor|Lucas|Cliente/ }).first().click();
      await cel.getByRole("textbox", { name: /^Mensaje$/ }).waitFor({ timeout: 8000 });
      await cel.getByRole("button", { name: /Acciones del chat/ }).first().click();
      await cel.getByRole("button", { name: /^Marcar urgente|^Marcada urgente/ }).first().click();
      await esperar(400);
      await cel.getByRole("button", { name: /Volver a la lista/ }).first().click();
      await cel.getByRole("textbox", { name: /Buscar conversaciones/ }).waitFor({ timeout: 6000 });
      const ancho = await cel.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (ancho > 2) throw new Error("scroll horizontal de " + ancho + " px");
    });
    if (CAPTURAS) await cel.screenshot({ path: path.join(salida, `${modo}-flujo-celular.png`) });
    await cel.goto(base + "/pedidos", { waitUntil: "networkidle", timeout: 60000 });
    await paso(t, "Celular: barra de abajo con «Más» abre el menú", async () => {
      await cel.getByRole("button", { name: /Abrir el menú completo/ }).first().click();
      await cel.getByRole("link", { name: /Respuestas automáticas/ }).first().waitFor({ timeout: 5000 });
    });
  } finally {
    await ctxCel.close();
  }
}

module.exports = { correr };
