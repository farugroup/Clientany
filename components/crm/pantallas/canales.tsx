"use client";
// Conexiones: tarjeta de un canal conectado, modal para conectar uno nuevo
// (con el paso a paso de Meta y el webhook de la empresa) y el simulador de
// mensajes entrantes.
import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Inbox, KeyRound, Lock, PlugZap, Send, ShieldCheck, ShieldOff, Unplug, Webhook } from "lucide-react";
import type { BotResultado, Canal, CanalTipo, Conversacion, Empresa } from "@/lib/crm/types";
import { fechaCorta, haceCuanto, normalizarTelefono } from "@/lib/crm/core";
import { getRepo, type ConectarCanalInput } from "@/lib/crm/repo";
import { useData } from "@/lib/data-store";
import { BotonCargando, Campo, ChipColor, Confirmar, Modal, avisar } from "@/components/crm/ui";
import { CANAL_VISUAL, CanalIcono, CampoCopiable, codigoPais, useBaseUrl } from "./comun";
import { nombreMotivo } from "./bot-probar";

// ---------- estado del canal ----------
const ESTADO_CANAL: Record<Canal["estado"], { nombre: string; color: string }> = {
  conectado: { nombre: "Conectado", color: "#16a34a" },
  error: { nombre: "Con error", color: "#ef4444" },
  pendiente: { nombre: "Pendiente", color: "#9aa3c0" },
};

const CALIDAD: Record<string, { nombre: string; color: string }> = {
  GREEN: { nombre: "Calidad alta", color: "#16a34a" },
  YELLOW: { nombre: "Calidad media", color: "#f59e0b" },
  RED: { nombre: "Calidad baja", color: "#ef4444" },
};

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="shrink-0 text-ink-500">{etiqueta}</span>
      <span className="min-w-0 truncate text-right text-ink-200">{children}</span>
    </div>
  );
}

export function TarjetaCanal({ canal, esAdmin, modo }: { canal: Canal; esAdmin: boolean; modo: "demo" | "nube" }) {
  const [probando, setProbando] = useState(false);
  const [desconectar, setDesconectar] = useState(false);
  const est = ESTADO_CANAL[canal.estado] || ESTADO_CANAL.pendiente;
  const d = canal.detalle || {};
  const v = CANAL_VISUAL[canal.tipo];
  const calidad = d.calidad ? CALIDAD[d.calidad.toUpperCase()] : undefined;
  const manual = canal.tipo === "manual";

  async function probar() {
    setProbando(true);
    try {
      const r = await getRepo().probarCanal(canal.id);
      if (r.ok) {
        const quien = r.detalle?.numero_visible || r.detalle?.nombre_verificado || r.detalle?.usuario_ig || r.detalle?.nombre_pagina;
        avisar(`${v.nombre} anda bien${quien ? `: ${quien}` : ""}.`);
      } else {
        avisar(r.error || "Meta no aceptó las credenciales.", "error");
      }
    } catch (e) {
      avisar(e, "error");
    } finally {
      setProbando(false);
    }
  }

  return (
    <>
      <div className="card flex flex-col p-4">
        <div className="flex items-start gap-3">
          <CanalIcono tipo={canal.tipo} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{canal.nombre || v.nombre}</div>
            <div className="text-xs text-ink-400">{v.nombre}</div>
          </div>
          <ChipColor color={est.color} chico>
            {est.nombre}
          </ChipColor>
        </div>

        {canal.estado === "error" && canal.ultimo_error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/5 px-2.5 py-2 text-xs text-red-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{canal.ultimo_error}</span>
          </div>
        )}

        <div className="mt-3 space-y-1.5 border-t border-ink-800 pt-3">
          {d.numero_visible && <Fila etiqueta="Número">{d.numero_visible}</Fila>}
          {d.nombre_verificado && <Fila etiqueta="Nombre verificado">{d.nombre_verificado}</Fila>}
          {d.usuario_ig && <Fila etiqueta="Instagram">@{d.usuario_ig.replace(/^@/, "")}</Fila>}
          {d.nombre_pagina && <Fila etiqueta="Página">{d.nombre_pagina}</Fila>}
          {!manual && (
            <Fila etiqueta={canal.tipo === "whatsapp" ? "Phone Number ID" : canal.tipo === "instagram" ? "Instagram ID" : "Page ID"}>
              <span className="font-mono">{canal.externo_id || "sin dato"}</span>
            </Fila>
          )}
          {canal.waba_id && (
            <Fila etiqueta="WABA ID">
              <span className="font-mono">{canal.waba_id}</span>
            </Fila>
          )}
          <Fila etiqueta="Conectado">{canal.conectado_en ? `${fechaCorta(canal.conectado_en)} · ${haceCuanto(canal.conectado_en)}` : "sin dato"}</Fila>
        </div>

        {!manual && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {canal.token_cargado ? (
              <span className="chip bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400">
                <KeyRound className="h-3 w-3" /> Token cargado
              </span>
            ) : (
              <span className="chip bg-ink-800 px-2 py-0.5 text-[10px] text-ink-300">
                <KeyRound className="h-3 w-3" /> Sin token{modo === "demo" ? " (demo)" : ""}
              </span>
            )}
            {canal.app_secret_cargado ? (
              <span className="chip bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400" title="Validamos que cada aviso venga de Meta">
                <ShieldCheck className="h-3 w-3" /> Firma validada
              </span>
            ) : (
              <span className="chip bg-ink-800 px-2 py-0.5 text-[10px] text-ink-400" title="Sin App Secret aceptamos los avisos sin validar la firma de Meta">
                <ShieldOff className="h-3 w-3" /> Sin App Secret
              </span>
            )}
            {calidad && (
              <span className="chip px-2 py-0.5 text-[10px]" style={{ color: calidad.color, background: `${calidad.color}1a` }}>
                {calidad.nombre}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-3">
          {!manual && (
            <BotonCargando cargando={probando} onClick={probar} className="btn-ghost flex-1 py-2 text-xs">
              {!probando && <PlugZap className="h-3.5 w-3.5" />} Probar
            </BotonCargando>
          )}
          {esAdmin && (
            <button onClick={() => setDesconectar(true)} className={`btn-ghost py-2 text-xs text-red-400 hover:bg-red-500/10 ${manual ? "flex-1" : ""}`}>
              <Unplug className="h-3.5 w-3.5" /> Desconectar
            </button>
          )}
        </div>
      </div>

      <Confirmar
        abierto={desconectar}
        onCerrar={() => setDesconectar(false)}
        titulo={`¿Desconectar ${canal.nombre || v.nombre}?`}
        texto="Dejan de entrar y salir mensajes por este canal y se borran sus credenciales. Los chats que ya están en la Bandeja quedan."
        confirmar="Sí, desconectar"
        peligro
        onConfirmar={async () => {
          try {
            await getRepo().desconectarCanal(canal.id);
            avisar(`${v.nombre} desconectado.`);
          } catch (e) {
            avisar(e, "error");
          }
        }}
      />
    </>
  );
}

// ---------- conectar un canal ----------
interface Paso {
  texto: string;
  url?: string;
  urlTexto?: string;
}

const PASOS: Record<Exclude<CanalTipo, "manual">, { pasos: Paso[]; campos: string[]; nota: string }> = {
  whatsapp: {
    pasos: [
      {
        texto: "Entrá a Meta for Developers y creá una app de tipo «Empresa».",
        url: "https://developers.facebook.com/apps",
        urlTexto: "Abrir Meta for Developers",
      },
      { texto: "Sumale el producto «WhatsApp» y elegí tu cuenta comercial de Meta (Business Manager)." },
      { texto: "En WhatsApp → Configuración de la API copiá el «Phone Number ID» y el «WhatsApp Business Account ID» (WABA)." },
      {
        texto:
          "En la configuración del negocio creá un usuario del sistema y generá un token permanente con los permisos whatsapp_business_messaging y whatsapp_business_management.",
        url: "https://business.facebook.com/settings/system-users",
        urlTexto: "Usuarios del sistema",
      },
      { texto: "En WhatsApp → Configuración → Webhooks pegá la URL y el token de verificación de abajo, y suscribí los campos que te listamos." },
      { texto: "Copiá el App Secret (Configuración de la app → Básica) para que validemos que cada aviso viene de Meta." },
      { texto: "Completá el formulario y tocá «Conectar»: probamos las credenciales antes de guardarlas." },
    ],
    campos: ["messages", "message_echoes"],
    nota: "Para escribirle a cualquier cliente, Meta tiene que verificar tu empresa (de 1 a 3 días hábiles).",
  },
  instagram: {
    pasos: [
      {
        texto: "Pasá tu Instagram a cuenta profesional y vinculalo a una página de Facebook.",
        url: "https://help.instagram.com/502981923235522",
        urlTexto: "Cómo hacerlo",
      },
      {
        texto: "En tu app de Meta for Developers sumá el producto «Instagram» (o «Messenger» con Instagram).",
        url: "https://developers.facebook.com/apps",
        urlTexto: "Abrir Meta for Developers",
      },
      { texto: "Pedí el permiso instagram_manage_messages (y pages_messaging si conectás por la página)." },
      { texto: "Generá el token de acceso y copiá el Instagram User ID (y el Page ID si va por la página)." },
      { texto: "En Webhooks, objeto «Instagram», pegá la URL y el token de verificación de abajo y suscribí los campos que te listamos." },
      { texto: "En la app de Instagram: Configuración → Mensajes → Herramientas conectadas → «Permitir acceso a los mensajes»." },
    ],
    campos: ["messages", "messaging_postbacks"],
    nota: "Para atender a clientes reales, Meta tiene que aprobar tu app (App Review).",
  },
  messenger: {
    pasos: [
      {
        texto: "En Meta for Developers creá (o usá) tu app y sumale el producto «Messenger».",
        url: "https://developers.facebook.com/apps",
        urlTexto: "Abrir Meta for Developers",
      },
      { texto: "Conectá tu página de Facebook y generá el Page Access Token." },
      { texto: "Pedí el permiso pages_messaging." },
      { texto: "En Webhooks, objeto «Page», pegá la URL y el token de verificación de abajo y suscribí los campos que te listamos." },
      { texto: "Copiá el Page ID (en tu página: Información → Transparencia de la página, o desde la app)." },
    ],
    campos: ["messages", "messaging_postbacks"],
    nota: "Para atender a clientes reales, Meta tiene que aprobar tu app (App Review).",
  },
};

export function ConectarCanalModal({
  tipo,
  empresa,
  modo,
  marcaActiva,
  onCerrar,
}: {
  tipo: CanalTipo;
  empresa: Empresa;
  modo: "demo" | "nube";
  marcaActiva: string;
  onCerrar: () => void;
}) {
  const base = useBaseUrl();
  const marcas = useData((s) => s.brands);
  const [f, setF] = useState({
    nombre: "",
    phone_number_id: "",
    waba_id: "",
    ig_user_id: "",
    page_id: "",
    token: "",
    app_secret: "",
    marca_id: marcaActiva !== "all" ? marcaActiva : "",
  });
  const [errorServidor, setErrorServidor] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const set = (k: keyof typeof f, val: string) => setF((x) => ({ ...x, [k]: val }));
  const v = CANAL_VISUAL[tipo];
  const guia = tipo === "manual" ? null : PASOS[tipo];
  const webhookUrl = `${base}/api/webhooks/meta/${empresa.id}`;

  async function conectar() {
    const errs: Record<string, string> = {};
    const tokenObligatorio = modo === "nube";
    if (tipo === "whatsapp") {
      if (!f.phone_number_id.trim()) errs.phone_number_id = "Falta el Phone Number ID.";
      if (!/^\d*$/.test(f.phone_number_id.trim())) errs.phone_number_id = "Son sólo números.";
      if (f.waba_id.trim() && !/^\d+$/.test(f.waba_id.trim())) errs.waba_id = "Son sólo números.";
    }
    if (tipo === "instagram" && !f.ig_user_id.trim() && !f.page_id.trim()) errs.ig_user_id = "Poné el Instagram User ID o el Page ID.";
    if (tipo === "messenger" && !f.page_id.trim()) errs.page_id = "Falta el Page ID.";
    if (tipo !== "manual" && tokenObligatorio && !f.token.trim()) errs.token = "Falta el token.";
    if (tipo === "manual" && !f.nombre.trim()) errs.nombre = "Ponele un nombre.";
    setErrores(errs);
    if (Object.keys(errs).length) return;

    const input: ConectarCanalInput = { tipo };
    const t = (s: string) => s.trim() || undefined;
    input.nombre = t(f.nombre);
    input.marca_id = t(f.marca_id);
    if (tipo === "whatsapp") {
      input.phone_number_id = t(f.phone_number_id);
      input.waba_id = t(f.waba_id);
    }
    if (tipo === "instagram") {
      input.ig_user_id = t(f.ig_user_id);
      input.page_id = t(f.page_id);
    }
    if (tipo === "messenger") input.page_id = t(f.page_id);
    if (tipo !== "manual") {
      input.token = t(f.token);
      input.app_secret = t(f.app_secret);
    }
    setErrorServidor("");
    setCargando(true);
    try {
      const c = await getRepo().conectarCanal(input);
      avisar(tipo === "manual" ? `Canal «${c.nombre}» creado.` : `${v.nombre} conectado: los mensajes nuevos entran a la Bandeja.`);
      onCerrar();
    } catch (e) {
      setErrorServidor(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
    }
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      ancho="lg"
      titulo={
        <span className="flex items-center gap-2.5">
          <CanalIcono tipo={tipo} tam="sm" />
          {tipo === "manual" ? "Canal manual" : `Conectar ${v.nombre}`}
        </span>
      }
      pie={
        <>
          <button className="btn-ghost" onClick={onCerrar} disabled={cargando}>
            Cancelar
          </button>
          <BotonCargando cargando={cargando} onClick={conectar}>
            {cargando ? (tipo === "manual" ? "Creando…" : "Probando credenciales…") : tipo === "manual" ? "Crear canal" : "Conectar"}
          </BotonCargando>
        </>
      }
    >
      <div className="space-y-5">
        {modo === "demo" && tipo !== "manual" && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-ink-200">
            Modo demo: el canal se guarda pero no salen mensajes reales. Podés dejar el token vacío.
          </div>
        )}

        {guia && (
          <>
            <div>
              <div className="label mb-2">Paso a paso</div>
              <ol className="space-y-2.5">
                {guia.pasos.map((p, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-ink-200">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-[11px] font-bold text-brand-300">
                      {i + 1}
                    </span>
                    <span>
                      {p.texto}
                      {p.url && (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-1 inline-flex items-center gap-0.5 font-semibold text-brand-300 hover:text-brand-200"
                        >
                          {p.urlTexto || "Abrir"} <ArrowUpRight className="h-3 w-3" />
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-[11px] text-ink-500">{guia.nota}</p>
            </div>

            <div className="space-y-3 rounded-xl border border-brand-500/25 bg-brand-500/5 p-3.5">
              <div className="label flex items-center gap-1.5 text-brand-300">
                <Webhook className="h-3.5 w-3.5" /> Tu webhook
              </div>
              <CampoCopiable etiqueta="URL de devolución de llamada (callback)" valor={webhookUrl} />
              <CampoCopiable etiqueta="Token de verificación" valor={empresa.webhook_verify_token} />
              <div className="text-xs text-ink-300">
                Campos a suscribir:{" "}
                {guia.campos.map((c, i) => (
                  <span key={c}>
                    <code className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[11px] text-ink-100">{c}</code>
                    {i < guia.campos.length - 1 ? " " : ""}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {tipo === "manual" && (
          <p className="text-sm text-ink-300">
            Un canal manual sirve para cargar charlas a mano (por ejemplo, de un teléfono sin API o de un local). No se conecta con Meta y el bot no escribe
            ahí.
          </p>
        )}

        <div className="space-y-3">
          <div className="label flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> {tipo === "manual" ? "Datos" : "Credenciales"}
          </div>
          {tipo === "whatsapp" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo etiqueta="Phone Number ID" error={errores.phone_number_id}>
                <input
                  className="input font-mono"
                  inputMode="numeric"
                  value={f.phone_number_id}
                  onChange={(e) => set("phone_number_id", e.target.value)}
                  placeholder="1093xxxxxxxxx"
                />
              </Campo>
              <Campo etiqueta="WABA ID" ayuda="para traer tus plantillas" error={errores.waba_id}>
                <input
                  className="input font-mono"
                  inputMode="numeric"
                  value={f.waba_id}
                  onChange={(e) => set("waba_id", e.target.value)}
                  placeholder="1057xxxxxxxxx"
                />
              </Campo>
            </div>
          )}
          {tipo === "instagram" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo etiqueta="Instagram User ID" error={errores.ig_user_id}>
                <input className="input font-mono" value={f.ig_user_id} onChange={(e) => set("ig_user_id", e.target.value)} placeholder="1784xxxxxxxxx" />
              </Campo>
              <Campo etiqueta="Page ID" ayuda="si va por la página">
                <input className="input font-mono" value={f.page_id} onChange={(e) => set("page_id", e.target.value)} placeholder="1029xxxxxxxxx" />
              </Campo>
            </div>
          )}
          {tipo === "messenger" && (
            <Campo etiqueta="Page ID" error={errores.page_id}>
              <input className="input font-mono" value={f.page_id} onChange={(e) => set("page_id", e.target.value)} placeholder="1029xxxxxxxxx" />
            </Campo>
          )}
          {tipo !== "manual" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo etiqueta={tipo === "whatsapp" ? "Token permanente" : "Token de acceso"} error={errores.token}>
                <input
                  className="input font-mono"
                  type="password"
                  autoComplete="off"
                  value={f.token}
                  onChange={(e) => set("token", e.target.value)}
                  placeholder="EAAG…"
                />
              </Campo>
              <Campo etiqueta="App Secret" ayuda="opcional: valida la firma">
                <input
                  className="input font-mono"
                  type="password"
                  autoComplete="off"
                  value={f.app_secret}
                  onChange={(e) => set("app_secret", e.target.value)}
                  placeholder="••••••••"
                />
              </Campo>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo etiqueta="Nombre" ayuda={tipo === "manual" ? undefined : "opcional: si no, usamos el de Meta"} error={errores.nombre}>
              <input
                className="input"
                value={f.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                placeholder={
                  tipo === "whatsapp" ? "Ventas" : tipo === "instagram" ? "@tumarca" : tipo === "messenger" ? "Página de la marca" : "Teléfono del local"
                }
              />
            </Campo>
            {marcas.length > 0 && (
              <Campo etiqueta="Marca" ayuda="opcional">
                <select className="input" value={f.marca_id} onChange={(e) => set("marca_id", e.target.value)}>
                  <option value="">Todas / sin marca</option>
                  {marcas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Campo>
            )}
          </div>
          {tipo !== "manual" && (
            <p className="flex items-center gap-1.5 text-[11px] text-ink-500">
              <Lock className="h-3 w-3" /> El token y el App Secret se guardan cifrados y nunca vuelven al navegador.
            </p>
          )}
        </div>

        {errorServidor && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorServidor}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------- simulador de mensajes entrantes ----------
export function SimuladorEntrantes({ canales, empresa }: { canales: Canal[]; empresa: Empresa }) {
  const conectados = useMemo(() => canales.filter((c) => c.estado !== "error"), [canales]);
  const [canalId, setCanalId] = useState<string>(() => (conectados.find((c) => c.tipo !== "manual") || conectados[0])?.id || "");
  const [ident, setIdent] = useState("");
  const [nombre, setNombre] = useState("");
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [res, setRes] = useState<{ conversacion: Conversacion; bot: BotResultado } | null>(null);
  const canal = canales.find((c) => c.id === canalId);
  const tipo: CanalTipo = canal?.tipo || "manual";

  async function mandar() {
    if (!texto.trim()) return;
    setCargando(true);
    try {
      const id = ident.trim();
      const r = await getRepo().simularEntrante({
        canal_id: canal?.id,
        canal_tipo: canal ? undefined : "manual",
        identificador: id ? (tipo === "whatsapp" ? normalizarTelefono(id, codigoPais(empresa.pais)) : id.replace(/^@/, "")) : undefined,
        nombre: nombre.trim() || undefined,
        texto: texto.trim(),
      });
      setRes({ conversacion: r.conversacion, bot: r.bot });
      setTexto("");
    } catch (e) {
      avisar(e, "error");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          mandar();
        }}
      >
        <Campo etiqueta="Canal">
          <select className="input" value={canalId} onChange={(e) => setCanalId(e.target.value)}>
            {conectados.map((c) => (
              <option key={c.id} value={c.id}>
                {CANAL_VISUAL[c.tipo].nombre} · {c.nombre}
              </option>
            ))}
            <option value="">Nuevo canal manual</option>
          </select>
        </Campo>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo etiqueta={tipo === "whatsapp" ? "Teléfono del cliente" : tipo === "manual" ? "Teléfono o usuario" : "Usuario del cliente"} ayuda="opcional">
            <input
              className="input"
              value={ident}
              onChange={(e) => setIdent(e.target.value)}
              placeholder={tipo === "whatsapp" ? "11 5555-0000" : "cliente_prueba"}
            />
          </Campo>
          <Campo etiqueta="Nombre" ayuda="opcional">
            <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Cliente de prueba" />
          </Campo>
        </div>
        <Campo etiqueta="Mensaje">
          <textarea
            className="input"
            rows={2}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Hola, ¿tienen stock de mancuernas de 5 kg?"
          />
        </Campo>
        <BotonCargando cargando={cargando} disabled={!texto.trim()} type="submit">
          {!cargando && <Send className="h-4 w-4" />} Simular mensaje entrante
        </BotonCargando>
      </form>

      <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3.5">
        {!res ? (
          <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-1 text-center text-xs text-ink-500">
            Entra como si lo hubiera mandado un cliente: corre el bot de verdad (con sus candados) y queda en la Bandeja.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Entró a la bandeja: {res.conversacion.nombre}
            </div>
            {res.bot.respuestas.map((r, i) => (
              <div key={i} className="flex flex-col items-end">
                <div className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-tr-sm border border-brand-500/25 bg-brand-500/15 px-3 py-2 text-sm text-ink-100">
                  {r.texto}
                </div>
                <span className="mt-0.5 text-[10px] text-ink-500">{nombreMotivo(r.motivo, null)}</span>
              </div>
            ))}
            <p className="text-[11px] italic text-ink-400">
              {res.bot.respuestas.length ? "" : "El bot no contestó. "}
              {res.bot.explicacion}
            </p>
            <Link
              href={`/inbox?c=${encodeURIComponent(res.conversacion.id)}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-300 hover:text-brand-200"
            >
              <Inbox className="h-3.5 w-3.5" /> Abrir en la bandeja <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
