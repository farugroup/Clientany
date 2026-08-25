import type { Order, StoreConnection, IntegrationConfig } from "./types";

// Normaliza un teléfono a sus últimos 10 dígitos para comparar de forma robusta
// (ignora +54, 9, 0, guiones, espacios, paréntesis, etc.).
export function normalizePhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  return digits.slice(-10);
}

export interface CustomerProfile {
  isCustomer: boolean;
  matchedBy: "telefono" | "nombre" | null;
  phone: string;
  orders: Order[]; // ordenados del más reciente al más antiguo
  orderCount: number;
  totalSpent: number;
  avgTicket: number;
  currency: string;
  firstOrderAt?: string;
  lastOrder?: Order;
}

// Detecta si el contacto (por su celular) es cliente y arma su perfil de compra.
export function buildCustomerProfile(
  allOrders: Order[],
  opts: { phone?: string; name?: string }
): CustomerProfile {
  const phoneKey = opts.phone ? normalizePhone(opts.phone) : "";
  let matchedBy: CustomerProfile["matchedBy"] = null;

  let matches: Order[] = [];
  if (phoneKey && phoneKey.length >= 8) {
    matches = allOrders.filter((o) => normalizePhone(o.phone) === phoneKey);
    if (matches.length) matchedBy = "telefono";
  }
  // Fallback por nombre exacto si no hubo match por teléfono.
  if (!matches.length && opts.name) {
    const n = opts.name.trim().toLowerCase();
    matches = allOrders.filter((o) => o.customerName.trim().toLowerCase() === n);
    if (matches.length) matchedBy = "nombre";
  }

  const orders = [...matches].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const totalSpent = orders.reduce((s, o) => s + o.total, 0);
  const orderCount = orders.length;

  return {
    isCustomer: orderCount > 0,
    matchedBy,
    phone: opts.phone ?? "",
    orders,
    orderCount,
    totalSpent,
    avgTicket: orderCount ? Math.round(totalSpent / orderCount) : 0,
    currency: orders[0]?.currency ?? "ARS",
    firstOrderAt: orders.length ? orders[orders.length - 1].createdAt : undefined,
    lastOrder: orders[0],
  };
}

// ¿Está conectada Tienda Nube para esta marca? (por integración guardada o por
// una tienda Tienda Nube sincronizada).
export function isTiendanubeConnected(
  stores: StoreConnection[],
  integrations: Record<string, IntegrationConfig>,
  brandId?: string
): boolean {
  if (integrations["tiendanube"]?.enabled) return true;
  return stores.some(
    (s) =>
      s.platform === "tiendanube" &&
      s.status === "connected" &&
      (!brandId || s.brandId === brandId)
  );
}
