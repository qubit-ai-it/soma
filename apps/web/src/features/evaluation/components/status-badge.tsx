import { Icon } from "@/shared/ui/icon";
import type { Status } from "../../rules/rules.types";
import { STATUS_COPY } from "../evaluation.labels";

const STATUS_STYLES: Record<Status, string> = {
  F0: "bg-ok/15 text-ok",
  F1: "bg-warn/15 text-warn",
  F2: "bg-danger/15 text-danger",
  F3: "bg-danger text-foreground",
  NOT_EVALUABLE: "bg-secondary text-foreground outline-dashed outline-2 outline-offset-2 outline-ink",
};

export function StatusBadge({ status, large = false }: { status: Status; large?: boolean }) {
  const size = large ? "px-5 py-2 text-2xl" : "px-3 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full font-heading font-bold ${size} ${STATUS_STYLES[status]}`}
    >
      {status === "NOT_EVALUABLE" && <Icon name="help" />}
      {STATUS_COPY[status].name}
    </span>
  );
}
