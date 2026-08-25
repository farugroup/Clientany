"use client";

import { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Rocket,
  PlayCircle,
  Check,
  Store,
} from "lucide-react";
import { useData } from "@/lib/data-store";
import { useApp } from "@/lib/store";

const emojis = ["🛍️", "🧥", "🧉", "🏠", "👟", "💄", "🎁", "☕", "🍫", "🐾", "📚", "🌿"];
const colors = ["#3563ff", "#d946ef", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];
const industries = [
  "Moda & Indumentaria",
  "Belleza & Skincare",
  "Hogar & Deco",
  "Tecnología",
  "Alimentos & Bebidas",
  "Salud & Bienestar",
  "Otro",
];

export default function Onboarding() {
  const completeOnboarding = useData((s) => s.completeOnboarding);
  const setActiveBrand = useApp((s) => s.setActiveBrand);

  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"scratch" | "sample" | null>(null);

  const [brandName, setBrandName] = useState("");
  const [emoji, setEmoji] = useState(emojis[0]);
  const [color, setColor] = useState(colors[0]);
  const [industry, setIndustry] = useState(industries[0]);

  function finishSample() {
    completeOnboarding({
      sample: true,
      settings: { businessName, ownerName, email },
    });
    setActiveBrand("all");
  }

  function finishScratch() {
    completeOnboarding({
      sample: false,
      settings: { businessName, ownerName, email },
      firstBrand: { name: brandName || businessName, logo: emoji, color, industry },
    });
    setActiveBrand("all");
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/95 p-4 backdrop-blur-xl">
      <div className="w-full max-w-lg animate-fade-in rounded-3xl border border-ink-700 bg-ink-900 shadow-card">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-ink-800 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-base font-extrabold text-white">Bienvenido a Clientany</div>
            <div className="text-xs text-ink-400">Configurá tu cuenta en 1 minuto</div>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-6 rounded-full ${s <= step ? "bg-brand-500" : "bg-ink-700"}`}
              />
            ))}
          </div>
        </div>

        <div className="p-5">
          {/* STEP 0: business profile */}
          {step === 0 && (
            <div className="space-y-3">
              <div>
                <div className="label mb-1.5">Nombre de tu negocio</div>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ej: Mi Tienda Online"
                  className="input"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="label mb-1.5">Tu nombre</div>
                  <input
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Nombre y apellido"
                    className="input"
                  />
                </div>
                <div>
                  <div className="label mb-1.5">Email</div>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hola@tunegocio.com"
                    className="input"
                  />
                </div>
              </div>
              <button
                onClick={() => setStep(1)}
                disabled={!businessName.trim()}
                className="btn-primary mt-2 w-full"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-center text-[11px] text-ink-500">
                Tus datos se guardan en tu navegador. Podés cambiarlos luego en Configuración.
              </p>
            </div>
          )}

          {/* STEP 1: choose mode */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-ink-300">¿Cómo querés arrancar, {ownerName || "crack"}?</p>
              <button
                onClick={() => {
                  setMode("scratch");
                  setStep(2);
                }}
                className="flex w-full items-start gap-3 rounded-2xl border border-ink-700 bg-ink-850 p-4 text-left transition hover:border-brand-500/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15">
                  <Rocket className="h-5 w-5 text-brand-300" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Empezar de cero</div>
                  <p className="text-xs text-ink-400">
                    Creá tu primera marca y cargá tus datos reales. Ideal para arrancar hoy.
                  </p>
                </div>
              </button>
              <button
                onClick={() => {
                  setMode("sample");
                  finishSample();
                }}
                className="flex w-full items-start gap-3 rounded-2xl border border-ink-700 bg-ink-850 p-4 text-left transition hover:border-brand-500/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/15">
                  <PlayCircle className="h-5 w-5 text-fuchsia-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Explorar con datos de ejemplo</div>
                  <p className="text-xs text-ink-400">
                    Mirá cómo funciona todo con 4 marcas de demo. Después reiniciás cuando quieras.
                  </p>
                </div>
              </button>
              <button onClick={() => setStep(0)} className="btn-ghost mt-1 w-full">
                <ArrowLeft className="h-4 w-4" /> Atrás
              </button>
            </div>
          )}

          {/* STEP 2: first brand */}
          {step === 2 && mode === "scratch" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
                  style={{ background: `${color}22` }}
                >
                  {emoji}
                </div>
                <div className="flex-1">
                  <div className="label mb-1.5">Nombre de tu primera marca</div>
                  <input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder={businessName || "Ej: Mi Marca"}
                    className="input"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <div className="label mb-1.5">Rubro</div>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="input"
                >
                  {industries.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
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

              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="btn-ghost flex-1">
                  <ArrowLeft className="h-4 w-4" /> Atrás
                </button>
                <button onClick={finishScratch} className="btn-primary flex-1">
                  <Check className="h-4 w-4" /> Crear y empezar
                </button>
              </div>
              <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-ink-500">
                <Store className="h-3 w-3" /> Después conectás tus canales y tiendas desde el panel.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
