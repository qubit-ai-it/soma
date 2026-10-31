# Rutas — Soma

> Nombres de ruta en español, código en inglés, texto de interfaz en español. Las rutas viven en `apps/web/src/app/`.

## Tabla de rutas

| Ruta | Qué muestra | Estado |
|---|---|---|
| `/` | Resumen de misión: una fila por tripulante (nombre, rol, atención, riesgo con su etiqueta "Simulado" cuando aplica, señal principal) que enlaza a su reporte. Sin mapa corporal ni tendencias | Hecha |
| `/reporte/[id]` | Resumen del tripulante: signos vitales actuales y banderas | Hecha |
| `/reporte/[id]/tendencias` | Historial y tendencias de cada señal | Hecha |
| `/reporte/[id]/cuerpo` | Mapa corporal con las zonas y su detalle | Hecha |
| `/reporte/[id]/riesgo` | Clasificador: probabilidades, confianza, origen (provider · mode), etiquetas "Simulado" / "respaldo local · sin calibrar" y aviso de validación humana | Hecha |
| `/reporte/[id]/plan` | Plan o tratamiento | Pendiente |
| `/clima` | Clima espacial y radiación | Pendiente |
| `/sentry` | Check-in adaptativo | Pendiente |
| `/xr` | Procedimientos AR/VR | Pendiente |
| `/alertas` | Alertas y escalamiento | Pendiente |
| `/alertas/auditoria` | Registro de auditoría | Pendiente |
| `/demo` | Modo demo | Pendiente |

Un `id` inexistente en cualquier ruta de `/reporte/[id]` renderiza `not-found.tsx` (ver "Límites").

## Estructura de `/reporte/[id]`

- `layout.tsx` pinta el encabezado (nombre, rol, atención), el enlace de vuelta a `/` y las pestañas (`report-tabs.tsx`, con `aria-current="page"` en la activa).
- Cada pestaña muestra una sola cosa y sale de un componente de su feature.
- `getMissionMember(id)` está envuelto en `cache()` de React: el layout y la página de una misma petición comparten una sola lectura.
- La clasificación de riesgo se pide solo donde se muestra: `/` clasifica a toda la tripulación una vez; `/reporte/[id]/riesgo` solo a ese tripulante. Las demás pestañas no la llaman (la clasificación del mock es aleatoria).

## Cómo añadir una ruta

1. Crea `src/app/<ruta>/page.tsx` (o `reporte/[id]/<pestaña>/page.tsx` para una pestaña del tripulante).
2. La página solo compone: pide los datos por el `*.queries.ts` de la feature y renderiza sus componentes. Una feature no importa a otra; si la ruta necesita dos, la composición vive en `app/`.
3. Con `params` dinámicos y sin `generateStaticParams`, `params` es una `Promise` y su lectura va dentro de `<Suspense>` (también en los layouts). Patrón: la página síncrona devuelve `<Suspense><Content params={params} /></Suspense>` y `Content` hace `await params`. Referencia: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`, sección "With Cache Components".
4. Si el recurso puede no existir, llama a `notFound()` tras la lectura.
5. Si es una pestaña de `/reporte/[id]`, añádela a `TABS` en `report-tabs.tsx` (el `segment` es el nombre de la carpeta).
6. Muestra la fuente (`provider · mode`) y las etiquetas de simulación, y exige validación humana en toda salida clínica.
7. Actualiza esta tabla y verifica con `pnpm test`, `pnpm lint` y `pnpm build` (el build lista las rutas).

## Límites

- Con `cacheComponents`, el estado HTTP de un `id` inexistente es 200: la respuesta ya empezó a enviarse cuando se ejecuta `notFound()`. El HTML lleva la UI de not-found y `noindex`. Verificado con `curl` sobre `next start`.
- Nada de esto se ha visto en un navegador.
