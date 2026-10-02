import type { Contacto, Mensaje, Pedido, Producto } from "@/lib/crm/types";
import { Invalido, contexto, ipDe, manejar, ok, usuarioActual } from "@/lib/crm/server/auth";
import { descifrar } from "@/lib/crm/server/crypto";
import { sugerir, verificarCuotaIp } from "@/lib/crm/server/ia";
import { esObjeto, leerJson, textoOpcional } from "@/lib/crm/server/validar";
import { convDe, pedidosDeConversacion } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Con sesión: `conversacion_id` (el contexto sale de la base).
// Sin sesión (modo demo): `contexto` armado por el navegador, con límite por IP.
export const POST = manejar(async (req) => {
  const b = await leerJson(req);
  const borrador = textoOpcional(b, "borrador", 4096) || undefined;
  const usuario = await usuarioActual();
  if (usuario) {
    const convId = textoOpcional(b, "conversacion_id", 80);
    if (convId) {
      const { db, empresa } = await contexto();
      const conv = await convDe(db, empresa, convId);
      const [mensajes, productos, { contacto, pedidos }] = await Promise.all([db.mensajes(conv.id, { limite: 60 }), db.productos(empresa.id), pedidosDeConversacion(db, empresa, conv)]);
      let claveEmpresa: string | undefined;
      if (empresa.ia?.proveedor === "anthropic") {
        const cifrada = await db.claveIaCifrada(empresa.id);
        if (cifrada) claveEmpresa = descifrar(cifrada);
      }
      const r = await sugerir({
        empresa: { nombre: empresa.nombre, rubro: empresa.rubro, instrucciones: empresa.ia?.instrucciones, moneda: empresa.moneda },
        mensajes,
        contacto,
        pedidos,
        productos,
        borrador,
        claveEmpresa,
      });
      return ok(r);
    }
  }
  // Modo demo (sin sesión o sin conversación): el contexto viene del navegador.
  if (!esObjeto(b.contexto)) throw new Invalido("Falta «conversacion_id» o «contexto».", "falta_contexto");
  verificarCuotaIp(ipDe(req));
  const c = b.contexto;
  const emp = esObjeto(c.empresa) ? c.empresa : {};
  const mensajes = (Array.isArray(c.mensajes) ? c.mensajes.filter(esObjeto) : []).slice(-40) as unknown as Mensaje[];
  const r = await sugerir({
    empresa: {
      nombre: String(emp.nombre || "la empresa").slice(0, 120),
      rubro: typeof emp.rubro === "string" ? emp.rubro.slice(0, 120) : undefined,
      instrucciones: typeof emp.instrucciones === "string" ? emp.instrucciones.slice(0, 4000) : undefined,
      moneda: typeof emp.moneda === "string" ? emp.moneda : "ARS",
    },
    mensajes,
    contacto: esObjeto(c.contacto) ? (c.contacto as unknown as Contacto) : null,
    pedidos: (Array.isArray(c.pedidos) ? c.pedidos.filter(esObjeto).slice(0, 10) : []) as unknown as Pedido[],
    productos: (Array.isArray(c.productos) ? c.productos.filter(esObjeto).slice(0, 200) : []) as unknown as Producto[],
    borrador,
  });
  return ok(r);
});
