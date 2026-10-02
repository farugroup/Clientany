"use client";
// ============================================================
// Clientany · Embudo (/embudo) — kanban por etapa: una columna por etapa
// de la empresa, tarjetas = conversaciones con etapa, arrastrar y soltar
// entre columnas (en el celular, un desplegable en la tarjeta).
// ============================================================
import { useMemo, useState, type DragEvent as RDragEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Filter, Package } from "lucide-react";
import { avisar, ChipColor, Encabezado, Vacio } from "@/components/crm/ui";
import { haceCuanto, recortar } from "@/lib/crm/core";
import { getRepo, useCrm } from "@/lib/crm/repo";
import { useEmpresa, useMarcaActiva, usePedidos } from "@/lib/crm/hooks";
import type { Conversacion, Etapa } from "@/lib/crm/types";
import { Avatar, canalMeta, etiquetasDe, useEsCelular } from "@/components/crm/bandeja/comun";

const SIN_ETAPA = "__sin_etapa__";

export default function EmbudoPage() {
  const empresa = useEmpresa();
  const listo = useCrm((s) => s.listo);
  const convs = useCrm((s) => s.conversaciones);
  const marca = useMarcaActiva();
  const pedidos = usePedidos();
  const esCelular = useEsCelular() === true;
  const router = useRouter();
  const [verSin, setVerSin] = useState(false);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);

  const etapas = useMemo(() => [...(empresa?.etapas || [])].sort((a, b) => a.orden - b.orden), [empresa]);
  const visibles = useMemo(
    () => convs.filter((c) => marca === "all" || !marca || !c.marca_id || c.marca_id === marca),
    [convs, marca]
  );
  const porEtapa = useMemo(() => {
    const m = new Map<string, Conversacion[]>();
    etapas.forEach((e) => m.set(e.id, []));
    const sin: Conversacion[] = [];
    for (const c of visibles) {
      if (c.etapa_id && m.has(c.etapa_id)) m.get(c.etapa_id)!.push(c);
      else sin.push(c);
    }
    const orden = (a: Conversacion, b: Conversacion) => new Date(b.ultimo_en).getTime() - new Date(a.ultimo_en).getTime();
    m.forEach((lista) => lista.sort(orden));
    sin.sort(orden);
    return { m, sin };
  }, [visibles, etapas]);
  const conEtapa = visibles.length - porEtapa.sin.length;

  async function mover(id: string, etapaId: string | null) {
    const c = convs.find((x) => x.id === id);
    if (!c || (c.etapa_id || null) === etapaId) return;
    try {
      await getRepo().accion(id, { tipo: "etapa", etapa_id: etapaId });
      const nombre = etapaId ? etapas.find((e) => e.id === etapaId)?.nombre : null;
      avisar(nombre ? `${c.nombre} → ${nombre}` : `${c.nombre} sin etapa`);
    } catch (e) {
      avisar(e, "error");
    }
  }

  function onDragOver(e: RDragEvent<HTMLDivElement>, col: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (sobre !== col) setSobre(col);
  }
  function onDrop(e: RDragEvent<HTMLDivElement>, col: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || arrastrando;
    setSobre(null);
    setArrastrando(null);
    if (id) mover(id, col === SIN_ETAPA ? null : col);
  }

  const columnas: { id: string; nombre: string; color: string; lista: Conversacion[] }[] = [
    ...(verSin ? [{ id: SIN_ETAPA, nombre: "Sin etapa", color: "#6b769a", lista: porEtapa.sin }] : []),
    ...etapas.map((e) => ({ id: e.id, nombre: e.nombre, color: e.color, lista: porEtapa.m.get(e.id) || [] })),
  ];

  return (
    <div className="mx-auto max-w-[1400px] animate-fade-in">
      <Encabezado
        icono={Filter}
        titulo="Embudo"
        sub={listo ? `${conEtapa} ${conEtapa === 1 ? "chat" : "chats"} en el embudo · arrastrá las tarjetas entre etapas` : "Cargando…"}
      />

      {listo && porEtapa.sin.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-ink-700 bg-ink-900/60 px-3.5 py-2 text-xs text-ink-300">
          <span>
            <b className="text-white">{porEtapa.sin.length}</b> {porEtapa.sin.length === 1 ? "chat sin etapa no está" : "chats sin etapa no están"} en el embudo.
          </span>
          <button onClick={() => setVerSin((v) => !v)} className="flex items-center gap-1 font-semibold text-brand-300 hover:text-white">
            {verSin ? <>Ocultarlos <ChevronUp className="h-3.5 w-3.5" /></> : <>Verlos <ChevronDown className="h-3.5 w-3.5" /></>}
          </button>
        </div>
      )}

      {listo && etapas.length === 0 ? (
        <Vacio icono={Filter} titulo="Todavía no hay etapas" texto="Las etapas del embudo se crean en Configuración. Después, desde cada chat, «Etapa ▾»." />
      ) : listo && conEtapa === 0 && !verSin ? (
        <Vacio icono={Filter} titulo="Todavía no hay chats con etapa" texto="Desde el chat, «Etapa ▾» para ponerle una. Las tarjetas aparecen acá por columna." />
      ) : (
        <div className="no-scrollbar overflow-x-auto pb-2">
          <div className="flex gap-3" style={{ minWidth: "min-content" }}>
            {columnas.map((col) => (
              <div
                key={col.id}
                onDragOver={(e) => onDragOver(e, col.id)}
                onDragLeave={() => sobre === col.id && setSobre(null)}
                onDrop={(e) => onDrop(e, col.id)}
                className={`flex w-[280px] shrink-0 flex-col rounded-2xl border bg-ink-900/60 transition ${
                  sobre === col.id ? "border-brand-500/60 bg-brand-500/5" : "border-ink-800"
                }`}
              >
                <div className="flex items-center gap-2 border-b border-ink-800 px-3 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.color }} />
                  <span className="text-sm font-bold text-white">{col.nombre}</span>
                  <span className="ml-auto rounded-full bg-ink-800 px-2 py-0.5 text-[11px] font-semibold text-ink-300">{col.lista.length}</span>
                </div>
                <div className="flex max-h-[calc(100vh-16rem)] min-h-[120px] flex-col gap-2 overflow-y-auto p-2">
                  {col.lista.length === 0 && (
                    <div className="rounded-xl border border-dashed border-ink-700 px-3 py-6 text-center text-[11px] text-ink-500">
                      {col.id === SIN_ETAPA ? "Todos tienen etapa." : "Soltá acá un chat"}
                    </div>
                  )}
                  {col.lista.map((c) => (
                    <Tarjeta
                      key={c.id}
                      conv={c}
                      etapas={etapas}
                      pedido={c.pedido_id ? pedidos.find((p) => p.id === c.pedido_id)?.numero || null : null}
                      etiquetas={etiquetasDe(empresa, c.etiquetas)}
                      esCelular={esCelular}
                      arrastrando={arrastrando === c.id}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", c.id);
                        e.dataTransfer.effectAllowed = "move";
                        setArrastrando(c.id);
                      }}
                      onDragEnd={() => {
                        setArrastrando(null);
                        setSobre(null);
                      }}
                      onMover={(etapaId) => mover(c.id, etapaId)}
                      onAbrir={() => router.push(`/inbox?c=${encodeURIComponent(c.id)}`)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Tarjeta({
  conv,
  etapas,
  pedido,
  etiquetas,
  esCelular,
  arrastrando,
  onDragStart,
  onDragEnd,
  onMover,
  onAbrir,
}: {
  conv: Conversacion;
  etapas: Etapa[];
  pedido: string | null;
  etiquetas: { id: string; nombre: string; color: string }[];
  esCelular: boolean;
  arrastrando: boolean;
  onDragStart: (e: RDragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onMover: (etapaId: string | null) => void;
  onAbrir: () => void;
}) {
  const m = canalMeta(conv.canal);
  const Icono = m.icono;
  return (
    <div
      draggable={!esCelular}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onAbrir}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onAbrir();
      }}
      className={`cursor-pointer rounded-xl border border-ink-700 bg-ink-850 p-2.5 transition hover:border-ink-600 ${arrastrando ? "opacity-40" : ""}`}
      title="Abrir el chat"
    >
      <div className="flex items-center gap-2">
        <Avatar nombre={conv.nombre} tam="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-white">{conv.nombre}</span>
            <Icono className="h-3.5 w-3.5 shrink-0" style={{ color: m.color }} aria-label={m.nombre} />
          </div>
          <div className="text-[10px] text-ink-500">{haceCuanto(conv.ultimo_en)}</div>
        </div>
      </div>
      {conv.ultimo_texto && <p className="mt-1.5 line-clamp-2 text-xs text-ink-400">{recortar(conv.ultimo_texto, 120)}</p>}
      {(etiquetas.length > 0 || pedido) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {etiquetas.map((e) => <ChipColor key={e.id} color={e.color} chico>{e.nombre}</ChipColor>)}
          {pedido && <span className="chip bg-ink-800 px-2 py-0.5 font-mono text-[10px] text-ink-300"><Package className="h-3 w-3" /> {pedido}</span>}
        </div>
      )}
      {esCelular && (
        <select
          className="input mt-2 py-1 text-xs"
          value={conv.etapa_id || ""}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            onMover(e.target.value || null);
          }}
          aria-label="Mover a otra etapa"
        >
          <option value="">Sin etapa</option>
          {etapas.map((et) => <option key={et.id} value={et.id}>{et.nombre}</option>)}
        </select>
      )}
    </div>
  );
}
