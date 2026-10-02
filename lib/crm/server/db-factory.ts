// ============================================================
// Clientany · CRM — qué base usa el servidor.
// Memoria si CLIENTANY_DB=memory o si faltan las claves de Supabase; si
// no, Postgres de Supabase con la service role key.
// ============================================================
import type { CrmDbCompleta } from "./db-extra";
import { getDbMemoria } from "./db-memoria";
import { getDbSupabase } from "./db-supabase";

export function esMemoria(): boolean {
  return (
    process.env.CLIENTANY_DB === "memory" ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL
  );
}

export function getDb(): CrmDbCompleta {
  return esMemoria() ? getDbMemoria() : getDbSupabase();
}
