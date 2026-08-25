import type {
  Brand,
  Channel,
  StoreConnection,
  Conversation,
  Message,
  Order,
  AbandonedCart,
  MLQuestion,
  Lead,
  Campaign,
} from "./types";

// Fixed "now" reference so the demo is deterministic across renders.
const NOW = new Date("2026-08-25T14:30:00-03:00");
const mins = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();
const hrs = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const days = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
const inDays = (d: number) => new Date(NOW.getTime() + d * 86_400_000).toISOString();

export const brands: Brand[] = [
  {
    id: "b_lunar",
    name: "Lunar Cosmética",
    handle: "@lunar.cosmetica",
    color: "#d946ef",
    logo: "🌙",
    industry: "Belleza & Skincare",
  },
  {
    id: "b_kapeta",
    name: "Kapeta Indumentaria",
    handle: "@kapeta.ar",
    color: "#3563ff",
    logo: "🧥",
    industry: "Moda & Indumentaria",
  },
  {
    id: "b_mate",
    name: "Che Mate",
    handle: "@chemate",
    color: "#16a34a",
    logo: "🧉",
    industry: "Mates & Bombillas",
  },
  {
    id: "b_petit",
    name: "Petit Hogar",
    handle: "@petithogar",
    color: "#f59e0b",
    logo: "🏠",
    industry: "Deco & Hogar",
  },
];

export const channels: Channel[] = [
  // Lunar
  { id: "ch_l_wa1", brandId: "b_lunar", type: "whatsapp", label: "+54 9 11 5010-1234", status: "connected", unread: 3, lastSync: mins(2) },
  { id: "ch_l_wa2", brandId: "b_lunar", type: "whatsapp", label: "+54 9 11 5010-9988 (ventas)", status: "connected", unread: 1, lastSync: mins(4) },
  { id: "ch_l_ig1", brandId: "b_lunar", type: "instagram", label: "@lunar.cosmetica", status: "connected", unread: 5, lastSync: mins(1) },
  { id: "ch_l_ig2", brandId: "b_lunar", type: "instagram", label: "@lunar.skincare", status: "syncing", unread: 0, lastSync: mins(1) },
  { id: "ch_l_ml", brandId: "b_lunar", type: "mercadolibre", label: "LUNAR OFICIAL", status: "connected", unread: 4, lastSync: mins(6) },
  { id: "ch_l_tk", brandId: "b_lunar", type: "tiktok", label: "@lunar.cosmetica", status: "pending", unread: 0, lastSync: hrs(3) },
  // Kapeta
  { id: "ch_k_wa1", brandId: "b_kapeta", type: "whatsapp", label: "+54 9 351 400-2211", status: "connected", unread: 2, lastSync: mins(3) },
  { id: "ch_k_ig1", brandId: "b_kapeta", type: "instagram", label: "@kapeta.ar", status: "connected", unread: 8, lastSync: mins(1) },
  { id: "ch_k_ms", brandId: "b_kapeta", type: "messenger", label: "Kapeta Indumentaria", status: "connected", unread: 1, lastSync: mins(9) },
  { id: "ch_k_ml", brandId: "b_kapeta", type: "mercadolibre", label: "KAPETA STORE", status: "error", unread: 0, lastSync: hrs(5) },
  // Che Mate
  { id: "ch_m_wa1", brandId: "b_mate", type: "whatsapp", label: "+54 9 341 622-7788", status: "connected", unread: 4, lastSync: mins(1) },
  { id: "ch_m_ig1", brandId: "b_mate", type: "instagram", label: "@chemate", status: "connected", unread: 2, lastSync: mins(5) },
  { id: "ch_m_ml", brandId: "b_mate", type: "mercadolibre", label: "CHE MATE OFICIAL", status: "connected", unread: 6, lastSync: mins(3) },
  // Petit
  { id: "ch_p_wa1", brandId: "b_petit", type: "whatsapp", label: "+54 9 11 3320-4455", status: "connected", unread: 1, lastSync: mins(7) },
  { id: "ch_p_ig1", brandId: "b_petit", type: "instagram", label: "@petithogar", status: "connected", unread: 3, lastSync: mins(2) },
];

export const storeConnections: StoreConnection[] = [
  { id: "st_l_tn", brandId: "b_lunar", platform: "tiendanube", storeName: "Lunar Cosmética", url: "lunar.mitiendanube.com", status: "connected", ordersToday: 34, abandonedCarts: 18 },
  { id: "st_l_ml", brandId: "b_lunar", platform: "mshops", storeName: "Lunar en Mercado Shops", url: "mercadoshops.com/lunar", status: "connected", ordersToday: 12, abandonedCarts: 7 },
  { id: "st_k_sh", brandId: "b_kapeta", platform: "shopify", storeName: "Kapeta", url: "kapeta.com.ar", status: "connected", ordersToday: 21, abandonedCarts: 14 },
  { id: "st_k_vt", brandId: "b_kapeta", platform: "vtex", storeName: "Kapeta VTEX", url: "kapeta.vtex.com", status: "syncing", ordersToday: 5, abandonedCarts: 9 },
  { id: "st_m_tn", brandId: "b_mate", platform: "tiendanube", storeName: "Che Mate", url: "chemate.mitiendanube.com", status: "connected", ordersToday: 28, abandonedCarts: 11 },
  { id: "st_m_vd", brandId: "b_mate", platform: "vendany", storeName: "Che Mate Vendany", url: "chemate.vendany.com", status: "connected", ordersToday: 9, abandonedCarts: 4 },
  { id: "st_p_tn", brandId: "b_petit", platform: "tiendanube", storeName: "Petit Hogar", url: "petithogar.mitiendanube.com", status: "connected", ordersToday: 16, abandonedCarts: 8 },
];

export const conversations: Conversation[] = [
  { id: "c1", brandId: "b_lunar", channel: "whatsapp", channelId: "ch_l_wa1", customerName: "Sofía Giménez", handle: "+54 9 11 6021-8890", avatar: "👩🏻", lastMessage: "Hola! Quería saber si el sérum de vitamina C está disponible 😍", unread: 2, timestamp: mins(3), status: "open", tags: ["consulta", "venta"], orderNumber: undefined },
  { id: "c2", brandId: "b_lunar", channel: "instagram", channelId: "ch_l_ig1", customerName: "Mica Rodríguez", handle: "@micarod", avatar: "👩🏽", lastMessage: "vi el reel de la crema, cuánto sale con envío a Córdoba?", unread: 1, timestamp: mins(8), status: "open", tags: ["ig", "envío"] },
  { id: "c3", brandId: "b_lunar", channel: "mercadolibre", channelId: "ch_l_ml", customerName: "Juan Pérez", handle: "JUANPE_2020", avatar: "🧑🏻", lastMessage: "¿El producto es original? ¿Tiene factura A?", unread: 1, timestamp: mins(14), status: "pending", tags: ["ml", "pregunta"], orderNumber: "LUN-10432" },
  { id: "c4", brandId: "b_lunar", channel: "whatsapp", channelId: "ch_l_wa1", customerName: "Valentina Sosa", handle: "+54 9 11 4477-2231", avatar: "👩🏼", lastMessage: "Necesito rastrear mi pedido por favor, número LUN-10428", unread: 1, timestamp: mins(22), status: "open", tags: ["seguimiento"], orderNumber: "LUN-10428" },
  { id: "c5", brandId: "b_kateta" as string, channel: "instagram", channelId: "ch_k_ig1", customerName: "Tomás Álvarez", handle: "@tomialv", avatar: "🧑🏽", lastMessage: "el buzo oversize viene en talle L?", unread: 3, timestamp: mins(6), status: "open", tags: ["talle", "consulta"] },
  { id: "c6", brandId: "b_kapeta", channel: "whatsapp", channelId: "ch_k_wa1", customerName: "Flor Benítez", handle: "+54 9 351 555-1020", avatar: "👩🏻", lastMessage: "Me llegó un talle equivocado 😩 quiero cambiarlo", unread: 1, timestamp: mins(18), status: "pending", tags: ["cambio", "postventa"], orderNumber: "KAP-8821" },
  { id: "c7", brandId: "b_kapeta", channel: "messenger", channelId: "ch_k_ms", customerName: "Lucas Medina", handle: "Lucas Medina", avatar: "🧑🏻", lastMessage: "hacen envíos a todo el país?", unread: 1, timestamp: mins(40), status: "open", tags: ["envío"] },
  { id: "c8", brandId: "b_mate", channel: "whatsapp", channelId: "ch_m_wa1", customerName: "Diego Ferreyra", handle: "+54 9 341 700-3344", avatar: "🧉", lastMessage: "El mate imperial se puede curar antes de enviar?", unread: 2, timestamp: mins(5), status: "open", tags: ["consulta"] },
  { id: "c9", brandId: "b_mate", channel: "mercadolibre", channelId: "ch_m_ml", customerName: "Romina Paz", handle: "ROMI_PAZ", avatar: "👩🏽", lastMessage: "¿Tenés el combo mate + bombilla + yerbera?", unread: 1, timestamp: mins(11), status: "open", tags: ["ml", "pregunta"] },
  { id: "c10", brandId: "b_mate", channel: "instagram", channelId: "ch_m_ig1", customerName: "Nacho Ruiz", handle: "@nachoruiz", avatar: "🧑🏼", lastMessage: "vi el mate de calabaza, llega para el día del amigo?", unread: 1, timestamp: mins(33), status: "open", tags: ["envío"] },
  { id: "c11", brandId: "b_petit", channel: "whatsapp", channelId: "ch_p_wa1", customerName: "Carla Domínguez", handle: "+54 9 11 2211-5566", avatar: "👩🏻", lastMessage: "Las sábanas king vienen con fundas?", unread: 1, timestamp: mins(15), status: "open", tags: ["consulta"] },
  { id: "c12", brandId: "b_petit", channel: "instagram", channelId: "ch_p_ig1", customerName: "Pedro Salas", handle: "@pedrosalas", avatar: "🧑🏽", lastMessage: "quiero el juego de vajilla, aceptan transferencia?", unread: 2, timestamp: mins(28), status: "open", tags: ["pago"] },
];
// fix a typo-ed brandId above (keep data valid)
conversations.forEach((c) => {
  if (c.brandId === ("b_kateta" as string)) c.brandId = "b_kapeta";
});

export const messagesByConversation: Record<string, Message[]> = {
  c1: [
    { id: "m1", from: "customer", text: "Hola! Quería saber si el sérum de vitamina C está disponible 😍", timestamp: mins(3) },
  ],
  c4: [
    { id: "m1", from: "customer", text: "Hola, compré hace unos días", timestamp: mins(25) },
    { id: "m2", from: "bot", text: "¡Hola Valentina! 👋 Soy el asistente de Lunar Cosmética. ¿Querés rastrear tu pedido? Pasame tu número de orden o tu email.", timestamp: mins(24), author: "Bot Clientany" },
    { id: "m3", from: "customer", text: "Necesito rastrear mi pedido por favor, número LUN-10428", timestamp: mins(22) },
  ],
  c6: [
    { id: "m1", from: "customer", text: "Hola! compré un buzo la semana pasada", timestamp: mins(20) },
    { id: "m2", from: "customer", text: "Me llegó un talle equivocado 😩 quiero cambiarlo", timestamp: mins(18) },
  ],
};

export const orders: Order[] = [
  {
    id: "o1",
    orderNumber: "LUN-10428",
    brandId: "b_lunar",
    customerName: "Valentina Sosa",
    email: "valen.sosa@gmail.com",
    phone: "+54 9 11 4477-2231",
    status: "en_camino",
    carrier: "Andreani",
    trackingCode: "AND-778812340091",
    trackingUrl: "https://www.andreani.com/#!/informacionEnvio/AND-778812340091",
    eta: inDays(1),
    total: 41800,
    currency: "ARS",
    items: [
      { name: "Sérum Vitamina C 30ml", qty: 1 },
      { name: "Crema hidratante noche", qty: 1 },
    ],
    createdAt: days(3),
    destination: "Palermo, CABA",
    timeline: [
      { status: "confirmado", label: "Pedido confirmado", detail: "Recibimos tu pago", timestamp: days(3), done: true },
      { status: "preparacion", label: "En preparación", detail: "Preparando tu pedido en depósito", timestamp: days(2), location: "Depósito Avellaneda", done: true },
      { status: "despachado", label: "Despachado", detail: "Entregado al correo Andreani", timestamp: days(1), location: "Avellaneda, BsAs", done: true },
      { status: "en_camino", label: "En viaje", detail: "Tu pedido va en camino a la sucursal de destino", timestamp: hrs(6), location: "Centro de distribución CABA", done: true },
      { status: "en_reparto", label: "En reparto", detail: "Salió a reparto a tu domicilio", timestamp: inDays(1), done: false },
      { status: "entregado", label: "Entregado", detail: "Entrega estimada", timestamp: inDays(1), done: false },
    ],
  },
  {
    id: "o2",
    orderNumber: "LUN-10432",
    brandId: "b_lunar",
    customerName: "Juan Pérez",
    email: "juanpe2020@hotmail.com",
    phone: "+54 9 11 6655-4433",
    status: "preparacion",
    carrier: "Correo Argentino",
    trackingCode: "CA-559012773AR",
    trackingUrl: "https://www.correoargentino.com.ar/formularios/e-commerce?id=CA-559012773AR",
    eta: inDays(4),
    total: 23500,
    currency: "ARS",
    items: [{ name: "Kit skincare rutina básica", qty: 1 }],
    createdAt: days(1),
    destination: "Nueva Córdoba, Córdoba",
    timeline: [
      { status: "confirmado", label: "Pedido confirmado", detail: "Recibimos tu pago", timestamp: days(1), done: true },
      { status: "preparacion", label: "En preparación", detail: "Preparando tu pedido en depósito", timestamp: hrs(4), location: "Depósito Avellaneda", done: true },
      { status: "despachado", label: "Despachado", detail: "Pendiente de despacho", timestamp: inDays(1), done: false },
      { status: "en_camino", label: "En viaje", detail: "En camino", timestamp: inDays(2), done: false },
      { status: "entregado", label: "Entregado", detail: "Entrega estimada", timestamp: inDays(4), done: false },
    ],
  },
  {
    id: "o3",
    orderNumber: "KAP-8821",
    brandId: "b_kapeta",
    customerName: "Flor Benítez",
    email: "flor.benitez@gmail.com",
    phone: "+54 9 351 555-1020",
    status: "entregado",
    carrier: "OCA",
    trackingCode: "OCA-330219884",
    trackingUrl: "https://www.oca.com.ar/Tracking/Result?numberInput=OCA-330219884",
    eta: days(1),
    total: 38900,
    currency: "ARS",
    items: [{ name: "Buzo oversize negro - Talle M", qty: 1 }],
    createdAt: days(6),
    destination: "Cerro de las Rosas, Córdoba",
    timeline: [
      { status: "confirmado", label: "Pedido confirmado", detail: "Recibimos tu pago", timestamp: days(6), done: true },
      { status: "preparacion", label: "En preparación", detail: "Preparado", timestamp: days(5), done: true },
      { status: "despachado", label: "Despachado", detail: "Entregado a OCA", timestamp: days(4), location: "Córdoba Capital", done: true },
      { status: "en_camino", label: "En viaje", detail: "En camino", timestamp: days(2), done: true },
      { status: "entregado", label: "Entregado", detail: "Recibido y firmado", timestamp: days(1), location: "Cerro de las Rosas", done: true },
    ],
  },
  {
    id: "o4",
    orderNumber: "MATE-5567",
    brandId: "b_mate",
    customerName: "Diego Ferreyra",
    email: "dferreyra@gmail.com",
    phone: "+54 9 341 700-3344",
    status: "demorado",
    carrier: "Andreani",
    trackingCode: "AND-889900112233",
    trackingUrl: "https://www.andreani.com/#!/informacionEnvio/AND-889900112233",
    eta: days(0),
    total: 29900,
    currency: "ARS",
    items: [
      { name: "Mate imperial premium", qty: 1 },
      { name: "Bombilla pico de loro alpaca", qty: 1 },
    ],
    createdAt: days(5),
    destination: "Fisherton, Rosario",
    timeline: [
      { status: "confirmado", label: "Pedido confirmado", detail: "Recibimos tu pago", timestamp: days(5), done: true },
      { status: "preparacion", label: "En preparación", detail: "Preparado", timestamp: days(4), done: true },
      { status: "despachado", label: "Despachado", detail: "Entregado a Andreani", timestamp: days(3), location: "Rosario", done: true },
      { status: "demorado", label: "Demora en tránsito", detail: "El envío registra una demora por reprogramación del correo. Estamos gestionando la entrega.", timestamp: hrs(10), location: "CD Rosario", done: true },
      { status: "en_reparto", label: "En reparto", detail: "Reprogramado", timestamp: inDays(1), done: false },
      { status: "entregado", label: "Entregado", detail: "Nueva entrega estimada", timestamp: inDays(1), done: false },
    ],
  },
];

export const abandonedCarts: AbandonedCart[] = [
  { id: "cart1", brandId: "b_lunar", platform: "tiendanube", customerName: "Agustina Ledesma", email: "agus.ledesma@gmail.com", phone: "+54 9 11 5566-7788", total: 52400, currency: "ARS", items: [{ name: "Sérum Vitamina C 30ml", qty: 1, price: 24900 }, { name: "Protector solar FPS50", qty: 1, price: 27500 }], abandonedAt: mins(35), recoveryStatus: "nuevo", channelSuggested: "whatsapp", checkoutUrl: "https://lunar.mitiendanube.com/checkout/recover/abc123" },
  { id: "cart2", brandId: "b_lunar", platform: "tiendanube", customerName: "Bruno Castro", email: "bruno.castro@outlook.com", total: 18900, currency: "ARS", items: [{ name: "Crema hidratante noche", qty: 1, price: 18900 }], abandonedAt: hrs(2), recoveryStatus: "contactado", channelSuggested: "email", checkoutUrl: "https://lunar.mitiendanube.com/checkout/recover/def456" },
  { id: "cart3", brandId: "b_lunar", platform: "mshops", customerName: "Denise Vera", email: "denivera@gmail.com", phone: "+54 9 11 4040-3030", total: 33100, currency: "ARS", items: [{ name: "Kit skincare rutina completa", qty: 1, price: 33100 }], abandonedAt: hrs(5), recoveryStatus: "recuperado", channelSuggested: "whatsapp", checkoutUrl: "https://mercadoshops.com/lunar/recover/ghi789" },
  { id: "cart4", brandId: "b_kapeta", platform: "shopify", customerName: "Franco Ibáñez", email: "franco.ibanez@gmail.com", phone: "+54 9 351 222-8899", total: 74800, currency: "ARS", items: [{ name: "Campera puffer - Talle L", qty: 1, price: 62900 }, { name: "Gorro tejido", qty: 1, price: 11900 }], abandonedAt: mins(50), recoveryStatus: "nuevo", channelSuggested: "whatsapp", checkoutUrl: "https://kapeta.com.ar/cart/recover/jkl012" },
  { id: "cart5", brandId: "b_kapeta", platform: "vtex", customerName: "Guadalupe Ríos", email: "guada.rios@gmail.com", total: 41200, currency: "ARS", items: [{ name: "Jean mom fit - Talle 40", qty: 1, price: 41200 }], abandonedAt: hrs(3), recoveryStatus: "contactado", channelSuggested: "email", checkoutUrl: "https://kapeta.vtex.com/checkout/recover/mno345" },
  { id: "cart6", brandId: "b_mate", platform: "tiendanube", customerName: "Hernán Quiroga", email: "hernanq@gmail.com", phone: "+54 9 341 611-2233", total: 27600, currency: "ARS", items: [{ name: "Combo mate + bombilla + yerbera", qty: 1, price: 27600 }], abandonedAt: mins(20), recoveryStatus: "nuevo", channelSuggested: "whatsapp", checkoutUrl: "https://chemate.mitiendanube.com/checkout/recover/pqr678" },
  { id: "cart7", brandId: "b_mate", platform: "vendany", customerName: "Ivana Torres", email: "ivana.torres@gmail.com", total: 15400, currency: "ARS", items: [{ name: "Yerbera de cuero", qty: 1, price: 15400 }], abandonedAt: hrs(8), recoveryStatus: "perdido", channelSuggested: "email", checkoutUrl: "https://chemate.vendany.com/recover/stu901" },
  { id: "cart8", brandId: "b_petit", platform: "tiendanube", customerName: "Joaquín Morales", email: "joaquin.morales@gmail.com", phone: "+54 9 11 7788-9900", total: 89900, currency: "ARS", items: [{ name: "Juego de sábanas king algodón", qty: 1, price: 54900 }, { name: "Acolchado premium", qty: 1, price: 35000 }], abandonedAt: mins(42), recoveryStatus: "nuevo", channelSuggested: "whatsapp", checkoutUrl: "https://petithogar.mitiendanube.com/checkout/recover/vwx234" },
];

export const mlQuestions: MLQuestion[] = [
  { id: "q1", brandId: "b_lunar", type: "pregunta", itemTitle: "Sérum Vitamina C 30ml Antiarrugas Original", itemImage: "🧴", customerName: "JUANPE_2020", text: "¿El producto es original? ¿Tiene factura A?", timestamp: mins(14), answered: false, price: 24900 },
  { id: "q2", brandId: "b_lunar", type: "pregunta", itemTitle: "Kit Skincare Rutina Completa", itemImage: "💆", customerName: "MARIELA_88", text: "Hacen envío a Tucumán? En cuánto llega?", timestamp: mins(30), answered: false, price: 33100 },
  { id: "q3", brandId: "b_lunar", type: "mensaje", itemTitle: "Protector Solar FPS50", itemImage: "☀️", customerName: "compra_feliz", text: "Ya te pagué, cuándo lo despachás?", timestamp: hrs(1), answered: true, price: 27500 },
  { id: "q4", brandId: "b_mate", type: "pregunta", itemTitle: "Mate Imperial Premium Calabaza + Bombilla", itemImage: "🧉", customerName: "ROMI_PAZ", text: "¿Tenés el combo mate + bombilla + yerbera?", timestamp: mins(11), answered: false, price: 29900 },
  { id: "q5", brandId: "b_mate", type: "pregunta", itemTitle: "Bombilla Pico de Loro Alpaca", itemImage: "🥤", customerName: "matero_ok", text: "Es de alpaca maciza o baño de alpaca?", timestamp: mins(48), answered: false, price: 8900 },
  { id: "q6", brandId: "b_mate", type: "reclamo", itemTitle: "Set Yerbera + Azucarera", itemImage: "🫙", customerName: "clienta_2021", text: "Me llegó la yerbera manchada, quiero solución", timestamp: hrs(2), answered: false, price: 15400 },
  { id: "q7", brandId: "b_kapeta", type: "pregunta", itemTitle: "Buzo Oversize Frisa Premium", itemImage: "🧥", customerName: "urban_style", text: "El talle XL cuánto mide de largo?", timestamp: mins(25), answered: false, price: 32900 },
];

export const leads: Lead[] = [
  { id: "l1", brandId: "b_lunar", name: "Camila Ortiz", email: "cami.ortiz@gmail.com", phone: "+54 9 11 5566-1122", source: "mercadolibre", tags: ["skincare", "vitamina-c"], capturedAt: hrs(3), consentEmail: true, consentWhatsapp: true },
  { id: "l2", brandId: "b_lunar", name: "Julieta Ramos", email: "juli.ramos@gmail.com", source: "leadmagnet", tags: ["rutina-basica"], capturedAt: hrs(6), consentEmail: true, consentWhatsapp: false },
  { id: "l3", brandId: "b_lunar", name: "Nicolás Vega", email: "nico.vega@outlook.com", phone: "+54 9 11 3344-5566", source: "carrito", tags: ["abandonó-carrito"], capturedAt: days(1), consentEmail: true, consentWhatsapp: true },
  { id: "l4", brandId: "b_mate", name: "Sabrina Luna", email: "sabri.luna@gmail.com", phone: "+54 9 341 700-1122", source: "mercadolibre", tags: ["mate", "regalo"], capturedAt: hrs(5), consentEmail: true, consentWhatsapp: true },
  { id: "l5", brandId: "b_mate", name: "Emilio Cabrera", email: "emilio.cabrera@gmail.com", source: "leadmagnet", tags: ["combo-mate"], capturedAt: days(1), consentEmail: true, consentWhatsapp: false },
  { id: "l6", brandId: "b_kapeta", name: "Rocío Fernández", email: "rocio.fer@gmail.com", phone: "+54 9 351 400-9988", source: "mercadolibre", tags: ["indumentaria", "invierno"], capturedAt: hrs(8), consentEmail: true, consentWhatsapp: true },
  { id: "l7", brandId: "b_kapeta", name: "Matías Godoy", email: "mati.godoy@gmail.com", source: "webchat", tags: ["consulta-talle"], capturedAt: days(2), consentEmail: true, consentWhatsapp: false },
  { id: "l8", brandId: "b_petit", name: "Antonella Ruiz", email: "anto.ruiz@gmail.com", phone: "+54 9 11 2233-4455", source: "leadmagnet", tags: ["deco", "sabanas"], capturedAt: hrs(12), consentEmail: true, consentWhatsapp: true },
];

export const campaigns: Campaign[] = [
  { id: "camp1", brandId: "b_lunar", name: "Lanzamiento Sérum Vitamina C", channel: "email", status: "enviada", audience: "Compradores skincare", audienceSize: 3240, scheduledFor: days(2), sent: 3240, opened: 1782, clicked: 604, converted: 96, revenue: 2390400 },
  { id: "camp2", brandId: "b_lunar", name: "Recordatorio carrito abandonado", channel: "whatsapp", status: "enviando", audience: "Carritos últimos 7 días", audienceSize: 128, scheduledFor: mins(30), sent: 74, opened: 68, clicked: 41, converted: 12, revenue: 468000 },
  { id: "camp3", brandId: "b_lunar", name: "Día del Amigo - 20% OFF", channel: "email", status: "programada", audience: "Toda la base con consentimiento", audienceSize: 5120, scheduledFor: inDays(2), sent: 0, opened: 0, clicked: 0, converted: 0, revenue: 0 },
  { id: "camp4", brandId: "b_mate", name: "Combo mate para regalar", channel: "whatsapp", status: "enviada", audience: "Leads Mercado Libre", audienceSize: 890, scheduledFor: days(4), sent: 890, opened: 812, clicked: 356, converted: 71, revenue: 2122900 },
  { id: "camp5", brandId: "b_mate", name: "Reseña post-compra", channel: "email", status: "borrador", audience: "Entregados últimos 15 días", audienceSize: 412, sent: 0, opened: 0, clicked: 0, converted: 0, revenue: 0 },
  { id: "camp6", brandId: "b_kateta" as string, name: "Nueva colección invierno", channel: "email", status: "programada", audience: "Compradores + leads IG", audienceSize: 2760, scheduledFor: inDays(1), sent: 0, opened: 0, clicked: 0, converted: 0, revenue: 0 },
  { id: "camp7", brandId: "b_petit", name: "Ofertas de hogar - fin de semana", channel: "whatsapp", status: "enviada", audience: "Base Petit Hogar", audienceSize: 1540, scheduledFor: days(3), sent: 1540, opened: 1398, clicked: 502, converted: 88, revenue: 3960000 },
];
campaigns.forEach((c) => {
  if (c.brandId === ("b_kateta" as string)) c.brandId = "b_kapeta";
});

// ---- Helper aggregations for the dashboard ----
export const revenueByDay = [
  { day: "Lun", ventas: 285000, recuperado: 42000 },
  { day: "Mar", ventas: 312000, recuperado: 51000 },
  { day: "Mié", ventas: 298000, recuperado: 47000 },
  { day: "Jue", ventas: 356000, recuperado: 62000 },
  { day: "Vie", ventas: 421000, recuperado: 78000 },
  { day: "Sáb", ventas: 389000, recuperado: 69000 },
  { day: "Dom", ventas: 244000, recuperado: 38000 },
];

export const messagesByChannel = [
  { channel: "WhatsApp", value: 1240 },
  { channel: "Instagram", value: 980 },
  { channel: "Mercado Libre", value: 645 },
  { channel: "Messenger", value: 210 },
  { channel: "TikTok", value: 95 },
];
