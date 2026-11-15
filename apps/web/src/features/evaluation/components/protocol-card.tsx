"use client";

import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/icon";

export function ProtocolCard() {
  const [pressed, setPressed] = useState(false);
  return (
    <section aria-label="Protocolo aprobado" className="rounded-md bg-accent-soft p-5 text-sm">
      <h3 className="flex items-center gap-2 text-xl">
        <Icon name="medical_information" />
        Protocolo aprobado
      </h3>
      <p className="mt-2">
        Aquí se mostrará el protocolo pre-aprobado por Tierra para F3. Marcador de posición: aún no
        hay un protocolo cargado.
      </p>
      <p className="mt-2 text-ink">
        La generación libre está desactivada en F3: solo se muestran protocolos aprobados.
      </p>
      <div className="mt-4">
        <Button type="button" onClick={() => setPressed(true)}>
          Escalar manualmente
        </Button>
      </div>
      {pressed && (
        <p role="status" className="mt-3 text-ink">
          Botón de demostración: no está conectado y no envía nada a nadie.
        </p>
      )}
    </section>
  );
}
