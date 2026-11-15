"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import {
  ONBOARDING_DONE,
  ONBOARDING_KEY,
  ONBOARDING_OPEN_EVENT,
  ONBOARDING_STEPS,
  isLastStep,
  nextStepIndex,
  shouldShowOnboarding,
} from "@/features/onboarding/onboarding.logic";
import { ROLE_LABELS } from "@/features/roles/roles.logic";
import { setDemoRole, useDemoRole } from "@/features/roles/roles.store";
import { ROLES, type Role } from "@/features/roles/roles.types";
import { BLUETOOTH_MESSAGES } from "@/features/live/live.display";
import { connectLive, getLiveState, useLiveState } from "@/features/live/live.store";
import { SOURCE_OPTIONS, XR_OPTIONS, type SetupOption } from "@/features/settings/settings.logic";
import { useSettings } from "@/features/settings/settings.store";
import {
  detectCapabilities,
  resolveDeviceProfile,
  type DeviceProfile,
} from "@/features/xr/device-profile.logic";
import { useLocalStore } from "@/shared/local-store";
import { Icon } from "@/shared/ui/icon";
import { Sentry } from "@/shared/ui/sentry";

const ACTION =
  "flex h-12 w-full items-center justify-center rounded-full px-6 font-heading text-base font-semibold outline-none transition-colors duration-[var(--duration-micro)] focus-visible:ring-2 focus-visible:ring-ring";

const CHOICE =
  "flex h-12 items-center justify-center gap-2 rounded-full px-4 font-heading text-sm font-semibold outline-none transition-colors duration-[var(--duration-micro)] focus-visible:ring-2 focus-visible:ring-ring";

const ROLE_ICONS: Record<Role, string> = {
  astronaut: "person",
  cmo: "stethoscope",
  commander: "flag",
  earth: "public",
};

const parseStored = (value: unknown) => (typeof value === "string" ? value : "");
const subscribeNothing = () => () => {};

function Choice({
  selected,
  icon,
  label,
  onSelect,
}: {
  selected: boolean;
  icon: string;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`${CHOICE} ${selected ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"}`}
    >
      <Icon name={icon} />
      {label}
    </button>
  );
}

function OptionList<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: readonly SetupOption<T>[];
  value: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div className="grid w-full grid-cols-2 gap-2">
      {options.map((option) => (
        <Choice
          key={option.id}
          selected={option.id === value}
          icon={option.icon}
          label={option.label}
          onSelect={() => onSelect(option.id)}
        />
      ))}
    </div>
  );
}

export function OnboardingGate() {
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  const [stored, setStored] = useLocalStore<string>(ONBOARDING_KEY, "", parseStored);
  const [settings, setSettings] = useSettings();
  const role = useDemoRole();
  const [forced, setForced] = useState(false);
  const [closed, setClosed] = useState(false);
  const [index, setIndex] = useState(0);
  const [profile, setProfile] = useState<DeviceProfile | null>(null);
  const [bluetoothMessage, setBluetoothMessage] = useState<string | null>(null);
  const live = useLiveState();

  const open = mounted && (forced || (shouldShowOnboarding(stored || null) && !closed));
  const step = ONBOARDING_STEPS[index];

  function finish() {
    setStored(ONBOARDING_DONE);
    setForced(false);
    setClosed(true);
    setIndex(0);
  }

  useEffect(() => {
    function reopen() {
      setIndex(0);
      setForced(true);
    }
    window.addEventListener(ONBOARDING_OPEN_EVENT, reopen);
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, reopen);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") finish();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || step.kind !== "xr") return;
    let active = true;
    void detectCapabilities({ navigator, isSecureContext: window.isSecureContext }).then((caps) => {
      if (!active) return;
      const detected = resolveDeviceProfile(caps);
      setProfile(detected);
      if (detected.kind === "quest") setSettings((prev) => ({ ...prev, xr: "quest" }));
    });
    return () => {
      active = false;
    };
  }, [open, step.kind, setSettings]);

  async function pairDevice() {
    setBluetoothMessage(null);
    const error = await connectLive();
    if (error) {
      setBluetoothMessage(BLUETOOTH_MESSAGES[error]);
      return;
    }
    const device = getLiveState().deviceName ?? undefined;
    setSettings((prev) => ({ ...prev, source: "bluetooth", device }));
  }

  function goNext() {
    setIndex(nextStepIndex(index));
  }

  if (!open) return null;

  const last = isLastStep(index);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenida a SOMA"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background p-6"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <Sentry
          mode={step.mode}
          successSignal={last ? 1 : 0}
          className="w-[min(50vw,13rem)]"
        />

        <div
          role="progressbar"
          aria-label="Progreso de la bienvenida"
          aria-valuemin={1}
          aria-valuemax={ONBOARDING_STEPS.length}
          aria-valuenow={index + 1}
          className="flex gap-1.5"
        >
          {ONBOARDING_STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`h-2 w-6 rounded-full ${i <= index ? "bg-primary" : "bg-secondary"}`}
            />
          ))}
        </div>

        <div className="space-y-2" aria-live="polite">
          <h2 className="font-heading text-3xl font-bold leading-tight">{step.title}</h2>
          <p className="text-lg text-muted-foreground">{step.line}</p>
        </div>

        {step.kind === "role" && (
          <div className="grid w-full grid-cols-2 gap-2">
            {ROLES.map((id) => (
              <Choice
                key={id}
                selected={id === role}
                icon={ROLE_ICONS[id]}
                label={ROLE_LABELS[id]}
                onSelect={() => setDemoRole(id)}
              />
            ))}
          </div>
        )}

        {step.kind === "source" && (
          <div className="flex w-full flex-col items-center gap-3">
            <OptionList
              options={SOURCE_OPTIONS}
              value={settings.source}
              onSelect={(id) => setSettings((prev) => ({ ...prev, source: id }))}
            />
            {settings.source === "bluetooth" && (
              <div className="flex w-full flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={pairDevice}
                  className={`${ACTION} bg-secondary text-foreground hover:bg-secondary/70`}
                >
                  <Icon name="bluetooth" className="mr-2" />
                  {live.status === "connected" ? "Conectar otro" : "Conectar"}
                </button>
                {live.status === "connected" && live.deviceName && (
                  <p role="status" className="text-sm">
                    {live.deviceName}
                    {live.readings.length > 0 && ` · ${live.readings[live.readings.length - 1].bpm} lpm`}
                  </p>
                )}
                {bluetoothMessage && (
                  <p role="status" className="text-sm text-warn">
                    {bluetoothMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {step.kind === "xr" && (
          <div className="flex w-full flex-col items-center gap-3">
            <OptionList
              options={XR_OPTIONS}
              value={settings.xr}
              onSelect={(id) => setSettings((prev) => ({ ...prev, xr: id }))}
            />
            <p role="status" className="text-sm text-ink">
              {profile ? profile.label : "Buscando visor…"}
            </p>
          </div>
        )}

        <div className="flex w-full flex-col gap-2">
          {last ? (
            <>
              <button
                type="button"
                onClick={finish}
                className={`${ACTION} bg-primary text-primary-foreground hover:bg-primary/85`}
              >
                Empezar
              </button>
              <Link
                href="/demo"
                onClick={finish}
                className={`${ACTION} bg-secondary text-foreground hover:bg-secondary/70`}
              >
                Ver la demo
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={goNext}
                className={`${ACTION} bg-primary text-primary-foreground hover:bg-primary/85`}
              >
                Siguiente
              </button>
              <button
                type="button"
                onClick={finish}
                className={`${ACTION} bg-secondary text-foreground hover:bg-secondary/70`}
              >
                Saltar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
