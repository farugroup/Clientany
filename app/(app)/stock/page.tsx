"use client";
// /stock — la lista de productos con precio y stock que usa el bot.
import { useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Download, Minus, Pencil, Plus, Search, SlidersHorizontal, Trash2, Upload, X } from "lucide-react";
import type { Producto } from "@/lib/crm/types";
import { dinero } from "@/lib/crm/core";
import { importarProductos } from "@/lib/crm/csv";
import { getRepo } from "@/lib/crm/repo";
import { useEmpresa, useMarcaActiva, useProductos } from "@/lib/crm/hooks";
import { Confirmar, Encabezado, Tabla, Td, Th, Vacio, avisar, descargar } from "@/components/crm/ui";
import { CargandoPantalla, ChipFiltro, InterruptorChico } from "@/components/crm/pantallas/comun";
import { ImportarCsvModal } from "@/components/crm/pantallas/importar-csv";
import { AjustarStockModal, Miniatura, ProductoFormulario, estadoStock } from "@/components/crm/pantallas/producto-modales";

type Especial = "todos" | "sin" | "bajo";

const MODELO_PRODUCTOS = [
  "sku,nombre,precio,stock,minimo,categoria,descripcion,imagen,activo",
  "MAN-5KG,Mancuerna hexagonal 5 kg,18900,24,5,Pesas,Goma y acero,https://tutienda.com/img/man5.jpg,si",
  "COL-10MM,Colchoneta 10 mm,12500,0,3,Accesorios,Antideslizante 180x60,,si",
].join("\n");

const PASO = 100;

function colorStock(p: Producto): string {
  const e = estadoStock(p);
  return e === "sin" ? "text-red-400" : e === "bajo" ? "text-amber-400" : "text-white";
}

export default function StockPage() {
  const empresa = useEmpresa();
  const marca = useMarcaActiva();
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");
  const [especial, setEspecial] = useState<Especial>("todos");
  const [limite, setLimite] = useState(PASO);
  const todos = useProductos();
  const conBusqueda = useProductos(q.trim() || undefined);

  const [form, setForm] = useState<{ producto: Producto | null } | null>(null);
  const [ajustar, setAjustar] = useState<Producto | null>(null);
  const [aBorrar, setABorrar] = useState<Producto | null>(null);
  const [importar, setImportar] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null); // id con un ajuste rápido en curso

  useEffect(() => setLimite(PASO), [q, categoria, especial]);

  const leido = useRef(false);
  useEffect(() => {
    if (leido.current) return;
    leido.current = true;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("importar")) setImportar(true);
    if (sp.get("nuevo")) setForm({ producto: null });
    if (sp.get("q")) setQ(sp.get("q") || "");
  }, []);

  const categorias = useMemo(
    () => Array.from(new Set(todos.map((p) => p.categoria).filter((c): c is string => !!c))).sort((a, b) => a.localeCompare(b)),
    [todos],
  );
  const conteos = useMemo(() => {
    let sin = 0;
    let bajo = 0;
    for (const p of todos) {
      const e = estadoStock(p);
      if (e === "sin") sin++;
      else if (e === "bajo") bajo++;
    }
    return { sin, bajo };
  }, [todos]);
  const filtrados = useMemo(
    () =>
      conBusqueda
        .filter((p) => !categoria || p.categoria === categoria)
        .filter((p) => especial === "todos" || estadoStock(p) === especial)
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [conBusqueda, categoria, especial],
  );
  const visibles = filtrados.slice(0, limite);
  const hayFiltros = !!q.trim() || !!categoria || especial !== "todos";

  function quitarFiltros() {
    setQ("");
    setCategoria("");
    setEspecial("todos");
  }

  async function ajusteRapido(p: Producto, delta: number) {
    setOcupado(p.id);
    try {
      await getRepo().ajustarStock(p.id, delta, "Ajuste rápido");
    } catch (e) {
      avisar(e, "error");
    } finally {
      setOcupado(null);
    }
  }

  async function cambiarActivo(p: Producto, activo: boolean) {
    try {
      await getRepo().guardarProducto({ ...p, activo });
      avisar(activo ? `«${p.nombre}» activo: el bot lo ofrece.` : `«${p.nombre}» pausado: el bot no lo ofrece.`);
    } catch (e) {
      avisar(e, "error");
    }
  }

  async function exportar() {
    setExportando(true);
    try {
      const csv = await getRepo().exportarCsv("productos");
      descargar(`stock-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    } catch (e) {
      avisar(e, "error");
    } finally {
      setExportando(false);
    }
  }

  if (!empresa) return <CargandoPantalla />;
  const moneda = empresa.moneda || "ARS";

  const acciones = (p: Producto) => (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        className="btn-ghost h-8 w-8 p-0"
        onClick={() => ajusteRapido(p, -1)}
        disabled={ocupado === p.id || p.stock <= 0}
        aria-label={`Restar 1 a ${p.nombre}`}
        title="Restar 1"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button
        className="btn-ghost h-8 w-8 p-0"
        onClick={() => ajusteRapido(p, 1)}
        disabled={ocupado === p.id}
        aria-label={`Sumar 1 a ${p.nombre}`}
        title="Sumar 1"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button className="btn-ghost h-8 px-2.5 text-xs" onClick={() => setAjustar(p)} title="Sumar o restar con motivo">
        <SlidersHorizontal className="h-3.5 w-3.5" /> Ajustar…
      </button>
      <button
        className="rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-white"
        onClick={() => setForm({ producto: p })}
        aria-label="Editar"
        title="Editar"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button className="rounded-lg p-2 text-ink-500 hover:bg-red-500/10 hover:text-red-400" onClick={() => setABorrar(p)} aria-label="Borrar" title="Borrar">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      <Encabezado
        titulo="Stock"
        icono={Boxes}
        sub="El bot usa esta lista para responder stock y precios: mantenela al día (a mano, por CSV o por API)."
        acciones={
          <>
            <button className="btn-ghost" onClick={() => setImportar(true)}>
              <Upload className="h-4 w-4" /> Importar CSV
            </button>
            <button className="btn-ghost" onClick={exportar} disabled={exportando || !todos.length}>
              <Download className="h-4 w-4" /> Exportar CSV
            </button>
            <button className="btn-primary" onClick={() => setForm({ producto: null })}>
              <Plus className="h-4 w-4" /> Nuevo producto
            </button>
          </>
        }
      />

      <div className="card mb-3 flex flex-col gap-2 p-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o SKU" className="input pl-9" aria-label="Buscar productos" />
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
        {categorias.length > 0 && (
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="input md:w-52" aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-1.5">
          <ChipFiltro activo={especial === "sin"} onClick={() => setEspecial(especial === "sin" ? "todos" : "sin")} color="#ef4444">
            Sin stock ({conteos.sin})
          </ChipFiltro>
          <ChipFiltro activo={especial === "bajo"} onClick={() => setEspecial(especial === "bajo" ? "todos" : "bajo")} color="#f59e0b">
            Bajo mínimo ({conteos.bajo})
          </ChipFiltro>
        </div>
      </div>

      {hayFiltros && todos.length > 0 && filtrados.length < todos.length && (
        <div className="mb-3 text-xs text-ink-400">
          Mostrando {filtrados.length} de {todos.length} ·{" "}
          <button className="font-semibold text-brand-300 hover:text-brand-200" onClick={quitarFiltros}>
            Quitar filtros
          </button>
        </div>
      )}

      {!todos.length ? (
        <Vacio
          icono={Boxes}
          titulo="Tu lista de stock está vacía"
          texto="Cargá tus productos con precio y stock: el bot contesta «¿tienen…?» y «¿cuánto sale…?» con esta lista."
          accion={
            <div className="flex flex-wrap justify-center gap-2">
              <button className="btn-primary" onClick={() => setForm({ producto: null })}>
                <Plus className="h-4 w-4" /> Nuevo producto
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
          titulo="Ningún producto con estos filtros"
          texto={`Hay ${todos.length} productos cargados que no entran en la búsqueda.`}
          accion={
            <button className="btn-ghost" onClick={quitarFiltros}>
              Quitar filtros
            </button>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Tabla>
              <thead>
                <tr>
                  <Th>SKU</Th>
                  <Th>Producto</Th>
                  <Th className="text-right">Precio</Th>
                  <Th className="text-right">Stock</Th>
                  <Th className="text-right">Mínimo</Th>
                  <Th>Activo</Th>
                  <Th className="text-right">Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => (
                  <tr key={p.id} className={`transition hover:bg-ink-800/40 ${p.activo ? "" : "opacity-60"}`}>
                    <Td className="whitespace-nowrap font-mono text-xs text-ink-300">{p.sku}</Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Miniatura url={p.imagen_url} tam={32} />
                        <div className="min-w-0">
                          <div className="max-w-[260px] truncate font-medium text-white">{p.nombre}</div>
                          {p.categoria && <div className="text-[11px] text-ink-500">{p.categoria}</div>}
                        </div>
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap text-right font-mono text-xs">{dinero(p.precio, p.moneda || moneda)}</Td>
                    <Td className={`text-right font-mono text-lg font-bold ${colorStock(p)}`}>{p.stock}</Td>
                    <Td className="text-right font-mono text-xs text-ink-400">{typeof p.stock_minimo === "number" ? p.stock_minimo : "—"}</Td>
                    <Td>
                      <InterruptorChico
                        valor={p.activo}
                        onCambio={(v) => cambiarActivo(p, v)}
                        etiqueta={p.activo ? "Activo: el bot lo ofrece" : "Pausado: el bot no lo ofrece"}
                      />
                    </Td>
                    <Td>{acciones(p)}</Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </div>

          <div className="space-y-2 md:hidden">
            {visibles.map((p) => (
              <div key={p.id} className={`card p-3.5 ${p.activo ? "" : "opacity-60"}`}>
                <div className="flex items-start gap-3">
                  <Miniatura url={p.imagen_url} tam={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{p.nombre}</div>
                    <div className="font-mono text-[11px] text-ink-500">
                      {p.sku}
                      {p.categoria ? ` · ${p.categoria}` : ""}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-ink-300">{dinero(p.precio, p.moneda || moneda)}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono text-2xl font-bold leading-none ${colorStock(p)}`}>{p.stock}</div>
                    {typeof p.stock_minimo === "number" && <div className="mt-1 text-[10px] text-ink-500">mín. {p.stock_minimo}</div>}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink-800 pt-3">
                  <InterruptorChico valor={p.activo} onCambio={(v) => cambiarActivo(p, v)} etiqueta={p.activo ? "Activo" : "Pausado"} />
                  {acciones(p)}
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

      {form && (
        <ProductoFormulario
          producto={form.producto}
          productos={todos}
          categorias={categorias}
          moneda={moneda}
          marcaId={marca !== "all" ? marca : undefined}
          onCerrar={() => setForm(null)}
        />
      )}
      {ajustar && <AjustarStockModal producto={ajustar} onCerrar={() => setAjustar(null)} />}

      {importar && (
        <ImportarCsvModal<Producto>
          onCerrar={() => setImportar(false)}
          titulo="Importar stock desde un CSV"
          cosa="productos"
          ayuda="Subí la planilla de tu stock. Si un SKU ya existe, se actualizan su precio y su stock; si no tiene SKU, lo armamos del nombre."
          modeloNombre="modelo-stock.csv"
          modeloContenido={MODELO_PRODUCTOS}
          parsear={(texto) => {
            const r = importarProductos(texto, empresa.id, moneda);
            if (marca !== "all") r.filas = r.filas.map((p) => ({ ...p, marca_id: p.marca_id || marca }));
            return r;
          }}
          importar={(filas) => getRepo().importarProductos(filas)}
          columnas={[
            { titulo: "SKU", celda: (p) => p.sku, className: "font-mono" },
            { titulo: "Nombre", celda: (p) => p.nombre },
            { titulo: "Precio", celda: (p) => dinero(p.precio, p.moneda), className: "text-right font-mono" },
            { titulo: "Stock", celda: (p) => p.stock, className: "text-right font-mono" },
            { titulo: "Mínimo", celda: (p) => (typeof p.stock_minimo === "number" ? p.stock_minimo : "—"), className: "text-right font-mono" },
            { titulo: "Categoría", celda: (p) => p.categoria || "—" },
            { titulo: "Activo", celda: (p) => (p.activo ? "Sí" : "No") },
          ]}
        />
      )}

      <Confirmar
        abierto={!!aBorrar}
        onCerrar={() => setABorrar(null)}
        titulo="¿Borrar el producto?"
        texto={
          aBorrar ? (
            <>
              Se borra <b className="text-white">{aBorrar.nombre}</b> ({aBorrar.sku}) de tu lista. El bot deja de ofrecerlo. Si sólo querés pausarlo, apagá
              «Activo».
            </>
          ) : null
        }
        confirmar="Sí, borrar"
        peligro
        onConfirmar={async () => {
          if (!aBorrar) return;
          try {
            await getRepo().borrarProducto(aBorrar.id);
            avisar("Producto borrado.");
          } catch (e) {
            avisar(e, "error");
          }
        }}
      />
    </div>
  );
}
