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
  openGraph: {
    title: "CocoKerja — Asisten Karier Fresh Graduate",
    description: "Job alert terkurasi via Telegram dengan analisis skill gap berbasis profil riil.",
    locale: "id_ID",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#090A0F",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
