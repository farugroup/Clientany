"use client";

import Link from "next/link";
import {
  MessageSquare,
  DollarSign,
  ShoppingCart,
  Truck,
  TrendingUp,
  Zap,
  ArrowRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { StatCard, SectionTitle, Pill } from "@/components/ui";
import { RevenueChart, ChannelsChart } from "@/components/DashboardCharts";
import { useApp, brandById } from "@/lib/store";
import { useData } from "@/lib/data-store";
import { channelMeta, orderStatusMeta } from "@/lib/channels";
import { money, compactMoney, timeAgo, num } from "@/lib/format";

export default function Dashboard() {
  const activeBrandId = useApp((s) => s.activeBrandId);
  const channels = useData((s) => s.channels);
  const conversations = useData((s) => s.conversations);
  const abandonedCarts = useData((s) => s.carts);
  const orders = useData((s) => s.orders);
  const campaigns = useData((s) => s.campaigns);
  const storeConnections = useData((s) => s.stores);
  const settings = useData((s) => s.settings);
  const scope = activeBrandId === "all" ? "todas tus marcas" : brandById(activeBrandId)?.name;
  const inBrand = <T extends { brandId: string }>(arr: T[]) =>
    activeBrandId === "all" ? arr : arr.filter((i) => i.brandId === activeBrandId);

  const myChannels = inBrand(channels);
  const myConvos = inBrand(conversations);
  const myCarts = inBrand(abandonedCarts);
  const myCampaigns = inBrand(campaigns);
  const myStores = inBrand(storeConnections);

  const unread = myChannels.reduce((s, c) => s + c.unread, 0);
  const recoveredRevenue = myCampaigns
    .filter((c) => c.channel === "whatsapp")
    .reduce((s, c) => s + c.revenue, 0);
  const cartsValue = myCarts
    .filter((c) => c.recoveryStatus === "nuevo")
    .reduce((s, c) => s + c.total, 0);
  const ordersToday = myStores.reduce((s, st) => s + st.ordersToday, 0);
  const campaignRevenue = myCampaigns.reduce((s, c) => s + c.revenue, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="card overflow-hidden">
        <div className="relative flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, #3563ff, transparent 70%)" }}
          />
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="chip bg-green-500/10 text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> En vivo
              </span>
              <span className="text-xs text-ink-400">Vista de {scope}</span>
            </div>
            <h1 className="mt-2 text-xl font-extrabold tracking-tight text-white lg:text-2xl">
              ¡Hola{settings.ownerName ? `, ${settings.ownerName.split(" ")[0]}` : ""}! 👋 Todo tu
              ecommerce en un solo lugar
            </h1>
            <p className="mt-1 text-sm text-ink-300">
              {num(unread)} mensajes sin responder · {myConvos.length} conversaciones abiertas ·{" "}
              {myStores.length} tiendas conectadas
            </p>
          </div>
          <div className="relative flex flex-wrap gap-2">
            <Link href="/inbox" className="btn-primary">
              <MessageSquare className="h-4 w-4" /> Ir a la bandeja
            </Link>
            <Link href="/carritos" className="btn-ghost">
              <ShoppingCart className="h-4 w-4" /> Recuperar carritos
            </Link>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="Mensajes sin responder"
          value={num(unread)}
          icon={MessageSquare}
          trend="12%"
          trendUp
          accent="#3563ff"
          sub={`${myChannels.length} canales activos`}
        />
        <StatCard
          label="Ventas de hoy"
          value={num(ordersToday)}
          icon={ShoppingCart}
          trend="8%"
          trendUp
          accent="#16a34a"
          sub={`en ${myStores.length} tiendas`}
        />
        <StatCard
          label="Carritos por recuperar"
          value={compactMoney(cartsValue)}
          icon={TrendingUp}
          trend="5%"
          trendUp={false}
          accent="#f59e0b"
          sub={`${myCarts.filter((c) => c.recoveryStatus === "nuevo").length} carritos nuevos`}
        />
        <StatCard
          label="Ingresos por campañas"
          value={compactMoney(campaignRevenue)}
          icon={DollarSign}
          trend="23%"
          trendUp
          accent="#d946ef"
          sub="últimos 30 días"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <SectionTitle
            title="Ventas y recuperación de carritos"
            icon={TrendingUp}
            action={
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-ink-300">
                  <span className="h-2 w-2 rounded-full bg-brand-400" /> Ventas
                </span>
                <span className="flex items-center gap-1.5 text-ink-300">
                  <span className="h-2 w-2 rounded-full bg-green-500" /> Recuperado
                </span>
              </div>
            }
          />
          <RevenueChart />
        </div>
        <div className="card p-5">
          <SectionTitle title="Mensajes por canal" icon={MessageSquare} />
          <ChannelsChart />
        </div>
      </div>

      {/* Live activity + quick actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent conversations */}
        <div className="card p-5 lg:col-span-2">
          <SectionTitle
            title="Actividad reciente"
            icon={Clock}
            action={
              <Link href="/inbox" className="flex items-center gap-1 text-xs font-semibold text-brand-300 hover:text-brand-200">
                Ver bandeja <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          <div className="space-y-1">
            {myConvos.slice(0, 6).map((c) => {
              const meta = channelMeta[c.channel];
              const Icon = meta.icon;
              const brand = brandById(c.brandId);
              return (
                <Link
                  key={c.id}
                  href="/inbox"
                  className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-ink-800"
                >
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-800 text-lg">
                      {c.avatar}
                    </div>
                    <div
                      className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-ink-900"
                      style={{ background: meta.bg }}
                    >
                      <Icon className="h-3 w-3" style={{ color: meta.color }} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-white">
                        {c.customerName}
                      </span>
                      {activeBrandId === "all" && (
                        <span className="hidden text-xs text-ink-500 sm:inline">
                          {brand?.logo} {brand?.name}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-ink-400">{c.lastMessage}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-ink-500">{timeAgo(c.timestamp)}</span>
                    {c.unread > 0 && (
                      <span className="chip bg-brand-500 text-white">{c.unread}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Shipments needing attention */}
        <div className="card p-5">
          <SectionTitle
            title="Envíos a seguir"
            icon={Truck}
            action={
              <Link href="/tracking" className="text-xs font-semibold text-brand-300 hover:text-brand-200">
                Ver todos
              </Link>
            }
          />
          <div className="space-y-2.5">
            {inBrand(orders)
              .slice(0, 4)
              .map((o) => {
                const st = orderStatusMeta[o.status];
                return (
                  <Link
                    key={o.id}
                    href={`/tracking?q=${o.orderNumber}`}
                    className="block rounded-xl border border-ink-700 bg-ink-850 p-3 transition hover:border-ink-600"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-ink-200">
                        {o.orderNumber}
                      </span>
                      <Pill color={st.color} bg={st.bg}>
                        {st.label}
                      </Pill>
                    </div>
                    <div className="mt-1.5 text-sm font-medium text-white">{o.customerName}</div>
                    <div className="mt-0.5 flex items-center justify-between text-xs text-ink-400">
                      <span>
                        {o.carrier} · {o.destination}
                      </span>
                      <span>{money(o.total, o.currency)}</span>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>
      </div>

      {/* Quick actions banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QuickAction
          href="/tracking"
          icon={Truck}
          title="Seguí tu envío"
          desc="Buscá cualquier pedido por número, mail o nombre y respondé al instante."
          color="#598bff"
        />
        <QuickAction
          href="/mercadolibre"
          icon={Zap}
          title="Responder Mercado Libre"
          desc="Contestá preguntas y mensajes de ML sin salir de Clientany."
          color="#FFD400"
        />
        <QuickAction
          href="/campanas"
          icon={CheckCircle2}
          title="Lanzar campaña"
          desc="Email + WhatsApp marketing con tu base de leads capturados."
          color="#d946ef"
        />
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  desc,
  color,
}: {
  href: string;
  icon: typeof Truck;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="card group flex items-start gap-3 p-4 transition hover:border-brand-500/40"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${color}1f` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1 text-sm font-semibold text-white">
          {title}
          <ArrowRight className="h-3.5 w-3.5 text-ink-500 transition group-hover:translate-x-0.5 group-hover:text-brand-300" />
        </div>
        <p className="mt-0.5 text-xs text-ink-400">{desc}</p>
      </div>
    </Link>
  );
}
