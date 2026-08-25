import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY ?? "";
const from = process.env.RESEND_FROM ?? "Clientany <onboarding@resend.dev>";

export const isResendConfigured = apiKey.length > 0;

const resend = isResendConfigured ? new Resend(apiKey) : null;

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  if (!resend) return { skipped: true as const };
  const { data, error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  if (error) throw new Error(error.message);
  return { id: data?.id };
}

export function welcomeEmailHtml(name?: string) {
  const hi = name ? `¡Hola ${name}!` : "¡Hola!";
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#0a0d1a;padding:32px;color:#e8ebf6">
    <div style="max-width:520px;margin:0 auto;background:#0f1424;border:1px solid #242c47;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(90deg,#3563ff,#1f41f5);padding:24px 28px">
        <div style="font-size:20px;font-weight:800;color:#fff">Clientany</div>
      </div>
      <div style="padding:28px">
        <h1 style="margin:0 0 8px;font-size:22px;color:#fff">${hi} 👋</h1>
        <p style="color:#9aa3c0;line-height:1.6;font-size:15px">
          ¡Bienvenido/a a Clientany, el CRM multicanal para tu ecommerce! Ya podés conectar tus
          canales, seguir tus envíos, recuperar carritos y gestionar tus ventas desde un solo lugar.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://clientany.app"}/panel"
           style="display:inline-block;margin-top:16px;background:#3563ff;color:#fff;text-decoration:none;
           padding:12px 22px;border-radius:12px;font-weight:700;font-size:15px">
          Ir a mi panel
        </a>
        <p style="color:#6b769a;font-size:13px;margin-top:24px">
          ¿Necesitás ayuda para configurar tus integraciones? Entrá a Configuración → Centro de
          integraciones, ahí tenés el paso a paso de cada plataforma.
        </p>
      </div>
      <div style="padding:16px 28px;border-top:1px solid #242c47;color:#6b769a;font-size:12px">
        Clientany · CRM multicanal para ecommerce de LATAM
      </div>
    </div>
  </div>`;
}
