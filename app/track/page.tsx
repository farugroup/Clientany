"use client";

import { useState, Suspense } from "react";
import {
  Search,
  Package,
  Truck,
  ExternalLink,
  Loader2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import type { Order } from "@/lib/types";
import { orderStatusMeta } from "@/lib/channels";
import { money, dateTime } from "@/lib/format";
import TrackingTimeline from "@/components/TrackingTimeline";
import { Pill } from "@/components/ui";

function PublicTrackInner() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function search(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setOrder(null);
    setNotFound(false);
    const res = await fetch(`/api/track?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (data.results?.length) setOrder(data.results[0]);
    else setNotFound(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-ink-950">
      {/* Top bar */}
      <header className="border-b border-ink-800 bg-ink-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white">Lunar Cosmética</span>
          </div>
          <span className="chip bg-ink-800 text-ink-300">
            <ShieldCheck className="h-3 w-3 text-green-400" /> Seguimiento oficial
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15">
            <Truck className="h-7 w-7 text-brand-300" />
          </div>
          <h1 className="mt-3 text-2xl font-extrabold text-white">Seguí tu envío</h1>
          <p className="mt-1 text-sm text-ink-400">
            Ingresá tu número de orden, email o nombre para ver el estado de tu pedido en tiempo
            real.
          </p>
        </div>

        <form
          className="mx-auto mt-6 flex max-w-xl flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            search(query);
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nº de orden, email o nombre"
              className="input pl-9"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Rastrear
          </button>
        </form>
        <div className="mx-auto mt-2 flex max-w-xl flex-wrap justify-center gap-1.5">
          <span className="text-xs text-ink-500">Ejemplo:</span>
          {["LUN-10428", "MATE-5567"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setQuery(s);
                search(s);
              }}
              className="chip border border-ink-700 bg-ink-850 text-ink-300 hover:text-white"
            >
              {s}
            </button>
          ))}
        </div>

        {notFound && (
          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 p-8 text-center">
            <Package className="mx-auto h-8 w-8 text-ink-500" />
            <p className="mt-2 text-sm text-ink-300">
              No encontramos tu pedido. Revisá los datos o escribinos por WhatsApp.
            </p>
          </div>
        )}

        {order && (
          <div className="mt-8 space-y-4">
            <div className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white">
                    {order.orderNumber}
                  </span>
                  {(() => {
                    const m = orderStatusMeta[order.status];
                    return <Pill color={m.color} bg={m.bg}>{m.label}</Pill>;
                  })()}
                </div>
                <span className="text-sm font-semibold text-white">
                  {money(order.total, order.currency)}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <div>
                  <div className="text-[10px] uppercase text-ink-500">Correo</div>
                  <div className="text-ink-200">{order.carrier}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-ink-500">Destino</div>
                  <div className="text-ink-200">{order.destination}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-ink-500">Entrega estimada</div>
                  <div className="text-ink-200">{dateTime(order.eta).split(",")[0]}</div>
                </div>
              </div>
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-soft mt-4 w-full"
              >
                <ExternalLink className="h-4 w-4" /> Ver detalle en {order.carrier}
              </a>
            </div>

            <div className="card p-5">
              <h3 className="mb-3 text-sm font-bold text-white">Estado de tu pedido</h3>
              <TrackingTimeline order={order} />
            </div>

            <p className="text-center text-xs text-ink-500">
              ¿Dudas con tu pedido? Escribinos por WhatsApp y te respondemos al instante.
            </p>
          </div>
        )}

        <div className="mt-12 text-center text-xs text-ink-600">
          Seguimiento potenciado por{" "}
          <span className="font-semibold text-ink-400">Clientany</span> · CRM multicanal para
          ecommerce
        </div>
      </main>
    </div>
  );
}

export default function PublicTrackPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-400">Cargando…</div>}>
      <PublicTrackInner />
    </Suspense>
  );
}
