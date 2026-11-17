import { cacheLife, cacheTag } from "next/cache"

import { apiFetch } from "./client"
import type { EventFilterOptions } from "./types"

/**
 * Fetches active-event filter options.
 *
 * This function is cached with `"use cache"`. It intentionally throws on
 * failure: if it returned an empty/error value instead, that value would be
 * cached for the whole cache lifetime. The caller degrades to empty options.
 */
export async function fetchFacets(): Promise<EventFilterOptions> {
  "use cache"

  cacheLife("minutes")
  cacheTag("facets")

  const result = await apiFetch<EventFilterOptions>("/Events/public/filters")

  if (result.status === "error") {
    throw new Error(result.message)
  }

  if (result.status === "empty" || !result.data) {
    throw new Error("Empty filters response")
  }

  const { cities, venues, genres } = result.data

  if (!Array.isArray(cities) || !Array.isArray(venues) || !Array.isArray(genres)) {
    throw new Error("Invalid filters response")
  }

  return { cities, venues, genres }
}

export function emptyFacets(): EventFilterOptions {
  return {
    cities: [],
    venues: [],
    genres: [],
  }
}
