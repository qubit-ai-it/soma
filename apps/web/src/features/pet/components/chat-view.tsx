"use client";

import { useEffect, useRef, type ChangeEvent, type FormEvent } from "react";

import { Button } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/icon";

import type { ChatMessage } from "../chat.types";
import { MAX_ATTACHMENTS } from "../image";
import { ChatReplyView } from "./chat-reply";

export const QUICK_ACTIONS = [
  "Dame un resumen de la misión",
  "Sugiere una rutina de descanso",
  "Explica los niveles de riesgo",
  "¿Qué puedes hacer?",
] as const;

type Props = {
  messages: ChatMessage[];
  sending: boolean;
  failure: string | null;
  draft: string;
  attachments: string[];
  dictation: { supported: boolean; listening: boolean };
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onQuickAction: (text: string) => void;
  onAttach: (files: File[]) => void;
  onRemoveAttachment: (index: number) => void;
  onToggleDictation: () => void;
};

export function ChatView({
  messages,
  sending,
  failure,
  draft,
  attachments,
  dictation,
  onDraftChange,
  onSubmit,
  onQuickAction,
  onAttach,
  onRemoveAttachment,
  onToggleDictation,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending]);

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  function pickFiles(event: ChangeEvent<HTMLInputElement>) {
    onAttach(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  const canSend = !sending && (draft.trim().length > 0 || attachments.length > 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div ref={listRef} aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex max-w-[85%] flex-col gap-2 rounded-md px-4 py-2 text-sm ${
              m.role === "user"
                ? "self-end bg-primary text-primary-foreground"
                : "self-start bg-secondary"
            }`}
          >
            {m.images?.map((src, n) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={n} src={src} alt="Imagen adjunta" className="max-h-40 rounded-md object-cover" />
            ))}
            {!m.images && m.imageCount ? (
              <span className="flex items-center gap-1 text-xs opacity-70">
                <Icon name="image" />
                {m.imageCount} {m.imageCount === 1 ? "imagen adjunta" : "imágenes adjuntas"}
              </span>
            ) : null}
            {m.role === "assistant" ? (
              <ChatReplyView content={m.content} research={m.research} />
            ) : <p className="whitespace-pre-wrap break-words">{m.content}</p>}
          </div>
        ))}
        {sending && <p className="self-start text-sm text-ink">Sentry está pensando…</p>}
        {failure && (
          <p role="alert" className="self-start text-sm text-destructive">
            {failure}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((text) => (
          <button
            key={text}
            type="button"
            disabled={sending}
            onClick={() => onQuickAction(text)}
            className="rounded-full bg-secondary px-4 py-2 text-xs transition-colors duration-[var(--duration-micro)] hover:bg-secondary/70 disabled:opacity-50"
          >
            {text}
          </button>
        ))}
      </div>

      {attachments.length > 0 && (
        <ul className="flex gap-2">
          {attachments.map((src, i) => (
            <li key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Adjunto ${i + 1}`} className="size-14 rounded-md object-cover" />
              <button
                type="button"
                aria-label={`Quitar adjunto ${i + 1}`}
                onClick={() => onRemoveAttachment(i)}
                className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"
              >
                <Icon name="close" className="text-sm" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={pickFiles} />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Adjuntar imagen"
          disabled={attachments.length >= MAX_ATTACHMENTS}
          onClick={() => fileRef.current?.click()}
        >
          <Icon name="add_photo_alternate" />
        </Button>
        {dictation.supported && (
          <Button
            type="button"
            variant={dictation.listening ? "default" : "outline"}
            size="icon"
            aria-label={dictation.listening ? "Detener dictado" : "Dictar por voz"}
            aria-pressed={dictation.listening}
            onClick={onToggleDictation}
          >
            <Icon name={dictation.listening ? "stop_circle" : "mic"} />
          </Button>
        )}
        <input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          maxLength={4000}
          placeholder="Escribe un mensaje…"
          aria-label="Mensaje para Sentry"
          className="h-12 min-w-0 flex-1 rounded-full bg-secondary px-5 text-sm outline-none transition-colors duration-[var(--duration-micro)] placeholder:text-ink focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" size="icon-lg" aria-label="Enviar" disabled={!canSend}>
          <Icon name="send" />
        </Button>
      </form>
      <p className="text-xs text-ink">Sentry no es un médico: no diagnostica ni receta.</p>
    </div>
  );
}
