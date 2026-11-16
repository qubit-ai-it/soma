# Sentry copiloto autónomo

Objetivo: Sentry como actor de servidor que evalúa, genera Evaluación/Plan/Seguimiento y notifica por umbral.
Rama: main · Entrega: ask-on-risk · Tests: `pnpm test` (node --test) · DB: Neon Postgres (pooled `DATABASE_URL`, directa `DATABASE_URL_UNPOOLED` para migraciones)

## Specs

- S1. "Sentry es un actor del servidor (actor: sentry en la auditoría). Decide con reglas determinísticas; la IA solo redacta borradores. Nunca aplica nada sola: la persona decide."
- S2. "Persistencia: una base de datos única detrás de los repositorios existentes. Tablas: observaciones (con procedencia), evaluaciones (versionadas, con evidencia), notificaciones (leída por destinatario), planes con estado (borrador, en revisión, aprobado, cambios pedidos), revisiones de Tierra, seguimientos, bandeja de salida/entrada de paquetes. Tiempo real por Server-Sent Events en vez del sondeo."
- S3. "Vigilancia por eventos: cada observación nueva dispara evaluar, guardar y notificar. Un reloj aparte (cron o temporizador) para cierres de ventana de seguimiento y \"sin datos hace X minutos\"."
- S4. "Generación pasiva en cascada: la evaluación se guarda al cambiar de nivel (la pestaña solo lee la última); si el nivel llega a F2 o más, se genera en segundo plano el borrador de plan (estado borrador, pendiente de revisión humana); al aprobarse el plan se crea el contrato de seguimiento. Las pestañas muestran \"Generado por Sentry · hace X min\", sin botones."
- S5. "Notificaciones de Sentry (con la card de Sentry): alertas por umbral (F2 a la persona y al médico, \"no evaluable\" al médico, F3 a toda la tripulación y a Tierra); check-ins (\"¿cómo dormiste?\"), recordatorios de pasos del plan, resumen de inicio y fin de turno; estado del enlace con Tierra; avisos de clima espacial cuando Kp o protones suben. Con prioridad, antirrebote por tripulante y nivel, histéresis y modo resumen, para que mande mucho sin ser spam."
- S6. "Tierra: Sentry genera el borrador, el médico de a bordo lo revisa (funciona sin enlace), se encola un paquete hacia Tierra, el médico de Tierra aprueba, comenta o pide cambios desde /tierra, la respuesta vuelve como paquete y se aplica al haber enlace (idempotente), y Sentry notifica \"Tierra respondió\". El seguimiento igual (reporte de ventanas y feedback). Tipos de paquete nuevos: plan_review_request, plan_review_response, followup_report, followup_feedback. Sin enlace decide el médico de a bordo."
- S7. "Entrada de datos: el navegador envía las lecturas del reloj en bloques de 5 s a un endpoint del servidor, y además el servidor emite datos simulados de la tripulación para que Sentry esté siempre activo."
- S8. "Una F3 de otro tripulante no le llegaría: hay que modelar la F3 como difusión de tripulación (excepción explícita), mostrando datos mínimos, sin detalle clínico (projectAlert)."
- S9. "Nada de datos inventados: si una fuente falla, se oculta o se marca, nunca se rellena con falsos. Procedencia visible."
- S10. "UI en español, minimalista, sin textos largos ni avisos legales dentro de la interfaz. Cards como MetricCard (título, cifra, ícono de trazo) y SomaCard cuando Sentry habla. Íconos Material Symbols."
- S11. "Diseñá los puertos para poder cambiar de adaptador."

Supuestos (marcados): roles reales son astronaut/cmo/commander/earth (no "doctor"); médico de a bordo = cmo, médico de Tierra = earth. Decisión del usuario: Neon Postgres.

## Tasks

| ID | Specs | Ruta | Estado | Commit |
|----|-------|------|--------|--------|
| T0 | S2 | inline | hecho | 49a1605 (Neon cableado) |
| T1 | S2,S9 | inline | hecho | migraciones + runner (`pnpm db:migrate`) + repo observaciones PG |
| T2 | S2,S5,S8 | inline | hecho | notificaciones por destinatario (lógica + repo PG, F3 = crew:all + role:earth) |
| T3 | S2,S1 | inline | movido a paso 2 | repos Postgres de alertas y auditoría; actor sentry |
| T4 | S2 | inline | hecho | SSE `/api/notificaciones/stream` (cursor seq + Last-Event-ID, ventana 55 s), lista y lectura en `/api/notificaciones`. Falta bandeja por EventSource (con SomaCard, paso 3) |
| T5 | S7,S3 | inline | parcial | hecho: `/api/ingesta` + envío de 5 s desde live.store con reintento. Falta: emisor simulado de tripulación (paso 2) |
| T6 | S3,S4,S5 | inline | pendiente | (paso 2) repos PG alertas/auditoría + actor sentry, motor por umbral, difusión F3, evaluación persistida, emisor simulado |
| T7 | S5 | inline | pendiente | (paso 3) charla de Sentry |
| T8 | S4,S6 | inline | pendiente | (paso 4) plan automático y revisión de Tierra |
| T9 | S4,S6 | inline | pendiente | (paso 5) seguimiento automático |

Ruta declarada: todo inline; sin Writer trigger (unidades secuenciales, mismas superficies).

## Log

- L1 (2026-11-15) Pedido original: ver mensaje inicial del usuario (OBJETIVO, ESTADO ACTUAL, DISEÑO ACORDADO, ORDEN DE ENTREGA, REGLAS DE TRABAJO). Resumen del orden: "1. Base de datos, modelo de notificaciones por destinatario, canal SSE y endpoint de entrada de datos. 2. Motor de alertas por umbral, difusión F3 y evaluación persistida (la pestaña Evaluación lee lo guardado). 3. La charla de Sentry. 4. Plan automático en segundo plano, con estados y ciclo de revisión de Tierra. 5. Seguimiento automático, reloj de ventanas y feedback de Tierra."
- L2 (2026-11-15) Usuario: "Si necesitas usar base de datos, dime y configuro todo un entorno en NeonPostgre SQL." → Neon; bucket `assets` creado; ver T0.
