import type { EventFilters } from "@/lib/events/filters"

import { apiFetch } from "./client"
import { toInteger } from "./normalize"
import { toEventsQuery } from "./query"
import type { ApiResult } from "./result"
import type { EventsPage } from "./types"

export async function fetchEvents(
  filters: EventFilters
): Promise<ApiResult<EventsPage>> {
  const params = toQueryParams(toEventsQuery(filters))
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
