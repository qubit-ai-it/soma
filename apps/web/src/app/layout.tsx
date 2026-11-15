import type { Metadata } from "next";
import { Suspense } from "react";
import { DM_Sans, Inter } from "next/font/google";
import "material-symbols/outlined.css";
import "./globals.css";

import { OnboardingGate } from "@/features/onboarding/components/onboarding-gate";
import { SentryFileProvider } from "@/shared/ui/sentry-file";
import { SiteNav } from "./site-nav";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Soma",
  description: "Crew health monitoring prototype",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SentryFileProvider>
          <Suspense fallback={<div className="h-16" />}>
            <SiteNav />
          </Suspense>
          {children}
          <OnboardingGate />
        </SentryFileProvider>
      </body>
    </html>
  );
}
