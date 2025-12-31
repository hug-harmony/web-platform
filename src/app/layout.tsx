// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
// import { ThemeProvider } from "next-themes";

const manrope = Manrope({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hug Harmony",
  description:
    "Connect with cuddlers, book appointments, and enjoy meaningful interactions",
  applicationName: "HugHarmony",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HugHarmony",
  },
  formatDetection: { telephone: false },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#ffffff",
    "msapplication-tap-highlight": "no",
    "theme-color": "#ffffff",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/hh-icon.png" />
        <meta name="theme-color" content="#ffffff" />
        {/* Add viewport meta tag to disable zoom */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
      </head>
      <body className={`${manrope.className} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
