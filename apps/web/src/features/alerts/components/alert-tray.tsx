"use client";

import { Popover } from "@base-ui/react/popover";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DEMO_ACTORS } from "@/features/roles/roles.logic";
import { useDemoRole } from "@/features/roles/roles.store";
import { Icon } from "@/shared/ui/icon";

import { alertsFileSchema } from "../alerts.schema";
import { trayItems, unreadCount, type TrayTone } from "../alerts.tray";
import type { Alert } from "../alerts.types";

const POLL_MS = 10000;

const TONE_TEXT: Record<TrayTone, string> = {
  danger: "text-danger",
  warn: "text-warn",
  info: "text-signal",
};

const LEVEL_CHIP = { F3: "F3", F2: "F2", NOT_EVALUABLE: "No evaluable" } as const;

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
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [refresh]);

  return { alerts, refresh };
}

export function AlertTray({ className }: { className?: string }) {
  const role = useDemoRole();
  const { alerts, refresh } = useAlerts();
  const [open, setOpen] = useState(false);

  const items = useMemo(
    () => trayItems(alerts, { role, memberId: DEMO_ACTORS[role].memberId }),
    [alerts, role],
  );
  const unread = unreadCount(items);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void refresh();
      }}
    >
      <Popover.Trigger
        aria-label={unread > 0 ? `Alertas, ${unread} sin leer` : "Alertas"}
        title="Alertas"
        className={`relative ${className ?? ""}`}
      >
        <Icon name={unread > 0 ? "notifications_active" : "notifications"} />
        <span className="hidden sm:inline">Alertas</span>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold leading-5 text-foreground">
            {unread}
          </span>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner side="top" sideOffset={14} collisionPadding={12} className="z-50">
          <Popover.Popup className="max-h-[min(70vh,32rem)] w-[min(92vw,24rem)] origin-[var(--transform-origin)] overflow-y-auto rounded-3xl bg-card p-3 text-foreground shadow-[0_18px_55px_-20px_rgb(255_255_255/0.14)] outline-none transition-[scale,opacity] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <Popover.Title className="px-2 py-1 font-heading text-lg font-bold">Alertas</Popover.Title>

            {items.length === 0 ? (
              <p className="px-2 py-4 text-base text-muted-foreground">Sin alertas.</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href="/alertas"
                      onClick={() => setOpen(false)}
                      className="flex gap-3 rounded-2xl p-3 outline-none transition-colors duration-[var(--duration-micro)] hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Icon
                        name={item.status === "open" ? "notifications_active" : "visibility"}
                        className={`mt-0.5 ${TONE_TEXT[item.tone]}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-heading text-base font-semibold leading-tight">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">{item.line}</span>
                        <span className="mt-1 block text-xs text-ink">
                          {item.memberLabel} · {item.createdAt.slice(11, 16)} UTC
                        </span>
                      </span>
                      <span className={`h-fit shrink-0 text-xs font-semibold ${TONE_TEXT[item.tone]}`}>
                        {LEVEL_CHIP[item.level]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <Link
              href="/alertas"
              onClick={() => setOpen(false)}
              className="mt-2 flex h-11 w-full items-center justify-center rounded-full bg-secondary font-heading text-sm font-semibold outline-none transition-colors duration-[var(--duration-micro)] hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ver todas
            </Link>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
