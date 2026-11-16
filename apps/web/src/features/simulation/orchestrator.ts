import "server-only";

import { z } from "zod";
import { getConfig } from "../../server/config.ts";
import { requestGeminiJson } from "../../server/gemini-chat.ts";
import { requestOllamaChat } from "../../server/ollama-chat.ts";
import { err, ok } from "../../shared/result.ts";
import { corridorFloors, locationAt, locationNames } from "./deck.ts";
import { dispatchResponse } from "./dispatch.ts";
import { alertSignals, assessTelemetry, equipmentFor, incidentOptions, incidentProgress, validIncidentTransition } from "./incident.ts";
import { PROVIDER_LABELS, pickProvider } from "./simulation.provider.ts";
import {
  equipment, equipmentIdSchema,
  type Decision, type SimulationState,
} from "./simulation.ts";

const buildPrompt = (analyst: string) => [
  `You are ${analyst} and you coordinate a fictional exercise aboard a spacecraft. Evaluate pulse, SpO2, systolic and diastolic pressure, and cumulative dose. Sleep hours are informational: they do not generate alerts, tasks, or closing conditions. Write in English.`,
  "Each reading includes its value, range, and severity for the exercise. Use recent changes and combinations of readings to decide. A mild, stable deviation, such as SpO2 93 %, is watch. Prioritize critical readings. While a critical assignment is in transit, the current plan must stay active.",
  "Choose one crew member from the allowed IDs. Return the names of the out-of-range signals that drive the decision. If the case is waiting for equipment with corrected readings, keep its original signals. If it should be closed or there is no case, use affectedCrewId null, signals [] and equipmentId null.",
  "In a critical case, choose equipmentId from the affected member's equipmentOptions when the equipment helps verify or coordinate the exercise. For SpO2 use the oximeter, for pressure use the blood pressure monitor, for dose use the dosimeter. The defibrillator can be moved in the zero-pulse exercise. Use null when no instrument needs to be moved or the case is already being attended.",
  "location is the module or numbered corridor where each crew member is. The destination of the notice is that exact location. The application assigns the routes and sends the messages based on the decision. Do not state treatments or procedures.",
].join("\n");

export async function evaluateSimulation(state: SimulationState) {
  const { chat, gemini } = getConfig();
  const provider = pickProvider({ chatUrl: chat.url, geminiApiKey: gemini.apiKey });
  if (!provider) return err("Set CHAT_OLLAMA_URL (MedGemma) or GEMINI_API_KEY (Gemini) to enable the analysis.");
  const analyst = PROVIDER_LABELS[provider];

  const progress = incidentProgress(state);
  const { statuses, affectedIds } = incidentOptions(state, progress);
  const previous = state.decision;
  const keepCurrentEquipment = previous?.status === "critical"
    && progress?.arrivals.some(({ arrived }) => !arrived) && !progress.severeFollowUp;
  const previousEquipment = previous?.equipmentId ?? (
    previous?.equipmentId === undefined && previous?.instructions.some(({ via }) => via === equipment.defibrillator.room)
      ? "defibrillator" : null
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

  const system = buildPrompt(analyst);
  const user = JSON.stringify({
    crew, locations: locationNames,
    corridors: corridorFloors.map(({ id, from, to }) => ({ id, from, to })),
    equipment, incidentProgress: progress,
    previousDecision: previous, changes: state.changes.slice(-5),
  });
  const response = provider === "gemini"
    ? await requestGeminiJson(
      { apiKey: gemini.apiKey!, model: gemini.model, timeoutMs: 120_000 },
      { system, user, schema: format },
    )
    : await requestOllamaChat({
      url: chat.url!,
      timeoutMs: 120_000,
      headers: {
        "ngrok-skip-browser-warning": "1",
        ...(chat.authorization ? { authorization: chat.authorization } : {}),
      },
    }, {
      model: chat.model,
      format,
      options: { temperature: 0 },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

  if (!response.ok) {
    console.error("[simulation]", response.error);
    return err(`${analyst} did not respond. You can retry the analysis.`);
  }
  const output = schema.safeParse(parseJson(response.value));
  if (!output.success) return err(`${analyst} returned an invalid plan. You can retry the analysis.`);

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
    provider,
  };
  return validIncidentTransition(state, decision)
    ? ok(decision)
    : err(`${analyst} returned a transition that is incompatible with the incident. You can retry the analysis.`);
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
