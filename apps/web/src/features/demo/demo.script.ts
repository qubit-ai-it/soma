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
    onScreen: "Panel de misión con la tripulación y la clasificación de riesgo simulada.",
    say: "Misión larga, la Tierra tarda o no responde. SOMA es un prototipo de apoyo a decisiones, no un médico. Los datos de hoy son sintéticos.",
    principle: "Problema de autonomía médica y honestidad sobre la procedencia de los datos.",
  },
  {
    id: "baseline",
    title: "Baseline estable",
    durationSec: 20,
    href: "/reporte/cm-01/evaluacion",
    onScreen: "Evaluación, escenario fatigue-sleep-hrv, checkpoint Baseline stable (F0).",
    say: "Se compara a la persona con su propia historia. F0 no significa sano: significa que ninguna regla se activó.",
    principle: "Baseline individual y F0 no equivale a normalidad.",
  },
  {
    id: "persistent",
    title: "Desviación persistente",
    durationSec: 30,
    href: "/reporte/cm-01/evaluacion",
    onScreen: "Mismo escenario: avanzar a Early deviation, Deviation continues y Persistent and converging.",
    say: "Una variación aislada no escala. Cuando varias señales se desvían y la desviación persiste, el motor pasa a F1 y luego a F2.",
    principle: "Ruido contra tendencia, persistencia y convergencia multimodal.",
  },
  {
    id: "evidence",
    title: "Evidencia y explicación",
    durationSec: 30,
    href: "/reporte/cm-01/evaluacion",
    onScreen: "Panel ¿Por qué? con reglas, baseline, calidad, procedencia y limitaciones. Luego Sentry en /pet.",
    say: "Cada estado trae su evidencia. Sentry lo explica en lenguaje natural, pero no cambia el resultado: las reglas deciden.",
    principle: "La IA explica, las reglas deciden.",
  },
  {
    id: "plan",
    title: "Plan: pasos pre-aprobados y borrador",
    durationSec: 30,
    href: "/reporte/cm-01/plan",
    onScreen: "Pasos pre-aprobados por médicos de Tierra y borrador pendiente de validación.",
    say: "Los pasos aprobados arrancan ya. Lo que propone la IA es un borrador y espera la validación de un médico en Tierra.",
    principle: "Protocolos aprobados contra propuestas de IA.",
  },
  {
    id: "earth",
    title: "Tierra valida el borrador",
    durationSec: 30,
    href: "/tierra",
    onScreen: "Consola de Tierra: aprobar, modificar o rechazar una propuesta, con el rol Tierra.",
    say: "El médico en Tierra aprueba, modifica o rechaza. La respuesta viaja por la cola y vuelve con confirmación.",
    principle: "Revisión humana y store-and-forward.",
  },
  {
    id: "xr",
    title: "Procedimiento guiado en XR",
    durationSec: 40,
    href: "/xr",
    onScreen: "Página XR en el Quest: pasos, captura de imagen, calidad y hallazgos preliminares.",
    say: "El astronauta no tiene que recordar el procedimiento: se lo guía paso a paso. La imagen vuelve como una observación nueva, con su calidad.",
    principle: "Procedimientos guiados y la calidad del dato forma parte de la evidencia.",
  },
  {
    id: "followup",
    title: "Seguimiento de la evolución",
    durationSec: 25,
    href: "/reporte/cm-01/seguimiento",
    onScreen: "Ventanas de revisión, adherencia y estado por ventana.",
    say: "Se mide si la persona mejora contra su baseline congelado. Bajar de estado exige varias ventanas seguidas y confirmación humana.",
    principle: "El baseline no absorbe la desviación y la mejoría necesita confirmación.",
  },
  {
    id: "insufficient",
    title: "Datos insuficientes",
    durationSec: 20,
    href: "/reporte/cm-01/evaluacion",
    onScreen: "Escenario insufficient-data: NO EVALUABLE.",
    say: "Si faltan datos, el sistema lo dice. No evaluable no es F0: la ausencia de datos no es normalidad.",
    principle: "Incertidumbre explícita.",
  },
  {
    id: "safety-gate",
    title: "Safety gate en F3",
    durationSec: 30,
    href: "/reporte/cm-01/evaluacion",
    onScreen: "Escenario critical-f3: protocolo aprobado y generación libre desactivada. Disparar la alerta F3 desde el controlador.",
    say: "En F3 se apaga la generación libre y se muestra un protocolo aprobado. Se notifica a la tripulación y a Tierra con lo mínimo.",
    principle: "Safety gate y mínimo dato necesario.",
  },
  {
    id: "offline",
    title: "Sin enlace con Tierra",
    durationSec: 30,
    href: "/tierra",
    onScreen: "Apagar el enlace, ver el paquete en cola, reconectar y ver la confirmación sin duplicados.",
    say: "Sin enlace todo sigue funcionando. Los paquetes quedan en cola y se sincronizan al volver, sin duplicar efectos.",
    principle: "Offline-first e idempotencia.",
  },
  {
    id: "audit",
    title: "Auditoría",
    durationSec: 25,
    href: "/alertas",
    onScreen: "Alertas por rol y el registro con la propuesta de la IA junto a la decisión humana.",
    say: "Queda registrado qué propuso el modelo, con su versión, y qué decidió el humano. El registro solo se agrega.",
    principle: "Trazabilidad completa.",
  },
  {
    id: "close",
    title: "Qué es y qué no es SOMA",
    durationSec: 20,
    href: "/",
    onScreen: "Volver al panel de misión.",
    say: "Prototipo de investigación: sin validación clínica, umbrales de demostración, datos sintéticos. Falta validar con médicos y hardware real.",
    principle: "Límites declarados.",
  },
];
