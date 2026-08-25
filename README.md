# Clientany — CRM multicanal para ecommerce 🛒

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/farugroup/Clientany/tree/claude/crm-multicanal-ecommerce-o236ay&project-name=clientany&repository-name=clientany)

> 🚀 **¿Querés verlo online sin instalar nada?** Mirá la guía paso a paso en
> [`DEPLOY.md`](./DEPLOY.md) para publicarlo gratis en Vercel en ~5 minutos.


**Clientany** es el CRM multicanal pensado exclusivamente para **ecommerces de LATAM**.
Conectá **todas** las redes y canales donde están tus clientes hoy, unificá la atención en una
sola bandeja, seguí tus envíos, recuperá carritos abandonados, respondé Mercado Libre y hacé
campañas de email + WhatsApp marketing. Todo dividido por **marcas**, con cambio de contexto en
un clic.

> Hecho con Next.js 14 (App Router), React, TypeScript, Tailwind CSS y Recharts.
> Responsive de fábrica (PC + mobile) e instalable como PWA — base para las futuras apps
> oficiales de Android e iOS.

---

## ✨ Funcionalidades

### 1. Multicanal e ilimitado, organizado por marcas
- Sumá **tantos WhatsApp, Instagram, Messenger, TikTok y cuentas de Mercado Libre como quieras**.
- Cada canal y tienda queda agrupado por **marca**.
- **Selector de marca** en el panel para intercambiar de negocio al instante, o ver **todo junto**
  en la vista global.
- Canales soportados: WhatsApp, Instagram, Messenger, Mercado Libre, TikTok, Email, Web Chat.

### 2. Panel unificado (Dashboard)
- KPIs en vivo: mensajes sin responder, ventas del día, carritos por recuperar e ingresos por
  campañas.
- Gráficos de ventas + recuperación y de mensajes por canal.
- Actividad reciente de **todos los canales y marcas** en un solo lugar.

### 3. Bandeja unificada (Inbox)
- Todas las conversaciones de todos los canales y marcas en una sola pantalla.
- Filtros por canal, búsqueda, respuestas sugeridas por IA, y contexto de pedido dentro del chat.

### 4. Seguí tu envío 🚚
- Buscá cualquier pedido por **número de orden**, **nombre y apellido** o **email**.
- Línea de tiempo del envío **en tiempo real** con estado, correo y ubicación.
- **Respuesta automática** lista para enviar por WhatsApp/email + **link de seguimiento** propio.
- Página **pública** de seguimiento para tus clientes en `/track`.

### 5. Recuperador de carritos 🛒
- Nos conectamos a **Tienda Nube, Shopify, VTEX, Vendany, Mercado Shops y WooCommerce**.
- Detectamos las ventas perdidas y las convertimos con **flujos automáticos** por WhatsApp y email.
- Estado de cada carrito (nuevo, contactado, recuperado, perdido) y valor recuperado.

### 6. Mercado Libre + Lead Magnet 🧲
- Respondé **preguntas, mensajes y reclamos** de todas tus cuentas de ML desde Clientany.
- **Lead Magnet**: al concretar la venta, capturamos el **email y WhatsApp** del comprador a cambio
  de un incentivo (cupón, ebook, sorteo), y ese contacto entra directo a tu base.

### 7. Campañas de Email & WhatsApp 📣
- Con la base de leads (Mercado Libre, lead magnet, carritos, web) lanzá campañas segmentadas.
- Constructor de campaña en 3 pasos, métricas de apertura/clicks/ventas e ingresos generados.

### 8. Multiplataforma
- Diseño **responsive** optimizado para desktop y mobile (Android/iOS).
- **PWA** instalable (`manifest.json`), base para las apps nativas oficiales.

---

## 🚀 Cómo correrlo

```bash
npm install
npm run dev      # http://localhost:3000
```

Build de producción:

```bash
npm run build
npm run start
```

### Rutas principales
| Ruta | Descripción |
|------|-------------|
| `/` | Panel unificado |
| `/inbox` | Bandeja unificada multicanal |
| `/channels` | Conectar canales y tiendas (ilimitados) |
| `/mercadolibre` | Mercado Libre + Lead Magnet |
| `/tracking` | Seguí tu envío (interno) |
| `/carritos` | Recuperador de carritos |
| `/campanas` | Campañas Email & WhatsApp |
| `/marcas` | Gestión de marcas |
| `/track` | Página **pública** de seguimiento para clientes |

### API demo
- `GET /api/track?q=LUN-10428` — buscar pedido por orden/mail/nombre.
- `GET /api/carts?brandId=...` / `POST /api/carts` — carritos abandonados y recuperación.
- `GET /api/leads?source=mercadolibre` / `POST /api/leads` — base de leads y captura.

---

## 🏗️ Arquitectura

```
app/
  (app)/            # Shell con sidebar + páginas del CRM
    page.tsx        # Dashboard
    inbox/          # Bandeja unificada
    channels/       # Canales & tiendas
    tracking/       # Seguí tu envío (interno)
    carritos/       # Recuperador de carritos
    mercadolibre/   # ML + lead magnet
    campanas/       # Campañas
    marcas/         # Marcas
  track/            # Página pública de seguimiento
  api/              # Endpoints demo (track, carts, leads)
components/         # Sidebar, Topbar, BrandSwitcher, charts, UI, timeline
lib/                # types, mock-data, store (zustand), channels, format, nav
```

Los datos son **mock realistas de LATAM** (`lib/mock-data.ts`) para demostrar el producto
end-to-end. Las integraciones reales (WhatsApp Cloud API, Instagram/Messenger Graph API, Mercado
Libre API, Tienda Nube/Shopify/VTEX/Vendany) se enchufan en la capa `app/api/*` reemplazando el
mock por los clientes oficiales de cada plataforma.

---

## 🔌 Próximos pasos para producción
- OAuth y webhooks reales de cada canal (WhatsApp Cloud API, Meta Graph, ML, plataformas de tienda).
- Base de datos (Postgres) + colas para envíos de campañas y flujos de recuperación.
- Autenticación multiusuario y roles por marca.
- Apps nativas Android/iOS reutilizando esta PWA como base.
