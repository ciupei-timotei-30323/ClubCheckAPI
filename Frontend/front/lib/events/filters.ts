import { strings } from "@/lib/i18n/ro"

import { formatDateRange, isDateOnly } from "./dates"

export const EVENTS_PAGE_SIZE = 24

export type EventFilters = {
  q: string
  city: string
  venue: string
  genres: string[]
  from: string
  to: string
  page: number
}

export const DEFAULT_EVENT_FILTERS: EventFilters = {
  q: "",
  city: "",
  venue: "",
  genres: [],
  from: "",
  to: "",
  page: 1,
}

export type RawSearchParams = Record<
  string,
  string | string[] | undefined
>

export type FilterChip = {
  key: string
  label: string
  ariaLabel: string
  href: string
}

export function parseEventFilters(raw: RawSearchParams): EventFilters {
  const q = getString(raw.q).trim()
  const city = getString(raw.city).trim()
  const venue = getString(raw.venue).trim()

  const genres = [
    ...new Set(
      getStringArray(raw.genres)
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  ]

  let from = normalizeDate(getString(raw.from))
  let to = normalizeDate(getString(raw.to))

  if (from && to && from > to) {
    ;[from, to] = [to, from]
  }

  return {
    q,
    city,
    venue,
    genres,
    from,
    to,
    page: parsePage(getString(raw.page)),
  }
}

export function filtersToSearchParams(
  filters: EventFilters,
  options: { includePage?: boolean } = {}
): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.q) {
    params.set("q", filters.q)
  }

  if (filters.city) {
    params.set("city", filters.city)
  }

  if (filters.venue) {
    params.set("venue", filters.venue)
  }

  for (const genre of filters.genres) {
    params.append("genres", genre)
  }

  if (filters.from) {
    params.set("from", filters.from)
  }

  if (filters.to) {
    params.set("to", filters.to)
  }

  if (options.includePage !== false && filters.page > 1) {
    params.set("page", String(filters.page))
  }

  return params
}

export function buildFilterHref(
  filters: EventFilters,
  updates: Partial<EventFilters>
): string {
  const next: EventFilters = { ...filters, ...updates, page: 1 }
  const query = filtersToSearchParams(next).toString()

  return query ? `/?${query}` : "/"
}

export function buildPageHref(filters: EventFilters, page: number): string {
  const next: EventFilters = { ...filters, page: Math.max(1, page) }
  const query = filtersToSearchParams(next).toString()

  return query ? `/?${query}` : "/"
}

export function filtersKey(filters: EventFilters): string {
  return JSON.stringify({
    ...filters,
    genres: [...filters.genres].sort(),
  })
}

export function getTotalPages(totalCount: number, pageSize: number): number {
  if (pageSize <= 0) {
    return 1
  }

  return Math.max(1, Math.ceil(totalCount / pageSize))
}

export function getFilterChips(filters: EventFilters): FilterChip[] {
  const chips: FilterChip[] = []

  if (filters.q) {
    const label = strings.filters.searchChip(filters.q)
    chips.push({
      key: "q",
      label,
      ariaLabel: strings.filters.removeFilter(label),
      href: buildFilterHref(filters, { q: "" }),
    })
  }

  if (filters.city) {
    const label = strings.filters.cityChip(filters.city)
    chips.push({
      key: "city",
      label,
      ariaLabel: strings.filters.removeFilter(label),
      href: buildFilterHref(filters, { city: "" }),
    })
  }

  if (filters.venue) {
    const label = strings.filters.venueChip(filters.venue)
    chips.push({
      key: "venue",
      label,
      ariaLabel: strings.filters.removeFilter(label),
      href: buildFilterHref(filters, { venue: "" }),
    })
  }

  for (const genre of filters.genres) {
    const label = strings.filters.genreChip(genre)
    chips.push({
      key: `genre:${genre}`,
      label,
      ariaLabel: strings.filters.removeFilter(label),
      href: buildFilterHref(filters, {
        genres: filters.genres.filter((item) => item !== genre),
      }),
    })
  }

  if (filters.from || filters.to) {
    const label = strings.filters.dateChip(
      formatDateRange(filters.from, filters.to)
    )
    chips.push({
      key: "date",
      label,
      ariaLabel: strings.filters.removeFilter(label),
      href: buildFilterHref(filters, { from: "", to: "" }),
    })
  }

  return chips
}

function getString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? ""
  }

  return value ?? ""
}

function getStringArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value
  }

  return value ? [value] : []
}

function normalizeDate(value: string): string {
  const trimmed = value.trim()

  return isDateOnly(trimmed) ? trimmed : ""
}

function parsePage(value: string): number {
  const page = Number.parseInt(value, 10)

  return Number.isFinite(page) && page > 0 ? page : 1
}
