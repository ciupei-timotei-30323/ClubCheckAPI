# ClubCheckAPI | v1

- **OpenAPI Version:** `3.2.0`
- **API Version:** `1.0.0`

## Contents

**Operations**

- [GET /Artists/public/{slug}](#scalar-operation-get-artistspublicslug)
- [POST /Artists/private](#scalar-operation-post-artistsprivate)
- [GET /Events/public](#scalar-operation-get-eventspublic)
- [GET /Events/public/{slug}](#scalar-operation-get-eventspublicslug)
- [POST /Events/private](#scalar-operation-post-eventsprivate)
- [DELETE /Events/private](#scalar-operation-delete-eventsprivate)
- [PUT /Events/private/{id}](#scalar-operation-put-eventsprivateid)
- [GET /Genres/public/{name}](#scalar-operation-get-genrespublicname)
- [POST /Genres/private](#scalar-operation-post-genresprivate)
- [GET /Venues/public/{name}](#scalar-operation-get-venuespublicname)
- [POST /Venues/private](#scalar-operation-post-venuesprivate)
- [PUT /Venues/private/{id}](#scalar-operation-put-venuesprivateid)
- [DELETE /Venues/private/{id}](#scalar-operation-delete-venuesprivateid)

**Schemas**

- [Address](#scalar-schema-address)
- [ArtistSummaryDto](#scalar-schema-artistsummarydto)
- [CreateArtistDto](#scalar-schema-createartistdto)
- [CreateEventDto](#scalar-schema-createeventdto)
- [CreateGenreDto](#scalar-schema-creategenredto)
- [CreateVenueDto](#scalar-schema-createvenuedto)
- [Currency](#scalar-schema-currency)
- [DeleteEventsQuery](#scalar-schema-deleteeventsquery)
- [GenreSummaryDto](#scalar-schema-genresummarydto)
- [Price](#scalar-schema-price)
- [ProblemDetails](#scalar-schema-problemdetails)
- [PublicArtistDto](#scalar-schema-publicartistdto)
- [PublicEventDto](#scalar-schema-publiceventdto)
- [PublicVenueDto](#scalar-schema-publicvenuedto)
- [UpdateEventDto](#scalar-schema-updateeventdto)
- [UpdateVenueDto](#scalar-schema-updatevenuedto)

<a id="scalar-context-global-servers"></a>

## Servers

- **URL:** `http://localhost:30021/`

## Tags

### Artists

### Events

### Genres

### Venues

## Operations

<a id="scalar-operation-get-artistspublicslug"></a>

### GET /Artists/public/{slug}

- **Method:** `GET`
- **Path:** `/Artists/public/{slug}`
- **Tags:** Artists

**Servers:** [Inherited servers](#scalar-context-global-servers)

#### Path parameters

- **`slug` (required)**: `string`

#### Responses

##### 404 Not Found

**Content type:** `text/plain`

[ProblemDetails](#scalar-schema-problemdetails)

<a id="scalar-example-1"></a>

**Generated example:**

```json
{
  "type": null,
  "title": null,
  "status": null,
  "detail": null,
  "instance": null
}
```

**Content type:** `application/json`

[ProblemDetails](#scalar-schema-problemdetails)

<a id="scalar-example-2"></a>

**Generated example:**

```json
{
  "type": null,
  "title": null,
  "status": null,
  "detail": null,
  "instance": null
}
```

**Content type:** `text/json`

[ProblemDetails](#scalar-schema-problemdetails)

<a id="scalar-example-3"></a>

**Generated example:**

```json
{
  "type": null,
  "title": null,
  "status": null,
  "detail": null,
  "instance": null
}
```

<a id="scalar-operation-post-artistsprivate"></a>

### POST /Artists/private

- **Method:** `POST`
- **Path:** `/Artists/private`
- **Tags:** Artists

**Servers:** [Inherited servers](#scalar-context-global-servers)

#### Request body

**Required:** `true`

**Content type:** `application/json`

[CreateArtistDto](#scalar-schema-createartistdto)

<a id="scalar-example-4"></a>

**Generated example:**

```json
{
  "name": "",
  "slug": ""
}
```

**Content type:** `text/json`

[CreateArtistDto](#scalar-schema-createartistdto)

<a id="scalar-example-5"></a>

**Generated example:**

```json
{
  "name": "",
  "slug": ""
}
```

**Content type:** `application/*+json`

[CreateArtistDto](#scalar-schema-createartistdto)

<a id="scalar-example-6"></a>

**Generated example:**

```json
{
  "name": "",
  "slug": ""
}
```

#### Responses

##### 201 Created

**Content type:** `text/plain`

[ArtistSummaryDto](#scalar-schema-artistsummarydto)

<a id="scalar-example-7"></a>

**Generated example:**

```json
{
  "id": 1,
  "slug": "",
  "name": ""
}
```

**Content type:** `application/json`

[ArtistSummaryDto](#scalar-schema-artistsummarydto)

<a id="scalar-example-8"></a>

**Generated example:**

```json
{
  "id": 1,
  "slug": "",
  "name": ""
}
```

**Content type:** `text/json`

[ArtistSummaryDto](#scalar-schema-artistsummarydto)

<a id="scalar-example-9"></a>

**Generated example:**

```json
{
  "id": 1,
  "slug": "",
  "name": ""
}
```

<a id="scalar-operation-get-eventspublic"></a>

### GET /Events/public

- **Method:** `GET`
- **Path:** `/Events/public`
- **Tags:** Events

**Servers:** [Inherited servers](#scalar-context-global-servers)

#### Query parameters

- **`IsActive`**: `boolean`
- **`StartDate`**: `string`, format: `date-time`
- **`EndDate`**: `string`, format: `date-time`
- **`Name`**: `string`
- **`City`**: `string`
- **`Price.Value`**: `number | string`, format: `double`, pattern: `^-?(?:0|[1-9]\d*)(?:\.\d+)?$`
- **`Price.Currency`**: `integer`
- **`VenueName`**: `string`
- **`GenresNames`**: `array of string`
- **`Artist`**: `string`
- **`Page`**: `integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`
- **`PageSize`**: `integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`

#### Responses

##### 404 Not Found

**Content type:** `text/plain`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-1)

**Content type:** `application/json`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-2)

**Content type:** `text/json`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-3)

<a id="scalar-operation-get-eventspublicslug"></a>

### GET /Events/public/{slug}

- **Method:** `GET`
- **Path:** `/Events/public/{slug}`
- **Tags:** Events

**Servers:** [Inherited servers](#scalar-context-global-servers)

#### Path parameters

- **`slug` (required)**: `string`

#### Responses

##### 404 Not Found

**Content type:** `text/plain`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-1)

**Content type:** `application/json`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-2)

**Content type:** `text/json`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-3)

<a id="scalar-operation-post-eventsprivate"></a>

### POST /Events/private

- **Method:** `POST`
- **Path:** `/Events/private`
- **Tags:** Events

**Servers:** [Inherited servers](#scalar-context-global-servers)

#### Request body

**Required:** `true`

**Content type:** `application/json`

[CreateEventDto](#scalar-schema-createeventdto)

<a id="scalar-example-10"></a>

**Generated example:**

```json
{
  "name": "",
  "startDate": "",
  "isActive": true,
  "endDate": null,
  "description": null,
  "price": {
    "value": 1,
    "currency": 1
  },
  "ticketUrl": null,
  "announcementUrl": null,
  "venueId": 1,
  "genresId": [
    1
  ],
  "artistsId": [
    1
  ]
}
```

**Content type:** `text/json`

[CreateEventDto](#scalar-schema-createeventdto)

<a id="scalar-example-11"></a>

**Generated example:**

```json
{
  "name": "",
  "startDate": "",
  "isActive": true,
  "endDate": null,
  "description": null,
  "price": {
    "value": 1,
    "currency": 1
  },
  "ticketUrl": null,
  "announcementUrl": null,
  "venueId": 1,
  "genresId": [
    1
  ],
  "artistsId": [
    1
  ]
}
```

**Content type:** `application/*+json`

[CreateEventDto](#scalar-schema-createeventdto)

<a id="scalar-example-12"></a>

**Generated example:**

```json
{
  "name": "",
  "startDate": "",
  "isActive": true,
  "endDate": null,
  "description": null,
  "price": {
    "value": 1,
    "currency": 1
  },
  "ticketUrl": null,
  "announcementUrl": null,
  "venueId": 1,
  "genresId": [
    1
  ],
  "artistsId": [
    1
  ]
}
```

#### Responses

##### 201 Created

**Content type:** `text/plain`

[PublicEventDto](#scalar-schema-publiceventdto)

<a id="scalar-example-13"></a>

**Generated example:**

```json
{
  "slug": "",
  "name": "",
  "startDate": "",
  "description": null,
  "announcementUrl": null,
  "ticketUrl": null,
  "price": {
    "value": 1,
    "currency": 1
  },
  "endDate": null,
  "venueName": "",
  "genresName": [
    ""
  ],
  "artistsSummary": [
    {
      "name": "",
      "slug": ""
    }
  ]
}
```

**Content type:** `application/json`

[PublicEventDto](#scalar-schema-publiceventdto)

<a id="scalar-example-14"></a>

**Generated example:**

```json
{
  "slug": "",
  "name": "",
  "startDate": "",
  "description": null,
  "announcementUrl": null,
  "ticketUrl": null,
  "price": {
    "value": 1,
    "currency": 1
  },
  "endDate": null,
  "venueName": "",
  "genresName": [
    ""
  ],
  "artistsSummary": [
    {
      "name": "",
      "slug": ""
    }
  ]
}
```

**Content type:** `text/json`

[PublicEventDto](#scalar-schema-publiceventdto)

<a id="scalar-example-15"></a>

**Generated example:**

```json
{
  "slug": "",
  "name": "",
  "startDate": "",
  "description": null,
  "announcementUrl": null,
  "ticketUrl": null,
  "price": {
    "value": 1,
    "currency": 1
  },
  "endDate": null,
  "venueName": "",
  "genresName": [
    ""
  ],
  "artistsSummary": [
    {
      "name": "",
      "slug": ""
    }
  ]
}
```

<a id="scalar-operation-delete-eventsprivate"></a>

### DELETE /Events/private

- **Method:** `DELETE`
- **Path:** `/Events/private`
- **Tags:** Events

**Servers:** [Inherited servers](#scalar-context-global-servers)

#### Request body

**Required:** `true`

**Content type:** `application/json`

[DeleteEventsQuery](#scalar-schema-deleteeventsquery)

<a id="scalar-example-16"></a>

**Generated example:**

```json
{
  "from": null,
  "to": null,
  "isActive": null,
  "id": null,
  "venueId": null,
  "artistId": null
}
```

**Content type:** `text/json`

[DeleteEventsQuery](#scalar-schema-deleteeventsquery)

<a id="scalar-example-17"></a>

**Generated example:**

```json
{
  "from": null,
  "to": null,
  "isActive": null,
  "id": null,
  "venueId": null,
  "artistId": null
}
```

**Content type:** `application/*+json`

[DeleteEventsQuery](#scalar-schema-deleteeventsquery)

<a id="scalar-example-18"></a>

**Generated example:**

```json
{
  "from": null,
  "to": null,
  "isActive": null,
  "id": null,
  "venueId": null,
  "artistId": null
}
```

#### Responses

##### 204 No Content

##### 404 Not Found

**Content type:** `text/plain`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-1)

**Content type:** `application/json`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-2)

**Content type:** `text/json`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-3)

<a id="scalar-operation-put-eventsprivateid"></a>

### PUT /Events/private/{id}

- **Method:** `PUT`
- **Path:** `/Events/private/{id}`
- **Tags:** Events

**Servers:** [Inherited servers](#scalar-context-global-servers)

#### Path parameters

- **`id` (required)**: `integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`

#### Request body

**Required:** `true`

**Content type:** `application/json`

[UpdateEventDto](#scalar-schema-updateeventdto)

<a id="scalar-example-19"></a>

**Generated example:**

```json
{
  "startDate": null,
  "endDate": null,
  "isActive": null,
  "description": null,
  "price": {
    "value": 1,
    "currency": 1
  },
  "ticketUrl": null,
  "announcementUrl": null,
  "venueId": null,
  "genresId": [
    1
  ],
  "artistsId": [
    1
  ]
}
```

**Content type:** `text/json`

[UpdateEventDto](#scalar-schema-updateeventdto)

<a id="scalar-example-20"></a>

**Generated example:**

```json
{
  "startDate": null,
  "endDate": null,
  "isActive": null,
  "description": null,
  "price": {
    "value": 1,
    "currency": 1
  },
  "ticketUrl": null,
  "announcementUrl": null,
  "venueId": null,
  "genresId": [
    1
  ],
  "artistsId": [
    1
  ]
}
```

**Content type:** `application/*+json`

[UpdateEventDto](#scalar-schema-updateeventdto)

<a id="scalar-example-21"></a>

**Generated example:**

```json
{
  "startDate": null,
  "endDate": null,
  "isActive": null,
  "description": null,
  "price": {
    "value": 1,
    "currency": 1
  },
  "ticketUrl": null,
  "announcementUrl": null,
  "venueId": null,
  "genresId": [
    1
  ],
  "artistsId": [
    1
  ]
}
```

#### Responses

##### 404 Not Found

**Content type:** `text/plain`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-1)

**Content type:** `application/json`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-2)

**Content type:** `text/json`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-3)

<a id="scalar-operation-get-genrespublicname"></a>

### GET /Genres/public/{name}

- **Method:** `GET`
- **Path:** `/Genres/public/{name}`
- **Tags:** Genres

**Servers:** [Inherited servers](#scalar-context-global-servers)

#### Path parameters

- **`name` (required)**: `string`

#### Responses

##### 404 Not Found

**Content type:** `text/plain`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-1)

**Content type:** `application/json`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-2)

**Content type:** `text/json`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-3)

<a id="scalar-operation-post-genresprivate"></a>

### POST /Genres/private

- **Method:** `POST`
- **Path:** `/Genres/private`
- **Tags:** Genres

**Servers:** [Inherited servers](#scalar-context-global-servers)

#### Request body

**Required:** `true`

**Content type:** `application/json`

[CreateGenreDto](#scalar-schema-creategenredto)

<a id="scalar-example-22"></a>

**Generated example:**

```json
{
  "name": ""
}
```

**Content type:** `text/json`

[CreateGenreDto](#scalar-schema-creategenredto)

<a id="scalar-example-23"></a>

**Generated example:**

```json
{
  "name": ""
}
```

**Content type:** `application/*+json`

[CreateGenreDto](#scalar-schema-creategenredto)

<a id="scalar-example-24"></a>

**Generated example:**

```json
{
  "name": ""
}
```

#### Responses

##### 200 OK

**Content type:** `text/plain`

[GenreSummaryDto](#scalar-schema-genresummarydto)

<a id="scalar-example-25"></a>

**Generated example:**

```json
{
  "id": 1,
  "name": ""
}
```

**Content type:** `application/json`

[GenreSummaryDto](#scalar-schema-genresummarydto)

<a id="scalar-example-26"></a>

**Generated example:**

```json
{
  "id": 1,
  "name": ""
}
```

**Content type:** `text/json`

[GenreSummaryDto](#scalar-schema-genresummarydto)

<a id="scalar-example-27"></a>

**Generated example:**

```json
{
  "id": 1,
  "name": ""
}
```

<a id="scalar-operation-get-venuespublicname"></a>

### GET /Venues/public/{name}

- **Method:** `GET`
- **Path:** `/Venues/public/{name}`
- **Tags:** Venues

**Servers:** [Inherited servers](#scalar-context-global-servers)

#### Path parameters

- **`name` (required)**: `string`

#### Responses

##### 404 Not Found

**Content type:** `text/plain`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-1)

**Content type:** `application/json`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-2)

**Content type:** `text/json`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-3)

<a id="scalar-operation-post-venuesprivate"></a>

### POST /Venues/private

- **Method:** `POST`
- **Path:** `/Venues/private`
- **Tags:** Venues

**Servers:** [Inherited servers](#scalar-context-global-servers)

#### Request body

**Required:** `true`

**Content type:** `application/json`

[CreateVenueDto](#scalar-schema-createvenuedto)

<a id="scalar-example-28"></a>

**Generated example:**

```json
{
  "name": "",
  "address": {
    "zipCode": null,
    "number": null,
    "street": null,
    "city": "",
    "county": null,
    "country": null,
    "googleMapsUrl": null
  },
  "eventIds": [
    1
  ]
}
```

**Content type:** `text/json`

[CreateVenueDto](#scalar-schema-createvenuedto)

<a id="scalar-example-29"></a>

**Generated example:**

```json
{
  "name": "",
  "address": {
    "zipCode": null,
    "number": null,
    "street": null,
    "city": "",
    "county": null,
    "country": null,
    "googleMapsUrl": null
  },
  "eventIds": [
    1
  ]
}
```

**Content type:** `application/*+json`

[CreateVenueDto](#scalar-schema-createvenuedto)

<a id="scalar-example-30"></a>

**Generated example:**

```json
{
  "name": "",
  "address": {
    "zipCode": null,
    "number": null,
    "street": null,
    "city": "",
    "county": null,
    "country": null,
    "googleMapsUrl": null
  },
  "eventIds": [
    1
  ]
}
```

#### Responses

##### 200 OK

**Content type:** `text/plain`

[PublicVenueDto](#scalar-schema-publicvenuedto)

<a id="scalar-example-31"></a>

**Generated example:**

```json
{
  "id": 1,
  "name": "",
  "city": null,
  "eventIds": [
    1
  ]
}
```

**Content type:** `application/json`

[PublicVenueDto](#scalar-schema-publicvenuedto)

<a id="scalar-example-32"></a>

**Generated example:**

```json
{
  "id": 1,
  "name": "",
  "city": null,
  "eventIds": [
    1
  ]
}
```

**Content type:** `text/json`

[PublicVenueDto](#scalar-schema-publicvenuedto)

<a id="scalar-example-33"></a>

**Generated example:**

```json
{
  "id": 1,
  "name": "",
  "city": null,
  "eventIds": [
    1
  ]
}
```

<a id="scalar-operation-put-venuesprivateid"></a>

### PUT /Venues/private/{id}

- **Method:** `PUT`
- **Path:** `/Venues/private/{id}`
- **Tags:** Venues

**Servers:** [Inherited servers](#scalar-context-global-servers)

#### Path parameters

- **`id` (required)**: `integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`

#### Request body

**Required:** `true`

**Content type:** `application/json`

[UpdateVenueDto](#scalar-schema-updatevenuedto)

<a id="scalar-example-34"></a>

**Generated example:**

```json
{
  "name": null,
  "address": null
}
```

**Content type:** `text/json`

[UpdateVenueDto](#scalar-schema-updatevenuedto)

<a id="scalar-example-35"></a>

**Generated example:**

```json
{
  "name": null,
  "address": null
}
```

**Content type:** `application/*+json`

[UpdateVenueDto](#scalar-schema-updatevenuedto)

<a id="scalar-example-36"></a>

**Generated example:**

```json
{
  "name": null,
  "address": null
}
```

#### Responses

##### 404 Not Found

**Content type:** `text/plain`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-1)

**Content type:** `application/json`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-2)

**Content type:** `text/json`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-3)

<a id="scalar-operation-delete-venuesprivateid"></a>

### DELETE /Venues/private/{id}

- **Method:** `DELETE`
- **Path:** `/Venues/private/{id}`
- **Tags:** Venues

**Servers:** [Inherited servers](#scalar-context-global-servers)

#### Path parameters

- **`id` (required)**: `integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`

#### Responses

##### 404 Not Found

**Content type:** `text/plain`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-1)

**Content type:** `application/json`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-2)

**Content type:** `text/json`

[ProblemDetails](#scalar-schema-problemdetails)

[Generated example](#scalar-example-3)

## Schemas

<a id="scalar-schema-address"></a>

### Address

**Type:** `object`

- **`city`**: `string`, maxLength: `100`
- **`country`**: `null | string`, maxLength: `100`
- **`county`**: `null | string`, maxLength: `100`
- **`googleMapsUrl`**: `null | string`, format: `uri`
- **`number`**: `null | string`, maxLength: `5`
- **`street`**: `null | string`, maxLength: `100`
- **`zipCode`**: `null | string`, maxLength: `12`

<a id="scalar-example-37"></a>

**Generated example:**

```json
{
  "zipCode": null,
  "number": null,
  "street": null,
  "city": "",
  "county": null,
  "country": null,
  "googleMapsUrl": null
}
```

<a id="scalar-schema-artistsummarydto"></a>

### ArtistSummaryDto

**Type:** `object`

- **`id` (required)**: `integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`
- **`name` (required)**: `string`, maxLength: `150`
- **`slug` (required)**: `string`

<a id="scalar-example-38"></a>

**Generated example:**

```json
{
  "id": 1,
  "slug": "",
  "name": ""
}
```

<a id="scalar-schema-createartistdto"></a>

### CreateArtistDto

**Type:** `object`

- **`name` (required)**: `string`, maxLength: `150`
- **`slug` (required)**: `string`, maxLength: `300`

<a id="scalar-example-39"></a>

**Generated example:**

```json
{
  "name": "",
  "slug": ""
}
```

<a id="scalar-schema-createeventdto"></a>

### CreateEventDto

**Type:** `object`

- **`isActive` (required)**: `boolean`
- **`name` (required)**: `string`
- **`startDate` (required)**: `string`, format: `date-time`
- **`venueId` (required)**: `integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`
- **`announcementUrl`**: `null | string`, format: `uri`
- **`artistsId`**: `array`

  **Items:**

  `integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`
- **`description`**: `null | string`, maxLength: `800`
- **`endDate`**: `null | string`, format: `date-time`
- **`genresId`**: `array`

  **Items:**

  `integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`
- **`price`**: [Price](#scalar-schema-price) | `null`
- **`ticketUrl`**: `null | string`, format: `uri`

<a id="scalar-example-40"></a>

**Generated example:**

```json
{
  "name": "",
  "startDate": "",
  "isActive": true,
  "endDate": null,
  "description": null,
  "price": {
    "value": 1,
    "currency": 1
  },
  "ticketUrl": null,
  "announcementUrl": null,
  "venueId": 1,
  "genresId": [
    1
  ],
  "artistsId": [
    1
  ]
}
```

<a id="scalar-schema-creategenredto"></a>

### CreateGenreDto

**Type:** `object`

- **`name` (required)**: `string`

<a id="scalar-example-41"></a>

**Generated example:**

```json
{
  "name": ""
}
```

<a id="scalar-schema-createvenuedto"></a>

### CreateVenueDto

**Type:** `object`

- **`name` (required)**: `string`, maxLength: `100`
- **`address`**: [Address](#scalar-schema-address) | `null`
- **`eventIds`**: `array`

  **Items:**

  `integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`

<a id="scalar-example-42"></a>

**Generated example:**

```json
{
  "name": "",
  "address": {
    "zipCode": null,
    "number": null,
    "street": null,
    "city": "",
    "county": null,
    "country": null,
    "googleMapsUrl": null
  },
  "eventIds": [
    1
  ]
}
```

<a id="scalar-schema-currency"></a>

### Currency

**Type:** `integer`

<a id="scalar-schema-deleteeventsquery"></a>

### DeleteEventsQuery

**Type:** `object`

- **`artistId`**: `null | integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`
- **`from`**: `null | string`, format: `date-time`
- **`id`**: `null | integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`
- **`isActive`**: `null | boolean`
- **`to`**: `null | string`, format: `date-time`
- **`venueId`**: `null | integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`

<a id="scalar-example-43"></a>

**Generated example:**

```json
{
  "from": null,
  "to": null,
  "isActive": null,
  "id": null,
  "venueId": null,
  "artistId": null
}
```

<a id="scalar-schema-genresummarydto"></a>

### GenreSummaryDto

**Type:** `object`

- **`id` (required)**: `integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`
- **`name` (required)**: `string`

<a id="scalar-example-44"></a>

**Generated example:**

```json
{
  "id": 1,
  "name": ""
}
```

<a id="scalar-schema-price"></a>

### Price

**Type:** `object`

- **`value` (required)**: `number | string`, format: `double`, pattern: `^-?(?:0|[1-9]\d*)(?:\.\d+)?$`
- **`currency`**: `integer | null`

<a id="scalar-example-45"></a>

**Generated example:**

```json
{
  "value": 1,
  "currency": 1
}
```

<a id="scalar-schema-problemdetails"></a>

### ProblemDetails

**Type:** `object`

- **`detail`**: `null | string`
- **`instance`**: `null | string`
- **`status`**: `null | integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`
- **`title`**: `null | string`
- **`type`**: `null | string`

<a id="scalar-example-46"></a>

**Generated example:**

```json
{
  "type": null,
  "title": null,
  "status": null,
  "detail": null,
  "instance": null
}
```

<a id="scalar-schema-publicartistdto"></a>

### PublicArtistDto

**Type:** `object`

- **`name` (required)**: `string`, maxLength: `150`
- **`slug` (required)**: `string`, maxLength: `150`

<a id="scalar-example-47"></a>

**Generated example:**

```json
{
  "name": "",
  "slug": ""
}
```

<a id="scalar-schema-publiceventdto"></a>

### PublicEventDto

**Type:** `object`

- **`name` (required)**: `string`, maxLength: `100`
- **`slug` (required)**: `string`
- **`startDate` (required)**: `string`, format: `date-time`
- **`venueName` (required)**: `string`
- **`announcementUrl`**: `null | string`, format: `uri`
- **`artistsSummary`**: array of [PublicArtistDto](#scalar-schema-publicartistdto)
- **`description`**: `null | string`, maxLength: `800`
- **`endDate`**: `null | string`, format: `date-time`
- **`genresName`**: `array of string`
- **`price`**: [Price](#scalar-schema-price) | `null`
- **`ticketUrl`**: `null | string`, format: `uri`

<a id="scalar-example-48"></a>

**Generated example:**

```json
{
  "slug": "",
  "name": "",
  "startDate": "",
  "description": null,
  "announcementUrl": null,
  "ticketUrl": null,
  "price": {
    "value": 1,
    "currency": 1
  },
  "endDate": null,
  "venueName": "",
  "genresName": [
    ""
  ],
  "artistsSummary": [
    {
      "name": "",
      "slug": ""
    }
  ]
}
```

<a id="scalar-schema-publicvenuedto"></a>

### PublicVenueDto

**Type:** `object`

- **`id` (required)**: `integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`
- **`name` (required)**: `string`
- **`city`**: `null | string`
- **`eventIds`**: `array`

  **Items:**

  `integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`

<a id="scalar-example-49"></a>

**Generated example:**

```json
{
  "id": 1,
  "name": "",
  "city": null,
  "eventIds": [
    1
  ]
}
```

<a id="scalar-schema-updateeventdto"></a>

### UpdateEventDto

**Type:** `object`

- **`announcementUrl`**: `null | string`, format: `uri`
- **`artistsId`**: `array`

  **Items:**

  `integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`
- **`description`**: `null | string`
- **`endDate`**: `null | string`, format: `date-time`
- **`genresId`**: `array`

  **Items:**

  `integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`
- **`isActive`**: `null | boolean`
- **`price`**: [Price](#scalar-schema-price) | `null`
- **`startDate`**: `null | string`, format: `date-time`
- **`ticketUrl`**: `null | string`, format: `uri`
- **`venueId`**: `null | integer | string`, format: `int32`, pattern: `^-?(?:0|[1-9]\d*)$`

<a id="scalar-example-50"></a>

**Generated example:**

```json
{
  "startDate": null,
  "endDate": null,
  "isActive": null,
  "description": null,
  "price": {
    "value": 1,
    "currency": 1
  },
  "ticketUrl": null,
  "announcementUrl": null,
  "venueId": null,
  "genresId": [
    1
  ],
  "artistsId": [
    1
  ]
}
```

<a id="scalar-schema-updatevenuedto"></a>

### UpdateVenueDto

**Type:** `object`

- **`address`**: `null | string`
- **`name`**: `null | string`

<a id="scalar-example-51"></a>

**Generated example:**

```json
{
  "name": null,
  "address": null
}
```
