# Clientany — el CRM multicanal para empresas que venden por chat

**Todas tus tiendas. Todos tus chats. Una sola bandeja.**

Clientany es un CRM multiempresa para empresas de LATAM que venden por chat. Cada empresa
conecta **su** WhatsApp Business (Cloud API oficial de Meta), **su** Instagram y **su** Messenger,
carga su historial de pedidos y su stock (a mano, por CSV o por API), arma respuestas automáticas
con candados para no molestar, y atiende todo desde una sola bandeja con su equipo.

- **Bandeja por grupos**: Ventas · Soporte · Más adelante · Resueltos · Baja, con filtros por canal y por marca.
- **Chat completo**: ventana de 24 hs de WhatsApp, plantillas, respuestas rápidas, archivos, notas internas, «Lo tomo yo».
- **Ficha del cliente** con sus pedidos, el envío y el seguimiento al lado del chat.
- **Respuestas automáticas**: bienvenida, fuera de horario, menú, reglas, stock, estado del pedido y «pasar a una persona».
- **IA** que sugiere la respuesta con los datos de la empresa (no inventa).
- **Equipo**: roles, invitaciones, asignación, chat interno y presencia.
- **API pública** con clave, **webhook saliente** e importación/exportación **CSV**.
- **Modo celular** (PWA instalable) y **multimarca**.

La fuente de verdad del diseño (modos, contrato REST, webhook de Meta, API pública, reglas de
negocio, textos de pantalla) es **[`docs/CRM.md`](./docs/CRM.md)**.

> Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · zustand · lucide-react ·
> Supabase (Postgres + Auth + Storage) · Resend · Vercel.

---

## Dos modos, un solo código

| | Modo demo | Modo nube |
|---|---|---|
| Cuándo | No hay `NEXT_PUBLIC_SUPABASE_URL` (o `NEXT_PUBLIC_CLIENTANY_MODO=demo`) | Supabase configurado (o `NEXT_PUBLIC_CLIENTANY_MODO=nube`) |
| Dónde viven los datos | `localStorage` del navegador | Postgres de Supabase (tablas `crm_*`), vía `/api/crm/*` |
| Quién corre el bot | El navegador, en el simulador | El servidor, en el webhook de Meta |
| Mensajes reales | No salen (se marcan «enviado (demo)») | Salen por la Graph API con las credenciales de cada empresa |
| Para qué sirve | Que cualquiera pruebe todo desde la landing, sin registrarse | El producto de verdad |

**Modo nube de desarrollo** (sin Supabase): `CLIENTANY_DB=memory` +
`NEXT_PUBLIC_CLIENTANY_MODO=nube` + `CLIENTANY_DEV_USER=dev@clientany.com`. El servidor guarda en
`.clientany-dev/db.json` y el usuario es fijo. Sirve para `next dev`, para la suite de API y para
Playwright.

---

## Cómo correrlo

```bash
npm install
npm run dev          # http://localhost:3000  (modo demo si no hay variables)
```

Modo nube en memoria, sin Supabase:

```bash
CLIENTANY_DB=memory NEXT_PUBLIC_CLIENTANY_MODO=nube CLIENTANY_DEV_USER=dev@clientany.com npm run dev
```

Build de producción:

```bash
npm run build
npm run start
```

---

## Variables de entorno

Copiá `.env.example` como `.env.local`. Sin ninguna variable, la app corre en modo demo.

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase (activa el modo nube y el login) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública de Supabase (sólo auth en el navegador) |
| `SUPABASE_SERVICE_ROLE_KEY` | El servidor escribe en las tablas `crm_*` y en el bucket `crm-media` |
| `CLIENTANY_SECRET` | Clave de cifrado (AES-256-GCM) de los tokens de Meta y las claves de IA. Obligatoria en nube |
| `ANTHROPIC_API_KEY` | IA de la plataforma (sugerencias de respuesta) |
| `CLIENTANY_IA_MODELO` | Modelo de IA (de fábrica `claude-opus-5-5`) |
| `CLIENTANY_DB` | `memory` para desarrollo y tests |
| `CLIENTANY_DEV_USER` | Mail del usuario fijo en memoria |
| `NEXT_PUBLIC_CLIENTANY_MODO` | `nube` o `demo` para forzar el modo en el navegador |
| `NEXT_PUBLIC_APP_URL` | URL pública (links de mails, URL del webhook que muestra Conexiones, Open Graph) |
| `RESEND_API_KEY` | Emails transaccionales (bienvenida, avisos, leads) |
| `RESEND_FROM` | Remitente verificado, ej. `Clientany <hola@clientany.com>` |
| `LEAD_EMAIL` | A dónde llegan los contactos del formulario de la landing (de fábrica `hola@clientany.com`) |
| `LEAD_WEBHOOK_URL` | Opcional: además del mail, cada contacto se POSTea acá (Slack, Discord con `/slack`, Make, Zapier) |

---

## Estructura

```
app/
  page.tsx                  Landing (pública)
  docs/                     Tutoriales: WhatsApp, Instagram, Messenger, automáticas, CSV, API (pública)
  privacidad/, terminos/    Política de privacidad y términos (públicas)
  track/                    «Seguí tu envío» para los clientes finales (pública)
  (auth)/login, registro    Ingreso y registro
  (app)/                    La app, con sidebar: panel, inbox, clientes, pedidos, stock,
                            automaticas, plantillas, embudo, tracking, carritos, campanas,
                            difusion, mercadolibre, marcas, conexiones, equipo, ajustes
  api/crm/**                API interna (sesión por cookie)
  api/v1/**                 API pública (clave X-API-Key)
  api/webhooks/meta/[empresaId]   Webhook de Meta (WhatsApp, Instagram, Messenger)
  api/lead                  Formulario «Quiero que me contacten» de la landing
components/
  crm/                      UI del CRM: ui.tsx (modales, avisos, tablas), bandeja/, pantallas/
  landing/                  Piezas de la landing, Docs, Privacidad y Términos
  Sidebar, Topbar, MobileNav, AppFrame
lib/
  crm/                      El CRM
    types.ts                Contrato de tipos (frontend, repos, servidor)
    core.ts                 Lógica pura: bandeja, ventana de 24 hs, teléfonos, horario
    bot.ts                  Motor de respuestas automáticas (puro)
    csv.ts                  Importar / exportar CSV
    repo.ts                 Store `useCrm` + interfaz `CrmRepo`
    index.tsx, hooks.ts     Arranque (elige demo o nube) y hooks de lectura
    repo-local.ts           Modo demo (localStorage)
    repo-nube.ts            Modo nube (fetch a /api/crm)
    demo.ts, metricas.ts    Datos de ejemplo y métricas
    server/                 Base (memoria / Supabase), cifrado, auth, Graph API, casos de uso, IA, claves
  supabase/                 Clientes de Supabase y el middleware de sesión
  nav.ts                    El menú de la app
supabase/crm_schema.sql     Esquema de las tablas crm_* (correr en el SQL Editor)
tests/                      Suites de prueba
docs/CRM.md                 Diseño y contrato del CRM
```

---

## Cómo probar

```bash
npx tsc --noEmit                # tipos
node tests/crm-core.spec.mjs    # lógica pura: bandeja, bot, CSV, teléfonos
node tests/crm-api.spec.mjs     # API en modo memoria contra next dev (webhook, bot, API pública…)
node tests/crm-ui.cjs           # Playwright: cada pantalla, escritorio y celular, demo y nube
npm run build
```

`tests/crm-ui.cjs` levanta la app sola (demo en el puerto 3100, nube en memoria en el 3101).
`SOLO=demo` o `SOLO=nube` corre un solo modo; `CAPTURAS=1` guarda capturas en `qa/`.

---

## Deploy

Vercel, desde la rama **`main`** del repo **`farugroup/Clientany.com`** → **www.clientany.com**.
Cada push a `main` se publica solo.

1. Cargá las variables de entorno de arriba en Vercel → Settings → Environment Variables
   (en producción, como mínimo: las de Supabase, `SUPABASE_SERVICE_ROLE_KEY`, `CLIENTANY_SECRET`
   y `NEXT_PUBLIC_APP_URL=https://www.clientany.com`).
2. En Supabase → SQL Editor, corré [`supabase/crm_schema.sql`](./supabase/crm_schema.sql)
   (se puede correr más de una vez).
3. En Supabase → Authentication → URL Configuration, agregá `https://www.clientany.com/auth/callback`
   como Redirect URL. Más detalle en [`SUPABASE.md`](./SUPABASE.md).
4. Cada empresa conecta sus canales desde **Conexiones**; el paso a paso para Meta está en
   [`/docs`](https://www.clientany.com/docs).
