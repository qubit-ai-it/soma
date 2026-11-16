import type { Metadata } from "next";

import { SentryAssistant } from "@/features/pet/components/sentry-assistant";

export const metadata: Metadata = {
  title: "Sentry | Soma",
  description: "Chat with Sentry, Soma's mascot",
};

export default function PetPage() {
  return (
    <main className="container-soma flex-1 py-16">
      <h1 className="reveal mb-10 text-display">Sentry</h1>
      <SentryAssistant />
    </main>
  );
}
