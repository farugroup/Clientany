import type { Order, OrderStatus, TrackingEvent } from "./types";
import { genId } from "./data-store";

const STATUS_FLOW: OrderStatus[] = [
  "confirmado",
  "preparacion",
  "despachado",
  "en_camino",
  "en_reparto",
  "entregado",
];

const STATUS_LABELS: Record<OrderStatus, { label: string; detail: string }> = {
  confirmado: { label: "Pedido confirmado", detail: "Recibimos tu pago" },
  preparacion: { label: "En preparación", detail: "Preparando tu pedido" },
  despachado: { label: "Despachado", detail: "Entregado al correo" },
  en_camino: { label: "En viaje", detail: "Tu pedido va en camino" },
  en_reparto: { label: "En reparto", detail: "Salió a reparto a tu domicilio" },
  entregado: { label: "Entregado", detail: "Entrega realizada" },
  demorado: { label: "Demora en tránsito", detail: "El envío registra una demora" },
};

// Build a plausible timeline from a current status, marking prior steps done.
export function buildTimeline(status: OrderStatus, createdAtISO: string): TrackingEvent[] {
  const created = new Date(createdAtISO).getTime();
  const now = Date.now();

  if (status === "demorado") {
    const flow: OrderStatus[] = ["confirmado", "preparacion", "despachado", "demorado", "en_reparto", "entregado"];
    const currentIdx = 3;
    return flow.map((s, i) => {
      const done = i <= currentIdx;
      const t = created + ((now - created) * i) / Math.max(1, flow.length - 1);
      return {
        status: s,
        label: STATUS_LABELS[s].label,
        detail: STATUS_LABELS[s].detail,
        timestamp: new Date(done ? t : now + (i - currentIdx) * 86400000).toISOString(),
        done,
      };
    });
  }

  const currentIdx = STATUS_FLOW.indexOf(status);
  return STATUS_FLOW.map((s, i) => {
    const done = i <= currentIdx;
    const t = created + ((now - created) * i) / Math.max(1, currentIdx || 1);
    return {
      status: s,
      label: STATUS_LABELS[s].label,
      detail: STATUS_LABELS[s].detail,
      timestamp: new Date(done ? t : now + (i - currentIdx) * 86400000).toISOString(),
      done,
    };
  });
}

export interface ManualOrderInput {
  orderNumber: string;
  brandId: string;
  customerName: string;
  email: string;
  phone: string;
  status: OrderStatus;
  carrier: string;
  trackingCode: string;
  trackingUrl: string;
  total: number;
  currency: string;
  destination: string;
  items: string; // comma-separated
}

export function buildOrder(input: ManualOrderInput): Order {
  const createdAt = new Date(Date.now() - 2 * 86400000).toISOString();
  return {
    id: genId("o"),
    orderNumber: input.orderNumber,
    brandId: input.brandId,
    customerName: input.customerName,
    email: input.email,
    phone: input.phone,
    status: input.status,
    carrier: input.carrier || "A definir",
    trackingCode: input.trackingCode,
    trackingUrl: input.trackingUrl || "#",
    eta: new Date(Date.now() + 2 * 86400000).toISOString(),
    total: input.total || 0,
    currency: input.currency || "ARS",
    items: input.items
      ? input.items.split(",").map((n) => ({ name: n.trim(), qty: 1 })).filter((i) => i.name)
      : [],
    createdAt,
    destination: input.destination,
    timeline: buildTimeline(input.status, createdAt),
  };
}

// Parse a simple CSV: numero,nombre,email,telefono,estado,correo,tracking,total,destino
export function parseOrdersCsv(text: string, brandId: string): Order[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  // Skip header if it looks like one.
  const start = /numero|orden|order|email|nombre/i.test(lines[0]) ? 1 : 0;
  const validStatuses = new Set<string>([...STATUS_FLOW, "demorado"]);
  const orders: Order[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (cols.length < 2) continue;
    const [numero, nombre, email = "", telefono = "", estado = "confirmado", correo = "", tracking = "", total = "0", destino = ""] = cols;
    const status = (validStatuses.has(estado) ? estado : "confirmado") as OrderStatus;
    orders.push(
      buildOrder({
        orderNumber: numero,
        brandId,
        customerName: nombre,
        email,
        phone: telefono,
        status,
        carrier: correo,
        trackingCode: tracking,
        trackingUrl: "#",
        total: Number(total.replace(/[^\d]/g, "")) || 0,
        currency: "ARS",
        destination: destino,
        items: "",
      })
    );
  }
  return orders;
}
