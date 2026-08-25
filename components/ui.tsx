"use client";

import { type ReactNode } from "react";
import { type LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  accent = "#3563ff",
  sub,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  accent?: string;
  sub?: string;
}) {
  return (
    <div className="card p-4 lg:p-5">
      <div className="flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: `${accent}1f` }}
        >
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
        {trend && (
          <span
            className={`chip ${
              trendUp ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
            }`}
          >
            {trendUp ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {trend}
          </span>
        )}
      </div>
      <div className="mt-3 text-2xl font-extrabold tracking-tight text-white lg:text-[28px]">
        {value}
      </div>
      <div className="mt-0.5 text-sm text-ink-300">{label}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-500">{sub}</div>}
    </div>
  );
}

export function SectionTitle({
  title,
  action,
  icon: Icon,
}: {
  title: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-base font-bold text-white">
        {Icon && <Icon className="h-[18px] w-[18px] text-brand-300" />}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function StatusDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span
        className="absolute inline-flex h-full w-full animate-pulse2 rounded-full opacity-60"
        style={{ background: color }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ background: color }}
      />
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  desc,
  action,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-800">
        <Icon className="h-7 w-7 text-ink-400" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-400">{desc}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Pill({
  children,
  color,
  bg,
}: {
  children: ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <span className="chip font-semibold" style={{ color, background: bg }}>
      {children}
    </span>
  );
}
