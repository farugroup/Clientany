"use client";
// ============================================================
// Clientany · CRM — piezas chicas que comparten las pantallas de gestión
// y configuración (pedidos, stock, automáticas, plantillas, conexiones,
// equipo, panel, ajustes). Lo genérico de verdad vive en components/crm/ui.tsx.
// ============================================================
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, Copy, FlaskConical, Lock, PenLine, type LucideIcon } from "lucide-react";
import { channelMeta } from "@/lib/channels";
import type { CanalTipo } from "@/lib/crm/types";
import { avisar } from "@/components/crm/ui";

// ---------- canales: ícono y color (el color es un DATO del canal) ----------
export const CANAL_VISUAL: Record<CanalTipo, { nombre: string; icono: LucideIcon; color: string }> = {
  whatsapp: { nombre: "WhatsApp", icono: channelMeta.whatsapp.icon, color: channelMeta.whatsapp.color },
  instagram: { nombre: "Instagram", icono: channelMeta.instagram.icon, color: channelMeta.instagram.color },
  messenger: { nombre: "Messenger", icono: channelMeta.messenger.icon, color: channelMeta.messenger.color },
  manual: { nombre: "Manual", icono: PenLine, color: "#9aa3c0" },
};

export function CanalIcono({ tipo, tam = "md" }: { tipo: CanalTipo; tam?: "sm" | "md" | "lg" }) {
  const v = CANAL_VISUAL[tipo] || CANAL_VISUAL.manual;
  const Icon = v.icono;
  const caja = { sm: "h-7 w-7 rounded-lg", md: "h-10 w-10 rounded-xl", lg: "h-12 w-12 rounded-2xl" }[tam];
  const ico = { sm: "h-3.5 w-3.5", md: "h-5 w-5", lg: "h-6 w-6" }[tam];
  return (
    <span className={`flex shrink-0 items-center justify-center ${caja}`} style={{ background: `${v.color}1f` }}>
      <Icon className={ico} style={{ color: v.color }} />
    </span>
  );
}

// ---------- tarjeta de sección ----------
export function Tarjeta({
  id,
  titulo,
  icono: Icon,
  sub,
  acciones,
  children,
  className = "",
}: {
  id?: string;
  titulo?: ReactNode;
  icono?: LucideIcon;
  sub?: ReactNode;
  acciones?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`card scroll-mt-20 p-4 lg:p-5 ${className}`}>
      {(titulo || acciones) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {titulo && (
              <h2 className="flex items-center gap-2 text-base font-bold text-white">
                {Icon && <Icon className="h-[18px] w-[18px] text-brand-300" />}
                {titulo}
              </h2>
            )}
            {sub && <p className="mt-0.5 text-xs text-ink-400">{sub}</p>}
          </div>
          {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

// ---------- interruptor chico (para tablas y filas) ----------
export function InterruptorChico({
  valor,
  onCambio,
  etiqueta,
  deshabilitado,
}: {
  valor: boolean;
  onCambio: (v: boolean) => void;
  etiqueta: string; // para lectores de pantalla y el title
  deshabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={valor}
      aria-label={etiqueta}
      title={etiqueta}
      disabled={deshabilitado}
      onClick={(e) => {
        e.stopPropagation();
        onCambio(!valor);
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition disabled:opacity-50 ${valor ? "bg-brand-500" : "bg-ink-700"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${valor ? "translate-x-[18px]" : "translate-x-0.5"}`} />
    </button>
  );
}

// ---------- copiar al portapapeles ----------
export async function copiarTexto(valor: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(valor);
    } else {
      const t = document.createElement("textarea");
      t.value = valor;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    avisar("Copiado");
  } catch {
    avisar("No pude copiar: seleccioná el texto y copialo a mano.", "error");
  }
}

export function BotonCopiar({
  valor,
  etiqueta = "Copiar",
  className = "btn-ghost shrink-0 px-3 py-2 text-xs",
}: {
  valor: string;
  etiqueta?: string;
  className?: string;
}) {
  const [hecho, setHecho] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={!valor}
      onClick={async () => {
        await copiarTexto(valor);
        setHecho(true);
        setTimeout(() => setHecho(false), 1600);
      }}
    >
      {hecho ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
      {etiqueta}
    </button>
  );
}

export function CampoCopiable({ etiqueta, valor, ayuda }: { etiqueta: ReactNode; valor: string; ayuda?: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-ink-300">{etiqueta}</div>
      <div className="flex gap-2">
        <input readOnly value={valor} onFocus={(e) => e.currentTarget.select()} className="input py-2 font-mono text-xs" />
        <BotonCopiar valor={valor} />
      </div>
      {ayuda && <div className="mt-1 text-[11px] text-ink-500">{ayuda}</div>}
    </div>
  );
}

// ---------- textarea con botoncitos que insertan variables ----------
export function TextoConVariables({
  valor,
  onCambio,
  variables,
  filas = 3,
  placeholder,
  deshabilitado,
}: {
  valor: string;
  onCambio: (v: string) => void;
  variables: string[]; // tokens completos: "{marca}", "{{1}}"
  filas?: number;
  placeholder?: string;
  deshabilitado?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  function insertar(tok: string) {
    const el = ref.current;
    if (!el) {
      onCambio(valor + tok);
      return;
    }
    const a = el.selectionStart ?? valor.length;
    const b = el.selectionEnd ?? valor.length;
    onCambio(valor.slice(0, a) + tok + valor.slice(b));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + tok.length, a + tok.length);
    });
  }
  return (
    <div>
      <textarea
        ref={ref}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        rows={filas}
        placeholder={placeholder}
        disabled={deshabilitado}
        className="input resize-y leading-relaxed"
      />
      {variables.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-ink-500">Insertar:</span>
          {variables.map((v) => (
            <button
              key={v}
              type="button"
              disabled={deshabilitado}
              onClick={() => insertar(v)}
              className="rounded-md border border-ink-700 bg-ink-850 px-1.5 py-0.5 font-mono text-[11px] text-brand-300 hover:border-brand-500/40 hover:text-brand-200 disabled:opacity-50"
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- lista de palabras separadas por coma ----------
function partirPalabras(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function CampoPalabras({
  valor,
  onCambio,
  placeholder,
  deshabilitado,
}: {
  valor: string[];
  onCambio: (v: string[]) => void;
  placeholder?: string;
  deshabilitado?: boolean;
}) {
  const [txt, setTxt] = useState(valor.join(", "));
  const txtRef = useRef(txt);
  txtRef.current = txt;
  const clave = valor.join("\u0001");
  // Si cambió desde afuera (descartar cambios), se pisa lo escrito.
  useEffect(() => {
    if (partirPalabras(txtRef.current).join("\u0001") !== clave) setTxt(clave.split("\u0001").filter(Boolean).join(", "));
  }, [clave]);
  return (
    <input
      value={txt}
      disabled={deshabilitado}
      placeholder={placeholder}
      onChange={(e) => {
        setTxt(e.target.value);
        onCambio(partirPalabras(e.target.value));
      }}
      className="input"
    />
  );
}

// ---------- reordenar ----------
export function mover<T>(lista: T[], i: number, delta: number): T[] {
  const j = i + delta;
  if (j < 0 || j >= lista.length) return lista;
  const copia = [...lista];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}

export function Flechas({
  onArriba,
  onAbajo,
  primero,
  ultimo,
  deshabilitado,
}: {
  onArriba: () => void;
  onAbajo: () => void;
  primero: boolean;
  ultimo: boolean;
  deshabilitado?: boolean;
}) {
  const cls = "rounded-md p-1 text-ink-400 hover:bg-ink-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <span className="inline-flex items-center">
      <button type="button" className={cls} onClick={onArriba} disabled={primero || deshabilitado} aria-label="Subir" title="Subir">
        <ArrowUp className="h-4 w-4" />
      </button>
      <button type="button" className={cls} onClick={onAbajo} disabled={ultimo || deshabilitado} aria-label="Bajar" title="Bajar">
        <ArrowDown className="h-4 w-4" />
      </button>
    </span>
  );
}

// ---------- bandas y avisos ----------
export function BandaDemo({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3.5 py-2.5 text-xs text-ink-200">
      <FlaskConical className="h-4 w-4 shrink-0 text-amber-400" />
      <span className="min-w-0 flex-1">{children}</span>
      {accion}
    </div>
  );
}

export function AvisoSoloAdmin({ texto = "Sólo un admin de la empresa puede cambiar esto. Lo ves para saber cómo está." }: { texto?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-2.5 text-xs text-ink-300">
      <Lock className="h-4 w-4 shrink-0 text-ink-400" />
      {texto}
    </div>
  );
}

// ---------- chip de filtro ----------
export function ChipFiltro({
  activo,
  onClick,
  children,
  color,
}: {
  activo: boolean;
  onClick: () => void;
  children: ReactNode;
  color?: string; // punto de color (dato)
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`chip shrink-0 border transition ${
        activo ? "border-brand-500/50 bg-brand-500/15 text-white" : "border-ink-700 bg-ink-850 text-ink-300 hover:border-ink-600 hover:text-white"
      }`}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  );
}

// ---------- esqueleto de carga ----------
export function Esqueleto({ className = "h-24" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-ink-800/60 ${className}`} />;
}

export function CargandoPantalla() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <Esqueleto className="h-10 w-64" />
      <Esqueleto className="h-12" />
      <Esqueleto className="h-80" />
    </div>
  );
}

// ---------- reloj que avanza (presencia, "hace X") ----------
export function useAhora(cadaMs = 30000): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), cadaMs);
    return () => clearInterval(t);
  }, [cadaMs]);
  return ahora;
}

// ---------- números y países ----------
// "1.234,50" / "1234.5" / "" → número (0 si no es un número)
export function aNumero(s: string | number | undefined | null): number {
  if (typeof s === "number") return Number.isFinite(s) ? s : 0;
  let t = String(s ?? "")
    .trim()
    .replace(/[^\d,.-]/g, "");
  if (!t) return 0;
  if (t.includes(",") && t.includes(".")) t = t.replace(/\./g, "").replace(",", ".");
  else if (t.includes(",")) t = t.replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

// Código telefónico del país de la empresa (acepta "AR", "Argentina"…).
const CODIGOS_PAIS: Record<string, string> = {
  ar: "54",
  argentina: "54",
  uy: "598",
  uruguay: "598",
  cl: "56",
  chile: "56",
  py: "595",
  paraguay: "595",
  bo: "591",
  bolivia: "591",
  pe: "51",
  peru: "51",
  perú: "51",
  co: "57",
  colombia: "57",
  ec: "593",
  ecuador: "593",
  ve: "58",
  venezuela: "58",
  mx: "52",
  mexico: "52",
  méxico: "52",
  br: "55",
  brasil: "55",
  brazil: "55",
  es: "34",
  españa: "34",
  espana: "34",
  us: "1",
  "estados unidos": "1",
};
export function codigoPais(pais: string | undefined | null): string {
  return CODIGOS_PAIS[(pais || "").trim().toLowerCase()] || "54";
}

// Fecha local "aaaa-mm-dd" de un ISO (para inputs type=date).
export function fechaInput(iso: string | undefined | null): string {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// "aaaa-mm-dd" → ISO al mediodía local (para que no salte de día por la zona).
export function isoDeFechaInput(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return new Date().toISOString();
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

// Base pública de la app (para armar URLs de webhook que se pegan en Meta).
export function useBaseUrl(): string {
  const [base, setBase] = useState(process.env.NEXT_PUBLIC_APP_URL || "");
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_APP_URL && typeof window !== "undefined") setBase(window.location.origin);
  }, []);
  return base.replace(/\/+$/, "");
}

// Monedas que se ofrecen en los selects (la de la empresa va primero).
export const MONEDAS = ["ARS", "USD", "UYU", "CLP", "MXN", "COP", "PEN", "BRL"];
export function monedasCon(actual: string | undefined): string[] {
  return actual && !MONEDAS.includes(actual) ? [actual, ...MONEDAS] : MONEDAS;
}
