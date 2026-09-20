import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthGuard } from "@/components/guards/AuthGuard";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0b0e14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://crafthive.ru"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CraftHive",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  title: {
    default: "CraftHive — Мессенджер нового поколения",
    template: "%s | CraftHive",
  },
  description:
    "CraftHive — современный онлайн-мессенджер с поддержкой голосовых и видеозвонков, групповых комнат и мгновенного обмена сообщениями.",
  keywords: [
    "crafthive",
    "craft hive",
    "мессенджер",
    "видеозвонки",
    "голосовые звонки",
    "чаты",
    "онлайн общение",
    "web messenger",
  ],
  authors: [{ name: "CraftHive Team" }],
  creator: "CraftHive",
  publisher: "CraftHive",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "CraftHive — Мессенджер нового поколения",
    description:
      "Современный онлайн-мессенджер с поддержкой голосовых и видеозвонков, групповых комнат и мгновенного обмена сообщениями.",
    url: "https://crafthive.ru",
    siteName: "CraftHive",
    locale: "ru_RU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CraftHive — Мессенджер нового поколения",
    description:
      "Современный онлайн-мессенджер с поддержкой голосовых и видеозвонков, групповых комнат и мгновенного обмена сообщениями.",
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
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "CraftHive",
  url: "https://crafthive.ru",
  description:
    "Современный онлайн-мессенджер с поддержкой голосовых и видеозвонков, групповых комнат и мгновенного обмена сообщениями.",
  applicationCategory: "CommunicationApplication",
  operatingSystem: "All",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "RUB",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthGuard>
          <ToastContainer
            position="top-right" // Позиция уведомлений
            autoClose={3000} // Закроется через 3 сек
            theme="dark" // Тёмная тема (под твой интерфейс)
          />
          {children}
          <Script
            src="https://yastatic.net/s3/passport-sdk/autofill/v1/sdk-suggest-with-polyfills-latest.js"
            strategy="afterInteractive"
          />
        </AuthGuard>
      </body>
    </html>
  );
}

