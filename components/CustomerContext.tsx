"use client";

import { useState } from "react";
import {
  ShoppingBag,
  UserPlus,
  X,
  Wallet,
  Package,
  Receipt,
  CalendarDays,
  ExternalLink,
  Truck,
  Sparkles,
  BadgeCheck,
  Store,
} from "lucide-react";
import { useData } from "@/lib/data-store";
import { buildCustomerProfile, isTiendanubeConnected } from "@/lib/customers";
import { orderStatusMeta } from "@/lib/channels";
import { money, compactMoney, dateTime, timeAgo, shortDate } from "@/lib/format";
import { Pill } from "@/components/ui";
import type { Conversation } from "@/lib/types";

// Heurística simple: ¿el handle parece un teléfono?
function looksLikePhone(handle: string) {
  return (handle.match(/\d/g) ?? []).length >= 7;
}

export default function CustomerContext({ conversation }: { conversation: Conversation }) {
  const orders = useData((s) => s.orders);
  const stores = useData((s) => s.stores);
  const integrations = useData((s) => s.integrations);
  const [open, setOpen] = useState(false);

  const phone = looksLikePhone(conversation.handle) ? conversation.handle : "";
  const profile = buildCustomerProfile(orders, { phone, name: conversation.customerName });
  const tnConnected = isTiendanubeConnected(stores, integrations, conversation.brandId);

  return (
    <>
      {/* Banner compacto */}
      <div className="flex items-center gap-2 border-b border-ink-800 bg-ink-900/60 px-4 py-2">
        {profile.isCustomer ? (
          <>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-500/15">
              <ShoppingBag className="h-4 w-4 text-green-400" />
            </div>
            <div className="min-w-0 flex-1 truncate text-xs text-ink-300">
              <span className="font-semibold text-white">Cliente</span> ·{" "}
              {profile.orderCount} {profile.orderCount === 1 ? "compra" : "compras"} ·{" "}
              <span className="font-semibold text-green-400">
                {money(profile.totalSpent, profile.currency)}
              </span>{" "}
              gastados
              {profile.lastOrder && (
                <>
                  {" · último: "}
                  <span className="font-mono text-ink-200">{profile.lastOrder.orderNumber}</span>{" "}
                  ({money(profile.lastOrder.total, profile.currency)})
                </>
              )}
            </div>
            <button
              onClick={() => setOpen(true)}
              className="shrink-0 rounded-lg bg-brand-500/15 px-2.5 py-1 text-xs font-semibold text-brand-300 hover:bg-brand-500/25"
            >
              Ver ficha
            </button>
          </>
        ) : (
          <>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-800">
              <UserPlus className="h-4 w-4 text-ink-400" />
            </div>
            <div className="min-w-0 flex-1 truncate text-xs text-ink-400">
              <span className="font-semibold text-ink-200">Contacto nuevo</span> — sin compras
              registradas{tnConnected ? " en Tienda Nube" : ""}.
            </div>
            {!tnConnected && (
              <a href="/ajustes" className="shrink-0 text-xs font-semibold text-brand-300 hover:text-brand-200">
                Conectar Tienda Nube
              </a>
            )}
          </>
        )}
      </div>

      {/* Drawer ficha 360 */}
      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="h-full w-full max-w-md animate-fade-in overflow-y-auto border-l border-ink-700 bg-ink-900">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-800 bg-ink-900/95 p-4 backdrop-blur">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-green-400" />
                <h3 className="text-base font-bold text-white">Ficha del cliente</h3>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              {/* Identidad */}
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-800 text-2xl">
                  {conversation.avatar}
                </span>
                <div className="min-w-0">
                  <div className="text-base font-bold text-white">{conversation.customerName}</div>
                  <div className="truncate text-xs text-ink-400">{conversation.handle}</div>
                </div>
              </div>

              {/* Fuente */}
              <div className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-850 p-2.5 text-xs">
                <Store className="h-4 w-4 text-brand-300" />
                <span className="text-ink-300">
                  Detectado por{" "}
                  <b className="text-white">{profile.matchedBy === "telefono" ? "número de celular" : "nombre"}</b>
                </span>
                {isConnectedTag(conversation)}
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 gap-2">
                <Kpi icon={Wallet} color="#16a34a" label="Total gastado (LTV)" value={money(profile.totalSpent, profile.currency)} />
                <Kpi icon={Package} color="#3563ff" label="Compras" value={String(profile.orderCount)} />
                <Kpi icon={Receipt} color="#f59e0b" label="Ticket promedio" value={money(profile.avgTicket, profile.currency)} />
                <Kpi icon={CalendarDays} color="#8b5cf6" label="Cliente desde" value={profile.firstOrderAt ? shortDate(profile.firstOrderAt) : "—"} />
              </div>

              {/* Último pedido destacado */}
              {profile.lastOrder && (
                <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-brand-300">Última compra</span>
                    {(() => {
                      const st = orderStatusMeta[profile.lastOrder.status];
                      return <Pill color={st.color} bg={st.bg}>{st.label}</Pill>;
                    })()}
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <div>
                      <div className="font-mono text-sm text-ink-200">{profile.lastOrder.orderNumber}</div>
                      <div className="text-xs text-ink-400">{dateTime(profile.lastOrder.createdAt)}</div>
                    </div>
                    <div className="text-2xl font-extrabold text-white">
                      {money(profile.lastOrder.total, profile.currency)}
                    </div>
                  </div>
                  <a
                    href={`/tracking?q=${profile.lastOrder.orderNumber}`}
                    className="btn-soft mt-3 w-full py-2 text-xs"
                  >
                    <Truck className="h-3.5 w-3.5" /> Ver seguimiento
                  </a>
                </div>
              )}

              {/* Historial */}
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
                  <Package className="h-4 w-4 text-brand-300" /> Historial de compras
                </div>
                <div className="space-y-2">
                  {profile.orders.map((o) => {
                    const st = orderStatusMeta[o.status];
                    return (
                      <a
                        key={o.id}
                        href={`/tracking?q=${o.orderNumber}`}
                        className="block rounded-xl border border-ink-700 bg-ink-850 p-3 transition hover:border-ink-600"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold text-ink-200">{o.orderNumber}</span>
                          <span className="text-sm font-bold text-white">{money(o.total, o.currency)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="truncate text-xs text-ink-400">
                            {o.items.map((i) => i.name).join(", ")}
                          </span>
                          <Pill color={st.color} bg={st.bg}>{st.label}</Pill>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-ink-500">
                          <span>{shortDate(o.createdAt)}</span>
                          <span className="flex items-center gap-1">
                            {o.carrier} <ExternalLink className="h-3 w-3" />
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Sugerencia de asesoramiento */}
              <div className="rounded-2xl border border-ink-700 bg-gradient-to-br from-brand-500/10 to-transparent p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Sparkles className="h-4 w-4 text-brand-300" /> Para asesorar mejor
                </div>
                <p className="mt-1 text-xs text-ink-300">{advice(profile)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function isConnectedTag(_conversation: Conversation) {
  return (
    <span className="ml-auto flex items-center gap-1 rounded-full bg-ink-800 px-2 py-0.5 text-[10px] text-ink-300">
      🛍️ Tienda Nube
    </span>
  );
}

function advice(p: ReturnType<typeof buildCustomerProfile>): string {
  if (!p.isCustomer) return "Es un contacto nuevo: ofrecele una primera compra y capturá su email para futuras campañas.";
  if (p.orderCount >= 3) return `Cliente recurrente (${p.orderCount} compras, ${compactMoney(p.totalSpent)}). Tratalo como VIP: ofrecele beneficios y acceso anticipado.`;
  if (p.lastOrder && (p.lastOrder.status === "demorado")) return "Su último envío está demorado: adelantate, avisale el estado y ofrecé una solución antes de que reclame.";
  if (p.lastOrder && p.lastOrder.status === "entregado") return "Su último pedido ya fue entregado: buen momento para recomendar un producto complementario (cross-sell).";
  return "Tiene un pedido en curso: mantené el seguimiento del envío al día para evitar consultas.";
}

function Kpi({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: typeof Wallet;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-850 p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-[10px] uppercase tracking-wide text-ink-500">{label}</span>
      </div>
      <div className="mt-1 text-lg font-extrabold text-white">{value}</div>
    </div>
  );
}
