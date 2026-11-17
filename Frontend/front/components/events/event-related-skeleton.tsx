import { Skeleton } from "@/components/ui/skeleton"

import { EventGridSkeleton } from "./event-grid-skeleton"

export function EventRelatedSkeleton() {
  return (
    <section className="mt-14 border-t border-border pt-8">
      <Skeleton className="h-6 w-64 max-w-full" />
      <div className="mt-4">
        <EventGridSkeleton count={6} showHeader={false} />
      </div>
    </section>
  )
}
