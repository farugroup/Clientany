import type { Empresa, Etapa, Etiqueta, Horario } from "@/lib/crm/types";
import { Invalido, contexto, exigirAdmin, manejar, ok } from "@/lib/crm/server/auth";
import { cifrar } from "@/lib/crm/server/crypto";
import { esObjeto, leerJson, texto, textoOpcional, type Cuerpo } from "@/lib/crm/server/validar";
import { registrar } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HHMM = /^([01]\d|2[0-4]):[0-5]\d$/;
const HEXA = /^#[0-9a-fA-F]{6}$/;

function armarHorario(v: unknown): Horario {
  if (!esObjeto(v) || !Array.isArray(v.dias)) throw new Invalido("El horario tiene que tener «zona» y «dias».", "horario_invalido");
  const zona = typeof v.zona === "string" && v.zona.trim() ? v.zona.trim() : "America/Argentina/Buenos_Aires";
  try {
    new Intl.DateTimeFormat("es-AR", { timeZone: zona });
  } catch {
    throw new Invalido("La zona horaria no es válida.", "horario_invalido");
  }
  const dias = v.dias.filter(esObjeto).map((d) => {
    const dia = Number(d.dia);
    if (!Number.isInteger(dia) || dia < 0 || dia > 6) throw new Invalido("Cada día del horario va de 0 (domingo) a 6 (sábado).", "horario_invalido");
    const desde = String(d.desde || "09:00");
    const hasta = String(d.hasta || "18:00");
    if (!HHMM.test(desde) || !HHMM.test(hasta)) throw new Invalido("Las horas van como HH:MM.", "horario_invalido");
    return { dia: dia as Horario["dias"][number]["dia"], abre: d.abre !== false, desde, hasta };
  });
  if (!dias.length) throw new Invalido("El horario necesita al menos un día.", "horario_invalido");
  return { zona, dias };
}

function armarEtapas(v: unknown): Etapa[] {
  if (!Array.isArray(v)) throw new Invalido("«etapas» tiene que ser una lista.", "etapas_invalidas");
  return v.filter(esObjeto).slice(0, 30).map((e, i) => {
    const nombre = String(e.nombre || "").trim();
    if (!nombre || nombre.length > 60) throw new Invalido("Cada etapa necesita un nombre (hasta 60 caracteres).", "etapas_invalidas");
    const color = String(e.color || "#598bff");
    return { id: String(e.id || "").trim() || `et_${Date.now().toString(36)}${i}`, nombre, color: HEXA.test(color) ? color : "#598bff", orden: Number.isFinite(Number(e.orden)) ? Number(e.orden) : i };
  });
}

function armarEtiquetas(v: unknown): Etiqueta[] {
  if (!Array.isArray(v)) throw new Invalido("«etiquetas» tiene que ser una lista.", "etiquetas_invalidas");
  return v.filter(esObjeto).slice(0, 50).map((e, i) => {
    const nombre = String(e.nombre || "").trim();
    if (!nombre || nombre.length > 40) throw new Invalido("Cada etiqueta necesita un nombre (hasta 40 caracteres).", "etiquetas_invalidas");
    const color = String(e.color || "#598bff");
    return { id: String(e.id || "").trim() || `tag_${Date.now().toString(36)}${i}`, nombre, color: HEXA.test(color) ? color : "#598bff" };
  });
}

// Sólo admin. Campos permitidos: nombre, rubro, pais, moneda, firma, horario,
// etapas, etiquetas, ia (proveedor, modelo, instrucciones), webhook_salida_url
// y `ia_clave` (se cifra; "" la borra). Nada más se toca.
export const PUT = manejar(async (req) => {
  const { db, empresa, miembro } = await contexto();
  exigirAdmin(miembro);
  const b: Cuerpo = await leerJson(req);
  const patch: Partial<Empresa> = {};
  if ("nombre" in b) patch.nombre = texto(b, "nombre", { requerido: true });
  if ("rubro" in b) patch.rubro = textoOpcional(b, "rubro") || undefined;
  if ("pais" in b) patch.pais = texto(b, "pais", { max: 60 }) || "Argentina";
  if ("moneda" in b) patch.moneda = (texto(b, "moneda", { max: 8 }) || "ARS").toUpperCase();
  if ("firma" in b) patch.firma = textoOpcional(b, "firma", 200) || undefined;
  if ("horario" in b) patch.horario = armarHorario(b.horario);
  if ("etapas" in b) patch.etapas = armarEtapas(b.etapas);
  if ("etiquetas" in b) patch.etiquetas = armarEtiquetas(b.etiquetas);
  if ("webhook_salida_url" in b) {
    const u = textoOpcional(b, "webhook_salida_url", 500) || "";
    if (u && !/^https:\/\/\S+$/i.test(u)) throw new Invalido("La URL del webhook tiene que empezar con https://", "webhook_invalido");
    patch.webhook_salida_url = u || undefined;
  }
  let ia = { ...empresa.ia };
  if ("ia" in b) {
    if (!esObjeto(b.ia)) throw new Invalido("«ia» tiene que ser un objeto.", "ia_invalida");
    const prov = b.ia.proveedor;
    if (prov !== undefined && prov !== "plataforma" && prov !== "anthropic") throw new Invalido("El proveedor de IA tiene que ser «plataforma» o «anthropic».", "ia_invalida");
    ia = {
      ...ia,
      proveedor: (prov as "plataforma" | "anthropic" | undefined) ?? ia.proveedor,
      modelo: "modelo" in b.ia ? String(b.ia.modelo || "").trim().slice(0, 80) || undefined : ia.modelo,
      instrucciones: "instrucciones" in b.ia ? String(b.ia.instrucciones || "").trim().slice(0, 4000) || undefined : ia.instrucciones,
    };
  }
  if ("ia_clave" in b) {
    const clave = String(b.ia_clave ?? "").trim();
    if (clave.length > 300) throw new Invalido("La clave de IA no parece válida.", "ia_clave_invalida");
    await db.guardarClaveIa(empresa.id, clave ? cifrar(clave) : null);
    ia.clave_cargada = !!clave;
    if (clave) ia.proveedor = "anthropic";
  }
  if ("ia" in b || "ia_clave" in b) patch.ia = ia;
  const actualizada = await db.actualizarEmpresa(empresa.id, patch);
  await registrar(db, empresa.id, miembro.nombre, "cambió la configuración de la empresa");
  return ok(actualizada);
});
