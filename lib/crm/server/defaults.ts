// ============================================================
// Clientany · CRM — cómo nace una empresa nueva (SOLO servidor).
// Las mismas 6 etapas y 4 etiquetas que `datosDePrueba` (lib/crm/demo.ts),
// hardcodeadas acá para que la base no dependa del módulo demo.
// ============================================================
import type { Empresa, Etapa, Etiqueta, Miembro } from "../types";
import type { UsuarioAuth } from "./db";
import { HORARIO_DEFAULT } from "../core";
import { tokenSeguro } from "./crypto";

export const ETAPAS_DEFAULT: Etapa[] = [
  { id: "demo_et_nuevo", nombre: "Nuevo", color: "#9aa3c0", orden: 0 },
  { id: "demo_et_charla", nombre: "En charla", color: "#598bff", orden: 1 },
  { id: "demo_et_pago", nombre: "Esperando pago", color: "#f59e0b", orden: 2 },
  { id: "demo_et_vendido", nombre: "Vendido", color: "#16a34a", orden: 3 },
  { id: "demo_et_postventa", nombre: "Postventa", color: "#8b5cf6", orden: 4 },
  { id: "demo_et_perdido", nombre: "Perdido", color: "#ef4444", orden: 5 },
];

export const ETIQUETAS_DEFAULT: Etiqueta[] = [
  { id: "demo_tag_mayorista", nombre: "Mayorista", color: "#8b5cf6" },
  { id: "demo_tag_vip", nombre: "VIP", color: "#f59e0b" },
  { id: "demo_tag_problema", nombre: "Problema", color: "#ef4444" },
  { id: "demo_tag_urgente", nombre: "Urgente", color: "#ef4444" },
];

export function empresaNueva(id: string, nombre: string, ahora: Date = new Date()): Empresa {
  const prueba = new Date(ahora.getTime() + 14 * 24 * 3_600_000);
  return {
    id,
    nombre: nombre.trim() || "Mi empresa",
    pais: "Argentina",
    moneda: "ARS",
    plan: "prueba",
    prueba_hasta: prueba.toISOString(),
    creado: ahora.toISOString(),
    webhook_verify_token: tokenSeguro(24),
    ia: { proveedor: "plataforma", clave_cargada: false },
    horario: structuredClone(HORARIO_DEFAULT),
    etapas: structuredClone(ETAPAS_DEFAULT),
    etiquetas: structuredClone(ETIQUETAS_DEFAULT),
  };
}

export function nombreDeUsuario(usuario: UsuarioAuth): string {
  const n = (usuario.nombre || "").trim();
  if (n) return n;
  return (usuario.email || "").split("@")[0] || "Sin nombre";
}

export function miembroNuevo(usuario: UsuarioAuth, empresaId: string, rol: Miembro["rol"], ahora: Date = new Date()): Miembro {
  return {
    id: usuario.id,
    empresa_id: empresaId,
    nombre: nombreDeUsuario(usuario),
    email: (usuario.email || "").trim().toLowerCase(),
    rol,
    creado: ahora.toISOString(),
  };
}
