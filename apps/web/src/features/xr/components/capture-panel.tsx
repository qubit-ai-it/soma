"use client";

import { useState } from "react";

import { readCapture } from "../../capture/capture.client";
import { captureToObservation } from "../../capture/capture.logic";
import type { QualityAssessment } from "../../capture/capture.types";
import { requestFindings } from "../../findings/findings.service";
import type { FindingsError, PreliminaryFindings } from "../../findings/findings.port";
import { createSimulatedFindingsProvider } from "../../findings/findings.simulated";
import type { Observation } from "../../observation/observation.types";
import { SomaCard, type CardTone } from "@/shared/ui/soma-card";
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
    <section aria-label="Captura de imagen" className="space-y-4">
      <SomaCard
        title="Captura de imagen"
        line="Se procesa en este dispositivo"
      >
        <label className="flex h-16 w-full cursor-pointer items-center justify-center rounded-full bg-primary px-6 font-heading text-xl font-semibold text-primary-foreground focus-within:ring-2 focus-within:ring-ring">
          {busy ? "Procesando…" : "Subir imagen"}
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
        <div aria-live="polite">
          {error && (
            <p role="alert" className="text-base text-danger">
              {error}
            </p>
          )}
        </div>
      </SomaCard>

      <div aria-live="polite" className="space-y-4">
        {outcome && <Result outcome={outcome} />}
      </div>
    </section>
  );
}

const QUALITY_TONE: Record<QualityAssessment["state"], CardTone> = {
  valid: "ok",
  suspect: "warn",
  invalid: "danger",
};

function Result({ outcome }: { outcome: Outcome }) {
  const { observation, assessment, findings, findingsError } = outcome;

  return (
    <>
      <SomaCard
        title="Calidad de la imagen"
        chip={qualityLabel(assessment.state)}
        tone={QUALITY_TONE[assessment.state]}
        line={assessment.state === "valid" ? "La imagen se puede evaluar." : "Revisa la imagen o repite la captura."}
        detail={
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={outcome.previewUrl} alt="Imagen capturada" className="max-h-64 rounded-lg" />
            {assessment.reason && <p>{assessment.reason}</p>}
            <dl className="grid gap-1">
              <div className="flex gap-2"><dt className="text-muted-foreground">Observación:</dt><dd>{observation.id}</dd></div>
              <div className="flex gap-2"><dt className="text-muted-foreground">Señal:</dt><dd>{observation.signal} ({observation.unit})</dd></div>
            </dl>
          </>
        }
      />

      {findingsError && (
        <div role="alert">
          <SomaCard
            title="Sin hallazgos"
            tone="warn"
            chip="Aviso"
            line={findingsError.code === "image-not-evaluable" ? "La imagen no es evaluable. Repite la captura." : "No se pudieron mostrar."}
            detail={<p>{findingsError.reason}</p>}
          />
        </div>
      )}

      {findings && (
        <SomaCard
          title={findings.label}
          chip="Hallazgos preliminares"
          tone="info"
          line="No es un diagnóstico · requiere revisión del médico"
          detail={
            <>
              <p className="text-base">{findings.findings}</p>
              <p>Lo revisa el oficial médico a bordo.</p>
            </>
          }
        />
      )}
    </>
  );
}
