"use client";

import { useState } from "react";
import {
  Building2,
  Plus,
  X,
  Check,
  Radio,
  Store,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { brands, channels, storeConnections, conversations } from "@/lib/mock-data";
import { channelMeta, platformMeta } from "@/lib/channels";
import { useApp } from "@/lib/store";
import { SectionTitle } from "@/components/ui";

const emojis = ["🌙", "🧥", "🧉", "🏠", "👟", "💄", "🎁", "☕", "🍫", "🐾", "📚", "🌿"];
const colors = ["#d946ef", "#3563ff", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

export default function MarcasPage() {
  const setActiveBrand = useApp((s) => s.setActiveBrand);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="mx-auto max-w-7xl space-y-5 animate-fade-in">
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15">
            <Building2 className="h-6 w-6 text-brand-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Tus marcas</h2>
            <p className="mt-0.5 max-w-2xl text-sm text-ink-400">
              Gestioná todas tus marcas desde una sola cuenta. Cada una con sus propios canales,
              tiendas y equipo. Cambiá entre ellas con un clic desde el panel.
            </p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary shrink-0">
          <Plus className="h-4 w-4" /> Nueva marca
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {brands.map((b) => {
          const chs = channels.filter((c) => c.brandId === b.id);
          const stores = storeConnections.filter((s) => s.brandId === b.id);
          const convos = conversations.filter((c) => c.brandId === b.id);
          const unread = chs.reduce((s, c) => s + c.unread, 0);
          const uniqueChannelTypes = Array.from(new Set(chs.map((c) => c.type)));
          return (
            <div key={b.id} className="card overflow-hidden">
              <div
                className="h-2 w-full"
                style={{ background: `linear-gradient(90deg, ${b.color}, transparent)` }}
              />
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                      style={{ background: `${b.color}22` }}
                    >
                      {b.logo}
                    </div>
                    <div>
                      <div className="text-base font-bold text-white">{b.name}</div>
                      <div className="text-xs text-ink-400">{b.handle}</div>
                    </div>
                  </div>
                  {unread > 0 && (
                    <span className="chip bg-brand-500/15 text-brand-300">{unread} sin leer</span>
                  )}
                </div>
                <div className="mt-2 text-xs text-ink-400">{b.industry}</div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <MiniStat icon={Radio} value={chs.length} label="canales" />
                  <MiniStat icon={Store} value={stores.length} label="tiendas" />
                  <MiniStat icon={MessageSquare} value={convos.length} label="chats" />
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {uniqueChannelTypes.map((t) => {
                    const meta = channelMeta[t];
                    return (
                      <span
                        key={t}
                        className="flex h-7 w-7 items-center justify-center rounded-lg"
                        style={{ background: meta.bg }}
                        title={meta.label}
                      >
                        <meta.icon className="h-4 w-4" style={{ color: meta.color }} />
                      </span>
                    );
                  })}
                  {stores.map((s) => (
                    <span
                      key={s.id}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
                      style={{ background: `${platformMeta[s.platform].color}1f` }}
                      title={platformMeta[s.platform].label}
                    >
                      {platformMeta[s.platform].logo}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setActiveBrand(b.id);
                  }}
                  className="btn-ghost mt-4 w-full py-2 text-sm"
                >
                  Entrar a esta marca <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}

        <button
          onClick={() => setShowNew(true)}
          className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-700 text-ink-400 transition hover:border-brand-500/50 hover:text-brand-300"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-ink-600">
            <Plus className="h-6 w-6" />
          </div>
          <span className="text-sm font-semibold">Sumar nueva marca</span>
          <span className="text-xs text-ink-500">Sin límite de marcas</span>
        </button>
      </div>

      {showNew && <NewBrandModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

function MiniStat({ icon: Icon, value, label }: { icon: typeof Radio; value: number; label: string }) {
  return (
    <div className="rounded-xl bg-ink-850 p-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-lg font-bold text-white">
        <Icon className="h-4 w-4 text-ink-400" /> {value}
      </div>
      <div className="text-[10px] text-ink-400">{label}</div>
    </div>
  );
}

function NewBrandModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(emojis[0]);
  const [color, setColor] = useState(colors[0]);
  const [done, setDone] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md animate-fade-in rounded-t-3xl border border-ink-700 bg-ink-900 p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Nueva marca</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
              <Check className="h-7 w-7 text-green-400" />
            </div>
            <p className="mt-3 font-semibold text-white">¡Marca creada!</p>
            <p className="mt-1 text-sm text-ink-400">
              Ahora conectá sus canales y tiendas para empezar a vender.
            </p>
            <a href="/channels" className="btn-primary mt-4 w-full">
              Conectar canales
            </a>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
                style={{ background: `${color}22` }}
              >
                {emoji}
              </div>
              <div className="flex-1">
                <div className="label mb-1.5">Nombre de la marca</div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Mi Tienda"
                  className="input"
                />
              </div>
            </div>

            <div>
              <div className="label mb-1.5">Ícono</div>
              <div className="flex flex-wrap gap-1.5">
                {emojis.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition ${
                      emoji === e ? "bg-brand-500/20 ring-2 ring-brand-500" : "bg-ink-850"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="label mb-1.5">Color</div>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full transition ${
                      color === c ? "ring-2 ring-white ring-offset-2 ring-offset-ink-900" : ""
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={() => setDone(true)}
              disabled={!name.trim()}
              className="btn-primary w-full"
            >
              Crear marca
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
