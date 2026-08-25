# 🔐 Activar cuentas reales (Supabase + Resend) — guía paso a paso

Sin estas variables, Clientany funciona en **modo demo** (datos en el navegador, sin login).
Siguiendo esta guía habilitás **registro/login real** y **datos en la nube** sincronizados entre
dispositivos, además de los **emails** con Resend.

> Tiempo estimado: ~15 minutos. Todo tiene plan gratis para empezar.

---

## 1) Crear el proyecto en Supabase

1. Entrá a **https://supabase.com** → *New project*.
2. Elegí nombre, contraseña de la base y región (preferí **South America (São Paulo)**).
3. Cuando termine de crearse, andá a **Project Settings → API** y copiá:
   - **Project URL** → será `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2) Crear la tabla de datos

1. En Supabase, abrí **SQL Editor → New query**.
2. Pegá el contenido de [`supabase/schema.sql`](./supabase/schema.sql) y tocá **Run**.
   Esto crea la tabla `workspaces` con seguridad por fila (cada usuario ve solo lo suyo).

## 3) Configurar el registro por email

1. En Supabase → **Authentication → Providers → Email**: dejalo **habilitado**.
2. **Authentication → URL Configuration**:
   - *Site URL*: `https://TU-DOMINIO` (tu dominio de Vercel).
   - *Redirect URLs*: agregá `https://TU-DOMINIO/auth/callback`.
3. (Opcional pero recomendado) Para que los emails de confirmación salgan con tu marca,
   configurá **Authentication → Emails → SMTP** con Resend (ver sección Resend).

## 4) (Opcional) Login con Google

1. En **Google Cloud Console** creá credenciales OAuth 2.0 (tipo *Web*).
   - *Authorized redirect URI*: `https://<TU-PROYECTO>.supabase.co/auth/v1/callback`
     (lo ves en Supabase → Authentication → Providers → Google).
2. En Supabase → **Authentication → Providers → Google**: pegá el *Client ID* y *Client Secret* y activá.

## 5) Resend (emails)

1. Entrá a **https://resend.com** y creá una cuenta.
2. **Verificá tu dominio** en https://resend.com/domains (agregás unos registros DNS).
3. Creá una **API Key** en https://resend.com/api-keys → será `RESEND_API_KEY`.
4. Definí el remitente `RESEND_FROM`, por ej: `Clientany <hola@tudominio.com>`.
5. (Opcional) Para los emails de Supabase: Authentication → Emails → SMTP →
   host `smtp.resend.com`, puerto `465`, usuario `resend`, contraseña = tu API Key.

## 6) Cargar las variables en Vercel

En tu proyecto de Vercel → **Settings → Environment Variables**, agregá:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `RESEND_API_KEY` | tu API key de Resend |
| `RESEND_FROM` | `Clientany <hola@tudominio.com>` |
| `NEXT_PUBLIC_APP_URL` | `https://TU-DOMINIO` |

Después tocá **Redeploy**. ¡Listo! La app ahora pide **registro/login** y guarda todo en la nube.

> Para probar en tu compu, copiá `.env.example` como `.env.local` y completá los mismos valores.

---

## ¿Cómo sé si quedó activado?

- Si entrás a `/panel` **sin sesión**, te redirige a `/login` → cuentas reales activas ✅
- Si `/login` muestra “Modo demo activo” → todavía faltan las variables de Supabase.

## Qué queda para más adelante (no bloquea el lanzamiento)

- **OAuth real de cada canal** (Mercado Libre, Tienda Nube, WhatsApp/Meta): los endpoints
  `/api/oauth/*` y `/api/webhooks/*` que figuran en los tutoriales de Configuración.
- **Cobros de suscripción** (Mercado Pago / Stripe) si vas a monetizar.
- Normalizar el workspace JSON en tablas por entidad cuando escale.
