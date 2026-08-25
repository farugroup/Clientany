"use client";

import {
  CheckCircle2,
  Circle,
  Package,
  Truck,
  Home,
  Clock,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import type { Order, OrderStatus } from "@/lib/types";
import { orderStatusMeta } from "@/lib/channels";
import { dateTime, timeAgo } from "@/lib/format";

const stepIcon: Record<OrderStatus, typeof Package> = {
  confirmado: CheckCircle2,
  preparacion: Package,
  despachado: Package,
  en_camino: Truck,
  en_reparto: Truck,
  entregado: Home,
  demorado: AlertTriangle,
};

export default function TrackingTimeline({ order }: { order: Order }) {
  return (
    <ol className="relative space-y-0">
      {order.timeline.map((ev, i) => {
        const meta = orderStatusMeta[ev.status];
        const Icon = stepIcon[ev.status];
        const isLast = i === order.timeline.length - 1;
        const current = ev.done && (isLast || !order.timeline[i + 1].done);
        return (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition ${
                  ev.done ? "" : "border-ink-700 bg-ink-850"
                }`}
                style={
                  ev.done
                    ? { background: meta.bg, borderColor: meta.color }
                    : undefined
                }
              >
                {ev.done ? (
                  <Icon className="h-4 w-4" style={{ color: meta.color }} />
                ) : (
                  <Circle className="h-3 w-3 text-ink-600" />
                )}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 ${ev.done ? "bg-brand-500/40" : "bg-ink-700"}`}
                  style={{ minHeight: 28 }}
                />
              )}
            </div>
            <div className={`pb-5 ${current ? "" : "opacity-90"}`}>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-semibold ${ev.done ? "text-white" : "text-ink-400"}`}
                >
                  {ev.label}
                </span>
                {current && (
                  <span
                    className="chip animate-pulse2"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    Actual
                  </span>
                )}
              </div>
              <p className={`mt-0.5 text-xs ${ev.done ? "text-ink-300" : "text-ink-500"}`}>
                {ev.detail}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {ev.done ? dateTime(ev.timestamp) : `estimado ${timeAgo(ev.timestamp)}`}
                </span>
                {ev.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {ev.location}
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
