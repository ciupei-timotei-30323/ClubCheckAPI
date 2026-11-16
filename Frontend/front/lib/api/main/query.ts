import { toApiEnd, toApiStart } from "@/lib/events/dates"
import { EVENTS_PAGE_SIZE, type EventFilters } from "@/lib/events/filters"

import type { EventsQuery } from "./types"

export function toEventsQuery(filters: EventFilters): EventsQuery {
  const query: EventsQuery = {
    IsActive: true,
    Page: filters.page,
    PageSize: EVENTS_PAGE_SIZE,
  }

  if (filters.q) {
    query.Search = filters.q
  }

  if (filters.city) {
    query.City = filters.city
  }

  if (filters.venue) {
    query.VenueName = filters.venue
  }

  if (filters.genres.length > 0) {
    query.GenresNames = filters.genres
  }

  if (filters.from) {
    query.StartDate = toApiStart(filters.from)
  }

  if (filters.to) {
    query.EndDate = toApiEnd(filters.to)
  }

  return query
}
