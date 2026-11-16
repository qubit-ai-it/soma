# External services inventory — Soma

> Status: **final (Phase 0b)**. Verified between 2026-10-30 and 2026-10-31.
> Rule: **every external service has a mock or fixture**. With `SOMA_OFFLINE=true` the prototype runs completely without internet or keys.
> Implemented in Phase 0b: **only the ports, mocks and fixtures** (`classifier.mock.ts`, `planner.mock.ts`, `space-weather.fixture.ts`). The real adapters (Jev, LAYA, Ollama, DONKI, SWPC, RadLab) are written in their features; in the meantime, `services.ts` throws a clear error if a provider without an adapter is configured.
> **Current simulations:** without a Jev key or a local MedGemma, `CLASSIFIER_PROVIDER=mock` and `PLANNER_PROVIDER=mock` produce responses with **random data** that mimic the shape of the real ones (`source.provider` = `simulated-jev` and `simulated-medgemma`). They are random, not clinical or calibrated, and the UI must label them as simulated. Tests inject the random source to be reproducible.
> The fixtures in `data/fixtures/` are **synthetic** (marked as such in their summaries): they are not real NASA or ISS data. The real 24 h RadLab window is still pending generation with a script.

## Summary

| Service | Purpose | In the demo | Variables | Key / installation | If it fails | Source |
|---|---|---|---|---|---|---|
| **Jev** (TypeSafe AI) | Classify risk (System One) | Real if there is a key | `CLASSIFIER_PROVIDER=jev`, `TYPESAFE_API_KEY`, `JEV_BASE_URL`, `JEV_MODEL` | Key at https://console.typesafe.ai/keys | → LAYA → mock | docs.typesafe.ai/api/system-one.md |
| **LAYA** | Local fallback for the classifier, same protocol | Fallback | `CLASSIFIER_PROVIDER=laya`, `LAYA_BASE_URL`, `LAYA_MODEL`, `LAYA_API_KEY` (optional) | `pip install "laya[serve]"` and then `laya-serve` (port 8000) | → mock | github.com/NandhaKishorM/laya |
| **MedGemma 1.5 4B** via Ollama | Routine or treatment draft | Real local | `PLANNER_PROVIDER=ollama\|mock`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | Install Ollama and then `ollama pull medgemma1.5:4b` (about 3.3 GB) | → plan fixture | huggingface.co/google/medgemma-1.5-4b-it |
| **NASA DONKI** (CCMC) | Space weather events (FLR, SEP, CME, GST) | Real + cache | `SPACE_WEATHER_PROVIDER=live\|fixture`, `DONKI_BASE_URL` | **No key** on the new host | → disk cache → fixture | ccmc.gsfc.nasa.gov/tools/DONKI |
| **NOAA SWPC** | Real-time GOES proton flux and X-rays, Kp, alerts | Real + cache | (shares `SPACE_WEATHER_PROVIDER`), `SWPC_BASE_URL` | No key | → disk cache → fixture | spaceweather.gov/content/data-access |
| **RadLab** (OSDR) | Reference ISS dosimetry | **Fixture** | `RADIATION_PROVIDER=fixture\|live`, `RADLAB_BASE_URL` | No key; data runs up to ~2024 | → fixture | visualization.osdr.nasa.gov/radlab/gui/data-api/ |
| **Web Speech API** | Sentry's voice (TTS) | Real (browser) | — | Nothing; on the client | On-screen text only | MDN SpeechSynthesisVoice |

Global mode: `SOMA_OFFLINE=true` forces every provider to `mock` or `fixture`.

## Discarded

| Service | Why |
|---|---|
| NASA OSDR biodata API | It is omics study metadata, mostly on rodents. There are no vital signs; it is useless for the risk loop |
| api.nasa.gov/DONKI (proxy) | Responded 503 in the 2026-10-31 tests. The CCMC host does not need a key |
| Piper (local TTS) | Useful, but now GPL-3.0, requires a sidecar and each voice has its own license. Optional for the future |
| Cloud TTS | Breaks the premise that everything runs locally |
| Other NASA APIs (APOD, EONET…) | They add nothing to health or radiation |

---

## Detail per service

### Jev (TypeSafe AI) — verified

- **Endpoint:** `POST https://api.typesafe.ai/v1/systemone`, with the header `Authorization: Bearer $TYPESAFE_API_KEY`.
- **Models:**
  - `jev-1.14.0` (since 2026-10-14) and `jev-1.13.0`.
  - The alias `jev-latest` points to 1.14.0.
  - `GET /v1/models` lists the available ones.
- **Question types:**

  | Type | What it returns |
  |---|---|
  | `noul` | Probability of "true" (**not a boolean**) |
  | `choice` | Chosen option + probabilities + `confidence` |
  | `score` | Weighted expected value, **not an integer** + probabilities + `confidence` |
  | `box` | Requires images; not used in Soma |

- **Errors:**

  | Code | Meaning | What to do |
  |---|---|---|
  | 400 / 422 | `detail` with the error | Fix the request |
  | 401 | Invalid key | Check the key |
  | 413 | Body > 32 MiB | Reduce the request |
  | 429 / 529 | Rate limit / overload | Retry with exponential backoff |

- **Cost:** $0.042 per million input tokens; output is free.
- **Self-hosted:** does not exist according to the official docs.
- **Sources:** https://docs.typesafe.ai/api/system-one.md · https://docs.typesafe.ai/api/errors.md · https://docs.typesafe.ai/models.md

### LAYA — verified (with caveats)

- **Package and license:** `laya` 0.4.18 on PyPI, Apache-2.0, from Convai Innovations.
- **Checkpoints:**
  - `english` and `typed-decisions` (ModernBERT-large, 421M).
  - `multilingual` (mmBERT-base, 322M).
- **Server:** `laya-serve` exposes `POST /v1/systemone` on `0.0.0.0:8000`, with the same protocol as Jev; it is **not** OpenAI-compatible.
- **Differences from Jev that the adapter must handle:**
  1. Different model names, so a per-provider map is needed.
  2. It has no `box` type.
  3. Each `score` level needs a description; a `null` level gives 422.
  4. `confidence` is computed as 1 − normalized entropy, so **Jev's thresholds do not apply**.
  5. `choice` supports at most 100 options.
- **Calibration (the vendor's own figures, without independent replication):**
  - The published checkpoints are **overconfident**: ECE 0.466, which only drops to 0.081 after recalibrating with your own data.
  - `typed-decisions` is not trained on health data.
  - On *zero-shot* typed decisions it is close to chance.
  - **Consequence in the UI:** every LAYA classification carries the label "local fallback · uncalibrated".
- **Requirements:** Python 3.10+; about 2.3 GB of weights; GPU optional (CUDA, MPS or CPU).
- **Sources:** https://pypi.org/project/laya/ · https://github.com/NandhaKishorM/laya · https://huggingface.co/convaiinnovations/laya-typed-decisions

### MedGemma 1.5 4B (Ollama) — verified

- **Model:** `google/medgemma-1.5-4b-it`, released 2026-01-13. Accepts text and image; 128K input context and 8K output.
- **In Ollama:** the tag is `medgemma1.5:4b`. `medgemma:4b` is **v1**, the previous version.
- **Call:** `POST http://localhost:11434/api/chat` with `stream: false` and `format: <JSON schema>` to get structured output. The schema also goes in the prompt.
- **Terms (HAI-DEF):**
  - Do not use it in a way that makes Google the "manufacturer" of a medical device.
  - Clinical use requires regulatory authorization.
  - According to the model card, the outputs "should be considered preliminary and require independent verification".
- **In the UI:** every output carries **"Draft · requires human validation"**.
- **Implemented client (feature 3):** `features/plan/ollama.client.ts`. It sends `stream: false`, `format` (JSON schema generated from the Zod schema, without the `$schema` key), `options.temperature: 0` and the schema also in the prompt; it validates `message.content` with Zod. 60 s timeout (`AbortSignal.timeout`, assumed value). Chain: Ollama → `data/fixtures/plan.json`. No new variables. With `SOMA_OFFLINE=true` or `PLANNER_PROVIDER=mock` no connection is opened and the random simulation is used.
- **Verified only against a fake HTTP server** (contract tests); not against a real Ollama.
- **Sources:** https://huggingface.co/google/medgemma-1.5-4b-it · https://developers.google.com/health-ai-developer-foundations/terms · https://ollama.com/library/medgemma1.5 · https://docs.ollama.com/capabilities/structured-outputs

### NASA DONKI — verified (URL change confirmed)

- **URL change:** CCMC announced on **2026-09-30** that the app and the API migrated to new official URLs. `kauai.ccmc.gsfc.nasa.gov` became `ccmc.gsfc.nasa.gov` and the paths stay the same.
- **Current base:** `https://ccmc.gsfc.nasa.gov/DONKI/WS/get/{FLR|SEP|CME|GST|notifications}?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  - Checked on 2026-10-31: HTTP 200 JSON, no key.
- **Limit:** the date range cannot exceed **60 days** (otherwise HTTP 400).
- **Strategy:**
  - Request the last 30 days.
  - Cache with `'use cache'` + `cacheLife`.
  - Save the last good response in `data/runtime/cache/` for offline mode.
- **Source:** https://ccmc.gsfc.nasa.gov/tools/DONKI

### NOAA SWPC — verified (new, recommended)

- **Why:** it complements DONKI with real-time data and no key. For radiation risk it is more direct than DONKI, which is an event catalog.
- **Feeds:**

  | Feed | Path |
  |---|---|
  | GOES protons (≥10 and ≥100 MeV) | `/json/goes/primary/integral-protons-1-day.json` |
  | X-rays | `/json/goes/primary/xrays-1-day.json` |
  | Kp index | `/products/noaa-planetary-k-index.json` |
  | Alerts | `/products/alerts.json` |
  | R/S/G scales | `/products/noaa-scales.json` |

- **Base:** `https://services.swpc.noaa.gov`
- **Source:** https://www.spaceweather.gov/content/data-access

### RadLab — verified: **not live**

- **API:** `GET https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&timestamp>=…&format=json`
- **Coverage:** returns data from 2022 to 2024 and **empty for 2025 and 2026**. It is a historical archive.
- **Decision:** use a **fixture** with a real 24 h ISS window, and an optional script to regenerate it.
- **Source:** https://visualization.osdr.nasa.gov/radlab/gui/data-api/

### Web Speech API (Sentry's voice)

- **Why:** zero installation and it runs in the browser.
- **Watch out:** Chrome and Edge "natural" voices need a network. Without internet only the system voices work, which are filtered with `voice.localService === true`.
- **Source:** https://developer.mozilla.org/docs/Web/API/SpeechSynthesisVoice/localService

### Ray-Ban Meta / Quest 3 (not prototype services)

- **Ray-Ban Meta (Gen 1/2):** camera, microphone (8 kHz mono) and speakers via the Wearables Device Access Toolkit, with a native SDK for iOS and Android. **No display.**
- **Meta Ray-Ban Display:** display access in *developer preview* since **2026-05-19**. It is a 600×600 UI pushed from the phone app. **This changed from the original assumption.**
- **Quest 3:** Unity + Meta XR Core SDK + Interaction SDK. In the prototype, `/xr` simulates it on the web.
- **Sources:** https://wearables.developer.meta.com/docs/develop/ · https://wearables.developer.meta.com/docs/develop/dat/display-overview/ · https://developers.meta.com/horizon/documentation/unity/unity-before-you-begin/

---

## `.env.example` draft (the real file is created in Phase 0b)

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
# Confidence below this marks the result "low confidence" (arbitrary defaults, tune with real data)
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

## Not verified

- **Jev:** whether the key still requires a waitlist, and the rate limit numbers.
- **LAYA:** the exact JSON of the `laya-serve` response, and whether it returns `legend` and `usage` like Jev.
- **MedGemma:** that Ollama accepts the Zod-generated schema as is (without `$schema`), the error body when the model is missing (the `/api/chat` docs do not describe it) and the real latency against the 60 s timeout; who publishes the Ollama tag and with what quantization; actual RAM needed (estimated 6–8 GB).
- **DONKI and SWPC:**
  - Whether `api.nasa.gov/DONKI` is retired or only down.
  - SWPC's terms of use and rate limits.
- **RadLab:** the unit of `absorbed_dose_rate` (assumed µGy/h) and the exact date coverage ends.
- **Wearables:** the maximum camera resolution of the Ray-Ban Meta, and whether the toolkit's general release is out yet.
