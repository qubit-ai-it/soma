"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { BodyMap, type BodyMapSeverity } from "@/shared/ui/body-map";
import { Button } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/icon";
import { ZONE_REGION_IDS } from "@/features/crew/crew.body";
import { AssignmentRoutes } from "./assignment-routes";
import { SimulationGuide } from "./simulation-guide";
import { assessTelemetry, canEditTelemetry, incidentProgress, isCrewInDanger } from "./incident";
import { constrainToDeck, corridorFloors, isCorridor, locationAt, locationNames, roomFloor, type DeckFloor } from "./deck";
import {
  crewColorTokens, crewIds, equipment, roomIds, rooms,
  telemetryLabels, telemetrySchema,
  type Point, type SimCrew, type SimulationState, type SimulationUpdate, type Telemetry,
} from "./simulation";
import styles from "./simulation.module.css";

const endpoint = "/api/simulation";
const statusLabel = {
  nominal: "Todo está bien", watch: "Un tripulante necesita atención",
  critical: "Peligro: un tripulante necesita ayuda", resolved: "El tripulante ya está fuera de peligro",
};
const timeLabel = new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const crewColor = (id: SimCrew["id"]) => `var(${crewColorTokens[crewIds.indexOf(id)]})`;
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
    <label className={styles.field}>
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
          : "Informativo · sin alerta"}
      </span>
      {invalid && <small role="alert">Ingresa un valor válido entre {range.minValue} y {range.maxValue}.</small>}
    </label>
  );
}

function CrewDetails({ member, locked, canEdit, onClose, onUpdate }: {
  member: SimCrew;
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
    <section className={styles.details} aria-label={`Telemetría de ${member.name}`}>
      <header className={styles.cardHeader}>
        <div>
          <h3><Dot color={crewColor(member.id)} /> {member.name}</h3>
          <p>{locationNames[locationAt(member.position)]}</p>
        </div>
        <Button type="button" variant="outline" size="icon-sm" onClick={onClose} aria-label="Cerrar ficha">
          <Icon name="close" />
        </Button>
      </header>
      {locked && <p className={styles.dangerHelp}>{canEdit
        ? "Los dos compañeros ya llegaron. Puedes actualizar las lecturas, pero aún no mover al tripulante."
        : "En peligro: no lo muevas ni cambies sus lecturas hasta que dos compañeros aparezcan como «Ya llegó»."}</p>}
      {canEdit && <p className={styles.analysisHelp}>Al cambiar un valor, la IA revisa la situación. Una lectura fuera del rango puede generar una alerta; el sueño es informativo.</p>}
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
        <summary>Ver mapa corporal</summary>
        <BodyMap className="max-h-72 overflow-auto pt-3" label="Mapa corporal simulado" views={["front"]}
          value={regions} onValueChange={setRegions} severity={severity} showSummary={false} />
      </details>
    </section>
  );
}

function Dot({ color }: { color: string }) {
  return <span className={styles.dot} style={{ color }} aria-hidden="true" />;
}

function CrewChat({ person, messages, selected, onSelect }: {
  person: SimCrew;
  messages: SimulationState["messages"];
  selected: boolean;
  onSelect: () => void;
}) {
  const thread = messages.filter(({ crewId }) => crewId === person.id);
  return (
    <article className={styles.chat} data-selected={selected}>
      <button type="button" onClick={onSelect} className={styles.chatHeader}>
        <Dot color={crewColor(person.id)} />
        <span><strong>{person.name}</strong><small>{locationNames[locationAt(person.position)]}</small></span>
        {thread.length > 0 && <span className={styles.count} aria-label={`${thread.length} mensajes`}>{thread.length}</span>}
      </button>
      <div className={styles.thread} role="log" aria-label={`Mensajes para ${person.name}`}>
        {thread.length === 0 && <p className={styles.empty}>Sin instrucciones</p>}
        {thread.slice().reverse().map(({ id, message, at }) => (
          <div key={id} className={styles.message}>
            <span>MedGemma <time dateTime={at}>{timeLabel.format(new Date(at))}</time></span>
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
  const sessionId = useRef<string | null>(null);
  const writes = useRef(Promise.resolve());
  const accept = (next: SimulationState) => setState((current) => !current || next.version > current.version ? next : current);

  useEffect(() => {
    const controller = new AbortController();
    const id = crypto.randomUUID();
    sessionId.current = id;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const response = await fetch(endpoint, {
          cache: "no-store", signal: controller.signal,
          headers: { "x-simulation-session": id },
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
    return () => { controller.abort(); clearTimeout(timer); if (sessionId.current === id) sessionId.current = null; };
  }, []);

  function save(update: SimulationUpdate) {
    const id = sessionId.current;
    if (!id) return Promise.resolve();
    writes.current = writes.current.then(async () => {
      setError(null);
      try {
        const response = await fetch(endpoint, {
          method: "PATCH", headers: { "Content-Type": "application/json", "x-simulation-session": id }, body: JSON.stringify(update),
        });
        if (!response.ok) throw new Error();
        accept(await response.json());
      } catch {
        setError(update.kind === "reset"
          ? "No se pudo reiniciar la situación. Inténtalo de nuevo."
          : "No se pudo guardar el cambio. Inténtalo de nuevo.");
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

  return (
    <main className={`container-soma ${styles.console}`}>
      <header className={styles.top}>
        <Link href="/mission" className={styles.home}><Icon name="arrow_back" /> Panel de misión</Link>
        <h1 className="text-display">Simulación de tripulación</h1>
        <SimulationGuide />
      </header>

      {connectionError && <p role="alert" className={styles.error}>Se perdió la conexión con el simulador. Reconectando…</p>}
      {!state ? <p role="status">Cargando el simulador…</p> : (
        <>
          <div className={styles.workspace}>
            <section className={styles.mapCard}>
              <header className={styles.sectionHeader}>
                <div className={styles.mapTitleRow}>
                  <h2 className="text-headline">Plano de la nave</h2>
                  <Button type="button" variant="destructive" size="sm"
                    disabled={resetting}
                    onClick={() => {
                      setResetting(true);
                      setSelected(null);
                      cancelDrag();
                      void save({ kind: "reset" }).finally(() => setResetting(false));
                    }}>
                    {resetting ? "Reiniciando…" : "Reiniciar situación"}
                  </Button>
                </div>
                <p>Haz clic para ver lecturas; arrastra para mover.</p>
              </header>
              <div ref={map} className={styles.map} aria-label="Plano de la nave">
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
                    <button key={id} type="button"
                      className={styles.marker} data-critical={critical} data-locked={critical} data-corridor={isCorridor(location)} data-selected={selected === id}
                      style={{ "--marker-color": crewColor(id), color: crewColor(id), left: `${position.x}%`, top: `${position.y}%` } as CSSProperties}
                      aria-label={`${name}, ${locationNames[location]}${critical ? ", en peligro: no se puede mover hasta que mejore" : ""}`} aria-expanded={selected === id}
                      title={critical ? "Está en peligro. Revisa sus lecturas; no puedes moverlo hasta que mejore." : "Arrastra para mover o haz clic para ver sus lecturas."}
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
              {member && <CrewDetails key={member.id} member={member} locked={isCrewInDanger(state, member)}
                canEdit={canEditTelemetry(state, member)}
                onClose={() => setSelected(null)} onUpdate={save} />}
            </section>

            <aside className={styles.overview}>
              <div className={styles.analysis} aria-live="polite">
                <header className={styles.analysisHeader}>
                  <h2 className="text-headline">Evaluación</h2>
                  <span className={styles.model}><Dot color="var(--signal)" /> MedGemma</span>
                </header>
                {otherAlerts.length > 0 && (
                  <div className={styles.decision} data-status="critical">
                    <strong>{incidentStatus === "critical" ? "Otro tripulante también necesita ayuda" : "Hay una lectura de peligro"}</strong>
                    <p>Abre su ficha y revisa la lectura. No lo muevas.</p>
                    {otherAlerts.map(({ id, name }) => (
                      <p key={id}>{name} · {criticalReadings.get(id)?.map(({ signal, value }) => `${telemetryLabels[signal]} ${value}`).join(", ")}</p>
                    ))}
                  </div>
                )}
                {state.phase === "pending" && <p className={styles.pending}><Dot color="var(--signal)" /> Comprobando cómo está la tripulación…</p>}
                {state.error && <p className={styles.error}>{state.error}</p>}
                {decision && (otherAlerts.length === 0 || decision.status !== "nominal") && (
                  <div className={styles.decision} data-status={awaitingReview ? "pending" : incidentStatus}>
                    <strong>{awaitingReview ? "Comprobando si ya está mejor" : statusLabel[incidentStatus ?? decision.status]}</strong>
                    {affected && <p>{affected.name} · {locationNames[locationAt(affected.position)]}</p>}
                    {affected && incidentStatus === "critical" &&
                      <p className={styles.actionHelp}>{canEditTelemetry(state, affected)
                        ? "Los dos llegaron. Abre la ficha y actualiza sus lecturas."
                        : "Mueve a los dos compañeros según sus chats. Después podrás cambiar las lecturas."}</p>}
                    {affected && incidentStatus === "watch" &&
                      <p className={styles.actionHelp}>Revisa las lecturas de {affected.name}.</p>}
                    {incidentStatus === "resolved" &&
                      <p className={styles.actionHelp}>Sus lecturas mejoraron. Ya puedes moverlo.</p>}
                    {decision.equipmentId && decision.instructions.some(({ via }) => via !== null) && (
                      <p>Equipo necesario: {equipment[decision.equipmentId].label}</p>
                    )}
                    {progress && (
                      <div className={styles.incidentProgress}>
                        {progress.arrivals.length > 0 && (
                          <>
                            <p>Ayuda en camino: {arrived} de {progress.arrivals.length} llegaron.</p>
                            <ul>
                              {progress.arrivals.map((arrival) => (
                                <li key={arrival.crewId}>
                                  <Dot color={crewColor(arrival.crewId)} />
                                  <span>{state.crew.find(({ id }) => id === arrival.crewId)?.name}</span>
                                  <span data-arrived={arrival.arrived}>{arrival.arrived ? "Ya llegó"
                                    : arrival.pickup ? `Debe recoger equipo en ${rooms[arrival.pickup]}` : `Debe ir a ${locationNames[arrival.destination]}`}</span>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                        {progress.readings.length > 0 && (
                          <details className={styles.readingDetails}>
                            <summary>Ver lecturas</summary>
                            {progress.readings.map(({ signal, value, min, max, corrected }) => (
                              <p key={signal} className={styles.metric}>{telemetryLabels[signal]} <strong>{value}</strong> · {corrected ? "Bien" : `Meta: ${min}–${max}`}</p>
                            ))}
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {state.phase === "idle" && <p>Mueve a alguien o cambia una lectura para comenzar.</p>}
                {state.phase === "error" && <Button type="button" variant="outline" size="sm" className="justify-self-start"
                  onClick={() => void save({ kind: "retry" })}>Reintentar análisis</Button>}
              </div>
            </aside>
          </div>
          <section aria-label="Chats de la tripulación" className={styles.comms}>
            <h2>Chats de la tripulación</h2>
            <div className={styles.chatGrid}>
              {state.crew.map((person) => (
                <CrewChat key={person.id} person={person} messages={state.messages}
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
