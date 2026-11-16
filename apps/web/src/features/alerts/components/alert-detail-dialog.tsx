"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useState, useTransition } from "react";

import { DEMO_ACTORS, ROLE_LABELS, canAccess } from "@/features/roles/roles.logic";
import { useDemoRole } from "@/features/roles/roles.store";
import { Icon } from "@/shared/ui/icon";
import { SomaCard, type CardAction, type CardTone } from "@/shared/ui/soma-card";

import { acknowledgeAlertAction, closeAlertAction } from "../alerts.actions";
import { LEVEL_LABELS, STATUS_LABELS, formatDateTime } from "../alerts.display";
import type { Alert } from "../alerts.types";

const TONE: Record<Alert["level"], CardTone> = { F2: "warn", F3: "danger", NOT_EVALUABLE: "info" };

type Props = {
  alert: Alert | null;
  onClose: () => void;
  onChanged: () => void;
};

function Detail({ alert, onChanged }: { alert: Alert; onChanged: () => void }) {
  const role = useDemoRole();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState("");
  const caller = { role, actorId: DEMO_ACTORS[role].id };

  function run(call: () => Promise<{ ok: boolean; error?: string }>) {
    start(async () => {
      const result = await call();
      setError(result.ok ? null : (result.error ?? "Could not complete the action."));
      if (result.ok) {
        setClosing(false);
        setNote("");
        onChanged();
      }
    });
  }

  const actions: CardAction[] = [];
  if (alert.status === "open" && canAccess(role, "alert_acknowledge")) {
    actions.push({
      label: "Acknowledge",
      icon: "visibility",
      disabled: pending,
      onClick: () => run(() => acknowledgeAlertAction({ ...caller, alertId: alert.id })),
    });
  }
  if (alert.status === "acknowledged" && canAccess(role, "alert_close")) {
    if (closing) {
      actions.push(
        {
          label: "Close alert",
          disabled: pending || note.trim().length < 3,
          onClick: () => run(() => closeAlertAction({ ...caller, alertId: alert.id, note })),
        },
        { label: "Cancel", variant: "secondary", disabled: pending, onClick: () => setClosing(false) },
      );
    } else {
      actions.push({ label: "Close alert", icon: "task_alt", onClick: () => setClosing(true) });
    }
  }

  const blocked = alert.status === "open" && !canAccess(role, "alert_acknowledge");

  return (
    <SomaCard
      title={alert.title}
      line={alert.action}
      chip={`${LEVEL_LABELS[alert.level]} · ${STATUS_LABELS[alert.status].text}`}
      tone={alert.status === "closed" ? "ok" : TONE[alert.level]}
      actions={actions}
      footer={blocked ? "Switch roles to act." : undefined}
      className="bg-transparent p-0"
    >
      <div className="space-y-2 text-sm text-ink">
        <p>
          {alert.memberLabel} · {formatDateTime(alert.createdAt)}
        </p>
        <p>To: {alert.recipients.map((r) => ROLE_LABELS[r]).join(", ")}</p>
        <p>
          {alert.clinicalDetail
            ? `Clinical detail: ${alert.clinicalDetail}`
            : "Clinical detail not available for this role."}
        </p>
        {alert.acknowledged && (
          <p>
            Acknowledged by {alert.acknowledged.actorId} · {formatDateTime(alert.acknowledged.at)}
          </p>
        )}
        {alert.closed && (
          <p>
            Closed by {alert.closed.actorId} · {alert.closed.note}
          </p>
        )}
      </div>
      {closing && (
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Closing note"
          aria-label="Closing note"
          className="h-11 w-full rounded-full bg-secondary px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </SomaCard>
  );
}

export function AlertDetailDialog({ alert, onClose, onChanged }: Props) {
  return (
    <Dialog.Root open={alert !== null} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/60 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-[60] max-h-[85vh] w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-card p-5 text-foreground outline-none transition-[opacity,scale] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Dialog.Title className="font-heading text-lg font-bold">Notification detail</Dialog.Title>
            <Dialog.Close
              aria-label="Close detail"
              className="grid size-10 place-items-center rounded-full bg-secondary outline-none transition-colors duration-[var(--duration-micro)] hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon name="close" />
            </Dialog.Close>
          </div>
          {alert && <Detail key={alert.id} alert={alert} onChanged={onChanged} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
