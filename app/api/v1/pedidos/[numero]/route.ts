import { NoEncontrado, manejar, ok } from "@/lib/crm/server/auth";
import { empresaPorApiKey } from "@/lib/crm/server/api-key";
import { leerJson, type Cuerpo } from "@/lib/crm/server/validar";
import { armarPedido, guardarPedidoAtando } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = manejar<{ numero: string }>(async (req, { params }) => {
  const { db, empresa } = await empresaPorApiKey(req);
  const p = await db.pedidoPorNumero(empresa.id, decodeURIComponent(params.numero));
  if (!p) throw new NoEncontrado("No encontré un pedido con ese número.");
  return ok(p);
});

export const PATCH = manejar<{ numero: string }>(async (req, { params }) => {
  const { db, empresa } = await empresaPorApiKey(req);
  const previo = await db.pedidoPorNumero(empresa.id, decodeURIComponent(params.numero));
  if (!previo) throw new NoEncontrado("No encontré un pedido con ese número.");
  const b: Cuerpo = { ...(await leerJson(req)) };
  delete b.id;
  delete b.empresa_id;
  delete b.numero;
  const p = armarPedido(empresa, b, previo);
  return ok(await guardarPedidoAtando(db, empresa, p));
});
