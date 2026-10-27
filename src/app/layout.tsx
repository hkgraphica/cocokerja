import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "CocoKerja — Job Alert & Career Copilot di Telegram",
  description:
    "Pantau lowongan kerja relevan sesuai keahlian CV kamu. Lengkap dengan persentase kecocokan, analisis skill gap, dan peringatan lowongan mencurigakan.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CocoKerja",
  },
  openGraph: {
    title: "CocoKerja — Asisten Karier Fresh Graduate",
    description: "Job alert terkurasi via Telegram dengan analisis skill gap berbasis profil riil.",
    locale: "id_ID",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#090A0F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${sans.variable} ${mono.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW reg error: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
