# ORCHESTRATOR — Soma

> Guía de trabajo para el agente orquestador y para los subagentes que implementan una feature. Léela completa antes de tocar código.

## Contexto en 5 líneas

- Soma es un prototipo **local** de monitoreo de salud de tripulación espacial (sin despliegue, sin auth).
- Stack: Next.js 16.4.3, React 19.3, TypeScript strict, Tailwind 4, Zod 4, **pnpm**. La app está en `apps/web`.
- Arquitectura: `docs/ARCHITECTURE.md` (módulos por feature, puertos en los bordes). Servicios externos: `docs/SERVICES.md`. Lista de trabajo: `FEATURES.md`.
- Hoy **no hay clave de Jev ni se usa MedGemma real**: el clasificador y el planificador son **simulaciones con datos aleatorios** (`simulated-jev`, `simulated-medgemma`). La UI siempre debe mostrar que son simuladas.
- `AGENTS.md` de `apps/web` exige leer `node_modules/next/dist/docs/` antes de escribir código de Next: este Next **no es el que conoces** (por ejemplo, `error.tsx` recibe `retry`, no `reset`).

## Flujo

| Fase | Quién | Qué |
|---|---|---|
| Elegir | Usuario | Dice "empezar N" (feature de `FEATURES.md`). Una feature a la vez, salvo que pida paralelizar |
| Preparar | Orquestador | Verifica árbol limpio (si no, avisa y para); crea rama y worktree `feat/NN-slug` |
| Implementar | Subagente | Trabaja solo dentro del worktree y escribe `REPORT.md` |
| Revisar | Usuario | Revisa el diff; pide cambios o dice "aprobado" |
| Cerrar | Orquestador | Con "aprobado": build en verde, `git add` selectivo, commit, pregunta por el merge |

Si el usuario pide cambios, el orquestador los reenvía al **mismo** subagente y se vuelve a revisar.

## Reglas para el orquestador

1. **Nunca** hace commit, push, merge ni borra ramas sin aprobación explícita del usuario.
2. Verifica el árbol de trabajo antes de crear el worktree. Si hay cambios sin commitear, avisa y para.
3. Crea el worktree **dentro del home del usuario** (por ejemplo `<repo>-worktrees/feat-NN-slug`), nunca en `/tmp`.
4. Usa herdr para los panes siguiendo su guía oficial (https://raw.githubusercontent.com/ogulcancelik/herdr/master/SKILL.md). **No inventa comandos**: si la guía no lo cubre, lo dice.
5. Rechaza, antes de mostrársela al usuario, una feature que viole la arquitectura aprobada.
6. Si algo es ambiguo, hace **una** pregunta corta antes de delegar.
7. Al terminar el subagente entrega: resumen de 5 líneas, `git status`, `git diff --stat` y cómo probarlo en 3 pasos. Después espera.
8. Con "aprobado": confirma `pnpm build`; `git add` **solo** de los archivos de la feature (nunca `-A` a ciegas, excluye `REPORT.md`); commit con Conventional Commits `feat(<área>): <resumen>` y cuerpo de 2 a 4 líneas; muestra el hash; pregunta si fusiona a `main`; cierra el pane; marca ✅ en `FEATURES.md`.
9. Toda salida clínica muestra incertidumbre y exige validación humana. Distingue siempre lo **verificado** (con fuente) de lo **supuesto**.

## Briefing para el subagente

Completa los campos con el texto de `FEATURES.md`:

```text
Eres un subagente de Soma. Implementa SOLO la feature N: <título>.
Objetivo: <objetivo>
Criterios de aceptación: <lista>
Fuera de alcance: <lista>
Contexto: lee ORCHESTRATOR.md, docs/ARCHITECTURE.md y FEATURES.md.
Reglas:
- Sigue la arquitectura aprobada y su guía "cómo añadir una feature". Si crees que
  está mal o falta algo, avisa en vez de improvisar otra estructura.
- Toca solo los archivos necesarios. Sin dependencias nuevas sin avisar.
- Integraciones externas siempre con versión real y mock.
- Ejecuta `pnpm test`, `pnpm lint` y `pnpm build` y arregla los errores antes de terminar.
- NO hagas commit, NO hagas push, NO cambies de rama.
- Al terminar escribe REPORT.md (fuera del control de versiones): qué hiciste,
  archivos modificados, cómo probarlo en 3 pasos, límites conocidos, decisiones tomadas.
  Luego detente y espera.
```

## Reglas para el subagente

- **Test primero** cuando haya lógica pura: escribe el test, míralo fallar, implementa, míralo pasar. Tests con `node:test` (`pnpm test`); no se añade `vitest`.
- **Convenciones del repo:** imports relativos con extensión `.ts` en los archivos que alcanzan los tests; solo sintaxis que Node puede borrar (sin `enum` ni parameter properties); `import 'server-only'` en queries, `services.ts` y adaptadores.
- **Datos JSON:** se leen con `fs/promises` desde `data/`, **nunca** con `import x from './x.json'`, y siempre dentro de `<Suspense>` (por `cacheComponents`). Se validan con Zod.
- **Entradas externas** (formularios, variables de entorno, respuestas de servicios) se validan en el servidor con Zod.
- **Un proveedor sin adaptador falla en voz alta** en `services.ts`; nunca sirve datos mock bajo una etiqueta "live".
- **Simulaciones:** las respuestas simuladas llevan `source.provider` y `source.mode` visibles. No las presentes como datos reales ni como salida clínica.
- **Idioma:** el texto de la interfaz va en español (como los textos ya especificados); el código, los comentarios, los commits y los nombres, en inglés.
- **Comentarios:** casi nunca; el código bien escrito ya se lee solo. Solo etiquetas cortas de una línea (por ejemplo `// GET -> LISTAR USUARIOS`) o el porqué de algo no obvio. Nada de bloques JSDoc que repiten lo que hace el código.
- **Sin sorpresas con git:** no cambies de rama, no hagas stash, no toques archivos fuera de la feature.
- **Si te bloqueas**, detente y deja la pregunta concreta en `REPORT.md`; no improvises.

## Qué entra en `REPORT.md`

1. Qué hiciste (3 a 5 líneas).
2. Archivos modificados y creados.
3. Cómo probarlo en 3 pasos.
4. Criterios de aceptación: cuáles se cumplen y con qué evidencia (comando y resultado observado), cuáles no.
5. Límites conocidos y lo que no pudiste verificar.
6. Decisiones que tomaste y por qué.

## Comandos útiles (desde `apps/web`)

| Comando | Qué hace |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm test` | `node --test "src/**/*.test.ts"` |
| `pnpm lint` | ESLint |
| `pnpm db:reset` | Restaura `data/runtime/` desde `data/seed/` |

## Pendiente de verificar

- Que la guía de herdr cubra crear panes, lanzar un subagente y leer su estado (`done`/`blocked`). Se lee antes de la primera feature con `empezar N`.
