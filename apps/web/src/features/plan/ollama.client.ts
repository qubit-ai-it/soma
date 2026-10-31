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

function buildMessages(input: PlanInput) {
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
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_OLLAMA_TIMEOUT_MS;
  const url = `${options.baseUrl.replace(/\/+$/, "")}/api/chat`;

  return {
    async draft(input) {
      let content: unknown;
      try {
        const response = await doFetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model: options.model,
            messages: buildMessages(input),
            stream: false,
            format: plannerOutputJsonSchema,
            options: { temperature: 0 },
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) return err(`Ollama answered HTTP ${response.status}`);
        const body: unknown = await response.json();
        content = (body as { message?: { content?: unknown } } | null)?.message?.content;
      } catch {
        return err("Ollama is unreachable, timed out or sent an unreadable body");
      }

      if (typeof content !== "string") return err("Ollama response has no message content");
      let json: unknown;
      try {
        json = JSON.parse(content);
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
