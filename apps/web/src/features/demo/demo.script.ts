export type DemoStep = {
  id: string;
  title: string;
  durationSec: number;
  href: string;
  onScreen: string;
  say: string;
  principle: string;
};

export const DEMO_STEPS: readonly DemoStep[] = [
  {
    id: "context",
    title: "Contexto de la misión",
    durationSec: 20,
    href: "/",
    onScreen: "Panel de misión con la tripulación y el riesgo.",
    say: "Misión larga, la Tierra tarda en responder. SOMA apoya decisiones; no es un médico.",
    principle: "Autonomía médica y apoyo a la decisión.",
  },
  {
    id: "baseline",
    title: "Baseline estable",
    durationSec: 20,
    href: "/reporte/cm-01/evaluacion",
    onScreen: "Escenario fatigue-sleep-hrv, checkpoint Baseline stable (F0).",
    say: "Cada persona se compara con su historia. F0 no es sano: ninguna regla se activó.",
    principle: "Baseline individual; F0 no equivale a normalidad.",
  },
  {
    id: "persistent",
    title: "Desviación persistente",
    durationSec: 30,
    href: "/reporte/cm-01/evaluacion",
    onScreen: "Avanzar a Early deviation, Deviation continues y Persistent and converging.",
    say: "Una variación aislada no escala. Varias señales que persisten llevan a F1 y F2.",
    principle: "Ruido contra tendencia y convergencia multimodal.",
  },
  {
    id: "evidence",
    title: "Evidencia y explicación",
    durationSec: 30,
    href: "/reporte/cm-01/evaluacion",
    onScreen: "Panel ¿Por qué? con reglas, baseline, calidad y límites. Luego Sentry en /pet.",
    say: "Cada estado trae su evidencia. Sentry la explica, pero las reglas deciden.",
    principle: "La IA explica, las reglas deciden.",
  },
  {
    id: "plan",
    title: "Plan y borrador",
    durationSec: 30,
    href: "/reporte/cm-01/plan",
    onScreen: "Pasos pre-aprobados y borrador pendiente de validación.",
    say: "Los pasos aprobados arrancan ya. El borrador de la IA espera a un médico en Tierra.",
    principle: "Protocolos aprobados contra propuestas de IA.",
  },
  {
    id: "earth",
    title: "Tierra valida el borrador",
    durationSec: 30,
    href: "/tierra",
    onScreen: "Consola de Tierra: aprobar, modificar o rechazar, con el rol Tierra.",
    say: "El médico aprueba, modifica o rechaza. La respuesta vuelve por la cola con confirmación.",
    principle: "Revisión humana y store-and-forward.",
  },
  {
    id: "xr",
    title: "Procedimiento guiado en XR",
    durationSec: 40,
    href: "/xr",
    onScreen: "Página XR en el Quest: pasos, captura, calidad y hallazgos preliminares.",
    say: "El procedimiento se guía paso a paso. La imagen vuelve como observación, con su calidad.",
    principle: "Procedimiento guiado; la calidad del dato es evidencia.",
  },
  {
    id: "followup",
    title: "Seguimiento de la evolución",
    durationSec: 25,
    href: "/reporte/cm-01/seguimiento",
    onScreen: "Ventanas de revisión, adherencia y estado por ventana.",
    say: "Se mide la mejoría contra el baseline congelado. Bajar de estado exige varias ventanas y confirmación humana.",
    principle: "El baseline no absorbe la desviación.",
  },
  {
    id: "insufficient",
    title: "Datos insuficientes",
    durationSec: 20,
    href: "/reporte/cm-01/evaluacion",
    onScreen: "Escenario insufficient-data: NO EVALUABLE.",
    say: "Si faltan datos, el sistema lo dice. No evaluable no es F0.",
    principle: "Incertidumbre explícita.",
  },
  {
    id: "safety-gate",
    title: "Safety gate en F3",
    durationSec: 30,
    href: "/reporte/cm-01/evaluacion",
    onScreen: "Escenario critical-f3. Disparar la alerta F3 desde esta tarjeta.",
    say: "En F3 se apaga la generación libre y sale un protocolo aprobado. Se avisa a tripulación y Tierra.",
    principle: "Safety gate y mínimo dato necesario.",
  },
  {
    id: "offline",
    title: "Sin enlace con Tierra",
    durationSec: 30,
    href: "/tierra",
    onScreen: "Cortar el enlace, ver el paquete en cola, reconectar y ver la confirmación.",
    say: "Sin enlace todo sigue. Los paquetes esperan en cola y se sincronizan sin duplicar efectos.",
    principle: "Offline-first e idempotencia.",
  },
  {
    id: "audit",
    title: "Auditoría",
    durationSec: 25,
    href: "/alertas",
    onScreen: "Alertas por rol y registro con la propuesta de la IA junto a la decisión humana.",
    say: "Queda registrado qué propuso el modelo y qué decidió el humano. El registro solo se agrega.",
    principle: "Trazabilidad completa.",
  },
  {
    id: "close",
    title: "Qué es y qué no es SOMA",
    durationSec: 20,
    href: "/",
    onScreen: "Volver al panel de misión.",
    say: "Prototipo de investigación: sin validación clínica.",
    principle: "Límites declarados.",
  },
];
