"use client";
// Plantillas de WhatsApp (las aprueba Meta) y respuestas rápidas del equipo.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, DownloadCloud, FileText, MessageSquareText, Pencil, Plus, Search, Trash2, Zap } from "lucide-react";
import type { Plantilla, PlantillaEstado, Rapida } from "@/lib/crm/types";
import { haceCuanto, recortar, sinAcentos } from "@/lib/crm/core";
import { getRepo } from "@/lib/crm/repo";
import { useCanales, useEsAdmin, useModo, usePlantillas, useRapidas, useYo } from "@/lib/crm/hooks";
import { BotonCargando, Campo, ChipColor, Confirmar, Interruptor, Modal, Tabla, Td, Th, Vacio, avisar } from "@/components/crm/ui";
import { AvisoSoloAdmin, TextoConVariables } from "./comun";

// ============================================================
// Plantillas
// ============================================================
export const ESTADOS_PLANTILLA: Record<PlantillaEstado, { nombre: string; color: string }> = {
  aprobada: { nombre: "Aprobada", color: "#16a34a" },
  pendiente: { nombre: "Pendiente", color: "#f59e0b" },
  rechazada: { nombre: "Rechazada", color: "#ef4444" },
  local: { nombre: "Local", color: "#9aa3c0" },
};
const ORDEN_ESTADO: Record<PlantillaEstado, number> = { aprobada: 0, pendiente: 1, local: 2, rechazada: 3 };

const IDIOMAS = [
  { id: "es_AR", nombre: "Español (Argentina)" },
  { id: "es", nombre: "Español" },
  { id: "es_MX", nombre: "Español (México)" },
  { id: "es_ES", nombre: "Español (España)" },
  { id: "pt_BR", nombre: "Portugués (Brasil)" },
  { id: "en_US", nombre: "Inglés (EE. UU.)" },
];
const CATEGORIAS = [
  { id: "UTILITY", nombre: "Utilidad (avisos de pedidos, turnos, envíos)" },
  { id: "MARKETING", nombre: "Marketing (promos, novedades)" },
];

// Sin acentos ni mayúsculas, SIN recortar espacios (para poder escribir corrido).
function plano(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizarNombrePlantilla(v: string): string {
  return plano(v)
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 512);
}

// Revisa que las variables sean {{1}}..{{n}} seguidas. Devuelve n o el error.
export function variablesDe(cuerpo: string): { n: number; error?: string } {
  if (/\{\{(?!\d+\}\})/.test(cuerpo)) return { n: 0, error: "Hay una variable mal escrita: tienen que ser {{1}}, {{2}}… (con número y sin espacios)." };
  const nums = Array.from(new Set(Array.from(cuerpo.matchAll(/\{\{(\d+)\}\}/g)).map((m) => Number(m[1])))).sort((a, b) => a - b);
  if (!nums.length) return { n: 0 };
  const ok = nums.every((x, i) => x === i + 1);
  if (!ok) return { n: nums.length, error: `Las variables tienen que ir seguidas desde {{1}}: encontré ${nums.map((x) => `{{${x}}}`).join(", ")}.` };
  return { n: nums.length };
}

function rellenarEjemplo(cuerpo: string, ejemplo: string[]): string {
  return cuerpo.replace(/\{\{(\d+)\}\}/g, (m, k: string) => ejemplo[Number(k) - 1]?.trim() || m);
}

function PlantillaFormulario({
  plantilla,
  canalId,
  existentes,
  onCerrar,
}: {
  plantilla: Plantilla | null;
  canalId: string;
  existentes: Plantilla[];
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(plantilla?.nombre ?? "");
  const [idioma, setIdioma] = useState(plantilla?.idioma ?? "es_AR");
  const [categoria, setCategoria] = useState(plantilla?.categoria ?? "UTILITY");
  const [cuerpo, setCuerpo] = useState(plantilla?.cuerpo ?? "");
  const [ejemplo, setEjemplo] = useState<string[]>(plantilla?.ejemplo ?? []);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const vars = variablesDe(cuerpo);
  const tokens = Array.from({ length: Math.min(vars.n + 1, 10) }, (_, i) => `{{${i + 1}}}`);

  async function guardar() {
    const errs: Record<string, string> = {};
    const nom = nombre.replace(/^_+|_+$/g, "");
    if (!nom) errs.nombre = "Poné un nombre (minúsculas y guiones bajos).";
    else if (existentes.some((p) => p.nombre === nom && p.idioma === idioma && p.id !== plantilla?.id))
      errs.nombre = "Ya hay una plantilla con ese nombre e idioma.";
    if (!cuerpo.trim()) errs.cuerpo = "Escribí el texto de la plantilla.";
    else if (vars.error) errs.cuerpo = vars.error;
    else if (cuerpo.length > 1024) errs.cuerpo = "Meta acepta hasta 1024 caracteres en el cuerpo.";
    for (let i = 0; i < vars.n; i++) if (!ejemplo[i]?.trim()) errs[`ej${i}`] = "Meta pide un ejemplo.";
    setErrores(errs);
    if (Object.keys(errs).length) return;
    setCargando(true);
    try {
      await getRepo().guardarPlantilla({
        ...(plantilla || {}),
        nombre: nom,
        idioma,
        categoria,
        cuerpo: cuerpo.trim(),
        variables: vars.n,
        ejemplo: ejemplo.slice(0, vars.n).map((x) => x.trim()),
        estado: plantilla?.estado ?? "local",
        canal_id: plantilla?.canal_id ?? (canalId || null),
      });
      avisar(plantilla ? "Plantilla guardada." : "Plantilla local creada.");
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
      titulo={plantilla ? "Editar plantilla local" : "Nueva plantilla local"}
      ancho="lg"
      pie={
        <>
          <button className="btn-ghost" onClick={onCerrar} disabled={cargando}>
            Cancelar
          </button>
          <BotonCargando cargando={cargando} onClick={guardar}>
            Guardar plantilla
          </BotonCargando>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
          <Campo etiqueta="Nombre" ayuda="como en Meta: minúsculas y _" error={errores.nombre}>
            <input
              className="input font-mono"
              value={nombre}
              onChange={(e) => setNombre(normalizarNombrePlantilla(e.target.value))}
              placeholder="pedido_enviado"
              autoFocus
            />
          </Campo>
          <Campo etiqueta="Idioma">
            <select className="input" value={idioma} onChange={(e) => setIdioma(e.target.value)}>
              {IDIOMAS.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo etiqueta="Categoría">
          <select className="input" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Texto" ayuda={`${cuerpo.length}/1024`} error={errores.cuerpo}>
          <TextoConVariables
            valor={cuerpo}
            onCambio={setCuerpo}
            variables={tokens}
            filas={5}
            placeholder="Hola {{1}}, tu pedido {{2}} ya salió. Lo seguís acá: {{3}}"
          />
        </Campo>
        {vars.n > 0 && !vars.error && (
          <div>
            <div className="label mb-2">Ejemplo de cada variable</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Array.from({ length: vars.n }, (_, i) => (
                <Campo key={i} etiqueta={<span className="font-mono">{`{{${i + 1}}}`}</span>} error={errores[`ej${i}`]}>
                  <input
                    className="input py-2"
                    value={ejemplo[i] ?? ""}
                    onChange={(e) => setEjemplo((l) => Object.assign([...l], { [i]: e.target.value }))}
                    placeholder={i === 0 ? "Sofía" : i === 1 ? "#1234" : "https://…"}
                  />
                </Campo>
              ))}
            </div>
          </div>
        )}
        {cuerpo.trim() && (
          <div>
            <div className="mb-1 text-[11px] text-ink-500">Así le llega al cliente:</div>
            <div className="max-w-md whitespace-pre-wrap rounded-2xl rounded-tr-sm border border-brand-500/25 bg-brand-500/10 px-3 py-2 text-sm text-ink-100">
              {rellenarEjemplo(cuerpo, ejemplo)}
            </div>
          </div>
        )}
        <p className="text-[11px] text-ink-500">
          Una plantilla local sirve de borrador y para probar en demo. Para usarla de verdad fuera de la ventana de 24 hs, creala igual en Meta y traela con
          «Traer de Meta».
        </p>
      </div>
    </Modal>
  );
}

export function TabPlantillas() {
  const plantillas = usePlantillas();
  const canales = useCanales();
  const modo = useModo();
  const esAdmin = useEsAdmin();
  const wa = useMemo(() => canales.filter((c) => c.tipo === "whatsapp"), [canales]);
  const [canalId, setCanalId] = useState("");
  const [expandida, setExpandida] = useState<string | null>(null);
  const [form, setForm] = useState<{ plantilla: Plantilla | null } | null>(null);
  const [aBorrar, setABorrar] = useState<Plantilla | null>(null);
  const [trayendo, setTrayendo] = useState(false);

  useEffect(() => {
    if (wa.length && !wa.some((c) => c.id === canalId)) setCanalId(wa[0].id);
  }, [wa, canalId]);

  const lista = useMemo(
    () =>
      plantillas
        .filter((p) => !canalId || !p.canal_id || p.canal_id === canalId)
        .sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || a.nombre.localeCompare(b.nombre)),
    [plantillas, canalId],
  );
  const escondidas = plantillas.length - lista.length;

  async function traer() {
    if (modo === "demo") {
      avisar("En modo demo no hay conexión con Meta: creá plantillas locales para probar.", "info");
      return;
    }
    if (!canalId) {
      avisar("Primero conectá un número de WhatsApp en Conexiones.", "info");
      return;
    }
    setTrayendo(true);
    try {
      const r = await getRepo().sincronizarPlantillas(canalId);
      avisar(`Listo: ${r.length} ${r.length === 1 ? "plantilla traída" : "plantillas traídas"} de Meta.`);
    } catch (e) {
      avisar(e, "error");
    } finally {
      setTrayendo(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-col gap-3 p-4 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15">
            <BookOpen className="h-5 w-5 text-brand-300" />
          </span>
          <p className="text-xs leading-relaxed text-ink-300">
            Pasadas 24 hs desde el último mensaje del cliente, WhatsApp sólo deja escribirle con una <b className="text-white">plantilla aprobada por Meta</b>.
            Se crean en el Administrador de WhatsApp, Meta las revisa (de minutos a un día) y acá las traés con «Traer de Meta».{" "}
            <Link href="/docs#plantillas" className="font-semibold text-brand-300 hover:text-brand-200">
              Cómo se hace
            </Link>
            {" · "}
            <a
              href="https://business.facebook.com/wa/manage/message-templates/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 font-semibold text-brand-300 hover:text-brand-200"
            >
              Abrir el Administrador de WhatsApp <ArrowUpRight className="h-3 w-3" />
            </a>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {wa.length > 1 && (
            <select className="input w-auto py-2" value={canalId} onChange={(e) => setCanalId(e.target.value)} aria-label="Número de WhatsApp">
              {wa.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.detalle?.numero_visible || c.nombre}
                </option>
              ))}
            </select>
          )}
          {esAdmin && (
            <>
              <BotonCargando cargando={trayendo} onClick={traer} className="btn-ghost py-2">
                <DownloadCloud className="h-4 w-4" /> Traer de Meta
              </BotonCargando>
              <button className="btn-primary py-2" onClick={() => setForm({ plantilla: null })}>
                <Plus className="h-4 w-4" /> Nueva plantilla local
              </button>
            </>
          )}
        </div>
      </div>

      {!esAdmin && <AvisoSoloAdmin texto="Las plantillas las carga un admin. Las aprobadas las podés usar desde el chat." />}
      {!wa.length && (
        <p className="text-xs text-ink-400">
          Todavía no hay un WhatsApp conectado.{" "}
          <Link href="/conexiones" className="font-semibold text-brand-300 hover:text-brand-200">
            Conectalo en Conexiones
          </Link>{" "}
          para traer tus plantillas de Meta.
        </p>
      )}

      {!lista.length ? (
        <Vacio
          icono={FileText}
          titulo="Sin plantillas todavía"
          texto={
            modo === "demo"
              ? "En demo podés crear plantillas locales para probar el envío fuera de la ventana."
              : "Traé las que ya tenés aprobadas en Meta o creá una local como borrador."
          }
          accion={
            esAdmin ? (
              <button className="btn-primary" onClick={() => setForm({ plantilla: null })}>
                <Plus className="h-4 w-4" /> Nueva plantilla local
              </button>
            ) : undefined
          }
        />
      ) : (
        <Tabla>
          <thead>
            <tr>
              <Th>Nombre</Th>
              <Th>Idioma</Th>
              <Th>Categoría</Th>
              <Th>Estado</Th>
              <Th className="text-center">Variables</Th>
              <Th>Texto</Th>
              {esAdmin && <Th />}
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => {
              const est = ESTADOS_PLANTILLA[p.estado] || ESTADOS_PLANTILLA.local;
              const abierta = expandida === p.id;
              return (
                <tr key={p.id} className="align-top">
                  <Td className="whitespace-nowrap font-mono text-xs font-semibold text-white">{p.nombre}</Td>
                  <Td className="whitespace-nowrap font-mono text-xs text-ink-300">{p.idioma}</Td>
                  <Td className="whitespace-nowrap text-xs text-ink-300">
                    {p.categoria ? (p.categoria === "MARKETING" ? "Marketing" : p.categoria === "UTILITY" ? "Utilidad" : p.categoria) : "—"}
                  </Td>
                  <Td>
                    <ChipColor color={est.color} chico>
                      {est.nombre}
                    </ChipColor>
                  </Td>
                  <Td className="text-center font-mono text-xs">{p.variables}</Td>
                  <Td className="max-w-[360px] text-xs text-ink-300">
                    <button
                      type="button"
                      className="text-left hover:text-white"
                      onClick={() => setExpandida(abierta ? null : p.id)}
                      title={abierta ? "Achicar" : "Ver completo"}
                    >
                      {abierta ? <span className="whitespace-pre-wrap">{p.cuerpo}</span> : recortar(p.cuerpo.replace(/\s+/g, " "), 90)}
                    </button>
                    {abierta && <div className="mt-1 text-[10px] text-ink-500">Actualizada {haceCuanto(p.actualizado)}</div>}
                  </Td>
                  {esAdmin && (
                    <Td className="whitespace-nowrap text-right">
                      {p.estado === "local" && (
                        <button
                          className="rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-white"
                          onClick={() => setForm({ plantilla: p })}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        className="rounded-lg p-2 text-ink-500 hover:bg-red-500/10 hover:text-red-400"
                        onClick={() => setABorrar(p)}
                        aria-label="Borrar"
                        title="Borrar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Tabla>
      )}
      {escondidas > 0 && <p className="text-xs text-ink-500">Hay {escondidas} plantillas de otros números de WhatsApp: elegí el número arriba para verlas.</p>}

      {form && <PlantillaFormulario plantilla={form.plantilla} canalId={canalId} existentes={plantillas} onCerrar={() => setForm(null)} />}
      <Confirmar
        abierto={!!aBorrar}
        onCerrar={() => setABorrar(null)}
        titulo="¿Borrar la plantilla?"
        texto={
          aBorrar?.estado === "local"
            ? "Se borra la plantilla local."
            : "Se quita de Clientany. En Meta sigue existiendo: si la volvés a traer, vuelve a aparecer."
        }
        confirmar="Sí, borrar"
        peligro
        onConfirmar={async () => {
          if (!aBorrar) return;
          try {
            await getRepo().borrarPlantilla(aBorrar.id);
            avisar("Plantilla borrada.");
          } catch (e) {
            avisar(e, "error");
          }
        }}
      />
    </div>
  );
}

// ============================================================
// Respuestas rápidas
// ============================================================
export function normalizarAtajo(v: string): string {
  return (
    "/" +
    plano(v)
      .replace(/^\/+/, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "")
  );
}

function FormRapida({
  rapida,
  yoId,
  esAdmin,
  existentes,
  onListo,
}: {
  rapida: Rapida | null;
  yoId: string;
  esAdmin: boolean;
  existentes: Rapida[];
  onListo: () => void;
}) {
  const [atajo, setAtajo] = useState(rapida?.atajo ?? "/");
  const [texto, setTexto] = useState(rapida?.texto ?? "");
  const [soloMia, setSoloMia] = useState(rapida ? !!rapida.de : !esAdmin);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function guardar() {
    const a = normalizarAtajo(atajo);
    if (a.length < 2) return setError("El atajo necesita al menos una letra después de la barra.");
    if (!texto.trim()) return setError("Escribí el texto de la respuesta.");
    if (existentes.some((r) => r.atajo === a && r.id !== rapida?.id)) return setError(`Ya existe ${a}.`);
    setError("");
    setCargando(true);
    try {
      await getRepo().guardarRapida({ ...(rapida || {}), atajo: a, texto: texto.trim(), de: soloMia ? rapida?.de || yoId : null });
      avisar(rapida ? "Respuesta rápida guardada." : `Lista: escribí ${a} en el chat.`);
      onListo();
    } catch (e) {
      avisar(e, "error");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-brand-500/30 bg-brand-500/5 p-3.5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr]">
        <Campo etiqueta="Atajo" ayuda="empieza con /">
          <input className="input font-mono" value={atajo} onChange={(e) => setAtajo(normalizarAtajo(e.target.value))} placeholder="/envio" autoFocus />
        </Campo>
        <Campo etiqueta="Texto">
          <TextoConVariables
            valor={texto}
            onCambio={setTexto}
            variables={["{nombre}"]}
            filas={3}
            placeholder="¡Hola {nombre}! Hacemos envíos a todo el país…"
          />
        </Campo>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:max-w-xs sm:flex-1">
          {esAdmin ? (
            <Interruptor valor={soloMia} onCambio={setSoloMia} etiqueta="Sólo para mí" descripcion={soloMia ? "Nadie más la ve." : "La ve todo el equipo."} />
          ) : (
            <p className="text-xs text-ink-400">Queda sólo para vos. Las compartidas las crea un admin.</p>
          )}
        </div>
        {error && <p className="flex-1 text-xs text-red-400">{error}</p>}
        <div className="flex gap-2 sm:ml-auto">
          <button className="btn-ghost py-2" onClick={onListo} disabled={cargando}>
            Cancelar
          </button>
          <BotonCargando cargando={cargando} onClick={guardar} className="btn-primary py-2">
            Guardar
          </BotonCargando>
        </div>
      </div>
    </div>
  );
}

export function TabRapidas() {
  const rapidas = useRapidas();
  const yo = useYo();
  const esAdmin = useEsAdmin();
  const [q, setQ] = useState("");
  const [nueva, setNueva] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [aBorrar, setABorrar] = useState<Rapida | null>(null);

  const lista = useMemo(() => {
    const t = sinAcentos(q);
    return rapidas.filter((r) => !t || sinAcentos(`${r.atajo} ${r.texto}`).includes(t)).sort((a, b) => a.atajo.localeCompare(b.atajo));
  }, [rapidas, q]);
  const puedeEditar = (r: Rapida) => (r.de ? r.de === yo?.id : esAdmin);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            className="input pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar atajo o texto"
            aria-label="Buscar respuestas rápidas"
          />
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setNueva(true);
            setEditando(null);
          }}
          disabled={!yo}
        >
          <Plus className="h-4 w-4" /> Nueva
        </button>
      </div>
      <p className="text-xs text-ink-400">
        En el chat escribí <span className="font-mono text-brand-300">/</span> y el atajo para pegar el texto. {"{nombre}"} se cambia por el nombre del cliente.
      </p>

      {nueva && yo && <FormRapida rapida={null} yoId={yo.id} esAdmin={esAdmin} existentes={rapidas} onListo={() => setNueva(false)} />}

      {!rapidas.length && !nueva ? (
        <Vacio
          icono={Zap}
          titulo="Sin respuestas rápidas"
          texto="Guardá las respuestas que escribís siempre (envíos, medios de pago, horarios) y pegalas con un atajo."
          accion={
            <button className="btn-primary" onClick={() => setNueva(true)} disabled={!yo}>
              <Plus className="h-4 w-4" /> Nueva
            </button>
          }
        />
      ) : (
        <div className="card divide-y divide-ink-800">
          {lista.map((r) =>
            editando === r.id && yo ? (
              <div key={r.id} className="p-3">
                <FormRapida rapida={r} yoId={yo.id} esAdmin={esAdmin} existentes={rapidas} onListo={() => setEditando(null)} />
              </div>
            ) : (
              <div key={r.id} className="flex items-start gap-3 p-3.5">
                <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-brand-300">{r.atajo}</span>
                    {r.de ? (
                      <span className="chip bg-ink-800 px-2 py-0.5 text-[10px] text-ink-300">Mía</span>
                    ) : (
                      <span className="chip bg-brand-500/10 px-2 py-0.5 text-[10px] text-brand-300">Compartida</span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-ink-200">{r.texto}</p>
                </div>
                {puedeEditar(r) && (
                  <div className="flex shrink-0">
                    <button
                      className="rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-white"
                      onClick={() => {
                        setEditando(r.id);
                        setNueva(false);
                      }}
                      aria-label={`Editar ${r.atajo}`}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-lg p-2 text-ink-500 hover:bg-red-500/10 hover:text-red-400"
                      onClick={() => setABorrar(r)}
                      aria-label={`Borrar ${r.atajo}`}
                      title="Borrar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ),
          )}
          {!lista.length && q && <div className="p-4 text-center text-xs text-ink-500">Nada coincide con «{q}».</div>}
        </div>
      )}

      <Confirmar
        abierto={!!aBorrar}
        onCerrar={() => setABorrar(null)}
        titulo="¿Borrar la respuesta rápida?"
        texto={
          aBorrar ? (
            <>
              Se borra <span className="font-mono text-white">{aBorrar.atajo}</span>
              {aBorrar.de ? "." : " para todo el equipo."}
            </>
          ) : null
        }
        confirmar="Sí, borrar"
        peligro
        onConfirmar={async () => {
          if (!aBorrar) return;
          try {
            await getRepo().borrarRapida(aBorrar.id);
            avisar("Respuesta rápida borrada.");
          } catch (e) {
            avisar(e, "error");
          }
        }}
      />
    </div>
  );
}
