"use client";
// ============================================================
// Clientany · Bandeja — la ficha del contacto (columna derecha del chat
// y panel de Clientes): datos editables, etiquetas, resumen de compras,
// pedidos (con detalle y «Atar al chat») y «Nuevo pedido».
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Link2, Loader2, Package, Plus, ShoppingBag, Truck, UserRound } from "lucide-react";
import { avisar, Campo, ChipColor, Modal } from "@/components/crm/ui";
import { dinero, ESTADOS_PEDIDO, fechaCorta, haceCuanto, normalizarTelefono, telefonoLindo } from "@/lib/crm/core";
import { getRepo } from "@/lib/crm/repo";
import { useEmpresa } from "@/lib/crm/hooks";
import type { Contacto, Conversacion, Pedido, PedidoEstado, PedidoItem } from "@/lib/crm/types";
import { Avatar } from "./comun";
import { CasillasEtiquetas } from "./etiquetas";

export interface FormContacto {
  nombre: string;
  telefono: string;
  email: string;
  documento: string;
  direccion: string;
  localidad: string;
  provincia: string;
  cp: string;
  notas: string;
  etiquetas: string[];
}

export const FORM_VACIO: FormContacto = {
  nombre: "", telefono: "", email: "", documento: "", direccion: "", localidad: "", provincia: "", cp: "", notas: "", etiquetas: [],
};

export function formDeContacto(c: Contacto | null): FormContacto {
  if (!c) return FORM_VACIO;
  return {
    nombre: c.nombre || "",
    telefono: c.telefono ? telefonoLindo(c.telefono) : "",
    email: c.email || "",
    documento: c.documento || "",
    direccion: c.direccion || "",
    localidad: c.localidad || "",
    provincia: c.provincia || "",
    cp: c.cp || "",
    notas: c.notas || "",
    etiquetas: c.etiquetas || [],
  };
}

// Lo que se manda a guardarContacto a partir del formulario.
export function contactoDeForm(f: FormContacto, base?: Contacto | null): Partial<Contacto> & { nombre: string } {
  return {
    ...(base ? { id: base.id } : {}),
    nombre: f.nombre.trim() || f.email.trim() || f.telefono.trim(),
    telefono: normalizarTelefono(f.telefono) || undefined,
    email: f.email.trim().toLowerCase() || undefined,
    documento: f.documento.trim() || undefined,
    direccion: f.direccion.trim() || undefined,
    localidad: f.localidad.trim() || undefined,
    provincia: f.provincia.trim() || undefined,
    cp: f.cp.trim() || undefined,
    notas: f.notas.trim() || undefined,
    etiquetas: f.etiquetas,
  };
}

// Los campos (los usan la ficha y el modal «Nuevo cliente»).
export function CamposContacto({ form, onCambio, compacto }: { form: FormContacto; onCambio: (f: FormContacto) => void; compacto?: boolean }) {
  const empresa = useEmpresa();
  const set = (k: keyof FormContacto, v: string) => onCambio({ ...form, [k]: v });
  const inp = compacto ? "input py-1.5 text-xs" : "input";
  return (
    <div className="space-y-2.5">
      <Campo etiqueta="Nombre"><input className={inp} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Nombre y apellido" /></Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo etiqueta="Teléfono"><input className={inp} value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="11 5555-1234" inputMode="tel" /></Campo>
        <Campo etiqueta="Documento"><input className={inp} value={form.documento} onChange={(e) => set("documento", e.target.value)} placeholder="DNI / CUIT" /></Campo>
      </div>
      <Campo etiqueta="Email"><input className={inp} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="nombre@mail.com" inputMode="email" /></Campo>
      <Campo etiqueta="Dirección"><input className={inp} value={form.direccion} onChange={(e) => set("direccion", e.target.value)} placeholder="Calle y número" /></Campo>
      <div className="grid grid-cols-3 gap-2">
        <Campo etiqueta="Localidad"><input className={inp} value={form.localidad} onChange={(e) => set("localidad", e.target.value)} /></Campo>
        <Campo etiqueta="Provincia"><input className={inp} value={form.provincia} onChange={(e) => set("provincia", e.target.value)} /></Campo>
        <Campo etiqueta="CP"><input className={inp} value={form.cp} onChange={(e) => set("cp", e.target.value)} inputMode="numeric" /></Campo>
      </div>
      <Campo etiqueta="Notas" ayuda="sólo las ve el equipo">
        <textarea className={`${inp} min-h-[64px]`} value={form.notas} onChange={(e) => set("notas", e.target.value)} maxLength={1000} />
      </Campo>
      <div>
        <div className="label mb-1.5">Etiquetas</div>
        <CasillasEtiquetas compacto etiquetas={empresa?.etiquetas || []} elegidas={form.etiquetas} onCambio={(ids) => onCambio({ ...form, etiquetas: ids })} />
      </div>
    </div>
  );
}

export function FichaContacto({
  contacto,
  pedidos,
  conv,
  titulo = "Ficha",
  compacta = true,
}: {
  contacto: Contacto | null;
  pedidos: Pedido[];
  conv?: Conversacion | null;
  titulo?: string;
  compacta?: boolean;
}) {
  const empresa = useEmpresa();
  const [form, setForm] = useState<FormContacto>(formDeContacto(contacto));
  const [guardando, setGuardando] = useState(false);
  const [pedidoAbierto, setPedidoAbierto] = useState<Pedido | null>(null);
  const [nuevoPedido, setNuevoPedido] = useState(false);
  const idContacto = contacto?.id;
  const actualizado = contacto?.actualizado;

  // Se vuelve a cargar el formulario cuando cambia el contacto (o lo guardó otro).
  useEffect(() => {
    setForm(formDeContacto(contacto));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idContacto, actualizado]);

  const sucio = useMemo(() => JSON.stringify(form) !== JSON.stringify(formDeContacto(contacto)), [form, contacto]);
  const moneda = empresa?.moneda || "ARS";

  const resumen = useMemo(() => {
    const validos = pedidos.filter((p) => p.estado !== "cancelado" && p.estado !== "devuelto");
    return {
      compras: validos.length,
      gastado: validos.reduce((s, p) => s + (p.total || 0), 0),
      ultima: pedidos[0]?.creado || null,
    };
  }, [pedidos]);

  async function guardar() {
    if (!contacto) return;
    setGuardando(true);
    try {
      await getRepo().guardarContacto(contactoDeForm(form, contacto));
      avisar("Ficha guardada");
    } catch (e) {
      avisar(e, "error");
    } finally {
      setGuardando(false);
    }
  }

  if (!contacto) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <UserRound className="h-8 w-8 text-ink-600" />
        <div className="mt-2 text-sm font-semibold text-ink-300">Sin ficha todavía</div>
        <p className="mt-1 text-xs text-ink-500">Cuando el cliente escriba o lo cargues en Clientes, la ficha aparece acá.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2.5 border-b border-ink-800 px-3 py-2.5">
        <Avatar nombre={contacto.nombre} tam="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-white">{contacto.nombre}</div>
          <div className="truncate text-[11px] text-ink-500">
            {titulo} · origen {contacto.origen}
            {contacto.ig_usuario ? ` · @${contacto.ig_usuario}` : ""}
          </div>
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
        {/* resumen de compras */}
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-850 px-3 py-2 text-xs">
          <ShoppingBag className={`h-4 w-4 shrink-0 ${resumen.compras ? "text-green-400" : "text-ink-500"}`} />
          <span className="min-w-0 flex-1 text-ink-300">
            {resumen.compras ? (
              <>
                <b className="text-white">{resumen.compras}</b> {resumen.compras === 1 ? "compra" : "compras"} · <b className="text-green-400">{dinero(resumen.gastado, moneda)}</b> gastado
                {resumen.ultima ? ` · última ${haceCuanto(resumen.ultima)}` : ""}
              </>
            ) : (
              "Sin compras registradas"
            )}
          </span>
        </div>

        <CamposContacto form={form} onCambio={setForm} compacto={compacta} />
        <div className="mt-2.5 flex items-center justify-end gap-2">
          {sucio && <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setForm(formDeContacto(contacto))} disabled={guardando}>Descartar</button>}
          <button className="btn-primary px-3 py-1.5 text-xs" onClick={guardar} disabled={!sucio || guardando}>
            {guardando && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Guardar ficha
          </button>
        </div>

        {/* pedidos */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white"><Package className="h-3.5 w-3.5 text-brand-300" /> Pedidos</div>
            <button className="flex items-center gap-1 text-[11px] font-semibold text-brand-300 hover:text-white" onClick={() => setNuevoPedido(true)}>
              <Plus className="h-3 w-3" /> Nuevo pedido
            </button>
          </div>
          {pedidos.length === 0 && <div className="rounded-xl border border-dashed border-ink-700 px-3 py-3 text-center text-xs text-ink-500">Sin pedidos todavía.</div>}
          <div className="space-y-1.5">
            {pedidos.map((p) => {
              const est = ESTADOS_PEDIDO.find((e) => e.id === p.estado);
              const atado = conv?.pedido_id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPedidoAbierto(p)}
                  className={`block w-full rounded-xl border px-3 py-2 text-left transition hover:border-ink-600 ${atado ? "border-brand-500/40 bg-brand-500/5" : "border-ink-700 bg-ink-850"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-ink-100">{p.numero}</span>
                    <span className="text-xs font-bold text-white">{dinero(p.total, p.moneda || moneda)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-ink-500">{fechaCorta(p.creado)}{atado ? " · atado al chat" : ""}</span>
                    {est && <ChipColor color={est.color} chico>{est.nombre}</ChipColor>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <PedidoModal pedido={pedidoAbierto} onCerrar={() => setPedidoAbierto(null)} conv={conv || null} />
      <NuevoPedidoModal abierto={nuevoPedido} onCerrar={() => setNuevoPedido(false)} contacto={contacto} moneda={moneda} />
    </div>
  );
}

// ---------- detalle de un pedido ----------
export function PedidoModal({ pedido, onCerrar, conv }: { pedido: Pedido | null; onCerrar: () => void; conv: Conversacion | null }) {
  const [atando, setAtando] = useState(false);
  if (!pedido) return null;
  const est = ESTADOS_PEDIDO.find((e) => e.id === pedido.estado);
  const atado = conv?.pedido_id === pedido.id;
  async function atar() {
    if (!conv) return;
    setAtando(true);
    try {
      await getRepo().accion(conv.id, { tipo: "pedido", pedido_id: atado ? null : pedido!.id });
      avisar(atado ? "Pedido desatado del chat" : `Pedido ${pedido!.numero} atado al chat`);
      onCerrar();
    } catch (e) {
      avisar(e, "error");
    } finally {
      setAtando(false);
    }
  }
  return (
    <Modal
      abierto={!!pedido}
      onCerrar={onCerrar}
      titulo={<span className="flex items-center gap-2">Pedido <span className="font-mono">{pedido.numero}</span> {est && <ChipColor color={est.color} chico>{est.nombre}</ChipColor>}</span>}
      pie={
        conv ? (
          <button className={atado ? "btn-ghost" : "btn-primary"} onClick={atar} disabled={atando}>
            {atando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} {atado ? "Desatar del chat" : "Atar este pedido al chat"}
          </button>
        ) : undefined
      }
    >
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-400">
          <span>{fechaCorta(pedido.creado)}{pedido.canal ? ` · ${pedido.canal}` : ""}</span>
          <span className="text-lg font-extrabold text-white">{dinero(pedido.total, pedido.moneda)}</span>
        </div>
        <div>
          <div className="label mb-1.5">Items</div>
          {pedido.items.length === 0 && <div className="text-xs text-ink-500">Sin detalle de items.</div>}
          <div className="divide-y divide-ink-800 rounded-xl border border-ink-700 bg-ink-850">
            {pedido.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                <span className="text-ink-200"><span className="font-mono text-ink-400">{it.cantidad}×</span> {it.nombre}{it.sku ? <span className="ml-1 font-mono text-[10px] text-ink-500">{it.sku}</span> : null}</span>
                {it.precio > 0 && <span className="text-ink-300">{dinero(it.precio * it.cantidad, pedido.moneda)}</span>}
              </div>
            ))}
          </div>
        </div>
        {pedido.envio && (pedido.envio.transporte || pedido.envio.seguimiento || pedido.envio.direccion) && (
          <div>
            <div className="label mb-1.5">Envío</div>
            <div className="space-y-1 rounded-xl border border-ink-700 bg-ink-850 px-3 py-2 text-xs text-ink-300">
              {pedido.envio.transporte && <div className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-ink-500" /> {pedido.envio.transporte}</div>}
              {pedido.envio.seguimiento && (
                <div>
                  Seguimiento: <span className="font-mono text-ink-100">{pedido.envio.seguimiento}</span>
                  {pedido.envio.url && (
                    <a href={pedido.envio.url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 font-semibold text-brand-300 hover:text-white">
                      seguir <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
              {pedido.envio.direccion && (
                <div>{[pedido.envio.direccion, pedido.envio.localidad, pedido.envio.provincia, pedido.envio.cp].filter(Boolean).join(", ")}</div>
              )}
            </div>
          </div>
        )}
        {pedido.notas && (
          <div>
            <div className="label mb-1.5">Notas</div>
            <div className="whitespace-pre-wrap rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-100">{pedido.notas}</div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------- nuevo pedido a mano ----------
function parsearItems(texto: string): PedidoItem[] {
  return texto
    .split(/\n|;/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^(\d+)\s*[x×]\s*(.+)$/i);
      if (m) return { nombre: m[2].trim(), cantidad: Number(m[1]) || 1, precio: 0 };
      return { nombre: s, cantidad: 1, precio: 0 };
    });
}

export function NuevoPedidoModal({ abierto, onCerrar, contacto, moneda }: { abierto: boolean; onCerrar: () => void; contacto: Contacto; moneda: string }) {
  const [numero, setNumero] = useState("");
  const [estado, setEstado] = useState<PedidoEstado>("pagado");
  const [items, setItems] = useState("");
  const [total, setTotal] = useState("");
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    if (abierto) {
      setNumero("");
      setEstado("pagado");
      setItems("");
      setTotal("");
    }
  }, [abierto]);
  async function guardar() {
    if (!numero.trim()) return;
    setGuardando(true);
    try {
      await getRepo().guardarPedido({
        numero: numero.trim(),
        nombre: contacto.nombre,
        telefono: contacto.telefono,
        email: contacto.email,
        contacto_id: contacto.id,
        estado,
        items: parsearItems(items),
        total: Number(total.replace(/[^\d.,-]/g, "").replace(",", ".")) || 0,
        moneda,
        canal: "manual",
      });
      avisar(`Pedido ${numero.trim()} cargado`);
      onCerrar();
    } catch (e) {
      avisar(e, "error");
    } finally {
      setGuardando(false);
    }
  }
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={`Nuevo pedido de ${contacto.nombre}`}
      ancho="sm"
      pie={
        <>
          <button className="btn-ghost" onClick={onCerrar} disabled={guardando}>Cancelar</button>
          <button className="btn-primary" onClick={guardar} disabled={guardando || !numero.trim()}>
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Número"><input className="input font-mono" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="#1234" autoFocus /></Campo>
          <Campo etiqueta="Estado">
            <select className="input" value={estado} onChange={(e) => setEstado(e.target.value as PedidoEstado)}>
              {ESTADOS_PEDIDO.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </Campo>
        </div>
        <Campo etiqueta="Items" ayuda="uno por renglón: «2x Nombre»">
          <textarea className="input min-h-[80px] font-mono text-xs" value={items} onChange={(e) => setItems(e.target.value)} placeholder={"2x Remera negra M\n1x Gorra"} />
        </Campo>
        <Campo etiqueta={`Total (${moneda})`}><input className="input" value={total} onChange={(e) => setTotal(e.target.value)} inputMode="decimal" placeholder="0" /></Campo>
      </div>
    </Modal>
  );
}
