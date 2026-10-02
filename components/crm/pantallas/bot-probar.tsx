"use client";
// Panel «Probá el bot»: escribís como si fueras el cliente y muestra qué
// contestaría y por qué. No guarda nada; «Mandarlo de verdad» sí crea el
// mensaje en la Bandeja (corre el bot de verdad, con sus candados).
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FlaskConical, Inbox, Loader2, Send, Trash2 } from "lucide-react";
import type { Bot, BotResultado, CanalTipo } from "@/lib/crm/types";
import { CANALES } from "@/lib/crm/core";
import { getRepo } from "@/lib/crm/repo";
import { useCanales } from "@/lib/crm/hooks";
import { avisar } from "@/components/crm/ui";
import { InterruptorChico } from "./comun";

interface Intercambio {
  id: string;
  texto: string;
  canal: CanalTipo;
  fuera: boolean;
  res: BotResultado;
  deVerdad?: string; // id de la conversación creada en la bandeja
}

export function nombreMotivo(motivo: string, bot: Bot | null): string {
  if (motivo.startsWith("regla:")) {
    const r = bot?.reglas.find((x) => x.id === motivo.slice(6));
    return r ? `Regla «${r.nombre}»` : "Regla";
  }
  const m: Record<string, string> = {
    bienvenida: "Bienvenida",
    ausencia: "Fuera de horario",
    menu: "Menú",
    stock: "Stock",
    pedido: "Pedido",
    humano: "Pasar a una persona",
  };
  return m[motivo] || motivo;
}

export function ProbarBot({ bot, sucio, puedeMandar }: { bot: Bot | null; sucio: boolean; puedeMandar: boolean }) {
  const canales = useCanales();
  const [canal, setCanal] = useState<CanalTipo>("whatsapp");
  const [fuera, setFuera] = useState(false);
  const [texto, setTexto] = useState("");
  const [historial, setHistorial] = useState<Intercambio[]>([]);
  const [cargando, setCargando] = useState<"" | "probar" | "mandar">("");
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fin.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [historial.length]);

  const ultimoTexto = texto.trim() || historial[historial.length - 1]?.texto || "";

  async function probar() {
    const t = texto.trim();
    if (!t) return;
    setCargando("probar");
    try {
      const res = await getRepo().probarBot({ texto: t, canal, fuera_de_horario: fuera });
      setHistorial((h) => [...h, { id: Math.random().toString(36).slice(2), texto: t, canal, fuera, res }].slice(-12));
      setTexto("");
    } catch (e) {
      avisar(e, "error");
    } finally {
      setCargando("");
    }
  }

  async function mandarDeVerdad() {
    const t = ultimoTexto;
    if (!t) return;
    setCargando("mandar");
    try {
      const canalReal = canales.find((c) => c.tipo === canal && c.estado !== "error");
      const r = await getRepo().simularEntrante({ texto: t, canal_tipo: canal, canal_id: canalReal?.id });
      setHistorial((h) => [...h, { id: Math.random().toString(36).slice(2), texto: t, canal, fuera, res: r.bot, deVerdad: r.conversacion.id }].slice(-12));
      setTexto("");
      avisar("Listo: el mensaje entró a la Bandeja. Abrilo ahí para ver el chat completo.");
    } catch (e) {
      avisar(e, "error");
    } finally {
      setCargando("");
    }
  }

  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="border-b border-ink-800 p-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-[18px] w-[18px] text-brand-300" />
          <h2 className="text-base font-bold text-white">Probá el bot</h2>
        </div>
        <p className="mt-0.5 text-xs text-ink-400">Escribí como si fueras el cliente. No se manda nada a nadie.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select value={canal} onChange={(e) => setCanal(e.target.value as CanalTipo)} className="input w-auto py-1.5 text-xs" aria-label="Canal de la prueba">
            {CANALES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-ink-200">
            <InterruptorChico valor={fuera} onCambio={setFuera} etiqueta="Simular fuera de horario" />
            Simular fuera de horario
          </label>
        </div>
        {sucio && (
          <p className="mt-2 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-300">
            Tenés cambios sin guardar: la prueba usa la versión guardada.
          </p>
        )}
      </div>

      <div className="no-scrollbar max-h-[420px] min-h-[180px] flex-1 space-y-3 overflow-y-auto bg-ink-950/40 p-4">
        {!historial.length && (
          <div className="flex h-full flex-col items-center justify-center gap-1 py-6 text-center text-xs text-ink-500">
            <span>Probá con «hola», «¿tienen mancuernas?», «¿dónde está mi pedido #1001?» o «quiero hablar con una persona».</span>
          </div>
        )}
        {historial.map((h) => (
          <div key={h.id} className="space-y-1.5">
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-ink-800 px-3 py-2 text-sm text-ink-100">{h.texto}</div>
            </div>
            {h.res.respuestas.map((r, i) => (
              <div key={i} className="flex flex-col items-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm border border-brand-500/25 bg-brand-500/15 px-3 py-2 text-sm text-ink-100">
                  {r.texto}
                </div>
                <span className="mt-0.5 text-[10px] text-ink-500">{nombreMotivo(r.motivo, bot)}</span>
              </div>
            ))}
            <p className="text-[11px] italic text-ink-400">
              {h.res.respuestas.length ? "" : "No respondería. "}
              {h.res.explicacion}
              {h.fuera ? " (simulando fuera de horario)" : ""}
            </p>
            {h.deVerdad && (
              <Link
                href={`/inbox?c=${encodeURIComponent(h.deVerdad)}`}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-300 hover:text-brand-200"
              >
                <Inbox className="h-3 w-3" /> Abrir en la bandeja <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        ))}
        <div ref={fin} />
      </div>

      <div className="space-y-2 border-t border-ink-800 p-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            probar();
          }}
        >
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribí como si fueras el cliente"
            className="input py-2"
            aria-label="Mensaje de prueba"
          />
          <button type="submit" className="btn-primary shrink-0 px-3 py-2" disabled={!texto.trim() || !!cargando} aria-label="Probar">
            {cargando === "probar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {puedeMandar ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 hover:text-brand-200 disabled:opacity-40"
              disabled={!ultimoTexto || !!cargando}
              onClick={mandarDeVerdad}
              title="Crea el mensaje en la Bandeja como si lo hubiera mandado un cliente"
            >
              {cargando === "mandar" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Inbox className="h-3.5 w-3.5" />}
              Mandarlo de verdad a la bandeja
            </button>
          ) : (
            <span />
          )}
          {historial.length > 0 && (
            <button type="button" className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-white" onClick={() => setHistorial([])}>
              <Trash2 className="h-3.5 w-3.5" /> Limpiar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
