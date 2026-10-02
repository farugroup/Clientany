"use client";
// ============================================================
// Clientany · Bandeja — «Escribirle a un cliente» (abrir un chat nuevo)
// y el simulador «Probar como cliente» (sólo demo o ?simular=1).
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { FlaskConical, Loader2, MessageSquarePlus } from "lucide-react";
import { avisar, Campo, Modal } from "@/components/crm/ui";
import { normalizarTelefono, ventanaAbierta } from "@/lib/crm/core";
import { getRepo, useCrm } from "@/lib/crm/repo";
import { useCanales, usePlantillas } from "@/lib/crm/hooks";
import type { BotResultado, Canal, Conversacion } from "@/lib/crm/types";
import { canalMeta } from "./comun";
import { plantillasUsables, rellenarPlantilla } from "./plantillas";

export interface PrecargaNuevoChat {
  nombre?: string;
  identificador?: string;
  contacto_id?: string;
}

function etiquetaIdentificador(c: Canal | undefined): string {
  switch (c?.tipo) {
    case "whatsapp": return "Teléfono";
    case "instagram": return "Usuario o id de Instagram";
    case "messenger": return "Id de Messenger (PSID)";
    default: return "Teléfono o identificador";
  }
}

export function NuevoChatModal({
  abierto,
  onCerrar,
  precarga,
  onCreada,
}: {
  abierto: boolean;
  onCerrar: () => void;
  precarga?: PrecargaNuevoChat | null;
  onCreada: (conv: Conversacion) => void;
}) {
  const canales = useCanales();
  const plantillas = usePlantillas();
  const convs = useCrm((s) => s.conversaciones);
  const [canalId, setCanalId] = useState("");
  const [identificador, setIdentificador] = useState("");
  const [nombre, setNombre] = useState("");
  const [texto, setTexto] = useState("");
  const [plantillaId, setPlantillaId] = useState("");
  const [params, setParams] = useState<string[]>([]);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setIdentificador(precarga?.identificador || "");
    setNombre(precarga?.nombre || "");
    setTexto("");
    setPlantillaId("");
    setParams([]);
  }, [abierto, precarga]);
  // Canal por defecto: el primero conectado (sólo si todavía no hay uno elegido).
  useEffect(() => {
    if (abierto && !canalId && canales.length) setCanalId(canales.find((c) => c.estado === "conectado")?.id || canales[0].id);
  }, [abierto, canalId, canales]);

  const canal = canales.find((c) => c.id === canalId);
  const ident = canal?.tipo === "whatsapp" ? normalizarTelefono(identificador) : identificador.trim().replace(/^@/, "");
  const existente = useMemo(() => convs.find((c) => c.canal_id === canalId && c.identificador === ident) || null, [convs, canalId, ident]);
  const conVentana = !!existente && ventanaAbierta(existente);
  const esWa = canal?.tipo === "whatsapp";
  const esMeta = canal?.tipo === "instagram" || canal?.tipo === "messenger";
  const necesitaPlantilla = esWa && !conVentana;
  const usables = useMemo(() => plantillasUsables(plantillas, canalId), [plantillas, canalId]);
  const plantilla = usables.find((p) => p.id === plantillaId) || null;
  useEffect(() => {
    setParams(Array.from({ length: plantilla?.variables || 0 }).map(() => ""));
  }, [plantilla]);

  const faltanParams = !!plantilla && params.some((p) => !p.trim());
  const puede = !!canal && ident.length > 0 && !creando && !faltanParams;

  async function crear() {
    if (!canal || !puede) return;
    setCreando(true);
    try {
      const conv = await getRepo().nuevaConversacion({
        canal_id: canal.id,
        identificador: ident,
        nombre: nombre.trim() || undefined,
        contacto_id: precarga?.contacto_id,
        texto: necesitaPlantilla || (esMeta && !conVentana) ? undefined : texto.trim() || undefined,
        plantilla: necesitaPlantilla && plantilla ? { nombre: plantilla.nombre, parametros: params.map((p) => p.trim()) } : undefined,
      });
      avisar(existente ? "Chat abierto" : "Chat creado");
      onCerrar();
      onCreada(conv);
    } catch (e) {
      avisar(e, "error");
    } finally {
      setCreando(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={<span className="flex items-center gap-2"><MessageSquarePlus className="h-4 w-4 text-brand-300" /> Escribirle a un cliente</span>}
      pie={
        <>
          <button className="btn-ghost" onClick={onCerrar} disabled={creando}>Cancelar</button>
          <button className="btn-primary" onClick={crear} disabled={!puede}>
            {creando && <Loader2 className="h-4 w-4 animate-spin" />} {existente ? "Abrir el chat" : necesitaPlantilla && plantilla ? "Mandar plantilla" : texto.trim() ? "Enviar" : "Crear chat"}
          </button>
        </>
      }
    >
      {canales.length === 0 ? (
        <div className="text-sm text-ink-400">Primero conectá un canal (WhatsApp, Instagram o Messenger) en Conexiones.</div>
      ) : (
        <div className="space-y-3">
          <Campo etiqueta="Canal">
            <div className="flex flex-wrap gap-1.5">
              {canales.map((c) => {
                const m = canalMeta(c.tipo);
                const Icono = m.icono;
                const on = c.id === canalId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCanalId(c.id)}
                    className={`chip border ${on ? "border-brand-500/40 bg-brand-500/15 text-white" : "border-ink-700 bg-ink-850 text-ink-300 hover:text-white"}`}
                    title={c.nombre}
                  >
                    <Icono className="h-3.5 w-3.5" style={{ color: m.color }} /> {c.nombre}
                  </button>
                );
              })}
            </div>
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta={etiquetaIdentificador(canal)}>
              <input className="input" value={identificador} onChange={(e) => setIdentificador(e.target.value)} placeholder={esWa ? "11 5555-1234" : ""} inputMode={esWa ? "tel" : undefined} autoFocus />
            </Campo>
            <Campo etiqueta="Nombre" ayuda="opcional">
              <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </Campo>
          </div>
          {existente && (
            <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 px-3 py-2 text-xs text-brand-200">
              Ya hay un chat con este cliente en este canal{conVentana ? ": podés escribirle directo." : "."}
            </div>
          )}
          {necesitaPlantilla ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
                Para arrancar una charla por WhatsApp hay que mandar una plantilla aprobada por Meta. Después, cuando conteste, escribís libre.
              </div>
              {usables.length === 0 ? (
                <div className="text-xs text-ink-400">No hay plantillas aprobadas. Sincronizalas desde Conexiones o cargá una en Plantillas. Podés crear el chat vacío igual.</div>
              ) : (
                <>
                  <Campo etiqueta="Plantilla">
                    <select className="input" value={plantillaId} onChange={(e) => setPlantillaId(e.target.value)}>
                      <option value="">Elegí una…</option>
                      {usables.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({p.idioma})</option>)}
                    </select>
                  </Campo>
                  {plantilla && (
                    <>
                      {params.length > 0 && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {params.map((v, i) => (
                            <Campo key={i} etiqueta={`Variable {{${i + 1}}}`}>
                              <input className="input" value={v} placeholder={plantilla.ejemplo?.[i] || ""} onChange={(e) => setParams(params.map((x, j) => (j === i ? e.target.value : x)))} />
                            </Campo>
                          ))}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-brand-600 px-3.5 py-2.5 text-sm text-white">{rellenarPlantilla(plantilla.cuerpo, params)}</div>
                    </>
                  )}
                </>
              )}
            </div>
          ) : esMeta && !conVentana ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
              En Instagram y Messenger Meta no deja escribir primero: el chat queda creado y vas a poder contestar cuando el cliente escriba.
            </div>
          ) : (
            <Campo etiqueta="Primer mensaje" ayuda="opcional">
              <textarea className="input min-h-[80px]" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Hola, ¿cómo estás? Te escribo de…" />
            </Campo>
          )}
        </div>
      )}
    </Modal>
  );
}

// ---------- simulador ----------
export function SimuladorModal({
  abierto,
  onCerrar,
  onCreada,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onCreada: (conv: Conversacion, bot: BotResultado) => void;
}) {
  const canales = useCanales();
  const [canalId, setCanalId] = useState("");
  const [nombre, setNombre] = useState("Cliente de prueba");
  const [identificador, setIdentificador] = useState("11 4000-0000");
  const [texto, setTexto] = useState("Hola, ¿tienen stock?");
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    if (abierto && !canalId && canales.length) setCanalId(canales[0].id);
  }, [abierto, canalId, canales]);
  const canal = canales.find((c) => c.id === canalId);

  async function simular() {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      const r = await getRepo().simularEntrante({
        canal_id: canalId || undefined,
        canal_tipo: canal?.tipo,
        identificador: canal?.tipo === "whatsapp" || !canal ? normalizarTelefono(identificador) || identificador.trim() : identificador.trim(),
        nombre: nombre.trim() || undefined,
        texto: texto.trim(),
      });
      onCerrar();
      onCreada(r.conversacion, r.bot);
    } catch (e) {
      avisar(e, "error");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={<span className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-brand-300" /> Probar como cliente</span>}
      ancho="sm"
      pie={
        <>
          <button className="btn-ghost" onClick={onCerrar} disabled={enviando}>Cancelar</button>
          <button className="btn-primary" onClick={simular} disabled={enviando || !texto.trim()}>
            {enviando && <Loader2 className="h-4 w-4 animate-spin" />} Mandar como cliente
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-ink-400">Simula que un cliente escribe por un canal: el mensaje entra a la bandeja y el bot contesta como lo haría de verdad.</p>
        {canales.length > 0 && (
          <Campo etiqueta="Canal">
            <select className="input" value={canalId} onChange={(e) => setCanalId(e.target.value)}>
              {canales.map((c) => <option key={c.id} value={c.id}>{canalMeta(c.tipo).nombre} · {c.nombre}</option>)}
            </select>
          </Campo>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Nombre"><input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
          <Campo etiqueta={etiquetaIdentificador(canal)}><input className="input" value={identificador} onChange={(e) => setIdentificador(e.target.value)} /></Campo>
        </div>
        <Campo etiqueta="Lo que escribe">
          <textarea className="input min-h-[80px]" value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus />
        </Campo>
      </div>
    </Modal>
  );
}
