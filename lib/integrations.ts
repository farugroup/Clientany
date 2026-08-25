import type { IntegrationKey } from "./types";

export interface IntegrationField {
  name: string;
  label: string;
  placeholder: string;
  secret?: boolean;
  help?: string;
}

export interface IntegrationStep {
  text: string;
  url?: string; // link directo al lugar exacto del paso
  urlLabel?: string;
}

export interface PortalLink {
  label: string;
  url: string;
}

// URL que el usuario debe pegar EN la plataforma (se completa con su dominio).
export interface CallbackUrl {
  label: string;
  path: string; // se antepone el dominio de la app, ej: /api/oauth/mercadolibre
  hint?: string;
}

export interface IntegrationDef {
  key: IntegrationKey;
  name: string;
  logo: string;
  color: string;
  category: "mensajeria" | "marketplace" | "tienda" | "email";
  summary: string;
  liveNow: boolean;
  docsUrl: string;
  portalLinks: PortalLink[];
  steps: IntegrationStep[];
  callbacks: CallbackUrl[];
  fields: IntegrationField[];
  approvalNote?: string;
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
    portalLinks: [
      { label: "Meta for Developers (crear app)", url: "https://developers.facebook.com/apps" },
      { label: "Guía oficial WhatsApp Cloud API", url: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" },
      { label: "Meta Business Suite", url: "https://business.facebook.com" },
    ],
    steps: [
      { text: "Entrá a Meta for Developers y creá una app de tipo “Empresa”.", url: "https://developers.facebook.com/apps", urlLabel: "Abrir Meta for Developers" },
      { text: "Agregá el producto “WhatsApp” a tu app y seleccioná tu cuenta de Meta Business." },
      { text: "En WhatsApp → Configuración de la API, copiá el Phone Number ID y el WhatsApp Business Account ID." },
      { text: "Generá un token permanente (System User Token) con permisos whatsapp_business_messaging." },
      { text: "En Configuración → Webhooks, pegá la URL de webhook y el token de verificación que ves más abajo, y suscribí el campo “messages”." },
      { text: "Verificá tu número y pedí el acceso a producción para escribirle a cualquier cliente." },
    ],
    callbacks: [
      { label: "URL de Webhook", path: "/api/webhooks/whatsapp", hint: "Pegala en Meta → WhatsApp → Configuración → Webhooks" },
    ],
    fields: [
      { name: "phoneNumberId", label: "Phone Number ID", placeholder: "1093xxxxxxxxx" },
      { name: "wabaId", label: "WhatsApp Business Account ID", placeholder: "1057xxxxxxxxx" },
      { name: "token", label: "Token permanente", placeholder: "EAAG...", secret: true },
      { name: "verifyToken", label: "Token de verificación del webhook", placeholder: "un-texto-secreto-que-elijas" },
      { name: "displayNumber", label: "Número visible", placeholder: "+54 9 11 5555-1234" },
    ],
    approvalNote:
      "WhatsApp Cloud API requiere una cuenta de Meta Business verificada. La verificación de la empresa puede tardar de 1 a 3 días hábiles.",
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
    portalLinks: [
      { label: "Meta for Developers (crear app)", url: "https://developers.facebook.com/apps" },
      { label: "Guía Instagram Messaging", url: "https://developers.facebook.com/docs/messenger-platform/instagram" },
      { label: "Convertir tu IG en cuenta profesional", url: "https://help.instagram.com/502981923235522" },
    ],
    steps: [
      { text: "Pasá tu cuenta de Instagram a “Profesional” y vinculala a una página de Facebook." },
      { text: "Creá una app en Meta for Developers y agregá los productos “Messenger” e “Instagram”.", url: "https://developers.facebook.com/apps", urlLabel: "Abrir Meta for Developers" },
      { text: "Pedí los permisos instagram_manage_messages y pages_messaging." },
      { text: "Generá el Page Access Token de tu página y copialo." },
      { text: "En Webhooks, pegá la URL de abajo y suscribí messages y messaging_postbacks." },
    ],
    callbacks: [
      { label: "URL de Webhook", path: "/api/webhooks/meta", hint: "Pegala en Meta → Webhooks" },
    ],
    fields: [
      { name: "pageId", label: "Page ID", placeholder: "1029xxxxxxxxx" },
      { name: "igUserId", label: "Instagram User ID", placeholder: "1784xxxxxxxxx" },
      { name: "pageToken", label: "Page Access Token", placeholder: "EAAG...", secret: true },
      { name: "verifyToken", label: "Token de verificación del webhook", placeholder: "un-texto-secreto-que-elijas" },
    ],
    approvalNote:
      "Instagram y Messenger requieren la revisión de la app por parte de Meta (App Review) para operar con clientes reales.",
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
    portalLinks: [
      { label: "DevCenter — Crear aplicación", url: "https://developers.mercadolibre.com.ar/devcenter/create-app" },
      { label: "Mis aplicaciones", url: "https://developers.mercadolibre.com.ar/devcenter" },
      { label: "Guía de autenticación y autorización", url: "https://developers.mercadolibre.com.ar/es_ar/autenticacion-y-autorizacion" },
    ],
    steps: [
      { text: "Ingresá al DevCenter de Mercado Libre con tu cuenta de vendedor y creá una aplicación.", url: "https://developers.mercadolibre.com.ar/devcenter/create-app", urlLabel: "Crear aplicación en ML" },
      { text: "En “Redirect URI”, pegá la URL de callback que ves más abajo." },
      { text: "En “Notificaciones (Topics)”, pegá la URL de notificaciones y suscribí questions y messages." },
      { text: "Copiá el App ID (Client ID) y el Secret Key y pegalos acá." },
      { text: "Guardá: te redirigimos a Mercado Libre para autorizar y guardamos el token de tu cuenta." },
    ],
    callbacks: [
      { label: "Redirect URI", path: "/api/oauth/mercadolibre", hint: "Pegala en tu app de ML → Redirect URI" },
      { label: "URL de notificaciones (callback)", path: "/api/webhooks/mercadolibre", hint: "Pegala en tu app de ML → Notificaciones" },
    ],
    fields: [
      { name: "clientId", label: "App ID (Client ID)", placeholder: "1234567890123456" },
      { name: "clientSecret", label: "Secret Key", placeholder: "xxxxxxxxxxxxxxxx", secret: true },
      { name: "nickname", label: "Usuario de ML", placeholder: "MI_TIENDA_OFICIAL" },
    ],
    approvalNote:
      "La app de Mercado Libre queda operativa apenas autorizás tu cuenta. No requiere aprobación previa, pero sí completar el flujo OAuth.",
  },
  {
    key: "tiendanube",
    name: "Tienda Nube",
    logo: "🛍️",
    color: "#2C6EF2",
    category: "tienda",
    summary: "Sincroniza pedidos y carritos, e identifica al cliente por su celular con su historial.",
    liveNow: true,
    docsUrl: "https://tiendanube.github.io/api-documentation/authentication",
    portalLinks: [
      { label: "Portal de Partners (crear app)", url: "https://partners.tiendanube.com/" },
      { label: "Documentación de la API", url: "https://tiendanube.github.io/api-documentation/authentication" },
      { label: "Panel de tu tienda", url: "https://www.tiendanube.com/login" },
    ],
    steps: [
      { text: "Entrá al Portal de Partners de Tienda Nube y creá una aplicación.", url: "https://partners.tiendanube.com/", urlLabel: "Abrir Partners" },
      { text: "En la configuración de la app, pegá la URL de redirección que ves más abajo." },
      { text: "Copiá el Client ID y Client Secret de tu app." },
      { text: "Instalá la app en tu tienda y autorizá los permisos de lectura de pedidos y clientes." },
      { text: "Al autorizar obtenés el Store ID y el Access Token: pegalos acá para sincronizar." },
    ],
    callbacks: [
      { label: "URL de redirección (redirect URI)", path: "/api/oauth/tiendanube", hint: "Pegala en tu app de Tienda Nube" },
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
    docsUrl: "https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin",
    portalLinks: [
      { label: "Admin de Shopify", url: "https://admin.shopify.com" },
      { label: "Guía: crear app personalizada", url: "https://help.shopify.com/en/manual/apps/app-types/custom-apps" },
    ],
    steps: [
      { text: "En tu Admin de Shopify entrá a Configuración → Apps y canales de venta → Desarrollar apps.", url: "https://admin.shopify.com", urlLabel: "Abrir Admin de Shopify" },
      { text: "Creá una app personalizada y otorgale permisos de lectura de orders y checkouts." },
      { text: "Instalá la app y revelá/copiá el Admin API access token." },
      { text: "Pegá tu dominio myshopify y el token acá." },
    ],
    callbacks: [
      { label: "URL de Webhook (opcional)", path: "/api/webhooks/shopify", hint: "Para eventos en tiempo real de pedidos/carritos" },
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
    docsUrl: "https://help.vtex.com/es/tutorial/application-keys--2iffYzlvvz4BDMr6WGUtet",
    portalLinks: [
      { label: "Guía: generar Application Keys", url: "https://help.vtex.com/es/tutorial/application-keys--2iffYzlvvz4BDMr6WGUtet" },
      { label: "Admin de VTEX", url: "https://vtex.com" },
    ],
    steps: [
      { text: "En el Admin de VTEX entrá a Configuración de la cuenta → Claves de aplicación." },
      { text: "Generá una App Key y App Token, y asignale el rol de lectura de órdenes.", url: "https://help.vtex.com/es/tutorial/application-keys--2iffYzlvvz4BDMr6WGUtet", urlLabel: "Ver guía oficial" },
      { text: "Pegá tu Account Name (el nombre de tu cuenta VTEX) y las credenciales acá." },
    ],
    callbacks: [],
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
    portalLinks: [{ label: "Sitio de Vendany", url: "https://vendany.com" }],
    steps: [
      { text: "Ingresá al panel de Vendany y entrá a Configuración → Integraciones / API." },
      { text: "Solicitá o generá tu API Token (si no lo ves, pedilo al soporte de Vendany)." },
      { text: "Pegá el identificador de tu tienda y el token acá." },
    ],
    callbacks: [],
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
    docsUrl: "https://resend.com/docs/introduction",
    portalLinks: [
      { label: "Resend — API Keys", url: "https://resend.com/api-keys" },
      { label: "Resend — Verificar dominio", url: "https://resend.com/domains" },
      { label: "SendGrid — API Keys", url: "https://app.sendgrid.com/settings/api_keys" },
    ],
    steps: [
      { text: "Elegí un proveedor de envío (Resend, SendGrid o Amazon SES)." },
      { text: "Verificá tu dominio en el proveedor para mejorar la entregabilidad.", url: "https://resend.com/domains", urlLabel: "Verificar dominio en Resend" },
      { text: "Creá una API Key y pegala acá junto con tu remitente.", url: "https://resend.com/api-keys", urlLabel: "Crear API Key" },
    ],
    callbacks: [],
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
