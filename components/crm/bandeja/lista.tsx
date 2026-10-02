"use client";
// ============================================================
// Clientany · Bandeja — la columna izquierda: buscador, pestañas de
// grupo, filtros de canal y orden, filas (FilaChat) con sus chips, menú
// contextual (clic derecho / mantener apretado) y selección múltiple.
// ============================================================
import { useCallback, useEffect, useRef, useState, type MouseEvent as RMouseEvent, type TouchEvent as RTouchEvent } from "react";
import {
  AlertTriangle,
  Bot,
  CalendarClock,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Clock,
  Flame,
  FlaskConical,
  Hand,
  Inbox,
  LifeBuoy,
  Moon,
  Package,
  Plus,
  Search,
  Square,
  Trash2,
  UserCheck,
  BellOff,
  X,
} from "lucide-react";
import { avisar, ChipColor, Confirmar, Desplegable, ItemMenu, Vacio } from "@/components/crm/ui";
import { CANALES, GRUPOS, horaCorta } from "@/lib/crm/core";
import { getRepo, type AccionConversacion } from "@/lib/crm/repo";
import { useEmpresa, useMiembros, usePedidos } from "@/lib/crm/hooks";
import type { CanalTipo, FilaBandeja, Grupo } from "@/lib/crm/types";
import { Avatar, canalMeta, Esqueleto, etiquetasDe, MenuFlotante, nombreMiembro, textoRecordatorio, ZONA_DEFAULT } from "./comun";
import { Posponer } from "./posponer";

export interface FiltrosLista {
  grupo: Grupo;
  canal: CanalTipo | "todos";
  orden: "recientes" | "antiguos";
}

export const FILTROS_DEFAULT: FiltrosLista = { grupo: "ventas", canal: "todos", orden: "recientes" };

const ICONO_GRUPO: Record<Grupo, typeof Inbox> = {
  ventas: Inbox,
  soporte: LifeBuoy,
  mas_adelante: CalendarClock,
  resueltos: CheckCircle2,
  baja: BellOff,
};

export function ListaBandeja({
  q,
  onQ,
  filtros,
  onFiltros,
  filas,
  conteos,
  cargando,
  seleccionada,
  onAbrir,
  canalesDisponibles,
  onNuevo,
  onSimular,
}: {
  q: string;
  onQ: (q: string) => void;
  filtros: FiltrosLista;
  onFiltros: (f: FiltrosLista) => void;
  filas: FilaBandeja[];
  conteos: Record<Grupo, number> & { sin_responder: number };
  cargando: boolean;
  seleccionada: string | null;
  onAbrir: (id: string) => void;
  canalesDisponibles: CanalTipo[];
  onNuevo: () => void;
  onSimular?: () => void;
}) {
  const empresa = useEmpresa();
  const miembros = useMiembros();
  const pedidos = usePedidos();
  const zona = empresa?.horario?.zona || ZONA_DEFAULT;
  const buscando = q.trim().length >= 2;

  // ----- menú contextual -----
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const cerrarMenu = useCallback(() => setMenu(null), []);
  const filaMenu = menu ? filas.find((f) => f.id === menu.id) || null : null;

  // ----- selección múltiple -----
  const [modoSel, setModoSel] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!modoSel) setSel(new Set());
  }, [modoSel]);

  // ----- modales -----
  const [posponerIds, setPosponerIds] = useState<string[] | null>(null);
  const [borrarIds, setBorrarIds] = useState<string[] | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function aplicar(ids: string[], accion: AccionConversacion, aviso?: string) {
    if (!ids.length) return;
    setOcupado(true);
    try {
      await Promise.all(ids.map((id) => getRepo().accion(id, accion)));
      if (aviso) avisar(aviso);
    } catch (e) {
      avisar(e, "error");
    } finally {
      setOcupado(false);
    }
  }

  // Mover a un grupo a mano (desde el menú o la barra de selección).
  async function moverA(ids: string[], grupo: Grupo) {
    if (grupo === "mas_adelante") {
      setPosponerIds(ids);
      return;
    }
    setOcupado(true);
    try {
      for (const id of ids) {
        const f = filas.find((x) => x.id === id);
        const repo = getRepo();
        if (grupo === "ventas") {
          if (f?.baja) await repo.accion(id, { tipo: "baja", valor: false });
          if (f?.recordar) await repo.accion(id, { tipo: "recordar", fecha: null });
          await repo.accion(id, { tipo: "grupo", grupo: null });
        } else if (grupo === "soporte") {
          if (f?.baja) await repo.accion(id, { tipo: "baja", valor: false });
          await repo.accion(id, { tipo: "grupo", grupo: "soporte" });
        } else if (grupo === "resueltos") {
          await repo.accion(id, { tipo: "resolver" });
        } else if (grupo === "baja") {
          await repo.accion(id, { tipo: "baja", valor: true });
        }
      }
      const nombre = GRUPOS.find((g) => g.id === grupo)?.nombre || grupo;
      avisar(ids.length > 1 ? `${ids.length} chats movidos a ${nombre}` : `Movido a ${nombre}`);
      if (modoSel) setModoSel(false);
    } catch (e) {
      avisar(e, "error");
    } finally {
      setOcupado(false);
    }
  }

  async function borrar(ids: string[]) {
    try {
      await Promise.all(ids.map((id) => getRepo().borrarConversacion(id)));
      avisar(ids.length > 1 ? `${ids.length} conversaciones borradas` : "Conversación borrada");
      if (modoSel) setModoSel(false);
    } catch (e) {
      avisar(e, "error");
      throw e;
    }
  }

  function alternarSel(id: string) {
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const grupoActual = GRUPOS.find((g) => g.id === filtros.grupo) || GRUPOS[0];
  const canalNombre = filtros.canal === "todos" ? "Todos los canales" : canalMeta(filtros.canal).nombre;
  const canalesMenu = CANALES.filter((c) => canalesDisponibles.includes(c.id));

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ----- buscador y botones ----- */}
      <div className="border-b border-ink-800 p-3">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              id="q"
              value={q}
              onChange={(e) => onQ(e.target.value)}
              placeholder="Buscar nombre, teléfono o texto…"
              className="input py-2 pl-9 pr-8 text-sm"
              aria-label="Buscar conversaciones"
            />
            {q && (
              <button
                onClick={() => onQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-500 hover:text-white"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setModoSel((v) => !v)}
            className={`rounded-xl border p-2 transition ${modoSel ? "border-brand-500/40 bg-brand-500/15 text-brand-200" : "border-ink-700 bg-ink-850 text-ink-400 hover:text-white"}`}
            title={modoSel ? "Salir de la selección" : "Seleccionar varios"}
            aria-label={modoSel ? "Salir de la selección" : "Seleccionar varios"}
          >
            <CheckSquare className="h-4 w-4" />
          </button>
          <button
            onClick={onNuevo}
            className="rounded-xl border border-ink-700 bg-ink-850 p-2 text-ink-400 transition hover:text-white"
            title="Escribirle a un cliente"
            aria-label="Escribirle a un cliente"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {!buscando && (
          <>
            <div className="no-scrollbar mt-2.5 flex gap-1.5 overflow-x-auto">
              {GRUPOS.map((g) => {
                const activo = filtros.grupo === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => onFiltros({ ...filtros, grupo: g.id })}
                    className={`chip shrink-0 border ${
                      activo ? "border-brand-500/40 bg-brand-500/15 text-brand-200" : "border-ink-700 bg-ink-850 text-ink-300 hover:text-white"
                    }`}
                  >
                    {g.nombre}
                    <span className={activo ? "text-brand-300/80" : "text-ink-500"}>({conteos[g.id] ?? 0})</span>
                    {g.id === "ventas" && conteos.sin_responder > 0 && (
                      <span className="rounded-full bg-red-500 px-1.5 py-px text-[10px] font-bold leading-4 text-white" title="Sin responder">
                        {conteos.sin_responder}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <Desplegable
                alineado="izquierda"
                boton={
                  <button className="chip border border-ink-700 bg-ink-850 text-ink-300 hover:text-white">
                    {canalNombre} <ChevronDown className="h-3 w-3" />
                  </button>
                }
              >
                <ItemMenu activo={filtros.canal === "todos"} onClick={() => onFiltros({ ...filtros, canal: "todos" })}>Todos los canales</ItemMenu>
                {canalesMenu.map((c) => (
                  <ItemMenu key={c.id} icono={canalMeta(c.id).icono} activo={filtros.canal === c.id} onClick={() => onFiltros({ ...filtros, canal: c.id })}>
                    {c.nombre}
                  </ItemMenu>
                ))}
              </Desplegable>
              <Desplegable
                alineado="izquierda"
                boton={
                  <button className="chip border border-ink-700 bg-ink-850 text-ink-300 hover:text-white">
                    {filtros.orden === "antiguos" ? "Más antiguos" : "Recientes"} <ChevronDown className="h-3 w-3" />
                  </button>
                }
              >
                <ItemMenu activo={filtros.orden === "recientes"} onClick={() => onFiltros({ ...filtros, orden: "recientes" })}>Recientes</ItemMenu>
                <ItemMenu activo={filtros.orden === "antiguos"} onClick={() => onFiltros({ ...filtros, orden: "antiguos" })}>Más antiguos</ItemMenu>
              </Desplegable>
              {onSimular && (
                <button
                  onClick={onSimular}
                  className="chip ml-auto border border-dashed border-ink-600 text-ink-400 hover:text-white"
                  title="Simula que un cliente escribe y mirá qué contesta el bot"
                >
                  <FlaskConical className="h-3 w-3" /> Probar como cliente
                </button>
              )}
            </div>
          </>
        )}
        {buscando && (
          <div className="mt-2 text-[11px] text-ink-500">
            Buscando en todos los grupos · {filas.length} {filas.length === 1 ? "resultado" : "resultados"}
          </div>
        )}
      </div>

      {/* ----- barra de selección múltiple ----- */}
      {modoSel && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-ink-800 bg-brand-500/5 px-3 py-2 text-xs text-ink-300">
          <span className="font-semibold text-white">{sel.size} seleccionados</span>
          <span className="text-ink-600">·</span>
          <button className="hover:text-white" onClick={() => setSel(new Set(filas.map((f) => f.id)))}>Todos</button>
          <span className="text-ink-600">·</span>
          <Desplegable
            alineado="izquierda"
            boton={<button className="inline-flex items-center gap-0.5 hover:text-white" disabled={!sel.size}>Mover a… <ChevronDown className="h-3 w-3" /></button>}
          >
            {GRUPOS.map((g) => (
              <ItemMenu key={g.id} icono={ICONO_GRUPO[g.id]} onClick={() => moverA([...sel], g.id)}>{g.nombre}</ItemMenu>
            ))}
          </Desplegable>
          <span className="text-ink-600">·</span>
          <button className="hover:text-white disabled:opacity-50" disabled={!sel.size || ocupado} onClick={() => aplicar([...sel], { tipo: "resolver" }, `${sel.size} resueltos`).then(() => setModoSel(false))}>
            Resolver
          </button>
          <span className="text-ink-600">·</span>
          <button className="hover:text-red-400 disabled:opacity-50" disabled={!sel.size || ocupado} onClick={() => setBorrarIds([...sel])}>
            Borrar
          </button>
          <button className="ml-auto font-semibold text-brand-300 hover:text-white" onClick={() => setModoSel(false)}>Listo</button>
        </div>
      )}

      {/* ----- filas ----- */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {cargando ? (
          <Esqueleto />
        ) : filas.length === 0 ? (
          <div className="p-4">
            {buscando ? (
              <Vacio icono={Search} titulo="Sin resultados" texto={`Nada que coincida con «${q.trim()}».`} />
            ) : (
              <Vacio icono={ICONO_GRUPO[grupoActual.id]} titulo={grupoActual.nombre} texto={grupoActual.vacio} />
            )}
          </div>
        ) : (
          filas.map((f) => (
            <FilaChat
              key={f.id}
              fila={f}
              activa={seleccionada === f.id}
              buscando={buscando}
              seleccionando={modoSel}
              marcada={sel.has(f.id)}
              zona={zona}
              etiquetas={etiquetasDe(empresa, f.etiquetas)}
              etapa={empresa?.etapas.find((e) => e.id === f.etapa_id) || null}
              asignado={nombreMiembro(miembros, f.asignado_a)}
              pedido={f.pedido_id ? pedidos.find((p) => p.id === f.pedido_id)?.numero || null : null}
              onClick={() => (modoSel ? alternarSel(f.id) : onAbrir(f.id))}
              onMenu={(x, y) => setMenu({ id: f.id, x, y })}
            />
          ))
        )}
      </div>

      {/* ----- menú contextual ----- */}
      {menu && filaMenu && (
        <MenuFlotante x={menu.x} y={menu.y} onCerrar={cerrarMenu}>
          <div className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-500">Mover a</div>
          {GRUPOS.map((g) => {
            const actual = filaMenu.grupo_calculado === g.id;
            return (
              <ItemMenu key={g.id} icono={ICONO_GRUPO[g.id]} activo={actual} onClick={() => !actual && moverA([filaMenu.id], g.id)}>
                <span className="flex items-center justify-between">
                  {g.nombre} {actual && <Check className="h-3.5 w-3.5 text-brand-300" />}
                </span>
              </ItemMenu>
            );
          })}
          <div className="my-1 border-t border-ink-800" />
          <ItemMenu icono={CalendarClock} onClick={() => setPosponerIds([filaMenu.id])}>Posponer…</ItemMenu>
          {filaMenu.recordar && (
            <ItemMenu icono={X} onClick={() => aplicar([filaMenu.id], { tipo: "recordar", fecha: null }, "Recordatorio quitado")}>Quitar recordatorio</ItemMenu>
          )}
          <ItemMenu icono={Flame} onClick={() => aplicar([filaMenu.id], { tipo: "urgente", valor: !filaMenu.urgente }, filaMenu.urgente ? "Ya no es urgente" : "Marcada urgente")}>
            {filaMenu.urgente ? "Quitar urgente" : "Marcar urgente"}
          </ItemMenu>
          <div className="my-1 border-t border-ink-800" />
          <ItemMenu icono={Trash2} peligro onClick={() => setBorrarIds([filaMenu.id])}>Borrar conversación</ItemMenu>
        </MenuFlotante>
      )}

      <Posponer
        abierto={!!posponerIds}
        onCerrar={() => setPosponerIds(null)}
        zona={zona}
        cuantos={posponerIds?.length || 1}
        onGuardar={async (fecha, nota) => {
          await aplicar(posponerIds || [], { tipo: "recordar", fecha, nota: nota || undefined }, "Pospuesto");
          if (modoSel) setModoSel(false);
        }}
      />
      <Confirmar
        abierto={!!borrarIds}
        onCerrar={() => setBorrarIds(null)}
        peligro
        titulo={borrarIds && borrarIds.length > 1 ? `¿Borrar ${borrarIds.length} conversaciones?` : "¿Borrar la conversación?"}
        texto="Se borran los mensajes de acá; en el celular del cliente quedan. No se puede deshacer."
        confirmar="Sí, borrar"
        onConfirmar={() => borrar(borrarIds || [])}
      />
    </div>
  );
}

// ---------- una fila ----------
function FilaChat({
  fila,
  activa,
  buscando,
  seleccionando,
  marcada,
  zona,
  etiquetas,
  etapa,
  asignado,
  pedido,
  onClick,
  onMenu,
}: {
  fila: FilaBandeja;
  activa: boolean;
  buscando: boolean;
  seleccionando: boolean;
  marcada: boolean;
  zona: string;
  etiquetas: { id: string; nombre: string; color: string }[];
  etapa: { nombre: string; color: string } | null;
  asignado: string;
  pedido: string | null;
  onClick: () => void;
  onMenu: (x: number, y: number) => void;
}) {
  const timer = useRef<number | null>(null);
  const disparado = useRef(false);

  function onTouchStart(e: RTouchEvent<HTMLDivElement>) {
    const t = e.touches[0];
    disparado.current = false;
    timer.current = window.setTimeout(() => {
      disparado.current = true;
      onMenu(t.clientX, t.clientY);
    }, 500);
  }
  function cancelarTouch(e?: RTouchEvent<HTMLDivElement>) {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    if (disparado.current && e && e.cancelable) e.preventDefault();
  }
  function onContextMenu(e: RMouseEvent<HTMLDivElement>) {
    e.preventDefault();
    onMenu(e.clientX, e.clientY);
  }

  const sinLeer = fila.no_leidos > 0;
  const grupoNombre = GRUPOS.find((g) => g.id === fila.grupo_calculado)?.nombre || "";
  const recordatorio = textoRecordatorio(fila.recordar, zona);
  const vencido = fila.recordar?.fecha ? new Date(fila.recordar.fecha).getTime() <= Date.now() : false;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (disparado.current) {
          disparado.current = false;
          return;
        }
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      onContextMenu={onContextMenu}
      onTouchStart={onTouchStart}
      onTouchEnd={cancelarTouch}
      onTouchMove={() => cancelarTouch()}
      onTouchCancel={() => cancelarTouch()}
      className={`flex w-full cursor-pointer select-none items-start gap-2.5 border-b border-ink-800/60 px-3 py-2.5 text-left transition ${
        activa ? "bg-brand-500/10" : "hover:bg-ink-800/60"
      }`}
    >
      {seleccionando && (
        <span className="mt-2.5 shrink-0 text-brand-300" aria-hidden>
          {marcada ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 text-ink-500" />}
        </span>
      )}
      <Avatar nombre={fila.nombre} canal={fila.canal} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate text-sm ${sinLeer ? "font-bold text-white" : "font-medium text-ink-100"}`}>{fila.nombre}</span>
          <span className={`shrink-0 text-[11px] ${sinLeer ? "font-semibold text-brand-300" : "text-ink-500"}`}>{horaCorta(fila.ultimo_en)}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <p className={`min-w-0 flex-1 truncate text-xs ${sinLeer ? "text-ink-200" : "text-ink-400"}`}>
            {fila.ultimo_de === "bot" && <Bot className="mr-1 inline h-3 w-3 text-brand-300" aria-label="Lo contestó el bot" />}
            {fila.ultimo_de !== "cliente" && fila.ultimo_texto ? <span className="text-ink-500">Vos: </span> : null}
            {fila.ultimo_texto || <span className="italic text-ink-600">sin mensajes</span>}
          </p>
          {sinLeer && (
            <span className="shrink-0 rounded-full bg-brand-500 px-1.5 py-px text-[10px] font-bold leading-4 text-white">{fila.no_leidos}</span>
          )}
        </div>
        {(buscando || etiquetas.length > 0 || fila.tomado_por || asignado || recordatorio || fila.necesita_humano || fila.fuera_horario || fila.urgente || etapa || pedido) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {buscando && <span className="chip bg-ink-800 px-2 py-0.5 text-[10px] text-ink-300">{grupoNombre}</span>}
            {fila.urgente && (
              <span className="chip bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400"><Flame className="h-3 w-3" /> Urgente</span>
            )}
            {fila.necesita_humano && (
              <span className="chip bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400"><AlertTriangle className="h-3 w-3" /> Necesita una persona</span>
            )}
            {fila.fuera_horario && (
              <span className="chip bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300"><Moon className="h-3 w-3" /> Fuera de horario</span>
            )}
            {etapa && <ChipColor color={etapa.color} chico>{etapa.nombre}</ChipColor>}
            {etiquetas.map((e) => (
              <ChipColor key={e.id} color={e.color} chico>{e.nombre}</ChipColor>
            ))}
            {fila.tomado_por && (
              <span className="chip bg-brand-500/15 px-2 py-0.5 text-[10px] text-brand-200"><Hand className="h-3 w-3" /> Lo tiene {fila.tomado_por.nombre}</span>
            )}
            {asignado && !fila.tomado_por && (
              <span className="chip bg-ink-800 px-2 py-0.5 text-[10px] text-ink-300"><UserCheck className="h-3 w-3" /> Asignado: {asignado}</span>
            )}
            {recordatorio && (
              <span className={`chip px-2 py-0.5 text-[10px] ${vencido ? "bg-amber-500/15 text-amber-300" : "bg-ink-800 text-ink-300"}`} title={fila.recordar?.nota || undefined}>
                <Clock className="h-3 w-3" /> {recordatorio}
              </span>
            )}
            {pedido && (
              <span className="chip bg-ink-800 px-2 py-0.5 font-mono text-[10px] text-ink-300"><Package className="h-3 w-3" /> {pedido}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
