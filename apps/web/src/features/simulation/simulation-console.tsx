"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { BodyMap, type BodyMapSeverity } from "@/shared/ui/body-map";
import { Button } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/icon";
import { ZONE_REGION_IDS } from "@/features/crew/crew.body";
import { AssignmentRoutes } from "./assignment-routes";
import { SimulationTour } from "./simulation-tour";
import type { TourContext } from "./tour.logic";
import { assessTelemetry, canEditTelemetry, incidentProgress, isCrewInDanger } from "./incident";
import { constrainToDeck, corridorFloors, isCorridor, locationAt, locationNames, roomFloor, type DeckFloor } from "./deck";
import {
  crewColorToken, equipment, roomIds, rooms,
  telemetryLabels, telemetrySchema,
  type Point, type SimCrew, type SimulationState, type SimulationUpdate, type Telemetry,
} from "./simulation";
import { CARDIAC_ARREST_MAX_BPM, CPR_EXPERIENCE, cardiacArrestIncident } from "./simulation.experience";
import { providerLabel } from "./simulation.provider";
import styles from "./simulation.module.css";

const endpoint = "/api/simulation";
const statusLabel = {
  nominal: "Everything is fine", watch: "A crew member needs attention",
  critical: "Danger: a crew member needs help", resolved: "The crew member is out of danger",
};
const emptyCrewMessage = "No crew members yet. Sign up from the onboarding to join the crew.";
const timeLabel = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const crewColor = (crew: SimCrew[], id: SimCrew["id"]) => `var(${crewColorToken(crew, id)})`;
const bodySignals: Record<keyof typeof ZONE_REGION_IDS, (keyof Telemetry)[]> = {
  head: [],
  thorax: ["heartRateBpm", "spo2Pct", "systolic", "diastolic"],
  "abdomen-pelvis": ["cumulativeDoseMsv"],
};

type Drag = { crewId: SimCrew["id"]; start: Point; pointer: number; position?: Point };

function mapPoint(event: PointerEvent, map: HTMLDivElement): Point {
  const box = map.getBoundingClientRect();
  const percent = (offset: number, size: number) => Math.round(Math.min(98, Math.max(2, offset * 100 / size)) * 10) / 10;
  return constrainToDeck({ x: percent(event.clientX - box.left, box.width), y: percent(event.clientY - box.top, box.height) });
}

function TelemetryInput({ name, value, reference, disabled, onChange }: {
  name: keyof Telemetry;
  value: number;
  reference?: { min: number; max: number; outside: boolean };
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const [entry, setEntry] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const label = telemetryLabels[name];
  const range = telemetrySchema.shape[name];
  return (
    <label className={styles.field} data-tour={name === "heartRateBpm" ? "pulse" : undefined}>
      {label}
      <input
        type="number"
        inputMode="decimal"
        step="any"
        min={range.minValue ?? undefined}
        max={range.maxValue ?? undefined}
        value={entry ?? value}
        disabled={disabled}
        aria-invalid={invalid}
        onChange={(event) => { setEntry(event.target.value); setInvalid(false); }}
        onBlur={() => {
          if (entry === null) return;
          const next = Number(entry);
          if (!entry.trim() || !range.safeParse(next).success) {
            setInvalid(true);
            return;
          }
          if (next !== value) onChange(next);
          setEntry(null);
        }}
        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
      />
      <span className={styles.normalRange} data-outside={reference?.outside ?? false}>
        {reference ? <>Normal: <strong>{reference.min}–{reference.max}</strong></>
          : "Informational · no alert"}
      </span>
      {invalid && <small role="alert">Enter a valid value between {range.minValue} and {range.maxValue}.</small>}
    </label>
  );
}

function CrewDetails({ member, color, locked, canEdit, onClose, onUpdate }: {
  member: SimCrew;
  color: string;
  locked: boolean;
  canEdit: boolean;
  onClose: () => void;
  onUpdate: (update: SimulationUpdate) => void;
}) {
  const [regions, setRegions] = useState<string[]>([]);
  const readings = assessTelemetry(member.telemetry);
  const severity = Object.fromEntries((Object.keys(bodySignals) as (keyof typeof bodySignals)[]).flatMap((zone) => {
    const zoneReadings = readings.filter(({ signal }) => bodySignals[zone].includes(signal));
    const status: BodyMapSeverity = zoneReadings.some(({ severity }) => severity === "critical") ? "risky"
      : zoneReadings.some(({ severity }) => severity === "watch") ? "possible-risk" : "ok";
    return ZONE_REGION_IDS[zone].map((region) => [region, status]);
  }));

  return (
    <section className={styles.details} aria-label={`Telemetry for ${member.name}`}>
      <header className={styles.cardHeader}>
        <div>
          <h3><Dot color={color} /> {member.name}</h3>
          <p>{locationNames[locationAt(member.position)]}</p>
        </div>
        <Button type="button" variant="outline" size="icon-sm" onClick={onClose} aria-label="Close profile">
          <Icon name="close" />
        </Button>
      </header>
      {locked && <p className={styles.dangerHelp}>{canEdit
        ? "Both teammates have arrived. You can update the readings, but not move the crew member yet."
        : "In danger: do not move them or change their readings until two teammates show as \"Arrived\"."}</p>}
      {canEdit && <p className={styles.analysisHelp}>When you change a value, the AI reviews the situation. A reading outside the range can raise an alert; sleep is informational.</p>}
      <div className={styles.fields}>
        {(Object.keys(telemetryLabels) as (keyof Telemetry)[]).map((name) => {
          const reading = readings.find(({ signal }) => signal === name);
          return <TelemetryInput key={name} name={name} value={member.telemetry[name]}
            reference={reading && { min: reading.min, max: reading.max, outside: !reading.corrected }}
            disabled={!canEdit}
            onChange={(value) => onUpdate({ kind: "telemetry", crewId: member.id, telemetry: { [name]: value } })} />;
        })}
      </div>
      <details className={styles.bodyDetails}>
        <summary>View body map</summary>
        <BodyMap className="max-h-72 overflow-auto pt-3" label="Simulated body map" views={["front"]}
          value={regions} onValueChange={setRegions} severity={severity} showSummary={false} />
      </details>
    </section>
  );
}

function Dot({ color }: { color: string }) {
  return <span className={styles.dot} style={{ color }} aria-hidden="true" />;
}

function CrewChat({ person, color, messages, analyst, selected, onSelect }: {
  person: SimCrew;
  analyst: string;
  color: string;
  messages: SimulationState["messages"];
  selected: boolean;
  onSelect: () => void;
}) {
  const thread = messages.filter(({ crewId }) => crewId === person.id);
  return (
    <article className={styles.chat} data-selected={selected}>
      <button type="button" onClick={onSelect} className={styles.chatHeader}>
        <Dot color={color} />
        <span><strong>{person.name}</strong><small>{locationNames[locationAt(person.position)]}</small></span>
        {thread.length > 0 && <span className={styles.count} aria-label={`${thread.length} messages`}>{thread.length}</span>}
      </button>
      <div className={styles.thread} role="log" aria-label={`Messages for ${person.name}`}>
        {thread.length === 0 && <p className={styles.empty}>No instructions</p>}
        {thread.slice().reverse().map(({ id, message, at }) => (
          <div key={id} className={styles.message}>
            <span>{analyst} <time dateTime={at}>{timeLabel.format(new Date(at))}</time></span>
            <p>{message}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function floorStyle({ left, top, width, height }: DeckFloor) {
  return { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` };
}

export function SimulationConsole() {
  const [state, setState] = useState<SimulationState | null>(null);
  const [selected, setSelected] = useState<SimCrew["id"] | null>(null);
  const [preview, setPreview] = useState<{ id: SimCrew["id"]; position: Point } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [resetting, setResetting] = useState(false);
  const map = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const writes = useRef(Promise.resolve());
  const accept = (next: SimulationState) => setState((current) => !current || next.version > current.version ? next : current);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const response = await fetch(endpoint, {
          cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        accept(await response.json());
        setConnectionError(false);
      } catch {
        if (!controller.signal.aborted) setConnectionError(true);
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(refresh, 1500);
      }
    }
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);

  function save(update: SimulationUpdate) {
    writes.current = writes.current.then(async () => {
      setError(null);
      try {
        const response = await fetch(endpoint, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update),
        });
        if (!response.ok) throw new Error();
        accept(await response.json());
      } catch {
        setError(update.kind === "reset"
          ? "Could not restart the situation. Try again."
          : "Could not save the change. Try again.");
      }
    });
    return writes.current;
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, crewId: SimCrew["id"], locked: boolean) {
    if (locked || event.button !== 0 || !event.isPrimary) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { crewId, start: { x: event.clientX, y: event.clientY }, pointer: event.pointerId };
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId || !map.current) return;
    if (!current.position && Math.hypot(event.clientX - current.start.x, event.clientY - current.start.y) < 5) return;
    current.position = mapPoint(event, map.current);
    setPreview({ id: current.crewId, position: current.position });
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    drag.current = null;
    if (current.position) {
      const position = map.current ? mapPoint(event, map.current) : current.position;
      setPreview({ id: current.crewId, position });
      void save({ kind: "move", crewId: current.crewId, position })
        .finally(() => setPreview((value) => value?.position === position ? null : value));
    } else {
      setSelected(current.crewId);
    }
  }

  function cancelDrag() {
    drag.current = null;
    setPreview(null);
  }

  const member = state?.crew.find(({ id }) => id === selected);
  const decision = state?.decision;
  const affected = state?.crew.find(({ id }) => id === decision?.affectedCrewId);
  const progress = state && incidentProgress(state);
  const incidentStatus = progress?.severeFollowUp ? "critical" : decision?.status;
  const awaitingReview = (progress?.canResolve || progress?.sleepOnly) && !progress?.severeFollowUp;
  const arrived = progress?.arrivals.filter((arrival) => arrival.arrived).length ?? 0;
  const criticalReadings = new Map(state?.crew.map(({ id, telemetry }) => [id,
    assessTelemetry(telemetry).filter(({ severity }) => severity === "critical"),
  ]));
  const alerts = state?.crew.filter(({ id }) => criticalReadings.get(id)?.length) ?? [];
  const otherAlerts = alerts.filter(({ id }) => incidentStatus !== "critical" || affected?.id !== id);

  const tourContext: TourContext = {
    crewCount: state?.crew.length ?? 0,
    profileOpen: selected !== null,
    lowPulse: state?.crew.some(({ telemetry }) => telemetry.heartRateBpm <= CARDIAC_ARREST_MAX_BPM) ?? false,
    emergency: state ? cardiacArrestIncident(state) !== null : false,
  };

  return (
    <main className={`container-soma ${styles.console}`}>
      <header className={styles.top}>
        <Link href="/mission" className={styles.home}><Icon name="arrow_back" /> Mission dashboard</Link>
        <h1 className="text-display">Crew simulation</h1>
        <SimulationTour context={tourContext} ready={state !== null} />
      </header>

      {connectionError && <p role="alert" className={styles.error}>Lost connection to the simulator. Reconnecting…</p>}
      {!state ? <p role="status">Loading the simulator…</p> : (
        <>
          <div className={styles.workspace}>
            <section className={styles.mapCard}>
              <header className={styles.sectionHeader}>
                <div className={styles.mapTitleRow}>
                  <h2 className="text-headline">Ship layout</h2>
                  <Button type="button" variant="destructive" size="sm"
                    disabled={resetting}
                    onClick={() => {
                      setResetting(true);
                      setSelected(null);
                      cancelDrag();
                      void save({ kind: "reset" }).finally(() => setResetting(false));
                    }}>
                    {resetting ? "Restarting…" : "Restart situation"}
                  </Button>
                </div>
                <p>Click to see readings; drag to move.</p>
              </header>
              {state.crew.length === 0 && <p className={styles.empty} role="status">{emptyCrewMessage}</p>}
              <div ref={map} className={styles.map} aria-label="Ship layout" data-tour="map">
                <div className={styles.rooms} aria-hidden="true">
                  {corridorFloors.map((floor) => (
                    <div className={styles.corridor} key={floor.id} style={floorStyle(floor)} title={locationNames[floor.id]}>
                      <span>{floor.number}</span>
                    </div>
                  ))}
                  {roomIds.map((id) => {
                    const floor = roomFloor(id);
                    return (
                      <div className={styles.room} key={id} data-module={id} style={{ ...floorStyle(floor),
                        borderRadius: `${floor.radiusX / floor.width * 100}% / ${floor.radiusY / floor.height * 100}%`,
                      }}>
                        <span>{rooms[id]}</span>
                        <div className={styles.roomEquipment}>
                          {Object.values(equipment).filter(({ room }) => room === id).map(({ label }) => (
                            <small key={label}>{label}</small>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <AssignmentRoutes state={state} />
                {state.crew.map((crewMember, index) => {
                  const { id, name } = crewMember;
                  const position = preview?.id === id ? preview.position : crewMember.position;
                  const location = locationAt(position);
                  const critical = isCrewInDanger(state, crewMember);
                  return (
                    <button key={id} type="button" data-tour={index === 0 ? "crew-dot" : undefined}
                      className={styles.marker} data-critical={critical} data-locked={critical} data-corridor={isCorridor(location)} data-selected={selected === id}
                      style={{ "--marker-color": crewColor(state.crew, id), color: crewColor(state.crew, id), left: `${position.x}%`, top: `${position.y}%` } as CSSProperties}
                      aria-label={`${name}, ${locationNames[location]}${critical ? ", in danger: cannot be moved until they improve" : ""}`} aria-expanded={selected === id}
                      title={critical ? "In danger. Check their readings; you cannot move them until they improve." : "Drag to move or click to see their readings."}
                      onPointerDown={(event) => startDrag(event, id, critical)}
                      onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={cancelDrag}
                      onClick={(event) => { if (critical || event.detail === 0) setSelected(id); }}
                      onKeyDown={(event) => {
                        const offsets: Record<string, Point> = {
                          ArrowLeft: { x: -3, y: 0 }, ArrowRight: { x: 3, y: 0 },
                          ArrowUp: { x: 0, y: -3 }, ArrowDown: { x: 0, y: 3 },
                        };
                        const offset = offsets[event.key];
                        if (!offset) return;
                        event.preventDefault();
                        if (critical) return;
                        const clamp = (value: number) => Math.max(2, Math.min(98, value));
                        void save({ kind: "move", crewId: id, position: constrainToDeck({ x: clamp(position.x + offset.x), y: clamp(position.y + offset.y) }) });
                      }}
                    >
                      <span aria-hidden="true">{index + 1}</span>
                    </button>
                  );
                })}
              </div>
              {member && <CrewDetails key={member.id} member={member} color={crewColor(state.crew, member.id)} locked={isCrewInDanger(state, member)}
                canEdit={canEditTelemetry(state, member)}
                onClose={() => setSelected(null)} onUpdate={save} />}
            </section>

            <aside className={styles.overview}>
              <div className={styles.analysis} aria-live="polite" data-tour="evaluation">
                <header className={styles.analysisHeader}>
                  <h2 className="text-headline">Evaluation</h2>
                  <span className={styles.model}><Dot color="var(--signal)" /> {providerLabel(state.decision?.provider)}</span>
                </header>
                {otherAlerts.length > 0 && (
                  <div className={styles.decision} data-status="critical">
                    <strong>{incidentStatus === "critical" ? "Another crew member also needs help" : "There is a danger reading"}</strong>
                    <p>Open their profile and check the reading. Do not move them.</p>
                    {otherAlerts.map(({ id, name }) => (
                      <p key={id}>{name} · {criticalReadings.get(id)?.map(({ signal, value }) => `${telemetryLabels[signal]} ${value}`).join(", ")}</p>
                    ))}
                  </div>
                )}
                {state.phase === "pending" && <p className={styles.pending}><Dot color="var(--signal)" /> Checking how the crew is doing…</p>}
                {state.error && <p className={styles.error}>{state.error}</p>}
                {decision && (otherAlerts.length === 0 || decision.status !== "nominal") && (
                  <div className={styles.decision} data-status={awaitingReview ? "pending" : incidentStatus}>
                    <strong>{awaitingReview ? "Checking whether they are better" : statusLabel[incidentStatus ?? decision.status]}</strong>
                    {affected && <p>{affected.name} · {locationNames[locationAt(affected.position)]}</p>}
                    {affected && incidentStatus === "critical" &&
                      <p className={styles.actionHelp}>{canEditTelemetry(state, affected)
                        ? "Both have arrived. Open the profile and update their readings."
                        : "Move the two teammates according to their chats. Then you can change the readings."}</p>}
                    {affected && incidentStatus === "watch" &&
                      <p className={styles.actionHelp}>Check the readings of {affected.name}.</p>}
                    {incidentStatus === "resolved" &&
                      <p className={styles.actionHelp}>Their readings improved. You can move them now.</p>}
                    {decision.equipmentId && decision.instructions.some(({ via }) => via !== null) && (
                      <p>Equipment needed: {equipment[decision.equipmentId].label}</p>
                    )}
                    {progress && (
                      <div className={styles.incidentProgress}>
                        {progress.arrivals.length > 0 && (
                          <>
                            <p>Help on the way: {arrived} of {progress.arrivals.length} have arrived.</p>
                            <ul>
                              {progress.arrivals.map((arrival) => (
                                <li key={arrival.crewId}>
                                  <Dot color={crewColor(state.crew, arrival.crewId)} />
                                  <span>{state.crew.find(({ id }) => id === arrival.crewId)?.name}</span>
                                  <span data-arrived={arrival.arrived}>{arrival.arrived ? "Arrived"
                                    : arrival.pickup ? `Must pick up equipment in ${rooms[arrival.pickup]}` : `Must go to ${locationNames[arrival.destination]}`}</span>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                        {progress.readings.length > 0 && (
                          <details className={styles.readingDetails}>
                            <summary>View readings</summary>
                            {progress.readings.map(({ signal, value, min, max, corrected }) => (
                              <p key={signal} className={styles.metric}>{telemetryLabels[signal]} <strong>{value}</strong> · {corrected ? "Good" : `Target: ${min}–${max}`}</p>
                            ))}
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {cardiacArrestIncident(state) && (
                  <div className={styles.decision} data-status="critical" data-tour="experience">
                    <strong>{CPR_EXPERIENCE.title}</strong>
                    <p>{cardiacArrestIncident(state)?.name} has no reliable pulse. Start the guided experience.</p>
                    <Link href={CPR_EXPERIENCE.href}>Start the experience</Link>
                  </div>
                )}
                {state.phase === "idle" && <p>Move someone or change a reading to begin.</p>}
                {state.phase === "error" && <Button type="button" variant="outline" size="sm" className="justify-self-start"
                  onClick={() => void save({ kind: "retry" })}>Retry analysis</Button>}
              </div>
            </aside>
          </div>
          <section aria-label="Crew chats" className={styles.comms}>
            <h2>Crew chats</h2>
            {state.crew.length === 0 && <p className={styles.empty}>{emptyCrewMessage}</p>}
            <div className={styles.chatGrid}>
              {state.crew.map((person) => (
                <CrewChat key={person.id} person={person} color={crewColor(state.crew, person.id)} messages={state.messages} analyst={providerLabel(state.decision?.provider)}
                  selected={person.id === selected} onSelect={() => setSelected(person.id)} />
              ))}
            </div>
          </section>
          {error && <p role="alert" className={styles.error}>{error}</p>}
        </>
      )}
    </main>
  );
}
