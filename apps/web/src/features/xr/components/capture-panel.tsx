"use client";

import { useState } from "react";

import { readCapture } from "../../capture/capture.client";
import { captureToObservation } from "../../capture/capture.logic";
import type { QualityAssessment } from "../../capture/capture.types";
import { requestFindings } from "../../findings/findings.service";
import type { FindingsError, PreliminaryFindings } from "../../findings/findings.port";
import { createSimulatedFindingsProvider } from "../../findings/findings.simulated";
import type { Observation } from "../../observation/observation.types";
import { qualityLabel } from "../xr.display";

type Props = {
  subjectId: string;
  synthetic: boolean;
  device?: string;
};

type Outcome = {
  previewUrl: string;
  assessment: QualityAssessment;
  observation: Observation;
  findings?: PreliminaryFindings;
  findingsError?: FindingsError;
};

const provider = createSimulatedFindingsProvider();

export function CapturePanel({ subjectId, synthetic, device }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function onFile(file: File | undefined) {
    if (file === undefined) return;
    setBusy(true);
    setError(null);
    const read = await readCapture(file);
    if (!read.ok) {
      setOutcome(null);
      setError(read.error);
      setBusy(false);
      return;
    }
    const now = new Date().toISOString();
    const observation = captureToObservation({
      id: `obs-xr-${Date.now()}`,
      subjectId,
      imageRef: file.name,
      observedAt: now,
      assessment: read.value.assessment,
      synthetic,
      device,
    });
    const result = await requestFindings(provider, observation);
    setOutcome({
      previewUrl: read.value.dataUrl,
      assessment: read.value.assessment,
      observation,
      findings: result.ok ? result.value : undefined,
      findingsError: result.ok ? undefined : result.error,
    });
    setBusy(false);
  }

  return (
    <section aria-label="Captura de imagen" className="space-y-4 rounded-lg bg-card p-6">
      <h2 className="text-2xl">Captura de imagen</h2>
      <label className="inline-flex min-h-16 cursor-pointer items-center rounded-full bg-primary px-8 font-heading text-xl font-semibold text-primary-foreground focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
        {busy ? "Procesando…" : "Subir imagen de ultrasonido"}
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          className="sr-only"
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      <p className="text-ink">
        {synthetic ? "Datos de demostración sintéticos. " : ""}
        La imagen se procesa en este dispositivo y no sale de él.
      </p>

      <div aria-live="polite" className="space-y-4">
        {error && (
          <p role="alert" className="text-lg text-danger">
            {error}
          </p>
        )}
        {outcome && <Result outcome={outcome} />}
      </div>
    </section>
  );
}

function Result({ outcome }: { outcome: Outcome }) {
  const { observation, assessment, findings, findingsError } = outcome;
  const tone =
    assessment.state === "valid" ? "bg-ok/15" : assessment.state === "suspect" ? "bg-warn/15" : "bg-danger/15";

  return (
    <div className="space-y-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={outcome.previewUrl} alt="Imagen capturada" className="max-h-64 rounded-lg" />

      <p className={`rounded-lg p-4 text-lg ${tone}`}>
        Calidad de la imagen: <strong>{qualityLabel(assessment.state)}</strong>
        {assessment.reason && `. ${assessment.reason}`}
      </p>

      <dl className="grid gap-1 text-lg">
        <div className="flex gap-2"><dt className="text-ink">Observación:</dt><dd>{observation.id}</dd></div>
        <div className="flex gap-2"><dt className="text-ink">Señal:</dt><dd>{observation.signal} ({observation.unit})</dd></div>
        <div className="flex gap-2"><dt className="text-ink">Procedencia:</dt><dd>{observation.provenance.type === "synthetic" ? "sintética" : "real"} · {observation.provenance.source}</dd></div>
      </dl>

      {findingsError && (
        <p role="alert" className="rounded-lg bg-warn/15 p-4 text-lg">
          {findingsError.code === "image-not-evaluable"
            ? `La imagen no se envió a hallazgos preliminares: no es evaluable. Repite la captura. ${findingsError.reason}`
            : `No se muestran hallazgos: ${findingsError.reason}`}
        </p>
      )}

      {findings && (
        <article className="space-y-3 rounded-lg bg-accent-soft p-5">
          <p className="font-heading text-lg font-semibold">{findings.label}</p>
          <p className="text-xl leading-relaxed">{findings.findings}</p>
          <p className="text-lg text-ink">Incertidumbre: {findings.uncertainty}</p>
          <p className="text-sm text-ink">
            Fuente: {findings.source.provider} (simulado). Lo revisa el oficial médico a bordo.
          </p>
        </article>
      )}
    </div>
  );
}
