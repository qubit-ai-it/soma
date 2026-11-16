"use client";

import { useEffect, useState } from "react";

import { MetricCard } from "@/shared/ui/metric-card";

import { detectCapabilities, resolveDeviceProfile, type DeviceProfile } from "../device-profile.logic";

export function HeadsetCard() {
  const [profile, setProfile] = useState<DeviceProfile | null>(null);

  useEffect(() => {
    let active = true;
    void detectCapabilities({ navigator, isSecureContext: window.isSecureContext }).then((caps) => {
      if (active) setProfile(resolveDeviceProfile(caps));
    });
    return () => {
      active = false;
    };
  }, []);

  const found = profile?.kind === "quest";

  return (
    <MetricCard
      title="XR headset"
      value={profile === null ? "Searching…" : found ? "Meta Quest" : "Not detected"}
      line={found ? "WebXR available." : undefined}
      icon="view_in_ar"
    />
  );
}
