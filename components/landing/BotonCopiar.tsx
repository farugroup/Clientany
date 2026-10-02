"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// Copia un texto al portapapeles (bloques de código de Docs).
export default function BotonCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      // Sin permiso de portapapeles: no hacemos nada, el texto se puede seleccionar a mano.
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-ink-400 transition hover:bg-ink-800 hover:text-white"
      aria-label={copiado ? "Copiado" : "Copiar"}
    >
      {copiado ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copiado ? "Copiado" : "Copiar"}
    </button>
  );
}
