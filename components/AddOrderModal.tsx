"use client";

import { useState } from "react";
import { X, Package, Upload, Check, FileText } from "lucide-react";
import { useData } from "@/lib/data-store";
import { useApp } from "@/lib/store";
import { buildOrder, parseOrdersCsv } from "@/lib/order-helpers";
import { orderStatusMeta } from "@/lib/channels";
import type { Order, OrderStatus } from "@/lib/types";

const statuses: OrderStatus[] = [
  "confirmado",
  "preparacion",
  "despachado",
  "en_camino",
  "en_reparto",
  "entregado",
  "demorado",
];

const carriers = ["Andreani", "Correo Argentino", "OCA", "Mercado Envíos", "Envío propio", "Otro"];

export default function AddOrderModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (o: Order) => void;
}) {
  const brands = useData((s) => s.brands);
  const addOrder = useData((s) => s.addOrder);
  const activeBrandId = useApp((s) => s.activeBrandId);
  const [tab, setTab] = useState<"manual" | "csv">("manual");

  const defaultBrand = activeBrandId !== "all" ? activeBrandId : brands[0]?.id ?? "";
  const [brandId, setBrandId] = useState(defaultBrand);
  const [f, setF] = useState({
    orderNumber: "",
    customerName: "",
    email: "",
    phone: "",
    status: "confirmado" as OrderStatus,
    carrier: "Andreani",
    trackingCode: "",
    trackingUrl: "",
    total: "",
    destination: "",
    items: "",
  });

  const [csv, setCsv] = useState("");
  const [imported, setImported] = useState<number | null>(null);

  function saveManual() {
    const order = buildOrder({
      ...f,
      brandId,
      total: Number(f.total.replace(/[^\d]/g, "")) || 0,
      currency: "ARS",
    });
    addOrder(order);
    onAdded(order);
  }

  function importCsv() {
    const parsed = parseOrdersCsv(csv, brandId);
    parsed.forEach((o) => addOrder(o));
    setImported(parsed.length);
    if (parsed.length) setTimeout(() => onAdded(parsed[0]), 900);
  }

  const canManual = brandId && f.orderNumber.trim() && f.customerName.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg animate-fade-in overflow-y-auto rounded-t-3xl border border-ink-700 bg-ink-900 p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-brand-300" />
            <h3 className="text-lg font-bold text-white">Cargar pedido</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {brands.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-ink-300">Creá una marca antes de cargar pedidos.</p>
            <a href="/marcas" className="btn-primary mt-4 w-full">
              Crear una marca
            </a>
          </div>
        ) : (
          <>
            <div className="mt-3 flex gap-1.5">
              <button
                onClick={() => setTab("manual")}
                className={`chip flex-1 justify-center border py-2 ${
                  tab === "manual" ? "border-brand-500/40 bg-brand-500/15 text-brand-200" : "border-ink-700 bg-ink-850 text-ink-300"
                }`}
              >
                Carga manual
              </button>
              <button
                onClick={() => setTab("csv")}
                className={`chip flex-1 justify-center border py-2 ${
                  tab === "csv" ? "border-brand-500/40 bg-brand-500/15 text-brand-200" : "border-ink-700 bg-ink-850 text-ink-300"
                }`}
              >
                Importar CSV
              </button>
            </div>

            <div className="mt-4">
              <div className="label mb-1.5">Marca</div>
              <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="input">
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.logo} {b.name}
                  </option>
                ))}
              </select>
            </div>

            {tab === "manual" ? (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="N° de orden" value={f.orderNumber} onChange={(v) => setF({ ...f, orderNumber: v })} placeholder="Ej: A-1001" />
                  <div>
                    <div className="label mb-1.5">Estado</div>
                    <select
                      value={f.status}
                      onChange={(e) => setF({ ...f, status: e.target.value as OrderStatus })}
                      className="input"
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>
                          {orderStatusMeta[s].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <Input label="Cliente (nombre y apellido)" value={f.customerName} onChange={(v) => setF({ ...f, customerName: v })} placeholder="Ej: Juan Pérez" />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Email" value={f.email} onChange={(v) => setF({ ...f, email: v })} placeholder="cliente@mail.com" />
                  <Input label="Teléfono" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} placeholder="+54 9 11 ..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="label mb-1.5">Correo / logística</div>
                    <select value={f.carrier} onChange={(e) => setF({ ...f, carrier: e.target.value })} className="input">
                      {carriers.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <Input label="Código de seguimiento" value={f.trackingCode} onChange={(v) => setF({ ...f, trackingCode: v })} placeholder="AND-..." />
                </div>
                <Input label="Link de seguimiento del correo (opcional)" value={f.trackingUrl} onChange={(v) => setF({ ...f, trackingUrl: v })} placeholder="https://..." />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Total (ARS)" value={f.total} onChange={(v) => setF({ ...f, total: v })} placeholder="25000" />
                  <Input label="Destino" value={f.destination} onChange={(v) => setF({ ...f, destination: v })} placeholder="Palermo, CABA" />
                </div>
                <Input label="Productos (separados por coma)" value={f.items} onChange={(v) => setF({ ...f, items: v })} placeholder="Remera negra, Gorra" />

                <button disabled={!canManual} onClick={saveManual} className="btn-primary w-full">
                  <Check className="h-4 w-4" /> Guardar pedido
                </button>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="rounded-xl bg-ink-850 p-3 text-xs text-ink-300">
                  <div className="mb-1 flex items-center gap-1.5 font-semibold text-white">
                    <FileText className="h-3.5 w-3.5" /> Formato de columnas
                  </div>
                  <code className="text-[11px] text-ink-400">
                    numero, nombre, email, telefono, estado, correo, tracking, total, destino
                  </code>
                </div>
                <textarea
                  value={csv}
                  onChange={(e) => setCsv(e.target.value)}
                  rows={7}
                  placeholder={"A-1001, Juan Pérez, juan@mail.com, +5491155550000, en_camino, Andreani, AND-123, 25000, Palermo CABA\nA-1002, Ana López, ana@mail.com, , preparacion, OCA, , 18000, Rosario"}
                  className="input resize-none font-mono text-xs"
                />
                {imported !== null ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-green-500/10 py-3 text-sm text-green-400">
                    <Check className="h-4 w-4" /> {imported} pedidos importados
                  </div>
                ) : (
                  <button disabled={!csv.trim()} onClick={importCsv} className="btn-primary w-full">
                    <Upload className="h-4 w-4" /> Importar pedidos
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="label mb-1.5">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input" />
    </div>
  );
}
