"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Check,
  X,
  Infinity as InfinityIcon,
  Truck,
  ShoppingCart,
  Tag,
  Inbox,
  Megaphone,
  Building2,
  Filter,
  Bot,
  BookOpen,
  MessageCircle,
  Instagram,
  Facebook,
  ShoppingBag,
  Music2,
  Mail,
  Smartphone,
  Zap,
  ShieldCheck,
  ChevronDown,
  Store,
  Rocket,
  Star,
} from "lucide-react";

const channelPills = [
  { icon: MessageCircle, label: "WhatsApp", color: "#25D366" },
  { icon: Instagram, label: "Instagram", color: "#E1306C" },
  { icon: ShoppingBag, label: "Mercado Libre", color: "#FFD400" },
  { icon: Facebook, label: "Messenger", color: "#0084FF" },
  { icon: Music2, label: "TikTok", color: "#69C9D0" },
  { icon: Mail, label: "Email", color: "#EA8B00" },
];

const stores = ["Tienda Nube", "Shopify", "VTEX", "Vendany", "Mercado Shops", "WooCommerce"];

const features = [
  {
    icon: InfinityIcon,
    color: "#3563ff",
    title: "Canales y marcas ilimitados",
    desc: "Sumá tantos WhatsApp, Instagram y Mercado Libre como quieras. Todo dividido por marca y con cambio de contexto en un clic.",
  },
  {
    icon: Inbox,
    color: "#8b5cf6",
    title: "Bandeja + Tickets (Whaticket)",
    desc: "Bandeja unificada con sistema de tickets: colas, agentes, protocolo, notas internas, respuestas rápidas y encuesta de satisfacción.",
  },
  {
    icon: Filter,
    color: "#16a34a",
    title: "Embudo de ventas (estilo Kommo)",
    desc: "Pipeline Kanban con etapas, tarjetas de oportunidad, tareas y notas. Arrastrá cada venta hasta cerrarla.",
  },
  {
    icon: Bot,
    color: "#06b6d4",
    title: "Chatbot y automatizaciones",
    desc: "Menú automático que deriva a la cola correcta, mensajes de bienvenida y ausencia, horarios de atención.",
  },
  {
    icon: Truck,
    color: "#598bff",
    title: "Seguí tu envío",
    desc: "Buscá cualquier pedido por número, mail o nombre y respondé en tiempo real con link de seguimiento propio.",
  },
  {
    icon: ShoppingCart,
    color: "#f59e0b",
    title: "Recuperador de carritos",
    desc: "Nos conectamos a tu tienda y convertimos las ventas perdidas con flujos automáticos por WhatsApp y email.",
  },
  {
    icon: BookOpen,
    color: "#25D366",
    title: "WhatsApp Business completo",
    desc: "Catálogo de productos, perfil de empresa, etiquetas, listas de difusión y tu link/QR de contacto.",
  },
  {
    icon: Tag,
    color: "#FFB000",
    title: "Mercado Libre + Lead Magnet",
    desc: "Respondé preguntas y mensajes de ML, y capturá los emails de tus compradores para hacer marketing.",
  },
  {
    icon: Megaphone,
    color: "#d946ef",
    title: "Campañas Email & WhatsApp",
    desc: "Con tu base de leads lanzá campañas segmentadas y medí las ventas que generan.",
  },
];

// Comparación vs categorías de herramientas (a modo ilustrativo por categoría).
const comparison = [
  { feature: "Bandeja multiagente con tickets y colas", clientany: true, whaticket: true, kommo: "partial", wabiz: false },
  { feature: "Embudo de ventas Kanban (pipeline)", clientany: true, whaticket: false, kommo: true, wabiz: false },
  { feature: "Chatbot, horarios y respuestas rápidas", clientany: true, whaticket: true, kommo: "partial", wabiz: "partial" },
  { feature: "Catálogo, etiquetas y difusión de WhatsApp", clientany: true, whaticket: "partial", kommo: false, wabiz: true },
  { feature: "WhatsApp, IG y ML ilimitados por marca", clientany: true, whaticket: "partial", kommo: "partial", wabiz: false },
  { feature: "Seguimiento de envíos integrado", clientany: true, whaticket: false, kommo: false, wabiz: false },
  { feature: "Recuperador de carritos multi-tienda", clientany: true, whaticket: false, kommo: false, wabiz: false },
  { feature: "Mercado Libre + Lead Magnet", clientany: true, whaticket: false, kommo: false, wabiz: false },
  { feature: "Campañas de Email + WhatsApp marketing", clientany: true, whaticket: "partial", kommo: "partial", wabiz: "partial" },
  { feature: "Pensado exclusivamente para ecommerce", clientany: true, whaticket: false, kommo: false, wabiz: false },
];

const columns: {
  key: "clientany" | "whaticket" | "kommo" | "wabiz";
  label: string;
  highlight?: boolean;
}[] = [
  { key: "clientany", label: "Clientany", highlight: true },
  { key: "whaticket", label: "Apps tipo Whaticket" },
  { key: "kommo", label: "CRMs tipo Kommo" },
  { key: "wabiz", label: "WhatsApp Business" },
];

const steps = [
  { n: 1, title: "Conectá tus canales y tiendas", desc: "WhatsApp, Instagram, Mercado Libre y tu tienda (Tienda Nube, Shopify, VTEX, Vendany). Sin límite." },
  { n: 2, title: "Unificá y organizá por marca", desc: "Todas tus conversaciones y ventas en un panel, divididas por marca e intercambiables al instante." },
  { n: 3, title: "Vendé y recuperá en automático", desc: "Seguimiento de envíos, recuperación de carritos y campañas de email + WhatsApp trabajando por vos." },
];

const testimonials = [
  { name: "Sofía M.", role: "Skincare · 3 marcas", text: "Manejaba 4 WhatsApp y 2 Instagram en teléfonos distintos. Ahora está todo en un lugar y cambio de marca en un toque.", emoji: "🌙" },
  { name: "Diego R.", role: "Indumentaria", text: "El recuperador de carritos me trajo ventas que daba por perdidas. Se pagó solo en la primera semana.", emoji: "🧥" },
  { name: "Caro & Nacho", role: "Mates · Mercado Libre", text: "Responder las preguntas de ML desde el mismo lugar y captar los mails para hacer campañas nos cambió el juego.", emoji: "🧉" },
];

const faqs = [
  { q: "¿Sirve si vendo en varias plataformas a la vez?", a: "Sí. Conectás Tienda Nube, Shopify, VTEX, Vendany, Mercado Shops y más, además de tus redes. Todo se unifica por marca." },
  { q: "¿Puedo sumar varios números de WhatsApp e Instagram?", a: "Sin límite. Sumás tantos WhatsApp, Instagram, Messenger y cuentas de Mercado Libre como necesites, y los organizás por marca." },
  { q: "¿Cómo funciona 'Seguí tu envío'?", a: "Buscás cualquier pedido por número de orden, nombre y apellido o email, ves el estado en tiempo real y le mandás al cliente un link de seguimiento con tu marca." },
  { q: "¿Necesito instalar algo?", a: "No. Funciona en la web desde la compu y el celular, y se puede instalar como app (PWA). Las apps oficiales de Android e iOS están en camino." },
  { q: "¿Puedo empezar hoy?", a: "Sí. Creás tu negocio, cargás tus pedidos y contactos (a mano o por CSV) y ya estás operando. Las integraciones de mensajería se activan cuando la plataforma aprueba tu cuenta." },
];

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-ink-800/60 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 lg:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-white">Clientany</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-ink-300 md:flex">
            <a href="#features" className="hover:text-white">Funciones</a>
            <a href="#comparativa" className="hover:text-white">Comparativa</a>
            <a href="#como" className="hover:text-white">Cómo funciona</a>
            <a href="#precios" className="hover:text-white">Precios</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/panel" className="btn-ghost hidden px-4 py-2 text-sm sm:inline-flex">
              Ingresar
            </Link>
            <Link href="/panel" className="btn-primary px-4 py-2 text-sm">
              Probar gratis <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #3563ff, transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-14 text-center lg:px-6 lg:pt-20">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-200">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" /> El CRM multicanal para ecommerces de LATAM
          </div>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-white lg:text-6xl">
            Todos tus canales, marcas y ventas{" "}
            <span className="bg-gradient-to-r from-brand-300 to-fuchsia-400 bg-clip-text text-transparent">
              en un solo lugar
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-ink-300 lg:text-lg">
            Conectá <b className="text-white">WhatsApp, Instagram y Mercado Libre sin límite</b>,
            seguí tus envíos, recuperá carritos abandonados y hacé campañas de email + WhatsApp.
            Todo dividido por marca y pensado 100% para ecommerce.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/panel" className="btn-primary w-full px-6 py-3 text-base sm:w-auto">
              <Rocket className="h-5 w-5" /> Empezar ahora — gratis
            </Link>
            <Link href="/track" className="btn-ghost w-full px-6 py-3 text-base sm:w-auto">
              <Truck className="h-5 w-5" /> Ver “Seguí tu envío”
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-ink-400">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-400" /> Sin tarjeta</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-400" /> Listo en minutos</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-400" /> PC y mobile</span>
          </div>

          {/* Channel pills */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {channelPills.map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900/80 px-3.5 py-2 text-sm font-medium text-ink-200"
              >
                <c.icon className="h-4 w-4" style={{ color: c.color }} />
                {c.label}
              </div>
            ))}
          </div>
        </div>

        {/* App mockup band */}
        <div className="relative mx-auto mt-6 max-w-5xl px-4 lg:px-6">
          <div className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 shadow-card">
            <div className="flex items-center gap-1.5 border-b border-ink-800 bg-ink-850 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
              <span className="ml-3 text-xs text-ink-500">app.clientany.com/panel</span>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 lg:p-6">
              {[
                { label: "Mensajes sin responder", value: "24", accent: "#3563ff", icon: Inbox },
                { label: "Carritos por recuperar", value: "$342k", accent: "#f59e0b", icon: ShoppingCart },
                { label: "Ingresos por campañas", value: "$2.1M", accent: "#16a34a", icon: Megaphone },
              ].map((k) => (
                <div key={k.label} className="rounded-xl border border-ink-700 bg-ink-850 p-4 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${k.accent}1f` }}>
                      <k.icon className="h-5 w-5" style={{ color: k.accent }} />
                    </div>
                    <Star className="h-4 w-4 text-ink-600" />
                  </div>
                  <div className="mt-3 text-2xl font-extrabold text-white">{k.value}</div>
                  <div className="text-xs text-ink-400">{k.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STORES STRIP */}
      <section className="border-y border-ink-800/60 bg-ink-900/40 py-6">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <p className="text-center text-xs font-medium uppercase tracking-wider text-ink-500">
            Se integra con las tiendas más usadas de LATAM
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold text-ink-300">
            {stores.map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <Store className="h-4 w-4 text-ink-500" /> {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 lg:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
            Todo lo que tu ecommerce necesita para vender más
          </h2>
          <p className="mt-3 text-ink-300">
            No es otro chat multiagente: es una plataforma completa hecha para vender online.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card p-6 transition hover:border-brand-500/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `${f.color}1f` }}>
                <f.icon className="h-6 w-6" style={{ color: f.color }} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm text-ink-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DIFERENCIAL DESTACADO */}
      <section className="mx-auto max-w-6xl px-4 pb-4 lg:px-6">
        <div className="card overflow-hidden">
          <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2 lg:p-10">
            <div className="flex flex-col justify-center">
              <span className="chip w-fit bg-brand-500/15 text-brand-300">La novedad</span>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white lg:text-3xl">
                Ilimitado de verdad y dividido por marcas
              </h2>
              <p className="mt-3 text-ink-300">
                La mayoría de las apps te cobran por cada número de WhatsApp o por agente, y mezclan
                todo en una sola bandeja. En Clientany sumás{" "}
                <b className="text-white">tantos canales y negocios como quieras</b>, cada uno
                ordenado por marca, y cambiás de una a otra con un clic — sin costos extra por número.
              </p>
              <div className="mt-5 space-y-2.5">
                {[
                  "Infinitos WhatsApp, Instagram y Mercado Libre",
                  "Cada marca con sus canales, tiendas y equipo",
                  "Vista global para ver todas tus marcas juntas",
                ].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-sm text-ink-200">
                    <Check className="h-4 w-4 text-green-400" /> {t}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center rounded-2xl border border-ink-700 bg-ink-850 p-6">
              <div className="w-full max-w-xs space-y-2">
                {[
                  { logo: "🌙", name: "Lunar Cosmética", n: "6 canales" },
                  { logo: "🧥", name: "Kapeta Indumentaria", n: "4 canales" },
                  { logo: "🧉", name: "Che Mate", n: "3 canales" },
                  { logo: "🏠", name: "Petit Hogar", n: "2 canales" },
                ].map((b, i) => (
                  <div
                    key={b.name}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      i === 0 ? "border-brand-500/50 bg-brand-500/10" : "border-ink-700 bg-ink-900"
                    }`}
                  >
                    <span className="text-xl">{b.logo}</span>
                    <span className="flex-1 text-sm font-semibold text-white">{b.name}</span>
                    <span className="chip bg-ink-800 text-ink-300">{b.n}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-ink-600 p-3 text-sm text-ink-400">
                  <InfinityIcon className="h-4 w-4" /> Sumá las que quieras
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARATIVA */}
      <section id="comparativa" className="mx-auto max-w-6xl px-4 py-16 lg:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
            Por qué Clientany y no otra app
          </h2>
          <p className="mt-3 text-ink-300">
            El helpdesk de una app tipo Whaticket, el embudo de un CRM tipo Kommo y todo lo de
            WhatsApp Business — juntos y pensados para ecommerce, en una sola plataforma.
          </p>
        </div>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="w-[34%] p-3 text-left text-sm font-semibold text-ink-400">Diferencial</th>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`p-3 text-center text-sm font-bold ${
                      c.highlight ? "text-white" : "text-ink-400"
                    }`}
                  >
                    {c.highlight ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500/15 px-3 py-1.5 text-brand-200">
                        <Sparkles className="h-4 w-4" /> {c.label}
                      </span>
                    ) : (
                      c.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <tr key={i} className={i % 2 ? "" : "bg-ink-900/40"}>
                  <td className="rounded-l-lg p-3 text-sm text-ink-200">{row.feature}</td>
                  {columns.map((c) => {
                    const val = row[c.key as keyof typeof row] as boolean | "partial";
                    return (
                      <td
                        key={c.key}
                        className={`p-3 text-center ${c.highlight ? "bg-brand-500/5" : ""} ${
                          c.key === "wabiz" ? "rounded-r-lg" : ""
                        }`}
                      >
                        <Cell value={val} highlight={c.highlight} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-center text-xs text-ink-500">
          Comparación por categorías de herramientas, a modo ilustrativo. ✓ = incluido · ~ = parcial
          o con costo extra · ✕ = no disponible.
        </p>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como" className="border-y border-ink-800/60 bg-ink-900/40 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
              Empezás en 3 pasos
            </h2>
            <p className="mt-3 text-ink-300">Sin instalar nada, desde la compu o el celular.</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/15 text-lg font-extrabold text-brand-300">
                  {s.n}
                </div>
                <h3 className="mt-4 text-lg font-bold text-white">{s.title}</h3>
                <p className="mt-1.5 text-sm text-ink-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MOBILE / MULTIPLATAFORMA */}
      <section className="mx-auto max-w-6xl px-4 py-16 lg:px-6 lg:py-20">
        <div className="card flex flex-col items-center gap-6 overflow-hidden p-8 text-center lg:flex-row lg:p-12 lg:text-left">
          <div className="flex-1">
            <span className="chip w-fit bg-fuchsia-500/15 text-fuchsia-300">
              <Smartphone className="h-3.5 w-3.5" /> PC + Mobile
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white lg:text-3xl">
              Andá vendiendo desde donde estés
            </h2>
            <p className="mt-3 max-w-xl text-ink-300">
              Clientany funciona perfecto en la computadora y en el celular, y se instala como app.
              Las <b className="text-white">apps oficiales de Android e iOS</b> están en camino.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
              <span className="chip border border-ink-700 bg-ink-850 text-ink-300"><Zap className="h-3.5 w-3.5 text-brand-300" /> Instalable (PWA)</span>
              <span className="chip border border-ink-700 bg-ink-850 text-ink-300"><ShieldCheck className="h-3.5 w-3.5 text-green-400" /> Datos seguros</span>
              <span className="chip border border-ink-700 bg-ink-850 text-ink-300">📱 Apps nativas pronto</span>
            </div>
          </div>
          <div className="flex shrink-0 items-end gap-3">
            <div className="h-40 w-24 rounded-2xl border border-ink-700 bg-gradient-to-b from-ink-800 to-ink-900 p-2 shadow-card">
              <div className="flex h-full flex-col gap-1.5 rounded-lg bg-ink-950 p-2">
                <div className="h-2 w-2/3 rounded-full bg-brand-500/60" />
                <div className="h-8 rounded-md bg-ink-800" />
                <div className="h-8 rounded-md bg-ink-800" />
                <div className="mt-auto h-6 rounded-md bg-brand-500/40" />
              </div>
            </div>
            <div className="h-52 w-28 rounded-2xl border border-ink-700 bg-gradient-to-b from-ink-800 to-ink-900 p-2 shadow-glow">
              <div className="flex h-full flex-col gap-1.5 rounded-lg bg-ink-950 p-2">
                <div className="h-2 w-1/2 rounded-full bg-fuchsia-400/60" />
                <div className="h-10 rounded-md bg-ink-800" />
                <div className="h-10 rounded-md bg-ink-800" />
                <div className="h-10 rounded-md bg-ink-800" />
                <div className="mt-auto h-6 rounded-md bg-brand-500/40" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="mx-auto max-w-6xl px-4 pb-16 lg:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="card p-6">
              <div className="flex gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-3 text-sm text-ink-200">“{t.text}”</p>
              <div className="mt-4 flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-800 text-lg">{t.emoji}</span>
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-ink-400">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRECIOS */}
      <section id="precios" className="mx-auto max-w-6xl px-4 py-16 lg:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
            Un precio simple, todo incluido
          </h2>
          <p className="mt-3 text-ink-300">Canales, marcas y usuarios ilimitados. Sin sorpresas.</p>
        </div>
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="card p-7">
            <div className="text-sm font-semibold text-ink-300">Starter</div>
            <div className="mt-2 flex items-end gap-1">
              <span className="text-4xl font-extrabold text-white">$0</span>
              <span className="mb-1 text-sm text-ink-400">/ para arrancar</span>
            </div>
            <p className="mt-2 text-sm text-ink-400">Probá la plataforma completa con tus datos.</p>
            <ul className="mt-5 space-y-2 text-sm text-ink-200">
              {["1 marca", "Bandeja unificada", "Seguí tu envío", "Recuperador de carritos"].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> {t}</li>
              ))}
            </ul>
            <Link href="/panel" className="btn-ghost mt-6 w-full">Empezar gratis</Link>
          </div>
          <div className="card relative border-brand-500/40 p-7 shadow-glow">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 chip bg-brand-500 text-white">Más elegido</span>
            <div className="text-sm font-semibold text-brand-300">Growth</div>
            <div className="mt-2 flex items-end gap-1">
              <span className="text-4xl font-extrabold text-white">Ilimitado</span>
            </div>
            <p className="mt-2 text-sm text-ink-400">Marcas, canales y usuarios sin límite + IA.</p>
            <ul className="mt-5 space-y-2 text-sm text-ink-200">
              {["Todo lo de Starter", "Marcas y canales ilimitados", "Mercado Libre + Lead Magnet", "Campañas Email & WhatsApp", "IA de respuestas"].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> {t}</li>
              ))}
            </ul>
            <Link href="/panel" className="btn-primary mt-6 w-full">Probar Growth</Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-16 lg:px-6">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-white lg:text-3xl">
          Preguntas frecuentes
        </h2>
        <div className="mt-8 space-y-2.5">
          {faqs.map((f, i) => (
            <div key={i} className="card overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <span className="text-sm font-semibold text-white">{f.q}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-ink-400 transition ${openFaq === i ? "rotate-180" : ""}`}
                />
              </button>
              {openFaq === i && <div className="px-4 pb-4 text-sm text-ink-300">{f.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 lg:px-6">
        <div className="card relative overflow-hidden p-8 text-center lg:p-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{ background: "radial-gradient(600px circle at 50% 0%, #3563ff, transparent 60%)" }}
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
              Unificá tu ecommerce y vendé más, desde hoy
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-ink-300">
              Sumá tus canales, seguí tus envíos y recuperá carritos en una sola plataforma pensada
              para vos.
            </p>
            <Link href="/panel" className="btn-primary mx-auto mt-7 w-fit px-7 py-3 text-base">
              <Rocket className="h-5 w-5" /> Empezar gratis
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-ink-800 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-ink-400 sm:flex-row lg:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white">Clientany</span>
            <span className="text-ink-500">· CRM multicanal para ecommerce</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#features" className="hover:text-white">Funciones</a>
            <a href="#precios" className="hover:text-white">Precios</a>
            <Link href="/panel" className="hover:text-white">Ingresar</Link>
          </div>
        </div>
        <div className="mx-auto mt-6 max-w-6xl px-4 text-center text-xs text-ink-600 lg:px-6">
          © 2026 Clientany. Hecho para los ecommerces de LATAM 🚀
        </div>
      </footer>
    </div>
  );
}

function Cell({ value, highlight }: { value: boolean | "partial"; highlight?: boolean }) {
  if (value === true)
    return (
      <span
        className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full ${
          highlight ? "bg-brand-500 text-white" : "bg-green-500/15 text-green-400"
        }`}
      >
        <Check className="h-4 w-4" />
      </span>
    );
  if (value === "partial")
    return <span className="mx-auto block text-lg font-bold text-amber-400/80">~</span>;
  return (
    <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-ink-800 text-ink-500">
      <X className="h-4 w-4" />
    </span>
  );
}
