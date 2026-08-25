"use client";

import { useState, useRef, useEffect } from "react";
import { Menu, Search, Bell, Plus, Settings, LogOut, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { useData } from "@/lib/data-store";
import { useAuth } from "@/lib/cloud-sync";
import { navItems } from "@/lib/nav";

export default function Topbar() {
  const setSidebarOpen = useApp((s) => s.setSidebarOpen);
  const settings = useData((s) => s.settings);
  const { user, signOut, configured } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initials =
    (settings.ownerName || settings.businessName || "Clientany")
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "CA";
  const pathname = usePathname();
  const current =
    navItems.find((n) =>
      n.href === "/panel" ? pathname === "/panel" : pathname.startsWith(n.href)
    ) ?? navItems[0];

  async function handleLogout() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-ink-800 bg-ink-950/80 px-4 py-3 backdrop-blur-xl lg:px-6">
      <button
        className="rounded-lg p-2 text-ink-300 hover:bg-ink-800 lg:hidden"
        onClick={() => setSidebarOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        <current.icon className="hidden h-5 w-5 text-brand-300 sm:block" />
        <h1 className="text-base font-bold text-white lg:text-lg">{current.label}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            placeholder="Buscar cliente, orden, mensaje…"
            className="input w-64 pl-9 lg:w-80"
          />
        </div>
        <button className="relative rounded-xl border border-ink-700 bg-ink-850 p-2.5 text-ink-300 hover:bg-ink-800">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-ink-950" />
        </button>
        <Link href="/channels" className="btn-primary hidden sm:inline-flex">
          <Plus className="h-4 w-4" /> Conectar canal
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white"
            title="Mi cuenta"
          >
            {initials}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 animate-fade-in rounded-xl border border-ink-700 bg-ink-850 p-1.5 shadow-card">
              <div className="border-b border-ink-800 px-3 py-2">
                <div className="truncate text-sm font-semibold text-white">
                  {settings.ownerName || settings.businessName || "Mi cuenta"}
                </div>
                <div className="truncate text-xs text-ink-400">
                  {user?.email ?? (configured ? "—" : "Modo demo")}
                </div>
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
    </header>
  );
}
