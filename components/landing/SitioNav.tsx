"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import Marca from "./Marca";

// Links a las secciones de la landing. Con `/#…` funcionan igual desde la
// landing (sólo hace scroll) y desde Docs, Privacidad o Términos.
const LINKS = [
  { href: "/#funciones", label: "Funciones" },
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/#precios", label: "Precios" },
  { href: "/#preguntas", label: "Preguntas" },
  { href: "/docs", label: "Docs" },
];

export default function SitioNav() {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();

  // Al cambiar de página, el menú del celular se cierra solo.
  useEffect(() => setAbierto(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-800/70 bg-ink-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 lg:px-6">
        <Marca />
        <nav className="ml-6 hidden items-center gap-6 text-sm font-medium text-ink-300 lg:flex" aria-label="Secciones">
          {LINKS.map((l) =>
            l.href.startsWith("/#") ? (
              <a key={l.href} href={l.href} className="transition hover:text-white">
                {l.label}
              </a>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                className={`transition hover:text-white ${pathname?.startsWith(l.href) ? "text-white" : ""}`}
              >
                {l.label}
              </Link>
            )
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/login" className="hidden px-2 text-sm font-medium text-ink-300 transition hover:text-white xl:inline">
            Ingresar
          </Link>
          <Link href="/inbox" className="btn-ghost hidden px-4 py-2 sm:inline-flex">
            Ver demo
          </Link>
          <Link href="/registro" className="btn-primary px-3.5 py-2 sm:px-4">
            Empezar gratis <ArrowRight className="hidden h-4 w-4 sm:block" />
          </Link>
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            className="rounded-lg p-2 text-ink-300 transition hover:bg-ink-800 hover:text-white lg:hidden"
            aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={abierto}
            aria-controls="menu-sitio"
          >
            {abierto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {abierto && (
        <div id="menu-sitio" className="animate-fade-in border-t border-ink-800/70 bg-ink-950 lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-3" aria-label="Secciones">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setAbierto(false)}
                className="rounded-lg px-3 py-3 text-[15px] font-medium text-ink-200 transition hover:bg-ink-850 hover:text-white"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-ink-800/70 pt-3">
              <Link href="/inbox" className="btn-ghost w-full">
                Ver demo
              </Link>
              <Link href="/login" className="btn-ghost w-full">
                Ingresar
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
