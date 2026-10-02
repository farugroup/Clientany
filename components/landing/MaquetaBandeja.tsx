import { Bot, Boxes, CheckCheck, Clock, Hand, Package, Search, Send, Sparkles, Tag, UserCheck } from "lucide-react";
import { channelMeta } from "@/lib/channels";

// Maqueta de la bandeja para el hero. Es JSX, no una imagen: se ve nítida
// en cualquier pantalla y respeta el tema. Los nombres son de ejemplo.

type CanalMaqueta = "whatsapp" | "instagram" | "messenger";

interface ChatMaqueta {
  nombre: string;
  iniciales: string;
  canal: CanalMaqueta;
  texto: string;
  hora: string;
  noLeidos?: number;
  activo?: boolean;
  soloEscritorio?: boolean;
  chip: { texto: string; tipo: "pedido" | "humano" | "etiqueta"; color?: string };
}

const CHATS: ChatMaqueta[] = [
  {
    nombre: "Sofía Martínez",
    iniciales: "SM",
    canal: "whatsapp",
    texto: "¿Me pasás el estado del pedido?",
    hora: "9:41",
    noLeidos: 2,
    activo: true,
    chip: { texto: "#1042", tipo: "pedido" },
  },
  {
    nombre: "Lucas Fernández",
    iniciales: "LF",
    canal: "instagram",
    texto: "¿Tenés el sérum de vitamina C?",
    hora: "9:38",
    noLeidos: 1,
    chip: { texto: "Mayorista", tipo: "etiqueta", color: "#8b5cf6" },
  },
  {
    nombre: "Valentina Gómez",
    iniciales: "VG",
    canal: "messenger",
    texto: "Quiero hablar con alguien",
    hora: "9:20",
    chip: { texto: "Necesita una persona", tipo: "humano" },
  },
  {
    nombre: "Martín López",
    iniciales: "ML",
    canal: "whatsapp",
    texto: "Gracias, ya me llegó",
    hora: "ayer",
    soloEscritorio: true,
    chip: { texto: "Cliente frecuente", tipo: "etiqueta", color: "#16a34a" },
  },
];

function IconoCanal({ canal, className = "" }: { canal: CanalMaqueta; className?: string }) {
  const m = channelMeta[canal];
  const Icono = m.icon;
  return (
    <span
      className={`flex items-center justify-center rounded-full ring-2 ring-ink-900 ${className}`}
      style={{ background: m.color }}
      title={m.label}
    >
      <Icono className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
    </span>
  );
}

function ChipChat({ chip }: { chip: ChatMaqueta["chip"] }) {
  if (chip.tipo === "pedido") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-brand-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-200">
        <Package className="h-2.5 w-2.5" /> {chip.texto}
      </span>
    );
  }
  if (chip.tipo === "humano") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
        <Hand className="h-2.5 w-2.5" /> {chip.texto}
      </span>
    );
  }
  // Etiqueta: el color es un DATO (lo elige la empresa).
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ background: `${chip.color}26`, color: chip.color }}
    >
      <Tag className="h-2.5 w-2.5" /> {chip.texto}
    </span>
  );
}

export default function MaquetaBandeja() {
  return (
    <div className="relative pb-[3.75rem] sm:pb-8" aria-label="Ejemplo de la bandeja de Clientany" role="img">
      {/* Resplandor detrás de la ventana */}
      <div className="pointer-events-none absolute inset-x-6 top-10 h-3/4 rounded-full bg-brand-500/20 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-ink-700/70 bg-ink-900 shadow-[0_30px_80px_-20px_rgba(10,13,26,0.9)]">
        {/* Barra de la ventana */}
        <div className="flex items-center gap-1.5 border-b border-ink-800 bg-ink-950/60 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-600" />
          <span className="mx-auto rounded-md bg-ink-850 px-3 py-0.5 font-mono text-[10.5px] text-ink-400">
            clientany.com/inbox
          </span>
          <span className="w-[42px]" />
        </div>

        <div className="grid sm:grid-cols-[minmax(0,14.5rem)_minmax(0,1fr)]">
          {/* Lista de chats */}
          <div className="border-b border-ink-800 sm:border-b-0 sm:border-r">
            <div className="flex items-center gap-2 px-3 pt-3">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-[11px] text-ink-400">
                <Search className="h-3 w-3" /> Buscar
              </div>
            </div>
            <div className="flex gap-1 overflow-hidden whitespace-nowrap px-3 pb-2 pt-2.5 text-[11px] [mask-image:linear-gradient(to_right,black_80%,transparent)]">
              <span className="rounded-full bg-brand-500/15 px-2.5 py-1 font-semibold text-brand-200">
                Ventas <span className="text-brand-300">3</span>
              </span>
              <span className="rounded-full px-2 py-1 text-ink-400">Soporte 1</span>
              <span className="rounded-full px-2 py-1 text-ink-400">Más adelante</span>
              <span className="rounded-full px-2 py-1 text-ink-400">Resueltos</span>
            </div>
            <ul className="px-1.5 pb-2">
              {CHATS.map((c) => (
                <li
                  key={c.nombre}
                  className={`${c.soloEscritorio ? "hidden sm:flex" : "flex"} items-start gap-2.5 rounded-xl px-2 py-2 ${
                    c.activo ? "bg-brand-500/10 ring-1 ring-brand-500/25" : ""
                  }`}
                >
                  <div className="relative mt-0.5 shrink-0">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-700 text-[10.5px] font-bold text-ink-100">
                      {c.iniciales}
                    </span>
                    <IconoCanal canal={c.canal} className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`truncate text-[12px] ${c.noLeidos ? "font-bold text-white" : "font-semibold text-ink-200"}`}>
                        {c.nombre}
                      </span>
                      <span className="ml-auto shrink-0 text-[10px] text-ink-500">{c.hora}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`truncate text-[11px] ${c.noLeidos ? "text-ink-200" : "text-ink-400"}`}>{c.texto}</span>
                      {c.noLeidos ? (
                        <span className="ml-auto flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white">
                          {c.noLeidos}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1">
                      <ChipChat chip={c.chip} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Chat abierto */}
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-2.5 border-b border-ink-800 px-3.5 py-2.5">
              <div className="relative shrink-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-700 text-[10.5px] font-bold text-ink-100">
                  SM
                </span>
                <IconoCanal canal="whatsapp" className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[12.5px] font-bold text-white">Sofía Martínez</div>
                <div className="truncate text-[10.5px] text-ink-400">WhatsApp · Pedido #1042</div>
              </div>
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-ink-800 px-2 py-1 text-[10px] font-semibold text-ink-200">
                <UserCheck className="h-3 w-3 text-brand-300" /> <span className="lg:hidden xl:inline">Lo tengo yo</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 border-b border-ink-800 bg-green-500/[0.07] px-3.5 py-1.5 text-[10.5px] font-medium text-green-300">
              <Clock className="h-3 w-3" /> Podés responder (22 h)
            </div>

            <div className="flex flex-1 flex-col gap-2.5 px-3.5 py-3.5">
              {/* Cliente */}
              <div className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-ink-800 px-3 py-2 text-[12px] leading-snug text-ink-100">
                Hola, ¿me pasás el estado del pedido #1042?
                <span className="mt-0.5 block text-right text-[9.5px] text-ink-500">9:40</span>
              </div>
              {/* Bot */}
              <div className="max-w-[85%] self-end rounded-2xl rounded-br-md border border-brand-500/30 bg-ink-850 px-3 py-2 text-[12px] leading-snug text-ink-100">
                <span className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold text-brand-300">
                  <Bot className="h-3 w-3" /> Respuesta automática
                </span>
                Tu pedido #1042 está enviado. Seguimiento: <span className="whitespace-nowrap">AR-48291</span>.
                <span className="mt-0.5 flex items-center justify-end gap-1 text-[9.5px] text-ink-500">
                  9:40 <CheckCheck className="h-3 w-3 text-brand-300" />
                </span>
              </div>
              {/* Agente */}
              <div className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-brand-500 px-3 py-2 text-[12px] leading-snug text-white">
                <span className="mb-0.5 block text-[10px] font-semibold text-brand-100">Caro · equipo</span>
                ¡Hola Sofía! Llega el jueves. Cualquier cosa, escribime por acá.
                <span className="mt-0.5 flex items-center justify-end gap-1 text-[9.5px] text-brand-100">
                  9:41 <CheckCheck className="h-3 w-3" />
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-ink-800 px-3 py-2.5">
              <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-500/10 px-2 py-1.5 text-[10.5px] font-semibold text-brand-200">
                <Sparkles className="h-3 w-3" /> IA
              </span>
              <span className="flex-1 truncate rounded-lg border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-[11px] text-ink-500">
                Escribí una respuesta… (/ para rápidas)
              </span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
                <Send className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta flotante: el stock, al instante */}
      <div className="absolute -bottom-1 left-3 w-[15.5rem] rounded-2xl border border-ink-700 bg-ink-850/95 p-3 shadow-card backdrop-blur sm:-bottom-2 sm:-left-3 lg:-left-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/15">
            <Boxes className="h-[18px] w-[18px] text-brand-300" />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Stock al instante</div>
            <div className="truncate text-[13px] font-semibold text-white">Sérum Vit. C</div>
            <div className="font-mono text-[11.5px] text-ink-300">
              $18.900 · <span className="text-green-300">14 u.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
