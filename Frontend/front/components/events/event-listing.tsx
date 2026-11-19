import { Suspense } from "react"

import { BackToHomeButton } from "@/components/back-to-home-button"
import { FilterBarSection } from "@/components/filters/filter-bar-section"
import { FilterBarSkeleton } from "@/components/filters/filter-bar-skeleton"
import {
  filtersKey,
  getFilterChips,
  parseEventFilters,
  type RawSearchParams,
} from "@/lib/events/filters"

import { EventGridSkeleton } from "./event-grid-skeleton"
import { EventResults } from "./event-results"

type EventListingProps = {
  searchParams: Promise<RawSearchParams>
}

export async function EventListing({ searchParams }: EventListingProps) {
  const filters = parseEventFilters(await searchParams)
  const hasActiveSearch =
    getFilterChips(filters).length > 0 || filters.page > 1

  return (
    <>
      {hasActiveSearch && (
        <div className="mb-1">
          <BackToHomeButton className="-ml-2.5" />
        </div>
      )}

      <Suspense fallback={<FilterBarSkeleton />}>
        <FilterBarSection filters={filters} />
      </Suspense>

      <Suspense key={filtersKey(filters)} fallback={<EventGridSkeleton />}>
        <EventResults filters={filters} />
      </Suspense>
    </>
  )
}
