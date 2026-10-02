import type { ReactNode } from "react";

// Encabezado de cada sección de la landing: etiqueta chica, título y bajada.
export default function TituloSeccion({
  etiqueta,
  titulo,
  bajada,
  centrado = true,
}: {
  etiqueta: string;
  titulo: ReactNode;
  bajada?: ReactNode;
  centrado?: boolean;
}) {
  return (
    <div className={centrado ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <span className="inline-flex items-center rounded-full border border-brand-500/25 bg-brand-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-200">
        {etiqueta}
      </span>
      <h2 className="mt-4 text-[28px] font-extrabold leading-tight tracking-tight text-white sm:text-4xl">{titulo}</h2>
      {bajada && <p className="mt-3 text-base leading-relaxed text-ink-300 sm:text-lg">{bajada}</p>}
    </div>
  );
}
