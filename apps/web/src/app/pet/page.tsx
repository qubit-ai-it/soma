import type { Metadata } from "next";

import { SentryChat } from "@/features/pet/components/sentry-chat";

export const metadata: Metadata = {
  title: "Sentry | Soma",
  description: "Chat con Sentry, la mascota de Soma",
};

export default function PetPage() {
  return (
    <main className="container-soma max-w-3xl flex-1 py-16">
      <h1 className="reveal mb-10 text-display">Sentry</h1>
      <SentryChat />
    </main>
  );
}
