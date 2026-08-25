import {
  LayoutDashboard,
  Inbox,
  Plug,
  Truck,
  ShoppingCart,
  Tag,
  Megaphone,
  Building2,
  Settings,
  Filter,
  Headphones,
  BookOpen,
  Send,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: "inbox" | "carts" | "ml";
  group: "principal" | "ventas" | "canales" | "crecimiento" | "cuenta";
}

export const navItems: NavItem[] = [
  { href: "/panel", label: "Panel", icon: LayoutDashboard, group: "principal" },
  { href: "/inbox", label: "Bandeja & Tickets", icon: Inbox, badgeKey: "inbox", group: "principal" },
  { href: "/embudo", label: "Embudo de ventas", icon: Filter, group: "ventas" },
  { href: "/atencion", label: "Atención & Chatbot", icon: Headphones, group: "ventas" },
  { href: "/channels", label: "Canales & Tiendas", icon: Plug, group: "canales" },
  { href: "/catalogo", label: "WhatsApp Business", icon: BookOpen, group: "canales" },
  { href: "/mercadolibre", label: "Mercado Libre", icon: Tag, badgeKey: "ml", group: "canales" },
  { href: "/tracking", label: "Seguí tu envío", icon: Truck, group: "crecimiento" },
  { href: "/carritos", label: "Recuperador de carritos", icon: ShoppingCart, badgeKey: "carts", group: "crecimiento" },
  { href: "/campanas", label: "Campañas & Lead Magnet", icon: Megaphone, group: "crecimiento" },
  { href: "/difusion", label: "Difusión masiva", icon: Send, group: "crecimiento" },
  { href: "/marcas", label: "Marcas", icon: Building2, group: "crecimiento" },
  { href: "/ajustes", label: "Configuración", icon: Settings, group: "cuenta" },
];

export const groupLabels: Record<NavItem["group"], string> = {
  principal: "Principal",
  ventas: "Ventas & Atención",
  canales: "Canales",
  crecimiento: "Crecimiento",
  cuenta: "Cuenta",
};
