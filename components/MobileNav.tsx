"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Inbox, Truck, ShoppingCart, Megaphone } from "lucide-react";
import { useApp } from "@/lib/store";
import { useData } from "@/lib/data-store";

const items = [
  { href: "/panel", label: "Panel", icon: LayoutDashboard },
  { href: "/inbox", label: "Bandeja", icon: Inbox, badge: "inbox" as const },
  { href: "/tracking", label: "Envíos", icon: Truck },
  { href: "/carritos", label: "Carritos", icon: ShoppingCart, badge: "carts" as const },
  { href: "/campanas", label: "Campañas", icon: Megaphone },
];

export default function MobileNav() {
  const pathname = usePathname();
  const activeBrandId = useApp((s) => s.activeBrandId);
  const channels = useData((s) => s.channels);
  const abandonedCarts = useData((s) => s.carts);
  const inBrand = <T extends { brandId: string }>(arr: T[]) =>
    activeBrandId === "all" ? arr : arr.filter((i) => i.brandId === activeBrandId);
  const badges = {
    inbox: inBrand(channels).reduce((s, c) => s + c.unread, 0),
    carts: inBrand(abandonedCarts).filter((c) => c.recoveryStatus === "nuevo").length,
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-ink-800 bg-ink-950/95 backdrop-blur-xl lg:hidden">
      <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active =
            item.href === "/panel" ? pathname === "/panel" : pathname.startsWith(item.href);
          const badge = item.badge ? badges[item.badge] : 0;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${
                active ? "text-brand-300" : "text-ink-400"
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badge > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </div>
              {item.label}
              {active && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
