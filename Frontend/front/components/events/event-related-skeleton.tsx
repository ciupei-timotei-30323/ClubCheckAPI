import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { strings } from "@/lib/i18n/ro"

import { EventGridSkeleton } from "./event-grid-skeleton"

type EventRelatedSkeletonProps = {
  showStatus?: boolean
}

export function EventRelatedSkeleton({
  showStatus = true,
}: EventRelatedSkeletonProps = {}) {
  return (
    <section className="mt-14 border-t border-border pt-8">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-64 max-w-full" />
        {showStatus && (
          <Spinner
            className="size-4 text-muted-foreground"
            aria-label={strings.states.loading}
          />
        )}
      </div>
      <div className="mt-4">
        <EventGridSkeleton count={6} showHeader={false} />
      </div>
    </section>
  )
}
