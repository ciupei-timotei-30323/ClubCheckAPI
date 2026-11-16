import { cacheLife, cacheTag } from "next/cache"

import { apiFetch } from "./client"
import type { ApiResult } from "./result"
import type { MostActiveItem, MostActiveStatistics } from "./types"

export type EventFacets = {
  cities: string[]
  venues: string[]
  genres: string[]
}

const EMPTY_FACETS: EventFacets = {
  cities: [],
  venues: [],
  genres: [],
}

export async function fetchFacets(): Promise<ApiResult<EventFacets>> {
  "use cache"

  cacheLife("minutes")
  cacheTag("facets")

  const params = new URLSearchParams({
    TopCitiesLimit: "500",
    TopVenuesLimit: "500",
    TopGenresLimit: "100",
    TopArtistsLimit: "0",
    Page: "1",
    PageSize: "500",
  })

  const result = await apiFetch<MostActiveStatistics>(
    `/Events/public/most-active?${params.toString()}`
  )

  if (result.status === "error") {
    return result
  }

  if (result.status === "empty") {
    return { status: "empty" }
  }

  if (!result.data) {
    return { status: "error", message: "Invalid facets response" }
  }

  return {
    status: "ok",
    data: {
      cities: uniqueNames(result.data.topCities, true),
      venues: uniqueNames(result.data.topVenues, true),
      genres: uniqueNames(result.data.topGenres, false),
    },
  }
}

export function emptyFacets(): EventFacets {
  return EMPTY_FACETS
}

function uniqueNames(
  items: MostActiveItem[] | undefined,
  sortAlphabetically: boolean
): string[] {
  if (!items) {
    return []
  }

  const names = [...new Set(items.map((item) => item.name).filter(Boolean))]

  if (!sortAlphabetically) {
    return names
  }

  const collator = new Intl.Collator("ro")

  return names.sort(collator.compare)
}
