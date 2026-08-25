import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Todas las rutas salvo estáticos, imágenes y assets públicos.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json|api/).*)",
  ],
};
