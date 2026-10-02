// ============================================================
// Clientany · CRM — claves de la API pública (/api/v1).
// Se guardan hasheadas (sha256); el secreto se muestra una sola vez.
// ============================================================
import type { NextRequest } from "next/server";
import type { ApiKey, Empresa } from "../types";
import type { CrmDbCompleta } from "./db-extra";
import { hashSha256, tokenSeguro } from "./crypto";
import { getDb } from "./db-factory";
import { SinSesion } from "./errores";

export function generarApiKey(): { secreto: string; prefijo: string; hash: string } {
  const secreto = "ck_live_" + tokenSeguro(32);
  return { secreto, prefijo: secreto.slice(0, 16) + "…", hash: hashSha256(secreto) };
}

function claveDelPedido(req: NextRequest): string {
  const x = (req.headers.get("x-api-key") || "").trim();
  if (x) return x;
  const auth = (req.headers.get("authorization") || "").trim();
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

export async function empresaPorApiKey(req: NextRequest): Promise<{ db: CrmDbCompleta; empresa: Empresa; key: ApiKey }> {
  const secreto = claveDelPedido(req);
  if (!secreto) throw new SinSesion("Clave de API inválida");
  const db = getDb();
  const key = await db.apiKeyPorHash(hashSha256(secreto));
  if (!key) throw new SinSesion("Clave de API inválida");
  const empresa = await db.empresa(key.empresa_id);
  if (!empresa) throw new SinSesion("Clave de API inválida");
  await db.tocarApiKey(key.id);
  const { hash: _h, ...publica } = key;
  void _h;
  return { db, empresa, key: publica };
}
