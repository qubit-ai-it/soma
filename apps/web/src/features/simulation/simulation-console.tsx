"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { BodyMap, type BodyMapSeverity } from "@/shared/ui/body-map";
import { Button } from "@/shared/ui/button";
import { ZONE_REGION_IDS } from "@/features/crew/crew.body";
import { AssignmentRoutes } from "./assignment-routes";
import { assessTelemetry, incidentProgress } from "./incident";
import { corridorFloors, roomFloor } from "./dispatch";
import {
  crewColors, crewIds, equipment, roomAt, roomIds, rooms,
  telemetryLabels, telemetrySchema,
  type Point, type SimCrew, type SimulationState, type SimulationUpdate, type Telemetry,
} from "./simulation";
import styles from "./simulation.module.css";

const endpoint = "/api/simulacion";
const statusLabel = {
  nominal: "Sin incidente", watch: "En atención", critical: "Incidente crítico", resolved: "Incidente resuelto",
};
const timeLabel = new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const crewColor = (id: SimCrew["id"]) => crewColors[crewIds.indexOf(id)];
const bodySignals: Record<keyof typeof ZONE_REGION_IDS, (keyof Telemetry)[]> = {
  head: [],
  thorax: ["heartRateBpm", "spo2Pct", "systolic", "diastolic"],
  "abdomen-pelvis": ["cumulativeDoseMsv"],
};

type Drag = { crewId: SimCrew["id"]; start: Point; pointer: number; position?: Point };

function mapPoint(event: PointerEvent, map: HTMLDivElement): Point {
  const box = map.getBoundingClientRect();
  const percent = (offset: number, size: number) => Math.round(Math.min(98, Math.max(2, offset * 100 / size)) * 10) / 10;
  return { x: percent(event.clientX - box.left, box.width), y: percent(event.clientY - box.top, box.height) };
}

function TelemetryInput({ name, value, onChange }: {
  name: keyof Telemetry;
  value: number;
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
      {invalid && <small role="alert">Ingresa un valor válido entre {range.minValue} y {range.maxValue}.</small>}
    </label>
  );
}

function CrewDetails({ member, onClose, onUpdate }: {
  member: SimCrew;
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
          <p>{rooms[roomAt(member.position)]} · {member.position.x}, {member.position.y}</p>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar ficha">×</button>
      </header>
      <div className={styles.fields}>
        {(Object.keys(telemetryLabels) as (keyof Telemetry)[]).map((name) => (
          <TelemetryInput key={name} name={name} value={member.telemetry[name]}
            onChange={(value) => onUpdate({ kind: "telemetry", crewId: member.id, telemetry: { [name]: value } })} />
        ))}
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

function floorStyle({ left, top, width, height }: ReturnType<typeof roomFloor>) {
  return { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` };
}

export function SimulationConsole() {
  const [state, setState] = useState<SimulationState | null>(null);
  const [selected, setSelected] = useState<SimCrew["id"] | null>(null);
  const [preview, setPreview] = useState<{ id: SimCrew["id"]; position: Point } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [clearingMessages, setClearingMessages] = useState(false);
  const map = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const writes = useRef(Promise.resolve());
  const accept = (next: SimulationState) => setState((current) => !current || next.version > current.version ? next : current);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
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
        setError(update.kind === "clear-messages"
          ? "No se pudieron limpiar los chats. Inténtalo de nuevo."
          : "No se pudo guardar el cambio. Inténtalo de nuevo.");
      }
    });
    return writes.current;
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, crewId: SimCrew["id"]) {
    if (event.button !== 0 || !event.isPrimary) return;
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

  return (
    <main className={styles.console}>
      <header className={styles.top}>
        <div>
          <Link href="/" className={styles.home}>← Soma</Link>
          <h1>Simulación de tripulación</h1>
        </div>
        <span className={styles.model}><Dot color="#61edb3" /> MedGemma <span>· Simulación</span></span>
      </header>

      {connectionError && <p role="alert" className={styles.error}>Se perdió la conexión con el simulador. Reconectando…</p>}
      {!state ? <p role="status">Cargando el simulador…</p> : (
        <>
          <div className={styles.workspace}>
            <section className={styles.mapCard}>
              <header className={styles.sectionHeader}>
                <div>
                  <h2>Plano de la nave</h2>
                  <p>Haz clic para ver la ficha. Arrastra un punto para mover al tripulante.</p>
                </div>
              </header>
              <div ref={map} className={styles.map} aria-label="Plano de la nave">
                <div className={styles.rooms} aria-hidden="true">
                  {corridorFloors.map((floor) => (
                    <div className={styles.corridor} key={`${floor.left}-${floor.top}`} style={floorStyle(floor)} />
                  ))}
                  {roomIds.map((id) => (
                    <div className={styles.room} key={id} data-module={id} style={floorStyle(roomFloor(id))}>
                      <span>{rooms[id]}</span>
                      <div className={styles.roomEquipment}>
                        {Object.values(equipment).filter(({ room }) => room === id).map(({ label }) => (
                          <small key={label}>{label}</small>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <AssignmentRoutes state={state} />
                {state.crew.map((crewMember, index) => {
                  const { id, name } = crewMember;
                  const position = preview?.id === id ? preview.position : crewMember.position;
                  const readingAlert = criticalReadings.get(id)?.length;
                  const critical = !!readingAlert || (incidentStatus === "critical" && decision?.affectedCrewId === id);
                  return (
                    <button key={id} type="button"
                      className={styles.marker} data-critical={critical} data-selected={selected === id}
                      style={{ "--marker-color": crewColor(id), color: crewColor(id), left: `${position.x}%`, top: `${position.y}%` } as CSSProperties}
                      aria-label={`${name}, ${rooms[roomAt(position)]}${critical ? ", alerta crítica" : ""}`} aria-expanded={selected === id}
                      onPointerDown={(event) => startDrag(event, id)}
                      onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={cancelDrag}
                      onClick={(event) => { if (event.detail === 0) setSelected(id); }}
                      onKeyDown={(event) => {
                        const offsets: Record<string, Point> = {
                          ArrowLeft: { x: -3, y: 0 }, ArrowRight: { x: 3, y: 0 },
                          ArrowUp: { x: 0, y: -3 }, ArrowDown: { x: 0, y: 3 },
                        };
                        const offset = offsets[event.key];
                        if (!offset) return;
                        event.preventDefault();
                        const clamp = (value: number) => Math.max(2, Math.min(98, value));
                        void save({ kind: "move", crewId: id, position: { x: clamp(position.x + offset.x), y: clamp(position.y + offset.y) } });
                      }}
                    >
                      <span aria-hidden="true">{index + 1}</span>
                    </button>
                  );
                })}
              </div>
              {member && <CrewDetails key={member.id} member={member} onClose={() => setSelected(null)} onUpdate={save} />}
            </section>

            <aside className={styles.overview}>
              <div className={styles.analysis} aria-live="polite">
                <h2>Evaluación de MedGemma</h2>
                {alerts.length > 0 && (
                  <div className={styles.decision} data-status="critical">
                    <strong>Lecturas críticas</strong>
                    {alerts.map(({ id, name }) => (
                      <p key={id}>{name} · {criticalReadings.get(id)?.map(({ signal, value }) => `${telemetryLabels[signal]} ${value}`).join(", ")}</p>
                    ))}
                  </div>
                )}
                {state.phase === "pending" && <p className={styles.pending}><Dot color="#69e7ff" /> Evaluando con MedGemma…</p>}
                {state.error && <p className={styles.error}>{state.error}</p>}
                {decision && (alerts.length === 0 || decision.status !== "nominal") && (
                  <div className={styles.decision} data-status={awaitingReview ? "watch" : incidentStatus}>
                    <strong>{awaitingReview ? "Reevaluación pendiente" : statusLabel[incidentStatus ?? decision.status]}</strong>
                    {affected && <p>{affected.name} · {rooms[roomAt(affected.position)]}</p>}
                    {decision.equipmentId && decision.instructions.some(({ via }) => via !== null) && (
                      <p>Equipo asignado · {equipment[decision.equipmentId].label}</p>
                    )}
                    {progress && (
                      <div className={styles.incidentProgress}>
                        {progress.arrivals.length > 0 && (
                          <>
                            <p>{arrived} de {progress.arrivals.length} en destino</p>
                            <ul>
                              {progress.arrivals.map((arrival) => (
                                <li key={arrival.crewId}>
                                  <Dot color={crewColor(arrival.crewId)} />
                                  <span>{state.crew.find(({ id }) => id === arrival.crewId)?.name}</span>
                                  <span data-arrived={arrival.arrived}>{arrival.arrived ? "En destino"
                                    : arrival.pickup ? `Recogida en ${rooms[arrival.pickup]}` : `Rumbo a ${rooms[arrival.destination]}`}</span>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                        {arrived === progress.arrivals.length && state.phase !== "error" && (
                          <p>{progress.canResolve ? "Reevaluando las lecturas con MedGemma…" : "En espera de la corrección de telemetría."}</p>
                        )}
                        {progress.readings.map(({ signal, value, min, max, corrected }) => (
                          <p key={signal}>{telemetryLabels[signal]} {value} · {corrected ? "Corregido" : `Rango del ejercicio: ${min}–${max}`}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {state.phase === "idle" && <p>Modifica una lectura o mueve un tripulante para iniciar el análisis.</p>}
                {state.phase === "error" && <button type="button" className={styles.retry}
                  onClick={() => void save({ kind: "retry" })}>Reintentar análisis</button>}
              </div>
              <div className={styles.roster}>
                {state.crew.map((person) => (
                  <button type="button" key={person.id} data-selected={person.id === selected} onClick={() => setSelected(person.id)}>
                    <Dot color={crewColor(person.id)} />
                    <strong>{person.name}</strong>
                    <small>{rooms[roomAt(person.position)]}{!!criticalReadings.get(person.id)?.length && (
                      <span className={styles.rosterAlert}> · Alerta crítica</span>
                    )}</small>
                  </button>
                ))}
              </div>
            </aside>
          </div>

          {error && <p role="alert" className={styles.error}>{error}</p>}
          <section aria-label="Chats de la tripulación" className={styles.comms}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Chats de la tripulación</h2>
                <p>MedGemma entrega cada instrucción al chat de su destinatario.</p>
              </div>
              <Button type="button" variant="destructive" size="sm"
                disabled={clearingMessages || state.messages.length === 0}
                onClick={() => {
                  setClearingMessages(true);
                  void save({ kind: "clear-messages" }).finally(() => setClearingMessages(false));
                }}>
                {clearingMessages ? "Limpiando…" : "Limpiar chats"}
              </Button>
            </div>
            <div className={styles.chatGrid}>
              {state.crew.map((person) => {
                const messages = state.messages.filter(({ crewId }) => crewId === person.id);
                return (
                  <article key={person.id} className={styles.chat} data-selected={person.id === selected}>
                    <button type="button" onClick={() => setSelected(person.id)} className={styles.chatHeader}>
                      <Dot color={crewColor(person.id)} />
                      <span><strong>{person.name}</strong><small>{rooms[roomAt(person.position)]}</small></span>
                      {messages.length > 0 && <span className={styles.count} aria-label={`${messages.length} mensajes`}>{messages.length}</span>}
                    </button>
                    <div className={styles.thread} role="log" aria-label={`Mensajes para ${person.name}`}>
                      {messages.length === 0 && <p className={styles.empty}>Sin instrucciones</p>}
                      {messages.slice().reverse().map(({ id, message, at }) => (
                        <div key={id} className={styles.message}>
                          <span>MedGemma <time dateTime={at}>{timeLabel.format(new Date(at))}</time></span>
                          <p>{message}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
