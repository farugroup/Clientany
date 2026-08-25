"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Sparkles } from "lucide-react";
import { navItems, groupLabels } from "@/lib/nav";
import { useApp } from "@/lib/store";
import { useData } from "@/lib/data-store";
import BrandSwitcher from "./BrandSwitcher";

function useBadges() {
  const activeBrandId = useApp((s) => s.activeBrandId);
  const channels = useData((s) => s.channels);
  const abandonedCarts = useData((s) => s.carts);
  const mlQuestions = useData((s) => s.mlQuestions);
  const inBrand = <T extends { brandId: string }>(arr: T[]) =>
    activeBrandId === "all" ? arr : arr.filter((i) => i.brandId === activeBrandId);
  return {
    inbox: inBrand(channels).reduce((s, c) => s + c.unread, 0),
    carts: inBrand(abandonedCarts).filter((c) => c.recoveryStatus === "nuevo").length,
    ml: inBrand(mlQuestions).filter((q) => !q.answered).length,
  };
}

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useApp();
  const badges = useBadges();

  const groups = ["principal", "canales", "crecimiento", "cuenta"] as const;

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-ink-800 bg-ink-900/95 backdrop-blur-xl transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/panel" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-extrabold leading-none tracking-tight text-white">
                Clientany
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-ink-400">
                CRM multicanal
              </div>
            </div>
          </Link>
          <button
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Brand switcher */}
        <div className="px-4 pb-2">
          <BrandSwitcher />
        </div>

        {/* Nav */}
        <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-2">
          {groups.map((group) => (
            <div key={group} className="mb-4">
              <div className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-wider text-ink-500">
                {groupLabels[group]}
              </div>
              {navItems
                .filter((n) => n.group === group)
                .map((item) => {
                  const active =
                    item.href === "/panel"
                      ? pathname === "/panel"
                      : pathname.startsWith(item.href);
                  const badge = item.badgeKey ? badges[item.badgeKey] : 0;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`group mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        active
                          ? "bg-brand-500/15 text-white"
                          : "text-ink-300 hover:bg-ink-800 hover:text-white"
                      }`}
                    >
                      <Icon
                        className={`h-[18px] w-[18px] shrink-0 ${
                          active ? "text-brand-300" : "text-ink-400 group-hover:text-ink-200"
                        }`}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge > 0 && (
                        <span
                          className={`chip ${
                            active
                              ? "bg-brand-500 text-white"
                              : "bg-ink-700 text-ink-100"
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>

        {/* Footer / plan */}
        <div className="border-t border-ink-800 p-4">
          <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4 text-brand-300" /> Plan Growth
            </div>
            <p className="mt-1 text-xs text-ink-400">
              Canales, marcas y usuarios ilimitados. IA de respuestas incluida.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
