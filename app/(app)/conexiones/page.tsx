"use client";
// /conexiones — los canales de la empresa (WhatsApp, Instagram, Messenger,
// manual), el simulador de entrantes, las tiendas y la API.
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Code2, FlaskConical, PenLine, Plug, Radio, Store } from "lucide-react";
import type { CanalTipo } from "@/lib/crm/types";
import { useCanales, useEmpresa, useEsAdmin, useMarcaActiva, useModo } from "@/lib/crm/hooks";
import { Encabezado, Vacio } from "@/components/crm/ui";
import { AvisoSoloAdmin, BandaDemo, CANAL_VISUAL, CanalIcono, CargandoPantalla, Tarjeta } from "@/components/crm/pantallas/comun";
import { ConectarCanalModal, SimuladorEntrantes, TarjetaCanal } from "@/components/crm/pantallas/canales";
import { ListaTiendas } from "@/components/crm/pantallas/tiendas";

const OPCIONES: { tipo: Exclude<CanalTipo, "manual">; texto: string }[] = [
  { tipo: "whatsapp", texto: "Tu número de WhatsApp Business por la API oficial de Meta (Cloud API). Mensajes, fotos, audios y plantillas." },
  { tipo: "instagram", texto: "Los mensajes directos de tu cuenta profesional de Instagram, en la misma bandeja." },
  { tipo: "messenger", texto: "Los mensajes de tu página de Facebook por Messenger." },
];

export default function ConexionesPage() {
  const empresa = useEmpresa();
  const canales = useCanales();
  const esAdmin = useEsAdmin();
  const modo = useModo();
  const marca = useMarcaActiva();
  const [conectar, setConectar] = useState<CanalTipo | null>(null);

  // /conexiones?conectar=whatsapp abre directo el modal.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("conectar") as CanalTipo | null;
    if (t && t in CANAL_VISUAL) setConectar(t);
  }, []);

  if (!empresa) return <CargandoPantalla />;

  const ordenados = [...canales].sort((a, b) => (a.tipo === "manual" ? 1 : 0) - (b.tipo === "manual" ? 1 : 0) || a.nombre.localeCompare(b.nombre));

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <Encabezado
        titulo="Conexiones"
        icono={Plug}
        sub="Conectá tu WhatsApp, Instagram y Messenger: todo entra a la misma Bandeja y el bot contesta por los tres."
      />

      {modo === "demo" && <BandaDemo>Modo demo: los canales se guardan pero no salen mensajes reales.</BandaDemo>}
      {!esAdmin && <AvisoSoloAdmin texto="Los canales los conecta un admin de la empresa. Acá ves cómo están." />}

      {/* 1. Canales conectados */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Radio className="h-[18px] w-[18px] text-brand-300" />
          <h2 className="text-base font-bold text-white">Tus canales</h2>
          <span className="chip bg-ink-800 px-2 py-0.5 text-[11px] text-ink-300">{canales.length}</span>
        </div>
        {canales.length ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ordenados.map((c) => (
              <TarjetaCanal key={c.id} canal={c} esAdmin={esAdmin} modo={modo} />
            ))}
          </div>
        ) : (
          <Vacio
            icono={Radio}
            titulo="Todavía no conectaste ningún canal"
            texto="Elegí uno acá abajo: te guiamos paso a paso por Meta y probamos las credenciales antes de guardarlas."
          />
        )}
      </section>

      {/* 2. Conectar un canal */}
      {esAdmin && (
        <section>
          <h2 className="mb-3 text-base font-bold text-white">Conectar un canal</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {OPCIONES.map((o) => {
              const v = CANAL_VISUAL[o.tipo];
              const ya = canales.filter((c) => c.tipo === o.tipo).length;
              return (
                <button
                  key={o.tipo}
                  onClick={() => setConectar(o.tipo)}
                  className="card group flex flex-col items-start gap-3 p-5 text-left transition hover:border-brand-500/40"
                >
                  <div className="flex w-full items-center justify-between">
                    <CanalIcono tipo={o.tipo} tam="lg" />
                    {ya > 0 && (
                      <span className="chip bg-ink-800 px-2 py-0.5 text-[10px] text-ink-300">
                        {ya} conectado{ya > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{o.tipo === "whatsapp" ? "WhatsApp Business API" : v.nombre}</div>
                    <p className="mt-1 text-xs leading-relaxed text-ink-400">{o.texto}</p>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-brand-300 group-hover:text-brand-200">
                    {ya ? "Sumar otro" : "Conectar"} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setConectar("manual")}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-dashed border-ink-700 px-4 py-3 text-left transition hover:border-brand-500/40"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-800">
              <PenLine className="h-4 w-4 text-ink-300" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white">Canal manual (sin API)</span>
              <span className="block text-xs text-ink-400">
                Para cargar charlas a mano, por ejemplo de un teléfono que no está en la API. El bot no escribe ahí.
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-ink-500" />
          </button>
        </section>
      )}

      {/* 3. Simulador */}
      {esAdmin && (
        <Tarjeta
          titulo="Simulador de mensajes entrantes"
          icono={FlaskConical}
          sub="Mandá un mensaje como si fueras un cliente para ver qué contesta el bot y cómo queda en la Bandeja."
        >
          <SimuladorEntrantes canales={canales} empresa={empresa} />
        </Tarjeta>
      )}

      {/* 4. Tiendas */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Store className="h-[18px] w-[18px] text-brand-300" />
          <h2 className="text-base font-bold text-white">Tiendas y otras integraciones</h2>
        </div>
        <ListaTiendas esAdmin={esAdmin} />
      </section>

      {/* 5. API y CSV */}
      <Tarjeta titulo="API y CSV" icono={Code2} sub="Cargá pedidos y stock por API o por CSV: el bot y la ficha del cliente los usan al toque.">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/pedidos?importar=1", titulo: "Importar pedidos", texto: "CSV de tu tienda o planilla" },
            { href: "/stock?importar=1", titulo: "Importar stock", texto: "SKU, precio y stock" },
            { href: "/ajustes#api", titulo: "Crear una clave de API", texto: "Para tu sistema o tu tienda" },
            { href: "/docs#api", titulo: "Documentación de la API", texto: "Rutas, ejemplos y webhooks" },
          ].map((x) => (
            <Link key={x.href} href={x.href} className="group rounded-xl border border-ink-700 bg-ink-850 p-3 transition hover:border-brand-500/40">
              <div className="flex items-center justify-between text-sm font-semibold text-white">
                {x.titulo}
                <ArrowRight className="h-3.5 w-3.5 text-ink-500 transition group-hover:translate-x-0.5 group-hover:text-brand-300" />
              </div>
              <div className="mt-0.5 text-xs text-ink-400">{x.texto}</div>
            </Link>
          ))}
        </div>
      </Tarjeta>

      {conectar && esAdmin && <ConectarCanalModal tipo={conectar} empresa={empresa} modo={modo} marcaActiva={marca} onCerrar={() => setConectar(null)} />}
    </div>
  );
}
