import { Invalido, contexto, manejar, ok } from "@/lib/crm/server/auth";
import { uid } from "@/lib/crm/core";
import { canalDe, convDe, enviarSaliente, extDeMime, tipoDeMime } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOPE = 25 * 1024 * 1024;

// multipart: `archivo` (obligatorio) y `texto` (opcional, va como caption).
export const POST = manejar<{ id: string }>(async (req, { params }) => {
  const { db, empresa, miembro } = await contexto();
  const conv = await convDe(db, empresa, params.id);
  const canal = await canalDe(db, empresa, conv.canal_id);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new Invalido("Mandá el archivo como multipart/form-data en el campo «archivo».", "formato_invalido");
  }
  const archivo = form.get("archivo");
  if (!(archivo instanceof File)) throw new Invalido("Falta el archivo (campo «archivo»).", "falta_archivo");
  if (archivo.size > TOPE) throw new Invalido("El archivo pesa más de 25 MB.", "archivo_grande");
  if (archivo.size === 0) throw new Invalido("El archivo está vacío.", "archivo_vacio");
  const textoRaw = form.get("texto");
  const texto = typeof textoRaw === "string" ? textoRaw.trim().slice(0, 1024) : "";
  const mime = (archivo.type || "application/octet-stream").split(";")[0].trim();
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const guardado = await db.guardarArchivo(empresa.id, `${uid("f")}.${extDeMime(mime, archivo.name)}`, bytes, mime);
  const m = await enviarSaliente(db, empresa, canal, conv, {
    texto,
    tipo: tipoDeMime(mime),
    media_url: guardado.url,
    media_nombre: archivo.name || undefined,
    media_mime: mime,
    de: "agente",
    autor: miembro.nombre,
  });
  return ok(m);
});
