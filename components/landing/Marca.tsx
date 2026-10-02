import Link from "next/link";
import { Sparkles } from "lucide-react";

// El logo de Clientany: el cuadrado azul con el destello y la palabra.
export default function Marca({ href = "/", chico = false }: { href?: string; chico?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Clientany, ir al inicio">
      <span
        className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow ${
          chico ? "h-8 w-8" : "h-9 w-9"
        }`}
      >
        <Sparkles className={chico ? "h-4 w-4 text-white" : "h-5 w-5 text-white"} />
      </span>
      <span className="leading-none">
        <span className={`block font-extrabold tracking-tight text-white ${chico ? "text-base" : "text-lg"}`}>Clientany</span>
        {!chico && (
          <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wider text-ink-400">CRM multicanal</span>
        )}
      </span>
    </Link>
  );
}
