# Arquitectura — Soma

> Estado: **definitiva (Fase 0b)**. Sustituye a `ARCHITECTURE_PROPOSAL.md`, que queda como registro de las alternativas descartadas.
> Stack: Next.js 16.4.3 (App Router, `cacheComponents: true`), React 19.3, TypeScript strict, Tailwind 4, pnpm, Zod 4. Tests con `node:test` (Node 24).

## Decisión

**Módulos por feature ("screaming") con puertos solo en los bordes.** Cada feature vive en `src/features/<nombre>/`. Solo hay interfaces donde de verdad habrá intercambio: persistencia y clientes externos. Una única composición (`src/server/services.ts`) elige los adaptadores. Sin contenedor DI, sin clases de caso de uso.

## Estructura

```
apps/web/
  data/
    seed/        JSON de partida (versionado)
    runtime/     "base de datos" viva (ignorada; se crea desde seed)
    fixtures/    respuestas de ejemplo para mocks (versionado, sintéticas)
  scripts/db-reset.ts
  src/
    app/         rutas finas: solo componen features (+ error.tsx, not-found.tsx); tabla en docs/ROUTES.md
    features/
      crew/      corte vertical de referencia (ver abajo)
      risk/      classifier.port.ts · classifier.mock.ts · risk.queries.ts · components/
      plan/      planner.port.ts · planner.mock.ts · ollama.client.ts · planner.chain.ts · planner.fixture.ts · components/
      space-weather/  space-weather.port.ts · radiation.port.ts · space-weather.fixture.ts
    server/
      config.ts      único lugar que lee process.env (validado con Zod)
      services.ts    composición: elige adaptador según config
      json-store.ts  lectura/escritura atómica + mutex
      fixtures.ts    lee y valida data/fixtures/*.json
    shared/      result.ts · source.ts · ui/ (componentes de OrganUI y shadcn, instalados como código fuente)
```

## Reglas

1. **Dominio = tipos planos + funciones puras.** Nada de clases; todo lo que cruza al cliente es serializable.
2. **Interfaces solo en los bordes** (repositorios y clientes externos).
3. **Una sola composición.** Cambiar de adaptador es una línea en `services.ts`.
4. **Rutas finas.** `app/**/page.tsx` compone componentes; los datos dinámicos van dentro de `<Suspense>`. Cada pestaña de `/reporte/[id]` muestra una sola cosa; el layout aporta encabezado y pestañas. Las features no conocen las rutas: reciben los `href` por props.
5. **Importaciones solo hacia abajo:** `app → features → server/shared`. Una feature no importa los internos de otra; pide lo que necesite por su `*.queries.ts`.
6. **Los puertos devuelven `Result<T>`** (errores esperados como valor). Los bugs se lanzan y los atrapa `error.tsx`.
7. **Toda respuesta de un puerto lleva `source: { provider, mode, fetchedAt }`** y la UI la muestra.
8. **Toda salida clínica muestra incertidumbre y exige validación humana.** `CarePlanDraft.requiresHumanValidation` es el literal `true`; `RiskAssessment.calibrated` es `false` para Laya y mocks.

## Convenciones técnicas (verificadas)

- **Datos JSON fuera de `src/` y nunca con `import x from './x.json'`.** Con `cacheComponents`, la E/S síncrona y los imports se congelan en el HTML del build. Se lee con `fs/promises` en cada request, dentro de `<Suspense>` (`node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`). **Comprobado** con `next start`: editar `data/runtime/crew.json` se ve en la siguiente petición, sin rebuild.
- **`'use cache'` solo para datos externos de solo lectura** (DONKI, SWPC), cuando existan sus adaptadores.
- **`error.tsx` recibe `retry`, no `reset`** en Next 16.4 (`.../03-file-conventions/error.md`).
- **`.ts` en imports relativos** (`allowImportingTsExtensions`, `erasableSyntaxOnly`): los tests corren con `node --test` sin transpilador. Solo sintaxis que Node borra (sin `enum` ni parameter properties).
- **Escritura atómica** (`json-store.ts`): archivo temporal + `rename`, con reintentos ante `EPERM`/`EBUSY`/`EACCES`, y un mutex en proceso por archivo. El mapa de locks vive en `globalThis` para sobrevivir al HMR. Alcance: **un solo proceso local**.
- **Un proveedor sin adaptador falla en voz alta** (`services.ts`), en vez de servir datos mock bajo la etiqueta "live".

## Corte vertical de referencia: `crew`

| Archivo | Rol |
|---|---|
| `crew.schema.ts` | Esquema Zod; valida el JSON en cada lectura |
| `crew.types.ts` | Tipos (inferidos del esquema) y `CrewCardDTO` |
| `crew.logic.ts` | Funciones puras: banderas y nivel de atención (umbrales ilustrativos, no clínicos) |
| `crew.repository.ts` | Puerto |
| `crew.repository.json.ts` | Adaptador sobre `json-store` |
| `crew.queries.ts` | Lectura `server-only`: `getCrewSummaries()` (lista de `/`) y `getMissionMember(id)` (con `cache()` por petición); devuelven DTOs |
| `components/` | Una pieza por vista: `CrewSummaryList`, `VitalsSummary`, `TrendsPanel`, `BodyPanel`, `AttentionBadge` |

Para cambiar a SQLite o FastAPI: `crew.repository.sqlite.ts` o `crew.repository.http.ts` y una línea en `services.ts`. Ni la lógica ni la UI se tocan.

## Cómo añadir una feature

1. **Carpeta:** `src/features/<nombre>/`.
2. **Tipos:** `<nombre>.types.ts` (y un DTO solo si la UI necesita otra forma). Esquema Zod si hay datos externos.
3. **Lógica:** funciones puras en `<nombre>.logic.ts`, con test `node:test` al lado.
4. **¿Persiste datos?** `<nombre>.repository.ts` (puerto) y `<nombre>.repository.json.ts`, con seed en `data/seed/<nombre>.json`.
5. **¿Llama a un servicio externo?** Puerto, adaptador real, mock y fixture en `data/fixtures/`. Regístralo en `server/services.ts`, sus variables en `server/config.ts` y `.env.example`, y documéntalo en `docs/SERVICES.md`.
6. **Lectura:** `<nombre>.queries.ts` con `import 'server-only'`, que devuelve DTOs.
7. **Mutación:** `<nombre>.actions.ts` con `'use server'`; valida con Zod y devuelve `Result`.
8. **UI:** `components/` dentro de la feature; `'use client'` solo en hojas interactivas.
9. **Ruta:** `app/<ruta>/page.tsx` compone los componentes; los datos dinámicos y los `params` van dentro de `<Suspense>`. Guía y tabla de rutas en `docs/ROUTES.md`.
10. **Verifica:** `pnpm test`, `pnpm lint` y `pnpm build` en verde, y la feature probada con `SOMA_OFFLINE=true`.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm test` | `node --test "src/**/*.test.ts"` |
| `pnpm lint` | ESLint |
| `pnpm db:reset` | Restaura `data/runtime/` desde `data/seed/` (útil antes de la demo) |

## Si algún día se despliega (hoy no)

- JSON → SQLite/Postgres: el sistema de archivos serverless es efímero y multi-instancia.
- Secretos en un gestor; Ollama en un host con GPU; autenticación.
- Un mutex distribuido o una base transaccional.

## No verificado

- Que `rename` sobre un archivo bloqueado en Windows devuelva exactamente `EPERM`, `EBUSY` o `EACCES` (Node no lo documenta). Los reintentos están cubiertos en el código, pero no hay test que fuerce el bloqueo.
- Que escribir en `data/runtime/` nunca dispare un recargado de Turbopack en `next dev`. Con `next start` no ocurre; en dev no se probó.
