"use client";
// ============================================================
// Clientany · Bandeja — las acciones del chat. En la compu, una fila de
// botones chicos debajo del encabezado; en el celular, un botón «⋯» que
// abre una hoja con los MISMOS botones en lista. Cada acción llama
// getRepo().accion(id, {...}) y ante error avisa.
// ============================================================
import { useCallback, useState, type ReactNode } from "react";
import {
  BellOff,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Flame,
  Hand,
  LifeBuoy,
  Milestone,
  MoreHorizontal,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  StickyNote,
  Sunrise,
  Tag,
  Trash2,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { avisar, Confirmar, Desplegable, ItemMenu, Modal } from "@/components/crm/ui";
import { getRepo, type AccionConversacion } from "@/lib/crm/repo";
import type { Conversacion, Empresa, FilaBandeja, Miembro } from "@/lib/crm/types";
import { BotonChico, isoEnZona, Popover, sumarDias, ymdEnZona, ZONA_DEFAULT } from "./comun";
import { CasillasEtiquetas, TituloEtiquetas } from "./etiquetas";
import { Posponer } from "./posponer";

interface Item {
  id: string;
  etiqueta: string;
  icono: LucideIcon;
  onClick?: () => void;
  activo?: boolean;
  peligro?: boolean;
  resaltado?: boolean;
  title?: string;
  // los que abren un selector
  selector?: "asignar" | "etapa" | "etiquetas";
}

export function AccionesChat({
  conv,
  fila,
  empresa,
  miembros,
  yo,
  esAdmin,
  esCelular,
  fichaAbierta,
  onFicha,
  onNota,
  onBorrada,
}: {
  conv: Conversacion;
  fila: FilaBandeja;
  empresa: Empresa | null;
  miembros: Miembro[];
  yo: Miembro | null;
  esAdmin: boolean;
  esCelular: boolean;
  fichaAbierta: boolean;
  onFicha: () => void;
  onNota: () => void;
  onBorrada: () => void;
}) {
  const zona = empresa?.horario?.zona || ZONA_DEFAULT;
  const [hoja, setHoja] = useState(false);
  const [sub, setSub] = useState<"asignar" | "etapa" | "etiquetas" | null>(null);
  const [popEtiquetas, setPopEtiquetas] = useState(false);
  const cerrarEtiquetas = useCallback(() => setPopEtiquetas(false), []);
  const [posponer, setPosponer] = useState(false);
  const [confBaja, setConfBaja] = useState(false);
  const [confBorrar, setConfBorrar] = useState(false);

  async function accion(a: AccionConversacion, aviso?: string) {
    try {
      await getRepo().accion(conv.id, a);
      if (aviso) avisar(aviso);
    } catch (e) {
      avisar(e, "error");
    }
  }

  const resuelto = fila.grupo_calculado === "resueltos";
  const enSoporte = fila.grupo_calculado === "soporte";
  const loTengoYo = !!conv.tomado_por && !!yo && conv.tomado_por.quien === yo.id;
  const loTieneOtro = !!conv.tomado_por && !loTengoYo;
  const etapa = empresa?.etapas.find((e) => e.id === conv.etapa_id) || null;
  const asignado = miembros.find((m) => m.id === conv.asignado_a) || null;

  function manana() {
    const ymd = sumarDias(ymdEnZona(new Date(), zona), 1);
    accion({ tipo: "recordar", fecha: isoEnZona(ymd, "10:00", zona), nota: "seguimiento" }, "Vuelve mañana a las 10");
  }

  const items: Item[] = [
    ...(fila.escribio_despues
      ? [{ id: "respondido", etiqueta: "Respondido", icono: CheckCircle2, title: "Ya lo atendí: deja de contar como sin responder", onClick: () => accion({ tipo: "respondido" }, "Marcado como respondido") }]
      : []),
    resuelto
      ? { id: "reabrir", etiqueta: "Reabrir", icono: RotateCcw, title: "Vuelve a Ventas", onClick: () => accion({ tipo: "reabrir" }, "Reabierto") }
      : { id: "resolver", etiqueta: "Resolver", icono: CheckCircle2, title: "Pasa a Resueltos", onClick: () => accion({ tipo: "resolver" }, "Resuelto") },
    enSoporte
      ? { id: "ventas", etiqueta: "Volver a Ventas", icono: LifeBuoy, activo: true, title: "Sacarlo de Soporte", onClick: () => accion({ tipo: "grupo", grupo: null }, "Volvió a Ventas") }
      : { id: "soporte", etiqueta: "Soporte", icono: LifeBuoy, title: "Mover a Soporte", onClick: () => accion({ tipo: "grupo", grupo: "soporte" }, "Movido a Soporte") },
    { id: "manana", etiqueta: "Mañana", icono: Sunrise, title: "Recordar mañana a las 10", onClick: manana },
    { id: "posponer", etiqueta: "Posponer…", icono: CalendarClock, title: "Elegir cuándo vuelve", onClick: () => setPosponer(true) },
    loTengoYo
      ? { id: "soltar", etiqueta: "Lo tengo yo · soltar", icono: Hand, activo: true, title: "Soltarlo para que lo tome otro", onClick: () => accion({ tipo: "soltar" }, "Soltado") }
      : loTieneOtro
      ? { id: "tomado", etiqueta: `Lo tiene ${conv.tomado_por?.nombre}${esAdmin ? " · soltar" : ""}`, icono: Hand, resaltado: true, title: esAdmin ? "Soltarlo (sos admin)" : "Lo está atendiendo otra persona", onClick: esAdmin ? () => accion({ tipo: "soltar" }, "Soltado") : undefined }
      : { id: "tomar", etiqueta: "Lo tomo yo", icono: Hand, title: "Avisarle al equipo que lo atendés vos", onClick: () => accion({ tipo: "tomar" }, "Es tuyo") },
    { id: "asignar", etiqueta: asignado ? `Asignado: ${asignado.nombre}` : "Asignar a…", icono: UserCheck, activo: !!asignado, selector: "asignar", title: "Asignar a alguien del equipo" },
    conv.urgente
      ? { id: "urgente", etiqueta: "Marcada urgente", icono: Flame, peligro: true, title: "Quitar urgente", onClick: () => accion({ tipo: "urgente", valor: false }, "Ya no es urgente") }
      : { id: "urgente", etiqueta: "Marcar urgente", icono: Flame, title: "Resaltarla como urgente", onClick: () => accion({ tipo: "urgente", valor: true }, "Marcada urgente") },
    { id: "etapa", etiqueta: etapa ? etapa.nombre : "Etapa", icono: Milestone, activo: !!etapa, selector: "etapa", title: "Etapa del embudo" },
    { id: "etiquetas", etiqueta: conv.etiquetas.length ? `Etiquetas (${conv.etiquetas.length})` : "Etiquetas", icono: Tag, activo: conv.etiquetas.length > 0, selector: "etiquetas", title: "Etiquetas del chat" },
    { id: "nota", etiqueta: conv.nota ? "Nota interna" : "Nota interna", icono: StickyNote, resaltado: !!conv.nota, title: "Nota que sólo ve el equipo", onClick: onNota },
    { id: "ficha", etiqueta: "Ficha", icono: fichaAbierta ? PanelRightClose : PanelRightOpen, activo: fichaAbierta, title: fichaAbierta ? "Cerrar la ficha" : "Ver la ficha del cliente", onClick: onFicha },
    conv.baja
      ? { id: "baja", etiqueta: "Sacar de Baja", icono: BellOff, resaltado: true, title: "Volver a mandarle automáticos", onClick: () => setConfBaja(true) }
      : { id: "baja", etiqueta: "Baja", icono: BellOff, title: "No mandarle más automáticos", onClick: () => setConfBaja(true) },
    { id: "borrar", etiqueta: "Borrar conversación", icono: Trash2, peligro: true, title: "Borrar la conversación", onClick: () => setConfBorrar(true) },
  ];

  // ---------- selectores (compu: desplegables; celular: sub-hoja) ----------
  const opcionesAsignar = (cerrar?: () => void) => (
    <>
      <ItemMenu activo={!conv.asignado_a} onClick={() => { accion({ tipo: "asignar", miembro_id: null }, "Sin asignar"); cerrar?.(); }}>Sin asignar</ItemMenu>
      {miembros.map((m) => (
        <ItemMenu key={m.id} activo={conv.asignado_a === m.id} onClick={() => { accion({ tipo: "asignar", miembro_id: m.id }, `Asignado a ${m.nombre}`); cerrar?.(); }}>
          {m.nombre}{yo && m.id === yo.id ? " (vos)" : ""}
        </ItemMenu>
      ))}
    </>
  );
  const opcionesEtapa = (cerrar?: () => void) => (
    <>
      <ItemMenu activo={!conv.etapa_id} onClick={() => { accion({ tipo: "etapa", etapa_id: null }, "Sin etapa"); cerrar?.(); }}>Sin etapa</ItemMenu>
      {[...(empresa?.etapas || [])].sort((a, b) => a.orden - b.orden).map((e) => (
        <ItemMenu key={e.id} activo={conv.etapa_id === e.id} onClick={() => { accion({ tipo: "etapa", etapa_id: e.id }, `Etapa: ${e.nombre}`); cerrar?.(); }}>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />{e.nombre}</span>
        </ItemMenu>
      ))}
      {!empresa?.etapas.length && <div className="px-3 py-2 text-xs text-ink-500">No hay etapas. Se crean en Configuración.</div>}
    </>
  );
  const casillas = (
    <CasillasEtiquetas etiquetas={empresa?.etiquetas || []} elegidas={conv.etiquetas} onCambio={(ids) => accion({ tipo: "etiquetas", etiquetas: ids })} />
  );

  function botonDe(it: Item): ReactNode {
    const b = (
      <BotonChico icono={it.icono} activo={it.activo} peligro={it.peligro} resaltado={it.resaltado} title={it.title} onClick={it.onClick} disabled={!it.onClick && !it.selector}>
        {it.etiqueta}
        {it.selector && <ChevronDown className="h-3 w-3 opacity-70" />}
      </BotonChico>
    );
    if (it.selector === "asignar") return <Desplegable key={it.id} alineado="izquierda" boton={b}>{opcionesAsignar()}</Desplegable>;
    if (it.selector === "etapa") return <Desplegable key={it.id} alineado="izquierda" boton={b}>{opcionesEtapa()}</Desplegable>;
    if (it.selector === "etiquetas") {
      return (
        <Popover key={it.id} abierto={popEtiquetas} onCerrar={cerrarEtiquetas} ancho="min-w-[220px]" boton={<div onClick={() => setPopEtiquetas((v) => !v)}>{b}</div>}>
          <TituloEtiquetas />
          <div className="p-1.5">{casillas}</div>
        </Popover>
      );
    }
    return <span key={it.id}>{b}</span>;
  }

  return (
    <>
      {esCelular ? (
        <button
          type="button"
          onClick={() => setHoja(true)}
          className="rounded-lg p-1.5 text-ink-300 hover:bg-ink-800 hover:text-white"
          aria-label="Acciones del chat"
          title="Acciones"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-1 border-b border-ink-800 bg-ink-900/60 px-3 py-1.5">{items.map(botonDe)}</div>
      )}

      {/* hoja del celular */}
      <Modal abierto={hoja} onCerrar={() => setHoja(false)} titulo="Acciones">
        <div className="-mx-2 space-y-0.5">
          {items.map((it) => (
            <ItemMenu
              key={it.id}
              icono={it.icono}
              peligro={it.peligro}
              activo={it.activo}
              onClick={() => {
                if (it.selector) {
                  setSub(it.selector);
                  return;
                }
                setHoja(false);
                it.onClick?.();
              }}
            >
              <span className="flex items-center justify-between">
                {it.etiqueta}
                {it.selector && <ChevronDown className="h-3.5 w-3.5 text-ink-500" />}
              </span>
            </ItemMenu>
          ))}
        </div>
      </Modal>
      <Modal abierto={sub === "asignar"} onCerrar={() => setSub(null)} titulo="Asignar a…" ancho="sm">
        <div className="-mx-2">{opcionesAsignar(() => { setSub(null); setHoja(false); })}</div>
      </Modal>
      <Modal abierto={sub === "etapa"} onCerrar={() => setSub(null)} titulo="Etapa" ancho="sm">
        <div className="-mx-2">{opcionesEtapa(() => { setSub(null); setHoja(false); })}</div>
      </Modal>
      <Modal abierto={sub === "etiquetas"} onCerrar={() => setSub(null)} titulo="Etiquetas" ancho="sm" pie={<button className="btn-primary" onClick={() => { setSub(null); setHoja(false); }}>Listo</button>}>
        {casillas}
      </Modal>

      <Posponer
        abierto={posponer}
        onCerrar={() => setPosponer(false)}
        zona={zona}
        inicial={conv.recordar ? { fecha: conv.recordar.fecha, nota: conv.recordar.nota } : null}
        onGuardar={(fecha, nota) => accion({ tipo: "recordar", fecha, nota: nota || undefined }, "Pospuesto")}
      />
      <Confirmar
        abierto={confBaja}
        onCerrar={() => setConfBaja(false)}
        titulo={conv.baja ? "¿Sacarlo de Baja?" : "¿Dar de baja?"}
        texto={
          conv.baja
            ? "Vuelve a recibir los mensajes automáticos y el chat vuelve a Ventas."
            : "No le van a salir más mensajes automáticos (bienvenida, ausencia, reglas) y el chat pasa al grupo Baja. Le podés seguir escribiendo a mano."
        }
        confirmar={conv.baja ? "Sí, sacarlo" : "Sí, dar de baja"}
        onConfirmar={() => accion({ tipo: "baja", valor: !conv.baja }, conv.baja ? "Fuera de Baja" : "Dado de baja")}
      />
      <Confirmar
        abierto={confBorrar}
        onCerrar={() => setConfBorrar(false)}
        peligro
        titulo="¿Borrar la conversación?"
        texto="Se borran los mensajes de acá; en el celular del cliente quedan. No se puede deshacer."
        confirmar="Sí, borrar"
        onConfirmar={async () => {
          try {
            await getRepo().borrarConversacion(conv.id);
            avisar("Conversación borrada");
            onBorrada();
          } catch (e) {
            avisar(e, "error");
            throw e;
          }
        }}
      />
    </>
  );
}
