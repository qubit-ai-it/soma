import type { Protocol, ProtocolSelection, SelectionInput } from "./protocols.types.ts";

const LEVEL_ORDER: Record<string, number> = { F1: 1, F2: 2, F3: 3 };

function evidenceSignals(input: SelectionInput): Set<string> {
  const signals = new Set<string>();
  for (const item of input.evidence) {
    if (item.kind === "signal") signals.add(item.signal);
    else for (const signal of item.signals) signals.add(signal);
  }
  return signals;
}

export function selectProtocols(
  input: SelectionInput,
  library: readonly Protocol[],
): ProtocolSelection[] {
  const level = LEVEL_ORDER[input.status];
  if (level === undefined) return [];

  const rules = new Set(input.triggeredRules);
  const signals = evidenceSignals(input);

  const selections: ProtocolSelection[] = [];
  for (const protocol of library) {
    const { triggers } = protocol;
    const matchedBy = [
      ...triggers.ruleIds.filter((id) => rules.has(id)).map((id) => `rule:${id}`),
      ...triggers.signals.filter((s) => signals.has(s)).map((s) => `signal:${s}`),
    ];
    const minLevel = triggers.minStatus ? LEVEL_ORDER[triggers.minStatus] : undefined;
    if (minLevel !== undefined && level >= minLevel) matchedBy.push(`status:${input.status}`);
    else if (triggers.anyEvaluable) matchedBy.push(`status:${input.status}`);

    if (matchedBy.length > 0) selections.push({ protocol, matchedBy });
  }
  return selections;
}
