"use client";

import { useState, useTransition } from "react";

import type { Result } from "@/shared/result";

import { DEMO_ACTORS } from "./roles.logic";
import { useDemoRole } from "./roles.store";

export function useCallerAction() {
  const role = useDemoRole();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const caller = { role, actorId: DEMO_ACTORS[role].id };

  function run(call: (caller: { role: typeof role; actorId: string }) => Promise<Result<void>>) {
    start(async () => {
      const result = await call(caller);
      setError(result.ok ? null : result.error);
    });
  }

  return { run, pending, error, role };
}
