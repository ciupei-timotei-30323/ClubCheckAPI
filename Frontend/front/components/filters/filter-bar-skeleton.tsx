import { Skeleton } from "@/components/ui/skeleton"

export function FilterBarSkeleton() {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-border pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-full sm:w-44" />
        <Skeleton className="h-9 w-full sm:w-48" />
        <Skeleton className="h-9 w-full sm:w-36" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-7 w-20 rounded-full" />
        ))}
      </div>
    </div>
  )
}
