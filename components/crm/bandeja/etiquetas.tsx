"use client";
// ============================================================
// Clientany · Bandeja — casillas de etiquetas (las de la empresa) para
// un chat o un contacto. El color de cada etiqueta es un DATO.
// ============================================================
import { Check, Tag } from "lucide-react";
import type { Etiqueta } from "@/lib/crm/types";

export function CasillasEtiquetas({
  etiquetas,
  elegidas,
  onCambio,
  compacto,
}: {
  etiquetas: Etiqueta[];
  elegidas: string[];
  onCambio: (ids: string[]) => void;
  compacto?: boolean;
}) {
  if (!etiquetas.length) {
    return (
      <div className="px-2 py-3 text-xs text-ink-500">
        La empresa todavía no tiene etiquetas. Se crean en Configuración.
      </div>
    );
  }
  function alternar(id: string) {
    onCambio(elegidas.includes(id) ? elegidas.filter((x) => x !== id) : [...elegidas, id]);
  }
  return (
    <div className={compacto ? "flex flex-wrap gap-1.5" : "space-y-0.5"}>
      {etiquetas.map((e) => {
        const on = elegidas.includes(e.id);
        return compacto ? (
          <button
            key={e.id}
            type="button"
            onClick={() => alternar(e.id)}
            className="chip border px-2 py-0.5 text-[11px] font-semibold transition"
            style={{
              color: e.color,
              background: on ? `${e.color}26` : "transparent",
              borderColor: on ? `${e.color}66` : "#242c47",
            }}
          >
            {on && <Check className="h-3 w-3" />}
            {e.nombre}
          </button>
        ) : (
          <label key={e.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-ink-800">
            <input type="checkbox" checked={on} onChange={() => alternar(e.id)} className="h-4 w-4 accent-brand-500" />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />
            <span className="text-ink-200">{e.nombre}</span>
          </label>
        );
      })}
    </div>
  );
}

export function TituloEtiquetas() {
  return (
    <div className="flex items-center gap-1.5 border-b border-ink-800 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">
      <Tag className="h-3 w-3" /> Etiquetas
    </div>
  );
}
