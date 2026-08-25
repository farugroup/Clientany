"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Send,
  Paperclip,
  Sparkles,
  MoreVertical,
  Truck,
  Tag,
  CheckCheck,
  ArrowLeft,
  Bot,
  Filter,
} from "lucide-react";
import { conversations, messagesByConversation, orders } from "@/lib/mock-data";
import { channelMeta } from "@/lib/channels";
import { useApp, brandById } from "@/lib/store";
import { timeAgo, dateTime, money } from "@/lib/format";
import type { ChannelType, Message } from "@/lib/types";
import { Pill } from "@/components/ui";

const channelFilters: { key: ChannelType | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "instagram", label: "Instagram" },
  { key: "mercadolibre", label: "Mercado Libre" },
  { key: "messenger", label: "Messenger" },
];

const cannedReplies = [
  "¡Hola! 👋 Gracias por escribirnos. ¿En qué te podemos ayudar?",
  "Sí, tenemos stock disponible. ¿Te paso el link de compra?",
  "Realizamos envíos a todo el país 📦 en 24 a 72 hs.",
  "Podés seguir tu pedido acá: clientany.app/track",
];

export default function InboxPage() {
  const activeBrandId = useApp((s) => s.activeBrandId);
  const [channelFilter, setChannelFilter] = useState<ChannelType | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [showChatMobile, setShowChatMobile] = useState(false);

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (activeBrandId !== "all" && c.brandId !== activeBrandId) return false;
      if (channelFilter !== "all" && c.channel !== channelFilter) return false;
      if (query && !`${c.customerName} ${c.lastMessage} ${c.handle}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [activeBrandId, channelFilter, query]);

  const selected = conversations.find((c) => c.id === selectedId) ?? filtered[0] ?? null;

  const thread: Message[] = selected
    ? messagesByConversation[selected.id] ?? [
        {
          id: "seed1",
          from: "customer",
          text: selected.lastMessage,
          timestamp: selected.timestamp,
        },
      ]
    : [];

  const relatedOrder = selected?.orderNumber
    ? orders.find((o) => o.orderNumber === selected.orderNumber)
    : undefined;

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      <div className="card flex h-[calc(100vh-9.5rem)] min-h-[560px] overflow-hidden">
        {/* LEFT: conversation list */}
        <div
          className={`flex w-full flex-col border-r border-ink-800 md:w-[360px] md:shrink-0 ${
            showChatMobile ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="border-b border-ink-800 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar conversación…"
                className="input pl-9"
              />
            </div>
            <div className="no-scrollbar mt-2.5 flex gap-1.5 overflow-x-auto">
              {channelFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setChannelFilter(f.key)}
                  className={`chip shrink-0 border ${
                    channelFilter === f.key
                      ? "border-brand-500/40 bg-brand-500/15 text-brand-200"
                      : "border-ink-700 bg-ink-850 text-ink-300 hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-ink-400">
                No hay conversaciones con estos filtros.
              </div>
            )}
            {filtered.map((c) => {
              const meta = channelMeta[c.channel];
              const Icon = meta.icon;
              const brand = brandById(c.brandId);
              const isActive = selected?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedId(c.id);
                    setShowChatMobile(true);
                  }}
                  className={`flex w-full items-start gap-3 border-b border-ink-800/60 p-3 text-left transition ${
                    isActive ? "bg-brand-500/10" : "hover:bg-ink-800/60"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-800 text-lg">
                      {c.avatar}
                    </div>
                    <div
                      className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-ink-900"
                      style={{ background: meta.bg }}
                    >
                      <Icon className="h-3 w-3" style={{ color: meta.color }} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-white">
                        {c.customerName}
                      </span>
                      <span className="shrink-0 text-[11px] text-ink-500">
                        {timeAgo(c.timestamp)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-400">{c.lastMessage}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {activeBrandId === "all" && (
                        <span className="chip bg-ink-800 text-[10px] text-ink-300">
                          {brand?.logo} {brand?.name}
                        </span>
                      )}
                      {c.orderNumber && (
                        <span className="chip bg-ink-800 text-[10px] text-ink-300">
                          <Truck className="h-2.5 w-2.5" /> {c.orderNumber}
                        </span>
                      )}
                      {c.unread > 0 && (
                        <span className="ml-auto chip bg-brand-500 text-white">{c.unread}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: chat */}
        {selected ? (
          <div className={`flex flex-1 flex-col ${showChatMobile ? "flex" : "hidden md:flex"}`}>
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-ink-800 p-3">
              <button
                className="rounded-lg p-1.5 text-ink-300 hover:bg-ink-800 md:hidden"
                onClick={() => setShowChatMobile(false)}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-800 text-lg">
                  {selected.avatar}
                </div>
                {(() => {
                  const meta = channelMeta[selected.channel];
                  const Icon = meta.icon;
                  return (
                    <div
                      className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-ink-900"
                      style={{ background: meta.bg }}
                    >
                      <Icon className="h-3 w-3" style={{ color: meta.color }} />
                    </div>
                  );
                })()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">
                  {selected.customerName}
                </div>
                <div className="truncate text-xs text-ink-400">
                  {channelMeta[selected.channel].label} · {selected.handle}
                </div>
              </div>
              <button className="rounded-lg p-2 text-ink-300 hover:bg-ink-800">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>

            {/* Order banner */}
            {relatedOrder && (
              <div className="flex items-center gap-2 border-b border-ink-800 bg-ink-900/60 px-4 py-2">
                <Truck className="h-4 w-4 text-brand-300" />
                <span className="text-xs text-ink-300">
                  Pedido{" "}
                  <span className="font-mono font-semibold text-white">
                    {relatedOrder.orderNumber}
                  </span>{" "}
                  · {money(relatedOrder.total, relatedOrder.currency)}
                </span>
                <a
                  href={`/tracking?q=${relatedOrder.orderNumber}`}
                  className="ml-auto text-xs font-semibold text-brand-300 hover:text-brand-200"
                >
                  Ver seguimiento →
                </a>
              </div>
            )}

            {/* Messages */}
            <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto bg-ink-950/40 p-4">
              {thread.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.from === "customer" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      m.from === "customer"
                        ? "rounded-tl-sm bg-ink-800 text-ink-100"
                        : m.from === "bot"
                        ? "rounded-tr-sm border border-brand-500/30 bg-brand-500/10 text-brand-100"
                        : "rounded-tr-sm bg-brand-600 text-white"
                    }`}
                  >
                    {m.from === "bot" && (
                      <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-brand-300">
                        <Bot className="h-3 w-3" /> {m.author ?? "Bot Clientany"}
                      </div>
                    )}
                    <p>{m.text}</p>
                    <div
                      className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                        m.from === "customer" ? "text-ink-500" : "text-white/60"
                      }`}
                    >
                      {dateTime(m.timestamp)}
                      {m.from !== "customer" && <CheckCheck className="h-3 w-3" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Canned replies */}
            <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-ink-800 px-3 py-2">
              <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-brand-300">
                <Sparkles className="h-3 w-3" /> Sugerencias IA:
              </span>
              {cannedReplies.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setDraft(r)}
                  className="chip shrink-0 border border-ink-700 bg-ink-850 text-ink-300 hover:text-white"
                >
                  {r.length > 42 ? r.slice(0, 42) + "…" : r}
                </button>
              ))}
            </div>

            {/* Composer */}
            <div className="flex items-end gap-2 border-t border-ink-800 p-3">
              <button className="rounded-xl p-2.5 text-ink-400 hover:bg-ink-800">
                <Paperclip className="h-5 w-5" />
              </button>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={1}
                placeholder={`Responder por ${channelMeta[selected.channel].label}…`}
                className="input max-h-32 min-h-[44px] flex-1 resize-none py-3"
              />
              <button
                className="btn-primary h-11 px-4"
                onClick={() => setDraft("")}
                disabled={!draft.trim()}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden flex-1 items-center justify-center md:flex">
            <div className="text-center text-ink-400">
              <Filter className="mx-auto h-10 w-10 text-ink-600" />
              <p className="mt-2 text-sm">Elegí una conversación para responder</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
