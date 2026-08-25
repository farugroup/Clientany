"use client";

import { useState } from "react";
import {
  Send,
  Plus,
  X,
  MessageCircle,
  Mail,
  Users,
  Clock,
  Check,
  CalendarClock,
  Megaphone,
} from "lucide-react";
import { useData } from "@/lib/data-store";
import { useApp, brandById } from "@/lib/store";
import { num, shortDate } from "@/lib/format";
import { StatCard, SectionTitle, Pill } from "@/components/ui";
import type { Broadcast } from "@/lib/types";

const statusMeta: Record<Broadcast["status"], { label: string; color: string; bg: string }> = {
  borrador: { label: "Borrador", color: "#9aa3c0", bg: "rgba(154,163,192,0.14)" },
  programada: { label: "Programada", color: "#598bff", bg: "rgba(89,139,255,0.14)" },
  enviada: { label: "Enviada", color: "#16a34a", bg: "rgba(22,163,74,0.14)" },
};

export default function DifusionPage() {
  const activeBrandId = useApp((s) => s.activeBrandId);
  const broadcasts = useData((s) => s.broadcasts);
  const [show, setShow] = useState(false);

  const mine = activeBrandId === "all" ? broadcasts : broadcasts.filter((b) => b.brandId === activeBrandId);
  const totalReach = mine.reduce((s, b) => s + b.recipients, 0);
  const sent = mine.filter((b) => b.status === "enviada").length;
  const scheduled = mine.filter((b) => b.status === "programada").length;

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-fade-in">
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15">
            <Send className="h-6 w-6 text-brand-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Difusión masiva</h2>
            <p className="mt-0.5 max-w-2xl text-sm text-ink-400">
              Enviá mensajes a listas de difusión de WhatsApp segmentadas por etiqueta, con
              programación. Como las listas de difusión de WhatsApp Business, pero a escala.
            </p>
          </div>
        </div>
        <button onClick={() => setShow(true)} className="btn-primary shrink-0">
          <Plus className="h-4 w-4" /> Nueva difusión
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Difusiones" value={String(mine.length)} icon={Megaphone} accent="#3563ff" />
        <StatCard label="Alcance total" value={num(totalReach)} icon={Users} accent="#16a34a" />
        <StatCard label="Programadas" value={String(scheduled)} icon={CalendarClock} accent="#f59e0b" sub={`${sent} enviadas`} />
      </div>

      <SectionTitle title="Tus difusiones" icon={Send} />
      <div className="space-y-2.5">
        {mine.map((b) => {
          const st = statusMeta[b.status];
          const brand = brandById(b.brandId);
          return (
            <div key={b.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/15">
                    <MessageCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{b.name}</span>
                      <Pill color={st.color} bg={st.bg}>{st.label}</Pill>
                    </div>
                    <div className="mt-0.5 text-xs text-ink-400">
                      {b.audienceLabel} · {num(b.recipients)} destinatarios
                      {activeBrandId === "all" && ` · ${brand?.logo} ${brand?.name}`}
                    </div>
                    <p className="mt-1.5 line-clamp-2 rounded-lg bg-ink-850 px-3 py-2 text-xs text-ink-300">
                      {b.text}
                    </p>
                  </div>
                </div>
                {b.scheduledFor && (
                  <span className="flex shrink-0 items-center gap-1 text-[11px] text-ink-500">
                    <Clock className="h-3 w-3" /> {shortDate(b.scheduledFor)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {mine.length === 0 && (
          <div className="card py-10 text-center text-sm text-ink-400">
            Todavía no creaste difusiones. Tocá “Nueva difusión” para empezar.
          </div>
        )}
      </div>

      {show && <NewBroadcastModal onClose={() => setShow(false)} />}
    </div>
  );
}

function NewBroadcastModal({ onClose }: { onClose: () => void }) {
  const brands = useData((s) => s.brands);
  const labels = useData((s) => s.labels);
  const addBroadcast = useData((s) => s.addBroadcast);
  const activeBrandId = useApp((s) => s.activeBrandId);

  const [brandId, setBrandId] = useState(activeBrandId !== "all" ? activeBrandId : brands[0]?.id ?? "");
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [audience, setAudience] = useState(labels[0]?.name ?? "Base completa");
  const [text, setText] = useState("");
  const [when, setWhen] = useState("");

  const audiences = ["Base completa", ...labels.map((l) => `Etiqueta: ${l.name}`)];

  function save() {
    addBroadcast({
      brandId,
      name: name || "Difusión sin título",
      channel,
      audienceLabel: audience,
      recipients: Math.floor(200 + Math.abs(name.length * 37 + text.length * 11) % 1200),
      text,
      scheduledFor: when ? new Date(when).toISOString() : undefined,
      status: when ? "programada" : "borrador",
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md animate-fade-in rounded-t-3xl border border-ink-700 bg-ink-900 p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Nueva difusión</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        {brands.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-ink-300">Creá una marca antes de enviar difusiones.</p>
            <a href="/marcas" className="btn-primary mt-4 w-full">Crear una marca</a>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setChannel("whatsapp")}
                className={`chip flex-1 justify-center border py-2 ${channel === "whatsapp" ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-ink-700 bg-ink-850 text-ink-300"}`}
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </button>
              <button
                onClick={() => setChannel("email")}
                className={`chip flex-1 justify-center border py-2 ${channel === "email" ? "border-amber-500/40 bg-amber-500/10 text-amber-400" : "border-ink-700 bg-ink-850 text-ink-300"}`}
              >
                <Mail className="h-4 w-4" /> Email
              </button>
            </div>
            <div>
              <div className="label mb-1.5">Nombre</div>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Ej: Promo fin de semana" />
            </div>
            <div>
              <div className="label mb-1.5">Audiencia (lista de difusión)</div>
              <select value={audience} onChange={(e) => setAudience(e.target.value)} className="input">
                {audiences.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <div className="label mb-1.5">Mensaje</div>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="input resize-none" placeholder="Escribí el mensaje…" />
            </div>
            <div>
              <div className="label mb-1.5">Programar (opcional)</div>
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="input" />
            </div>
            <div>
              <div className="label mb-1.5">Marca</div>
              <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="input">
                {brands.map((b) => <option key={b.id} value={b.id}>{b.logo} {b.name}</option>)}
              </select>
            </div>
            <button disabled={!text.trim() || !brandId} onClick={save} className="btn-primary w-full">
              {when ? <><CalendarClock className="h-4 w-4" /> Programar difusión</> : <><Check className="h-4 w-4" /> Guardar borrador</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
