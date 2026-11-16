import type { CardTone } from "../../shared/ui/soma-card.tsx";
import type { SourceInfo } from "../../shared/source.ts";
import type { RadiationWindow } from "./radiation.port.ts";
import type { SpaceWeatherEvent, SpaceWeatherSnapshot } from "./space-weather.port.ts";

export type ExternalCard = {
  id: string;
  title: string;
  value: string;
  line: string;
  icon: string;
  tone: CardTone;
  source: string;
};

const EVENT_LABELS: Record<SpaceWeatherEvent["type"], string> = {
  FLR: "Llamarada",
  CME: "Eyección de masa coronal",
  SEP: "Tormenta de protones",
  GST: "Tormenta geomagnética",
};

const DONKI = "DONKI by NASA";
const SWPC = "NOAA SWPC";
const RADLAB = "RadLab by NASA";

const number = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// A figure from a fixture or a cached copy must say so
function credit(name: string, source: SourceInfo): string {
  if (source.mode === "mock") return `${name} · Demo`;
  if (source.mode === "cache") return `${name} · Última lectura`;
  return name;
}

function eventsTone(events: readonly SpaceWeatherEvent[]): CardTone {
  if (events.some((event) => event.type === "SEP")) return "danger";
  if (events.some((event) => event.type === "GST")) return "warn";
  return "ok";
}

function kpTone(kp: number): CardTone {
  if (kp >= 7) return "danger";
  return kp >= 5 ? "warn" : "ok";
}

// 10 pfu at >10 MeV is where NOAA starts counting a solar radiation storm
function protonTone(pfu: number): CardTone {
  if (pfu >= 100) return "danger";
  return pfu >= 10 ? "warn" : "ok";
}

function xrayTone(flareClass: string): CardTone {
  const letter = flareClass.trim().charAt(0).toUpperCase();
  if (letter === "X") return "danger";
  return letter === "M" ? "warn" : "ok";
}

export function spaceWeatherCards(snapshot: SpaceWeatherSnapshot): ExternalCard[] {
  const { events, kpIndex, protonFluxPfu10Mev, xrayClass, source } = snapshot;
  const cards: ExternalCard[] = [];

  if (events !== null) {
    const labels = [...new Set(events.map((event) => EVENT_LABELS[event.type]))];
    cards.push({
      id: "solar-events",
      title: "Actividad solar · 7 días",
      value: events.length === 1 ? "1 evento" : `${events.length} eventos`,
      line: labels.length > 0 ? labels.join(", ") : "Sin eventos recientes",
      icon: "sunny",
      tone: eventsTone(events),
      source: credit(DONKI, source),
    });
  }
  if (xrayClass !== null) {
    cards.push({
      id: "xray",
      title: "Rayos X solares",
      value: `Clase ${xrayClass}`,
      line: "Flujo de rayos X de GOES",
      icon: "light_mode",
      tone: xrayTone(xrayClass),
      source: credit(SWPC, source),
    });
  }
  if (kpIndex !== null) {
    cards.push({
      id: "geomagnetic",
      title: "Actividad geomagnética",
      value: `Kp ${number.format(kpIndex)}`,
      line: "Índice planetario",
      icon: "storm",
      tone: kpTone(kpIndex),
      source: credit(SWPC, source),
    });
  }
  if (protonFluxPfu10Mev !== null) {
    cards.push({
      id: "protons",
      title: "Protones solares",
      value: `${number.format(protonFluxPfu10Mev)} pfu`,
      line: "Flujo de protones sobre 10 MeV",
      icon: "flare",
      tone: protonTone(protonFluxPfu10Mev),
      source: credit(SWPC, source),
    });
  }
  return cards;
}

const DAY_MS = 86_400_000;

export function radiationCard(window: RadiationWindow): ExternalCard | null {
  const samples = [...window.samples].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const last = samples.at(-1);
  if (!last) return null;

  const lastMs = Date.parse(last.timestamp);
  const recent = samples.filter((sample) => lastMs - Date.parse(sample.timestamp) <= DAY_MS);
  const mean = recent.reduce((sum, sample) => sum + sample.doseRate, 0) / recent.length;
  const prefix = window.instrument ? `${window.instrument}, ` : "";

  return {
    id: "ambient-radiation",
    title: "Radiación ambiental",
    value: `${number.format(mean)} µGy/h`,
    line: `${prefix}promedio 24 h al ${date.format(lastMs)}`,
    icon: "radioactive",
    tone: "neutral",
    source: credit(RADLAB, window.source),
  };
}
