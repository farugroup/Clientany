"use client";

import { useState } from "react";
import {
  BookOpen,
  Package,
  Tag,
  Link2,
  QrCode,
  Plus,
  Trash2,
  X,
  Copy,
  Check,
  Store,
  Clock,
  MessageCircle,
} from "lucide-react";
import { useData } from "@/lib/data-store";
import { useApp, brandById } from "@/lib/store";
import { money } from "@/lib/format";
import { SectionTitle } from "@/components/ui";
import type { Product } from "@/lib/types";

const tabs = [
  { key: "catalogo", label: "Catálogo", icon: Package },
  { key: "perfil", label: "Perfil de empresa", icon: Store },
  { key: "etiquetas", label: "Etiquetas", icon: Tag },
  { key: "link", label: "Link & QR", icon: Link2 },
] as const;

export default function CatalogoPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("catalogo");

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-fade-in">
      <div className="card flex items-start gap-3 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/15 text-2xl">
          💬
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">WhatsApp Business</h2>
          <p className="mt-0.5 text-sm text-ink-400">
            Todo lo que hace WhatsApp Business, potenciado: catálogo de productos, perfil de empresa,
            etiquetas, mensajes automáticos y tu link/QR de contacto.
          </p>
        </div>
      </div>

      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`chip shrink-0 gap-1.5 border px-3.5 py-2 ${
              tab === t.key
                ? "border-brand-500/40 bg-brand-500/15 text-brand-200"
                : "border-ink-700 bg-ink-850 text-ink-300"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "catalogo" && <CatalogoTab />}
      {tab === "perfil" && <PerfilTab />}
      {tab === "etiquetas" && <EtiquetasTab />}
      {tab === "link" && <LinkTab />}
    </div>
  );
}

function CatalogoTab() {
  const activeBrandId = useApp((s) => s.activeBrandId);
  const products = useData((s) => s.products);
  const removeProduct = useData((s) => s.removeProduct);
  const updateProduct = useData((s) => s.updateProduct);
  const [show, setShow] = useState(false);

  const myProducts = activeBrandId === "all" ? products : products.filter((p) => p.brandId === activeBrandId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle title={`Productos (${myProducts.length})`} icon={Package} />
        <button onClick={() => setShow(true)} className="btn-soft px-3 py-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Agregar producto
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {myProducts.map((p) => {
          const brand = brandById(p.brandId);
          return (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-ink-800 text-2xl">
                  {p.emoji}
                </div>
                <button
                  onClick={() => removeProduct(p.id)}
                  className="rounded-lg p-1.5 text-ink-500 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 text-sm font-semibold text-white">{p.name}</div>
              <p className="mt-0.5 line-clamp-2 text-xs text-ink-400">{p.description}</p>
              <div className="mt-2 text-lg font-bold text-white">{money(p.price, p.currency)}</div>
              <div className="mt-3 flex items-center justify-between border-t border-ink-800 pt-2.5">
                <span className="chip bg-ink-800 text-[10px] text-ink-300">
                  {brand?.logo} {p.category}
                </span>
                <button
                  onClick={() => updateProduct(p.id, { available: !p.available })}
                  className={`chip ${p.available ? "bg-green-500/10 text-green-400" : "bg-ink-800 text-ink-500"}`}
                >
                  {p.available ? "Disponible" : "Sin stock"}
                </button>
              </div>
            </div>
          );
        })}
        <button
          onClick={() => setShow(true)}
          className="flex min-h-[190px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-700 text-ink-400 transition hover:border-brand-500/50 hover:text-brand-300"
        >
          <Plus className="h-6 w-6" />
          <span className="text-sm font-medium">Agregar producto</span>
        </button>
      </div>
      {show && <NewProductModal onClose={() => setShow(false)} />}
    </div>
  );
}

function NewProductModal({ onClose }: { onClose: () => void }) {
  const brands = useData((s) => s.brands);
  const addProduct = useData((s) => s.addProduct);
  const activeBrandId = useApp((s) => s.activeBrandId);
  const emojis = ["📦", "🧴", "🧥", "👖", "🧉", "🎁", "🛏️", "👟", "💄", "☕", "🍫", "🌿"];
  const [brandId, setBrandId] = useState(activeBrandId !== "all" ? activeBrandId : brands[0]?.id ?? "");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [emoji, setEmoji] = useState(emojis[0]);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md animate-fade-in rounded-t-3xl border border-ink-700 bg-ink-900 p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Nuevo producto</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        {brands.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-ink-300">Creá una marca antes de cargar productos.</p>
            <a href="/marcas" className="btn-primary mt-4 w-full">Crear una marca</a>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div>
              <div className="label mb-1.5">Ícono</div>
              <div className="flex flex-wrap gap-1.5">
                {emojis.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${emoji === e ? "bg-brand-500/20 ring-2 ring-brand-500" : "bg-ink-850"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="label mb-1.5">Nombre</div>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Ej: Remera oversize" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="label mb-1.5">Precio (ARS)</div>
                <input value={price} onChange={(e) => setPrice(e.target.value)} className="input" placeholder="19900" />
              </div>
              <div>
                <div className="label mb-1.5">Categoría</div>
                <input value={category} onChange={(e) => setCategory(e.target.value)} className="input" />
              </div>
            </div>
            <div>
              <div className="label mb-1.5">Descripción</div>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input resize-none" />
            </div>
            <div>
              <div className="label mb-1.5">Marca</div>
              <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="input">
                {brands.map((b) => <option key={b.id} value={b.id}>{b.logo} {b.name}</option>)}
              </select>
            </div>
            <button
              disabled={!name.trim() || !brandId}
              onClick={() => {
                addProduct({
                  brandId,
                  name,
                  price: Number(price.replace(/[^\d]/g, "")) || 0,
                  currency: "ARS",
                  emoji,
                  description,
                  available: true,
                  category,
                });
                onClose();
              }}
              className="btn-primary w-full"
            >
              Agregar al catálogo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PerfilTab() {
  const settings = useData((s) => s.settings);
  const helpdesk = useData((s) => s.helpdesk);
  const brands = useData((s) => s.brands);
  const activeBrandId = useApp((s) => s.activeBrandId);
  const brand = activeBrandId !== "all" ? brandById(activeBrandId) : brands[0];

  return (
    <div className="space-y-4">
      <SectionTitle title="Perfil de empresa" icon={Store} />
      <div className="card overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-brand-500/30 to-fuchsia-500/20" />
        <div className="px-5 pb-5">
          <div className="-mt-8 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-ink-900 bg-ink-800 text-3xl">
            {brand?.logo ?? "🏪"}
          </div>
          <div className="mt-2 text-lg font-bold text-white">
            {brand?.name ?? settings.businessName ?? "Tu negocio"}
          </div>
          <div className="text-sm text-ink-400">{brand?.industry ?? "Ecommerce"}</div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ProfileRow icon={<Store className="h-4 w-4 text-brand-300" />} label="Categoría" value={brand?.industry ?? "Tienda online"} />
            <ProfileRow icon={<MessageCircle className="h-4 w-4 text-green-400" />} label="Teléfono" value={settings.phone || "—"} />
            <ProfileRow icon={<Clock className="h-4 w-4 text-amber-400" />} label="Horario" value={helpdesk.hours.filter((h) => h.open).length + " días abiertos"} />
            <ProfileRow icon={<Link2 className="h-4 w-4 text-brand-300" />} label="Sitio web" value="clientany.app" />
          </div>
          <a href="/ajustes" className="btn-ghost mt-4 w-full py-2 text-sm">Editar perfil en Configuración</a>
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-ink-850 p-3">
      {icon}
      <div>
        <div className="text-[10px] uppercase text-ink-500">{label}</div>
        <div className="text-sm font-medium text-white">{value}</div>
      </div>
    </div>
  );
}

function EtiquetasTab() {
  const labels = useData((s) => s.labels);
  const addLabel = useData((s) => s.addLabel);
  const removeLabel = useData((s) => s.removeLabel);
  const [name, setName] = useState("");
  const colors = ["#16a34a", "#598bff", "#f59e0b", "#8b5cf6", "#ef4444", "#d946ef", "#06b6d4"];
  const [color, setColor] = useState(colors[0]);

  return (
    <div className="space-y-4">
      <SectionTitle title="Etiquetas de chats" icon={Tag} />
      <p className="-mt-1 text-xs text-ink-400">
        Organizá tus conversaciones y contactos con etiquetas de colores, como en WhatsApp Business.
      </p>
      <div className="flex flex-wrap gap-2">
        {labels.map((l) => (
          <span
            key={l.id}
            className="chip group gap-1.5 border"
            style={{ borderColor: `${l.color}55`, background: `${l.color}1a`, color: l.color }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
            {l.name}
            <button onClick={() => removeLabel(l.id)} className="opacity-60 hover:opacity-100">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="card p-4">
        <div className="label mb-2">Nueva etiqueta</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Cliente frecuente" className="input" />
          <div className="flex gap-1.5">
            {colors.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`h-9 w-9 rounded-lg ${color === c ? "ring-2 ring-white" : ""}`} style={{ background: c }} />
            ))}
          </div>
          <button
            onClick={() => {
              if (name.trim()) {
                addLabel(name.trim(), color);
                setName("");
              }
            }}
            className="btn-primary shrink-0"
          >
            <Plus className="h-4 w-4" /> Crear
          </button>
        </div>
      </div>
    </div>
  );
}

function LinkTab() {
  const brands = useData((s) => s.brands);
  const settings = useData((s) => s.settings);
  const activeBrandId = useApp((s) => s.activeBrandId);
  const brand = activeBrandId !== "all" ? brandById(activeBrandId) : brands[0];
  const [phone, setPhone] = useState(settings.phone || "5491155551234");
  const [message, setMessage] = useState(`¡Hola ${brand?.name ?? ""}! Quiero hacer una consulta 😊`);
  const [copied, setCopied] = useState(false);

  const clean = phone.replace(/[^\d]/g, "");
  const link = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;

  return (
    <div className="space-y-4">
      <SectionTitle title="Link & QR de contacto" icon={Link2} />
      <p className="-mt-1 text-xs text-ink-400">
        Generá tu link de “click-to-chat” y el QR para poner en tu tienda, packaging o redes.
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card space-y-3 p-5 lg:col-span-2">
          <div>
            <div className="label mb-1.5">Número de WhatsApp (con código de país)</div>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="5491155551234" />
          </div>
          <div>
            <div className="label mb-1.5">Mensaje pre-cargado</div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className="input resize-none" />
          </div>
          <div>
            <div className="label mb-1.5">Tu link</div>
            <div className="flex gap-2">
              <input readOnly value={link} className="input font-mono text-xs" />
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="btn-ghost shrink-0 px-3"
              >
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <a href={link} target="_blank" rel="noreferrer" className="btn-soft w-full">
            <MessageCircle className="h-4 w-4" /> Probar el link
          </a>
        </div>
        <div className="card flex flex-col items-center justify-center p-5">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <QrCode className="h-4 w-4 text-brand-300" /> Código QR
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="QR de WhatsApp" className="mt-3 h-44 w-44 rounded-xl bg-white p-2" />
          <p className="mt-2 text-center text-[11px] text-ink-500">
            Escaneá para abrir el chat. Descargalo y ponelo en tu local o packaging.
          </p>
        </div>
      </div>
    </div>
  );
}
