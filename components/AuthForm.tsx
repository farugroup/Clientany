"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, User, Loader2, AlertCircle, CheckCircle2, PlayCircle } from "lucide-react";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 2.9 14.6 2 12 2 6.9 2 2.8 6.1 2.8 12S6.9 22 12 22c5.9 0 9.8-4.1 9.8-9.9 0-.7-.1-1.2-.2-1.9H12z" />
    </svg>
  );
}

function AuthFormInner({ mode }: { mode: "login" | "registro" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/panel";
  const supabase = getSupabaseBrowser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isLogin = mode === "login";

  // Modo demo: sin Supabase configurado.
  if (!isSupabaseConfigured || !supabase) {
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15">
          <PlayCircle className="h-6 w-6 text-brand-300" />
        </div>
        <h1 className="mt-3 text-xl font-bold text-white">Modo demo activo</h1>
        <p className="mt-2 text-sm text-ink-400">
          Todavía no conectaste Supabase, así que la app corre en modo demostración (los datos se
          guardan en este navegador). Podés probar todas las funciones ya mismo.
        </p>
        <Link href="/panel" className="btn-primary mt-5 w-full">
          Entrar al demo
        </Link>
        <p className="mt-3 text-xs text-ink-500">
          Para habilitar registro real, seguí la guía <code className="text-brand-300">SUPABASE.md</code>.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (isLogin) {
        const { error } = await supabase!.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else {
        const { data, error } = await supabase!.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        // Email de bienvenida (best-effort).
        fetch("/api/email/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name }),
        }).catch(() => {});
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setNotice("¡Listo! Te enviamos un email para confirmar tu cuenta. Revisá tu bandeja.");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? traducirError(err.message) : "Ocurrió un error. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    await supabase!.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  return (
    <div className="card p-6">
      <h1 className="text-xl font-extrabold text-white">
        {isLogin ? "Ingresá a tu cuenta" : "Creá tu cuenta gratis"}
      </h1>
      <p className="mt-1 text-sm text-ink-400">
        {isLogin ? "Bienvenido de nuevo a Clientany." : "Empezá a unificar tu ecommerce hoy."}
      </p>

      <button onClick={handleGoogle} className="btn-ghost mt-5 w-full">
        <GoogleIcon /> Continuar con Google
      </button>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-ink-800" />
        <span className="text-xs text-ink-500">o con tu email</span>
        <div className="h-px flex-1 bg-ink-800" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {!isLogin && (
          <Field icon={<User className="h-4 w-4" />} placeholder="Tu nombre" value={name} onChange={setName} />
        )}
        <Field icon={<Mail className="h-4 w-4" />} type="email" placeholder="tu@email.com" value={email} onChange={setEmail} required />
        <Field icon={<Lock className="h-4 w-4" />} type="password" placeholder="Contraseña" value={password} onChange={setPassword} required />

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        {notice && (
          <div className="flex items-start gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-xs text-green-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {notice}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isLogin ? "Ingresar" : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-ink-400">
        {isLogin ? (
          <>
            ¿No tenés cuenta?{" "}
            <Link href="/registro" className="font-semibold text-brand-300 hover:text-brand-200">
              Registrate gratis
            </Link>
          </>
        ) : (
          <>
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="font-semibold text-brand-300 hover:text-brand-200">
              Ingresá
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function Field({
  icon,
  type = "text",
  placeholder,
  value,
  onChange,
  required,
}: {
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="input pl-9"
      />
    </div>
  );
}

function traducirError(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return "Email o contraseña incorrectos.";
  if (/already registered|already exists/i.test(msg)) return "Ese email ya tiene una cuenta. Probá ingresando.";
  if (/Password should be at least/i.test(msg)) return "La contraseña debe tener al menos 6 caracteres.";
  if (/Email not confirmed/i.test(msg)) return "Confirmá tu email antes de ingresar (revisá tu bandeja).";
  return msg;
}

export default function AuthForm({ mode }: { mode: "login" | "registro" }) {
  return (
    <Suspense fallback={<div className="card p-6 text-center text-ink-400">Cargando…</div>}>
      <AuthFormInner mode={mode} />
    </Suspense>
  );
}
