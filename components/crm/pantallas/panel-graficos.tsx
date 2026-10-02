"use client";
// Gráficos del Panel. Los colores son DATOS (el color de cada canal o de
// cada etapa); textos y ejes van con la tinta del tema.
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface Barra {
  nombre: string;
  valor: number;
  color: string;
}

const TOOLTIP = {
  background: "#141a2e",
  border: "1px solid #242c47",
  borderRadius: 12,
  color: "#fff",
  fontSize: 12,
};

export function GraficoCanales({ datos }: { datos: Barra[] }) {
  return (
    <div role="img" aria-label={`Conversaciones por canal: ${datos.map((d) => `${d.nombre} ${d.valor}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={datos} margin={{ top: 18, right: 6, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#242c47" vertical={false} />
          <XAxis dataKey="nombre" stroke="#6b769a" fontSize={11} tickLine={false} axisLine={false} interval={0} />
          <YAxis stroke="#6b769a" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "rgba(53,99,255,0.08)" }}
            contentStyle={TOOLTIP}
            itemStyle={{ color: "#c5cbdd" }}
            formatter={(v: number) => [v, "Conversaciones"]}
          />
          <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={44}>
            {datos.map((d) => (
              <Cell key={d.nombre} fill={d.color} />
            ))}
            <LabelList dataKey="valor" position="top" fill="#9aa3c0" fontSize={11} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Embudo: barras horizontales en HTML (más prolijo que un gráfico para pocas etapas).
export function BarrasEtapas({ datos }: { datos: Barra[] }) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  const total = datos.reduce((s, d) => s + d.valor, 0);
  return (
    <div className="space-y-2.5">
      {datos.map((d) => (
        <div key={d.nombre} title={`${d.nombre}: ${d.valor} ${d.valor === 1 ? "chat" : "chats"}`}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-1.5 text-ink-200">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="truncate">{d.nombre}</span>
            </span>
            <span className="shrink-0 font-mono text-ink-300">
              {d.valor}
              {total > 0 && <span className="ml-1 text-ink-500">{Math.round((d.valor / total) * 100)}%</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(d.valor / max) * 100}%`, background: d.color, minWidth: d.valor ? 6 : 0 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
