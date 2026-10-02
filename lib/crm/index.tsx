"use client";
// ============================================================
// Clientany · CRM — arranque.
//
// Elige el repositorio (demo en el navegador o nube contra /api/crm), lo
// registra con `setRepo` UNA sola vez y carga los datos. Mientras carga
// muestra el mismo cargador que AppFrame; si falla, una tarjeta con el
// motivo y «Reintentar». En nube, además, avisa presencia cada 60 s y trae
// novedades cada 15 s (sólo con la pestaña a la vista).
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { setRepo, useCrm, type CrmRepo } from "./repo";
import { RepoLocal } from "./repo-local";
import { RepoNube } from "./repo-nube";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function modoCrm(): "demo" | "nube" {
  const forzado = process.env.NEXT_PUBLIC_CLIENTANY_MODO;
  return forzado === "nube" ? "nube" : forzado === "demo" ? "demo" : isSupabaseConfigured ? "nube" : "demo";
}

// Singleton de módulo: un solo repositorio por pestaña.
let repoUnico: CrmRepo | null = null;
function obtenerRepo(): CrmRepo {
  if (!repoUnico) {
    repoUnico = modoCrm() === "nube" ? new RepoNube() : new RepoLocal();
    setRepo(repoUnico);
  }
  return repoUnico;
}

function textoDeError(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e) return e;
  return "No pudimos cargar tu CRM. Revisá la conexión y probá de nuevo.";
}

const visible = () => typeof document === "undefined" || document.visibilityState === "visible";

export function CrmArranque({ children }: { children: React.ReactNode }) {
  const repo = obtenerRepo();
  const listo = useCrm((s) => s.listo);
  const error = useCrm((s) => s.error);
  const [intento, setIntento] = useState(0);
  const [reintentando, setReintentando] = useState(false);

  useEffect(() => {
    let vivo = true;
    useCrm.getState().set({ error: null });
    repo
      .cargar()
      .catch((e) => {
        if (vivo) useCrm.getState().set({ error: textoDeError(e) });
      })
      .finally(() => {
        if (vivo) setReintentando(false);
      });
    return () => {
      vivo = false;
    };
  }, [repo, intento]);

  // Nube: presencia y novedades en segundo plano.
  useEffect(() => {
    if (repo.modo !== "nube" || !listo) return;
    const pulso = () => {
      if (visible()) repo.pulso().catch(() => undefined);
    };
    const refrescar = () => {
      if (visible()) repo.refrescar().catch(() => undefined);
    };
    pulso();
    const tPulso = setInterval(pulso, 60_000);
    const tRefresco = setInterval(refrescar, 15_000);
    const alVolver = () => {
      if (document.visibilityState === "visible") {
        pulso();
        refrescar();
      }
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(tPulso);
      clearInterval(tRefresco);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [repo, listo]);

  const reintentar = useCallback(() => {
    setReintentando(true);
    setIntento((n) => n + 1);
  }, []);

  if (error && !listo) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="card w-full max-w-md p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <h2 className="mt-3 text-base font-bold text-white">No pudimos cargar tu CRM</h2>
          <p className="mt-1 text-sm text-ink-400">{error}</p>
          <button className="btn-primary mt-5" onClick={reintentar} disabled={reintentando}>
            <RefreshCw className={`h-4 w-4 ${reintentando ? "animate-spin" : ""}`} /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!listo) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 animate-pulse2 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="text-sm text-ink-400">Cargando tu CRM…</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
