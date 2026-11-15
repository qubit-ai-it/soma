"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useRiveFile } from "@rive-app/react-canvas";

import { MASCOT_SRC } from "./rive-runtime";

type MascotFile = ReturnType<typeof useRiveFile>["riveFile"];

const MascotFileContext = createContext<{ riveFile: MascotFile } | null>(null);

export function SentryFileProvider({ children }: { children: ReactNode }) {
  const { riveFile } = useRiveFile({ src: MASCOT_SRC });
  return <MascotFileContext value={{ riveFile }}>{children}</MascotFileContext>;
}

export function useSharedMascotFile() {
  return useContext(MascotFileContext);
}
