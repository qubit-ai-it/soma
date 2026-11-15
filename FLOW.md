# FLOW.md — Flujo de demo de SOMA (borrador para refinar)

> Prototipo de investigación y apoyo a decisiones. Los datos de la demo son sintéticos o históricos y deben rotularse como tales. Los umbrales son reglas de demostración propias del proyecto.

## Roles

| Rol | Qué hace | Qué ve |
|---|---|---|
| **Astronauta** | Usa el dashboard, sigue el plan, ejecuta procedimientos guiados en XR | Sus propios datos |
| **Oficial médico a bordo (CMO)** | Revisa evidencia de la tripulación, confirma o descarta acciones, puede escalar a mano | Evidencia de la tripulación, con permiso ampliado |
| **Comandante** | Recibe impacto operacional | Resumen sin detalle clínico |
| **Supervisor / médico en Tierra** | Cura la biblioteca de protocolos antes de la misión, valida o modifica propuestas vía store-and-forward | Paquetes sincronizados |
| **Auditor / científico** (opcional) | Revisa reglas, versiones y trazabilidad | Solo lectura, datos pseudonimizados |
| **Sentry** (asistente) | Comunica, explica y redacta borradores. No decide | Evidencia estructurada que le entrega el motor |

Privacidad: F0–F2 solo lo ven el astronauta y el CMO. F3 es la excepción: se notifica a la tripulación y a Tierra con lo mínimo (estado y acción).

## Flujo principal

1. **Datos.** Wearables, IoT, DONKI y autorreporte entran al dashboard con procedencia (real / histórico / sintético) y calidad.
2. **Motor determinista.** Analiza de forma pasiva con baseline individual, persistencia y reglas versionadas. Devuelve F0–F3 o `NOT_EVALUABLE`. Sin datos suficientes no hay plan.
3. **Plan de seguimiento.**
   - Los **pasos pre-aprobados** (biblioteca curada por médicos en Tierra) arrancan de inmediato.
   - Lo que Sentry proponga fuera de esa biblioteca es un **borrador pendiente de validación** y viaja a Tierra.
   - En **F3** se muestra el protocolo aprobado al instante, sin generación libre.
4. **Procedimiento guiado en XR.** Un Meta Quest guía el procedimiento (caso recomendado: ultrasonido, no radiografía). El módulo detecta el dispositivo con WebXR. Los assets son locales por el requisito offline-first.
5. **Resultado como nueva observación.** Lo capturado vuelve al sistema con procedencia ("autotomado, guiado por XR") y calidad de imagen evaluada.
6. **Hallazgos preliminares.** MedGemma redacta hallazgos preliminares, nunca un diagnóstico. El CMO los revisa.
7. **Validación en Tierra.** El médico aprueba, modifica o rechaza. Se audita la propuesta de la IA (con versión del modelo) frente a la decisión humana.
8. **Seguimiento.** Ver la sección siguiente. El motor reevalúa con los datos nuevos.

## Seguimiento de la evolución

Al crear el plan se define un **contrato de seguimiento** con reglas deterministas:

- **Señales objetivo** y la dirección esperada respecto al baseline individual.
- **Ventanas de revisión** (cuándo se evalúa de nuevo).
- **Adherencia:** pasos completados, sesiones XR realizadas.
- **Autorreporte periódico:** síntomas y fatiga, estructurados por Jev.

Resultado de cada revisión: `mejorando`, `estable`, `empeorando` o `NO_EVALUABLE`.

- `empeorando` sube el estado y notifica a Tierra.
- `mejorando` no baja el estado de forma automática. Baja con histéresis (varias ventanas consecutivas) y confirmación del CMO o de Tierra.
- **El baseline se congela durante el tratamiento** para no absorber la desviación ni el efecto del tratamiento.
- Se registra el inicio del plan en la línea de tiempo para distinguir efecto de tratamiento de variación espontánea.
- Si cambia la adherencia o la calidad del dato, el resultado es `NO_EVALUABLE`, no "mejoró".

## Dónde entra Jev

Jev (TypeSafe AI, System One) es un modelo de decisión: no genera texto, devuelve respuestas tipadas con probabilidad (`choice`, `score`, `noul`). Es rápido y barato, y ya está en el repo como clasificador de riesgo (con respaldo Laya y mock).

Es **probabilístico**, así que no decide F0–F3. Se usa en la capa que estructura, no en la que decide:

| Uso | Tipo | Ejemplo |
|---|---|---|
| Estructurar el autorreporte o la voz | `choice` / `score` | Texto libre → categoría de síntoma y severidad, confirmada por el usuario |
| Enrutar al protocolo | `choice` | Elegir entre protocolos **ya aprobados** de la biblioteca |
| Puntuar evolución subjetiva | `score` | Fatiga o dolor en cada revisión de seguimiento |
| Guardarraíl sobre la salida de MedGemma | `noul` | "¿El texto contiene un diagnóstico o una prescripción?" Si sí, se bloquea |

Cuidados:
- Registrar versión del modelo y confianza en cada uso. Baja confianza se trata como "pedir confirmación", nunca como dato.
- Jev no tiene self-hosting según la documentación, lo que choca con offline-first. Por eso la cadena **Jev → Laya (local) → mock** es parte del diseño, no un detalle.
- La latencia baja es una afirmación de terceros; no está verificada.

## Pendientes para refinar

- Caso concreto que será el hilo de la demo (anomalía y procedimiento XR).
- Reglas de demostración y umbrales (declarados como propios).
- Criterios exactos de `mejorando` / `empeorando` y de histéresis.
- Contenido de la biblioteca de protocolos pre-aprobados.
- Qué viaja a Tierra y qué ven la tripulación y el comandante.
