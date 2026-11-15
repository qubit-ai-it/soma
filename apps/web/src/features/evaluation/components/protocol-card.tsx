"use client";

import { useState } from "react";

import { SomaCard } from "@/shared/ui/soma-card";

export function ProtocolCard() {
  const [pressed, setPressed] = useState(false);
  return (
    <SomaCard
      label="Protocolo aprobado"
      tone="danger"
      chip="F3"
      title="Protocolo aprobado"
      line="Generación libre desactivada. Solo protocolos aprobados."
      detail={<p>Aún no hay un protocolo pre-aprobado cargado.</p>}
      actions={[{ label: "Escalar manualmente", icon: "campaign", onClick: () => setPressed(true) }]}
    >
      {pressed && (
        <p role="status" className="text-sm text-ink">
          Aún no está conectado: no envía nada.
        </p>
      )}
    </SomaCard>
  );
}
