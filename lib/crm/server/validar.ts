// ============================================================
// Clientany · CRM — validación de lo que llega por HTTP.
// Chico y explícito: cada ruta pide lo que necesita y el resto se ignora.
// ============================================================
import type { NextRequest } from "next/server";
import { Invalido } from "./errores";

export const MAX_TEXTO = 4096;
export const MAX_NOMBRE = 120;

export type Cuerpo = Record<string, unknown>;

export function esObjeto(v: unknown): v is Cuerpo {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export async function leerJson(req: NextRequest): Promise<Cuerpo> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new Invalido("El cuerpo tiene que ser JSON.", "json_invalido");
  }
  if (!esObjeto(body)) throw new Invalido("El cuerpo tiene que ser un objeto JSON.", "json_invalido");
  return body;
}

// Como leerJson pero acepta también una lista (API v1: uno o varios).
export async function leerJsonOLista(req: NextRequest): Promise<Cuerpo | Cuerpo[]> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new Invalido("El cuerpo tiene que ser JSON.", "json_invalido");
  }
  if (Array.isArray(body)) {
    if (!body.every(esObjeto)) throw new Invalido("La lista tiene que ser de objetos.", "json_invalido");
    return body as Cuerpo[];
  }
  if (!esObjeto(body)) throw new Invalido("El cuerpo tiene que ser un objeto JSON o una lista.", "json_invalido");
  return body;
}

export function texto(b: Cuerpo, campo: string, opciones: { max?: number; requerido?: boolean; def?: string } = {}): string {
  const v = b[campo];
  const max = opciones.max ?? MAX_NOMBRE;
  if (v === undefined || v === null || v === "") {
    if (opciones.requerido) throw new Invalido(`Falta «${campo}».`, "falta_" + campo);
    return opciones.def ?? "";
  }
  if (typeof v !== "string" && typeof v !== "number") throw new Invalido(`«${campo}» tiene que ser un texto.`, "tipo_" + campo);
  const s = String(v).trim();
  if (opciones.requerido && !s) throw new Invalido(`Falta «${campo}».`, "falta_" + campo);
  if (s.length > max) throw new Invalido(`«${campo}» es muy largo (máximo ${max} caracteres).`, "largo_" + campo);
  return s;
}

export function textoOpcional(b: Cuerpo, campo: string, max = MAX_NOMBRE): string | undefined {
  if (!(campo in b) || b[campo] === undefined) return undefined;
  if (b[campo] === null) return "";
  return texto(b, campo, { max });
}

export function numero(b: Cuerpo, campo: string, opciones: { requerido?: boolean; def?: number; entero?: boolean; min?: number } = {}): number {
  const v = b[campo];
  if (v === undefined || v === null || v === "") {
    if (opciones.requerido) throw new Invalido(`Falta «${campo}».`, "falta_" + campo);
    return opciones.def ?? 0;
  }
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) throw new Invalido(`«${campo}» tiene que ser un número.`, "tipo_" + campo);
  if (opciones.entero && !Number.isInteger(n)) throw new Invalido(`«${campo}» tiene que ser un número entero.`, "tipo_" + campo);
  if (opciones.min !== undefined && n < opciones.min) throw new Invalido(`«${campo}» no puede ser menor que ${opciones.min}.`, "rango_" + campo);
  return n;
}

export function booleano(b: Cuerpo, campo: string, def: boolean): boolean {
  const v = b[campo];
  if (v === undefined || v === null) return def;
  if (typeof v === "boolean") return v;
  if (v === "true" || v === 1 || v === "1") return true;
  if (v === "false" || v === 0 || v === "0") return false;
  throw new Invalido(`«${campo}» tiene que ser verdadero o falso.`, "tipo_" + campo);
}

export function listaDeTextos(b: Cuerpo, campo: string, max = 50): string[] {
  const v = b[campo];
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new Invalido(`«${campo}» tiene que ser una lista.`, "tipo_" + campo);
  return v.slice(0, max).map((x) => String(x ?? "").trim()).filter(Boolean);
}

export function opcion<T extends string>(b: Cuerpo, campo: string, validas: readonly T[], def?: T): T {
  const v = b[campo];
  if (v === undefined || v === null || v === "") {
    if (def !== undefined) return def;
    throw new Invalido(`Falta «${campo}».`, "falta_" + campo);
  }
  if (typeof v !== "string" || !validas.includes(v as T)) {
    throw new Invalido(`«${campo}» tiene que ser uno de: ${validas.join(", ")}.`, "opcion_" + campo);
  }
  return v as T;
}

export function fechaIso(b: Cuerpo, campo: string): string | undefined {
  const v = b[campo];
  if (v === undefined || v === null || v === "") return undefined;
  const d = new Date(String(v));
  if (isNaN(d.getTime())) throw new Invalido(`«${campo}» no es una fecha válida.`, "fecha_" + campo);
  return d.toISOString();
}

export function lista(b: Cuerpo, campo: string): Cuerpo[] {
  const v = b[campo];
  if (!Array.isArray(v)) throw new Invalido(`«${campo}» tiene que ser una lista.`, "tipo_" + campo);
  if (!v.every(esObjeto)) throw new Invalido(`«${campo}» tiene que ser una lista de objetos.`, "tipo_" + campo);
  return v as Cuerpo[];
}
