"use client";
// ============================================================
// Clientany · CRM — hooks de lectura para las pantallas.
//
// Las firmas son EXACTAMENTE las de docs/CRM.md («El store y los hooks»):
// las pantallas se escriben contra ellas. Todo sale del store `useCrm`;
// para escribir, la pantalla usa `useRepo()` (el repositorio activo).
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Actividad,
  ApiKey,
  Bot,
  Canal,
  Contacto,
  Conversacion,
  Empresa,
  FilaBandeja,
  FiltroBandeja,
  Grupo,
  Invitacion,
  Mensaje,
  MensajeEquipo,
  Metricas,
  Miembro,
  Pedido,
  PedidoEstado,
  Plantilla,
  Producto,
  Rapida,
} from "./types";
import { getRepo, useCrm, type CrmRepo } from "./repo";
import { contarGrupos, filtrarBandeja, normalizarTexto, pedidosDeContacto } from "./core";
import { useApp } from "@/lib/store";
import { avisar } from "@/components/crm/ui";

const SIN_MENSAJES: Mensaje[] = [];
const MINUTO = 60_000;

// Un "ahora" que avanza cada tanto: los recordatorios vencen y la ventana de
// 24 hs se achica aunque no cambie ningún dato.
function useReloj(cadaMs: number): number {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), cadaMs);
    return () => clearInterval(id);
  }, [cadaMs]);
  return t;
}

function visible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

// Busca con y sin acentos; si la búsqueda tiene números, también por dígitos
// (para encontrar "11 5555" en "5491155550101").
function coincide(q: string, ...campos: (string | null | undefined)[]): boolean {
  const t = normalizarTexto(q);
  if (!t) return true;
  if (normalizarTexto(campos.filter(Boolean).join(" ")).includes(t)) return true;
  const digitos = q.replace(/\D/g, "");
  if (digitos.length >= 4) return campos.some((c) => (c || "").replace(/\D/g, "").includes(digitos));
  return false;
}

// ---------- básicos ----------
export function useRepo(): CrmRepo {
  return getRepo();
}

export function useModo(): "demo" | "nube" {
  return useCrm((s) => s.modo);
}

export function useEmpresa(): Empresa | null {
  return useCrm((s) => s.empresa);
}

export function useYo(): Miembro | null {
  return useCrm((s) => s.yo);
}

export function useEsAdmin(): boolean {
  return useCrm((s) => s.yo?.rol === "admin");
}

export function useMarcaActiva(): string {
  return useApp((s) => s.activeBrandId) || "all";
}

// ---------- bandeja ----------
export function useBandeja(filtro: FiltroBandeja): {
  filas: FilaBandeja[];
  conteos: Record<Grupo, number> & { sin_responder: number };
} {
  const conversaciones = useCrm((s) => s.conversaciones);
  const marca = useMarcaActiva();
  const tic = useReloj(MINUTO);
  const clave = JSON.stringify(filtro || {});
  return useMemo(() => {
    const f: FiltroBandeja = { ...(JSON.parse(clave) as FiltroBandeja) };
    f.marca_id = f.marca_id || marca;
    const ahora = new Date(tic);
    const filas = filtrarBandeja(conversaciones, f, ahora);
    // Los conteos de cada pestaña respetan marca, canal y asignado, pero no
    // el grupo elegido ni la búsqueda (si no, todas las pestañas dirían lo mismo).
    const base = filtrarBandeja(
      conversaciones,
      { marca_id: f.marca_id, canal: f.canal, asignado_a: f.asignado_a, grupo: "todos" },
      ahora
    );
    return { filas, conteos: contarGrupos(base, ahora) };
  }, [conversaciones, clave, marca, tic]);
}

// ---------- una conversación abierta ----------
export function useConversacion(id: string | null): {
  conv: Conversacion | null;
  mensajes: Mensaje[];
  cargando: boolean;
  contacto: Contacto | null;
  pedidos: Pedido[];
} {
  const conv = useCrm((s) => (id ? s.conversaciones.find((c) => c.id === id) ?? null : null));
  const crudos = useCrm((s) => (id ? s.mensajes[id] : undefined));
  const contactos = useCrm((s) => s.contactos);
  const todosLosPedidos = useCrm((s) => s.pedidos);
  const modo = useCrm((s) => s.modo);
  const [cargando, setCargando] = useState(false);
  const cargados = crudos !== undefined;
  const existe = !!conv;
  const noLeidos = conv?.no_leidos ?? 0;

  // Mensajes a demanda (y de nuevo si el store se recargó entero).
  useEffect(() => {
    if (!id || cargados || !existe) {
      setCargando(false);
      return;
    }
    let vivo = true;
    setCargando(true);
    getRepo()
      .cargarMensajes(id)
      .catch((e) => {
        if (vivo) avisar(e, "error");
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [id, cargados, existe]);

  // Abrir el chat (o que entre algo mientras está abierto) lo marca leído.
  // Se espera a tener los mensajes: en nube, traerlos ya lo marca leído.
  useEffect(() => {
    if (!id || !cargados || noLeidos <= 0) return;
    getRepo()
      .marcarLeido(id)
      .catch(() => undefined);
  }, [id, cargados, noLeidos]);

  // Nube: lo nuevo de esta conversación cada 4 s mientras está abierta.
  useEffect(() => {
    if (!id || modo !== "nube") return;
    const t = setInterval(() => {
      if (visible()) getRepo().refrescar(id).catch(() => undefined);
    }, 4000);
    return () => clearInterval(t);
  }, [id, modo]);

  const mensajes = useMemo(() => {
    if (!crudos) return SIN_MENSAJES;
    const t = (m: Mensaje) => new Date(m.creado).getTime();
    for (let i = 1; i < crudos.length; i++) {
      if (t(crudos[i]) < t(crudos[i - 1])) return [...crudos].sort((a, b) => t(a) - t(b));
    }
    return crudos;
  }, [crudos]);

  const contacto = useMemo(
    () => (conv?.contacto_id ? contactos.find((c) => c.id === conv.contacto_id) ?? null : null),
    [conv?.contacto_id, contactos]
  );

  const pedidos = useMemo(() => {
    if (contacto) return pedidosDeContacto(todosLosPedidos, contacto);
    // Sin contacto atado: por el teléfono del chat (WhatsApp).
    if (conv?.canal === "whatsapp" && conv.identificador) return pedidosDeContacto(todosLosPedidos, { telefono: conv.identificador });
    return [];
  }, [contacto, conv?.canal, conv?.identificador, todosLosPedidos]);

  return { conv, mensajes, cargando, contacto, pedidos };
}

// ---------- listas ----------
export function useContactos(q?: string): Contacto[] {
  const contactos = useCrm((s) => s.contactos);
  return useMemo(() => {
    const base = q ? contactos.filter((c) => coincide(q, c.nombre, c.telefono, c.email, c.documento, c.localidad, c.ig_usuario)) : contactos;
    return [...base].sort((a, b) => new Date(b.actualizado).getTime() - new Date(a.actualizado).getTime());
  }, [contactos, q]);
}

export function usePedidos(q?: string, estado?: PedidoEstado | "todos"): Pedido[] {
  const pedidos = useCrm((s) => s.pedidos);
  return useMemo(() => {
    let l = pedidos;
    if (estado && estado !== "todos") l = l.filter((p) => p.estado === estado);
    if (q) {
      l = l.filter((p) =>
        coincide(q, p.numero, p.nombre, p.email, p.telefono, p.envio?.seguimiento, (p.items || []).map((i) => i.nombre).join(" "))
      );
    }
    return [...l].sort((a, b) => new Date(b.creado).getTime() - new Date(a.creado).getTime());
  }, [pedidos, q, estado]);
}

export function useProductos(q?: string): Producto[] {
  const productos = useCrm((s) => s.productos);
  return useMemo(() => {
    const base = q ? productos.filter((p) => coincide(q, p.sku, p.nombre, p.categoria)) : productos;
    return [...base].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [productos, q]);
}

export function useBot(): Bot {
  return useCrm((s) => s.bot);
}

export function usePlantillas(): Plantilla[] {
  return useCrm((s) => s.plantillas);
}

export function useRapidas(): Rapida[] {
  const rapidas = useCrm((s) => s.rapidas);
  const yoId = useCrm((s) => s.yo?.id);
  return useMemo(
    () => rapidas.filter((r) => !r.de || r.de === yoId).sort((a, b) => a.atajo.localeCompare(b.atajo, "es")),
    [rapidas, yoId]
  );
}

export function useEquipoChat(): MensajeEquipo[] {
  const equipo = useCrm((s) => s.equipo);
  return useMemo(() => [...equipo].sort((a, b) => new Date(a.creado).getTime() - new Date(b.creado).getTime()), [equipo]);
}

export function useMiembros(): Miembro[] {
  return useCrm((s) => s.miembros);
}

export function useInvitaciones(): Invitacion[] {
  return useCrm((s) => s.invitaciones);
}

export function useCanales(): Canal[] {
  return useCrm((s) => s.canales);
}

export function useApiKeys(): ApiKey[] {
  return useCrm((s) => s.api_keys);
}

export function useActividad(): Actividad[] {
  const actividad = useCrm((s) => s.actividad);
  return useMemo(() => [...actividad].sort((a, b) => new Date(b.creado).getTime() - new Date(a.creado).getTime()), [actividad]);
}

// ---------- métricas ----------
export function useMetricas(): { datos: Metricas | null; cargando: boolean; recargar: () => void } {
  const [datos, setDatos] = useState<Metricas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [vuelta, setVuelta] = useState(0);
  const recargar = useCallback(() => setVuelta((v) => v + 1), []);
  useEffect(() => {
    let vivo = true;
    setCargando(true);
    getRepo()
      .metricas()
      .then((d) => {
        if (vivo) setDatos(d);
      })
      .catch((e) => {
        if (vivo) avisar(e, "error");
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [vuelta]);
  return { datos, cargando, recargar };
}

// ---------- polling (sólo nube) ----------
export function usePolling(activo: boolean, convId?: string | null): void {
  const modo = useCrm((s) => s.modo);
  useEffect(() => {
    if (!activo || modo !== "nube") return;
    const refrescar = () => {
      if (visible()) getRepo().refrescar(convId ?? null).catch(() => undefined);
    };
    const t = setInterval(refrescar, 5000);
    // Al volver a la pestaña se trae lo nuevo enseguida.
    const alVolver = () => {
      if (document.visibilityState === "visible") refrescar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [activo, modo, convId]);
}
