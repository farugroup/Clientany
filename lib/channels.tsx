import type { ChannelType, StorePlatform, OrderStatus, ConnectionStatus } from "./types";
import {
  MessageCircle,
  Instagram,
  ShoppingBag,
  Mail,
  Facebook,
  Music2,
  Globe,
  type LucideIcon,
} from "lucide-react";

export const channelMeta: Record<
  ChannelType,
  { label: string; icon: LucideIcon; color: string; bg: string }
> = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "#25D366", bg: "rgba(37,211,102,0.12)" },
  instagram: { label: "Instagram", icon: Instagram, color: "#E1306C", bg: "rgba(225,48,108,0.12)" },
  messenger: { label: "Messenger", icon: Facebook, color: "#0084FF", bg: "rgba(0,132,255,0.12)" },
  mercadolibre: { label: "Mercado Libre", icon: ShoppingBag, color: "#FFE600", bg: "rgba(255,230,0,0.14)" },
  tiktok: { label: "TikTok", icon: Music2, color: "#69C9D0", bg: "rgba(105,201,208,0.12)" },
  email: { label: "Email", icon: Mail, color: "#EA8B00", bg: "rgba(234,139,0,0.12)" },
  webchat: { label: "Web Chat", icon: Globe, color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
};

export const platformMeta: Record<
  StorePlatform,
  { label: string; logo: string; color: string }
> = {
  tiendanube: { label: "Tienda Nube", logo: "🛍️", color: "#2C6EF2" },
  shopify: { label: "Shopify", logo: "🛒", color: "#95BF47" },
  vtex: { label: "VTEX", logo: "🏬", color: "#F71963" },
  vendany: { label: "Vendany", logo: "🏪", color: "#7C3AED" },
  woocommerce: { label: "WooCommerce", logo: "🧩", color: "#96588A" },
  mshops: { label: "Mercado Shops", logo: "💛", color: "#FFE600" },
};

export const orderStatusMeta: Record<
  OrderStatus,
  { label: string; color: string; bg: string }
> = {
  confirmado: { label: "Confirmado", color: "#9aa3c0", bg: "rgba(154,163,192,0.14)" },
  preparacion: { label: "En preparación", color: "#f59e0b", bg: "rgba(245,158,11,0.14)" },
  despachado: { label: "Despachado", color: "#3563ff", bg: "rgba(53,99,255,0.16)" },
  en_camino: { label: "En viaje", color: "#598bff", bg: "rgba(89,139,255,0.16)" },
  en_reparto: { label: "En reparto", color: "#8b5cf6", bg: "rgba(139,92,246,0.16)" },
  entregado: { label: "Entregado", color: "#16a34a", bg: "rgba(22,163,74,0.16)" },
  demorado: { label: "Demorado", color: "#ef4444", bg: "rgba(239,68,68,0.16)" },
};

export const connectionStatusMeta: Record<
  ConnectionStatus,
  { label: string; color: string; dot: string }
> = {
  connected: { label: "Conectado", color: "#16a34a", dot: "#16a34a" },
  syncing: { label: "Sincronizando", color: "#f59e0b", dot: "#f59e0b" },
  error: { label: "Error", color: "#ef4444", dot: "#ef4444" },
  pending: { label: "Pendiente", color: "#9aa3c0", dot: "#9aa3c0" },
};
