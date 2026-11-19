# ClubCheckAPI DataScraper

A Node.js worker service that discovers event pages, uses Firecrawl to scrape and classify them, extracts structured event data with Gemini, geocodes venues, and writes the resulting venues, artists, genres, and events into ClubCheckAPI.

> **Important:** this repository contains **no Ollama integration**. No source file reads `OLLAMA_HOST`, `OLLAMA_MODEL`, or calls a local Ollama endpoint. Classification is performed primarily by Firecrawl's embedded LLM and falls back to **Groq**; structured extraction is performed by **Google Gemini**. The existing code also does not contain a cron scheduler: scrape runs are triggered by `GET /scrape` and processed through BullMQ.

---

## 1. Service Overview & Pipeline Architecture

The service is both an HTTP API and a background worker. Fastify serves the HTTP endpoints, BullMQ queues source-scrape jobs in PostgreSQL, and the worker performs discovery, scraping, classification, extraction, geocoding, and upstream API ingestion.

### End-to-end flow

1. **Trigger a scrape run**
   - `GET /scrape` requires the `x-api-key` header to match `NODE_API_KEY`.
   - Invalid or missing keys return `404` with `Page Not Found`.
   - `scrapeService` selects rows from `sources` where `method ILIKE '%scrape%'`.
   - Each source becomes a BullMQ `scrape` job on the `Scrape Queue`.
   - Rows where `method ILIKE '%api%'` are also enqueued as `api` jobs on the `API Queue`, but this repository does not define an API-queue worker; those jobs require an external consumer.
   - The endpoint returns `202` with the discovered source configuration and queued counts.

2. **Discover links for a source**
   - If `sources.sitemap_available = true`, the client calls Firecrawl `POST /map` with `{ url }`.
   - Otherwise, it calls Firecrawl `POST /scrape` with `{ url, formats: ['links'], timeout: NODE_FIRECRAWL_TIMEOUT_MS }`.
   - Returned links are resolved against the source URL, restricted to `http`/`https`, stripped of fragments, and deduplicated.

3. **Scope and filter links**
   - The source page itself is skipped, including the same path with or without a trailing slash.
   - Links whose normalized host does not match the source host are skipped. Normalization lowercases the host, removes a leading `www.`, and preserves a non-default port.
   - URLs longer than `2_000` characters are skipped because `pages.url` is `varchar(2000)`.
   - Remaining URLs are checked against the `pages` table and already-known URLs are removed.

4. **Scrape and classify each unseen page**
   - If `sources.has_non_music_events = false`, the page is treated as music without LLM classification. Only `POST /scrape` is used, and classification is recorded as `source-config`.
   - Otherwise, the primary path calls Firecrawl `POST /scrape` with:
     - `includeTags` normalized from `sources.tags_to_be_scraped`
     - `formats: ['markdown', { type: 'json', prompt, schema }]`
     - `timeout: NODE_FIRECRAWL_LLM_TIMEOUT_MS`
   - Firecrawl's embedded LLM returns `{ "is_music": boolean, "certainty": "clear" | "likely" | "unlikely" | "unclear" }`.
   - If Firecrawl's embedded classification request fails, the service performs a plain `POST /scrape` for the page and falls back to Groq.
   - If the embedded response contains no usable JSON, the existing scraped text is passed to Groq.
   - Groq returns a page-level decision: the page is music-related if at least one classified item has `music: true`.

5. **Discard or forward**
   - Non-music pages are marked in `pages` and counted as `discarded`.
   - Music pages are forwarded to the downstream ingestion callback **before** being marked as scraped. This ordering lets a failed downstream call be retried without losing the event.
   - If no downstream handler is configured, the page is still marked and counted as music, with a warning that no downstream handler exists.

6. **Structured extraction with Gemini**
   - The scraped text is cleaned: HTML, scripts, styles, comments, control characters, zero-width characters, decorative separators, and Markdown markers are removed while links and visible text are kept.
   - Input is truncated to `200_000` characters for the default extractor.
   - Gemini receives the source URL, current UTC time, selected page metadata, and the page text wrapped in `<page_text>` tags.
   - The model is requested through `@google/genai` interactions with a JSON response schema, `max_output_tokens: 8192`, `temperature: 0.2`, and `store: false`.
   - Output must parse as JSON and validate against the Zod `structuredDataSchema`.
   - Metadata fallbacks are applied: organizer metadata is used when an event has no organizer; a single-event page may use the metadata image as `posterUrl`.

7. **Geocode venue cities**
   - Each venue with an address city is checked against Open-Meteo geocoding.
   - The canonical city name and `admin1` county are written back into the venue address.
   - An unmatched city throws `InvalidLocationError` before any persistence.
   - Network/HTTP failures throw `GeocodingApiError`, allowing the job to fail/retry separately from an invalid location.

8. **Ingest into ClubCheckAPI**
   - Referenced venues, artists, and genres are created first, in that order.
   - Artist names are enriched through MusicBrainz search and lookup. The resulting fingerprint becomes the artist slug when available.
   - Events are created last using the returned database IDs for venue, genres, and artists.
   - ClubCheckAPI requests use `X-API-Key` and are serialized by a rate limiter.
   - The page is marked as scraped after successful downstream processing.

### Queue behavior

- Queue names: `Scrape Queue` and `API Queue`.
- Job names: `scrape` and `api`.
- Default job options: `attempts: 3`, exponential backoff starting at `5_000 ms`.
- Completed jobs: removed after `86_400 s` or when more than `1_000` remain.
- Failed jobs: removed after `604_800 s`.
- Worker concurrency defaults to `5` (`NODE_SCRAPER_CONCURRENCY`).
- A source job with any failed pages throws after processing all pages, allowing BullMQ to retry the source. Pages already marked as scraped are skipped on retry.

### Progress stages

Source-level progress includes:

`started`, `discovering-links`, `links-discovered`, `source-scope-filtered`, `deduplicated`, `scraping-page`, `page-processed`, `page-failed`, `source-completed`, `source-completed-with-errors`.

Downstream progress includes:

`inferring`, `inferred`, `geocoding`, `geocoded`, `creating-venues`, `creating-artists`, `creating-genres`, `creating-events`, `ingested`.

---

## 2. Tech Stack & Directory Layout

### Tech stack

| Area | Technology |
| --- | --- |
| Runtime | Node.js, ES modules (`"type": "module"`) |
| HTTP server | Fastify 5 |
| Queue | BullMQ 6 with PostgreSQL backend (`createPostgresBackend`) |
| Database | PostgreSQL via `pg`; migrations via `node-pg-migrate` |
| HTTP client | Axios |
| Validation | Zod 4 |
| Logging | Pino / pino-pretty |
| Scraping | Firecrawl-compatible API using `POST /map` and `POST /scrape` with HTTP Basic Auth |
| Page classification | Firecrawl embedded LLM, Groq fallback |
| Structured extraction | Google Gemini via `@google/genai` |
| Geocoding | Open-Meteo Geocoding API |
| Artist enrichment | MusicBrainz Web Service |
| Container | Multi-stage Docker build on `node:lts-alpine`, `dumb-init`, non-root `node` user |
| Tests | Node.js built-in test runner (`node --test --test-force-exit`) |

### Directory layout

```text
.
├── Dockerfile
├── .dockerignore
├── package.json
├── package-lock.json
├── docs.md                         # ClubCheckAPI OpenAPI reference
├── geocodingAPI.md                 # Open-Meteo geocoding reference
├── testing.http                    # Sample HTTP requests
├── migrations/
│   ├── 1793477776702_test-migration.js
│   ├── 1794231329351_v1.js         # sources + pages tables
│   ├── 1794676867523_v2.js         # sources.tags_to_be_scraped
│   └── 1794752504855_v3.js         # sources.has_non_music_events
└── src/
    ├── index.js                    # Composition root, env parsing, worker startup
    ├── app.js                      # Fastify app, DB pool, queues, routes
    ├── api/
    │   ├── helloRoute.js           # GET /
    │   └── scrapeRoute.js          # GET /scrape, x-api-key auth
    ├── clients/
    │   ├── scraperApiClient.js     # Firecrawl /map and /scrape
    │   ├── clubCheckApiClient.js   # ClubCheckAPI private write endpoints
    │   ├── geocodingApiClient.js   # Open-Meteo search
    │   └── musicBrainzClient.js    # Artist search/lookup
    ├── config/
    │   ├── database.js             # pg Pool factory
    │   ├── embeddedClassification.js # Firecrawl embedded-LLM formats/prompt/schema
    │   ├── queue.js                # Queue and job names
    │   └── query.js                # Generic query helper
    ├── exceptions/
    │   └── enviromentVariablesNotFoundException.js
    ├── inferences/
    │   ├── structuredDataInference.js # Gemini extraction, Zod schema, prompts
    │   ├── groqClassification.js      # Groq music classification
    │   ├── geminiApi.js               # Standalone Gemini example
    │   └── groqApi.js                 # Standalone Groq example
    ├── mappers/
    │   └── clubCheckApiMapper.js   # Structured data -> ClubCheckAPI DTOs
    ├── middleware/
    │   ├── errorHandler.js         # RFC 7807-style error responses
    │   └── logger.js               # Pino configuration
    ├── repositories/
    │   └── pageRepository.js       # pages deduplication/insertion
    ├── services/
    │   ├── scrapeService.js        # Reads sources and enqueues jobs
    │   ├── sourceScrapeService.js  # Discovery, scope filtering, classification
    │   ├── scrapeIngestionPipeline.js # Gemini -> geocoding -> ingestion
    │   ├── eventIngestionService.js   # Venue/artist/genre/event creation
    │   ├── cityGeocodingService.js    # City verification/normalization
    │   └── artistFingerprintService.js # MusicBrainz fingerprinting + fallback
    ├── utils/
    │   ├── scraperPayload.js       # Firecrawl payload extraction helpers
    │   ├── includeTags.js          # includeTags normalization
    │   ├── textCleaning.js         # LLM input text cleanup
    │   ├── rateLimiter.js          # Serialized minimum-interval scheduler
    │   └── tokensPerMinuteLimiter.js # Rolling Groq TPM limiter
    ├── workers/
    │   └── scrapeWorker.js         # BullMQ scrape processor and lifecycle logging
    └── tests/                      # Node test suites for clients/services/utils
```

### HTTP endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/` | None | Health/hello response `{ "hello": "worlds" }` |
| `GET` | `/scrape` | `x-api-key: $NODE_API_KEY` | Enqueue all configured scrape and API sources; returns `202` |

### Database tables used by the scraper

- `sources`: `id`, `url`, `method`, `api_url`, `sitemap_available`, `description`, `tags_to_be_scraped`, `has_non_music_events`.
- `pages`: `id`, `url` (`varchar(2000)`), `"sourceId"` referencing `sources.id`, `is_scraped`.

---

## 3. Extraction & Classification Logic

### 3.1 Firecrawl integration

The Firecrawl client is configured with `NODE_SCRAPER_API_URL`, `SCRAPER_USERNAME`, and `SCRAPER_PASSWORD`. Every request uses HTTP Basic Auth.

| Operation | Firecrawl request |
| --- | --- |
| `mapSource(url)` | `POST {base}/map` with `{ url }` |
| `discoverLinks(url)` | `POST {base}/scrape` with `{ url, formats: ['links'], timeout: NODE_FIRECRAWL_TIMEOUT_MS }` |
| `scrapePage(url, includeTags)` | `POST {base}/scrape` with `{ url, includeTags, timeout: NODE_FIRECRAWL_TIMEOUT_MS }` |
| `classifyPage(url, includeTags)` | `POST {base}/scrape` with `{ url, includeTags, formats: EMBEDDED_CLASSIFICATION_FORMATS, timeout: NODE_FIRECRAWL_LLM_TIMEOUT_MS }` |

For `classifyPage`, the Axios timeout is set to `NODE_FIRECRAWL_LLM_TIMEOUT_MS + 15_000` so it exceeds Firecrawl's body timeout.

#### Embedded classification input schema

The Firecrawl embedded LLM is asked to classify whether a page is about a **single music event**:

```json
{
  "type": "object",
  "properties": {
    "is_music": { "type": "boolean" },
    "certainty": {
      "type": "string",
      "enum": ["clear", "likely", "unlikely", "unclear"]
    }
  },
  "required": ["is_music", "certainty"]
}
```

The embedded prompt marks a page as non-music when:

1. It is an index or multi-event page: the first `#` heading is generic (for example "Events", "Concerts", "Shows", "Calendar", "Archive"), or the body lists multiple distinct events rather than one dedicated event.
2. The first `#` main heading is clearly non-music (stand-up, theatre, sports, workshop, exhibition).

Otherwise, only the first `#` main heading is used to decide whether the title describes a music event. Certainty is `clear`, `likely`, `unlikely`, or `unclear`.

Embedded output is read from `data.json`, `payload.json`, `data.llm_extraction`, or `data.extract`; string JSON is parsed.

### 3.2 Groq fallback classification

- **Model default:** `openai/gpt-oss-20b` (`GROQ_MODEL`).
- **Request:** non-streaming chat completion with `temperature: 1`, `top_p: 1`, `max_completion_tokens: 2048`, `reasoning_effort: "medium"`, `stop: null`.
- **Input limit:** `20_000` characters by default. Longer text is truncated with a `[TRUNCATED: N characters omitted]` marker.
- **Empty input:** returns `{ music: false, reason: 'empty-content' }` without calling Groq.

System prompt used verbatim:

```text
You classify events. For each event decide if it is a music event (concert, gig, festival with live music, DJ/club night, recital, open mic). Not music: theatre, stand-up, sports, conferences, exhibitions, workshops, unless music is the main attraction. Reply ONLY with JSON: {"results":[{"id":<int>,"music":<true|false>}]}
```

User content is:

```text
Source URL: <sourceUrl>

<scraped text>
```

Expected output:

```json
{
  "results": [
    { "id": 1, "music": true }
  ]
}
```

Parsing accepts raw JSON or JSON wrapped in a Markdown code fence. If parsing fails, the parser attempts to extract the substring from the first `{` to the last `}`. A response is accepted only if at least one result has a boolean `music` field. The page is classified as music-related when **any** result has `music: true`.

### 3.3 Gemini structured extraction

- **SDK:** `@google/genai`
- **Model default:** `gemini-4-hydrogen` (`GEMINI_MODEL`)
- **Generation defaults:** `max_output_tokens: 8192`, `temperature: 0.2`, `store: false`
- **Input limit:** `200_000` characters by default
- **Required status:** the interaction must return `status === "completed"` and non-empty `output_text`
- **Output validation:** JSON is parsed, then validated with Zod using `structuredDataSchema`

The extraction system instruction treats scraped text as untrusted, forbids following instructions found in page content, forbids inventing values, and requires ISO 8601 dates, absolute URLs, deduplicated venues/artists/genres, and the currency codes `EUR`, `RON`, `USD`, or `HUF`.

#### Extraction output schema

Top-level object:

| Field | Type | Rules |
| --- | --- | --- |
| `events` | array | All events found in the page |
| `venues` | array | All distinct venues found in the page |
| `artists` | array | All distinct artists found in the page |
| `genres` | array | All distinct genres found in the page |

`events[]` fields:

| Field | Type | Rules |
| --- | --- | --- |
| `name` | string | 1–100 characters |
| `startDate` | string | ISO 8601 datetime with timezone offset or `Z` |
| `isActive` | boolean | True for upcoming/ongoing, false for cancelled/past |
| `endDate` | string \| null | ISO 8601 datetime with offset |
| `description` | string \| null | Maximum 800 characters |
| `organizer` | string \| null | Maximum 400 characters; exactly one organizer |
| `price` | object \| null | `{ value: non-negative number, currency: "EUR" \| "RON" \| "USD" \| "HUF" }` |
| `ticketUrl` | URL \| null | Absolute URL |
| `announcementUrl` | URL \| null | Absolute URL |
| `posterUrl` | URL \| null | Absolute URL; metadata image may be used for single-event pages |
| `venueName` | string | 1–100 characters; references `venues[].name` |
| `artistNames` | string[] | Each 1–150 characters; references `artists[].name` |
| `genreNames` | string[] | Each 1–50 characters; references `genres[].name` |

`venues[]` fields:

| Field | Type | Rules |
| --- | --- | --- |
| `name` | string | 1–100 characters |
| `address` | object \| null | Null when not present in the source |
| `address.zipCode` | string \| null | Maximum 12 characters |
| `address.number` | string \| null | Maximum 5 characters |
| `address.street` | string \| null | Maximum 100 characters |
| `address.city` | string | 1–100 characters; required when an address is provided |
| `address.county` | string \| null | Maximum 100 characters |
| `address.country` | string \| null | Maximum 100 characters |
| `address.googleMapsUrl` | URL \| null | Absolute URL |

`artists[]` fields:

| Field | Type | Rules |
| --- | --- | --- |
| `name` | string | 1–150 characters |
| `slug` | string | 1–300 characters; lowercase ASCII words separated by hyphens |

`genres[]` fields:

| Field | Type | Rules |
| --- | --- | --- |
| `name` | string | 1–50 characters |

The extractor returns:

```js
{
  sourceUrl,
  model,
  interactionId,
  usage,
  extractedAt,
  structured
}
```

`structured` is the validated top-level object after metadata fallbacks.

### 3.4 Filtering criteria summary

- Source scope: same normalized host as the configured source; `www.` is ignored.
- Source page itself is always skipped.
- Only `http` and `https` links are kept.
- URL fragments are removed.
- URLs over `2_000` characters are skipped.
- Previously recorded `pages.url` values are skipped globally.
- `sources.has_non_music_events = false` bypasses LLM classification and treats every page as music.
- Firecrawl embedded classification rejects index/multi-event pages and clearly non-music headings.
- Groq classifies by event intent: concerts, gigs, live-music festivals, DJ/club nights, recitals, and open mics are music; theatre, stand-up, sports, conferences, exhibitions, and workshops are not unless music is the main attraction.
- Gemini is instructed not to include events without an identifiable start date.
- Invalid venue cities are rejected before persistence.

### 3.5 Error and retry handling

#### Firecrawl client

- Retryable HTTP statuses: `408`, `425`, `429`, `500`, `502`, `503`, `504`.
- Retryable network codes: `ECONNABORTED`, `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`, `EAI_AGAIN`.
- Errors without a code are treated as retryable.
- Maximum retries default to `1` (`NODE_SCRAPER_API_MAX_RETRIES`).
- Delay uses `Retry-After` when present; otherwise exponential backoff: `NODE_SCRAPER_API_RETRY_DELAY_MS * 2^attempt`.
- Non-retryable errors, including `401`, are thrown immediately.
- `ScraperApiError` includes method, path, payload, response body, status code, attempt count, and a Firecrawl error/request ID when present.

#### Classification fallback

- Embedded Firecrawl classification failure: log the error, perform a plain page scrape, then call Groq.
- Embedded Firecrawl response without usable JSON: log a warning and call Groq using the already scraped text.
- Groq empty content: treat the page as non-music.
- Groq request failure: throw `GroqClassificationError`.
- Invalid JSON, missing boolean `music` field, or empty response: throw `GroqClassificationError` with the raw output attached.
- Groq `429` handling: up to `5` rate-limit retries. Cooldown is derived from `Retry-After`, response body fields (`retry_after_ms`, `retryAfterMs`, `cooldown_ms`, `cooldownMs`, `retry_after`, `retryAfter`, `cooldown`), or the error message; fallback is `60_000 ms`.
- Groq token limiter uses a rolling `60_000 ms` window and a default limit of `8_000` tokens (`GROQ_TPM_LIMIT`). It reserves estimated input tokens plus the maximum completion budget, then reconciles with `usage.total_tokens` or releases the reservation on failure.

#### Gemini extraction

- Empty cleaned text: throws `StructuredDataExtractionError`.
- Interaction not completed or empty output: throws `StructuredDataExtractionError`.
- Invalid JSON: throws `StructuredDataExtractionError` with raw output.
- Schema mismatch: throws `StructuredDataExtractionError` with Zod issues and raw output.
- The extractor itself has no retry loop; failures propagate to the page handler and then to BullMQ for source-level retry.

#### Page/source handling

- A failed page increments `summary.failed`, emits `page-failed`, and processing continues with the next page.
- On a music page, downstream ingestion runs **before** `markScraped`. If ingestion fails, the page is not marked and the source job can retry it.
- A source with any failed pages throws `"<n> page(s) failed for source <url>"`, causing BullMQ to retry the entire source job.
- Already-scraped pages are skipped on retry through `pageRepository.findExistingUrls`.
- Non-music pages are marked as scraped and discarded.
- A missing `data.source.id` or `data.source.url` on a job throws immediately.

#### Downstream clients

- MusicBrainz retries `429`, `502`, `503`, and `504` up to `2` times with `Retry-After` or exponential backoff.
- MusicBrainz requests are serialized with a minimum interval of `1_100 ms`.
- MusicBrainz failures fall back to a slug derived from the artist name or LLM-provided slug so ingestion can continue.
- Artist fingerprint results and `no-match` fallbacks are cached; transient MusicBrainz failures are not cached.
- ClubCheckAPI requests are serialized with a minimum interval of `60_000 ms`.
- ClubCheckAPI client errors are wrapped in `ClubCheckApiError`; retries happen at the BullMQ job level.
- Geocoding API failures are wrapped in `GeocodingApiError`; an unmatched city throws `InvalidLocationError`.

---

## 4. Configuration & Environment Variables

Environment variables are read in `src/index.js`. The process attempts `process.loadEnvFile('../.env')`; if that fails it logs the failure and continues with variables already present in the environment. The path is relative to the process working directory, so for local runs either export variables directly or place the file where `../.env` resolves as intended.

### Server and database

| Variable | Default | Required | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | `production` in `index.js`; logger falls back to `development` | No | Runtime mode; non-production enables pino-pretty |
| `NODE_HOST` | `0.0.0.0` | No | Fastify listen host |
| `NODE_PORT` | `3000` | No | Fastify listen port |
| `NODE_API_KEY` | empty | For `/scrape` | Expected `x-api-key` value; also fallback for `NODE_CLUBCHECK_API_KEY` |
| `NODE_DATABASE_URL_POOLED` | empty | Yes, for DB | Pooled PostgreSQL connection for application queries |
| `NODE_DATABASE_URL_UNPOOLED` | `DATABASE_URL` or pooled URL | No | Preferred queue connection; BullMQ's PostgreSQL backend needs an unpooled endpoint because it sets `search_path` |
| `DATABASE_URL` | empty | Fallback | Fallback queue connection string |

### Firecrawl / scraper API

| Variable | Default | Required | Purpose |
| --- | --- | --- | --- |
| `NODE_SCRAPER_API_URL` | empty | Yes, to start worker | Firecrawl-compatible API base URL; `/map` and `/scrape` are appended |
| `SCRAPER_USERNAME` | empty | Yes, to start worker | Firecrawl HTTP Basic Auth username |
| `SCRAPER_PASSWORD` | empty | Yes, to start worker | Firecrawl HTTP Basic Auth password |
| `NODE_SCRAPER_API_TIMEOUT_MS` | `60000` | No | General Firecrawl request timeout |
| `NODE_FIRECRAWL_TIMEOUT_MS` | `30000` | No | Firecrawl body timeout for map/link/plain scrape requests |
| `NODE_FIRECRAWL_LLM_TIMEOUT_MS` | `180000` | No | Firecrawl body timeout for embedded-LLM classification; Axios timeout is this plus 15 seconds |
| `NODE_SCRAPER_API_MAX_RETRIES` | `1` | No | Firecrawl retry count |
| `NODE_SCRAPER_API_RETRY_DELAY_MS` | `2000` | No | Base Firecrawl exponential retry delay |
| `NODE_SCRAPER_CONCURRENCY` | `5` | No | BullMQ scrape worker concurrency |

### LLM providers

| Variable | Default | Required | Purpose |
| --- | --- | --- | --- |
| `GROQ_API_KEY` | empty | Yes, to start worker | Groq API key |
| `GROQ_MODEL` | `openai/gpt-oss-20b` | No | Groq classification model |
| `GROQ_TPM_LIMIT` | `8000` | No | Rolling tokens-per-minute limit for Groq |
| `GEMINI_API_KEY` | empty | Yes, for extraction | Gemini API key; without it no `onMusicEvent` extraction handler is configured |
| `GEMINI_MODEL` | `gemini-4-hydrogen` | No | Gemini extraction model |
| `OLLAMA_HOST` / `OLLAMA_MODEL` | — | No | **Not used anywhere in this repository.** There is no Ollama integration. |

### Geocoding

| Variable | Default | Required | Purpose |
| --- | --- | --- | --- |
| `NODE_GEOCODING_API_URL` | `https://geocoding-api.open-meteo.com/v1/search` | No | Open-Meteo geocoding endpoint |
| `NODE_GEOCODING_API_TIMEOUT_MS` | `15000` | No | Geocoding request timeout |

### ClubCheckAPI ingestion

| Variable | Default | Required | Purpose |
| --- | --- | --- | --- |
| `NODE_CLUBCHECK_API_URL` | empty | For ingestion | Base URL of ClubCheckAPI |
| `NODE_CLUBCHECK_API_KEY` | `NODE_API_KEY` | For ingestion | API key sent as `X-API-Key` |
| `NODE_CLUBCHECK_POST_INTERVAL_MS` | `60000` | No | Minimum interval between ClubCheckAPI writes |

ClubCheckAPI write endpoints used:

- `POST /Venues/private`
- `POST /Artists/private`
- `POST /Genres/private`
- `POST /Events/private`

### MusicBrainz

| Variable | Default | Required | Purpose |
| --- | --- | --- | --- |
| `MUSICBRAINZ_API_URL` | `https://musicbrainz.org/ws/2` | No | MusicBrainz Web Service base URL |
| `MUSICBRAINZ_USER_AGENT` | `ClubCheckAPI-DataScraper/1.0.0` | Recommended | `User-Agent` header; startup warns when it is not explicitly set |
| `MUSICBRAINZ_MIN_INTERVAL_MS` | `1100` | No | Minimum interval between MusicBrainz requests |
| `MUSICBRAINZ_INCLUDES` | built-in relation set | No | Overrides the `inc` parameter for artist lookup |

The built-in MusicBrainz includes are:

```text
aliases+annotation+genres+ratings+tags+url-rels+artist-rels+label-rels+work-rels
```

### Scheduling and pacing

There is **no cron, interval scheduler, or delayed/repeatable job** in this repository. A scrape run starts only when `GET /scrape` is called.

| Pacing / retry setting | Default | Location |
| --- | --- | --- |
| BullMQ job attempts | `3` | `src/app.js` |
| BullMQ exponential backoff | `5000 ms` | `src/app.js` |
| Completed-job retention | `86400 s`, max `1000` | `src/app.js` |
| Failed-job retention | `604800 s` | `src/app.js` |
| Firecrawl retry delay | `2000 ms` base | `NODE_SCRAPER_API_RETRY_DELAY_MS` |
| Groq rate-limit retries | `5` | `src/inferences/groqClassification.js` |
| Groq rate-limit fallback cooldown | `60000 ms` | `src/inferences/groqClassification.js` |
| Groq TPM window | `60000 ms` | `src/utils/tokensPerMinuteLimiter.js` |
| MusicBrainz minimum request interval | `1100 ms` | `MUSICBRAINZ_MIN_INTERVAL_MS` |
| ClubCheckAPI minimum write interval | `60000 ms` | `NODE_CLUBCHECK_POST_INTERVAL_MS` |

### Startup gating

- The scrape worker starts only when `NODE_SCRAPER_API_URL`, `SCRAPER_USERNAME`, `SCRAPER_PASSWORD`, and `GROQ_API_KEY` are all set.
- Gemini extraction is enabled only when `GEMINI_API_KEY` is set.
- ClubCheckAPI ingestion is enabled only when `NODE_CLUBCHECK_API_URL` and a ClubCheckAPI key are set.
- With Gemini but without ClubCheckAPI, the pipeline extracts and geocodes data but does not persist it.
- Without Gemini, music pages are discovered but no extraction handler runs; they are still marked as scraped after the warning.

Log messages at startup identify which stages are enabled or which required variables are missing.

---

## 5. Running Locally & via Docker

### Prerequisites

- Node.js LTS (the Docker image uses `node:lts-alpine`).
- PostgreSQL reachable through `NODE_DATABASE_URL_POOLED`; an unpooled URL is strongly recommended for BullMQ through `NODE_DATABASE_URL_UNPOOLED`.
- A Firecrawl-compatible API with Basic Auth credentials.
- Groq API key.
- Gemini API key for extraction.
- ClubCheckAPI URL and API key for persistence.
- Network access to Open-Meteo and MusicBrainz, or compatible mirrors.

### Install and prepare the database

```bash
npm ci
npm run migrate up
```

The `migrate` script runs `PGSSLMODE=require node-pg-migrate`. Adjust SSL behavior for a local PostgreSQL instance if required by your environment.

### Configure the environment

Export the variables listed above, or provide an environment file that `process.loadEnvFile('../.env')` can find relative to the process working directory.

Minimum useful local configuration:

```bash
export NODE_ENV=development
export NODE_HOST=0.0.0.0
export NODE_PORT=3000
export NODE_API_KEY=dev-key
export NODE_DATABASE_URL_POOLED='postgres://user:pass@localhost:5432/clubcheck'
export NODE_DATABASE_URL_UNPOOLED='postgres://user:pass@localhost:5432/clubcheck'

export NODE_SCRAPER_API_URL='http://localhost:3002/v2'
export SCRAPER_USERNAME='firecrawl-user'
export SCRAPER_PASSWORD='firecrawl-password'

export GROQ_API_KEY='...'
export GROQ_MODEL='openai/gpt-oss-20b'
export GEMINI_API_KEY='...'
export GEMINI_MODEL='gemini-4-hydrogen'

export NODE_CLUBCHECK_API_URL='http://localhost:30021'
export NODE_CLUBCHECK_API_KEY='dev-key'
export MUSICBRAINZ_USER_AGENT='ClubCheckAPI-DataScraper/1.0.0 (you@example.com)'
```

### Start the service

`package.json` does not define a `start` script. Run the entry point directly:

```bash
node src/index.js
```

The service listens on `http://0.0.0.0:3000` by default.

### Run tests

```bash
npm test
```

The test suite uses `node --test --test-force-exit` and covers Firecrawl payloads and retries, Groq classification, Gemini schema validation, geocoding, MusicBrainz, ClubCheckAPI mapping, rate limiters, page deduplication, and worker behavior.

### Trigger a single scrape run

1. Ensure at least one row exists in `sources` with a `url` and `method` containing `scrape`, for example:

```sql
INSERT INTO sources (url, method, sitemap_available, has_non_music_events, tags_to_be_scraped)
VALUES ('https://example.com/events', 'scrape', true, true, '["h1", ".date"]');
```

2. Call the endpoint:

```bash
curl -i \
  -H "x-api-key: $NODE_API_KEY" \
  http://localhost:3000/scrape
```

A successful request returns `202` with `scrapeSources`, `apiSourceUrl`, and queued counts. The worker processes the `Scrape Queue`; progress and completion are visible in logs.

A request with a missing or incorrect key returns `404` with `Page Not Found`.

The repository also includes `testing.http` with sample requests for `/` and `/scrape`.

### Docker

Build the image:

```bash
docker build -t clubcheck-datascraper .
```

Run it with environment variables:

```bash
docker run --rm \
  --env-file .env \
  -p 3000:3000 \
  clubcheck-datascraper
```

The Dockerfile:

- Builds with `node:lts-alpine` and `npm ci`.
- Creates a production runtime image with `npm ci --omit=dev`.
- Installs `dumb-init`.
- Copies only `src`.
- Runs as the non-root `node` user.
- Exposes port `3000`.
- Starts with `dumb-init node src/index.js`.

`SIGINT` and `SIGTERM` trigger graceful shutdown of the Fastify app, queues, worker, and database pool.

### Troubleshooting Firecrawl connectivity

Test the configured base URL directly from the same host/container:

```bash
curl -i \
  -u "$SCRAPER_USERNAME:$SCRAPER_PASSWORD" \
  -H 'Content-Type: application/json' \
  -X POST "$NODE_SCRAPER_API_URL/map" \
  -d '{"url":"https://example.com"}'
```

Test a scrape:

```bash
curl -i \
  -u "$SCRAPER_USERNAME:$SCRAPER_PASSWORD" \
  -H 'Content-Type: application/json' \
  -X POST "$NODE_SCRAPER_API_URL/scrape" \
  -d '{"url":"https://example.com","formats":["markdown"],"timeout":30000}'
```

Common causes:

- **`401` / `403`**: check `SCRAPER_USERNAME` and `SCRAPER_PASSWORD`. Authentication failures are not retried.
- **Wrong URL path**: `NODE_SCRAPER_API_URL` is the base; `/map` and `/scrape` are appended. Include the correct version prefix expected by your Firecrawl deployment.
- **Connection refused / DNS errors**: in Docker, `localhost` refers to the container. Use a reachable hostname such as a Compose service name or `host.docker.internal`.
- **Timeouts on classification**: Firecrawl's embedded LLM can be slow. Increase `NODE_FIRECRAWL_LLM_TIMEOUT_MS`; the Axios timeout is automatically that value plus 15 seconds.
- **`5xx` / `429`**: the client retries according to `NODE_SCRAPER_API_MAX_RETRIES` and logs the Firecrawl error/request ID.
- **No JSON classification**: the service logs a warning and falls back to Groq. If Groq is not configured, the worker does not start at all.
- **`includeTags` problems**: selectors come from `sources.tags_to_be_scraped` and may be JSON arrays, double-encoded JSON, or comma-separated values; wrapping quotes and backslashes are stripped.

### Troubleshooting Ollama

There is nothing to troubleshoot for Ollama in this codebase because no Ollama host, model, client, or endpoint is referenced.

- If you expected local classification/extraction, verify `GROQ_API_KEY` for classification and `GEMINI_API_KEY` for extraction.
- If you want Ollama support, it must be implemented separately; changing `OLLAMA_HOST` or `OLLAMA_MODEL` has no effect on the current service.

### Troubleshooting Groq and Gemini

- **Worker not started**: logs list missing variables among `NODE_SCRAPER_API_URL`, `SCRAPER_USERNAME`, `SCRAPER_PASSWORD`, and `GROQ_API_KEY`.
- **No extraction**: check for the startup warning `GEMINI_API_KEY is not set; music pages will not be sent to Gemini`.
- **Groq `429`**: inspect logs for `Groq rate limit reached; waiting before retry` and lower `GROQ_TPM_LIMIT` if requests consistently exceed the account limit.
- **Groq invalid output**: logs include `Groq returned invalid classification JSON` and the raw output.
- **Gemini schema failures**: logs include `Gemini response did not match the ClubCheckAPI schema` and the Zod issues.

### Troubleshooting database, queues, and ingestion

- **Queue connection errors**: BullMQ uses its PostgreSQL backend. Prefer an unpooled Neon/PostgreSQL endpoint for `NODE_DATABASE_URL_UNPOOLED`; pooled endpoints may reject the `search_path` startup option.
- **No sources queued**: confirm `sources.method` contains `scrape` and `sources.url` is non-null.
- **API jobs collect without processing**: this repository has no worker for the `API Queue`; an external consumer is required.
- **Duplicate scraping across runs**: `pages.url` is the deduplication key across all sources.
- **Pages missing after a partial failure**: failed pages are not marked as scraped, and the source job is retried. Successfully processed pages are skipped on retry.
- **Ingestion failures**: check ClubCheckAPI URL/key, `X-API-Key` acceptance, rate limiting at `NODE_CLUBCHECK_POST_INTERVAL_MS`, and MusicBrainz connectivity. MusicBrainz failures use a slug fallback, but ClubCheckAPI write failures fail the page and trigger a source-level retry.
