import { NextResponse } from "next/server";
import { NoEncontrado, manejar, usuarioActual } from "@/lib/crm/server/auth";
import { esMemoria, getDb } from "@/lib/crm/server/db-factory";
import { empresaPorApiKey } from "@/lib/crm/server/api-key";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Memoria: sirve los bytes. Supabase: redirige a la URL pública del bucket.
export const GET = manejar<{ clave: string }>(async (req, { params }) => {
  const clave = decodeURIComponent(params.clave || "");
  if (!clave || clave.includes("..") || clave.includes("/")) throw new NoEncontrado("No encontré ese archivo.");
  const db = getDb();
  if (!esMemoria()) {
    const archivo = await db.leerArchivo(clave);
    if (!archivo) throw new NoEncontrado("No encontré ese archivo.");
    return new NextResponse(new Uint8Array(archivo.bytes).buffer, { status: 200, headers: { "Content-Type": archivo.mime, "Cache-Control": "private, max-age=3600" } });
  }
  // En memoria la clave empieza con el id de la empresa: sólo la ve su equipo (o su clave de API).
  const empresaId = clave.split("-")[0];
  let permitido = false;
  const usuario = await usuarioActual();
  if (usuario) {
    const par = await db.empresaDeUsuario(usuario.id);
    permitido = !!par && par.empresa.id === empresaId;
  }
  if (!permitido && (req.headers.get("x-api-key") || req.headers.get("authorization"))) {
    try {
      const { empresa } = await empresaPorApiKey(req);
      permitido = empresa.id === empresaId;
    } catch {
      permitido = false;
    }
  }
  if (!permitido) throw new NoEncontrado("No encontré ese archivo.");
  const archivo = await db.leerArchivo(clave);
  if (!archivo) throw new NoEncontrado("No encontré ese archivo.");
  return new NextResponse(new Uint8Array(archivo.bytes).buffer, { status: 200, headers: { "Content-Type": archivo.mime, "Cache-Control": "private, max-age=3600" } });
});
