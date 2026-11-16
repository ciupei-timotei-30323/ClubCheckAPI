import type { components, paths } from "@/src/lib/api/main-api"

export type PublicEvent = components["schemas"]["PublicEventDto"]
export type PublicPrice = components["schemas"]["PublicPriceDto"]
export type PublicCurrency = components["schemas"]["PublicCurrency"]
export type EventsPage = components["schemas"]["PagedResultOfPublicEventDto"]
export type EventFilterOptions = components["schemas"]["EventFilterOptionsDto"]
export type EventFilterOption = components["schemas"]["EventFilterOptionDto"]
export type VenueFilterOption = components["schemas"]["VenueFilterOptionDto"]
export type EventsQuery = NonNullable<
  paths["/Events/public"]["get"]["parameters"]["query"]
>
