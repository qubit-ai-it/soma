"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useRiveFile } from "@rive-app/react-canvas";

import { MASCOT_SRC } from "./rive-runtime";

type MascotFileState = ReturnType<typeof useRiveFile>;

const MascotFileContext = createContext<MascotFileState | null>(null);

export function SentryFileProvider({ children }: { children: ReactNode }) {
  const state = useRiveFile({ src: MASCOT_SRC });
  return <MascotFileContext value={state}>{children}</MascotFileContext>;
}

export function useSharedMascotFile() {
  return useContext(MascotFileContext);
}
