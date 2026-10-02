"use client";
// /plantillas — Plantillas de WhatsApp y respuestas rápidas.
import { useEffect, useState } from "react";
import { FileText, MessageSquareText, Zap } from "lucide-react";
import { useEmpresa, usePlantillas, useRapidas } from "@/lib/crm/hooks";
import { Encabezado } from "@/components/crm/ui";
import { CargandoPantalla } from "@/components/crm/pantallas/comun";
import { TabPlantillas, TabRapidas } from "@/components/crm/pantallas/plantillas";

type Pestana = "plantillas" | "rapidas";

export default function PlantillasPage() {
  const empresa = useEmpresa();
  const plantillas = usePlantillas();
  const rapidas = useRapidas();
  const [pestana, setPestana] = useState<Pestana>("plantillas");

  // /plantillas#rapidas abre directo esa pestaña.
  useEffect(() => {
    if (window.location.hash === "#rapidas") setPestana("rapidas");
  }, []);

  if (!empresa) return <CargandoPantalla />;

  const tabs: { id: Pestana; nombre: string; icono: typeof Zap; n: number }[] = [
    { id: "plantillas", nombre: "Plantillas de WhatsApp", icono: FileText, n: plantillas.length },
    { id: "rapidas", nombre: "Respuestas rápidas", icono: Zap, n: rapidas.length },
  ];

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <Encabezado
        titulo="Plantillas y rápidas"
        icono={MessageSquareText}
        sub="Las plantillas abren charlas por WhatsApp fuera de la ventana de 24 hs; las rápidas te ahorran escribir siempre lo mismo."
      />
      <div role="tablist" className="mb-4 flex gap-1 rounded-xl border border-ink-700 bg-ink-850 p-1 sm:inline-flex">
        {tabs.map((t) => {
          const Icon = t.icono;
          const activa = pestana === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={activa}
              onClick={() => {
                setPestana(t.id);
                history.replaceState(null, "", t.id === "rapidas" ? "#rapidas" : window.location.pathname);
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition sm:flex-none ${
                activa ? "bg-brand-500 text-white" : "text-ink-300 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.nombre}
              <span className={`rounded-full px-1.5 text-[11px] ${activa ? "bg-white/20" : "bg-ink-700 text-ink-300"}`}>{t.n}</span>
            </button>
          );
        })}
      </div>
      {pestana === "plantillas" ? <TabPlantillas /> : <TabRapidas />}
    </div>
  );
}
