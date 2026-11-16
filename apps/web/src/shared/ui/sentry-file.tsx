"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRiveFile } from "@rive-app/react-canvas";

import { MASCOT_SRC } from "./rive-runtime";

export type MascotFileState = ReturnType<typeof useRiveFile>;

type SharedMascot = { file: MascotFileState | null; request: () => void };

const SharedMascotContext = createContext<SharedMascot | null>(null);

function MascotFileLoader({ onState }: { onState: (state: MascotFileState) => void }) {
  const state = useRiveFile({ src: MASCOT_SRC });
  useEffect(() => {
    onState(state);
  }, [state, onState]);
  return null;
}

// The .riv file loads once, the first time an animated Sentry is mounted, and stays for the whole session
export function SentryFileProvider({ children }: { children: ReactNode }) {
  const [wanted, setWanted] = useState(false);
  const [file, setFile] = useState<MascotFileState | null>(null);
  const request = useCallback(() => setWanted(true), []);
  const value = useMemo(() => ({ file, request }), [file, request]);

  return (
    <SharedMascotContext value={value}>
      {children}
      {wanted && <MascotFileLoader onState={setFile} />}
    </SharedMascotContext>
  );
}

export function useSharedMascot() {
  return useContext(SharedMascotContext);
}
