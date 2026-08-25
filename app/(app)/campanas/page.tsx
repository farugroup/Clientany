"use client";

import { useState } from "react";
import {
  Megaphone,
  Mail,
  MessageCircle,
  Plus,
  Users,
  MousePointerClick,
  DollarSign,
  Eye,
  X,
  Send,
  Sparkles,
  Check,
  ChevronRight,
} from "lucide-react";
import { useApp, brandById } from "@/lib/store";
import { useData } from "@/lib/data-store";
import { money, compactMoney, num, pct, shortDate } from "@/lib/format";
import { StatCard, SectionTitle, Pill } from "@/components/ui";
import { UserPlus } from "lucide-react";
import type { Campaign, Lead } from "@/lib/types";

const statusMeta: Record<Campaign["status"], { label: string; color: string; bg: string }> = {
  borrador: { label: "Borrador", color: "#9aa3c0", bg: "rgba(154,163,192,0.14)" },
  programada: { label: "Programada", color: "#598bff", bg: "rgba(89,139,255,0.14)" },
  enviando: { label: "Enviando", color: "#f59e0b", bg: "rgba(245,158,11,0.14)" },
  enviada: { label: "Enviada", color: "#16a34a", bg: "rgba(22,163,74,0.14)" },
};

const sourceLabels: Record<Lead["source"], string> = {
  mercadolibre: "Mercado Libre",
  leadmagnet: "Lead Magnet",
  carrito: "Carrito abandonado",
  webchat: "Web Chat",
  manual: "Carga manual",
};

export default function CampanasPage() {
  const activeBrandId = useApp((s) => s.activeBrandId);
  const campaigns = useData((s) => s.campaigns);
  const leads = useData((s) => s.leads);
  const [showNew, setShowNew] = useState(false);
  const [showLead, setShowLead] = useState(false);
  const [tab, setTab] = useState<"campanas" | "leads">("campanas");

  const inBrandCampaigns =
    activeBrandId === "all" ? campaigns : campaigns.filter((c) => c.brandId === activeBrandId);
  const inBrandLeads =
    activeBrandId === "all" ? leads : leads.filter((l) => l.brandId === activeBrandId);

  const totalRevenue = inBrandCampaigns.reduce((s, c) => s + c.revenue, 0);
  const totalSent = inBrandCampaigns.reduce((s, c) => s + c.sent, 0);
  const totalOpened = inBrandCampaigns.reduce((s, c) => s + c.opened, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-5 animate-fade-in">
      {/* Hero */}
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-fuchsia-500/15">
            <Megaphone className="h-6 w-6 text-fuchsia-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Campañas de Email & WhatsApp</h2>
            <p className="mt-0.5 max-w-2xl text-sm text-ink-400">
              Con tu base de leads (Mercado Libre, lead magnet, carritos y web) lanzá campañas
              segmentadas y medí las ventas que generan.
            </p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary shrink-0">
          <Plus className="h-4 w-4" /> Nueva campaña
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Contactos en tu base" value={num(inBrandLeads.length * 640)} icon={Users} accent="#3563ff" trend="14%" trendUp />
        <StatCard label="Enviados (30 días)" value={num(totalSent)} icon={Send} accent="#598bff" />
        <StatCard label="Tasa de apertura" value={pct(totalOpened, totalSent)} icon={Eye} accent="#f59e0b" />
        <StatCard label="Ingresos generados" value={compactMoney(totalRevenue)} icon={DollarSign} accent="#16a34a" trend="27%" trendUp />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5">
        {(["campanas", "leads"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`chip border px-4 py-2 capitalize ${
              tab === t
                ? "border-brand-500/40 bg-brand-500/15 text-brand-200"
                : "border-ink-700 bg-ink-850 text-ink-300"
            }`}
          >
            {t === "campanas" ? "Campañas" : `Base de leads (${inBrandLeads.length})`}
          </button>
        ))}
        {tab === "leads" && (
          <button onClick={() => setShowLead(true)} className="btn-soft ml-auto px-3 py-2 text-xs">
            <UserPlus className="h-3.5 w-3.5" /> Agregar contacto
          </button>
        )}
      </div>

      {tab === "campanas" ? (
        <div className="space-y-2.5">
          {inBrandCampaigns.map((c) => {
            const st = statusMeta[c.status];
            const brand = brandById(c.brandId);
            const isWa = c.channel === "whatsapp";
            return (
              <div key={c.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: isWa ? "rgba(37,211,102,0.14)" : "rgba(234,139,0,0.14)" }}
                    >
                      {isWa ? (
                        <MessageCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <Mail className="h-5 w-5 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{c.name}</span>
                        <Pill color={st.color} bg={st.bg}>{st.label}</Pill>
                      </div>
                      <div className="mt-0.5 text-xs text-ink-400">
                        {c.audience} · {num(c.audienceSize)} contactos
                        {activeBrandId === "all" && ` · ${brand?.logo} ${brand?.name}`}
                        {c.scheduledFor && ` · ${shortDate(c.scheduledFor)}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-white">{money(c.revenue)}</div>
                    <div className="text-[11px] text-ink-500">generados</div>
                  </div>
                </div>

                {c.sent > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2 border-t border-ink-800 pt-3">
                    <Metric icon={Send} label="Enviados" value={num(c.sent)} />
                    <Metric icon={Eye} label="Abiertos" value={pct(c.opened, c.sent)} />
                    <Metric icon={MousePointerClick} label="Clicks" value={pct(c.clicked, c.sent)} />
                    <Metric icon={Check} label="Ventas" value={num(c.converted)} accent="#16a34a" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-800 text-left text-xs text-ink-400">
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Origen</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Tags</th>
                  <th className="px-4 py-3 font-medium">Consentimiento</th>
                </tr>
              </thead>
              <tbody>
                {inBrandLeads.map((l) => {
                  const brand = brandById(l.brandId);
                  return (
                    <tr key={l.id} className="border-b border-ink-800/60 hover:bg-ink-800/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">
                            {l.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div>
                            <div className="font-medium text-white">{l.name}</div>
                            <div className="text-xs text-ink-400">{l.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="chip bg-ink-800 text-ink-300">{sourceLabels[l.source]}</span>
                        {activeBrandId === "all" && (
                          <div className="mt-1 text-[11px] text-ink-500">{brand?.name}</div>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {l.tags.map((t) => (
                            <span key={t} className="chip bg-ink-800 text-[10px] text-ink-300">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <span
                            className={`chip ${
                              l.consentEmail ? "bg-amber-500/10 text-amber-400" : "bg-ink-800 text-ink-500"
                            }`}
                          >
                            <Mail className="h-3 w-3" /> Email
                          </span>
                          <span
                            className={`chip ${
                              l.consentWhatsapp ? "bg-green-500/10 text-green-400" : "bg-ink-800 text-ink-500"
                            }`}
                          >
                            <MessageCircle className="h-3 w-3" /> WA
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {inBrandLeads.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-400">
                      Todavía no tenés contactos. Sumalos con “Agregar contacto”, desde el Lead
                      Magnet de Mercado Libre o al recuperar carritos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showNew && <NewCampaignModal onClose={() => setShowNew(false)} leadsCount={inBrandLeads.length} />}
      {showLead && <AddLeadModal onClose={() => setShowLead(false)} />}
    </div>
  );
}

function AddLeadModal({ onClose }: { onClose: () => void }) {
  const brands = useData((s) => s.brands);
  const addLead = useData((s) => s.addLead);
  const activeBrandId = useApp((s) => s.activeBrandId);
  const [brandId, setBrandId] = useState(activeBrandId !== "all" ? activeBrandId : brands[0]?.id ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consentEmail, setConsentEmail] = useState(true);
  const [consentWhatsapp, setConsentWhatsapp] = useState(false);

  function save() {
    addLead({
      brandId,
      name,
      email,
      phone,
      source: "manual",
      tags: [],
      consentEmail,
      consentWhatsapp,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md animate-fade-in rounded-t-3xl border border-ink-700 bg-ink-900 p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Agregar contacto</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        {brands.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-ink-300">Creá una marca antes de sumar contactos.</p>
            <a href="/marcas" className="btn-primary mt-4 w-full">Crear una marca</a>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div>
              <div className="label mb-1.5">Marca</div>
              <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="input">
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.logo} {b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="label mb-1.5">Nombre</div>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Nombre y apellido" />
            </div>
            <div>
              <div className="label mb-1.5">Email</div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="cliente@mail.com" />
            </div>
            <div>
              <div className="label mb-1.5">Teléfono (opcional)</div>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+54 9 11 ..." />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConsentEmail((v) => !v)}
                className={`chip flex-1 justify-center border py-2 ${consentEmail ? "border-amber-500/40 bg-amber-500/10 text-amber-400" : "border-ink-700 bg-ink-850 text-ink-400"}`}
              >
                <Mail className="h-3.5 w-3.5" /> Acepta email
              </button>
              <button
                onClick={() => setConsentWhatsapp((v) => !v)}
                className={`chip flex-1 justify-center border py-2 ${consentWhatsapp ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-ink-700 bg-ink-850 text-ink-400"}`}
              >
                <MessageCircle className="h-3.5 w-3.5" /> Acepta WhatsApp
              </button>
            </div>
            <button disabled={!email.trim() || !brandId} onClick={save} className="btn-primary w-full">
              Guardar contacto
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  accent = "#9aa3c0",
}: {
  icon: typeof Send;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-sm font-bold" style={{ color: accent === "#9aa3c0" ? "#fff" : accent }}>
        <Icon className="h-3.5 w-3.5" style={{ color: accent }} /> {value}
      </div>
      <div className="text-[10px] text-ink-500">{label}</div>
    </div>
  );
}

function NewCampaignModal({ onClose, leadsCount }: { onClose: () => void; leadsCount: number }) {
  const addCampaign = useData((s) => s.addCampaign);
  const brands = useData((s) => s.brands);
  const activeBrandId = useApp((s) => s.activeBrandId);
  const [step, setStep] = useState(1);
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [name, setName] = useState("");
  const [audience, setAudience] = useState("Toda la base con consentimiento");

  const audiences = [
    { label: "Toda la base con consentimiento", size: leadsCount * 640 },
    { label: "Leads de Mercado Libre", size: leadsCount * 220 },
    { label: "Carritos abandonados (7 días)", size: 128 },
    { label: "Compradores últimos 30 días", size: leadsCount * 180 },
  ];

  function schedule() {
    const size = audiences.find((a) => a.label === audience)?.size ?? 0;
    addCampaign({
      brandId: activeBrandId !== "all" ? activeBrandId : brands[0]?.id ?? "",
      name: name || "Campaña sin título",
      channel,
      status: "programada",
      audience,
      audienceSize: size,
      scheduledFor: new Date(Date.now() + 86400000).toISOString(),
      sent: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
      revenue: 0,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg animate-fade-in rounded-t-3xl border border-ink-700 bg-ink-900 p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Nueva campaña</h3>
            <div className="mt-1 flex gap-1">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1 w-8 rounded-full ${s <= step ? "bg-brand-500" : "bg-ink-700"}`}
                />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 1 && (
          <div className="mt-4 space-y-3">
            <div className="label">Canal</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setChannel("email")}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${
                  channel === "email" ? "border-amber-500 bg-amber-500/10" : "border-ink-700 bg-ink-850"
                }`}
              >
                <Mail className="h-6 w-6 text-amber-400" />
                <span className="text-sm font-semibold text-white">Email marketing</span>
              </button>
              <button
                onClick={() => setChannel("whatsapp")}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${
                  channel === "whatsapp" ? "border-green-500 bg-green-500/10" : "border-ink-700 bg-ink-850"
                }`}
              >
                <MessageCircle className="h-6 w-6 text-green-400" />
                <span className="text-sm font-semibold text-white">WhatsApp marketing</span>
              </button>
            </div>
            <div>
              <div className="label mb-1.5">Nombre de la campaña</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Lanzamiento nueva colección"
                className="input"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4 space-y-2">
            <div className="label">Elegí la audiencia</div>
            {audiences.map((a) => (
              <button
                key={a.label}
                onClick={() => setAudience(a.label)}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                  audience === a.label ? "border-brand-500 bg-brand-500/10" : "border-ink-700 bg-ink-850"
                }`}
              >
                <div>
                  <div className="text-sm font-medium text-white">{a.label}</div>
                  <div className="text-xs text-ink-400">{num(a.size)} contactos</div>
                </div>
                {audience === a.label && <Check className="h-5 w-5 text-brand-400" />}
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-brand-500/20 bg-brand-500/5 p-3">
              <Sparkles className="h-5 w-5 text-brand-300" />
              <p className="text-xs text-ink-300">
                Clientany puede escribir el mensaje por vos según tu marca y objetivo.
              </p>
            </div>
            <textarea
              rows={5}
              defaultValue={
                channel === "whatsapp"
                  ? "¡Hola {nombre}! 🎉 Llegó la nueva colección y queremos que la veas primero. 20% OFF solo por hoy con el código HOLA20 👉 {link}"
                  : "Asunto: 🎉 Llegó lo nuevo (con 20% OFF)\n\nHola {nombre}, preparamos algo especial para vos. Descubrí la nueva colección con envío gratis y 20% de descuento por tiempo limitado."
              }
              className="input resize-none text-sm"
            />
            <div className="rounded-xl bg-ink-850 p-3 text-xs text-ink-300">
              <div className="flex justify-between">
                <span>Canal</span>
                <span className="font-semibold text-white">
                  {channel === "whatsapp" ? "WhatsApp" : "Email"}
                </span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Audiencia</span>
                <span className="font-semibold text-white">{audience}</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          {step > 1 && (
            <button onClick={() => setStep((s) => s - 1)} className="btn-ghost flex-1">
              Atrás
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && !name.trim()}
              className="btn-primary flex-1"
            >
              Continuar <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={schedule} className="btn-primary flex-1">
              <Send className="h-4 w-4" /> Programar envío
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
