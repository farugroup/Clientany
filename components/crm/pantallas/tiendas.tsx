"use client";
// Conexiones → «Tiendas y otras integraciones»: Tienda Nube, Shopify, VTEX,
// Vendany, Mercado Libre y email. Usa las definiciones de lib/integrations.ts
// y el guardado de siempre (useData().saveIntegration). Lo de WhatsApp,
// Instagram y Messenger vive arriba, en los canales del CRM.
import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  Check,
  ChevronRight,
  Clock,
  ExternalLink,
  Lock,
  Mail,
  ShoppingBag,
  Store,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { integrationDefs, type IntegrationDef } from "@/lib/integrations";
import type { IntegrationKey } from "@/lib/types";
import { useData } from "@/lib/data-store";
import { Campo, Confirmar, Modal, avisar } from "@/components/crm/ui";
import { CampoCopiable, useBaseUrl } from "./comun";

const ICONOS: Partial<Record<IntegrationKey, LucideIcon>> = {
  tiendanube: Store,
  shopify: ShoppingBag,
  vtex: Building2,
  vendany: Store,
  mercadolibre: Tag,
  email: Mail,
};

export const DEFS_TIENDAS = integrationDefs.filter((d) => d.key !== "whatsapp" && d.key !== "meta");

function IconoIntegracion({ def }: { def: IntegrationDef }) {
  const Icon = ICONOS[def.key] || Store;
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${def.color}1f` }}>
      <Icon className="h-5 w-5" style={{ color: def.color }} />
    </span>
  );
}

function EstadoIntegracion({ def, conectada }: { def: IntegrationDef; conectada: boolean }) {
  if (conectada)
    return (
      <span className="chip bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400">
        <Check className="h-3 w-3" /> Conectada
      </span>
    );
  if (def.liveNow) return <span className="chip bg-brand-500/10 px-2 py-0.5 text-[10px] text-brand-300">Lista para conectar</span>;
  return (
    <span className="chip bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
      <Clock className="h-3 w-3" /> Requiere aprobación
    </span>
  );
}

function ModalIntegracion({ def, esAdmin, onCerrar }: { def: IntegrationDef; esAdmin: boolean; onCerrar: () => void }) {
  const guardada = useData((s) => s.integrations[def.key]);
  const saveIntegration = useData((s) => s.saveIntegration);
  const base = useBaseUrl();
  const [valores, setValores] = useState<Record<string, string>>(guardada?.fields ?? {});
  const [desconectar, setDesconectar] = useState(false);
  const conectada = !!guardada?.enabled;
  const faltan = def.fields.filter((f) => !(valores[f.name] || "").trim());

  function guardar() {
    saveIntegration(def.key, valores, true);
    avisar(`${def.name}: credenciales guardadas.`);
    onCerrar();
  }

  return (
    <>
      <Modal
        abierto
        onCerrar={onCerrar}
        ancho="lg"
        titulo={
          <span className="flex items-center gap-2.5">
            <IconoIntegracion def={def} />
            <span>
              {def.name}
              <span className="ml-2 align-middle">
                <EstadoIntegracion def={def} conectada={conectada} />
              </span>
            </span>
          </span>
        }
        pie={
          esAdmin ? (
            <>
              {conectada && (
                <button className="btn-ghost mr-auto text-red-400 hover:bg-red-500/10" onClick={() => setDesconectar(true)}>
                  Desconectar
                </button>
              )}
              <button className="btn-ghost" onClick={onCerrar}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={guardar} disabled={faltan.length === def.fields.length}>
                {conectada ? "Guardar cambios" : "Guardar y conectar"}
              </button>
            </>
          ) : (
            <button className="btn-ghost" onClick={onCerrar}>
              Cerrar
            </button>
          )
        }
      >
        <div className="space-y-5">
          <p className="text-sm text-ink-300">{def.summary}</p>

          <div>
            <div className="label mb-2 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Paso a paso
            </div>
            <ol className="space-y-2.5">
              {def.steps.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-ink-200">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-[11px] font-bold text-brand-300">
                    {i + 1}
                  </span>
                  <span>
                    {s.text}
                    {s.url && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-1 inline-flex items-center gap-0.5 font-semibold text-brand-300 hover:text-brand-200"
                      >
                        {s.urlLabel ?? "Abrir"} <ArrowUpRight className="h-3 w-3" />
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {def.portalLinks.map((p) => (
                <a
                  key={p.url}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-brand-300"
                >
                  {p.label} <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </div>

          {def.callbacks.length > 0 && (
            <div className="space-y-3 rounded-xl border border-brand-500/25 bg-brand-500/5 p-3.5">
              <div className="label text-brand-300">Para pegar en {def.name}</div>
              {def.callbacks.map((cb) => (
                <CampoCopiable key={cb.path} etiqueta={cb.label} valor={`${base}${cb.path}`} ayuda={cb.hint} />
              ))}
            </div>
          )}

          {def.approvalNote && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-ink-300">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              {def.approvalNote}
            </div>
          )}

          <fieldset disabled={!esAdmin} className="space-y-3">
            <div className="label flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Credenciales
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {def.fields.map((f) => (
                <Campo key={f.name} etiqueta={f.label} ayuda={f.help}>
                  <input
                    type={f.secret ? "password" : "text"}
                    autoComplete="off"
                    className={`input ${f.secret ? "font-mono" : ""}`}
                    value={valores[f.name] ?? ""}
                    onChange={(e) => setValores({ ...valores, [f.name]: e.target.value })}
                    placeholder={f.placeholder}
                  />
                </Campo>
              ))}
            </div>
            <p className="text-[11px] text-ink-500">
              Se guardan con tu espacio de trabajo. Para que el bot conteste por tus pedidos, cargalos en Pedidos (a mano, por CSV o por API).
            </p>
          </fieldset>
        </div>
      </Modal>

      <Confirmar
        abierto={desconectar}
        onCerrar={() => setDesconectar(false)}
        titulo={`¿Desconectar ${def.name}?`}
        texto="Se apaga la integración. Las credenciales quedan guardadas por si la volvés a prender."
        confirmar="Sí, desconectar"
        peligro
        onConfirmar={() => {
          saveIntegration(def.key, valores, false);
          avisar(`${def.name} desconectada.`);
          onCerrar();
        }}
      />
    </>
  );
}

export function ListaTiendas({ esAdmin }: { esAdmin: boolean }) {
  const integraciones = useData((s) => s.integrations);
  const [abierta, setAbierta] = useState<IntegrationDef | null>(null);
  return (
    <>
      <div className="card divide-y divide-ink-800 overflow-hidden">
        {DEFS_TIENDAS.map((def) => {
          const conectada = !!integraciones[def.key]?.enabled;
          return (
            <button key={def.key} onClick={() => setAbierta(def)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-ink-800/40">
              <IconoIntegracion def={def} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">{def.name}</span>
                  <EstadoIntegracion def={def} conectada={conectada} />
                </div>
                <p className="truncate text-xs text-ink-400">{def.summary}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-500" />
            </button>
          );
        })}
      </div>
      {abierta && <ModalIntegracion def={abierta} esAdmin={esAdmin} onCerrar={() => setAbierta(null)} />}
    </>
  );
}
