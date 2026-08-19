import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { AmbientBackground } from "@/components/ambient-background";
import { AuthRefresh } from "@/components/auth-refresh";
import { ThemeProvider } from "@/components/theme-provider";
import { getAppUrl } from "@/lib/app-url";
import { cn } from "@/lib/utils";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const appUrl = getAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "SentryReport",
    template: "%s · SentryReport",
  },
  description: "Guided incident reporting for security teams.",
  applicationName: "SentryReport",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "SentryReport",
    description: "Guided incident reporting for security teams.",
    url: appUrl,
    siteName: "SentryReport",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SentryReport",
    description: "Guided incident reporting for security teams.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          inter.variable,
          inter.className,
          "min-h-dvh bg-background font-sans text-foreground antialiased"
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AmbientBackground />
          <AuthRefresh />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
