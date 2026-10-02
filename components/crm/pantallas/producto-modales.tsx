"use client";
// Stock: formulario de producto y ajuste de stock con motivo.
import { useState } from "react";
import { ImageOff, Minus, Plus } from "lucide-react";
import type { Producto } from "@/lib/crm/types";
import { normalizarTexto } from "@/lib/crm/core";
import { getRepo } from "@/lib/crm/repo";
import { BotonCargando, Campo, Interruptor, Modal, avisar } from "@/components/crm/ui";
import { aNumero } from "./comun";

export function estadoStock(p: Pick<Producto, "stock" | "stock_minimo">): "sin" | "bajo" | "ok" {
  if ((p.stock ?? 0) <= 0) return "sin";
  if (typeof p.stock_minimo === "number" && p.stock_minimo > 0 && p.stock <= p.stock_minimo) return "bajo";
  return "ok";
}

export function skuDesdeNombre(nombre: string): string {
  return normalizarTexto(nombre).replace(/\s+/g, "-").slice(0, 40).toUpperCase();
}

export function Miniatura({ url, tam = 36 }: { url?: string; tam?: number }) {
  const [fallo, setFallo] = useState(false);
  if (!url || fallo) {
    return (
      <span className="flex shrink-0 items-center justify-center rounded-lg bg-ink-800" style={{ width: tam, height: tam }}>
        <ImageOff className="h-4 w-4 text-ink-500" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      onError={() => setFallo(true)}
      className="shrink-0 rounded-lg border border-ink-700 object-cover"
      style={{ width: tam, height: tam }}
    />
  );
}

export function ProductoFormulario({
  producto,
  productos,
  categorias,
  moneda,
  marcaId,
  onCerrar,
}: {
  producto: Producto | null; // null = nuevo
  productos: Producto[];
  categorias: string[];
  moneda: string;
  marcaId?: string;
  onCerrar: () => void;
}) {
  const [f, setF] = useState(() => ({
    sku: producto?.sku ?? "",
    nombre: producto?.nombre ?? "",
    precio: producto ? String(producto.precio ?? "") : "",
    stock: producto ? String(producto.stock ?? 0) : "",
    minimo: producto?.stock_minimo !== undefined && producto?.stock_minimo !== null ? String(producto.stock_minimo) : "",
    categoria: producto?.categoria ?? "",
    descripcion: producto?.descripcion ?? "",
    imagen: producto?.imagen_url ?? "",
    activo: producto?.activo ?? true,
  }));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  async function guardar() {
    const errs: Record<string, string> = {};
    const nombre = f.nombre.trim();
    const sku = f.sku.trim() || skuDesdeNombre(nombre);
    if (!nombre) errs.nombre = "Poné el nombre del producto.";
    if (sku && productos.some((p) => p.sku.toLowerCase() === sku.toLowerCase() && p.id !== producto?.id)) {
      errs.sku = "Ya hay otro producto con ese SKU.";
    }
    if (f.precio.trim() && aNumero(f.precio) < 0) errs.precio = "El precio no puede ser negativo.";
    if (f.imagen.trim() && !/^https?:\/\//i.test(f.imagen.trim())) errs.imagen = "La URL tiene que empezar con https://";
    setErrores(errs);
    if (Object.keys(errs).length) return;
    setCargando(true);
    try {
      await getRepo().guardarProducto({
        ...(producto || (marcaId ? { marca_id: marcaId } : {})),
        sku,
        nombre,
        precio: aNumero(f.precio),
        moneda: producto?.moneda || moneda,
        stock: Math.round(aNumero(f.stock)),
        stock_minimo: f.minimo.trim() ? Math.round(aNumero(f.minimo)) : undefined,
        categoria: f.categoria.trim() || undefined,
        descripcion: f.descripcion.trim() || undefined,
        imagen_url: f.imagen.trim() || undefined,
        activo: f.activo,
      });
      avisar(producto ? "Producto guardado." : `«${nombre}» cargado.`);
      onCerrar();
    } catch (e) {
      avisar(e, "error");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={producto ? "Editar producto" : "Nuevo producto"}
      ancho="lg"
      pie={
        <>
          <button className="btn-ghost" onClick={onCerrar} disabled={cargando}>
            Cancelar
          </button>
          <BotonCargando cargando={cargando} onClick={guardar}>
            {producto ? "Guardar cambios" : "Cargar producto"}
          </BotonCargando>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          guardar();
        }}
      >
        <datalist id="crm-categorias">
          {categorias.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr]">
          <Campo etiqueta="SKU" ayuda={!f.sku.trim() && f.nombre.trim() ? "se arma del nombre" : undefined} error={errores.sku}>
            <input
              className="input font-mono"
              value={f.sku}
              onChange={(e) => set("sku", e.target.value)}
              placeholder={f.nombre.trim() ? skuDesdeNombre(f.nombre) : "MAN-5KG"}
            />
          </Campo>
          <Campo etiqueta="Nombre" error={errores.nombre}>
            <input
              className="input"
              value={f.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Mancuerna hexagonal 5 kg"
              autoFocus={!producto}
            />
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Campo etiqueta={`Precio (${producto?.moneda || moneda})`} error={errores.precio}>
            <input className="input font-mono" inputMode="decimal" value={f.precio} onChange={(e) => set("precio", e.target.value)} placeholder="0" />
          </Campo>
          <Campo etiqueta="Stock">
            <input className="input font-mono" inputMode="numeric" value={f.stock} onChange={(e) => set("stock", e.target.value)} placeholder="0" />
          </Campo>
          <Campo etiqueta="Mínimo" ayuda="avisa abajo de esto">
            <input className="input font-mono" inputMode="numeric" value={f.minimo} onChange={(e) => set("minimo", e.target.value)} placeholder="—" />
          </Campo>
          <Campo etiqueta="Categoría">
            <input className="input" list="crm-categorias" value={f.categoria} onChange={(e) => set("categoria", e.target.value)} placeholder="Pesas" />
          </Campo>
        </div>
        <Campo etiqueta="Descripción" ayuda="el copilot la usa para responder">
          <textarea
            className="input"
            rows={3}
            value={f.descripcion}
            onChange={(e) => set("descripcion", e.target.value)}
            placeholder="Medidas, material, colores, garantía…"
          />
        </Campo>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Campo etiqueta="URL de la imagen" error={errores.imagen}>
              <input className="input" value={f.imagen} onChange={(e) => set("imagen", e.target.value)} placeholder="https://…/foto.jpg" />
            </Campo>
          </div>
          {f.imagen.trim() && /^https?:\/\//i.test(f.imagen.trim()) && <Miniatura key={f.imagen} url={f.imagen.trim()} tam={44} />}
        </div>
        <Interruptor
          valor={f.activo}
          onCambio={(v) => set("activo", v)}
          etiqueta="Activo"
          descripcion="Si lo apagás, el bot no lo ofrece aunque tenga stock."
        />
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

const MOTIVOS = ["Ingreso de mercadería", "Venta por fuera del sistema", "Devolución de un cliente", "Rotura o pérdida", "Conteo de inventario"];

export function AjustarStockModal({ producto, onCerrar }: { producto: Producto; onCerrar: () => void }) {
  const [signo, setSigno] = useState<1 | -1>(1);
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [cargando, setCargando] = useState(false);
  const n = Math.round(Math.abs(aNumero(cantidad)));
  const delta = signo * n;
  const queda = (producto.stock ?? 0) + delta;

  async function guardar() {
    if (!n) return;
    setCargando(true);
    try {
      await getRepo().ajustarStock(producto.id, delta, motivo.trim() || undefined);
      avisar(`${producto.nombre}: queda en ${queda}.`);
      onCerrar();
    } catch (e) {
      avisar(e, "error");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Ajustar stock"
      ancho="sm"
      pie={
        <>
          <button className="btn-ghost" onClick={onCerrar} disabled={cargando}>
            Cancelar
          </button>
          <BotonCargando cargando={cargando} disabled={!n || queda < 0} onClick={guardar}>
            Ajustar
          </BotonCargando>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          guardar();
        }}
      >
        <div className="flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-850/60 p-3">
          <Miniatura url={producto.imagen_url} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{producto.nombre}</div>
            <div className="font-mono text-xs text-ink-400">
              {producto.sku} · hoy hay {producto.stock}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-ink-700 bg-ink-850 p-1">
          {([1, -1] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSigno(s)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
                signo === s ? "bg-brand-500 text-white" : "text-ink-300 hover:text-white"
              }`}
            >
              {s === 1 ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
              {s === 1 ? "Sumar" : "Restar"}
            </button>
          ))}
        </div>
        <Campo etiqueta="Cantidad">
          <input
            className="input font-mono text-lg"
            inputMode="numeric"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="0"
            autoFocus
          />
        </Campo>
        <Campo etiqueta="Motivo" ayuda="opcional">
          <input className="input" list="crm-motivos-stock" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ingreso de mercadería" />
          <datalist id="crm-motivos-stock">
            {MOTIVOS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Campo>
        <div className={`rounded-xl px-3 py-2 text-sm ${queda < 0 ? "bg-red-500/10 text-red-400" : "bg-ink-850 text-ink-300"}`}>
          {queda < 0 ? (
            <>No alcanza: quedaría en {queda}.</>
          ) : (
            <>
              Queda en <b className="text-white">{queda}</b>
              {n ? ` (${delta > 0 ? "+" : ""}${delta})` : ""}.
            </>
          )}
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
