"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { brands } from "./mock-data";

interface AppState {
  activeBrandId: string; // "all" for consolidated view
  setActiveBrand: (id: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      activeBrandId: "all",
      setActiveBrand: (id) => set({ activeBrandId: id }),
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    { name: "clientany-ui" }
  )
);

export function useBrandFilter<T extends { brandId: string }>(items: T[]) {
  const activeBrandId = useApp((s) => s.activeBrandId);
  if (activeBrandId === "all") return items;
  return items.filter((i) => i.brandId === activeBrandId);
}

export function brandById(id: string) {
  return brands.find((b) => b.id === id);
}
