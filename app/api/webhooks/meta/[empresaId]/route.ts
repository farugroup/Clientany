import { NextResponse, type NextRequest } from "next/server";
import type { Canal, CanalTipo, Empresa } from "@/lib/crm/types";
import { errorCriollo } from "@/lib/crm/core";
import { getDb } from "@/lib/crm/server/db-factory";
import { firmaValida, parsearWebhook } from "@/lib/crm/server/meta";
import { aplicarEstado, procesarEntrante } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TIPO_POR_OBJETO: Record<string, CanalTipo> = { whatsapp_business_account: "whatsapp", instagram: "instagram", page: "messenger" };

// Verificación de Meta: devuelve hub.challenge si el verify token coincide.
export async function GET(req: NextRequest, { params }: { params: { empresaId: string } }) {
  const url = new URL(req.url);
  const modo = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token") || "";
  const challenge = url.searchParams.get("hub.challenge") || "";
  const empresa = await getDb().empresa(params.empresaId).catch(() => null);
  if (modo === "subscribe" && empresa && token && token === empresa.webhook_verify_token) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new NextResponse("Token de verificación incorrecto", { status: 403 });
}

// Siempre 200 rápido: Meta reintenta si no.
export async function POST(req: NextRequest, { params }: { params: { empresaId: string } }) {
  const db = getDb();
  const raw = await req.text();
  let empresa: Empresa | null = null;
  let objeto = "";
  let entrantesOk = 0;
  let estadosOk = 0;
  let error: string | undefined;
  try {
    empresa = await db.empresa(params.empresaId);
    if (!empresa) {
      await db.registrarWebhook({ empresa_id: params.empresaId, objeto: "", entrantes: 0, estados: 0, error: "empresa desconocida" });
      return NextResponse.json({ ok: true });
    }
    let body: unknown = null;
    try {
      body = JSON.parse(raw);
    } catch {
      await db.registrarWebhook({ empresa_id: empresa.id, objeto: "", entrantes: 0, estados: 0, error: "cuerpo no es JSON" });
      return NextResponse.json({ ok: true });
    }
    const parseado = parsearWebhook(body);
    objeto = parseado.objeto;
    const tipo = TIPO_POR_OBJETO[objeto];
    if (!tipo) {
      await db.registrarWebhook({ empresa_id: empresa.id, objeto, entrantes: 0, estados: 0, error: "objeto desconocido" });
      return NextResponse.json({ ok: true });
    }
    const firma = req.headers.get("x-hub-signature-256");
    const canales = new Map<string, Canal | null>();
    const firmaChequeada = new Map<string, boolean>();
    const canalDe = async (externoId: string): Promise<Canal | null> => {
      if (!canales.has(externoId)) canales.set(externoId, await db.canalPorExterno(tipo, externoId, empresa!.id));
      return canales.get(externoId) || null;
    };
    // Firma: se valida con el app_secret del canal si está cargado; si no, se acepta y se anota.
    const firmaOk = async (canal: Canal): Promise<boolean> => {
      if (firmaChequeada.has(canal.id)) return firmaChequeada.get(canal.id)!;
      let ok = true;
      if (canal.app_secret_cargado) {
        const creds = await db.credencialesCanal(canal.id);
        ok = !!creds?.app_secret && firmaValida(raw, firma, creds.app_secret);
        if (!ok) console.warn(`[crm webhook] firma inválida para el canal ${canal.id} de la empresa ${empresa!.id}`);
      }
      firmaChequeada.set(canal.id, ok);
      return ok;
    };
    for (const entrante of parseado.entrantes) {
      try {
        const canal = await canalDe(entrante.canal_externo_id);
        if (!canal) {
          console.warn(`[crm webhook] llegó un evento para un canal que no está conectado (${tipo} ${entrante.canal_externo_id})`);
          continue;
        }
        if (!(await firmaOk(canal))) continue;
        await procesarEntrante(db, empresa, canal, entrante);
        entrantesOk += 1;
      } catch (e) {
        error = errorCriollo(e);
        console.error("[crm webhook] error procesando un entrante:", error);
      }
    }
    if (parseado.estados.length) {
      // Los estados no traen canal: si todos los canales de ese tipo con secreto validan, se aplican.
      const conSecreto = (await db.canales(empresa.id)).filter((c) => c.tipo === tipo && c.app_secret_cargado);
      let ok = true;
      for (const c of conSecreto) if (!(await firmaOk(c))) ok = false;
      if (ok || !conSecreto.length) {
        for (const estado of parseado.estados) {
          try {
            if (await aplicarEstado(db, empresa, estado)) estadosOk += 1;
          } catch (e) {
            error = errorCriollo(e);
            console.error("[crm webhook] error aplicando un estado:", error);
          }
        }
      }
    }
    await db.registrarWebhook({ empresa_id: empresa.id, objeto, entrantes: entrantesOk, estados: estadosOk, error: error ?? null });
  } catch (e) {
    console.error("[crm webhook] error general:", errorCriollo(e));
    await db.registrarWebhook({ empresa_id: empresa?.id || params.empresaId, objeto, entrantes: entrantesOk, estados: estadosOk, error: errorCriollo(e) }).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
