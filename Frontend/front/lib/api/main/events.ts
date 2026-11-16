import type { EventFilters } from "@/lib/events/filters"

import { apiFetch } from "./client"
import { toEventsQuery } from "./query"
import type { ApiResult } from "./result"
import type { EventsListResponse } from "./types"

export async function fetchEvents(
  filters: EventFilters
): Promise<ApiResult<EventsListResponse>> {
  const params = toQueryParams(toEventsQuery(filters))
  const result = await apiFetch<EventsListResponse>(
    `/Events/public?${params.toString()}`,
    {
      next: { revalidate: 60, tags: ["events"] },
      notFoundIsEmpty: true,
    }
  )

  if (result.status !== "ok") {
    return result
  }

  if (
    !result.data ||
    !Array.isArray(result.data.items) ||
    typeof result.data.totalCount !== "number" ||
    typeof result.data.page !== "number" ||
    typeof result.data.pageSize !== "number"
  ) {
    return { status: "error", message: "Invalid events response" }
  }

  if (result.data.items.length === 0) {
    return { status: "empty", data: result.data }
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
