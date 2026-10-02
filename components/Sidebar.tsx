"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Sparkles, ChevronRight } from "lucide-react";
import { navItems, navGroups, groupLabels, esRutaActiva } from "@/lib/nav";
import { useApp } from "@/lib/store";
import { useData } from "@/lib/data-store";
import { useCrm } from "@/lib/crm/repo";
import { contarGrupos } from "@/lib/crm/core";
import type { Empresa, Plan } from "@/lib/crm/types";
import BrandSwitcher from "./BrandSwitcher";

// Chats sin responder de la marca activa (igual criterio que la Bandeja:
// un chat sin marca se ve en todas).
export function useSinResponder(): number {
  const activeBrandId = useApp((s) => s.activeBrandId);
  const conversaciones = useCrm((s) => s.conversaciones);
  return useMemo(() => {
    const lista =
      activeBrandId === "all"
        ? conversaciones
        : conversaciones.filter((c) => !c.marca_id || c.marca_id === activeBrandId);
    return contarGrupos(lista).sin_responder;
  }, [conversaciones, activeBrandId]);
}

function useBadges() {
  const activeBrandId = useApp((s) => s.activeBrandId);
  const abandonedCarts = useData((s) => s.carts);
  const mlQuestions = useData((s) => s.mlQuestions);
  const inbox = useSinResponder();
  const inBrand = <T extends { brandId: string }>(arr: T[]) =>
    activeBrandId === "all" ? arr : arr.filter((i) => i.brandId === activeBrandId);
  return {
    inbox,
    carts: inBrand(abandonedCarts).filter((c) => c.recoveryStatus === "nuevo").length,
    ml: inBrand(mlQuestions).filter((q) => !q.answered).length,
  };
}

const NOMBRE_PLAN: Record<Plan, string> = {
  prueba: "Prueba",
  inicial: "Inicial",
  pro: "Pro",
  empresa: "Empresa",
};

const DETALLE_PLAN: Record<Plan, string> = {
  prueba: "Todas las funciones, sin tarjeta. Elegí tu plan antes de que termine.",
  inicial: "1 número de WhatsApp, Instagram y Messenger, 3 usuarios.",
  pro: "3 números, 10 usuarios, 3 marcas, API e IA incluida.",
  empresa: "Números, usuarios y marcas ilimitados.",
};

function diaMes(iso: string, zona?: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", timeZone: zona });
  } catch {
    return "";
  }
}

function textoPlan(empresa: Empresa): { titulo: string; detalle: string; vencida: boolean } {
  if (empresa.plan === "prueba") {
    if (!empresa.prueba_hasta) return { titulo: "Plan Prueba", detalle: DETALLE_PLAN.prueba, vencida: false };
    const fecha = diaMes(empresa.prueba_hasta, empresa.horario?.zona);
    const vencida = new Date(empresa.prueba_hasta).getTime() < Date.now();
    return vencida
      ? { titulo: `Plan Prueba · venció el ${fecha}`, detalle: "Elegí un plan para seguir atendiendo.", vencida: true }
      : { titulo: `Plan Prueba · hasta ${fecha}`, detalle: DETALLE_PLAN.prueba, vencida: false };
  }
  return { titulo: `Plan ${NOMBRE_PLAN[empresa.plan] ?? empresa.plan}`, detalle: DETALLE_PLAN[empresa.plan] ?? "", vencida: false };
}

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useApp();
  const badges = useBadges();
  const empresa = useCrm((s) => s.empresa);
  const plan = empresa ? textoPlan(empresa) : null;

  return (
    <>
      {/* Fondo oscuro en el celular */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-ink-800 bg-ink-900/95 backdrop-blur-xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:shrink-0 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <Link href="/panel" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-extrabold leading-none tracking-tight text-white">Clientany</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-ink-400">CRM multicanal</div>
            </div>
          </Link>
          <button
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Selector de marca */}
        <div className="px-4 pb-2">
          <BrandSwitcher />
        </div>

        {/* Menú */}
        <nav className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6 [mask-image:linear-gradient(to_bottom,black_calc(100%-1.5rem),transparent)]">
          {navGroups.map((group) => (
            <div key={group} className="mt-2">
              <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-ink-500">
                {groupLabels[group]}
              </div>
              {navItems
                .filter((n) => n.group === group)
                .map((item) => {
                  const active = esRutaActiva(item.href, pathname);
                  const badge = item.badgeKey ? badges[item.badgeKey] : 0;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-1.5 text-[13.5px] font-medium transition lg:py-[7px] ${
                        active ? "bg-brand-500/15 text-white" : "text-ink-300 hover:bg-ink-800 hover:text-white"
                      }`}
                    >
                      <Icon
                        className={`h-[17px] w-[17px] shrink-0 ${
                          active ? "text-brand-300" : "text-ink-400 group-hover:text-ink-200"
                        }`}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge > 0 && (
                        <span
                          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                            active ? "bg-brand-500 text-white" : "bg-ink-700 text-ink-100"
                          }`}
                          title={item.badgeKey === "inbox" ? `${badge} sin responder` : undefined}
                        >
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>

        {/* Pie: el plan de la empresa */}
        <div className="border-t border-ink-800 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Link
            href="/ajustes#plan"
            onClick={() => setSidebarOpen(false)}
            className={`group block rounded-xl border p-3 transition ${
              plan?.vencida
                ? "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
                : "border-brand-500/20 bg-brand-500/5 hover:bg-brand-500/10"
            }`}
          >
            {plan ? (
              <>
                <div className="flex items-start gap-2 text-[13px] font-semibold leading-snug text-white">
                  <Sparkles className={`mt-px h-4 w-4 shrink-0 ${plan.vencida ? "text-amber-300" : "text-brand-300"}`} />
                  <span className="min-w-0 flex-1">{plan.titulo}</span>
                  <ChevronRight className="mt-px h-4 w-4 shrink-0 text-ink-500 transition group-hover:translate-x-0.5 group-hover:text-ink-300" />
                </div>
                {plan.detalle && <p className="mt-1 hidden pl-6 text-xs leading-snug text-ink-400 sm:block">{plan.detalle}</p>}
              </>
            ) : (
              <div className="space-y-2" aria-label="Cargando tu plan">
                <div className="h-3.5 w-32 animate-pulse rounded bg-ink-800" />
                <div className="h-3 w-44 animate-pulse rounded bg-ink-800/70" />
              </div>
            )}
          </Link>
        </div>
      </aside>
    </>
  );
}
