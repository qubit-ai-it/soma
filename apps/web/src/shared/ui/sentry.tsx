"use client";

import { useEffect, useRef } from "react";
import {
  useRive,
  useViewModelInstanceColor,
  useViewModelInstanceEnum,
  useViewModelInstanceTrigger,
} from "@rive-app/react-canvas";

import { useSettings } from "@/features/settings/settings.store";

import { hexToRgb, type SentryMode } from "../sentry.types";
import { MASCOT_SRC } from "./rive-runtime";
import { useSharedMascot } from "./sentry-file";

const ARTBOARD = {
  artboard: "Artboard 1",
  stateMachine: "MascotController",
  autoplay: true,
  autoBind: true,
};

type Props = {
  mode?: SentryMode;
  color?: string;
  successSignal?: number;
  errorSignal?: number;
  label?: string;
  className?: string;
};

export function Sentry({
  mode = "idle",
  color,
  successSignal = 0,
  errorSignal = 0,
  label = "Sentry, Soma's assistant",
  className,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mascot = useSharedMascot();
  const shared = mascot?.file ?? null;
  const request = mascot?.request;
  const [settings] = useSettings();
  const tint = color ?? settings.color;
  // the shared file is returned while still loading: wait for "success", fall back to src on failure
  useEffect(() => {
    request?.();
  }, [request]);
  const { rive, RiveComponent } = useRive(
    mascot === null || shared?.status === "failed"
      ? { src: MASCOT_SRC, ...ARTBOARD }
      : shared?.status === "success" && shared.riveFile
        ? { riveFile: shared.riveFile, ...ARTBOARD }
        : null,
  );

  const vmi = rive?.viewModelInstance ?? null;
  const { setValue: setMode } = useViewModelInstanceEnum("mode", vmi);
  const { trigger: fireSuccess } = useViewModelInstanceTrigger("success", vmi);
  const { trigger: fireError } = useViewModelInstanceTrigger("error", vmi);
  const { setRgb } = useViewModelInstanceColor("mascotColor", vmi);

  useEffect(() => {
    setMode(mode);
  }, [mode, setMode, vmi]);

  useEffect(() => {
    if (successSignal > 0) fireSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successSignal]);

  useEffect(() => {
    if (errorSignal > 0) fireError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorSignal]);

  useEffect(() => {
    const rgb = hexToRgb(tint);
    if (rgb) setRgb(...rgb);
  }, [tint, setRgb, vmi]);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!rive || !node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    const sync = () => {
      if (visible && !reduced.matches) rive.startRendering();
      else rive.stopRendering();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(node);
    reduced.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      reduced.removeEventListener("change", sync);
    };
  }, [rive]);

  return (
    <div ref={wrapperRef} className={className}>
      <RiveComponent
        role="img"
        aria-label={label}
        style={{ width: "100%", aspectRatio: "832 / 757" }}
      />
    </div>
  );
}
