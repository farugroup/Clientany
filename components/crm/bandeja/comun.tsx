"use client";
// ============================================================
// Clientany · Bandeja — piezas chicas que comparten la lista, el chat,
// la ficha, el embudo y la pantalla de clientes: canal (ícono y color),
// avatar con iniciales, popover, menú flotante, fechas en la zona de la
// empresa y los atajos de localStorage.
// ============================================================
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { MessageSquare, type LucideIcon } from "lucide-react";
import { channelMeta } from "@/lib/channels";
import { iniciales, partesEnZona } from "@/lib/crm/core";
import type { CanalTipo, Empresa, Etiqueta, Miembro, Recordatorio } from "@/lib/crm/types";

export const ZONA_DEFAULT = "America/Argentina/Buenos_Aires";

// ---------- canal ----------
export interface MetaCanal {
  nombre: string;
  icono: LucideIcon;
  color: string; // DATO: el color del canal
  bg: string;
}

export function canalMeta(tipo: CanalTipo): MetaCanal {
  if (tipo === "manual") {
    return { nombre: "Manual", icono: MessageSquare, color: "#9aa3c0", bg: "rgba(154,163,192,0.14)" };
  }
  const m = channelMeta[tipo];
  return { nombre: m.label, icono: m.icon, color: m.color, bg: m.bg };
}

export function ChipCanal({ tipo, soloIcono }: { tipo: CanalTipo; soloIcono?: boolean }) {
  const m = canalMeta(tipo);
  const Icono = m.icono;
  return (
    <span
      className="chip shrink-0 px-2 py-0.5 text-[10px] font-semibold"
      style={{ color: m.color, background: m.bg }}
      title={m.nombre}
    >
      <Icono className="h-3 w-3" />
      {!soloIcono && m.nombre}
    </span>
  );
}

// ---------- avatar con iniciales y el canal superpuesto ----------
export function Avatar({ nombre, canal, tam = "md" }: { nombre: string; canal?: CanalTipo; tam?: "sm" | "md" | "lg" }) {
  const dims = { sm: "h-8 w-8 text-[11px]", md: "h-10 w-10 text-xs", lg: "h-12 w-12 text-sm" }[tam];
  const m = canal ? canalMeta(canal) : null;
  const Icono = m?.icono;
  return (
    <div className="relative shrink-0">
      <div className={`flex ${dims} items-center justify-center rounded-full bg-ink-800 font-bold text-ink-200`}>
        {iniciales(nombre)}
      </div>
      {m && Icono && (
        <div
          className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full ring-2 ring-ink-900"
          style={{ background: m.bg }}
        >
          <Icono className="h-2.5 w-2.5" style={{ color: m.color }} />
        </div>
      )}
    </div>
  );
}

// ---------- media queries. null = todavía no se midió (primer render) ----------
export function useMediaQuery(consulta: string): boolean | null {
  const [valor, setValor] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const f = () => setValor(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, [consulta]);
  return valor;
}

// ¿Estamos en el celular? (md para abajo)
export function useEsCelular(): boolean | null {
  return useMediaQuery("(max-width: 767px)");
}

// ---------- popover: el botón y el panel van juntos; se cierra afuera o con Esc,
// pero NO al clickear adentro (sirve para casillas, buscadores, grillas) ----------
export function Popover({
  boton,
  abierto,
  onCerrar,
  children,
  alineado = "izquierda",
  arriba,
  ancho = "min-w-[240px]",
}: {
  boton: ReactNode;
  abierto: boolean;
  onCerrar: () => void;
  children: ReactNode;
  alineado?: "izquierda" | "derecha";
  arriba?: boolean;
  ancho?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCerrar();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [abierto, onCerrar]);
  return (
    <div className="relative" ref={ref}>
      {boton}
      {abierto && (
        <div
          className={`absolute z-50 animate-fade-in rounded-xl border border-ink-700 bg-ink-850 shadow-card ${ancho} ${
            arriba ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } ${alineado === "derecha" ? "right-0" : "left-0"}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ---------- menú flotante (clic derecho / mantener apretado) ----------
export function MenuFlotante({ x, y, onCerrar, children }: { x: number; y: number; onCerrar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: Math.max(8, Math.min(x, window.innerWidth - r.width - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - r.height - 8)),
    });
  }, [x, y]);
  useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCerrar();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    // Se engancha después del evento que lo abrió, para que ese mismo clic no lo cierre.
    const t = window.setTimeout(() => {
      document.addEventListener("mousedown", onDown);
      document.addEventListener("touchstart", onDown);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onCerrar]);
  return (
    <div
      ref={ref}
      role="menu"
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-[80] min-w-[220px] animate-fade-in rounded-xl border border-ink-700 bg-ink-850 p-1.5 shadow-card"
      onClick={onCerrar}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}

// ---------- botón chico con ícono (acciones del chat y de la lista) ----------
export function BotonChico({
  icono: Icono,
  children,
  onClick,
  activo,
  peligro,
  resaltado,
  title,
  disabled,
  className = "",
}: {
  icono?: LucideIcon;
  children?: ReactNode;
  onClick?: () => void;
  activo?: boolean;
  peligro?: boolean;
  resaltado?: boolean;
  title?: string;
  disabled?: boolean;
  className?: string;
}) {
  const base = "inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition disabled:opacity-50 disabled:pointer-events-none";
  const tono = peligro
    ? "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15"
    : activo
    ? "border-brand-500/40 bg-brand-500/15 text-brand-200"
    : resaltado
    ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
    : "border-ink-700 bg-ink-850 text-ink-300 hover:border-ink-600 hover:text-white";
  return (
    <button type="button" onClick={onClick} title={title} disabled={disabled} className={`${base} ${tono} ${className}`} aria-label={typeof children === "string" ? undefined : title}>
      {Icono && <Icono className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

// ---------- texto con links clickeables ----------
const RE_URL = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g;
export function TextoConLinks({ texto }: { texto: string }) {
  const partes = (texto || "").split(RE_URL);
  return (
    <>
      {partes.map((p, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={p.startsWith("http") ? p : `https://${p}`}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-1 underline-offset-2 opacity-90 hover:opacity-100"
          >
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

// ---------- miembros y etiquetas ----------
export function nombreMiembro(miembros: Miembro[], id: string | null | undefined): string {
  if (!id) return "";
  return miembros.find((m) => m.id === id)?.nombre || "alguien del equipo";
}

export function etiquetasDe(empresa: Empresa | null, ids: string[] | undefined): Etiqueta[] {
  if (!empresa || !ids?.length) return [];
  return ids.map((id) => empresa.etiquetas.find((e) => e.id === id)).filter((e): e is Etiqueta => !!e);
}

// ---------- fechas en la zona de la empresa ----------
export function ymdEnZona(fecha: Date, zona: string): string {
  return partesEnZona(fecha, zona || ZONA_DEFAULT).ymd;
}

export function sumarDias(ymd: string, dias: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

// El instante (ISO) que corresponde a `ymd hh:mm` en esa zona horaria.
export function isoEnZona(ymd: string, hhmm: string, zona: string): string {
  const z = zona || ZONA_DEFAULT;
  const [y, m, d] = ymd.split("-").map(Number);
  const [hh, mm] = (hhmm || "00:00").split(":").map(Number);
  const objetivo = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  let t = objetivo;
  // Dos pasadas por si justo cambia el horario de verano.
  for (let i = 0; i < 2; i++) {
    const p = partesEnZona(new Date(t), z);
    const local = Date.UTC(Number(p.ymd.slice(0, 4)), Number(p.ymd.slice(5, 7)) - 1, Number(p.ymd.slice(8, 10)), p.hora, p.minuto);
    t += objetivo - local;
  }
  return new Date(t).toISOString();
}

// "hoy", "mañana 10:00", "05/10" (según la zona de la empresa).
export function diaRelativo(iso: string, zona: string): string {
  const z = zona || ZONA_DEFAULT;
  const hoy = ymdEnZona(new Date(), z);
  const manana = sumarDias(hoy, 1);
  const p = partesEnZona(new Date(iso), z);
  const hora = p.hora || p.minuto ? ` ${String(p.hora).padStart(2, "0")}:${String(p.minuto).padStart(2, "0")}` : "";
  if (p.ymd === hoy) return `hoy${hora}`;
  if (p.ymd === manana) return `mañana${hora}`;
  return `${p.ymd.slice(8, 10)}/${p.ymd.slice(5, 7)}${hora}`;
}

export function textoRecordatorio(rec: Recordatorio | null | undefined, zona: string): string {
  if (!rec?.fecha) return "";
  return `Escribirle ${diaRelativo(rec.fecha, zona)}`;
}

// Separador de día en el chat: "Hoy", "Ayer", "02/10/2026".
export function fechaSeparador(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(hoy.getTime() - 86_400_000);
  if (d.toDateString() === hoy.toDateString()) return "Hoy";
  if (d.toDateString() === ayer.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ---------- localStorage (sólo comodidades por navegador) ----------
export function leerLS<T>(clave: string, def: T): T {
  if (typeof window === "undefined") return def;
  try {
    const raw = window.localStorage.getItem(clave);
    if (raw === null) return def;
    return JSON.parse(raw) as T;
  } catch {
    return def;
  }
}

export function guardarLS(clave: string, valor: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // sin localStorage (modo privado): no pasa nada
  }
}

// ---------- skeleton ----------
export function Esqueleto({ filas = 6 }: { filas?: number }) {
  return (
    <div className="divide-y divide-ink-800/60">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="flex animate-pulse2 items-start gap-3 p-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-ink-800" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-2/5 rounded bg-ink-800" />
            <div className="h-2.5 w-4/5 rounded bg-ink-800/80" />
            <div className="h-2.5 w-1/4 rounded bg-ink-800/60" />
          </div>
        </div>
      ))}
    </div>
  );
}
