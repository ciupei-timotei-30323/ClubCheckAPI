import { Suspense } from "react"

import { FilterBarSection } from "@/components/filters/filter-bar-section"
import { FilterBarSkeleton } from "@/components/filters/filter-bar-skeleton"
import {
  filtersKey,
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

  return (
    <>
      <Suspense fallback={<FilterBarSkeleton />}>
        <FilterBarSection filters={filters} />
      </Suspense>

      <Suspense key={filtersKey(filters)} fallback={<EventGridSkeleton />}>
        <EventResults filters={filters} />
      </Suspense>
    </>
  )
}
