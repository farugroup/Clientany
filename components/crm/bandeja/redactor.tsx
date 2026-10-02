"use client";
// ============================================================
// Clientany · Bandeja — el redactor: textarea que crece, Enter manda,
// rápidas (rayo y «/atajo»), plantillas (WhatsApp), emojis, adjuntos
// (clip, pegar, soltar), IA con «Deshacer», y la cita que se responde.
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent as RClipboardEvent, type KeyboardEvent as RKeyboardEvent } from "react";
import { FileText, Loader2, Paperclip, Send, Smile, Sparkles, Undo2, X, Zap } from "lucide-react";
import { avisar, Campo, Modal } from "@/components/crm/ui";
import { previewMensaje, recortar } from "@/lib/crm/core";
import { getRepo } from "@/lib/crm/repo";
import type { Conversacion, FilaBandeja, Mensaje, Plantilla, Rapida } from "@/lib/crm/types";
import { Popover } from "./comun";
import { EnviarPlantillaModal, ListaPlantillas, plantillasUsables } from "./plantillas";

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "🥰", "😘", "😎", "🤩", "🙂", "😉", "😅", "🤔", "🙄", "😴",
  "😢", "😭", "😡", "🤯", "🥳", "🤗", "🙏", "👍", "👎", "👏", "🙌", "💪", "🤝", "👋", "✌️", "🤞",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🔥", "✨", "⭐", "🎉", "🎁", "🛒", "📦", "🚚", "💳", "💰",
  "📍", "📞", "📸", "✅", "❌", "⚠️", "⏰", "📅", "🙈", "😬", "🤤", "🥲",
];

type PopoverAbierto = "rapidas" | "plantillas" | "emoji" | null;

export function Redactor({
  conv,
  fila,
  deshabilitado,
  motivo,
  plantillas,
  rapidas,
  cita,
  onQuitarCita,
  adjunto,
  onAdjunto,
  onEnviar,
  onEnviarPlantilla,
  abrirPlantillasTick,
  esCelular,
}: {
  conv: Conversacion;
  fila: FilaBandeja;
  deshabilitado?: boolean;
  motivo?: string;
  plantillas: Plantilla[];
  rapidas: Rapida[];
  cita: Mensaje | null;
  onQuitarCita: () => void;
  adjunto: File | null;
  onAdjunto: (f: File | null) => void;
  onEnviar: (texto: string) => Promise<void>;
  onEnviarPlantilla: (p: Plantilla, parametros: string[]) => Promise<void>;
  abrirPlantillasTick: number;
  esCelular: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [popover, setPopover] = useState<PopoverAbierto>(null);
  const [busqRapidas, setBusqRapidas] = useState("");
  const [sugAbierta, setSugAbierta] = useState(true);
  const [sugIdx, setSugIdx] = useState(0);
  const [plantillaElegida, setPlantillaElegida] = useState<Plantilla | null>(null);
  const [guardarRapida, setGuardarRapida] = useState<{ atajo: string; texto: string } | null>(null);
  const [ia, setIa] = useState(false);
  const [anterior, setAnterior] = useState<string | null>(null);
  const deshacerTimer = useRef<number | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cerrarPopover = useCallback(() => setPopover(null), []);

  const esWa = conv.canal === "whatsapp";
  const ventanaCerrada = fila.ventana_horas === 0;
  const usables = useMemo(() => plantillasUsables(plantillas, conv.canal_id), [plantillas, conv.canal_id]);
  const bloqueado = !!deshabilitado || ventanaCerrada;

  // Al cambiar de chat se limpia el borrador y las sugerencias.
  useEffect(() => {
    setTexto("");
    setPopover(null);
    setAnterior(null);
  }, [conv.id]);

  // El chat pide abrir el selector de plantillas (ventana cerrada al mandar).
  useEffect(() => {
    if (abrirPlantillasTick > 0 && esWa) setPopover("plantillas");
  }, [abrirPlantillasTick, esWa]);

  // Autosize: un renglón y crece hasta 220 px.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [texto]);

  // «/atajo» al final del texto → sugerencias arriba del cuadro.
  const token = useMemo(() => {
    const m = texto.match(/(?:^|\s)(\/[^\s]*)$/);
    return m ? m[1] : null;
  }, [texto]);
  const sugerencias = useMemo(() => {
    if (!token) return [];
    const t = token.slice(1).toLowerCase();
    return rapidas
      .filter((r) => r.atajo.toLowerCase().replace(/^\//, "").includes(t) || (t.length >= 2 && r.texto.toLowerCase().includes(t)))
      .slice(0, 8);
  }, [token, rapidas]);
  useEffect(() => {
    setSugAbierta(true);
    setSugIdx(0);
  }, [token]);
  const mostrarSug = !!token && sugAbierta && sugerencias.length > 0;

  function insertarEnCursor(s: string) {
    const el = ref.current;
    const ini = el?.selectionStart ?? texto.length;
    const fin = el?.selectionEnd ?? texto.length;
    const nuevo = texto.slice(0, ini) + s + texto.slice(fin);
    setTexto(nuevo);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(ini + s.length, ini + s.length);
    });
  }

  function usarRapida(r: Rapida) {
    if (token) setTexto(texto.slice(0, texto.length - token.length) + r.texto);
    else if (!texto.trim()) setTexto(r.texto);
    else insertarEnCursor(r.texto);
    setPopover(null);
    requestAnimationFrame(() => ref.current?.focus());
  }

  async function enviar() {
    const t = texto.trim();
    if ((!t && !adjunto) || enviando || bloqueado) return;
    setEnviando(true);
    setTexto("");
    try {
      await onEnviar(t);
    } catch {
      setTexto(t); // el chat ya avisó el error; el texto vuelve al cuadro
    } finally {
      setEnviando(false);
      requestAnimationFrame(() => ref.current?.focus());
    }
  }

  function onKeyDown(e: RKeyboardEvent<HTMLTextAreaElement>) {
    if (mostrarSug) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSugIdx((i) => (i + 1) % sugerencias.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSugIdx((i) => (i - 1 + sugerencias.length) % sugerencias.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        usarRapida(sugerencias[sugIdx]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSugAbierta(false);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  function onPaste(e: RClipboardEvent<HTMLTextAreaElement>) {
    const f = e.clipboardData?.files?.[0];
    if (f) {
      e.preventDefault();
      onAdjunto(f);
    }
  }

  async function sugerirIA() {
    if (ia) return;
    setIa(true);
    try {
      const s = await getRepo().sugerirRespuesta(conv.id, texto.trim() || undefined);
      setAnterior(texto);
      setTexto(s.texto);
      if (deshacerTimer.current) window.clearTimeout(deshacerTimer.current);
      deshacerTimer.current = window.setTimeout(() => setAnterior(null), 10_000);
      if (s.motivo) avisar(`Sugerencia lista (${s.motivo})`, "info");
    } catch (e) {
      avisar(e, "error");
    } finally {
      setIa(false);
    }
  }
  function deshacer() {
    if (anterior === null) return;
    setTexto(anterior);
    setAnterior(null);
  }

  const placeholder = deshabilitado
    ? motivo || "No se puede escribir desde acá"
    : ventanaCerrada
    ? esWa
      ? "Pasaron 24 hs: mandá una plantilla"
      : "Pasaron 24 hs: Meta no deja escribir primero. Esperá a que el cliente escriba."
    : `Escribile a ${conv.nombre}… (Enter manda, Shift+Enter salta de renglón)`;

  const btn = "rounded-lg p-2 text-ink-400 transition hover:bg-ink-800 hover:text-white disabled:opacity-40 disabled:pointer-events-none";

  return (
    <div className="relative border-t border-ink-800 bg-ink-900 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:px-3">
      {/* sugerencias de «/» */}
      {mostrarSug && (
        <div className="absolute bottom-full left-2 right-2 z-40 mb-1 max-h-60 overflow-y-auto rounded-xl border border-ink-700 bg-ink-850 p-1 shadow-card md:left-3 md:right-auto md:w-96">
          {sugerencias.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => usarRapida(r)}
              className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 text-left ${i === sugIdx ? "bg-brand-500/15" : "hover:bg-ink-800"}`}
            >
              <span className="shrink-0 font-mono text-[11px] font-semibold text-brand-300">{r.atajo}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-ink-300">{recortar(r.texto, 90)}</span>
            </button>
          ))}
          <div className="px-2.5 pb-1 pt-1 text-[10px] text-ink-600">↑↓ elegir · Enter o Tab insertar · Esc cerrar</div>
        </div>
      )}

      {/* cita */}
      {cita && (
        <div className="mb-2 flex items-start gap-2 rounded-lg border-l-2 border-brand-400 bg-ink-850 px-2.5 py-1.5 text-xs">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold text-brand-300">Respondiendo a {cita.direccion === "in" ? conv.nombre : cita.autor || "vos"}</div>
            <div className="truncate text-ink-300">{previewMensaje(cita.tipo, cita.texto, cita.media_nombre)}</div>
          </div>
          <button onClick={onQuitarCita} className="text-ink-500 hover:text-white" aria-label="Quitar cita"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* adjunto */}
      {adjunto && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-xs">
          <Paperclip className="h-3.5 w-3.5 text-brand-300" />
          <span className="min-w-0 flex-1 truncate text-ink-200">{adjunto.name}</span>
          <span className="text-ink-500">{Math.max(1, Math.round(adjunto.size / 1024))} KB</span>
          <button onClick={() => onAdjunto(null)} className="text-ink-500 hover:text-white" aria-label="Quitar adjunto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* deshacer IA */}
      {anterior !== null && (
        <div className="mb-2 flex items-center gap-2 text-xs text-ink-400">
          <Sparkles className="h-3.5 w-3.5 text-brand-300" /> Texto sugerido por la IA.
          <button onClick={deshacer} className="flex items-center gap-1 font-semibold text-brand-300 hover:text-white"><Undo2 className="h-3.5 w-3.5" /> Deshacer</button>
        </div>
      )}

      <div className="flex items-end gap-1.5">
        <textarea
          ref={ref}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          rows={1}
          disabled={bloqueado || enviando}
          placeholder={placeholder}
          className="input max-h-[220px] min-h-[42px] flex-1 resize-none py-2.5 text-base leading-5 md:text-sm"
          aria-label="Mensaje"
        />
        <button
          type="button"
          onClick={enviar}
          disabled={bloqueado || enviando || (!texto.trim() && !adjunto)}
          className="btn-primary h-[42px] shrink-0 px-3.5"
          aria-label="Enviar"
          title="Enviar (Enter)"
        >
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>

      {/* herramientas */}
      <div className="mt-1 flex items-center gap-0.5">
        <Popover
          abierto={popover === "rapidas"}
          onCerrar={cerrarPopover}
          arriba
          ancho="w-80 max-w-[90vw]"
          boton={
            <button type="button" className={btn} disabled={bloqueado} onClick={() => setPopover(popover === "rapidas" ? null : "rapidas")} title="Respuestas rápidas (o escribí /atajo)" aria-label="Respuestas rápidas">
              <Zap className="h-4 w-4" />
            </button>
          }
        >
          <div className="flex max-h-80 flex-col">
            <div className="border-b border-ink-800 p-2">
              <input className="input py-1.5 text-xs" placeholder="Buscar rápida…" value={busqRapidas} onChange={(e) => setBusqRapidas(e.target.value)} autoFocus />
            </div>
            <div className="no-scrollbar flex-1 overflow-y-auto p-1">
              {rapidas.filter((r) => `${r.atajo} ${r.texto}`.toLowerCase().includes(busqRapidas.toLowerCase())).map((r) => (
                <button key={r.id} type="button" onClick={() => usarRapida(r)} className="block w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-ink-800">
                  <span className="font-mono text-[11px] font-semibold text-brand-300">{r.atajo}</span>
                  <div className="truncate text-xs text-ink-300">{recortar(r.texto, 90)}</div>
                </button>
              ))}
              {rapidas.length === 0 && <div className="px-2.5 py-3 text-xs text-ink-500">Todavía no hay rápidas. Guardá lo que escribís abajo.</div>}
            </div>
            <div className="border-t border-ink-800 p-1.5">
              <button
                type="button"
                disabled={!texto.trim()}
                onClick={() => {
                  setGuardarRapida({ atajo: "/", texto: texto.trim() });
                  setPopover(null);
                }}
                className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-brand-300 hover:bg-ink-800 disabled:opacity-40"
              >
                Guardar lo escrito como rápida
              </button>
            </div>
          </div>
        </Popover>

        {esWa && (
          <Popover
            abierto={popover === "plantillas"}
            onCerrar={cerrarPopover}
            arriba
            ancho="w-auto"
            boton={
              <button
                type="button"
                className={`${btn} ${ventanaCerrada ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 hover:text-amber-200" : ""}`}
                disabled={!!deshabilitado}
                onClick={() => setPopover(popover === "plantillas" ? null : "plantillas")}
                title={ventanaCerrada ? "Pasaron 24 hs: sólo se puede mandar una plantilla aprobada" : "Plantillas de WhatsApp"}
                aria-label="Plantillas"
              >
                <FileText className="h-4 w-4" />
              </button>
            }
          >
            <ListaPlantillas
              plantillas={usables}
              onElegir={(p) => {
                setPlantillaElegida(p);
                setPopover(null);
              }}
            />
          </Popover>
        )}

        <Popover
          abierto={popover === "emoji"}
          onCerrar={cerrarPopover}
          arriba
          ancho="w-72 max-w-[90vw]"
          boton={
            <button type="button" className={btn} disabled={bloqueado} onClick={() => setPopover(popover === "emoji" ? null : "emoji")} title="Emoji" aria-label="Emoji">
              <Smile className="h-4 w-4" />
            </button>
          }
        >
          <div className="grid grid-cols-10 gap-0.5 p-2">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => insertarEnCursor(e)} className="rounded-md p-1 text-lg leading-none hover:bg-ink-800" aria-label={`Emoji ${e}`}>
                {e}
              </button>
            ))}
          </div>
        </Popover>

        <button type="button" className={btn} disabled={bloqueado} onClick={() => fileRef.current?.click()} title="Adjuntar imagen, audio, video o documento" aria-label="Adjuntar">
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onAdjunto(f);
            e.target.value = "";
          }}
        />

        <button type="button" className={`${btn} text-brand-300`} disabled={bloqueado || ia} onClick={sugerirIA} title={texto.trim() ? "Mejorar lo escrito con IA" : "Sugerir una respuesta con IA"} aria-label="Sugerir con IA">
          {ia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        </button>

        {!esCelular && texto.length > 0 && <span className="ml-auto text-[10px] text-ink-600">{texto.length}</span>}
      </div>

      <EnviarPlantillaModal
        plantilla={plantillaElegida}
        abierto={!!plantillaElegida}
        onCerrar={() => setPlantillaElegida(null)}
        onEnviar={async (parametros) => {
          if (!plantillaElegida) return;
          await onEnviarPlantilla(plantillaElegida, parametros);
        }}
      />

      <Modal
        abierto={!!guardarRapida}
        onCerrar={() => setGuardarRapida(null)}
        titulo="Guardar como rápida"
        ancho="sm"
        pie={
          <>
            <button className="btn-ghost" onClick={() => setGuardarRapida(null)}>Cancelar</button>
            <button
              className="btn-primary"
              disabled={!guardarRapida || guardarRapida.atajo.replace(/^\//, "").trim().length < 1 || !guardarRapida.texto.trim()}
              onClick={async () => {
                if (!guardarRapida) return;
                const atajo = "/" + guardarRapida.atajo.replace(/^\//, "").trim().toLowerCase().replace(/\s+/g, "-");
                try {
                  await getRepo().guardarRapida({ atajo, texto: guardarRapida.texto.trim() });
                  avisar(`Rápida ${atajo} guardada`);
                  setGuardarRapida(null);
                } catch (e) {
                  avisar(e, "error");
                }
              }}
            >
              Guardar
            </button>
          </>
        }
      >
        {guardarRapida && (
          <div className="space-y-3">
            <Campo etiqueta="Atajo" ayuda="se escribe con / en el cuadro">
              <input className="input font-mono" value={guardarRapida.atajo} onChange={(e) => setGuardarRapida({ ...guardarRapida, atajo: e.target.value })} placeholder="/envio" autoFocus />
            </Campo>
            <Campo etiqueta="Texto">
              <textarea className="input min-h-[100px]" value={guardarRapida.texto} onChange={(e) => setGuardarRapida({ ...guardarRapida, texto: e.target.value })} />
            </Campo>
          </div>
        )}
      </Modal>
    </div>
  );
}
