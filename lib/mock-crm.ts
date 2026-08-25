import type {
  PipelineStage,
  Deal,
  Agent,
  Queue,
  QuickReply,
  HelpdeskSettings,
  Product,
  BusinessLabel,
  Broadcast,
} from "./types";

const NOW = new Date("2026-08-25T14:30:00-03:00");
const hrs = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const days = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
const inDays = (d: number) => new Date(NOW.getTime() + d * 86_400_000).toISOString();

export const pipelineStages: PipelineStage[] = [
  { id: "st_nuevo", name: "Nuevo lead", color: "#9aa3c0" },
  { id: "st_contacto", name: "Contacto hecho", color: "#598bff" },
  { id: "st_negociacion", name: "En negociación", color: "#f59e0b" },
  { id: "st_propuesta", name: "Propuesta enviada", color: "#8b5cf6" },
  { id: "st_ganado", name: "Ganado", color: "#16a34a" },
  { id: "st_perdido", name: "Perdido", color: "#ef4444" },
];

export const agents: Agent[] = [
  { id: "ag_ivan", name: "Iván Frutos", email: "ivan@clientany.com", role: "admin", online: true, avatar: "🧑‍💼" },
  { id: "ag_sofi", name: "Sofía Vega", email: "sofia@clientany.com", role: "supervisor", online: true, avatar: "👩‍💻" },
  { id: "ag_marto", name: "Martín Díaz", email: "martin@clientany.com", role: "agente", online: false, avatar: "🧑‍🦱" },
  { id: "ag_juli", name: "Julieta Roldán", email: "julieta@clientany.com", role: "agente", online: true, avatar: "👩" },
];

export const queues: Queue[] = [
  { id: "q_ventas", name: "Ventas", color: "#16a34a", autoAssign: true },
  { id: "q_soporte", name: "Soporte / Postventa", color: "#598bff", autoAssign: true },
  { id: "q_envios", name: "Envíos", color: "#f59e0b", autoAssign: false },
  { id: "q_mayorista", name: "Mayoristas", color: "#8b5cf6", autoAssign: false },
];

export const quickReplies: QuickReply[] = [
  { id: "qr1", shortcut: "/hola", text: "¡Hola! 👋 Gracias por escribirnos. ¿En qué te podemos ayudar hoy?" },
  { id: "qr2", shortcut: "/envio", text: "Realizamos envíos a todo el país 📦 en 24 a 72 hs hábiles. ¿A qué localidad sería?" },
  { id: "qr3", shortcut: "/pago", text: "Podés pagar con tarjeta, Mercado Pago o transferencia. ¿Cuál te queda cómodo?" },
  { id: "qr4", shortcut: "/stock", text: "¡Sí! Tenemos stock disponible. ¿Te paso el link para que lo compres?" },
  { id: "qr5", shortcut: "/seguimiento", text: "Podés seguir tu pedido en tiempo real acá 👉 clientany.app/track" },
  { id: "qr6", shortcut: "/gracias", text: "¡Gracias por tu compra! 🙌 Cualquier cosa quedamos a disposición." },
];

export const helpdeskSettings: HelpdeskSettings = {
  hours: [
    { day: "Lunes", open: true, from: "09:00", to: "18:00" },
    { day: "Martes", open: true, from: "09:00", to: "18:00" },
    { day: "Miércoles", open: true, from: "09:00", to: "18:00" },
    { day: "Jueves", open: true, from: "09:00", to: "18:00" },
    { day: "Viernes", open: true, from: "09:00", to: "18:00" },
    { day: "Sábado", open: true, from: "10:00", to: "13:00" },
    { day: "Domingo", open: false, from: "10:00", to: "13:00" },
  ],
  greetingEnabled: true,
  greetingMessage: "¡Hola! 👋 Bienvenido/a a {marca}. Un asesor te responde en breve. Mientras tanto, contanos en qué te ayudamos 😊",
  awayEnabled: true,
  awayMessage: "¡Gracias por escribir! Ahora estamos fuera de horario de atención (Lun a Vie de 9 a 18 hs). Te respondemos apenas volvamos 🌙",
  chatbotEnabled: true,
  chatbotMenu: [
    { key: "1", label: "Hacer una compra", queueId: "q_ventas" },
    { key: "2", label: "Seguir mi pedido", queueId: "q_envios" },
    { key: "3", label: "Postventa / cambios", queueId: "q_soporte" },
    { key: "4", label: "Compra mayorista", queueId: "q_mayorista" },
  ],
  csatEnabled: true,
  csatMessage: "¿Cómo calificás la atención que recibiste? Respondé del 1 al 5 ⭐",
};

export const deals: Deal[] = [
  {
    id: "d1", brandId: "b_lunar", title: "Combo skincare x mayor", contactName: "Farmacia Belén", contactHandle: "+54 9 11 6021-8890",
    channel: "whatsapp", value: 185000, currency: "ARS", stageId: "st_negociacion", responsible: "ag_sofi", source: "WhatsApp", tags: ["mayorista"], createdAt: days(4), expectedClose: inDays(3),
    notes: [{ id: "n1", text: "Pidió lista de precios mayorista, la envié.", at: days(2) }],
    tasks: [{ id: "t1", text: "Llamar para cerrar el pedido", due: inDays(1), done: false }],
  },
  {
    id: "d2", brandId: "b_lunar", title: "Kit rutina completa", contactName: "Mica Rodríguez", contactHandle: "@micarod",
    channel: "instagram", value: 33100, currency: "ARS", stageId: "st_propuesta", responsible: "ag_juli", source: "Instagram", tags: ["retail"], createdAt: days(2), expectedClose: inDays(2),
    notes: [], tasks: [{ id: "t2", text: "Enviar link de pago", due: NOW.toISOString(), done: false }],
  },
  {
    id: "d3", brandId: "b_kapeta", title: "Pedido corporativo buzos", contactName: "Estudio Contable RG", contactHandle: "+54 9 351 400-2211",
    channel: "whatsapp", value: 420000, currency: "ARS", stageId: "st_contacto", responsible: "ag_ivan", source: "WhatsApp", tags: ["corporativo", "mayorista"], createdAt: days(1),
    notes: [], tasks: [{ id: "t3", text: "Cotizar 30 buzos bordados", due: inDays(1), done: false }],
  },
  {
    id: "d4", brandId: "b_mate", title: "Combo día del amigo", contactName: "Romina Paz", contactHandle: "ROMI_PAZ",
    channel: "mercadolibre", value: 29900, currency: "ARS", stageId: "st_nuevo", responsible: "ag_marto", source: "Mercado Libre", tags: ["regalo"], createdAt: hrs(6),
    notes: [], tasks: [],
  },
  {
    id: "d5", brandId: "b_mate", title: "Set premium personalizado", contactName: "Diego Ferreyra", contactHandle: "+54 9 341 622-7788",
    channel: "whatsapp", value: 54000, currency: "ARS", stageId: "st_ganado", responsible: "ag_sofi", source: "WhatsApp", tags: ["retail"], createdAt: days(6),
    notes: [{ id: "n2", text: "Cerró y pagó. Coordinar grabado láser.", at: days(1) }], tasks: [],
  },
  {
    id: "d6", brandId: "b_kapeta", title: "Reventa temporada invierno", contactName: "Local Urbano", contactHandle: "@urbano.store",
    channel: "instagram", value: 260000, currency: "ARS", stageId: "st_negociacion", responsible: "ag_ivan", source: "Instagram", tags: ["mayorista"], createdAt: days(3), expectedClose: inDays(5),
    notes: [], tasks: [{ id: "t4", text: "Definir descuento por volumen", due: inDays(2), done: false }],
  },
  {
    id: "d7", brandId: "b_petit", title: "Ajuar completo", contactName: "Carla Domínguez", contactHandle: "+54 9 11 2211-5566",
    channel: "whatsapp", value: 89900, currency: "ARS", stageId: "st_propuesta", responsible: "ag_juli", source: "WhatsApp", tags: ["retail"], createdAt: days(2),
    notes: [], tasks: [],
  },
  {
    id: "d8", brandId: "b_lunar", title: "Consulta que no avanzó", contactName: "Anónimo IG", contactHandle: "@user_2891",
    channel: "instagram", value: 24900, currency: "ARS", stageId: "st_perdido", responsible: "ag_marto", source: "Instagram", tags: [], createdAt: days(7),
    notes: [{ id: "n3", text: "No respondió más. Marcado como perdido.", at: days(3) }], tasks: [],
  },
];

export const products: Product[] = [
  { id: "p1", brandId: "b_lunar", name: "Sérum Vitamina C 30ml", price: 24900, currency: "ARS", emoji: "🧴", description: "Antioxidante, unifica el tono y aporta luminosidad.", available: true, category: "Skincare" },
  { id: "p2", brandId: "b_lunar", name: "Crema hidratante noche", price: 18900, currency: "ARS", emoji: "🌙", description: "Hidratación profunda de reparación nocturna.", available: true, category: "Skincare" },
  { id: "p3", brandId: "b_lunar", name: "Protector solar FPS50", price: 27500, currency: "ARS", emoji: "☀️", description: "Protección alta, toque seco, no deja residuo blanco.", available: false, category: "Protección" },
  { id: "p4", brandId: "b_kapeta", name: "Buzo oversize frisa", price: 32900, currency: "ARS", emoji: "🧥", description: "Frisa premium, calce oversize. Talles S al XXL.", available: true, category: "Indumentaria" },
  { id: "p5", brandId: "b_kapeta", name: "Jean mom fit", price: 41200, currency: "ARS", emoji: "👖", description: "Tiro alto, calce mom. Denim rígido.", available: true, category: "Indumentaria" },
  { id: "p6", brandId: "b_mate", name: "Mate imperial premium", price: 21900, currency: "ARS", emoji: "🧉", description: "Calabaza forrada en cuero, virola de alpaca.", available: true, category: "Mates" },
  { id: "p7", brandId: "b_mate", name: "Combo mate + bombilla + yerbera", price: 27600, currency: "ARS", emoji: "🎁", description: "El combo ideal para regalar.", available: true, category: "Combos" },
  { id: "p8", brandId: "b_petit", name: "Juego de sábanas king", price: 54900, currency: "ARS", emoji: "🛏️", description: "Algodón 400 hilos, incluye fundas.", available: true, category: "Hogar" },
];

export const businessLabels: BusinessLabel[] = [
  { id: "lb1", name: "Nuevo cliente", color: "#16a34a" },
  { id: "lb2", name: "Pago pendiente", color: "#f59e0b" },
  { id: "lb3", name: "Pedido nuevo", color: "#598bff" },
  { id: "lb4", name: "Mayorista", color: "#8b5cf6" },
  { id: "lb5", name: "VIP", color: "#d946ef" },
  { id: "lb6", name: "Reclamo", color: "#ef4444" },
];

export const broadcasts: Broadcast[] = [
  { id: "bc1", brandId: "b_lunar", name: "Novedades de skincare", channel: "whatsapp", audienceLabel: "Clientes con etiqueta VIP", recipients: 320, text: "¡Llegó lo nuevo! 🌟 15% OFF exclusivo para vos con el código VIP15.", scheduledFor: inDays(1), status: "programada" },
  { id: "bc2", brandId: "b_mate", name: "Difusión día del amigo", channel: "whatsapp", audienceLabel: "Base completa", recipients: 1240, text: "Se viene el día del amigo 🧉 Reservá tu combo con envío gratis.", status: "borrador" },
  { id: "bc3", brandId: "b_kapeta", name: "Preventa invierno", channel: "whatsapp", audienceLabel: "Compradores 2025", recipients: 860, text: "Preventa exclusiva de la colección invierno ❄️ 24 hs antes que nadie.", scheduledFor: days(2), status: "enviada" },
];
