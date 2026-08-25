"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Truck,
  Package,
  Copy,
  ExternalLink,
  Send,
  Sparkles,
  MessageCircle,
  Mail,
  Link2,
  Loader2,
} from "lucide-react";
import type { Order } from "@/lib/types";
import { orderStatusMeta } from "@/lib/channels";
import { useApp, brandById } from "@/lib/store";
import { money, dateTime } from "@/lib/format";
import { Pill, EmptyState } from "@/components/ui";
import TrackingTimeline from "@/components/TrackingTimeline";

function TrackingInner() {
  const activeBrandId = useApp((s) => s.activeBrandId);
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Order[] | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);

  async function search(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setResults(null);
    setSelected(null);
    const res = await fetch(`/api/track?q=${encodeURIComponent(q)}&brandId=${activeBrandId}`);
    const data = await res.json();
    setResults(data.results ?? []);
    if (data.results?.length) setSelected(data.results[0]);
    setLoading(false);
  }

  useEffect(() => {
    if (params.get("q")) search(params.get("q")!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trackingLink = selected
    ? `https://clientany.app/track/${selected.orderNumber}`
    : "";

  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-fade-in">
      {/* Search hero */}
      <div className="card overflow-hidden">
        <div className="relative p-5 lg:p-6">
          <div
            className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, #598bff, transparent 70%)" }}
          />
          <div className="relative flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15">
              <Truck className="h-6 w-6 text-brand-300" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white">Seguí tu envío</h2>
              <p className="mt-0.5 text-sm text-ink-400">
                Buscá cualquier pedido por <b className="text-ink-200">número de orden</b>,{" "}
                <b className="text-ink-200">nombre y apellido</b> o{" "}
                <b className="text-ink-200">email</b> y respondele al cliente en tiempo real.
              </p>
            </div>
          </div>
          <form
            className="relative mt-4 flex flex-col gap-2 sm:flex-row"
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
                placeholder="Ej: LUN-10428, valen.sosa@gmail.com o Valentina Sosa"
                className="input pl-9"
              />
            </div>
            <button type="submit" className="btn-primary sm:w-40" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar pedido
            </button>
          </form>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-xs text-ink-500">Probá:</span>
            {["LUN-10428", "MATE-5567", "flor.benitez@gmail.com"].map((s) => (
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
        </div>
      </div>

      {loading && (
        <div className="card flex items-center justify-center gap-2 py-16 text-sm text-ink-400">
          <Loader2 className="h-5 w-5 animate-spin text-brand-300" /> Buscando en tus tiendas y
          correos…
        </div>
      )}

      {results && results.length === 0 && !loading && (
        <EmptyState
          icon={Package}
          title="No encontramos ese pedido"
          desc="Revisá el número de orden, el email o el nombre. También podés probar con el código de seguimiento del correo."
        />
      )}

      {selected && !loading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Results list */}
          {results && results.length > 1 && (
            <div className="lg:col-span-5">
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {results.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSelected(o)}
                    className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs transition ${
                      selected.id === o.id
                        ? "border-brand-500 bg-brand-500/10"
                        : "border-ink-700 bg-ink-850 hover:border-ink-600"
                    }`}
                  >
                    <div className="font-mono font-semibold text-white">{o.orderNumber}</div>
                    <div className="text-ink-400">{o.customerName}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Order detail */}
          <div className="card p-5 lg:col-span-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white">
                    {selected.orderNumber}
                  </span>
                  {(() => {
                    const m = orderStatusMeta[selected.status];
                    return <Pill color={m.color} bg={m.bg}>{m.label}</Pill>;
                  })()}
                </div>
                <div className="mt-1 text-lg font-bold text-white">{selected.customerName}</div>
                <div className="text-xs text-ink-400">
                  {brandById(selected.brandId)?.logo} {brandById(selected.brandId)?.name} ·{" "}
                  {dateTime(selected.createdAt)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-ink-400">Total</div>
                <div className="text-lg font-bold text-white">
                  {money(selected.total, selected.currency)}
                </div>
              </div>
            </div>

            {/* Carrier row */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <InfoBox label="Correo" value={selected.carrier} />
              <InfoBox label="Seguimiento" value={selected.trackingCode} mono />
              <InfoBox label="Destino" value={selected.destination} />
              <InfoBox label="Entrega estimada" value={dateTime(selected.eta).split(",")[0]} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={selected.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-soft"
              >
                <ExternalLink className="h-4 w-4" /> Ver en {selected.carrier}
              </a>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(trackingLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                }}
                className="btn-ghost"
              >
                {copied ? <Link2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                {copied ? "¡Link copiado!" : "Copiar link de seguimiento"}
              </button>
            </div>

            {/* Items */}
            <div className="mt-4 border-t border-ink-800 pt-3">
              <div className="label mb-2">Productos</div>
              <div className="space-y-1.5">
                {selected.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-ink-200">{it.name}</span>
                    <span className="text-ink-400">x{it.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline + auto-reply */}
          <div className="space-y-4 lg:col-span-2">
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Package className="h-[18px] w-[18px] text-brand-300" />
                <h3 className="text-sm font-bold text-white">Estado del envío en tiempo real</h3>
              </div>
              <TrackingTimeline order={selected} />
            </div>

            {/* Auto reply */}
            <div className="card p-5">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-[18px] w-[18px] text-brand-300" />
                <h3 className="text-sm font-bold text-white">Respuesta automática</h3>
              </div>
              <div className="rounded-xl border border-ink-700 bg-ink-850 p-3 text-sm text-ink-200">
                ¡Hola {selected.customerName.split(" ")[0]}! 📦 Tu pedido{" "}
                <b>{selected.orderNumber}</b> está{" "}
                <b>{orderStatusMeta[selected.status].label.toLowerCase()}</b> con{" "}
                {selected.carrier}. Seguilo acá 👉 {trackingLink}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="btn-primary py-2 text-xs">
                  <MessageCircle className="h-3.5 w-3.5" /> Enviar por WhatsApp
                </button>
                <button className="btn-ghost py-2 text-xs">
                  <Mail className="h-3.5 w-3.5" /> Enviar por email
                </button>
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-ink-500">
                <Send className="h-3 w-3" /> El cliente también puede autoconsultarlo en tu web
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBox({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-ink-850 p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-ink-500">{label}</div>
      <div className={`mt-0.5 truncate text-sm font-semibold text-white ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </div>
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-400">Cargando…</div>}>
      <TrackingInner />
    </Suspense>
  );
}
