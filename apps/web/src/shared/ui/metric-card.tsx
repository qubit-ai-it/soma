import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "cn";

import { Icon } from "./icon";
import type { CardAction, CardTone } from "./soma-card";

const VALUE_TONE: Record<CardTone, string> = {
  ok: "text-foreground",
  neutral: "text-foreground",
  info: "text-foreground",
  warn: "text-warn",
  danger: "text-danger",
};

const ACTION =
  "flex h-11 items-center justify-center gap-2 rounded-full px-5 font-heading text-sm font-semibold transition-colors duration-[var(--duration-micro)] ease-[var(--ease-editorial)] outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

const VARIANT = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/85",
  secondary: "bg-secondary text-foreground hover:bg-secondary/70",
};

type Props = {
  title: string;
  value: string;
  line?: string;
  // Where the figure comes from, shown under it
  source?: string;
  icon: string;
  tone?: CardTone;
  actions?: CardAction[];
  children?: ReactNode;
  className?: string;
};

// Title, one figure, an outline icon. Buttons only when the card needs one.
export function MetricCard({
  title,
  value,
  line,
  source,
  icon,
  tone = "neutral",
  actions,
  children,
  className,
}: Props) {
  return (
    <article
      aria-label={title}
      className={cn(
        "flex min-h-40 flex-col gap-3 rounded-[2rem_1.5rem_2.25rem_1.75rem] bg-card p-6",
        className,
      )}
    >
      <div>
        <h3 className="text-base text-muted-foreground">{title}</h3>
        <p
          className={cn(
            "mt-1 font-heading text-4xl font-bold leading-tight",
            VALUE_TONE[tone],
          )}
        >
          {value}
        </p>
        {line && <p className="mt-1 text-sm text-ink">{line}</p>}
      </div>

      {children}

      <div className="mt-auto flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {source && (
            <p className="text-xs font-semibold text-muted-foreground">
              {source}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {actions?.map((action) => {
              const className = cn(
                ACTION,
                VARIANT[action.variant ?? "primary"],
              );
              const content = (
                <>
                  {action.icon && <Icon name={action.icon} />}
                  {action.label}
                </>
              );
              return action.href ? (
                <Link
                  key={action.label}
                  href={action.href}
                  className={className}
                >
                  {content}
                </Link>
              ) : (
                <button
                  key={action.label}
                  type="button"
                  disabled={action.disabled}
                  onClick={action.onClick}
                  className={className}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </div>
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-foreground text-background"
        >
          <Icon name={icon} className="-rotate-[10deg] text-[1.5em]" />
        </span>
      </div>
    </article>
  );
}
