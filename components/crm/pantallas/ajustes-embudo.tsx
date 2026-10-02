"use client";
// Configuración: etapas del embudo y etiquetas (nombre + color; el color es un DATO).
import { useMemo } from "react";
import { Filter, Plus, Tag, Trash2 } from "lucide-react";
import type { Empresa, Etapa, Etiqueta } from "@/lib/crm/types";
import { uid } from "@/lib/crm/core";
import { useBandeja } from "@/lib/crm/hooks";
import { avisar } from "@/components/crm/ui";
import { Flechas, Tarjeta, mover } from "./comun";
import { PieGuardar, useBorrador, useGuardarEmpresa } from "./ajustes-empresa";

// Colores para lo nuevo (se van rotando; el usuario después lo cambia).
const PALETA = ["#3563ff", "#16a34a", "#f59e0b", "#8b5cf6", "#ef4444", "#0ea5e9", "#d946ef", "#14b8a6", "#9aa3c0"];

function InputColor({ valor, onCambio, etiqueta }: { valor: string; onCambio: (v: string) => void; etiqueta: string }) {
  return (
    <label
      className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-ink-700"
      style={{ background: valor }}
      title="Cambiar color"
    >
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(valor) ? valor : "#9aa3c0"}
        onChange={(e) => onCambio(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label={etiqueta}
      />
    </label>
  );
}

// Cuántos chats hay en cada etapa / con cada etiqueta (todas las marcas).
function useUsos() {
  const { filas } = useBandeja({ grupo: "todos", marca_id: "all" });
  return useMemo(() => {
    const etapas: Record<string, number> = {};
    const etiquetas: Record<string, number> = {};
    for (const c of filas) {
      if (c.etapa_id) etapas[c.etapa_id] = (etapas[c.etapa_id] || 0) + 1;
      for (const t of c.etiquetas || []) etiquetas[t] = (etiquetas[t] || 0) + 1;
    }
    return { etapas, etiquetas };
  }, [filas]);
}

export function SeccionEtapas({ empresa, ro }: { empresa: Empresa; ro: boolean }) {
  const inicial = useMemo(() => [...(empresa.etapas || [])].sort((a, b) => a.orden - b.orden), [empresa.etapas]);
  const b = useBorrador<Etapa[]>(inicial);
  const { cargando, guardar } = useGuardarEmpresa();
  const usos = useUsos();
  const lista = b.valor;
  const setEtapa = (i: number, patch: Partial<Etapa>) => b.set((l) => l.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  function borrar(i: number) {
    const e = lista[i];
    const n = usos.etapas[e.id] || 0;
    if (n > 0) {
      avisar(
        `No se puede borrar «${e.nombre}»: hay ${n} ${n === 1 ? "chat" : "chats"} en esa etapa. Pasalos a otra desde el Embudo y volvé a probar.`,
        "error",
      );
      return;
    }
    b.set((l) => l.filter((_, j) => j !== i));
  }

  async function onGuardar() {
    if (lista.some((e) => !e.nombre.trim())) {
      avisar("Hay una etapa sin nombre.", "error");
      return;
    }
    await guardar({ etapas: lista.map((e, i) => ({ ...e, nombre: e.nombre.trim(), orden: i })) }, "Etapas guardadas.");
  }

  return (
    <Tarjeta
      id="etapas"
      titulo="Etapas del embudo"
      icono={Filter}
      sub="Por dónde pasa cada cliente: de la primera consulta a la venta. Se ven en el Embudo y en cada chat."
    >
      <fieldset disabled={ro} className="space-y-2">
        {!lista.length && (
          <p className="rounded-xl border border-dashed border-ink-700 px-4 py-5 text-center text-xs text-ink-500">
            Sin etapas. Ejemplo: Nuevo · Interesado · Presupuesto enviado · Ganado · Perdido.
          </p>
        )}
        {lista.map((e, i) => {
          const n = usos.etapas[e.id] || 0;
          return (
            <div key={e.id} className="flex items-center gap-2">
              <InputColor valor={e.color} onCambio={(c) => setEtapa(i, { color: c })} etiqueta={`Color de ${e.nombre}`} />
              <input
                className="input py-2"
                value={e.nombre}
                onChange={(ev) => setEtapa(i, { nombre: ev.target.value })}
                placeholder="Nombre de la etapa"
                aria-label="Nombre de la etapa"
              />
              <span className="hidden w-20 shrink-0 text-right text-[11px] text-ink-500 sm:block">{n ? `${n} ${n === 1 ? "chat" : "chats"}` : "vacía"}</span>
              <Flechas
                onArriba={() => b.set(mover(lista, i, -1))}
                onAbajo={() => b.set(mover(lista, i, 1))}
                primero={i === 0}
                ultimo={i === lista.length - 1}
              />
              <button
                type="button"
                className="rounded-md p-1.5 text-ink-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30"
                onClick={() => borrar(i)}
                aria-label={`Borrar la etapa ${e.nombre}`}
                title={n ? `Tiene ${n} chats: movelos antes de borrarla` : "Borrar etapa"}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
        {!ro && (
          <button
            type="button"
            className="btn-soft px-3 py-2 text-xs"
            onClick={() => b.set((l) => [...l, { id: uid("et"), nombre: "", color: PALETA[l.length % PALETA.length], orden: l.length }])}
          >
            <Plus className="h-3.5 w-3.5" /> Etapa
          </button>
        )}
      </fieldset>
      <PieGuardar sucio={b.sucio} cargando={cargando} onGuardar={onGuardar} onDescartar={b.descartar} ro={ro} />
    </Tarjeta>
  );
}

export function SeccionEtiquetas({ empresa, ro }: { empresa: Empresa; ro: boolean }) {
  const b = useBorrador<Etiqueta[]>(empresa.etiquetas || []);
  const { cargando, guardar } = useGuardarEmpresa();
  const usos = useUsos();
  const lista = b.valor;
  const setEtiqueta = (i: number, patch: Partial<Etiqueta>) => b.set((l) => l.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  async function onGuardar() {
    if (lista.some((e) => !e.nombre.trim())) {
      avisar("Hay una etiqueta sin nombre.", "error");
      return;
    }
    await guardar({ etiquetas: lista.map((e) => ({ ...e, nombre: e.nombre.trim() })) }, "Etiquetas guardadas.");
  }

  return (
    <Tarjeta id="etiquetas" titulo="Etiquetas" icono={Tag} sub="Para marcar chats y clientes: mayorista, reclamo, VIP… Se filtran en la Bandeja y en Clientes.">
      <fieldset disabled={ro} className="space-y-2">
        {!lista.length && <p className="rounded-xl border border-dashed border-ink-700 px-4 py-5 text-center text-xs text-ink-500">Sin etiquetas todavía.</p>}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {lista.map((e, i) => {
            const n = usos.etiquetas[e.id] || 0;
            return (
              <div key={e.id} className="flex items-center gap-2">
                <InputColor valor={e.color} onCambio={(c) => setEtiqueta(i, { color: c })} etiqueta={`Color de ${e.nombre}`} />
                <input
                  className="input py-2"
                  value={e.nombre}
                  onChange={(ev) => setEtiqueta(i, { nombre: ev.target.value })}
                  placeholder="Nombre"
                  aria-label="Nombre de la etiqueta"
                />
                <span className="w-14 shrink-0 text-right text-[11px] text-ink-500" title="Chats con esta etiqueta">
                  {n ? `${n} chats` : ""}
                </span>
                <button
                  type="button"
                  className="rounded-md p-1.5 text-ink-500 hover:bg-red-500/10 hover:text-red-400"
                  onClick={() => b.set((l) => l.filter((_, j) => j !== i))}
                  aria-label={`Borrar la etiqueta ${e.nombre}`}
                  title={n ? `Se va a dejar de ver en ${n} chats` : "Borrar etiqueta"}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
        {!ro && (
          <button
            type="button"
            className="btn-soft px-3 py-2 text-xs"
            onClick={() => b.set((l) => [...l, { id: uid("tg"), nombre: "", color: PALETA[(l.length + 3) % PALETA.length] }])}
          >
            <Plus className="h-3.5 w-3.5" /> Etiqueta
          </button>
        )}
      </fieldset>
      <PieGuardar sucio={b.sucio} cargando={cargando} onGuardar={onGuardar} onDescartar={b.descartar} ro={ro} />
    </Tarjeta>
  );
}
