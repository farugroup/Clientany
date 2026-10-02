"use client";
// Importar un CSV con vista previa: elegir archivo → ver 10 filas, los
// errores por línea y el separador detectado → «Importar N».
import { useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Download, FileSpreadsheet, Upload } from "lucide-react";
import type { ImportacionResultado } from "@/lib/crm/csv";
import { BotonCargando, Modal, avisar, descargar, leerArchivoTexto } from "@/components/crm/ui";

export interface ColumnaPrevia<T> {
  titulo: string;
  celda: (fila: T) => ReactNode;
  className?: string;
}

const NOMBRE_SEPARADOR: Record<string, string> = { ",": "coma", ";": "punto y coma", "\t": "tabulación" };

export function ImportarCsvModal<T>({
  onCerrar,
  titulo,
  ayuda,
  modeloNombre,
  modeloContenido,
  parsear,
  columnas,
  importar,
  cosa,
}: {
  onCerrar: () => void;
  titulo: string;
  ayuda?: ReactNode;
  modeloNombre: string;
  modeloContenido: string;
  parsear: (texto: string) => ImportacionResultado<T>;
  columnas: ColumnaPrevia<T>[];
  importar: (filas: T[]) => Promise<{ nuevos: number; actualizados: number }>;
  cosa: string; // "pedidos", "productos"
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<string>("");
  const [res, setRes] = useState<ImportacionResultado<T> | null>(null);
  const [cargando, setCargando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);

  async function leer(f: File | undefined | null) {
    if (!f) return;
    try {
      const texto = await leerArchivoTexto(f);
      setArchivo(f.name);
      setRes(parsear(texto));
    } catch (e) {
      avisar(e, "error");
    }
  }

  async function confirmar() {
    if (!res?.filas.length) return;
    setCargando(true);
    try {
      const r = await importar(res.filas);
      avisar(`Listo: ${r.nuevos} ${cosa} nuevos y ${r.actualizados} actualizados.`);
      onCerrar();
    } catch (e) {
      avisar(e, "error");
    } finally {
      setCargando(false);
    }
  }

  const n = res?.filas.length || 0;
  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={titulo}
      ancho="xl"
      pie={
        <>
          <button className="btn-ghost mr-auto" onClick={() => descargar(modeloNombre, modeloContenido)}>
            <Download className="h-4 w-4" /> Descargar modelo
          </button>
          <button className="btn-ghost" onClick={onCerrar} disabled={cargando}>
            Cancelar
          </button>
          <BotonCargando cargando={cargando} disabled={!n} onClick={confirmar}>
            <Upload className="h-4 w-4" /> {n ? `Importar ${n}` : "Importar"}
          </BotonCargando>
        </>
      }
    >
      <div className="space-y-4">
        {ayuda && <p className="text-sm text-ink-300">{ayuda}</p>}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            leer(e.dataTransfer.files?.[0]);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-center transition ${
            arrastrando ? "border-brand-500 bg-brand-500/10" : "border-ink-700 bg-ink-850/60"
          }`}
        >
          <FileSpreadsheet className="h-7 w-7 text-ink-400" />
          <div className="text-sm text-ink-200">
            {archivo ? (
              <>
                Archivo: <span className="font-semibold text-white">{archivo}</span>
              </>
            ) : (
              "Arrastrá el CSV acá o elegilo desde la compu"
            )}
          </div>
          <button type="button" className="btn-soft py-2 text-xs" onClick={() => inputRef.current?.click()}>
            {archivo ? "Elegir otro archivo" : "Elegir archivo"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.txt,text/csv"
            className="hidden"
            onChange={(e) => {
              leer(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <p className="text-[11px] text-ink-500">Coma, punto y coma o tabulación. Encabezados en español o inglés, en cualquier orden.</p>
        </div>

        {res && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="chip bg-ink-800 text-ink-200">
                Separador: <b className="text-white">{NOMBRE_SEPARADOR[res.separador] || res.separador}</b>
              </span>
              <span className="chip bg-ink-800 text-ink-200">
                Filas válidas: <b className="text-white">{n}</b>
              </span>
              {res.errores.length > 0 && <span className="chip bg-red-500/10 text-red-400">{res.errores.length} con problemas</span>}
              {res.encabezados.length > 0 && <span className="min-w-0 truncate text-ink-500">Columnas: {res.encabezados.join(", ")}</span>}
            </div>

            {res.errores.length > 0 && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> Estas líneas no se van a importar
                </div>
                <ul className="max-h-32 space-y-0.5 overflow-y-auto text-xs text-ink-300">
                  {res.errores.slice(0, 30).map((er, i) => (
                    <li key={i}>
                      <span className="font-mono text-ink-400">Línea {er.linea}:</span> {er.motivo}
                    </li>
                  ))}
                  {res.errores.length > 30 && <li className="text-ink-500">… y {res.errores.length - 30} más.</li>}
                </ul>
              </div>
            )}

            {n > 0 && (
              <div>
                <div className="mb-1.5 text-xs text-ink-400">Vista previa {n > 10 ? `(10 de ${n})` : `(${n})`}</div>
                <div className="no-scrollbar overflow-x-auto rounded-xl border border-ink-800">
                  <table className="w-full min-w-[560px] text-left text-xs">
                    <thead>
                      <tr>
                        {columnas.map((c) => (
                          <th key={c.titulo} className="border-b border-ink-800 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ink-500">
                            {c.titulo}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {res.filas.slice(0, 10).map((f, i) => (
                        <tr key={i}>
                          {columnas.map((c) => (
                            <td key={c.titulo} className={`border-b border-ink-800/60 px-3 py-2 text-ink-200 ${c.className || ""}`}>
                              {c.celda(f)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-1.5 text-[11px] text-ink-500">Si ya existe uno con la misma llave, se actualiza; si no, se crea.</p>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
