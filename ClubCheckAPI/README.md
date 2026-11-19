# ClubCheck API

Backend service for the ClubCheck event-discovery platform. It exposes a public, read-only API for browsing events, venues, artists and genres, plus a private API-key-protected write API used by the ingestion/scraper pipeline.

## 1. Service Overview & Responsibilities

The API is the central persistence and query service for ClubCheck's event catalogue:

- Stores and serves **events**, **venues**, **artists** and **genres**.
- Provides **public read endpoints** consumed by the frontend.
- Provides **private write endpoints** for the data scraper/ingestion service. These require a static API key sent in the `X-API-Key` header.
- Maintains relationships between events, venues, artists and genres in PostgreSQL.
- Exposes basic liveness and database-connectivity health endpoints.
- Uses Serilog for structured request/application logging and ASP.NET Core ProblemDetails for consistent error responses.

Current scope notes:

- The active model has **no user accounts, reviews or preferences**. `User`, `Review` and `Preferences` model files are commented out and excluded from compilation; the `NoUsersDb` migration removed their tables.
- Authentication is a single shared API key. There is no JWT/user login, role model or per-client identity.
- Event and venue update/delete routes exist, but their service methods currently throw `NotImplementedException` (HTTP 501).
- Migrations are **not applied automatically** by `Program.cs` or the Docker image. Apply them explicitly or use the integration-test factory (which calls `Database.MigrateAsync()`).

Platform context from `compose.yaml`:

- The frontend points at this API through `MAIN_API_BASE_URL`.
- The Node data scraper posts to this API through `NODE_CLUBCHECK_API_URL` / `NODE_CLUBCHECK_API_KEY`.
- PostgreSQL is the backing database.

## 2. Tech Stack & Project Structure

| Area | Technology / version |
| --- | --- |
| Runtime | .NET 10 / `net10.0` |
| Web framework | ASP.NET Core controllers |
| ORM | EF Core 10.0.0 with `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.0 |
| Database | PostgreSQL |
| Logging | Serilog.AspNetCore 10.0.0 + console/enrichers |
| API metadata | `Microsoft.AspNetCore.OpenApi` 10.0.12, Scalar.AspNetCore 2.17.14 |
| API auth | Custom static API-key authentication handler |
| Tests | xUnit 2.9.3, `Microsoft.AspNetCore.Mvc.Testing` 10.0.0, Testcontainers.PostgreSql 4.16.0 |
| Container | Multi-stage `mcr.microsoft.com/dotnet/sdk:10.0` → `mcr.microsoft.com/dotnet/aspnet:10.0` |

Repository layout (source and test projects):

```text
.
├── ClubCheckAPI.sln
├── compose.yaml
├── .env                         # gitignored; local compose values
├── ClubCheckAPI/                # this service
│   ├── Program.cs
│   ├── ClubCheckAPI.csproj
│   ├── appsettings.json
│   ├── appsettings.Development.json
│   ├── Dockerfile
│   ├── ClubCheckAPI.http
│   ├── ApiAuth/
│   │   ├── ApiAuthHandler.cs
│   │   └── ApiAuthKeyOptions.cs
│   ├── Controllers/
│   │   ├── ArtistsController.cs
│   │   ├── EventsController.cs
│   │   ├── GenresController.cs
│   │   ├── HealthController.cs
│   │   └── VenuesController.cs
│   ├── DomainClasses/
│   │   ├── Address.cs
│   │   ├── Currency.cs
│   │   └── Price.cs
│   ├── DTO/
│   │   ├── PagedResult.cs
│   │   ├── Artist/
│   │   ├── Event/
│   │   ├── Genre/
│   │   └── Venue/
│   ├── Exceptions/
│   ├── Helpers/
│   │   ├── SlugHelper.cs
│   │   └── UtcDateTime.cs
│   ├── IServices/
│   ├── Migrations/
│   ├── Models/
│   │   ├── Artist.cs
│   │   ├── ClubCheckAPIContext.cs
│   │   ├── Event.cs
│   │   ├── Genre.cs
│   │   ├── Preferences.cs       # commented out; excluded in .csproj
│   │   ├── Review.cs            # commented out; excluded in .csproj
│   │   ├── User.cs              # commented out; excluded in .csproj
│   │   └── Venue.cs
│   ├── Properties/
│   │   └── launchSettings.json
│   └── Services/
│       ├── ArtistService.cs
│       ├── EventService.cs
│       ├── GenreService.cs
│       └── VenueService.cs
└── IntegrationTests/
    ├── IntegrationTests.csproj
    ├── IntegrationTestsWebFactory.cs
    ├── ArtistCreationTests.cs
    ├── ArtistSlugRegressionTests.cs
    ├── EventCreationTests.cs
    ├── EventQueryingTests.cs
    ├── MostActiveEndpointTests.cs
    ├── PublicEventsContractTests.cs
    └── VenueCreationTests.cs
```

Request flow is controller → service interface → EF Core `ClubCheckAPIContext` → PostgreSQL. Services are registered as scoped dependencies in `Program.cs`.

## 3. Core Domain Entities & Database Schema

### Relationship summary

```text
Venue 1 ───── * Event
Event * ───── * Artist   via ArtistEvent
Event * ───── * Genre    via EventGenre
Artist * ──── * Genre    via ArtistGenre
```

- An event belongs to exactly one venue.
- Deleting a venue cascades to its events.
- Join-table rows cascade when either side is deleted.
- There are no active `User`, `Review` or `Preferences` entities/tables.

### Tables

#### `Artists`

| Column | Type / constraint |
| --- | --- |
| `Id` | `integer`, PK, identity |
| `Name` | `varchar(150)`, required |
| `Slug` | `varchar(150)`, required, **unique** (`IX_Artists_Slug`) |
| `SpotifyProfileUrl` | `text`, nullable |
| `SpotifyImageUrl` | `text`, nullable |
| `SoundcloudProfileUrl` | `text`, nullable |
| `InstagramProfileUrl` | `text`, nullable |

#### `Venues`

| Column | Type / constraint |
| --- | --- |
| `Id` | `integer`, PK, identity |
| `Name` | `varchar(100)`, required, **unique** (`IX_Venues_Name`) |
| `Address_ZipCode` | `varchar(12)`, nullable |
| `Address_Number` | `varchar(5)`, nullable |
| `Address_Street` | `varchar(100)`, nullable |
| `Address_City` | `varchar(100)`, required in the complex type |
| `Address_County` | `varchar(100)`, nullable |
| `Address_Country` | `varchar(100)`, nullable |
| `Address_GoogleMapsUrl` | `text`, nullable |

`Address` is mapped as an EF Core complex type, not a separate table.

#### `Genre`

The table is intentionally singular because the `DbSet` property is named `Genre`.

| Column | Type / constraint |
| --- | --- |
| `Id` | `integer`, PK, identity |
| `Name` | `varchar(50)`, required, **unique** (`IX_Genre_Name`) |

#### `Events`

| Column | Type / constraint |
| --- | --- |
| `Id` | `integer`, PK, identity |
| `Name` | `varchar(100)`, required |
| `Slug` | `varchar(150)`, required, **unique** (`IX_Events_Slug`) |
| `StartDate` | `timestamp with time zone`, required |
| `IsActive` | `boolean`, required |
| `EndDate` | `timestamp with time zone`, nullable |
| `Description` | `varchar(800)`, nullable |
| `Organizer` | `varchar(400)`, nullable |
| `PosterUrl` | `text`, nullable |
| `TicketUrl` | `text`, nullable |
| `AnnouncementUrl` | `text`, nullable |
| `VenueId` | `integer`, required FK → `Venues.Id`, cascade delete |
| `Price_Value` | `numeric(8,2)`, part of optional `Price` complex type |
| `Price_Currency` | `integer`, nullable, part of optional `Price` complex type |

`Price` is mapped as an EF Core complex type. `Currency` is stored as the integer value of the `Currency` enum (`EUR`, `RON`, `USD`, `HUF`). Public event responses expose currency as a string.

#### Join tables

| Table | Columns / key | Foreign keys |
| --- | --- | --- |
| `ArtistEvent` | `(ArtistsId, EventsId)` composite PK | both sides cascade |
| `ArtistGenre` | `(ArtistsId, GenresId)` composite PK | both sides cascade |
| `EventGenre` | `(EventsId, GenresId)` composite PK | both sides cascade |

### EF Core conventions and notes

- All `DateTime`/`DateTime?` values use the `UtcConverter`/`NullableUtcConverter`; unspecified kinds are treated as UTC.
- `Uri` properties are stored as PostgreSQL `text`.
- The current model snapshot is `Migrations/ClubCheckAPIContextModelSnapshot.cs`.
- Migration history in the repository:
  - `Initial` — created the original schema, including user/review tables.
  - `NoUsersDb` — removed users, reviews, preferences and related joins.
  - `V3` — added unique indexes and renamed/normalised the genre table.
  - `V4` — added unique slugs for artists/events and removed name uniqueness.
  - `AddEventOrganizer` — added `Events.Organizer` and `Events.PosterUrl`.
- Npgsql is configured with `EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: 2s)` and `SplitQuery`.

## 4. API Endpoints Overview

### Authentication

- Public endpoints have no `[Authorize]` attribute.
- Private endpoints use the custom `ApiKey` authentication scheme.
- Send the shared key from configuration key `ApiKey:Value` in the request header:

```http
X-API-Key: <your-api-key>
```

- Missing/invalid keys return `401 Unauthorized` as `application/problem+json`.
- There are no scopes, roles or user claims beyond a static `static-client` identity.

Route prefixes come from `[Route("[controller]")]`, so controller names are case-insensitive and conventionally rendered as `/Artists`, `/Events`, `/Genres`, `/Venues`. The health routes are absolute and mapped without a controller prefix.

### Health

| Method | Route | Auth | Purpose | Success |
| --- | --- | --- | --- | --- |
| `GET` | `/health` | Public | Liveness probe; returns `working...` | `200` |
| `GET` | `/health-db` | Public | Checks `Database.CanConnect()`; throws `DbNotConnectedException` when offline | `200` / `503` |

### Artists

| Method | Route | Auth | Purpose | Success |
| --- | --- | --- | --- | --- |
| `GET` | `/Artists/public/{slug}` | Public | Get artist details by slug, including events and genres | `200` / `404` |
| `POST` | `/Artists/private` | `X-API-Key` | Create or resolve an artist; idempotent for the same logical artist | `201` |

### Genres

| Method | Route | Auth | Purpose | Success |
| --- | --- | --- | --- | --- |
| `GET` | `/Genres/public/{name}` | Public | Get a genre by exact name | `200` / `404` |
| `POST` | `/Genres/private` | `X-API-Key` | Create a genre; returns the existing genre when the name already exists | `201` |

> The XML comment on the genre GET route says “Private”, but the controller has no `[Authorize]` attribute; the route is public in the actual code.

### Venues

| Method | Route | Auth | Purpose | Success |
| --- | --- | --- | --- | --- |
| `GET` | `/Venues/public/{name}` | Public | Get venue details by exact name, including its events | `200` / `404` |
| `POST` | `/Venues/private` | `X-API-Key` | Create or resolve a venue from name/address | `201` |
| `PUT` | `/Venues/private/{id}` | `X-API-Key` | Update venue; currently not implemented | `501` |
| `DELETE` | `/Venues/private/{id}` | `X-API-Key` | Delete venue; currently not implemented | `501` |

### Events

| Method | Route | Auth | Purpose | Success |
| --- | --- | --- | --- | --- |
| `GET` | `/Events/public` | Public | Paged/filterable public event list | `200` |
| `GET` | `/Events/public/most-active` | Public | Rank cities, genres, artists and venues by event count | `200` / `400` |
| `GET` | `/Events/public/filters` | Public | Distinct active-event options for cities, venues and genres | `200` |
| `GET` | `/Events/public/{slug}` | Public | Get one public event by slug | `200` / `404` |
| `POST` | `/Events/private` | `X-API-Key` | Create an event; duplicate venue/date/time returns the existing event | `201` |
| `PUT` | `/Events/private/{id}` | `X-API-Key` | Update event; currently not implemented | `501` |
| `DELETE` | `/Events/private` | `X-API-Key` | Delete events by query body; currently not implemented | `501` |

### Public event query parameters (`GET /Events/public`)

| Parameter | Type | Semantics |
| --- | --- | --- |
| `IsActive` | boolean, optional | Present in the DTO, but the current service always filters to active events (`e.IsActive`) and does not apply this parameter separately. |
| `StartDate` | `DateTimeOffset`, optional | Inclusive range start. Matches when `EndDate ?? StartDate >= StartDate`. |
| `EndDate` | `DateTimeOffset`, optional | Inclusive range end. Matches when `StartDate <= EndDate`. |
| `Name` | string, optional | Case-insensitive substring match on event name. |
| `Organizer` | string, optional | Case-insensitive substring match on organizer. |
| `City` | string, optional | Case-insensitive substring match on venue city. |
| `VenueName` | string, optional | Case-insensitive substring match on venue name. |
| `Price.Value` | decimal, optional | Maximum price; requires the event currency to match. |
| `Price.Currency` | enum/integer, optional | Currency used with `Price.Value`. |
| `GenresNames` | string array, optional | Restricts to events linked to at least one supplied genre name; repeat the query key for multiple values. |
| `Artist` | string, optional | Case-insensitive substring match on any linked artist name. |
| `Search` | string, optional | Case-insensitive OR search across event name, venue name and artist names; ANDed with other filters. |
| `Page` | integer, default `1` | One-based page; values below `1` are clamped to `1`. |
| `PageSize` | integer, default `10` | Clamped to `1`–`100`. |

The response is a `PagedResult<PublicEventDto>`:

```json
{
  "items": [],
  "totalCount": 0,
  "page": 1,
  "pageSize": 10
}
```

Ordering is deterministic: `startDate` ascending, then `id` ascending.

### Most-active query parameters (`GET /Events/public/most-active`)

| Parameter | Type | Default / constraint |
| --- | --- | --- |
| `topGenresLimit` | integer | `10`; range `0..int.MaxValue` |
| `topVenuesLimit` | integer | `10`; range `0..int.MaxValue` |
| `topArtistsLimit` | integer | `10`; range `0..int.MaxValue` |
| `topCitiesLimit` | integer, optional | No limit when omitted; range `0..int.MaxValue` |
| `page` | integer | `1`; minimum `1` |
| `pageSize` | integer | `20`; minimum `1` |

Pagination applies to the ranked city list. Invalid values return `400 Bad Request`.

### Write-route behaviour

- `POST /Events/private` validates:
  - start date is not in the past;
  - end date, when supplied, is after the start date and at least 30 minutes later;
  - venue, artist IDs and genre IDs exist;
  - duplicate events are matched by venue, calendar date and start hour/minute, and the existing event is returned.
- `POST /Artists/private` uses PostgreSQL advisory locks and unique-slug retry logic to make repeated/concurrent creation idempotent.
- `POST /Venues/private` and `POST /Genres/private` return the existing record for matching identities instead of creating duplicates.
- `PUT /Events/private/{id}`, `DELETE /Events/private`, `PUT /Venues/private/{id}` and `DELETE /Venues/private/{id}` currently reach `NotImplementedException` and are translated to `501 Not Implemented` by the global exception handler.

## 5. Configuration & Environment Variables

ASP.NET Core configuration precedence applies: `appsettings.json` → `appsettings.{ASPNETCORE_ENVIRONMENT}.json` → user secrets → environment variables.

`appsettings.json` contains Serilog and `AllowedHosts` only. It does **not** contain a database connection string or API key. `appsettings.Development.json` contains a development `ApiKey:Value`; use your own value for shared environments.

### Application keys

| Key | Environment override | Required | Purpose | Safe example |
| --- | --- | --- | --- | --- |
| `ConnectionStrings:DefaultConnection` | `ConnectionStrings__DefaultConnection` | **Yes** | Npgsql connection string used by `Program.cs` | `Host=localhost;Port=5432;Database=clubcheck;Username=clubcheck;Password=change-me` |
| `ApiKey:Value` | `ApiKey__Value` | **Yes for private endpoints** | Static key expected in `X-API-Key`; if empty, authentication fails | `replace-with-long-random-key` |
| `ASPNETCORE_ENVIRONMENT` | `ASPNETCORE_ENVIRONMENT` | Recommended | `Development` enables OpenAPI/Scalar and full exception details | `Development` |
| `AllowedHosts` | `AllowedHosts` | No | ASP.NET Core host filtering; repository default is `*` | `*` |
| `Serilog:MinimumLevel:Default` | `Serilog__MinimumLevel__Default` | No | Default log level | `Information` |
| `Serilog:MinimumLevel:Override:Microsoft` | `Serilog__MinimumLevel__Override__Microsoft` | No | Microsoft framework log level | `Warning` |
| `Serilog:MinimumLevel:Override:Microsoft.AspNetCore.Hosting.Diagnostics` | `Serilog__MinimumLevel__Override__Microsoft.AspNetCore.Hosting.Diagnostics` | No | Hosting diagnostics level | `Error` |
| `Serilog:MinimumLevel:Override:Microsoft.Hosting.Lifetime` | `Serilog__MinimumLevel__Override__Microsoft.Hosting.Lifetime` | No | Lifetime log level | `Information` |
| `Serilog:MinimumLevel:Override:Microsoft.EntityFrameworkCore.Database.Command` | `Serilog__MinimumLevel__Override__Microsoft.EntityFrameworkCore.Database.Command` | No | EF SQL command logging level | `Warning` |
| `Serilog:WriteTo` | `Serilog__WriteTo__0__Name` etc. | No | Log sinks; repository config uses Console | `Console` |
| `Serilog:Enrich` | `Serilog__Enrich__0` etc. | No | Enrichers: log context, machine name, process ID, thread ID | `FromLogContext` |

The logging section is already supplied in `appsettings.json`. You normally only need to override `ConnectionStrings__DefaultConnection` and `ApiKey__Value`.

### Docker Compose / `.env` variables relevant to this service

`compose.yaml` reads `.env` from the repository root and maps values into the API container:

| `.env` key | Consumed by | Maps to / purpose | Safe example |
| --- | --- | --- | --- |
| `API_KEY` | `clubcheckapi` | `ApiKey__Value` | `replace-with-long-random-key` |
| `DB_CONN_STRING_CONTAINER` | `clubcheckapi` | `ConnectionStrings__DefaultConnection` (must use host `db` inside compose) | `Host=db;Port=5432;Database=clubcheck;Username=clubcheck;Password=change-me` |
| `ASPNETCORE_ENVIRONMENT` | `clubcheckapi` | Runtime environment | `Development` |
| `DB_USER` | `db` service | PostgreSQL user | `clubcheck` |
| `DB_PASSWD` | `db` service | PostgreSQL password | `change-me` |
| `DB_NAME` | `db` service | PostgreSQL database name | `clubcheck` |
| `DB_PORT` | local reference | PostgreSQL host port | `5432` |
| `DB_CONN_STRING` | optional/local reference | Commented-out local host connection string in `.env` | `Host=localhost;Port=5432;Database=clubcheck;Username=clubcheck;Password=change-me` |

`.env` is gitignored. Keep real credentials and API keys out of source control.

### User secrets

The project has a `UserSecretsId`. For local development:

```bash
cd ClubCheckAPI
dotnet user-secrets set "ConnectionStrings:DefaultConnection" \
  "Host=localhost;Port=5432;Database=clubcheck;Username=clubcheck;Password=change-me"
dotnet user-secrets set "ApiKey:Value" "replace-with-long-random-key"
cd ..
```

## 6. Local Development, EF Core Migrations & Tests

Unless stated otherwise, run commands from the repository root (the directory containing `ClubCheckAPI.sln`).

### Prerequisites

- .NET SDK 10 (CI uses `10.0.401`).
- Docker, for integration tests and optionally PostgreSQL.
- A PostgreSQL instance if you are not using the compose database.

### 1. Start PostgreSQL

Using Docker directly:

```bash
docker run --name clubcheck-postgres \
  -e POSTGRES_USER=clubcheck \
  -e POSTGRES_PASSWORD=change-me \
  -e POSTGRES_DB=clubcheck \
  -p 5432:5432 \
  -d postgres
```

Or use the compose database service:

```bash
docker compose up -d db
```

For compose, create a root `.env` first. A minimal backend/database example:

```dotenv
ASPNETCORE_ENVIRONMENT=Development
DB_USER=clubcheck
DB_PASSWD=change-me
DB_NAME=clubcheck
DB_PORT=5432
API_KEY=replace-with-long-random-key
DB_CONN_STRING_CONTAINER="Host=db;Port=5432;Database=clubcheck;Username=clubcheck;Password=change-me"
```

### 2. Restore dependencies and configure secrets

```bash
dotnet restore ClubCheckAPI.sln
dotnet build ClubCheckAPI.sln
```

Set the connection string and API key as shown in the user-secrets section above.

### 3. Restore/update the EF Core tool and apply migrations

The checked-in `dotnet-tools.json` pins `dotnet-ef` 8.0.0, while the project targets `net10.0` with EF Core 10. Update the local tool to 10.0.0 before running migrations:

```bash
dotnet tool restore
dotnet tool update dotnet-ef --version 10.0.0
```

Apply all migrations:

```bash
dotnet ef database update \
  --project ClubCheckAPI/ClubCheckAPI.csproj \
  --startup-project ClubCheckAPI/ClubCheckAPI.csproj
```

Other useful EF Core commands:

```bash
# List migrations and their state
dotnet ef migrations list \
  --project ClubCheckAPI/ClubCheckAPI.csproj \
  --startup-project ClubCheckAPI/ClubCheckAPI.csproj

# Add a new migration after changing the model
dotnet ef migrations add <MigrationName> \
  --project ClubCheckAPI/ClubCheckAPI.csproj \
  --startup-project ClubCheckAPI/ClubCheckAPI.csproj

# Apply/roll back to a specific migration
dotnet ef database update <MigrationName> \
  --project ClubCheckAPI/ClubCheckAPI.csproj \
  --startup-project ClubCheckAPI/ClubCheckAPI.csproj

# Remove the latest unapplied migration
dotnet ef migrations remove \
  --project ClubCheckAPI/ClubCheckAPI.csproj \
  --startup-project ClubCheckAPI/ClubCheckAPI.csproj
```

### 4. Run the API locally

The `Dev_http` launch profile sets `ASPNETCORE_ENVIRONMENT=Development` and listens on `http://localhost:8080`:

```bash
dotnet run --project ClubCheckAPI/ClubCheckAPI.csproj --launch-profile Dev_http
```

Other launch profiles:

| Profile | URLs |
| --- | --- |
| `Dev_http` | `http://localhost:8080` |
| `Dev_https` | `https://localhost:7282` and `http://localhost:8080` |
| `Prod_http` | `http://localhost:8080` with `ASPNETCORE_ENVIRONMENT=Production` |

Smoke test:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/health-db
curl "http://localhost:8080/Events/public?Page=1&PageSize=10"
```

Authenticated write example:

```bash
curl -X POST http://localhost:8080/Genres/private \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"name":"Techno"}'
```

In Development, OpenAPI and the Scalar API reference are mapped by `Program.cs`.

### 5. Run the integration tests

The test project uses `WebApplicationFactory<Program>` plus a Testcontainers PostgreSQL container. The factory:

- starts a PostgreSQL container;
- replaces the application `DbContext` registration with the container connection string;
- calls `Database.MigrateAsync()` before tests run;
- creates authenticated clients using `ApiKey:Value` from the application configuration.

Run all tests:

```bash
dotnet test ClubCheckAPI.sln
```

Run only the integration project:

```bash
dotnet test IntegrationTests/IntegrationTests.csproj
```

Run a focused subset:

```bash
dotnet test IntegrationTests/IntegrationTests.csproj \
  --filter "FullyQualifiedName~EventCreationTests"
```

Docker must be running and able to pull/run the default PostgreSQL image. No externally managed database is required for the tests.

### 6. Docker build and compose run

The Dockerfile expects the repository root as build context because it copies `ClubCheckAPI/ClubCheckAPI.csproj` first:

```bash
docker build -f ClubCheckAPI/Dockerfile -t backend:latest .
```

Run the API and database through compose:

```bash
docker compose up --build -d db clubcheckapi
curl http://localhost:30021/health
```

Compose maps host port `30021` to container port `8080`. The container itself listens on `8080` (`EXPOSE 8080` in the Dockerfile). The compose PostgreSQL service maps host port `5432`.

### Port summary

| Service | Local / host URL or port | Container port |
| --- | --- | --- |
| API (`Dev_http`) | `http://localhost:8080` | — |
| API (`Dev_https`) | `https://localhost:7282`, `http://localhost:8080` | — |
| API via compose | `http://localhost:30021` | `8080` |
| PostgreSQL via compose | `localhost:5432` | `5432` |
| Integration-test PostgreSQL | random Testcontainers-assigned port | — |

### Common failure modes

| Symptom | Likely cause |
| --- | --- |
| `401 Unauthorized` on `/Artists/private`, `/Events/private`, `/Venues/private`, `/Genres/private` | Missing or incorrect `X-API-Key`; `ApiKey:Value` is not configured. |
| Startup fails while resolving `ClubCheckAPIContext` | `ConnectionStrings:DefaultConnection` is missing or PostgreSQL is unreachable. |
| `/health-db` returns `503` | The API cannot connect to PostgreSQL. |
| `501 Not Implemented` on event/venue update or delete | The route exists, but the corresponding service method still throws `NotImplementedException`. |
| EF tool version warning/error | Update the local `dotnet-ef` tool to 10.0.0 as shown above. |
