import Link from "next/link";
import Marca from "./Marca";

// Pie de la landing, Docs, Privacidad y Términos.
export default function SitioPie() {
  return (
    <footer className="border-t border-ink-800/70 bg-ink-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <Marca chico />
          <span className="text-sm text-ink-400">Clientany © 2026 · El CRM para empresas que venden por chat</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-300" aria-label="Pie de página">
          <Link href="/docs" className="hover:text-white">Docs</Link>
          <Link href="/privacidad" className="hover:text-white">Privacidad</Link>
          <Link href="/terminos" className="hover:text-white">Términos</Link>
          <a href="mailto:hola@clientany.com" className="hover:text-white">hola@clientany.com</a>
        </nav>
      </div>
    </footer>
  );
}
