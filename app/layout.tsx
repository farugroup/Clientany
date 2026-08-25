import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clientany — CRM multicanal para ecommerce",
  description:
    "El CRM multicanal para ecommerces de LATAM. Conectá WhatsApp, Instagram, Mercado Libre y tu tienda. Bandeja unificada, seguimiento de envíos, recuperador de carritos y campañas de email + WhatsApp.",
  manifest: "/manifest.json",
  applicationName: "Clientany",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Clientany",
  },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
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
