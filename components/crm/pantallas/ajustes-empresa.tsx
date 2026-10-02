"use client";
// Configuración: empresa, horario de atención, tu perfil, plan y primeros pasos.
// Cada sección edita un borrador propio y guarda sólo lo suyo.
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, Circle, Clock, CopyCheck, CreditCard, Mail, Rocket, RotateCcw, UserRound } from "lucide-react";
import type { Empresa, Horario, HorarioDia, Plan } from "@/lib/crm/types";
import { HORARIO_DEFAULT, estaAbierto, fechaCorta, horarioEnCriollo } from "@/lib/crm/core";
import { getRepo } from "@/lib/crm/repo";
import { useCanales, useInvitaciones, useMiembros, usePedidos, useProductos, useYo } from "@/lib/crm/hooks";
import { BotonCargando, Campo, avisar } from "@/components/crm/ui";
import { InterruptorChico, Tarjeta, monedasCon } from "./comun";

// ---------- borrador que se pone al día si no lo tocaste ----------
export function useBorrador<T>(externo: T): { valor: T; set: (v: T | ((x: T) => T)) => void; sucio: boolean; descartar: () => void } {
  const ext = JSON.stringify(externo);
  const [valor, set] = useState<T>(externo);
  const base = useRef(ext);
  useEffect(() => {
    const anterior = base.current;
    set((actual) => (JSON.stringify(actual) === anterior ? (JSON.parse(ext) as T) : actual));
    base.current = ext;
  }, [ext]);
  return { valor, set, sucio: JSON.stringify(valor) !== ext, descartar: () => set(JSON.parse(ext) as T) };
}

export function PieGuardar({
  sucio,
  cargando,
  onGuardar,
  onDescartar,
  ro,
  texto = "Guardar",
}: {
  sucio: boolean;
  cargando: boolean;
  onGuardar: () => void;
  onDescartar: () => void;
  ro: boolean;
  texto?: string;
}) {
  if (ro) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-ink-800 pt-3">
      {sucio && <span className="mr-auto text-xs text-amber-400">Cambios sin guardar</span>}
      {sucio && (
        <button type="button" className="btn-ghost py-2" onClick={onDescartar} disabled={cargando}>
          <RotateCcw className="h-4 w-4" /> Descartar
        </button>
      )}
      <BotonCargando cargando={cargando} onClick={onGuardar} disabled={!sucio} className="btn-primary py-2">
        {texto}
      </BotonCargando>
    </div>
  );
}

// Guardar un patch de la empresa con spinner y aviso.
export function useGuardarEmpresa() {
  const [cargando, setCargando] = useState(false);
  async function guardar(patch: Partial<Empresa> & { ia_clave?: string }, ok = "Guardado.") {
    setCargando(true);
    try {
      await getRepo().actualizarEmpresa(patch);
      avisar(ok);
      return true;
    } catch (e) {
      avisar(e, "error");
      return false;
    } finally {
      setCargando(false);
    }
  }
  return { cargando, guardar };
}

// ---------- 1. Empresa ----------
const PAISES = [
  { id: "AR", nombre: "Argentina" },
  { id: "UY", nombre: "Uruguay" },
  { id: "CL", nombre: "Chile" },
  { id: "PY", nombre: "Paraguay" },
  { id: "BO", nombre: "Bolivia" },
  { id: "PE", nombre: "Perú" },
  { id: "CO", nombre: "Colombia" },
  { id: "EC", nombre: "Ecuador" },
  { id: "MX", nombre: "México" },
  { id: "BR", nombre: "Brasil" },
  { id: "ES", nombre: "España" },
  { id: "US", nombre: "Estados Unidos" },
];

// Acepta "AR" o "Argentina" y devuelve el código.
function codigoDePais(p: string | undefined): string {
  const t = (p || "").trim().toLowerCase();
  return PAISES.find((x) => x.id.toLowerCase() === t || x.nombre.toLowerCase() === t)?.id || p || "AR";
}

export function SeccionEmpresa({ empresa, ro }: { empresa: Empresa; ro: boolean }) {
  const b = useBorrador({
    nombre: empresa.nombre || "",
    rubro: empresa.rubro || "",
    pais: codigoDePais(empresa.pais),
    moneda: empresa.moneda || "ARS",
    firma: empresa.firma || "",
  });
  const { cargando, guardar } = useGuardarEmpresa();
  const [error, setError] = useState("");
  const f = b.valor;
  const set = (k: keyof typeof f, v: string) => b.set((x) => ({ ...x, [k]: v }));
  const paises = PAISES.some((p) => p.id === f.pais) ? PAISES : [{ id: f.pais, nombre: f.pais }, ...PAISES];

  async function onGuardar() {
    if (!f.nombre.trim()) return setError("La empresa necesita un nombre.");
    setError("");
    await guardar(
      { nombre: f.nombre.trim(), rubro: f.rubro.trim() || undefined, pais: f.pais, moneda: f.moneda, firma: f.firma.trim() || undefined },
      "Datos de la empresa guardados.",
    );
  }

  return (
    <Tarjeta id="empresa" titulo="Empresa" icono={Building2} sub="Los datos de tu negocio. La moneda es la de los pedidos y el stock.">
      <fieldset disabled={ro} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo etiqueta="Nombre" error={error}>
          <input className="input" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Mi Tienda" />
        </Campo>
        <Campo etiqueta="Rubro" ayuda="opcional">
          <input className="input" value={f.rubro} onChange={(e) => set("rubro", e.target.value)} placeholder="Indumentaria, fitness, electrónica…" />
        </Campo>
        <Campo etiqueta="País">
          <select className="input" value={f.pais} onChange={(e) => set("pais", e.target.value)}>
            {paises.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Moneda">
          <select className="input" value={f.moneda} onChange={(e) => set("moneda", e.target.value)}>
            {monedasCon(f.moneda).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Campo>
        <div className="sm:col-span-2">
          <Campo etiqueta="Firma" ayuda="cómo se presenta la marca en los automáticos: {marca}">
            <input className="input" value={f.firma} onChange={(e) => set("firma", e.target.value)} placeholder={f.nombre || "Mi Tienda"} />
          </Campo>
          <p className="mt-1 text-[11px] text-ink-500">
            Ejemplo: «¡Hola! Gracias por escribirle a <b className="text-ink-300">{f.firma.trim() || f.nombre || "tu marca"}</b>…». Si la dejás vacía, usamos el
            nombre.
          </p>
        </div>
      </fieldset>
      <PieGuardar sucio={b.sucio} cargando={cargando} onGuardar={onGuardar} onDescartar={b.descartar} ro={ro} />
    </Tarjeta>
  );
}

// ---------- 2. Horario de atención ----------
const ZONAS = [
  { id: "America/Argentina/Buenos_Aires", nombre: "Argentina (Buenos Aires)" },
  { id: "America/Montevideo", nombre: "Uruguay (Montevideo)" },
  { id: "America/Santiago", nombre: "Chile (Santiago)" },
  { id: "America/Asuncion", nombre: "Paraguay (Asunción)" },
  { id: "America/La_Paz", nombre: "Bolivia (La Paz)" },
  { id: "America/Lima", nombre: "Perú (Lima)" },
  { id: "America/Bogota", nombre: "Colombia (Bogotá)" },
  { id: "America/Guayaquil", nombre: "Ecuador (Guayaquil)" },
  { id: "America/Caracas", nombre: "Venezuela (Caracas)" },
  { id: "America/Mexico_City", nombre: "México (Ciudad de México)" },
  { id: "America/Sao_Paulo", nombre: "Brasil (San Pablo)" },
  { id: "America/Panama", nombre: "Panamá" },
  { id: "America/Costa_Rica", nombre: "Costa Rica" },
  { id: "America/Santo_Domingo", nombre: "República Dominicana" },
  { id: "Europe/Madrid", nombre: "España (Madrid)" },
];
const ORDEN_DIAS: HorarioDia["dia"][] = [1, 2, 3, 4, 5, 6, 0];
const NOMBRE_DIA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function completarHorario(h: Horario | undefined): Horario {
  const base = h || HORARIO_DEFAULT;
  return {
    zona: base.zona || HORARIO_DEFAULT.zona,
    dias: ORDEN_DIAS.map((d) => base.dias?.find((x) => x.dia === d) || { dia: d, abre: false, desde: "09:00", hasta: "18:00" }),
  };
}

export function SeccionHorario({ empresa, ro }: { empresa: Empresa; ro: boolean }) {
  const b = useBorrador(completarHorario(empresa.horario));
  const { cargando, guardar } = useGuardarEmpresa();
  const h = b.valor;
  const malos = h.dias.filter((d) => d.abre && d.desde >= d.hasta).map((d) => d.dia);
  const zonas = ZONAS.some((z) => z.id === h.zona) ? ZONAS : [{ id: h.zona, nombre: h.zona }, ...ZONAS];
  const setDia = (dia: number, patch: Partial<HorarioDia>) => b.set((x) => ({ ...x, dias: x.dias.map((d) => (d.dia === dia ? { ...d, ...patch } : d)) }));
  const abiertoAhora = estaAbierto(h);

  function copiarLunes() {
    const lunes = h.dias.find((d) => d.dia === 1);
    if (!lunes) return;
    b.set((x) => ({ ...x, dias: x.dias.map((d) => (d.dia >= 2 && d.dia <= 5 ? { ...d, abre: lunes.abre, desde: lunes.desde, hasta: lunes.hasta } : d)) }));
  }

  async function onGuardar() {
    if (malos.length) {
      avisar(`Revisá ${malos.map((d) => NOMBRE_DIA[d].toLowerCase()).join(", ")}: la hora de cierre tiene que ser después de la de apertura.`, "error");
      return;
    }
    await guardar({ horario: h }, "Horario guardado.");
  }

  return (
    <Tarjeta
      id="horario"
      titulo="Horario de atención"
      icono={Clock}
      sub="Fuera de este horario el bot manda el aviso de ausencia y los chats quedan marcados."
      acciones={
        <span className={`chip px-2 py-0.5 text-[11px] ${abiertoAhora ? "bg-green-500/10 text-green-400" : "bg-ink-800 text-ink-300"}`}>
          {abiertoAhora ? "Ahora: abierto" : "Ahora: cerrado"}
        </span>
      }
    >
      <fieldset disabled={ro} className="space-y-3">
        <Campo etiqueta="Zona horaria">
          <select className="input" value={h.zona} onChange={(e) => b.set((x) => ({ ...x, zona: e.target.value }))}>
            {zonas.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <div className="divide-y divide-ink-800 rounded-xl border border-ink-800">
          {h.dias.map((d) => (
            <div key={d.dia} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <InterruptorChico valor={d.abre} onCambio={(v) => setDia(d.dia, { abre: v })} etiqueta={`${NOMBRE_DIA[d.dia]}: ${d.abre ? "abre" : "cerrado"}`} />
              <span className={`w-24 text-sm ${d.abre ? "text-white" : "text-ink-500"}`}>{NOMBRE_DIA[d.dia]}</span>
              {d.abre ? (
                <span className="flex items-center gap-2 text-xs text-ink-400">
                  <input
                    type="time"
                    className={`input w-[140px] px-3 py-1.5 font-mono ${malos.includes(d.dia) ? "border-red-500/60" : ""}`}
                    value={d.desde}
                    onChange={(e) => setDia(d.dia, { desde: e.target.value })}
                    aria-label={`${NOMBRE_DIA[d.dia]}: desde`}
                  />
                  a
                  <input
                    type="time"
                    className={`input w-[140px] px-3 py-1.5 font-mono ${malos.includes(d.dia) ? "border-red-500/60" : ""}`}
                    value={d.hasta}
                    onChange={(e) => setDia(d.dia, { hasta: e.target.value })}
                    aria-label={`${NOMBRE_DIA[d.dia]}: hasta`}
                  />
                </span>
              ) : (
                <span className="text-xs text-ink-500">Cerrado</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-ink-300">
            En los automáticos: «<b className="text-white">{horarioEnCriollo(h)}</b>»
          </p>
          {!ro && (
            <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-300 hover:text-brand-200" onClick={copiarLunes}>
              <CopyCheck className="h-3.5 w-3.5" /> Copiar el lunes de martes a viernes
            </button>
          )}
        </div>
      </fieldset>
      <PieGuardar sucio={b.sucio} cargando={cargando} onGuardar={onGuardar} onDescartar={b.descartar} ro={ro} />
    </Tarjeta>
  );
}

// ---------- Tu perfil ----------
export function SeccionPerfil() {
  const yo = useYo();
  const b = useBorrador({ nombre: yo?.nombre || "" });
  const [cargando, setCargando] = useState(false);
  if (!yo) return null;

  async function onGuardar() {
    if (!yo || !b.valor.nombre.trim()) return;
    setCargando(true);
    try {
      await getRepo().actualizarMiembro(yo.id, { nombre: b.valor.nombre.trim() });
      avisar("Tu nombre quedó guardado.");
    } catch (e) {
      avisar(e, "error");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Tarjeta id="perfil" titulo="Tu perfil" icono={UserRound} sub="Así te ve el equipo y así firmás en el chat interno.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo etiqueta="Tu nombre">
          <input className="input" value={b.valor.nombre} onChange={(e) => b.set({ nombre: e.target.value })} />
        </Campo>
        <Campo etiqueta="Email" ayuda={yo.rol === "admin" ? "Admin" : "Agente"}>
          <input className="input" value={yo.email} readOnly disabled />
        </Campo>
      </div>
      <PieGuardar sucio={b.sucio} cargando={cargando} onGuardar={onGuardar} onDescartar={b.descartar} ro={false} />
    </Tarjeta>
  );
}

// ---------- 9. Plan ----------
const NOMBRE_PLAN: Record<Plan, string> = { prueba: "Prueba gratis", inicial: "Inicial", pro: "Pro", empresa: "Empresa" };

export function SeccionPlan({ empresa }: { empresa: Empresa }) {
  const hasta = empresa.prueba_hasta ? new Date(empresa.prueba_hasta) : null;
  const dias = hasta ? Math.ceil((hasta.getTime() - Date.now()) / 86_400_000) : null;
  const asunto = encodeURIComponent(`Plan de Clientany · ${empresa.nombre}`);
  return (
    <Tarjeta id="plan" titulo="Plan" icono={CreditCard}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold text-white">{NOMBRE_PLAN[empresa.plan] || empresa.plan}</div>
          {empresa.plan === "prueba" && hasta ? (
            <p className="text-sm text-ink-400">
              Hasta el {fechaCorta(hasta.toISOString())}
              {dias !== null && (dias > 0 ? ` · quedan ${dias} ${dias === 1 ? "día" : "días"}` : " · ya venció")}.
            </p>
          ) : (
            <p className="text-sm text-ink-400">Cliente desde el {fechaCorta(empresa.creado)}.</p>
          )}
        </div>
        <a href={`mailto:hola@clientany.com?subject=${asunto}`} className="btn-primary shrink-0">
          <Mail className="h-4 w-4" /> Hablar con ventas
        </a>
      </div>
    </Tarjeta>
  );
}

// ---------- Primeros pasos ----------
function Paso({ hecho, href, children }: { hecho: boolean; href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition ${
        hecho ? "border-green-500/20 bg-green-500/5 text-ink-400" : "border-ink-700 bg-ink-850 text-white hover:border-brand-500/40"
      }`}
    >
      {hecho ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" /> : <Circle className="h-4 w-4 shrink-0 text-ink-500" />}
      <span className={hecho ? "line-through" : ""}>{children}</span>
    </Link>
  );
}

export function PrimerosPasos({ empresa }: { empresa: Empresa }) {
  const canales = useCanales();
  const pedidos = usePedidos();
  const productos = useProductos();
  const miembros = useMiembros();
  const invitaciones = useInvitaciones();
  const pasos = [
    { hecho: !!empresa.rubro, href: "#empresa", texto: "Completar los datos de la empresa" },
    { hecho: canales.some((c) => c.tipo !== "manual"), href: "/conexiones", texto: "Conectar WhatsApp, Instagram o Messenger" },
    { hecho: productos.length > 0, href: "/stock", texto: "Cargar tu lista de stock" },
    { hecho: pedidos.length > 0, href: "/pedidos", texto: "Cargar tus pedidos" },
    { hecho: miembros.length > 1 || invitaciones.length > 0, href: "/equipo", texto: "Invitar a tu equipo" },
  ];
  const hechos = pasos.filter((p) => p.hecho).length;
  if (hechos === pasos.length) return null;
  const pct = Math.round((hechos / pasos.length) * 100);
  return (
    <Tarjeta
      titulo="Primeros pasos"
      icono={Rocket}
      acciones={
        <span className="chip bg-ink-800 text-ink-200">
          {hechos}/{pasos.length}
        </span>
      }
    >
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-ink-800">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {pasos.map((p) => (
          <Paso key={p.texto} hecho={p.hecho} href={p.href}>
            {p.texto}
          </Paso>
        ))}
      </div>
    </Tarjeta>
  );
}
