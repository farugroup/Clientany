"use client";
// Configuración: IA del copilot, claves de API, webhook saliente y datos de prueba.
import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Database, KeyRound, Plus, RotateCcw, Send, Sparkles, Trash2, Webhook } from "lucide-react";
import type { ApiKey, ConfigIA, Empresa } from "@/lib/crm/types";
import { fechaCorta, haceCuanto } from "@/lib/crm/core";
import { getRepo } from "@/lib/crm/repo";
import { useApiKeys, useModo } from "@/lib/crm/hooks";
import { useData } from "@/lib/data-store";
import { BotonCargando, Campo, Confirmar, Modal, avisar } from "@/components/crm/ui";
import { BotonCopiar, CampoCopiable, Tarjeta, useBaseUrl } from "./comun";
import { PieGuardar, useBorrador, useGuardarEmpresa } from "./ajustes-empresa";

// ---------- 5. IA (copilot) ----------
export function SeccionIA({ empresa, ro }: { empresa: Empresa; ro: boolean }) {
  const modo = useModo();
  const ia: ConfigIA = empresa.ia || { proveedor: "plataforma", clave_cargada: false };
  const b = useBorrador({ proveedor: ia.proveedor || "plataforma", modelo: ia.modelo || "", instrucciones: ia.instrucciones || "" });
  const { cargando, guardar } = useGuardarEmpresa();
  const [clave, setClave] = useState("");
  const [reemplazar, setReemplazar] = useState(false);
  const [quitar, setQuitar] = useState(false);
  const [error, setError] = useState("");
  const f = b.valor;
  const propia = f.proveedor === "anthropic";
  const pideClave = propia && (!ia.clave_cargada || reemplazar);

  async function onGuardar() {
    const k = clave.trim();
    if (propia && !ia.clave_cargada && !k) return setError("Pegá tu clave de Anthropic.");
    if (k && !k.startsWith("sk-")) return setError("Esa no parece una clave de Anthropic (empieza con «sk-ant-»).");
    setError("");
    const patch: Partial<Empresa> & { ia_clave?: string } = {
      ia: { ...ia, proveedor: f.proveedor, modelo: f.modelo.trim() || undefined, instrucciones: f.instrucciones.trim() || undefined },
    };
    if (propia && k) patch.ia_clave = k;
    if (await guardar(patch, "Configuración de IA guardada.")) {
      setClave("");
      setReemplazar(false);
    }
  }

  return (
    <>
      <Tarjeta
        id="ia"
        titulo="IA (copilot)"
        icono={Sparkles}
        sub="El copilot de la Bandeja sugiere respuestas con tus pedidos, tu stock y estas instrucciones."
      >
        <fieldset disabled={ro} className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Proveedor de IA">
            {(
              [
                { id: "plataforma", titulo: "Clave de Clientany", texto: "Incluida en tu plan. No tenés que hacer nada." },
                { id: "anthropic", titulo: "Mi clave de Anthropic", texto: "Usás tu propia cuenta de Anthropic y lo pagás ahí." },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={f.proveedor === o.id}
                onClick={() => b.set((x) => ({ ...x, proveedor: o.id }))}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                  f.proveedor === o.id ? "border-brand-500/60 bg-brand-500/10" : "border-ink-700 bg-ink-850 hover:border-ink-600"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${f.proveedor === o.id ? "border-brand-400" : "border-ink-500"}`}
                >
                  {f.proveedor === o.id && <span className="h-2 w-2 rounded-full bg-brand-400" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{o.titulo}</span>
                  <span className="block text-xs text-ink-400">{o.texto}</span>
                </span>
              </button>
            ))}
          </div>

          {propia && (
            <div className="space-y-2">
              {ia.clave_cargada && !reemplazar ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-green-500/25 bg-green-500/5 px-3 py-2.5 text-sm">
                  <KeyRound className="h-4 w-4 text-green-400" />
                  <span className="flex-1 text-ink-200">Clave cargada</span>
                  {!ro && (
                    <>
                      <button type="button" className="text-xs font-semibold text-brand-300 hover:text-brand-200" onClick={() => setReemplazar(true)}>
                        Reemplazar
                      </button>
                      <span className="text-ink-600">·</span>
                      <button type="button" className="text-xs font-semibold text-red-400 hover:text-red-300" onClick={() => setQuitar(true)}>
                        Quitar
                      </button>
                    </>
                  )}
                </div>
              ) : (
                pideClave && (
                  <Campo etiqueta="Clave de Anthropic" ayuda="se guarda cifrada y no vuelve a mostrarse" error={error}>
                    <div className="flex gap-2">
                      <input
                        className="input font-mono"
                        type="password"
                        autoComplete="off"
                        value={clave}
                        onChange={(e) => setClave(e.target.value)}
                        placeholder="sk-ant-…"
                      />
                      {reemplazar && (
                        <button
                          type="button"
                          className="btn-ghost shrink-0 py-2"
                          onClick={() => {
                            setReemplazar(false);
                            setClave("");
                          }}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </Campo>
                )
              )}
              {modo === "demo" && <p className="text-[11px] text-amber-300">En modo demo la clave no se guarda: el copilot usa la IA de Clientany.</p>}
            </div>
          )}

          <Campo etiqueta="Modelo" ayuda="opcional: si lo dejás vacío, usamos el de fábrica">
            <input
              className="input font-mono"
              value={f.modelo}
              onChange={(e) => b.set((x) => ({ ...x, modelo: e.target.value }))}
              placeholder="claude-opus-5-5"
            />
          </Campo>
          <Campo etiqueta="Sobre tu marca" ayuda="tono, qué destacar, qué no decir">
            <textarea
              className="input leading-relaxed"
              rows={4}
              value={f.instrucciones}
              onChange={(e) => b.set((x) => ({ ...x, instrucciones: e.target.value }))}
              placeholder="Tono cercano y de vos. Destacá el envío gratis desde $50.000 y la garantía de 6 meses. No prometas fechas de entrega exactas ni hagas descuentos sin consultar."
            />
          </Campo>
        </fieldset>
        <PieGuardar
          sucio={b.sucio || !!clave.trim()}
          cargando={cargando}
          onGuardar={onGuardar}
          onDescartar={() => {
            b.descartar();
            setClave("");
            setReemplazar(false);
            setError("");
          }}
          ro={ro}
        />
      </Tarjeta>
      <Confirmar
        abierto={quitar}
        onCerrar={() => setQuitar(false)}
        titulo="¿Quitar tu clave de Anthropic?"
        texto="Se borra la clave y el copilot vuelve a usar la IA de Clientany."
        confirmar="Sí, quitar"
        peligro
        onConfirmar={async () => {
          const patch: Partial<Empresa> & { ia_clave?: string } = { ia: { ...ia, proveedor: "plataforma", clave_cargada: false }, ia_clave: "" };
          if (await guardar(patch, "Clave quitada: el copilot usa la IA de Clientany.")) b.set((x) => ({ ...x, proveedor: "plataforma" }));
        }}
      />
    </>
  );
}

// ---------- 6. API ----------
function ModalCrearClave({ onCerrar }: { onCerrar: () => void }) {
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [secreto, setSecreto] = useState<string | null>(null);

  async function crear() {
    if (!nombre.trim()) return;
    setCargando(true);
    try {
      const r = await getRepo().crearApiKey(nombre.trim());
      setSecreto(r.secreto);
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
      titulo={secreto ? "Tu clave nueva" : "Crear clave de API"}
      ancho="md"
      pie={
        secreto ? (
          <button className="btn-primary" onClick={onCerrar}>
            Listo, ya la guardé
          </button>
        ) : (
          <>
            <button className="btn-ghost" onClick={onCerrar} disabled={cargando}>
              Cancelar
            </button>
            <BotonCargando cargando={cargando} onClick={crear} disabled={!nombre.trim()}>
              Crear clave
            </BotonCargando>
          </>
        )
      }
    >
      {secreto ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            Guardala ahora: no la vas a volver a ver.
          </div>
          <CampoCopiable etiqueta={nombre} valor={secreto} ayuda="Mandala en el encabezado X-API-Key de cada pedido a la API." />
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            crear();
          }}
        >
          <Campo etiqueta="Nombre" ayuda="para reconocerla: dónde la vas a usar">
            <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tienda Nube, ERP, planilla…" autoFocus />
          </Campo>
        </form>
      )}
    </Modal>
  );
}

export function SeccionApi({ ro }: { ro: boolean }) {
  const keys = useApiKeys();
  const modo = useModo();
  const base = useBaseUrl();
  const [crear, setCrear] = useState(false);
  const [aRevocar, setARevocar] = useState<ApiKey | null>(null);
  const curl = `curl ${base || "https://tu-dominio"}/api/v1/yo \\\n  -H "X-API-Key: TU_CLAVE"`;

  return (
    <>
      <Tarjeta
        id="api"
        titulo="API"
        icono={KeyRound}
        sub="Para que tu tienda o tu sistema carguen pedidos y stock solos, y lean la bandeja."
        acciones={
          !ro && (
            <button className="btn-primary py-2" onClick={() => setCrear(true)}>
              <Plus className="h-4 w-4" /> Crear clave
            </button>
          )
        }
      >
        {modo === "demo" && (
          <p className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Modo demo: la clave se crea para que veas cómo es, pero no sirve para llamadas reales.
          </p>
        )}
        {!keys.length ? (
          <p className="rounded-xl border border-dashed border-ink-700 px-4 py-5 text-center text-xs text-ink-500">Todavía no creaste ninguna clave.</p>
        ) : (
          <div className="divide-y divide-ink-800 rounded-xl border border-ink-800">
            {keys.map((k) => (
              <div key={k.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <KeyRound className="h-4 w-4 shrink-0 text-ink-500" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{k.nombre}</div>
                  <div className="font-mono text-[11px] text-ink-400">{k.prefijo}…</div>
                </div>
                <div className="text-right text-[11px] text-ink-500">
                  <div>Creada {fechaCorta(k.creado)}</div>
                  <div>{k.ultimo_uso ? `Último uso ${haceCuanto(k.ultimo_uso)}` : "Sin usar todavía"}</div>
                </div>
                {!ro && (
                  <button className="btn-ghost px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10" onClick={() => setARevocar(k)}>
                    <Trash2 className="h-3.5 w-3.5" /> Revocar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-ink-300">Probá tu clave</span>
            <BotonCopiar valor={curl.replace("\\\n  ", "")} etiqueta="Copiar" className="btn-ghost px-2.5 py-1 text-[11px]" />
          </div>
          <pre className="no-scrollbar overflow-x-auto rounded-xl border border-ink-800 bg-ink-950 p-3 font-mono text-xs leading-relaxed text-ink-200">
            {curl}
          </pre>
          <p className="mt-1.5 text-[11px] text-ink-500">
            Devuelve tu empresa y el nombre de la clave. Rutas para pedidos, stock, contactos y mensajes en la{" "}
            <Link href="/docs#api" className="inline-flex items-center gap-0.5 font-semibold text-brand-300 hover:text-brand-200">
              documentación de la API <ArrowUpRight className="h-3 w-3" />
            </Link>
            .
          </p>
        </div>
      </Tarjeta>

      {crear && <ModalCrearClave onCerrar={() => setCrear(false)} />}
      <Confirmar
        abierto={!!aRevocar}
        onCerrar={() => setARevocar(null)}
        titulo="¿Revocar la clave?"
        texto={aRevocar ? `Todo lo que use «${aRevocar.nombre}» deja de funcionar al toque. No se puede deshacer.` : null}
        confirmar="Sí, revocar"
        peligro
        onConfirmar={async () => {
          if (!aRevocar) return;
          try {
            await getRepo().borrarApiKey(aRevocar.id);
            avisar("Clave revocada.");
          } catch (e) {
            avisar(e, "error");
          }
        }}
      />
    </>
  );
}

// ---------- 7. Webhook saliente ----------
export function SeccionWebhook({ empresa, ro }: { empresa: Empresa; ro: boolean }) {
  const b = useBorrador({ url: empresa.webhook_salida_url || "" });
  const { cargando, guardar } = useGuardarEmpresa();
  const [error, setError] = useState("");
  const url = b.valor.url.trim();

  async function onGuardar() {
    if (url && !/^https?:\/\/\S+\.\S+/i.test(url)) return setError("Tiene que ser una URL completa, con https://");
    setError("");
    await guardar({ webhook_salida_url: url }, url ? "Webhook guardado: te avisamos ahí cada mensaje entrante." : "Webhook quitado.");
  }

  return (
    <Tarjeta id="webhook" titulo="Webhook saliente" icono={Webhook} sub="Te avisamos a esta URL cada mensaje entrante (POST JSON). Opcional.">
      <fieldset disabled={ro} className="space-y-2">
        <Campo etiqueta="URL" error={error}>
          <input
            className="input font-mono text-xs"
            value={b.valor.url}
            onChange={(e) => b.set({ url: e.target.value })}
            placeholder="https://tu-sistema.com/clientany"
          />
        </Campo>
        <p className="text-[11px] text-ink-500">
          Cuerpo: <code className="font-mono text-ink-300">{'{ "evento": "mensaje_entrante", "conversacion": {…}, "mensaje": {…} }'}</code>. Si tu servidor no
          contesta en 5 s, seguimos de largo.
        </p>
      </fieldset>
      <PieGuardar sucio={b.sucio} cargando={cargando} onGuardar={onGuardar} onDescartar={b.descartar} ro={ro} />
    </Tarjeta>
  );
}

// ---------- 8. Datos de prueba ----------
export function SeccionDatosPrueba({ ro }: { ro: boolean }) {
  const resetToSample = useData((s) => s.resetToSample);
  const [confirmar, setConfirmar] = useState<"cargar" | "vaciar" | "marcas" | null>(null);
  return (
    <>
      <Tarjeta id="datos" titulo="Datos de prueba" icono={Database} sub="Chats, clientes, pedidos y productos de ejemplo para practicar sin miedo.">
        {ro ? (
          <p className="text-xs text-ink-500">Sólo un admin puede cargar o vaciar los datos de ejemplo.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={() => setConfirmar("cargar")}>
                <Send className="h-4 w-4" /> Cargar datos de ejemplo
              </button>
              <button className="btn-ghost text-red-400 hover:bg-red-500/10" onClick={() => setConfirmar("vaciar")}>
                <Trash2 className="h-4 w-4" /> Vaciar todo
              </button>
            </div>
            <p className="mt-3 text-[11px] text-ink-500">
              ¿Querés practicar con las secciones de Crecimiento (seguimiento de envíos, carritos, campañas)?{" "}
              <button className="inline-flex items-center gap-1 font-semibold text-brand-300 hover:text-brand-200" onClick={() => setConfirmar("marcas")}>
                <RotateCcw className="h-3 w-3" /> Recargar sus marcas de ejemplo
              </button>
            </p>
          </>
        )}
      </Tarjeta>
      <Confirmar
        abierto={confirmar === "cargar"}
        onCerrar={() => setConfirmar(null)}
        titulo="¿Cargar los datos de ejemplo?"
        texto="Se suman chats, clientes, pedidos y productos de ejemplo. Lo tuyo no se toca."
        confirmar="Sí, cargar"
        onConfirmar={async () => {
          try {
            await getRepo().cargarDatosDePrueba();
            avisar("Datos de ejemplo cargados.");
          } catch (e) {
            avisar(e, "error");
          }
        }}
      />
      <Confirmar
        abierto={confirmar === "vaciar"}
        onCerrar={() => setConfirmar(null)}
        titulo="¿Vaciar todo?"
        texto="Se borran los chats, clientes, pedidos y productos. La configuración (canales, bot, horario, etapas, equipo) queda. No se puede deshacer."
        confirmar="Sí, vaciar todo"
        peligro
        onConfirmar={async () => {
          try {
            await getRepo().vaciarDatosDePrueba();
            avisar("Listo: quedó vacío.");
          } catch (e) {
            avisar(e, "error");
          }
        }}
      />
      <Confirmar
        abierto={confirmar === "marcas"}
        onCerrar={() => setConfirmar(null)}
        titulo="¿Recargar las marcas de ejemplo?"
        texto="Reemplaza las marcas, envíos, carritos y campañas de las secciones de Crecimiento por las de ejemplo. No toca la Bandeja, los pedidos ni el stock del CRM."
        confirmar="Sí, recargar"
        peligro
        onConfirmar={() => {
          resetToSample();
          avisar("Marcas de ejemplo recargadas.");
        }}
      />
    </>
  );
}
