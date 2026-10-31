"use client";

import { useState } from "react";

import { BodyMap, bodyMapRegions } from "@/shared/ui/body-map";
import { regionSeverities, ZONE_REGION_IDS } from "../crew.body";
import type { Zone, ZoneReading } from "../crew.types";
import { SEVERITY_META } from "./severity";

const ZONE_BY_REGION = new Map<string, Zone>(
  (Object.entries(ZONE_REGION_IDS) as [Zone, readonly string[]][]).flatMap(
    ([zone, ids]) => ids.map((id) => [id, zone] as const),
  ),
);

export function BodyPanel({
  memberName,
  zones,
}: {
  memberName: string;
  zones: ZoneReading[];
}) {
  const [selected, setSelected] = useState<Zone | null>(null);
  const severity = regionSeverities(zones);
  const value = selected ? ZONE_REGION_IDS[selected] : [];
  const detail = zones.find((reading) => reading.zone === selected);

  const regions = bodyMapRegions.map((region) => {
    const reading = zones.find((zone) => zone.zone === ZONE_BY_REGION.get(region.id));
    return {
      ...region,
      label: reading
        ? `${reading.label}: ${SEVERITY_META[reading.severity].label}`
        : "Sin señales asociadas",
    };
  });

  function handleChange(next: string[]) {
    const added = next.find((id) => !value.includes(id));
    const zone = added ? ZONE_BY_REGION.get(added) : undefined;
    setSelected(zone && zone !== selected ? zone : null);
  }

  return (
    <div>
      <BodyMap
        label={`Mapa corporal de ${memberName}`}
        regions={regions}
        value={value}
        onValueChange={handleChange}
        severity={severity}
        showSummary={false}
      />

      <ul className="mt-3 space-y-1 text-sm">
        {zones.map((reading) => (
          <li key={reading.zone} className="flex items-center justify-between gap-2">
            <span>{reading.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_META[reading.severity].badge}`}
            >
              {SEVERITY_META[reading.severity].label}
            </span>
          </li>
        ))}
      </ul>

      <div role="status" className="mt-3 text-sm">
        {detail ? (
          <div className="rounded-md bg-zinc-100 p-3 dark:bg-zinc-900">
            <p className="font-medium">
              {detail.label}: {SEVERITY_META[detail.severity].label}
            </p>
            <ul className="mt-1 space-y-0.5">
              {detail.signals.map((signal) => (
                <li key={signal.signal}>
                  {signal.label}: {signal.value} {signal.unit} (
                  {SEVERITY_META[signal.severity].label})
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              Ilustrativo, no clínico.
            </p>
          </div>
        ) : (
          <p className="text-zinc-600 dark:text-zinc-400">
            Selecciona una zona para ver qué señales la pintaron.
          </p>
        )}
      </div>
    </div>
  );
}
