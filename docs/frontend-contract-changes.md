# Public Events API contract changes

Source of truth: `Frontend/front/contracts/main-api.openapi.json`.

The public Events endpoints remain unauthenticated. A server-side caller does **not** need to send an API key or `Authorization` header.

## Breaking changes

### `GET /Events/public` now returns a paged envelope

Old response:

```json
[
  { "slug": "event-slug", "name": "Event name" }
]
```

New response:

```json
{
  "items": [],
  "totalCount": 0,
  "page": 1,
  "pageSize": 10
}
```

- `totalCount` is the number of matches before `Skip`/`Take`.
- `page` is the effective page after clamping values below `1` to `1`.
- `pageSize` is the effective size after clamping to `1`-`100`.
- The default page size remains `10`.
- Ordering is deterministic: `startDate` ascending, then `id` ascending.

Any code that treats the old response as a raw array must read `response.items`.

### `startDate` / `endDate` are now an overlap range

Both bounds are optional, inclusive ISO-8601 instants with offset. An event matches when:

```text
event.start <= rangeEnd AND (event.end ?? event.start) >= rangeStart
```

This intentionally includes events that straddle either edge of the range. Events without an end date are treated as ending at their start only for this comparison.

### Price currency is now a string in public responses

`PublicEventDto.price.currency` is now `"EUR" | "RON" | "USD" | "HUF" | null`, not an integer. The private write endpoints still keep their existing integer currency contract.

## New fields on `PublicEventDto`

- `id`: stable integer event primary key.
- `city`: nullable venue city.

`slug` remains unique through the `IX_Events_Slug` unique index. The current update implementation does not exist (it throws `NotImplementedException`), and event creation assigns the slug once, so `slug` is currently stable after creation. Any future update path must preserve that guarantee.

## Query parameters for `GET /Events/public`

| Parameter | Type | Semantics |
| --- | --- | --- |
| `IsActive` | boolean, optional | Active-state filter. |
| `StartDate` | date-time with offset, optional | Inclusive range start. Matches when event end (or start when end is null) is on or after this instant. Omitted means open-ended. |
| `EndDate` | date-time with offset, optional | Inclusive range end. Matches when event start is on or before this instant. Omitted means open-ended. |
| `Name` | string, optional | Case-insensitive substring filter on event name. |
| `Organizer` | string, optional | Case-insensitive substring filter on organizer. |
| `City` | string, optional | Case-insensitive substring filter on venue city. |
| `VenueName` | string, optional | Case-insensitive substring filter on venue name. |
| `GenreNames` / `GenresNames` | string array, optional | Existing genre-name filter. Repeated query values are supported. |
| `Artist` | string, optional | Case-insensitive substring filter on any linked artist name. |
| `Price.Value` | number, optional | Maximum price value. |
| `Price.Currency` | enum/integer, optional | Currency used with `Price.Value`; unchanged private-compatible query type. |
| `Search` | string, optional | New case-insensitive OR search over event name, venue name, and artist names. Combined with all other filters using AND. |
| `Page` | integer, optional, default `1` | One-based page. Values below `1` are clamped to `1`. |
| `PageSize` | integer, optional, default `10` | Items per page. Values outside `1`-`100` are clamped. |

## New filter-options endpoint

`GET /Events/public/filters` returns active-event options for dropdowns:

```json
{
  "cities": [{ "name": "Cluj-Napoca", "count": 42 }],
  "venues": [{ "name": "Form", "city": "Cluj-Napoca", "count": 19 }],
  "genres": [{ "name": "Techno", "count": 35 }]
}
```

Lists are ordered by `count` descending, then `name`. Venues include `city` so duplicate venue names can be distinguished. Counts use active events, matching `/Events/public`.

## Example `GET /Events/public?Page=1&PageSize=10`

```json
{
  "items": [
    {
      "id": 123,
      "slug": "halloween-party",
      "name": "Halloween Party",
      "startDate": "2030-10-31T20:00:00Z",
      "description": "A Halloween event.",
      "organizer": "ClubCheck",
      "announcementUrl": "https://example.com/announcement",
      "ticketUrl": "https://example.com/tickets",
      "posterUrl": "https://example.com/poster.jpg",
      "price": {
        "value": 50,
        "currency": "RON"
      },
      "endDate": "2030-11-01T02:00:00Z",
      "city": "Cluj-Napoca",
      "venueName": "Form",
      "genresName": ["Techno", "House"],
      "artistsSummary": [
        { "name": "Artist Name", "slug": "artist-slug" }
      ]
    }
  ],
  "totalCount": 1,
  "page": 1,
  "pageSize": 10
}
```

## Deployment and consumer notes

- Local `dotnet run` development profile listens on `http://localhost:8080`.
- The Docker image exposes `8080`; `compose.yaml` maps host port `30021` to container port `8080`. The deployed Azure Container App uses its normal HTTPS ingress in front of the container's `8080`.
- Public endpoints require no API key. Private write endpoints still require the `X-API-Key` header.
- `posterUrl` hosts observed in current public event data: `imgcdn3.iabilet.ro`, `biletin.ro`, `etxorder.fra1.cdn.digitaloceanspaces.com`, `etxorder.fra1.digitaloceanspaces.com`. Images proxied through `imgcdn3.iabilet.ro` may contain encoded `static3.iabilet.ro` source URLs.
- Test/seed fixture poster hosts include `example.com`, `tickets.example`, `tickets.example.com`, and `source.example`.
- Other current consumers found: the Node.js scraper only uses private write endpoints and still expects integer currency request values; `DataScraper/docs.md` is a stale generated API document and is not used by runtime code.
