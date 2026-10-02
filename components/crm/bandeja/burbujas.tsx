"use client";
// ============================================================
// Clientany · Bandeja — los mensajes del chat: scroll que arranca abajo
// y se queda abajo, separadores por día, burbujas por tipo (texto,
// imagen, audio, video, documento, plantilla, sticker, ubicación,
// reacción), tildes de estado, citas y el menú por burbuja.
// ============================================================
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bot,
  Check,
  CheckCheck,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  ImageOff,
  MapPin,
  MoreHorizontal,
  Reply,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { avisar, ItemMenu, Modal } from "@/components/crm/ui";
import { horaCorta, previewMensaje } from "@/lib/crm/core";
import type { Conversacion, Mensaje } from "@/lib/crm/types";
import { fechaSeparador, Popover, TextoConLinks } from "./comun";

export function Mensajes({
  mensajes,
  conv,
  cargando,
  onCitar,
  onReintentar,
  onBorrar,
  children,
}: {
  mensajes: Mensaje[];
  conv: Conversacion;
  cargando?: boolean;
  onCitar: (m: Mensaje) => void;
  onReintentar: (m: Mensaje) => void;
  onBorrar: (m: Mensaje) => void;
  children?: ReactNode; // overlay de "soltá acá"
}) {
  const ref = useRef<HTMLDivElement>(null);
  const abajo = useRef(true);
  const [imagen, setImagen] = useState<{ url: string; nombre?: string } | null>(null);
  const ultimoId = mensajes.length ? mensajes[mensajes.length - 1].id : "";

  // Al cambiar de conversación, al fondo.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      abajo.current = true;
    }
  }, [conv.id]);

  // Cuando llegan mensajes, se queda abajo sólo si el usuario estaba abajo.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && abajo.current) el.scrollTop = el.scrollHeight;
  }, [mensajes.length, ultimoId]);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    abajo.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }, []);

  const porId = useMemo(() => new Map(mensajes.map((m) => [m.id, m])), [mensajes]);

  const items: ReactNode[] = [];
  let diaAnterior = "";
  for (const m of mensajes) {
    const dia = fechaSeparador(m.creado);
    if (dia !== diaAnterior) {
      diaAnterior = dia;
      items.push(
        <div key={`sep-${m.id}`} className="my-2 flex items-center justify-center">
          <span className="rounded-full bg-ink-800/80 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-400">{dia}</span>
        </div>
      );
    }
    items.push(
      <Burbuja
        key={m.id}
        m={m}
        conv={conv}
        citado={m.cita_id ? porId.get(m.cita_id) || null : null}
        onCitar={() => onCitar(m)}
        onReintentar={() => onReintentar(m)}
        onBorrar={() => onBorrar(m)}
        onImagen={(url, nombre) => setImagen({ url, nombre })}
      />
    );
  }

  return (
    <div ref={ref} onScroll={onScroll} className="relative min-h-0 flex-1 space-y-1.5 overflow-y-auto bg-ink-950/40 px-3 py-3 md:px-4">
      {cargando && mensajes.length === 0 && (
        <div className="py-8 text-center text-xs text-ink-500">Cargando mensajes…</div>
      )}
      {!cargando && mensajes.length === 0 && (
        <div className="py-8 text-center text-xs text-ink-500">Todavía no hay mensajes. Escribile abajo.</div>
      )}
      {items}
      {children}
      <Modal abierto={!!imagen} onCerrar={() => setImagen(null)} titulo={imagen?.nombre || "Imagen"} ancho="xl">
        {imagen && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagen.url} alt={imagen.nombre || "Imagen"} className="mx-auto max-h-[70vh] rounded-xl object-contain" />
        )}
      </Modal>
    </div>
  );
}

// ---------- una burbuja ----------
function Burbuja({
  m,
  conv,
  citado,
  onCitar,
  onReintentar,
  onBorrar,
  onImagen,
}: {
  m: Mensaje;
  conv: Conversacion;
  citado: Mensaje | null;
  onCitar: () => void;
  onReintentar: () => void;
  onBorrar: () => void;
  onImagen: (url: string, nombre?: string) => void;
}) {
  const [menu, setMenu] = useState(false);
  const cerrar = useCallback(() => setMenu(false), []);
  const entrante = m.direccion === "in";
  const bot = m.de === "bot";

  if (m.de === "sistema") {
    return (
      <div className="my-1 flex justify-center">
        <span className="max-w-[85%] rounded-full bg-ink-800/70 px-3 py-1 text-center text-[11px] text-ink-400">{m.texto}</span>
      </div>
    );
  }
  if (m.tipo === "reaccion") {
    return (
      <div className={`flex ${entrante ? "justify-start" : "justify-end"}`}>
        <span className="px-2 text-[11px] text-ink-500" title={horaCorta(m.creado)}>
          {entrante ? "Reaccionó" : "Reaccionaste"} {m.texto}
        </span>
      </div>
    );
  }

  const clase = entrante
    ? "rounded-tl-sm bg-ink-800 text-ink-100"
    : bot
    ? "rounded-tr-sm border border-brand-500/30 bg-brand-500/10 text-brand-50"
    : "rounded-tr-sm bg-brand-600 text-white";
  const pie = entrante ? "text-ink-500" : bot ? "text-brand-300/80" : "text-white/70";

  return (
    <div className={`group flex ${entrante ? "justify-start" : "justify-end"}`}>
      <div className={`relative flex max-w-[82%] items-start gap-1 md:max-w-[70%] ${entrante ? "flex-row" : "flex-row-reverse"}`}>
        <div className={`min-w-0 rounded-2xl px-3 py-2 text-sm ${clase}`}>
          {bot && (
            <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-brand-300">
              <Bot className="h-3 w-3" /> Bot
            </div>
          )}
          {citado && <Cita citado={citado} conv={conv} />}
          <Contenido m={m} onImagen={onImagen} />
          <div className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${pie}`}>
            {m.autor && !entrante && <span className="truncate">{m.autor}</span>}
            <span>{horaCorta(m.creado)}</span>
            {!entrante && <Tildes m={m} onReintentar={onReintentar} />}
          </div>
        </div>
        <div className="self-center opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
          <Popover
            abierto={menu}
            onCerrar={cerrar}
            alineado={entrante ? "izquierda" : "derecha"}
            ancho="min-w-[160px]"
            boton={
              <button
                type="button"
                onClick={() => setMenu((v) => !v)}
                className="rounded-md p-1 text-ink-500 hover:bg-ink-800 hover:text-white"
                aria-label="Opciones del mensaje"
                title="Opciones"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            }
          >
            <div className="p-1" onClick={cerrar}>
              <ItemMenu icono={Reply} onClick={onCitar}>Responder</ItemMenu>
              <ItemMenu
                icono={Copy}
                onClick={() => {
                  navigator.clipboard?.writeText(m.texto || m.media_url || "").then(() => avisar("Copiado")).catch(() => avisar("No pude copiar", "error"));
                }}
              >
                Copiar
              </ItemMenu>
              <ItemMenu icono={Trash2} peligro onClick={onBorrar}>Borrar</ItemMenu>
            </div>
          </Popover>
        </div>
      </div>
    </div>
  );
}

function Cita({ citado, conv }: { citado: Mensaje; conv: Conversacion }) {
  const delCliente = citado.direccion === "in";
  return (
    <div className={`mb-1.5 rounded-lg border-l-2 bg-black/20 px-2 py-1 text-xs ${delCliente ? "border-brand-300" : "border-green-400"}`}>
      <div className="text-[10px] font-semibold opacity-80">{delCliente ? conv.nombre : citado.autor || "Vos"}</div>
      <div className="line-clamp-2 opacity-90">{previewMensaje(citado.tipo, citado.texto, citado.media_nombre)}</div>
    </div>
  );
}

function Contenido({ m, onImagen }: { m: Mensaje; onImagen: (url: string, nombre?: string) => void }) {
  const texto = m.texto ? (
    <p className="whitespace-pre-wrap break-words">
      <TextoConLinks texto={m.texto} />
    </p>
  ) : null;
  switch (m.tipo) {
    case "imagen":
      return (
        <div className="space-y-1">
          {m.media_url ? (
            <button type="button" onClick={() => onImagen(m.media_url!, m.media_nombre)} className="block" title="Ver grande">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.media_url} alt={m.media_nombre || "Imagen"} className="max-h-64 max-w-full rounded-lg object-cover" loading="lazy" />
            </button>
          ) : (
            <SinArchivo icono={ImageOff} texto="Imagen sin archivo" />
          )}
          {texto}
        </div>
      );
    case "audio":
      return (
        <div className="space-y-1">
          {m.media_url ? <audio controls src={m.media_url} className="max-w-full" preload="none" /> : <span className="text-xs opacity-80">Audio sin archivo</span>}
          {texto}
        </div>
      );
    case "video":
      return (
        <div className="space-y-1">
          {m.media_url ? <video controls src={m.media_url} className="max-h-64 max-w-full rounded-lg" preload="metadata" /> : <span className="text-xs opacity-80">Video sin archivo</span>}
          {texto}
        </div>
      );
    case "documento":
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2 rounded-lg bg-black/20 px-2.5 py-2">
            <FileText className="h-5 w-5 shrink-0 opacity-80" />
            <span className="min-w-0 flex-1 truncate text-xs font-medium">{m.media_nombre || "Archivo"}</span>
            {m.media_url ? (
              <a href={m.media_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline">
                abrir <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-[10px] opacity-70">sin archivo</span>
            )}
          </div>
          {texto}
        </div>
      );
    case "plantilla":
      return (
        <div className="space-y-1">
          {texto || <p className="italic opacity-80">Plantilla</p>}
          <span className="chip bg-black/20 px-2 py-0.5 text-[10px]">
            <FileText className="h-3 w-3" /> Plantilla{m.plantilla ? ` · ${m.plantilla}` : ""}
          </span>
        </div>
      );
    case "sticker":
      return m.media_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.media_url} alt="Sticker" className="h-24 w-24 object-contain" loading="lazy" />
      ) : (
        <span className="text-xs opacity-80">Sticker</span>
      );
    case "ubicacion":
      return (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 opacity-80" />
          {m.media_url ? (
            <a href={m.media_url} target="_blank" rel="noreferrer" className="text-xs underline underline-offset-2">{m.texto || "Ver ubicación"}</a>
          ) : (
            <span className="text-xs">{m.texto || "Ubicación"}</span>
          )}
        </div>
      );
    default:
      return texto || <span className="text-xs italic opacity-80">Mensaje sin texto</span>;
  }
}

function SinArchivo({ icono: Icono, texto }: { icono: typeof ImageOff; texto: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-black/20 px-2.5 py-2 text-xs opacity-80">
      <Icono className="h-4 w-4" /> {texto}
    </div>
  );
}

function Tildes({ m, onReintentar }: { m: Mensaje; onReintentar: () => void }) {
  switch (m.estado) {
    case "pendiente":
      return <Clock className="h-3 w-3" aria-label="Enviando" />;
    case "enviado":
      return <Check className="h-3 w-3" aria-label="Enviado" />;
    case "entregado":
      return <CheckCheck className="h-3 w-3" aria-label="Entregado" />;
    case "leido":
      return <CheckCheck className="h-3 w-3 text-brand-300" aria-label="Leído" />;
    case "fallido":
      return (
        <span className="flex items-center gap-1 text-red-300" title={m.error || "No se pudo mandar"}>
          <XCircle className="h-3 w-3" /> no llegó
          {m.tipo === "texto" && (
            <button type="button" onClick={onReintentar} className="ml-0.5 flex items-center gap-0.5 font-semibold underline-offset-2 hover:underline">
              <RotateCcw className="h-3 w-3" /> Reintentar
            </button>
          )}
        </span>
      );
    default:
      return null;
  }
}
