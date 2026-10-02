import type { ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import SitioNav from "./SitioNav";
import SitioPie from "./SitioPie";

// Armazón de las páginas de texto largo (Privacidad, Términos): el nav de la
// landing, un encabezado, el índice (plegable en el celular, fijo al costado
// en la compu) y el pie.
export default function PaginaTexto({
  etiqueta,
  icono: Icono,
  titulo,
  bajada,
  actualizado,
  indice,
  children,
}: {
  etiqueta: string;
  icono: LucideIcon;
  titulo: string;
  bajada: ReactNode;
  actualizado: string;
  indice: { id: string; titulo: string }[];
  children: ReactNode;
}) {
  const lista = (
    <ul className="space-y-0.5 text-sm">
      {indice.map((s) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className="block rounded-lg px-3 py-1.5 text-ink-300 transition hover:bg-ink-850 hover:text-white">
            {s.titulo}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-screen overflow-x-clip bg-ink-950 text-ink-100">
      <SitioNav />
      <header className="relative border-b border-ink-800/70">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-80 w-[820px] -translate-x-1/2 rounded-full bg-brand-500/[0.12] blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-16">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/25 bg-brand-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-200">
            <Icono className="h-3.5 w-3.5" /> {etiqueta}
          </span>
          <h1 className="mt-4 text-[32px] font-extrabold leading-tight tracking-tight text-white sm:text-5xl">{titulo}</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-300 sm:text-lg">{bajada}</p>
          <p className="mt-4 text-xs text-ink-500">Última actualización: {actualizado}</p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-12 lg:px-6 lg:py-14">
        <details className="group mb-8 rounded-2xl border border-ink-700/60 bg-ink-900/80 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-white [&::-webkit-details-marker]:hidden">
            En esta página
            <ChevronDown className="h-4 w-4 text-ink-400 transition group-open:rotate-180" />
          </summary>
          <nav className="border-t border-ink-800 px-1 py-2" aria-label="Índice">
            {lista}
          </nav>
        </details>
        <aside className="hidden lg:block">
          <nav className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-6" aria-label="Índice">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-ink-500">En esta página</div>
            {lista}
          </nav>
        </aside>
        <article className="min-w-0 max-w-3xl space-y-10">{children}</article>
      </div>
      <SitioPie />
    </div>
  );
}
