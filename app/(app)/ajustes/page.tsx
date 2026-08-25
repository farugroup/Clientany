"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Building2,
  Plug,
  CheckCircle2,
  Circle,
  X,
  ExternalLink,
  Lock,
  Check,
  Save,
  RotateCcw,
  Zap,
  Clock,
  ShieldCheck,
  Copy,
  BookOpen,
  Link2,
  ArrowUpRight,
} from "lucide-react";
import { useData } from "@/lib/data-store";
import { integrationDefs, type IntegrationDef } from "@/lib/integrations";
import type { BusinessSettings, ChecklistKey, IntegrationKey } from "@/lib/types";
import { SectionTitle } from "@/components/ui";
import Link from "next/link";

const categoryLabels: Record<IntegrationDef["category"], string> = {
  mensajeria: "Mensajería",
  marketplace: "Marketplaces",
  tienda: "Tiendas / Ecommerce",
  email: "Email",
};

export default function AjustesPage() {
  const settings = useData((s) => s.settings);
  const integrations = useData((s) => s.integrations);
  const updateSettings = useData((s) => s.updateSettings);
  const resetToSample = useData((s) => s.resetToSample);

  const brands = useData((s) => s.brands);
  const channels = useData((s) => s.channels);
  const stores = useData((s) => s.stores);
  const orders = useData((s) => s.orders);
  const campaigns = useData((s) => s.campaigns);

  const [openInt, setOpenInt] = useState<IntegrationDef | null>(null);
  const [form, setForm] = useState<BusinessSettings>(settings);
  const [savedProfile, setSavedProfile] = useState(false);

  // Checklist "Empezá mañana"
  const checklist: { key: ChecklistKey; label: string; done: boolean; href: string }[] = [
    { key: "perfil", label: "Completar el perfil del negocio", done: !!settings.businessName, href: "#perfil" },
    { key: "marca", label: "Crear tu primera marca", done: brands.length > 0, href: "/marcas" },
    { key: "canal", label: "Conectar un canal (WhatsApp / IG / ML)", done: channels.length > 0, href: "/channels" },
    { key: "tienda", label: "Conectar tu tienda", done: stores.length > 0, href: "/channels" },
    { key: "pedido", label: "Cargar o importar tu primer pedido", done: orders.length > 0, href: "/tracking" },
    { key: "campana", label: "Crear tu primera campaña", done: campaigns.length > 0, href: "/campanas" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const progress = Math.round((doneCount / checklist.length) * 100);

  function saveProfile() {
    updateSettings(form);
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 1800);
  }

  const grouped = integrationDefs.reduce<Record<string, IntegrationDef[]>>((acc, i) => {
    (acc[i.category] ??= []).push(i);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      {/* Header */}
      <div className="card flex items-start gap-3 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15">
          <Settings className="h-6 w-6 text-brand-300" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Configuración</h2>
          <p className="mt-0.5 text-sm text-ink-400">
            Tu negocio, tus integraciones y todo lo que necesitás para arrancar mañana mismo.
          </p>
        </div>
      </div>

      {/* Checklist */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-800 bg-gradient-to-br from-brand-500/10 to-transparent p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-brand-300" />
              <h3 className="text-base font-bold text-white">Empezá mañana — {progress}% listo</h3>
            </div>
            <span className="chip bg-ink-800 text-ink-200">
              {doneCount}/{checklist.length}
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
          {checklist.map((c) => (
            <Link
              key={c.key}
              href={c.href}
              className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                c.done
                  ? "border-green-500/20 bg-green-500/5"
                  : "border-ink-700 bg-ink-850 hover:border-brand-500/40"
              }`}
            >
              {c.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-ink-500" />
              )}
              <span className={`text-sm ${c.done ? "text-ink-300 line-through" : "text-white"}`}>
                {c.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Business profile */}
      <div id="perfil" className="card p-5">
        <SectionTitle title="Perfil del negocio" icon={Building2} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nombre del negocio" value={form.businessName} onChange={(v) => setForm({ ...form, businessName: v })} />
          <Field label="Responsable" value={form.ownerName} onChange={(v) => setForm({ ...form, ownerName: v })} />
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Teléfono" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <div>
            <div className="label mb-1.5">País</div>
            <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input">
              {["Argentina", "Chile", "Uruguay", "Paraguay", "México", "Colombia", "Perú", "Brasil"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="label mb-1.5">Moneda</div>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="input">
              {["ARS", "CLP", "UYU", "PYG", "MXN", "COP", "PEN", "BRL", "USD"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={saveProfile} className="btn-primary mt-4">
          {savedProfile ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {savedProfile ? "¡Guardado!" : "Guardar perfil"}
        </button>
      </div>

      {/* Integrations */}
      <div>
        <SectionTitle title="Centro de integraciones" icon={Plug} />
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-ink-300">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span>
            Las integraciones marcadas <b className="text-green-400">Listo ya</b> las podés usar
            desde mañana con las credenciales de tu tienda. Las de mensajería (WhatsApp/IG/ML)
            requieren aprobación de la plataforma: dejá las credenciales cargadas y quedan activas
            apenas te aprueban.
          </span>
        </div>

        {Object.entries(grouped).map(([cat, list]) => (
          <div key={cat} className="mb-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">
              {categoryLabels[cat as IntegrationDef["category"]]}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {list.map((def) => {
                const cfg = integrations[def.key];
                const connected = cfg?.enabled;
                return (
                  <button
                    key={def.key}
                    onClick={() => setOpenInt(def)}
                    className="card flex items-start gap-3 p-4 text-left transition hover:border-brand-500/40"
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
                      style={{ background: `${def.color}1f` }}
                    >
                      {def.logo}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-white">{def.name}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-ink-400">{def.summary}</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        {connected ? (
                          <span className="chip bg-green-500/10 text-green-400">
                            <Check className="h-3 w-3" /> Conectado
                          </span>
                        ) : def.liveNow ? (
                          <span className="chip bg-brand-500/10 text-brand-300">Listo ya</span>
                        ) : (
                          <span className="chip bg-amber-500/10 text-amber-400">
                            <Clock className="h-3 w-3" /> Requiere aprobación
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Danger zone / reset */}
      <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-white">Datos de ejemplo</div>
          <p className="text-xs text-ink-400">
            ¿Querés volver a cargar las 4 marcas de demostración para practicar? Esto reemplaza tus
            datos actuales.
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm("Esto reemplaza tus datos actuales por los de ejemplo. ¿Continuar?")) resetToSample();
          }}
          className="btn-ghost shrink-0 text-amber-400"
        >
          <RotateCcw className="h-4 w-4" /> Recargar datos de ejemplo
        </button>
      </div>

      {openInt && <IntegrationModal def={openInt} onClose={() => setOpenInt(null)} />}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="label mb-1.5">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="input" />
    </div>
  );
}

function IntegrationModal({ def, onClose }: { def: IntegrationDef; onClose: () => void }) {
  const saved = useData((s) => s.integrations[def.key]);
  const saveIntegration = useData((s) => s.saveIntegration);
  const [values, setValues] = useState<Record<string, string>>(saved?.fields ?? {});
  const [done, setDone] = useState(false);
  const [domain, setDomain] = useState("https://tu-dominio.com");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setDomain(window.location.origin);
  }, []);

  function copy(value: string) {
    navigator.clipboard?.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied(null), 1600);
  }

  function connect() {
    saveIntegration(def.key as IntegrationKey, values, true);
    setDone(true);
    setTimeout(onClose, 1400);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-lg animate-fade-in overflow-y-auto rounded-t-3xl border border-ink-700 bg-ink-900 p-5 sm:rounded-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-xl"
              style={{ background: `${def.color}1f` }}
            >
              {def.logo}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{def.name}</h3>
              <span className={`chip mt-0.5 ${def.liveNow ? "bg-brand-500/10 text-brand-300" : "bg-amber-500/10 text-amber-400"}`}>
                {def.liveNow ? "Listo ya" : <><Clock className="h-3 w-3" /> Requiere aprobación</>}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
              <Check className="h-7 w-7 text-green-400" />
            </div>
            <p className="mt-3 font-semibold text-white">¡Credenciales guardadas!</p>
            <p className="mt-1 text-sm text-ink-400">
              {def.liveNow
                ? "Ya podés empezar a sincronizar."
                : "Quedan activas apenas la plataforma apruebe tu cuenta."}
            </p>
          </div>
        ) : (
          <>
            {/* Portales / accesos directos */}
            <div className="mt-4">
              <div className="label mb-2 flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" /> Accesos directos
              </div>
              <div className="space-y-1.5">
                {def.portalLinks.map((p) => (
                  <a
                    key={p.url}
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5 text-sm font-medium text-white transition hover:border-brand-500/40 hover:bg-ink-800"
                  >
                    <span className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-brand-300" /> {p.label}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-ink-500" />
                  </a>
                ))}
              </div>
            </div>

            {/* Tutorial paso a paso */}
            <div className="mt-4">
              <div className="label mb-2 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> Tutorial paso a paso
              </div>
              <ol className="space-y-2.5">
                {def.steps.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-ink-200">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-[11px] font-bold text-brand-300">
                      {i + 1}
                    </span>
                    <span>
                      {s.text}
                      {s.url && (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-1 inline-flex items-center gap-0.5 font-semibold text-brand-300 hover:text-brand-200"
                        >
                          {s.urlLabel ?? "Abrir"} <ArrowUpRight className="h-3 w-3" />
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
              <a
                href={def.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-brand-300"
              >
                Ver documentación oficial completa <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* URLs para pegar en la plataforma */}
            {def.callbacks.length > 0 && (
              <div className="mt-4 rounded-xl border border-brand-500/20 bg-brand-500/5 p-3">
                <div className="label mb-2 flex items-center gap-1.5 text-brand-300">
                  <Copy className="h-3.5 w-3.5" /> URLs para pegar en {def.name}
                </div>
                <div className="space-y-2">
                  {def.callbacks.map((cb) => {
                    const full = `${domain}${cb.path}`;
                    return (
                      <div key={cb.path}>
                        <div className="text-[11px] font-medium text-ink-300">{cb.label}</div>
                        <div className="mt-1 flex gap-2">
                          <input readOnly value={full} className="input py-2 font-mono text-xs" />
                          <button onClick={() => copy(full)} className="btn-ghost shrink-0 px-3 py-2">
                            {copied === full ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                        {cb.hint && <div className="mt-1 text-[10px] text-ink-500">{cb.hint}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {def.approvalNote && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-ink-300">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                {def.approvalNote}
              </div>
            )}

            {/* Fields */}
            <div className="mt-4">
              <div className="label mb-2 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Pegá tus credenciales
              </div>
              <div className="space-y-3">
                {def.fields.map((f) => (
                  <div key={f.name}>
                    <div className="label mb-1.5 flex items-center gap-1">
                      {f.label} {f.secret && <Lock className="h-3 w-3 text-ink-500" />}
                    </div>
                    <input
                      type={f.secret ? "password" : "text"}
                      value={values[f.name] ?? ""}
                      onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                      placeholder={f.placeholder}
                      className="input"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-500">
              <Lock className="h-3 w-3" /> Tus credenciales se guardan en tu navegador (demo). En
              producción viajan cifradas al backend.
            </div>

            <button onClick={connect} className="btn-primary mt-4 w-full">
              <Plug className="h-4 w-4" /> Guardar y conectar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
