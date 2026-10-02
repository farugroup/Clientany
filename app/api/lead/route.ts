// ============================================================
// Clientany · POST /api/lead — el formulario «Quiero que me contacten»
// de la landing. Valida el email y avisa:
//   · por mail a LEAD_EMAIL (o hola@clientany.com), si Resend está configurado;
//   · por POST a LEAD_WEBHOOK_URL (Slack, Discord, Make, Zapier…), si existe.
// Siempre queda en el log de Vercel («[clientany] lead»), así un lead no se
// pierde aunque falle el mail o el webhook.
// ============================================================
import { NextResponse } from "next/server";
import { isResendConfigured, sendEmail } from "@/lib/email";
import { emailValido } from "@/lib/crm/core";

export const dynamic = "force-dynamic";

interface LeadEntrada {
  nombre?: unknown;
  email?: unknown;
  whatsapp?: unknown;
  canales?: unknown;
  sitio_web?: unknown; // campo trampa para robots
}

function texto(v: unknown, max: number): string {
  if (typeof v === "string") return v.trim().slice(0, max);
  if (typeof v === "number" && Number.isFinite(v)) return String(v).slice(0, max);
  return "";
}

const ENTIDADES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapar(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ENTIDADES[c] || c);
}

function htmlDelLead(lead: { nombre: string; email: string; whatsapp: string; canales: string; fecha: string }): string {
  const fila = (k: string, v: string) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#6b769a">${k}</td><td style="padding:6px 0;color:#0a0d1a;font-weight:600">${
      v ? escapar(v) : "sin dato"
    }</td></tr>`;
  return `
  <div style="font-family:Inter,Arial,sans-serif;padding:16px">
    <h2 style="margin:0 0 12px;font-size:18px">Nuevo contacto desde la landing</h2>
    <table style="border-collapse:collapse;font-size:14px">
      ${fila("Nombre", lead.nombre)}
      ${fila("Email", lead.email)}
      ${fila("WhatsApp", lead.whatsapp)}
      ${fila("Canales", lead.canales)}
      ${fila("Fecha", lead.fecha)}
    </table>
  </div>`;
}

export async function POST(req: Request) {
  let body: LeadEntrada;
  try {
    body = (await req.json()) as LeadEntrada;
  } catch {
    return NextResponse.json({ error: "No pudimos leer el formulario. Probá de nuevo." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "No pudimos leer el formulario. Probá de nuevo." }, { status: 400 });
  }

  const email = texto(body.email, 200).toLowerCase();
  if (!emailValido(email)) {
    return NextResponse.json({ error: "Revisá el email: no parece válido." }, { status: 400 });
  }

  // Un robot completó el campo oculto: le decimos que sí y no avisamos a nadie.
  if (texto(body.sitio_web, 200)) {
    console.log("[clientany] lead descartado (campo trampa)", { email });
    return NextResponse.json({ ok: true });
  }

  const lead = {
    nombre: texto(body.nombre, 120),
    email,
    whatsapp: texto(body.whatsapp, 40),
    canales: texto(body.canales, 20),
    origen: "landing",
    fecha: new Date().toISOString(),
  };
  console.log("[clientany] lead", lead);

  const avisos: Promise<unknown>[] = [];

  if (isResendConfigured) {
    const destino = process.env.LEAD_EMAIL || "hola@clientany.com";
    avisos.push(
      sendEmail({
        to: destino,
        subject: `Nuevo contacto: ${lead.nombre || lead.email}`,
        html: htmlDelLead(lead),
      }).catch((e: unknown) => console.error("[clientany] lead: no salió el mail", e instanceof Error ? e.message : e))
    );
  }

  const webhook = process.env.LEAD_WEBHOOK_URL;
  if (webhook) {
    const resumen = `Nuevo contacto en Clientany: ${lead.nombre || "sin nombre"} · ${lead.email}${
      lead.whatsapp ? ` · WhatsApp ${lead.whatsapp}` : ""
    }${lead.canales ? ` · ${lead.canales} canales` : ""}`;
    avisos.push(
      fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `text` lo entienden Slack y Discord (con /slack); `lead` va entero para Make/Zapier.
        body: JSON.stringify({ text: resumen, evento: "lead", lead }),
        signal: AbortSignal.timeout(5000),
      })
        .then((r) => {
          if (!r.ok) console.error("[clientany] lead: el webhook respondió", r.status);
        })
        .catch((e: unknown) => console.error("[clientany] lead: no salió el webhook", e instanceof Error ? e.message : e))
    );
  }

  await Promise.all(avisos);
  return NextResponse.json({ ok: true });
}
