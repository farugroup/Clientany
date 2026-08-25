"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

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

// Re-export the live-store brand lookup so existing imports keep working.
export { brandById } from "./data-store";
