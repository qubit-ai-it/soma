# Inventario de servicios externos — Soma

> Estado: **definitivo (Fase 0b)**. Verificado entre el 2026-10-30 y el 2026-10-31.
> Regla: **todo servicio externo tiene un mock o fixture**. Con `SOMA_OFFLINE=true` el prototipo corre completo sin internet ni claves.
> Implementado en Fase 0b: **solo los puertos, los mocks y los fixtures** (`classifier.mock.ts`, `planner.mock.ts`, `space-weather.fixture.ts`). Los adaptadores reales (Jev, Laya, Ollama, DONKI, SWPC, RadLab) se escriben en sus features; mientras tanto, `services.ts` lanza un error claro si se configura un proveedor sin adaptador.
> **Simulaciones actuales:** sin clave de Jev ni MedGemma local, `CLASSIFIER_PROVIDER=mock` y `PLANNER_PROVIDER=mock` producen respuestas con **datos aleatorios** que imitan la forma de las reales (`source.provider` = `simulated-jev` y `simulated-medgemma`). Son aleatorias, no clínicas ni calibradas, y la UI debe rotularlas como simuladas. Los tests inyectan la fuente aleatoria para ser reproducibles.
> Los fixtures de `data/fixtures/` son **sintéticos** (marcados como tal en sus resúmenes): no son datos reales de NASA ni de la ISS. La ventana real de 24 h de RadLab sigue pendiente de generarse con un script.

## Resumen

| Servicio | Propósito | En la demo | Variables | Clave / instalación | Si falla | Fuente |
|---|---|---|---|---|---|---|
| **Jev** (TypeSafe AI) | Clasificar riesgo (System One) | Real si hay clave | `CLASSIFIER_PROVIDER=jev`, `TYPESAFE_API_KEY`, `JEV_BASE_URL`, `JEV_MODEL` | Clave en https://console.typesafe.ai/keys | → Laya → mock | docs.typesafe.ai/api/system-one.md |
| **Laya** | Respaldo local del clasificador, mismo protocolo | Respaldo | `CLASSIFIER_PROVIDER=laya`, `LAYA_BASE_URL`, `LAYA_MODEL`, `LAYA_API_KEY` (opcional) | `pip install "laya[serve]"` y luego `laya-serve` (puerto 8000) | → mock | github.com/NandhaKishorM/laya |
| **MedGemma 1.5 4B** vía Ollama | Borrador de rutina o tratamiento | Real local | `PLANNER_PROVIDER=ollama\|mock`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | Instalar Ollama y luego `ollama pull medgemma1.5:4b` (unos 3.3 GB) | → plan fixture | huggingface.co/google/medgemma-1.5-4b-it |
| **NASA DONKI** (CCMC) | Eventos de clima espacial (FLR, SEP, CME, GST) | Real + caché | `SPACE_WEATHER_PROVIDER=live\|fixture`, `DONKI_BASE_URL` | **Sin clave** en el host nuevo | → caché en disco → fixture | ccmc.gsfc.nasa.gov/tools/DONKI |
| **NOAA SWPC** | Flujo de protones y rayos X GOES en tiempo real, Kp, alertas | Real + caché | (comparte `SPACE_WEATHER_PROVIDER`), `SWPC_BASE_URL` | Sin clave | → caché en disco → fixture | spaceweather.gov/content/data-access |
| **RadLab** (OSDR) | Dosimetría ISS de referencia | **Fixture** | `RADIATION_PROVIDER=fixture\|live`, `RADLAB_BASE_URL` | Sin clave; los datos llegan hasta ~2024 | → fixture | visualization.osdr.nasa.gov/radlab/gui/data-api/ |
| **Web Speech API** | Voz de Sentry (TTS) | Real (navegador) | — | Nada; en el cliente | Solo texto en pantalla | MDN SpeechSynthesisVoice |

Modo global: `SOMA_OFFLINE=true` fuerza todos los proveedores a `mock` o `fixture`.

## Descartados

| Servicio | Por qué |
|---|---|
| NASA OSDR biodata API | Son metadatos de estudios ómicos, sobre todo en roedores. No hay signos vitales; no sirve para el bucle de riesgo |
| api.nasa.gov/DONKI (proxy) | Respondió 503 en las pruebas del 2026-10-31. El host CCMC no necesita clave |
| Piper (TTS local) | Útil, pero ahora es GPL-3.0, requiere un sidecar y cada voz tiene su licencia. Opcional a futuro |
| TTS en la nube | Rompe la premisa de que todo corra en local |
| Otras APIs NASA (APOD, EONET…) | No aportan nada a salud ni a radiación |

---

## Detalle por servicio

### Jev (TypeSafe AI) — verificado

- **Endpoint:** `POST https://api.typesafe.ai/v1/systemone`, con el header `Authorization: Bearer $TYPESAFE_API_KEY`.
- **Modelos:**
  - `jev-1.14.0` (desde 2026-10-14) y `jev-1.13.0`.
  - El alias `jev-latest` apunta a 1.14.0.
  - `GET /v1/models` lista los disponibles.
- **Tipos de pregunta:**

  | Tipo | Qué devuelve |
  |---|---|
  | `noul` | Probabilidad de "true" (**no es un booleano**) |
  | `choice` | Opción elegida + probabilidades + `confidence` |
  | `score` | Valor esperado ponderado, **no un entero** + probabilidades + `confidence` |
  | `box` | Requiere imágenes; no se usa en Soma |

- **Errores:**

  | Código | Significado | Qué hacer |
  |---|---|---|
  | 400 / 422 | `detail` con el error | Corregir la petición |
  | 401 | Clave inválida | Revisar la clave |
  | 413 | Cuerpo > 32 MiB | Reducir la petición |
  | 429 / 529 | Rate limit / sobrecarga | Reintentar con backoff exponencial |

- **Costo:** $0.042 por millón de tokens de entrada; la salida es gratis.
- **Self-hosted:** no existe según la doc oficial.
- **Fuentes:** https://docs.typesafe.ai/api/system-one.md · https://docs.typesafe.ai/api/errors.md · https://docs.typesafe.ai/models.md

### Laya — verificado (con matices)

- **Paquete y licencia:** `laya` 0.4.18 en PyPI, Apache-2.0, de Convai Innovations.
- **Checkpoints:**
  - `english` y `typed-decisions` (ModernBERT-large, 421M).
  - `multilingual` (mmBERT-base, 322M).
- **Servidor:** `laya-serve` expone `POST /v1/systemone` en `0.0.0.0:8000`, con el mismo protocolo que Jev; **no** es compatible con OpenAI.
- **Diferencias con Jev que el adaptador debe manejar:**
  1. Nombres de modelo distintos, así que hace falta un mapa por proveedor.
  2. No tiene el tipo `box`.
  3. Cada nivel de `score` necesita descripción; un nivel `null` da 422.
  4. `confidence` se calcula como 1 − entropía normalizada, así que **los umbrales de Jev no sirven**.
  5. `choice` admite como máximo 100 opciones.
- **Calibración (cifras del propio fabricante, sin replicación independiente):**
  - Los checkpoints publicados son **sobreconfiados**: ECE 0.466, que baja a 0.081 recién tras recalibrar con datos propios.
  - `typed-decisions` no está entrenado en datos de salud.
  - En decisiones tipadas *zero-shot* queda cerca del azar.
  - **Consecuencia en la UI:** cada clasificación de Laya lleva la etiqueta "respaldo local · sin calibrar".
- **Requisitos:** Python 3.10+; unos 2.3 GB de pesos; GPU opcional (CUDA, MPS o CPU).
- **Fuentes:** https://pypi.org/project/laya/ · https://github.com/NandhaKishorM/laya · https://huggingface.co/convaiinnovations/laya-typed-decisions

### MedGemma 1.5 4B (Ollama) — verificado

- **Modelo:** `google/medgemma-1.5-4b-it`, publicado el 2026-01-13. Recibe texto e imagen; contexto de 128K de entrada y 8K de salida.
- **En Ollama:** la etiqueta es `medgemma1.5:4b`. `medgemma:4b` es la **v1**, la versión anterior.
- **Llamada:** `POST http://localhost:11434/api/chat` con `stream: false` y `format: <JSON schema>` para obtener salida estructurada. El esquema también va en el prompt.
- **Términos (HAI-DEF):**
  - No usarlo de forma que convierta a Google en "fabricante" de un dispositivo médico.
  - El uso clínico requiere autorización regulatoria.
  - Según la model card, las salidas "should be considered preliminary and require independent verification".
- **En la UI:** toda salida lleva **"Borrador · requiere validación humana"**.
- **Fuentes:** https://huggingface.co/google/medgemma-1.5-4b-it · https://developers.google.com/health-ai-developer-foundations/terms · https://ollama.com/library/medgemma1.5 · https://docs.ollama.com/capabilities/structured-outputs

### NASA DONKI — verificado (cambio de URL confirmado)

- **Cambio de URL:** CCMC anunció el **2026-09-30** que la app y la API migraron a URLs oficiales nuevas. `kauai.ccmc.gsfc.nasa.gov` pasó a `ccmc.gsfc.nasa.gov` y las rutas siguen iguales.
- **Base actual:** `https://ccmc.gsfc.nasa.gov/DONKI/WS/get/{FLR|SEP|CME|GST|notifications}?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  - Comprobado el 2026-10-31: HTTP 200 JSON, sin clave.
- **Límite:** el rango de fechas no puede pasar de **60 días** (si no, HTTP 400).
- **Estrategia:**
  - Pedir los últimos 30 días.
  - Cachear con `'use cache'` + `cacheLife`.
  - Guardar la última respuesta buena en `data/runtime/cache/` para el modo offline.
- **Fuente:** https://ccmc.gsfc.nasa.gov/tools/DONKI

### NOAA SWPC — verificado (nuevo, recomendado)

- **Por qué:** complementa a DONKI con datos en tiempo real y sin clave. Para el riesgo por radiación es más directo que DONKI, que es un catálogo de eventos.
- **Feeds:**

  | Feed | Ruta |
  |---|---|
  | Protones GOES (≥10 y ≥100 MeV) | `/json/goes/primary/integral-protons-1-day.json` |
  | Rayos X | `/json/goes/primary/xrays-1-day.json` |
  | Índice Kp | `/products/noaa-planetary-k-index.json` |
  | Alertas | `/products/alerts.json` |
  | Escalas R/S/G | `/products/noaa-scales.json` |

- **Base:** `https://services.swpc.noaa.gov`
- **Fuente:** https://www.spaceweather.gov/content/data-access

### RadLab — verificado: **no es en vivo**

- **API:** `GET https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&timestamp>=…&format=json`
- **Cobertura:** devuelve datos de 2022 a 2024 y **vacío para 2025 y 2026**. Es un archivo histórico.
- **Decisión:** usar un **fixture** con una ventana real de 24 h de la ISS, y un script opcional para regenerarlo.
- **Fuente:** https://visualization.osdr.nasa.gov/radlab/gui/data-api/

### Web Speech API (voz de Sentry)

- **Por qué:** cero instalación y corre en el navegador.
- **Ojo:** las voces "naturales" de Chrome y Edge necesitan red. Sin internet solo funcionan las voces del sistema, que se filtran con `voice.localService === true`.
- **Fuente:** https://developer.mozilla.org/docs/Web/API/SpeechSynthesisVoice/localService

### Ray-Ban Meta / Quest 3 (no son servicios del prototipo)

- **Ray-Ban Meta (Gen 1/2):** cámara, micrófono (8 kHz mono) y altavoces vía el Wearables Device Access Toolkit, con SDK nativo para iOS y Android. **Sin pantalla.**
- **Meta Ray-Ban Display:** acceso a pantalla en *developer preview* desde el **2026-05-19**. Es una UI de 600×600 empujada desde la app del teléfono. **Esto cambió respecto al supuesto original.**
- **Quest 3:** Unity + Meta XR Core SDK + Interaction SDK. En el prototipo, `/xr` lo simula en la web.
- **Fuentes:** https://wearables.developer.meta.com/docs/develop/ · https://wearables.developer.meta.com/docs/develop/dat/display-overview/ · https://developers.meta.com/horizon/documentation/unity/unity-before-you-begin/

---

## Borrador de `.env.example` (el archivo real se crea en la Fase 0b)

```dotenv
# Force every external service to mock/fixture (demo without internet)
SOMA_OFFLINE=false

# Risk classifier (System One protocol): jev | laya | mock
CLASSIFIER_PROVIDER=mock
TYPESAFE_API_KEY=
JEV_BASE_URL=https://api.typesafe.ai
JEV_MODEL=jev-latest
LAYA_BASE_URL=http://localhost:8000
LAYA_MODEL=typed-decisions
LAYA_API_KEY=
# Confidence below this marks the result "confianza baja" (arbitrary defaults, tune with real data)
JEV_LOW_CONFIDENCE=0.6
LAYA_LOW_CONFIDENCE=0.4

# Care planner: ollama | mock
PLANNER_PROVIDER=mock
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=medgemma1.5:4b

# Space weather: live | fixture
SPACE_WEATHER_PROVIDER=fixture
DONKI_BASE_URL=https://ccmc.gsfc.nasa.gov/DONKI/WS/get
SWPC_BASE_URL=https://services.swpc.noaa.gov

# ISS radiation: fixture | live (RadLab data ends ~2024)
RADIATION_PROVIDER=fixture
RADLAB_BASE_URL=https://visualization.osdr.nasa.gov/radlab/api
```

## No verificado

- **Jev:** si la clave todavía requiere lista de espera, y los números de rate limit.
- **Laya:** el JSON exacto de la respuesta de `laya-serve`, y si devuelve `legend` y `usage` igual que Jev.
- **MedGemma:** quién publica la etiqueta de Ollama y con qué cuantización; RAM real necesaria (se estima 6–8 GB).
- **DONKI y SWPC:**
  - Si `api.nasa.gov/DONKI` está retirado o solo caído.
  - Los términos de uso y rate limits de SWPC.
- **RadLab:** la unidad de `absorbed_dose_rate` (se asume µGy/h) y la fecha exacta en que termina la cobertura.
- **Wearables:** la resolución máxima de la cámara de Ray-Ban Meta, y si la publicación general del toolkit ya salió.
