# ClubCheck

Event discovery for concerts, festivals, and club nights: a scraper ingests venue and promoter listings, an ASP.NET Core API stores and serves the catalogue, and a Next.js frontend provides the public browsing experience.

## Screenshots

![Screenshot1](/docs/calendar.png)


![Screenshot2](/docs/searchBar.png)

## End-to-End Architecture

```mermaid
flowchart LR
  Browser["Browser"]
  Operator["Operator / scheduler"]

  subgraph ACA["Azure Container Apps"]
    Frontend["Next.js frontend<br/>Server Components"]
    API["ASP.NET Core API<br/>public reads + private writes"]
    Scraper["Node.js scraper<br/>Fastify + BullMQ"]
  end

  subgraph PG["PostgreSQL"]
    ApiDb[("API DB<br/>events, venues, artists, genres")]
    ScraperDb[("Scraper DB<br/>sources, pages, queues")]
  end

  subgraph External["External services"]
    Sites["Venue / promoter sites"]
    Firecrawl["Firecrawl<br/>map / scrape / embedded LLM"]
    Groq["Groq<br/>classification fallback"]
    Gemini["Google Gemini<br/>structured extraction"]
    Geocoding["Open-Meteo<br/>geocoding"]
    MusicBrainz["MusicBrainz<br/>artist enrichment"]
  end

  Browser -->|HTTPS| Frontend
  Frontend -->|GET /Events/public*| API
  API <--> ApiDb

  Operator -->|GET /scrape, x-api-key| Scraper
  Scraper <--> ScraperDb
  Scraper -->|map / scrape| Firecrawl
  Firecrawl -->|fetches pages from| Sites
  Scraper -->|fallback classification| Groq
  Scraper -->|structured extraction| Gemini
  Scraper -->|city lookup| Geocoding
  Scraper -->|artist lookup| MusicBrainz
  Scraper -->|POST /Venues/private, /Artists/private,<br/>/Genres/private, /Events/private<br/>X-API-Key| API
```

> **Ollama note:** the current scraper has **no Ollama integration**. Classification uses Firecrawl's embedded LLM with a Groq fallback; structured extraction uses Google Gemini. See [`DataScraper/README.md`](DataScraper/README.md) for details.

## Monorepo Structure

| Path | README | Responsibility | Tech stack | Local / host port |
| --- | --- | --- | --- | --- |
| `ClubCheckAPI/` | [`README`](ClubCheckAPI/README.md) | Public read API plus API-key-protected write API for ingestion; PostgreSQL persistence; health endpoints | .NET 10, ASP.NET Core, EF Core 10, Npgsql, Serilog, xUnit + Testcontainers | `8080` native; `30021` via Compose (container `8080`) |
| `DataScraper/` | [`README`](DataScraper/README.md) | Discovers/scrapes event pages, classifies music pages, extracts structured events, geocodes cities, enriches artists, writes to the API | Node.js 24, Fastify, BullMQ, PostgreSQL, Firecrawl, Groq, Gemini, Open-Meteo, MusicBrainz | `30022` via Compose (container `3000`) |
| `Frontend/front/` | [`README`](Frontend/front/README.md) | Romanian-language public event listing, filters, event detail pages, SEO metadata, related events | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/Base UI, Vitest | `3000` native; `30023` via Compose (container `3000`) |

`IntegrationTests/` contains the API integration test project and is covered by the API workflow. The root [`compose.yaml`](compose.yaml) also starts separate PostgreSQL instances for the API and scraper (`5432` and `5433` on the host).

## End-to-End Local Quickstart

### Prerequisites

- Docker with Compose.
- .NET SDK 10 and the EF Core 10 tool for API migrations.
- Node.js 24 and npm for scraper migrations.
- A Firecrawl-compatible endpoint with Basic Auth credentials.
- Groq and Gemini API keys.
- Optional: MusicBrainz `User-Agent` contact string.

### 1. Configure the root `.env`

Compose reads the gitignored root `.env`. Create it with local values; do not commit real secrets.

```dotenv
# API / database
ASPNETCORE_ENVIRONMENT=Development
DB_USER=clubcheck
DB_PASSWD=change-me
DB_NAME=clubcheck
DB_PORT=5432
API_KEY=replace-with-long-random-key
DB_CONN_STRING=Host=localhost;Port=5432;Database=clubcheck;Username=clubcheck;Password=change-me
DB_CONN_STRING_CONTAINER=Host=db;Port=5432;Database=clubcheck;Username=clubcheck;Password=change-me

# Scraper / scraper database
NODE_ENV=development
NODE_HOST=0.0.0.0
NODE_PORT=3000
NODE_API_KEY=replace-with-long-random-key
NODE_DB_USER=scraper
NODE_DB_PASSWD=change-me
NODE_DB_NAME=scraper
NODE_DATABASE_URL_POOLED=postgres://scraper:change-me@db-scraper:5432/scraper
DATABASE_URL=postgres://scraper:change-me@db-scraper:5432/scraper
NODE_SCRAPER_API_URL=https://your-firecrawl-host/v2
SCRAPER_USERNAME=your-firecrawl-user
SCRAPER_PASSWORD=your-firecrawl-password
GROQ_API_KEY=your-groq-key
GEMINI_API_KEY=your-gemini-key
NODE_CLUBCHECK_API_URL=http://clubcheckapi:8080
NODE_CLUBCHECK_API_KEY=replace-with-long-random-key
MUSICBRAINZ_USER_AGENT=ClubCheckAPI-DataScraper/1.0.0 (you@example.com)

# Frontend
MAIN_API_BASE_URL=http://clubcheckapi:8080
NEXT_PUBLIC_SITE_URL=http://localhost:30023
```

### 2. Unified environment variable reference

| Group | Variable | Used by | Required | Purpose / notes |
| --- | --- | --- | --- | --- |
| API | `ASPNETCORE_ENVIRONMENT` | `clubcheckapi` | No | Defaults to `Production`; `Development` enables OpenAPI/Scalar and detailed exception responses. |
| API | `API_KEY` | `clubcheckapi` | Yes for private writes | Maps to `ApiKey__Value`; expected in `X-API-Key`. Set the scraper's `NODE_CLUBCHECK_API_KEY` to the same value. |
| API DB | `DB_USER`, `DB_PASSWD`, `DB_NAME`, `DB_PORT` | `db` | Yes for local Compose | Local PostgreSQL credentials; `DB_PORT` is the host port (`5432`). |
| API DB | `DB_CONN_STRING_CONTAINER` | `clubcheckapi` | Yes | Maps to `ConnectionStrings__DefaultConnection`; use host `db` inside Compose. |
| API DB | `DB_CONN_STRING` | host tools | No | Host-side connection string for migrations, for example `Host=localhost;Port=5432;...`. |
| Scraper DB | `NODE_DB_USER`, `NODE_DB_PASSWD`, `NODE_DB_NAME` | `db-scraper` | If using local scraper DB | Credentials for the Compose `db-scraper` service. |
| Scraper | `NODE_ENV` | `scraper` | No | Runtime mode; non-production enables pretty logs. |
| Scraper | `NODE_HOST`, `NODE_PORT` | `scraper` | No | Fastify listen address; defaults `0.0.0.0:3000`. |
| Scraper | `NODE_API_KEY` | `scraper` | Yes | Required `x-api-key` for `GET /scrape`; fallback for the ClubCheck API key. |
| Scraper | `NODE_DATABASE_URL_POOLED` | `scraper` | Yes | PostgreSQL connection for scraper application queries. |
| Scraper | `NODE_DATABASE_URL_UNPOOLED` / `DATABASE_URL` | `scraper` | Yes | BullMQ PostgreSQL backend connection; an unpooled endpoint is recommended. Compose passes `DATABASE_URL` as `NODE_DATABASE_URL_UNPOOLED`. |
| Scraper | `NODE_SCRAPER_API_URL` | `scraper` | Yes | Firecrawl-compatible base URL; `/map` and `/scrape` are appended. |
| Scraper | `SCRAPER_USERNAME`, `SCRAPER_PASSWORD` | `scraper` | Yes | Firecrawl HTTP Basic Auth credentials. |
| Scraper | `NODE_SCRAPER_API_TIMEOUT_MS` | `scraper` | No | General Firecrawl timeout; default `60000`. |
| Scraper | `NODE_FIRECRAWL_TIMEOUT_MS` | `scraper` | No | Map/link/plain-scrape body timeout; default `30000`. |
| Scraper | `NODE_FIRECRAWL_LLM_TIMEOUT_MS` | `scraper` | No | Embedded-LLM classification timeout; default `180000`. |
| Scraper | `NODE_SCRAPER_API_MAX_RETRIES` | `scraper` | No | Firecrawl retry count; default `1`. |
| Scraper | `NODE_SCRAPER_API_RETRY_DELAY_MS` | `scraper` | No | Base exponential retry delay; default `2000`. |
| Scraper | `NODE_SCRAPER_CONCURRENCY` | `scraper` | No | BullMQ worker concurrency; default `5`. |
| Scraper | `GROQ_API_KEY` | `scraper` | Yes to start worker | Groq classification fallback key. |
| Scraper | `GROQ_MODEL` | `scraper` | No | Classification model; default `openai/gpt-oss-20b`. |
| Scraper | `GROQ_TPM_LIMIT` | `scraper` | No | Rolling tokens-per-minute limit; default `8000`. |
| Scraper | `GEMINI_API_KEY` | `scraper` | Yes for extraction | Enables structured event extraction. |
| Scraper | `GEMINI_MODEL` | `scraper` | No | Extraction model; default `gemini-4-hydrogen`. |
| Scraper | `NODE_GEOCODING_API_URL` | `scraper` | No | Open-Meteo geocoding endpoint. |
| Scraper | `NODE_GEOCODING_API_TIMEOUT_MS` | `scraper` | No | Geocoding timeout; default `15000`. |
| Scraper | `NODE_CLUBCHECK_API_URL` | `scraper` | Yes for ingestion | API base URL; use `http://clubcheckapi:8080` inside Compose. |
| Scraper | `NODE_CLUBCHECK_API_KEY` | `scraper` | Yes for ingestion | API key sent as `X-API-Key`; defaults to `NODE_API_KEY`. |
| Scraper | `NODE_CLUBCHECK_POST_INTERVAL_MS` | `scraper` | No | Minimum interval between API writes; default `60000`. |
| Scraper | `MUSICBRAINZ_API_URL` | `scraper` | No | MusicBrainz Web Service base URL. |
| Scraper | `MUSICBRAINZ_USER_AGENT` | `scraper` | Recommended | MusicBrainz `User-Agent` with contact information. |
| Scraper | `MUSICBRAINZ_MIN_INTERVAL_MS` | `scraper` | No | Minimum interval between requests; default `1100`. |
| Scraper | `MUSICBRAINZ_INCLUDES` | `scraper` | No | Overrides the MusicBrainz `inc` relation set. |
| Scraper | `OLLAMA_HOST`, `OLLAMA_MODEL` | — | No | **Not used.** There is no Ollama integration in the scraper. |
| Frontend | `MAIN_API_BASE_URL` | `front` | No | Server-side API base URL; Docker should receive it at runtime. |
| Frontend | `NEXT_PUBLIC_SITE_URL` | `front` | No | Canonical/OG site origin. Inlined at build time; rebuild the image if changed. |
| Frontend | `NEXT_TELEMETRY_DISABLED` | `front` | No | Set to `1` to disable Next.js telemetry. |

See the service READMEs for the full ASP.NET Core configuration keys and optional scraper tuning values.

### 3. Start PostgreSQL, then apply migrations

The API and scraper do **not** apply migrations automatically in containers.

```bash
# Start both local databases
docker compose up -d db db-scraper

# API migrations (host-side)
dotnet tool restore
dotnet tool update dotnet-ef --version 10.0.0
ConnectionStrings__DefaultConnection='Host=localhost;Port=5432;Database=clubcheck;Username=clubcheck;Password=change-me' \
  dotnet ef database update \
  --project ClubCheckAPI/ClubCheckAPI.csproj \
  --startup-project ClubCheckAPI/ClubCheckAPI.csproj

# Scraper migrations (host-side; local Postgres usually has no TLS)
cd DataScraper
npm ci
DATABASE_URL='postgres://scraper:change-me@localhost:5433/scraper' \
PGSSLMODE=disable \
  npx node-pg-migrate up
cd ..
```

### 4. Build and start the full stack

```bash
docker compose up --build -d
docker compose ps
```

> `NEXT_PUBLIC_SITE_URL` is inlined by Next.js at build time. Compose's runtime environment does not change canonical metadata; for a custom local origin, build the frontend with `docker compose build --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:30023 front` before starting it.

Endpoints:

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:30023` |
| API health | `http://localhost:30021/health` |
| API database health | `http://localhost:30021/health-db` |
| Scraper health | `http://localhost:30022/` |
| API PostgreSQL | `localhost:5432` |
| Scraper PostgreSQL | `localhost:5433` |

Verify the API and trigger a scrape run:

```bash
curl http://localhost:30021/health
curl http://localhost:30021/health-db
curl -i -H "x-api-key: replace-with-long-random-key" http://localhost:30022/scrape
```

A successful scrape trigger returns `202`. The scraper only processes sources whose `sources.method` contains `scrape`; seed the scraper database before triggering if it is empty.

Useful Compose commands:

```bash
docker compose logs -f clubcheckapi
docker compose logs -f scraper
docker compose logs -f front
docker compose down
```

## CI/CD Pipeline

Three path-filtered GitHub Actions workflows build and publish images to GHCR, then deploy to Azure Container Apps on pushes to `main`. Pull requests run tests and builds but do not push or deploy.

| Workflow | Triggers | Test / build | Image and tagging | Deployment |
| --- | --- | --- | --- | --- |
| `api.yml` (`APITestAndPublish`) | Push to `main` or `v*.*.*` tags; PRs; paths `ClubCheckAPI/**`, `IntegrationTests/**`, workflow file | `ubuntu-latest`, .NET `10.0.401`, `dotnet test`; Buildx builds root context with `ClubCheckAPI/Dockerfile`; cosign signs the pushed digest | `ghcr.io/<repo>-API`; tags from `docker/metadata-action` defaults; push only outside PRs; cache via GitHub Actions | On `main` push only: Azure OIDC login, then `az containerapp update --name clubcheck-api --resource-group ClubCheck --image <digest>` |
| `scraper.yml` (`ScraperDockerPublisher`) | Push to `main`; PRs; paths `DataScraper/**`, workflow file | Self-hosted runner; `npm ci` and `npm test`; Buildx builds `DataScraper/Dockerfile` for `linux/amd64,linux/arm64` | `ghcr.io/<repo>-scraper`; tags from `docker/metadata-action` defaults; push only outside PRs; scoped GHA cache | On `main` push only: Azure OIDC login, then `az containerapp update --name clubcheck-scraper --resource-group ClubCheck --image <digest>` |
| `frontend.yml` (`FrontendTestBuildAndDeploy`) | Push to `main` or `v*.*.*` tags; PRs; `workflow_dispatch`; paths `Frontend/front/**`, workflow file | `ubuntu-latest`, Node 24, `npm ci`, `npm test`, `npm run lint`; Buildx builds `Frontend/front/Dockerfile` for `linux/amd64` with `NEXT_PUBLIC_SITE_URL` build arg | `ghcr.io/<repo>-frontend`; explicit tags: branch, PR, semver, `sha-*`, and `latest` on the default branch; push only outside PRs | On `main` push or `workflow_dispatch` on `main`: Azure OIDC login, then `az containerapp update --name clubcheck-frontend --resource-group ClubCheck --image <digest> --set-env-vars MAIN_API_BASE_URL=<url>` |

Deployment notes:

- GHCR authentication uses `GITHUB_TOKEN` with `packages: write`.
- Azure deployments use OIDC secrets `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID`.
- The build jobs export digest-pinned image references, and deploy jobs update Container Apps with those digests.
- Frontend repository variables: `NEXT_PUBLIC_SITE_URL`, optional `MAIN_API_BASE_URL` and `AZURE_CONTAINER_APP_NAME`. Defaults in the workflow point at the existing Container Apps URLs.
- The API and scraper workflows do not push images on pull requests and do not deploy from pull requests.
- As written, `api.yml` filters on `.github/workflows/docker-publish.yml` rather than `.github/workflows/api.yml`; the other two workflows filter on their own filenames.
