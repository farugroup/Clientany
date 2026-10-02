"use client";
// El chat interno del equipo: avisos, pedidos de ayuda y tareas chicas
// atadas a un chat o a un pedido, con estado pendiente / hecho.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleDot, Loader2, MessageCircle, MessagesSquare, RotateCcw, Send, ShoppingBag, Trash2 } from "lucide-react";
import type { MensajeEquipo } from "@/lib/crm/types";
import { fechaHora, horaCorta, iniciales } from "@/lib/crm/core";
import { getRepo } from "@/lib/crm/repo";
import { useEquipoChat, useMiembros, useYo } from "@/lib/crm/hooks";
import { Confirmar, avisar } from "@/components/crm/ui";
import { ChipFiltro } from "./comun";

function RefChip({ r }: { r: NonNullable<MensajeEquipo["ref"]> }) {
  const esChat = r.tipo === "conversacion";
  const href = esChat ? `/inbox?c=${encodeURIComponent(r.id)}` : `/pedidos?p=${encodeURIComponent(r.id)}`;
  const Icon = esChat ? MessageCircle : ShoppingBag;
  return (
    <Link
      href={href}
      className="chip mt-1.5 border border-ink-600 bg-ink-900/60 px-2 py-0.5 text-[11px] text-brand-300 hover:border-brand-500/40 hover:text-brand-200"
    >
      <Icon className="h-3 w-3" />
      {r.nombre || (esChat ? "Ver chat" : "Ver pedido")}
    </Link>
  );
}

export function ChatEquipo() {
  const mensajes = useEquipoChat();
  const yo = useYo();
  const miembros = useMiembros();
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aBorrar, setABorrar] = useState<MensajeEquipo | null>(null);
  const caja = useRef<HTMLDivElement>(null);

  const ordenados = useMemo(() => [...mensajes].sort((a, b) => new Date(a.creado).getTime() - new Date(b.creado).getTime()), [mensajes]);
  const pendientes = ordenados.filter((m) => m.estado === "pendiente").length;
  const lista = soloPendientes ? ordenados.filter((m) => m.estado === "pendiente") : ordenados;
  const nombreDe = (id?: string | null) => (id ? miembros.find((m) => m.id === id)?.nombre : undefined);

  // Bajar al último mensaje cuando llega uno nuevo.
  useEffect(() => {
    const el = caja.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lista.length]);

  async function enviar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    try {
      await getRepo().enviarEquipo(t);
      setTexto("");
    } catch (e) {
      avisar(e, "error");
    } finally {
      setEnviando(false);
    }
  }

  async function marcar(m: MensajeEquipo, estado: "pendiente" | "hecho" | null) {
    try {
      await getRepo().marcarEquipo(m.id, estado);
    } catch (e) {
      avisar(e, "error");
    }
  }

  return (
    <>
      <div className="card flex h-[620px] max-h-[calc(100vh-180px)] min-h-[420px] flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-ink-800 px-4 py-3">
          <MessagesSquare className="h-[18px] w-[18px] text-brand-300" />
          <h2 className="flex-1 text-base font-bold text-white">Chat del equipo</h2>
          <ChipFiltro activo={soloPendientes} onClick={() => setSoloPendientes((v) => !v)} color={pendientes ? "#f59e0b" : undefined}>
            Pendientes ({pendientes})
          </ChipFiltro>
        </div>

        <div ref={caja} className="no-scrollbar flex-1 space-y-3 overflow-y-auto bg-ink-950/30 p-4">
          {!lista.length && (
            <div className="flex h-full flex-col items-center justify-center text-center text-xs text-ink-500">
              {soloPendientes ? "No hay nada pendiente." : "Escribile al equipo: avisos, «¿alguien ve este chat?», tareas chicas."}
            </div>
          )}
          {lista.map((m) => {
            const mio = m.de === yo?.id;
            const hechoPor = nombreDe(m.hecho_por);
            return (
              <div key={m.id} className={`group flex gap-2 ${mio ? "flex-row-reverse" : ""}`}>
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-800 text-[10px] font-bold text-ink-200">
                  {iniciales(m.nombre)}
                </span>
                <div className={`flex max-w-[80%] flex-col ${mio ? "items-end" : "items-start"}`}>
                  <div className="mb-0.5 flex items-center gap-1.5 text-[11px] text-ink-500">
                    <span className="font-semibold text-ink-300">{mio ? "Vos" : m.nombre}</span>
                    <span title={fechaHora(m.creado)}>{horaCorta(m.creado)}</span>
                  </div>
                  <div
                    className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                      mio ? "rounded-tr-sm border border-brand-500/25 bg-brand-500/15 text-ink-100" : "rounded-tl-sm bg-ink-800 text-ink-100"
                    } ${m.estado === "hecho" ? "opacity-70" : ""}`}
                  >
                    {m.texto}
                  </div>
                  {m.ref && <RefChip r={m.ref} />}
                  <div className={`mt-1 flex flex-wrap items-center gap-1.5 ${mio ? "justify-end" : ""}`}>
                    {m.estado === "pendiente" && (
                      <>
                        <span className="chip bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
                          <CircleDot className="h-3 w-3" /> Pendiente
                        </span>
                        <button
                          className="chip bg-ink-800 px-2 py-0.5 text-[10px] text-ink-200 hover:bg-green-500/15 hover:text-green-400"
                          onClick={() => marcar(m, "hecho")}
                        >
                          <CheckCircle2 className="h-3 w-3" /> Marcar hecho
                        </button>
                      </>
                    )}
                    {m.estado === "hecho" && (
                      <>
                        <span className="chip bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400">
                          <CheckCircle2 className="h-3 w-3" /> Hecho{hechoPor ? ` por ${hechoPor}` : ""}
                        </span>
                        <button
                          className="rounded p-0.5 text-ink-500 hover:text-white"
                          onClick={() => marcar(m, "pendiente")}
                          title="Volver a pendiente"
                          aria-label="Volver a pendiente"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      </>
                    )}
                    {!m.estado && (
                      <button
                        className="chip px-2 py-0.5 text-[10px] text-ink-500 opacity-100 hover:text-amber-400 lg:opacity-0 lg:group-hover:opacity-100"
                        onClick={() => marcar(m, "pendiente")}
                        title="Marcarlo como tarea pendiente"
                      >
                        <CircleDot className="h-3 w-3" /> Pendiente
                      </button>
                    )}
                    {mio && (
                      <button
                        className="rounded p-0.5 text-ink-500 opacity-100 hover:text-red-400 lg:opacity-0 lg:group-hover:opacity-100"
                        onClick={() => setABorrar(m)}
                        title="Borrar mensaje"
                        aria-label="Borrar mensaje"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <form
          className="flex items-end gap-2 border-t border-ink-800 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
        >
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                enviar();
              }
            }}
            rows={1}
            placeholder="Escribile al equipo (Enter manda, Shift+Enter baja de línea)"
            className="input max-h-32 min-h-[42px] resize-none py-2.5"
            aria-label="Mensaje para el equipo"
          />
          <button type="submit" className="btn-primary h-[42px] shrink-0 px-3" disabled={!texto.trim() || enviando} aria-label="Mandar">
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>

      <Confirmar
        abierto={!!aBorrar}
        onCerrar={() => setABorrar(null)}
        titulo="¿Borrar el mensaje?"
        texto="Se borra para todo el equipo."
        confirmar="Sí, borrar"
        peligro
        onConfirmar={async () => {
          if (!aBorrar) return;
          try {
            await getRepo().borrarEquipo(aBorrar.id);
          } catch (e) {
            avisar(e, "error");
          }
        }}
      />
    </>
  );
}
