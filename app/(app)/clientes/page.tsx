"use client";
// ============================================================
// Clientany · Clientes (/clientes) — la tabla de contactos: buscador,
// filtro por etiqueta, compras, último contacto; nuevo cliente, importar
// CSV (con vista previa), exportar CSV; ficha en panel lateral / modal.
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, MessageSquare, Plus, Search, Trash2, Upload, Users, X } from "lucide-react";
import { avisar, Campo, ChipColor, Confirmar, descargar, Encabezado, leerArchivoTexto, Modal, Tabla, Td, Th, Vacio } from "@/components/crm/ui";
import { dinero, haceCuanto, pedidosDeContacto, telefonoLindo } from "@/lib/crm/core";
import { importarContactos as parsearContactos, type ImportacionResultado } from "@/lib/crm/csv";
import { getRepo, useCrm } from "@/lib/crm/repo";
import { useContactos, useEmpresa, usePedidos } from "@/lib/crm/hooks";
import type { Contacto, Conversacion } from "@/lib/crm/types";
import { Avatar, etiquetasDe, useEsCelular } from "@/components/crm/bandeja/comun";
import { CamposContacto, contactoDeForm, FichaContacto, FORM_VACIO, type FormContacto } from "@/components/crm/bandeja/ficha";
import { NuevoChatModal, type PrecargaNuevoChat } from "@/components/crm/bandeja/nuevo-chat";

const PAGINA = 50;
const MODELO_CSV = "nombre,telefono,email,documento,direccion,localidad,provincia,cp,notas\nAna Pérez,11 5555-1234,ana@mail.com,30111222,Av. Siempreviva 123,Palermo,CABA,1425,Compró dos veces\n";

export default function ClientesPage() {
  const empresa = useEmpresa();
  const listo = useCrm((s) => s.listo);
  const convs = useCrm((s) => s.conversaciones);
  const pedidos = usePedidos();
  const router = useRouter();
  const esCelular = useEsCelular() === true;

  const [q, setQ] = useState("");
  const [etiqueta, setEtiqueta] = useState("");
  const [limite, setLimite] = useState(PAGINA);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [importar, setImportar] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [borrar, setBorrar] = useState<Contacto | null>(null);
  const [nuevoChat, setNuevoChat] = useState<PrecargaNuevoChat | null>(null);

  const contactos = useContactos(q.trim() || undefined);
  const todos = useContactos();

  // Última conversación de cada contacto, precalculada.
  const ultimaConv = useMemo(() => {
    const m = new Map<string, Conversacion>();
    for (const c of convs) {
      const prev = m.get(c.contacto_id);
      if (!prev || new Date(c.ultimo_en).getTime() > new Date(prev.ultimo_en).getTime()) m.set(c.contacto_id, c);
    }
    return m;
  }, [convs]);

  const filtrados = useMemo(
    () => (etiqueta ? contactos.filter((c) => c.etiquetas.includes(etiqueta)) : contactos),
    [contactos, etiqueta]
  );
  const visibles = filtrados.slice(0, limite);
  const escondidos = todos.length - filtrados.length;
  useEffect(() => setLimite(PAGINA), [q, etiqueta]);

  const elegido = abierto ? todos.find((c) => c.id === abierto) || null : null;
  const pedidosElegido = useMemo(() => (elegido ? pedidosDeContacto(pedidos, elegido) : []), [pedidos, elegido]);

  async function exportar() {
    setExportando(true);
    try {
      const csv = await getRepo().exportarCsv("contactos");
      descargar("clientes.csv", csv);
    } catch (e) {
      avisar(e, "error");
    } finally {
      setExportando(false);
    }
  }

  function escribirle(c: Contacto) {
    const conv = ultimaConv.get(c.id);
    if (conv) router.push(`/inbox?c=${encodeURIComponent(conv.id)}`);
    else setNuevoChat({ nombre: c.nombre, identificador: c.telefono ? telefonoLindo(c.telefono) : c.ig_usuario || "", contacto_id: c.id });
  }

  const fichaPanel = elegido && (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-ink-800 px-3 py-2">
        <button className="btn-soft px-3 py-1.5 text-xs" onClick={() => escribirle(elegido)}>
          <MessageSquare className="h-3.5 w-3.5" /> Escribirle
        </button>
        <button className="btn-ghost px-3 py-1.5 text-xs text-red-400" onClick={() => setBorrar(elegido)}>
          <Trash2 className="h-3.5 w-3.5" /> Borrar
        </button>
        <span className="flex-1" />
        {!esCelular && (
          <button onClick={() => setAbierto(null)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-800 hover:text-white" aria-label="Cerrar" title="Cerrar">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <FichaContacto contacto={elegido} pedidos={pedidosElegido} titulo="Cliente" />
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      <Encabezado
        icono={Users}
        titulo="Clientes"
        sub={listo ? `${todos.length} ${todos.length === 1 ? "contacto" : "contactos"}` : "Cargando…"}
        acciones={
          <>
            <button className="btn-ghost" onClick={() => setImportar(true)}><Upload className="h-4 w-4" /> Importar CSV</button>
            <button className="btn-ghost" onClick={exportar} disabled={exportando || !todos.length}>
              {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Exportar CSV
            </button>
            <button className="btn-primary" onClick={() => setNuevo(true)}><Plus className="h-4 w-4" /> Nuevo cliente</button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input className="input py-2 pl-9" placeholder="Buscar por nombre, teléfono o mail…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar clientes" />
        </div>
        <select className="input w-auto py-2" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} aria-label="Filtrar por etiqueta">
          <option value="">Todas las etiquetas</option>
          {(empresa?.etiquetas || []).map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        {escondidos > 0 && (
          <span className="text-xs text-ink-400">
            Mostrando {filtrados.length} de {todos.length} ·{" "}
            <button className="font-semibold text-brand-300 hover:text-white" onClick={() => { setQ(""); setEtiqueta(""); }}>Quitar filtros</button>
          </span>
        )}
      </div>

      {listo && todos.length === 0 ? (
        <Vacio
          icono={Users}
          titulo="Todavía no hay clientes"
          texto="Aparecen solos cuando alguien escribe. También podés cargarlos a mano o importar un CSV."
          accion={<button className="btn-primary" onClick={() => setNuevo(true)}><Plus className="h-4 w-4" /> Nuevo cliente</button>}
        />
      ) : listo && filtrados.length === 0 ? (
        <Vacio icono={Search} titulo="Sin resultados" texto="Nada que coincida con la búsqueda o el filtro." />
      ) : (
        <>
          <Tabla>
            <thead>
              <tr>
                <Th>Nombre</Th>
                <Th>Teléfono</Th>
                <Th>Email</Th>
                <Th>Localidad</Th>
                <Th>Etiquetas</Th>
                <Th className="text-right">Compras</Th>
                <Th>Último contacto</Th>
                <Th>Origen</Th>
              </tr>
            </thead>
            <tbody>
              {!listo &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse2">
                    <Td><div className="h-3 w-32 rounded bg-ink-800" /></Td>
                    <Td><div className="h-3 w-24 rounded bg-ink-800" /></Td>
                    <Td><div className="h-3 w-32 rounded bg-ink-800" /></Td>
                    <Td><div className="h-3 w-20 rounded bg-ink-800" /></Td>
                    <Td><div className="h-3 w-16 rounded bg-ink-800" /></Td>
                    <Td><div className="h-3 w-12 rounded bg-ink-800" /></Td>
                    <Td><div className="h-3 w-16 rounded bg-ink-800" /></Td>
                    <Td><div className="h-3 w-12 rounded bg-ink-800" /></Td>
                  </tr>
                ))}
              {visibles.map((c) => {
                const ps = pedidosDeContacto(pedidos, c);
                const validos = ps.filter((p) => p.estado !== "cancelado" && p.estado !== "devuelto");
                const gastado = validos.reduce((s, p) => s + (p.total || 0), 0);
                const conv = ultimaConv.get(c.id);
                const ets = etiquetasDe(empresa, c.etiquetas);
                return (
                  <tr key={c.id} onClick={() => setAbierto(c.id)} className={`cursor-pointer transition hover:bg-ink-800/50 ${abierto === c.id ? "bg-brand-500/10" : ""}`}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar nombre={c.nombre} tam="sm" />
                        <span className="font-semibold text-white">{c.nombre}</span>
                      </div>
                    </Td>
                    <Td className="font-mono text-xs">{c.telefono ? telefonoLindo(c.telefono) : <span className="text-ink-600">sin dato</span>}</Td>
                    <Td className="text-xs">{c.email || <span className="text-ink-600">sin dato</span>}</Td>
                    <Td className="text-xs">{c.localidad || <span className="text-ink-600">—</span>}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {ets.map((e) => <ChipColor key={e.id} color={e.color} chico>{e.nombre}</ChipColor>)}
                      </div>
                    </Td>
                    <Td className="text-right text-xs">
                      {validos.length ? (
                        <>
                          <span className="font-semibold text-white">{validos.length}</span> · <span className="text-green-400">{dinero(gastado, empresa?.moneda || "ARS")}</span>
                        </>
                      ) : (
                        <span className="text-ink-600">—</span>
                      )}
                    </Td>
                    <Td className="text-xs">{conv ? haceCuanto(conv.ultimo_en) : <span className="text-ink-600">nunca</span>}</Td>
                    <Td><span className="chip bg-ink-800 px-2 py-0.5 text-[10px] text-ink-300">{c.origen}</span></Td>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
          {filtrados.length > visibles.length && (
            <div className="mt-3 flex items-center justify-center gap-3 text-xs text-ink-400">
              Mostrando {visibles.length} de {filtrados.length}
              <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setLimite((l) => l + PAGINA)}>Ver más</button>
            </div>
          )}
        </>
      )}

      {/* ficha: panel lateral (compu) / modal (celular) */}
      {elegido && !esCelular && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAbierto(null)} />
          <div className="relative h-full w-full max-w-md animate-fade-in border-l border-ink-700 bg-ink-900 shadow-card">{fichaPanel}</div>
        </div>
      )}
      {esCelular && (
        <Modal abierto={!!elegido} onCerrar={() => setAbierto(null)} titulo={elegido?.nombre || "Cliente"} ancho="lg">
          <div className="-mx-5 -my-4 h-[75vh]">{fichaPanel}</div>
        </Modal>
      )}

      <NuevoContactoModal abierto={nuevo} onCerrar={() => setNuevo(false)} onCreado={(c) => setAbierto(c.id)} />
      <ImportarModal abierto={importar} onCerrar={() => setImportar(false)} empresaId={empresa?.id || ""} />
      <NuevoChatModal abierto={!!nuevoChat} onCerrar={() => setNuevoChat(null)} precarga={nuevoChat} onCreada={(conv) => router.push(`/inbox?c=${encodeURIComponent(conv.id)}`)} />
      <Confirmar
        abierto={!!borrar}
        onCerrar={() => setBorrar(null)}
        peligro
        titulo={`¿Borrar a ${borrar?.nombre}?`}
        texto="Se borra la ficha. Los chats y pedidos quedan, pero sin ficha atada."
        confirmar="Sí, borrar"
        onConfirmar={async () => {
          if (!borrar) return;
          try {
            await getRepo().borrarContacto(borrar.id);
            avisar("Cliente borrado");
            setAbierto(null);
          } catch (e) {
            avisar(e, "error");
            throw e;
          }
        }}
      />
    </div>
  );
}

// ---------- nuevo cliente ----------
function NuevoContactoModal({ abierto, onCerrar, onCreado }: { abierto: boolean; onCerrar: () => void; onCreado: (c: Contacto) => void }) {
  const [form, setForm] = useState<FormContacto>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    if (abierto) setForm(FORM_VACIO);
  }, [abierto]);
  const puede = !!(form.nombre.trim() || form.telefono.trim() || form.email.trim());
  async function guardar() {
    if (!puede) return;
    setGuardando(true);
    try {
      const c = await getRepo().guardarContacto({ ...contactoDeForm(form), origen: "manual" });
      avisar("Cliente creado");
      onCerrar();
      onCreado(c);
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
      titulo="Nuevo cliente"
      pie={
        <>
          <button className="btn-ghost" onClick={onCerrar} disabled={guardando}>Cancelar</button>
          <button className="btn-primary" onClick={guardar} disabled={!puede || guardando}>
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
          </button>
        </>
      }
    >
      <CamposContacto form={form} onCambio={setForm} />
    </Modal>
  );
}

// ---------- importar CSV ----------
function ImportarModal({ abierto, onCerrar, empresaId }: { abierto: boolean; onCerrar: () => void; empresaId: string }) {
  const [resultado, setResultado] = useState<ImportacionResultado<Contacto> | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [importando, setImportando] = useState(false);
  useEffect(() => {
    if (abierto) {
      setResultado(null);
      setNombreArchivo("");
    }
  }, [abierto]);

  async function leer(f: File) {
    try {
      const texto = await leerArchivoTexto(f);
      setNombreArchivo(f.name);
      setResultado(parsearContactos(texto, empresaId));
    } catch (e) {
      avisar(e, "error");
    }
  }

  async function importar() {
    if (!resultado?.filas.length) return;
    setImportando(true);
    try {
      const r = await getRepo().importarContactos(resultado.filas);
      avisar(`Importados: ${r.nuevos} nuevos · ${r.actualizados} actualizados`);
      onCerrar();
    } catch (e) {
      avisar(e, "error");
    } finally {
      setImportando(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Importar clientes desde CSV"
      ancho="lg"
      pie={
        <>
          <button className="btn-ghost" onClick={onCerrar} disabled={importando}>Cancelar</button>
          <button className="btn-primary" onClick={importar} disabled={importando || !resultado?.filas.length}>
            {importando && <Loader2 className="h-4 w-4 animate-spin" />} Importar {resultado?.filas.length || ""}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-ink-400">
          Acepta coma o punto y coma y encabezados en español o inglés. Columnas: nombre, telefono, email, documento, direccion, localidad, provincia, cp, notas.{" "}
          <button className="font-semibold text-brand-300 hover:text-white" onClick={() => descargar("clientes-modelo.csv", MODELO_CSV)}>Descargar modelo</button>
        </p>
        <Campo etiqueta="Archivo" ayuda={nombreArchivo || undefined}>
          <input
            type="file"
            accept=".csv,.txt,text/csv"
            className="input file:mr-3 file:rounded-lg file:border-0 file:bg-ink-700 file:px-3 file:py-1 file:text-xs file:text-white"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) leer(f);
            }}
          />
        </Campo>
        {resultado && (
          <>
            <div className="text-xs text-ink-300">
              <b className="text-white">{resultado.filas.length}</b> filas listas
              {resultado.errores.length > 0 && <> · <span className="text-red-400">{resultado.errores.length} con problemas</span></>}
            </div>
            {resultado.errores.length > 0 && (
              <div className="max-h-28 overflow-y-auto rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">
                {resultado.errores.map((e, i) => (
                  <div key={i}>Línea {e.linea}: {e.motivo}</div>
                ))}
              </div>
            )}
            {resultado.filas.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-ink-700">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead>
                    <tr className="bg-ink-850 text-[10px] uppercase tracking-wider text-ink-500">
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Teléfono</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Localidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.filas.slice(0, 10).map((c) => (
                      <tr key={c.id} className="border-t border-ink-800">
                        <td className="px-3 py-1.5 text-ink-100">{c.nombre}</td>
                        <td className="px-3 py-1.5 font-mono text-ink-300">{c.telefono ? telefonoLindo(c.telefono) : ""}</td>
                        <td className="px-3 py-1.5 text-ink-300">{c.email || ""}</td>
                        <td className="px-3 py-1.5 text-ink-300">{c.localidad || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {resultado.filas.length > 10 && <div className="border-t border-ink-800 px-3 py-1.5 text-[11px] text-ink-500">… y {resultado.filas.length - 10} más</div>}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
