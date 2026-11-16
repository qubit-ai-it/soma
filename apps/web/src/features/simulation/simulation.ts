import { z } from "zod";

export const roomIdSchema = z.enum(["mando", "pasillo", "laboratorio", "habitat", "medica", "ingenieria"]);
export type RoomId = z.infer<typeof roomIdSchema>;

export const rooms = {
  mando: "Mando",
  pasillo: "Pasillo central",
  laboratorio: "Laboratorio",
  habitat: "Hábitat",
  medica: "Área médica",
  ingenieria: "Ingeniería",
} satisfies Record<RoomId, string>;

export const roomIds = roomIdSchema.options;

export const corridorIds = ["pasillo-1", "pasillo-2", "pasillo-3", "pasillo-4", "pasillo-5", "pasillo-6", "pasillo-7"] as const;
const corridorIdSchema = z.enum(corridorIds);
export type CorridorId = z.infer<typeof corridorIdSchema>;
export const locationIdSchema = z.union([roomIdSchema, corridorIdSchema]);
export type LocationId = z.infer<typeof locationIdSchema>;

export const equipmentIds = ["desfibrilador", "oximetro", "tensiometro", "dosimetro"] as const;
export const equipmentIdSchema = z.enum(equipmentIds);
export type EquipmentId = z.infer<typeof equipmentIdSchema>;
export const equipment = {
  desfibrilador: { label: "Desfibrilador", room: "medica" },
  oximetro: { label: "Oxímetro", room: "medica" },
  tensiometro: { label: "Tensiómetro", room: "medica" },
  dosimetro: { label: "Dosímetro", room: "ingenieria" },
} satisfies Record<EquipmentId, { label: string; room: RoomId }>;

export const pointSchema = z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) });
export type Point = z.infer<typeof pointSchema>;

export function roomCenter(id: RoomId): Point {
  const index = roomIds.indexOf(id);
  return { x: ((index % 3) + 0.5) * 100 / 3, y: index < 3 ? 25 : 75 };
}

export const crewIdSchema = z.enum(["cm-01", "cm-02", "cm-03", "cm-04"]);
export type CrewId = z.infer<typeof crewIdSchema>;
export const crewIds = crewIdSchema.options;
export const crewColorTokens = ["--crew-cyan", "--crew-lavender", "--crew-mint", "--crew-amber"];

export const telemetrySchema = z.object({
  heartRateBpm: z.number().int().min(0).max(300),
  spo2Pct: z.number().min(0).max(100),
  systolic: z.number().int().min(0).max(300),
  diastolic: z.number().int().min(0).max(200),
  sleepHours: z.number().min(0).max(24),
  cumulativeDoseMsv: z.number().min(0).max(10_000),
});

export type Telemetry = z.infer<typeof telemetrySchema>;
export type SimCrew = {
  id: CrewId;
  name: string;
  role: string;
  position: Point;
  telemetry: Telemetry;
  updatedAt: string | null;
};

export const telemetryLabels: Record<keyof Telemetry, string> = {
  heartRateBpm: "Pulso · lpm",
  spo2Pct: "SpO₂ · %",
  systolic: "Presión sistólica · mmHg",
  diastolic: "Presión diastólica · mmHg",
  sleepHours: "Sueño · h",
  cumulativeDoseMsv: "Dosis · mSv",
};

export const updateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("move"), crewId: crewIdSchema, position: pointSchema }),
  z.object({ kind: z.literal("telemetry"), crewId: crewIdSchema, telemetry: telemetrySchema.partial() })
    .refine(({ telemetry }) => Object.keys(telemetry).length > 0),
  z.object({ kind: z.literal("retry") }),
  z.object({ kind: z.literal("reset") }),
]);
export type SimulationUpdate = z.infer<typeof updateSchema>;

const instructionSchema = z.object({
  crewId: crewIdSchema,
  message: z.string().trim().min(1).max(500),
  destination: locationIdSchema.nullable(),
  via: roomIdSchema.nullable(),
  equipmentCollected: z.boolean().optional(),
});

export const decisionSchema = z.object({
  status: z.enum(["nominal", "watch", "critical", "resolved"]),
  affectedCrewId: crewIdSchema.nullable(),
  signals: z.array(telemetrySchema.keyof()).max(6),
  equipmentId: equipmentIdSchema.nullable().optional(),
  instructions: z.array(instructionSchema).max(5),
});

export type Instruction = z.infer<typeof instructionSchema>;
export type Decision = z.infer<typeof decisionSchema>;
export type ChatEntry = Instruction & { id: string; at: string };
export type SimulationChange = {
  crewId: CrewId;
  at: string;
  before: Partial<Telemetry> | Point;
  after: Partial<Telemetry> | Point;
  kind: "move" | "telemetry";
};
export type SimulationState = {
  revision: number;
  version: number;
  phase: "idle" | "pending" | "done" | "error";
  crew: SimCrew[];
  changes: SimulationChange[];
  decision: Decision | null;
  incidentOpenedWith?: Telemetry;
  messages: ChatEntry[];
  error?: string;
};
