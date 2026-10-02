"use client";
// /pedidos — el historial de pedidos de la empresa: a mano, por CSV o por API.
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, ExternalLink, Plus, Search, ShoppingBag, Upload, X } from "lucide-react";
import type { Pedido, PedidoEstado } from "@/lib/crm/types";
import { ESTADOS_PEDIDO, colaTelefono, dinero, fechaCorta, telefonoLindo } from "@/lib/crm/core";
import { importarPedidos } from "@/lib/crm/csv";
import { getRepo } from "@/lib/crm/repo";
import { useBandeja, useEmpresa, useMarcaActiva, usePedidos, useProductos } from "@/lib/crm/hooks";
import { Confirmar, Encabezado, Tabla, Td, Th, Vacio, avisar, descargar } from "@/components/crm/ui";
import { ChipFiltro, CargandoPantalla, useAhora } from "@/components/crm/pantallas/comun";
import { ImportarCsvModal } from "@/components/crm/pantallas/importar-csv";
import {
  PedidoDetalle,
  PedidoFormulario,
  SelectorEstado,
  cambiarEstadoPedido,
  nombreCanalVenta,
  numeroSugerido,
  resumenItems,
} from "@/components/crm/pantallas/pedido-modales";

type Rango = "hoy" | "7" | "30" | "todo";
const RANGOS: { id: Rango; nombre: string }[] = [
  { id: "hoy", nombre: "Hoy" },
  { id: "7", nombre: "7 días" },
  { id: "30", nombre: "30 días" },
  { id: "todo", nombre: "Todo" },
];

const MODELO_PEDIDOS = [
  "numero,fecha,nombre,telefono,email,estado,total,transporte,seguimiento,productos,localidad,cp",
  '#1001,02/10/2026,Sofía Pérez,11 5555-1234,sofia@mail.com,pagado,45900,Andreani,360002345678,"2x Mancuerna 5 kg | 1x Colchoneta",Palermo,1425',
  "#1002,02/10/2026,Martín Gómez,351 555-9876,martin@mail.com,enviado,18500,Correo Argentino,CP123456789AR,1x Soga de saltar,Córdoba,5000",
].join("\n");

function dentroDeRango(iso: string, rango: Rango, ahora: Date): boolean {
  if (rango === "todo") return true;
  const t = new Date(iso);
  if (rango === "hoy") return t.toDateString() === ahora.toDateString();
  const dias = rango === "7" ? 7 : 30;
  return ahora.getTime() - t.getTime() <= dias * 86_400_000;
}

const PASO = 50;

export default function PedidosPage() {
  const empresa = useEmpresa();
  const marca = useMarcaActiva();
  const ahora = useAhora(60_000);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<PedidoEstado | "todos">("todos");
  const [rango, setRango] = useState<Rango>("todo");
  const [limite, setLimite] = useState(PASO);

  const todos = usePedidos();
  const conBusqueda = usePedidos(q.trim() || undefined);
  const productos = useProductos();
  const { filas: convs } = useBandeja({ grupo: "todos" });

  const [detalle, setDetalle] = useState<string | null>(null); // id
  const [form, setForm] = useState<{ pedido: Pedido | null } | null>(null);
  const [importar, setImportar] = useState(false);
  const [aBorrar, setABorrar] = useState<Pedido | null>(null);
  const [exportando, setExportando] = useState(false);

  useEffect(() => setLimite(PASO), [q, estado, rango]);

  // Enlaces directos: /pedidos?p=<id o número> abre el detalle; ?q= busca; ?importar=1 / ?nuevo=1.
  const leido = useRef(false);
  const pedidoUrl = useRef<string | null>(null);
  useEffect(() => {
    if (leido.current) return;
    leido.current = true;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("q")) setQ(sp.get("q") || "");
    if (sp.get("importar")) setImportar(true);
    if (sp.get("nuevo")) setForm({ pedido: null });
    pedidoUrl.current = sp.get("p");
  }, []);
  useEffect(() => {
    const ref = pedidoUrl.current;
    if (!ref || !todos.length) return;
    const p = todos.find((x) => x.id === ref || x.numero === ref);
    if (p) setDetalle(p.id);
    pedidoUrl.current = null;
  }, [todos]);

  const enRango = useMemo(() => conBusqueda.filter((p) => dentroDeRango(p.creado, rango, ahora)), [conBusqueda, rango, ahora]);
  const conteos = useMemo(() => {
    const r: Record<string, number> = {};
    for (const p of enRango) r[p.estado] = (r[p.estado] || 0) + 1;
    return r;
  }, [enRango]);
  const filtrados = useMemo(
    () => enRango.filter((p) => estado === "todos" || p.estado === estado).sort((a, b) => new Date(b.creado).getTime() - new Date(a.creado).getTime()),
    [enRango, estado],
  );
  const visibles = filtrados.slice(0, limite);
  const totales = useMemo(() => {
    const r: Record<string, number> = {};
    for (const p of filtrados) if (p.estado !== "cancelado") r[p.moneda || "ARS"] = (r[p.moneda || "ARS"] || 0) + (p.total || 0);
    return Object.entries(r);
  }, [filtrados]);
  const hayFiltros = !!q.trim() || estado !== "todos" || rango !== "todo";

  const pedidoDetalle = detalle ? todos.find((p) => p.id === detalle) || null : null;
  function convDe(p: Pedido): string | null {
    const cola = colaTelefono(p.telefono);
    const c =
      (p.contacto_id && convs.find((x) => x.contacto_id === p.contacto_id)) ||
      (cola.length >= 8 && convs.find((x) => colaTelefono(x.identificador) === cola)) ||
      null;
    return c ? c.id : null;
  }

  function quitarFiltros() {
    setQ("");
    setEstado("todos");
    setRango("todo");
  }

  async function exportar() {
    setExportando(true);
    try {
      const csv = await getRepo().exportarCsv("pedidos");
      descargar(`pedidos-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    } catch (e) {
      avisar(e, "error");
    } finally {
      setExportando(false);
    }
  }

  if (!empresa) return <CargandoPantalla />;
  const moneda = empresa.moneda || "ARS";

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      <Encabezado
        titulo="Pedidos"
        icono={ShoppingBag}
        sub="Tu historial de ventas: el bot y la bandeja lo usan para contestar «¿dónde está mi pedido?»."
        acciones={
          <>
            <button className="btn-ghost" onClick={() => setImportar(true)}>
              <Upload className="h-4 w-4" /> Importar CSV
            </button>
            <button className="btn-ghost" onClick={exportar} disabled={exportando || !todos.length}>
              <Download className="h-4 w-4" /> Exportar CSV
            </button>
            <button className="btn-primary" onClick={() => setForm({ pedido: null })}>
              <Plus className="h-4 w-4" /> Nuevo pedido
            </button>
          </>
        }
      />

      {/* Filtros */}
      <div className="card mb-3 space-y-3 p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por número, nombre, teléfono o mail"
              className="input pl-9"
              aria-label="Buscar pedidos"
            />
            {q && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-500 hover:text-white"
                onClick={() => setQ("")}
                aria-label="Borrar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex shrink-0 gap-1 rounded-xl border border-ink-700 bg-ink-850 p-1">
            {RANGOS.map((r) => (
              <button
                key={r.id}
                onClick={() => setRango(r.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  rango === r.id ? "bg-brand-500 text-white" : "text-ink-300 hover:text-white"
                }`}
              >
                {r.nombre}
              </button>
            ))}
          </div>
        </div>
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
          <ChipFiltro activo={estado === "todos"} onClick={() => setEstado("todos")}>
            Todos <span className="text-ink-500">{enRango.length}</span>
          </ChipFiltro>
          {ESTADOS_PEDIDO.map((e) => (
            <ChipFiltro key={e.id} activo={estado === e.id} onClick={() => setEstado(e.id)} color={e.color}>
              {e.nombre} <span className="text-ink-500">{conteos[e.id] || 0}</span>
            </ChipFiltro>
          ))}
        </div>
      </div>

      {/* Totales y filas escondidas */}
      {todos.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="chip bg-ink-800 text-ink-200">
            <b className="text-white">{filtrados.length}</b> {filtrados.length === 1 ? "pedido" : "pedidos"}
          </span>
          {totales.map(([mon, monto]) => (
            <span key={mon} className="chip bg-ink-800 text-ink-200" title="Sin contar los cancelados">
              <b className="text-white">{dinero(monto, mon)}</b>
            </span>
          ))}
          {hayFiltros && filtrados.length < todos.length && (
            <span className="text-ink-400">
              Mostrando {filtrados.length} de {todos.length} ·{" "}
              <button className="font-semibold text-brand-300 hover:text-brand-200" onClick={quitarFiltros}>
                Quitar filtros
              </button>
            </span>
          )}
        </div>
      )}

      {!todos.length ? (
        <Vacio
          icono={ShoppingBag}
          titulo="Todavía no cargaste pedidos"
          texto="Cargalos a mano, subí un CSV exportado de tu tienda o mandalos por API. Con el teléfono o el mail se atan solos al chat del cliente."
          accion={
            <div className="flex flex-wrap justify-center gap-2">
              <button className="btn-primary" onClick={() => setForm({ pedido: null })}>
                <Plus className="h-4 w-4" /> Nuevo pedido
              </button>
              <button className="btn-ghost" onClick={() => setImportar(true)}>
                <Upload className="h-4 w-4" /> Importar CSV
              </button>
            </div>
          }
        />
      ) : !filtrados.length ? (
        <Vacio
          icono={Search}
          titulo="Ningún pedido con estos filtros"
          texto={`Hay ${todos.length} pedidos cargados que no entran en la búsqueda.`}
          accion={
            <button className="btn-ghost" onClick={quitarFiltros}>
              Quitar filtros
            </button>
          }
        />
      ) : (
        <>
          {/* Compu: tabla */}
          <div className="hidden md:block">
            <Tabla>
              <thead>
                <tr>
                  <Th>Número</Th>
                  <Th>Fecha</Th>
                  <Th>Cliente</Th>
                  <Th>Productos</Th>
                  <Th className="text-right">Total</Th>
                  <Th>Estado</Th>
                  <Th>Envío</Th>
                  <Th>Canal</Th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => (
                  <tr key={p.id} className="cursor-pointer transition hover:bg-ink-800/40" onClick={() => setDetalle(p.id)}>
                    <Td className="whitespace-nowrap font-mono text-xs font-semibold text-white">{p.numero}</Td>
                    <Td className="whitespace-nowrap text-xs text-ink-300">{fechaCorta(p.creado)}</Td>
                    <Td>
                      <div className="max-w-[180px] truncate font-medium text-white">{p.nombre}</div>
                      {p.telefono && <div className="text-xs text-ink-400">{telefonoLindo(p.telefono)}</div>}
                    </Td>
                    <Td className="max-w-[220px] truncate text-xs text-ink-300">
                      {resumenItems(p.items, 48) || <span className="text-ink-500">sin detalle</span>}
                    </Td>
                    <Td className="whitespace-nowrap text-right font-mono text-xs font-semibold text-white">{dinero(p.total, p.moneda || moneda)}</Td>
                    <Td>
                      <SelectorEstado valor={p.estado} onCambio={(e) => cambiarEstadoPedido(p, e)} />
                    </Td>
                    <Td className="text-xs">
                      {p.envio?.transporte || p.envio?.seguimiento ? (
                        <>
                          <div className="text-ink-200">{p.envio?.transporte || "sin transporte"}</div>
                          {p.envio?.seguimiento &&
                            (p.envio.url ? (
                              <a
                                href={p.envio.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 font-mono text-[11px] text-brand-300 hover:text-brand-200"
                              >
                                {p.envio.seguimiento} <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <div className="font-mono text-[11px] text-ink-400">{p.envio.seguimiento}</div>
                            ))}
                        </>
                      ) : (
                        <span className="text-ink-500">sin dato</span>
                      )}
                    </Td>
                    <Td>
                      <span className="chip whitespace-nowrap bg-ink-800 text-ink-300">{nombreCanalVenta(p.canal)}</span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </div>

          {/* Celular: tarjetas */}
          <div className="space-y-2 md:hidden">
            {visibles.map((p) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => setDetalle(p.id)}
                onKeyDown={(e) => e.key === "Enter" && setDetalle(p.id)}
                className="card block w-full cursor-pointer p-3.5 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-white">{p.numero}</span>
                  <span className="text-[11px] text-ink-400">{fechaCorta(p.creado)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-white">{p.nombre}</span>
                  <span className="shrink-0 font-mono text-sm font-semibold text-white">{dinero(p.total, p.moneda || moneda)}</span>
                </div>
                {p.items?.length > 0 && <div className="mt-0.5 truncate text-xs text-ink-400">{resumenItems(p.items, 60)}</div>}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <SelectorEstado valor={p.estado} onCambio={(e) => cambiarEstadoPedido(p, e)} />
                  <span className="truncate text-[11px] text-ink-400">
                    {[p.envio?.transporte, p.envio?.seguimiento].filter(Boolean).join(" · ") || nombreCanalVenta(p.canal)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filtrados.length > visibles.length && (
            <div className="mt-3 flex flex-col items-center gap-1">
              <button className="btn-ghost" onClick={() => setLimite((l) => l + PASO)}>
                Ver más
              </button>
              <span className="text-xs text-ink-500">
                Mostrando {visibles.length} de {filtrados.length}
              </span>
            </div>
          )}
        </>
      )}

      {pedidoDetalle && (
        <PedidoDetalle
          pedido={pedidoDetalle}
          convId={convDe(pedidoDetalle)}
          onCerrar={() => setDetalle(null)}
          onEditar={() => {
            setForm({ pedido: pedidoDetalle });
            setDetalle(null);
          }}
          onBorrar={() => {
            setABorrar(pedidoDetalle);
            setDetalle(null);
          }}
        />
      )}

      {form && (
        <PedidoFormulario
          pedido={form.pedido}
          sugerido={form.pedido ? "" : numeroSugerido(todos)}
          moneda={moneda}
          pais={empresa.pais}
          marcaId={marca !== "all" ? marca : undefined}
          productos={productos}
          onCerrar={() => setForm(null)}
          onGuardado={(p) => setDetalle(p.id)}
        />
      )}

      {importar && (
        <ImportarCsvModal<Pedido>
          onCerrar={() => setImportar(false)}
          titulo="Importar pedidos desde un CSV"
          cosa="pedidos"
          ayuda="Exportá los pedidos de tu tienda (Tienda Nube, Shopify, Mercado Libre, una planilla) y subilos acá. Si un número ya existe, se actualiza."
          modeloNombre="modelo-pedidos.csv"
          modeloContenido={MODELO_PEDIDOS}
          parsear={(texto) => {
            const r = importarPedidos(texto, empresa.id, moneda);
            if (marca !== "all") r.filas = r.filas.map((p) => ({ ...p, marca_id: p.marca_id || marca }));
            return r;
          }}
          importar={(filas) => getRepo().importarPedidos(filas)}
          columnas={[
            { titulo: "Número", celda: (p) => p.numero, className: "font-mono" },
            { titulo: "Fecha", celda: (p) => fechaCorta(p.creado) },
            { titulo: "Cliente", celda: (p) => p.nombre },
            { titulo: "Teléfono", celda: (p) => (p.telefono ? telefonoLindo(p.telefono) : "—") },
            { titulo: "Estado", celda: (p) => ESTADOS_PEDIDO.find((e) => e.id === p.estado)?.nombre || p.estado },
            { titulo: "Total", celda: (p) => dinero(p.total, p.moneda), className: "text-right font-mono" },
            { titulo: "Productos", celda: (p) => resumenItems(p.items, 40) || "—" },
          ]}
        />
      )}

      <Confirmar
        abierto={!!aBorrar}
        onCerrar={() => setABorrar(null)}
        titulo="¿Borrar el pedido?"
        texto={
          aBorrar ? (
            <>
              Se borra el pedido <b className="font-mono text-white">{aBorrar.numero}</b> de {aBorrar.nombre}. El chat del cliente no se toca.
            </>
          ) : null
        }
        confirmar="Sí, borrar"
        peligro
        onConfirmar={async () => {
          if (!aBorrar) return;
          try {
            await getRepo().borrarPedido(aBorrar.id);
            avisar("Pedido borrado.");
          } catch (e) {
            avisar(e, "error");
          }
        }}
      />
    </div>
  );
}
