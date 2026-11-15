import "server-only";

import { z } from "zod";
import { getConfig } from "../../server/config.ts";
import { requestOllamaChat } from "../../server/ollama-chat.ts";
import { err, ok } from "../../shared/result.ts";
import { corridorFloors, locationAt, locationNames } from "./deck.ts";
import { dispatchResponse } from "./dispatch.ts";
import { alertSignals, assessTelemetry, equipmentFor, incidentOptions, incidentProgress, validIncidentTransition } from "./incident.ts";
import {
  equipment, equipmentIdSchema,
  type Decision, type SimulationState,
} from "./simulation.ts";

const prompt = [
  "Eres MedGemma y coordinas un ejercicio ficticio dentro de una nave. Evalúa el pulso, SpO2, presión sistólica y diastólica y dosis acumulada. Las horas de sueño son un dato informativo: no generan alertas, tareas ni condiciones de cierre.",
  "Cada lectura incluye su valor, rango y gravedad según el ejercicio. Usa las variaciones recientes y las combinaciones de lecturas para decidir. Una desviación leve y estable, como SpO2 93 %, es watch. Da prioridad a las lecturas críticas. Mientras haya una asignación crítica en tránsito, el plan actual debe seguir activo.",
  "Elige un tripulante de los IDs permitidos. Devuelve los nombres de las señales fuera de rango que motivan la decisión. Si espera al equipo con las lecturas corregidas, conserva sus señales originales. Si procede cerrar o no hay caso, usa affectedCrewId null, signals [] y equipmentId null.",
  "En un caso crítico, elige equipmentId de equipmentOptions del afectado cuando el equipo ayude a verificar o coordinar el ejercicio. Para SpO2 usa oxímetro, para presión usa tensiómetro, para dosis usa dosímetro. El desfibrilador se puede trasladar en el ejercicio de pulso cero. Usa null cuando no haga falta trasladar ningún instrumento o el caso esté en atención.",
  "location indica el módulo o el pasillo numerado en el que está cada tripulante. El destino del aviso es esa ubicación exacta. La aplicación asigna las rutas y envía los mensajes según la decisión. No indiques tratamientos ni procedimientos.",
].join("\n");

export async function evaluateSimulation(state: SimulationState) {
  const { url, model, authorization } = getConfig().chat;
  if (!url) return err("Configura CHAT_OLLAMA_URL para activar MedGemma.");

  const progress = incidentProgress(state);
  const { statuses, affectedIds } = incidentOptions(state, progress);
  const previous = state.decision;
  const keepCurrentEquipment = previous?.status === "critical"
    && progress?.arrivals.some(({ arrived }) => !arrived) && !progress.severeFollowUp;
  const previousEquipment = previous?.equipmentId ?? (
    previous?.equipmentId === undefined && previous?.instructions.some(({ via }) => via === equipment.desfibrilador.room)
      ? "desfibrilador" : null
  );
  const crew = state.crew.map((member) => {
    const readings = assessTelemetry(member.telemetry);
    const equipmentOptions = keepCurrentEquipment && member.id === previous?.affectedCrewId
      ? previousEquipment ? [previousEquipment] : []
      : equipmentFor(member.telemetry);
    return {
      ...member, readings, equipmentOptions, location: locationAt(member.position),
      available: !readings.some(({ severity }) => severity === "critical"),
    };
  });
  const tools = [...new Set(crew.filter(({ id }) => affectedIds.includes(id)).flatMap(({ equipmentOptions }) => equipmentOptions))];
  const schema = z.object({
    status: z.enum(statuses),
    affectedCrewId: affectedIds.length ? z.enum(affectedIds) : z.null(),
    signals: z.array(z.enum(alertSignals)).max(alertSignals.length),
    equipmentId: tools.length ? equipmentIdSchema.extract(tools).nullable() : z.null(),
  });
  const format = z.toJSONSchema(schema);
  delete format.$schema;

  const response = await requestOllamaChat({
    url,
    timeoutMs: 120_000,
    headers: {
      "ngrok-skip-browser-warning": "1",
      ...(authorization ? { authorization } : {}),
    },
  }, {
    model,
    format,
    options: { temperature: 0 },
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: JSON.stringify({
          crew, locations: locationNames,
          corridors: corridorFloors.map(({ id, from, to }) => ({ id, from, to })),
          equipment, incidentProgress: progress,
          previousDecision: previous, changes: state.changes.slice(-5),
        }),
      },
    ],
  });

  if (!response.ok) {
    console.error("[simulacion]", response.error);
    return err("MedGemma no respondió. Puedes reintentar el análisis.");
  }
  const output = schema.safeParse(parseJson(response.value));
  if (!output.success) return err("MedGemma devolvió un plan inválido. Puedes reintentar el análisis.");

  const { status, affectedCrewId, signals, equipmentId } = output.data;
  const affected = crew.find(({ id }) => id === affectedCrewId);
  const currentCase = previous?.affectedCrewId === affectedCrewId && !progress?.sleepOnly;
  const abnormal = affected?.readings.filter(({ corrected }) => !corrected) ?? [];
  const selected = abnormal.filter(({ signal, severity }) => severity === "critical" || signals.includes(signal));
  const evidence = selected.length ? selected : abnormal;
  const assessedSignals = evidence.length ? evidence.map(({ signal }) => signal)
    : affected && currentCase ? previous?.signals.filter((signal) => signal !== "sleepHours") ?? [] : [];
  const selectedTool = status === "critical" && affected
    ? keepCurrentEquipment && currentCase ? previousEquipment
      : equipmentId && affected.equipmentOptions.includes(equipmentId) ? equipmentId : null
    : null;
  const previousInstructions = currentCase ? previous?.instructions.map((instruction) => previousEquipment === selectedTool
    ? instruction : { ...instruction, equipmentCollected: undefined }) : [];
  const decision: Decision = {
    status, affectedCrewId, equipmentId: selectedTool,
    signals: assessedSignals,
    instructions: status === "critical" && affected
      ? dispatchResponse(state.crew, affected, selectedTool, previousInstructions, assessedSignals)
      : [],
  };
  return validIncidentTransition(state, decision)
    ? ok(decision)
    : err("MedGemma devolvió una transición incompatible con el incidente. Puedes reintentar el análisis.");
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
