import type { Pedido, PedidoEstado } from "@/lib/crm/types";
import { Invalido, manejar, ok } from "@/lib/crm/server/auth";
import { empresaPorApiKey } from "@/lib/crm/server/api-key";
import { leerJsonOLista, type Cuerpo } from "@/lib/crm/server/validar";
import { armarPedido, guardarPedidoAtando } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ESTADOS = ["pendiente", "pagado", "preparacion", "enviado", "entregado", "cancelado", "devuelto"];

export const GET = manejar(async (req) => {
  const { db, empresa } = await empresaPorApiKey(req);
  const url = new URL(req.url);
  const desde = url.searchParams.get("desde") || "";
  const estado = url.searchParams.get("estado") || "";
  if (estado && !ESTADOS.includes(estado)) throw new Invalido(`«estado» tiene que ser uno de: ${ESTADOS.join(", ")}.`, "estado_invalido");
  const d = desde ? new Date(desde) : null;
  if (d && isNaN(d.getTime())) throw new Invalido("«desde» no es una fecha válida.", "fecha_invalida");
  let lista = await db.pedidos(empresa.id);
  if (d) lista = lista.filter((p) => new Date(p.actualizado || p.creado).getTime() > d.getTime());
  if (estado) lista = lista.filter((p) => p.estado === (estado as PedidoEstado));
  return ok(lista.slice(0, 1000));
});

// Uno o una lista; upsert por número.
export const POST = manejar(async (req) => {
  const { db, empresa } = await empresaPorApiKey(req);
  const body = await leerJsonOLista(req);
  const guardarUno = async (b: Cuerpo): Promise<Pedido> => {
    const entrada: Cuerpo = { ...b };
    delete entrada.id;
    delete entrada.empresa_id;
    if (!entrada.canal) entrada.canal = "api";
    const numero = typeof entrada.numero === "string" ? entrada.numero.trim() : "";
    const previo = numero ? await db.pedidoPorNumero(empresa.id, numero) : null;
    const p = armarPedido(empresa, entrada, previo);
    return guardarPedidoAtando(db, empresa, p);
  };
  if (Array.isArray(body)) {
    if (body.length > 500) throw new Invalido("Hasta 500 pedidos por llamada.", "lista_larga");
    const out: Pedido[] = [];
    for (const b of body) out.push(await guardarUno(b));
    return ok(out, 201);
  }
  return ok(await guardarUno(body), 201);
});
