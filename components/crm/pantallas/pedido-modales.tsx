"use client";
// Pedidos: selector de estado (chip), formulario (nuevo / editar) y detalle.
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink, Mail, MessageCircle, Package, Pencil, Plus, RotateCcw, Trash2, Truck, X } from "lucide-react";
import type { Pedido, PedidoEnvio, PedidoEstado, PedidoItem, Producto } from "@/lib/crm/types";
import { ESTADOS_PEDIDO, dinero, emailValido, fechaHora, haceCuanto, normalizarTelefono, recortar, telefonoLindo } from "@/lib/crm/core";
import { getRepo } from "@/lib/crm/repo";
import { BotonCargando, Campo, Modal, avisar } from "@/components/crm/ui";
import { aNumero, codigoPais, fechaInput, isoDeFechaInput, monedasCon } from "./comun";

// ---------- datos chicos ----------
export const CANALES_VENTA: { id: string; nombre: string }[] = [
  { id: "tienda", nombre: "Tienda online" },
  { id: "ml", nombre: "Mercado Libre" },
  { id: "whatsapp", nombre: "WhatsApp" },
  { id: "instagram", nombre: "Instagram" },
  { id: "messenger", nombre: "Messenger" },
  { id: "local", nombre: "Local / mostrador" },
  { id: "manual", nombre: "Manual" },
  { id: "api", nombre: "API" },
  { id: "csv", nombre: "CSV" },
];

export function nombreCanalVenta(id?: string | null): string {
  if (!id) return "sin dato";
  return CANALES_VENTA.find((c) => c.id === id)?.nombre || id;
}

export function colorEstado(e: PedidoEstado): string {
  return ESTADOS_PEDIDO.find((x) => x.id === e)?.color || "#9aa3c0";
}

export function resumenItems(items: PedidoItem[] | undefined, max = 60): string {
  if (!items?.length) return "";
  return recortar(items.map((i) => `${i.cantidad}x ${i.nombre}`).join(", "), max);
}

// El próximo número a partir del último: "#1234" → "#1235", "LUN-10428" → "LUN-10429".
export function numeroSugerido(pedidos: Pedido[]): string {
  const ultimo = [...pedidos].sort((a, b) => new Date(b.creado).getTime() - new Date(a.creado).getTime())[0];
  const m = ultimo?.numero.match(/^(.*?)(\d+)(\D*)$/);
  if (!m) return "#1001";
  const n = String(Number(m[2]) + 1).padStart(m[2].length, "0");
  const candidato = `${m[1]}${n}${m[3]}`;
  return pedidos.some((p) => p.numero === candidato) ? "" : candidato;
}

// ---------- estado como chip con desplegable (select nativo: no se corta en tablas) ----------
export function SelectorEstado({ valor, onCambio, deshabilitado }: { valor: PedidoEstado; onCambio: (e: PedidoEstado) => void; deshabilitado?: boolean }) {
  const color = colorEstado(valor);
  return (
    <span className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      <select
        value={valor}
        disabled={deshabilitado}
        aria-label="Cambiar el estado del pedido"
        title="Cambiar el estado"
        onChange={(e) => onCambio(e.target.value as PedidoEstado)}
        className="cursor-pointer appearance-none rounded-full py-1 pl-2.5 pr-6 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-default"
        style={{ color, background: `${color}22`, border: `1px solid ${color}44` }}
      >
        {ESTADOS_PEDIDO.map((e) => (
          <option key={e.id} value={e.id} className="bg-ink-850 text-ink-100">
            {e.nombre}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2" style={{ color }} />
    </span>
  );
}

export async function cambiarEstadoPedido(p: Pedido, estado: PedidoEstado) {
  if (p.estado === estado) return;
  try {
    await getRepo().guardarPedido({ ...p, estado });
    avisar(`Pedido ${p.numero}: ${ESTADOS_PEDIDO.find((x) => x.id === estado)?.nombre.toLowerCase()}.`);
  } catch (e) {
    avisar(e, "error");
  }
}

// ---------- formulario ----------
interface ItemForm {
  sku: string;
  nombre: string;
  cantidad: string;
  precio: string;
}

const ITEM_VACIO: ItemForm = { sku: "", nombre: "", cantidad: "1", precio: "" };

function sumaItems(items: { cantidad: number | string; precio: number | string }[]): number {
  return items.reduce((s, i) => s + aNumero(i.cantidad) * aNumero(i.precio), 0);
}

export function PedidoFormulario({
  pedido,
  sugerido,
  moneda,
  pais,
  marcaId,
  productos,
  onCerrar,
  onGuardado,
}: {
  pedido: Pedido | null; // null = nuevo
  sugerido: string;
  moneda: string;
  pais?: string;
  marcaId?: string;
  productos: Producto[];
  onCerrar: () => void;
  onGuardado?: (p: Pedido) => void;
}) {
  const [f, setF] = useState(() => ({
    numero: pedido?.numero ?? sugerido,
    fecha: fechaInput(pedido?.creado),
    nombre: pedido?.nombre ?? "",
    telefono: pedido?.telefono ? telefonoLindo(pedido.telefono) : "",
    email: pedido?.email ?? "",
    estado: (pedido?.estado ?? "pagado") as PedidoEstado,
    moneda: pedido?.moneda || moneda,
    transporte: pedido?.envio?.transporte ?? "",
    seguimiento: pedido?.envio?.seguimiento ?? "",
    url: pedido?.envio?.url ?? "",
    direccion: pedido?.envio?.direccion ?? "",
    localidad: pedido?.envio?.localidad ?? "",
    provincia: pedido?.envio?.provincia ?? "",
    cp: pedido?.envio?.cp ?? "",
    canal: pedido?.canal || "manual",
    notas: pedido?.notas ?? "",
  }));
  const [items, setItems] = useState<ItemForm[]>(() =>
    pedido?.items?.length
      ? pedido.items.map((i) => ({ sku: i.sku || "", nombre: i.nombre, cantidad: String(i.cantidad), precio: i.precio ? String(i.precio) : "" }))
      : [{ ...ITEM_VACIO }],
  );
  // null = total automático (suma de los ítems); texto = lo escribió a mano.
  const [totalTxt, setTotalTxt] = useState<string | null>(() =>
    pedido && Math.abs(pedido.total - sumaItems(pedido.items || [])) > 0.009 ? String(pedido.total) : null,
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);

  const calculado = sumaItems(items);
  const total = totalTxt === null ? calculado : aNumero(totalTxt);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  function setItem(i: number, patch: Partial<ItemForm>) {
    setItems((lista) =>
      lista.map((it, j) => {
        if (j !== i) return it;
        const nuevo = { ...it, ...patch };
        // Si eligió un producto de su lista, completamos sku y precio.
        if (patch.nombre !== undefined) {
          const p = productos.find((x) => x.nombre.toLowerCase() === patch.nombre!.trim().toLowerCase());
          if (p) {
            if (!it.sku) nuevo.sku = p.sku;
            if (!it.precio) nuevo.precio = String(p.precio);
          }
        }
        if (patch.sku !== undefined && !it.nombre) {
          const p = productos.find((x) => x.sku.toLowerCase() === patch.sku!.trim().toLowerCase());
          if (p) {
            nuevo.nombre = p.nombre;
            if (!it.precio) nuevo.precio = String(p.precio);
          }
        }
        return nuevo;
      }),
    );
  }

  async function guardar() {
    const errs: Record<string, string> = {};
    if (!f.numero.trim()) errs.numero = "Poné el número del pedido.";
    if (!f.nombre.trim()) errs.nombre = "Poné el nombre del cliente.";
    if (f.email.trim() && !emailValido(f.email)) errs.email = "Ese mail no parece válido.";
    const tel = f.telefono.trim() ? normalizarTelefono(f.telefono, codigoPais(pais)) : "";
    if (f.telefono.trim() && tel.length < 8) errs.telefono = "Ese teléfono no parece completo.";
    if (f.url.trim() && !/^https?:\/\//i.test(f.url.trim())) errs.url = "El link tiene que empezar con https://";
    if (totalTxt !== null && totalTxt.trim() && Number.isNaN(Number(totalTxt.replace(/[.,]/g, "")))) errs.total = "Total inválido.";
    setErrores(errs);
    if (Object.keys(errs).length) return;

    const itemsOk: PedidoItem[] = items
      .filter((i) => i.nombre.trim())
      .map((i) => ({
        sku: i.sku.trim() || undefined,
        nombre: i.nombre.trim(),
        cantidad: aNumero(i.cantidad) > 0 ? aNumero(i.cantidad) : 1,
        precio: aNumero(i.precio),
      }));
    const limpio = (s: string) => s.trim() || undefined;
    const envio: PedidoEnvio = {
      transporte: limpio(f.transporte),
      seguimiento: limpio(f.seguimiento),
      url: limpio(f.url),
      direccion: limpio(f.direccion),
      localidad: limpio(f.localidad),
      provincia: limpio(f.provincia),
      cp: limpio(f.cp),
    };
    const creado = pedido && fechaInput(pedido.creado) === f.fecha ? pedido.creado : isoDeFechaInput(f.fecha);
    setCargando(true);
    try {
      const guardado = await getRepo().guardarPedido({
        ...(pedido || (marcaId ? { marca_id: marcaId } : {})),
        numero: f.numero.trim(),
        nombre: f.nombre.trim(),
        telefono: tel || undefined,
        email: f.email.trim().toLowerCase() || undefined,
        estado: f.estado,
        items: itemsOk,
        total: totalTxt === null ? calculado : aNumero(totalTxt),
        moneda: f.moneda,
        envio,
        canal: f.canal,
        notas: limpio(f.notas),
        creado,
      });
      avisar(pedido ? "Pedido guardado." : `Pedido ${guardado.numero} cargado.`);
      onGuardado?.(guardado);
      onCerrar();
    } catch (e) {
      avisar(e, "error");
    } finally {
      setCargando(false);
    }
  }

  const listaProductos = "crm-lista-productos";
  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={pedido ? `Editar pedido ${pedido.numero}` : "Nuevo pedido"}
      ancho="lg"
      pie={
        <>
          <button className="btn-ghost" onClick={onCerrar} disabled={cargando}>
            Cancelar
          </button>
          <BotonCargando cargando={cargando} onClick={guardar}>
            {pedido ? "Guardar cambios" : "Cargar pedido"}
          </BotonCargando>
        </>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          guardar();
        }}
      >
        <datalist id={listaProductos}>
          {productos.slice(0, 300).map((p) => (
            <option key={p.id} value={p.nombre} />
          ))}
        </datalist>

        <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Campo etiqueta="Número" error={errores.numero}>
            <input className="input font-mono" value={f.numero} onChange={(e) => set("numero", e.target.value)} placeholder="#1234" autoFocus={!pedido} />
          </Campo>
          <Campo etiqueta="Fecha">
            <input type="date" className="input" value={f.fecha} onChange={(e) => set("fecha", e.target.value)} />
          </Campo>
          <Campo etiqueta="Estado">
            <select className="input" value={f.estado} onChange={(e) => set("estado", e.target.value)}>
              {ESTADOS_PEDIDO.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Canal de venta">
            <select className="input" value={f.canal} onChange={(e) => set("canal", e.target.value)}>
              {CANALES_VENTA.some((c) => c.id === f.canal) ? null : <option value={f.canal}>{f.canal}</option>}
              {CANALES_VENTA.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>
        </fieldset>

        <div>
          <div className="label mb-2">Cliente</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Campo etiqueta="Nombre" error={errores.nombre}>
              <input className="input" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Sofía Pérez" />
            </Campo>
            <Campo etiqueta="Teléfono" error={errores.telefono}>
              <input className="input" inputMode="tel" value={f.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="11 5555-1234" />
            </Campo>
            <Campo etiqueta="Email" error={errores.email}>
              <input className="input" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="sofia@mail.com" />
            </Campo>
          </div>
          <p className="mt-1.5 text-[11px] text-ink-500">Con el teléfono o el mail lo atamos a su chat y a su ficha de cliente.</p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label">Productos</span>
            <button type="button" className="btn-soft px-2.5 py-1.5 text-xs" onClick={() => setItems((l) => [...l, { ...ITEM_VACIO }])}>
              <Plus className="h-3.5 w-3.5" /> Ítem
            </button>
          </div>
          <div className="space-y-2">
            <div className="hidden grid-cols-[110px_1fr_70px_110px_90px_28px] gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-ink-500 sm:grid">
              <span>SKU</span>
              <span>Producto</span>
              <span>Cant.</span>
              <span>Precio unit.</span>
              <span className="text-right">Subtotal</span>
              <span />
            </div>
            {items.map((it, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_70px_28px] gap-2 rounded-xl border border-ink-800 p-2 sm:grid-cols-[110px_1fr_70px_110px_90px_28px] sm:border-0 sm:p-0"
              >
                <input
                  className="input col-span-3 px-3 py-2 font-mono text-xs sm:col-span-1"
                  value={it.sku}
                  onChange={(e) => setItem(i, { sku: e.target.value })}
                  placeholder="SKU"
                  aria-label="SKU"
                />
                <input
                  className="input px-3 py-2"
                  list={listaProductos}
                  value={it.nombre}
                  onChange={(e) => setItem(i, { nombre: e.target.value })}
                  placeholder="Nombre del producto"
                  aria-label="Producto"
                />
                <input
                  className="input px-3 py-2 text-center"
                  inputMode="decimal"
                  value={it.cantidad}
                  onChange={(e) => setItem(i, { cantidad: e.target.value })}
                  aria-label="Cantidad"
                />
                <button
                  type="button"
                  className="row-span-2 flex items-center justify-center rounded-lg text-ink-500 hover:bg-red-500/10 hover:text-red-400 sm:order-last sm:row-span-1"
                  onClick={() => setItems((l) => (l.length > 1 ? l.filter((_, j) => j !== i) : [{ ...ITEM_VACIO }]))}
                  aria-label="Quitar ítem"
                  title="Quitar ítem"
                >
                  <X className="h-4 w-4" />
                </button>
                <input
                  className="input px-3 py-2"
                  inputMode="decimal"
                  value={it.precio}
                  onChange={(e) => setItem(i, { precio: e.target.value })}
                  placeholder="Precio"
                  aria-label="Precio unitario"
                />
                <span className="flex items-center justify-end font-mono text-xs text-ink-300">
                  {dinero(aNumero(it.cantidad) * aNumero(it.precio), f.moneda)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-end gap-3 border-t border-ink-800 pt-3">
            <Campo etiqueta="Moneda">
              <select className="input w-28 py-2" value={f.moneda} onChange={(e) => set("moneda", e.target.value)}>
                {monedasCon(f.moneda).map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Campo>
            <Campo
              etiqueta="Total"
              error={errores.total}
              ayuda={
                totalTxt === null ? (
                  "suma de los ítems"
                ) : (
                  <button type="button" className="inline-flex items-center gap-1 text-brand-300 hover:text-brand-200" onClick={() => setTotalTxt(null)}>
                    <RotateCcw className="h-3 w-3" /> recalcular ({dinero(calculado, f.moneda)})
                  </button>
                )
              }
            >
              <input
                className="input w-44 py-2 text-right font-mono font-semibold"
                inputMode="decimal"
                value={totalTxt === null ? String(Math.round(calculado * 100) / 100) : totalTxt}
                onChange={(e) => setTotalTxt(e.target.value)}
                aria-label="Total"
              />
            </Campo>
          </div>
          <div className="mt-1 text-right text-sm text-ink-300">
            Total: <b className="text-white">{dinero(total, f.moneda)}</b>
          </div>
        </div>

        <div>
          <div className="label mb-2">Envío</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Campo etiqueta="Transporte">
              <input className="input" value={f.transporte} onChange={(e) => set("transporte", e.target.value)} placeholder="Andreani, Correo, moto…" />
            </Campo>
            <Campo etiqueta="Seguimiento">
              <input
                className="input font-mono"
                value={f.seguimiento}
                onChange={(e) => set("seguimiento", e.target.value)}
                placeholder="Código de seguimiento"
              />
            </Campo>
            <Campo etiqueta="Link de seguimiento" error={errores.url}>
              <input className="input" value={f.url} onChange={(e) => set("url", e.target.value)} placeholder="https://…" />
            </Campo>
            <Campo etiqueta="Dirección">
              <input className="input" value={f.direccion} onChange={(e) => set("direccion", e.target.value)} placeholder="Calle y número" />
            </Campo>
            <Campo etiqueta="Localidad">
              <input className="input" value={f.localidad} onChange={(e) => set("localidad", e.target.value)} />
            </Campo>
            <div className="grid grid-cols-[1fr_96px] gap-3">
              <Campo etiqueta="Provincia">
                <input className="input" value={f.provincia} onChange={(e) => set("provincia", e.target.value)} />
              </Campo>
              <Campo etiqueta="CP">
                <input className="input" value={f.cp} onChange={(e) => set("cp", e.target.value)} />
              </Campo>
            </div>
          </div>
        </div>

        <Campo etiqueta="Notas" ayuda="internas: el cliente no las ve">
          <textarea className="input" rows={2} value={f.notas} onChange={(e) => set("notas", e.target.value)} />
        </Campo>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

// ---------- detalle ----------
function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-500">{etiqueta}</div>
      <div className="mt-0.5 break-words text-sm text-ink-100">{children}</div>
    </div>
  );
}

export function PedidoDetalle({
  pedido,
  convId,
  onCerrar,
  onEditar,
  onBorrar,
}: {
  pedido: Pedido;
  convId?: string | null;
  onCerrar: () => void;
  onEditar: () => void;
  onBorrar: () => void;
}) {
  const p = pedido;
  const e = p.envio || {};
  const hayEnvio = Object.values(e).some(Boolean);
  const sinDato = <span className="text-ink-500">sin dato</span>;
  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      ancho="lg"
      titulo={
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono">{p.numero}</span>
          <SelectorEstado valor={p.estado} onCambio={(est) => cambiarEstadoPedido(p, est)} />
        </span>
      }
      pie={
        <>
          <button className="btn-ghost mr-auto text-red-400 hover:bg-red-500/10" onClick={onBorrar}>
            <Trash2 className="h-4 w-4" /> Borrar
          </button>
          {convId && (
            <Link href={`/inbox?c=${encodeURIComponent(convId)}`} className="btn-ghost">
              <MessageCircle className="h-4 w-4" /> Ver chat
            </Link>
          )}
          <button className="btn-primary" onClick={onEditar}>
            <Pencil className="h-4 w-4" /> Editar
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Dato etiqueta="Fecha">{fechaHora(p.creado)}</Dato>
          <Dato etiqueta="Total">
            <span className="font-semibold text-white">{dinero(p.total, p.moneda)}</span>
          </Dato>
          <Dato etiqueta="Canal">{nombreCanalVenta(p.canal)}</Dato>
          <Dato etiqueta="Actualizado">{haceCuanto(p.actualizado) || "sin dato"}</Dato>
        </div>

        <div className="rounded-xl border border-ink-800 bg-ink-850/60 p-3.5">
          <div className="label mb-2">Cliente</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Dato etiqueta="Nombre">{p.nombre}</Dato>
            <Dato etiqueta="Teléfono">{p.telefono ? telefonoLindo(p.telefono) : sinDato}</Dato>
            <Dato etiqueta="Email">
              {p.email ? (
                <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 text-brand-300 hover:text-brand-200">
                  <Mail className="h-3.5 w-3.5" /> {p.email}
                </a>
              ) : (
                sinDato
              )}
            </Dato>
          </div>
          {!convId && (p.telefono || p.email) && <p className="mt-2 text-[11px] text-ink-500">Todavía no tiene un chat en la bandeja.</p>}
        </div>

        <div>
          <div className="label mb-2 flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" /> Productos
          </div>
          {p.items?.length ? (
            <div className="overflow-hidden rounded-xl border border-ink-800">
              <table className="w-full text-left text-sm">
                <tbody>
                  {p.items.map((it, i) => (
                    <tr key={i} className="border-b border-ink-800/60 last:border-0">
                      <td className="w-12 px-3 py-2 font-mono text-xs text-ink-400">{it.cantidad}x</td>
                      <td className="px-3 py-2 text-ink-100">
                        {it.nombre}
                        {it.sku && <span className="ml-2 font-mono text-[11px] text-ink-500">{it.sku}</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-ink-300">
                        {it.precio ? dinero(it.precio * it.cantidad, p.moneda) : <span className="text-ink-500">sin precio</span>}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-ink-850/60">
                    <td colSpan={2} className="px-3 py-2 text-right text-xs text-ink-400">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-white">{dinero(p.total, p.moneda)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-ink-500">Sin detalle de productos.</p>
          )}
        </div>

        <div>
          <div className="label mb-2 flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" /> Envío
          </div>
          {hayEnvio ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Dato etiqueta="Transporte">{e.transporte || sinDato}</Dato>
              <Dato etiqueta="Seguimiento">
                {e.seguimiento ? (
                  e.url ? (
                    <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-brand-300 hover:text-brand-200">
                      {e.seguimiento} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="font-mono">{e.seguimiento}</span>
                  )
                ) : e.url ? (
                  <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-300 hover:text-brand-200">
                    Ver seguimiento <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  sinDato
                )}
              </Dato>
              <Dato etiqueta="Destino">{[e.direccion, e.localidad, e.provincia, e.cp && `CP ${e.cp}`].filter(Boolean).join(", ") || sinDato}</Dato>
            </div>
          ) : (
            <p className="text-sm text-ink-500">Sin datos de envío.</p>
          )}
        </div>

        {p.notas && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-sm text-ink-200">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-400">Notas internas</div>
            <p className="whitespace-pre-wrap">{p.notas}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
