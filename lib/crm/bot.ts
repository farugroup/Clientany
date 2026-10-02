// ============================================================
// Clientany · CRM — el motor de respuestas automáticas (puro).
// Recibe la config del bot, el chat, el mensaje entrante y el contexto
// (productos, pedidos del cliente, horario) y devuelve QUÉ responder y
// QUÉ anotar. No manda nada: eso lo hace quien lo llama (el webhook en
// la nube, el simulador en el navegador).
// ============================================================
import type {
  Bot,
  BotResultado,
  BotEstado,
  Conversacion,
  Contacto,
  Empresa,
  Pedido,
  Producto,
  Regla,
} from "./types";
import {
  buscarPedidoPorNumero,
  buscarProductos,
  dinero,
  estaAbierto,
  estadoPedidoEnCriollo,
  horarioEnCriollo,
  normalizarTexto,
  partesEnZona,
  pedidosDeContacto,
  rellenar,
  uid,
} from "./core";

export const BOT_DEFAULT: Bot = {
  activo: true,
  bienvenida: {
    activa: true,
    texto: "¡Hola! 👋 Gracias por escribirle a {marca}. En un ratito te atiende una persona. Mientras tanto, contanos qué necesitás.",
  },
  ausencia: {
    activa: true,
    texto: "¡Gracias por tu mensaje! Ahora estamos fuera del horario de atención ({horario}). Te respondemos apenas abrimos 🌙",
  },
  menu: {
    activo: false,
    texto: "¿En qué te ayudamos? Respondé con el número:\n{opciones}",
    opciones: [
      { clave: "1", etiqueta: "Quiero comprar", accion: "humano" },
      { clave: "2", etiqueta: "Estado de mi pedido", accion: "estado_pedido" },
      { clave: "3", etiqueta: "Consultar stock y precios", accion: "stock" },
    ],
  },
  reglas: [],
  stock: {
    activa: true,
    con_stock: "¡Sí! Tenemos {producto} a {precio}. ¿Querés que te lo reservemos?",
    sin_stock: "Por ahora {producto} está sin stock. Si querés te avisamos cuando vuelva.",
  },
  pedidos: {
    activa: true,
    texto_estado: "{estado}",
    sin_pedido: "No encuentro un pedido con ese número. ¿Me lo pasás de nuevo o me decís con qué mail compraste?",
  },
  humano: {
    palabras: ["humano", "persona", "operador", "asesor", "hablar con alguien"],
    texto: "Dale, te paso con una persona del equipo. Te responde a la brevedad 🙌",
  },
  tope_por_dia: 6,
  pausa_si_persona_min: 15,
};

export interface ContextoBot {
  empresa: Pick<Empresa, "nombre" | "horario" | "moneda" | "firma">;
  bot: Bot;
  conv: Conversacion;
  contacto?: Contacto | null;
  texto: string; // el mensaje entrante (texto, o vacío si fue media)
  esPrimerMensaje: boolean; // la conversación recién se creó con este mensaje
  productos: Producto[];
  pedidos: Pedido[]; // todos los pedidos de la empresa (se filtran acá)
  ahora?: Date;
}

function diaDe(fecha: Date, zona: string): string {
  return partesEnZona(fecha, zona).ymd;
}

function estadoDelDia(conv: Conversacion, hoy: string): BotEstado {
  const e = conv.bot_estado;
  if (e && e.dia === hoy) return { ...e, reglas_hoy: [...(e.reglas_hoy || [])] };
  return { dia: hoy, respuestas_hoy: 0, reglas_hoy: [], ultima_bienvenida: e?.ultima_bienvenida, ultima_ausencia: e?.ultima_ausencia, paso: undefined };
}

function coincide(regla: Regla, texto: string): boolean {
  const t = normalizarTexto(texto);
  if (!t) return false;
  return regla.palabras.some((p) => {
    const k = normalizarTexto(p);
    if (!k) return false;
    if (regla.coincidencia === "exacta") return t === k;
    if (regla.coincidencia === "empieza") return t.startsWith(k);
    // "contiene": por palabra entera para no disparar "stock" con "stockholm"
    return (" " + t + " ").includes(" " + k + " ") || (k.includes(" ") && t.includes(k));
  });
}

function pideHumano(bot: Bot, texto: string): boolean {
  const t = normalizarTexto(texto);
  return bot.humano.palabras.some((p) => {
    const k = normalizarTexto(p);
    return k && (" " + t + " ").includes(" " + k + " ");
  });
}

function pidePedido(texto: string): boolean {
  const t = normalizarTexto(texto);
  return /\b(mi pedido|mi compra|mi envio|donde esta|cuando llega|seguimiento|estado del pedido|tracking|numero de pedido|pedido #?\d+)\b/.test(t);
}

function pideStock(texto: string): boolean {
  const t = normalizarTexto(texto);
  return /\b(stock|tienen|tenes|hay|precio|cuanto sale|cuanto esta|cuanto cuesta|disponible|disponibilidad|vale)\b/.test(t);
}

function horas(a: string | undefined | null, ahora: Date): number {
  if (!a) return Infinity;
  return (ahora.getTime() - new Date(a).getTime()) / 3_600_000;
}

// Qué contestar a un mensaje. Devuelve siempre la explicación, para que el
// simulador y el registro digan por qué pasó lo que pasó.
export function evaluarBot(ctx: ContextoBot): BotResultado {
  const ahora = ctx.ahora || new Date();
  const { bot, conv, empresa } = ctx;
  const zona = empresa.horario?.zona || "America/Argentina/Buenos_Aires";
  const hoy = diaDe(ahora, zona);
  const estado = estadoDelDia(conv, hoy);
  const vars = {
    marca: empresa.firma || empresa.nombre,
    nombre: (conv.nombre || "").split(" ")[0] || "",
    horario: horarioEnCriollo(empresa.horario),
  };
  const nada = (explicacion: string, cambios: Partial<Conversacion> = {}): BotResultado => ({
    respuestas: [],
    cambios: { ...cambios, bot_estado: estado },
    explicacion,
  });

  if (!bot?.activo) return nada("El bot está apagado.");
  if (conv.baja) return nada("El cliente pidió la baja: no se le mandan automáticos.");
  if (conv.canal === "manual") return nada("Es un chat manual: el bot no escribe ahí.");
  if (conv.tomado_por) return nada(`Lo tiene ${conv.tomado_por.nombre}: el bot no se mete.`);
  if (horas(conv.ultimo_saliente_humano_en, ahora) * 60 < (bot.pausa_si_persona_min ?? 15)) {
    return nada(`Una persona respondió hace menos de ${bot.pausa_si_persona_min} min: el bot calla.`);
  }
  if (estado.respuestas_hoy >= (bot.tope_por_dia ?? 6)) {
    return nada(`Ya se mandaron ${estado.respuestas_hoy} automáticos hoy en este chat (tope ${bot.tope_por_dia}).`);
  }

  const texto = ctx.texto || "";
  const respuestas: BotResultado["respuestas"] = [];
  const cambios: Partial<Conversacion> = {};
  const abierto = estaAbierto(empresa.horario, ahora);
  const explic: string[] = [];

  // 1) ¿Pide una persona? Gana a todo lo demás.
  if (texto && pideHumano(bot, texto)) {
    respuestas.push({ texto: rellenar(bot.humano.texto, vars), motivo: "humano" });
    cambios.necesita_humano = true;
    estado.paso = undefined;
    explic.push("Pidió hablar con una persona.");
    return cerrar();
  }

  // 2) Opción del menú (si se mandó el menú y responde con un número).
  if (bot.menu?.activo && estado.paso === "menu" && texto) {
    const t = normalizarTexto(texto);
    const op = bot.menu.opciones.find((o) => t === normalizarTexto(o.clave) || t === normalizarTexto(o.etiqueta));
    if (op) {
      estado.paso = undefined;
      explic.push(`Eligió la opción ${op.clave} del menú (${op.accion}).`);
      if (op.accion === "responder" && op.respuesta) {
        respuestas.push({ texto: rellenar(op.respuesta, vars), motivo: "menu" });
        return cerrar();
      }
      if (op.accion === "humano") {
        respuestas.push({ texto: rellenar(bot.humano.texto, vars), motivo: "menu" });
        cambios.necesita_humano = true;
        return cerrar();
      }
      if (op.accion === "estado_pedido") {
        respuestas.push({ texto: textoPedido(ctx, texto, vars, true), motivo: "pedido" });
        return cerrar();
      }
      if (op.accion === "stock") {
        respuestas.push({ texto: "Decime qué producto buscás y te digo si hay stock y el precio.", motivo: "menu" });
        return cerrar();
      }
    }
  }

  // 3) Reglas por palabra clave, en orden.
  const reglas = [...(bot.reglas || [])].filter((r) => r.activa).sort((a, b) => a.orden - b.orden);
  for (const r of reglas) {
    if (r.canales?.length && !r.canales.includes(conv.canal)) continue;
    if (r.solo_fuera_horario && abierto) continue;
    if (r.una_vez_por_dia && estado.reglas_hoy?.includes(r.id)) continue;
    if (texto && coincide(r, texto)) {
      respuestas.push({ texto: rellenar(r.respuesta, vars), motivo: `regla:${r.id}` });
      if (r.una_vez_por_dia) estado.reglas_hoy = [...(estado.reglas_hoy || []), r.id];
      explic.push(`Coincidió la regla «${r.nombre}».`);
      return cerrar();
    }
  }

  // 4) Estado del pedido.
  if (bot.pedidos?.activa && texto && (pidePedido(texto) || buscarPedidoPorNumero(ctx.pedidos, texto))) {
    respuestas.push({ texto: textoPedido(ctx, texto, vars, false), motivo: "pedido" });
    explic.push("Preguntó por su pedido.");
    return cerrar();
  }

  // 5) Stock y precio.
  if (bot.stock?.activa && texto && pideStock(texto)) {
    const encontrados = buscarProductos(ctx.productos, texto, 2);
    if (encontrados.length) {
      const partes = encontrados.map((p) =>
        p.stock > 0
          ? rellenar(bot.stock.con_stock, { ...vars, producto: p.nombre, precio: dinero(p.precio, p.moneda || empresa.moneda), stock: p.stock })
          : rellenar(bot.stock.sin_stock, { ...vars, producto: p.nombre, precio: dinero(p.precio, p.moneda || empresa.moneda), stock: 0 })
      );
      respuestas.push({ texto: partes.join("\n"), motivo: "stock" });
      explic.push(`Preguntó por stock y coincidió: ${encontrados.map((p) => p.nombre).join(", ")}.`);
      return cerrar();
    }
  }

  // 6) Bienvenida (primer mensaje, o pasaron 24 hs desde la última) y menú.
  const bienvenidaReciente = horas(estado.ultima_bienvenida, ahora) < 24;
  const primeraVez = ctx.esPrimerMensaje || !bienvenidaReciente;
  if (primeraVez && bot.bienvenida?.activa && abierto) {
    respuestas.push({ texto: rellenar(bot.bienvenida.texto, vars), motivo: "bienvenida" });
    estado.ultima_bienvenida = ahora.toISOString();
    explic.push(ctx.esPrimerMensaje ? "Primer mensaje: bienvenida." : "Pasaron más de 24 hs: bienvenida de nuevo.");
    if (bot.menu?.activo && bot.menu.opciones.length) {
      const opciones = bot.menu.opciones.map((o) => `${o.clave}. ${o.etiqueta}`).join("\n");
      respuestas.push({ texto: rellenar(bot.menu.texto, { ...vars, opciones }), motivo: "menu" });
      estado.paso = "menu";
      explic.push("Se mandó el menú.");
    }
    return cerrar();
  }

  // 7) Fuera de horario: una vez cada 12 hs.
  if (!abierto && bot.ausencia?.activa && horas(estado.ultima_ausencia, ahora) >= 12) {
    respuestas.push({ texto: rellenar(bot.ausencia.texto, vars), motivo: "ausencia" });
    estado.ultima_ausencia = ahora.toISOString();
    cambios.fuera_horario = true;
    explic.push("Escribió fuera de horario: aviso de ausencia (una vez cada 12 hs).");
    return cerrar();
  }

  if (!abierto) {
    cambios.fuera_horario = true;
    return nada("Fuera de horario, pero el aviso ya se mandó hace menos de 12 hs.", cambios);
  }
  return nada("Ninguna regla coincidió: lo atiende una persona.", cambios);

  function cerrar(): BotResultado {
    estado.respuestas_hoy += respuestas.length;
    return { respuestas, cambios: { ...cambios, bot_estado: estado }, explicacion: explic.join(" ") };
  }
}

function textoPedido(ctx: ContextoBot, texto: string, vars: Record<string, string>, desdeMenu: boolean): string {
  const bot = ctx.bot;
  const porNumero = buscarPedidoPorNumero(ctx.pedidos, texto);
  const delContacto = ctx.contacto ? pedidosDeContacto(ctx.pedidos, ctx.contacto) : [];
  const pedido = porNumero || delContacto[0];
  if (!pedido) {
    if (desdeMenu) return "Pasame el número de tu pedido (por ejemplo #1234) y te digo cómo viene.";
    return rellenar(bot.pedidos.sin_pedido, vars);
  }
  const criollo = estadoPedidoEnCriollo(pedido);
  return rellenar(bot.pedidos.texto_estado || "{estado}", {
    ...vars,
    estado: criollo,
    numero: pedido.numero,
    transporte: pedido.envio?.transporte || "",
    seguimiento: pedido.envio?.seguimiento || "",
  });
}

// Normaliza una config que vino del cliente/base: completa lo que falte.
export function completarBot(parcial: Partial<Bot> | null | undefined): Bot {
  const b = parcial || {};
  return {
    ...BOT_DEFAULT,
    ...b,
    bienvenida: { ...BOT_DEFAULT.bienvenida, ...(b.bienvenida || {}) },
    ausencia: { ...BOT_DEFAULT.ausencia, ...(b.ausencia || {}) },
    menu: { ...BOT_DEFAULT.menu, ...(b.menu || {}), opciones: b.menu?.opciones || BOT_DEFAULT.menu.opciones },
    stock: { ...BOT_DEFAULT.stock, ...(b.stock || {}) },
    pedidos: { ...BOT_DEFAULT.pedidos, ...(b.pedidos || {}) },
    humano: { ...BOT_DEFAULT.humano, ...(b.humano || {}) },
    reglas: (b.reglas || []).map((r, i) => ({
      id: r.id || uid("rg"),
      nombre: r.nombre || `Regla ${i + 1}`,
      activa: r.activa !== false,
      palabras: (r.palabras || []).map((p) => String(p).trim()).filter(Boolean),
      coincidencia: r.coincidencia || "contiene",
      respuesta: r.respuesta || "",
      canales: r.canales || [],
      solo_fuera_horario: !!r.solo_fuera_horario,
      una_vez_por_dia: !!r.una_vez_por_dia,
      orden: typeof r.orden === "number" ? r.orden : i,
    })),
  };
}
