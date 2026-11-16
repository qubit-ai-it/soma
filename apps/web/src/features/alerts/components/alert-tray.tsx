"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  KIND_LABEL,
  sentryFeed,
  timeLabel,
  toneFor,
  unreadIds,
} from "@/features/notifications/notifications.display";
import { useNotifications } from "@/features/notifications/use-notifications";
import { DEMO_ACTORS } from "@/features/roles/roles.logic";
import { useDemoRole } from "@/features/roles/roles.store";
import { Icon } from "@/shared/ui/icon";
import { SomaCard } from "@/shared/ui/soma-card";

import { alertsFileSchema } from "../alerts.schema";
import { projectAlert } from "../alerts.logic";
import { filterTray, trayItems, unreadCount, type TrayFilter } from "../alerts.tray";
import type { Alert } from "../alerts.types";
import { AlertDetailDialog } from "./alert-detail-dialog";

const LEVEL_CHIP = { F3: "F3", F2: "F2", NOT_EVALUABLE: "Not evaluable" } as const;

const STATUS_OPTIONS: { value: TrayFilter["status"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Unread" },
  { value: "acknowledged", label: "Acknowledged" },
];

const LEVEL_OPTIONS: { value: TrayFilter["level"]; label: string }[] = [
  { value: "all", label: "All levels" },
  { value: "F3", label: "F3" },
  { value: "F2", label: "F2" },
  { value: "NOT_EVALUABLE", label: "Not evaluable" },
];

const CHIP_BASE =
  "h-9 shrink-0 rounded-full px-4 font-heading text-sm font-semibold outline-none transition-colors duration-[var(--duration-micro)] focus-visible:ring-2 focus-visible:ring-ring";

function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={`${CHIP_BASE} ${
            option.value === value ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/alerts", { cache: "no-store" });
      const parsed = alertsFileSchema.safeParse(await response.json());
      if (parsed.success) setAlerts(parsed.data.alerts);
    } catch {
      // keep the last known list when the request fails
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(first);
  }, [refresh]);

  return { alerts, refresh };
}

export function AlertTray({ className }: { className?: string }) {
  const role = useDemoRole();
  const { alerts, refresh } = useAlerts();
  const { notifications, markRead } = useNotifications(
    { role, memberId: DEMO_ACTORS[role].memberId },
    refresh,
  );
  const feed = useMemo(() => sentryFeed(notifications), [notifications]);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TrayFilter>({ status: "all", level: "all" });

  const items = useMemo(
    () => trayItems(alerts, { role, memberId: DEMO_ACTORS[role].memberId }),
    [alerts, role],
  );
  const visible = useMemo(() => filterTray(items, filter), [items, filter]);
  const unread = unreadCount(items) + unreadIds(notifications).length;
  const raw = selectedId ? alerts.find((alert) => alert.id === selectedId) : undefined;
  const selected = raw ? projectAlert(raw, { role, memberId: DEMO_ACTORS[role].memberId }) : null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          void refresh();
          void markRead(unreadIds(notifications));
        }
      }}
    >
      <Dialog.Trigger
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        title="Notifications"
        className={`relative ${className ?? ""}`}
      >
        <Icon name={unread > 0 ? "notifications_active" : "notifications"} />
        <span className="hidden sm:inline">Notifications</span>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold leading-5 text-foreground">
            {unread}
          </span>
        )}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-[min(100vw,26rem)] flex-col bg-background text-foreground shadow-[-18px_0_55px_-20px_rgb(0_0_0/0.6)] outline-none transition-transform duration-200 data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full">
          <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
            <Dialog.Title className="font-heading text-xl font-bold">Notifications</Dialog.Title>
            <Dialog.Close
              aria-label="Close notifications"
              className="grid size-10 place-items-center rounded-full bg-secondary outline-none transition-colors duration-[var(--duration-micro)] hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon name="close" />
            </Dialog.Close>
          </header>

          <div className="flex flex-col gap-2 px-5 pb-3">
            <FilterChips
              label="Filter by status"
              options={STATUS_OPTIONS}
              value={filter.status}
              onChange={(status) => setFilter((current) => ({ ...current, status }))}
            />
            <FilterChips
              label="Filter by level"
              options={LEVEL_OPTIONS}
              value={filter.level}
              onChange={(level) => setFilter((current) => ({ ...current, level }))}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visible.length === 0 && feed.primary.length + feed.digest.length === 0 ? (
              <p className="py-6 text-base text-muted-foreground">
                {items.length === 0 ? "No notifications." : "No notification matches the filter."}
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {feed.primary.map((n) => (
                  <li key={n.id}>
                    <SomaCard
                      title={n.title}
                      line={n.body}
                      chip={KIND_LABEL[n.kind]}
                      tone={toneFor(n.priority)}
                      footer={timeLabel(n.createdAt)}
                      actions={
                        n.kind === "checkin"
                          ? [{ label: "Reply", icon: "chat", href: "/pet" }]
                          : undefined
                      }
                    />
                  </li>
                ))}
                {feed.digest.length > 0 && (
                  <li>
                    <SomaCard
                      title={`Minor notices (${feed.digest.length})`}
                      chip="Summary"
                      tone="neutral"
                      detailLabel="View notices"
                      detail={
                        <ul className="space-y-2">
                          {feed.digest.map((n) => (
                            <li key={n.id}>
                              <span className="font-semibold">{n.title}</span>
                              {n.body ? ` · ${n.body}` : ""}
                              <span className="block text-xs">{timeLabel(n.createdAt)}</span>
                            </li>
                          ))}
                        </ul>
                      }
                    />
                  </li>
                )}
                {visible.map((item) => (
                  <li key={item.id}>
                    <SomaCard
                      title={item.title}
                      line={item.line}
                      chip={`${LEVEL_CHIP[item.level]} · ${item.status === "open" ? "Unread" : "Acknowledged"}`}
                      tone={item.tone}
                      footer={`${item.memberLabel} · ${item.createdAt.slice(11, 16)} UTC`}
                      actions={[
                        {
                          label: "View details",
                          icon: "visibility",
                          variant: "secondary",
                          onClick: () => setSelectedId(item.id),
                        },
                      ]}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>

      <AlertDetailDialog alert={selected} onClose={() => setSelectedId(null)} onChanged={() => void refresh()} />
    </Dialog.Root>
  );
}
