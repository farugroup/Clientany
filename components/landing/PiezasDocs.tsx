import type { ReactNode } from "react";
import { CircleAlert, Info, Lightbulb } from "lucide-react";
import BotonCopiar from "./BotonCopiar";

// Piezas de las páginas de texto (Docs, Privacidad, Términos).

export function C({ children }: { children: ReactNode }) {
  return (
    <code className="break-words rounded-md border border-ink-700/60 bg-ink-850 px-1.5 py-0.5 font-mono text-[0.86em] text-brand-200">
      {children}
    </code>
  );
}

export function Codigo({ children, titulo }: { children: string; titulo?: string }) {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-ink-800 bg-ink-900">
      <div className="flex items-center justify-between border-b border-ink-800 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-500">{titulo || "código"}</span>
        <BotonCopiar texto={children} />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-ink-100">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export function Nota({ children, tipo = "info" }: { children: ReactNode; tipo?: "info" | "ojo" | "tip" }) {
  const estilos =
    tipo === "ojo"
      ? { caja: "border-amber-500/30 bg-amber-500/[0.06]", icono: <CircleAlert className="h-4 w-4 text-amber-300" /> }
      : tipo === "tip"
        ? { caja: "border-green-500/25 bg-green-500/[0.05]", icono: <Lightbulb className="h-4 w-4 text-green-300" /> }
        : { caja: "border-brand-500/25 bg-brand-500/[0.06]", icono: <Info className="h-4 w-4 text-brand-300" /> };
  return (
    <div className={`my-4 flex gap-3 rounded-xl border p-4 text-sm leading-relaxed text-ink-200 ${estilos.caja}`}>
      <span className="mt-0.5 shrink-0">{estilos.icono}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Pasos({ children }: { children: ReactNode }) {
  return <ol className="my-5 space-y-5 [counter-reset:paso]">{children}</ol>;
}

export function Paso({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <li className="relative pl-11 [counter-increment:paso] before:absolute before:left-0 before:top-0 before:flex before:h-7 before:w-7 before:items-center before:justify-center before:rounded-full before:bg-brand-500/15 before:text-[13px] before:font-bold before:text-brand-200 before:content-[counter(paso)]">
      <h4 className="pt-0.5 text-[15px] font-semibold text-white">{titulo}</h4>
      {children && <div className="mt-1.5 text-[14.5px] leading-relaxed text-ink-300">{children}</div>}
    </li>
  );
}

export function Seccion({ id, titulo, bajada, children }: { id: string; titulo: string; bajada?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-ink-800/70 pt-10 first:border-t-0 first:pt-0">
      <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-[28px]">
        <a href={`#${id}`} className="hover:text-brand-200">
          {titulo}
        </a>
      </h2>
      {bajada && <p className="mt-2 text-[15px] text-ink-400">{bajada}</p>}
      <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-ink-300">{children}</div>
    </section>
  );
}

export function Sub({ id, titulo, children }: { id?: string; titulo: string; children: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-24 pt-4">
      <h3 className="text-lg font-bold text-white">{titulo}</h3>
      <div className="mt-2 space-y-4">{children}</div>
    </div>
  );
}

export function TablaSimple({ cabecera, filas }: { cabecera: string[]; filas: ReactNode[][] }) {
  return (
    <div className="relative my-4 overflow-x-auto rounded-xl border border-ink-800">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead className="bg-ink-900">
          <tr>
            {cabecera.map((c) => (
              <th key={c} scope="col" className="border-b border-ink-800 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-b border-ink-800/70 align-top last:border-b-0">
              {f.map((celda, j) => (
                <td key={j} className="px-4 py-2.5 text-ink-200">
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
