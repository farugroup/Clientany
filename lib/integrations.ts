import type { IntegrationKey } from "./types";

export interface IntegrationField {
  name: string;
  label: string;
  placeholder: string;
  secret?: boolean;
  help?: string;
}

export interface IntegrationDef {
  key: IntegrationKey;
  name: string;
  logo: string; // emoji
  color: string;
  category: "mensajeria" | "marketplace" | "tienda" | "email";
  summary: string;
  liveNow: boolean; // se puede usar mañana sin aprobaciones externas
  docsUrl: string;
  steps: string[];
  fields: IntegrationField[];
}

export const integrationDefs: IntegrationDef[] = [
  {
    key: "whatsapp",
    name: "WhatsApp Business (Cloud API)",
    logo: "💬",
    color: "#25D366",
    category: "mensajeria",
    summary: "Recibí y respondé mensajes de WhatsApp desde la bandeja unificada.",
    liveNow: false,
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started",
    steps: [
      "Creá una app en Meta for Developers y agregá el producto WhatsApp.",
      "Copiá el Phone Number ID y generá un token permanente.",
      "Configurá el webhook apuntando a https://TU-DOMINIO/api/webhooks/whatsapp.",
      "Verificá tu número y salí del modo sandbox para escribir a cualquier cliente.",
    ],
    fields: [
      { name: "phoneNumberId", label: "Phone Number ID", placeholder: "1093xxxxxxxxx" },
      { name: "wabaId", label: "WhatsApp Business Account ID", placeholder: "1057xxxxxxxxx" },
      { name: "token", label: "Token permanente", placeholder: "EAAG...", secret: true },
      { name: "displayNumber", label: "Número visible", placeholder: "+54 9 11 5555-1234" },
    ],
  },
  {
    key: "meta",
    name: "Instagram & Messenger (Meta)",
    logo: "📸",
    color: "#E1306C",
    category: "mensajeria",
    summary: "Contestá DMs y comentarios de Instagram y Messenger.",
    liveNow: false,
    docsUrl: "https://developers.facebook.com/docs/messenger-platform/instagram",
    steps: [
      "Conectá tu cuenta de Instagram profesional a una página de Facebook.",
      "Creá una app de Meta con los permisos instagram_manage_messages y pages_messaging.",
      "Autorizá la página y pegá el Page Access Token.",
      "Suscribí el webhook de mensajes.",
    ],
    fields: [
      { name: "pageId", label: "Page ID", placeholder: "1029xxxxxxxxx" },
      { name: "igUserId", label: "Instagram User ID", placeholder: "1784xxxxxxxxx" },
      { name: "pageToken", label: "Page Access Token", placeholder: "EAAG...", secret: true },
    ],
  },
  {
    key: "mercadolibre",
    name: "Mercado Libre",
    logo: "🛒",
    color: "#FFE600",
    category: "marketplace",
    summary: "Respondé preguntas y mensajes, y activá el lead magnet.",
    liveNow: false,
    docsUrl: "https://developers.mercadolibre.com.ar/es_ar/autenticacion-y-autorizacion",
    steps: [
      "Creá tu aplicación en developers.mercadolibre.com.ar.",
      "Configurá la redirect URI a https://TU-DOMINIO/api/oauth/mercadolibre.",
      "Pegá el App ID (Client ID) y el Secret Key.",
      "Autorizá y guardamos el token de tu cuenta.",
    ],
    fields: [
      { name: "clientId", label: "App ID (Client ID)", placeholder: "1234567890123456" },
      { name: "clientSecret", label: "Secret Key", placeholder: "xxxxxxxxxxxxxxxx", secret: true },
      { name: "nickname", label: "Usuario de ML", placeholder: "MI_TIENDA_OFICIAL" },
    ],
  },
  {
    key: "tiendanube",
    name: "Tienda Nube",
    logo: "🛍️",
    color: "#2C6EF2",
    category: "tienda",
    summary: "Sincroniza pedidos y carritos, e identifica al cliente por su celular con su historial de compras al escribir.",
    liveNow: true,
    docsUrl: "https://tiendanube.github.io/api-documentation/authentication",
    steps: [
      "Entrá al panel de Tienda Nube → Aplicaciones.",
      "Generá las credenciales de la API (App ID y token).",
      "Pegá el Store ID y el token acá.",
      "Sincronizamos pedidos y carritos. Al entrar un WhatsApp, detectamos por el número si es cliente y traemos su orden y cuánto gastó.",
    ],
    fields: [
      { name: "storeId", label: "Store ID", placeholder: "1234567" },
      { name: "accessToken", label: "Access Token", placeholder: "xxxxxxxxxxxxxxxx", secret: true },
    ],
  },
  {
    key: "shopify",
    name: "Shopify",
    logo: "🛒",
    color: "#95BF47",
    category: "tienda",
    summary: "Conectá tu tienda Shopify para pedidos y checkouts abandonados.",
    liveNow: true,
    docsUrl: "https://shopify.dev/docs/apps/auth/admin-app-access-tokens",
    steps: [
      "En tu admin de Shopify creá una app personalizada.",
      "Otorgá permisos de lectura de pedidos y checkouts.",
      "Instalá la app y copiá el Admin API access token.",
      "Pegá tu dominio myshopify y el token.",
    ],
    fields: [
      { name: "shopDomain", label: "Dominio de la tienda", placeholder: "mitienda.myshopify.com" },
      { name: "accessToken", label: "Admin API access token", placeholder: "shpat_xxxxxxxx", secret: true },
    ],
  },
  {
    key: "vtex",
    name: "VTEX",
    logo: "🏬",
    color: "#F71963",
    category: "tienda",
    summary: "Integrá tu cuenta VTEX para órdenes y carritos.",
    liveNow: true,
    docsUrl: "https://developers.vtex.com/docs/guides/authentication",
    steps: [
      "En VTEX generá una App Key y App Token.",
      "Otorgá los roles de lectura de órdenes.",
      "Pegá tu Account Name y las credenciales.",
    ],
    fields: [
      { name: "accountName", label: "Account Name", placeholder: "mitienda" },
      { name: "appKey", label: "App Key", placeholder: "vtexappkey-..." },
      { name: "appToken", label: "App Token", placeholder: "xxxxxxxx", secret: true },
    ],
  },
  {
    key: "vendany",
    name: "Vendany",
    logo: "🏪",
    color: "#7C3AED",
    category: "tienda",
    summary: "Conectá tu tienda Vendany para pedidos y recuperación de carritos.",
    liveNow: true,
    docsUrl: "https://vendany.com",
    steps: [
      "Pedí tu API token al panel de Vendany.",
      "Pegá el identificador de tienda y el token.",
    ],
    fields: [
      { name: "storeId", label: "ID de tienda", placeholder: "mitienda" },
      { name: "apiToken", label: "API Token", placeholder: "xxxxxxxx", secret: true },
    ],
  },
  {
    key: "email",
    name: "Email marketing (SMTP / API)",
    logo: "✉️",
    color: "#EA8B00",
    category: "email",
    summary: "Enviá campañas y automatizaciones de email a tu base.",
    liveNow: true,
    docsUrl: "https://resend.com/docs",
    steps: [
      "Elegí un proveedor de envío (Resend, SendGrid, Amazon SES…).",
      "Verificá tu dominio para mejorar la entregabilidad.",
      "Pegá la API key y el remitente.",
    ],
    fields: [
      { name: "provider", label: "Proveedor", placeholder: "Resend / SendGrid / SES" },
      { name: "apiKey", label: "API Key", placeholder: "re_xxxxxxxx", secret: true },
      { name: "fromEmail", label: "Remitente", placeholder: "hola@tumarca.com" },
    ],
  },
];

export function integrationByKey(key: IntegrationKey) {
  return integrationDefs.find((i) => i.key === key);
}
