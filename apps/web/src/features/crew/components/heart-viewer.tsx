"use client";

import dynamic from "next/dynamic";

// three.js and the 2.5 MB model load only when this section is on screen
const Heart = dynamic(() => import("@/shared/heart").then((module) => module.Heart), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-muted-foreground">
      Cargando corazón 3D…
    </div>
  ),
});

// Fills a positioned parent. Absolutely sized on purpose: the canvas follows its parent,
// so a parent that follows the canvas would grow forever.
export function HeartViewer() {
  return (
    <div className="absolute inset-0">
      <Heart label="Modelo 3D del corazón" className="h-full rounded-none border-0" />
    </div>
  );
}
