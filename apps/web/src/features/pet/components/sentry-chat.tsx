"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { SendHorizontal } from "lucide-react";

import { Button } from "@/shared/ui/button";

import type { ChatMessage } from "../chat.client";
import type { SentryMode } from "../pet.types";
import { Sentry } from "./sentry";

const SLEEP_AFTER_MS = 45_000;

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hola, soy Sentry. ¿En qué te ayudo con la misión?",
};

export function SentryChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [asleep, setAsleep] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [successSignal, setSuccessSignal] = useState(0);
  const [errorSignal, setErrorSignal] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const sleepTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const mode: SentryMode = sending
    ? "thinking"
    : draft
      ? "listening"
      : asleep
        ? "sleeping"
        : "idle";

  function armSleep() {
    clearTimeout(sleepTimer.current);
    setAsleep(false);
    sleepTimer.current = setTimeout(() => setAsleep(true), SLEEP_AFTER_MS);
  }

  useEffect(() => {
    sleepTimer.current = setTimeout(() => setAsleep(true), SLEEP_AFTER_MS);
    return () => clearTimeout(sleepTimer.current);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setDraft("");
    setFailure(null);
    setSending(true);
    armSleep();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(1) }),
      });
      const body = (await response.json().catch(() => null)) as {
        reply?: string;
        error?: string;
      } | null;
      if (!response.ok || !body?.reply) {
        throw new Error(
          response.status === 503
            ? "El chat no está configurado (falta MINIMAX_API_KEY)."
            : "No pude responder. Inténtalo de nuevo.",
        );
      }
      setMessages([...next, { role: "assistant", content: body.reply }]);
      setSuccessSignal((n) => n + 1);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "No pude responder.");
      setErrorSignal((n) => n + 1);
    } finally {
      setSending(false);
      armSleep();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md bg-muted p-4">
        <Sentry
          mode={mode}
          successSignal={successSignal}
          errorSignal={errorSignal}
          className="mx-auto w-full max-w-56"
        />
      </div>

      <div
        ref={listRef}
        aria-live="polite"
        className="flex h-80 flex-col gap-3 overflow-y-auto rounded-md bg-card p-4"
      >
        {messages.map((m, i) => (
          <p
            key={i}
            className={
              m.role === "user"
                ? "max-w-[85%] self-end rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
                : "max-w-[85%] self-start whitespace-pre-wrap rounded-md bg-secondary px-4 py-2 text-sm"
            }
          >
            {m.content}
          </p>
        ))}
        {sending && (
          <p className="self-start text-sm text-ink">Sentry está pensando…</p>
        )}
        {failure && (
          <p role="alert" className="self-start text-sm text-destructive">
            {failure}
          </p>
        )}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            armSleep();
          }}
          maxLength={4000}
          placeholder="Escribe un mensaje…"
          aria-label="Mensaje para Sentry"
          className="h-12 flex-1 rounded-full bg-card px-5 text-sm outline-none transition-colors duration-[var(--duration-micro)] placeholder:text-ink focus-visible:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" size="lg" disabled={sending || !draft.trim()}>
          <SendHorizontal />
          Enviar
        </Button>
      </form>
      <p className="text-xs text-ink">
        Sentry no es un médico: no diagnostica ni receta.
      </p>
    </div>
  );
}
