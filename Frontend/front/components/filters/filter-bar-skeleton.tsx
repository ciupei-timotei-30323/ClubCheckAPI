import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { strings } from "@/lib/i18n/ro"

export function FilterBarSkeleton() {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-border pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-full sm:w-44" />
        <Skeleton className="h-9 w-full sm:w-48" />
        <Skeleton className="h-9 w-full sm:w-36" />
        <Spinner
          className="size-4 text-muted-foreground"
          aria-label={strings.states.loading}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-7 w-20 rounded-full" />
        ))}
      </div>
    </div>
  )
}
