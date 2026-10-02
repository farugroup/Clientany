import type { Canal } from "@/lib/crm/types";
import { Invalido, manejar, ok } from "@/lib/crm/server/auth";
import { empresaPorApiKey } from "@/lib/crm/server/api-key";
import { esObjeto, leerJson, listaDeTextos, textoOpcional } from "@/lib/crm/server/validar";
import { normalizarTelefono, ventanaAbierta } from "@/lib/crm/core";
import { canalDe, convDe, enviarSaliente, nuevaConversacion } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// { telefono | conversacion_id, texto?, plantilla?: {nombre, idioma?, parametros}, canal_id? }
// Texto libre sólo con ventana abierta; si no, exige plantilla (400 ventana_cerrada).
export const POST = manejar(async (req) => {
  const { db, empresa, key } = await empresaPorApiKey(req);
  const b = await leerJson(req);
  const texto = textoOpcional(b, "texto", 4096) || "";
  let plantilla: { nombre: string; idioma?: string; parametros: string[] } | undefined;
  if (esObjeto(b.plantilla)) {
    const nombre = String(b.plantilla.nombre || "").trim();
    if (!nombre) throw new Invalido("Falta el nombre de la plantilla.", "falta_plantilla");
    plantilla = { nombre, idioma: typeof b.plantilla.idioma === "string" ? b.plantilla.idioma.trim() || undefined : undefined, parametros: listaDeTextos(b.plantilla, "parametros", 20) };
  }
  if (!texto && !plantilla) throw new Invalido("Mandá «texto» o «plantilla».", "falta_texto");
  const convId = textoOpcional(b, "conversacion_id", 80);
  const autor = `API · ${key.nombre}`;
  const miembroApi = { id: "api", empresa_id: empresa.id, nombre: autor, email: "", rol: "agente" as const, creado: empresa.creado };

  let canal: Canal;
  let conv;
  if (convId) {
    conv = await convDe(db, empresa, convId);
    canal = await canalDe(db, empresa, conv.canal_id);
  } else {
    const telefono = normalizarTelefono(textoOpcional(b, "telefono", 40) || "");
    if (!telefono) throw new Invalido("Mandá «telefono» o «conversacion_id».", "falta_destino");
    const canalId = textoOpcional(b, "canal_id", 80);
    if (canalId) canal = await canalDe(db, empresa, canalId);
    else {
      const wa = (await db.canales(empresa.id)).find((c) => c.tipo === "whatsapp" && c.estado === "conectado");
      if (!wa) throw new Invalido("La empresa no tiene un canal de WhatsApp conectado.", "sin_canal");
      canal = wa;
    }
    conv = (await db.conversacionPorIdentificador(canal.id, telefono)) || (await nuevaConversacion(db, empresa, miembroApi, { canal_id: canal.id, identificador: telefono, nombre: textoOpcional(b, "nombre") }));
  }
  if (!plantilla && canal.tipo !== "manual" && !ventanaAbierta(conv)) {
    throw new Invalido("Pasaron más de 24 hs desde el último mensaje del cliente: WhatsApp sólo deja mandar una plantilla aprobada.", "ventana_cerrada");
  }
  const m = await enviarSaliente(db, empresa, canal, conv, { texto: plantilla ? undefined : texto, plantilla, de: "agente", autor });
  return ok(m, 201);
});
