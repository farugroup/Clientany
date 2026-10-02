import type { Metadata, Viewport } from "next";
import "./globals.css";

// URL pública para armar los links absolutos de Open Graph. Si la variable
// viene mal escrita (sin https://), no se cae la app: usa la de producción.
function urlDelSitio(): URL {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || "https://www.clientany.com");
  } catch {
    return new URL("https://www.clientany.com");
  }
}
const TITULO = "Clientany — El CRM multicanal para empresas que venden por chat";
const DESCRIPCION =
  "Conectá tu WhatsApp Business API, tu Instagram y tu Messenger y atendé todo desde una sola bandeja con tu equipo. Pedidos y stock en el chat, respuestas automáticas que no molestan e IA que sugiere qué contestar.";

export const metadata: Metadata = {
  metadataBase: urlDelSitio(),
  title: TITULO,
  description: DESCRIPCION,
  manifest: "/manifest.json",
  applicationName: "Clientany",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Clientany",
  },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Clientany",
    title: TITULO,
    description: DESCRIPCION,
    url: "/",
  },
  twitter: {
    card: "summary",
    title: TITULO,
    description: DESCRIPCION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0d1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "Inter, system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
