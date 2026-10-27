import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const font = Outfit({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "CocoKerja — Asisten Karier AI untuk Fresh Graduate",
  description:
    "Dapatkan alert lowongan yang benar-benar cocok lewat Telegram, lengkap dengan skor kecocokan, skill gap, dan alasannya. Gratis untuk memulai.",
  openGraph: { title: "CocoKerja", description: "Alert lowongan cerdas untuk fresh graduate Indonesia.", locale: "id_ID", type: "website" },
};

export const viewport: Viewport = { themeColor: "#0b0b1a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={font.className}>{children}</body>
    </html>
  );
}
