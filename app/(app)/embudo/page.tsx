"use client";

import { useState } from "react";
import {
  Filter,
  Plus,
  X,
  DollarSign,
  Target,
  TrendingUp,
  Trophy,
  CheckSquare,
  Square,
  MessageSquarePlus,
  ListPlus,
  Trash2,
  GripVertical,
  Calendar,
} from "lucide-react";
import { useData } from "@/lib/data-store";
import { useApp, brandById } from "@/lib/store";
import { money, compactMoney, timeAgo, num, pct } from "@/lib/format";
import { channelMeta } from "@/lib/channels";
import { StatCard } from "@/components/ui";
import type { Deal } from "@/lib/types";

export default function EmbudoPage() {
  const activeBrandId = useApp((s) => s.activeBrandId);
  const stages = useData((s) => s.pipelineStages);
  const deals = useData((s) => s.deals);
  const agents = useData((s) => s.agents);
  const moveDeal = useData((s) => s.moveDeal);
  const [openDeal, setOpenDeal] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const myDeals = activeBrandId === "all" ? deals : deals.filter((d) => d.brandId === activeBrandId);
  const openStages = stages.filter((s) => s.id !== "st_perdido");
  const won = myDeals.filter((d) => d.stageId === "st_ganado");
  const lost = myDeals.filter((d) => d.stageId === "st_perdido");
  const active = myDeals.filter((d) => d.stageId !== "st_ganado" && d.stageId !== "st_perdido");
  const pipelineValue = active.reduce((s, d) => s + d.value, 0);
  const wonValue = won.reduce((s, d) => s + d.value, 0);
  const winRate = pct(won.length, won.length + lost.length);

  const dealsInStage = (stageId: string) => myDeals.filter((d) => d.stageId === stageId);
  const selected = deals.find((d) => d.id === openDeal) ?? null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15">
            <Filter className="h-6 w-6 text-brand-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Embudo de ventas</h2>
            <p className="mt-0.5 text-sm text-ink-400">
              Arrastrá cada oportunidad por las etapas y no se te escapa ninguna venta.
            </p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary shrink-0">
          <Plus className="h-4 w-4" /> Nueva oportunidad
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Oportunidades activas" value={num(active.length)} icon={Target} accent="#3563ff" />
        <StatCard label="Valor del embudo" value={compactMoney(pipelineValue)} icon={DollarSign} accent="#f59e0b" />
        <StatCard label="Ganado (mes)" value={compactMoney(wonValue)} icon={Trophy} accent="#16a34a" sub={`${won.length} cerradas`} />
        <StatCard label="Tasa de conversión" value={winRate} icon={TrendingUp} accent="#d946ef" />
      </div>

      {/* Kanban */}
      <div className="no-scrollbar overflow-x-auto pb-2">
        <div className="flex gap-3" style={{ minWidth: "min-content" }}>
          {stages.map((stage) => {
            const stageDeals = dealsInStage(stage.id);
            const stageValue = stageDeals.reduce((s, d) => s + d.value, 0);
            return (
              <div
                key={stage.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragId) moveDeal(dragId, stage.id);
                  setDragId(null);
                }}
                className="flex w-[280px] shrink-0 flex-col rounded-2xl border border-ink-800 bg-ink-900/50"
              >
                <div className="flex items-center justify-between border-b border-ink-800 p-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color }} />
                    <span className="text-sm font-semibold text-white">{stage.name}</span>
                    <span className="chip bg-ink-800 text-ink-300">{stageDeals.length}</span>
                  </div>
                  <span className="text-xs font-medium text-ink-400">{compactMoney(stageValue)}</span>
                </div>
                <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: "60vh" }}>
                  {stageDeals.map((d) => {
                    const brand = brandById(d.brandId);
                    const agent = agents.find((a) => a.id === d.responsible);
                    const ch = channelMeta[d.channel];
                    const openTasks = d.tasks.filter((t) => !t.done).length;
                    return (
                      <div
                        key={d.id}
                        draggable
                        onDragStart={() => setDragId(d.id)}
                        onDragEnd={() => setDragId(null)}
                        onClick={() => setOpenDeal(d.id)}
                        className={`group cursor-pointer rounded-xl border border-ink-700 bg-ink-850 p-3 transition hover:border-brand-500/40 ${
                          dragId === d.id ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-white">{d.title}</span>
                          <GripVertical className="h-4 w-4 shrink-0 text-ink-600 opacity-0 group-hover:opacity-100" />
                        </div>
                        <div className="mt-1 text-xs text-ink-400">{d.contactName}</div>
                        <div className="mt-2 text-base font-bold text-white">{money(d.value, d.currency)}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span
                            className="flex h-5 items-center gap-1 rounded-full px-1.5 text-[10px]"
                            style={{ background: ch.bg, color: ch.color }}
                          >
                            <ch.icon className="h-3 w-3" /> {ch.label}
                          </span>
                          {activeBrandId === "all" && (
                            <span className="chip bg-ink-800 text-[10px] text-ink-300">{brand?.logo}</span>
                          )}
                          {openTasks > 0 && (
                            <span className="chip bg-amber-500/10 text-[10px] text-amber-400">
                              <CheckSquare className="h-2.5 w-2.5" /> {openTasks}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t border-ink-800 pt-2">
                          <span className="flex items-center gap-1 text-[11px] text-ink-400">
                            <span>{agent?.avatar}</span> {agent?.name.split(" ")[0]}
                          </span>
                          <span className="text-[10px] text-ink-500">{timeAgo(d.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                  {stageDeals.length === 0 && (
                    <div className="rounded-xl border border-dashed border-ink-700 py-6 text-center text-xs text-ink-600">
                      Arrastrá acá
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-ink-500">
        💡 En desktop arrastrás las tarjetas entre columnas. En mobile, tocá una oportunidad y usá
        “Mover de etapa”.
      </p>

      {selected && <DealDrawer deal={selected} onClose={() => setOpenDeal(null)} />}
      {showNew && <NewDealModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

function DealDrawer({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const stages = useData((s) => s.pipelineStages);
  const agents = useData((s) => s.agents);
  const moveDeal = useData((s) => s.moveDeal);
  const removeDeal = useData((s) => s.removeDeal);
  const addDealNote = useData((s) => s.addDealNote);
  const addDealTask = useData((s) => s.addDealTask);
  const toggleDealTask = useData((s) => s.toggleDealTask);
  const [note, setNote] = useState("");
  const [task, setTask] = useState("");
  const brand = brandById(deal.brandId);
  const agent = agents.find((a) => a.id === deal.responsible);
  const stage = stages.find((s) => s.id === deal.stageId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="h-full w-full max-w-md animate-fade-in overflow-y-auto border-l border-ink-700 bg-ink-900 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: stage?.color }} />
              <span className="text-xs font-medium text-ink-400">{stage?.name}</span>
            </div>
            <h3 className="mt-1 text-lg font-bold text-white">{deal.title}</h3>
            <p className="text-sm text-ink-400">{deal.contactName} · {deal.contactHandle}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-ink-850 p-3">
          <div className="text-2xl font-extrabold text-white">{money(deal.value, deal.currency)}</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <Info label="Responsable" value={`${agent?.avatar ?? ""} ${agent?.name ?? "-"}`} />
            <Info label="Origen" value={deal.source} />
            <Info label="Marca" value={`${brand?.logo ?? ""} ${brand?.name ?? ""}`} />
            <Info label="Creado" value={timeAgo(deal.createdAt)} />
          </div>
        </div>

        {/* Move stage */}
        <div className="mt-4">
          <div className="label mb-1.5">Mover de etapa</div>
          <select
            value={deal.stageId}
            onChange={(e) => moveDeal(deal.id, e.target.value)}
            className="input"
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Tasks */}
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
            <CheckSquare className="h-4 w-4 text-brand-300" /> Tareas
          </div>
          <div className="space-y-1.5">
            {deal.tasks.map((t) => (
              <button
                key={t.id}
                onClick={() => toggleDealTask(deal.id, t.id)}
                className="flex w-full items-center gap-2 rounded-lg bg-ink-850 p-2 text-left"
              >
                {t.done ? (
                  <CheckSquare className="h-4 w-4 shrink-0 text-green-400" />
                ) : (
                  <Square className="h-4 w-4 shrink-0 text-ink-500" />
                )}
                <span className={`flex-1 text-sm ${t.done ? "text-ink-500 line-through" : "text-ink-200"}`}>
                  {t.text}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-ink-500">
                  <Calendar className="h-3 w-3" /> {timeAgo(t.due)}
                </span>
              </button>
            ))}
            {deal.tasks.length === 0 && <div className="text-xs text-ink-500">Sin tareas.</div>}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Nueva tarea…"
              className="input py-2 text-sm"
            />
            <button
              onClick={() => {
                if (task.trim()) {
                  addDealTask(deal.id, task.trim(), new Date(Date.now() + 86400000).toISOString());
                  setTask("");
                }
              }}
              className="btn-ghost px-3 py-2"
            >
              <ListPlus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
            <MessageSquarePlus className="h-4 w-4 text-brand-300" /> Notas
          </div>
          <div className="space-y-1.5">
            {deal.notes.map((n) => (
              <div key={n.id} className="rounded-lg bg-ink-850 p-2 text-sm text-ink-200">
                {n.text}
                <div className="mt-0.5 text-[10px] text-ink-500">{timeAgo(n.at)}</div>
              </div>
            ))}
            {deal.notes.length === 0 && <div className="text-xs text-ink-500">Sin notas.</div>}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Agregar nota…"
              className="input py-2 text-sm"
            />
            <button
              onClick={() => {
                if (note.trim()) {
                  addDealNote(deal.id, note.trim());
                  setNote("");
                }
              }}
              className="btn-ghost px-3 py-2"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            if (confirm("¿Eliminar esta oportunidad?")) {
              removeDeal(deal.id);
              onClose();
            }
          }}
          className="btn-ghost mt-6 w-full py-2 text-sm text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" /> Eliminar oportunidad
        </button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-ink-500">{label}</div>
      <div className="truncate text-ink-200">{value}</div>
    </div>
  );
}

function NewDealModal({ onClose }: { onClose: () => void }) {
  const brands = useData((s) => s.brands);
  const stages = useData((s) => s.pipelineStages);
  const agents = useData((s) => s.agents);
  const addDeal = useData((s) => s.addDeal);
  const activeBrandId = useApp((s) => s.activeBrandId);

  const [title, setTitle] = useState("");
  const [contactName, setContactName] = useState("");
  const [value, setValue] = useState("");
  const [brandId, setBrandId] = useState(activeBrandId !== "all" ? activeBrandId : brands[0]?.id ?? "");
  const [stageId, setStageId] = useState(stages[0]?.id ?? "");
  const [responsible, setResponsible] = useState(agents[0]?.id ?? "");

  const canSave = title.trim() && brandId;

  function save() {
    addDeal({
      brandId,
      title,
      contactName,
      contactHandle: "",
      channel: "whatsapp",
      value: Number(value.replace(/[^\d]/g, "")) || 0,
      currency: "ARS",
      stageId,
      responsible,
      source: "Manual",
      tags: [],
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md animate-fade-in rounded-t-3xl border border-ink-700 bg-ink-900 p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Nueva oportunidad</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        {brands.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-ink-300">Creá una marca antes de cargar oportunidades.</p>
            <a href="/marcas" className="btn-primary mt-4 w-full">Crear una marca</a>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <Field label="Título" value={title} onChange={setTitle} placeholder="Ej: Pedido mayorista" />
            <Field label="Contacto" value={contactName} onChange={setContactName} placeholder="Nombre del cliente" />
            <Field label="Valor estimado (ARS)" value={value} onChange={setValue} placeholder="50000" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="label mb-1.5">Etapa</div>
                <select value={stageId} onChange={(e) => setStageId(e.target.value)} className="input">
                  {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <div className="label mb-1.5">Responsable</div>
                <select value={responsible} onChange={(e) => setResponsible(e.target.value)} className="input">
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div className="label mb-1.5">Marca</div>
              <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="input">
                {brands.map((b) => <option key={b.id} value={b.id}>{b.logo} {b.name}</option>)}
              </select>
            </div>
            <button disabled={!canSave} onClick={save} className="btn-primary w-full">
              Crear oportunidad
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <div className="label mb-1.5">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input" />
    </div>
  );
}
