import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Inter({
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
  metadataBase: new URL("https://cocokerja.vercel.app"),
  title: {
    default: "CocoKerja — Job Alert & Asisten Karier AI Fresh Graduate Indonesia",
    template: "%s | CocoKerja",
  },
  description:
    "Kurasi lowongan kerja fresh graduate terverifikasi anti-scam di Telegram. Dilengkapi analisis skill gap, persentase kecocokan profil riil, dan fitur penyesuaian CV anti-halusinasi.",
  keywords: [
    "loker fresh graduate",
    "lowongan kerja indonesia",
    "asisten karier ai",
    "bot telegram loker",
    "job alert telegram",
    "cek cv ats",
    "skill gap analysis",
    "loker remote indonesia",
    "karirhub bumn",
  ],
  authors: [{ name: "CocoKerja Team", url: "https://cocokerja.vercel.app" }],
  creator: "CocoKerja",
  publisher: "CocoKerja",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.ico",
    shortcut: "/icon.ico",
    apple: "/icon-192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CocoKerja",
  },
  openGraph: {
    title: "CocoKerja — Asisten Karier & Job Alert AI Fresh Graduate",
    description:
      "Dapatkan rekomendasi loker terkurasi, deteksi scam, dan analisis skill gap transparan langsung di Telegram.",
    url: "https://cocokerja.vercel.app",
    siteName: "CocoKerja",
    images: [
      {
        url: "/hero-human.jpg",
        width: 1200,
        height: 630,
        alt: "CocoKerja — Asisten Karier & Job Alert Telegram Fresh Graduate",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CocoKerja — Job Alert & Career Copilot AI Fresh Graduate",
    description:
      "Kurasi lowongan resmi terverifikasi anti-scam dengan scoring transparan di Telegram.",
    images: ["/hero-human.jpg"],
    creator: "@cocokerja",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebApplication",
                  name: "CocoKerja",
                  url: "https://cocokerja.vercel.app",
                  applicationCategory: "BusinessApplication",
                  operatingSystem: "Telegram, Web, Android, iOS",
                  offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "IDR",
                  },
                  description:
                    "Asisten karier AI & job alert Telegram untuk fresh graduate Indonesia dengan scoring relevansi transparan dan deteksi scam.",
                },
                {
                  "@type": "FAQPage",
                  mainEntity: [
                    {
                      "@type": "Question",
                      name: "Apakah layanan CocoKerja gratis?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Ya! Setiap pengguna fresh graduate mendapatkan kuota gratis 3 job alert terkurasi per minggu, akses konsultasi AI Copilot, dan fitur on-demand job check tanpa dipungut biaya pendaftaran apapun.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Apakah saya harus menginstal aplikasi baru?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Tidak perlu. Seluruh interaksi, upload CV, penerimaan alert, dan konsultasi karier dilakukan langsung di dalam aplikasi Telegram melalui bot resmi @cocokerja_bot.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Kapan waktu pengiriman notifikasi lowongan?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "CocoKerja secara otomatis memindai lowongan dan mengirimkan kurasi terbaik setiap hari kerja pada pukul 08:00 WIB jika ada lowongan yang mencapai ambang kecocokan dengan profilmu.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Bagaimana cara menghapus data saya jika sudah dapat kerja?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Cukup ketik perintah /hapus di Telegram, dan seluruh data profil serta teks CV kamu akan langsung dimusnahkan secara permanen dari database kami sesuai regulasi UU PDP.",
                      },
                    },
                  ],
                },
              ],
            }),
          }}
        />
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
