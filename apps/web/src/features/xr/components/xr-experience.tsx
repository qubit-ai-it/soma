"use client";

import { useEffect, useState } from "react";

import { detectCapabilities, resolveDeviceProfile, type DeviceProfile } from "../device-profile.logic";
import { startSession } from "../procedure.machine";
import type { Procedure, SessionMode, SessionState } from "../procedure.types";
import {
  applyAction,
  canSwitchMode,
  describeMachineError,
  isCaptureStep,
  type SessionAction,
} from "../session.flow";
import { loadStoredSession, saveSession, type SessionStorageLike } from "../session.storage";
import { SomaCard } from "@/shared/ui/soma-card";

import { CapturePanel } from "./capture-panel";
import { LiveLog } from "./live-log";
import { ProcedureStepper } from "./procedure-stepper";

type Props = { procedure: Procedure; subjectId?: string };

const PENDING_PROFILE: DeviceProfile = {
  kind: "simulated",
  label: "Detectando dispositivo…",
  detail: "Comprobando WebXR.",
};

function browserStorage(): SessionStorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function XrExperience({ procedure, subjectId = "cm-01" }: Props) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [profile, setProfile] = useState<DeviceProfile>(PENDING_PROFILE);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const restored = loadStoredSession(browserStorage(), procedure);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
    setSession(restored ?? startSession(procedure, "practice", new Date().toISOString()));
    void detectCapabilities({ navigator, isSecureContext: window.isSecureContext }).then((caps) =>
      setProfile(resolveDeviceProfile(caps)),
    );
  }, [procedure]);

  function commit(next: SessionState) {
    setSession(next);
    saveSession(browserStorage(), next);
  }

  function onAction(action: SessionAction) {
    if (session === null) return;
    const result = applyAction(procedure, session, action, new Date().toISOString());
    if (result.ok) {
      setMessage(null);
      commit(result.value);
    } else {
      setMessage(describeMachineError(result.error));
    }
  }

  function switchMode(mode: SessionMode) {
    if (session === null || session.mode === mode || !canSwitchMode(session)) return;
    setMessage(null);
    commit(startSession(procedure, mode, new Date().toISOString()));
  }

  if (session === null) {
    return <p className="text-lg text-muted-foreground">Cargando sesión…</p>;
  }

  const live = session.mode === "live";
  const real = live && profile.kind === "quest";

  return (
    <div className="space-y-4">
      <SomaCard
        label="Dispositivo"
        title={profile.kind === "simulated" ? "Visor no detectado" : profile.label}
        chip={live ? "En vivo" : "Práctica"}
        tone={live ? "info" : "neutral"}
        detail={
          <>
            <p>{profile.detail}</p>
            <p>
              {live
                ? "En vivo se registra cada acción. Para cambiar de modo, termina o aborta la sesión."
                : "Práctica no registra nada y puedes reiniciar cuando quieras."}
            </p>
            <p>SOMA no diagnostica ni prescribe.</p>
          </>
        }
      >
        <div role="group" aria-label="Modo de sesión" className="flex gap-2">
          {(["practice", "live"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={session.mode === mode}
              disabled={session.mode !== mode && !canSwitchMode(session)}
              onClick={() => switchMode(mode)}
              className={`h-12 flex-1 rounded-full px-5 font-heading text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 ${
                session.mode === mode ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"
              }`}
            >
              {mode === "practice" ? "Práctica" : "En vivo"}
            </button>
          ))}
        </div>
      </SomaCard>

      {message && (
        <p role="alert" className="rounded-2xl bg-danger/15 px-5 py-3 text-base text-danger">
          {message}
        </p>
      )}

      <ProcedureStepper procedure={procedure} session={session} onAction={onAction} />

      {isCaptureStep(procedure, session) && (
        <CapturePanel
          subjectId={subjectId}
          synthetic={!real}
          device={real ? profile.label : undefined}
        />
      )}

      {live && <LiveLog procedure={procedure} session={session} />}
    </div>
  );
}
