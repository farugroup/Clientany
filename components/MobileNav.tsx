"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Inbox, Package, Boxes, Menu, type LucideIcon } from "lucide-react";
import { useApp } from "@/lib/store";
import { esRutaActiva } from "@/lib/nav";
import { useSinResponder } from "./Sidebar";

const items: { href: string; label: string; icon: LucideIcon; badge?: "inbox" }[] = [
  { href: "/panel", label: "Panel", icon: LayoutDashboard },
  { href: "/inbox", label: "Bandeja", icon: Inbox, badge: "inbox" },
  { href: "/pedidos", label: "Pedidos", icon: Package },
  { href: "/stock", label: "Stock", icon: Boxes },
];

export default function MobileNav() {
  const pathname = usePathname();
  const sidebarOpen = useApp((s) => s.sidebarOpen);
  const setSidebarOpen = useApp((s) => s.setSidebarOpen);
  const sinResponder = useSinResponder();
  // «Más» queda marcado cuando la pantalla actual no es ninguna de las cuatro.
  const enOtra = !items.some((i) => esRutaActiva(i.href, pathname));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-ink-800 bg-ink-950/95 backdrop-blur-xl lg:hidden">
      <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active = esRutaActiva(item.href, pathname);
          const badge = item.badge === "inbox" ? sinResponder : 0;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${
                active ? "text-brand-300" : "text-ink-400"
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badge > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              {item.label}
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-400" />}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir el menú completo"
          aria-expanded={sidebarOpen}
          className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${
            enOtra || sidebarOpen ? "text-brand-300" : "text-ink-400"
          }`}
        >
          <Menu className="h-5 w-5" />
          Más
          {enOtra && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-400" />}
        </button>
      </div>
    </nav>
  );
}
