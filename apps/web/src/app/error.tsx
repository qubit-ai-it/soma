"use client";

export default function Error({ retry }: { error: Error; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold">Algo salió mal</h1>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-4 rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
      >
        Reintentar
      </button>
    </main>
  );
}
