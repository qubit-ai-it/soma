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
      label: "Meta Quest detectado",
      detail: "WebXR disponible. Los recursos del procedimiento son locales.",
    };
  }

  const detail = !caps.secureContext
    ? "WebXR requiere un contexto seguro (HTTPS o localhost). El procedimiento sigue disponible en pantalla."
    : !caps.hasXr
      ? "Este navegador no expone WebXR. El procedimiento sigue disponible en pantalla."
      : !immersive
        ? "WebXR no reporta sesiones inmersivas disponibles. El procedimiento sigue disponible en pantalla."
        : "Dispositivo con WebXR, pero no es un Meta Quest. El procedimiento se muestra en pantalla.";
  return { kind: "simulated", label: "Visor no detectado", detail };
}
