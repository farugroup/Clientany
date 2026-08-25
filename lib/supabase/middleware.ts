import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Rutas de la app que requieren sesión cuando Supabase está configurado.
const PROTECTED_PREFIXES = [
  "/panel",
  "/inbox",
  "/embudo",
  "/atencion",
  "/channels",
  "/catalogo",
  "/mercadolibre",
  "/tracking",
  "/carritos",
  "/campanas",
  "/difusion",
  "/marcas",
  "/ajustes",
];

export async function updateSession(request: NextRequest) {
  // Modo demo: sin Supabase, no protegemos nada.
  if (!isSupabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}
