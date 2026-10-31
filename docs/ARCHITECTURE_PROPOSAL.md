# Propuesta de arquitectura — Prototipo Soma

> Estado: **superada**. Se eligió la alternativa B el 2026-10-31; la versión vigente es `ARCHITECTURE.md`. Este archivo queda como registro de las alternativas. Fecha: 2026-10-30.
> Alcance: prototipo local (sin despliegue, sin auth). Stack real del repo: Next.js **16.4.3**, React 19.3, TypeScript strict, Tailwind 4, **pnpm**, App Router en `apps/web/src/app`, `cacheComponents: true`.

## TL;DR

**Recomendación: Alternativa B — módulos por feature ("screaming") con puertos solo en los bordes.**
Cada feature (`crew`, `risk`, `plan`, `space-weather`, `sentry`, `xr`) vive en su carpeta con tipos, lógica pura, su punto de entrada de servidor (Data Access Layer) y sus adaptadores. Solo se definen interfaces donde **de verdad** habrá intercambio: el repositorio (JSON → SQLite/FastAPI) y los clientes externos (real/mock). Un único archivo de composición elige adaptadores según `.env`. Sin contenedor DI, sin clases de caso de uso.

Por qué: es lo mínimo que satisface las restricciones 1 y 3 (persistencia y servicios intercambiables) sin la ceremonia de una arquitectura hexagonal completa, y los nombres de carpeta cuentan qué hace el producto, lo que ayuda a un integrante nuevo.

---

## 0. Hallazgos sobre el repo actual

| Hallazgo | Impacto |
|---|---|
| No existe `soma/lib/soma.ts`; el scaffold es un Next.js recién creado en `apps/web` | Los datos simulados se crean desde cero en la Fase 0b |
| El proyecto usa **pnpm** (`pnpm-lock.yaml`), no npm | Los briefings deben decir `pnpm build`, no `npm run build` |
| `apps/web/.gitignore` ignora `.env*` | También ignoraría `.env.example`; hay que añadir `!.env.example` |
| `cacheComponents: true` en `next.config.ts` | Cambia cómo se leen los JSON (ver §3.2). Es la restricción técnica más importante |
| `AGENTS.md` exige leer `node_modules/next/dist/docs/` | Toda decisión de Next abajo cita esas docs locales (`D/` = `node_modules/next/dist/docs/01-app/`) |

---

## 1. Alternativas consideradas

### A. Capas al estilo Next.js: `app/` + `lib/` con DAL y DTOs

```
apps/web/src/
  app/            page.tsx · sentry/page.tsx · xr/page.tsx · */actions.ts
  lib/
    dal/          crew.ts · risk.ts · plan.ts      # 'server-only', devuelve DTOs
    clients/      classifier.ts · llm.ts · nasa.ts
    store/        json-store.ts
    config.ts
  components/
apps/web/data/*.json
```

| Pros | Contras |
|---|---|
| Calca la guía oficial de *Data Security* (`D/02-guides/data-security.md`) | `lib/` se convierte en cajón de sastre |
| Mínimos conceptos, arranque rapidísimo | El intercambio real/mock termina como `if` dispersos, salvo que añadas interfaces igual |
| | La estructura no "grita" qué hace el producto |

**Complejidad:** baja.

### B. Módulos por feature con puertos en los bordes (**recomendada**)

```
apps/web/
  data/
    seed/            # JSON de partida (versionado)
    runtime/         # "base de datos" viva (gitignored, se crea desde seed)
    fixtures/        # respuestas de ejemplo para mocks (versionado)
  src/
    app/                         # rutas finas: solo componen features
      page.tsx                   # "/"  web de misión
      sentry/page.tsx
      xr/page.tsx
      layout.tsx · error.tsx · not-found.tsx
    features/
      crew/
        crew.types.ts            # tipos de dominio + DTOs
        crew.logic.ts            # funciones puras (testeables)
        crew.repository.ts       # puerto (interface)
        crew.repository.json.ts  # adaptador JSON
        crew.queries.ts          # lectura, 'server-only' (DAL)
        crew.actions.ts          # mutaciones, 'use server'
        components/              # UI de la feature
      risk/                      # classifier.port.ts · systemone.client.ts · classifier.mock.ts …
      plan/                      # planner.port.ts · ollama.client.ts · planner.mock.ts …
      space-weather/             # donki/swpc clients + mocks + caché
      sentry/
      xr/
    server/
      config.ts                  # lee y valida process.env (único lugar)
      services.ts                # composición: elige adaptador según config
      json-store.ts              # lectura/escritura atómica + mutex
    shared/
      result.ts · ui/
```

| Pros | Contras |
|---|---|
| Las carpetas describen el producto ("screaming architecture") | Un poco más de ceremonia: interface + adaptador en los bordes |
| Swap JSON → SQLite/FastAPI = un adaptador nuevo + una línea en `services.ts` | Hay que respetar una regla: una feature no importa internos de otra |
| Real/mock para Jev, Laya, MedGemma, NASA con el mismo patrón | |
| Lógica pura testeable sin Next ni red | |
| Un integrante puede "adueñarse" de una carpeta | |

**Complejidad:** baja-media.

### C. Hexagonal / Clean completa

```
src/domain/{entities,value-objects}/
src/application/{use-cases,ports}/
src/infrastructure/{persistence,http,llm}/
src/interface/next/
src/di/container.ts
```

| Pros | Contras |
|---|---|
| Aislamiento máximo | Una clase de caso de uso por operación sobre JSON = boilerplate |
| | Las clases no cruzan la frontera RSC ni la serialización de `'use cache'` (`D/03-api-reference/01-directives/use-cache.md`), así que igual hay que mapear a objetos planos |
| | Un contenedor DI choca con las exportaciones de módulo `'use server'` |
| | Cuatro capas para cambiar un formulario: mala experiencia para un recién llegado en una hackathon |

**Complejidad:** alta. **Descartada:** es excesiva para un prototipo. El propio Cockburn aclara que el patrón hexagonal no exige capas ni DI; el valor está en poder correr la app con adaptadores mock, y eso B ya lo da.

---

## 2. Recomendación: B en versión ligera

Reglas concretas:

1. **Dominio = tipos planos + funciones puras.** Nada de clases. Todo lo que cruza al cliente es un objeto serializable.
2. **Interfaces solo donde hay intercambio real:** repositorios de persistencia y los clientes externos (clasificador, planificador, clima espacial, radiación).
3. **Una sola composición** (`src/server/services.ts`): lee `config.ts` y devuelve los adaptadores. Sin librería DI.
4. **Rutas finas.** `app/**/page.tsx` solo compone componentes de features.
5. **Importaciones solo hacia abajo:** `app → features → server/shared`. Una feature no importa los internos de otra; si necesita algo, lo pide por su `*.queries.ts`.

---

## 3. Cómo se resuelven las restricciones

### 3.1 Persistencia JSON y migración futura (restricción 1)

- Cada feature con datos define un **repositorio** async (`CrewRepository`) que devuelve tipos de dominio. La UI y la lógica nunca saben que hay JSON detrás.
- Adaptador actual: `*.repository.json.ts` sobre `server/json-store.ts`.
- Migración: SQLite → `crew.repository.sqlite.ts`; FastAPI → `crew.repository.http.ts`. Se cambia **una línea** en `services.ts`. Ni la lógica ni la UI se tocan.
- Datos en `apps/web/data/`, **fuera de `src/`**, leídos con `fs/promises` y `path.join(process.cwd(), 'data', …)`. **Nunca** `import x from './x.json'`: lo mete en el grafo de módulos y Next lo pre-renderiza en el HTML estático (`D/01-getting-started/08-caching.md:393-400`).
- `data/seed/` (versionado) → `data/runtime/` (ignorado). Si falta un archivo runtime se copia del seed; un script `db:reset` restaura el estado para la demo.

### 3.2 Lecturas con `cacheComponents: true` (crítico)

**Verificado en la doc local:** con Cache Components, la E/S síncrona (`readFileSync`) se ejecuta en el prerender y **queda congelada en el HTML del build** (`08-caching.md:393-400`). Un `await readFile()` cuenta como dato dinámico, y debe ir dentro de `'use cache'` o detrás de `<Suspense>` (`:439`).

Decisión:
- Repositorios JSON leen con `fs/promises`, **sin caché**. Las páginas envuelven los componentes con datos en `<Suspense>`. Así un cambio en el JSON se ve en el siguiente request, sin invalidaciones que olvidar.
- `'use cache'` + `cacheLife` solo para **datos externos de solo lectura** (DONKI, SWPC), donde sí aporta: evita golpear la API en cada render.

### 3.3 Escritura atómica y concurrencia

`server/json-store.ts`, unas 40 líneas, **sin dependencias**:

1. Escribe en `archivo.json.<pid>.<rand>.tmp` con `writeFile(..., { flush: true })`.
2. `rename(tmp, archivo)`. Node documenta que `rename` sobrescribe el destino si existe (nodejs.org/api/fs.html#fsrenameoldpath-newpath-callback).
3. **Windows:** reintenta el `rename` 3–5 veces con backoff corto ante `EPERM`, `EBUSY` o `EACCES`. Un antivirus, el indexador o el editor pueden bloquear el archivo.
4. **Mutex en proceso por ruta** (`Map<ruta, Promise>`), que serializa el ciclo completo leer-modificar-escribir. Node advierte que no es seguro llamar a `writeFile` repetidamente sobre el mismo archivo sin esperar (nodejs.org/api/fs.html#fspromiseswritefilefile-data-options).
5. El mapa de locks vive en `globalThis`, para sobrevivir al re-evaluado de módulos del HMR en dev. Es el patrón que documenta Prisma para Next.js.

Alcance: esto basta para **un proceso local**. Si hubiera varios procesos, no; ver §6.

Alternativa evaluada: `steno` (el escritor de lowdb), con escrituras atómicas y ordenadas. `lowdb` agrega una API que no hace falta. Prefiero cero dependencias.

### 3.4 Puertos para Jev/Laya, MedGemma y NASA (restricción 3)

| Puerto | Adaptadores | Selección |
|---|---|---|
| `RiskClassifier` | `SystemOneClient` (sirve **Jev y Laya**: mismo endpoint `POST /v1/systemone`), `MockClassifier` | `CLASSIFIER_PROVIDER=jev\|laya\|mock` |
| `CarePlanner` | `OllamaPlanner` (MedGemma 1.5 4B), `MockPlanner` | `PLANNER_PROVIDER=ollama\|mock` |
| `SpaceWeatherSource` | `DonkiClient` + `SwpcClient`, `FixtureSpaceWeather` | `SPACE_WEATHER_PROVIDER=live\|fixture` |
| `RadiationSource` | `FixtureRadiation` (RadLab), `RadlabClient` opcional | `RADIATION_PROVIDER=fixture\|live` |

Un **único** cliente System One para Jev y Laya, parametrizado por base URL, clave, mapa de modelos y umbrales. Es necesario porque Laya difiere de Jev (detalle en `SERVICES.md`):
- usa otros nombres de modelo;
- no tiene el tipo `box`;
- exige descripción en cada nivel de `score`;
- calcula `confidence` de otra forma.

Toda respuesta de un puerto incluye **`source: { provider, mode: 'live' | 'cache' | 'mock', fetchedAt }`**, y la UI siempre la muestra. Para el clasificador, también las probabilidades y un aviso de "sin calibrar" cuando el proveedor es Laya.

`SOMA_OFFLINE=true` fuerza todos los puertos a mock/fixture, para hacer la demo sin internet.

### 3.5 Entidades vs DTOs

- **Tipos de dominio** (`crew.types.ts`): la forma completa con la que trabaja la lógica.
- **DTO**: lo que `*.queries.ts` entrega a la UI. Es mínimo, serializable y con campos derivados ya calculados. Sigue el patrón DAL→DTO de la doc oficial (`D/02-guides/data-security.md`).
- En un prototipo los DTOs se crean **solo cuando la forma de la UI difiere del dominio**. No se duplica por ritual.

### 3.6 Errores

| Tipo | Manejo |
|---|---|
| Esperado (validación, servicio caído) | Se devuelve un `Result<T>` (`{ ok: true, value } \| { ok: false, error }`), sin lanzar. Next recomienda modelar los errores esperados de Server Actions como valores de retorno (`D/01-getting-started/10-error-handling.md`) |
| Servicio externo falla | Cadena de respaldo **live → última caché en disco → fixture**, con `source.mode` visible en la UI |
| Bug inesperado | Se lanza; lo atrapa `error.tsx` de la ruta |
| Recurso inexistente | `notFound()` + `not-found.tsx` |

### 3.7 Validación de entradas

Toda entrada externa se valida en el servidor: formularios de Server Actions, variables de entorno y respuestas de Jev/Laya/Ollama/NASA. Las Server Actions son invocables por POST directo (`D/02-guides/data-security.md`).

| Opción | Pros | Contras |
|---|---|---|
| **Zod v4** (recomendada) | Una sola herramienta para env, acciones y respuestas externas. Aparece en la guía de formularios de Next (`D/02-guides/forms.md`). Corre en servidor, así que el tamaño no importa | **Dependencia nueva**: hoy solo está como transitiva de ESLint y no se puede importar |
| Valibot | Muy pequeña | Menos conocida por el equipo |
| Guards a mano | Cero dependencias | Propensos a errores con payloads anidados (NASA, LLM) |

→ **Pido tu aprobación** para `zod` (ver preguntas abiertas).

### 3.8 Servidor vs cliente

| Corre en servidor | Corre en cliente |
|---|---|
| Lectura/escritura JSON, todos los adaptadores externos, claves de API, `config.ts` | Interacción: chat/check-in de Sentry, stepper de XR, gráficas, TTS (Web Speech API) |
| Páginas (Server Components por defecto) | Solo hojas interactivas con `'use client'` |

- `import 'server-only'` en `*.queries.ts`, `services.ts` y los adaptadores. Next lo resuelve internamente, sin paquete npm (`D/02-guides/data-security.md`).
- Variables de entorno **sin** `NEXT_PUBLIC_`, leídas solo en `server/config.ts`.

### 3.9 Restricciones 4–6

- **(4) Ray-Ban Meta:** cambió en 2026. Las Ray-Ban Meta normales siguen **sin pantalla** (cámara y audio vía Wearables Device Access Toolkit). Las **Meta Ray-Ban Display** tienen acceso a pantalla en *developer preview* desde mayo 2026 (UI de 600×600 empujada desde una app de teléfono). Ninguna opción se habla directo desde Next.js. **Decisión:** la guía visual sigue en Quest 3. En el prototipo, `/xr` simula los pasos en la web.
- **(5) Dependencias:** propuestas, pendientes de tu aprobación: `zod` (runtime) y `vitest` (dev, opcional). Nada más.
- **(6) Si algún día se despliega** (no hacerlo ahora):
  - JSON → SQLite/Postgres: el FS de serverless es efímero y multi-instancia.
  - Secretos en un gestor.
  - Ollama en un host GPU.
  - Autenticación.
  - Un mutex distribuido o una DB transaccional.

---

## 4. Cómo añadir una feature nueva (guía corta)

1. **Carpeta:** `src/features/<nombre>/`.
2. **Tipos:** `<nombre>.types.ts` con tipos planos (y un DTO solo si la UI necesita otra forma).
3. **Lógica:** funciones puras en `<nombre>.logic.ts`, testeables sin Next.
4. **¿Persiste datos?** Define `<nombre>.repository.ts` (interface) y `<nombre>.repository.json.ts`, con seed en `data/seed/<nombre>.json`.
5. **¿Llama a un servicio externo?** Crea el puerto, el adaptador real, el mock y su fixture en `data/fixtures/`. Regístralo en `server/services.ts` y sus variables en `server/config.ts` y `.env.example`. Documéntalo en `docs/SERVICES.md`.
6. **Lectura:** `<nombre>.queries.ts` con `import 'server-only'`, que devuelve DTOs.
7. **Mutación:** `<nombre>.actions.ts` con `'use server'`. Valida la entrada y devuelve `Result`.
8. **UI:** `components/` dentro de la feature. `'use client'` solo en hojas interactivas.
9. **Ruta:** `app/<ruta>/page.tsx` compone los componentes; los datos dinámicos van dentro de `<Suspense>`.
10. **Verifica:** `pnpm build` en verde y la feature probada con `SOMA_OFFLINE=true`.

---

## 5. No verificado

- Si renombrar sobre un archivo bloqueado en Windows devuelve exactamente `EPERM`, `EBUSY` o `EACCES` (Node no lo documenta para Windows).
- Que escribir en `data/runtime/*.json` nunca dispare un recargado de Turbopack si no se importa. Es una inferencia; se valida en la Fase 0b.
- El formato exacto de la respuesta de `laya-serve`: el README dice "schema-identical", pero no hay ejemplo publicado.
- Si Jev sigue con lista de espera para obtener clave.
- Detalles de servicios: ver la sección "No verificado" de `SERVICES.md`.

## 6. Preguntas abiertas

1. ¿Apruebas la **alternativa B**?
2. ¿Apruebas `zod` como dependencia (y `vitest` como devDependency para lógica pura y adaptadores)?
3. ¿Hay que crear `ORCHESTRATOR.md` con el documento de instrucciones? El briefing de subagentes lo referencia y hoy no existe.
4. ¿Ya tienen clave de Jev (`TYPESAFE_API_KEY`)? Sin ella, la demo arranca en `laya` o `mock`.
5. ¿Las máquinas de demo pueden correr Ollama con MedGemma 1.5 4B (unos 3.3 GB) y Laya (Python 3.10+, unos 2.3 GB de pesos)?
6. Detalle de *naming*: "SOMA" ya es el *Space Omics and Medical Atlas* (Weill Cornell / OSDR, datos de Inspiration4). Puede confundir al jurado; conviene una línea en el pitch.

## Fuentes

- Docs locales Next.js 16.4.3 (`apps/web/node_modules/next/dist/docs/01-app/`):
  - `01-getting-started/02-project-structure.md`
  - `05-server-and-client-components.md`
  - `07-mutating-data.md`
  - `08-caching.md`
  - `09-revalidating.md`
  - `10-error-handling.md`
  - `02-guides/data-security.md`
  - `02-guides/forms.md`
  - `02-guides/environment-variables.md`
  - `03-api-reference/01-directives/use-cache.md`
- Node.js fs: https://nodejs.org/api/fs.html
- Hexagonal (Cockburn): https://alistair.cockburn.us/hexagonal-architecture/
- Feature-Sliced Design: https://feature-sliced.design/docs/get-started/overview
- bulletproof-react (referencia comunitaria, no oficial): https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md
- Prisma + Next.js (singleton en `globalThis`): https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices
- steno: https://github.com/typicode/steno
- Zod mini: https://zod.dev/packages/mini · Valibot: https://valibot.dev/
- Servicios externos: ver `docs/SERVICES.md`
