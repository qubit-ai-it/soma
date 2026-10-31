# Features — Soma

> Estado: **propuesta de la Fase 1, pendiente de tu elección**. Arquitectura: `docs/ARCHITECTURE.md`. Servicios: `docs/SERVICES.md`.
> Tamaños: **S** ≈ 1 sesión corta · **M** ≈ media jornada · **L** ≈ más de una jornada. Son estimaciones, no medidas.
> Reglas comunes a todas: `pnpm test`, `pnpm lint` y `pnpm build` en verde; probada con `SOMA_OFFLINE=true`; toda salida clínica muestra incertidumbre y exige validación humana; integraciones externas con versión real y mock.

## Cambios respecto a la lista inicial

- **Feature 1:** las tarjetas de tripulación ya existen (corte vertical de la Fase 0b). Queda el historial, las tendencias y el diseño de la web de misión. El badge de riesgo se enchufa en la feature 2, no aquí.
- **Feature 8** baja a **S**: `SOMA_OFFLINE`, los mocks y los fixtures ya existen. Falta la cadena de respaldo, el aviso en la UI y la verificación de extremo a extremo.
- **Feature 6** se parte en dos pasos internos (motor de estados primero, vista inmersiva después). Sigue siendo una sola feature.
- **Rutas (tarea 1b ✅):** la información se reparte por rutas según `docs/ROUTES.md`: `/` resume la misión y `/reporte/[id]/...` tiene una pestaña por tema. Las features 3 a 9 añaden su ruta siguiendo esa tabla.
- **Orden sugerido:** 1 → 2 → 3 → 4 → 5 → 7 → 6 → 8 → 9. La 6 va tarde porque es la más grande y no bloquea a las demás.

---

## 1. ✅ Web de misión: tripulación, tendencias y mapa corporal · L · sin dependencias

- **Objetivo:** que `/` sea el panel de la misión: tarjetas de tripulación, tendencias de signos vitales y, por cada miembro, un mapa del cuerpo con las zonas pintadas según su gravedad: **verde** = todo bien, **ámbar** = posible riesgo, **rojo** = riesgoso.
- **Librería:** [OrganUI](https://organui.com/) (MIT), componente `BodyMap`. Verificado en su documentación: no es un paquete npm, se instala como **código fuente** con el CLI de shadcn (`shadcn add @organui/body-map`, o `https://organui.com/r/body-map.json`); requiere React 19 y Tailwind 4; trae las dependencias `@base-ui/react`, `class-variance-authority` y `cn`, y el componente `button` de shadcn. `BodyMap` es un **selector de regiones** (vistas frontal y posterior, teclado accesible): **no tiene prop de color ni de severidad**, su doc indica editar el código instalado para sombrear por gravedad.
- **Archivos esperados:** `components.json`, `src/shared/ui/{body-map,button}.tsx` (+ `src/shared/lib/utils.ts` si shadcn lo pide), `data/seed/crew.json` (con historial), `features/crew/{crew.schema,crew.types,crew.logic}.ts` (tendencias y severidad por zona), `features/crew/components/{trend-chart,body-status,mission-header}.tsx`, `app/page.tsx`, `app/layout.tsx`.
- **Criterios de aceptación:**
  1. Cada tarjeta muestra la tendencia de al menos 3 señales (frecuencia cardíaca, SpO₂, sueño) a partir del historial del seed; la función de tendencia es pura y tiene tests (subiendo, bajando, estable, datos insuficientes).
  2. Cada miembro tiene un mapa corporal (OrganUI `BodyMap`, frontal y posterior) con sus zonas en verde, ámbar o rojo, calculadas por una función pura con tests (por señal: `ok` / `posible riesgo` / `riesgoso`; por zona: la peor de las señales que la afectan).
  3. Seleccionar una zona muestra qué señales y valores la pintaron, con el aviso "ilustrativo, no clínico". El color nunca es el único canal: cada zona y leyenda lleva texto (`Todo bien`, `Posible riesgo`, `Riesgoso`).
  4. El historial se valida con Zod; un JSON malformado produce el error de `error.tsx`, no una pantalla rota. Sin scroll horizontal a 375 px.
  5. OrganUI instalado como código fuente bajo `src/shared/ui` (alias de `components.json`), respetando `docs/ARCHITECTURE.md`; las dependencias nuevas listadas con su versión en el `REPORT.md`; `pnpm test`, `pnpm lint` y `pnpm build` en verde.
- **Supuestos (a validar por el usuario):**
  - Mapeo ilustrativo señal → zona: SpO₂ y frecuencia cardíaca → tórax; sueño → cabeza; dosis acumulada → abdomen y pelvis.
  - Dos umbrales por señal (ámbar y rojo). Ámbar conserva los de hoy: SpO₂ < 94, FC > 100, sueño < 6 h, dosis > 100 mSv. Rojo: SpO₂ < 90, FC > 120, sueño < 4 h, dosis > 150 mSv. Ninguno es orientación clínica.
- **Fuera de alcance:** clasificación de riesgo (feature 2), escritura de datos, alertas, autenticación, modelos 3D de órganos de OrganUI.

## 2. ✅ Clasificación de riesgo (Jev, Laya, mock) · M · depende de 1

- **Objetivo:** clasificar el riesgo por tripulante con el puerto `RiskClassifier` y mostrarlo en la tarjeta con su incertidumbre.
- **Archivos esperados:** `features/risk/{systemone.client,classifier.laya,classifier.jev}.ts`, `risk.logic.ts` (preguntas y umbrales por proveedor), `risk.queries.ts`, `components/risk-badge.tsx`, `server/services.ts`, `server/config.ts`.
- **Criterios de aceptación:**
  1. Un único cliente System One sirve a Jev y a Laya, parametrizado por URL, clave, mapa de modelos y umbrales.
  2. La cadena de respaldo es Jev → Laya → mock, y la UI muestra `source.provider` y `source.mode`.
  3. Las clasificaciones de Laya llevan la etiqueta "respaldo local · sin calibrar" (`calibrated: false`).
  4. Se muestran las probabilidades y la confianza, no solo la etiqueta.
  5. Las respuestas de los proveedores se validan con Zod; 401/429/529 se manejan sin lanzar (`Result`).
- **Fuera de alcance:** recalibrar Laya, entrenar modelos, usar el tipo `box`, guardar historial de clasificaciones.
- **Riesgo conocido:** el JSON exacto de `laya-serve` no está verificado (ver `SERVICES.md`). La primera tarea es una llamada real o un test de contrato.

## 3. Plan o tratamiento con MedGemma y respaldo · M · depende de 2

- **Objetivo:** generar un borrador de rutina o tratamiento a partir del riesgo y las señales, con aviso obligatorio de validación humana.
- **Archivos esperados:** `features/plan/{ollama.client,planner.schema}.ts`, `plan.actions.ts` o `plan.queries.ts`, `components/care-plan.tsx`, `data/fixtures/plan.json`, `app/reporte/[id]/plan/page.tsx` (pestaña "Plan").
- **Criterios de aceptación:**
  1. La salida del modelo se pide con `format: <JSON schema>` y se valida con Zod antes de mostrarse.
  2. Todo plan muestra "Borrador · requiere validación humana" y el campo `uncertainty`; el tipo no admite `requiresHumanValidation: false`.
  3. Si Ollama no responde, cae al plan de fixture y la UI lo indica (`source.mode`).
  4. Hay un test que prueba que una respuesta que no cumple el esquema se rechaza.
  5. Con `SOMA_OFFLINE=true` no se intenta ninguna conexión a Ollama.
- **Fuera de alcance:** historial médico, interacciones entre fármacos, cualquier afirmación de uso clínico.

## 4. Clima espacial y radiación (DONKI, SWPC, RadLab) · L · depende de 1

- **Objetivo:** mostrar el estado del clima espacial y la dosis de radiación, con caché y datos de respaldo.
- **Archivos esperados:** `features/space-weather/{donki.client,swpc.client,space-weather.queries}.ts`, `radiation.fixture.ts`, `components/*`, `data/runtime/cache/` (ignorado), `scripts/make-radiation-fixture.ts`.
- **Criterios de aceptación:**
  1. DONKI pide como máximo 30 días (el límite de la API es 60) y se cachea con `'use cache'` + `cacheLife`.
  2. La cadena de respaldo es live → última respuesta en disco → fixture, y la UI muestra el modo.
  3. SWPC aporta protones GOES, Kp y alertas, validados con Zod.
  4. Los datos de RadLab se rotulan como históricos (datos hasta ~2024) y no como "en vivo".
  5. El script regenera un fixture de RadLab con una ventana real de 24 h.
- **Fuera de alcance:** predecir eventos, modelar dosis por tripulante a partir del clima.
- **Riesgo conocido:** unidad de `absorbed_dose_rate` supuesta (µGy/h), sin verificar.

## 5. Sentry: check-in adaptativo · M · depende de 2

- **Objetivo:** un check-in conversacional que empieza simple y sube de complejidad solo cuando hay señal.
- **Archivos esperados:** `features/sentry/{sentry.logic,sentry.types,sentry.actions}.ts`, `components/{checkin-chat,voice-toggle}.tsx`, `app/sentry/page.tsx`.
- **Criterios de aceptación:**
  1. La lógica de escalado es pura y tiene tests: sin señal, 1 pregunta; con señal, preguntas de seguimiento.
  2. Las respuestas se validan en el servidor con Zod (las Server Actions son invocables por POST directo).
  3. La voz usa Web Speech API solo con `voice.localService === true` si no hay red; sin voz, hay texto.
  4. El resultado del check-in alimenta la clasificación de riesgo por el puerto, sin importar internos de otra feature.
  5. Operable solo con teclado y con lector de pantalla.
- **Fuera de alcance:** diagnóstico, voz en la nube, grabación de audio.

## 6. Motor de procedimientos AR/VR · L · depende de 1

- **Objetivo:** un motor de pasos y estados para procedimientos guiados, con modo práctica y modo en vivo, simulado en la web (`/xr`).
- **Archivos esperados:** `features/xr/{procedure.types,procedure.schema,procedure.machine}.ts`, `data/seed/procedures.json`, `components/stepper.tsx`, `app/xr/page.tsx`.
- **Criterios de aceptación:**
  1. La máquina de estados es pura y tiene tests: avanzar, retroceder, saltar, fallar un paso, completar.
  2. Práctica vs. en vivo: en práctica se puede reiniciar y no se registra nada; en vivo cada paso queda registrado.
  3. Los procedimientos se cargan desde JSON validado con Zod.
  4. `/xr` simula los pasos en la web; no hay dependencias de Unity ni del SDK de Meta.
  5. El estado sobrevive a un refresco de la página.
- **Fuera de alcance:** app de Quest 3, Ray-Ban Meta, seguimiento de manos, anclaje espacial.
- **Decisión tomada:** la guía visual real apunta a Quest 3 (las Ray-Ban Meta normales no tienen pantalla).

## 7. Alertas y escalamiento con registro de auditoría · M · depende de 2

- **Objetivo:** escalar al médico de a bordo o a Tierra según el riesgo, y dejar un registro inalterable de quién hizo qué.
- **Archivos esperados:** `features/alerts/{alerts.types,alerts.logic,alerts.repository,alerts.repository.json,alerts.actions,alerts.queries}.ts`, `data/seed/alerts.json`, `data/seed/audit.json`, `components/*`.
- **Criterios de aceptación:**
  1. Las reglas de escalamiento son funciones puras con tests (nivel de riesgo → destinatario).
  2. Cada alerta y cada acción (reconocer, escalar, cerrar) agrega una entrada al registro; las entradas solo se agregan, nunca se editan.
  3. Reconocer o cerrar una alerta exige un humano identificado; el sistema no cierra alertas por sí solo.
  4. Escritura concurrente segura con `json-store` (test con acciones simultáneas).
  5. El registro es visible y exportable a JSON.
- **Fuera de alcance:** notificaciones push o por correo, integración con sistemas reales de Tierra, autenticación real.

## 8. Modo degradado offline · S · depende de 2, 3 y 4

- **Objetivo:** asegurar y hacer visible que la app funciona sin internet ni claves.
- **Archivos esperados:** `server/services.ts`, `components/offline-banner.tsx`, `docs/SERVICES.md`, tests de composición.
- **Criterios de aceptación:**
  1. Con `SOMA_OFFLINE=true`, ninguna ruta intenta una conexión de red (verificado cortando la red).
  2. Un banner global indica el modo y qué datos son de respaldo.
  3. Un servicio externo caído degrada esa sola feature; el resto de la página sigue funcionando.
  4. Hay un test que comprueba que `SOMA_OFFLINE` gana sobre cada variable `*_PROVIDER`.
  5. `pnpm db:reset` deja el estado listo para la demo.
- **Fuera de alcance:** sincronización posterior, PWA o service worker.

## 9. Modo demo para el pitch · M · depende de 1 a 8

- **Objetivo:** un escenario guiado de 3 minutos, repetible y sin sorpresas.
- **Archivos esperados:** `features/demo/{demo.script,demo.logic}.ts`, `data/seed/demo-scenario.json`, `components/demo-controller.tsx`, `app/demo/page.tsx`.
- **Criterios de aceptación:**
  1. El guion tiene pasos con tiempos y se recorre con teclado (avanzar, retroceder, reiniciar).
  2. El escenario corre completo con `SOMA_OFFLINE=true` y vuelve al estado inicial con un comando.
  3. La interfaz distingue datos de demostración de datos reales.
  4. Un test recorre el guion entero y comprueba que todos los pasos referencian datos existentes.
  5. Se puede saltar a cualquier paso sin romper el estado.
- **Fuera de alcance:** grabación de video, narración automática, analítica.

---

## Decisiones abiertas (afectan a varias features)

1. **Resuelto:** `ORCHESTRATOR.md` creado en la raíz.
2. **Resuelto por ahora:** no hay clave de Jev. Jev y MedGemma se **simulan con datos aleatorios** (`simulated-jev`, `simulated-medgemma`). Las features 2 y 3 usan esas simulaciones como proveedor por defecto; los clientes reales se añaden cuando haya clave y hardware.
3. **Pendiente (ya no bloquea):** ¿las máquinas de demo pueden correr Ollama con MedGemma 1.5 4B (unos 3.3 GB) y Laya (unos 2.3 GB)? Solo importa para pasar de la simulación a los proveedores reales.
4. **Pendiente:** el nombre "SOMA" coincide con el *Space Omics and Medical Atlas* (Weill Cornell / OSDR). Conviene una línea en el pitch (feature 9).
