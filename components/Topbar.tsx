"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Menu, Search, Bell, Plus, Settings, LogOut, User, Sparkles, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { useData } from "@/lib/data-store";
import { useAuth } from "@/lib/cloud-sync";
import { useCrm } from "@/lib/crm/repo";
import { itemActual } from "@/lib/nav";
import { useSinResponder } from "./Sidebar";

function inicialesDe(nombre: string): string {
  return (
    nombre
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "CA"
  );
}

export default function Topbar() {
  const setSidebarOpen = useApp((s) => s.setSidebarOpen);
  const settings = useData((s) => s.settings);
  const yo = useCrm((s) => s.yo);
  const { user, signOut, configured } = useAuth();
  const sinResponder = useSinResponder();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");
  const [buscarCelu, setBuscarCelu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const nombre = yo?.nombre || settings.ownerName || settings.businessName || "Mi cuenta";
  const email = user?.email || yo?.email || "";
  const iniciales = inicialesDe(yo?.nombre || settings.ownerName || settings.businessName || "Clientany");
  const actual = itemActual(pathname);
  const Icono = actual?.icon ?? Sparkles;

  function buscar(e: FormEvent) {
    e.preventDefault();
    const texto = q.trim();
    router.push(texto ? `/inbox?q=${encodeURIComponent(texto)}` : "/inbox");
    setBuscarCelu(false);
  }

  async function handleLogout() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
        <button
          className="rounded-lg p-2 text-ink-300 hover:bg-ink-800 lg:hidden"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 items-center gap-2">
          <Icono className="hidden h-5 w-5 shrink-0 text-brand-300 sm:block" />
          <h1 className="truncate text-base font-bold text-white lg:text-lg">{actual?.label ?? "Clientany"}</h1>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <form onSubmit={buscar} className="relative hidden md:block" role="search">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar cliente, pedido o mensaje…"
              aria-label="Buscar en la bandeja"
              className="input w-64 pl-9 lg:w-80"
            />
          </form>
          <button
            type="button"
            onClick={() => setBuscarCelu((v) => !v)}
            className="rounded-xl border border-ink-700 bg-ink-850 p-2.5 text-ink-300 hover:bg-ink-800 md:hidden"
            aria-label={buscarCelu ? "Cerrar búsqueda" : "Buscar"}
            aria-expanded={buscarCelu}
          >
            {buscarCelu ? <X className="h-[18px] w-[18px]" /> : <Search className="h-[18px] w-[18px]" />}
          </button>
          <Link
            href="/inbox"
            className="relative rounded-xl border border-ink-700 bg-ink-850 p-2.5 text-ink-300 hover:bg-ink-800"
            title={sinResponder > 0 ? `${sinResponder} ${sinResponder === 1 ? "chat" : "chats"} sin responder` : "Nada sin responder"}
            aria-label={sinResponder > 0 ? `${sinResponder} chats sin responder` : "Bandeja: nada sin responder"}
          >
            <Bell className="h-[18px] w-[18px]" />
            {sinResponder > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white ring-2 ring-ink-950">
                {sinResponder > 99 ? "99+" : sinResponder}
              </span>
            )}
          </Link>
          <Link href="/conexiones" className="btn-primary hidden sm:inline-flex">
            <Plus className="h-4 w-4" /> Conectar canal
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white"
              title="Mi cuenta"
              aria-label="Mi cuenta"
              aria-expanded={menuOpen}
            >
              {iniciales}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-60 animate-fade-in rounded-xl border border-ink-700 bg-ink-850 p-1.5 shadow-card">
                <div className="border-b border-ink-800 px-3 py-2">
                  <div className="truncate text-sm font-semibold text-white">{nombre}</div>
                  <div className="truncate text-xs text-ink-400">{email || (configured ? "sin dato" : "Modo demo")}</div>
                  {!configured && email && (
                    <span className="chip mt-1.5 bg-ink-800 px-2 py-0.5 text-[10px] text-ink-300">Modo demo</span>
                  )}
                </div>
                <Link
                  href="/ajustes"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-200 hover:bg-ink-800"
                >
                  <Settings className="h-4 w-4 text-ink-400" /> Configuración
                </Link>
                {configured && user ? (
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" /> Cerrar sesión
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-200 hover:bg-ink-800"
                  >
                    <User className="h-4 w-4 text-ink-400" /> Ingresar / Registrarse
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {buscarCelu && (
        <form onSubmit={buscar} className="relative px-4 pb-3 md:hidden" role="search">
          <Search className="pointer-events-none absolute left-7 top-[calc(50%-6px)] h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente, pedido o mensaje…"
            aria-label="Buscar en la bandeja"
            enterKeyHint="search"
            className="input pl-9"
          />
        </form>
      )}
    </header>
  );
}
