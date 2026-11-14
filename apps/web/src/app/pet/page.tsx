import type { Metadata } from "next";

import { SentryChat } from "@/features/pet/components/sentry-chat";

export const metadata: Metadata = {
  title: "Sentry | Soma",
  description: "Chat con Sentry, la mascota de Soma",
};

export default function PetPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Sentry</h1>
      <p className="mb-10 mt-2 text-zinc-600 dark:text-zinc-400">
        Conversa con Sentry, la mascota asistente de Soma.
      </p>
      <SentryChat />
    </main>
  );
}
