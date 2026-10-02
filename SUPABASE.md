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

## CRM multiempresa (bandeja, pedidos, stock, bot, API)

El CRM guarda todo en tablas propias (`crm_*`) y en un bucket de archivos. Para activarlo:

1. **Correr el esquema.** En Supabase → **SQL Editor → New query**, pegá el contenido de
   [`supabase/crm_schema.sql`](./supabase/crm_schema.sql) y tocá **Run**. Se puede correr más de una
   vez (todo es `if not exists`). Crea las tablas `crm_empresas`, `crm_miembros`, `crm_canales`,
   `crm_contactos`, `crm_conversaciones`, `crm_mensajes`, `crm_pedidos`, `crm_productos`… y el bucket
   público `crm-media`.
2. **Cargar la service role key.** En Supabase → **Project Settings → API** copiá la **service_role key**
   y ponela en `SUPABASE_SERVICE_ROLE_KEY`. El servidor escribe con ella (saltea RLS); el navegador
   nunca la ve. Las tablas quedan con RLS prendido y sin políticas, así la anon key no lee nada.
3. **Generar la clave de cifrado.** Los tokens de Meta y las claves de IA de cada empresa se guardan
   cifrados con AES-256-GCM. Generá un secreto con:

   ```bash
   openssl rand -hex 32
   ```

   y ponelo en `CLIENTANY_SECRET`. Si lo cambiás después, las credenciales ya guardadas dejan de poder
   leerse (habrá que volver a conectar cada canal).
4. **(Opcional) IA de la plataforma.** `ANTHROPIC_API_KEY` habilita el copilot para todas las empresas.
   Si no la cargás, cada empresa puede poner la suya en **Configuración → IA**.
5. **Cargar las variables en Vercel** (`SUPABASE_SERVICE_ROLE_KEY`, `CLIENTANY_SECRET`,
   `ANTHROPIC_API_KEY`) y hacer **Redeploy**.

### ¿Cómo sé si quedó?

- Iniciá sesión y abrí `https://TU-DOMINIO/api/crm/estado`: tiene que devolver un JSON con tu
  `empresa` (se crea sola la primera vez) y `yo` con `rol: "admin"`. Si devuelve 401, no hay sesión;
  si devuelve 500 con «Base de datos», falta correr el esquema o la service role key está mal.
- En **Conexiones** vas a ver la URL del webhook de Meta (`/api/webhooks/meta/<id de tu empresa>`) y
  el token de verificación para pegar en la app de Meta.

### Desarrollo sin Supabase

Con `CLIENTANY_DB=memory`, `NEXT_PUBLIC_CLIENTANY_MODO=nube` y `CLIENTANY_DEV_USER=dev@clientany.com`
el servidor guarda todo en `.clientany-dev/db.json` y el usuario es fijo. Así corren `next dev`, la
suite `node tests/crm-api.spec.mjs` y Playwright.

## Qué queda para más adelante (no bloquea el lanzamiento)

- **OAuth real de cada canal** (Mercado Libre, Tienda Nube, WhatsApp/Meta): los endpoints
  `/api/oauth/*` y `/api/webhooks/*` que figuran en los tutoriales de Configuración.
- **Cobros de suscripción** (Mercado Pago / Stripe) si vas a monetizar.
- Normalizar el workspace JSON en tablas por entidad cuando escale.
