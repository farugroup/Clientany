import { Invalido, contexto, manejar } from "@/lib/crm/server/auth";
import { exportarCsv } from "@/lib/crm/server/servicio";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = manejar<{ que: string }>(async (_req, { params }) => {
  const { db, empresa } = await contexto();
  const que = params.que;
  if (que !== "contactos" && que !== "pedidos" && que !== "productos") throw new Invalido("Se puede exportar contactos, pedidos o productos.", "que_invalido");
  const csv = await exportarCsv(db, empresa, que);
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${que}-${fecha}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
