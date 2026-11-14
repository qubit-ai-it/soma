import type { Attention } from "../crew.types";

const ATTENTION_STYLES: Record<Attention, { label: string; className: string }> = {
  nominal: { label: "Nominal", className: "bg-ok/15 text-ok" },
  watch: { label: "Vigilar", className: "bg-warn/15 text-warn" },
  review: { label: "Revisar", className: "bg-danger/15 text-danger" },
};

export function AttentionBadge({ attention }: { attention: Attention }) {
  const { label, className } = ATTENTION_STYLES[attention];
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>{label}</span>
  );
}
