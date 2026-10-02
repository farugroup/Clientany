// ============================================================
// Clientany · CRM — datos de prueba («Lunar Cosmética»).
//
// Un ecommerce argentino de skincare verosímil: canales, clientes, chats con
// todos los estados de la bandeja, pedidos de los últimos 60 días, stock,
// rápidas, plantillas y el chat del equipo.
//
// Módulo PURO (sin React, sin zustand, sin "use client"): lo usan el modo demo
// en el navegador (repo-local.ts) y el servidor (`POST /api/crm/demo`).
//
// Reglas:
//  - TODAS las fechas son relativas a `ahora` (hace N minutos/horas/días), así
//    la demo siempre se ve «viva».
//  - TODOS los ids son deterministas y empiezan con `demo_`: cargar dos veces
//    pisa lo mismo en vez de duplicar.
// ============================================================
import type {
  Canal,
  Contacto,
  Conversacion,
  De,
  Etapa,
  Etiqueta,
  Mensaje,
  MensajeEquipo,
  MensajeEstado,
  MensajeTipo,
  Pedido,
  PedidoEnvio,
  PedidoEstado,
  Plantilla,
  Producto,
  Rapida,
} from "./types";
import { HORARIO_DEFAULT, dinero, estadoPedidoEnCriollo, horarioEnCriollo, previewMensaje } from "./core";

export interface DatosDePrueba {
  canales: Canal[];
  contactos: Contacto[];
  conversaciones: Conversacion[];
  mensajes: Record<string, Mensaje[]>;
  pedidos: Pedido[];
  productos: Producto[];
  rapidas: Rapida[];
  plantillas: Plantilla[];
  equipo: MensajeEquipo[];
  etapas: Etapa[];
  etiquetas: Etiqueta[];
}

// La compañera de ejemplo que atiende chats en la demo. El repo local la crea
// como segundo miembro con este mismo id, así «tomado por» y «asignado a»
// apuntan a alguien que existe.
export const MIEMBRO_DEMO = {
  id: "demo_mb_martina",
  nombre: "Martina López",
  email: "martina@lunarcosmetica.com.ar",
} as const;

// Quién es «yo» en los mensajes de agente y en el chat del equipo. En el
// navegador es el miembro local ("Vos"); el servidor puede pasar el suyo.
export const YO_DEMO = { id: "local_yo", nombre: "Vos" } as const;

export const ETAPAS_DEMO: Etapa[] = [
  { id: "demo_et_nuevo", nombre: "Nuevo", color: "#9aa3c0", orden: 0 },
  { id: "demo_et_charla", nombre: "En charla", color: "#598bff", orden: 1 },
  { id: "demo_et_pago", nombre: "Esperando pago", color: "#f59e0b", orden: 2 },
  { id: "demo_et_vendido", nombre: "Vendido", color: "#16a34a", orden: 3 },
  { id: "demo_et_postventa", nombre: "Postventa", color: "#8b5cf6", orden: 4 },
  { id: "demo_et_perdido", nombre: "Perdido", color: "#ef4444", orden: 5 },
];

export const ETIQUETAS_DEMO: Etiqueta[] = [
  { id: "demo_tag_mayorista", nombre: "Mayorista", color: "#8b5cf6" },
  { id: "demo_tag_vip", nombre: "VIP", color: "#f59e0b" },
  { id: "demo_tag_problema", nombre: "Problema", color: "#ef4444" },
  { id: "demo_tag_urgente", nombre: "Urgente", color: "#ef4444" },
];

// Ids fijos que se cruzan entre entidades.
const CANAL_WA = "demo_canal_wa";
const CANAL_IG = "demo_canal_ig";
const CANAL_FB = "demo_canal_fb";

const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

// Reemplaza {{1}}, {{2}}… de una plantilla por los parámetros.
function llenarPlantilla(cuerpo: string, parametros: string[]): string {
  return cuerpo.replace(/\{\{(\d+)\}\}/g, (m, n: string) => parametros[Number(n) - 1] ?? m);
}

interface SemillaMensaje {
  min: number; // hace cuántos minutos (admite decimales para ordenar dentro del mismo minuto)
  de: De;
  texto: string;
  autor?: string;
  tipo?: MensajeTipo;
  estado?: MensajeEstado;
  error?: string;
  media_url?: string;
  media_nombre?: string;
  media_mime?: string;
  plantilla?: string;
}

interface SemillaConv {
  id: string;
  canal_id: string;
  contacto_id: string;
  // Hasta qué entrante lo atendió una persona: "ultimo" = todo atendido;
  // un número = el entrante de hace N minutos; sin dato = nadie lo atendió.
  visto?: "ultimo" | number;
  extra?: Partial<Conversacion>;
  mensajes: SemillaMensaje[];
}

export function datosDePrueba(
  empresa_id: string,
  ahora: Date = new Date(),
  opciones: { yo?: { id: string; nombre: string } } = {}
): DatosDePrueba {
  const t0 = ahora.getTime();
  const hace = (minutos: number) => new Date(t0 - Math.round(minutos * MIN)).toISOString();
  const haceHs = (horas: number) => new Date(t0 - Math.round(horas * HORA)).toISOString();
  const haceDias = (dias: number, horas = 0) => new Date(t0 - dias * DIA - Math.round(horas * HORA)).toISOString();
  const dentroDe = (dias: number) => new Date(t0 + dias * DIA).toISOString();
  const yo = opciones.yo || YO_DEMO;
  const martina = MIEMBRO_DEMO.nombre;
  const moneda = "ARS";

  // ---------- canales ----------
  const canales: Canal[] = [
    {
      id: CANAL_WA,
      empresa_id,
      tipo: "whatsapp",
      nombre: "+54 9 11 5555-0101",
      estado: "conectado",
      externo_id: "demo_phone_1",
      waba_id: "demo_waba_1",
      token_cargado: true,
      app_secret_cargado: true,
      conectado_en: haceDias(62),
      detalle: { numero_visible: "+54 9 11 5555-0101", nombre_verificado: "Lunar Cosmética", calidad: "GREEN" },
      api_version: "v21.0",
    },
    {
      id: CANAL_IG,
      empresa_id,
      tipo: "instagram",
      nombre: "@lunar.cosmetica",
      estado: "conectado",
      externo_id: "demo_ig_1",
      page_id: "demo_page_1",
      token_cargado: true,
      app_secret_cargado: true,
      conectado_en: haceDias(60),
      detalle: { usuario_ig: "lunar.cosmetica", nombre_pagina: "Lunar Cosmética" },
      api_version: "v21.0",
    },
    {
      id: CANAL_FB,
      empresa_id,
      tipo: "messenger",
      nombre: "Lunar Cosmética",
      estado: "conectado",
      externo_id: "demo_page_1",
      page_id: "demo_page_1",
      token_cargado: true,
      app_secret_cargado: true,
      conectado_en: haceDias(60),
      detalle: { nombre_pagina: "Lunar Cosmética" },
      api_version: "v21.0",
    },
  ];

  // ---------- productos ----------
  const semillasProductos: [string, string, number, number, number, string, string?][] = [
    // sku, nombre, precio, stock, mínimo, categoría, descripción
    ["LUN-SVC30", "Sérum Vitamina C 30 ml", 18900, 42, 10, "Skincare", "Vitamina C al 15% con ácido ferúlico. Ilumina y empareja el tono."],
    ["LUN-CRN50", "Crema hidratante de noche 50 g", 22900, 17, 8, "Skincare", "Con ceramidas y niacinamida. Para todo tipo de piel."],
    ["LUN-FPS50", "Protector solar FPS 50 · 120 ml", 15400, 0, 10, "Protección solar", "Textura liviana, no deja la cara blanca."],
    ["LUN-HIA30", "Sérum ácido hialurónico 30 ml", 16500, 3, 8, "Skincare", "Hidratación profunda. Se combina con la vitamina C."],
    ["LUN-MIC250", "Agua micelar 250 ml", 9800, 60, 15, "Limpieza"],
    ["LUN-GEL150", "Gel limpiador facial 150 ml", 11200, 25, 10, "Limpieza"],
    ["LUN-OJO15", "Contorno de ojos 15 ml", 14300, 9, 5, "Skincare"],
    ["LUN-LAB", "Bálsamo labial de karité", 4900, 120, 20, "Labios"],
    ["LUN-KIT3", "Kit rutina completa (sérum + crema + gel)", 45900, 6, 3, "Kits", "Sérum Vitamina C, crema de noche y gel limpiador en caja de regalo."],
    ["LUN-BATA-SM", "Bata de satén talle S/M", 27500, 4, 2, "Accesorios"],
    ["LUN-BATA-LXL", "Bata de satén talle L/XL", 27500, 0, 2, "Accesorios"],
    ["LUN-VIN", "Vincha de toalla para skincare", 6900, 35, 10, "Accesorios"],
  ];
  const productos: Producto[] = semillasProductos.map(([sku, nombre, precio, stock, minimo, categoria, descripcion], i) => ({
    id: `demo_pr_${String(i + 1).padStart(2, "0")}`,
    empresa_id,
    sku,
    nombre,
    precio,
    moneda,
    stock,
    stock_minimo: minimo,
    categoria,
    descripcion,
    imagen_url: `https://picsum.photos/seed/${sku.toLowerCase()}/300/300`,
    activo: true,
    actualizado: haceDias(2 + (i % 9), i),
  }));
  const prod = (sku: string): Producto => {
    const p = productos.find((x) => x.sku === sku);
    if (!p) throw new Error(`datosDePrueba: falta el producto ${sku}`);
    return p;
  };

  // ---------- contactos ----------
  const semillasContactos: {
    nombre: string;
    tel: string;
    email: string;
    localidad: string;
    provincia: string;
    cp: string;
    dias: number;
    origen: Contacto["origen"];
    extra?: Partial<Contacto>;
  }[] = [
    { nombre: "Sofía Giménez", tel: "5491160218890", email: "sofi.gimenez@gmail.com", localidad: "Palermo", provincia: "CABA", cp: "1425", dias: 55, origen: "whatsapp", extra: { etiquetas: ["demo_tag_vip"], notas: "Clienta de siempre. Prefiere envío por moto." } },
    { nombre: "Valentina Sosa", tel: "5491144772231", email: "valen.sosa@gmail.com", localidad: "Caballito", provincia: "CABA", cp: "1405", dias: 20, origen: "whatsapp" },
    { nombre: "Micaela Rodríguez", tel: "5493516021144", email: "mica.rodriguez@hotmail.com", localidad: "Córdoba", provincia: "Córdoba", cp: "5000", dias: 1, origen: "instagram", extra: { ig_usuario: "micarod", ig_id: "demo_igsid_micarod" } },
    { nombre: "Tomás Álvarez", tel: "5493414558833", email: "tomi.alvarez@gmail.com", localidad: "Rosario", provincia: "Santa Fe", cp: "2000", dias: 12, origen: "messenger", extra: { psid: "demo_psid_tomas" } },
    { nombre: "Florencia Benítez", tel: "5493515551020", email: "flor.benitez@yahoo.com.ar", localidad: "Villa Carlos Paz", provincia: "Córdoba", cp: "5152", dias: 24, origen: "whatsapp", extra: { etiquetas: ["demo_tag_problema"] } },
    { nombre: "Lucía Fernández", tel: "5492214567890", email: "compras@bellezalaplata.com.ar", localidad: "La Plata", provincia: "Buenos Aires", cp: "1900", dias: 40, origen: "whatsapp", extra: { etiquetas: ["demo_tag_mayorista"], documento: "30-71234567-8", direccion: "Calle 8 1234", notas: "Local «Belleza LP». Compra por mayor todos los meses. Factura A." } },
    { nombre: "Carla Domínguez", tel: "5491122115566", email: "carla.dominguez@gmail.com", localidad: "Quilmes", provincia: "Buenos Aires", cp: "1878", dias: 30, origen: "whatsapp" },
    { nombre: "Martín Acosta", tel: "5491133445566", email: "martin.acosta@outlook.com", localidad: "Vicente López", provincia: "Buenos Aires", cp: "1638", dias: 35, origen: "whatsapp" },
    { nombre: "Julieta Romero", tel: "5492615554433", email: "juli.romero@gmail.com", localidad: "Mendoza", provincia: "Mendoza", cp: "5500", dias: 46, origen: "instagram", extra: { ig_usuario: "juliromero", ig_id: "demo_igsid_juli" } },
    { nombre: "Agustina Paz", tel: "5491155667788", email: "agus.paz@gmail.com", localidad: "Belgrano", provincia: "CABA", cp: "1428", dias: 50, origen: "csv" },
    { nombre: "Rocío Molina", tel: "5493415557788", email: "rocio.molina@gmail.com", localidad: "Funes", provincia: "Santa Fe", cp: "2132", dias: 17, origen: "whatsapp" },
    { nombre: "Camila Herrera", tel: "5491166778899", email: "cami.herrera@gmail.com", localidad: "Lanús", provincia: "Buenos Aires", cp: "1824", dias: 1, origen: "whatsapp" },
  ];
  const contactos: Contacto[] = semillasContactos.map((c, i) => ({
    id: `demo_ct_${String(i + 1).padStart(2, "0")}`,
    empresa_id,
    nombre: c.nombre,
    telefono: c.tel,
    email: c.email,
    localidad: c.localidad,
    provincia: c.provincia,
    cp: c.cp,
    etiquetas: [],
    origen: c.origen,
    creado: haceDias(c.dias, 3),
    actualizado: haceDias(Math.min(c.dias, 2)),
    ...(c.extra || {}),
  }));
  const ct = (n: number): Contacto => contactos[n - 1];

  // ---------- pedidos ----------
  const ENVIO_ANDREANI = (seguimiento: string, c: Contacto): PedidoEnvio => ({
    transporte: "Andreani",
    seguimiento,
    url: `https://www.andreani.com/#!/informacionEnvio/${seguimiento}`,
    localidad: c.localidad,
    provincia: c.provincia,
    cp: c.cp,
  });
  const ENVIO_CORREO = (seguimiento: string, c: Contacto): PedidoEnvio => ({
    transporte: "Correo Argentino",
    seguimiento,
    url: "https://www.correoargentino.com.ar/formularios/e-commerce",
    localidad: c.localidad,
    provincia: c.provincia,
    cp: c.cp,
  });
  const ENVIO_MOTO = (c: Contacto): PedidoEnvio => ({
    transporte: "Moto (AMBA)",
    localidad: c.localidad,
    provincia: c.provincia,
    cp: c.cp,
  });
  const semillasPedidos: {
    numero: string;
    contacto: number;
    estado: PedidoEstado;
    dias: number;
    horas?: number;
    items: [string, number, number?][]; // sku, cantidad, precio unitario (si no, el de lista)
    envio: (c: Contacto) => PedidoEnvio;
    canal: string;
    notas?: string;
  }[] = [
    { numero: "LUN-10401", contacto: 1, estado: "entregado", dias: 52, items: [["LUN-KIT3", 1], ["LUN-LAB", 1]], envio: ENVIO_MOTO, canal: "tienda" },
    { numero: "LUN-10405", contacto: 9, estado: "entregado", dias: 44, items: [["LUN-SVC30", 1], ["LUN-MIC250", 1]], envio: (c) => ENVIO_ANDREANI("360002401187764", c), canal: "ml" },
    { numero: "LUN-10409", contacto: 6, estado: "entregado", dias: 38, items: [["LUN-SVC30", 12, 13200], ["LUN-LAB", 12, 3400]], envio: (c) => ENVIO_ANDREANI("360002409935512", c), canal: "whatsapp", notas: "Mayorista: 30% off. Factura A." },
    { numero: "LUN-10412", contacto: 8, estado: "devuelto", dias: 33, items: [["LUN-BATA-SM", 1]], envio: (c) => ENVIO_CORREO("CP412269873AR", c), canal: "tienda", notas: "La devolvió: quería otro color." },
    { numero: "LUN-10414", contacto: 7, estado: "cancelado", dias: 27, items: [["LUN-CRN50", 1]], envio: (c) => ENVIO_ANDREANI("360002412200871", c), canal: "tienda", notas: "Se canceló: el pago no se acreditó." },
    { numero: "LUN-10418", contacto: 5, estado: "entregado", dias: 21, items: [["LUN-CRN50", 1], ["LUN-OJO15", 1]], envio: (c) => ENVIO_ANDREANI("360002418874410", c), canal: "tienda" },
    { numero: "LUN-10421", contacto: 11, estado: "entregado", dias: 15, items: [["LUN-GEL150", 1], ["LUN-MIC250", 1]], envio: (c) => ENVIO_CORREO("CP421150036AR", c), canal: "tienda" },
    { numero: "LUN-10424", contacto: 1, estado: "entregado", dias: 11, items: [["LUN-SVC30", 2]], envio: ENVIO_MOTO, canal: "whatsapp" },
    { numero: "LUN-10426", contacto: 4, estado: "entregado", dias: 9, items: [["LUN-VIN", 1], ["LUN-LAB", 1]], envio: (c) => ENVIO_CORREO("CP426601944AR", c), canal: "tienda" },
    { numero: "LUN-10428", contacto: 2, estado: "enviado", dias: 3, items: [["LUN-SVC30", 1], ["LUN-CRN50", 1]], envio: (c) => ENVIO_ANDREANI("360002456619087", c), canal: "tienda" },
    { numero: "LUN-10429", contacto: 5, estado: "entregado", dias: 4, horas: 6, items: [["LUN-CRN50", 1], ["LUN-HIA30", 1]], envio: (c) => ENVIO_ANDREANI("360002457730125", c), canal: "tienda", notas: "La crema llegó con el pote roto: se le manda una nueva sin cargo." },
    { numero: "LUN-10430", contacto: 8, estado: "entregado", dias: 3, horas: 2, items: [["LUN-KIT3", 1]], envio: (c) => ENVIO_ANDREANI("360002461120558", c), canal: "tienda" },
    { numero: "LUN-10431", contacto: 12, estado: "pagado", dias: 0, horas: 5, items: [["LUN-OJO15", 1], ["LUN-VIN", 1]], envio: ENVIO_MOTO, canal: "tienda" },
    { numero: "LUN-10432", contacto: 7, estado: "pendiente", dias: 1, horas: 3, items: [["LUN-SVC30", 2], ["LUN-GEL150", 1]], envio: (c) => ENVIO_ANDREANI("", c), canal: "whatsapp", notas: "Paga cuando cobra: reservado." },
    { numero: "LUN-10433", contacto: 6, estado: "preparacion", dias: 0, horas: 2, items: [["LUN-LAB", 24, 3400], ["LUN-KIT3", 6, 32100]], envio: (c) => ENVIO_ANDREANI("", c), canal: "whatsapp", notas: "Mayorista: 30% off. Factura A a nombre de Belleza LP." },
  ];
  const pedidos: Pedido[] = semillasPedidos.map((s, i) => {
    const c = ct(s.contacto);
    const items = s.items.map(([sku, cantidad, precio]) => {
      const p = prod(sku);
      return { sku, nombre: p.nombre, cantidad, precio: precio ?? p.precio };
    });
    const envio = s.envio(c);
    if (!envio.seguimiento) {
      delete envio.seguimiento;
      delete envio.url;
    }
    const creado = haceDias(s.dias, s.horas ?? 4 + (i % 7));
    return {
      id: `demo_pd_${String(i + 1).padStart(2, "0")}`,
      empresa_id,
      numero: s.numero,
      contacto_id: c.id,
      nombre: c.nombre,
      telefono: c.telefono,
      email: c.email,
      estado: s.estado,
      items,
      total: items.reduce((suma, it) => suma + it.precio * it.cantidad, 0),
      moneda,
      envio,
      canal: s.canal,
      notas: s.notas,
      creado,
      actualizado: s.dias > 2 ? haceDias(Math.max(0, s.dias - 2)) : creado,
    };
  });
  const pd = (numero: string): Pedido => {
    const p = pedidos.find((x) => x.numero === numero);
    if (!p) throw new Error(`datosDePrueba: falta el pedido ${numero}`);
    return p;
  };

  // ---------- plantillas ----------
  const plantillas: Plantilla[] = [
    {
      id: "demo_pl_01",
      empresa_id,
      canal_id: CANAL_WA,
      nombre: "confirmacion_pedido",
      idioma: "es_AR",
      categoria: "UTILITY",
      estado: "aprobada",
      cuerpo: "¡Hola {{1}}! Recibimos tu pedido {{2}} y ya lo estamos preparando 💜 Te avisamos por acá apenas salga.",
      variables: 2,
      ejemplo: ["Sofía", "LUN-10431"],
      actualizado: haceDias(58),
    },
    {
      id: "demo_pl_02",
      empresa_id,
      canal_id: CANAL_WA,
      nombre: "aviso_despacho",
      idioma: "es_AR",
      categoria: "UTILITY",
      estado: "aprobada",
      cuerpo: "Hola {{1}}, tu pedido {{2}} ya salió 🚚 Lo podés seguir con el código {{3}} en la web del correo. ¡Gracias por elegir Lunar!",
      variables: 3,
      ejemplo: ["Martín", "LUN-10430", "360002461120558"],
      actualizado: haceDias(58),
    },
    {
      id: "demo_pl_03",
      empresa_id,
      canal_id: CANAL_WA,
      nombre: "seguimiento_consulta",
      idioma: "es_AR",
      categoria: "MARKETING",
      estado: "aprobada",
      cuerpo: "Hola {{1}}, ¿cómo estás? Te escribimos de Lunar Cosmética por la consulta que nos dejaste. Si querés, seguimos por acá 😊",
      variables: 1,
      ejemplo: ["Camila"],
      actualizado: haceDias(45),
    },
    {
      id: "demo_pl_04",
      empresa_id,
      canal_id: CANAL_WA,
      nombre: "promo_primavera",
      idioma: "es_AR",
      categoria: "MARKETING",
      estado: "pendiente",
      cuerpo: "¡Hola {{1}}! Llegó la primavera a Lunar 🌸 Esta semana tenés 20% off en toda la línea de skincare con el código PRIMAVERA20.",
      variables: 1,
      ejemplo: ["Julieta"],
      actualizado: haceHs(20),
    },
  ];

  // ---------- respuestas rápidas (compartidas) ----------
  const rapidas: Rapida[] = [
    { id: "demo_rp_hola", empresa_id, atajo: "/hola", texto: "¡Hola! ¿Cómo estás? Gracias por escribirle a Lunar Cosmética 🌙 ¿En qué te puedo ayudar?", de: null },
    { id: "demo_rp_envio", empresa_id, atajo: "/envio", texto: "Hacemos envíos a todo el país por Andreani (llega en 2 a 5 días hábiles) y en AMBA por moto en el día si comprás antes de las 13. ¡El envío es gratis desde $ 50.000!", de: null },
    { id: "demo_rp_pago", empresa_id, atajo: "/pago", texto: "Podés pagar por transferencia (10% off), con tarjeta de crédito en 3 cuotas sin interés o con Mercado Pago. Si querés, te paso el link de pago 👌", de: null },
    { id: "demo_rp_stock", empresa_id, atajo: "/stock", texto: "¡Sí, lo tenemos en stock! Si querés te lo reservo por 24 hs mientras hacés el pago.", de: null },
    { id: "demo_rp_seguimiento", empresa_id, atajo: "/seguimiento", texto: "Tu pedido ya salió 📦 Te paso el número de seguimiento para que lo veas en la web del correo: ", de: null },
    { id: "demo_rp_gracias", empresa_id, atajo: "/gracias", texto: "¡Gracias a vos por tu compra! Cualquier cosa nos escribís por acá. Que lo disfrutes ✨", de: null },
  ];

  // ---------- conversaciones y mensajes ----------
  const horario = horarioEnCriollo(HORARIO_DEFAULT);
  const BIENVENIDA = "¡Hola! 👋 Gracias por escribirle a Lunar Cosmética. En un ratito te atiende una persona. Mientras tanto, contanos qué necesitás.";
  const conStock = (sku: string) => {
    const p = prod(sku);
    return `¡Sí! Tenemos ${p.nombre} a ${dinero(p.precio, moneda)}. ¿Querés que te lo reservemos?`;
  };

  const semillas: SemillaConv[] = [
    // 01 · Sofía: VIP en charla, el bot contestó y escribió dos veces más (sin leer).
    {
      id: "demo_cv_01",
      canal_id: CANAL_WA,
      contacto_id: "demo_ct_01",
      extra: { etapa_id: "demo_et_charla", etiquetas: ["demo_tag_vip"] },
      mensajes: [
        { min: 26, de: "cliente", texto: "Hola! Cómo andan? Quería saber si el sérum de vitamina C está disponible 😊" },
        { min: 25.9, de: "bot", texto: conStock("LUN-SVC30") },
        { min: 5, de: "cliente", texto: "Genial! Y cuánto tarda el envío a Palermo?" },
        { min: 4, de: "cliente", texto: "Ah, y si llevo dos me hacen algún descuento? Ya les compré antes 🙏" },
      ],
    },
    // 02 · Valentina: pregunta por su pedido enviado; atendida.
    {
      id: "demo_cv_02",
      canal_id: CANAL_WA,
      contacto_id: "demo_ct_02",
      visto: "ultimo",
      extra: { etapa_id: "demo_et_postventa", pedido_id: pd("LUN-10428").id },
      mensajes: [
        { min: 95, de: "cliente", texto: "Hola, buenas tardes. Compré el lunes y quería saber por dónde anda mi pedido" },
        { min: 94.9, de: "bot", texto: estadoPedidoEnCriollo(pd("LUN-10428")) },
        { min: 80, de: "cliente", texto: "Buenísimo, gracias! Y más o menos cuándo me llega?" },
        { min: 72, de: "agente", autor: martina, texto: "¡Hola Valentina! Ya está en la sucursal de Andreani de Caballito, así que mañana o pasado te llega. Cualquier cosa me escribís 😊" },
        { min: 70, de: "cliente", texto: "Perfecto, muchas gracias Martina!" },
        { min: 68, de: "agente", autor: martina, texto: "¡De nada! Que lo disfrutes ✨" },
      ],
    },
    // 03 · Micaela (Instagram): nueva, vio un reel; sin leer.
    {
      id: "demo_cv_03",
      canal_id: CANAL_IG,
      contacto_id: "demo_ct_03",
      extra: { etapa_id: "demo_et_nuevo" },
      mensajes: [
        { min: 14, de: "cliente", texto: "Holaa! Vi el reel de la crema de noche 😍 cuánto sale con envío a Córdoba capital?" },
        { min: 13.9, de: "bot", texto: conStock("LUN-CRN50") },
        { min: 12, de: "cliente", texto: "Y el envío? 🙏" },
      ],
    },
    // 04 · Tomás (Messenger): pregunta por un talle; le respondieron y volvió a escribir.
    {
      id: "demo_cv_04",
      canal_id: CANAL_FB,
      contacto_id: "demo_ct_04",
      visto: 240,
      extra: { etapa_id: "demo_et_charla" },
      mensajes: [
        { min: 300, de: "cliente", texto: "Hola! La bata de satén viene en talle L? Es para regalarle a mi novia" },
        { min: 290, de: "agente", autor: yo.nombre, texto: "¡Hola Tomás! La bata viene en dos talles: S/M y L/XL. La L/XL justo se nos agotó y entra la semana que viene; la S/M sí la tenemos. ¿Qué talle usa ella normalmente?" },
        { min: 240, de: "cliente", texto: "Usa M generalmente, pero le gusta holgada" },
        { min: 235, de: "agente", autor: yo.nombre, estado: "entregado", texto: "Entonces te diría la L/XL para que le quede holgada. ¿Querés que te avise apenas entre?" },
        { min: 20, de: "cliente", texto: "Dale, avisame porfa! Y si no llega para el sábado me llevo la S/M" },
      ],
    },
    // 05 · Florencia: reclamo (pote roto) en Soporte, urgente, con foto.
    {
      id: "demo_cv_05",
      canal_id: CANAL_WA,
      contacto_id: "demo_ct_05",
      visto: 160,
      extra: {
        grupo: "soporte",
        urgente: true,
        etapa_id: "demo_et_postventa",
        etiquetas: ["demo_tag_problema"],
        pedido_id: pd("LUN-10429").id,
        asignado_a: MIEMBRO_DEMO.id,
      },
      mensajes: [
        { min: 180, de: "cliente", texto: "Hola, me llegó el pedido LUN-10429 pero la crema de noche vino con el pote roto 😩" },
        { min: 179, de: "cliente", tipo: "imagen", texto: "Así me llegó", media_url: "https://picsum.photos/seed/lunar-pote-roto/400/300", media_mime: "image/jpeg", media_nombre: "foto-pote.jpg" },
        { min: 170, de: "agente", autor: martina, texto: "¡Hola Florencia! Qué mal, perdón 🙏 Ya lo vemos. ¿El sérum llegó bien?" },
        { min: 160, de: "cliente", texto: "Sí, el sérum está perfecto. Solo la crema" },
        { min: 150, de: "agente", autor: martina, estado: "enviado", texto: "Listo, te mandamos una crema nueva sin cargo. Te aviso cuando salga el envío." },
        { min: 35, de: "cliente", texto: "Genial, gracias! Me pasan el seguimiento cuando lo tengan?" },
      ],
    },
    // 06 · Lucía (mayorista): la tomó Martina, con nota interna, lista de precios en PDF.
    {
      id: "demo_cv_06",
      canal_id: CANAL_WA,
      contacto_id: "demo_ct_06",
      visto: "ultimo",
      extra: {
        etapa_id: "demo_et_vendido",
        etiquetas: ["demo_tag_mayorista"],
        nota: "Precio mayorista: 30% off desde 12 unidades por producto. Factura A a nombre de Belleza LP.",
        asignado_a: MIEMBRO_DEMO.id,
        tomado_por: { quien: MIEMBRO_DEMO.id, nombre: martina, cuando: hace(1495) },
        pedido_id: pd("LUN-10433").id,
      },
      mensajes: [
        { min: 1500, de: "cliente", texto: "Hola Martina, cómo va? Te escribo por el pedido de este mes para el local" },
        { min: 1490, de: "agente", autor: martina, texto: "¡Hola Lucía! Todo bien, ¿vos? Te paso la lista mayorista actualizada 👇" },
        { min: 1489, de: "agente", autor: martina, tipo: "documento", texto: "", media_nombre: "Lista de precios mayorista Lunar.pdf", media_mime: "application/pdf" },
        { min: 200, de: "cliente", texto: "Buenísimo. Te confirmo: 24 bálsamos labiales y 6 kits de rutina completa. Factura A a nombre de Belleza LP" },
        { min: 190, de: "agente", autor: martina, texto: `Anotado, Lucía. Son ${dinero(pd("LUN-10433").total, moneda)} con el descuento mayorista. Te paso los datos para transferir 👇` },
        { min: 185, de: "agente", autor: martina, texto: "Alias: LUNAR.COSMETICA.DEMO · Titular: Lunar Cosmética SRL" },
        { min: 130, de: "cliente", texto: "Listo, transferido! Te mando el comprobante por mail" },
        { min: 125, de: "agente", autor: martina, estado: "entregado", texto: "¡Recibido! Ya lo estamos preparando 📦" },
      ],
    },
    // 07 · Carla: pospuesta hasta que cobre; el último mensaje falló (ventana cerrada).
    {
      id: "demo_cv_07",
      canal_id: CANAL_WA,
      contacto_id: "demo_ct_07",
      visto: "ultimo",
      extra: {
        grupo: "mas_adelante",
        etapa_id: "demo_et_pago",
        pedido_id: pd("LUN-10432").id,
        recordar: {
          fecha: dentroDe(3),
          nota: "Cobra esta semana: pasarle el link de pago del LUN-10432.",
          quien: yo.nombre,
          puesto: hace(1555),
        },
      },
      mensajes: [
        { min: 1600, de: "cliente", texto: "Hola! Quiero 2 sérums de vitamina C y el gel limpiador. Les puedo pagar cuando cobro?" },
        { min: 1580, de: "agente", autor: yo.nombre, texto: `¡Hola Carla! Sí, te los reservamos. Te armé el pedido LUN-10432 por ${dinero(pd("LUN-10432").total, moneda)}. Cuando cobres avisame y te paso el link de pago 😊` },
        { min: 1570, de: "cliente", texto: "Dale, cobro esta semana. Gracias!!" },
        { min: 1560, de: "agente", autor: yo.nombre, texto: "Perfecto, te escribo esos días 🙌" },
        {
          min: 30,
          de: "agente",
          autor: yo.nombre,
          estado: "fallido",
          error: "WhatsApp no lo entregó: pasaron más de 24 hs desde el último mensaje de la clienta. Para escribirle, mandá una plantilla.",
          texto: "Carla, te dejo el link de pago por si querés adelantarlo: https://mpago.la/lunar-demo",
        },
      ],
    },
    // 08 · Martín: compró, le avisamos el despacho con plantilla, resuelto.
    {
      id: "demo_cv_08",
      canal_id: CANAL_WA,
      contacto_id: "demo_ct_08",
      visto: "ultimo",
      extra: { grupo: "resueltos", etapa_id: "demo_et_vendido", pedido_id: pd("LUN-10430").id },
      mensajes: [
        { min: 3 * 1440 + 200, de: "cliente", texto: "Hola! Quería el kit de rutina completa, lo tienen?" },
        { min: 3 * 1440 + 199.9, de: "bot", texto: conStock("LUN-KIT3") },
        { min: 3 * 1440 + 150, de: "cliente", texto: "Sí! Ya lo compré por la web 🙌" },
        { min: 3 * 1440 + 140, de: "agente", autor: yo.nombre, texto: "¡Gracias Martín! Mañana te lo despachamos." },
        {
          min: 2 * 1440 - 60,
          de: "agente",
          autor: yo.nombre,
          tipo: "plantilla",
          plantilla: "aviso_despacho",
          texto: llenarPlantilla(plantillas[1].cuerpo, ["Martín", "LUN-10430", "360002461120558"]),
        },
        { min: 1440 + 30, de: "cliente", texto: "Ya me llegó, buenísimo todo. Gracias!!" },
        { min: 1440 + 20, de: "agente", autor: martina, texto: "¡Gracias a vos por tu compra, Martín! Que lo disfrutes ✨" },
      ],
    },
    // 09 · Julieta (Instagram): consulta de uso, resuelta.
    {
      id: "demo_cv_09",
      canal_id: CANAL_IG,
      contacto_id: "demo_ct_09",
      visto: "ultimo",
      extra: { grupo: "resueltos", etapa_id: "demo_et_postventa" },
      mensajes: [
        { min: 2 * 1440 + 300, de: "cliente", texto: "Hola! Una consulta: puedo usar el sérum de vitamina C y el de ácido hialurónico juntos?" },
        { min: 2 * 1440 + 280, de: "agente", autor: yo.nombre, texto: "¡Hola Juli! Sí, se llevan re bien. A la mañana: primero la vitamina C, esperás un minuto y después el hialurónico. A la noche, sólo el hialurónico y la crema 🌙" },
        { min: 2 * 1440 + 270, de: "cliente", texto: "Genial, mil gracias! 💜" },
      ],
    },
    // 10 · Agustina: pidió que no le manden más promociones (Baja).
    {
      id: "demo_cv_10",
      canal_id: CANAL_WA,
      contacto_id: "demo_ct_10",
      visto: "ultimo",
      extra: { grupo: "baja", baja: true, etapa_id: "demo_et_perdido" },
      mensajes: [
        { min: 6 * 1440 + 100, de: "cliente", texto: "Hola, me están llegando muchos mensajes de promociones" },
        { min: 6 * 1440 + 90, de: "agente", autor: yo.nombre, texto: "¡Hola Agustina! Perdón por la molestia. ¿Querés que no te mandemos más promociones?" },
        { min: 6 * 1440 + 80, de: "cliente", texto: "Sí, por favor, no me manden más. Gracias" },
        { min: 6 * 1440 + 75, de: "agente", autor: yo.nombre, texto: "Listo, ya te sacamos de la lista. Si algún día querés volver, nos escribís por acá 😊" },
      ],
    },
    // 11 · Rocío: le irrita un producto, mandó un audio y pidió una persona.
    {
      id: "demo_cv_11",
      canal_id: CANAL_WA,
      contacto_id: "demo_ct_11",
      extra: { necesita_humano: true, etapa_id: "demo_et_postventa" },
      mensajes: [
        { min: 50, de: "cliente", texto: "Hola, compré el gel limpiador y me está irritando un poco la piel" },
        { min: 49.9, de: "bot", texto: BIENVENIDA },
        { min: 46, de: "cliente", tipo: "audio", texto: "", media_mime: "audio/ogg" },
        { min: 45, de: "cliente", texto: "Quiero hablar con una persona por favor" },
        { min: 44.9, de: "bot", estado: "entregado", texto: "Dale, te paso con una persona del equipo. Te responde a la brevedad 🙌" },
      ],
    },
    // 12 · Camila: escribió de noche (fuera de horario) y después compró.
    {
      id: "demo_cv_12",
      canal_id: CANAL_WA,
      contacto_id: "demo_ct_12",
      extra: { fuera_horario: true, pedido_id: pd("LUN-10431").id },
      mensajes: [
        { min: 600, de: "cliente", texto: "Hola! Vi que el protector solar está sin stock 😢 cuándo les vuelve a entrar?" },
        { min: 599.9, de: "bot", estado: "entregado", texto: `¡Gracias por tu mensaje! Ahora estamos fuera del horario de atención (${horario}). Te respondemos apenas abrimos 🌙` },
        { min: 590, de: "cliente", texto: "Ah, y si compro ahora el contorno de ojos y la vincha, me lo mandan junto con el protector cuando llegue?" },
      ],
    },
  ];

  const canalPorId = new Map(canales.map((c) => [c.id, c]));
  const contactoPorId = new Map(contactos.map((c) => [c.id, c]));
  const conversaciones: Conversacion[] = [];
  const mensajes: Record<string, Mensaje[]> = {};

  for (const s of semillas) {
    const canal = canalPorId.get(s.canal_id);
    const contacto = contactoPorId.get(s.contacto_id);
    if (!canal || !contacto) throw new Error(`datosDePrueba: ${s.id} apunta a un canal o contacto que no existe`);
    const sufijo = s.id.replace("demo_cv_", "");
    const lista: Mensaje[] = s.mensajes.map((m, i) => {
      const msg: Mensaje = {
        id: `demo_ms_${sufijo}_${String(i + 1).padStart(2, "0")}`,
        empresa_id,
        conversacion_id: s.id,
        direccion: m.de === "cliente" ? "in" : "out",
        de: m.de,
        tipo: m.tipo || "texto",
        texto: m.texto,
        creado: hace(m.min),
      };
      if (m.de === "bot") msg.autor = "Bot";
      else if (m.de === "agente") msg.autor = m.autor || yo.nombre;
      if (m.de !== "cliente") msg.estado = m.estado || "leido";
      if (m.error) msg.error = m.error;
      if (m.media_url) msg.media_url = m.media_url;
      if (m.media_nombre) msg.media_nombre = m.media_nombre;
      if (m.media_mime) msg.media_mime = m.media_mime;
      if (m.plantilla) msg.plantilla = m.plantilla;
      return msg;
    });
    const ultimo = lista[lista.length - 1];
    const entrantes = lista.filter((m) => m.direccion === "in");
    const humanos = lista.filter((m) => m.de === "agente");
    const ultimoEntrante = entrantes[entrantes.length - 1];
    const visto =
      s.visto === "ultimo" ? ultimoEntrante?.creado ?? null : typeof s.visto === "number" ? hace(s.visto) : null;
    const identificador =
      canal.tipo === "whatsapp" ? contacto.telefono || "" : canal.tipo === "instagram" ? contacto.ig_id || "" : contacto.psid || "";
    conversaciones.push({
      id: s.id,
      empresa_id,
      canal_id: canal.id,
      canal: canal.tipo,
      contacto_id: contacto.id,
      identificador,
      nombre: contacto.nombre,
      ultimo_texto: previewMensaje(ultimo.tipo, ultimo.texto, ultimo.media_nombre),
      ultimo_en: ultimo.creado,
      ultimo_de: ultimo.de,
      ultimo_entrante_en: ultimoEntrante?.creado,
      ultimo_saliente_humano_en: humanos[humanos.length - 1]?.creado,
      no_leidos: visto ? entrantes.filter((m) => m.creado > visto).length : entrantes.length,
      grupo: null,
      etapa_id: null,
      etiquetas: [],
      asignado_a: null,
      tomado_por: null,
      urgente: false,
      recordar: null,
      baja: false,
      fuera_horario: false,
      necesita_humano: false,
      visto_in: visto,
      pedido_id: null,
      bot_estado: null,
      creado: lista[0].creado,
      actualizado: ultimo.creado,
      ...(s.extra || {}),
    });
    mensajes[s.id] = lista;
  }

  // ---------- chat del equipo ----------
  const equipo: MensajeEquipo[] = [
    {
      id: "demo_eq_01",
      empresa_id,
      de: MIEMBRO_DEMO.id,
      nombre: martina,
      texto: "¡Buen día! Arranco con los despachos de Andreani y después sigo con la bandeja 💪",
      creado: hace(180),
      ref: null,
      estado: null,
    },
    {
      id: "demo_eq_02",
      empresa_id,
      de: yo.id,
      nombre: yo.nombre,
      texto: "Martina, ¿podés ver el chat de Florencia? Le llegó la crema con el pote roto: hay que mandarle una nueva.",
      creado: hace(100),
      ref: { tipo: "conversacion", id: "demo_cv_05", nombre: "Florencia Benítez" },
      estado: "pendiente",
      hecho_por: null,
    },
    {
      id: "demo_eq_03",
      empresa_id,
      de: MIEMBRO_DEMO.id,
      nombre: martina,
      texto: "¿Sabés cuándo entra el protector solar? Tengo varias clientas preguntando.",
      creado: hace(60),
      ref: null,
      estado: null,
    },
    {
      id: "demo_eq_04",
      empresa_id,
      de: yo.id,
      nombre: yo.nombre,
      texto: "Llega el jueves. Anotalas y les avisamos apenas entre 🙌",
      creado: hace(45),
      ref: null,
      estado: null,
    },
  ];

  return {
    canales,
    contactos,
    conversaciones,
    mensajes,
    pedidos,
    productos,
    rapidas,
    plantillas,
    equipo,
    etapas: ETAPAS_DEMO.map((e) => ({ ...e })),
    etiquetas: ETIQUETAS_DEMO.map((e) => ({ ...e })),
  };
}
