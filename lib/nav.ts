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
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: "inbox" | "carts" | "ml";
  group: "principal" | "canales" | "crecimiento" | "cuenta";
}

export const navItems: NavItem[] = [
  { href: "/", label: "Panel", icon: LayoutDashboard, group: "principal" },
  { href: "/inbox", label: "Bandeja unificada", icon: Inbox, badgeKey: "inbox", group: "principal" },
  { href: "/channels", label: "Canales & Tiendas", icon: Plug, group: "canales" },
  { href: "/mercadolibre", label: "Mercado Libre", icon: Tag, badgeKey: "ml", group: "canales" },
  { href: "/tracking", label: "Seguí tu envío", icon: Truck, group: "crecimiento" },
  { href: "/carritos", label: "Recuperador de carritos", icon: ShoppingCart, badgeKey: "carts", group: "crecimiento" },
  { href: "/campanas", label: "Campañas & Lead Magnet", icon: Megaphone, group: "crecimiento" },
  { href: "/marcas", label: "Marcas", icon: Building2, group: "crecimiento" },
  { href: "/ajustes", label: "Configuración", icon: Settings, group: "cuenta" },
];

export const groupLabels: Record<NavItem["group"], string> = {
  principal: "Principal",
  canales: "Canales",
  crecimiento: "Crecimiento",
  cuenta: "Cuenta",
};
