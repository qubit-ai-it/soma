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
    return <p className="text-xl text-ink">Cargando sesión…</p>;
  }

  const live = session.mode === "live";
  const real = live && profile.kind === "quest";

  return (
    <div className="space-y-8">
      <section aria-label="Dispositivo" className="space-y-2 rounded-lg bg-card p-6">
        <p className="font-heading text-2xl font-semibold">{profile.label}</p>
        <p className="text-lg text-ink">{profile.detail}</p>
        <p className="text-lg text-ink">
          Contenido de demostración: no es un protocolo clínico. SOMA no diagnostica ni prescribe.
        </p>
      </section>

      <section aria-label="Modo" className="space-y-2">
        <div role="group" aria-label="Modo de sesión" className="inline-flex rounded-full bg-card p-1">
          {(["practice", "live"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={session.mode === mode}
              disabled={session.mode !== mode && !canSwitchMode(session)}
              onClick={() => switchMode(mode)}
              className={`min-h-16 rounded-full px-8 font-heading text-xl font-semibold disabled:opacity-40 ${
                session.mode === mode ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
              }`}
            >
              {mode === "practice" ? "Práctica" : "En vivo"}
            </button>
          ))}
        </div>
        <p className="text-lg text-ink">
          {live
            ? "En vivo: se registra cada acción. Para cambiar de modo, termina o aborta la sesión."
            : "Práctica: no se registra nada y puedes reiniciar cuando quieras."}
        </p>
      </section>

      {message && (
        <p role="alert" className="rounded-lg bg-danger/15 p-4 text-lg">
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
