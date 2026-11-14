"use client";

import { Button } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/icon";

import type { Conversation } from "../chat.history";

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
};

const formatter = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function HistoryView({ conversations, activeId, onOpen, onDelete }: Props) {
  if (conversations.length === 0) {
    return <p className="p-2 text-sm text-ink">Aún no hay conversaciones guardadas.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {conversations.map((c) => (
        <li key={c.id} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpen(c.id)}
            aria-current={c.id === activeId}
            className="flex min-w-0 flex-1 flex-col items-start gap-1 rounded-md bg-secondary px-4 py-3 text-left transition-colors duration-[var(--duration-micro)] hover:bg-secondary/70 aria-[current=true]:bg-accent-soft"
          >
            <span className="w-full truncate text-sm font-medium">{c.title}</span>
            <span className="text-xs text-ink">{formatter.format(c.updatedAt)}</span>
          </button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Eliminar «${c.title}»`}
            onClick={() => onDelete(c.id)}
          >
            <Icon name="delete" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
