# ClubCheck Frontend

A Next.js App Router web application for discovering concerts, festivals, and shows. The public experience is a Romanian-language event listing with server-side filtering, pagination, event detail pages, SEO metadata, and related events at the same venue.

The frontend reads public event data from the ClubCheck main API. Authentication and favorites are currently UI placeholders, not API-backed features.

## Overview & Key User Flows

### Event browsing

- `/` is the main event listing. It fetches active events from the public API and displays a responsive poster grid.
- Results show the event name, date, city/venue, performers, and starting price when available.
- Pagination uses 24 events per page and preserves the active filters. Out-of-range pages show an empty state with a link to the last page.
- A retry action refreshes the server-rendered results when the API request fails.

### Search and filtering

Filters are stored in the URL query string, making filtered views shareable and back/forward navigation work naturally:

| Query parameter | Meaning |
| --- | --- |
| `q` | Free-text search. Exact genre matches are converted into genre filters; other text is sent as API search. |
| `city` | City name from the API filter options. |
| `venue` | Venue name from the API filter options. |
| `genres` | One or more repeatable genre values. |
| `from` | Start date in `YYYY-MM-DD` format. |
| `to` | End date in `YYYY-MM-DD` format. |
| `page` | Page number, omitted for page 1. |

Filter UI includes:

- Debounced header search (300 ms).
- City and venue comboboxes populated from `/Events/public/filters`.
- Multi-select genre pills, sorted by event count and showing up to eight visible genres.
- Date range picker with “today” and “this weekend” presets.
- Removable filter chips and a “clear all” action.
- Changing a filter resets pagination to page 1.

If the filter-options request fails, the filter bar degrades to empty options while the event listing remains usable.

### Event detail

- `/events/[slug]` loads a single event and renders its poster, name, date range, venue, city, artists, price, ticket link, description, and organizer.
- Genres link back to filtered listing results.
- Venue and city link back to the listing with the corresponding filter applied.
- Artist names link to `/?q=<artist name>`; there is no separate artist page.
- Venue/artist navigation therefore uses listing filters rather than dedicated `/venues` or `/artists` routes.
- Upcoming events expose ticket links. Ended events are labeled and hide the ticket purchase action.
- Related events show other upcoming events at the same venue.
- Detail pages include canonical, Open Graph, Twitter metadata, and schema.org `Event` JSON-LD.

### Favorites and authentication placeholders

- Favorite buttons appear on event cards and detail pages.
- Favorites use an in-memory client-side stub. They are not persisted to the API and reset on reload.
- The stub provider always reports `isAuthenticated: false`, so clicking a favorite redirects to `/login`.
- `/login` and `/signup` render form layouts but have no submit handler or API integration.
- The header authentication link points to `/login`.

### Dashboard demo

- `/dashboard` is a static shadcn dashboard demo using local sample data from `app/dashboard/data.json`.
- It is not linked from the public event experience and does not call the ClubCheck API.

## Tech Stack & Project Structure

### Stack

- **Framework:** Next.js `16.4.6` with the App Router, React Server Components, and Turbopack.
- **UI runtime:** React `19.3.0`.
- **Language:** TypeScript 5 with strict mode.
- **Styling:** Tailwind CSS `4.3.3` using the CSS-first configuration in `app/globals.css`; there is no `tailwind.config.*` file. The Tailwind Turbopack loader is configured in `next.config.ts`.
- **Component system:** shadcn (`base-vega` style), Base UI (`@base-ui/react`), and Radix-style primitives in `components/ui`.
- **Icons:** `lucide-react`.
- **Data/UI libraries:** TanStack React Table 9, dnd-kit, Recharts, Zod, Sonner, next-themes.
- **API contract:** OpenAPI definitions in `contracts/main-api.openapi.json`, converted to TypeScript with `openapi-typescript`.
- **Testing:** Vitest.
- **Package manager:** npm, as indicated by `package-lock.json`.

### Project structure

```text
.
├── app/
│   ├── layout.tsx                 # Root layout, fonts, metadata base, providers
│   ├── page.tsx                   # Public event listing at /
│   ├── globals.css                # Tailwind v4 theme and CSS variables
│   ├── dashboard/
│   │   ├── page.tsx               # Static dashboard demo
│   │   └── data.json              # Sample dashboard table data
│   ├── events/[slug]/
│   │   ├── layout.tsx             # Detail-page shell and header
│   │   ├── page.tsx               # Event detail data loading + metadata
│   │   ├── loading.tsx            # Detail skeleton
│   │   ├── error.tsx              # Detail error boundary
│   │   └── not-found.tsx          # Unknown event page
│   ├── login/page.tsx             # Login form placeholder
│   └── signup/page.tsx            # Signup form placeholder
├── components/
│   ├── auth/                      # Header authentication slot
│   ├── events/                    # Event listing, cards, detail, related, pager, states
│   ├── filters/                   # Search, city/venue comboboxes, date filter, genre pills
│   ├── shadcn-studio/             # Additional shadcn-studio examples
│   ├── ui/                        # shadcn/Base UI component primitives
│   ├── providers.tsx              # Tooltip and favorites providers
│   └── ...                        # Header, sidebar, dashboard demo components
├── lib/
│   ├── api/main/
│   │   ├── client.ts              # API fetch wrapper, timeout, error mapping
│   │   ├── events.ts              # Event list/detail fetches and caching
│   │   ├── facets.ts              # Filter-options fetch and caching
│   │   ├── normalize.ts           # Number/string normalization helpers
│   │   ├── query.ts               # UI filters -> API query parameters
│   │   ├── result.ts              # ApiResult discriminated union
│   │   └── types.ts               # Types derived from the OpenAPI schema
│   ├── events/
│   │   ├── dates.ts               # Bucharest date handling and formatting
│   │   ├── filters.ts             # URL filter parsing/serialization and chips
│   │   ├── format.ts              # Price, location, URL, and text formatting
│   │   ├── genres.ts              # Diacritic/case-insensitive genre matching
│   │   ├── jsonld.ts              # schema.org Event JSON-LD
│   │   └── metadata.ts            # Event page metadata
│   ├── favorites/                 # Client favorites context and stub provider
│   ├── i18n/ro.ts                 # Romanian UI strings, locale, timezone
│   ├── site.ts                    # Site URL from NEXT_PUBLIC_SITE_URL
│   └── utils.ts                   # cn() helper
├── hooks/
│   └── use-mobile.ts
├── contracts/
│   └── main-api.openapi.json      # Backend OpenAPI contract
├── src/
│   ├── lib/api/main-api.d.ts      # Generated API types
│   └── components/shadcn-studio/  # Additional UI examples
├── public/                        # Static assets
├── next.config.ts                 # Standalone output, cache components, Turbopack CSS
├── Dockerfile                     # Multi-stage production image
├── .env.example
├── eslint.config.mjs
├── vitest.config.ts
├── package.json
└── tsconfig.json
```

Tests are colocated with the modules they cover, for example `lib/events/filters.test.ts`, `lib/events/dates.test.ts`, and `lib/api/main/query.test.ts`.

## Architecture & Data Fetching

### Server-first rendering

The public event experience is built with React Server Components:

- `app/page.tsx` renders the header and suspends the event listing.
- `EventListing` parses the URL filters, renders the filter bar, and streams event results in a keyed `Suspense` boundary.
- `EventResults`, `FilterBarSection`, `EventGrid`, `EventCard`, `EventDetail`, and `EventRelated` fetch or render data on the server.
- `app/events/[slug]/page.tsx` fetches the event once for `generateMetadata` and once for rendering. The underlying fetch is wrapped with React `cache()` for request-level deduplication.
- `app/layout.tsx` sets the metadata base from the configured site URL and provides the Romanian locale (`ro-RO`) and `Europe/Bucharest` time zone.

Client components are limited to interaction and browser state:

- Header search input.
- City/venue comboboxes, genre pills, and date filter.
- `useFilterNavigation`, which updates the URL with `router.push` / `router.replace` and tracks transitions.
- Favorite buttons, retry buttons, dashboard charts, and the demo table.

### API communication

All backend communication is performed server-side through `lib/api/main/client.ts`. The browser does not call the ClubCheck API directly.

`apiFetch<T>()`:

- Builds the URL from `MAIN_API_BASE_URL`.
- Uses a 10-second abort timeout by default.
- Returns a discriminated `ApiResult<T>`:
  - `{ status: "ok", data }`
  - `{ status: "empty" }`
  - `{ status: "error", message, statusCode? }`
- Reads Problem Details `detail` or `title` from non-OK responses.
- Can treat `404` as an empty result via `notFoundIsEmpty`.

### Endpoints consumed

| Method & path | Purpose |
| --- | --- |
| `GET /Events/public` | Paginated active-event listing with filters. |
| `GET /Events/public/filters` | Cities, venues, and genres for filter controls. |
| `GET /Events/public/{slug}` | Public event detail. |

The OpenAPI contract also describes artist, venue, genre, and private endpoints, but this frontend only consumes the public event endpoints above.

### Query construction

`lib/api/main/query.ts` converts UI filters into API parameters:

- Always sends `IsActive=true`.
- Sends `Page` and `PageSize` (24 for the listing).
- Sends `Search` when the query is not an exact genre match.
- Sends `City`, `VenueName`, `GenresNames`, `StartDate`, and `EndDate` when present.
- Combines selected genres with exact genre matches found in the search text.
- Converts date-only filters to Bucharest day boundaries as UTC instants, including DST-safe start/end handling.

`useFilterNavigation` writes filters into the URL and removes `page` whenever a non-pagination filter changes. Pagination is handled by URL links that preserve the current filters.

### Caching and revalidation

The app enables Next.js cache components and partial prefetching in `next.config.ts`.

- Event listings use the Next.js fetch cache with `revalidate: 60` and the `events` tag.
- Event detail and filter options use `"use cache"` with `cacheLife("minutes")` and tags:
  - `event` and `event:<slug>` for details.
  - `facets` for filter options.
- `fetchEvent` is additionally wrapped with React `cache()` for per-request deduplication.
- Facet fetching intentionally throws on failure so an error/empty value is not cached for the full lifetime; the caller catches it and renders empty options.
- Detail and related sections call `await connection()` so they render at request time.
- Filter changes navigate to a new URL, causing the server components to re-render with new query parameters.
- The codebase declares cache tags but does not include an explicit `revalidateTag` route or webhook.

### Error, empty, and loading behavior

- Suspense skeletons cover the filter bar, event grid, event detail, and related events.
- API failures show retryable error states.
- A missing event detail returns the route-level not-found page.
- Empty listing results show either “no events” or an out-of-range page state.
- Related-event failures are hidden rather than failing the detail page.

### SEO and structured data

- Root metadata is configured in `app/layout.tsx`.
- Event metadata includes title, description fallback, canonical URL, Open Graph, Twitter cards, and poster images when valid.
- Event detail pages emit schema.org `Event` JSON-LD with venue, performers, offers, and event status when applicable.
- JSON-LD serialization escapes `<` characters to avoid script injection.

## Environment Variables

Only the following environment variables are used in the codebase.

| Variable | Scope | Used by | Required | Default / notes |
| --- | --- | --- | --- | --- |
| `MAIN_API_BASE_URL` | Server-side runtime | `lib/api/main/client.ts` | No | Falls back to the hard-coded Azure Container Apps API URL if unset. Trailing slashes are stripped. In Docker, supply it at runtime. |
| `NEXT_PUBLIC_SITE_URL` | Public, inlined at build time | `lib/site.ts` for canonical metadata | No | Falls back to `http://localhost:3000` if unset or malformed. Must be provided as a Docker build argument because `NEXT_PUBLIC_*` values are embedded during `next build`. |

Example local `.env.local`:

```dotenv
MAIN_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> `.env.example` contains an active production `MAIN_API_BASE_URL` value. Adjust it when pointing local development at a different API instance.

## Local Development & Production Build

The project uses npm and commits `package-lock.json`.

### Requirements

- Node.js 24 is used by the Docker image.
- Access to a running ClubCheck API, or use the default API URL.

### Install

```bash
npm ci
```

Use `npm install` instead if you need to update dependencies.

### Configure

```bash
cp .env.example .env.local
```

Then set `MAIN_API_BASE_URL` and `NEXT_PUBLIC_SITE_URL` for your environment.

### Run the development server

```bash
npm run dev
```

Open http://localhost:3000.

### Lint

```bash
npm run lint
```

### Tests

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

### Regenerate API types

After changing `contracts/main-api.openapi.json`:

```bash
npm run api:types
```

This writes `src/lib/api/main-api.d.ts` using `openapi-typescript`.

### Production build

```bash
npm run build
npm start
```

`next.config.ts` sets `output: "standalone"`, so the build also produces a standalone server bundle used by the Docker image.

### Docker

Build:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SITE_URL=https://events.example.com \
  -t clubcheck-frontend .
```

Run:

```bash
docker run --rm -p 3000:3000 \
  -e MAIN_API_BASE_URL=https://clubcheck-api.example.com \
  clubcheck-frontend
```

The production container runs `node server.js` as a non-root user and listens on port `3000`.
