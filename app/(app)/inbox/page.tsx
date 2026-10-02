"use client";
// ============================================================
// Clientany · Bandeja (/inbox) — el corazón del producto. Escritorio:
// tres columnas (lista · chat · ficha); celular: una por vez.
// ============================================================
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { avisar } from "@/components/crm/ui";
import { filtrarBandeja } from "@/lib/crm/core";
import { useCrm } from "@/lib/crm/repo";
import { useBandeja, useCanales, useMarcaActiva, useModo, usePolling } from "@/lib/crm/hooks";
import type { CanalTipo } from "@/lib/crm/types";
import { guardarLS, leerLS, useEsCelular } from "@/components/crm/bandeja/comun";
import { FILTROS_DEFAULT, ListaBandeja, type FiltrosLista } from "@/components/crm/bandeja/lista";
import { ChatPanel } from "@/components/crm/bandeja/chat";
import { NuevoChatModal, SimuladorModal } from "@/components/crm/bandeja/nuevo-chat";

const LS_FILTROS = "crm_bandeja_filtros";
const LS_FICHA = "crm_ficha";

export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <Bandeja />
    </Suspense>
  );
}

function Bandeja() {
  const params = useSearchParams();
  const qUrl = params.get("q") || "";
  const cUrl = params.get("c") || "";
  const simularUrl = params.get("simular") === "1";

  const cel = useEsCelular();
  const esCelular = cel === true;
  const listo = useCrm((s) => s.listo);
  const convs = useCrm((s) => s.conversaciones);
  const modo = useModo();
  const marca = useMarcaActiva();
  const canales = useCanales();

  const [q, setQ] = useState(qUrl);
  const [filtros, setFiltros] = useState<FiltrosLista>(FILTROS_DEFAULT);
  const [ficha, setFicha] = useState(true);
  const [lsCargado, setLsCargado] = useState(false);
  const [sel, setSel] = useState<string | null>(cUrl || null);
  const [enChat, setEnChat] = useState(!!cUrl);
  const [nuevo, setNuevo] = useState(false);
  const [simulador, setSimulador] = useState(false);

  // Comodidades guardadas en el navegador (después de montar, para no pisar la hidratación).
  useEffect(() => {
    setFiltros({ ...FILTROS_DEFAULT, ...leerLS<Partial<FiltrosLista>>(LS_FILTROS, {}) });
    setFicha(leerLS<boolean>(LS_FICHA, true));
    setLsCargado(true);
  }, []);
  useEffect(() => {
    if (lsCargado) guardarLS(LS_FILTROS, filtros);
  }, [filtros, lsCargado]);
  useEffect(() => {
    if (lsCargado) guardarLS(LS_FICHA, ficha);
  }, [ficha, lsCargado]);

  // ?q= y ?c= de la URL (vienen de la barra de arriba, del embudo o de Clientes).
  useEffect(() => {
    if (qUrl) setQ(qUrl);
  }, [qUrl]);
  useEffect(() => {
    if (cUrl) {
      setSel(cUrl);
      setEnChat(true);
    }
  }, [cUrl]);

  const buscando = q.trim().length >= 2;
  const { filas, conteos } = useBandeja({
    q: buscando ? q.trim() : undefined,
    grupo: filtros.grupo,
    canal: filtros.canal,
    orden: filtros.orden,
    marca_id: marca,
  });
  usePolling(true, sel);

  // En la compu se abre sola la conversación más reciente de Ventas.
  useEffect(() => {
    if (!listo || cel !== false || sel) return;
    const ventas = filtrarBandeja(convs, { grupo: "ventas", marca_id: marca });
    if (ventas[0]) setSel(ventas[0].id);
  }, [listo, cel, sel, convs, marca]);

  // Si la conversación elegida ya no existe (la borraron), se suelta.
  useEffect(() => {
    if (listo && sel && convs.length && !convs.some((c) => c.id === sel)) {
      setSel(null);
      setEnChat(false);
    }
  }, [listo, sel, convs]);

  const canalesDisponibles = useMemo(() => {
    const set = new Set<CanalTipo>();
    canales.forEach((c) => set.add(c.tipo));
    convs.forEach((c) => set.add(c.canal));
    return [...set];
  }, [canales, convs]);

  function abrir(id: string) {
    setSel(id);
    setEnChat(true);
  }

  return (
    <div className="animate-fade-in">
      <div className="card flex h-[calc(100dvh-11.25rem)] min-h-[420px] overflow-hidden lg:h-[calc(100vh-7.5rem)]">
        {/* lista */}
        <div className={`w-full flex-col border-r border-ink-800 md:w-[360px] md:shrink-0 ${enChat ? "hidden md:flex" : "flex"}`}>
          <ListaBandeja
            q={q}
            onQ={setQ}
            filtros={filtros}
            onFiltros={setFiltros}
            filas={filas}
            conteos={conteos}
            cargando={!listo}
            seleccionada={sel}
            onAbrir={abrir}
            canalesDisponibles={canalesDisponibles}
            onNuevo={() => setNuevo(true)}
            onSimular={modo === "demo" || simularUrl ? () => setSimulador(true) : undefined}
          />
        </div>

        {/* chat (+ ficha) */}
        <div className={`min-w-0 flex-1 ${enChat ? "flex" : "hidden md:flex"}`}>
          {sel ? (
            <ChatPanel
              key={sel}
              convId={sel}
              esCelular={esCelular}
              onVolver={() => setEnChat(false)}
              fichaAbierta={ficha}
              onFicha={setFicha}
              onBorrada={() => {
                setSel(null);
                setEnChat(false);
              }}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center text-ink-500">
                <MessageSquare className="mx-auto h-10 w-10 text-ink-700" />
                <p className="mt-2 text-sm">Elegí una conversación</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <NuevoChatModal abierto={nuevo} onCerrar={() => setNuevo(false)} onCreada={(c) => abrir(c.id)} />
      <SimuladorModal
        abierto={simulador}
        onCerrar={() => setSimulador(false)}
        onCreada={(c, bot) => {
          abrir(c.id);
          avisar(bot.explicacion || (bot.respuestas.length ? "El bot contestó." : "El bot no contestó."), "info");
        }}
      />
    </div>
  );
}
