"use client";
// ============================================================
// Clientany · Bandeja — la columna del chat: encabezado (nombre editable,
// canal, ventana de 24 hs, chips de estado), acciones, nota interna,
// mensajes, redactor; y la ficha (columna derecha en la compu, hoja en
// el celular). Soltar un archivo sobre el chat lo adjunta.
// ============================================================
import { useEffect, useMemo, useState, type DragEvent as RDragEvent } from "react";
import { AlertTriangle, ArrowLeft, BellOff, Check, Clock, Flame, Hand, Loader2, Moon, Paperclip, Pencil, StickyNote, X } from "lucide-react";
import { avisar, ChipColor, Modal } from "@/components/crm/ui";
import { armarFila, telefonoLindo } from "@/lib/crm/core";
import { CrmError, getRepo, type AccionConversacion } from "@/lib/crm/repo";
import { useConversacion, useEmpresa, useEsAdmin, useMiembros, usePlantillas, useRapidas, useYo } from "@/lib/crm/hooks";
import type { Mensaje, Plantilla } from "@/lib/crm/types";
import { AccionesChat } from "./acciones";
import { Mensajes } from "./burbujas";
import { Avatar, BotonChico, ChipCanal, etiquetasDe, textoRecordatorio, useMediaQuery, ZONA_DEFAULT } from "./comun";
import { FichaContacto } from "./ficha";
import { Posponer } from "./posponer";
import { Redactor } from "./redactor";

export function ChatPanel({
  convId,
  esCelular,
  onVolver,
  fichaAbierta,
  onFicha,
  onBorrada,
}: {
  convId: string;
  esCelular: boolean;
  onVolver: () => void;
  fichaAbierta: boolean;
  onFicha: (abierta: boolean) => void;
  onBorrada: () => void;
}) {
  const { conv, mensajes, cargando, contacto, pedidos } = useConversacion(convId);
  const empresa = useEmpresa();
  const yo = useYo();
  const esAdmin = useEsAdmin();
  const miembros = useMiembros();
  const plantillas = usePlantillas();
  const rapidas = useRapidas();
  const zona = empresa?.horario?.zona || ZONA_DEFAULT;
  // La ficha va como columna sólo con pantalla ancha (lg); en tablet y celular, como hoja.
  const anchaParaFicha = useMediaQuery("(min-width: 1024px)") === true;

  const [cita, setCita] = useState<Mensaje | null>(null);
  const [adjunto, setAdjunto] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [abrirPlantillasTick, setAbrirPlantillasTick] = useState(0);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [notaAbierta, setNotaAbierta] = useState(false);
  const [notaTexto, setNotaTexto] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [posponer, setPosponer] = useState(false);
  const [tick, setTick] = useState(0);

  // La ventana de 24 hs se recalcula cada minuto.
  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 60_000);
    return () => window.clearInterval(t);
  }, []);
  // Al cambiar de chat se limpia lo que es de ese chat.
  useEffect(() => {
    setCita(null);
    setAdjunto(null);
    setEditandoNombre(false);
    setNotaAbierta(false);
  }, [convId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fila = useMemo(() => (conv ? armarFila(conv) : null), [conv, tick]);

  if (!conv || !fila) {
    return (
      <div className="flex h-full flex-1 items-center justify-center text-sm text-ink-500">
        {cargando ? <Loader2 className="h-5 w-5 animate-spin" /> : "Esta conversación ya no está."}
      </div>
    );
  }

  const loTieneOtro = !!conv.tomado_por && (!yo || conv.tomado_por.quien !== yo.id);
  const etiquetas = etiquetasDe(empresa, conv.etiquetas);
  const etapa = empresa?.etapas.find((e) => e.id === conv.etapa_id) || null;
  const recordatorio = textoRecordatorio(conv.recordar, zona);

  async function accion(a: AccionConversacion, aviso?: string) {
    try {
      await getRepo().accion(conv!.id, a);
      if (aviso) avisar(aviso);
    } catch (e) {
      avisar(e, "error");
    }
  }

  async function enviar(texto: string) {
    try {
      if (adjunto) {
        await getRepo().enviarArchivo(conv!.id, adjunto, texto || undefined);
        setAdjunto(null);
      } else {
        await getRepo().enviarTexto(conv!.id, texto, cita ? { cita_id: cita.id } : undefined);
      }
      setCita(null);
    } catch (e) {
      if (e instanceof CrmError && e.codigo === "ventana_cerrada") setAbrirPlantillasTick((n) => n + 1);
      avisar(e, "error");
      throw e;
    }
  }

  async function enviarPlantilla(p: Plantilla, parametros: string[]) {
    try {
      await getRepo().enviarPlantilla(conv!.id, { nombre: p.nombre, idioma: p.idioma, parametros });
      avisar("Plantilla enviada");
    } catch (e) {
      avisar(e, "error");
      throw e;
    }
  }

  async function reintentar(m: Mensaje) {
    try {
      await getRepo().enviarTexto(conv!.id, m.texto, m.cita_id ? { cita_id: m.cita_id } : undefined);
    } catch (e) {
      avisar(e, "error");
    }
  }

  async function borrarMensaje(m: Mensaje) {
    try {
      await getRepo().borrarMensaje(conv!.id, m.id);
    } catch (e) {
      avisar(e, "error");
    }
  }

  async function guardarNombre() {
    const n = nombreNuevo.trim();
    setEditandoNombre(false);
    if (!n || n === conv!.nombre) return;
    await accion({ tipo: "nombre", nombre: n }, "Nombre guardado");
  }

  async function guardarNota() {
    setGuardandoNota(true);
    try {
      await getRepo().accion(conv!.id, { tipo: "nota", nota: notaTexto.trim().slice(0, 500) });
      setNotaAbierta(false);
      avisar(notaTexto.trim() ? "Nota guardada" : "Nota quitada");
    } catch (e) {
      avisar(e, "error");
    } finally {
      setGuardandoNota(false);
    }
  }

  function abrirNota() {
    setNotaTexto(conv!.nota || "");
    setNotaAbierta(true);
  }

  // ----- soltar archivos -----
  function onDragOver(e: RDragEvent<HTMLDivElement>) {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setArrastrando(true);
    }
  }
  function onDrop(e: RDragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastrando(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setAdjunto(f);
  }

  const identificador =
    conv.canal === "whatsapp" || conv.canal === "manual"
      ? telefonoLindo(conv.identificador) || conv.identificador
      : conv.canal === "instagram"
      ? `@${contacto?.ig_usuario || conv.identificador}`
      : "Messenger";

  const ventana =
    fila.ventana_horas === null ? null : fila.ventana_horas > 0 ? (
      <span className="inline-flex items-center gap-1 text-green-400" title="Ventana de 24 hs de Meta: hasta cuándo podés escribir libre">
        <Check className="h-3 w-3" /> podés responder ({fila.ventana_horas < 1 ? "menos de 1" : Math.floor(fila.ventana_horas)} h)
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-red-400" title="Pasaron más de 24 hs desde el último mensaje del cliente">
        <Clock className="h-3 w-3" /> {conv.canal === "whatsapp" ? "+24 hs: sólo plantilla" : "+24 hs: Meta no deja escribir primero"}
      </span>
    );

  const ficha = <FichaContacto contacto={contacto} pedidos={pedidos} conv={conv} />;

  return (
    <div className="flex h-full min-h-0 flex-1">
      <div className="relative flex min-w-0 flex-1 flex-col" onDragOver={onDragOver} onDragLeave={() => setArrastrando(false)} onDrop={onDrop}>
        {/* ----- encabezado ----- */}
        <div className="flex items-center gap-2.5 border-b border-ink-800 px-3 py-2">
          {esCelular && (
            <button onClick={onVolver} className="-ml-1 rounded-lg p-1.5 text-ink-300 hover:bg-ink-800 hover:text-white" aria-label="Volver a la lista" title="Volver">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <Avatar nombre={conv.nombre} canal={conv.canal} tam={esCelular ? "sm" : "md"} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {editandoNombre ? (
                <input
                  className="input h-7 max-w-[220px] px-2 py-0 text-sm"
                  value={nombreNuevo}
                  autoFocus
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  onBlur={guardarNombre}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") guardarNombre();
                    if (e.key === "Escape") setEditandoNombre(false);
                  }}
                  aria-label="Nombre del cliente"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setNombreNuevo(conv.nombre);
                    setEditandoNombre(true);
                  }}
                  className="group flex min-w-0 items-center gap-1.5 text-left"
                  title="Cambiar el nombre"
                >
                  <span className="truncate text-sm font-bold text-white">{conv.nombre}</span>
                  <Pencil className="h-3 w-3 shrink-0 text-ink-600 opacity-0 transition group-hover:opacity-100" />
                </button>
              )}
              <ChipCanal tipo={conv.canal} />
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-400">
              <span className="font-mono">{identificador}</span>
              {ventana}
            </div>
          </div>
          {esCelular && (
            <AccionesChat
              conv={conv}
              fila={fila}
              empresa={empresa}
              miembros={miembros}
              yo={yo}
              esAdmin={esAdmin}
              esCelular
              fichaAbierta={fichaAbierta}
              onFicha={() => onFicha(!fichaAbierta)}
              onNota={abrirNota}
              onBorrada={onBorrada}
            />
          )}
        </div>

        {/* ----- chips de estado ----- */}
        {(conv.urgente || etapa || etiquetas.length > 0 || recordatorio || conv.necesita_humano || conv.fuera_horario || conv.baja) && (
          <div className="flex flex-wrap items-center gap-1 border-b border-ink-800 px-3 py-1.5">
            {conv.urgente && <span className="chip bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400"><Flame className="h-3 w-3" /> Urgente</span>}
            {etapa && <ChipColor color={etapa.color} chico>{etapa.nombre}</ChipColor>}
            {etiquetas.map((e) => <ChipColor key={e.id} color={e.color} chico>{e.nombre}</ChipColor>)}
            {recordatorio && (
              <span className="chip bg-ink-800 px-2 py-0.5 text-[10px] text-ink-300" title={conv.recordar?.nota || undefined}>
                <Clock className="h-3 w-3" /> {recordatorio}
                {conv.recordar?.nota ? <span className="text-ink-500">· {conv.recordar.nota}</span> : null}
                <button className="ml-1 font-semibold text-brand-300 hover:text-white" onClick={() => setPosponer(true)}>cambiar</button>
                <span className="text-ink-600">·</span>
                <button className="font-semibold text-brand-300 hover:text-white" onClick={() => accion({ tipo: "recordar", fecha: null }, "Recordatorio quitado")}>quitar</button>
              </span>
            )}
            {conv.necesita_humano && (
              <span className="chip bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                <AlertTriangle className="h-3 w-3" /> Necesita una persona
                <button className="ml-1 font-semibold text-red-300 hover:text-white" onClick={() => accion({ tipo: "humano_atendido" }, "Listo: ya lo atiende una persona")}>ya lo atiendo</button>
              </span>
            )}
            {conv.fuera_horario && <span className="chip bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300"><Moon className="h-3 w-3" /> Fuera de horario</span>}
            {conv.baja && (
              <span className="chip bg-ink-800 px-2 py-0.5 text-[10px] text-ink-300">
                <BellOff className="h-3 w-3" /> pidió la BAJA — no le salen los automáticos
                <button className="ml-1 font-semibold text-brand-300 hover:text-white" onClick={() => accion({ tipo: "baja", valor: false }, "Fuera de Baja")}>quitar</button>
              </span>
            )}
          </div>
        )}

        {/* ----- acciones (compu) ----- */}
        {!esCelular && (
          <AccionesChat
            conv={conv}
            fila={fila}
            empresa={empresa}
            miembros={miembros}
            yo={yo}
            esAdmin={esAdmin}
            esCelular={false}
            fichaAbierta={fichaAbierta}
            onFicha={() => onFicha(!fichaAbierta)}
            onNota={abrirNota}
            onBorrada={onBorrada}
          />
        )}

        {/* ----- lo tomó otro ----- */}
        {loTieneOtro && (
          <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <Hand className="h-4 w-4 shrink-0" />
            <span className="flex-1">Este chat lo tomó <b>{conv.tomado_por?.nombre}</b>: por ahora no se le puede escribir desde acá.</span>
            {esAdmin && <BotonChico onClick={() => accion({ tipo: "soltar" }, "Soltado")}>Soltar</BotonChico>}
          </div>
        )}

        {/* ----- nota interna ----- */}
        {(notaAbierta || conv.nota) && (
          <div className="border-b border-amber-500/20 bg-amber-500/10 px-3 py-2">
            {notaAbierta ? (
              <div>
                <textarea
                  className="input min-h-[60px] border-amber-500/30 bg-ink-900/60 text-xs"
                  value={notaTexto}
                  maxLength={500}
                  autoFocus
                  onChange={(e) => setNotaTexto(e.target.value)}
                  placeholder="Nota interna: sólo la ve el equipo"
                  aria-label="Nota interna"
                />
                <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                  <span className="text-amber-300/70">{notaTexto.length}/500</span>
                  <span className="flex-1" />
                  <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => setNotaAbierta(false)} disabled={guardandoNota}>Cancelar</button>
                  {conv.nota && (
                    <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => { setNotaTexto(""); setTimeout(guardarNota, 0); }} disabled={guardandoNota}>Quitar</button>
                  )}
                  <button className="btn-primary px-2.5 py-1 text-xs" onClick={guardarNota} disabled={guardandoNota}>Guardar</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={abrirNota} className="flex w-full items-start gap-2 text-left text-xs text-amber-100" title="Editar la nota">
                <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                <span className="flex-1 whitespace-pre-wrap">{conv.nota}</span>
                <Pencil className="mt-0.5 h-3 w-3 shrink-0 text-amber-300/60" />
              </button>
            )}
          </div>
        )}

        {/* ----- mensajes ----- */}
        <Mensajes mensajes={mensajes} conv={conv} cargando={cargando} onCitar={setCita} onReintentar={reintentar} onBorrar={borrarMensaje} />

        {arrastrando && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-ink-950/70 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-brand-400 bg-ink-900/90 px-6 py-4 text-sm font-semibold text-brand-200">
              <Paperclip className="h-5 w-5" /> Soltá acá para adjuntar al chat
            </div>
          </div>
        )}

        {/* ----- redactor ----- */}
        <Redactor
          conv={conv}
          fila={fila}
          deshabilitado={loTieneOtro}
          motivo={loTieneOtro ? `Lo tiene ${conv.tomado_por?.nombre}` : undefined}
          plantillas={plantillas}
          rapidas={rapidas}
          cita={cita}
          onQuitarCita={() => setCita(null)}
          adjunto={adjunto}
          onAdjunto={setAdjunto}
          onEnviar={enviar}
          onEnviarPlantilla={enviarPlantilla}
          abrirPlantillasTick={abrirPlantillasTick}
          esCelular={esCelular}
        />
      </div>

      {/* ----- ficha ----- */}
      {anchaParaFicha && fichaAbierta && (
        <div className="flex w-[320px] shrink-0 flex-col border-l border-ink-800">
          <div className="flex items-center justify-end border-b border-ink-800 px-2 py-1">
            <button onClick={() => onFicha(false)} className="rounded-lg p-1 text-ink-500 hover:bg-ink-800 hover:text-white" aria-label="Cerrar la ficha" title="Cerrar la ficha">
              <X className="h-4 w-4" />
            </button>
          </div>
          {ficha}
        </div>
      )}
      {!anchaParaFicha && (
        <Modal abierto={fichaAbierta} onCerrar={() => onFicha(false)} titulo="Ficha del cliente" ancho="lg">
          <div className="-mx-5 -my-4 h-[75vh]">{ficha}</div>
        </Modal>
      )}

      <Posponer
        abierto={posponer}
        onCerrar={() => setPosponer(false)}
        zona={zona}
        inicial={conv.recordar ? { fecha: conv.recordar.fecha, nota: conv.recordar.nota } : null}
        onGuardar={(fecha, nota) => accion({ tipo: "recordar", fecha, nota: nota || undefined }, "Recordatorio cambiado")}
      />
    </div>
  );
}
