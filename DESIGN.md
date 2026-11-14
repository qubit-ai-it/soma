# SOMA — DESIGN.md

Sistema de diseño de la landing de SOMA, para aplicarlo a la plataforma web.
Principio: **producto primero, personaje después.** SOMA protagoniza; Sentry acompaña.

## 1. Reglas de estilo
- Fondo negro predominante, textos blancos.
- Sin etiquetas en mayúsculas (eyebrows), sin textos explicativos de apoyo, sin líneas divisorias ni bordes decorativos.
- Superficies separadas por cambio de tono, nunca por trazos.
- Textos en español. Sin afirmaciones médicas, certificaciones clínicas ni aval de NASA.
- Datos reales, históricos y sintéticos siempre distinguibles.

## 2. Color (tokens)
| Token | Valor | Uso |
|---|---|---|
| background | oklch(0 0 0) — #000 | Fondo general |
| foreground | oklch(1 0 0) — #FFF | Texto |
| card | oklch(0.17 0 0) | Tarjetas, ventana de producto |
| secondary | oklch(0.24 0 0) | Hover/foco de tarjetas, mosaicos F0–F3 |
| muted | oklch(0.12 0 0) | Barra lateral, sección proyecto |
| muted-foreground | oklch(0.9 0 0) | Texto secundario |
| ink | oklch(0.74 0.015 265) — #A8ADB8 | Gris frío |
| accent | oklch(0.52 0.22 264) | Azul derivado de Sentry |
| signal | oklch(0.72 0.13 250) | Puntos de señal / gráficos |
| accent-soft | oklch(0.22 0.03 264) | Fondos de acento |
| primary | blanco, texto negro | Botones principales |
| ring | blanco | Anillo de foco |

Usar siempre tokens semánticos; nunca colores fijos en componentes.

## 3. Tipografía
- Títulos: **DM Sans** 700. Texto: Inter (sistema como respaldo).
- Display: 64px / 1.06 (72px ≥1440px, 32px móvil).
- Headline: 48px / 1.1 (36px móvil).
- Letter-spacing 0. Botones en DM Sans 600.

## 4. Espaciado y forma
- Contenedor: máx. 1280px, padding lateral clamp(20px, 4vw, 64px).
- Radios: 4 / 8 / 16 / 24px. Tarjetas y ventanas: 8px. Botones: píldora (9999px).
- Sombra de producto: 0 18px 55px -20px, blanco al 14%.

## 5. Componentes
- **Ventana de producto:** card, radio 8px, barra lateral 124px (oculta en móvil). Es ilustrativa: marcar "Demostración" y "Fuente / Sintética".
- **Gráficos:** sin líneas ni rejillas; 24 puntos de 7px en color signal, con aria-label.
- **Galería:** carrusel horizontal con scroll-snap (start), tarjetas 343×395px, gap 12px, sin flechas. Hover/foco → secondary. Cada tarjeta abre su página de lectura.
- **Vista de lectura:** fondo negro, título blanco, cuerpo 90% blanco, superficie oklch(0.17 0 0). Cerrar con botón o Escape y volver a la misma tarjeta.
- **Mosaicos F0–F3:** fondo secondary, sin borde. Reglas definidas por el proyecto.

## 5.1 Iconos
- Librería única: **Material Symbols Outlined** (paquete `material-symbols`, ligaduras de fuente).
- Nunca usar símbolos de texto (←, ↑, ↓, →, ×) ni otras librerías de iconos.
- Usar el componente `Icon` (`shared/ui/icon.tsx`): `<Icon name="arrow_back" />`. Decorativo, `aria-hidden`; el significado va en el texto contiguo.
- Tamaño 1.25em por defecto; hereda el color del texto.

## 5.2 Lineamientos de aplicación en la plataforma
- Estados con tokens semánticos, nunca colores fijos: `ok` (Todo bien / Nominal), `warn` (Posible riesgo / Vigilar), `danger` (Riesgoso / Revisar). Fondo al 15% del mismo color.
- Riesgo de IA en escala azul (`accent-soft`, `accent`, `signal`) para no confundirse con los estados anteriores.
- Tarjetas por cambio de tono (`card`, hover/foco `secondary`); sin bordes ni divisores. Tablas: filas alternas `muted`.
- Pestañas y chips en píldora; activa = `primary`.
- Métricas: etiqueta en `ink`, valor en DM Sans 700.
- Texto de nota o aviso en `ink`; avisos de "Demostración", "Fuente" y "no clínico" siempre visibles donde haya datos.
- Títulos de página: `text-display`; secciones: `text-headline`.
- Tema oscuro fijo; no hay modo claro.

## 6. Sentry
- Usar solo el archivo oficial `soma.riv` (artboard "Artboard 1", MascotController sin inputs) con el runtime oficial de Rive.
- Nunca recrear, redibujar ni recolorear. No inventar animaciones.
- Ciclo automático: idle → thinking → listening → working → success → rest → warning → error → sleeping; el parpadeo continúa.
- Tamaño de acompañante (~140px escritorio, ~65px móvil). Pausar cuando queda fuera de pantalla.
- Respaldo PNG estático si falla la carga o con movimiento reducido.

## 7. Pantalla de carga
- Fondo negro con Sentry animado al centro.
- Mínimo 1.4s, máximo 8s; se desvanece en 400ms.
- Solo una vez por visita, no al navegar entre páginas internas.

## 8. Movimiento
- Easing editorial: cubic-bezier(0.22, 1, 0.36, 1). Nunca rebotes.
- Duraciones: micro 0.18s, rápida 0.28s, normal 0.52s, revelado 0.68s.
- Desplazamiento máximo de aparición: 24px.
- Aparece una vez cuando ~25% es visible (margen inferior -15%); elementos al final del documento sin margen.
- Titular palabra por palabra; parallax leve en la vista de producto; tarjetas de galería ganan opacidad/escala al quedar al frente.
- Movimiento reducido: solo fundido de 0.16s, sin desplazamientos.
- Sin JavaScript todo el contenido debe ser legible.

## 9. Accesibilidad
- Foco visible siempre (anillo blanco), gana sobre efectos.
- Navegación por teclado en galería; Escape cierra lecturas.
- Sin desbordamiento horizontal en 390px.
