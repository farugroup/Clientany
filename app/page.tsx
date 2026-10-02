import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Bot,
  Boxes,
  Braces,
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  Inbox,
  Lock,
  MessageSquareText,
  MessagesSquare,
  Minus,
  Package,
  Plug,
  Smartphone,
  Sparkles,
  Store,
  UserPlus,
  UsersRound,
  Webhook,
  X,
  type LucideIcon,
} from "lucide-react";
import { channelMeta } from "@/lib/channels";
import SitioNav from "@/components/landing/SitioNav";
import SitioPie from "@/components/landing/SitioPie";
import MaquetaBandeja from "@/components/landing/MaquetaBandeja";
import TituloSeccion from "@/components/landing/TituloSeccion";
import FormularioContacto from "@/components/landing/FormularioContacto";

export const metadata: Metadata = {
  title: "Clientany — El CRM multicanal para empresas que venden por chat",
  description:
    "Todas tus tiendas, todos tus chats, una sola bandeja. WhatsApp Business API, Instagram y Messenger con pedidos, stock, respuestas automáticas, IA y tu equipo. Probá la demo sin registrarte.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Clientany — Todas tus tiendas. Todos tus chats. Una sola bandeja.",
    description:
      "El CRM para empresas que venden por chat: WhatsApp Business API, Instagram y Messenger, con pedidos, stock y respuestas automáticas que no molestan.",
    url: "/",
    type: "website",
    locale: "es_AR",
    siteName: "Clientany",
  },
};

// ---------------------------------------------------------------------------
// Datos de la página
// ---------------------------------------------------------------------------

const WA = channelMeta.whatsapp;
const IG = channelMeta.instagram;
const FB = channelMeta.messenger;

const CHIPS_HERO: { label: string; icon: LucideIcon; color?: string }[] = [
  { label: "WhatsApp", icon: WA.icon, color: WA.color },
  { label: "Instagram", icon: IG.icon, color: IG.color },
  { label: "Messenger", icon: FB.icon, color: FB.color },
  { label: "API", icon: Braces },
];

const CONEXIONES: { label: string; icon: LucideIcon; color?: string }[] = [
  { label: "WhatsApp Business API (Meta)", icon: WA.icon, color: WA.color },
  { label: "Instagram", icon: IG.icon, color: IG.color },
  { label: "Messenger", icon: FB.icon, color: FB.color },
  { label: "Tu tienda, por API o CSV", icon: Store },
];

const GRUPOS_BANDEJA = [
  { nombre: "Ventas", detalle: "lo nuevo y el que te volvió a escribir", activo: true },
  { nombre: "Soporte", detalle: "un problema que hay que seguir" },
  { nombre: "Más adelante", detalle: "lo pospuesto: vuelve solo cuando toca" },
  { nombre: "Resueltos", detalle: "listo, hasta que escriba de nuevo" },
  { nombre: "Baja", detalle: "no quiere recibir automáticos" },
];

const CANDADOS = [
  "Una bienvenida cada 24 hs por chat, no en cada mensaje",
  "Tope de respuestas automáticas por chat y por día",
  "Se calla si una persona respondió hace poco o tomó el chat",
  "Nunca le escribe a quien pidió la baja",
];

const FUNCIONES: { icon: LucideIcon; titulo: string; texto: string }[] = [
  {
    icon: Package,
    titulo: "Historial de pedidos en el chat",
    texto: "Al lado de cada chat, la ficha del cliente con sus compras, el envío y el seguimiento. Sin preguntarle el nombre.",
  },
  {
    icon: Boxes,
    titulo: "Stock y precios al instante",
    texto: "El bot y tu equipo responden con tu lista real: precio, unidades y si queda poco. Nunca inventa un producto.",
  },
  {
    icon: UsersRound,
    titulo: "Equipo sin cruces",
    texto: "Asigná chats, «Lo tomo yo» para no pisarse, chat interno para pasarse casos y presencia para ver quién está.",
  },
  {
    icon: MessageSquareText,
    titulo: "Plantillas y rápidas",
    texto: "La ventana de 24 hs de WhatsApp resuelta: si se cerró, te ofrece la plantilla aprobada. Y atajos para lo que escribís siempre.",
  },
  {
    icon: Webhook,
    titulo: "API y CSV",
    texto: "Pedidos, stock, contactos y mensajes por API con tu clave, o por CSV. Webhook saliente para enterarte en tu sistema.",
  },
  {
    icon: Sparkles,
    titulo: "IA que sugiere la respuesta",
    texto: "Lee el chat, los pedidos y tu stock y te propone qué contestar. Si no sabe, lo dice. Vos revisás y mandás.",
  },
  {
    icon: Smartphone,
    titulo: "Modo celular",
    texto: "Se instala como app en el celular (PWA) y atendés con la misma bandeja, estés donde estés.",
  },
  {
    icon: Building2,
    titulo: "Multimarca",
    texto: "Varias tiendas, una bandeja: cada canal atado a su marca y un selector para ver una o todas juntas.",
  },
];

const PASOS: { n: number; titulo: string; texto: ReactNode; icon: LucideIcon }[] = [
  {
    n: 1,
    icon: UserPlus,
    titulo: "Creá tu cuenta (o probá la demo)",
    texto: (
      <>
        En un minuto, sin tarjeta. Si querés mirar antes, la{" "}
        <Link href="/inbox" className="font-semibold text-brand-300 hover:text-brand-200">
          demo
        </Link>{" "}
        trae chats, pedidos y stock de ejemplo.
      </>
    ),
  },
  {
    n: 2,
    icon: Plug,
    titulo: "Conectá tus canales",
    texto: (
      <>
        Pegás tus credenciales de Meta y la URL de webhook que te da Clientany. Tenés el{" "}
        <Link href="/docs#whatsapp" className="font-semibold text-brand-300 hover:text-brand-200">
          tutorial paso a paso
        </Link>{" "}
        en Docs.
      </>
    ),
  },
  {
    n: 3,
    icon: Bot,
    titulo: "Cargá pedidos y stock, y armá tus automáticas",
    texto: "Subí un CSV o conectá la API. Elegí qué contesta el bot solo y qué le pasa a una persona.",
  },
];

const PARA_QUIEN: { icon: LucideIcon; titulo: string; texto: string }[] = [
  {
    icon: Store,
    titulo: "Ecommerce",
    texto: "Vendés por tu tienda, Mercado Libre e Instagram, y te preguntan «¿hay stock?» y «¿dónde está mi pedido?» todo el día.",
  },
  {
    icon: Building2,
    titulo: "Tiendas con varias marcas",
    texto: "Dos o tres marcas, cada una con su número y su Instagram. Una bandeja para todas, separadas cuando hace falta.",
  },
  {
    icon: Briefcase,
    titulo: "Servicios que venden por WhatsApp",
    texto: "Gimnasios, clínicas, academias, turismo: consultas, turnos y seguimiento sin que nadie se quede sin respuesta.",
  },
  {
    icon: UsersRound,
    titulo: "Equipos de 1 a 20 personas",
    texto: "Desde el dueño que atiende solo hasta un equipo de ventas y soporte que necesita repartirse los chats.",
  },
];

type Celda =
  | { v: "si"; sub?: string }
  | { v: "limitado"; sub?: string }
  | { v: "no"; sub?: string }
  | { v: "consultar" }
  | { v: "texto"; texto: string; sub?: string };

const COMPETIDORES = ["Clientany", "Whaticket", "Leadsales", "Kommo"] as const;

const COMPARATIVA: { tema: string; celdas: [Celda, Celda, Celda, Celda] }[] = [
  {
    tema: "Precio de entrada",
    celdas: [
      { v: "texto", texto: "US$ 29/mes", sub: "3 usuarios, mensual" },
      { v: "texto", texto: "~49 €/mes", sub: "3 agentes" },
      { v: "texto", texto: "US$ 97/mes", sub: "plan Básico, 3 usuarios" },
      { v: "texto", texto: "US$ 15/usuario", sub: "mínimo 6 meses adelantados" },
    ],
  },
  {
    tema: "WhatsApp API oficial",
    celdas: [{ v: "si" }, { v: "limitado", sub: "QR en muchos planes" }, { v: "limitado", sub: "desde el plan Profesional" }, { v: "si" }],
  },
  {
    tema: "Instagram + Messenger",
    celdas: [{ v: "si", sub: "incluidos" }, { v: "consultar" }, { v: "si" }, { v: "si" }],
  },
  {
    tema: "Multimarca (varias tiendas, una bandeja)",
    celdas: [{ v: "si" }, { v: "consultar" }, { v: "consultar" }, { v: "consultar" }],
  },
  {
    tema: "Respuestas automáticas con stock y pedidos",
    celdas: [{ v: "si" }, { v: "limitado", sub: "chatbot básico" }, { v: "consultar" }, { v: "limitado", sub: "Salesbot desde Advanced" }],
  },
  {
    tema: "IA incluida",
    celdas: [{ v: "si", sub: "Pro y Empresa" }, { v: "consultar" }, { v: "consultar" }, { v: "consultar" }],
  },
  {
    tema: "Historial de pedidos en el chat",
    celdas: [{ v: "si" }, { v: "consultar" }, { v: "consultar" }, { v: "consultar" }],
  },
  {
    tema: "API y CSV",
    celdas: [{ v: "si" }, { v: "consultar" }, { v: "consultar" }, { v: "si" }],
  },
  {
    tema: "Equipo ilimitado en el plan alto",
    celdas: [{ v: "si", sub: "plan Empresa" }, { v: "consultar" }, { v: "consultar" }, { v: "no", sub: "se cobra por usuario" }],
  },
];

interface PlanLanding {
  nombre: string;
  para: string;
  precio: number;
  destacado?: boolean;
  previo?: string;
  items: string[];
  cta: { texto: string; href: string };
}

const PLANES: PlanLanding[] = [
  {
    nombre: "Inicial",
    para: "Para arrancar con un número",
    precio: 29,
    items: [
      "1 número de WhatsApp API + Instagram + Messenger",
      "3 usuarios",
      "1 marca",
      "Bandeja completa",
      "Respuestas automáticas",
      "Pedidos y stock por CSV",
      "1.000 conversaciones por mes",
    ],
    cta: { texto: "Empezar gratis", href: "/registro" },
  },
  {
    nombre: "Pro",
    para: "Para equipos que venden todos los días",
    precio: 79,
    destacado: true,
    previo: "Todo lo de Inicial, y además:",
    items: [
      "3 números de WhatsApp API",
      "10 usuarios",
      "3 marcas",
      "API y webhook",
      "IA incluida",
      "Plantillas sincronizadas con Meta",
      "5.000 conversaciones por mes",
      "Soporte por WhatsApp",
    ],
    cta: { texto: "Empezar gratis", href: "/registro" },
  },
  {
    nombre: "Empresa",
    para: "Para operaciones grandes y multimarca",
    precio: 149,
    previo: "Todo lo de Pro, y además:",
    items: [
      "Números, usuarios y marcas ilimitados",
      "Conversaciones ilimitadas",
      "Onboarding asistido",
      "Soporte prioritario",
      "Migración desde Whaticket o Kommo",
    ],
    cta: { texto: "Hablar con ventas", href: "mailto:hola@clientany.com?subject=Plan%20Empresa" },
  },
];

const LINK = "font-semibold text-brand-300 underline-offset-2 hover:text-brand-200 hover:underline";

const PREGUNTAS: { q: string; a: ReactNode }[] = [
  {
    q: "¿Necesito la API oficial de WhatsApp?",
    a: (
      <>
        Sí. Clientany se conecta sólo por la API oficial de Meta (WhatsApp Business Platform). Es la forma permitida de
        conectar un sistema a WhatsApp: no corrés el riesgo de que te bloqueen el número por usar herramientas que
        «leen el QR», los mensajes llegan al instante y podés usar plantillas aprobadas para escribir fuera de la
        ventana de 24 hs. Conectarla lleva unos 25 minutos con el{" "}
        <Link href="/docs#whatsapp" className={LINK}>
          tutorial de Docs
        </Link>
        . Los mensajes que cobra Meta se pagan directo a Meta, como con cualquier herramienta de API oficial.
      </>
    ),
  },
  {
    q: "¿Puedo seguir usando el celular?",
    a: (
      <>
        Sí. Con Coexistence, Meta permite tener el mismo número en la app WhatsApp Business del celular y en la API a
        la vez: lo que contestás desde el teléfono también aparece en el chat de Clientany. Los requisitos los define
        Meta (te los contamos en{" "}
        <Link href="/docs#coexistence" className={LINK}>
          Docs
        </Link>
        ). Y además Clientany se instala como app en el celular.
      </>
    ),
  },
  {
    q: "¿La IA tiene costo extra?",
    a: "No. En los planes Pro y Empresa la IA viene incluida. En Inicial podés cargar tu propia clave en Configuración y usarla sin pagarnos nada más.",
  },
  {
    q: "¿Cómo cargo mis pedidos y mi stock?",
    a: (
      <>
        Por CSV (lo exportás de tu tienda o de tu planilla y lo subís; acepta coma o punto y coma y encabezados en
        español o en inglés) o por API, para que tu sistema los mantenga al día solo. También se cargan a mano. Las
        columnas están en{" "}
        <Link href="/docs#csv" className={LINK}>
          Docs
        </Link>
        .
      </>
    ),
  },
  {
    q: "¿Puedo probar sin registrarme?",
    a: (
      <>
        Sí. La{" "}
        <Link href="/inbox" className={LINK}>
          demo
        </Link>{" "}
        te abre una bandeja con chats, pedidos y stock de ejemplo. Todo queda en tu navegador y no sale ningún mensaje
        real. Podés escribir como si fueras un cliente y ver qué contesta el bot.
      </>
    ),
  },
  {
    q: "¿Qué pasa cuando termina la prueba?",
    a: "Elegís un plan y seguís con todo lo que cargaste. Si no elegís ninguno, la cuenta pasa a sólo lectura: ves todo, pero no entra nada nuevo. No se borra nada por 30 días, así podés exportar tus contactos, pedidos y stock en CSV.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Cada empresa está aislada: nadie de otra cuenta puede ver tus chats ni tus clientes. Los tokens de Meta y las claves de IA se guardan cifrados y nunca vuelven al navegador. Los datos viven en Supabase, en la región de São Paulo.",
  },
  {
    q: "¿Puedo migrar desde Whaticket?",
    a: "Sí. Exportás tus contactos a CSV y los importás en Clientany; tu número se conecta a la API oficial desde Conexiones. En el plan Empresa hacemos la migración con vos.",
  },
  {
    q: "¿Sirve si no tengo ecommerce?",
    a: "Sí. Si vendés servicios, turnos o a medida por WhatsApp, usás igual la bandeja, el equipo, las respuestas automáticas y las plantillas. Pedidos y stock son opcionales: si no los cargás, el bot simplemente no los usa.",
  },
];

// ---------------------------------------------------------------------------
// Piezas chicas
// ---------------------------------------------------------------------------

function CeldaComparativa({ celda, propia }: { celda: Celda; propia: boolean }) {
  if (celda.v === "texto") {
    return (
      <div>
        <div className={`font-bold ${propia ? "text-white" : "text-ink-100"}`}>{celda.texto}</div>
        {celda.sub && <div className="mt-0.5 text-[11.5px] text-ink-400">{celda.sub}</div>}
      </div>
    );
  }
  if (celda.v === "consultar") {
    return <span className="text-[12.5px] text-ink-500">consultar</span>;
  }
  const icono =
    celda.v === "si" ? (
      <Check className={`h-[18px] w-[18px] ${propia ? "text-brand-300" : "text-green-400"}`} strokeWidth={2.75} />
    ) : celda.v === "limitado" ? (
      <Minus className="h-[18px] w-[18px] text-amber-400" strokeWidth={2.75} />
    ) : (
      <X className="h-[18px] w-[18px] text-ink-500" strokeWidth={2.75} />
    );
  const nombre = celda.v === "si" ? "Sí" : celda.v === "limitado" ? "Limitado" : "No";
  return (
    <div className="flex flex-col items-center">
      <span className="flex items-center gap-1.5">
        {icono}
        <span className={celda.v === "limitado" ? "text-[12px] font-semibold text-amber-300" : "sr-only"}>{nombre}</span>
      </span>
      {celda.sub && <span className="mt-0.5 text-[11.5px] text-ink-400">{celda.sub}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// La página
// ---------------------------------------------------------------------------

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-clip bg-ink-950 text-ink-100">
      <SitioNav />

      <main>
        {/* ============================== HERO ============================== */}
        <section className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px] overflow-hidden">
            <div className="absolute -top-48 left-1/2 h-[520px] w-[980px] -translate-x-1/2 rounded-full bg-brand-500/[0.16] blur-3xl" />
          </div>
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:pt-14 lg:grid-cols-2 lg:gap-10 lg:px-6 lg:pb-24 lg:pt-20">
            <div>
              <div className="flex flex-wrap gap-2">
                {CHIPS_HERO.map((c) => (
                  <span
                    key={c.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-900/80 px-3 py-1.5 text-xs font-semibold text-ink-200"
                  >
                    <c.icon className={`h-3.5 w-3.5 ${c.color ? "" : "text-brand-300"}`} style={c.color ? { color: c.color } : undefined} />
                    {c.label}
                  </span>
                ))}
              </div>
              <h1 className="mt-6 text-[34px] font-extrabold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[44px] xl:text-[52px]">
                <span className="block">Todas tus tiendas.</span>
                <span className="block">Todos tus chats.</span>
                <span className="block bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text pb-1 text-transparent">
                  Una sola bandeja.
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-300 sm:text-[17px]">
                Clientany es el CRM para empresas que venden por chat: conectá tu WhatsApp Business API, tu Instagram y tu
                Messenger, cargá tus pedidos y tu stock, y atendé todo con tu equipo desde un solo lugar. Con respuestas
                automáticas que no molestan y una IA que sugiere qué contestar.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
                <Link href="/inbox" className="btn-primary px-6 py-3.5 text-[15px]">
                  Probar la demo en vivo <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/registro" className="btn-ghost flex-col gap-0 px-6 py-2 text-[15px] leading-tight">
                  <span>Empezar gratis</span>
                  <span className="text-[11.5px] font-medium text-ink-400">14 días, sin tarjeta</span>
                </Link>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-400">
                {["La demo no pide registro", "API oficial de Meta", "Mensual, sin permanencia"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-brand-300" strokeWidth={3} /> {t}
                  </li>
                ))}
              </ul>
            </div>

            <MaquetaBandeja />
          </div>
        </section>

        {/* ======================= FRANJA DE CONFIANZA ======================= */}
        <section className="border-y border-ink-800/70 bg-ink-900/40">
          <div className="mx-auto max-w-6xl px-4 py-7 lg:px-6">
            <p className="text-center text-[11px] font-bold uppercase tracking-wider text-ink-400">Se conecta en minutos con</p>
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              {CONEXIONES.map((c) => (
                <li
                  key={c.label}
                  className="inline-flex items-center gap-2 rounded-xl border border-ink-700/70 bg-ink-900 px-3.5 py-2 text-[13.5px] font-semibold text-ink-200"
                >
                  <c.icon className={`h-4 w-4 ${c.color ? "" : "text-brand-300"}`} style={c.color ? { color: c.color } : undefined} />
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ============================ FUNCIONES ============================ */}
        <section id="funciones" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 lg:px-6 lg:py-24">
          <TituloSeccion
            etiqueta="Funciones"
            titulo="Todo lo que pasa en un chat de venta, en un solo lugar"
            bajada="No es otro WhatsApp multiagente: es la bandeja, la ficha del cliente, el stock y el equipo, conectados entre sí."
          />

          <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Bandeja por grupos */}
            <div className="card p-6 sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15">
                <Inbox className="h-5 w-5 text-brand-300" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">Bandeja unificada por grupos</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-300">
                WhatsApp, Instagram y Messenger en una sola lista, ordenada por lo que hay que hacer. El que te volvió a
                escribir sube solo; lo que pospusiste vuelve cuando toca.
              </p>
              <ul className="mt-5 space-y-2">
                {GRUPOS_BANDEJA.map((g) => (
                  <li key={g.nombre} className="flex items-center gap-3 text-sm">
                    <span
                      className={`inline-flex w-[7.5rem] shrink-0 justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        g.activo ? "bg-brand-500/15 text-brand-200" : "bg-ink-800 text-ink-200"
                      }`}
                    >
                      {g.nombre}
                    </span>
                    <span className="text-ink-400">{g.detalle}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Automáticas con candados */}
            <div className="card p-6 sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15">
                <Bot className="h-5 w-5 text-brand-300" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">Respuestas automáticas con candados</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-300">
                Bienvenida, fuera de horario, menú de opciones, reglas por palabra, stock, estado del pedido y «pasar a una
                persona». Contestan en segundos, con tus datos, y sin molestar:
              </p>
              <ul className="mt-5 space-y-2.5">
                {CANDADOS.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-sm text-ink-200">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-ink-800">
                      <Lock className="h-3 w-3 text-brand-300" />
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FUNCIONES.map((f) => (
              <div key={f.titulo} className="card p-5 transition hover:border-brand-500/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15">
                  <f.icon className="h-5 w-5 text-brand-300" />
                </div>
                <h3 className="mt-4 text-[15.5px] font-bold text-white">{f.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-400">{f.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================== CÓMO FUNCIONA ========================== */}
        <section id="como-funciona" className="scroll-mt-20 border-y border-ink-800/70 bg-ink-900/30">
          <div className="mx-auto max-w-6xl px-4 py-20 lg:px-6 lg:py-24">
            <TituloSeccion
              etiqueta="Cómo funciona"
              titulo="De cero a atendiendo, en una tarde"
              bajada="Sin instalar nada y sin programador. La API es opcional: el CSV alcanza para empezar."
            />
            <ol className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {PASOS.map((p) => (
                <li key={p.n} className="card relative p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-extrabold text-white shadow-glow">
                      {p.n}
                    </span>
                    <p.icon className="h-5 w-5 text-ink-400" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-white">{p.titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-300">{p.texto}</p>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-5 py-2.5 text-[15px] font-bold text-white">
                <MessagesSquare className="h-4 w-4 text-brand-300" /> ¡A atender!
              </span>
            </div>
          </div>
        </section>

        {/* ============================ PARA QUIÉN ============================ */}
        <section id="para-quien" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 lg:px-6 lg:py-24">
          <TituloSeccion
            etiqueta="Para quién"
            titulo="Para las empresas que venden por chat"
            bajada="Si tu venta empieza con un «hola, ¿tienen…?», Clientany es para vos."
          />
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PARA_QUIEN.map((p) => (
              <div key={p.titulo} className="card p-5">
                <p.icon className="h-6 w-6 text-brand-300" />
                <h3 className="mt-4 text-[15.5px] font-bold text-white">{p.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-400">{p.texto}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-ink-700/60 bg-ink-900/50 p-5 sm:flex sm:items-center sm:gap-5 sm:p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/15">
              <Store className="h-5 w-5 text-brand-300" />
            </span>
            <p className="mt-3 text-sm leading-relaxed text-ink-300 sm:mt-0">
              <b className="text-white">Hecho por una tienda que vende todos los días.</b> Clientany nace del sistema con
              el que FARU FITNESS atiende sus ventas por chat: los grupos de la bandeja, los candados del bot y la ventana
              de 24 hs existen porque a una tienda real le dolió no tenerlos.
            </p>
          </div>
        </section>

        {/* ============================ COMPARATIVA ============================ */}
        <section id="comparativa" className="scroll-mt-20 border-y border-ink-800/70 bg-ink-900/30">
          <div className="mx-auto max-w-6xl px-4 py-20 lg:px-6 lg:py-24">
            <TituloSeccion
              etiqueta="Comparativa"
              titulo="Clientany frente a las otras opciones"
              bajada="Lo que incluye la entrada de cada una. Donde no lo pudimos confirmar, dice «consultar»."
            />
            <div className="relative mt-12 overflow-x-auto rounded-2xl border border-ink-700/60 bg-ink-900">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <caption className="sr-only">Comparativa de Clientany con Whaticket, Leadsales y Kommo</caption>
                <thead>
                  <tr className="border-b border-ink-800">
                    <th scope="col" className="sticky left-0 z-10 w-[150px] bg-ink-900 p-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-400 sm:w-[30%] sm:p-4">
                      Qué incluye
                    </th>
                    {COMPETIDORES.map((c, i) => (
                      <th
                        key={c}
                        scope="col"
                        className={`p-3 text-center text-[15px] font-bold sm:p-4 ${i === 0 ? "bg-brand-500/15 text-white" : "text-ink-200"}`}
                      >
                        {i === 0 ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-brand-300" /> {c}
                          </span>
                        ) : (
                          c
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARATIVA.map((fila) => (
                    <tr key={fila.tema} className="border-b border-ink-800/70 last:border-b-0">
                      <th scope="row" className="sticky left-0 z-10 bg-ink-900 p-3 text-left font-medium text-ink-200 sm:p-4">
                        {fila.tema}
                      </th>
                      {fila.celdas.map((celda, i) => (
                        <td key={COMPETIDORES[i]} className={`p-3 text-center align-middle sm:p-4 ${i === 0 ? "bg-brand-500/[0.07]" : ""}`}>
                          <CeldaComparativa celda={celda} propia={i === 0} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-center text-xs text-ink-500 sm:hidden">Deslizá la tabla para ver todas las columnas.</p>
            <div className="mt-5 flex flex-col items-center gap-2 text-center text-xs text-ink-400">
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-green-400" strokeWidth={3} /> incluido
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Minus className="h-3.5 w-3.5 text-amber-400" strokeWidth={3} /> limitado
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <X className="h-3.5 w-3.5 text-ink-500" strokeWidth={3} /> no
                </span>
                <span>consultar: no lo pudimos confirmar</span>
              </div>
              <p className="text-ink-500">
                Comparativa según información pública de cada sitio a octubre de 2026; puede cambiar.
              </p>
            </div>
          </div>
        </section>

        {/* ============================== PRECIOS ============================== */}
        <section id="precios" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 lg:px-6 lg:py-24">
          <TituloSeccion
            etiqueta="Precios"
            titulo="Planes claros, todo incluido"
            bajada="WhatsApp, Instagram, Messenger y el bot vienen en todos los planes. Sin costos ocultos ni permanencia."
          />
          <div className="mt-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-green-500/25 bg-green-500/[0.08] px-4 py-1.5 text-sm font-semibold text-green-300">
              <Check className="h-4 w-4" strokeWidth={3} /> 14 días gratis en todos, sin tarjeta
            </span>
          </div>
          <div className="mt-14 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
            {PLANES.map((p) => (
              <div
                key={p.nombre}
                className={`relative flex flex-col rounded-2xl border p-6 sm:p-7 ${
                  p.destacado
                    ? "border-brand-500/60 bg-gradient-to-b from-brand-500/[0.12] to-ink-900 shadow-glow"
                    : "border-ink-700/60 bg-ink-900/80"
                }`}
              >
                {p.destacado && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-500 px-3.5 py-1 text-xs font-bold text-white shadow-glow">
                    El más elegido
                  </span>
                )}
                <h3 className="text-lg font-bold text-white">{p.nombre}</h3>
                <p className="mt-1 text-sm text-ink-400">{p.para}</p>
                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold text-ink-300">US$</span>
                  <span className="text-5xl font-extrabold tracking-tight text-white">{p.precio}</span>
                  <span className="text-sm font-medium text-ink-400">/ mes</span>
                </div>
                {p.previo && <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-ink-400">{p.previo}</p>}
                <ul className={`${p.previo ? "mt-3" : "mt-6"} mb-7 space-y-2.5`}>
                  {p.items.map((it) => (
                    <li key={it} className="flex items-start gap-2.5 text-sm text-ink-200">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" strokeWidth={2.75} />
                      {it}
                    </li>
                  ))}
                </ul>
                {p.cta.href.startsWith("mailto:") ? (
                  <a href={p.cta.href} className="btn-ghost mt-auto w-full py-3">
                    {p.cta.texto}
                  </a>
                ) : (
                  <Link href={p.cta.href} className={`${p.destacado ? "btn-primary" : "btn-ghost"} mt-auto w-full py-3`}>
                    {p.cta.texto} <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            ))}
          </div>
          <div className="mt-8 space-y-1.5 text-center text-sm text-ink-400">
            <p>Precios en dólares más impuestos. Pagá anual y ahorrá 20 %.</p>
            <p className="text-xs text-ink-500">
              Los mensajes de WhatsApp que cobra Meta se pagan aparte, directo a Meta desde tu cuenta, como con cualquier
              herramienta que use la API oficial.
            </p>
          </div>
        </section>

        {/* ========================= PREGUNTAS FRECUENTES ========================= */}
        <section id="preguntas" className="scroll-mt-20 border-t border-ink-800/70 bg-ink-900/30">
          <div className="mx-auto max-w-3xl px-4 py-20 lg:px-6 lg:py-24">
            <TituloSeccion etiqueta="Preguntas frecuentes" titulo="Lo que todos preguntan" />
            <div className="mt-10 space-y-3">
              {PREGUNTAS.map((p) => (
                <details key={p.q} className="group rounded-2xl border border-ink-700/60 bg-ink-900/80 open:border-brand-500/30">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-semibold text-white [&::-webkit-details-marker]:hidden">
                    {p.q}
                    <ChevronDown className="h-5 w-5 shrink-0 text-ink-400 transition group-open:rotate-180 group-open:text-brand-300" />
                  </summary>
                  <div className="px-5 pb-5 text-sm leading-relaxed text-ink-300">{p.a}</div>
                </details>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-ink-400">
              ¿Te quedó otra duda? Escribinos a{" "}
              <a href="mailto:hola@clientany.com" className={LINK}>
                hola@clientany.com
              </a>{" "}
              o mirá las{" "}
              <Link href="/docs" className={LINK}>
                Docs
              </Link>
              .
            </p>
          </div>
        </section>

        {/* ============================== CTA FINAL ============================== */}
        <section id="contacto" className="scroll-mt-20 px-4 py-20 lg:px-6 lg:py-24">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-brand-500/25 bg-ink-900 px-5 py-12 sm:px-10 lg:py-16">
            <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[720px] -translate-x-1/2 rounded-full bg-brand-500/25 blur-3xl" />
            <div className="relative text-center">
              <h2 className="text-[28px] font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                Dejá de perder ventas entre pestañas
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-ink-300">
                Probá la demo ahora, sin registrarte. O dejanos tus datos y te ayudamos a conectar tus canales.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/inbox" className="btn-primary px-6 py-3 text-[15px]">
                  Probar la demo en vivo <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/registro" className="btn-ghost px-6 py-3 text-[15px]">
                  Empezar gratis
                </Link>
              </div>
              <div className="mx-auto my-9 flex max-w-2xl items-center gap-3 text-xs font-medium uppercase tracking-wider text-ink-500">
                <span className="h-px flex-1 bg-ink-700/70" />
                o te contactamos nosotros
                <span className="h-px flex-1 bg-ink-700/70" />
              </div>
              <FormularioContacto />
            </div>
          </div>
        </section>
      </main>

      <SitioPie />
    </div>
  );
}
