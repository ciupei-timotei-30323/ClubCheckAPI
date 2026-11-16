import type { components, paths } from "@/src/lib/api/main-api"

/**
 * The regenerated contract is expected to expose:
 * - GET /Events/public -> 200 { items, totalCount, page, pageSize }
 * - PublicEventDto.city
 * - Price.currency as a string
 *
 * Until `src/lib/api/main-api.d.ts` is regenerated, keep the agreed future
 * shape isolated here. Do not move this into components/UI code.
 */
type GeneratedPublicEvent = components["schemas"]["PublicEventDto"]
type GeneratedPrice = NonNullable<GeneratedPublicEvent["price"]>

export type PublicEventPrice = Omit<GeneratedPrice, "currency"> & {
  currency?: string | null
}

export type PublicEvent = Omit<GeneratedPublicEvent, "price"> & {
  city?: string | null
  price?: PublicEventPrice | null
}

export type EventsListResponse = {
  items: PublicEvent[]
  totalCount: number
  page: number
  pageSize: number
}

export type MostActiveItem = components["schemas"]["MostActiveItemDto"]
export type MostActiveStatistics = components["schemas"]["MostActiveStatisticsDto"]
export type EventsQuery = NonNullable<
  paths["/Events/public"]["get"]["parameters"]["query"]
>
