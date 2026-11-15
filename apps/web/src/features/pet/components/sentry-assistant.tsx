"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/icon";

import type { ChatMessage } from "../chat.client";
import {
  createConversation,
  parseConversations,
  removeConversation,
  upsertConversation,
  withMessages,
  type Conversation,
} from "../chat.history";
import { fileToDataUrl, MAX_ATTACHMENTS } from "../image";
import { newId } from "../id";
import { useLocalStore } from "../local-store";
import type { SentryMode } from "../pet.types";
import {
  createTask,
  isDue,
  markRan,
  parseRuns,
  parseTasks,
  recordRun,
  runTask,
  type ScheduledTask,
  type TaskRun,
} from "../tasks.logic";
import { speak, stopSpeaking, useDictation, useSpeechSupport } from "../use-speech";
import { ChatView } from "./chat-view";
import { HistoryView } from "./history-view";
import { Sentry } from "./sentry";
import { TasksView } from "./tasks-view";
import { VoiceStage } from "./voice-stage";

const SLEEP_AFTER_MS = 45_000;
const TASK_TICK_MS = 10_000;
const WORKING_FLASH_MS = 4_000;
const LANG = "es-ES";
const IMAGE_ONLY_PROMPT = "Describe esta imagen.";

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hola, soy Sentry. ¿En qué te ayudo con la misión?",
};

const NO_CONVERSATIONS: Conversation[] = [];
const NO_TASKS: ScheduledTask[] = [];
const NO_RUNS: TaskRun[] = [];

type View = "chat" | "history" | "tasks";

const VIEWS: { id: View; label: string; icon: string }[] = [
  { id: "chat", label: "Chat", icon: "chat" },
  { id: "history", label: "Historial", icon: "history" },
  { id: "tasks", label: "Tareas", icon: "schedule" },
];

const STATUS: Record<SentryMode, string> = {
  idle: "Listo para ayudarte",
  thinking: "Pensando…",
  listening: "Te escucho",
  working: "Capturando datos",
  warning: "Alerta",
  sleeping: "Descansando",
};

const DRAFT_ID = "draft";
const DRAFT = createConversation(DRAFT_ID, 0, GREETING);

export function SentryAssistant() {
  const [conversations, setConversations] = useLocalStore(
    "soma.pet.conversations",
    NO_CONVERSATIONS,
    parseConversations,
  );
  const [tasks, setTasks] = useLocalStore("soma.pet.tasks", NO_TASKS, parseTasks);
  const [runs, setRuns] = useLocalStore("soma.pet.runs", NO_RUNS, parseRuns);

  const [current, setCurrent] = useState<Conversation>(DRAFT);
  const [view, setView] = useState<View>("chat");
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [asleep, setAsleep] = useState(false);
  const [working, setWorking] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const [conversation, setConversation] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [successSignal, setSuccessSignal] = useState(0);
  const [errorSignal, setErrorSignal] = useState(0);

  const sleepTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const workingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dictationBase = useRef("");
  const tasksRef = useRef(tasks);
  const speechOut = useSpeechSupport();

  const sendRef = useRef<(text: string, images: string[]) => void>(() => {});
  const conversationRef = useRef(false);

  const dictation = useDictation(LANG, {
    onText: (text) => setDraft(`${dictationBase.current}${text}`),
    onFinal: (text) => {
      if (conversationRef.current) sendRef.current(text, []);
    },
    onError: (code) => {
      if (code === "not-allowed" || code === "service-not-allowed") setConversation(false);
    },
  });
  const { start: startListening, listening: isListening } = dictation;

  const mode: SentryMode = sending
    ? "thinking"
    : working
      ? "working"
      : speaking
        ? "idle"
        : dictation.listening || draft
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
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    if (!conversation || sending || speaking || isListening) return;
    const timer = setTimeout(startListening, 400);
    return () => clearTimeout(timer);
  }, [conversation, sending, speaking, isListening, startListening]);

  const execute = useCallback(
    (task: ScheduledTask) => {
      const now = Date.now();
      const run = runTask(task, newId(), now, Math.random());
      setRuns((previous) => recordRun(previous, run));
      setTasks((previous) => markRan(previous, task.id, now));
      setWorking(true);
      clearTimeout(workingTimer.current);
      workingTimer.current = setTimeout(() => setWorking(false), WORKING_FLASH_MS);
    },
    [setRuns, setTasks],
  );

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      tasksRef.current.filter((t) => isDue(t, now)).forEach(execute);
    }, TASK_TICK_MS);
    return () => {
      clearInterval(id);
      clearTimeout(workingTimer.current);
    };
  }, [execute]);

  function persist(conversation: Conversation) {
    setCurrent(conversation);
    setConversations((previous) => upsertConversation(previous, conversation));
  }

  async function send(text: string, images: string[]) {
    const content = text.trim() || (images.length ? IMAGE_ONLY_PROMPT : "");
    if (!content || sending) return;

    const message: ChatMessage = { role: "user", content, ...(images.length ? { images } : {}) };
    const base =
      current.id === DRAFT_ID
        ? { ...current, id: newId(), createdAt: Date.now() }
        : current;
    const withUser = withMessages(base, [...base.messages, message], Date.now());
    persist(withUser);
    setDraft("");
    setAttachments([]);
    setFailure(null);
    setSending(true);
    setView("chat");
    stopSpeaking();
    armSleep();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: withUser.messages.slice(1) }),
      });
      const body = (await response.json().catch(() => null)) as { reply?: string } | null;
      if (!response.ok || !body?.reply) {
        throw new Error(
          response.status === 503
            ? "El chat no está configurado (falta GEMINI_API_KEY)."
            : "No pude responder. Inténtalo de nuevo.",
        );
      }
      persist(
        withMessages(withUser, [...withUser.messages, { role: "assistant", content: body.reply }], Date.now()),
      );
      setSuccessSignal((n) => n + 1);
      if (readAloud || conversationRef.current) {
        setSpeaking(true);
        speak(body.reply, LANG, () => setSpeaking(false));
      }
    } catch (e) {
      setConversation(false);
      setFailure(e instanceof Error ? e.message : "No pude responder.");
      setErrorSignal((n) => n + 1);
    } finally {
      setSending(false);
      armSleep();
    }
  }

  useEffect(() => {
    sendRef.current = send;
    conversationRef.current = conversation;
  });

  async function attach(files: File[]) {
    const room = MAX_ATTACHMENTS - attachments.length;
    const images = await Promise.all(
      files
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, room)
        .map((f) => fileToDataUrl(f).catch(() => null)),
    );
    setAttachments((previous) => [...previous, ...images.filter((i): i is string => i !== null)]);
    armSleep();
  }

  function toggleDictation() {
    if (dictation.listening) {
      dictation.stop();
      return;
    }
    dictationBase.current = draft ? `${draft} ` : "";
    dictation.start();
  }

  function toggleConversation() {
    if (conversation) {
      setConversation(false);
      dictation.stop();
      stopSpeaking();
      setSpeaking(false);
      setDraft("");
      return;
    }
    dictationBase.current = "";
    setView("chat");
    setConversation(true);
    armSleep();
  }

  function toggleReadAloud() {
    if (readAloud) stopSpeaking();
    setReadAloud(!readAloud);
  }

  function startNew() {
    setCurrent(DRAFT);
    setDraft("");
    setAttachments([]);
    setFailure(null);
    setView("chat");
  }

  function openConversation(id: string) {
    const found = conversations.find((c) => c.id === id);
    if (!found) return;
    setCurrent(found);
    setFailure(null);
    setView("chat");
  }

  function deleteConversation(id: string) {
    setConversations((previous) => removeConversation(previous, id));
    if (id === current.id) startNew();
  }

  if (conversation) {
    const lastReply = current.messages.at(-1);
    return (
      <VoiceStage
        mode={mode}
        speaking={speaking}
        status={speaking ? "Hablando…" : STATUS[mode]}
        transcript={speaking && lastReply?.role === "assistant" ? lastReply.content : draft}
        successSignal={successSignal}
        errorSignal={errorSignal}
        onEnd={toggleConversation}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <aside className="flex items-center gap-4 rounded-md bg-card p-4 lg:flex-col lg:justify-center lg:p-8">
        <Sentry
          mode={mode}
          successSignal={successSignal}
          errorSignal={errorSignal}
          className="w-24 shrink-0 lg:w-full lg:max-w-72"
        />
        <p aria-live="polite" className="font-heading text-lg font-bold lg:text-center">
          {speaking ? "Hablando…" : STATUS[mode]}
        </p>
      </aside>

      <section className="flex h-[36rem] flex-col gap-4 rounded-md bg-card p-4 lg:h-[42rem] lg:p-6">
        <header className="flex flex-wrap items-center gap-2">
          <nav aria-label="Secciones" className="flex flex-1 flex-wrap gap-2">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={view === v.id}
                onClick={() => setView(v.id)}
                className="flex h-9 items-center gap-1.5 rounded-full bg-secondary px-4 text-sm transition-colors duration-[var(--duration-micro)] hover:bg-secondary/70 aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                <Icon name={v.icon} />
                {v.label}
              </button>
            ))}
          </nav>
          {speechOut && dictation.supported && (
            <Button
              variant={conversation ? "default" : "outline"}
              size="sm"
              aria-pressed={conversation}
              onClick={toggleConversation}
            >
              <Icon name={conversation ? "stop_circle" : "graphic_eq"} />
              {conversation ? "Terminar" : "Conversar"}
            </Button>
          )}
          {speechOut && (
            <Button
              variant={readAloud ? "default" : "outline"}
              size="icon-sm"
              aria-label="Leer respuestas en voz alta"
              aria-pressed={readAloud}
              onClick={toggleReadAloud}
            >
              <Icon name={readAloud ? "volume_up" : "volume_off"} />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={startNew}>
            <Icon name="edit_square" />
            Nueva
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {view === "chat" && (
            <ChatView
              messages={current.messages}
              sending={sending}
              failure={failure}
              draft={draft}
              attachments={attachments}
              dictation={dictation}
              onDraftChange={(value) => {
                setDraft(value);
                armSleep();
              }}
              onSubmit={() => send(draft, attachments)}
              onQuickAction={(text) => send(text, [])}
              onAttach={attach}
              onRemoveAttachment={(i) => setAttachments((p) => p.filter((_, n) => n !== i))}
              onToggleDictation={toggleDictation}
            />
          )}
          {view === "history" && (
            <HistoryView
              conversations={conversations}
              activeId={current.id}
              onOpen={openConversation}
              onDelete={deleteConversation}
            />
          )}
          {view === "tasks" && (
            <TasksView
              tasks={tasks}
              runs={runs}
              onCreate={(input) =>
                setTasks((previous) => [createTask(newId(), Date.now(), input), ...previous])
              }
              onToggle={(id) =>
                setTasks((previous) => previous.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)))
              }
              onDelete={(id) => setTasks((previous) => previous.filter((t) => t.id !== id))}
              onRunNow={(id) => {
                const task = tasks.find((t) => t.id === id);
                if (task) execute(task);
              }}
            />
          )}
        </div>
      </section>
    </div>
  );
}
