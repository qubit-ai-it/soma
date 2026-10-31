import { err, ok, type Result } from "../../shared/result.ts";
import {
  systemOneResponseSchema,
  type SystemOneResponse,
} from "./system-one.schema.ts";

export type SystemOneQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
};

export type SystemOneRequest = {
  model: string;
  state: unknown;
  questions: Record<string, SystemOneQuestion>;
};

export type SystemOneErrorKind =
  | "unauthorized"
  | "rate-limited"
  | "overloaded"
  | "rejected"
  | "invalid-response"
  | "network";

export type SystemOneError = {
  kind: SystemOneErrorKind;
  message: string;
  status?: number;
};

export type RetryPolicy = {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

export type SystemOneClientOptions = {
  baseUrl: string;
  apiKey?: string;
  maxChoices?: number;
  retry?: RetryPolicy;
  timeoutMs?: number;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

export type SystemOneClient = {
  ask(request: SystemOneRequest): Promise<Result<SystemOneResponse, SystemOneError>>;
};

const DEFAULT_RETRY: RetryPolicy = { maxRetries: 3, baseDelayMs: 500, maxDelayMs: 8000 };

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createSystemOneClient(options: SystemOneClientOptions): SystemOneClient {
  const retry = options.retry ?? DEFAULT_RETRY;
  const doFetch = options.fetch ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const url = `${options.baseUrl.replace(/\/+$/, "")}/v1/systemone`;

  async function attempt(
    body: string,
  ): Promise<Result<SystemOneResponse, SystemOneError>> {
    let response: Response;
    try {
      response = await doFetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}),
        },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      return err({ kind: "network", message: "System One is unreachable or timed out" });
    }

    const status = response.status;
    if (status === 401) {
      return err({ kind: "unauthorized", message: "System One rejected the API key", status });
    }
    if (status === 429) {
      return err({ kind: "rate-limited", message: "System One rate limit reached", status });
    }
    if (status === 529) {
      return err({ kind: "overloaded", message: "System One is overloaded", status });
    }
    if (!response.ok) {
      return err({ kind: "rejected", message: `System One answered HTTP ${status}`, status });
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return err({ kind: "invalid-response", message: "System One sent a non-JSON body", status });
    }
    const parsed = systemOneResponseSchema.safeParse(json);
    if (!parsed.success) {
      return err({
        kind: "invalid-response",
        message: "System One response failed validation",
        status,
      });
    }
    return ok(parsed.data);
  }

  return {
    async ask(request) {
      if (options.maxChoices !== undefined) {
        for (const question of Object.values(request.questions)) {
          if (Object.keys(question.criteria).length > options.maxChoices) {
            return err({
              kind: "rejected",
              message: `Choice question exceeds ${options.maxChoices} options`,
            });
          }
        }
      }

      const body = JSON.stringify(request);
      for (let tries = 0; ; tries++) {
        const result = await attempt(body);
        const retryable =
          !result.ok &&
          (result.error.kind === "rate-limited" || result.error.kind === "overloaded");
        if (!retryable || tries >= retry.maxRetries) return result;
        await sleep(Math.min(retry.baseDelayMs * 2 ** tries, retry.maxDelayMs));
      }
    },
  };
}
