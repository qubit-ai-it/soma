"use client";

export default function Error({ retry }: { error: Error; retry: () => void }) {
  return (
    <main className="container-soma flex-1 py-16">
      <h1 className="text-headline">Algo salió mal</h1>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-6 rounded-full bg-primary px-5 py-2 font-heading text-sm font-semibold text-primary-foreground transition-colors duration-[var(--duration-micro)] hover:bg-primary/85"
      >
        Reintentar
      </button>
    </main>
  );
}
