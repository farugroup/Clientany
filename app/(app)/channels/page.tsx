"use client";

import { useState } from "react";
import {
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  X,
  Store,
  Radio,
  Infinity as InfinityIcon,
  Check,
} from "lucide-react";
import { channelMeta, platformMeta, connectionStatusMeta } from "@/lib/channels";
import { useApp, brandById } from "@/lib/store";
import { useData } from "@/lib/data-store";
import { timeAgo, num } from "@/lib/format";
import { SectionTitle, StatusDot } from "@/components/ui";
import type { ChannelType, StorePlatform } from "@/lib/types";

const addableChannels: ChannelType[] = [
  "whatsapp",
  "instagram",
  "messenger",
  "mercadolibre",
  "tiktok",
  "email",
  "webchat",
];
const addablePlatforms: StorePlatform[] = [
  "tiendanube",
  "shopify",
  "vtex",
  "vendany",
  "woocommerce",
  "mshops",
];

export default function ChannelsPage() {
  const activeBrandId = useApp((s) => s.activeBrandId);
  const channels = useData((s) => s.channels);
  const storeConnections = useData((s) => s.stores);
  const brands = useData((s) => s.brands);
  const removeChannel = useData((s) => s.removeChannel);
  const removeStore = useData((s) => s.removeStore);
  const [modal, setModal] = useState<null | "channel" | "store">(null);

  const inBrand = <T extends { brandId: string }>(arr: T[]) =>
    activeBrandId === "all" ? arr : arr.filter((i) => i.brandId === activeBrandId);

  const myChannels = inBrand(channels);
  const myStores = inBrand(storeConnections);

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
      {/* Header banner */}
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15">
            <InfinityIcon className="h-6 w-6 text-brand-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Canales & Tiendas ilimitados</h2>
            <p className="mt-0.5 max-w-2xl text-sm text-ink-400">
              Sumá tantos WhatsApp, Instagram, Mercado Libre y tiendas como necesites. Todo queda
              organizado por marca y lo intercambiás con un clic desde el panel.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => setModal("channel")} className="btn-primary">
            <Plus className="h-4 w-4" /> Canal
          </button>
          <button onClick={() => setModal("store")} className="btn-ghost">
            <Store className="h-4 w-4" /> Tienda
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Canales conectados", value: myChannels.filter((c) => c.status === "connected").length, accent: "#3563ff" },
          { label: "Tiendas conectadas", value: myStores.filter((s) => s.status === "connected").length, accent: "#16a34a" },
          { label: "Mensajes sin leer", value: num(myChannels.reduce((s, c) => s + c.unread, 0)), accent: "#f59e0b" },
          { label: "Marcas", value: activeBrandId === "all" ? brands.length : 1, accent: "#d946ef" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-2xl font-extrabold text-white">{s.value}</div>
            <div className="mt-0.5 text-xs text-ink-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Channels list */}
      <div>
        <SectionTitle title="Canales de mensajería" icon={Radio} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {myChannels.map((c) => {
            const meta = channelMeta[c.type];
            const Icon = meta.icon;
            const status = connectionStatusMeta[c.status];
            const brand = brandById(c.brandId);
            return (
              <div key={c.id} className="card p-4 transition hover:border-ink-600">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ background: meta.bg }}
                    >
                      <Icon className="h-5 w-5" style={{ color: meta.color }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{meta.label}</div>
                      <div className="text-xs text-ink-400">{c.label}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusDot color={status.dot} />
                    <span className="text-[11px] font-medium" style={{ color: status.color }}>
                      {status.label}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-ink-800 pt-3">
                  <div className="flex items-center gap-2 text-xs text-ink-400">
                    <span
                      className="chip"
                      style={{ background: `${brand?.color}22`, color: brand?.color }}
                    >
                      {brand?.logo} {brand?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-ink-500">
                    <RefreshCw className="h-3 w-3" /> {timeAgo(c.lastSync)}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <a href="/ajustes" className="btn-ghost flex-1 py-2 text-xs">
                    <Settings2 className="h-3.5 w-3.5" /> Configurar
                  </a>
                  <button
                    onClick={() => {
                      if (confirm(`¿Quitar el canal ${meta.label} (${c.label})?`)) removeChannel(c.id);
                    }}
                    className="btn-ghost px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          {/* Add card */}
          <button
            onClick={() => setModal("channel")}
            className="flex min-h-[168px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-700 text-ink-400 transition hover:border-brand-500/50 hover:text-brand-300"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-ink-600">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">Sumar canal</span>
          </button>
        </div>
      </div>

      {/* Stores list */}
      <div>
        <SectionTitle title="Tiendas & plataformas de ecommerce" icon={Store} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {myStores.map((s) => {
            const meta = platformMeta[s.platform];
            const status = connectionStatusMeta[s.status];
            const brand = brandById(s.brandId);
            return (
              <div key={s.id} className="card p-4 transition hover:border-ink-600">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-xl"
                      style={{ background: `${meta.color}1f` }}
                    >
                      {meta.logo}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{meta.label}</div>
                      <div className="text-xs text-ink-400">{s.url}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusDot color={status.dot} />
                    <button
                      onClick={() => {
                        if (confirm(`¿Quitar la tienda ${meta.label} (${s.url})?`)) removeStore(s.id);
                      }}
                      className="rounded-lg p-1 text-ink-500 hover:bg-red-500/10 hover:text-red-400"
                      title="Quitar tienda"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-ink-850 p-2 text-center">
                    <div className="text-lg font-bold text-white">{s.ordersToday}</div>
                    <div className="text-[10px] text-ink-400">ventas hoy</div>
                  </div>
                  <div className="rounded-lg bg-ink-850 p-2 text-center">
                    <div className="text-lg font-bold text-amber-400">{s.abandonedCarts}</div>
                    <div className="text-[10px] text-ink-400">carritos</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-ink-800 pt-3">
                  <span
                    className="chip"
                    style={{ background: `${brand?.color}22`, color: brand?.color }}
                  >
                    {brand?.logo} {brand?.name}
                  </span>
                  <span className="text-[11px] font-medium" style={{ color: status.color }}>
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })}
          <button
            onClick={() => setModal("store")}
            className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-700 text-ink-400 transition hover:border-brand-500/50 hover:text-brand-300"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-ink-600">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">Conectar tienda</span>
          </button>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <ConnectModal type={modal} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function ConnectModal({
  type,
  onClose,
}: {
  type: "channel" | "store";
  onClose: () => void;
}) {
  const brands = useData((s) => s.brands);
  const addChannel = useData((s) => s.addChannel);
  const addStore = useData((s) => s.addStore);
  const activeBrandId = useApp((s) => s.activeBrandId);

  const defaultBrand = activeBrandId !== "all" ? activeBrandId : brands[0]?.id ?? "";
  const [selected, setSelected] = useState<string | null>(null);
  const [brandId, setBrandId] = useState(defaultBrand);
  const [identifier, setIdentifier] = useState("");
  const [done, setDone] = useState(false);

  const canSave = selected && brandId && identifier.trim();

  function save() {
    if (!selected || !brandId) return;
    if (type === "channel") {
      addChannel({
        brandId,
        type: selected as ChannelType,
        label: identifier,
        status: "pending",
      });
    } else {
      addStore({
        brandId,
        platform: selected as StorePlatform,
        storeName: identifier,
        url: identifier,
        status: "pending",
      });
    }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg animate-fade-in overflow-y-auto rounded-t-3xl border border-ink-700 bg-ink-900 p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            {type === "channel" ? "Conectar un canal" : "Conectar una tienda"}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
              <Check className="h-7 w-7 text-green-400" />
            </div>
            <p className="mt-3 font-semibold text-white">¡{type === "channel" ? "Canal" : "Tienda"} agregado!</p>
            <p className="mt-1 text-sm text-ink-400">
              Quedó en estado <b>pendiente</b>. Cargá las credenciales en Configuración para
              activar la sincronización.
            </p>
            <div className="mt-4 flex gap-2">
              <a href="/ajustes" className="btn-primary flex-1">
                Ir a Configuración
              </a>
              <button onClick={onClose} className="btn-ghost flex-1">
                Listo
              </button>
            </div>
          </div>
        ) : brands.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-ink-300">Primero creá una marca para asociarle el canal.</p>
            <a href="/marcas" className="btn-primary mt-4 w-full">
              Crear una marca
            </a>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-400">
              Elegí la plataforma. Podés sumar tantas como quieras, sin límite.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {type === "channel"
                ? addableChannels.map((ch) => {
                    const meta = channelMeta[ch];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={ch}
                        onClick={() => setSelected(ch)}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition ${
                          selected === ch
                            ? "border-brand-500 bg-brand-500/10"
                            : "border-ink-700 bg-ink-850 hover:border-ink-600"
                        }`}
                      >
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-lg"
                          style={{ background: meta.bg }}
                        >
                          <Icon className="h-5 w-5" style={{ color: meta.color }} />
                        </div>
                        <span className="text-xs font-medium text-white">{meta.label}</span>
                      </button>
                    );
                  })
                : addablePlatforms.map((pf) => {
                    const meta = platformMeta[pf];
                    return (
                      <button
                        key={pf}
                        onClick={() => setSelected(pf)}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition ${
                          selected === pf
                            ? "border-brand-500 bg-brand-500/10"
                            : "border-ink-700 bg-ink-850 hover:border-ink-600"
                        }`}
                      >
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                          style={{ background: `${meta.color}1f` }}
                        >
                          {meta.logo}
                        </div>
                        <span className="text-xs font-medium text-white">{meta.label}</span>
                      </button>
                    );
                  })}
            </div>

            {selected && (
              <div className="mt-4 space-y-3 border-t border-ink-800 pt-4">
                <div>
                  <div className="label mb-1.5">Marca</div>
                  <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="input">
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.logo} {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="label mb-1.5">
                    {type === "channel"
                      ? "Número / usuario del canal"
                      : "Dominio o nombre de la tienda"}
                  </div>
                  <input
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      type === "channel" ? "+54 9 11 5555-1234 o @miusuario" : "mitienda.com.ar"
                    }
                    className="input"
                  />
                </div>
              </div>
            )}

            <button disabled={!canSave} onClick={save} className="btn-primary mt-4 w-full">
              Agregar {type === "channel" ? "canal" : "tienda"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
