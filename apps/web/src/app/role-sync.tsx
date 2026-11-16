"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

import { roleFromMetadata } from "@/features/roles/roles.logic";
import { getStoredRole } from "@/features/roles/roles.store";

import { claimRoleAction } from "./onboarding-actions";

export function RoleSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const claiming = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || claiming.current) return;
    if (roleFromMetadata(user.publicMetadata)) return;
    claiming.current = true;
    const chosen = roleFromMetadata(user.unsafeMetadata) ?? getStoredRole();
    void claimRoleAction({ role: chosen })
      .then((result) => (result.ok ? user.reload() : undefined))
      .finally(() => {
        claiming.current = false;
      });
  }, [isLoaded, isSignedIn, user]);

  return null;
}
