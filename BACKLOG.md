# BACKLOG.md — SOMA hacia el flujo de demo

> Deriva de `FLOW.md` y del estado del repo al 2026-11-15. Tamaños: **S** ≈ sesión corta · **M** ≈ media jornada · **L** ≈ más de una jornada (estimaciones, no medidas).
> Supuesto a confirmar: el caso hilo de la demo es **fatiga y sueño reducido con cambio de HRV**.

## Estado actual

| Área | Estado |
|---|---|
| Web de misión: tripulación, tendencias, mapa corporal (F1) | ✅ hecho |
| Clasificación de riesgo Jev/Laya/mock (F2) | ✅ hecho, con simulación `simulated-jev` |
| Plan con MedGemma/Ollama y respaldo (F3) | ✅ hecho, con simulación `simulated-medgemma` |
| Clima espacial (F4) | Solo puertos y fixtures en esta rama. Existe `feat/04-space-weather` sin integrar |
| Sentry / `/pet` | Asistente con chat (Gemini), voz manos libres, adjuntos de imagen, historial y tareas |
| Motor de procedimientos XR (F6) | No existe |
| Alertas y auditoría (F7), offline (F8), modo demo (F9) | No existen |
| Diseño | Tokens, tema oscuro y restyle hechos |
| **Motor determinista (baseline, F0–F3, `NOT_EVALUABLE`)** | **No existe.** Hoy hay umbrales ámbar/rojo por señal en `crew.logic.ts` |
| **Roles, Tierra, store-and-forward, seguimiento** | **No existen** |

Lo que más pesa: el corazón del documento (el motor determinista) todavía no está construido.

## Backlog (ordenado por dependencia)

### A. Núcleo determinista
| # | Tarea | Tam. | Depende |
|---|---|---|---|
| A1 | Modelo `Observation` con procedencia y calidad (tipos + Zod + tests) | S | — |
| A2 | Baseline personal y `baseline_delta` (puro, con tests; congelable durante tratamiento) | M | A1 |
| A3 | Motor de reglas versionado: F0–F3 y `NOT_EVALUABLE`, persistencia, evidencia vinculada (puro, con tests de borde) | L | A1, A2 |
| A4 | Dataset sintético del caso hilo, separado de las reglas (evita validación circular) | M | A1 |

### B. Plan y protocolos
| # | Tarea | Tam. | Depende |
|---|---|---|---|
| B1 | Biblioteca de protocolos pre-aprobados (JSON + Zod), editable por "Tierra" | M | — |
| B2 | Adaptar el plan (F3): pasos pre-aprobados inmediatos vs. borrador pendiente de validación | M | A3, B1 |
| B3 | Enrutador de protocolo con proveedor tipo System One (`choice`) | S | B1 |

### C. Seguimiento
| # | Tarea | Tam. | Depende |
|---|---|---|---|
| C1 | Contrato de seguimiento y estados `mejorando / estable / empeorando / NO_EVALUABLE` con histéresis | M | A3, B2 |
| C2 | Adherencia (pasos y sesiones XR) y autorreporte estructurado (`score`) | M | C1 |

### D. XR
| # | Tarea | Tam. | Depende |
|---|---|---|---|
| D1 | Motor de procedimientos (F6, paso 1): máquina de estados pura | M | — |
| D2 | Detección de Quest con WebXR y fallback simulado en `/xr` | M | D1, H5 |
| D3 | Captura (ultrasonido): subida de imagen, evaluación de calidad, vuelve como `Observation` | M | A1, D1 |
| D4 | Hallazgos preliminares con LLM y guardarraíl (`noul`): nunca diagnóstico | M | D3 |

### E. Ecosistema
| # | Tarea | Tam. | Depende |
|---|---|---|---|
| E1 | Roles: astronauta, CMO, comandante, Tierra, con vistas y permisos mínimos (mock, sin auth real) | M | — |
| E2 | Cola store-and-forward con idempotencia y acknowledgement | L | A1 |
| E3 | Consola de Tierra: aprobar / modificar / rechazar propuestas | M | E1, E2, B2 |
| E4 | Alertas F3 y registro de auditoría append-only (F7) | M | A3, E1 |

### F. Integraciones
| # | Tarea | Tam. | Depende |
|---|---|---|---|
| F1 | Clima espacial: revisar y integrar `feat/04-space-weather` (F4) | L | — |
| F2 | Proveedores intercambiables: Jev, Laya, self-hosted, Gemini, MiniMax, MedGemma, con proveedor y versión registrados | M | — |
| F3 | Verificar el self-hosted de Jev ("Kev") y escribir su adaptador | S | F2 |
| F4 | Sentry pasivo: recibe evidencia del motor, explica y redacta borradores. No decide | M | A3 |

### H. Dispositivos y sincronización
| # | Tarea | Tam. | Depende |
|---|---|---|---|
| H1 | Interfaz `SourceAdapter` + simulador (siempre disponible) e importador de histórico | M | A1 |
| H2 | Adaptador BLE de frecuencia cardíaca (Web Bluetooth) para el smartwatch, con `provenance: real` y fallback al simulador | M | H1 |
| H3 | Registro de dispositivos (`id`, tipo, rol, estado, último contacto) y panel "Dispositivos" | M | H1 |
| H4 | Canal de sincronización dashboard ↔ XR (SSE o WebSocket local): el servidor es la fuente de verdad del estado del procedimiento; emparejamiento por código o QR | L | H3, D1 |
| H6 | Perfil de capacidades por dispositivo y selección de experiencia (inmersiva en XR, 2D en laptop o celular, compacta en reloj) | M | H3 |
| H5 | HTTPS local para WebXR (certificado de desarrollo) y verificación en el Quest | S | — |

### G. Cierre
| # | Tarea | Tam. | Depende |
|---|---|---|---|
| G1 | Modo offline visible (F8): cadena de respaldo y banner | S | F2 |
| G2 | Modo demo (F9): guion de los 11 pasos de `FLOW.md`, repetible y offline | M | todo lo anterior |

## Por dónde empezar

1. **A1 → A2 → A3 → A4.** Todo lo demás depende del motor y de los datos del caso hilo.
2. En paralelo, **D1** y **E1** no dependen de nada y pueden avanzar sin chocar.
3. Después **B → C → E2/E3**, y al final **D2–D4**, **G**.

Primer corte demostrable: A1–A4 con una vista que muestre F0 → F1 → F2 con evidencia.

## Riesgos y pendientes

- **Kev:** no pude confirmarlo. La documentación de Jev dice que no hay self-hosting. Solo una fuente sin corroborar menciona una réplica abierta llamada NanoJev. Mientras tanto, Laya cubre el respaldo local con el mismo protocolo. Ver F3.
- Umbrales y reglas: son de demostración y deben declararse como propias del proyecto.
- Criterios de `mejorando` / `empeorando` y de histéresis sin definir (C1).
- Contenido real de la biblioteca de protocolos sin definir (B1).
- Ramas `feat/01`–`feat/04` y `feature/sentry-*` sin integrar a `main`; conviene decidir cuáles se fusionan.
