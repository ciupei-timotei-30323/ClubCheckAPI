import { fetchEvents } from "@/lib/api/main/events"
import { toInteger } from "@/lib/api/main/normalize"
import {
  buildPageHref,
  EVENTS_PAGE_SIZE,
  getTotalPages,
  type EventFilters,
} from "@/lib/events/filters"
import { strings } from "@/lib/i18n/ro"

import { EmptyState } from "./empty-state"
import { ErrorState } from "./error-state"
import { EventGrid } from "./event-grid"
import { Pager } from "./pager"
import { ResultsHeader } from "./results-header"

type EventResultsProps = {
  filters: EventFilters
}

export async function EventResults({ filters }: EventResultsProps) {
  const result = await fetchEvents(filters)

  if (result.status === "error") {
    return <ErrorState />
  }

  const data = result.data
  const items = data?.items ?? []
  const totalCount = toInteger(data?.totalCount) ?? 0
  const page = toInteger(data?.page) ?? filters.page
  const pageSize = toInteger(data?.pageSize) ?? EVENTS_PAGE_SIZE
  const totalPages = getTotalPages(totalCount, pageSize)
  const displayPage = Math.min(Math.max(page, 1), totalPages)

  if (result.status === "empty" || !data || items.length === 0) {
    const isOutOfRange = totalCount > 0 && page > totalPages

    return (
      <>
        <ResultsHeader totalCount={totalCount} filters={filters} />
        <EmptyState
          title={
            isOutOfRange
              ? strings.states.emptyPageTitle
              : strings.states.emptyTitle
          }
          description={
            isOutOfRange
              ? strings.states.emptyPageDescription
              : strings.states.emptyDescription
          }
          actionHref={
            isOutOfRange
              ? buildPageHref(filters, totalPages)
              : "/"
          }
          actionLabel={
            isOutOfRange ? strings.filters.lastPage : strings.filters.clearAll
          }
        />
        {totalCount > 0 && (
          <Pager page={displayPage} totalPages={totalPages} filters={filters} />
        )}
      </>
    )
  }

  return (
    <>
      <ResultsHeader totalCount={totalCount} filters={filters} />
      <EventGrid events={items} />
      <Pager page={displayPage} totalPages={totalPages} filters={filters} />
    </>
  )
}
