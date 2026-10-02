"use client";
// ============================================================
// Clientany · CRM — piezas de UI compartidas por todas las pantallas del
// CRM: modal/hoja, avisos (toasts), confirmación, campos, tabla, chips.
// Mismo sistema visual que el resto de la app (clases de globals.css:
// card, btn-primary, btn-ghost, btn-soft, input, chip, label).
// ============================================================
import { useEffect, useRef, useState, type ReactNode } from "react";
import { create } from "zustand";
import { X, CheckCircle2, AlertCircle, Info, Loader2, type LucideIcon } from "lucide-react";

// ---------- avisos ----------
export interface Aviso {
  id: string;
  tipo: "ok" | "error" | "info";
  texto: string;
}
interface AvisosState {
  lista: Aviso[];
  avisar: (texto: string, tipo?: Aviso["tipo"]) => void;
  sacar: (id: string) => void;
}
export const useAvisos = create<AvisosState>()((set, get) => ({
  lista: [],
  avisar: (texto, tipo = "ok") => {
    const id = Math.random().toString(36).slice(2, 9);
    set({ lista: [...get().lista, { id, tipo, texto }] });
    setTimeout(() => get().sacar(id), tipo === "error" ? 7000 : 3500);
  },
  sacar: (id) => set({ lista: get().lista.filter((a) => a.id !== id) }),
}));

// Atajo: avisar("Guardado") / avisar(e, "error")
export function avisar(texto: unknown, tipo: Aviso["tipo"] = "ok") {
  const t = texto instanceof Error ? texto.message : String(texto ?? "");
  useAvisos.getState().avisar(t || (tipo === "error" ? "Algo salió mal." : "Listo."), tipo);
}

export function Avisos() {
  const lista = useAvisos((s) => s.lista);
  const sacar = useAvisos((s) => s.sacar);
  if (!lista.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {lista.map((a) => {
        const Icon: LucideIcon = a.tipo === "ok" ? CheckCircle2 : a.tipo === "error" ? AlertCircle : Info;
        const color = a.tipo === "ok" ? "text-green-400" : a.tipo === "error" ? "text-red-400" : "text-brand-300";
        return (
          <div
            key={a.id}
            role="status"
            className="pointer-events-auto flex max-w-md animate-fade-in items-start gap-2 rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-2.5 text-sm text-ink-100 shadow-card"
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
            <span className="flex-1">{a.texto}</span>
            <button onClick={() => sacar(a.id)} className="text-ink-500 hover:text-white" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ---------- modal / hoja ----------
// En la compu es un modal centrado; en el celular sube desde abajo (hoja).
export function Modal({
  abierto,
  onCerrar,
  titulo,
  children,
  pie,
  ancho = "md",
  sinCerrar,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo?: ReactNode;
  children: ReactNode;
  pie?: ReactNode;
  ancho?: "sm" | "md" | "lg" | "xl";
  sinCerrar?: boolean;
}) {
  useEffect(() => {
    if (!abierto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !sinCerrar) onCerrar();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [abierto, onCerrar, sinCerrar]);
  if (!abierto) return null;
  const w = { sm: "md:max-w-sm", md: "md:max-w-lg", lg: "md:max-w-2xl", xl: "md:max-w-4xl" }[ancho];
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center md:items-center md:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={sinCerrar ? undefined : onCerrar} />
      <div
        className={`relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-ink-700 bg-ink-900 shadow-card md:max-h-[88vh] md:rounded-2xl ${w} animate-fade-in`}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-ink-700 md:hidden" />
        {(titulo || !sinCerrar) && (
          <div className="flex items-center gap-3 border-b border-ink-800 px-5 py-3.5">
            <div className="flex-1 text-base font-bold text-white">{titulo}</div>
            {!sinCerrar && (
              <button onClick={onCerrar} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-white" aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {pie && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-800 px-5 py-3">{pie}</div>}
      </div>
    </div>
  );
}

// ---------- confirmación ----------
export function Confirmar({
  abierto,
  onCerrar,
  onConfirmar,
  titulo = "¿Seguro?",
  texto,
  confirmar = "Sí, seguir",
  peligro,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmar: () => void | Promise<void>;
  titulo?: string;
  texto?: ReactNode;
  confirmar?: string;
  peligro?: boolean;
}) {
  const [cargando, setCargando] = useState(false);
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={titulo} ancho="sm"
      pie={
        <>
          <button className="btn-ghost" onClick={onCerrar} disabled={cargando}>Cancelar</button>
          <button
            className={peligro ? "btn bg-red-500/90 text-white hover:bg-red-500" : "btn-primary"}
            disabled={cargando}
            onClick={async () => {
              setCargando(true);
              try { await onConfirmar(); onCerrar(); } finally { setCargando(false); }
            }}
          >
            {cargando && <Loader2 className="h-4 w-4 animate-spin" />} {confirmar}
          </button>
        </>
      }
    >
      <div className="text-sm text-ink-300">{texto}</div>
    </Modal>
  );
}

// ---------- campos de formulario ----------
export function Campo({
  etiqueta,
  ayuda,
  children,
  error,
}: {
  etiqueta: ReactNode;
  ayuda?: ReactNode;
  children: ReactNode;
  error?: string | null;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-ink-200">{etiqueta}</span>
        {ayuda && <span className="text-xs text-ink-500">{ayuda}</span>}
      </div>
      {children}
      {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
    </label>
  );
}

export function Interruptor({
  valor,
  onCambio,
  etiqueta,
  descripcion,
}: {
  valor: boolean;
  onCambio: (v: boolean) => void;
  etiqueta?: ReactNode;
  descripcion?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={valor}
      onClick={() => onCambio(!valor)}
      className="flex w-full items-center gap-3 rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-3 text-left hover:border-ink-600"
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${valor ? "bg-brand-500" : "bg-ink-700"}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${valor ? "translate-x-5" : "translate-x-0.5"}`} />
      </span>
      {(etiqueta || descripcion) && (
        <span className="min-w-0 flex-1">
          {etiqueta && <span className="block text-sm font-medium text-white">{etiqueta}</span>}
          {descripcion && <span className="block text-xs text-ink-400">{descripcion}</span>}
        </span>
      )}
    </button>
  );
}

// ---------- tabla ----------
export function Tabla({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      <div className="no-scrollbar overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
      </div>
    </div>
  );
}
export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <th className={`border-b border-ink-800 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-500 ${className}`}>{children}</th>;
}
export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`border-b border-ink-800/60 px-4 py-3 align-middle text-ink-200 ${className}`}>{children}</td>;
}

// ---------- chip de color (el color es un DATO: etapa, etiqueta, estado) ----------
export function ChipColor({ color, children, chico }: { color: string; children: ReactNode; chico?: boolean }) {
  return (
    <span
      className={`chip font-semibold ${chico ? "px-2 py-0.5 text-[10px]" : ""}`}
      style={{ color, background: `${color}22`, border: `1px solid ${color}44` }}
    >
      {children}
    </span>
  );
}

// ---------- encabezado de pantalla ----------
export function Encabezado({ titulo, sub, acciones, icono: Icon }: { titulo: string; sub?: ReactNode; acciones?: ReactNode; icono?: LucideIcon }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-white lg:text-2xl">
          {Icon && <Icon className="h-5 w-5 text-brand-300" />} {titulo}
        </h1>
        {sub && <p className="mt-0.5 text-sm text-ink-400">{sub}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}

// ---------- estado vacío ----------
export function Vacio({ icono: Icon, titulo, texto, accion }: { icono: LucideIcon; titulo: string; texto?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-800">
        <Icon className="h-6 w-6 text-ink-400" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-white">{titulo}</h3>
      {texto && <p className="mt-1 max-w-sm text-xs text-ink-400">{texto}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

// ---------- botón con spinner ----------
export function BotonCargando({
  cargando,
  children,
  className = "btn-primary",
  ...rest
}: { cargando?: boolean; children: ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={className} disabled={cargando || rest.disabled} {...rest}>
      {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

// ---------- menú desplegable chico ----------
export function Desplegable({ boton, children, alineado = "derecha" }: { boton: ReactNode; children: ReactNode; alineado?: "derecha" | "izquierda" }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setAbierto((o) => !o)}>{boton}</div>
      {abierto && (
        <div
          onClick={() => setAbierto(false)}
          className={`absolute top-full z-50 mt-1.5 min-w-[200px] animate-fade-in rounded-xl border border-ink-700 bg-ink-850 p-1.5 shadow-card ${alineado === "derecha" ? "right-0" : "left-0"}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
export function ItemMenu({ icono: Icon, children, onClick, peligro, activo }: { icono?: LucideIcon; children: ReactNode; onClick?: () => void; peligro?: boolean; activo?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
        peligro ? "text-red-400 hover:bg-red-500/10" : activo ? "bg-brand-500/15 text-white" : "text-ink-200 hover:bg-ink-800"
      }`}
    >
      {Icon && <Icon className={`h-4 w-4 ${peligro ? "" : "text-ink-400"}`} />}
      <span className="flex-1">{children}</span>
    </button>
  );
}

// Lee un archivo como texto (para los CSV).
export function leerArchivoTexto(archivo: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ""));
    r.onerror = () => rej(new Error("No pude leer el archivo."));
    r.readAsText(archivo, "utf-8");
  });
}

// Descarga un texto como archivo (CSV).
export function descargar(nombre: string, contenido: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿" + contenido], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
