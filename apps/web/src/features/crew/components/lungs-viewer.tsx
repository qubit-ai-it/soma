"use client";

import dynamic from "next/dynamic";

// three.js and the model load only when this section is on screen
const Lungs = dynamic(() => import("@/shared/lungs").then((module) => module.Lungs), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-muted-foreground">
      Cargando pulmones 3D…
    </div>
  ),
});

// Fills a positioned parent; see HeartViewer for why it is absolutely sized
export function LungsViewer() {
  return (
    <div className="absolute inset-0">
      <Lungs label="Modelo 3D de los pulmones" className="h-full rounded-none border-0" />
    </div>
  );
}
