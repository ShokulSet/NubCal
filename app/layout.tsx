import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk, DM_Mono } from "next/font/google";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

const mono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dmmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NubCal — nutrition journal",
  description: "Track macros and custom nutrients against your own targets.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "NubCal", statusBarStyle: "default" },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1f6b43",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
