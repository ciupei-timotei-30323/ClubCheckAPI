import { describe, expect, it } from "vitest"

import {
  buildFilterHref,
  buildPageHref,
  DEFAULT_EVENT_FILTERS,
  filtersKey,
  filtersToSearchParams,
  getTotalPages,
  parseEventFilters,
  type EventFilters,
} from "./filters"

const fullFilters: EventFilters = {
  q: "rock",
  city: "București",
  venue: "Arenele Romane",
  genres: ["Rock", "Jazz"],
  from: "2025-11-16",
  to: "2025-11-18",
  page: 3,
}

describe("parseEventFilters", () => {
  it("returns defaults for empty search params", () => {
    expect(parseEventFilters({})).toEqual(DEFAULT_EVENT_FILTERS)
  })

  it("parses repeated and comma-separated genres", () => {
    const filters = parseEventFilters({
      genres: ["Rock,Jazz", "Rock", " Pop "],
    })

    expect(filters.genres).toEqual(["Rock", "Jazz", "Pop"])
  })

  it("trims text filters and normalizes invalid dates/pages", () => {
    const filters = parseEventFilters({
      q: "  jazz ",
      city: " Cluj-Napoca ",
      venue: " Form ",
      from: "2025-02-30",
      to: "2025-11-18",
      page: "2abc",
    })

    expect(filters.q).toBe("jazz")
    expect(filters.city).toBe("Cluj-Napoca")
    expect(filters.venue).toBe("Form")
    expect(filters.from).toBe("")
    expect(filters.to).toBe("2025-11-18")
    expect(filters.page).toBe(1)
  })

  it("swaps reversed date bounds", () => {
    const filters = parseEventFilters({
      from: "2025-11-18",
      to: "2025-11-16",
    })

    expect(filters.from).toBe("2025-11-16")
    expect(filters.to).toBe("2025-11-18")
  })
})

describe("filtersToSearchParams", () => {
  it("serializes and parses back without losing filters", () => {
    const params = filtersToSearchParams(fullFilters)
    const parsed = parseEventFilters(rawFromSearchParams(params))

    expect(parsed).toEqual(fullFilters)
  })

  it("writes repeated genre params", () => {
    const params = filtersToSearchParams({ ...fullFilters, page: 1 })

    expect(params.getAll("genres")).toEqual(["Rock", "Jazz"])
  })

  it("omits the first page and writes later pages", () => {
    expect(filtersToSearchParams({ ...fullFilters, page: 1 }).has("page")).toBe(
      false
    )
    expect(filtersToSearchParams({ ...fullFilters, page: 2 }).get("page")).toBe(
      "2"
    )
  })
})

describe("filter navigation helpers", () => {
  it("resets the page on every filter change", () => {
    expect(buildFilterHref(fullFilters, { city: "Iași" })).toBe(
      "/?q=rock&city=Ia%C8%99i&venue=Arenele+Romane&genres=Rock&genres=Jazz&from=2025-11-16&to=2025-11-18"
    )
  })

  it("keeps filters when changing only the page", () => {
    expect(buildPageHref(fullFilters, 2)).toBe(
      "/?q=rock&city=Bucure%C8%99ti&venue=Arenele+Romane&genres=Rock&genres=Jazz&from=2025-11-16&to=2025-11-18&page=2"
    )
  })

  it("returns a clean root URL when all filters are cleared", () => {
    expect(buildFilterHref(fullFilters, DEFAULT_EVENT_FILTERS)).toBe("/")
  })

  it("builds a stable key independent of genre order", () => {
    expect(
      filtersKey({ ...fullFilters, genres: ["Rock", "Jazz"] })
    ).toBe(filtersKey({ ...fullFilters, genres: ["Jazz", "Rock"] }))
  })
})

describe("getTotalPages", () => {
  it("uses totalCount and pageSize", () => {
    expect(getTotalPages(0, 24)).toBe(1)
    expect(getTotalPages(1, 24)).toBe(1)
    expect(getTotalPages(24, 24)).toBe(1)
    expect(getTotalPages(25, 24)).toBe(2)
    expect(getTotalPages(49, 24)).toBe(3)
  })
})

function rawFromSearchParams(
  params: URLSearchParams
): Record<string, string | string[]> {
  const raw: Record<string, string | string[]> = {}

  for (const key of new Set(params.keys())) {
    const values = params.getAll(key)
    raw[key] = values.length === 1 ? values[0] : values
  }

  return raw
}
