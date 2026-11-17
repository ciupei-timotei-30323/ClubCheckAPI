import { Skeleton } from "@/components/ui/skeleton"

import { EventRelatedSkeleton } from "./event-related-skeleton"

export function EventDetailSkeleton() {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-48 max-w-[50vw]" />
      </div>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] xl:gap-12">
        <Skeleton className="mx-auto aspect-[2/3] w-full max-w-[360px] rounded-lg lg:mx-0 lg:max-w-none" />

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-9 w-4/5" />
              <Skeleton className="h-9 w-3/5" />
            </div>
            <Skeleton className="size-8 shrink-0 rounded-full" />
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <Skeleton className="h-5 w-20 rounded-4xl" />
            <Skeleton className="h-5 w-24 rounded-4xl" />
            <Skeleton className="h-5 w-16 rounded-4xl" />
          </div>

          <div className="mt-6 space-y-4 border-y border-border py-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3"
              >
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-3/4 max-w-80" />
              </div>
            ))}
          </div>

          <Skeleton className="mt-6 h-10 w-40" />

          <div className="mt-8 border-t border-border pt-6">
            <Skeleton className="h-6 w-40" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </div>
      </div>

      <EventRelatedSkeleton />
    </div>
  )
}
