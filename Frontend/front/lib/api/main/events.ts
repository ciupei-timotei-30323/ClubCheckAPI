import { cache } from "react"
import { cacheLife, cacheTag } from "next/cache"
import { notFound } from "next/navigation"

import type { EventFilters } from "@/lib/events/filters"

import { apiFetch } from "./client"
import { toInteger } from "./normalize"
import { toEventsQuery } from "./query"
import type { ApiResult } from "./result"
import type { EventsPage, PublicEvent } from "./types"

type FetchEventsOptions = {
  pageSize?: number
}

export async function fetchEvents(
  filters: EventFilters,
  options: FetchEventsOptions = {}
): Promise<ApiResult<EventsPage>> {
  const query = { ...toEventsQuery(filters) }

  if (options.pageSize !== undefined) {
    query.PageSize = options.pageSize
  }

  const params = toQueryParams(query)
  const result = await apiFetch<EventsPage>(
    `/Events/public?${params.toString()}`,
    {
      next: { revalidate: 60, tags: ["events"] },
      notFoundIsEmpty: true,
    }
  )

  if (result.status !== "ok") {
    return result
  }

  const data = result.data

  if (
    !data ||
    !Array.isArray(data.items) ||
    toInteger(data.totalCount) === null ||
    toInteger(data.page) === null ||
    toInteger(data.pageSize) === null
  ) {
    return { status: "error", message: "Invalid events response" }
  }

  if (data.items.length === 0) {
    return { status: "empty", data }
  }

  return result
}

async function getEvent(slug: string): Promise<PublicEvent> {
  "use cache"

  const normalizedSlug = normalizeSlug(slug)

  cacheLife("minutes")
  cacheTag("event", `event:${normalizedSlug}`)

  const result = await apiFetch<PublicEvent>(
    `/Events/public/${encodeURIComponent(normalizedSlug)}`,
    { notFoundIsEmpty: true }
  )

  if (result.status === "empty") {
    notFound()
  }

  if (result.status === "error") {
    throw new Error(result.message)
  }

  if (!isPublicEvent(result.data)) {
    throw new Error("Invalid event response")
  }

  return result.data
}

export const fetchEvent = cache(getEvent)

export function normalizeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug)
  } catch {
    return slug
  }
}

function isPublicEvent(value: unknown): value is PublicEvent {
  if (!value || typeof value !== "object") {
    return false
  }

  const event = value as Partial<PublicEvent>

  return (
    toInteger(event.id) !== null &&
    typeof event.slug === "string" &&
    event.slug.length > 0 &&
    typeof event.name === "string" &&
    event.name.length > 0 &&
    typeof event.startDate === "string" &&
    !Number.isNaN(new Date(event.startDate).getTime()) &&
    typeof event.venueName === "string"
  )
}

function toQueryParams(query: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item))
      }
      continue
    }

    params.set(key, String(value))
  }

  return params
}
