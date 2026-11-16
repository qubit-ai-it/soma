import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";
import { DM_Sans, Inter } from "next/font/google";
import "material-symbols/outlined.css";
import "./globals.css";

import { SentryFileProvider } from "@/shared/ui/sentry-file";
import { OnboardingGate } from "./onboarding-gate";
import { RoleSync } from "./role-sync";
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
      lang="en"
      className={`${inter.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background pb-32 text-foreground sm:pb-24">
        <ClerkProvider>
          <SentryFileProvider>
            {children}
            <Suspense fallback={null}>
              <SiteNav />
            </Suspense>
            <OnboardingGate />
            <RoleSync />
          </SentryFileProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}