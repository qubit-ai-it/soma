import type { Metadata } from "next";

import { SentryPlayground } from "@/features/pet/components/sentry-playground";

export const metadata: Metadata = {
  title: "Sentry | Soma",
  description: "Prueba temporal de la mascota Sentry",
};

export default function PetPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Sentry</h1>
      <p className="mb-10 mt-2 text-zinc-600 dark:text-zinc-400">
        Página temporal para probar la mascota de Soma: estados, eventos y color.
      </p>
      <SentryPlayground />
    </main>
  );
}
