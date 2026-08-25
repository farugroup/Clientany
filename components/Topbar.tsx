"use client";

import { Menu, Search, Bell, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { useData } from "@/lib/data-store";
import { navItems } from "@/lib/nav";

export default function Topbar() {
  const setSidebarOpen = useApp((s) => s.setSidebarOpen);
  const settings = useData((s) => s.settings);
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
      n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)
    ) ?? navItems[0];

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
        <Link
          href="/ajustes"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white"
          title="Configuración"
        >
          {initials}
        </Link>
      </div>
    </header>
  );
}
