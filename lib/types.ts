export type ChannelType =
  | "whatsapp"
  | "instagram"
  | "messenger"
  | "mercadolibre"
  | "tiktok"
  | "email"
  | "webchat";

export type StorePlatform =
  | "tiendanube"
  | "shopify"
  | "vtex"
  | "vendany"
  | "woocommerce"
  | "mshops";

export type ConnectionStatus = "connected" | "syncing" | "error" | "pending";

export interface Brand {
  id: string;
  name: string;
  handle: string;
  color: string; // hex accent
  logo: string; // emoji or letter
  industry: string;
}

export interface Channel {
  id: string;
  brandId: string;
  type: ChannelType;
  label: string; // e.g. "+54 9 11 5555-1234" or "@marca.oficial"
  status: ConnectionStatus;
  unread: number;
  lastSync: string; // ISO
}

export interface StoreConnection {
  id: string;
  brandId: string;
  platform: StorePlatform;
  storeName: string;
  url: string;
  status: ConnectionStatus;
  ordersToday: number;
  abandonedCarts: number;
}

export interface TicketNote {
  id: string;
  text: string;
  author: string;
  at: string;
}

export interface Conversation {
  id: string;
  brandId: string;
  channel: ChannelType;
  channelId: string;
  customerName: string;
  handle: string;
  avatar: string; // emoji
  lastMessage: string;
  unread: number;
  timestamp: string; // ISO
  status: "open" | "pending" | "closed";
  tags: string[];
  assignedTo?: string; // agent id
  orderNumber?: string;
  // Helpdesk / Whaticket
  queueId?: string;
  protocol?: string;
  internalNotes?: TicketNote[];
  rating?: number; // CSAT 1-5
}

export interface Message {
  id: string;
  from: "customer" | "agent" | "bot";
  text: string;
  timestamp: string;
  author?: string;
}

export type OrderStatus =
  | "confirmado"
  | "preparacion"
  | "despachado"
  | "en_camino"
  | "en_reparto"
  | "entregado"
  | "demorado";

export interface TrackingEvent {
  status: OrderStatus;
  label: string;
  detail: string;
  timestamp: string;
  location?: string;
  done: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  brandId: string;
  customerName: string;
  email: string;
  phone: string;
  status: OrderStatus;
  carrier: string;
  trackingCode: string;
  trackingUrl: string;
  eta: string;
  total: number;
  currency: string;
  items: { name: string; qty: number }[];
  createdAt: string;
  timeline: TrackingEvent[];
  destination: string;
}

export interface AbandonedCart {
  id: string;
  brandId: string;
  platform: StorePlatform;
  customerName: string;
  email: string;
  phone?: string;
  total: number;
  currency: string;
  items: { name: string; qty: number; price: number }[];
  abandonedAt: string; // ISO
  recoveryStatus: "nuevo" | "contactado" | "recuperado" | "perdido";
  channelSuggested: ChannelType;
  checkoutUrl: string;
}

export interface MLQuestion {
  id: string;
  brandId: string;
  type: "pregunta" | "mensaje" | "reclamo";
  itemTitle: string;
  itemImage: string;
  customerName: string;
  text: string;
  timestamp: string;
  answered: boolean;
  price: number;
}

export interface Lead {
  id: string;
  brandId: string;
  name: string;
  email: string;
  phone?: string;
  source: "mercadolibre" | "leadmagnet" | "carrito" | "webchat" | "manual";
  tags: string[];
  capturedAt: string;
  consentEmail: boolean;
  consentWhatsapp: boolean;
}

export interface Campaign {
  id: string;
  brandId: string;
  name: string;
  channel: "email" | "whatsapp";
  status: "borrador" | "programada" | "enviando" | "enviada";
  audience: string;
  audienceSize: number;
  scheduledFor?: string;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  revenue: number;
}

// ---- Configuración del negocio e integraciones ----
export interface BusinessSettings {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  country: string;
  currency: string;
  timezone: string;
}

export type IntegrationKey =
  | "whatsapp"
  | "meta"
  | "mercadolibre"
  | "tiendanube"
  | "shopify"
  | "vtex"
  | "vendany"
  | "email";

// Credenciales guardadas por el cliente para cada integración.
// Los valores son sensibles: se guardan en el navegador del cliente (demo)
// y en producción viajan cifrados al backend.
export interface IntegrationConfig {
  key: IntegrationKey;
  enabled: boolean;
  fields: Record<string, string>;
  connectedAt?: string;
}

export type ChecklistKey =
  | "perfil"
  | "marca"
  | "canal"
  | "tienda"
  | "pedido"
  | "campana";

// ---- Embudo de ventas (Kommo) ----
export interface PipelineStage {
  id: string;
  name: string;
  color: string;
}

export interface DealTask {
  id: string;
  text: string;
  due: string;
  done: boolean;
}

export interface DealNote {
  id: string;
  text: string;
  at: string;
}

export interface Deal {
  id: string;
  brandId: string;
  title: string;
  contactName: string;
  contactHandle: string;
  channel: ChannelType;
  value: number;
  currency: string;
  stageId: string;
  responsible: string; // agent id
  source: string;
  tags: string[];
  createdAt: string;
  expectedClose?: string;
  notes: DealNote[];
  tasks: DealTask[];
}

// ---- Helpdesk (Whaticket) ----
export type AgentRole = "admin" | "supervisor" | "agente";

export interface Agent {
  id: string;
  name: string;
  email: string;
  role: AgentRole;
  online: boolean;
  avatar: string;
}

export interface Queue {
  id: string;
  name: string;
  color: string;
  autoAssign: boolean;
}

export interface QuickReply {
  id: string;
  shortcut: string; // e.g. /envio
  text: string;
}

export interface BusinessHoursDay {
  day: string;
  open: boolean;
  from: string;
  to: string;
}

export interface HelpdeskSettings {
  hours: BusinessHoursDay[];
  greetingEnabled: boolean;
  greetingMessage: string;
  awayEnabled: boolean;
  awayMessage: string;
  chatbotEnabled: boolean;
  chatbotMenu: { key: string; label: string; queueId: string }[];
  csatEnabled: boolean;
  csatMessage: string;
}

// ---- Catálogo (WhatsApp Business) ----
export interface Product {
  id: string;
  brandId: string;
  name: string;
  price: number;
  currency: string;
  emoji: string;
  description: string;
  available: boolean;
  category: string;
}

export interface BusinessLabel {
  id: string;
  name: string;
  color: string;
}

export type BroadcastStatus = "borrador" | "programada" | "enviada";

export interface Broadcast {
  id: string;
  brandId: string;
  name: string;
  channel: ChannelType;
  audienceLabel: string;
  recipients: number;
  text: string;
  scheduledFor?: string;
  status: BroadcastStatus;
}
