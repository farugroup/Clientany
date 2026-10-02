"use client";
// Respuestas automáticas: cada sección del editor del bot. Todas trabajan
// sobre un borrador (`bot`) y avisan los cambios con `cambiar(patch)`; el
// guardado lo hace la página con un solo «Guardar cambios».
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Clock, Gauge, Hand, Headset, ListOrdered, Moon, Package, Plus, Tags, Trash2, Truck } from "lucide-react";
import type { Bot, BotMenuOpcion, CanalTipo, Coincidencia, Empresa, Regla } from "@/lib/crm/types";
import { horarioEnCriollo, rellenar, uid } from "@/lib/crm/core";
import { Campo } from "@/components/crm/ui";
import { CANAL_VISUAL, CampoPalabras, Flechas, InterruptorChico, Tarjeta, TextoConVariables, aNumero, mover } from "./comun";

export type CambiarBot = (patch: Partial<Bot>) => void;
interface Props {
  bot: Bot;
  cambiar: CambiarBot;
  ro: boolean;
}

const VARS = ["{marca}", "{nombre}", "{horario}"];

function Cuerpo({ activo, children }: { activo: boolean; children: React.ReactNode }) {
  return <div className={`space-y-3 transition ${activo ? "" : "opacity-50"}`}>{children}</div>;
}

function Nota({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-ink-500">{children}</p>;
}

// ---------- 1. Bienvenida ----------
export function SeccionBienvenida({ bot, cambiar, ro, empresa }: Props & { empresa: Empresa }) {
  const b = bot.bienvenida;
  return (
    <Tarjeta
      id="bienvenida"
      titulo="Bienvenida"
      icono={Hand}
      sub="Lo primero que recibe quien escribe en horario de atención."
      acciones={
        <InterruptorChico valor={b.activa} onCambio={(v) => cambiar({ bienvenida: { ...b, activa: v } })} etiqueta="Bienvenida activa" deshabilitado={ro} />
      }
    >
      <Cuerpo activo={b.activa}>
        <TextoConVariables valor={b.texto} onCambio={(t) => cambiar({ bienvenida: { ...b, texto: t } })} variables={VARS} deshabilitado={ro} />
        <Nota>
          Una vez cada 24 hs por chat. {"{marca}"} se reemplaza por «{empresa.firma || empresa.nombre}» (
          <Link href="/ajustes#empresa" className="text-brand-300 hover:text-brand-200">
            cambiarlo
          </Link>
          ).
        </Nota>
      </Cuerpo>
    </Tarjeta>
  );
}

// ---------- 2. Fuera de horario ----------
export function SeccionAusencia({ bot, cambiar, ro, empresa }: Props & { empresa: Empresa }) {
  const a = bot.ausencia;
  return (
    <Tarjeta
      id="ausencia"
      titulo="Fuera de horario"
      icono={Moon}
      sub="El aviso para quien escribe cuando no hay nadie."
      acciones={
        <InterruptorChico
          valor={a.activa}
          onCambio={(v) => cambiar({ ausencia: { ...a, activa: v } })}
          etiqueta="Aviso de fuera de horario activo"
          deshabilitado={ro}
        />
      }
    >
      <Cuerpo activo={a.activa}>
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-800 bg-ink-850/60 px-3 py-2 text-xs text-ink-300">
          <Clock className="h-3.5 w-3.5 text-ink-400" />
          <span className="flex-1">
            Atienden <b className="text-white">{horarioEnCriollo(empresa.horario)}</b>
          </span>
          <Link href="/ajustes#horario" className="font-semibold text-brand-300 hover:text-brand-200">
            Cambiar horario
          </Link>
        </div>
        <TextoConVariables valor={a.texto} onCambio={(t) => cambiar({ ausencia: { ...a, texto: t } })} variables={VARS} deshabilitado={ro} />
        <Nota>Una vez cada 12 hs por chat. El chat queda marcado «fuera de horario» hasta que abran.</Nota>
      </Cuerpo>
    </Tarjeta>
  );
}

// ---------- 3. Menú de opciones ----------
const ACCIONES_MENU: { id: BotMenuOpcion["accion"]; nombre: string }[] = [
  { id: "responder", nombre: "Responder un texto" },
  { id: "humano", nombre: "Pasar a una persona" },
  { id: "estado_pedido", nombre: "Estado del pedido" },
  { id: "stock", nombre: "Consultar stock" },
];

export function SeccionMenu({ bot, cambiar, ro }: Props) {
  const m = bot.menu;
  const setOpciones = (opciones: BotMenuOpcion[]) => cambiar({ menu: { ...m, opciones } });
  const setOpcion = (i: number, patch: Partial<BotMenuOpcion>) => setOpciones(m.opciones.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const repetidas = new Set(m.opciones.map((o) => o.clave.trim()).filter((c, i, arr) => c && arr.indexOf(c) !== i));
  const vista = rellenar(m.texto, { opciones: m.opciones.map((o) => `${o.clave}. ${o.etiqueta}`).join("\n"), marca: "tu marca", nombre: "Sofía" });
  return (
    <Tarjeta
      id="menu"
      titulo="Menú de opciones"
      icono={ListOrdered}
      sub="Después de la bienvenida, ofrece opciones numeradas y responde según lo que elija."
      acciones={<InterruptorChico valor={m.activo} onCambio={(v) => cambiar({ menu: { ...m, activo: v } })} etiqueta="Menú activo" deshabilitado={ro} />}
    >
      <Cuerpo activo={m.activo}>
        <Campo etiqueta="Texto del menú" ayuda="{opciones} = la lista numerada">
          <TextoConVariables
            valor={m.texto}
            onCambio={(t) => cambiar({ menu: { ...m, texto: t } })}
            variables={["{opciones}", "{nombre}", "{marca}"]}
            deshabilitado={ro}
          />
        </Campo>
        <div className="space-y-2">
          {m.opciones.map((o, i) => (
            <div key={i} className="rounded-xl border border-ink-800 bg-ink-850/50 p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className={`input w-14 px-2 py-2 text-center font-mono ${repetidas.has(o.clave.trim()) ? "border-red-500/60" : ""}`}
                  value={o.clave}
                  onChange={(e) => setOpcion(i, { clave: e.target.value })}
                  aria-label="Número de la opción"
                  title={repetidas.has(o.clave.trim()) ? "Ese número está repetido" : "Lo que tiene que responder el cliente"}
                />
                <input
                  className="input min-w-[140px] flex-1 py-2"
                  value={o.etiqueta}
                  onChange={(e) => setOpcion(i, { etiqueta: e.target.value })}
                  placeholder="Quiero comprar"
                  aria-label="Texto de la opción"
                />
                <select
                  className="input w-full py-2 sm:w-48"
                  value={o.accion}
                  onChange={(e) => setOpcion(i, { accion: e.target.value as BotMenuOpcion["accion"] })}
                  aria-label="Qué hace"
                >
                  {ACCIONES_MENU.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
                <span className="ml-auto flex items-center">
                  <Flechas
                    onArriba={() => setOpciones(mover(m.opciones, i, -1))}
                    onAbajo={() => setOpciones(mover(m.opciones, i, 1))}
                    primero={i === 0}
                    ultimo={i === m.opciones.length - 1}
                  />
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-ink-500 hover:bg-red-500/10 hover:text-red-400"
                    onClick={() => setOpciones(m.opciones.filter((_, j) => j !== i))}
                    aria-label="Quitar opción"
                    title="Quitar opción"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </div>
              {o.accion === "responder" && (
                <textarea
                  className="input mt-2 py-2"
                  rows={2}
                  value={o.respuesta || ""}
                  onChange={(e) => setOpcion(i, { respuesta: e.target.value })}
                  placeholder="Lo que contesta el bot cuando elige esta opción"
                />
              )}
            </div>
          ))}
          {repetidas.size > 0 && <p className="text-xs text-red-400">Hay números de opción repetidos: el cliente no va a poder elegir bien.</p>}
          <button
            type="button"
            className="btn-soft px-3 py-2 text-xs"
            onClick={() => {
              const max = m.opciones.reduce((n, o) => Math.max(n, Number(o.clave) || 0), 0);
              setOpciones([...m.opciones, { clave: String(max + 1), etiqueta: "", accion: "responder", respuesta: "" }]);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Opción
          </button>
        </div>
        {m.opciones.length > 0 && (
          <div>
            <div className="mb-1 text-[11px] text-ink-500">Así lo ve el cliente:</div>
            <div className="max-w-sm whitespace-pre-wrap rounded-2xl rounded-tr-sm border border-brand-500/25 bg-brand-500/10 px-3 py-2 text-sm text-ink-100">
              {vista}
            </div>
          </div>
        )}
      </Cuerpo>
    </Tarjeta>
  );
}

// ---------- 4. Reglas por palabra clave ----------
const COINCIDENCIAS: { id: Coincidencia; nombre: string }[] = [
  { id: "contiene", nombre: "Contiene la palabra" },
  { id: "exacta", nombre: "Es exactamente eso" },
  { id: "empieza", nombre: "Empieza con" },
];
const CANALES_REGLA: CanalTipo[] = ["whatsapp", "instagram", "messenger"];

export function nuevaRegla(orden: number): Regla {
  return {
    id: uid("rg"),
    nombre: `Regla ${orden + 1}`,
    activa: true,
    palabras: [],
    coincidencia: "contiene",
    respuesta: "",
    canales: [],
    solo_fuera_horario: false,
    una_vez_por_dia: false,
    orden,
  };
}

function Casilla({ valor, onCambio, children }: { valor: boolean; onCambio: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-ink-200">
      <input
        type="checkbox"
        checked={valor}
        onChange={(e) => onCambio(e.target.checked)}
        className="h-4 w-4 rounded border-ink-600 bg-ink-850 accent-brand-500"
      />
      {children}
    </label>
  );
}

export function SeccionReglas({ bot, cambiar, ro }: Props) {
  const reglas = bot.reglas;
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set());
  const setReglas = (lista: Regla[]) => cambiar({ reglas: lista.map((r, i) => ({ ...r, orden: i })) });
  const setRegla = (i: number, patch: Partial<Regla>) => setReglas(reglas.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const alternar = (id: string) =>
    setAbiertas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <Tarjeta
      id="reglas"
      titulo="Reglas por palabra clave"
      icono={Tags}
      sub="Si el mensaje tiene alguna de estas palabras, responde el texto. Se revisan en orden: gana la primera que coincide."
      acciones={
        <button
          type="button"
          className="btn-soft px-3 py-2 text-xs"
          onClick={() => {
            const r = nuevaRegla(reglas.length);
            setReglas([...reglas, r]);
            setAbiertas((s) => new Set(s).add(r.id));
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Nueva regla
        </button>
      }
    >
      {!reglas.length ? (
        <div className="rounded-xl border border-dashed border-ink-700 px-4 py-6 text-center text-sm text-ink-400">
          Sin reglas todavía. Ejemplo: «envío, envios, mandan» → «Hacemos envíos a todo el país…»
        </div>
      ) : (
        <div className="space-y-2">
          {reglas.map((r, i) => {
            const abierta = ro || abiertas.has(r.id);
            const incompleta = r.activa && (!r.palabras.length || !r.respuesta.trim());
            return (
              <div key={r.id} className={`rounded-xl border bg-ink-850/50 ${incompleta ? "border-amber-500/40" : "border-ink-800"}`}>
                <div className="flex items-center gap-2 p-2.5">
                  <InterruptorChico valor={r.activa} onCambio={(v) => setRegla(i, { activa: v })} etiqueta={r.activa ? "Regla activa" : "Regla apagada"} />
                  <button type="button" onClick={() => alternar(r.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    {abierta ? <ChevronDown className="h-4 w-4 shrink-0 text-ink-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" />}
                    <span className={`truncate text-sm font-semibold ${r.activa ? "text-white" : "text-ink-400"}`}>{r.nombre || "Sin nombre"}</span>
                    {!abierta && (
                      <span className="hidden min-w-0 truncate text-xs text-ink-500 sm:inline">
                        {r.palabras.length ? r.palabras.join(", ") : "sin palabras"}
                      </span>
                    )}
                    {incompleta && <span className="chip shrink-0 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">incompleta</span>}
                  </button>
                  <Flechas
                    onArriba={() => setReglas(mover(reglas, i, -1))}
                    onAbajo={() => setReglas(mover(reglas, i, 1))}
                    primero={i === 0}
                    ultimo={i === reglas.length - 1}
                  />
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-ink-500 hover:bg-red-500/10 hover:text-red-400"
                    onClick={() => setReglas(reglas.filter((_, j) => j !== i))}
                    aria-label={`Borrar la regla ${r.nombre}`}
                    title="Borrar regla"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {abierta && (
                  <div className="space-y-3 border-t border-ink-800 p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px]">
                      <Campo etiqueta="Nombre" ayuda="para reconocerla">
                        <input className="input py-2" value={r.nombre} onChange={(e) => setRegla(i, { nombre: e.target.value })} placeholder="Envíos" />
                      </Campo>
                      <Campo etiqueta="Coincidencia">
                        <select className="input py-2" value={r.coincidencia} onChange={(e) => setRegla(i, { coincidencia: e.target.value as Coincidencia })}>
                          {COINCIDENCIAS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}
                            </option>
                          ))}
                        </select>
                      </Campo>
                    </div>
                    <Campo etiqueta="Palabras" ayuda="separadas por coma · sin importar acentos ni mayúsculas">
                      <CampoPalabras
                        valor={r.palabras}
                        onCambio={(p) => setRegla(i, { palabras: p })}
                        placeholder="envío, envios, mandan, llega"
                        deshabilitado={ro}
                      />
                    </Campo>
                    <Campo etiqueta="Respuesta">
                      <TextoConVariables
                        valor={r.respuesta}
                        onCambio={(t) => setRegla(i, { respuesta: t })}
                        variables={VARS}
                        placeholder="Hacemos envíos a todo el país…"
                        deshabilitado={ro}
                      />
                    </Campo>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="text-xs text-ink-400">Canales:</span>
                      {CANALES_REGLA.map((c) => (
                        <Casilla
                          key={c}
                          valor={r.canales.includes(c)}
                          onCambio={(v) => setRegla(i, { canales: v ? [...r.canales, c] : r.canales.filter((x) => x !== c) })}
                        >
                          {CANAL_VISUAL[c].nombre}
                        </Casilla>
                      ))}
                      <span className="text-[11px] text-ink-500">{r.canales.length ? "" : "(ninguno marcado = todos)"}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                      <Casilla valor={r.solo_fuera_horario} onCambio={(v) => setRegla(i, { solo_fuera_horario: v })}>
                        Sólo fuera de horario
                      </Casilla>
                      <Casilla valor={r.una_vez_por_dia} onCambio={(v) => setRegla(i, { una_vez_por_dia: v })}>
                        Una vez por día por chat
                      </Casilla>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Tarjeta>
  );
}

// ---------- 5. Stock y precios ----------
export function SeccionStock({ bot, cambiar, ro }: Props) {
  const s = bot.stock;
  const vars = ["{producto}", "{precio}", "{stock}", "{nombre}"];
  return (
    <Tarjeta
      id="stock"
      titulo="Stock y precios"
      icono={Package}
      sub="Cuando preguntan «¿tienen…?» o «¿cuánto sale…?»."
      acciones={
        <InterruptorChico
          valor={s.activa}
          onCambio={(v) => cambiar({ stock: { ...s, activa: v } })}
          etiqueta="Respuestas de stock activas"
          deshabilitado={ro}
        />
      }
    >
      <Cuerpo activo={s.activa}>
        <Campo etiqueta="Si hay stock">
          <TextoConVariables valor={s.con_stock} onCambio={(t) => cambiar({ stock: { ...s, con_stock: t } })} variables={vars} filas={2} deshabilitado={ro} />
        </Campo>
        <Campo etiqueta="Si no hay">
          <TextoConVariables valor={s.sin_stock} onCambio={(t) => cambiar({ stock: { ...s, sin_stock: t } })} variables={vars} filas={2} deshabilitado={ro} />
        </Campo>
        <Nota>
          Busca en tu lista de{" "}
          <Link href="/stock" className="text-brand-300 hover:text-brand-200">
            Stock
          </Link>{" "}
          por nombre o SKU (sólo los productos activos). Si no encuentra nada, sigue de largo.
        </Nota>
      </Cuerpo>
    </Tarjeta>
  );
}

// ---------- 6. Estado del pedido ----------
export function SeccionPedidos({ bot, cambiar, ro }: Props) {
  const p = bot.pedidos;
  return (
    <Tarjeta
      id="pedidos"
      titulo="Estado del pedido"
      icono={Truck}
      sub="Cuando preguntan «¿dónde está mi pedido?» o mandan un número de pedido."
      acciones={
        <InterruptorChico
          valor={p.activa}
          onCambio={(v) => cambiar({ pedidos: { ...p, activa: v } })}
          etiqueta="Respuestas de pedidos activas"
          deshabilitado={ro}
        />
      }
    >
      <Cuerpo activo={p.activa}>
        <Campo etiqueta="Respuesta" ayuda="{estado} ya es la frase armada">
          <TextoConVariables
            valor={p.texto_estado}
            onCambio={(t) => cambiar({ pedidos: { ...p, texto_estado: t } })}
            variables={["{estado}", "{numero}", "{transporte}", "{seguimiento}", "{nombre}"]}
            filas={2}
            deshabilitado={ro}
          />
        </Campo>
        <Nota>Ejemplo de {"{estado}"}: «Tu pedido #1234 está enviado. Seguimiento: 3600023 (Andreani).»</Nota>
        <Campo etiqueta="Si no encuentra el pedido">
          <TextoConVariables
            valor={p.sin_pedido}
            onCambio={(t) => cambiar({ pedidos: { ...p, sin_pedido: t } })}
            variables={["{nombre}", "{marca}"]}
            filas={2}
            deshabilitado={ro}
          />
        </Campo>
        <Nota>
          Busca por número o por el teléfono/mail del cliente en{" "}
          <Link href="/pedidos" className="text-brand-300 hover:text-brand-200">
            Pedidos
          </Link>
          .
        </Nota>
      </Cuerpo>
    </Tarjeta>
  );
}

// ---------- 7. Pasar a una persona ----------
export function SeccionHumano({ bot, cambiar, ro }: Props) {
  const h = bot.humano;
  return (
    <Tarjeta id="humano" titulo="Pasar a una persona" icono={Headset} sub="Si el cliente pide hablar con alguien, el bot avisa y se corre.">
      <div className="space-y-3">
        <Campo etiqueta="Palabras que lo disparan" ayuda="separadas por coma">
          <CampoPalabras
            valor={h.palabras}
            onCambio={(p) => cambiar({ humano: { ...h, palabras: p } })}
            placeholder="humano, persona, asesor"
            deshabilitado={ro}
          />
        </Campo>
        <Campo etiqueta="Qué le contesta">
          <TextoConVariables valor={h.texto} onCambio={(t) => cambiar({ humano: { ...h, texto: t } })} variables={VARS} filas={2} deshabilitado={ro} />
        </Campo>
        <Nota>El chat queda marcado «necesita una persona» en la Bandeja. Gana a cualquier otra regla.</Nota>
      </div>
    </Tarjeta>
  );
}

// ---------- 8. Límites ----------
export function SeccionLimites({ bot, cambiar, ro }: Props) {
  return (
    <Tarjeta id="limites" titulo="Límites" icono={Gauge} sub="Para que el bot nunca moleste de más.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo etiqueta="Tope de respuestas por chat y día">
          <input
            type="number"
            min={1}
            max={50}
            className="input font-mono"
            value={bot.tope_por_dia}
            disabled={ro}
            onChange={(e) => cambiar({ tope_por_dia: Math.max(1, Math.round(aNumero(e.target.value)) || 1) })}
          />
        </Campo>
        <Campo etiqueta="Callarse si una persona respondió hace menos de (min)">
          <input
            type="number"
            min={0}
            max={1440}
            className="input font-mono"
            value={bot.pausa_si_persona_min}
            disabled={ro}
            onChange={(e) => cambiar({ pausa_si_persona_min: Math.max(0, Math.round(aNumero(e.target.value))) })}
          />
        </Campo>
      </div>
      <p className="mt-2 text-[11px] text-ink-500">
        Además, el bot nunca escribe en un chat que alguien tomó («Lo tomo yo»), ni a quien pidió la baja, ni en canales manuales.
      </p>
    </Tarjeta>
  );
}
