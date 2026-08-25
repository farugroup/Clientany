"use client";

import { useState } from "react";
import {
  Headphones,
  Users,
  Layers,
  Clock,
  Bot,
  Zap,
  MessageSquareText,
  Star,
  Plus,
  Trash2,
  X,
  Check,
  Circle,
  Save,
} from "lucide-react";
import { useData } from "@/lib/data-store";
import { SectionTitle } from "@/components/ui";
import type { AgentRole } from "@/lib/types";

const tabs = [
  { key: "colas", label: "Colas", icon: Layers },
  { key: "agentes", label: "Agentes", icon: Users },
  { key: "horarios", label: "Horarios", icon: Clock },
  { key: "chatbot", label: "Chatbot", icon: Bot },
  { key: "respuestas", label: "Respuestas rápidas", icon: Zap },
  { key: "mensajes", label: "Automáticos & CSAT", icon: MessageSquareText },
] as const;

const roleLabels: Record<AgentRole, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  agente: "Agente",
};

const colorOptions = ["#16a34a", "#598bff", "#f59e0b", "#8b5cf6", "#ef4444", "#d946ef", "#06b6d4"];

export default function AtencionPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("colas");

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-fade-in">
      <div className="card flex items-start gap-3 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15">
          <Headphones className="h-6 w-6 text-brand-300" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Atención & Chatbot</h2>
          <p className="mt-0.5 text-sm text-ink-400">
            Organizá tu mesa de ayuda: colas, agentes, horarios, respuestas automáticas y encuestas
            de satisfacción. Todo lo que hace Whaticket, integrado.
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

      {tab === "colas" && <ColasTab />}
      {tab === "agentes" && <AgentesTab roleLabels={roleLabels} />}
      {tab === "horarios" && <HorariosTab />}
      {tab === "chatbot" && <ChatbotTab />}
      {tab === "respuestas" && <RespuestasTab />}
      {tab === "mensajes" && <MensajesTab />}
    </div>
  );
}

function ColasTab() {
  const queues = useData((s) => s.queues);
  const addQueue = useData((s) => s.addQueue);
  const removeQueue = useData((s) => s.removeQueue);
  const conversations = useData((s) => s.conversations);
  const [name, setName] = useState("");
  const [color, setColor] = useState(colorOptions[0]);

  return (
    <div className="space-y-4">
      <SectionTitle title="Colas / departamentos" icon={Layers} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {queues.map((q) => {
          const count = conversations.filter((c) => c.queueId === q.id && c.status !== "closed").length;
          return (
            <div key={q.id} className="card flex items-center gap-3 p-4">
              <span className="h-3 w-3 rounded-full" style={{ background: q.color }} />
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">{q.name}</div>
                <div className="text-xs text-ink-400">
                  {count} en cola · {q.autoAssign ? "asignación automática" : "asignación manual"}
                </div>
              </div>
              <button
                onClick={() => removeQueue(q.id)}
                className="rounded-lg p-1.5 text-ink-500 hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="card p-4">
        <div className="label mb-2">Nueva cola</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Postventa" className="input" />
          <div className="flex gap-1.5">
            {colorOptions.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-9 w-9 rounded-lg ${color === c ? "ring-2 ring-white" : ""}`}
                style={{ background: c }}
              />
            ))}
          </div>
          <button
            onClick={() => {
              if (name.trim()) {
                addQueue({ name, color, autoAssign: true });
                setName("");
              }
            }}
            className="btn-primary shrink-0"
          >
            <Plus className="h-4 w-4" /> Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

function AgentesTab({ roleLabels }: { roleLabels: Record<AgentRole, string> }) {
  const agents = useData((s) => s.agents);
  const addAgent = useData((s) => s.addAgent);
  const removeAgent = useData((s) => s.removeAgent);
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AgentRole>("agente");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle title={`Agentes (${agents.length})`} icon={Users} />
        <button onClick={() => setShow(true)} className="btn-soft px-3 py-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Invitar agente
        </button>
      </div>
      <div className="card divide-y divide-ink-800">
        {agents.map((a) => (
          <div key={a.id} className="flex items-center gap-3 p-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-800 text-lg">{a.avatar}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                {a.name}
                <span className="flex items-center gap-1 text-[11px] font-normal text-ink-400">
                  <Circle className={`h-2 w-2 ${a.online ? "fill-green-400 text-green-400" : "fill-ink-600 text-ink-600"}`} />
                  {a.online ? "en línea" : "offline"}
                </span>
              </div>
              <div className="text-xs text-ink-400">{a.email || "—"}</div>
            </div>
            <span className="chip bg-ink-800 text-ink-300">{roleLabels[a.role]}</span>
            {a.role !== "admin" && (
              <button
                onClick={() => removeAgent(a.id)}
                className="rounded-lg p-1.5 text-ink-500 hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {show && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-md animate-fade-in rounded-t-3xl border border-ink-700 bg-ink-900 p-5 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Invitar agente</h3>
              <button onClick={() => setShow(false)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <div className="label mb-1.5">Nombre</div>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
              </div>
              <div>
                <div className="label mb-1.5">Email</div>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="agente@tunegocio.com" />
              </div>
              <div>
                <div className="label mb-1.5">Rol</div>
                <select value={role} onChange={(e) => setRole(e.target.value as AgentRole)} className="input">
                  <option value="agente">Agente</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <button
                disabled={!name.trim()}
                onClick={() => {
                  addAgent({ name, email, role });
                  setName("");
                  setEmail("");
                  setShow(false);
                }}
                className="btn-primary w-full"
              >
                Invitar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HorariosTab() {
  const helpdesk = useData((s) => s.helpdesk);
  const updateHelpdesk = useData((s) => s.updateHelpdesk);

  function setDay(i: number, patch: Partial<(typeof helpdesk.hours)[number]>) {
    const hours = helpdesk.hours.map((d, idx) => (idx === i ? { ...d, ...patch } : d));
    updateHelpdesk({ hours });
  }

  return (
    <div className="space-y-4">
      <SectionTitle title="Horario de atención" icon={Clock} />
      <div className="card divide-y divide-ink-800">
        {helpdesk.hours.map((d, i) => (
          <div key={d.day} className="flex items-center gap-3 p-3">
            <button
              onClick={() => setDay(i, { open: !d.open })}
              className={`chip w-24 justify-center border ${
                d.open ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-ink-700 bg-ink-850 text-ink-500"
              }`}
            >
              {d.open ? "Abierto" : "Cerrado"}
            </button>
            <span className="flex-1 text-sm font-medium text-white">{d.day}</span>
            {d.open && (
              <div className="flex items-center gap-2 text-sm">
                <input type="time" value={d.from} onChange={(e) => setDay(i, { from: e.target.value })} className="input w-28 py-1.5" />
                <span className="text-ink-500">a</span>
                <input type="time" value={d.to} onChange={(e) => setDay(i, { to: e.target.value })} className="input w-28 py-1.5" />
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-500">
        Fuera de este horario se envía automáticamente el mensaje de ausencia (pestaña “Automáticos”).
      </p>
    </div>
  );
}

function ChatbotTab() {
  const helpdesk = useData((s) => s.helpdesk);
  const queues = useData((s) => s.queues);
  const updateHelpdesk = useData((s) => s.updateHelpdesk);

  return (
    <div className="space-y-4">
      <div className="card flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-brand-300" />
          <div>
            <div className="text-sm font-semibold text-white">Chatbot de bienvenida</div>
            <div className="text-xs text-ink-400">Menú automático que deriva a la cola correcta</div>
          </div>
        </div>
        <Toggle checked={helpdesk.chatbotEnabled} onChange={(v) => updateHelpdesk({ chatbotEnabled: v })} />
      </div>

      <div className="card p-5">
        <div className="label mb-3">Menú del bot</div>
        <div className="space-y-2">
          {helpdesk.chatbotMenu.map((opt, i) => {
            const q = queues.find((x) => x.id === opt.queueId);
            return (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-ink-850 p-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/15 text-sm font-bold text-brand-300">
                  {opt.key}
                </span>
                <input
                  value={opt.label}
                  onChange={(e) => {
                    const chatbotMenu = helpdesk.chatbotMenu.map((o, idx) => (idx === i ? { ...o, label: e.target.value } : o));
                    updateHelpdesk({ chatbotMenu });
                  }}
                  className="input flex-1 py-1.5"
                />
                <select
                  value={opt.queueId}
                  onChange={(e) => {
                    const chatbotMenu = helpdesk.chatbotMenu.map((o, idx) => (idx === i ? { ...o, queueId: e.target.value } : o));
                    updateHelpdesk({ chatbotMenu });
                  }}
                  className="input w-40 py-1.5 text-sm"
                >
                  {queues.map((qq) => <option key={qq.id} value={qq.id}>{qq.name}</option>)}
                </select>
              </div>
            );
          })}
        </div>
        <div className="mt-4 rounded-xl border border-ink-700 bg-ink-950 p-3">
          <div className="text-[11px] font-semibold uppercase text-ink-500">Vista previa</div>
          <div className="mt-2 rounded-xl rounded-tl-sm bg-ink-800 p-3 text-sm text-ink-100">
            ¡Hola! 👋 ¿Con qué te ayudamos? Respondé con el número:
            {helpdesk.chatbotMenu.map((o) => (
              <div key={o.key} className="mt-1 text-ink-300">
                <b className="text-white">{o.key}</b> · {o.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RespuestasTab() {
  const quickReplies = useData((s) => s.quickReplies);
  const addQuickReply = useData((s) => s.addQuickReply);
  const removeQuickReply = useData((s) => s.removeQuickReply);
  const [shortcut, setShortcut] = useState("");
  const [text, setText] = useState("");

  return (
    <div className="space-y-4">
      <SectionTitle title="Respuestas rápidas" icon={Zap} />
      <p className="-mt-1 text-xs text-ink-400">
        Escribí el atajo (ej: <code className="text-brand-300">/envio</code>) en la bandeja y se
        completa el mensaje automáticamente.
      </p>
      <div className="space-y-2">
        {quickReplies.map((q) => (
          <div key={q.id} className="card flex items-start gap-3 p-3">
            <span className="chip shrink-0 bg-brand-500/15 font-mono text-brand-300">{q.shortcut}</span>
            <p className="flex-1 text-sm text-ink-200">{q.text}</p>
            <button
              onClick={() => removeQuickReply(q.id)}
              className="rounded-lg p-1.5 text-ink-500 hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="card space-y-2 p-4">
        <div className="label">Nueva respuesta rápida</div>
        <input value={shortcut} onChange={(e) => setShortcut(e.target.value)} placeholder="/atajo" className="input font-mono" />
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Texto del mensaje…" className="input resize-none" />
        <button
          onClick={() => {
            let s = shortcut.trim();
            if (!s.startsWith("/")) s = "/" + s;
            if (s.length > 1 && text.trim()) {
              addQuickReply(s, text.trim());
              setShortcut("");
              setText("");
            }
          }}
          className="btn-primary w-full"
        >
          <Plus className="h-4 w-4" /> Agregar respuesta
        </button>
      </div>
    </div>
  );
}

function MensajesTab() {
  const helpdesk = useData((s) => s.helpdesk);
  const updateHelpdesk = useData((s) => s.updateHelpdesk);
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-4">
      <MsgCard
        icon={<Zap className="h-5 w-5 text-green-400" />}
        title="Mensaje de bienvenida"
        desc="Se envía al primer mensaje del cliente."
        enabled={helpdesk.greetingEnabled}
        onToggle={(v) => updateHelpdesk({ greetingEnabled: v })}
        value={helpdesk.greetingMessage}
        onChange={(v) => updateHelpdesk({ greetingMessage: v })}
      />
      <MsgCard
        icon={<Clock className="h-5 w-5 text-amber-400" />}
        title="Mensaje de ausencia"
        desc="Se envía fuera del horario de atención."
        enabled={helpdesk.awayEnabled}
        onToggle={(v) => updateHelpdesk({ awayEnabled: v })}
        value={helpdesk.awayMessage}
        onChange={(v) => updateHelpdesk({ awayMessage: v })}
      />
      <MsgCard
        icon={<Star className="h-5 w-5 text-fuchsia-400" />}
        title="Encuesta de satisfacción (CSAT)"
        desc="Se envía al cerrar el ticket para calificar la atención."
        enabled={helpdesk.csatEnabled}
        onToggle={(v) => updateHelpdesk({ csatEnabled: v })}
        value={helpdesk.csatMessage}
        onChange={(v) => updateHelpdesk({ csatMessage: v })}
      />
      <button
        onClick={() => {
          setSaved(true);
          setTimeout(() => setSaved(false), 1600);
        }}
        className="btn-primary"
      >
        {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {saved ? "¡Guardado!" : "Guardar cambios"}
      </button>
    </div>
  );
}

function MsgCard({
  icon,
  title,
  desc,
  enabled,
  onToggle,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <div className="text-sm font-semibold text-white">{title}</div>
            <div className="text-xs text-ink-400">{desc}</div>
          </div>
        </div>
        <Toggle checked={enabled} onChange={onToggle} />
      </div>
      {enabled && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="input mt-3 resize-none text-sm"
        />
      )}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-brand-500" : "bg-ink-700"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}
