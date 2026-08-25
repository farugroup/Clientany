"use client";

import { useState } from "react";
import {
  Tag,
  Send,
  Sparkles,
  Check,
  MessageSquare,
  AlertTriangle,
  HelpCircle,
  Magnet,
  Mail,
  Download,
  Users,
  Gift,
} from "lucide-react";
import { useApp, brandById } from "@/lib/store";
import { useData } from "@/lib/data-store";
import { money, timeAgo, num } from "@/lib/format";
import { StatCard, SectionTitle } from "@/components/ui";
import type { MLQuestion } from "@/lib/types";

const typeMeta: Record<
  MLQuestion["type"],
  { label: string; icon: typeof HelpCircle; color: string; bg: string }
> = {
  pregunta: { label: "Pregunta", icon: HelpCircle, color: "#598bff", bg: "rgba(89,139,255,0.14)" },
  mensaje: { label: "Mensaje post-venta", icon: MessageSquare, color: "#16a34a", bg: "rgba(22,163,74,0.14)" },
  reclamo: { label: "Reclamo", icon: AlertTriangle, color: "#ef4444", bg: "rgba(239,68,68,0.14)" },
};

const suggestions = [
  "¡Hola! Sí, es 100% original y con garantía oficial. Hacemos factura A y B 😊",
  "¡Gracias por tu compra! Lo despachamos hoy mismo, en 24-48hs lo tenés.",
  "Sí, hacemos envíos a todo el país con Mercado Envíos 🚚",
];

export default function MercadoLibrePage() {
  const activeBrandId = useApp((s) => s.activeBrandId);
  const items = useData((s) => s.mlQuestions);
  const leads = useData((s) => s.leads);
  const answerMl = useData((s) => s.answerMl);
  const [answering, setAnswering] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const inBrand = activeBrandId === "all" ? items : items.filter((q) => q.brandId === activeBrandId);
  const pending = inBrand.filter((q) => !q.answered);
  const mlLeads = (activeBrandId === "all" ? leads : leads.filter((l) => l.brandId === activeBrandId)).filter(
    (l) => l.source === "mercadolibre" || l.source === "leadmagnet"
  );

  function answer(id: string) {
    answerMl(id);
    setAnswering(null);
    setDraft("");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 animate-fade-in">
      {/* Hero */}
      <div className="card overflow-hidden">
        <div className="relative flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-25 blur-3xl"
            style={{ background: "radial-gradient(circle, #FFE600, transparent 70%)" }}
          />
          <div className="relative flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400/15 text-2xl">
              🛒
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Mercado Libre integrado</h2>
              <p className="mt-0.5 max-w-2xl text-sm text-ink-400">
                Respondé preguntas, mensajes y reclamos de todas tus cuentas de ML sin salir de
                Clientany. Y con el <b className="text-yellow-300">Lead Magnet</b> capturás los
                emails de tus compradores para hacer marketing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Preguntas sin responder" value={String(pending.length)} icon={HelpCircle} accent="#598bff" sub="tiempo prom. respuesta 4 min" />
        <StatCard label="Reclamos abiertos" value={String(inBrand.filter((q) => q.type === "reclamo" && !q.answered).length)} icon={AlertTriangle} accent="#ef4444" />
        <StatCard label="Emails capturados (ML)" value={num(mlLeads.length * 47)} icon={Magnet} accent="#FFB000" trend="31%" trendUp sub="con lead magnet activo" />
        <StatCard label="Reputación" value="🟢 Verde" icon={Check} accent="#16a34a" sub="MercadoLíder Platinum" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Questions */}
        <div className="lg:col-span-2">
          <SectionTitle title="Preguntas & mensajes" icon={Tag} />
          <div className="space-y-2.5">
            {inBrand.map((q) => {
              const tm = typeMeta[q.type];
              const brand = brandById(q.brandId);
              return (
                <div key={q.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-800 text-xl">
                      {q.itemImage}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="chip font-semibold"
                          style={{ color: tm.color, background: tm.bg }}
                        >
                          <tm.icon className="h-3 w-3" /> {tm.label}
                        </span>
                        {q.answered && (
                          <span className="chip bg-green-500/10 text-green-400">
                            <Check className="h-3 w-3" /> Respondida
                          </span>
                        )}
                        <span className="ml-auto text-[11px] text-ink-500">{timeAgo(q.timestamp)}</span>
                      </div>
                      <div className="mt-1.5 truncate text-xs text-ink-400">
                        {q.itemTitle} · {money(q.price)}
                        {activeBrandId === "all" && ` · ${brand?.logo} ${brand?.name}`}
                      </div>
                      <p className="mt-1.5 rounded-lg bg-ink-850 px-3 py-2 text-sm text-ink-100">
                        <span className="font-semibold text-ink-300">{q.customerName}:</span> {q.text}
                      </p>

                      {answering === q.id ? (
                        <div className="mt-2">
                          <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            rows={2}
                            placeholder="Escribí tu respuesta…"
                            className="input resize-none text-sm"
                          />
                          <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
                            {suggestions.map((s, i) => (
                              <button
                                key={i}
                                onClick={() => setDraft(s)}
                                className="chip shrink-0 border border-ink-700 bg-ink-850 text-ink-300 hover:text-white"
                              >
                                <Sparkles className="h-3 w-3 text-brand-300" />
                                {s.slice(0, 34)}…
                              </button>
                            ))}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button onClick={() => answer(q.id)} className="btn-primary px-3 py-1.5 text-xs">
                              <Send className="h-3.5 w-3.5" /> Responder
                            </button>
                            <button
                              onClick={() => setAnswering(null)}
                              className="btn-ghost px-3 py-1.5 text-xs"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        !q.answered && (
                          <button
                            onClick={() => {
                              setAnswering(q.id);
                              setDraft("");
                            }}
                            className="btn-soft mt-2 px-3 py-1.5 text-xs"
                          >
                            <Send className="h-3.5 w-3.5" /> Responder
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead magnet */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="border-b border-ink-800 bg-gradient-to-br from-yellow-400/10 to-transparent p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/15">
                  <Magnet className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Lead Magnet para Mercado Libre</h3>
                  <p className="text-[11px] text-ink-400">Convertí compradores en suscriptores</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-ink-300">
                Al concretar la venta, enviamos un mensaje automático con un regalo (ebook, cupón,
                sorteo) a cambio del email y teléfono del cliente. Ese contacto entra directo a tu
                base para campañas.
              </p>
            </div>
            <div className="p-5">
              <div className="label mb-2">Incentivo activo</div>
              <div className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-850 p-3">
                <Gift className="h-5 w-5 text-brand-300" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">Cupón 15% OFF próxima compra</div>
                  <div className="text-[11px] text-ink-400">a cambio de email + WhatsApp</div>
                </div>
                <span className="chip bg-green-500/10 text-green-400">Activo</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-ink-850 p-3 text-center">
                  <div className="text-xl font-extrabold text-white">{num(mlLeads.length * 47)}</div>
                  <div className="text-[10px] text-ink-400">emails captados</div>
                </div>
                <div className="rounded-xl bg-ink-850 p-3 text-center">
                  <div className="text-xl font-extrabold text-yellow-400">62%</div>
                  <div className="text-[10px] text-ink-400">tasa de opt-in</div>
                </div>
              </div>

              <a href="/campanas" className="btn-primary mt-3 w-full">
                <Mail className="h-4 w-4" /> Crear campaña con esta base
              </a>
              <button className="btn-ghost mt-2 w-full py-2 text-xs">
                <Download className="h-3.5 w-3.5" /> Exportar contactos (CSV)
              </button>
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-2 flex items-center gap-2">
              <Users className="h-[18px] w-[18px] text-brand-300" />
              <h3 className="text-sm font-bold text-white">Últimos leads de ML</h3>
            </div>
            <div className="space-y-2">
              {mlLeads.slice(0, 4).map((l) => (
                <div key={l.id} className="flex items-center gap-2 rounded-lg bg-ink-850 p-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">
                    {l.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-white">{l.name}</div>
                    <div className="truncate text-[11px] text-ink-400">{l.email}</div>
                  </div>
                  {l.consentWhatsapp && <span className="text-[10px] text-green-400">WA ✓</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
