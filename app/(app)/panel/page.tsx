"use client";
// /panel — el tablero del CRM: cómo viene la atención hoy y en el mes.
import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  Boxes,
  Filter,
  FlaskConical,
  Inbox,
  LayoutDashboard,
  MessageCircle,
  MessagesSquare,
  PackageX,
  Plug,
  RefreshCw,
  ShoppingBag,
  Timer,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { CanalTipo } from "@/lib/crm/types";
import { GRUPOS, dinero, haceCuanto } from "@/lib/crm/core";
import { getRepo } from "@/lib/crm/repo";
import { useActividad, useEmpresa, useEsAdmin, useMetricas, useModo, usePedidos, useYo } from "@/lib/crm/hooks";
import { StatCard } from "@/components/ui";
import { Confirmar, Encabezado, avisar } from "@/components/crm/ui";
import { BandaDemo, CANAL_VISUAL, Esqueleto, Tarjeta, useAhora } from "@/components/crm/pantallas/comun";
import { BarrasEtapas, GraficoCanales } from "@/components/crm/pantallas/panel-graficos";

const nf = new Intl.NumberFormat("es-AR");
const n = (x: number | undefined | null) => (typeof x === "number" ? nf.format(x) : "sin dato");

function minutosLindos(min: number): string {
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

function Acceso({ href, icono: Icon, titulo, texto, color }: { href: string; icono: LucideIcon; titulo: string; texto: string; color: string }) {
  return (
    <Link href={href} className="card group flex items-start gap-3 p-4 transition hover:border-brand-500/40">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}1f` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-sm font-semibold text-white">
          {titulo}
          <ArrowRight className="h-3.5 w-3.5 text-ink-500 transition group-hover:translate-x-0.5 group-hover:text-brand-300" />
        </span>
        <span className="mt-0.5 block text-xs text-ink-400">{texto}</span>
      </span>
    </Link>
  );
}

export default function PanelPage() {
  const { datos, cargando, recargar } = useMetricas();
  const empresa = useEmpresa();
  const yo = useYo();
  const modo = useModo();
  const esAdmin = useEsAdmin();
  const actividad = useActividad();
  const pedidos = usePedidos();
  const ahora = useAhora(60_000);
  const [confirmar, setConfirmar] = useState<"vaciar" | "cargar" | null>(null);

  const hayDatos = !!datos && (datos.conversaciones.total > 0 || datos.stock.productos > 0 || pedidos.length > 0);
  const moneda = datos?.pedidos.moneda || empresa?.moneda || "ARS";
  const nombreYo = (yo?.nombre || "").split(" ")[0];
  const primerNombre = nombreYo.toLowerCase() === "vos" ? "" : nombreYo;
  const pruebaHasta =
    empresa?.plan === "prueba" && empresa.prueba_hasta
      ? new Date(empresa.prueba_hasta).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
      : null;

  const porCanal = datos
    ? (Object.keys(CANAL_VISUAL) as CanalTipo[])
        .filter((c) => c !== "manual" || (datos.por_canal[c] || 0) > 0)
        .map((c) => ({ nombre: CANAL_VISUAL[c].nombre, valor: datos.por_canal[c] || 0, color: CANAL_VISUAL[c].color }))
    : [];
  const porEtapa = datos ? datos.por_etapa.map((e) => ({ nombre: e.nombre, valor: e.cantidad, color: e.color })) : [];
  const equipo = datos ? [...datos.equipo].sort((a, b) => b.respondidas_mes - a.respondidas_mes) : [];
  const sinResponder = datos?.conversaciones.sin_responder ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-5 animate-fade-in">
      {modo === "demo" && (
        <BandaDemo
          accion={
            <div className="flex flex-wrap items-center gap-2">
              {esAdmin &&
                (hayDatos ? (
                  <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setConfirmar("vaciar")}>
                    Vaciar datos de ejemplo
                  </button>
                ) : (
                  <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setConfirmar("cargar")}>
                    Volver a cargar ejemplo
                  </button>
                ))}
              <Link href="/registro" className="btn-primary px-3 py-1.5 text-xs">
                Crear mi cuenta
              </Link>
            </div>
          }
        >
          Estás viendo datos de ejemplo: todo lo que hagas queda en este navegador.
        </BandaDemo>
      )}

      <Encabezado
        titulo={primerNombre ? `Hola, ${primerNombre}` : "Panel"}
        icono={LayoutDashboard}
        sub={
          <span className="flex flex-wrap items-center gap-2">
            <span>{empresa ? `Así viene la atención de ${empresa.nombre}.` : "Así viene la atención."}</span>
            {pruebaHasta && <span className="chip bg-brand-500/10 px-2 py-0.5 text-[11px] text-brand-300">Prueba gratis hasta {pruebaHasta}</span>}
          </span>
        }
        acciones={
          <button className="btn-ghost py-2" onClick={recargar} disabled={cargando}>
            <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} /> Actualizar
          </button>
        }
      />

      {/* Números */}
      {!datos ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Esqueleto key={i} className="h-[132px]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Link
              href="/inbox"
              className="block h-full rounded-2xl transition hover:ring-1 hover:ring-brand-500/40 [&>div]:h-full"
              aria-label="Ir a la bandeja"
            >
              <StatCard
                label="Sin responder"
                value={n(sinResponder)}
                icon={Inbox}
                accent={sinResponder > 0 ? "#ef4444" : "#16a34a"}
                sub={sinResponder > 0 ? "Ir a la bandeja" : "Todo al día"}
              />
            </Link>
            <StatCard
              label="Abiertas"
              value={n(datos.conversaciones.abiertas)}
              icon={MessagesSquare}
              accent="#3563ff"
              sub={`de ${n(datos.conversaciones.total)} en total`}
            />
            <StatCard label="Conversaciones hoy" value={n(datos.conversaciones.hoy)} icon={MessageCircle} accent="#598bff" />
            <StatCard
              label="Respondidas por el bot hoy"
              value={n(datos.bot.respuestas_hoy)}
              icon={Bot}
              accent="#8b5cf6"
              sub={`${n(datos.bot.respuestas_mes)} en el mes · ${n(datos.bot.derivadas_a_humano)} a una persona`}
            />
            <StatCard
              label="Pedidos del mes"
              value={n(datos.pedidos.mes)}
              icon={ShoppingBag}
              accent="#16a34a"
              sub={`${dinero(datos.pedidos.monto_mes, moneda)} · ${n(datos.pedidos.hoy)} hoy`}
            />
            <Link href="/stock" className="block h-full rounded-2xl transition hover:ring-1 hover:ring-brand-500/40 [&>div]:h-full" aria-label="Ir a stock">
              <StatCard
                label="Sin stock"
                value={n(datos.stock.sin_stock)}
                icon={PackageX}
                accent={datos.stock.sin_stock > 0 ? "#ef4444" : datos.stock.bajo_minimo > 0 ? "#f59e0b" : "#16a34a"}
                sub={`${n(datos.stock.bajo_minimo)} bajo mínimo · de ${n(datos.stock.productos)}`}
              />
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-ink-500">Bandeja:</span>
            {GRUPOS.map((g) => (
              <Link key={g.id} href="/inbox" className="chip border border-ink-700 bg-ink-850 text-ink-300 hover:border-ink-600 hover:text-white">
                {g.nombre} <b className="text-white">{n(datos.por_grupo[g.id] || 0)}</b>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Tarjeta titulo="Conversaciones por canal" icono={MessageCircle} className="lg:col-span-2">
          {!datos ? (
            <Esqueleto className="h-[220px]" />
          ) : porCanal.some((c) => c.valor > 0) ? (
            <GraficoCanales datos={porCanal} />
          ) : (
            <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center text-sm text-ink-400">
              Todavía no hay conversaciones.
              {esAdmin && (
                <Link href="/conexiones" className="text-xs font-semibold text-brand-300 hover:text-brand-200">
                  Conectá un canal
                </Link>
              )}
            </div>
          )}
        </Tarjeta>
        <Tarjeta
          titulo="Embudo por etapa"
          icono={Filter}
          acciones={
            <Link href="/embudo" className="text-xs font-semibold text-brand-300 hover:text-brand-200">
              Ver embudo
            </Link>
          }
        >
          {!datos ? (
            <Esqueleto className="h-[220px]" />
          ) : porEtapa.length ? (
            <BarrasEtapas datos={porEtapa} />
          ) : (
            <p className="py-8 text-center text-sm text-ink-400">
              Sin etapas cargadas.{" "}
              <Link href="/ajustes#etapas" className="font-semibold text-brand-300 hover:text-brand-200">
                Armalas en Configuración
              </Link>
            </p>
          )}
        </Tarjeta>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Tarjeta titulo="Equipo este mes" icono={Users}>
          {!datos ? (
            <Esqueleto className="h-40" />
          ) : equipo.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-ink-500">
                  <th className="pb-2">Miembro</th>
                  <th className="pb-2 text-right">Respondidas</th>
                </tr>
              </thead>
              <tbody>
                {equipo.map((m) => (
                  <tr key={m.miembro_id} className="border-t border-ink-800/60">
                    <td className="py-2 text-ink-100">{m.nombre}</td>
                    <td className="py-2 text-right font-mono text-white">{n(m.respondidas_mes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-6 text-center text-sm text-ink-400">Nadie respondió todavía este mes.</p>
          )}
        </Tarjeta>

        <Tarjeta titulo="Primera respuesta" icono={Timer} sub="Promedio del mes: cuánto tarda una persona en contestar el primer mensaje.">
          {!datos ? (
            <Esqueleto className="h-24" />
          ) : typeof datos.primera_respuesta_min === "number" ? (
            <div className="py-4">
              <div className="text-3xl font-extrabold tracking-tight text-white">{minutosLindos(datos.primera_respuesta_min)}</div>
              <p className="mt-1 text-xs text-ink-400">
                {datos.primera_respuesta_min <= 15
                  ? "Muy bien: así se cierran más ventas."
                  : datos.primera_respuesta_min <= 60
                    ? "Bien. Bajarlo de 15 min suma ventas."
                    : "Alto: el bot y las respuestas rápidas ayudan a bajarlo."}
              </p>
            </div>
          ) : (
            <div className="py-4">
              <div className="text-2xl font-bold text-ink-400">sin dato</div>
              <p className="mt-1 text-xs text-ink-500">Aparece cuando el equipo conteste los primeros chats del mes.</p>
            </div>
          )}
        </Tarjeta>

        <Tarjeta titulo="Últimas acciones" icono={Activity}>
          {actividad.length ? (
            <ul className="space-y-2.5">
              {actividad.slice(0, 7).map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-xs">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  <span className="min-w-0 flex-1 text-ink-300">
                    <b className="font-semibold text-white">{a.quien}</b> {a.que}
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-500">{haceCuanto(a.creado, ahora)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-ink-400">Todavía no hay movimientos.</p>
          )}
        </Tarjeta>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Acceso href="/inbox" icono={Inbox} titulo="Bandeja" texto="Todos los chats de WhatsApp, Instagram y Messenger." color="#3563ff" />
        <Acceso href="/conexiones" icono={Plug} titulo="Conectar canal" texto="Tu WhatsApp Business, Instagram o Messenger." color="#25D366" />
        <Acceso
          href="/pedidos?importar=1"
          icono={Upload}
          titulo="Cargar pedidos"
          texto="A mano, por CSV o por API, para que el bot los conozca."
          color="#16a34a"
        />
        <Acceso href="/automaticas" icono={FlaskConical} titulo="Probar el bot" texto="Escribí como un cliente y mirá qué contesta." color="#8b5cf6" />
      </div>
      {datos && datos.stock.productos === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-ink-500">
          <Boxes className="h-3.5 w-3.5" /> Cargá tu{" "}
          <Link href="/stock" className="font-semibold text-brand-300 hover:text-brand-200">
            lista de stock
          </Link>{" "}
          para que el bot conteste precios y disponibilidad.
        </p>
      )}

      <Confirmar
        abierto={confirmar === "vaciar"}
        onCerrar={() => setConfirmar(null)}
        titulo="¿Vaciar los datos de ejemplo?"
        texto="Se borran los chats, clientes, pedidos y productos de ejemplo. Tu configuración (bot, horario, etapas) queda."
        confirmar="Sí, vaciar"
        peligro
        onConfirmar={async () => {
          try {
            await getRepo().vaciarDatosDePrueba();
            avisar("Listo: arrancás de cero.");
            recargar();
          } catch (e) {
            avisar(e, "error");
          }
        }}
      />
      <Confirmar
        abierto={confirmar === "cargar"}
        onCerrar={() => setConfirmar(null)}
        titulo="¿Cargar los datos de ejemplo?"
        texto="Se suman chats, clientes, pedidos y productos de ejemplo para que pruebes todo."
        confirmar="Sí, cargar"
        onConfirmar={async () => {
          try {
            await getRepo().cargarDatosDePrueba();
            avisar("Datos de ejemplo cargados.");
            recargar();
          } catch (e) {
            avisar(e, "error");
          }
        }}
      />
    </div>
  );
}
