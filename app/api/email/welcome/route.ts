import { NextResponse } from "next/server";
import { sendEmail, welcomeEmailHtml, isResendConfigured } from "@/lib/email";

export async function POST(req: Request) {
  if (!isResendConfigured) {
    return NextResponse.json({ skipped: true, reason: "Resend no configurado" });
  }
  const { email, name } = (await req.json().catch(() => ({}))) as {
    email?: string;
    name?: string;
  };
  if (!email) return NextResponse.json({ error: "email requerido" }, { status: 400 });

  try {
    const res = await sendEmail({
      to: email,
      subject: "¡Bienvenido/a a Clientany! 🚀",
      html: welcomeEmailHtml(name),
    });
    return NextResponse.json({ ok: true, ...res });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al enviar" },
      { status: 500 }
    );
  }
}
