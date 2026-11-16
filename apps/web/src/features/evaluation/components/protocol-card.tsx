"use client";

import { useState } from "react";

import { SomaCard } from "@/shared/ui/soma-card";

export function ProtocolCard() {
  const [pressed, setPressed] = useState(false);
  return (
    <SomaCard
      label="Approved protocol"
      tone="danger"
      chip="F3"
      title="Approved protocol"
      line="Free generation disabled. Approved protocols only."
      detail={<p>No pre-approved protocol loaded yet.</p>}
      actions={[{ label: "Escalate manually", icon: "campaign", onClick: () => setPressed(true) }]}
    >
      {pressed && (
        <p role="status" className="text-sm text-ink">
          Not connected yet: nothing is sent.
        </p>
      )}
    </SomaCard>
  );
}
