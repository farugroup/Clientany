"use client";

import { useState } from "react";
import {
  ShoppingCart,
  TrendingUp,
  Send,
  Zap,
  Clock,
  Check,
  MessageCircle,
  Mail,
  X,
  RefreshCw,
} from "lucide-react";
import { platformMeta, channelMeta } from "@/lib/channels";
import { useApp, brandById } from "@/lib/store";
import { useData } from "@/lib/data-store";
import { money, compactMoney, timeAgo, pct } from "@/lib/format";
import { StatCard, SectionTitle, Pill } from "@/components/ui";
import type { AbandonedCart } from "@/lib/types";

const statusMeta: Record<
  AbandonedCart["recoveryStatus"],
  { label: string; color: string; bg: string }
> = {
  nuevo: { label: "Nuevo", color: "#f59e0b", bg: "rgba(245,158,11,0.14)" },
  contactado: { label: "Contactado", color: "#598bff", bg: "rgba(89,139,255,0.14)" },
  recuperado: { label: "Recuperado", color: "#16a34a", bg: "rgba(22,163,74,0.14)" },
  perdido: { label: "Perdido", color: "#9aa3c0", bg: "rgba(154,163,192,0.14)" },
};

const flowSteps = [
  { delay: "A los 30 min", channel: "whatsapp", text: "Mensaje amigable: “¿Te quedó algo en el carrito?” con link directo." },
  { delay: "A las 4 horas", channel: "email", text: "Email con los productos + envío gratis desde $X." },
  { delay: "A las 24 horas", channel: "whatsapp", text: "Último aviso con cupón de 10% OFF por tiempo limitado." },
];

export default function CarritosPage() {
  const activeBrandId = useApp((s) => s.activeBrandId);
  const carts = useData((s) => s.carts);
  const updateCart = useData((s) => s.updateCart);
  const [filter, setFilter] = useState<"todos" | AbandonedCart["recoveryStatus"]>("todos");
  const [modalCart, setModalCart] = useState<AbandonedCart | null>(null);

  const inBrand = activeBrandId === "all" ? carts : carts.filter((c) => c.brandId === activeBrandId);
  const filtered = filter === "todos" ? inBrand : inBrand.filter((c) => c.recoveryStatus === filter);

  const totalValue = inBrand.reduce((s, c) => s + c.total, 0);
  const recoverable = inBrand
    .filter((c) => c.recoveryStatus === "nuevo" || c.recoveryStatus === "contactado")
    .reduce((s, c) => s + c.total, 0);
  const recovered = inBrand.filter((c) => c.recoveryStatus === "recuperado");
  const recoveredValue = recovered.reduce((s, c) => s + c.total, 0);
  const recoveryRate = pct(recovered.length, inBrand.length);

  function markContacted(id: string) {
    updateCart(id, { recoveryStatus: "contactado" });
    setModalCart(null);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 animate-fade-in">
      {/* Hero */}
      <div className="card overflow-hidden">
        <div className="relative flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, #f59e0b, transparent 70%)" }}
          />
          <div className="relative flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15">
              <ShoppingCart className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Recuperador de carritos</h2>
              <p className="mt-0.5 max-w-2xl text-sm text-ink-400">
                Nos conectamos a tu Tienda Nube, Shopify, VTEX, Vendany y más, detectamos las ventas
                perdidas y las convertimos automáticamente por WhatsApp y email.
              </p>
            </div>
          </div>
          <div className="relative rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
            <div className="text-xs text-ink-400">Por recuperar ahora</div>
            <div className="text-2xl font-extrabold text-amber-400">{compactMoney(recoverable)}</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Carritos abandonados" value={String(inBrand.length)} icon={ShoppingCart} accent="#f59e0b" sub="últimas 24 hs" />
        <StatCard label="Valor total en riesgo" value={compactMoney(totalValue)} icon={TrendingUp} accent="#ef4444" />
        <StatCard label="Recuperado" value={compactMoney(recoveredValue)} icon={Check} accent="#16a34a" trend="18%" trendUp sub={`${recovered.length} ventas`} />
        <StatCard label="Tasa de recuperación" value={recoveryRate} icon={Zap} accent="#3563ff" sub="con flujos automáticos" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Carts list */}
        <div className="lg:col-span-2">
          <SectionTitle
            title="Carritos detectados"
            icon={ShoppingCart}
            action={
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
                {(["todos", "nuevo", "contactado", "recuperado", "perdido"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`chip shrink-0 border capitalize ${
                      filter === f
                        ? "border-brand-500/40 bg-brand-500/15 text-brand-200"
                        : "border-ink-700 bg-ink-850 text-ink-300"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            }
          />
          <div className="space-y-2.5">
            {filtered.map((c) => {
              const pf = platformMeta[c.platform];
              const st = statusMeta[c.recoveryStatus];
              const ch = channelMeta[c.channelSuggested];
              const brand = brandById(c.brandId);
              return (
                <div key={c.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                        style={{ background: `${pf.color}1f` }}
                      >
                        {pf.logo}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{c.customerName}</span>
                          <Pill color={st.color} bg={st.bg}>{st.label}</Pill>
                        </div>
                        <div className="text-xs text-ink-400">{c.email}</div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500">
                          <span className="chip bg-ink-800 text-ink-300">{pf.label}</span>
                          {activeBrandId === "all" && (
                            <span className="chip bg-ink-800 text-ink-300">
                              {brand?.logo} {brand?.name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {timeAgo(c.abandonedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-white">
                        {money(c.total, c.currency)}
                      </div>
                      <div className="text-[11px] text-ink-500">
                        {c.items.reduce((s, i) => s + i.qty, 0)} productos
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-ink-800 pt-3">
                    <div className="flex items-center gap-1.5 text-xs text-ink-400">
                      <span className="text-ink-500">Canal sugerido:</span>
                      <span className="flex items-center gap-1" style={{ color: ch.color }}>
                        <ch.icon className="h-3.5 w-3.5" /> {ch.label}
                      </span>
                    </div>
                    {c.recoveryStatus === "recuperado" ? (
                      <span className="chip bg-green-500/10 text-green-400">
                        <Check className="h-3 w-3" /> Venta recuperada
                      </span>
                    ) : c.recoveryStatus === "perdido" ? (
                      <span className="text-xs text-ink-500">Sin respuesta</span>
                    ) : c.recoveryStatus === "contactado" ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => updateCart(c.id, { recoveryStatus: "recuperado" })}
                          className="btn-soft px-3 py-1.5 text-xs"
                        >
                          <Check className="h-3.5 w-3.5" /> Recuperado
                        </button>
                        <button onClick={() => setModalCart(c)} className="btn-ghost px-3 py-1.5 text-xs">
                          <Send className="h-3.5 w-3.5" /> Reenviar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setModalCart(c)}
                        className="btn-primary px-3 py-1.5 text-xs"
                      >
                        <Send className="h-3.5 w-3.5" /> Recuperar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="card py-10 text-center text-sm text-ink-400">
                No hay carritos con este estado 🎉
              </div>
            )}
          </div>
        </div>

        {/* Automation flow */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="mb-1 flex items-center gap-2">
              <Zap className="h-[18px] w-[18px] text-brand-300" />
              <h3 className="text-sm font-bold text-white">Flujo automático activo</h3>
            </div>
            <p className="text-xs text-ink-400">
              Cada carrito abandonado dispara esta secuencia hasta recuperar la venta.
            </p>
            <div className="mt-4 space-y-3">
              {flowSteps.map((s, i) => {
                const ch = channelMeta[s.channel as keyof typeof channelMeta];
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ background: ch.bg }}
                      >
                        <ch.icon className="h-4 w-4" style={{ color: ch.color }} />
                      </div>
                      {i < flowSteps.length - 1 && <div className="w-0.5 flex-1 bg-ink-700" style={{ minHeight: 20 }} />}
                    </div>
                    <div className="pb-2">
                      <div className="text-xs font-semibold text-white">{s.delay}</div>
                      <p className="text-xs text-ink-400">{s.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="btn-ghost mt-2 w-full py-2 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Editar secuencia
            </button>
          </div>

          <div className="card bg-gradient-to-br from-brand-500/10 to-transparent p-5">
            <div className="text-sm font-bold text-white">💡 Tip de conversión</div>
            <p className="mt-1 text-xs text-ink-300">
              Los carritos recuperados por WhatsApp dentro de la primera hora convierten hasta 3x
              más que por email. Clientany prioriza el canal con mejor respuesta por cliente.
            </p>
          </div>
        </div>
      </div>

      {modalCart && (
        <RecoverModal cart={modalCart} onClose={() => setModalCart(null)} onSend={markContacted} />
      )}
    </div>
  );
}

function RecoverModal({
  cart,
  onClose,
  onSend,
}: {
  cart: AbandonedCart;
  onClose: () => void;
  onSend: (id: string) => void;
}) {
  const ch = channelMeta[cart.channelSuggested];
  const [channel, setChannel] = useState<"whatsapp" | "email">(
    cart.channelSuggested === "email" ? "email" : "whatsapp"
  );
  const first = cart.customerName.split(" ")[0];
  const msg = `¡Hola ${first}! 👋 Vimos que dejaste ${cart.items.length > 1 ? "unos productos" : "un producto"} en tu carrito 🛒 Te lo guardamos. Terminá tu compra acá 👉 ${cart.checkoutUrl}${
    channel === "whatsapp" ? " ¡Y tenés envío gratis si comprás hoy! 🚚" : ""
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md animate-fade-in rounded-t-3xl border border-ink-700 bg-ink-900 p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Recuperar carrito</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3 rounded-xl bg-ink-850 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-white">{cart.customerName}</span>
            <span className="font-bold text-white">{money(cart.total, cart.currency)}</span>
          </div>
          <div className="mt-2 space-y-1">
            {cart.items.map((it, i) => (
              <div key={i} className="flex justify-between text-xs text-ink-300">
                <span>{it.name}</span>
                <span>{money(it.price, cart.currency)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setChannel("whatsapp")}
            className={`chip flex-1 justify-center border py-2 ${
              channel === "whatsapp"
                ? "border-green-500/40 bg-green-500/10 text-green-400"
                : "border-ink-700 bg-ink-850 text-ink-300"
            }`}
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </button>
          <button
            onClick={() => setChannel("email")}
            className={`chip flex-1 justify-center border py-2 ${
              channel === "email"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                : "border-ink-700 bg-ink-850 text-ink-300"
            }`}
          >
            <Mail className="h-4 w-4" /> Email
          </button>
        </div>

        <textarea
          defaultValue={msg}
          rows={4}
          className="input mt-3 resize-none text-sm"
        />

        <button onClick={() => onSend(cart.id)} className="btn-primary mt-3 w-full">
          <Send className="h-4 w-4" /> Enviar por {channel === "whatsapp" ? "WhatsApp" : "email"}
        </button>
      </div>
    </div>
  );
}
