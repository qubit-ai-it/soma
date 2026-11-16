export type XrCapabilities = {
  hasXr: boolean;
  vrSupported: boolean;
  arSupported: boolean;
  secureContext: boolean;
  userAgent: string;
};

export type DeviceProfile = {
  kind: "quest" | "simulated";
  label: string;
  detail: string;
};

export type CapabilityEnvironment = {
  navigator: {
    userAgent: string;
    xr?: { isSessionSupported(mode: string): Promise<boolean> };
  };
  isSecureContext: boolean;
};

const QUEST_PATTERN = /OculusBrowser|Quest/i;

async function supports(
  xr: NonNullable<CapabilityEnvironment["navigator"]["xr"]>,
  mode: string,
): Promise<boolean> {
  try {
    return (await xr.isSessionSupported(mode)) === true;
  } catch {
    return false;
  }
}

export async function detectCapabilities(env: CapabilityEnvironment): Promise<XrCapabilities> {
  const xr = env.navigator.xr;
  const base = { secureContext: env.isSecureContext, userAgent: env.navigator.userAgent };
  if (xr === undefined || !env.isSecureContext) {
    return { ...base, hasXr: xr !== undefined, vrSupported: false, arSupported: false };
  }
  const [vrSupported, arSupported] = await Promise.all([
    supports(xr, "immersive-vr"),
    supports(xr, "immersive-ar"),
  ]);
  return { ...base, hasXr: true, vrSupported, arSupported };
}

export function resolveDeviceProfile(caps: XrCapabilities): DeviceProfile {
  const immersive = caps.secureContext && (caps.vrSupported || caps.arSupported);
  if (immersive && QUEST_PATTERN.test(caps.userAgent)) {
    return {
      kind: "quest",
      label: "Meta Quest detected",
      detail: "WebXR is available. Procedure resources are local.",
    };
  }

  const detail = !caps.secureContext
    ? "WebXR requires a secure context (HTTPS or localhost). The procedure remains available on screen."
    : !caps.hasXr
      ? "This browser does not expose WebXR. The procedure remains available on screen."
      : !immersive
        ? "WebXR reports no available immersive sessions. The procedure remains available on screen."
        : "WebXR device detected, but it is not a Meta Quest. The procedure is shown on screen.";
  return { kind: "simulated", label: "Headset not detected", detail };
}
