"use client";

import { Sparkles } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import MobileNav from "@/components/MobileNav";
import Onboarding from "@/components/Onboarding";
import { useData, useHydrated } from "@/lib/data-store";

export default function AppFrame({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const onboardingDone = useData((s) => s.onboardingDone);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 animate-pulse2 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="text-sm text-ink-400">Cargando Clientany…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-ink-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 pb-24 pt-5 lg:px-6 lg:pb-8">{children}</main>
        <MobileNav />
      </div>
      {!onboardingDone && <Onboarding />}
    </div>
  );
}
