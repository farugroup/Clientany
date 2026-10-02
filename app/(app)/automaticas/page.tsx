"use client";
// /automaticas — Respuestas automáticas: el bot de la empresa.
// Se edita un borrador y se guarda todo junto con «Guardar cambios»
// (barra pegada abajo que aparece sólo si hay cambios). El interruptor
// general guarda al toque.
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot as BotIcono, Power, RotateCcw, Save } from "lucide-react";
import type { Bot } from "@/lib/crm/types";
import { completarBot } from "@/lib/crm/bot";
import { getRepo } from "@/lib/crm/repo";
import { useBot, useEmpresa, useEsAdmin } from "@/lib/crm/hooks";
import { BotonCargando, Encabezado, avisar } from "@/components/crm/ui";
import { AvisoSoloAdmin, CargandoPantalla, InterruptorChico } from "@/components/crm/pantallas/comun";
import {
  SeccionAusencia,
  SeccionBienvenida,
  SeccionHumano,
  SeccionLimites,
  SeccionMenu,
  SeccionPedidos,
  SeccionReglas,
  SeccionStock,
} from "@/components/crm/pantallas/bot-secciones";
import { ProbarBot } from "@/components/crm/pantallas/bot-probar";

const json = (b: Bot | null) => (b ? JSON.stringify(b) : "");

// Problemas que no dejan guardar (criollo, uno por línea).
function problemas(b: Bot): string[] {
  const p: string[] = [];
  b.reglas.forEach((r) => {
    if (!r.activa) return;
    if (!r.palabras.length) p.push(`La regla «${r.nombre}» no tiene palabras.`);
    if (!r.respuesta.trim()) p.push(`La regla «${r.nombre}» no tiene respuesta.`);
  });
  if (b.menu.activo) {
    if (!b.menu.opciones.length) p.push("El menú está prendido pero no tiene opciones.");
    const claves = b.menu.opciones.map((o) => o.clave.trim());
    if (claves.some((c) => !c)) p.push("Hay una opción del menú sin número.");
    if (new Set(claves).size !== claves.length) p.push("Hay números de opción repetidos en el menú.");
    b.menu.opciones.forEach((o) => {
      if (o.accion === "responder" && !(o.respuesta || "").trim()) p.push(`La opción ${o.clave} del menú no tiene respuesta.`);
    });
  }
  if (b.bienvenida.activa && !b.bienvenida.texto.trim()) p.push("La bienvenida está prendida pero vacía.");
  if (b.ausencia.activa && !b.ausencia.texto.trim()) p.push("El aviso de fuera de horario está prendido pero vacío.");
  return p;
}

export default function AutomaticasPage() {
  const empresa = useEmpresa();
  const botStore = useBot();
  const esAdmin = useEsAdmin();
  const ro = !esAdmin;

  const [base, setBase] = useState<Bot | null>(null);
  const [borrador, setBorrador] = useState<Bot | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [prendiendo, setPrendiendo] = useState(false);

  const botJson = useMemo(() => (botStore ? JSON.stringify(botStore) : ""), [botStore]);
  const sucio = !!borrador && !!base && json(borrador) !== json(base);

  // Si el bot cambia en el store (carga inicial, otra pestaña) y no hay
  // cambios sin guardar, el borrador se pone al día.
  const baseRef = useRef<Bot | null>(null);
  baseRef.current = base;
  useEffect(() => {
    if (!botJson) return;
    const nuevo = completarBot(JSON.parse(botJson) as Bot);
    const anterior = baseRef.current;
    setBorrador((actual) => (!actual || !anterior || json(actual) === json(anterior) ? nuevo : actual));
    setBase(nuevo);
  }, [botJson]);

  // Avisar antes de irse con cambios sin guardar.
  useEffect(() => {
    if (!sucio) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [sucio]);

  const cambiar = (patch: Partial<Bot>) => setBorrador((b) => (b ? { ...b, ...patch } : b));

  async function guardar() {
    if (!borrador) return;
    const listo = completarBot({ ...borrador, reglas: borrador.reglas.map((r, i) => ({ ...r, orden: i })) });
    const p = problemas(listo);
    if (p.length) {
      avisar(p.slice(0, 3).join(" "), "error");
      return;
    }
    setGuardando(true);
    try {
      const g = completarBot(await getRepo().guardarBot(listo));
      setBase(g);
      setBorrador(g);
      avisar("Respuestas automáticas guardadas.");
    } catch (e) {
      avisar(e, "error");
    } finally {
      setGuardando(false);
    }
  }

  async function prender(v: boolean) {
    if (!base) return;
    setPrendiendo(true);
    try {
      const g = completarBot(await getRepo().guardarBot({ ...base, activo: v }));
      setBase(g);
      setBorrador((b) => (b ? { ...b, activo: g.activo } : b));
      avisar(v ? "Bot encendido." : "Bot apagado: no se manda nada automático.");
    } catch (e) {
      avisar(e, "error");
    } finally {
      setPrendiendo(false);
    }
  }

  if (!empresa || !borrador || !base) return <CargandoPantalla />;
  const props = { bot: borrador, cambiar, ro };

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      <Encabezado
        titulo="Respuestas automáticas"
        icono={BotIcono}
        sub="Lo que contesta el bot solo: bienvenida, fuera de horario, menú, palabras clave, stock y pedidos."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          {ro && <AvisoSoloAdmin texto="Sólo un admin puede cambiar las respuestas automáticas. Igual podés probar el bot acá al lado." />}

          <div
            className={`card flex items-center gap-4 p-4 lg:p-5 ${base.activo ? "border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent" : ""}`}
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${base.activo ? "bg-green-500/15" : "bg-ink-800"}`}>
              <Power className={`h-5 w-5 ${base.activo ? "text-green-400" : "text-ink-400"}`} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-white">{base.activo ? "Bot encendido" : "Bot apagado"}</div>
              <p className="text-xs text-ink-400">
                Responde solo cuando no hay nadie; calla si una persona respondió hace menos de {base.pausa_si_persona_min} min.
              </p>
            </div>
            <InterruptorChico
              valor={base.activo}
              onCambio={prender}
              etiqueta={base.activo ? "Apagar el bot" : "Encender el bot"}
              deshabilitado={ro || prendiendo}
            />
          </div>

          <fieldset disabled={ro} className={`min-w-0 space-y-4 transition ${base.activo ? "" : "opacity-70"}`}>
            <SeccionBienvenida {...props} empresa={empresa} />
            <SeccionAusencia {...props} empresa={empresa} />
            <SeccionMenu {...props} />
            <SeccionReglas {...props} />
            <SeccionStock {...props} />
            <SeccionPedidos {...props} />
            <SeccionHumano {...props} />
            <SeccionLimites {...props} />
          </fieldset>

          {sucio && !ro && (
            <div className="sticky bottom-20 z-20 lg:bottom-4">
              <div className="card flex flex-wrap items-center gap-3 border-brand-500/40 bg-ink-900/95 p-3 shadow-glow">
                <span className="h-2 w-2 shrink-0 animate-pulse2 rounded-full bg-amber-400" />
                <span className="flex-1 text-sm text-ink-200">Tenés cambios sin guardar.</span>
                <button className="btn-ghost py-2" onClick={() => setBorrador(base)} disabled={guardando}>
                  <RotateCcw className="h-4 w-4" /> Descartar
                </button>
                <BotonCargando cargando={guardando} onClick={guardar} className="btn-primary py-2">
                  <Save className="h-4 w-4" /> Guardar cambios
                </BotonCargando>
              </div>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <ProbarBot bot={base} sucio={sucio} puedeMandar={esAdmin} />
        </aside>
      </div>
    </div>
  );
}
