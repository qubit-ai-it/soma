import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "cn";

import { Icon } from "./icon";

export type CardTone = "ok" | "warn" | "danger" | "info" | "neutral";

export type CardAction = {
  label: string;
  icon?: string;
  variant?: "primary" | "secondary";
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

const CHIP: Record<CardTone, string> = {
  ok: "bg-ok/15 text-ok",
  warn: "bg-warn/15 text-warn",
  danger: "bg-danger/15 text-danger",
  info: "bg-accent-soft text-signal",
  neutral: "bg-secondary text-ink",
};

const ACTION =
  "flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 font-heading text-sm font-semibold transition-colors duration-[var(--duration-micro)] ease-[var(--ease-editorial)] outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

const VARIANT = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/85",
  secondary: "bg-secondary text-foreground hover:bg-secondary/70",
};

export function SomaFace({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("flex size-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-secondary", className)}
    >
      <span className="size-1.5 rounded-full bg-foreground" />
      <span className="size-1.5 rounded-full bg-foreground" />
    </span>
  );
}

type Props = {
  title: string;
  line?: string;
  chip?: string;
  tone?: CardTone;
  children?: ReactNode;
  detail?: ReactNode;
  detailLabel?: string;
  actions?: CardAction[];
  footer?: string;
  label?: string;
  className?: string;
};

export function SomaCard({
  title,
  line,
  chip,
  tone = "neutral",
  children,
  detail,
  detailLabel = "Ver detalle",
  actions,
  footer,
  label,
  className,
}: Props) {
  return (
    <article aria-label={label ?? title} className={cn("flex flex-col gap-4 rounded-2xl bg-card p-5", className)}>
      <header className="flex items-center justify-between gap-3">
        <SomaFace />
        {chip && (
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", CHIP[tone])}>{chip}</span>
        )}
      </header>

      <h3 className="font-heading text-xl font-bold leading-tight">{title}</h3>
      {line && <p className="text-base text-muted-foreground">{line}</p>}
      {children}

      {detail && (
        <details className="text-sm">
          <summary className="cursor-pointer list-none text-ink outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            {detailLabel}
          </summary>
          <div className="mt-3 space-y-2 text-ink">{detail}</div>
        </details>
      )}

      {actions && actions.length > 0 && (
        <div className="mt-auto flex flex-col gap-2">
          {actions.map((action) => {
            const className = cn(ACTION, VARIANT[action.variant ?? "primary"]);
            const content = (
              <>
                {action.icon && <Icon name={action.icon} />}
                {action.label}
              </>
            );
            return action.href ? (
              <Link key={action.label} href={action.href} className={className}>
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
      )}

      {footer && <p className="text-xs text-ink">{footer}</p>}
    </article>
  );
}
