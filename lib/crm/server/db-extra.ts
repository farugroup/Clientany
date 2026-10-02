// ============================================================
// Clientany · CRM — lo que las dos bases saben hacer además de `CrmDb`.
// (`db.ts` es del chat principal y no se toca: estas tres cosas faltan en
// la interfaz y se piden ahí; mientras tanto viven acá.)
// ============================================================
import type { CrmDb } from "./db";

export interface RegistroWebhook {
  empresa_id: string | null;
  objeto: string;
  entrantes: number;
  estados: number;
  error?: string | null;
}

export interface CrmDbExtra {
  // Clave de IA propia de la empresa, cifrada. Nunca viaja en `Empresa`.
  claveIaCifrada(empresaId: string): Promise<string | null>;
  guardarClaveIa(empresaId: string, cifrada: string | null): Promise<void>;
  // Resumen de cada POST del webhook (sin datos personales).
  registrarWebhook(r: RegistroWebhook): Promise<void>;
}

export type CrmDbCompleta = CrmDb & CrmDbExtra;
