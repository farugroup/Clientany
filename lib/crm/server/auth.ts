// ============================================================
// Clientany · CRM — sesión, contexto de la empresa y respuestas HTTP.
// Todas las rutas internas arrancan con `contexto()` y envuelven el
// handler con `manejar()`, que traduce los errores a JSON criollo.
// ============================================================
import { NextResponse, type NextRequest } from "next/server";
import type { Empresa, Miembro } from "../types";
import type { UsuarioAuth } from "./db";
import type { CrmDbCompleta } from "./db-extra";
import { errorCriollo } from "../core";
import { getSupabaseServer } from "@/lib/supabase/server";
import { esMemoria, getDb } from "./db-factory";
import { DemasiadasLlamadas, Invalido, NoEncontrado, SinPermiso, SinSesion } from "./errores";

export { DemasiadasLlamadas, Invalido, NoEncontrado, SinPermiso, SinSesion };

export interface UsuarioSesion extends UsuarioAuth {
  empresa?: string; // metadata `empresa` del registro, si la cargó
}

export interface Contexto {
  db: CrmDbCompleta;
  usuario: UsuarioSesion;
  empresa: Empresa;
  miembro: Miembro;
}

export async function usuarioActual(): Promise<UsuarioSesion | null> {
  if (esMemoria() && process.env.CLIENTANY_DEV_USER) {
    return { id: "dev", email: process.env.CLIENTANY_DEV_USER, nombre: "Dev" };
  }
  const sb = getSupabaseServer();
  if (!sb) return null;
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) return null;
  const u = data.user;
  const meta = (u.user_metadata || {}) as Record<string, unknown>;
  const nombre = typeof meta.name === "string" ? meta.name : typeof meta.full_name === "string" ? meta.full_name : undefined;
  const empresa = typeof meta.empresa === "string" ? meta.empresa : undefined;
  return { id: u.id, email: u.email || "", nombre, empresa };
}

function nombreEmpresaDe(u: UsuarioSesion): string {
  return (u.empresa || u.nombre || (u.email || "").split("@")[0] || "Mi empresa").trim();
}

// Usuario + empresa + miembro de la sesión. Si el usuario todavía no tiene
// empresa, la crea (o lo suma a la empresa que lo invitó).
export async function contexto(): Promise<Contexto> {
  const db = getDb();
  const usuario = await usuarioActual();
  if (!usuario) throw new SinSesion();
  let par = await db.empresaDeUsuario(usuario.id);
  if (!par) par = await db.crearEmpresaParaUsuario(usuario, nombreEmpresaDe(usuario));
  return { db, usuario, empresa: par.empresa, miembro: par.miembro };
}

export function exigirAdmin(miembro: Miembro): void {
  if (miembro.rol !== "admin") throw new SinPermiso();
}

// ---------- respuestas ----------
export function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function errorJson(status: number, texto: string, codigo?: string): NextResponse {
  return NextResponse.json(codigo ? { error: texto, codigo } : { error: texto }, { status });
}

export function respuestaError(e: unknown): NextResponse {
  if (e instanceof SinSesion) return errorJson(401, e.message, "sin_sesion");
  if (e instanceof SinPermiso) return errorJson(403, e.message, "sin_permiso");
  if (e instanceof NoEncontrado) return errorJson(404, e.message, "no_encontrado");
  if (e instanceof Invalido) return errorJson(400, e.message, e.codigo);
  if (e instanceof DemasiadasLlamadas) return errorJson(429, e.message, "demasiadas_llamadas");
  console.error("[crm] error en una ruta:", e);
  return errorJson(500, errorCriollo(e) || "Algo salió mal de nuestro lado. Probá de nuevo en un rato.", "error");
}

type Handler<P> = (req: NextRequest, ctx: { params: P }) => Promise<Response>;

// Envuelve un handler: captura los errores conocidos y los traduce.
export function manejar<P = Record<string, string>>(fn: Handler<P>): Handler<P> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      return respuestaError(e);
    }
  };
}

// IP del que llama (para el límite de la IA sin sesión).
export function ipDe(req: NextRequest): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}
