"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser, isSupabaseConfigured } from "./supabase/client";
import { useData, snapshotWorkspace, applyWorkspace } from "./data-store";

const TABLE = "workspaces";

// Sesión + logout para la UI.
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowser();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
  }

  return { user, loading, signOut, configured: isSupabaseConfigured };
}

// Carga el workspace del usuario desde Supabase y guarda los cambios (debounce).
// Devuelve `ready` cuando ya se puede mostrar la app.
export function useCloudWorkspace(): { ready: boolean } {
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const savingRef = useRef(false);
  const loadedRef = useRef(false);
  const supabase = getSupabaseBrowser();

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let cancelled = false;

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        // Sin sesión (no debería pasar por el middleware): dejamos el modo local.
        if (!cancelled) setReady(true);
        return;
      }

      const { data, error } = await supabase
        .from(TABLE)
        .select("data")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cancelled) {
        if (!error && data?.data) {
          // Trae el workspace guardado en la nube (fuente de verdad).
          applyWorkspace(data.data as Record<string, unknown>);
        } else if (!error && !data) {
          // Primer ingreso: creamos su workspace con el estado actual.
          await supabase.from(TABLE).upsert({
            user_id: user.id,
            data: snapshotWorkspace(),
            updated_at: new Date().toISOString(),
          });
        }
        loadedRef.current = true;
        setReady(true);
      }
    })();

    // Guardado con debounce ante cualquier cambio del store.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useData.subscribe(() => {
      if (!loadedRef.current) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        if (savingRef.current) return;
        savingRef.current = true;
        try {
          const { data: u } = await supabase.auth.getUser();
          if (u.user) {
            await supabase.from(TABLE).upsert({
              user_id: u.user.id,
              data: snapshotWorkspace(),
              updated_at: new Date().toISOString(),
            });
          }
        } finally {
          savingRef.current = false;
        }
      }, 1200);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [supabase]);

  return { ready };
}
