import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { EVENTS_PAGE_SIZE } from "@/lib/events/filters"
import { strings } from "@/lib/i18n/ro"

type EventGridSkeletonProps = {
  count?: number
  showHeader?: boolean
}

export function EventGridSkeleton({
  count = EVENTS_PAGE_SIZE,
  showHeader = true,
}: EventGridSkeletonProps = {}) {
  return (
    <div>
      {showHeader && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-32" />
            <Spinner
              className="size-4 text-muted-foreground"
              aria-label={strings.states.loading}
            />
          </div>
          <Skeleton className="h-6 w-64" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex flex-col">
            <Skeleton className="aspect-[2/3] w-full rounded-md" />
            <div className="space-y-2 pt-3">
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="mt-1 h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
