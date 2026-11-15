import { requestOllamaChat, type OllamaMessage } from "../../server/ollama-chat.ts";
import { err, ok } from "../../shared/result.ts";
import type { CarePlanner, PlanInput } from "./planner.port.ts";
import { plannerOutputJsonSchema, plannerOutputSchema } from "./planner.schema.ts";

export type OllamaPlannerOptions = {
  baseUrl: string;
  model: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
};

// A local 4B model can take a while to load and answer; this bound is an assumption
export const DEFAULT_OLLAMA_TIMEOUT_MS = 60_000;

const SYSTEM_PROMPT = [
  "You draft a short, generic care routine for a spaceflight crew member.",
  "Your output is a preliminary draft for a flight surgeon to review, never a diagnosis or a prescription.",
  "Do not name medications or doses. Write in Spanish.",
  "State in `uncertainty` what the draft does not know.",
].join(" ");

function buildMessages(input: PlanInput): OllamaMessage[] {
  const concerns = input.concerns.length ? input.concerns.join("; ") : "none";
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        `Risk level: ${input.riskLevel}`,
        `Flagged concerns: ${concerns}`,
        "Reply only with JSON that matches this JSON schema:",
        JSON.stringify(plannerOutputJsonSchema),
      ].join("\n"),
    },
  ];
}

export function createOllamaPlanner(options: OllamaPlannerOptions): CarePlanner {
  const connection = {
    url: `${options.baseUrl.replace(/\/+$/, "")}/api/chat`,
    timeoutMs: options.timeoutMs ?? DEFAULT_OLLAMA_TIMEOUT_MS,
    fetch: options.fetch,
  };

  return {
    async draft(input) {
      const result = await requestOllamaChat(connection, {
        model: options.model,
        messages: buildMessages(input),
        format: plannerOutputJsonSchema,
        options: { temperature: 0 },
      });
      if (!result.ok) return result;
      let json: unknown;
      try {
        json = JSON.parse(result.value);
      } catch {
        return err("Ollama output is not valid JSON");
      }
      const parsed = plannerOutputSchema.safeParse(json);
      if (!parsed.success) return err("Ollama output does not match the plan schema");

      return ok({
        ...parsed.data,
        requiresHumanValidation: true as const,
        source: {
          provider: "ollama",
          mode: "live" as const,
          fetchedAt: new Date().toISOString(),
        },
      });
    },
  };
}
