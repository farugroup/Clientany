// ============================================================
// Clientany · menú de la app.
// Grupos, nombres y rutas EXACTAMENTE como «Textos y nombres de pantalla»
// de docs/CRM.md. Si cambia un nombre, cambia allá primero.
// ============================================================
import {
  LayoutDashboard,
  Inbox,
  Users,
  Package,
  Boxes,
  Bot,
  MessageSquareText,
  Filter,
  Truck,
  ShoppingCart,
  Megaphone,
  Send,
  Tag,
  Building2,
  Plug,
  UsersRound,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavGroup = "principal" | "automatizacion" | "crecimiento" | "cuenta";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: "inbox" | "carts" | "ml";
  group: NavGroup;
}

export const navItems: NavItem[] = [
  // Principal
  { href: "/panel", label: "Panel", icon: LayoutDashboard, group: "principal" },
  { href: "/inbox", label: "Bandeja", icon: Inbox, badgeKey: "inbox", group: "principal" },
  { href: "/clientes", label: "Clientes", icon: Users, group: "principal" },
  { href: "/pedidos", label: "Pedidos", icon: Package, group: "principal" },
  { href: "/stock", label: "Stock", icon: Boxes, group: "principal" },
  // Automatización
  { href: "/automaticas", label: "Respuestas automáticas", icon: Bot, group: "automatizacion" },
  { href: "/plantillas", label: "Plantillas y rápidas", icon: MessageSquareText, group: "automatizacion" },
  { href: "/embudo", label: "Embudo", icon: Filter, group: "automatizacion" },
  // Crecimiento
  { href: "/tracking", label: "Seguí tu envío", icon: Truck, group: "crecimiento" },
  { href: "/carritos", label: "Recuperador de carritos", icon: ShoppingCart, badgeKey: "carts", group: "crecimiento" },
  { href: "/campanas", label: "Campañas", icon: Megaphone, group: "crecimiento" },
  { href: "/difusion", label: "Difusión", icon: Send, group: "crecimiento" },
  { href: "/mercadolibre", label: "Mercado Libre", icon: Tag, badgeKey: "ml", group: "crecimiento" },
  { href: "/marcas", label: "Marcas", icon: Building2, group: "crecimiento" },
  // Cuenta
  { href: "/conexiones", label: "Conexiones", icon: Plug, group: "cuenta" },
  { href: "/equipo", label: "Equipo", icon: UsersRound, group: "cuenta" },
  { href: "/ajustes", label: "Configuración", icon: Settings, group: "cuenta" },
];

export const navGroups: NavGroup[] = ["principal", "automatizacion", "crecimiento", "cuenta"];

export const groupLabels: Record<NavGroup, string> = {
  principal: "Principal",
  automatizacion: "Automatización",
  crecimiento: "Crecimiento",
  cuenta: "Cuenta",
};

// ¿Este ítem es el de la pantalla actual? `/panel` sólo coincide exacto;
// el resto, por prefijo de ruta (sin confundir `/stock` con `/stockx`).
export function esRutaActiva(href: string, pathname: string | null | undefined): boolean {
  const p = pathname || "";
  if (href === "/panel") return p === "/panel";
  return p === href || p.startsWith(href + "/");
}

// El ítem del menú de la pantalla actual (o undefined si no está en el menú).
export function itemActual(pathname: string | null | undefined): NavItem | undefined {
  return navItems.find((n) => esRutaActiva(n.href, pathname));
}
