"use client";
// /ajustes — Configuración de la empresa: datos, horario, embudo, etiquetas,
// IA, API, webhook, datos de prueba, plan y tu perfil. Sólo un admin edita;
// un agente ve todo y puede cambiar su propio nombre.
import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Plug, Settings } from "lucide-react";
import { useEmpresa, useEsAdmin } from "@/lib/crm/hooks";
import { Encabezado } from "@/components/crm/ui";
import { AvisoSoloAdmin, CargandoPantalla } from "@/components/crm/pantallas/comun";
import { PrimerosPasos, SeccionEmpresa, SeccionHorario, SeccionPerfil, SeccionPlan } from "@/components/crm/pantallas/ajustes-empresa";
import { SeccionEtapas, SeccionEtiquetas } from "@/components/crm/pantallas/ajustes-embudo";
import { SeccionApi, SeccionDatosPrueba, SeccionIA, SeccionWebhook } from "@/components/crm/pantallas/ajustes-ia-api";

const INDICE = [
  { id: "empresa", nombre: "Empresa" },
  { id: "horario", nombre: "Horario" },
  { id: "etapas", nombre: "Etapas" },
  { id: "etiquetas", nombre: "Etiquetas" },
  { id: "ia", nombre: "IA" },
  { id: "api", nombre: "API" },
  { id: "webhook", nombre: "Webhook" },
  { id: "datos", nombre: "Datos de prueba" },
  { id: "plan", nombre: "Plan" },
  { id: "perfil", nombre: "Tu perfil" },
];

export default function AjustesPage() {
  const empresa = useEmpresa();
  const esAdmin = useEsAdmin();
  const ro = !esAdmin;

  // Al llegar con /ajustes#horario (o #api…), bajar a esa sección cuando ya cargó.
  const bajado = useRef(false);
  useEffect(() => {
    if (!empresa || bajado.current) return;
    bajado.current = true;
    const id = window.location.hash.slice(1);
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [empresa]);

  if (!empresa) return <CargandoPantalla />;

  return (
    <div className="mx-auto max-w-4xl space-y-4 animate-fade-in">
      <Encabezado titulo="Configuración" icono={Settings} sub={`Todo lo de ${empresa.nombre}: datos, horario, embudo, IA, API y plan.`} />

      <nav aria-label="Secciones" className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {INDICE.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="chip shrink-0 border border-ink-700 bg-ink-850 text-ink-300 hover:border-ink-600 hover:text-white">
            {s.nombre}
          </a>
        ))}
      </nav>

      {ro && <AvisoSoloAdmin texto="Sólo un admin puede cambiar la configuración de la empresa. Vos podés cambiar tu nombre, abajo de todo." />}
      {esAdmin && <PrimerosPasos empresa={empresa} />}

      <SeccionEmpresa empresa={empresa} ro={ro} />
      <SeccionHorario empresa={empresa} ro={ro} />
      <SeccionEtapas empresa={empresa} ro={ro} />
      <SeccionEtiquetas empresa={empresa} ro={ro} />
      <SeccionIA empresa={empresa} ro={ro} />
      <SeccionApi ro={ro} />
      <SeccionWebhook empresa={empresa} ro={ro} />
      <SeccionDatosPrueba ro={ro} />
      <SeccionPlan empresa={empresa} />
      <SeccionPerfil />

      <Link href="/conexiones" className="card group flex items-center gap-3 p-4 transition hover:border-brand-500/40">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15">
          <Plug className="h-5 w-5 text-brand-300" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white">Canales, tiendas e integraciones</span>
          <span className="block text-xs text-ink-400">
            WhatsApp, Instagram, Messenger, Tienda Nube, Shopify, Mercado Libre y más: ahora viven en Conexiones.
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-500 transition group-hover:translate-x-0.5 group-hover:text-brand-300" />
      </Link>
    </div>
  );
}
