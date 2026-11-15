"use client";

import { useState, useTransition } from "react";

import { DEMO_ACTORS } from "@/features/roles/roles.logic";
import { useDemoRole } from "@/features/roles/roles.store";
import type { Result } from "@/shared/result";

export function useConsoleAction() {
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

  return { run, pending, error };
}
