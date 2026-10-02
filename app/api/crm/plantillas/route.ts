import type { Plantilla } from "@/lib/crm/types";
import { contexto, exigirAdmin, manejar, ok } from "@/lib/crm/server/auth";
import { leerJson, opcion, texto, textoOpcional, listaDeTextos } from "@/lib/crm/server/validar";
import { uid } from "@/lib/crm/core";
import { contarVariables } from "@/lib/crm/server/meta";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Plantilla local (o edición de una sincronizada). Upsert por (nombre, idioma).
export const POST = manejar(async (req) => {
  const { db, empresa, miembro } = await contexto();
  exigirAdmin(miembro);
  const b = await leerJson(req);
  const nombre = texto(b, "nombre", { requerido: true }).toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const idioma = texto(b, "idioma", { max: 10 }) || "es_AR";
  const todas = await db.plantillas(empresa.id);
  const previa = (typeof b.id === "string" && todas.find((p) => p.id === b.id)) || todas.find((p) => p.nombre === nombre && p.idioma === idioma) || null;
  const cuerpo = texto(b, "cuerpo", { requerido: !previa, max: 1024 }) || previa?.cuerpo || "";
  const p: Plantilla = {
    id: previa?.id || uid("pl"),
    empresa_id: empresa.id,
    canal_id: textoOpcional(b, "canal_id", 80) ?? previa?.canal_id ?? null,
    nombre,
    idioma,
    categoria: textoOpcional(b, "categoria", 40) ?? previa?.categoria,
    estado: b.estado ? opcion(b, "estado", ["aprobada", "pendiente", "rechazada", "local"] as const) : previa?.estado || "local",
    cuerpo,
    variables: contarVariables(cuerpo),
    ejemplo: "ejemplo" in b ? listaDeTextos(b, "ejemplo", 20) : previa?.ejemplo,
    actualizado: new Date().toISOString(),
  };
  if (!p.categoria) delete p.categoria;
  if (!p.ejemplo || !p.ejemplo.length) delete p.ejemplo;
  await db.guardarPlantilla(p);
  return ok(p);
});
