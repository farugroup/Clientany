"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
} from "recharts";
import { revenueByDay, messagesByChannel } from "@/lib/mock-data";
import { compactMoney } from "@/lib/format";
import { channelMeta } from "@/lib/channels";

const channelColors = [
  channelMeta.whatsapp.color,
  channelMeta.instagram.color,
  "#FFD400",
  channelMeta.messenger.color,
  channelMeta.tiktok.color,
];

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={revenueByDay} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3563ff" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#3563ff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#242c47" vertical={false} />
        <XAxis dataKey="day" stroke="#6b769a" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke="#6b769a"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => compactMoney(v)}
        />
        <Tooltip
          contentStyle={{
            background: "#141a2e",
            border: "1px solid #242c47",
            borderRadius: 12,
            color: "#fff",
            fontSize: 12,
          }}
          formatter={(v: number, n) => [
            compactMoney(v),
            n === "ventas" ? "Ventas" : "Recuperado",
          ]}
        />
        <Area
          type="monotone"
          dataKey="ventas"
          stroke="#598bff"
          strokeWidth={2.5}
          fill="url(#gv)"
        />
        <Area
          type="monotone"
          dataKey="recuperado"
          stroke="#16a34a"
          strokeWidth={2.5}
          fill="url(#gr)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ChannelsChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={messagesByChannel} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#242c47" vertical={false} />
        <XAxis dataKey="channel" stroke="#6b769a" fontSize={10} tickLine={false} axisLine={false} interval={0} />
        <YAxis stroke="#6b769a" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: "rgba(53,99,255,0.08)" }}
          contentStyle={{
            background: "#141a2e",
            border: "1px solid #242c47",
            borderRadius: 12,
            color: "#fff",
            fontSize: 12,
          }}
          formatter={(v: number) => [v, "Mensajes"]}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {messagesByChannel.map((_, i) => (
            <Cell key={i} fill={channelColors[i % channelColors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
