import { Suspense } from "react"

import { EventGridSkeleton } from "@/components/events/event-grid-skeleton"
import { EventListing } from "@/components/events/event-listing"
import { EventsHeader } from "@/components/events/events-header"
import { FilterBarSkeleton } from "@/components/filters/filter-bar-skeleton"
import { strings } from "@/lib/i18n/ro"

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col">
      <EventsHeader />

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pt-6 pb-16 sm:px-6 lg:px-8">
        <h1 className="sr-only">{strings.meta.heading}</h1>

        <Suspense
          fallback={
            <>
              <FilterBarSkeleton />
              <EventGridSkeleton />
            </>
          }
        >
          <EventListing searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  )
}
