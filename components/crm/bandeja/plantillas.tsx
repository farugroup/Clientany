"use client";
// ============================================================
// Clientany · Bandeja — plantillas de WhatsApp: lista para elegir y el
// modal que pide una variable por {{n}}, muestra la vista previa y manda.
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { FileText, Send } from "lucide-react";
import { Campo, Modal } from "@/components/crm/ui";
import type { Plantilla } from "@/lib/crm/types";

export function rellenarPlantilla(cuerpo: string, parametros: string[]): string {
  return (cuerpo || "").replace(/\{\{(\d+)\}\}/g, (m, n: string) => {
    const v = parametros[Number(n) - 1];
    return v && v.trim() ? v : m;
  });
}

// Sólo las aprobadas y, si la plantilla está atada a un canal, las de ese canal.
export function plantillasUsables(plantillas: Plantilla[], canalId?: string | null): Plantilla[] {
  return plantillas.filter((p) => p.estado === "aprobada" && (!p.canal_id || !canalId || p.canal_id === canalId));
}

export function ListaPlantillas({
  plantillas,
  onElegir,
  vacio = "No hay plantillas aprobadas. Sincronizalas desde Conexiones o cargá una en Plantillas.",
}: {
  plantillas: Plantilla[];
  onElegir: (p: Plantilla) => void;
  vacio?: string;
}) {
  const [q, setQ] = useState("");
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? plantillas.filter((p) => `${p.nombre} ${p.cuerpo}`.toLowerCase().includes(t)) : plantillas;
  }, [plantillas, q]);
  return (
    <div className="flex max-h-80 w-80 max-w-[90vw] flex-col">
      <div className="border-b border-ink-800 p-2">
        <input className="input py-1.5 text-xs" placeholder="Buscar plantilla…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto p-1.5">
        {lista.length === 0 && <div className="px-2 py-3 text-xs text-ink-500">{plantillas.length ? "Sin resultados." : vacio}</div>}
        {lista.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onElegir(p)}
            className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-ink-800"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 shrink-0 text-brand-300" />
              <span className="font-mono text-[11px] font-semibold text-ink-100">{p.nombre}</span>
              <span className="ml-auto text-[10px] text-ink-500">{p.idioma}</span>
            </div>
            <div className="mt-0.5 line-clamp-2 text-[11px] text-ink-400">{p.cuerpo}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function EnviarPlantillaModal({
  plantilla,
  abierto,
  onCerrar,
  onEnviar,
  titulo = "Mandar plantilla",
  textoBoton = "Enviar",
}: {
  plantilla: Plantilla | null;
  abierto: boolean;
  onCerrar: () => void;
  onEnviar: (parametros: string[]) => Promise<void>;
  titulo?: string;
  textoBoton?: string;
}) {
  const [params, setParams] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    if (plantilla) setParams(Array.from({ length: plantilla.variables || 0 }).map(() => ""));
  }, [plantilla]);
  if (!plantilla) return null;
  const faltan = params.some((p) => !p.trim());
  async function enviar() {
    setEnviando(true);
    try {
      await onEnviar(params.map((p) => p.trim()));
      onCerrar();
    } finally {
      setEnviando(false);
    }
  }
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={
        <span className="flex items-center gap-2">
          {titulo} <span className="font-mono text-xs font-normal text-ink-400">{plantilla.nombre}</span>
        </span>
      }
      pie={
        <>
          <button className="btn-ghost" onClick={onCerrar} disabled={enviando}>Cancelar</button>
          <button className="btn-primary" onClick={enviar} disabled={enviando || faltan}>
            <Send className="h-4 w-4" /> {textoBoton}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {params.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {params.map((v, i) => (
              <Campo key={i} etiqueta={`Variable {{${i + 1}}}`} ayuda={plantilla.ejemplo?.[i] ? `ej.: ${plantilla.ejemplo[i]}` : undefined}>
                <input
                  className="input"
                  value={v}
                  placeholder={plantilla.ejemplo?.[i] || ""}
                  onChange={(e) => setParams(params.map((x, j) => (j === i ? e.target.value : x)))}
                />
              </Campo>
            ))}
          </div>
        )}
        <div>
          <div className="label mb-1.5">Vista previa</div>
          <div className="whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-brand-600 px-3.5 py-2.5 text-sm text-white">
            {rellenarPlantilla(plantilla.cuerpo, params)}
          </div>
        </div>
        {faltan && <p className="text-xs text-ink-500">Completá todas las variables para mandarla.</p>}
      </div>
    </Modal>
  );
}
