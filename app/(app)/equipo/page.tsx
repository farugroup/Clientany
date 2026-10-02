"use client";
// /equipo — quiénes atienden, con qué rol, quién está conectado, las
// invitaciones pendientes y el chat interno del equipo.
import { useState } from "react";
import { Mail, ShieldCheck, Trash2, UserPlus, Users, X } from "lucide-react";
import type { Invitacion, Miembro, Rol } from "@/lib/crm/types";
import { emailValido, haceCuanto, iniciales } from "@/lib/crm/core";
import { getRepo } from "@/lib/crm/repo";
import { useEmpresa, useEsAdmin, useInvitaciones, useMiembros, usePolling, useYo } from "@/lib/crm/hooks";
import { BotonCargando, Campo, Confirmar, Encabezado, Modal, avisar } from "@/components/crm/ui";
import { CargandoPantalla, Tarjeta, useAhora } from "@/components/crm/pantallas/comun";
import { ChatEquipo } from "@/components/crm/pantallas/equipo-chat";

const ROLES: { id: Rol; nombre: string }[] = [
  { id: "admin", nombre: "Admin" },
  { id: "agente", nombre: "Agente" },
];

function ChipRol({ rol }: { rol: Rol }) {
  return rol === "admin" ? (
    <span className="chip bg-brand-500/15 px-2 py-0.5 text-[10px] text-brand-300">
      <ShieldCheck className="h-3 w-3" /> Admin
    </span>
  ) : (
    <span className="chip bg-ink-800 px-2 py-0.5 text-[10px] text-ink-300">Agente</span>
  );
}

function ModalInvitar({ onCerrar }: { onCerrar: () => void }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<Rol>("agente");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function invitar() {
    if (!emailValido(email)) return setError("Ese mail no parece válido.");
    setError("");
    setCargando(true);
    try {
      const r = await getRepo().invitarMiembro({ email: email.trim().toLowerCase(), nombre: nombre.trim() || undefined, rol });
      if (r.miembro) avisar(`${r.miembro.nombre || email} ya es parte del equipo.`);
      else avisar("Le mandamos la invitación: cuando se registre con ese mail entra solo.");
      onCerrar();
    } catch (e) {
      avisar(e, "error");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Invitar al equipo"
      ancho="sm"
      pie={
        <>
          <button className="btn-ghost" onClick={onCerrar} disabled={cargando}>
            Cancelar
          </button>
          <BotonCargando cargando={cargando} onClick={invitar} disabled={!email.trim()}>
            Invitar
          </BotonCargando>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          invitar();
        }}
      >
        <Campo etiqueta="Nombre" ayuda="opcional">
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Lucía" autoFocus />
        </Campo>
        <Campo etiqueta="Email" error={error}>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="lucia@tumarca.com" />
        </Campo>
        <Campo etiqueta="Rol">
          <select className="input" value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <p className="text-xs text-ink-400">
          {rol === "admin" ? "Admin: configura canales, bot, equipo y claves." : "Agente: atiende la bandeja, clientes, pedidos y stock."}
        </p>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

export default function EquipoPage() {
  const empresa = useEmpresa();
  const miembros = useMiembros();
  const invitaciones = useInvitaciones();
  const yo = useYo();
  const esAdmin = useEsAdmin();
  const ahora = useAhora(30_000);
  usePolling(true);

  const [invitar, setInvitar] = useState(false);
  const [aQuitar, setAQuitar] = useState<Miembro | null>(null);
  const [aCancelar, setACancelar] = useState<Invitacion | null>(null);

  if (!empresa) return <CargandoPantalla />;

  const enLinea = (m: Miembro) => !!m.ultimo_visto && ahora.getTime() - new Date(m.ultimo_visto).getTime() < 3 * 60_000;
  const ordenados = [...miembros].sort(
    (a, b) => Number(b.id === yo?.id) - Number(a.id === yo?.id) || Number(enLinea(b)) - Number(enLinea(a)) || a.nombre.localeCompare(b.nombre),
  );
  const conectados = miembros.filter(enLinea).length;

  async function cambiarRol(m: Miembro, rol: Rol) {
    if (m.rol === rol) return;
    try {
      await getRepo().actualizarMiembro(m.id, { rol });
      avisar(`${m.nombre} ahora es ${rol === "admin" ? "admin" : "agente"}.`);
    } catch (e) {
      avisar(e, "error");
    }
  }

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      <Encabezado
        titulo="Equipo"
        icono={Users}
        sub={`${miembros.length} ${miembros.length === 1 ? "persona" : "personas"} · ${conectados} en línea ahora`}
        acciones={
          esAdmin ? (
            <button className="btn-primary" onClick={() => setInvitar(true)}>
              <UserPlus className="h-4 w-4" /> Invitar
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 space-y-4">
          <Tarjeta titulo="Miembros" icono={Users} sub="Admin: configura canales, bot, equipo y claves. Agente: atiende la bandeja, clientes, pedidos y stock.">
            <div className="-mx-1 divide-y divide-ink-800">
              {ordenados.map((m) => {
                const vivo = enLinea(m);
                const soyYo = m.id === yo?.id;
                return (
                  <div key={m.id} className="flex items-center gap-3 px-1 py-3">
                    <div className="relative shrink-0">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-400/30 to-brand-600/30 text-sm font-bold text-white">
                        {iniciales(m.nombre || m.email)}
                      </span>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-ink-900 ${vivo ? "bg-green-500" : "bg-ink-600"}`}
                        title={vivo ? "En línea" : "Desconectado"}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-white">{m.nombre || m.email}</span>
                        {soyYo && <span className="text-[11px] text-ink-500">(vos)</span>}
                        {!(esAdmin && !soyYo) && <ChipRol rol={m.rol} />}
                      </div>
                      <div className="truncate text-xs text-ink-400">{m.email}</div>
                      <div className={`text-[11px] ${vivo ? "text-green-400" : "text-ink-500"}`}>
                        {vivo ? "En línea" : m.ultimo_visto ? `Visto ${haceCuanto(m.ultimo_visto, ahora)}` : "Todavía no entró"}
                      </div>
                    </div>
                    {esAdmin && !soyYo && (
                      <div className="flex shrink-0 items-center gap-1">
                        <select
                          className="input w-auto py-1.5 pl-2.5 pr-7 text-xs"
                          value={m.rol}
                          onChange={(e) => cambiarRol(m, e.target.value as Rol)}
                          aria-label={`Rol de ${m.nombre}`}
                        >
                          {ROLES.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.nombre}
                            </option>
                          ))}
                        </select>
                        <button
                          className="rounded-lg p-2 text-ink-500 hover:bg-red-500/10 hover:text-red-400"
                          onClick={() => setAQuitar(m)}
                          aria-label={`Quitar a ${m.nombre}`}
                          title="Quitar del equipo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Tarjeta>

          {(invitaciones.length > 0 || esAdmin) && (
            <Tarjeta titulo="Invitaciones pendientes" icono={Mail} sub="Cuando se registren con ese mail, entran solos a la empresa.">
              {!invitaciones.length ? (
                <p className="text-xs text-ink-500">No hay invitaciones esperando.</p>
              ) : (
                <div className="-mx-1 divide-y divide-ink-800">
                  {invitaciones.map((i) => (
                    <div key={i.id} className="flex items-center gap-3 px-1 py-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-ink-600">
                        <Mail className="h-4 w-4 text-ink-400" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-white">{i.email}</div>
                        <div className="text-[11px] text-ink-500">Invitada {haceCuanto(i.creado, ahora)}</div>
                      </div>
                      <ChipRol rol={i.rol} />
                      {esAdmin && (
                        <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => setACancelar(i)}>
                          <X className="h-3.5 w-3.5" /> Cancelar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Tarjeta>
          )}
        </div>

        <div className="min-w-0">
          <ChatEquipo />
        </div>
      </div>

      {invitar && <ModalInvitar onCerrar={() => setInvitar(false)} />}

      <Confirmar
        abierto={!!aQuitar}
        onCerrar={() => setAQuitar(null)}
        titulo="¿Quitar del equipo?"
        texto={
          aQuitar ? (
            <>
              <b className="text-white">{aQuitar.nombre || aQuitar.email}</b> deja de entrar a {empresa.nombre}. Los chats que tenía tomados quedan libres.
            </>
          ) : null
        }
        confirmar="Sí, quitar"
        peligro
        onConfirmar={async () => {
          if (!aQuitar) return;
          try {
            await getRepo().quitarMiembro(aQuitar.id);
            avisar(`${aQuitar.nombre || aQuitar.email} ya no está en el equipo.`);
          } catch (e) {
            avisar(e, "error");
          }
        }}
      />
      <Confirmar
        abierto={!!aCancelar}
        onCerrar={() => setACancelar(null)}
        titulo="¿Cancelar la invitación?"
        texto={aCancelar ? `${aCancelar.email} ya no va a poder entrar con esa invitación.` : null}
        confirmar="Sí, cancelar"
        peligro
        onConfirmar={async () => {
          if (!aCancelar) return;
          try {
            await getRepo().cancelarInvitacion(aCancelar.id);
            avisar("Invitación cancelada.");
          } catch (e) {
            avisar(e, "error");
          }
        }}
      />
    </div>
  );
}
