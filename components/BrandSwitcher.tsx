"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronsUpDown, Check, LayoutGrid, Plus } from "lucide-react";
import { brands, channels } from "@/lib/mock-data";
import { useApp } from "@/lib/store";

export default function BrandSwitcher() {
  const { activeBrandId, setActiveBrand } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const active = brands.find((b) => b.id === activeBrandId);
  const unreadFor = (bid: string) =>
    channels.filter((c) => c.brandId === bid).reduce((s, c) => s + c.unread, 0);
  const totalUnread = channels.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5 text-left transition hover:border-ink-600"
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
          style={{
            background: active ? `${active.color}22` : "rgba(53,99,255,0.15)",
          }}
        >
          {active ? active.logo : <LayoutGrid className="h-4 w-4 text-brand-300" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">
            {active ? active.name : "Todas las marcas"}
          </div>
          <div className="truncate text-xs text-ink-400">
            {active ? active.handle : `${brands.length} marcas · vista global`}
          </div>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-ink-400" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 animate-fade-in rounded-xl border border-ink-700 bg-ink-850 p-1.5 shadow-card">
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
            Cambiar de marca
          </div>
          <button
            onClick={() => {
              setActiveBrand("all");
              setOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-ink-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15">
              <LayoutGrid className="h-4 w-4 text-brand-300" />
            </div>
            <div className="flex-1 text-sm font-medium text-white">Todas las marcas</div>
            {totalUnread > 0 && (
              <span className="chip bg-brand-500/15 text-brand-300">{totalUnread}</span>
            )}
            {activeBrandId === "all" && <Check className="h-4 w-4 text-brand-400" />}
          </button>

          <div className="my-1 h-px bg-ink-700" />

          {brands.map((b) => {
            const unread = unreadFor(b.id);
            return (
              <button
                key={b.id}
                onClick={() => {
                  setActiveBrand(b.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-ink-800"
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
                  style={{ background: `${b.color}22` }}
                >
                  {b.logo}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">{b.name}</div>
                  <div className="truncate text-xs text-ink-400">{b.industry}</div>
                </div>
                {unread > 0 && (
                  <span className="chip bg-ink-700 text-ink-100">{unread}</span>
                )}
                {activeBrandId === b.id && <Check className="h-4 w-4 text-brand-400" />}
              </button>
            );
          })}

          <div className="my-1 h-px bg-ink-700" />
          <a
            href="/marcas"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm font-medium text-brand-300 transition hover:bg-ink-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-ink-600">
              <Plus className="h-4 w-4" />
            </div>
            Sumar nueva marca
          </a>
        </div>
      )}
    </div>
  );
}
